const express = require('express');
const db = require('../database');
const router = express.Router();

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
async function getLocalWorkTimeReport({ start, end, username }) {
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
  logMsg(`Запрос данных: start=${start}, end=${end}, username=${username || 'all'}`);
  
  // ТОЛЬКО локальные данные: work_time_logs (от агента включения/выключения)
  const periodLogs = await db.getWorkTimeLogs({ start, end, username });
  logMsg(`work_time_logs (локальные): ${periodLogs?.length || 0} записей`);
  
  // Также получаем пользователей из activity_logs (от агента активности)
  const activityLogs = await db.getActivityLogsBetween({ start, end });
  logMsg(`activity_logs (локальные): ${activityLogs?.length || 0} записей`);
  
  // Получаем список удаленных пользователей, чтобы ИСКЛЮЧИТЬ их из локального отчета
  const remoteLogs = await db.getRemoteWorkTimeLogs({ start, end });
  const remoteUsernames = new Set();
  for (const log of remoteLogs) {
    if (log.username) remoteUsernames.add(log.username);
  }
  logMsg(`Удаленных пользователей для исключения: ${remoteUsernames.size}`);
  if (remoteUsernames.size > 0) {
    logMsg(`Удаленные пользователи: ${Array.from(remoteUsernames).join(', ')}`);
  }
  
  const activityUsers = {};
  for (const log of activityLogs) {
    if (!log.username) continue;
    if (username && log.username !== username) continue;
    // ИСКЛЮЧАЕМ пользователей, которые есть в удаленных данных
    if (remoteUsernames.has(log.username)) {
      logMsg(`⚠️ Исключаем пользователя ${log.username} из локального отчета (есть в удаленных данных)`);
      continue;
    }
    activityUsers[log.username] = true;
  }
  logMsg(`Уникальных локальных пользователей в activity_logs (после исключения удаленных): ${Object.keys(activityUsers).length}`);
  
  // ТОЛЬКО локальные логи (БЕЗ remote_work_time_logs)
  // ИСКЛЮЧАЕМ логи пользователей, которые есть в удаленных данных
  const allLogs = periodLogs.filter(log => {
    if (!log.username) return false;
    // Исключаем пользователей, которые есть в удаленных данных
    if (remoteUsernames.has(log.username)) {
      logMsg(`⚠️ Исключаем логи пользователя ${log.username} из локального отчета (есть в удаленных данных)`);
      return false;
    }
    return true;
  });
  logMsg(`Локальных логов после исключения удаленных пользователей: ${allLogs.length}`);
  
  const userMap = {};
  for (const log of allLogs) {
    if (!log.username) continue;
    userMap[log.username] = userMap[log.username] || [];
    userMap[log.username].push(log);
  }
  
  // Добавляем пользователей из activity_logs, у которых нет login/logout, но есть активность
  for (const activityUser of Object.keys(activityUsers)) {
    if (!userMap[activityUser]) {
      userMap[activityUser] = [];
    }
  }
  
  const report = [];
  logMsg(`Всего локальных пользователей в userMap: ${Object.keys(userMap).length}`);
  logMsg(`Пользователи в userMap: ${Object.keys(userMap).join(', ')}`);
  logMsg(`Пользователи в activityUsers: ${Object.keys(activityUsers).join(', ')}`);
  
  for (const [user, sessions] of Object.entries(userMap)) {
    if (!user) {
      logMsg(`⚠️ Пропускаем пользователя с пустым username`);
      continue;
    }
    
    // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: исключаем пользователей, которые есть в удаленных данных
    if (remoteUsernames.has(user)) {
      logMsg(`⚠️ Пропускаем пользователя ${user} - он есть в удаленных данных`);
      continue;
    }
    
    // Включаем пользователя, если есть либо sessions, либо активность
    if (!sessions.length && !activityUsers[user]) {
      logMsg(`⚠️ Пропускаем пользователя ${user} - нет sessions и нет активности`);
      continue;
    }
    
    logMsg(`✅ Добавляем пользователя ${user} в отчет (sessions: ${sessions.length}, есть активность: ${!!activityUsers[user]})`);
    
    let displayName = user;
    try {
      let userRow = await db.getUserByUsername(user);
      if (!userRow) {
        const allUsers = await db.getAllUsers();
        const usersWithEmptyUsername = allUsers.filter(u => !u.username || u.username === '');
        if (usersWithEmptyUsername.length === 1 && usersWithEmptyUsername[0].fio) {
          userRow = usersWithEmptyUsername[0];
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
      username: user,
      fio: displayName,
      firstLogin: firstLogin ? firstLogin.event_time : '',
      lastLogout: lastLogout ? lastLogout.event_time : '',
      totalHours: firstLogin && lastLogout ? 
        Number(((new Date(lastLogout.event_time) - new Date(firstLogin.event_time)) / 3600000).toFixed(1)) : 0,
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
        const allUsers = await db.getAllUsers();
        const usersWithEmptyUsername = allUsers.filter(u => !u.username || u.username === '');
        if (usersWithEmptyUsername.length === 1 && usersWithEmptyUsername[0].fio) {
          userRow = usersWithEmptyUsername[0];
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
      username: user,
      fio: displayName,
      firstLogin: firstLogin ? firstLogin.event_time : '',
      lastLogout: lastLogout ? lastLogout.event_time : '',
      totalHours: firstLogin && lastLogout ? 
        Number(((new Date(lastLogout.event_time) - new Date(firstLogin.event_time)) / 3600000).toFixed(1)) : 0,
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
      
      // Если не найден, пробуем найти пользователей с пустым username
      // и попытаемся сопоставить по другим признакам (например, через work_time_logs)
      if (!userRow) {
        // Пробуем найти пользователей с пустым username - возможно, там есть нужный fio
        const allUsers = await db.getAllUsers();
        // Ищем пользователя, у которого username пустой, но возможно fio связано
        // Это временное решение - в идеале нужно заполнить username в таблице users
        console.log(`[quickCsvReport] Пользователь "${user}" не найден по username. Всего пользователей: ${allUsers.length}`);
        
        // Если есть только один пользователь с пустым username - используем его (временное решение)
        const usersWithEmptyUsername = allUsers.filter(u => !u.username || u.username === '');
        if (usersWithEmptyUsername.length === 1 && usersWithEmptyUsername[0].fio) {
          console.log(`[quickCsvReport] Найден пользователь с пустым username, используем его FIO: ${usersWithEmptyUsername[0].fio}`);
          userRow = usersWithEmptyUsername[0];
        }
      }
      
      if (userRow) {
        // Проверяем различные варианты поля для ФИО
        displayName = userRow.fio || userRow.full_name || userRow.name || userRow.username || user;
        console.log(`[quickCsvReport] displayName для "${user}":`, displayName);
      } else {
        console.log(`[quickCsvReport] Пользователь "${user}" не найден в таблице users`);
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
router.get('/local-worktime-report', async (req, res) => {
  console.log(`📊 [local-worktime-report] Запрос локальных данных. Query: ${JSON.stringify(req.query)}`);
  
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
      
      console.log(`🌍 [local-worktime-report] Расширение: ${originalStart}-${originalEnd} -> ${start}-${end}`);
    }
    
    const report = await getLocalWorkTimeReport({ start, end, username });
    console.log(`✅ [local-worktime-report] Вернул ${report.length} локальных пользователей`);
    
    res.json({ success: true, report });
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

module.exports = router;