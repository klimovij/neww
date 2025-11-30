const express = require('express');
const db = require('../database');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');

// Логируем при загрузке модуля - используем console.log для PM2
console.log('🚀🚀🚀 [quickCsvReport] MODULE LOADING STARTED');
console.log('✅ [quickCsvReport] MODULE LOADED - router created');

// Импорт массива событий из PowerShell (JSON)
router.post('/import-worktime-json', async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [];
    let imported = 0;
    for (const ev of events) {
      if (!ev.username || !ev.event_time || !ev.event_type) continue;
      // event_id не обязателен
      await db.addWorkTimeLog({
        username: ev.username,
        event_type: ev.event_type,
        event_time: ev.event_time,
        event_id: ev.event_id || null
      });
      imported++;
    }
    res.json({ success: true, imported });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Генерация отчёта для ЛОКАЛЬНЫХ пользователей: work_time_logs + activity_logs
async function getLocalWorkTimeReport({ start, end, username, isSingleDay = false }) {
  const fs = require('fs');
  const path = require('path');
  const logFiles = [
    '/tmp/quick-db-report-debug.log',
    '/var/tmp/quick-db-report-debug.log',
    path.join(__dirname, '../../quick-db-report-debug.log')
  ];
  
  const logMsg = (msg) => {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    for (const logFile of logFiles) {
      try {
        fs.appendFileSync(logFile, line, { mode: 0o666 });
      } catch (e) {}
    }
    console.log(`📊 [getLocalWorkTimeReport] ${msg}`);
  };
  
  logMsg(`=== НАЧАЛО getLocalWorkTimeReport (ЛОКАЛЬНЫЕ данные) ===`);
  logMsg(`Запрос данных: start=${start}, end=${end}, username=${username || 'all'}, isSingleDay=${isSingleDay}`);
  logMsg(`🔍 [DEBUG] isSingleDay=${isSingleDay}, start=${start}, end=${end}, start===end: ${start === end}`);
  
  // ТОЛЬКО локальные данные: work_time_logs (от агента включения/выключения)
  const periodLogs = await db.getWorkTimeLogs({ start, end, username, isSingleDay });
  logMsg(`work_time_logs (локальные): ${periodLogs?.length || 0} записей`);
  if (isSingleDay && periodLogs.length > 0) {
    logMsg(`🔍 [DEBUG] Первые 3 записи из work_time_logs для проверки:`);
    periodLogs.slice(0, 3).forEach((log, idx) => {
      logMsg(`  [${idx + 1}] username=${log.username}, event_time=${log.event_time}, event_type=${log.event_type}`);
    });
  }
  
  // Также получаем пользователей из activity_logs (от агента активности)
  let activityLogs = await db.getActivityLogsBetween({ start, end, isSingleDay });
  logMsg(`activity_logs (локальные): ${activityLogs?.length || 0} записей`);
  
  // Дополнительная фильтрация для одного дня: оставляем только данные за выбранный день
  if (isSingleDay && activityLogs.length > 0) {
    const filteredActivityLogs = activityLogs.filter(log => {
      if (!log.timestamp) return false;
      // Извлекаем дату из timestamp
      let logDate = null;
      const timestampStr = String(log.timestamp);
      if (timestampStr.length >= 10) {
        if (timestampStr[4] === '-' && timestampStr[7] === '-') {
          // Формат YYYY-MM-DD
          logDate = timestampStr.substr(0, 10);
        } else {
          try {
            logDate = new Date(timestampStr).toISOString().slice(0, 10);
          } catch (e) {
            logMsg(`⚠️ Не удалось распарсить timestamp: ${timestampStr}`);
            return false;
          }
        }
      }
      // Если дата не совпадает с выбранной, исключаем
      if (logDate && logDate !== start) {
        logMsg(`🚫 Фильтруем activity_log: timestamp=${timestampStr}, извлеченная дата=${logDate}, ожидаемая=${start}`);
        return false;
      }
      return logDate === start;
    });
    logMsg(`activity_logs после фильтрации для одного дня: ${filteredActivityLogs.length} записей (было ${activityLogs.length})`);
    activityLogs = filteredActivityLogs;
  }
  
  // Получаем список удаленных пользователей для информации
  // НО НЕ исключаем их, если они есть в локальных данных (work_time_logs)
  const remoteLogs = await db.getRemoteWorkTimeLogs({ start, end });
  const remoteUsernames = new Set();
  for (const log of remoteLogs) {
    if (log.username) remoteUsernames.add(log.username);
  }
  logMsg(`Удаленных пользователей (для информации): ${remoteUsernames.size}`);
  if (remoteUsernames.size > 0) {
    logMsg(`Удаленные пользователи: ${Array.from(remoteUsernames).join(', ')}`);
  }
  
  // Создаем множество локальных пользователей (из work_time_logs)
  const localUsernames = new Set();
  for (const log of periodLogs) {
    if (log.username) localUsernames.add(log.username);
  }
  logMsg(`Локальных пользователей в work_time_logs: ${localUsernames.size}`);
  if (localUsernames.size > 0) {
    logMsg(`Локальные пользователи: ${Array.from(localUsernames).join(', ')}`);
  }
  
  // Пользователи из activity_logs считаются локальными, если:
  // 1. Они есть в work_time_logs (локальная таблица) ИЛИ
  // 2. У них есть активность в activity_logs (это локальная активность)
  // Исключаем только тех, кто есть ТОЛЬКО в remote_work_time_logs и НЕТ в activity_logs
  // Если пользователь есть в activity_logs, значит он работал локально, независимо от удаленных данных
  const activityUsers = {};
  for (const log of activityLogs) {
    if (!log.username) continue;
    if (username && log.username !== username) continue;
    
    // Пользователь считается локальным, если:
    // - он есть в work_time_logs (локальная таблица), ИЛИ
    // - у него есть активность в activity_logs (это локальная активность)
    // НЕ исключаем пользователей из activity_logs, даже если они есть в удаленных данных
    // Если есть активность в activity_logs, значит пользователь работал локально
    const isLocalUser = localUsernames.has(log.username) || true; // Всегда включаем, если есть в activity_logs
    
    if (isLocalUser) {
      activityUsers[log.username] = true;
      logMsg(`✅ Включаем пользователя ${log.username} из activity_logs (локальная активность)`);
    }
  }
  logMsg(`Уникальных локальных пользователей в activity_logs: ${Object.keys(activityUsers).length}`);
  
  // Включаем ВСЕ логи из work_time_logs (это локальная таблица)
  // НЕ фильтруем по удаленным пользователям, т.к. если пользователь есть в work_time_logs,
  // значит он работает на локальном ПК, даже если также есть в удаленных данных
  // Дополнительная фильтрация для одного дня: оставляем только данные за выбранный день
  let allLogs = periodLogs;
  logMsg(`🔍 [DEBUG] Перед фильтрацией: isSingleDay=${isSingleDay}, periodLogs.length=${periodLogs.length}, start=${start}`);
  if (isSingleDay) {
    logMsg(`🔍 [ФИЛЬТРАЦИЯ] Начинаем фильтрацию для одного дня: start=${start}, всего логов до фильтрации: ${periodLogs.length}`);
    allLogs = periodLogs.filter(log => {
      if (!log.username) return false;
      if (!log.event_time) {
        logMsg(`⚠️ Лог без event_time, пропускаем: ${JSON.stringify(log)}`);
        return false;
      }
      
      let logDate = null;
      const eventTimeStr = String(log.event_time).trim();
      
      // Извлекаем дату из event_time (поддержка форматов DD.MM.YYYY и YYYY-MM-DD, с запятой или без)
      if (eventTimeStr.length >= 10) {
        if (eventTimeStr[2] === '.' && eventTimeStr[5] === '.') {
          // Формат DD.MM.YYYY (может быть с запятой: "28.11.2025, 18:06:27")
          const year = eventTimeStr.substr(6, 4);
          const month = eventTimeStr.substr(3, 2);
          const day = eventTimeStr.substr(0, 2);
          logDate = `${year}-${month}-${day}`;
          logMsg(`📅 Извлечена дата из DD.MM.YYYY: ${eventTimeStr} -> ${logDate}`);
        } else if (eventTimeStr[4] === '-' && eventTimeStr[7] === '-') {
          // Формат YYYY-MM-DD
          logDate = eventTimeStr.substr(0, 10);
          logMsg(`📅 Извлечена дата из YYYY-MM-DD: ${eventTimeStr} -> ${logDate}`);
        }
      }
      
      // Если дата не совпадает с выбранной, исключаем
      if (logDate) {
        if (logDate !== start) {
          logMsg(`🚫 ИСКЛЮЧАЕМ лог: event_time=${eventTimeStr}, извлеченная дата=${logDate}, ожидаемая=${start}`);
          return false;
        } else {
          logMsg(`✅ ВКЛЮЧАЕМ лог: event_time=${eventTimeStr}, дата=${logDate} совпадает с ${start}`);
        }
      } else {
        logMsg(`⚠️ Не удалось извлечь дату из event_time: ${eventTimeStr}, пропускаем лог`);
        return false; // Если не удалось извлечь дату, исключаем лог для одного дня
      }
      
      return true;
    });
    logMsg(`🔍 [ФИЛЬТРАЦИЯ] После фильтрации осталось логов: ${allLogs.length} из ${periodLogs.length}`);
  } else {
    logMsg(`Локальных логов из work_time_logs: ${allLogs.length}`);
  }
  
  const userMap = {};
  for (const log of allLogs) {
    if (!log.username) continue;
    userMap[log.username] = userMap[log.username] || [];
    userMap[log.username].push(log);
  }
  
  // Добавляем пользователей из activity_logs, у которых нет login/logout, но есть активность
  // ВАЖНО: включаем всех пользователей из activity_logs, даже если у них нет записей в work_time_logs
  for (const activityUser of Object.keys(activityUsers)) {
    if (!userMap[activityUser]) {
      userMap[activityUser] = [];
      logMsg(`✅ Добавляем пользователя ${activityUser} в userMap (только активность, нет login/logout)`);
    }
  }
  
  const report = [];
  const seenFios = new Set(); // Для предотвращения дубликатов по FIO
  logMsg(`Всего локальных пользователей в userMap: ${Object.keys(userMap).length}`);
  logMsg(`Пользователи в userMap: ${Object.keys(userMap).join(', ')}`);
  logMsg(`Пользователи в activityUsers: ${Object.keys(activityUsers).join(', ')}`);
  
  for (const [user, sessions] of Object.entries(userMap)) {
    if (!user) {
      logMsg(`⚠️ Пропускаем пользователя с пустым username`);
      continue;
    }
    
    // Пользователь считается локальным, если:
    // - он есть в work_time_logs (sessions.length > 0), ИЛИ
    // - он есть в activity_logs и НЕ только в удаленных данных
    const isLocalUser = sessions.length > 0 || activityUsers[user];
    
    if (!isLocalUser) {
      logMsg(`⚠️ Пропускаем пользователя ${user} - нет локальных sessions и нет локальной активности`);
      continue;
    }
    
    logMsg(`✅ Добавляем пользователя ${user} в локальный отчет (sessions: ${sessions.length}, есть активность: ${!!activityUsers[user]})`);
    
    let displayName = user;
    try {
      let userRow = await db.getUserByUsername(user);
      if (!userRow) {
        // Пробуем найти по нормализованному имени (username может быть "elena_popovich", а fio "Олена Попович")
        const allUsers = await db.getAllUsers();
        
        // Функция нормализации для сравнения
        const normalize = (str) => str.toLowerCase().replace(/[_-]/g, '').replace(/\s+/g, '');
        const normalizeUsername = (username) => {
          // Преобразуем "elena_popovich" -> "elenapopovich"
          return normalize(username);
        };
        const normalizeFio = (fio) => {
          // Преобразуем "Олена Попович" -> "olenapopovich" (транслитерация)
          const translit = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
          };
          let result = fio.toLowerCase();
          for (const [ru, en] of Object.entries(translit)) {
            result = result.replace(new RegExp(ru, 'g'), en);
          }
          return normalize(result);
        };
        
        const normalizedUser = normalizeUsername(user);
        for (const u of allUsers) {
          if (u.fio) {
            const normalizedFio = normalizeFio(u.fio);
            // Проверяем, совпадает ли нормализованное имя
            if (normalizedFio === normalizedUser || normalizedFio.includes(normalizedUser) || normalizedUser.includes(normalizedFio)) {
              userRow = u;
              break;
            }
          }
          // Также проверяем по username, если он есть
          if (u.username && normalizeUsername(u.username) === normalizedUser) {
            userRow = u;
            break;
          }
        }
        
        // Если не нашли, пробуем найти пользователя с пустым username
        if (!userRow) {
          const usersWithEmptyUsername = allUsers.filter(u => !u.username || u.username === '');
          if (usersWithEmptyUsername.length === 1 && usersWithEmptyUsername[0].fio) {
            userRow = usersWithEmptyUsername[0];
          }
        }
      }
      if (userRow) {
        displayName = userRow.fio || userRow.full_name || userRow.name || userRow.username || user;
      }
    } catch (e) {
      displayName = user;
    }
    
    sessions.sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
    const firstLogin = sessions.find(e => e.event_type === 'login');
    const lastLogout = [...sessions].reverse().find(e => e.event_type === 'logout');
    
    // Группируем сессии по дням для правильного расчета времени за период
    const sessionsByDate = {};
    for (const session of sessions) {
      const sessionDate = new Date(session.event_time).toISOString().slice(0, 10);
      if (!sessionsByDate[sessionDate]) {
        sessionsByDate[sessionDate] = [];
      }
      sessionsByDate[sessionDate].push(session);
    }
    
    // Рассчитываем время для каждого дня отдельно и суммируем
    let totalMs = 0;
    for (const [date, daySessions] of Object.entries(sessionsByDate)) {
      daySessions.sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
      const dayFirstLogin = daySessions.find(e => e.event_type === 'login' || e.event_type === 'other');
      const dayLastLogout = [...daySessions].reverse().find(e => e.event_type === 'logout');
      
      if (dayFirstLogin && dayLastLogout) {
        const dayDiffMs = new Date(dayLastLogout.event_time) - new Date(dayFirstLogin.event_time);
        if (dayDiffMs > 0) {
          totalMs += dayDiffMs;
        }
      } else if (dayFirstLogin && !dayLastLogout) {
        // Если есть login, но нет logout, считаем до конца дня или до последнего события
        const lastEvent = daySessions[daySessions.length - 1];
        if (lastEvent) {
          const dayDiffMs = new Date(lastEvent.event_time) - new Date(dayFirstLogin.event_time);
          if (dayDiffMs > 0) {
            totalMs += dayDiffMs;
          }
        }
      }
    }
    
    const totalHours = Math.floor(totalMs / 3600000);
    const totalMinutes = Math.floor((totalMs % 3600000) / 60000);
    const totalTimeStr = totalMs > 0 ? `${totalHours} ч ${totalMinutes} мин` : '';
    
    // Проверяем, не добавляли ли мы уже пользователя с таким FIO
    const normalizedFio = displayName.toLowerCase().trim();
    if (seenFios.has(normalizedFio)) {
      logMsg(`⚠️ Пропускаем дубликат пользователя ${user} (FIO: ${displayName}) - уже добавлен`);
      continue;
    }
    seenFios.add(normalizedFio);
    
    report.push({
      username: user,
      fio: displayName,
      firstLogin: firstLogin ? firstLogin.event_time : '',
      lastLogout: lastLogout ? lastLogout.event_time : '',
      totalHours: totalMs > 0 ? Number((totalMs / 3600000).toFixed(1)) : 0,
      totalTimeStr,
      sessions: sessions || []
    });
  }
  
  logMsg(`Итоговый локальный отчёт содержит ${report.length} пользователей`);
  return report;
}

