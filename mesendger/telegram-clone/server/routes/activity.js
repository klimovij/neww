const express = require('express');
const router = express.Router();
const db = require('../database');

// Используем тот же API-ключ, что и для удалённого учёта времени
const REMOTE_WORKTIME_API_KEY =
  process.env.REMOTE_WORKTIME_API_KEY || 'default-remote-api-key-change-in-production';

function authenticateActivityRequest(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required. Provide it in header: X-API-Key or query parameter: apiKey',
    });
  }

  if (apiKey !== REMOTE_WORKTIME_API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key',
    });
  }

  next();
}

// Приём пачки записей активности от агентов на ПК
router.post('/activity-log-batch', authenticateActivityRequest, async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : req.body?.events || [];

    if (!events || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No events provided. Send array of events or { events: [...] }',
      });
    }

    const sanitized = events
      .map((e) => ({
        username: (e.username || e.user || '').trim(),
        timestamp: e.timestamp || e.time || null,
        idleMinutes:
          typeof e.idleMinutes === 'number'
            ? e.idleMinutes
            : typeof e.idle === 'number'
            ? e.idle
            : 0,
        procName: (e.procName || e.process || '').toString().slice(0, 128),
        windowTitle: (e.windowTitle || e.title || '').toString().slice(0, 512),
      }))
      .filter((e) => e.username && e.timestamp);

    if (!sanitized.length) {
      return res.status(400).json({
        success: false,
        error: 'No valid events after normalization',
      });
    }

    const inserted = await db.addActivityLogsBatch(sanitized);

    res.json({
      success: true,
      imported: inserted,
      total: sanitized.length,
    });
  } catch (error) {
    console.error('❌ Error in /activity-log-batch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Сводка активности за период по всем сотрудникам
// Доступна без API-ключа, так как вызывается из основного приложения по сессии
router.get('/activity-summary', async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'start and end query params are required (YYYY-MM-DD)',
      });
    }

    const logs = await db.getActivityLogsBetween({ start, end });

    const perUser = {};
    const IDLE_THRESHOLD = 5; // минут, как говорила HR

    for (const row of logs) {
      const u = row.username;
      if (!u) continue;

      if (!perUser[u]) {
        perUser[u] = {
          username: u,
          totalActiveMinutes: 0,
          totalIdleMinutes: 0,
          apps: {}, // procName -> minutes
        };
      }

      const bucket = perUser[u];
      const idle = Number(row.idle_minutes) || 0;
      const proc = row.proc_name || 'unknown';

      if (idle >= IDLE_THRESHOLD) {
        bucket.totalIdleMinutes += idle;
      } else {
        // считаем как 1 минуту активной работы
        bucket.totalActiveMinutes += 1;
      }

      bucket.apps[proc] = (bucket.apps[proc] || 0) + 1;
    }

    // Приводим к массиву и добавляем topApps
    const summary = Object.values(perUser).map((u) => {
      const appsArray = Object.entries(u.apps)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, minutes]) => ({ name, minutes }));

      return {
        username: u.username,
        totalActiveMinutes: u.totalActiveMinutes,
        totalIdleMinutes: u.totalIdleMinutes,
        topApps: appsArray,
      };
    });

    res.json({ success: true, summary });
  } catch (error) {
    console.error('❌ Error in /activity-summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;


