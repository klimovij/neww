const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/authenticateToken');
const { generateCongratulation } = require('../services/aiCongrat');
const multer = require('multer');
const path = require('path');

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../uploads/avatars'));
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const name = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
      cb(null, name);
    }
  })
});

// Получить все поздравления с комментариями
router.get('/', async (req, res) => {
  try {
    console.log('[GET /api/congratulations] Request headers:', req.headers);
    // Получаем все поздравления
    const sql = `
      SELECT c.*, e.first_name, e.last_name, e.avatar_url AS employee_avatar,
             u.username AS author_username, u.avatar AS author_avatar
      FROM congratulations c
      JOIN employees e ON c.employee_id = e.id
      LEFT JOIN users u ON c.author_id = u.id
      ORDER BY c.scheduled_at DESC
    `;
    const congrats = await new Promise((resolve, reject) => {
      db.db.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    if (!congrats || congrats.length === 0) {
      return res.json([]);
    }

    // Получаем все ID поздравлений
    const ids = congrats.map(c => c.id);
    const placeholders = ids.map(() => '?').join(',');

    // Получаем комментарии
    const commentSql = `
      SELECT cc.*, u.username, u.avatar
      FROM congrat_comments cc
      LEFT JOIN users u ON cc.user_id = u.id
      WHERE cc.congrat_id IN (${placeholders})
      ORDER BY cc.created_at ASC
    `;

    const comments = await new Promise((resolve, reject) => {
      db.db.all(commentSql, ids, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    // Получаем информацию о лайках пользователя (если авторизован)
    let userId = null;
    let userLikes = {};
    
    // Опциональная проверка токена
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId || decoded.id;
      } catch (err) {
        console.log('Invalid token for congratulations request:', err.message);
        // Продолжаем без аутентификации
      }
    }
    
    if (userId) {
      console.log('[GET /api/congratulations] User authenticated, userId:', userId);
      const likesSql = `
        SELECT congrat_id FROM congrat_likes 
        WHERE user_id = ? AND congrat_id IN (${placeholders})
      `;
      const userLikesRows = await new Promise((resolve, reject) => {
        db.db.all(likesSql, [userId, ...ids], (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      });
      console.log('[GET /api/congratulations] User likes:', userLikesRows);
      userLikesRows.forEach(like => {
        userLikes[like.congrat_id] = true;
      });
    } else {
      console.log('[GET /api/congratulations] User not authenticated');
    }

    // Группируем комментарии по congrat_id
    const commentMap = {};
    comments.forEach(c => {
      if (!commentMap[c.congrat_id]) commentMap[c.congrat_id] = [];
      commentMap[c.congrat_id].push({
        id: c.id,
        userId: c.user_id,
        username: c.username || 'Пользователь',
        avatar: c.avatar || null,
        commentText: c.comment_text || '',
        createdAt: c.created_at
      });
    });

    // Добавляем комментарии и информацию о лайках к каждому поздравлению
    const result = congrats.map(c => ({
      ...c,
      comments: commentMap[c.id] || [],
      likedByUser: !!userLikes[c.id]
    }));

    res.json(result);
  } catch (err) {
    console.error('[GET] Ошибка при получении поздравлений:', err);
    res.status(500).json({ error: err.message });
  }
});

// Сгенерировать поздравление через ИИ
router.post('/congratulate', async (req, res) => {
  const { employeeId, style } = req.body;
  try {
    const employee = await db.getEmployeeById(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const congratText = await generateCongratulation(employee, style);
    res.json({ congratText });
  } catch (err) {
    console.error('[POST] Ошибка при генерации поздравления:', err);
    res.status(500).json({ error: err.message, details: err });
  }
});

// Добавить поздравление с авторизацией и поддержкой файла
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const employeeId = req.body.employeeId;
    const congratText = req.body.congratText;
    const scheduledAt = req.body.scheduled_at || req.body.scheduledAt;
    const authorId = req.user && typeof req.user.userId !== 'undefined' ? req.user.userId : null;
    if (!authorId) return res.status(401).json({ error: 'Unauthorized: authorId is undefined' });
    if (!employeeId || !congratText) return res.status(400).json({ error: 'employeeId и congratText обязательны' });

    let fileUrl = null;
    if (req.file) {
      fileUrl = '/uploads/avatars/' + req.file.filename;
    }

    const congratId = await db.addCongratulation({ employeeId, authorId, congratText, scheduledAt, fileUrl });

    // Emit socket событие для уведомления клиентов о новом поздравлении
    if (global.io) {
      global.io.emit('new_congratulation', {
        id: congratId,
        employee_id: employeeId,
        congrat_text: congratText,
        scheduled_at: scheduledAt || new Date().toISOString(),
        file_url: fileUrl,
        likes: 0,
        comments: []
      });
    }

    res.json({ success: true, congratId });
  } catch (err) {
    console.error('[POST] Ошибка при добавлении поздравления:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Переключить лайк поздравления (toggle)
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    if (!userId) return res.status(400).json({ error: 'Пользователь не авторизован' });
    const liked = await db.toggleLikeCongratulation(req.params.id, userId);
    res.json({ success: liked });
  } catch (err) {
    console.error('[POST] Ошибка при переключении лайка поздравления:', err);
    res.status(500).json({ error: err.message });
  }
});

// Удалить лайк с поздравления
router.post('/:id/unlike', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    if (!userId) return res.status(400).json({ error: 'Пользователь не авторизован' });
    const unliked = await db.unlikeCongratulation(req.params.id, userId);
    res.json({ success: unliked });
  } catch (err) {
    console.error('[POST] Ошибка при удалении лайка поздравления:', err);
    res.status(500).json({ error: err.message });
  }
});

// Добавить комментарий к поздравлению
router.post('/:id/comment', authenticateToken, async (req, res) => {
  const congratId = Number(req.params.id);
  const { commentText } = req.body;
  const userId = req.user.userId || req.user.id;

  try {
    console.log('[POST] /congratulations/:id/comment', { congratId, userId, commentText });

    // Валидация
    if (!Number.isInteger(congratId) || congratId <= 0) {
      return res.status(400).json({ error: 'Неверный id поздравления' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен' });
    }
    if (!commentText || typeof commentText !== 'string' || commentText.trim() === '') {
      return res.status(400).json({ error: 'commentText обязателен' });
    }

    // Проверка существования поздравления
    const existRow = await new Promise((resolve, reject) => {
      db.db.get('SELECT id FROM congratulations WHERE id = ?', [congratId], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    if (!existRow) {
      return res.status(404).json({ error: 'Поздравление не найдено' });
    }

    // Вставка комментария
    const trimmedText = commentText.trim();
    const insertSql = 'INSERT INTO congrat_comments (congrat_id, user_id, comment_text) VALUES (?, ?, ?)';
    const result = await new Promise((resolve, reject) => {
      db.db.run(insertSql, [congratId, userId, trimmedText], function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      });
    });

    // Получаем полный объект комментария
    const selectSql = `
      SELECT cc.id, cc.congrat_id AS congratId, cc.user_id AS userId, 
             cc.comment_text AS commentText, cc.created_at AS createdAt, 
             u.username AS username, u.avatar AS avatar
      FROM congrat_comments cc 
      LEFT JOIN users u ON cc.user_id = u.id 
      WHERE cc.id = ?
    `;
    const newComment = await new Promise((resolve, reject) => {
      db.db.get(selectSql, [result.id], (err, row) => {
        if (err) return reject(err);
        resolve({
          ...row,
          username: row.username || 'Пользователь',
          avatar: row.avatar || null
        });
      });
    });

    // Эмит через сокеты (если есть)
    try {
      if (global.io) {
        global.io.emit('congrat_comment_added', { congratId, comment: newComment });
      }
    } catch (emitErr) {
      console.warn('[POST] Socket emit error (non-fatal):', emitErr);
    }

    return res.status(201).json(newComment);
  } catch (err) {
    console.error('[POST] Ошибка при добавлении комментария:', err.stack || err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Получить всех сотрудников
router.get('/employees', async (req, res) => {
  try {
    const employees = await db.getAllEmployees();
    res.json(employees);
  } catch (err) {
    console.error('[GET] Ошибка при получении сотрудников:', err);
    res.status(500).json({ error: err.message });
  }
});

// Добавить сотрудника с аватаром
router.post('/add-employee', upload.single('avatar'), async (req, res) => {
  const { first_name, last_name, birth_day, birth_month, birth_year } = req.body;
  let avatar_url = null;
  if (req.file) {
    avatar_url = '/uploads/avatars/' + req.file.filename;
  }
  try {
    await db.addEmployee({ first_name, last_name, birth_day, birth_month, birth_year, avatar_url });
    res.json({ success: true });
  } catch (err) {
    console.error('[POST] Ошибка при добавлении сотрудника:', err);
    res.status(500).json({ error: err.message, details: err });
  }
});

// Редактировать сотрудника
router.post('/edit-employee', upload.single('avatar'), async (req, res) => {
  const { id, first_name, last_name, birth_day, birth_month, birth_year } = req.body;
  let avatar_url;
  try {
    if (req.file) {
      avatar_url = '/uploads/avatars/' + req.file.filename;
    } else {
      const employee = await db.getEmployeeById(id);
      avatar_url = employee && employee.avatar_url ? employee.avatar_url : null;
    }
    await db.editEmployee(id, { first_name, last_name, birth_day, birth_month, birth_year, avatar_url });
    res.json({ success: true });
  } catch (err) {
    console.error('[POST] Ошибка при редактировании сотрудника:', err);
    res.status(500).json({ error: err.message });
  }
});

// Удалить сотрудника (через DELETE)
router.delete('/employees/:id', async (req, res) => {
  const id = req.params.id;
  console.log(`[DELETE] Запрос на удаление сотрудника с id=${id}`);
  if (!id || isNaN(Number(id))) {
    console.warn(`[DELETE] Неверный id сотрудника: ${id}`);
    return res.status(400).json({ error: 'Неверный id сотрудника' });
  }
  try {
    const changes = await db.removeEmployee(id);
    console.log(`[DELETE] Удалено записей: ${changes}`);
    if (changes === 0) {
      return res.status(404).json({ error: 'Сотрудник не найден' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE] Ошибка при удалении сотрудника:', err);
    res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' });
  }
});

// Удалить сотрудника (через POST) - для совместимости
router.post('/delete-employee', async (req, res) => {
  const { id } = req.body;
  console.log(`[POST] Запрос на удаление сотрудника с id=${id}`);
  if (!id || isNaN(Number(id))) {
    console.warn(`[POST] Неверный id сотрудника: ${id}`);
    return res.status(400).json({ error: 'Неверный id сотрудника' });
  }
  try {
    const changes = await db.deleteEmployee(id);
    console.log(`[POST] Удалено записей: ${changes}`);
    if (changes === 0) {
      return res.status(404).json({ error: 'Сотрудник не найден' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[POST] Ошибка при удалении сотрудника:', err);
    res.status(500).json({ error: err.message });
  }
});

// Удалить поздравление (только admin/hr)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'hr') {
      console.warn('[DELETE /api/congratulations/:id] Нет прав:', role);
      return res.status(403).json({ error: 'Нет прав на удаление поздравления' });
    }
    
    const congratId = req.params.id;
    console.log('[DELETE /api/congratulations/:id] Запрос:', { congratId, user: req.user });
    
    if (!congratId || isNaN(Number(congratId))) {
      return res.status(400).json({ error: 'Неверный id поздравления' });
    }
    
    const changes = await db.deleteCongratulation(congratId);
    console.log('[DELETE /api/congratulations/:id] Удалено записей:', changes);
    
    if (changes === 0) {
      return res.status(404).json({ error: 'Поздравление не найдено' });
    }
    
    // Emit socket событие для уведомления клиентов об удалении
    if (global.io) {
      global.io.emit('congratulation-deleted', { id: congratId });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/congratulations/:id] Ошибка:', err);
    res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' });
  }
});

// Получить состояние авто-поздравлений
router.get('/auto-enabled', async (req, res) => {
  try {
    const fs = require('fs');
    const envPath = require('path').resolve(__dirname, '../env');
    const env = fs.readFileSync(envPath, 'utf8');
    const enabled = env.includes('AUTO_CONGRAT_ENABLED=true');
    res.json({ enabled });
  } catch (err) {
    console.error('[GET] Ошибка при получении состояния авто-поздравлений:', err);
    res.status(500).json({ error: err.message });
  }
});

// Включить/отключить авто-поздравления
router.post('/auto-enabled', async (req, res) => {
  try {
    const { enabled } = req.body;
    const fs = require('fs');
    const envPath = require('path').resolve(__dirname, '../env');
    let env = fs.readFileSync(envPath, 'utf8');
    env = env.replace(/AUTO_CONGRAT_ENABLED=(true|false)/, 'AUTO_CONGRAT_ENABLED=' + (enabled ? 'true' : 'false'));
    if (!env.includes('AUTO_CONGRAT_ENABLED=')) {
      env += '\nAUTO_CONGRAT_ENABLED=' + (enabled ? 'true' : 'false');
    }
    fs.writeFileSync(envPath, env);
    res.json({ success: true });
  } catch (err) {
    console.error('[POST] Ошибка при изменении состояния авто-поздравлений:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;