// Генерация отчёта для УДАЛЕННЫХ пользователей: только remote_work_time_logs
async function getRemoteWorkTimeReport({ start, end, username }) {
  const fs = require('fs');
  const path = require('path');
  const logFiles = [
    '/tmp/quick-db-report-debug.log',
    '/var/tmp/quick-db-report-debug.log',
    path.join(__dirname, '../../quick-db-report-debug.log')
  ];
  
  const logMsg = (msg) => {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    for (const logFile of logFiles) {
      try {
        fs.appendFileSync(logFile, line, { mode: 0o666 });
      } catch (e) {}
    }
    console.log(`📊 [getRemoteWorkTimeReport] ${msg}`);
  };
  
  logMsg(`=== НАЧАЛО getRemoteWorkTimeReport (УДАЛЕННЫЕ данные) ===`);
  logMsg(`Запрос данных: start=${start}, end=${end}, username=${username || 'all'}`);
  
  // ТОЛЬКО удаленные данные: remote_work_time_logs (от удаленного сервера)
  const remoteLogs = await db.getRemoteWorkTimeLogs({ start, end, username });
  logMsg(`remote_work_time_logs (удаленные): ${remoteLogs?.length || 0} записей`);
  
  const userMap = {};
  for (const log of remoteLogs) {
    if (!log.username) continue;
    userMap[log.username] = userMap[log.username] || [];
    userMap[log.username].push(log);
  }
  
  const report = [];
  logMsg(`Всего удаленных пользователей: ${Object.keys(userMap).length}`);
  
  for (const [user, sessions] of Object.entries(userMap)) {
    if (!user || !sessions.length) {
      continue;
    }
    
    let displayName = user;
    try {
      let userRow = await db.getUserByUsername(user);
      if (!userRow) {
        // Пробуем найти по нормализованному имени (username может быть "elena_popovich", а fio "Олена Попович")
        const allUsers = await db.getAllUsers();
        
        // Функция нормализации для сравнения
        const normalize = (str) => str.toLowerCase().replace(/[_-]/g, '').replace(/\s+/g, '');
        const normalizeUsername = (username) => {
          // Преобразуем "elena_popovich" -> "elenapopovich"
          return normalize(username);
        };
        const normalizeFio = (fio) => {
          // Преобразуем "Олена Попович" -> "olenapopovich" (транслитерация)
          const translit = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
          };
          let result = fio.toLowerCase();
          for (const [ru, en] of Object.entries(translit)) {
            result = result.replace(new RegExp(ru, 'g'), en);
          }
          return normalize(result);
        };
        
        const normalizedUser = normalizeUsername(user);
        for (const u of allUsers) {
          if (u.fio) {
            const normalizedFio = normalizeFio(u.fio);
            // Проверяем, совпадает ли нормализованное имя
            if (normalizedFio === normalizedUser || normalizedFio.includes(normalizedUser) || normalizedUser.includes(normalizedFio)) {
              userRow = u;
              break;
            }
          }
          // Также проверяем по username, если он есть
          if (u.username && normalizeUsername(u.username) === normalizedUser) {
            userRow = u;
            break;
          }
        }
        
        // Если не нашли, пробуем найти пользователя с пустым username
        if (!userRow) {
          const usersWithEmptyUsername = allUsers.filter(u => !u.username || u.username === '');
          if (usersWithEmptyUsername.length === 1 && usersWithEmptyUsername[0].fio) {
            userRow = usersWithEmptyUsername[0];
          }
        }
      }
      if (userRow) {
        displayName = userRow.fio || userRow.full_name || userRow.name || userRow.username || user;
      }
    } catch (e) {
      displayName = user;
    }
    
    sessions.sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
    const firstLogin = sessions.find(e => e.event_type === 'login');
    const lastLogout = [...sessions].reverse().find(e => e.event_type === 'logout');
    
    // Группируем сессии по дням для правильного расчета времени за период
    const sessionsByDate = {};
    for (const session of sessions) {
      const sessionDate = new Date(session.event_time).toISOString().slice(0, 10);
      if (!sessionsByDate[sessionDate]) {
        sessionsByDate[sessionDate] = [];
      }
      sessionsByDate[sessionDate].push(session);
    }
    
    // Рассчитываем время для каждого дня отдельно и суммируем
    let totalMs = 0;
    for (const [date, daySessions] of Object.entries(sessionsByDate)) {
      daySessions.sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
      const dayFirstLogin = daySessions.find(e => e.event_type === 'login' || e.event_type === 'other');
      const dayLastLogout = [...daySessions].reverse().find(e => e.event_type === 'logout');
      
      if (dayFirstLogin && dayLastLogout) {
        const dayDiffMs = new Date(dayLastLogout.event_time) - new Date(dayFirstLogin.event_time);
        if (dayDiffMs > 0) {
          totalMs += dayDiffMs;
        }
      } else if (dayFirstLogin && !dayLastLogout) {
        // Если есть login, но нет logout, считаем до конца дня или до последнего события
        const lastEvent = daySessions[daySessions.length - 1];
        if (lastEvent) {
          const dayDiffMs = new Date(lastEvent.event_time) - new Date(dayFirstLogin.event_time);
          if (dayDiffMs > 0) {
            totalMs += dayDiffMs;
          }
        }
      }
    }
    
    const totalHours = Math.floor(totalMs / 3600000);
    const totalMinutes = Math.floor((totalMs % 3600000) / 60000);
    const totalTimeStr = totalMs > 0 ? `${totalHours} ч ${totalMinutes} мин` : '';
    
    report.push({
      username: user,
      fio: displayName,
      firstLogin: firstLogin ? firstLogin.event_time : '',
      lastLogout: lastLogout ? lastLogout.event_time : '',
      totalHours: totalMs > 0 ? Number((totalMs / 3600000).toFixed(1)) : 0,
      totalTimeStr,
      sessions: sessions || []
    });
  }
  
  logMsg(`Итоговый удаленный отчёт содержит ${report.length} пользователей`);
  return report;
}

