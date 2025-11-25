const express = require('express');
const db = require('../database');
const router = express.Router();

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

// Генерация отчёта по базе: первый вход (login), последний выход (logout) за период
async function getDbShortReport({ start, end, username }) {
  console.log(`📊 [getDbShortReport] Запрос данных: start=${start}, end=${end}, username=${username || 'all'}`);
  
  // Получаем логи из обеих таблиц: work_time_logs (старые данные) и remote_work_time_logs (новые данные от агентов)
  const periodLogs = await db.getWorkTimeLogs({ start, end, username });
  console.log(`📊 [getDbShortReport] work_time_logs: ${periodLogs?.length || 0} записей`);
  
  const remoteLogs = await db.getRemoteWorkTimeLogs({ start, end, username });
  console.log(`📊 [getDbShortReport] remote_work_time_logs: ${remoteLogs?.length || 0} записей`);
  
  // Также получаем пользователей из activity_logs, у которых есть активность, даже если нет login/logout
  const activityLogs = await db.getActivityLogsBetween({ start, end });
  console.log(`📊 [getDbShortReport] activity_logs: ${activityLogs?.length || 0} записей`);
  
  const activityUsers = {};
  for (const log of activityLogs) {
    if (!log.username) continue;
    if (username && log.username !== username) continue;
    activityUsers[log.username] = true;
  }
  console.log(`📊 [getDbShortReport] Уникальных пользователей в activity_logs: ${Object.keys(activityUsers).length}`);
  
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
  
  for (const [user, sessions] of Object.entries(userMap)) {
    if (!user || (!sessions.length && !activityUsers[user])) continue;
    
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
  
  return report;
}

// API: /api/quick-db-report?start=YYYY-MM-DD&end=YYYY-MM-DD&username=...
router.get('/quick-db-report', async (req, res) => {
  try {
    console.log(`🚀 [quick-db-report] ПОЛУЧЕН ЗАПРОС:`, req.query);
    let { start, end, username } = req.query;
    
    // Фронтенд теперь сам расширяет диапазон для учёта часового пояса,
    // поэтому здесь мы просто используем переданные даты как есть
    if (!start || !end) {
      console.log(`⚠️ [quick-db-report] start или end не указаны: start=${start}, end=${end}`);
    } else {
      console.log(`📅 [quick-db-report] Запрашиваем данные за период: ${start} - ${end}`);
    }
    
    const report = await getDbShortReport({ start, end, username });
    console.log(`✅ [quick-db-report] Возвращаем отчёт: ${report.length} пользователей`);
    res.json({ success: true, report });
  } catch (err) {
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