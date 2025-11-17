/**
 * ПАТЧ ДЛЯ ДОБАВЛЕНИЯ WEBSOCKET УВЕДОМЛЕНИЙ О ПОДТВЕРЖДЕНИИ ОТРАБОТКИ
 * 
 * Этот файл содержит код, который нужно добавить в server.js для полной функциональности
 * системы отработки отгулов с уведомлениями в реальном времени.
 */

// ========== ИНСТРУКЦИЯ ПО ПРИМЕНЕНИЮ ==========
/*
1. Найдите в server.js строку 2181:
   try { await db.markTodaySessionsCompleted(Number(userId), day); } catch (_) {}

2. После этой строки и ПЕРЕД строкой:
   res.json({ success: true });

3. Добавьте следующий код:
*/

const WEBSOCKET_PATCH_FOR_LEAVES_VERIFY = `
    // Отправляем WebSocket уведомление пользователю о подтверждении
    if (io && connectedUsers.has(Number(userId))) {
      const userSocketId = connectedUsers.get(Number(userId));
      if (userSocketId) {
        io.to(userSocketId).emit('worktime_verified', {
          userId: Number(userId),
          date: day,
          status: 'completed',
          verifiedBy: req.user.userId,
          leaveMinutes: lm,
          workedMinutes: wm
        });
      }
    }
`;

// ========== ДОПОЛНИТЕЛЬНЫЕ API ENDPOINTS ==========
/*
Также рекомендуется добавить следующие endpoints для полной функциональности:
*/

// Endpoint для создания записи в истории отработок
const CREATE_WORKTIME_HISTORY_ENDPOINT = `
// Создать запись в истории отработок
app.post('/api/worktime-history', authenticateToken, async (req, res) => {
  try {
    const { userId, username, date, requiredMinutes, workedMinutes, status } = req.body;
    
    if (!userId || !date) {
      return res.status(400).json({ error: 'userId и date обязательны' });
    }

    await db.createWorktimeHistory({
      userId: Number(userId),
      username: username || '',
      date: String(date).slice(0, 10),
      requiredMinutes: Number(requiredMinutes) || 0,
      workedMinutes: Number(workedMinutes) || 0,
      status: status || 'pending'
    });
    
    res.json({ success: true });
  } catch (e) {
    console.error('Ошибка создания записи в истории отработок:', e);
    res.status(500).json({ error: 'Ошибка создания записи', details: e.message });
  }
});
`;

// ========== АВТОМАТИЧЕСКИЙ ПЕРЕСЧЕТ ПО РАСПИСАНИЮ ==========
/*
Для автоматического пересчета на следующий день добавьте в server.js:
*/

const AUTO_CALCULATE_SCHEDULER = `
// Автоматический пересчет отработки каждый день в 9:00
const cron = require('node-cron');

// Запускаем каждый день в 9:00
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('🔄 Запуск автоматического пересчета отработки за вчерашний день');
    
    const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString().slice(0, 10);
    
    // Получаем отчет за вчерашний день
    const reportData = await fetch(\`http://localhost:\${process.env.PORT || 5000}/api/quick-db-report?start=\${yesterday}&end=\${yesterday}\`, {
      headers: { Authorization: 'Bearer ' + process.env.ADMIN_TOKEN }
    }).then(r => r.json()).catch(() => ({ report: [] }));
    
    const report = Array.isArray(reportData?.report) ? reportData.report : [];
    let processedCount = 0;
    
    for (const userReport of report) {
      const username = userReport.fio || userReport.username || '';
      if (!username) continue;
      
      // Найти пользователя
      const allUsers = await db.getAllUsers();
      const user = allUsers.find(u => u.username === username);
      if (!user) continue;
      
      // Проверить, есть ли у пользователя отгул на эту дату
      const leaves = await db.getAllLeaves();
      const userLeave = leaves.find(l => 
        l.userId === user.id && 
        l.status === 'approved' && 
        String(l.startDate).slice(0, 10) <= yesterday && 
        String(l.endDate).slice(0, 10) >= yesterday
      );
      
      if (!userLeave) continue;
      
      const requiredMinutes = Number(userLeave.minutes) || 0;
      if (requiredMinutes <= 0) continue;
      
      // Рассчитать переработку из отчета
      let overtimeMinutes = 0;
      try {
        const loginTime = userReport.firstLogin ? new Date(userReport.firstLogin) : null;
        const logoutTime = userReport.lastLogout ? new Date(userReport.lastLogout) : null;
        
        if (loginTime) {
          const workStart = new Date(loginTime);
          workStart.setHours(9, 0, 0, 0);
          if (loginTime < workStart) {
            overtimeMinutes += Math.max(0, Math.round((workStart - loginTime) / 60000));
          }
        }
        
        if (logoutTime) {
          const workEnd = new Date(logoutTime);
          workEnd.setHours(18, 0, 0, 0);
          if (logoutTime > workEnd) {
            overtimeMinutes += Math.max(0, Math.round((logoutTime - workEnd) / 60000));
          }
        }
      } catch (e) {
        console.warn(\`Ошибка расчета переработки для \${username}:\`, e);
      }
      
      // Получить данные сессий отработки
      const weekendSessions = await db.getWeekendSessionsByDate(yesterday);
      const weekdaySessions = await db.getWeekdaySessionsByDate(yesterday);
      
      const userWeekendMinutes = weekendSessions
        .filter(s => s.user_id === user.id)
        .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
      
      const userWeekdayMinutes = weekdaySessions
        .filter(s => s.user_id === user.id)
        .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
      
      const totalWorkedMinutes = overtimeMinutes + userWeekendMinutes + userWeekdayMinutes;
      
      // Обновить статус в верификациях
      if (totalWorkedMinutes >= requiredMinutes) {
        await db.updateWorktimeVerificationStatus(user.id, yesterday, 'completed');
        
        // Отправить уведомление пользователю
        if (io && connectedUsers.has(user.id)) {
          const userSocketId = connectedUsers.get(user.id);
          if (userSocketId) {
            io.to(userSocketId).emit('worktime_verified', {
              userId: user.id,
              date: yesterday,
              status: 'completed',
              verifiedBy: 'system',
              leaveMinutes: requiredMinutes,
              workedMinutes: totalWorkedMinutes
            });
          }
        }
      }
      
      processedCount++;
      console.log(\`✅ Обработан \${username}: требуется \${requiredMinutes} мин, отработано \${totalWorkedMinutes} мин\`);
    }
    
    console.log(\`🎉 Автоматический пересчет завершен. Обработано пользователей: \${processedCount}\`);
    
  } catch (e) {
    console.error('❌ Ошибка автоматического пересчета:', e);
  }
});
`;

// ========== ИНСТРУКЦИЯ ПО УСТАНОВКЕ CRON ==========
/*
Для работы автоматического пересчета нужно установить node-cron:

npm install node-cron

Затем добавить в начало server.js:
const cron = require('node-cron');
*/

module.exports = {
  WEBSOCKET_PATCH_FOR_LEAVES_VERIFY,
  CREATE_WORKTIME_HISTORY_ENDPOINT,
  AUTO_CALCULATE_SCHEDULER
};
