
const express = require('express');
const router = express.Router();
const db = require('../database');
const fs = require('fs');
const csv = require('csv-parser');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const cron = require('node-cron');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Функция для конвертации формата даты из DD.MM.YYYY HH:mm:ss в YYYY-MM-DD HH:mm:ss
function convertDateFormat(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Убираем кавычки и лишние пробелы
    const cleanDate = dateStr.replace(/^"|"$/g, '').trim();
    
    // Проверяем формат DD.MM.YYYY HH:mm:ss
    const match = cleanDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    if (match) {
      const [, day, month, year, hour, minute, second] = match;
      // Форматируем в YYYY-MM-DD HH:mm:ss с ведущими нулями
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
    }
    
    // Если формат уже правильный (YYYY-MM-DD HH:mm:ss), возвращаем как есть
    if (cleanDate.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/)) {
      return cleanDate;
    }
    
    console.warn('Неизвестный формат даты:', cleanDate);
    return cleanDate; // Возвращаем как есть, если не можем распознать
  } catch (error) {
    console.error('Ошибка конвертации даты:', error, 'Исходная дата:', dateStr);
    return dateStr;
  }
}

// Нормализация имени пользователя и фильтрация технических аккаунтов
function normalizeUsername(raw) {
  if (!raw) return '';
  let username = String(raw).replace(/^"|"$/g, '').trim();
  const bsIndex = username.lastIndexOf('\\');
  if (bsIndex !== -1) username = username.slice(bsIndex + 1);
  return username;
}

const TECHNICAL_USERS_LOWER = new Set([
  'system', 'система',
  'local service', 'network service',
  'anonymous logon', 'defaultaccount', 'wdagutilityaccount',
  'umfd', 'dwm'
]);

function isTechnicalAccount(raw) {
  const username = normalizeUsername(raw);
  if (!username) return true;
  const lower = username.toLowerCase();
  if (TECHNICAL_USERS_LOWER.has(lower)) return true;
  if (/^dwm-\d+$/i.test(username)) return true;
  if (/^umfd-\d+$/i.test(username)) return true;
  if (/\$$/.test(username)) return true; // machine accounts ending with $
  return false;
}