// Генерация отчёта по базе: первый вход (login), последний выход (logout) за период
// УСТАРЕВШАЯ ФУНКЦИЯ - используется только для обратной совместимости
async function getDbShortReport({ start, end, username }) {
  const fs = require('fs');
  const path = require('path');
  // Пробуем несколько путей для лог-файла
  const logFiles = [
    '/tmp/quick-db-report-debug.log',
    '/var/tmp/quick-db-report-debug.log',
    path.join(__dirname, '../../quick-db-report-debug.log')
  ];
  
  const logMsg = (msg) => {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    // Пробуем записать во все доступные файлы
    for (const logFile of logFiles) {
      try {
        fs.appendFileSync(logFile, line, { mode: 0o666 });
      } catch (e) {
        // Игнорируем ошибки
      }
    }
    // Выводим в консоль (используем console.log для PM2)
    console.log(`📊 [getDbShortReport] ${msg}`);
  };
  
  logMsg(`=== НАЧАЛО getDbShortReport ===`);
  logMsg(`Запрос данных: start=${start}, end=${end}, username=${username || 'all'}`);
  
  // Получаем логи из обеих таблиц: work_time_logs (старые данные) и remote_work_time_logs (новые данные от агентов)
  const periodLogs = await db.getWorkTimeLogs({ start, end, username });
  logMsg(`work_time_logs: ${periodLogs?.length || 0} записей`);
  
  const remoteLogs = await db.getRemoteWorkTimeLogs({ start, end, username });
  logMsg(`remote_work_time_logs: ${remoteLogs?.length || 0} записей`);
  
  // Также получаем пользователей из activity_logs, у которых есть активность, даже если нет login/logout
  logMsg(`🔍 Вызываем db.getActivityLogsBetween({ start: '${start}', end: '${end}' })`);
  const activityLogs = await db.getActivityLogsBetween({ start, end });
  logMsg(`activity_logs: ${activityLogs?.length || 0} записей`);
  
  if (activityLogs.length > 0) {
    logMsg(`📋 Первые 3 записи activity_logs:`);
    activityLogs.slice(0, 3).forEach((log, idx) => {
      logMsg(`  [${idx}] username: ${log.username}, timestamp: ${log.timestamp}`);
    });
  }
  
  const activityUsers = {};
  for (const log of activityLogs) {
    if (!log.username) continue;
    if (username && log.username !== username) continue;
    activityUsers[log.username] = true;
  }
  logMsg(`Уникальных пользователей в activity_logs: ${Object.keys(activityUsers).length}`);
  if (Object.keys(activityUsers).length > 0) {
    logMsg(`👥 Пользователи: ${Object.keys(activityUsers).join(', ')}`);
  }
  
  // УСТАРЕВШАЯ ФУНКЦИЯ - объединяет локальные и удаленные данные
  // Используется только для обратной совместимости
  // Объединяем логи из обеих таблиц
  const allLogs = [...periodLogs, ...remoteLogs];
  
  const userMap = {};
  
  for (const log of allLogs) {
    if (!log.username) continue;
    userMap[log.username] = userMap[log.username] || [];
    userMap[log.username].push(log);
  }
  
  // Добавляем пользователей из activity_logs, у которых нет login/logout, но есть активность
  for (const activityUser of Object.keys(activityUsers)) {
    if (!userMap[activityUser]) {
      userMap[activityUser] = []; // Создаём пустой массив sessions, чтобы пользователь попал в отчёт
    }
  }
  
  const report = [];
  
  logMsg(`Всего пользователей в userMap: ${Object.keys(userMap).length}`);
  logMsg(`Пользователи в activityUsers: ${Object.keys(activityUsers).join(', ')}`);
  
  for (const [user, sessions] of Object.entries(userMap)) {
    logMsg(`Обрабатываем пользователя: ${user}, sessions: ${sessions.length}, в activityUsers: ${!!activityUsers[user]}`);
    if (!user || (!sessions.length && !activityUsers[user])) {
      logMsg(`Пропускаем пользователя ${user}: нет sessions и нет в activityUsers`);
      continue;
    }
    
    // Пытаемся обогатить данные ФИО из таблицы users
    // Это позволяет исправить ситуации, когда в work_time_logs имя хранится битым (????),
    // но в users.fio оно сохранено корректно.
    let displayName = user;
    try {
      // Сначала пробуем найти по username
      let userRow = await db.getUserByUsername(user);
      
      // Если не найден, пробуем найти по нормализованному имени
      if (!userRow) {
        const allUsers = await db.getAllUsers();
        
        // Функция нормализации для сравнения
        const normalize = (str) => str.toLowerCase().replace(/[_-]/g, '').replace(/\s+/g, '');
        const normalizeUsername = (username) => normalize(username);
        const normalizeFio = (fio) => {
          const translit = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
          };
          let result = fio.toLowerCase();
          for (const [ru, en] of Object.entries(translit)) {
            result = result.replace(new RegExp(ru, 'g'), en);
          }
          return normalize(result);
        };
        
        const normalizedUser = normalizeUsername(user);
        for (const u of allUsers) {
          if (u.fio) {
            const normalizedFio = normalizeFio(u.fio);
            if (normalizedFio === normalizedUser || normalizedFio.includes(normalizedUser) || normalizedUser.includes(normalizedFio)) {
              userRow = u;
              break;
            }
          }
          if (u.username && normalizeUsername(u.username) === normalizedUser) {
            userRow = u;
            break;
          }
        }
        
        // Если не нашли, пробуем найти пользователя с пустым username
        if (!userRow) {
          const usersWithEmptyUsername = allUsers.filter(u => !u.username || u.username === '');
          if (usersWithEmptyUsername.length === 1 && usersWithEmptyUsername[0].fio) {
            userRow = usersWithEmptyUsername[0];
          }
        }
      }
      
      if (userRow) {
        displayName = userRow.fio || userRow.full_name || userRow.name || userRow.username || user;
      }
    } catch (e) {
      console.error(`[quickCsvReport] Ошибка при получении пользователя "${user}":`, e);
      // В случае ошибки просто используем исходное значение user
      displayName = user;
    }
    
    sessions.sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
    
    // Только события в пределах дня
    const firstLogin = sessions.find(e => e.event_type === 'login');
    const lastLogout = [...sessions].reverse().find(e => e.event_type === 'logout');
    
    let totalHours = 0;
    let totalMinutes = 0;
    let totalTimeStr = '';
    
    if (firstLogin && lastLogout) {
      const diffMs = new Date(lastLogout.event_time) - new Date(firstLogin.event_time);
      totalHours = Math.floor(diffMs / 3600000);
      totalMinutes = Math.floor((diffMs % 3600000) / 60000);
      totalTimeStr = `${totalHours} ч ${totalMinutes} мин`;
    }
    
    report.push({
      // fio берём из users.fio, если есть, иначе используем username из логов
      username: user,  // Важно: сохраняем исходный username для сопоставления с activity-summary
      fio: displayName,
      firstLogin: firstLogin ? firstLogin.event_time : '',
      lastLogout: lastLogout ? lastLogout.event_time : '',
      totalHours: firstLogin && lastLogout ? 
        Number(((new Date(lastLogout.event_time) - new Date(firstLogin.event_time)) / 3600000).toFixed(1)) : 0,
      totalTimeStr,
      sessions: sessions || [] // Убеждаемся, что sessions всегда массив
    });
  }
  
  logMsg(`Итоговый отчёт содержит ${report.length} пользователей`);
  if (report.length > 0) {
    logMsg(`Первый пользователь в отчёте: ${report[0].username}, fio: ${report[0].fio}`);
  }
  return report;
}

