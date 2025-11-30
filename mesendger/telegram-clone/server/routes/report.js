const express = require('express');
const router = express.Router();
const db = require('../database');

// Получить отчет по отгулам/отпускам за выбранную дату
router.get('/leaves', async (req, res) => {
  try {
    const { date } = req.query;
    let startDate, endDate;
    if (date) {
      startDate = new Date(date);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
    }
    startDate.setHours(0,0,0,0);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    // Формат YYYY-MM-DD
    const startStr = startDate.toISOString().slice(0,10);
    const endStr = endDate.toISOString().slice(0,10);

    // Получаем все заявки, которые начинаются или заканчиваются в этот день
    const leaves = await db.getLeavesByDate(startStr, endStr);
    res.json({ success: true, leaves });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Прием событий рабочего времени от PowerShell-скрипта (локальные ПК)
router.post('/worktime', async (req, res) => {
  console.log(`📥 [POST /api/worktime] Получен запрос от локального ПК:`, { username: req.body.username, event_type: req.body.event_type, event_time: req.body.event_time });
  try {
    const { username, event_type, event_time, event_id } = req.body;
    if (!username || !event_type || !event_time) {
      console.error(`❌ [POST /api/worktime] Отсутствуют обязательные поля:`, { username: !!username, event_type: !!event_type, event_time: !!event_time });
      return res.status(400).json({ success: false, error: 'Missing required fields: username, event_type, event_time' });
    }
    
    // Определяем event_id если не указан
    let finalEventId = event_id;
    if (!finalEventId) {
      if (event_type === 'shutdown') {
        finalEventId = 1074; // Windows Event ID для выключения системы
      } else if (event_type === 'logout') {
        finalEventId = 4634; // Windows Event ID для выхода
      } else {
        finalEventId = 4624; // Windows Event ID для входа
      }
    }
    
    // Конвертируем ISO формат даты (2025-11-26T14:53:13.419Z) в YYYY-MM-DD HH:mm:ss
    let convertedTime = event_time;
    if (event_time.includes('T') && event_time.includes('Z')) {
      // ISO формат: 2025-11-26T14:53:13.419Z
      try {
        const date = new Date(event_time);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        convertedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        console.log(`✅ Converted ISO date: ${event_time} -> ${convertedTime}`);
      } catch (e) {
        console.warn(`⚠️ Failed to convert ISO date: ${event_time}, using as-is`);
      }
    }
    
    await db.addWorkTimeLog({ username, event_type, event_time: convertedTime, event_id: finalEventId });
    console.log(`✅ Local worktime log added: ${username} - ${event_type} - ${convertedTime} (event_id: ${finalEventId})`);
    res.json({ success: true, message: 'Event logged successfully' });
  } catch (err) {
    console.error('❌ Error adding local worktime log:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Получение отчета по рабочему времени
router.get('/worktime', async (req, res) => {
  try {
    const { start, end, username } = req.query;
    const logs = await db.getWorkTimeLogs({ start, end, username });
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