// Функция для повторных попыток при блокировке базы данных
async function retryDatabaseOperation(operation, maxRetries = 5, delay = 100) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 'SQLITE_BUSY' && i < maxRetries - 1) {
        console.log(`База данных заблокирована, попытка ${i + 1}/${maxRetries}, ждем ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Экспоненциальная задержка
        continue;
      }
      throw error;
    }
  }
}

// Функция автоматического импорта
async function autoImportWindowsLogs(daysBack = 1, serverBaseUrl = null) {
  try {
    // Проверяем, что мы на Windows системе
    const isWindows = process.platform === 'win32';
    if (!isWindows) {
      console.log('⚠️ Автоимпорт Windows логов доступен только на Windows системах. Пропускаем...');
      return { success: false, error: 'Auto-import is only available on Windows systems' };
    }

    console.log(`🔄 Автоматический импорт за последние ${daysBack} дней...`);
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysBack);
    const filterStartDate = targetDate.toISOString().split('T')[0] + ' 00:00:00';
    const filterEndDate = targetDate.toISOString().split('T')[0] + ' 23:59:59';

    const excludeUsers = ['СИСТЕМА', 'SYSTEM', 'DWM-1', 'DWM-2', 'DWM-3', 'UMFD-0', 'UMFD-1', 'UMFD-2', 'UMFD-3'];

    const powershellScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$startTime = [DateTime]::ParseExact('${filterStartDate}', 'yyyy-MM-dd HH:mm:ss', $null)
$endTime = [DateTime]::ParseExact('${filterEndDate}', 'yyyy-MM-dd HH:mm:ss', $null)

try {
  $events = Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    ID = 4624, 4634
    StartTime = $startTime
    EndTime = $endTime
  } -ErrorAction Stop | ForEach-Object {
    $eventXml = [xml]$_.ToXml()
    $userData = $eventXml.Event.EventData.Data
    
    $targetUserName = ($userData | Where-Object {$_.Name -eq 'TargetUserName'}).InnerText
    $subjectUserName = ($userData | Where-Object {$_.Name -eq 'SubjectUserName'}).InnerText
    $accountName = if ($targetUserName) { $targetUserName } elseif ($subjectUserName) { $subjectUserName } else { $null }
    $logonType = ($userData | Where-Object {$_.Name -eq 'LogonType'}).InnerText
    
    $excludeUsers = @('${excludeUsers.join("', '")}')
    if ($accountName -and $accountName -notin $excludeUsers) {
      # Нормализуем DOMAIN\\user -> user
      if ($accountName -like '*\\*') { $accountName = $accountName.Split('\\')[-1] }
      # Пропускаем машинные аккаунты: имя на '$'
      if ($accountName -like '*$') { return }
      # Пропускаем технические аккаунты DWM-*, UMFD-*
      if ($accountName -match '^DWM-\d+$') { return }
      if ($accountName -match '^UMFD-\d+$') { return }
      [PSCustomObject]@{
        Username = $accountName
        EventID = $_.Id
        EventType = if ($_.Id -eq 4624) { 'login' } else { 'logout' }
        TimeCreated = $_.TimeCreated.ToString('dd.MM.yyyy HH:mm:ss')
      }
    }
  }
  
  if ($events) {
    $events | ConvertTo-Json -Depth 3
  } else {
    @() | ConvertTo-Json
  }
} catch {
  @() | ConvertTo-Json
}
`;

    // Запускаем через временный файл, чтобы избежать проблем кавычек и смешанного вывода
    const tmp1 = path.join(os.tmpdir(), `autoimp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.ps1`);
    fs.writeFileSync(tmp1, powershellScript, { encoding: 'utf8' });
    const { stdout, stderr } = await execAsync(`powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tmp1}"`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });
    try { fs.unlinkSync(tmp1); } catch {}

    let events = [];
    try {
      const jsonMatch = stdout.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        events = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(events)) events = [events];
      }
    } catch (parseError) {
      console.error('❌ Ошибка парсинга автоимпорта:', parseError);
      return { success: false, error: parseError.message };
    }

    let imported = 0;
    for (const event of events) {
      try {
        if (!event.Username || !event.TimeCreated || !event.EventType) continue;
        const username = normalizeUsername(event.Username);
        if (isTechnicalAccount(username)) continue;

        const convertedTime = convertDateFormat(event.TimeCreated);
        if (!convertedTime) continue;

        await retryDatabaseOperation(() => db.addWorkTimeLog({
          username,
          event_type: event.EventType,
          event_time: convertedTime,
          event_id: event.EventID || null
        }));
        imported++;
      } catch (dbError) {
        console.error('Ошибка автоимпорта:', dbError.message);
      }
    }

    // Fallback: если событий 0, пробуем запустить внешний PS-скрипт, который уже умеет постить в API
    let usedFallback = false;
    if (events.length === 0) {
      try {
        usedFallback = true;
        const dayStr = filterStartDate.slice(0, 10);
        const scriptPath = path.resolve(__dirname, '../../../export_windows_events_to_db.ps1');
        const port = process.env.PORT || 3001;
        const baseUrl = serverBaseUrl || `http://127.0.0.1:${port}/api`;
        // Считаем строки за день до запуска
        const beforeCount = await new Promise((resolve) => {
          db.db.get('SELECT COUNT(*) as c FROM work_time_logs WHERE event_time LIKE ?', [`${dayStr}%`], (e, row) => {
            resolve(row && row.c ? Number(row.c) : 0);
          });
        });
        const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -SingleDate "${dayStr}" -ServerUrl "${baseUrl}"`;
        const { stdout: psOut, stderr: psErr } = await execAsync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
        // Пересчитываем строки после выполнения
        const afterCount = await new Promise((resolve) => {
          db.db.get('SELECT COUNT(*) as c FROM work_time_logs WHERE event_time LIKE ?', [`${dayStr}%`], (e, row) => {
            resolve(row && row.c ? Number(row.c) : 0);
          });
        });
        imported = Math.max(0, afterCount - beforeCount);
        console.log(`🧩 Fallback import done. Imported delta=${imported}. PS stdout size=${(psOut||'').length}, stderr size=${(psErr||'').length}`);
      } catch (fbErr) {
        console.error('❌ Fallback import failed:', fbErr.message);
      }
    }

    console.log(`✅ Автоимпорт завершен: ${imported}/${events.length} записей`);
    const period = `${filterStartDate} - ${filterEndDate}`;
    const stdoutPreview = (stdout || '').substring(0, 300);
    const stderrPreview = (stderr || '').substring(0, 300);
    let probeCount = null;
    try {
      const probeCmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"$start=[DateTime]::ParseExact('${filterStartDate}','yyyy-MM-dd HH:mm:ss',$null); $end=[DateTime]::ParseExact('${filterEndDate}','yyyy-MM-dd HH:mm:ss',$null); (Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4624,4634; StartTime=$start; EndTime=$end} -ErrorAction SilentlyContinue | Measure-Object).Count\"`;
      const probe = await execAsync(probeCmd, { encoding: 'utf8' });
      const pc = parseInt((probe.stdout || '').trim(), 10);
      if (!isNaN(pc)) probeCount = pc;
    } catch {}
    return { success: true, imported, total: events.length, period, stdoutPreview, stderrPreview, probeCount, usedFallback };

  } catch (error) {
    console.error('❌ Ошибка автоимпорта:', error);
    return { success: false, error: error.message };
  }
}

