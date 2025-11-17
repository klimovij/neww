const express = require('express');
const router = express.Router();
const db = require('../database');

// Middleware для аутентификации (предполагается, что он уже определен в основном файле)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен доступа не предоставлен' });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

// --- WORKTIME TIMER STATE API (сохранение состояния таймера) ---
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const timerState = req.body;
    
    // Валидация данных
    if (!timerState || typeof timerState !== 'object') {
      return res.status(400).json({ error: 'Некорректные данные состояния таймера' });
    }
    
    // Сохраняем состояние таймера в базе данных
    await db.saveWorktimeTimerState(userId, timerState);
    
    res.json({ success: true });
  } catch (e) {
    console.error('Ошибка сохранения состояния таймера:', e);
    res.status(500).json({ error: 'Ошибка сохранения состояния таймера', details: e.message });
  }
});

router.get('/restore', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    // Получаем сохраненное состояние таймера
    const timerState = await db.getWorktimeTimerState(userId);
    
    if (timerState) {
      res.json(timerState);
    } else {
      res.status(404).json({ error: 'Сохраненное состояние таймера не найдено' });
    }
  } catch (e) {
    console.error('Ошибка восстановления состояния таймера:', e);
    res.status(500).json({ error: 'Ошибка восстановления состояния таймера', details: e.message });
  }
});

router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    // Удаляем сохраненное состояние таймера
    await db.clearWorktimeTimerState(userId);
    
    res.json({ success: true });
  } catch (e) {
    console.error('Ошибка очистки состояния таймера:', e);
    res.status(500).json({ error: 'Ошибка очистки состояния таймера', details: e.message });
  }
});

module.exports = router;