// API: /api/local-worktime-report?start=YYYY-MM-DD&end=YYYY-MM-DD&username=...
// Отчет для ЛОКАЛЬНЫХ пользователей (work_time_logs + activity_logs)
// ВРЕМЕННО: убрал authenticateToken для отладки
router.get('/local-worktime-report', async (req, res) => {
  console.log(`🔴🔴🔴 [local-worktime-report] РОУТ ВЫЗВАН! Method: ${req.method}, Path: ${req.path}, Query: ${JSON.stringify(req.query)}`);
  console.log(`📊 [local-worktime-report] Запрос локальных данных. Query: ${JSON.stringify(req.query)}`);
  
  try {
    let { start, end, username } = req.query;
    
    // Если start === end, используем точный день (00:00:00 - 23:59:59) без расширения
    const originalStart = start;
    const originalEnd = end;
    let isSingleDay = false;
    
    // Нормализуем даты (убираем пробелы, приводим к строке)
    if (start) start = String(start).trim();
    if (end) end = String(end).trim();
    
    console.log(`🔍 [local-worktime-report] ДО нормализации: originalStart="${originalStart}", originalEnd="${originalEnd}"`);
    console.log(`🔍 [local-worktime-report] ПОСЛЕ нормализации: start="${start}", end="${end}"`);
    console.log(`🔍 [local-worktime-report] Сравнение: start === end: ${start === end}, typeof start: ${typeof start}, typeof end: ${typeof end}`);
    console.log(`🔍 [local-worktime-report] Длины: start.length=${start?.length}, end.length=${end?.length}`);
    
    if (start && end) {
      if (start === end) {
        // Один день: используем только дату (без времени) для точного сравнения
        // Это гарантирует, что будут показаны данные именно за выбранный день
        isSingleDay = true;
        // Оставляем только дату в формате YYYY-MM-DD
        // SQL запросы будут сравнивать только дату из timestamp
        console.log(`📅 [local-worktime-report] ОДИН ДЕНЬ ОБНАРУЖЕН: ${originalStart} -> ищем данные за дату: ${start}, isSingleDay=${isSingleDay}`);
      } else {
        // Несколько дней: расширяем диапазон для учёта часового пояса (Киев UTC+2/UTC+3)
        const startDate = new Date(start + 'T00:00:00');
        startDate.setDate(startDate.getDate() - 1);
        start = startDate.toISOString().slice(0, 10);
        
        const endDate = new Date(end + 'T23:59:59');
        endDate.setDate(endDate.getDate() + 1);
        end = endDate.toISOString().slice(0, 10);
        
        console.log(`🌍 [local-worktime-report] Расширение: ${originalStart}-${originalEnd} -> ${start}-${end}`);
      }
    }
    
    const report = await getLocalWorkTimeReport({ start, end, username, isSingleDay });
    console.log(`✅ [local-worktime-report] Вернул ${report.length} локальных пользователей`);
    if (report.length === 0) {
      console.log(`⚠️ [local-worktime-report] Нет данных для периода ${start} - ${end}`);
      console.log(`⚠️ [local-worktime-report] Проверьте логи getLocalWorkTimeReport выше`);
    }
    
    res.json({ success: true, report, debug: { start, end, username, count: report.length } });
  } catch (err) {
    console.error(`❌ [local-worktime-report] Ошибка:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: /api/quick-db-report?start=YYYY-MM-DD&end=YYYY-MM-DD&username=...
// Отчет для УДАЛЕННЫХ пользователей (только remote_work_time_logs)
router.get('/quick-db-report', async (req, res) => {
  console.log(`📊 [quick-db-report] Запрос УДАЛЕННЫХ данных. Query: ${JSON.stringify(req.query)}`);
  
  try {
    let { start, end, username } = req.query;
    
    // Расширяем диапазон дат для учёта часового пояса (Киев UTC+2/UTC+3)
    const originalStart = start;
    const originalEnd = end;
    
    if (start && end) {
      const startDate = new Date(start + 'T00:00:00');
      startDate.setDate(startDate.getDate() - 1);
      start = startDate.toISOString().slice(0, 10);
      
      const endDate = new Date(end + 'T23:59:59');
      endDate.setDate(endDate.getDate() + 1);
      end = endDate.toISOString().slice(0, 10);
      
      console.log(`🌍 [quick-db-report] Расширение: ${originalStart}-${originalEnd} -> ${start}-${end}`);
    }
    
    const report = await getRemoteWorkTimeReport({ start, end, username });
    console.log(`✅ [quick-db-report] Вернул ${report.length} удаленных пользователей`);
    
    res.json({ success: true, report });
  } catch (err) {
    console.error(`❌ [quick-db-report] Ошибка:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Получение списка уникальных пользователей из базы
router.get('/worktime-users', async (req, res) => {
  try {
    const users = await db.getUniqueUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Генерация полного отчета по времени работы
router.get('/report/worktime', async (req, res) => {
  try {
    const { start, end, username } = req.query;
    const logs = await db.getWorkTimeLogs({ start, end, username });
    const remoteLogs = await db.getRemoteWorkTimeLogs({ start, end, username });
    // Объединяем логи из обеих таблиц
    const allLogs = [...logs, ...remoteLogs];
    res.json({ success: true, logs: allLogs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Новый роут: отчет по отработке отгулов
router.get('/leaves-worktime-report', async (req, res) => {
  try {
    // Получаем токен и пользователя
    const token = req.headers.authorization?.replace('Bearer ', '');
    let currentUser = null;
    if (token) {
      currentUser = await db.getUserByToken(token);
    }
    
    // Получаем все одобренные и отработанные отгулы
    const leaves = await db.getAllLeaves();
    const approvedLeaves = leaves.filter(l => l.type === 'leave' && (l.status === 'approved' || l.status === 'completed'));
    
    const result = [];
    
    // Для каждого одобренного отгула создаем отдельную запись
    for (const leave of approvedLeaves) {
      // Получаем пользователя
      const user = await db.getUserById(leave.userId);
      
      // Вычисляем требуемые часы для этого отгула
      let requiredHours = 0;
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const isSameDay = leave.startDate && leave.endDate && leave.startDate === leave.endDate;
      const minutes = Number(leave.minutes) || 0;
      
      if (isSameDay && minutes > 0) {
        requiredHours = minutes / 60;
      } else {
        // Количество дней отгула
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        requiredHours = days * 8; // 8 часов в день
      }
      
      // Считаем отработанные часы для этого конкретного отгула
      let workedHours = 0;
      
      // Получаем отработку из новой таблицы leave_worktime
      const leaveWorktime = await db.getLeaveWorktime(leave.id);
      const totalWorkedMinutes = leaveWorktime.reduce((sum, w) => sum + (Number(w.minutes) || 0), 0);
      workedHours = totalWorkedMinutes / 60;
      
      console.log(`📊 Leave ${leave.id} (user: ${leave.userId}): worked ${totalWorkedMinutes} minutes (${workedHours} hours) from ${leaveWorktime.length} sessions`);
      if (leaveWorktime.length > 0) {
        console.log(`   Sessions:`, leaveWorktime.map(w => `${w.date}: ${w.minutes}min`));
      }
      
      // Определяем статус отработки
      let status = 'Не начато';
      if (leave.status === 'completed') {
        status = 'Отработано';
      } else if (workedHours > 0 && workedHours < requiredHours) {
        status = 'В процессе';
      } else if (workedHours >= requiredHours) {
        status = 'На проверке';
      }
      
      const resultItem = {
        id: leave.id, // Добавляем id для совместимости с фронтендом
        leaveId: leave.id,
        userId: leave.userId,
        username: user?.username || 'Сотрудник',
        fio: user?.fio || user?.username || 'Сотрудник',
        avatar: user?.avatar || '/api/avatars/default.png',
        leaveStartDate: leave.startDate,
        leaveEndDate: leave.endDate,
        leaveReason: leave.reason || '',
        requiredHours: Math.round(requiredHours * 100) / 100,
        workedHours: Math.round(workedHours * 100) / 100,
        progressPercent: requiredHours > 0 ? Math.min(100, Math.round((workedHours / requiredHours) * 100)) : 0,
        status: leave.status, // Статус отгула из базы данных (approved/completed)
        workStatus: status, // Статус отработки (Не начато/В процессе/На проверке/Отработано)
        completedAt: leave.status === 'completed' ? new Date().toISOString() : null // Дата завершения
      };
      
      result.push(resultItem);
    }
    
    // Фильтрация для обычного сотрудника
    if (currentUser && !['hr','admin','руководитель'].includes(currentUser.role)) {
      const onlyMe = result.filter(r => r.userId === currentUser.id);
      return res.json(onlyMe);
    }
    
    res.json(result);
  } catch (err) {
    console.error('Error in leaves-worktime-report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Экспортируем функции для использования в других модулях
module.exports = router;
module.exports.getLocalWorkTimeReport = getLocalWorkTimeReport;
module.exports.getRemoteWorkTimeReport = getRemoteWorkTimeReport;