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
  // Получаем логи только за выбранный период для отображения и расчёта
  const periodLogs = await db.getWorkTimeLogs({ start, end, username });
  const userMap = {};
  
  for (const log of periodLogs) {
    if (!log.username) continue;
    userMap[log.username] = userMap[log.username] || [];
    userMap[log.username].push(log);
  }
  
  const report = [];
  
  for (const [user, sessions] of Object.entries(userMap)) {
    if (!user || !sessions.length) continue;
    
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
      fio: user,
      firstLogin: firstLogin ? firstLogin.event_time : '',
      lastLogout: lastLogout ? lastLogout.event_time : '',
      totalHours: firstLogin && lastLogout ? 
        Number(((new Date(lastLogout.event_time) - new Date(firstLogin.event_time)) / 3600000).toFixed(1)) : 0,
      totalTimeStr,
      sessions
    });
  }
  
  return report;
}

// API: /api/quick-db-report?start=YYYY-MM-DD&end=YYYY-MM-DD&username=...
router.get('/quick-db-report', async (req, res) => {
  try {
    const { start, end, username } = req.query;
    const report = await getDbShortReport({ start, end, username });
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
    res.json({ success: true, logs });
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