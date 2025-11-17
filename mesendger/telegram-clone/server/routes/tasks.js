const express = require('express');
const router = express.Router();
const db = require('../database');

// Получить все открытые задачи для пользователя (по userId из токена или query)
router.get('/open', async (req, res) => {
  try {
    // userId можно брать из req.user, если есть авторизация, либо из query
    let userId = req.user?.userId || req.query.userId;
    if (!userId) userId = 1; // Для теста: если не передан, используем userId=1
    const tasks = await db.getOpenTasks(userId);
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения открытых задач', details: e.message });
  }
});

// Получить все задачи (без фильтрации)
router.get('/', async (req, res) => {
  try {
    const tasks = await db.getAllTasks();
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения всех задач', details: e.message });
  }
});

// Получить все выполненные задачи
router.get('/completed', async (req, res) => {
  try {
    const tasks = await db.getCompletedTasks();
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения выполненных задач', details: e.message });
  }
});

// Создать новую задачу
router.post('/', async (req, res) => {
  try {
    const { title, description, assignedTo, deadline } = req.body;
    // authorId из токена или из body (если нет авторизации)
    let authorId = req.user?.userId || req.body.authorId;
    // Файлы, если есть (например, через multer)
    let files = req.body.files || null;
    const result = await db.createTask({ title, description, assignedTo, deadline, authorId, files });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка создания задачи', details: e.message });
  }
});

module.exports = router;