// Запуск автоимпорта при старте сервера
setTimeout(() => {
  console.log('🚀 Запуск автоматического импорта при старте сервера...');
  autoImportWindowsLogs(1); // Импорт за вчерашний день
}, 10000);

// Настройка периодического импорта (каждый день в 00:30)
cron.schedule('30 0 * * *', () => {
  console.log('⏰ Запуск ежедневного автоимпорта...');
  autoImportWindowsLogs(1);
}, {
  timezone: "Europe/Moscow"
});

// Дополнительный импорт каждые 4 часа (для текущего дня) - временно отключено
// cron.schedule('0 */4 * * *', () => {
//   console.log('⏰ Запуск периодического импорта (каждые 4 часа)...');
//   autoImportWindowsLogs(0); // Импорт за сегодня
// }, {
//   timezone: "Europe/Moscow"
// });

// НОВЫЙ МАРШРУТ: Прямой импорт из журнала Windows
router.post('/import-from-windows-log', async (req, res) => {
  try {
    // Проверяем, что мы на Windows системе
    const isWindows = process.platform === 'win32';
    if (!isWindows) {
      return res.status(400).json({ 
        success: false, 
        error: 'Windows log import is only available on Windows systems' 
      });
    }

    const { 
      startDate = null, 
      endDate = null, 
      daysBack = 1,
      excludeUsers = ['СИСТЕМА', 'SYSTEM', 'DWM-1', 'DWM-2', 'DWM-3', 'UMFD-0', 'UMFD-1', 'UMFD-2', 'UMFD-3'],
      noFilter = false
    } = req.body;

    console.log('🔍 Начинаем прямой импорт из журнала Windows...');
    console.log('Параметры:', { startDate, endDate, daysBack, excludeUsers });

    // Определяем диапазон дат
    let filterStartDate, filterEndDate;
    if (startDate && endDate) {
      filterStartDate = startDate;
      filterEndDate = endDate;
    } else {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysBack);
      filterStartDate = targetDate.toISOString().split('T')[0] + ' 00:00:00';
      filterEndDate = targetDate.toISOString().split('T')[0] + ' 23:59:59';
    }

    console.log(`📅 Период импорта: ${filterStartDate} - ${filterEndDate}`);

    // PowerShell скрипт для получения событий входа/выхода
    const powershellScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$startTime = [DateTime]::ParseExact('${filterStartDate}', 'yyyy-MM-dd HH:mm:ss', $null)
$endTime = [DateTime]::ParseExact('${filterEndDate}', 'yyyy-MM-dd HH:mm:ss', $null)

Write-Host "Получение событий с $startTime по $endTime"

try {
  $events = Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    ID = 4624, 4634
    StartTime = $startTime
    EndTime = $endTime
  } -ErrorAction Stop | ForEach-Object {
    $eventXml = [xml]$_.ToXml()
    $userData = $eventXml.Event.EventData.Data
    
    $targetUserName = ($userData | Where-Object {$_.Name -eq 'TargetUserName'}).InnerText
    $subjectUserName = ($userData | Where-Object {$_.Name -eq 'SubjectUserName'}).InnerText
    $accountName = if ($targetUserName) { $targetUserName } elseif ($subjectUserName) { $subjectUserName } else { $null }
    $logonType = ($userData | Where-Object {$_.Name -eq 'LogonType'}).InnerText
    
    # Исключаем системные сессии и определенных пользователей
    $excludeUsers = @('${excludeUsers.join("', '")}')
    $pass = $true
    if (-not ${noFilter ? '$true' : '$true'}) {
      # применяем фильтры, если не режим noFilter
      if (-not $accountName) { $pass = $false }
      if ($accountName -in $excludeUsers) { $pass = $false }
      if ($accountName -like '*\\*') { $accountName = $accountName.Split('\\')[-1] }
      if ($accountName -like '*$') { $pass = $false }
      if ($accountName -match '^DWM-\d+$') { $pass = $false }
      if ($accountName -match '^UMFD-\d+$') { $pass = $false }
    }
    if ($pass) {
      # Нормализуем DOMAIN\\user -> user
      if ($accountName -like '*\\*') { $accountName = $accountName.Split('\\')[-1] }
      [PSCustomObject]@{
        Username = $accountName
        EventID = $_.Id
        EventType = if ($_.Id -eq 4624) { 'login' } else { 'logout' }
        TimeCreated = $_.TimeCreated.ToString('dd.MM.yyyy HH:mm:ss')
      }
    }
  }
  
  if ($events) {
    Write-Host "Найдено событий: $($events.Count)"
    $events | ConvertTo-Json -Depth 3
  } else {
    Write-Host "События не найдены"
    @() | ConvertTo-Json
  }
} catch {
  Write-Error "Ошибка получения событий: $($_.Exception.Message)"
  @() | ConvertTo-Json
}
`;

    console.log('🔧 Выполняем PowerShell скрипт...');
    
    // Выполняем PowerShell скрипт
    const tmp2 = path.join(os.tmpdir(), `imp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.ps1`);
    fs.writeFileSync(tmp2, powershellScript, { encoding: 'utf8' });
    const { stdout, stderr } = await execAsync(`powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tmp2}"`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB буфер
    });
    try { fs.unlinkSync(tmp2); } catch {}

    if (stderr) {
      console.warn('⚠️ PowerShell warnings:', stderr);
    }

    console.log('📥 Получен ответ от PowerShell, размер:', stdout.length);

    // Парсим JSON ответ
    let events = [];
    try {
      // Ищем JSON в выводе (может быть смешан с другими сообщениями)
      const jsonMatch = stdout.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        events = JSON.parse(jsonStr);
        if (!Array.isArray(events)) {
          events = [events];
        }
      }
    } catch (parseError) {
      console.error('❌ Ошибка парсинга JSON:', parseError);
      console.log('Raw stdout:', stdout);
      return res.status(500).json({ 
        success: false, 
        error: 'Ошибка парсинга данных из журнала Windows',
        details: parseError.message,
        stdout: stdout.substring(0, 1000) // Первые 1000 символов для отладки
      });
    }

    console.log(`📊 Получено событий для обработки: ${events.length}`);

    // Импортируем события в базу данных
    let imported = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      try {
        // Проверяем обязательные поля
        if (!event.Username || !event.TimeCreated || !event.EventType) {
          console.log(`SKIP [${i+1}/${events.length}]: Отсутствуют обязательные поля:`, event);
          skipped++;
          continue;
        }

        // Конвертируем формат даты
        const convertedTime = convertDateFormat(event.TimeCreated);
        if (!convertedTime) {
          console.log(`SKIP [${i+1}/${events.length}]: Не удалось конвертировать дату:`, event.TimeCreated);
          skipped++;
          continue;
        }

        // Логируем первые несколько записей для проверки
        if (imported < 3) {
          console.log(`IMPORT [${i+1}]: ${event.Username} - ${event.EventType} - ${event.TimeCreated} -> ${convertedTime}`);
        }

        // Добавляем в базу данных
        await retryDatabaseOperation(() => db.addWorkTimeLog({
          username: event.Username,
          event_type: event.EventType,
          event_time: convertedTime,
          event_id: event.EventID || null
        }));

        imported++;

        // Показываем прогресс каждые 10 записей
        if (imported % 10 === 0) {
          console.log(`PROGRESS: ${imported}/${events.length} записей импортировано`);
        }

      } catch (dbError) {
        errors++;
        console.error(`IMPORT ERROR [${i+1}/${events.length}]:`, dbError.message, 'Event:', event);
        
        // Если слишком много ошибок подряд, прерываем импорт
        if (errors > 50) {
          console.error('Слишком много ошибок, прерываем импорт');
          break;
        }
      }
    }

    console.log(`✅ Прямой импорт завершен:`);
    console.log(`   📥 Получено событий: ${events.length}`);
    console.log(`   ✅ Импортировано: ${imported}`);
    console.log(`   ⏭️ Пропущено: ${skipped}`);
    console.log(`   ❌ Ошибок: ${errors}`);

    // Диагностика: пробный подсчет напрямую
    let probeCount = null;
    try {
      const probeCmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"$start=[DateTime]::ParseExact('${filterStartDate}','yyyy-MM-dd HH:mm:ss',$null); $end=[DateTime]::ParseExact('${filterEndDate}','yyyy-MM-dd HH:mm:ss',$null); (Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4624,4634; StartTime=$start; EndTime=$end} -ErrorAction SilentlyContinue | Measure-Object).Count\"`;
      const probe = await execAsync(probeCmd, { encoding: 'utf8' });
      const pc = parseInt((probe.stdout || '').trim(), 10);
      if (!isNaN(pc)) probeCount = pc;
    } catch {}

    res.json({ 
      success: true, 
      imported, 
      total: events.length, 
      skipped,
      errors,
      period: `${filterStartDate} - ${filterEndDate}`,
      stdoutPreview: (stdout||'').substring(0,300),
      stderrPreview: (stderr||'').substring(0,300),
      probeCount
    });

  } catch (error) {
    console.error('❌ Ошибка прямого импорта из журнала Windows:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка прямого импорта из журнала Windows',
      details: error.message
    });
  }
});

