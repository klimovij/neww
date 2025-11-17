const express = require('express');
const router = express.Router();


const db = require('../database');

// Реальный вывод новостей
router.get('/', async (req, res) => {
  try {
    console.log('[GET /api/news] Запрос:', {
      headers: req.headers,
      user: req.user,
      query: req.query
    });
    const role = req.user?.role || 'user';
    const userId = req.user?.userId || null;
    const news = await db.getAllNews(role, userId);
    res.json(news);
  } catch (e) {
    console.error('[GET /api/news] Ошибка:', e);
    res.status(500).json({ error: 'Ошибка получения новостей', details: e.message, stack: e.stack });
  }
});

// Удалить новость (только admin/hr)
router.delete('/:id', async (req, res) => {
  try {
    console.log('[DELETE /api/news/:id] Запрос:', {
      headers: req.headers,
      user: req.user,
      params: req.params
    });
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'hr') {
      console.warn('[DELETE /api/news/:id] Нет прав:', role);
      return res.status(403).json({ error: 'Нет прав на удаление новости' });
    }
    const newsId = req.params.id;
    await new Promise((resolve, reject) => {
      db.deleteNews(newsId, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    res.json({ success: true });
  } catch (e) {
    console.error('[DELETE /api/news/:id] Ошибка:', e);
    res.status(500).json({ error: 'Ошибка удаления новости', details: e.message, stack: e.stack });
  }
});

// Редактировать новость (только admin/hr)
router.put('/:id', async (req, res) => {
  try {
    console.log('[PUT /api/news/:id] Запрос:', {
      headers: req.headers,
      user: req.user,
      params: req.params,
      body: req.body
    });
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'hr') {
      console.warn('[PUT /api/news/:id] Нет прав:', role);
      return res.status(403).json({ error: 'Нет прав на редактирование новости' });
    }
    const newsId = req.params.id;
    const { title, content, publishAt } = req.body;
    console.log('[PUT /api/news/:id] SQL:', {
      query: 'UPDATE news SET title = ?, content = ?, publish_at = ? WHERE id = ?',
      params: [title, content, publishAt || new Date().toISOString(), newsId]
    });
    await new Promise((resolve, reject) => {
      db.db.run(
        'UPDATE news SET title = ?, content = ?, publish_at = ? WHERE id = ?',
        [title, content, publishAt || new Date().toISOString(), newsId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    res.json({ success: true });
  } catch (e) {
    console.error('[PUT /api/news/:id] Ошибка:', e);
    res.status(500).json({ error: 'Ошибка редактирования новости', details: e.message, stack: e.stack });
  }
});

module.exports = router;
