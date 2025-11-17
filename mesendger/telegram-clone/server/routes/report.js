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

// Прием событий рабочего времени от PowerShell-скрипта
router.post('/worktime', async (req, res) => {
  try {
    const { username, event_type, event_time, event_id } = req.body;
    if (!username || !event_type || !event_time || !event_id) {
      return res.status(400).json({ success: false, error: 'Missing fields' });
    }
    await db.addWorkTimeLog({ username, event_type, event_time, event_id });
    res.json({ success: true });
  } catch (err) {
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