// Маршрут для ручного запуска автоимпорта
router.post('/auto-import', async (req, res) => {
  try {
    const { daysBack = 1 } = req.body;
    console.log(`🔄 Ручной запуск автоимпорта за ${daysBack} дней...`);
    
    const baseUrl = `${req.protocol}://${req.get('host')}/api`;
    const result = await autoImportWindowsLogs(daysBack, baseUrl);
    res.json(result);
  } catch (error) {
    console.error('❌ Ошибка ручного автоимпорта:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка ручного автоимпорта',
      details: error.message
    });
  }
});

// Импорт CSV за вчерашний день из стандартной папки
router.post('/auto-import-csv-yesterday', async (req, res) => {
  try {
    const dirPath = req.body.dirPath || 'C:/Users/Ksendz/web/Logs';
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1);
    const dayStr = targetDate.toISOString().slice(0,10).replace(/-/g,'');
    const fileName = `UserLogs_${dayStr}.csv`;
    const filePath = path.join(dirPath, fileName);
    if (!fs.existsSync(filePath)) {
      return res.json({ success: true, imported: 0, total: 0, message: 'Файл не найден', filePath });
    }
    // Повторно используем логику одиночного CSV импорта
    const results = [];
    await new Promise((resolve) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve);
    });
    let imported = 0;
    for (const event of results) {
      try {
        const convertedTime = convertDateFormat(event.TimeCreated || event['TimeCreated'] || event['"TimeCreated"'] || event['﻿"TimeCreated"']);
        await retryDatabaseOperation(() => db.addWorkTimeLog({
          username: (event.Username || '').replace(/^"|"$/g,'').trim(),
          event_type: event.EventID ? (Number(event.EventID) === 4624 ? 'login' : 'logout') : (event.EventType || 'login'),
          event_time: convertedTime,
          event_id: event.EventID ? Number(event.EventID) : (event.EventType === 'logout' ? 4634 : 4624)
        }));
        imported++;
      } catch {}
    }
    return res.json({ success: true, imported, total: results.length, filePath });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Временный маршрут для очистки таблицы рабочих событий
router.post('/clear-worktime-logs', async (req, res) => {
  try {
    const deleted = await retryDatabaseOperation(() => db.clearWorkTimeLogs());
    res.json({ success: true, deleted });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Маршрут для получения списка уникальных пользователей из базы
router.get('/worktime-users', (req, res) => {
  try {
    db.db.all('SELECT DISTINCT username FROM work_time_logs ORDER BY username', [], (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      const users = rows.map(r => r.username).filter(Boolean);
      res.json({ success: true, users });
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Массовый импорт всех файлов UserLogs_*.csv из папки
router.post('/import-all-userlogs', async (req, res) => {
  const dirPath = req.body.dirPath || 'C:/Users/Ksendz/web/Logs';
  if (!fs.existsSync(dirPath)) {
    return res.status(400).json({ success: false, error: 'Папка не найдена' });
  }
  
  const files = fs.readdirSync(dirPath).filter(f => f.startsWith('UserLogs_') && f.endsWith('.csv'));
  let totalImported = 0;
  
  for (const file of files) {
    const filePath = dirPath + '/' + file;
    const results = [];
    
    await new Promise((resolve) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve);
    });
    
    for (const event of results) {
      try {
        const username = normalizeUsername(event.Username);
        if (isTechnicalAccount(username)) continue;
        // Конвертируем формат даты
        const convertedTime = convertDateFormat(event.TimeCreated);
        
        await retryDatabaseOperation(() => db.addWorkTimeLog({
          username,
          event_type: event.EventID ? (event.EventID == 4624 ? 'login' : 'logout') : 'login',
          event_time: convertedTime,
          event_id: event.EventID ? event.EventID : 4624
        }));
        totalImported++;
      } catch (e) {
        console.error('Ошибка импорта события:', e, 'Event:', event);
      }
    }
  }
  
  res.json({ success: true, imported: totalImported, files: files.length });
});

// Импорт CSV файла рабочего времени
router.post('/import-worktime-csv', (req, res) => {
  const { filePath } = req.body;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(400).json({ success: false, error: 'Файл не найден' });
  }
  
  const results = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      let imported = 0;
      for (const event of results) {
        try {
          // Очистка значений от кавычек и пробелов
          const username = normalizeUsername(event.Username);
          if (isTechnicalAccount(username)) {
            continue;
          }
          
          // Универсальный поиск поля даты (BOM, кавычки, разные варианты)
          let event_time = '';
          if (event.TimeCreated) event_time = event.TimeCreated;
          else if (event['TimeCreated']) event_time = event['TimeCreated'];
          else if (event['"TimeCreated"']) event_time = event['"TimeCreated"'];
          else if (event['﻿"TimeCreated"']) event_time = event['﻿"TimeCreated"']; // с BOM
          
          event_time = (event_time || '').replace(/^"|"$/g, '').trim();
          
          const event_id_raw = (event.EventID || '').replace(/^"|"$/g, '').trim();
          const event_id = Number(event_id_raw);
          
          let event_type = (event.EventType || '').replace(/^"|"$/g, '').trim();
          if (!event_type) {
            event_type = event_id === 4624 ? 'login' : 'logout';
          }
          
          if (!event_time) {
            console.error('SKIP: event_time is empty! Raw event:', event);
            continue;
          }
          
          // Конвертируем формат даты
          const convertedTime = convertDateFormat(event_time);
          if (!convertedTime) {
            console.error('SKIP: Не удалось конвертировать дату:', event_time);
            continue;
          }
          
          // Временный лог для отладки структуры
          console.log('IMPORT EVENT:', { username, event_time: convertedTime, event_id, event_type });
          
          await retryDatabaseOperation(() => db.addWorkTimeLog({
            username,
            event_type,
            event_time: convertedTime,
            event_id
          }));
          imported++;
        } catch (e) {
          console.error('IMPORT ERROR:', e, 'Event:', event);
        }
      }
      res.json({ success: true, imported });
    });
});

// Временный маршрут для отладки: получить все уникальные имена пользователей и даты событий
router.get('/debug-worktime-users', (req, res) => {
  try {
    db.db.all(`
      SELECT 
        username, 
        MIN(event_time) as first_event, 
        MAX(event_time) as last_event, 
        COUNT(*) as total_events 
      FROM work_time_logs 
      GROUP BY username 
      ORDER BY username
    `, [], (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, users: rows });
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Получение статистики импорта
router.get('/import-stats', (req, res) => {
  try {
    db.db.all(`
      SELECT 
        DATE(event_time) as date,
        COUNT(*) as events_count,
        COUNT(DISTINCT username) as users_count
      FROM work_time_logs 
      GROUP BY DATE(event_time) 
      ORDER BY date DESC 
      LIMIT 30
    `, [], (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, stats: rows });
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Получение последних импортированных событий
router.get('/recent-events', (req, res) => {
  try {
    const limit = req.query.limit || 50;
    db.db.all(`
      SELECT * FROM work_time_logs 
      ORDER BY event_time DESC 
      LIMIT ?
    `, [limit], (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, events: rows });
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Проверка состояния автоимпорта
router.get('/auto-import-status', (req, res) => {
  res.json({
    success: true,
    status: 'active',
    schedules: [
      { name: 'Ежедневный импорт', cron: '30 0 * * *', description: 'Каждый день в 00:30' },
      { name: 'Периодический импорт', cron: '0 */4 * * *', description: 'Каждые 4 часа' }
    ],
    startup_import: 'Запускается через 10 секунд после старта сервера'
  });
});

module.exports = router;