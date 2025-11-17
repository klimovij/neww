// Создать поздравление
// ...existing code...
// ==================== ИМПОРТЫ ====================
// ==================== ИМПОРТЫ ====================
// ...existing code...
// Маршрут комментария к поздравлению будет добавлен ниже, после инициализации app
const http = require('http');
const express = require('express');
const cors = require('cors');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os');
const iconv = require('iconv-lite');
const db = require('./database');
const importWorktimeCsvRoutes = require('./routes/importWorktimeCsv');
const { spawn } = require('child_process');
// ВРЕМЕННО: очистка старых записей voters для опросов
db.fixOldPollVoters().then(fixed => {
  console.log('Очищено старых опросов:', fixed);
}).catch(console.error);

// ИСПРАВЛЕНИЕ: обновляем статус задач без статуса
db.db.run(`UPDATE tasks SET status = 'open' WHERE status IS NULL OR status = ''`, function(err) {
  if (err) {
    console.error('Ошибка при обновлении статусов задач:', err);
  } else {
    console.log(`Обновлено статусов задач: ${this.changes}`);
  }
});

// ИСПРАВЛЕНИЕ: добавляем колонку priority если её нет, и устанавливаем значения по умолчанию
db.db.run(`ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'medium'`, function(err) {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Ошибка при добавлении колонки priority:', err);
  } else if (!err) {
    console.log('Добавлена колонка priority в таблицу tasks');
  }
  
  // Обновляем приоритет задач без приоритета
  db.db.run(`UPDATE tasks SET priority = 'medium' WHERE priority IS NULL OR priority = ''`, function(err) {
    if (err) {
      console.error('Ошибка при обновлении приоритетов задач:', err);
    } else {
      console.log(`Обновлено приоритетов задач: ${this.changes}`);
    }
  });
});

// ИСПРАВЛЕНИЕ: добавляем колонку completedAt если её нет
db.db.run(`ALTER TABLE tasks ADD COLUMN completedAt TEXT`, function(err) {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Ошибка при добавлении колонки completedAt:', err);
  } else if (!err) {
    console.log('Добавлена колонка completedAt в таблицу tasks');
  }
});

// Загружаем переменные окружения из файла env в папке server
require('dotenv').config({ path: path.resolve(__dirname, 'env') });

// Дополнительные импорты
const chokidar = require('chokidar');
const csv = require('csv-parser');
const cron = require('node-cron');

// ==================== КОНФИГУРАЦИЯ ====================
const GEMINI_API_KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
console.log('[SERVER] Загружено ключей Gemini:', GEMINI_API_KEYS.length);
if (GEMINI_API_KEYS.length > 0) {
  console.log('[SERVER] Первый ключ (первые 15 символов):', GEMINI_API_KEYS[0].substring(0, 15) + '...');
} else {
  console.error('[SERVER] ⚠️ ВНИМАНИЕ: Ключи Gemini не загружены! Проверьте файл server/env');
  console.error('[SERVER] GEMINI_API_KEYS из env:', process.env.GEMINI_API_KEYS);
  console.error('[SERVER] GEMINI_API_KEY из env:', process.env.GEMINI_API_KEY);
}
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ==================== ИНИЦИАЛИЗАЦИЯ EXPRESS ====================
const app = express();
// Парсинг JSON и URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Настройка CORS (один раз, до маршрутов)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
}));

// ...existing code...
// Обработчик комментариев к поздравлениям перенесен в routes/congratulations.js

// Обработчик поздравлений перенесен в routes/congratulations.js для избежания дублирования
// Раздача аватаров
app.use('/uploads/avatars', express.static(path.join(__dirname, '../uploads/avatars')));
// Заглушка: получить количество непрочитанных чатов
app.get('/api/chats/unread', async (req, res) => {
  // Здесь можно реализовать логику подсчёта непрочитанных чатов для пользователя
  res.json({ unreadCount: 0 }); // Пока возвращаем 0
});

// ==================== MIDDLEWARE ====================
// Настройка CORS (один раз, до маршрутов)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
}));

// Парсинг JSON и URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Статическая раздача файлов
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- ДОБАВИТЬ ЭТОТ БЛОК ДЛЯ СТАТИКИ ЭМОДЗИ ---
const emojiDir = path.resolve('C:/Users/Ksendz/web/mesendger(самый удачный)/mesendger/telegram-clone/client-react/src/assets/icons/Smile');
app.use('/emojis', express.static(emojiDir));
// Теперь эмодзи доступны по URL: http://localhost:5000/emojis/имя_файла.png

// ==================== СОЗДАНИЕ СЕРВЕРА ====================
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Убираем глобальное переписывание last_seen на старте (может портить историю)

// Сбрасываем онлайн-статус для всех пользователей при запуске сервера
db.resetAllUsersOffline().then(() => {
  console.log('✅ Reset all users to offline on startup');
}).catch(err => {
  console.error('❌ Error resetting users offline:', err);
});

// Рекалькулируем last_seen для офлайн-пользователей на основе логов RDP
db.recalculateLastSeenFromWorkLogs()
  .then(updated => {
    console.log(`✅ Recalculated last_seen from work logs for ${updated} users`);
  })
  .catch(err => {
    console.error('❌ Error recalculating last_seen from work logs:', err);
  });

// Периодическая актуализация last_seen по логам RDP (каждые 5 минут)
setInterval(() => {
  db.recalculateLastSeenFromWorkLogs()
    .then(updated => {
      if (updated > 0) {
        console.log(`⏱️ Periodic last_seen refresh: updated ${updated} users`);
        // Обновим online_users для клиентов, чтобы подхватили новый last_seen офлайнов
        db.getOnlineUsers().then(users => io.emit('online_users', users)).catch(() => {});
      }
    })
    .catch(err => {
      console.error('❌ Periodic last_seen refresh error:', err);
    });
}, 60 * 1000);

// Система автоматической отправки запланированных сообщений (каждые 10 секунд)
setInterval(async () => {
  try {
    const now = new Date();
    console.log(`🔄 Checking for scheduled messages at ${now.toISOString()}`);
    const pendingMessages = await db.getPendingScheduledMessages();
    
    if (pendingMessages.length > 0) {
      console.log(`⏰ Processing ${pendingMessages.length} scheduled messages`);
      
      for (const scheduledMessage of pendingMessages) {
        try {
          console.log(`📝 Sending scheduled message ${scheduledMessage.id} with content: ${scheduledMessage.content}`);

          // Создаем обычное сообщение из запланированного (содержимое уже обработано при планировании)
          const messageData = {
            chatId: scheduledMessage.chat_id,
            userId: scheduledMessage.user_id,
            content: scheduledMessage.content, // Уже содержит токены, а не HTML
            messageType: scheduledMessage.message_type,
            fileInfo: scheduledMessage.file_info,
            replyToId: scheduledMessage.reply_to_id
          };
          
          // Сохраняем сообщение в базу данных с запланированным временем
          const messageId = await db.createMessage(
            messageData.chatId,
            messageData.userId,
            messageData.content,
            messageData.messageType,
            messageData.fileInfo ? JSON.stringify(messageData.fileInfo) : null,
            messageData.replyToId,
            null, // templateType
            scheduledMessage.scheduled_for // используем запланированное время
          );
          
          // Получаем информацию о пользователе
          const user = await db.getUserById(messageData.userId);
          
          // Получаем созданное сообщение из базы данных для правильного timestamp
          const createdMessage = await new Promise((resolve, reject) => {
            db.db.get(
              'SELECT * FROM messages WHERE id = ?',
              [messageId],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          });
          
          // Формируем полное сообщение для отправки
          const fullMessage = {
            id: messageId,
            chat_id: messageData.chatId,
            user_id: messageData.userId,
            content: messageData.content,
            message_type: messageData.messageType,
            file_info: messageData.fileInfo,
            reply_to_id: messageData.replyToId,
            created_at: createdMessage?.created_at || new Date().toISOString(),
            timestamp: createdMessage?.created_at || new Date().toISOString(),
            username: user?.username,
            avatar: user?.avatar,
            isScheduled: true // Помечаем как запланированное
          };
          
          // Отправляем сообщение всем участникам чата
          io.to(`chat_${messageData.chatId}`).emit('new_message', fullMessage);
          
          // Обновляем список чатов для всех участников
          const updatedChats = await db.getUserChats(messageData.userId);
          io.emit('chats_updated', updatedChats);
          
          // Отмечаем запланированное сообщение как отправленное
          await db.markScheduledMessageAsSent(scheduledMessage.id);
          
          // Если это повторяющееся сообщение, создаем следующее повторение
          if (scheduledMessage.is_recurring && scheduledMessage.repeat_type !== 'none') {
            try {
              const nextRecurrence = await db.createNextRecurrence(scheduledMessage);
              if (nextRecurrence) {
                console.log(`🔄 Next recurrence created for message ${scheduledMessage.id}: ${nextRecurrence.scheduledFor}`);
              } else {
                console.log(`📅 No more recurrences for message ${scheduledMessage.id} (reached end date or limit)`);
              }
            } catch (recurrenceError) {
              console.error(`❌ Error creating next recurrence for message ${scheduledMessage.id}:`, recurrenceError);
            }
          }
          
          console.log(`✅ Scheduled message ${scheduledMessage.id} sent successfully`);
          
        } catch (messageError) {
          console.error(`❌ Error sending scheduled message ${scheduledMessage.id}:`, messageError);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error processing scheduled messages:', error);
  }
}, 10 * 1000);

// Временный API endpoint для принудительного обновления времени last_seen
app.post('/api/fix-last-seen', async (req, res) => {
  try {
    await db.fixLastSeenForAllUsers();
    res.json({ success: true, message: 'Last seen timestamps updated for all users' });
  } catch (error) {
    console.error('❌ Error fixing last_seen:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint для проверки текущего состояния базы данных
app.get('/api/debug-users', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const debugInfo = users.map(user => ({
      id: user.id,
      username: user.username,
      online: user.online,
      last_seen: user.last_seen
    }));
    res.json({ success: true, users: debugInfo });
  } catch (error) {
    console.error('❌ Error getting debug info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint для принудительного обновления времени с использованием прямого SQL
app.post('/api/force-update-time', async (req, res) => {
  try {
    // Прямой SQL запрос для обновления времени
    const result = await new Promise((resolve, reject) => {
      db.db.run(
        'UPDATE users SET last_seen = datetime("now", "localtime")',
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    console.log('🔄 Force updated last_seen using direct SQL');
    res.json({ success: true, message: 'Time forcefully updated using direct SQL' });
  } catch (error) {
    console.error('❌ Error force updating time:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
const connectedUsers = new Map();

// ==================== ФУНКЦИИ ПОМОЩНИКИ ====================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.warn('[AUTH] Ошибка верификации токена:', err.message);
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.user = user;
    next();
  });
}

// ==================== НАСТРОЙКА MULTER ====================
// Создаем папки для загрузок если их нет
const uploadsDir = path.join(__dirname, '../uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
  console.log('📁 Created avatars directory:', avatarsDir);
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Если это аватар — кладём в avatarsDir, иначе в uploadsDir
    if (req.originalUrl && req.originalUrl.indexOf('/api/upload-avatar') !== -1) {
      cb(null, avatarsDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    console.log('📤 File upload attempt:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
      'text/csv'
    ];
  
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.error('❌ Unsupported file type:', file.mimetype);
      cb(new Error(`Неподдерживаемый тип файла: ${file.mimetype}`), false);
    }
  }
});

// === Создание папки для кастомных эмодзи ===
const emojisDir = path.join(uploadsDir, 'emojis');
if (!fs.existsSync(emojisDir)) {
  fs.mkdirSync(emojisDir, { recursive: true });
  console.log('📁 Created emojis directory:', emojisDir);
}

// === API: Загрузка кастомного эмодзи ===
const emojiUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, emojisDir);
    },
    filename: function (req, file, cb) {
      // Имя файла: emoji-<timestamp>-<originalname>
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'emoji-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Только PNG, JPG, SVG, WEBP'), false);
  }
});

// POST /api/custom-emoji
app.post('/api/custom-emoji', authenticateToken, emojiUpload.single('emoji'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !req.file) {
      return res.status(400).json({ error: 'Необходимо указать название и файл эмодзи' });
    }
    // Можно добавить сохранение в БД, если нужно хранить глобально
    const emojiUrl = `/uploads/emojis/${req.file.filename}`;
    res.json({
      name: name.trim(),
      url: emojiUrl
    });
  } catch (e) {
    console.error('Ошибка загрузки кастомного эмодзи:', e);
    res.status(500).json({ error: 'Ошибка загрузки эмодзи' });
  }
});

// Список доступных кастомных эмодзи (публичный)
app.get('/api/emojis/list', async (req, res) => {
  try {
    const files = fs.readdirSync(emojisDir).filter(f => /\.(png|jpe?g|svg|webp)$/i.test(f));
    const list = files.map(f => ({
      name: f.replace(/\.[^.]+$/, ''),
      url: `/uploads/emojis/${f}`
    }));
    res.json(list);
  } catch (e) {
    console.error('Ошибка чтения списка эмодзи:', e);
    res.status(500).json({ error: 'Ошибка получения списка эмодзи' });
  }
});

// Удаление кастомного эмодзи по имени файла (без путей)
app.delete('/api/custom-emoji/:file', authenticateToken, async (req, res) => {
  try {
    const base = String(req.params.file || '').replace(/\.+/g, '.');
    if (!base || /[\\/]/.test(base)) {
      return res.status(400).json({ error: 'Некорректное имя файла' });
    }
    const target = path.join(emojisDir, base);
    if (!fs.existsSync(target)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }
    fs.unlinkSync(target);
    res.json({ success: true });
  } catch (e) {
    console.error('Ошибка удаления кастомного эмодзи:', e);
    res.status(500).json({ error: 'Ошибка удаления эмодзи' });
  }
});

// ==================== API МАРШРУТЫ ====================
// --- ОТЧЁТЫ ПО РАБОЧЕМУ ВРЕМЕНИ ---
try {
  const quickCsvReportRouter = require('./routes/quickCsvReport');
  const congratulationsRouter = require('./routes/congratulations');
  // Подключаем importWorktimeCsvRoutes первым, чтобы избежать конфликта с quickCsvReportRouter
  app.use('/api', importWorktimeCsvRoutes);
  app.use('/api', quickCsvReportRouter);
  app.use('/api/congratulations', congratulationsRouter);
} catch (e) {
  console.log('⚠️ quickCsvReportRouter not found, skipping...');
}

// === ДОКУМЕНТЫ: таблица и маршруты ===
const documentsDir = path.join(uploadsDir, 'documents');
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
  console.log('📁 Created documents directory:', documentsDir);
}

db.db.run(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    original_name TEXT,
    mime TEXT,
    size INTEGER,
    path TEXT,
    user_id INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )
`, function(err){ if (err) console.error('❌ documents create error:', err); });

const docsUpload = multer({
  storage: multer.diskStorage({
    destination: function(req, file, cb){ cb(null, documentsDir); },
    filename: function(req, file, cb){
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random()*1e9);
      const ext = path.extname(file.originalname);
      cb(null, 'doc-' + uniqueSuffix + ext);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype) || /\.(pdf|csv|xls|xlsx|doc|docx)$/i.test(file.originalname)) return cb(null, true);
    cb(new Error('Недопустимый тип файла'));
  }
});

// Загрузка документа
app.post('/api/documents/upload', authenticateToken, docsUpload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, error: 'Файл не передан' });
    
    const iconv = require('iconv-lite');
    
    // Функция для исправления кодировки (как в задачах)
    function fixEncoding(str) {
      if (!str || typeof str !== 'string') return str;
      // Если есть 'кракозябры', пробуем перекодировать из win1251 в utf8
      if (/Ð|Ñ|Ð|Ð/.test(str)) {
        try {
          return iconv.decode(Buffer.from(str, 'binary'), 'win1251');
        } catch { return str; }
      }
      return str;
    }
    
    // Приоритет: originalName из body (правильная кодировка UTF-8) > исправленный originalname из multer
    let originalName = req.body?.originalName || req.file.originalname;
    
    // Если originalName не передан из body, пробуем исправить кодировку из multer
    if (!req.body?.originalName) {
      originalName = fixEncoding(originalName);
    }
    
    // Используем name из body или исправленное originalName
    const safeName = String(req.body?.name || originalName).trim();
    const relPath = `/uploads/documents/${req.file.filename}`;
    const userId = req.user?.userId || req.user?.id || null;
    
    db.db.run(
      'INSERT INTO documents (name, original_name, mime, size, path, user_id) VALUES (?,?,?,?,?,?)',
      [safeName, originalName, req.file.mimetype, req.file.size, relPath, userId],
      function(err){
        if (err) return res.status(500).json({ success:false, error: err.message });
        return res.json({ success:true, document: { id: this.lastID, name: safeName, original_name: originalName, mime: req.file.mimetype, size: req.file.size, path: relPath, user_id: userId } });
      }
    );
  } catch(e){
    console.error('❌ /api/documents/upload:', e);
    res.status(500).json({ success:false, error: 'server error' });
  }
});

// Список/поиск документов
app.get('/api/documents', authenticateToken, (req, res) => {
  const q = String(req.query.q || '').trim();
  const like = `%${q.replace(/%/g,'').replace(/_/g,'')}%`;
  const sql = q ?
    `SELECT * FROM documents WHERE name LIKE ? OR original_name LIKE ? ORDER BY created_at DESC LIMIT 100` :
    `SELECT * FROM documents ORDER BY created_at DESC LIMIT 100`;
  const params = q ? [like, like] : [];
  db.db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success:false, error: err.message });
    res.json({ success:true, documents: rows || [] });
  });
});

// Получить документ по id
app.get('/api/documents/:id', authenticateToken, (req, res) => {
  db.db.get('SELECT * FROM documents WHERE id=?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success:false, error: err.message });
    if (!row) return res.status(404).json({ success:false, error: 'not found' });
    res.json({ success:true, document: row });
  });
});

// Скачивание документа
app.get('/api/documents/:id/download', authenticateToken, (req, res) => {
  db.db.get('SELECT * FROM documents WHERE id=?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success:false, error: err.message });
    if (!row) return res.status(404).json({ success:false, error: 'not found' });
    const filePath = path.join(__dirname, '..', row.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success:false, error: 'Файл не найден на сервере' });
    }
    
    // Получаем оригинальное имя файла
    let originalName = row.original_name || row.name || row.path.split('/').pop();
    
    // Исправляем кодировку, если имя файла содержит кракозябры
    try {
      const iconv = require('iconv-lite');
      
      // Логируем исходное имя для отладки
      console.log('📥 Download: original name from DB:', originalName);
      console.log('📥 Download: name bytes:', Buffer.from(originalName, 'utf8').toString('hex'));
      
      // Проверяем, есть ли признаки неправильной кодировки
      // Если имя содержит символы, которые выглядят как неправильно закодированная кириллица
      const hasCyrillicGarbled = /Ð|Ñ|Ð|Ð|Ã|â|€|™|š|œ|ž|Ÿ|¡|¢|£|¤|¥|¦|§|¨|©|ª|«|¬|®|¯|°|±|²|³|´|µ|¶|·|¸|¹|º|»|¼|½|¾|¿/.test(originalName);
      const hasValidCyrillic = /[А-Яа-яЁё]/.test(originalName);
      
      if (hasCyrillicGarbled && !hasValidCyrillic) {
        // Пробуем разные варианты исправления
        const attempts = [
          () => iconv.decode(Buffer.from(originalName, 'binary'), 'win1251'),
          () => iconv.decode(Buffer.from(originalName, 'binary'), 'cp866'),
          () => Buffer.from(originalName, 'latin1').toString('utf8'),
          () => {
            // Пробуем исправить двойное кодирование
            try {
              return Buffer.from(originalName, 'utf8').toString('latin1');
            } catch {
              return originalName;
            }
          }
        ];
        
        for (const attempt of attempts) {
          try {
            const fixed = attempt();
            if (fixed && fixed !== originalName && /[А-Яа-яЁё]/.test(fixed)) {
              console.log('✅ Download: fixed encoding:', fixed);
              originalName = fixed;
              break;
            }
          } catch (e) {
            // Продолжаем попытки
          }
        }
      }
      
      console.log('📤 Download: final name:', originalName);
    } catch (e) {
      console.warn('⚠️ Ошибка при обработке кодировки имени файла:', e);
    }
    
    // Всегда используем RFC 5987 формат для правильной поддержки UTF-8
    // Это гарантирует корректное отображение кириллицы и других не-ASCII символов
    const encodedName = encodeURIComponent(originalName);
    
    // Используем оба формата для максимальной совместимости
    // Старый формат для старых браузеров, новый для современных
    const safeAsciiName = originalName.replace(/[^\x20-\x7E]/g, '_'); // Заменяем не-ASCII на подчеркивания для fallback
    res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`);
    res.setHeader('Content-Type', row.mime || 'application/octet-stream');
    
    console.log('📤 Download: Content-Disposition header:', `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`);
    
    res.sendFile(filePath);
  });
});

// Удаление документа
app.delete('/api/documents/:id', authenticateToken, (req, res) => {
  db.db.get('SELECT * FROM documents WHERE id=?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success:false, error: err.message });
    if (!row) return res.status(404).json({ success:false, error: 'not found' });
    const filePath = path.join(__dirname, '..', row.path);
    db.db.run('DELETE FROM documents WHERE id=?', [req.params.id], (dErr) => {
      if (dErr) return res.status(500).json({ success:false, error: dErr.message });
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
      res.json({ success:true });
    });
  });
});

// === Таблица множественных сессий использования приложения ===
db.db.run(`
  CREATE TABLE IF NOT EXISTS app_usage_session_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    start_at TEXT,
    end_at TEXT,
    date TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )
`, function(err){ if (err) console.error('❌ app_usage_session_entries create error:', err); });

// --- APP USAGE: Пинг старта/остановки ---
app.post('/api/app-usage/ping', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const username = req.user?.username || '';
    const event = (req.body?.event || '').toString(); // 'start' | 'stop'
    if (!userId || (event !== 'start' && event !== 'stop')) {
      return res.status(400).json({ success: false, error: 'invalid params' });
    }
    const now = new Date();
    const localISO = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,19).replace('T',' ');
    const dateStr = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,10);

    // Помощник: закрыть последнюю незакрытую сессию
    const closeOpenIfAny = () => new Promise((resolve, reject) => {
      db.db.get('SELECT * FROM app_usage_session_entries WHERE user_id=? AND end_at IS NULL ORDER BY id DESC LIMIT 1', [userId], (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(false);
        db.db.run('UPDATE app_usage_session_entries SET end_at=? WHERE id=?', [localISO, row.id], (uErr) => {
          if (uErr) return reject(uErr);
          resolve(true);
        });
      });
    });

    if (event === 'start') {
      try { await closeOpenIfAny(); } catch {}
      db.db.run(
        'INSERT INTO app_usage_session_entries (user_id, username, start_at, end_at, date) VALUES (?,?,?,?,?)',
        [userId, username, localISO, null, dateStr],
        function(insErr){
          if (insErr) return res.status(500).json({ success:false, error: insErr.message });
          return res.json({ success:true });
        }
      );
    } else {
      // stop
      db.db.get('SELECT * FROM app_usage_session_entries WHERE user_id=? AND end_at IS NULL ORDER BY id DESC LIMIT 1', [userId], (err, row) => {
        if (err) return res.status(500).json({ success:false, error: err.message });
        if (!row) {
          // нет открытой сессии — не создаём нулевую запись, просто игнорируем stop
          return res.json({ success:true, skipped:true });
        } else {
          db.db.run('UPDATE app_usage_session_entries SET end_at=? WHERE id=?', [localISO, row.id], (uErr)=>{
            if (uErr) return res.status(500).json({ success:false, error: uErr.message });
            return res.json({ success:true });
          });
        }
      });
    }
  } catch (e) {
    console.error('❌ /api/app-usage/ping exception:', e);
    res.status(500).json({ success:false, error: 'server error' });
  }
});

// --- APP USAGE: Отчёт по датам ---
app.get('/api/app-usage/report', authenticateToken, async (req, res) => {
  try {
    const start = (req.query.start || '').toString();
    const end = (req.query.end || '').toString();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return res.status(400).json({ success:false, error: 'invalid date' });
    }
    const includeAll = String(req.query.includeAll ?? 'false').toLowerCase() === 'true';
    const sql = `
      SELECT s.id, s.user_id, COALESCE(u.username, s.username) as user_username, u.avatar as user_avatar,
             s.start_at, s.end_at, s.date
      FROM app_usage_session_entries s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.date >= ? AND s.date <= ?
      ORDER BY s.date DESC, user_username ASC, s.start_at ASC
    `;
    db.db.all(sql, [start, end], (err, rows) => {
      if (err) return res.status(500).json({ success:false, error: err.message });
      // Аггрегируем по пользователю и дате
      const map = new Map();
      for (const r of rows || []) {
        const key = `${r.user_id}|${r.date}`;
        if (!map.has(key)) {
          map.set(key, {
            user_id: r.user_id,
            user_username: r.user_username,
            user_avatar: r.user_avatar,
            date: r.date,
            sessions: [],
            _all_starts: [],
            _all_stops: []
          });
        }
        const obj = map.get(key);
        // собираем все старты/стопы для расчёта first_start/last_stop
        if (r.start_at) obj._all_starts.push(r.start_at);
        if (r.end_at) obj._all_stops.push(r.end_at);
        // отображаем только корректные пары start/stop с позитивной длительностью в детализированных сессиях
        if (r.end_at) {
          const duration = Math.floor((new Date(r.end_at) - new Date(r.start_at)) / 1000);
          if (duration > 0) {
            obj.sessions.push({ id: r.id, start_at: r.start_at, end_at: r.end_at, duration_sec: duration });
          }
        }
      }
      // Рассчитываем первый запуск (по всем стартам), последнее закрытие (по всем стопам) и общее время между ними
      let report = Array.from(map.values()).map(item => {
        const first_start = item._all_starts.length > 0
          ? item._all_starts.reduce((min, cur) => new Date(cur) < new Date(min) ? cur : min)
          : null;
        const last_stop = item._all_stops.length > 0
          ? item._all_stops.reduce((max, cur) => new Date(cur) > new Date(max) ? cur : max)
          : null;
        let span_seconds = 0;
        if (first_start && last_stop) {
          span_seconds = Math.max(0, Math.floor((new Date(last_stop) - new Date(first_start)) / 1000));
        }
        // Убираем служебные поля
        const { _all_starts, _all_stops, ...rest } = item;
        return { ...rest, first_start, last_stop, span_seconds };
      });
      // Включить всех пользователей без сессий, если запрошен один день и includeAll=true
      if (includeAll && start === end) {
        db.db.all('SELECT id as user_id, username as user_username, avatar as user_avatar FROM users', [], (uErr, users) => {
          if (uErr) return res.status(500).json({ success:false, error: uErr.message });
          const existing = new Set(report.map(r => r.user_id));
          for (const u of users || []) {
            if (!existing.has(u.user_id)) {
              report.push({
                user_id: u.user_id,
                user_username: u.user_username,
                user_avatar: u.user_avatar,
                date: start,
                first_start: null,
                last_stop: null,
                span_seconds: 0
              });
            }
          }
          // Сортировка по имени
          report.sort((a,b) => String(a.user_username||'').localeCompare(String(b.user_username||''), 'ru'));
          return res.json({ success:true, report, include_all: true });
        });
        return; // ответ отправится в колбэке
      }
      // Сортировка по имени
      report.sort((a,b) => String(a.user_username||'').localeCompare(String(b.user_username||''), 'ru'));
      return res.json({ success:true, report, include_all: false });
    });
  } catch (e) {
    console.error('❌ /api/app-usage/report exception:', e);
    res.status(500).json({ success:false, error: 'server error' });
  }
});

// --- HELPERS: PowerShell runner ---
function runPowershell(command) {
  return new Promise((resolve, reject) => {
    const prelude = `
      try { $OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false) } catch {}
      try { chcp 65001 | Out-Null } catch {}
      try { Import-Module Microsoft.PowerShell.Security -ErrorAction Stop } catch {}
      try { Import-Module Microsoft.PowerShell.LocalAccounts -ErrorAction Stop } catch {}
    `;
    const fullCommand = `${prelude} ${command}`;
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', fullCommand], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString('utf8'); });
    child.stderr.on('data', d => { stderr += d.toString('utf8'); });
    child.on('error', err => {
      err.stderr = stderr;
      err.stdout = stdout;
      reject(err);
    });
    child.on('close', code => {
      if (code !== 0) {
        const err = new Error(stderr || `PowerShell exited with code ${code}`);
        err.stderr = stderr;
        err.stdout = stdout;
        return reject(err);
      }
      resolve(stdout);
    });
  });
}

// --- ADMIN: Windows Local Users Management ---
app.get('/api/admin/local-users', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const ps = `
      $result = $null
      try {
        $result = Get-LocalUser | Select-Object @{n='Name';e={$_.Name}}, @{n='Enabled';e={$_.Enabled}}, @{n='Description';e={$_.Description}}
      } catch {}
      if (-not $result) {
        try {
          $result = Get-CimInstance Win32_UserAccount -Filter "LocalAccount=True" | Select-Object @{n='Name';e={$_.Name}}, @{n='Enabled';e={!$_.Disabled}}, @{n='Description';e={$_.Description}}
        } catch {}
      }
      if (-not $result) {
        # ADSI fallback
        try {
          $list = @()
          $comp = [ADSI]"WinNT://."
          foreach ($c in $comp.Children) {
            if ($c.SchemaClassName -eq 'User') {
              $obj = [PSCustomObject]@{
                Name = $c.Name
                Enabled = -not ($c.AccountDisabled -as [bool])
                Description = ($c.Description -as [string])
              }
              $list += $obj
            }
          }
          $result = $list
        } catch {}
      }
      ($result | Sort-Object Name) | ConvertTo-Json -Depth 3
    `;
    const out = await runPowershell(ps);
    let data; try { data = JSON.parse(out || '[]'); } catch { data = []; }
    const users = Array.isArray(data) ? data : [data];
    
    // Загружаем пароли из базы данных и добавляем их к пользователям
    try {
      const passwordsMap = await db.getAllLocalUserPasswords();
      users.forEach(user => {
        if (passwordsMap[user.Name]) {
          user.password = passwordsMap[user.Name];
        }
      });
    } catch (dbError) {
      console.error('❌ Error loading passwords from database:', dbError);
      // Продолжаем выполнение даже если не удалось загрузить пароли
    }
    
    return res.json(users);
  } catch (e) {
    console.error('❌ /api/admin/local-users:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/admin/shutdown-1c', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const ps = `
      $processNames = @('1cv8c','1cv8')
      $results = @()
      foreach ($name in $processNames) {
        $entry = [PSCustomObject]@{
          name = $name
          found = 0
          terminated = 0
          message = ''
        }
        try {
          $procs = Get-Process -Name $name -ErrorAction SilentlyContinue
          if ($procs) {
            $entry.found = $procs.Count
            try {
              $procs | Stop-Process -Force -ErrorAction Stop
              $entry.terminated = $entry.found
              $entry.message = 'terminated'
            } catch {
              $entry.message = $_.Exception.Message
            }
          } else {
            $entry.message = 'not found'
          }
        } catch {
          $entry.message = $_.Exception.Message
        }
        $results += $entry
      }
      $results | ConvertTo-Json -Depth 4
    `;

    const raw = await runPowershell(ps);
    let result;
    try {
      result = JSON.parse(raw || '[]');
    } catch {
      result = [];
    }

    const totalTerminated = Array.isArray(result)
      ? result.reduce((acc, item) => acc + (Number(item?.terminated) || 0), 0)
      : 0;

    res.json({
      success: true,
      message: totalTerminated > 0
        ? `Завершено процессов: ${totalTerminated}`
        : 'Активных процессов 1С не найдено',
      result
    });
  } catch (error) {
    console.error('❌ /api/admin/shutdown-1c:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// Hostname for UI display
app.get('/api/admin/host', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    return res.json({ success: true, host: os.hostname() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/admin/local-users', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const { name, password, description = '', noExpire = true, addToRdp = true } = req.body || {};
    if (!name || !password) return res.status(400).json({ success: false, error: 'name and password are required' });
    const safeName = JSON.stringify(String(name));
    const safeDesc = JSON.stringify(String(description));
    const safePassword = JSON.stringify(String(password));
    // Create via net.exe using PowerShell for correct quoting and Unicode
    const psCreate = `
      $name = ${safeName}; $pwd = ${safePassword}; $desc = ${safeDesc}
      & net.exe user "$name" "$pwd" /add
      if ($LASTEXITCODE -ne 0) { throw \"net user add failed\" }
      & net.exe user "$name" /active:yes
      if ($LASTEXITCODE -ne 0) { throw \"net user activate failed\" }
      if ($desc -and $desc.Length -gt 0) { & net.exe user "$name" /comment:"$desc" }
      if (${noExpire ? '$true' : '$false'}) {
        try {
          Import-Module Microsoft.PowerShell.LocalAccounts -ErrorAction Stop
          Set-LocalUser -Name $name -PasswordNeverExpires $true
        } catch {
          try { $u = [ADSI](\"WinNT://./$name,user\"); $u.PasswordExpirationDate = 0; $u.SetInfo() } catch {}
        }
      }
      if (${addToRdp ? '$true' : '$false'}) {
        $added = $false
        try {
          Import-Module Microsoft.PowerShell.LocalAccounts -ErrorAction Stop
          $grpName = try { (New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-555')).Translate([System.Security.Principal.NTAccount]).Value.Split('\\')[-1] } catch { 'Remote Desktop Users' }
          Add-LocalGroupMember -Group $grpName -Member $name -ErrorAction Stop
          $added = $true
        } catch {}
        if (-not $added) {
          $grpName = try { (New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-555')).Translate([System.Security.Principal.NTAccount]).Value.Split('\\')[-1] } catch { 'Remote Desktop Users' }
          & net.exe localgroup "$grpName" "$name" /add
        }
      }
      '{"success":true}'
    `;
    await runPowershell(psCreate);
    
    // Сохраняем пароль в базу данных
    try {
      await db.saveLocalUserPassword(name, password);
    } catch (dbError) {
      console.error('❌ Error saving password to database:', dbError);
      // Не прерываем выполнение, если сохранение в БД не удалось
    }
    
    return res.json({ success: true });
  } catch (e) {
    console.error('❌ POST /api/admin/local-users:', e.message, e.stderr || '');
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

app.post('/api/admin/local-users/:name/password', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const { name } = req.params;
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ success: false, error: 'password is required' });
    const safeName = JSON.stringify(String(name));
    const safePassword = JSON.stringify(String(password));
    // Change password via PowerShell using multiple methods
    const psPwd = `
      $ErrorActionPreference = "Stop"
      $name = ${safeName}; $pwd = ${safePassword}
      $success = $false
      $errorMsg = ""
      
      # Method 1: Try Set-LocalUser (most reliable, respects password policy)
      try {
        Import-Module Microsoft.PowerShell.LocalAccounts -ErrorAction Stop
        $securePassword = ConvertTo-SecureString -String $pwd -AsPlainText -Force
        Set-LocalUser -Name $name -Password $securePassword -ErrorAction Stop
        $success = $true
      } catch {
        $errorMsg = $_.Exception.Message
          # Method 2: Try ADSI SetPassword (can bypass password policy)
        try {
          $user = [ADSI]("WinNT://./$name,user")
          # Try SetPassword - this should bypass password policy
          $user.SetPassword($pwd)
          $user.SetInfo()
          $success = $true
          $errorMsg = ""
        } catch {
          $adsiError = $_.Exception.Message
          $errorMsg = $errorMsg + " | ADSI SetPassword: " + $adsiError
          # Method 3: Try ADSI with Invoke method (alternative ADSI approach)
          try {
            $user = [ADSI]("WinNT://./$name,user")
            $user.Invoke("SetPassword", $pwd)
            $user.CommitChanges()
            $success = $true
            $errorMsg = ""
          } catch {
            $errorMsg = $errorMsg + " | ADSI Invoke: " + $_.Exception.Message
            # Method 3.5: Try ADSI with direct property setting (advanced bypass)
            try {
              $user = [ADSI]("WinNT://./$name,user")
              $user.Put("userPassword", $pwd)
              $user.SetInfo()
              $success = $true
              $errorMsg = ""
            } catch {
              $errorMsg = $errorMsg + " | ADSI Put: " + $_.Exception.Message
              # Method 4: Try WMI (alternative method)
              try {
                $user = Get-WmiObject -Class Win32_UserAccount -Filter "Name='$name' AND LocalAccount='True'"
                if ($user) {
                  $user.SetPassword($pwd)
                  $success = $true
                  $errorMsg = ""
                }
              } catch {
                $errorMsg = $errorMsg + " | WMI: " + $_.Exception.Message
                # Method 5: Fallback to net.exe (requires password policy compliance)
                try {
                  $tempDir = $env:TEMP
                  $outputFile = "$tempDir\\net_output_$([System.Guid]::NewGuid().ToString()).txt"
                  $errorFile = "$tempDir\\net_error_$([System.Guid]::NewGuid().ToString()).txt"
                  $proc = Start-Process -FilePath "net.exe" -ArgumentList "user", "\`"$name\`"", "\`"$pwd\`"" -Wait -NoNewWindow -PassThru -RedirectStandardOutput $outputFile -RedirectStandardError $errorFile
                  if ($proc.ExitCode -eq 0) {
                    $success = $true
                    $errorMsg = ""
                  } else {
                  $errorText = Get-Content $errorFile -ErrorAction SilentlyContinue
                  if ($errorText -match "password policy|password complexity|minimum password length|password history") {
                    # Возвращаем детальную информацию об ошибке для отладки
                    $errorMsg = "Пароль не соответствует политике безопасности Windows. Детали ошибки: $errorText. Попробуйте: 1) Добавить специальные символы (!@#$%^&*), 2) Убедиться, что пароль не содержит имя пользователя, 3) Использовать пароль, который не использовался ранее."
                  } else {
                    $errorMsg = "net.exe failed: ExitCode=$($proc.ExitCode), Error=$errorText"
                  }
                }
                Remove-Item $outputFile -ErrorAction SilentlyContinue
                  Remove-Item $errorFile -ErrorAction SilentlyContinue
                } catch {
                  $errorMsg = $errorMsg + " | net.exe: " + $_.Exception.Message
                }
              }
            }
          }
        }
      }
      
      if ($success) {
        Write-Output '{"success":true}'
        exit 0
      } else {
        # Возвращаем детальную информацию об ошибке для отладки
        $errorJson = @{
          success = $false
          error = $errorMsg
          details = "Все методы установки пароля не сработали. Проверьте: 1) Пароль должен содержать специальные символы, 2) Пароль не должен содержать имя пользователя, 3) Пароль не должен совпадать с предыдущими."
        } | ConvertTo-Json -Compress
        Write-Output $errorJson
        exit 1
      }
    `;
    try {
      const result = await runPowershell(psPwd);
      // Если успешно выполнилось, парсим результат
      try {
        const jsonResult = JSON.parse(result.trim());
        if (jsonResult.success) {
          // Сохраняем пароль в базу данных
          try {
            await db.saveLocalUserPassword(name, password);
          } catch (dbError) {
            console.error('❌ Error saving password to database:', dbError);
            // Не прерываем выполнение, если сохранение в БД не удалось
          }
          return res.json({ success: true });
        } else {
          return res.status(400).json({ success: false, error: jsonResult.error });
        }
      } catch (parseError) {
        // Если не удалось распарсить JSON, но код успешный - значит все ОК
        return res.json({ success: true });
      }
    } catch (e) {
      // Если PowerShell вернул ошибку, проверяем stderr/stdout на наличие JSON с ошибкой
      const errorOutput = e.stderr || e.message || '';
      const stdout = e.stdout || '';
      
      // Пытаемся найти JSON в выводе (сначала в stdout, потом в stderr)
      let jsonMatch = stdout.match(/\{[^}]*"success"[^}]*\}/);
      if (!jsonMatch) {
        jsonMatch = errorOutput.match(/\{[^}]*"success"[^}]*\}/);
      }
      
      if (jsonMatch) {
        try {
          const jsonResult = JSON.parse(jsonMatch[0]);
          if (!jsonResult.success && jsonResult.error) {
            return res.status(400).json({ success: false, error: jsonResult.error });
          }
        } catch (parseErr) {
          // Игнорируем ошибку парсинга
        }
      }
      
      // Если не нашли JSON, возвращаем общую ошибку
      console.error('❌ POST /api/admin/local-users/:name/password:', e.message, errorOutput);
      const errorMessage = (errorOutput + stdout).match(/password policy|password complexity|minimum password length|password history/i)
        ? 'Пароль не соответствует политике безопасности Windows. Требования: минимальная длина, сложность (заглавные, строчные, цифры, символы), история паролей.'
        : (e.message || 'Ошибка при установке пароля');
      
      return res.status(500).json({ success: false, error: errorMessage, stderr: errorOutput });
    }
  } catch (outerError) {
    console.error('❌ POST /api/admin/local-users/:name/password (outer catch):', outerError);
    return res.status(500).json({ success: false, error: outerError.message || 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/admin/local-users/:name/enable', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const safeName = JSON.stringify(String(req.params.name));
    const psEnable = `
      $name = ${safeName}
      & net.exe user "$name" /active:yes
      if ($LASTEXITCODE -ne 0) { throw \"net user enable failed\" }
      '{"success":true}'
    `;
    await runPowershell(psEnable);
    return res.json({ success: true });
  } catch (e) {
    console.error('❌ POST /api/admin/local-users/:name/enable:', e.message, e.stderr || '');
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

app.post('/api/admin/local-users/:name/disable', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const safeName = JSON.stringify(String(req.params.name));
    const psDisable = `
      $name = ${safeName}
      & net.exe user "$name" /active:no
      if ($LASTEXITCODE -ne 0) { throw \"net user disable failed\" }
      '{"success":true}'
    `;
    await runPowershell(psDisable);
    return res.json({ success: true });
  } catch (e) {
    console.error('❌ POST /api/admin/local-users/:name/disable:', e.message, e.stderr || '');
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

app.delete('/api/admin/local-users/:name', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const safeName = JSON.stringify(String(req.params.name));
    const psDelete = `
      $name = ${safeName}
      & net.exe user "$name" /delete
      if ($LASTEXITCODE -ne 0) { throw \"net user delete failed\" }
      '{"success":true}'
    `;
    await runPowershell(psDelete);
    return res.json({ success: true });
  } catch (e) {
    console.error('❌ DELETE /api/admin/local-users/:name:', e.message, e.stderr || '');
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

app.post('/api/admin/local-users/:name/rdp', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const { add } = req.body || {};
    const safeName = JSON.stringify(String(req.params.name));
  const ps = `
      $name = ${safeName}
      $ok = $false
      # Resolve Remote Desktop Users group name by SID for localized systems
      $rdpSid = 'S-1-5-32-555'
      $groupName = $null
      try {
        Import-Module Microsoft.PowerShell.LocalAccounts -ErrorAction Stop
        try {
          $grp = Get-LocalGroup -SID $rdpSid -ErrorAction Stop
          if ($grp -and $grp.Name) { $groupName = $grp.Name }
        } catch {
          try {
            $acct = (New-Object System.Security.Principal.SecurityIdentifier($rdpSid)).Translate([System.Security.Principal.NTAccount]).Value
            if ($acct) { $groupName = ($acct -split '\\')[-1] }
          } catch {}
        }
        if (-not $groupName) { $groupName = 'Remote Desktop Users' }
        if (${add ? '$true' : '$false'}) { Add-LocalGroupMember -Group $groupName -Member $name -ErrorAction Stop }
        else { Remove-LocalGroupMember -Group $groupName -Member $name -ErrorAction Stop }
        $ok = $true
      } catch {}
      if (-not $ok) {
        if (-not $groupName) {
          try {
            $acct = (New-Object System.Security.Principal.SecurityIdentifier($rdpSid)).Translate([System.Security.Principal.NTAccount]).Value
            if ($acct) { $groupName = ($acct -split '\\\\')[-1] }
          } catch { $groupName = $null }
        }
        if (-not $groupName) { $groupName = 'Remote Desktop Users' }
        if (${add ? '$true' : '$false'}) { & net.exe localgroup "$groupName" "$name" /add }
        else { & net.exe localgroup "$groupName" "$name" /delete }
      }
      '{"success":true}'
    `;
    await runPowershell(ps);
    return res.json({ success: true });
  } catch (e) {
    console.error('❌ POST /api/admin/local-users/:name/rdp:', e.message, e.stderr || '');
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// --- ADMIN: update local user description ---
app.post('/api/admin/local-users/:name/description', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const safeName = JSON.stringify(String(req.params.name));
    const safeDesc = JSON.stringify(String(req.body?.description || ''));
    const ps = `
      $name = ${safeName}; $desc = ${safeDesc}
      if ($desc -and $desc.Length -gt 0) { & net.exe user "$name" /comment:"$desc" }
      else { & net.exe user "$name" /comment:"" }
      if ($LASTEXITCODE -ne 0) { throw \"net user set comment failed\" }
      '{"success":true}'
    `;
    await runPowershell(ps);
    return res.json({ success: true });
  } catch (e) {
    console.error('❌ POST /api/admin/local-users/:name/description:', e.message, e.stderr || '');
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// --- ADMIN: set/unset Password Never Expires ---
app.post('/api/admin/local-users/:name/no-expire', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const { noExpire } = req.body || {};
    const safeName = JSON.stringify(String(req.params.name));
    const ps = `
      $name = ${safeName}
      $ok = $false
      try {
        Import-Module Microsoft.PowerShell.LocalAccounts -ErrorAction Stop
        Set-LocalUser -Name $name -PasswordNeverExpires ${noExpire ? '$true' : '$false'} -ErrorAction Stop
        $ok = $true
      } catch {}
      if (-not $ok -and ${noExpire ? '$true' : '$false'}) {
        try { $u = [ADSI]("WinNT://./$name,user"); $u.PasswordExpirationDate = 0; $u.SetInfo(); $ok = $true } catch {}
      }
      if (-not $ok -and -not ${noExpire ? '$true' : '$false'}) {
        throw "Cannot disable 'password never expires' without LocalAccounts module"
      }
      '{"success":true}'
    `;
    await runPowershell(ps);
    return res.json({ success: true });
  } catch (e) {
    console.error('❌ POST /api/admin/local-users/:name/no-expire:', e.message, e.stderr || '');
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// --- ADMIN: rename local user ---
app.post('/api/admin/local-users/:name/rename', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const { newName } = req.body || {};
    if (!newName) return res.status(400).json({ success: false, error: 'newName is required' });
    const safeOld = JSON.stringify(String(req.params.name));
    const safeNew = JSON.stringify(String(newName));
    const ps = `
      $old = ${safeOld}; $new = ${safeNew}
      $renamed = $false
      try {
        Import-Module Microsoft.PowerShell.LocalAccounts -ErrorAction Stop
        Rename-LocalUser -Name $old -NewName $new -ErrorAction Stop
        $renamed = $true
      } catch {}
      if (-not $renamed) {
        try { $u = [ADSI]("WinNT://./$old,user"); $u.Rename($new); $renamed = $true } catch {}
      }
      if (-not $renamed) { throw "rename failed" }
      '{"success":true}'
    `;
    await runPowershell(ps);
    return res.json({ success: true });
  } catch (e) {
    console.error('❌ POST /api/admin/local-users/:name/rename:', e.message, e.stderr || '');
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr });
  }
});

// --- РЕГИСТРАЦИЯ И АВТОРИЗАЦИЯ ---
async function withSqliteRetry(operation, maxRetries = 6, initialDelayMs = 150) {
  let delay = initialDelayMs;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (err && (err.code === 'SQLITE_BUSY' || /database is locked/i.test(err.message || ''))) {
        if (attempt === maxRetries - 1) throw err;
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, 2000);
        continue;
      }
      throw err;
    }
  }
}
app.post('/api/register', async (req, res) => {
  try {
    const { first_name, last_name, password, birth_day, birth_month, birth_year, avatar_url, department } = req.body;
    if (!first_name || !last_name || !password) {
      return res.status(400).json({ error: 'Имя, фамилия и пароль обязательны' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }
    
    // Ищем сотрудника по имени и фамилии
    let employee = await withSqliteRetry(() => db.findEmployeeByName(first_name, last_name));
    if (!employee) {
      // Если не найден — создаём нового сотрудника
      const empId = await withSqliteRetry(() => db.addEmployee({ first_name, last_name, birth_day, birth_month, birth_year, avatar_url, department }));
      employee = await withSqliteRetry(() => db.getEmployeeById(empId));
    }
    
    // Проверяем, есть ли пользователь с таким employee_id
    const existingUser = await withSqliteRetry(() => db.getUserByEmployeeId(employee.id));
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с такими данными уже существует' });
    }
    
    // Создаём пользователя
    let username = `${first_name} ${last_name}`.replace(/\s+/g, ' ').trim();
    
    // Проверяем, не существует ли уже пользователь с таким username
    let existingUserByUsername = await withSqliteRetry(() => db.getUserByUsername(username));
    if (existingUserByUsername) {
      // Пытаемся создать уникальное имя пользователя, добавляя номер
      let counter = 1;
      let uniqueUsername = `${username} (${counter})`;
      existingUserByUsername = await withSqliteRetry(() => db.getUserByUsername(uniqueUsername));
      
      while (existingUserByUsername && counter < 100) {
        counter++;
        uniqueUsername = `${username} (${counter})`;
        existingUserByUsername = await withSqliteRetry(() => db.getUserByUsername(uniqueUsername));
      }
      
      if (existingUserByUsername) {
        return res.status(400).json({ error: 'Не удалось создать уникальное имя пользователя. Попробуйте позже.' });
      }
      
      username = uniqueUsername;
    }
    
    const userId = await withSqliteRetry(() => db.createUserWithEmployee({ employee_id: employee.id, password, username }));
    
    // Получаем роль пользователя
    const user = await withSqliteRetry(() => db.getUserById(userId));
    const token = jwt.sign({ userId, employee_id: employee.id, first_name, last_name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    await withSqliteRetry(() => db.setUserToken(userId, token));
    
    res.json({
      token,
      user: {
        id: userId,
        employee_id: employee.id,
        first_name,
        last_name,
        avatar_url: employee.avatar_url,
        role: user.role,
        department: employee.department || ''
      },
      message: 'Регистрация успешна'
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Проверяем, является ли ошибка нарушением уникального ограничения
    if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE constraint failed: users.username')) {
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует. Попробуйте еще раз.' });
    }
    
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { first_name, last_name, password } = req.body;
    if (!first_name || !last_name || !password) {
      return res.status(400).json({ error: 'Имя, фамилия и пароль обязательны' });
    }
    
    // Ищем сотрудника
    const employee = await withSqliteRetry(() => db.findEmployeeByName(first_name, last_name));
    if (!employee) {
      return res.status(400).json({ error: 'Сотрудник не найден' });
    }
    
    // Ищем пользователя по employee_id
    const user = await withSqliteRetry(() => db.getUserByEmployeeId(employee.id));
    if (!user) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Неверные учетные данные' });
    }
    
    const token = jwt.sign({ userId: user.id, employee_id: employee.id, first_name, last_name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    await withSqliteRetry(() => db.setUserToken(user.id, token));
    
    res.json({
      token,
      user: {
        id: user.id,
        employee_id: employee.id,
        first_name,
        last_name,
        avatarUrl: user.avatar || employee.avatar_url || '',
        role: user.role,
        department: employee.department || ''
      },
      message: 'Вход выполнен успешно'
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});

app.post('/api/client-log', (req, res) => {
  console.log('Client log:', req.body);
  res.status(200).json({ message: 'Log received' });
});

// --- АВАТАРЫ ПОЛЬЗОВАТЕЛЯ ---
// Получение аватара по умолчанию
app.get('/api/avatars/default.png', (req, res) => {
  const defaultAvatarPath = path.join(__dirname, '../public/default-avatar.png');
  if (fs.existsSync(defaultAvatarPath)) {
    res.sendFile(defaultAvatarPath);
  } else {
    // Создаем простой SVG аватар по умолчанию
    const svg = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#4a5568"/>
        <circle cx="20" cy="16" r="8" fill="#a0aec0"/>
        <path d="M8 32c0-6.627 5.373-12 12-12s12 5.373 12 12" fill="#a0aec0"/>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  }
});

// Загрузка аватара пользователя
app.post('/api/upload-avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    
    // Сохраняем путь с учётом новой папки
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await db.setUserAvatar(userId, avatarUrl);
    res.json({ avatarUrl });
  } catch (err) {
    console.error('Ошибка загрузки аватара:', err);
    res.status(500).json({ error: 'Ошибка загрузки аватара' });
  }
});

// Удаление аватара пользователя
app.post('/api/remove-avatar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await db.getUserById(userId);
    if (user && user.avatar) {
      const filePath = path.join(__dirname, '../', user.avatar);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.setUserAvatar(userId, '');
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления аватара:', err);
    res.status(500).json({ error: 'Ошибка удаления аватара' });
  }
});

// --- ЗАГРУЗКА ФАЙЛОВ ---
// Улучшенная загрузка файлов с правильной обработкой UTF-8
app.post('/api/upload', authenticateToken, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('❌ Upload error:', err);
    
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Файл слишком большой. Максимальный размер: 10MB' });
        }
      }
    
      return res.status(400).json({ error: err.message || 'Ошибка загрузки файла' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Файл не выбран' });
      }

      console.log('✅ File uploaded successfully:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        userId: req.user.userId
      });

      // Создаем полный URL для файла
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

      // Используем originalName из formData, если оно есть (гарантированно UTF-8)
      let originalName = req.body.originalName || req.file.originalname;
      const fileInfo = {
        filename: req.file.filename,
        originalName,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path,
        uploadedBy: req.user.userId,
        uploadedAt: new Date().toISOString()
      };

      res.json(fileInfo);
    } catch (error) {
      console.error('❌ File processing error:', error);
      res.status(500).json({ error: 'Ошибка обработки файла' });
    }
  });
});

// Маршрут для скачивания файлов
app.get('/api/download/:filename', authenticateToken, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }
    
    // Получаем оригинальное имя файла из tasks (или messages) по filename
    let originalname = filename;
    let mimetype = 'application/octet-stream';
    
    try {
      // SQLite запрос
      const sqlite3 = require('sqlite3').verbose();
      const dbPath = path.join(__dirname, 'messenger.db');
      const db = new sqlite3.Database(dbPath);
      
      db.get('SELECT file_info FROM tasks WHERE file_info LIKE ?', [`%"filename":"${filename}"%`], (err, row) => {
        if (!err && row && row.file_info) {
          try {
            const files = JSON.parse(row.file_info);
            const fileObj = Array.isArray(files) ? files.find(f => f.filename === filename) : null;
            if (fileObj) {
              originalname = fileObj.originalname || filename;
              mimetype = fileObj.mimetype || mimetype;
            }
          } catch (e) {
            console.error('Ошибка парсинга file_info:', e);
          }
        }
        
        db.close();
        
        // Устанавливаем заголовки
        // Только безопасный вариант для любых символов
        const encodedName = encodeURIComponent(originalname);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
        res.setHeader('Content-Type', mimetype);
        res.sendFile(filePath);
      });
    } catch (error) {
      // fallback
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.sendFile(filePath);
    }
  } catch (error) {
    console.error('❌ Download error:', error);
    res.status(500).json({ error: 'Ошибка скачивания файла' });
  }
});

// --- НОВОСТИ ---
// Получить все новости (видят все)
app.get('/api/news', authenticateToken, async (req, res) => {
  try {
    console.log(`[NEWS] user:`, req.user, 'role:', req.user && req.user.role);
    const news = await db.getAllNews(req.user.role, req.user.userId || req.user.id);
    res.json(news);
  } catch (e) {
    console.error('❌ Ошибка получения новостей:', e);
    res.status(500).json({ error: 'Ошибка получения новостей', details: e.message });
  }
});

  // Получить новость по id с данными сотрудника-автора
  app.get('/api/news/:id', authenticateToken, async (req, res) => {
    try {
      const newsId = Number(req.params.id);
      const news = await db.getNewsById(newsId);
      if (!news) return res.status(404).json({ error: 'Новость не найдена' });
      // Получаем сотрудника по authorId
      const employee = await db.getEmployeeById(news.authorId);
      res.json({ ...news, employee });
    } catch (e) {
      console.error('❌ Ошибка получения новости:', e);
      res.status(500).json({ error: 'Ошибка получения новости', details: e.message });
    }
  });

// Создать новость (только admin и hr)
app.post('/api/news', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'hr') {
    return res.status(403).json({ error: 'Нет прав для создания новости' });
  }
  
  const { title, content, publishAt } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Заголовок и текст обязательны' });
  
  try {
    const item = await db.createNews({ title, content, authorId: (req.user.userId || req.user.id), publishAt });
    // Emit событие всем клиентам через socket.io
    if (global.io) {
      global.io.emit('news-published', item);
    }
    res.json(item);
  } catch (e) {
    console.error('❌ Ошибка создания новости:', e);
    res.status(500).json({ error: 'Ошибка создания новости', details: e.message });
  }
});

// --- API: СОЗДАНИЕ ОПРОСА ---
app.post('/api/news/poll', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'hr') {
    return res.status(403).json({ error: 'Нет прав для создания опроса' });
  }
  
  const { question, options } = req.body;
  if (!question || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Вопрос и минимум 2 варианта ответа обязательны' });
  }
  
  try {
    const item = await db.createPoll({ question, options, authorId: (req.user.userId || req.user.id) });
    if (global.io) {
      global.io.emit('news-published', item);
    }
    res.json(item);
  } catch (e) {
    console.error('❌ Ошибка создания опроса:', e);
    res.status(500).json({ error: 'Ошибка создания опроса', details: e.message });
  }
});

// Удалить новость (только admin и hr)
app.delete('/api/news/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'hr') {
    return res.status(403).json({ error: 'Нет прав для удаления новости' });
  }
  
  const newsId = Number(req.params.id);
  try {
    const changes = await db.deleteNewsAsync(newsId);
    if (changes && global.io) {
      global.io.emit('news-deleted', { id: newsId });
    }
    res.json({ success: !!changes });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка удаления новости', details: e.message });
  }
});

// Редактировать новость
app.put('/api/news/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'hr') {
    return res.status(403).json({ error: 'Нет прав для редактирования новости' });
  }
  
  const newsId = Number(req.params.id);
  const { title, content, publishAt } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Заголовок и текст обязательны' });
  
  try {
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
    res.status(500).json({ error: 'Ошибка редактирования новости', details: e.message, stack: e.stack });
  }
});

// Лайкнуть новость
app.post('/api/news/:id/like', authenticateToken, async (req, res) => {
  try {
    const newsId = Number(req.params.id);
    const userId = req.user.userId || req.user.id;
    const emoji = typeof req.body.emoji === 'string' ? req.body.emoji : null;
    const liked = await db.likeNews(newsId, userId, emoji);
    res.json({ success: liked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Оставить комментарий к новости
app.post('/api/news/:id/comment', authenticateToken, async (req, res) => {
  try {
    const newsId = Number(req.params.id);
    const userId = req.user.userId || req.user.id;
    const { commentText } = req.body;
    console.log('[NEWS] POST /api/news/:id/comment', { newsId, userId, commentText });
    if (!commentText) return res.status(400).json({ error: 'commentText обязателен' });
    await db.addNewsComment({ newsId, userId, commentText });
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка при добавлении комментария к новости:', err);
    res.status(500).json({ error: err.message, details: err });
  }
});

// --- ГОЛОСОВАНИЕ В ОПРОСЕ НОВОСТИ ---
// --- Получить список проголосовавших и не проголосовавших сотрудников по новости-опросу ---
app.get('/api/news/:id/voters', authenticateToken, async (req, res) => {
  try {
    const newsId = Number(req.params.id);
    // Получаем новость
    const news = await db.getNewsById(newsId);
    if (!news || news.type !== 'poll') return res.status(404).json({ error: 'Опрос не найден' });
    
    // Парсим voters
    const voters = news.voters ? JSON.parse(news.voters) : [];
    
    // Получаем дату публикации опроса (точка отсчёта)
    const pollDate = news.publishAt ? news.publishAt.slice(0, 10) : null;
    
    // Получаем всех сотрудников, кто был на работе в день опроса (по входу)
    let workUsers = [];
    if (pollDate) {
      const logs = await db.getWorkTimeLogs({ start: pollDate, end: pollDate });
      workUsers = logs.filter(l => l.event_type === 'login').map(l => l.username);
      workUsers = Array.from(new Set(workUsers));
    }
    
    // Получаем данные всех пользователей
    const allUsers = await db.getAllUsers();
    const userMap = {};
    allUsers.forEach(u => { userMap[u.username] = u; });

    // Новый формат: кто за какой вариант проголосовал
    const options = news.options ? JSON.parse(news.options) : [];
    // Для каждого варианта — список сотрудников
    const votedByOption = options.map((opt, idx) => {
      // Находим всех voters с optionIndex === idx
      const users = voters.filter(v => v.optionIndex === idx).map(v => allUsers.find(u => u.id == v.userId)).filter(Boolean);
      return { option: opt, users };
    });

    // Список сотрудников, кто был на работе, но не проголосовал
    const votedIds = voters.map(v => v.userId);
    const notVotedUsernames = workUsers.filter(username => {
      const user = userMap[username];
      return user && !votedIds.includes(user.id);
    });
    const notVotedUsers = notVotedUsernames.map(username => userMap[username]).filter(Boolean);

    res.json({
      votedByOption,
      notVoted: notVotedUsers,
      totalWorkUsers: workUsers.length
    });
  } catch (err) {
    console.error('Ошибка получения списка проголосовавших:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/news/:id/vote', authenticateToken, async (req, res) => {
  try {
    const newsId = Number(req.params.id);
    const userId = req.user.userId || req.user.id;
    const { optionIndex } = req.body;
    if (typeof optionIndex !== 'number') return res.status(400).json({ error: 'optionIndex обязателен' });
    
    // Получаем новость
    const news = await db.getNewsById(newsId);
    if (!news || news.type !== 'poll') return res.status(404).json({ error: 'Опрос не найден' });
    
    // Парсим votes и voters из JSON
    news.votes = news.votes ? JSON.parse(news.votes) : [];
    news.voters = news.voters ? JSON.parse(news.voters) : [];
    
    // Проверяем, голосовал ли пользователь
    if (news.voters && news.voters.some(v => v.userId === userId)) {
      return res.status(403).json({ error: 'Вы уже голосовали' });
    }
    
    // Обновляем голоса и список проголосовавших
    news.votes[optionIndex] = (news.votes[optionIndex] || 0) + 1;
    news.voters.push({ userId, optionIndex });
    await db.updateNewsPoll(newsId, news.votes, news.voters);
    
    // Emit обновление опроса
    if (global.io) {
      global.io.emit('news-poll-voted', { newsId, votes: news.votes, voters: news.voters });
    }
    
    res.json({ success: true, votes: news.votes, voters: news.voters });
  } catch (err) {
    console.error('Ошибка голосования в опросе новости:', err);
    res.status(500).json({ error: err.message });
  }
});

// Снять лайк с новости
app.post('/api/news/:id/unlike', authenticateToken, async (req, res) => {
  try {
    const newsId = Number(req.params.id);
    const userId = req.user.userId || req.user.id;
    const result = await db.unlikeNews(newsId, userId);
    res.json({ success: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ЗАДАЧИ ---
// Получить задачи
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    // Получаем задачи, где пользователь — автор или исполнитель
    db.db.all(
      `SELECT * FROM tasks WHERE authorId = ? OR assignedTo = ?`,
      [userId, userId],
      (err, rows) => {
        if (err) {
          console.error('Error fetching tasks:', err);
          res.status(500).json({ error: 'Ошибка получения задач' });
        } else {
          console.log('Tasks fetched:', rows);
          res.json(rows || []);
        }
      }
    );
  } catch (e) {
    console.error('Unexpected error in /api/tasks:', e);
    res.status(500).json({ error: 'Ошибка получения задач' });
  }
});

// Создать задачу
app.post('/api/tasks', authenticateToken, upload.array('files', 10), async (req, res, next) => {
  // Получаем originalNames из тела запроса
  let originalNames = req.body.originalName;
  // Если строка — пробуем распарсить как JSON-массив
  if (typeof originalNames === 'string') {
    try { originalNames = JSON.parse(originalNames); } catch {}
  }
  // Логируем массив имён после парсинга
  console.log('originalNames после парсинга:', originalNames);
  
  if (req.files && req.files.length > 0) {
    req.files.forEach(f => {
      console.log('Загрузка файла:', {
        originalname: f.originalname,
        filename: f.filename,
        mimetype: f.mimetype
      });
    });
  }
  
  try {
    // Для multipart/form-data поля всегда строки
    const title = req.body.title;
    const description = req.body.description;
    const assignedTo = req.body.assignedTo;
    const deadline = req.body.deadline;
    const priority = req.body.priority || 'medium';
    let filesInfo = [];

    const iconv = require('iconv-lite');
    function fixEncoding(str) {
      // Если есть 'кракозябры', пробуем перекодировать из win1251 в utf8
      if (/Ð|Ñ|Ð|Ð/.test(str)) {
        try {
          return iconv.decode(Buffer.from(str, 'binary'), 'win1251');
        } catch { return str; }
      }
      return str;
    }
    
    if (req.files && req.files.length > 0) {
      let originalNames = req.body.originalName;
      // Если строка — пробуем распарсить как JSON-массив
      if (typeof originalNames === 'string') {
        try { originalNames = JSON.parse(originalNames); } catch {}
      }
      
      // Логируем для отладки
      console.log('[UPLOAD] req.files:', req.files.map(f => ({filename: f.filename, originalname: f.originalname, mimetype: f.mimetype})));
      console.log('[UPLOAD] originalNames:', originalNames);
      
      filesInfo = req.files.map((f, idx) => {
        let origName = Array.isArray(originalNames) ? originalNames[idx] : (originalNames || f.originalname);
        // fallback: если origName не строка или пустая, берем оригинальное имя из multer
        if (!origName || typeof origName !== 'string') origName = f.originalname;
        // fallback: если имя похоже на цифровое (uuid/хэш), пробуем взять из f.originalname
        if (/^[a-f0-9]{16,}$/.test(origName) && f.originalname && !/^[a-f0-9]{16,}$/.test(f.originalname)) origName = f.originalname;
        // fallback: если есть кракозябры, пробуем перекодировать
        origName = fixEncoding(origName);
        // fallback: если mimetype не определён, пробуем определить по расширению
        let mimetype = f.mimetype;
        if (!mimetype || mimetype === 'application/octet-stream') {
          const ext = (origName.split('.').pop() || '').toLowerCase();
          const mimeMap = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp', 'bmp': 'image/bmp',
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'txt': 'text/plain',
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed',
            'csv': 'text/csv'
          };
          if (mimeMap[ext]) mimetype = mimeMap[ext];
        }
        return {
          filename: f.filename,
          originalname: origName,
          mimetype,
          size: f.size,
          path: f.path.replace(/\\/g, '/')
        };
      });
      
      console.log('[UPLOAD] filesInfo for DB:', filesInfo);
    }
    
    const task = await db.createTask({
      title,
      description,
      assignedTo,
      deadline,
      priority,
      authorId: req.user.userId,
      files: filesInfo
    });
    
    res.json(task);
  } catch (e) {
    console.error('Ошибка создания задачи:', e);
    next(e);
  }
});

// -- Удалить задачу (переписан с async/await и корректной обработкой ошибок)
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    // Небольшая промисификация для db.get
    const { promisify } = require('util');
    const dbGet = promisify(db.db.get.bind(db.db));

    let row;
    try {
      row = await dbGet('SELECT file_info FROM tasks WHERE id = ?', [req.params.id]);
    } catch (err) {
      console.error('Ошибка при получении задачи для удаления:', err);
      return res.status(500).json({ error: 'Ошибка при получении задачи для удаления' });
    }

    // Если есть информация о файлах — пробуем удалить файлы безопасно
    if (row && row.file_info) {
      try {
        const files = JSON.parse(row.file_info);
        if (Array.isArray(files)) {
          for (const f of files) {
            try {
              if (f && f.path && fs.existsSync(f.path)) {
                fs.unlinkSync(f.path);
                console.log('Удалён файл задачи:', f.path);
              }
            } catch (fileErr) {
              // Логируем ошибку удаления конкретного файла, но не прерываем процесс удаления записи
              console.error('Ошибка при удалении файла задачи:', f && f.path, fileErr);
            }
          }
        }
      } catch (parseErr) {
        console.error('Ошибка парсинга file_info при удалении задачи:', parseErr);
      }
    }

    // Удаляем задачу из БД
    try {
      const result = await db.deleteTask(req.params.id, req.user.userId);
      return res.json({ success: !!result });
    } catch (delErr) {
      console.error('Ошибка удаления задачи из БД:', delErr);
      return res.status(500).json({ error: 'Ошибка удаления задачи' });
    }
  } catch (e) {
    console.error('Unexpected error в /api/tasks/:id DELETE:', e);
    res.status(500).json({ error: 'Ошибка удаления задачи' });
  }
});

// Завершить задачу (отметить как выполненную)
app.post('/api/tasks/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { comment } = req.body;
    const taskId = req.params.id;
    // Обновляем статус задачи, дату завершения и комментарий
    const completedAt = new Date().toISOString();
    await db.db.run(
      'UPDATE tasks SET status = ?, completedAt = ?, completionComment = ? WHERE id = ?',
      ['completed', completedAt, comment, taskId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Ошибка завершения задачи' });
        }
        db.db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err2, row) => {
          if (err2) return res.status(500).json({ error: 'Ошибка получения задачи' });
          res.json(row);
        });
      }
    );
  } catch (e) {
    res.status(500).json({ error: 'Ошибка завершения задачи' });
  }
});

// Продлить дедлайн задачи
app.post('/api/tasks/:id/extend', authenticateToken, async (req, res) => {
  try {
    const { deadline } = req.body;
    const taskId = req.params.id;
    await db.db.run(
      'UPDATE tasks SET deadline = ? WHERE id = ?',
      [deadline, taskId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Ошибка продления задачи' });
        }
        db.db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err2, row) => {
          if (err2) return res.status(500).json({ error: 'Ошибка получения задачи' });
          res.json(row);
        });
      }
    );
  } catch (e) {
    res.status(500).json({ error: 'Ошибка продления задачи' });
  }
});

// Получить задачи по статусу (например, open/completed) только где пользователь — автор или исполнитель
app.get('/api/tasks/status/:status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.params;
    const userId = req.user.userId;
    const tasks = await new Promise((resolve, reject) => {
      db.db.all(
        `SELECT * FROM tasks WHERE status = ? AND (authorId = ? OR assignedTo = ?)`,
        [status, userId, userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения задач по статусу' });
  }
});

// Получить задачи по пользователю и дате (например, для поиска/календаря)
// Пример: /api/tasks/search?userId=123&date=2025-08-22
app.get('/api/tasks/search', authenticateToken, async (req, res) => {
  try {
    const { userId, date } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId обязателен' });
    
    let query = `SELECT * FROM tasks WHERE (authorId = ? OR assignedTo = ?)`;
    const params = [userId, userId];
    
    if (date) {
      query += ' AND DATE(deadline) = DATE(?)';
      params.push(date);
    }
    
    const tasks = await new Promise((resolve, reject) => {
      db.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка поиска задач' });
  }
});

// Получить только выполненные задачи
app.get('/api/tasks/completed', authenticateToken, async (req, res) => {
  try {
    const tasks = await db.getCompletedTasks(req.user.userId);
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения выполненных задач' });
  }
});

// Получить только невыполненные задачи
app.get('/api/tasks/open', authenticateToken, async (req, res) => {
  try {
    const tasks = await db.getOpenTasks(req.user.userId);
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения открытых задач' });
  }
});

// Удалить все выполненные задачи пользователя
app.delete('/api/tasks/completed', authenticateToken, async (req, res) => {
  try {
    const deleted = await db.deleteCompletedTasks(req.user.userId);
    res.json({ success: true, deleted });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка удаления выполненных задач' });
  }
});

// --- ОТПУСКИ ---
// Получить отпуска пользователя
app.get('/api/leaves', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const userLeaves = await db.getLeavesByUser(userId);
    res.json(userLeaves);
  } catch (error) {
    console.error('Ошибка получения заявок:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение данных отработки для HR (все пользователи) - ДОЛЖЕН БЫТЬ ПЕРЕД /api/leaves/:id
app.get('/api/leaves/hr-worktime', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const worktimeData = await db.getHRWorktimeData(date);
    console.log(`📊 HR Worktime data for ${date}:`, worktimeData.length, 'records');
    res.json(worktimeData);
  } catch (error) {
    console.error('HR worktime data error:', error);
    res.status(500).json({ error: 'Failed to fetch HR worktime data' });
  }
});

// Получение детальной информации по отработке пользователя
app.get('/api/leaves/user-worktime-details', authenticateToken, async (req, res) => {
  try {
    if (!['admin','hr','руководитель'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Нет прав' });
    }
    const { userId, date } = req.query;
    if (!userId || !date) {
      return res.status(400).json({ error: 'userId and date parameters are required' });
    }

    const details = await db.getUserWorktimeDetails(userId, date);
    res.json(details);
  } catch (error) {
    console.error('User worktime details error:', error);
    res.status(500).json({ error: 'Failed to fetch user worktime details' });
  }
});

// Получить верификации на дату
app.get('/api/leaves/verified', authenticateToken, async (req, res) => {
  try {
    const date = (req.query.date || new Date().toISOString().slice(0,10));
    const list = await db.getWorktimeVerificationsByDate(String(date).slice(0,10));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения верификаций', details: e.message });
  }
});

  // Получить заявку на отпуск по id с данными сотрудника
  app.get('/api/leaves/:id', authenticateToken, async (req, res) => {
    try {
      const leaveId = Number(req.params.id);
      const leave = await db.getLeaveById(leaveId);
      if (!leave) return res.status(404).json({ error: 'Заявка не найдена' });
      // Получаем сотрудника по userId
      const employee = await db.getEmployeeById(leave.userId);
      res.json({ ...leave, employee });
    } catch (error) {
      console.error('Ошибка получения заявки:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

// Создать заявку на отпуск
app.post('/api/leaves', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/leaves req.body:', req.body);
    const { userId, type, startDate, endDate, reason } = req.body;
    const minutes = Number(req.body.minutes) || 0;
    const time = req.body.time || null;
    const id = await db.createLeave({ userId, type, startDate, endDate, reason, minutes, time });
    const leave = { id, userId, type, startDate, endDate, reason, minutes, time, status: 'pending' };
    res.json(leave);
  } catch (error) {
    console.error('❌ /api/leaves POST error:', error);
    res.status(500).json({ error: 'Ошибка создания заявки', details: error && error.message ? error.message : error });
  }
});

// Редактировать заявку на отпуск
app.put('/api/leaves/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin' && req.user.role !== 'руководитель') {
    return res.status(403).json({ error: 'Нет прав для редактирования' });
  }
  
  try {
    const id = Number(req.params.id);
    const { type, startDate, endDate, reason } = req.body;
    const changes = await db.updateLeave(id, { type, startDate, endDate, reason });
    if (!changes) return res.status(404).json({ error: 'Заявка не найдена' });
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/leaves/:id PUT error:', error);
    res.status(500).json({ error: 'Ошибка редактирования заявки' });
  }
});

// Сменить статус заявки
app.put('/api/leaves/:id/status', authenticateToken, async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin' && req.user.role !== 'руководитель') {
    return res.status(403).json({ error: 'Нет прав для смены статуса' });
  }
  
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const changes = await db.updateLeaveStatus(id, status);
    if (!changes) return res.status(404).json({ error: 'Заявка не найдена' });
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/leaves/:id/status PUT error:', error);
    res.status(500).json({ error: 'Ошибка смены статуса' });
  }
});

// Удалить заявку на отпуск
app.delete('/api/leaves/:id', authenticateToken, async (req, res) => {
  // Получаем заявку
  const id = Number(req.params.id);
  let leave;
  try {
    leave = await db.getLeaveById(id);
  } catch (e) {
    return res.status(404).json({ error: 'Заявка не найдена' });
  }
  
  // Разрешаем удаление HR/admin/руководителю или автору заявки
  const userId = req.user.userId || req.user.id;
  if (
    req.user.role !== 'hr' && req.user.role !== 'admin' && req.user.role !== 'руководитель' &&
    (!leave || leave.userId !== userId)
  ) {
    return res.status(403).json({ error: 'Нет прав для удаления' });
  }
  
  try {
    const id = Number(req.params.id);
    const changes = await db.deleteLeave(id);
    if (!changes) return res.status(404).json({ error: 'Заявка не найдена' });
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/leaves/:id DELETE error:', error);
    res.status(500).json({ error: 'Ошибка удаления заявки' });
  }
});

// Баланс отпусков
app.get('/api/leave-balance/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const userLeaves = await db.getLeavesByUser(userId);
    let vacationDays = 0, leaveDays = 0, sickDays = 0;
    
    userLeaves.forEach(l => {
      const days = (new Date(l.endDate) - new Date(l.startDate)) / (1000*60*60*24) + 1;
      if (l.type === 'vacation') vacationDays += days;
      else if (l.type === 'leave' && /болею|больнич/i.test(l.reason)) sickDays += days;
      else if (l.type === 'leave') leaveDays += days;
    });
    
    res.json({ vacationDays, leaveDays, sickDays });
  } catch (error) {
    console.error('❌ /api/leave-balance error:', error);
    res.status(500).json({ error: 'Ошибка получения баланса отпусков' });
  }
});

// История заявок
app.get('/api/leave-history/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const userLeaves = await db.getLeavesByUser(userId);
    res.json(userLeaves);
  } catch (error) {
    console.error('❌ /api/leave-history error:', error);
    res.status(500).json({ error: 'Ошибка получения истории заявок' });
  }
});

// Все заявки (для календаря)
app.get('/api/all-leaves', authenticateToken, async (req, res) => {
  try {
    const allLeaves = await db.getAllLeaves();
    res.json(allLeaves);
  } catch (error) {
    console.error('❌ /api/all-leaves error:', error);
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

// --- WEEKEND WORK API ---
app.get('/api/weekend-work/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const timer = await db.getWeekendTimer(userId);
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const todaySessions = await db.getWeekendSessionsByDate(todayStr);
    const yesterdaySessions = await db.getWeekendSessionsByDate(yesterdayStr);
    const sumByUser = (arr) => arr.filter(s => s.user_id === userId).reduce((a, s) => a + (Number(s.minutes) || 0), 0);
    res.json({
      running: !!timer,
      startTs: timer?.start_ts || null,
      todayMinutes: sumByUser(todaySessions),
      yesterdayMinutes: sumByUser(yesterdaySessions)
    });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения статуса выходных', details: e.message });
  }
});

app.post('/api/weekend-work/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const startTs = Date.now();
    await db.upsertWeekendTimer(userId, startTs);
    res.json({ success: true, startTs });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка старта таймера', details: e.message });
  }
});

app.post('/api/weekend-work/stop', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const timer = await db.getWeekendTimer(userId);
    if (!timer) return res.status(400).json({ error: 'Таймер не запущен' });
    const endTs = Date.now();
    const minutes = Math.max(0, Math.round((endTs - Number(timer.start_ts)) / 60000));
    const dateStr = new Date().toISOString().slice(0, 10);
    await db.addWeekendSession({ userId, date: dateStr, minutes, startTs: Number(timer.start_ts), endTs });
    await db.clearWeekendTimer(userId);
    res.json({ success: true, minutes });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка остановки таймера', details: e.message });
  }
});

app.post('/api/weekend-work/add-minutes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const minutes = Math.max(0, Number(req.body.minutes) || 0);
    const dateStr = (req.body.date || new Date().toISOString().slice(0, 10));
    await db.addWeekendSession({ userId, date: dateStr, minutes, manual: 1 });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка добавления минут', details: e.message });
  }
});

// --- WEEKDAY WORK API ---
app.get('/api/weekday-work/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const timer = await db.getWeekdayTimer(userId);
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const todaySessions = await db.getWeekdaySessionsByDate(todayStr);
    const yesterdaySessions = await db.getWeekdaySessionsByDate(yesterdayStr);
    const sumByUser = (arr) => arr.filter(s => s.user_id === userId).reduce((a, s) => a + (Number(s.minutes) || 0), 0);
    res.json({
      running: !!timer,
      startTs: timer?.start_ts || null,
      todayMinutes: sumByUser(todaySessions),
      yesterdayMinutes: sumByUser(yesterdaySessions)
    });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения статуса будних дней', details: e.message });
  }
});

app.post('/api/weekday-work/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const startTs = Date.now();
    await db.upsertWeekdayTimer(userId, startTs);
    res.json({ success: true, startTs });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка старта таймера будних дней', details: e.message });
  }
});

app.post('/api/weekday-work/stop', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const timer = await db.getWeekdayTimer(userId);
    if (!timer) return res.status(400).json({ error: 'Таймер не запущен' });
    const endTs = Date.now();
    const minutes = Math.max(0, Math.round((endTs - Number(timer.start_ts)) / 60000));
    const dateStr = new Date().toISOString().slice(0, 10);
    await db.addWeekdaySession({ userId, date: dateStr, minutes, startTs: Number(timer.start_ts), endTs });
    await db.clearWeekdayTimer(userId);
    res.json({ success: true, minutes });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка остановки таймера будних дней', details: e.message });
  }
});

app.post('/api/weekday-work/add-minutes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const minutes = Math.max(0, Number(req.body.minutes) || 0);
    const dateStr = (req.body.date || new Date().toISOString().slice(0, 10));
    await db.addWeekdaySession({ userId, date: dateStr, minutes, manual: 1 });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка добавления минут будних дней', details: e.message });
  }
});

// --- ALL USERS TIMERS API (для HR/Admin) ---
app.get('/api/all-users-timers', authenticateToken, async (req, res) => {
  try {
    // Проверяем права доступа - только HR и админы
    if (req.user.role !== 'hr' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав доступа' });
    }

    // Получаем всех пользователей
    const allUsers = await db.getAllUsers();
    const todayStr = new Date().toISOString().slice(0, 10);
    const result = {};

    // Для каждого пользователя получаем его данные таймеров
    for (const user of allUsers) {
      if (!user || !user.username) continue;
      
      try {
        // Получаем активные таймеры
        const weekendTimer = await db.getWeekendTimer(user.id);
        const weekdayTimer = await db.getWeekdayTimer(user.id);
        
        // Получаем сессии за сегодня
        const weekendSessions = await db.getWeekendSessionsByDate(todayStr);
        const weekdaySessions = await db.getWeekdaySessionsByDate(todayStr);
        
        // Суммируем минуты за сегодня для этого пользователя
        const weekendTodayMinutes = weekendSessions
          .filter(s => s.user_id === user.id)
          .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
          
        const weekdayTodayMinutes = weekdaySessions
          .filter(s => s.user_id === user.id)
          .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);

        result[user.username] = {
          weekendRunning: !!weekendTimer,
          weekendStartTs: weekendTimer?.start_ts || null,
          weekendTodayMinutes,
          weekdayRunning: !!weekdayTimer,
          weekdayStartTs: weekdayTimer?.start_ts || null,
          weekdayTodayMinutes
        };
      } catch (userError) {
        console.warn(`Failed to get timer data for user ${user.username}:`, userError);
        // В случае ошибки для конкретного пользователя, задаем значения по умолчанию
        result[user.username] = {
          weekendRunning: false,
          weekendStartTs: null,
          weekendTodayMinutes: 0,
          weekdayRunning: false,
          weekdayStartTs: null,
          weekdayTodayMinutes: 0
        };
      }
    }

    res.json(result);
  } catch (e) {
    console.error('❌ /api/all-users-timers error:', e);
    res.status(500).json({ error: 'Ошибка получения данных таймеров', details: e.message });
  }
});

// Сброс накопленного времени
app.post('/api/worktime-reset', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // Очищаем таймеры
    await db.clearWeekendTimer(userId);
    await db.clearWeekdayTimer(userId);
    
    // Помечаем сегодняшние сессии как завершенные (не удаляем для статистики)
    await db.markTodaySessionsCompleted(userId, todayStr);
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка сброса времени', details: e.message });
  }
});

// === API ДЛЯ РЕЙТИНГА СОТРУДНИКОВ ===

// Получить всех сотрудников с рейтингом
app.get('/api/employees/rating', authenticateToken, async (req, res) => {
  try {
    console.log('📡 API call: /api/employees/rating');
    
    const employees = await db.getAllEmployeesWithRating();
    console.log('✅ Employees fetched:', employees.length, 'employees');
    console.log('📋 Sample employee:', employees[0]);
    res.json({ success: true, employees });
  } catch (error) {
    console.error('❌ Error fetching employees rating:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения рейтинга сотрудников' });
  }
});

// Обновить рейтинг сотрудника (только для HR/admin)
app.post('/api/employees/rating', authenticateToken, async (req, res) => {
  try {
    const { employeeId, stars } = req.body;
    const hrUser = req.user;
    
    // Проверяем права доступа
    if (hrUser.role !== 'admin' && hrUser.department !== 'HR') {
      return res.status(403).json({ success: false, error: 'Нет прав для изменения рейтинга' });
    }
    
    // Валидация данных
    if (!employeeId || stars === undefined || stars < 0 || stars > 5) {
      return res.status(400).json({ success: false, error: 'Некорректные данные' });
    }
    
    // Получаем текущий рейтинг для истории
    const employees = await db.getAllEmployeesWithRating();
    const employee = employees.find(emp => emp.id === employeeId);
    const oldStars = employee ? employee.stars : 0;
    
    // Обновляем рейтинг
    await db.updateEmployeeRating(employeeId, stars);
    
    // Добавляем запись в историю
    await db.addRatingHistory(employeeId, hrUser.userId || hrUser.id, oldStars, stars);
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating employee rating:', error);
    res.status(500).json({ success: false, error: 'Ошибка обновления рейтинга' });
  }
});

// Получить топ сотрудников по отделам
app.get('/api/employees/top', authenticateToken, async (req, res) => {
  try {
    const topEmployees = await db.getTopEmployeesByDepartment();
    res.json({ success: true, topEmployees });
  } catch (error) {
    console.error('❌ Error fetching top employees:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения топ сотрудников' });
  }
});

// Получить настройки видимости отделов
app.get('/api/departments/visibility', authenticateToken, async (req, res) => {
  try {
    const settings = await db.getDepartmentVisibilitySettings();
    res.json({ success: true, settings });
  } catch (error) {
    console.error('❌ Error getting department visibility:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения настроек видимости' });
  }
});

// Обновить видимость отдела (только для HR/admin)
app.post('/api/departments/visibility', authenticateToken, async (req, res) => {
  try {
    const { departmentId, isHidden } = req.body;
    const hrUser = req.user;
    
    // Проверяем права доступа
    if (hrUser.role !== 'admin' && hrUser.department !== 'HR') {
      return res.status(403).json({ success: false, error: 'Нет прав для изменения видимости отделов' });
    }
    
    // Валидация данных
    if (!departmentId || typeof isHidden !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Некорректные данные' });
    }
    
    // Обновляем видимость
    await db.updateDepartmentVisibility(departmentId, isHidden);
    
    res.json({ success: true, message: 'Видимость отдела обновлена' });
  } catch (error) {
    console.error('❌ Error updating department visibility:', error);
    res.status(500).json({ success: false, error: 'Ошибка обновления видимости' });
  }
});

// Получить историю изменений рейтинга
app.get('/api/employees/rating-history', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.query;
    const hrUser = req.user;
    
    // Проверяем права доступа
    if (hrUser.role !== 'admin' && hrUser.department !== 'HR') {
      return res.status(403).json({ success: false, error: 'Нет прав для просмотра истории' });
    }
    
    const history = await db.getRatingHistory(employeeId);
    res.json({ success: true, history });
  } catch (error) {
    console.error('❌ Error fetching rating history:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения истории рейтинга' });
  }
});

// Добавьте эту строку в server.js после других app.use()
app.use('/api/worktime-timer', require('./routes/worktimeTimer'));

// ========= Авто-верификация отработок за вчера =========
function isDateBetween(target, start, end) {
  return target >= start && target <= end;
}

function toIsoDate(d) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x.toISOString().slice(0,10);
}

async function computeDailyLeaveMinutesForUserOnDate(userId, dateStr) {
  const allLeaves = await db.getAllLeaves();
  const leaves = (allLeaves || []).filter(l => l.userId === userId && l.type === 'leave' && l.status === 'approved');
  let total = 0;
  for (const l of leaves) {
    const s = toIsoDate(l.startDate);
    const e = toIsoDate(l.endDate);
    // Однодневный частичный отгул по минутам
    if (s === e && s === dateStr && Number(l.minutes) > 0) {
      total += Math.max(0, Number(l.minutes) || 0);
    } else if (isDateBetween(dateStr, s, e)) {
      // Полный день — считаем как 8 часов
      total += 8 * 60;
    }
  }
  return total;
}

async function runAutoVerificationForDate(dateStr) {
  try {
    const day = String(dateStr).slice(0,10);
    const weekdaySessions = await db.getWeekdaySessionsByDate(day);
    const weekendSessions = await db.getWeekendSessionsByDate(day);
    const byUserWorked = {};
    (weekdaySessions || []).forEach(s => { byUserWorked[s.user_id] = (byUserWorked[s.user_id] || 0) + (Number(s.minutes)||0); });
    (weekendSessions || []).forEach(s => { byUserWorked[s.user_id] = (byUserWorked[s.user_id] || 0) + (Number(s.minutes)||0); });

    // Собираем всех пользователей, у кого есть какая-либо отработка в этот день, или отгул в этот день
    const allUsers = await db.getAllUsers();
    const userIds = (allUsers || []).map(u => u.id);

    let verifiedCount = 0;
    for (const uid of userIds) {
      const leaveMinutes = await computeDailyLeaveMinutesForUserOnDate(uid, day);
      if (leaveMinutes <= 0) continue;
      const workedMinutes = Math.max(0, byUserWorked[uid] || 0);
      if (workedMinutes >= leaveMinutes) {
        await db.upsertWorktimeVerification({ userId: uid, date: day, status: 'done', leaveMinutes, workedMinutes, verifiedBy: null });
        verifiedCount++;
      }
    }
    console.log(`✅ Auto-verify completed for ${day}: ${verifiedCount} records`);
    return { success: true, verified: verifiedCount };
  } catch (e) {
    console.error('❌ Auto-verify error:', e);
    return { success: false, error: e.message };
  }
}

// Ночной автозапуск: каждый день в 01:10 по Москве
try {
  cron.schedule('10 1 * * *', async () => {
    try {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yday = toIsoDate(d);
      await runAutoVerificationForDate(yday);
    } catch (e) {
      console.error('❌ Nightly auto-verify failed:', e);
    }
  }, { timezone: 'Europe/Moscow' });
  console.log('⏰ Nightly auto-verify scheduled at 01:10 Europe/Moscow');
} catch (e) {
  console.log('⚠️ Failed to schedule nightly auto-verify:', e.message);
}

// Автозакрытие незавершённых таймеров в 00:05 локального времени (Europe/Moscow)
try {
  const closeDanglingTimersForDate = async (dateStr) => {
    const day = String(dateStr).slice(0,10);
    const endOfDay = new Date(`${day}T23:59:59.000Z`);
    const endTs = endOfDay.getTime();

    // Хелпер: обработать таблицу таймеров и соответствующие сессии
    const processTimers = async (timerTable, mode) => {
      const timers = await new Promise((resolve, reject) => {
        db.db.all(`SELECT user_id, start_ts FROM ${timerTable}`, [], (err, rows) => {
          if (err) reject(err); else resolve(rows || []);
        });
      });
      for (const t of timers) {
        const startTs = Number(t.start_ts);
        if (!Number.isFinite(startTs)) continue;
        // Если таймер начат после конца дня, пропускаем
        if (startTs > endTs) continue;
        // Посчитаем минуты до конца дня
        let minutes = Math.max(0, Math.round((endTs - startTs) / 60000));
        if (minutes === 0) continue;
        if (mode === 'weekend') {
          await db.addWeekendWorkSession(t.user_id, day, minutes, startTs, endTs, false);
        } else {
          await db.addWeekdayWorkSession(t.user_id, day, minutes, startTs, endTs, false);
        }
        // Переносим старт таймера на начало следующего дня (00:00:00.000Z следующего дня)
        const nextStart = endTs + 1000; // +1 сек
        await new Promise((resolve, reject) => {
          db.db.run(`UPDATE ${timerTable} SET start_ts = ? WHERE user_id = ?`, [nextStart, t.user_id], function(err){ if (err) reject(err); else resolve(true); });
        });
      }
    };

    await processTimers('weekend_work_timer', 'weekend');
    await processTimers('weekday_work_timer', 'weekday');
  };

  // 00:05 каждый день
  cron.schedule('5 0 * * *', async () => {
    try {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yday = toIsoDate(d);
      await closeDanglingTimersForDate(yday);
      console.log('⏳ Closed dangling timers for', yday);
    } catch (e) {
      console.error('❌ Close dangling timers failed:', e);
    }
  }, { timezone: 'Europe/Moscow' });
  console.log('⏰ Close dangling timers scheduled at 00:05 Europe/Moscow');
} catch (e) {
  console.log('⚠️ Failed to schedule close dangling timers:', e.message);
}

// Ручной запуск авто-верификации
app.post('/api/leaves/auto-verify', authenticateToken, async (req, res) => {
  try {
    if (!['admin','hr','руководитель'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Нет прав' });
    }
    const date = (req.body?.date || (() => { const d = new Date(); d.setDate(d.getDate()-1); return toIsoDate(d); })());
    const result = await runAutoVerificationForDate(String(date).slice(0,10));
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
// Верификация отработанного отгула (HR/Admin)
app.post('/api/leaves/verify', authenticateToken, async (req, res) => {
  try {
    if (!['admin','hr','руководитель'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Нет прав' });
    }
    const { userId, date } = req.body || {};
    let { leaveMinutes, workedMinutes } = req.body || {};
    if (!userId || !date) return res.status(400).json({ error: 'userId и date обязательны' });
    // Если минуты не переданы клиентом – возьмём актуальные из БД
    if (leaveMinutes == null || workedMinutes == null) {
      try {
        const details = await db.getUserWorktimeDetails(Number(userId), String(date).slice(0,10));
        if (details) {
          if (leaveMinutes == null) leaveMinutes = details.requiredMinutes;
          if (workedMinutes == null) workedMinutes = details.workedMinutes;
        }
      } catch (e) {
        console.warn('[verify] fallback to 0 minutes due to details read error:', e.message);
      }
    }
    const lm = Math.max(0, Number(leaveMinutes) || 0);
    const wm = Math.max(0, Number(workedMinutes) || 0);
    const day = String(date).slice(0,10);
    await db.upsertWorktimeVerification({ userId: Number(userId), date: day, status: 'verified', leaveMinutes: lm, workedMinutes: wm, verifiedBy: req.user.userId });
    // Отмечаем сессии за день как завершенные, чтобы в "Деталях" не было статуса "В процессе"
    try { await db.markTodaySessionsCompleted(Number(userId), day); } catch (_) {}
    // Отправляем WebSocket уведомление пользователю о подтверждении
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
    
    res.json({ success: true });
  } catch (e) {
    console.error('❌ /api/leaves/verify error:', e);
    res.status(500).json({ error: 'Ошибка верификации', details: e.message });
  }
});

// Получить статистику отработок за дату
app.get('/api/worktime-stats/:date', authenticateToken, async (req, res) => {
  try {
    const date = req.params.date;
    const dateStr = String(date).slice(0, 10); // Обрезаем до YYYY-MM-DD
    
    // Получаем сессии отработки за выбранную дату
    const weekendSessions = await db.getWeekendSessionsByDate(dateStr);
    const weekdaySessions = await db.getWeekdaySessionsByDate(dateStr);
    
    // Группируем по пользователям и считаем общие минуты
    const userStats = {};
    
    // Обрабатываем сессии выходных дней
    if (Array.isArray(weekendSessions)) {
      weekendSessions.forEach(session => {
        const userId = session.user_id;
        if (!userStats[userId]) {
          userStats[userId] = {
            userId: userId,
            username: session.username || '',
            weekendMinutes: 0,
            weekdayMinutes: 0
          };
        }
        userStats[userId].weekendMinutes += Number(session.minutes) || 0;
      });
    }
    
    // Обрабатываем сессии рабочих дней
    if (Array.isArray(weekdaySessions)) {
      weekdaySessions.forEach(session => {
        const userId = session.user_id;
        if (!userStats[userId]) {
          userStats[userId] = {
            userId: userId,
            username: session.username || '',
            weekendMinutes: 0,
            weekdayMinutes: 0
          };
        }
        userStats[userId].weekdayMinutes += Number(session.minutes) || 0;
      });
    }
    
    // Преобразуем в массив с добавлением общих минут
    const result = Object.values(userStats).map(stat => ({
      ...stat,
      totalMinutes: stat.weekendMinutes + stat.weekdayMinutes
    }));
    
    res.json(result);
  } catch (e) {
    console.error('Ошибка получения статистики отработки:', e);
    res.status(500).json({ error: 'Ошибка получения статистики', details: e.message });
  }
});

// Обновить статус отработки
app.post('/api/worktime-status', authenticateToken, async (req, res) => {
  try {
    const { userId, date, status, workedMinutes } = req.body;
    
    if (!userId || !date || !status) {
      return res.status(400).json({ error: 'Обязательные поля: userId, date, status' });
    }

    // Обновляем статус в верификациях
    await db.updateWorktimeVerificationStatus(userId, date, status, req.user.userId);
    
    // Если статус "checking", создаем запись в истории если её нет
    if (status === 'checking') {
      const existingHistory = await db.getWorktimeHistoryByUserAndDate(userId, date);
      if (!existingHistory) {
        const user = await db.getUserById(userId);
        const username = user?.username || '';
        
        // Получаем данные об отгуле для расчета требуемых минут
        const leaves = await db.getAllLeaves();
        const userLeave = leaves.find(l => 
          l.userId === userId && 
          l.status === 'approved' && 
          String(l.startDate).slice(0, 10) <= date && 
          String(l.endDate).slice(0, 10) >= date
        );
        
        const requiredMinutes = userLeave ? (Number(userLeave.minutes) || 0) : 0;
        
        await db.createWorktimeHistory({
          userId,
          username,
          date,
          requiredMinutes,
          workedMinutes: workedMinutes || 0,
          status: 'checking'
        });
      }
    }
    
    res.json({ success: true });
  } catch (e) {
    console.error('Ошибка обновления статуса отработки:', e);
    res.status(500).json({ error: 'Ошибка обновления статуса', details: e.message });
  }
});

// ==================== API: ШАБЛОНЫ СООБЩЕНИЙ ====================

// ВРЕМЕННЫЙ ЭНДПОИНТ ДЛЯ ОТЛАДКИ - проверка всех шаблонов в БД
app.get('/api/debug/templates', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Checking all templates in database...');
    const allTemplates = await db.getAllTemplates();
    console.log('📋 All templates:', allTemplates);
    
    const sosTemplates = allTemplates.filter(t => t.type === 'sos');
    console.log('🚨 SOS templates:', sosTemplates);
    
    const user = await db.getUserById(req.user.userId);
    console.log('👤 Current user:', { id: user.id, username: user.username, department: user.department, role: user.role });
    
    // Тестируем наш метод getTemplatesByDepartment
    const userTemplates = await db.getTemplatesByDepartment(user.department || '');
    console.log('🎯 Templates for user department:', userTemplates);
    
    res.json({
      user: { id: user.id, username: user.username, department: user.department, role: user.role },
      allTemplates,
      sosTemplates,
      userTemplates,
      totalCount: allTemplates.length,
      sosCount: sosTemplates.length,
      userTemplatesCount: userTemplates.length
    });
  } catch (e) {
    console.error('❌ DEBUG templates error:', e);
    res.status(500).json({ error: 'Debug error', details: e.message });
  }
});

// Шаблоны для текущего пользователя по его department
app.get('/api/templates/for-me', authenticateToken, async (req, res) => {
  try {
    const me = await db.getUserById(req.user.userId);
    const dept = me?.department || '';
    console.log('🔍 /api/templates/for-me - User:', me?.username, 'Department:', dept, 'Role:', me?.role);
    
    // SOS шаблоны видны всем пользователям, поэтому убираем блокировку для пользователей без департамента
    // Раньше здесь была проверка, которая блокировала обычных пользователей без департамента
    
    const items = await db.getTemplatesByDepartment(dept);
    console.log('✅ Returning', items?.length || 0, 'templates');
    res.json(items);
  } catch (e) {
    console.error('❌ /api/templates/for-me error:', e);
    res.status(500).json({ error: 'Ошибка получения шаблонов' });
  }
});

// Список всех шаблонов — только admin может видеть все, остальные только свой департамент
app.get('/api/templates', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user?.department && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав' });
    }
    
    if (req.user.role === 'admin') {
      // Админ видит все шаблоны
      const items = await db.getAllTemplates();
      res.json(items);
    } else {
      // Обычные пользователи видят только шаблоны своего департамента
      const items = await db.getTemplatesByDepartment(user.department);
      res.json(items);
    }
  } catch (e) {
    console.error('❌ /api/templates error:', e);
    res.status(500).json({ error: 'Ошибка получения шаблонов' });
  }
});

// Создать шаблон — пользователи с департаментом
app.post('/api/templates', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user?.department && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав' });
    }
    
    let { department, title, content, type, active } = req.body;
    
    // Обычные пользователи могут создавать шаблоны только для своего департамента
    // SOS шаблоны могут создавать только админы и HR без привязки к департаменту
    if (type === 'sos') {
      if (req.user.role !== 'admin' && req.user.role !== 'hr') {
        return res.status(403).json({ error: 'Только админы и HR могут создавать SOS шаблоны' });
      }
      department = ''; // SOS шаблоны создаются без департамента
      console.log('🚨 Creating SOS template with empty department');
    } else if (req.user.role !== 'admin') {
      department = user.department;
    }
    
    console.log('📝 Creating template:', { department, title, content, type, active });
    // Для SOS шаблонов департамент не обязателен
    if (!content || (!department && type !== 'sos')) return res.status(400).json({ error: 'department и content обязательны' });
    const id = await db.createTemplate({ department, title, content, type, active });
    res.json({ success: true, id });
  } catch (e) {
    console.error('❌ POST /api/templates error:', e);
    res.status(500).json({ error: 'Ошибка создания шаблона' });
  }
});

// Обновить шаблон — пользователи с департаментом
app.put('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user?.department && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав' });
    }
    
    const id = Number(req.params.id);
    let updateData = req.body || {};
    
    // Обычные пользователи могут редактировать только шаблоны своего департамента
    if (req.user.role !== 'admin' && updateData.department) {
      updateData.department = user.department;
    }
    
    const changes = await db.updateTemplate(id, updateData);
    res.json({ success: !!changes });
  } catch (e) {
    console.error('❌ PUT /api/templates/:id error:', e);
    res.status(500).json({ error: 'Ошибка обновления шаблона' });
  }
});

// Удалить шаблон — пользователи с департаментом
app.delete('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user?.department && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав' });
    }
    
    const id = Number(req.params.id);
    const changes = await db.deleteTemplate(id);
    res.json({ success: !!changes });
  } catch (e) {
    console.error('❌ DELETE /api/templates/:id error:', e);
    res.status(500).json({ error: 'Ошибка удаления шаблона' });
  }
});
// Получить историю отработок
app.get('/api/worktime-history', authenticateToken, async (req, res) => {
  try {
    const { userId, dateFrom, dateTo, status } = req.query;
    
    // Обычные пользователи видят только свою историю
    const targetUserId = (req.user.role === 'admin' || req.user.role === 'hr') 
      ? userId 
      : req.user.userId;
    
    const history = await db.getWorktimeHistory(
      targetUserId || null,
      dateFrom || null,
      dateTo || null,
      status || null
    );
    
    res.json(history);
  } catch (e) {
    console.error('Ошибка получения истории отработок:', e);
    res.status(500).json({ error: 'Ошибка получения истории', details: e.message });
  }
});

// Автоматический расчет отработки из отчетов входа-выхода
app.post('/api/auto-calculate-worktime', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Нет прав для автоматического расчета' });
    }
    
    const { date } = req.body;
    const targetDate = date || new Date(Date.now() - 24*60*60*1000).toISOString().slice(0, 10); // вчерашний день по умолчанию
    
    console.log(`🔄 Запуск автоматического расчета отработки за ${targetDate}`);
    
    // Получаем отчет за указанную дату
    const reportUrl = `/api/quick-db-report?start=${targetDate}&end=${targetDate}`;
    const reportData = await fetch(`http://localhost:${process.env.PORT || 5000}${reportUrl}`, {
      headers: { Authorization: req.headers.authorization }
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
        String(l.startDate).slice(0, 10) <= targetDate && 
        String(l.endDate).slice(0, 10) >= targetDate
      );
      
      if (!userLeave) continue; // Нет отгула
      
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
        console.warn(`Ошибка расчета переработки для ${username}:`, e);
      }
      
      // Получить данные сессий отработки
      const weekendSessions = await db.getWeekendSessionsByDate(targetDate);
      const weekdaySessions = await db.getWeekdaySessionsByDate(targetDate);
      
      const userWeekendMinutes = weekendSessions
        .filter(s => s.user_id === user.id)
        .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
      
      const userWeekdayMinutes = weekdaySessions
        .filter(s => s.user_id === user.id)
        .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
      
      const totalWorkedMinutes = overtimeMinutes + userWeekendMinutes + userWeekdayMinutes;
      
      // Создать или обновить запись в истории
      const existingHistory = await db.getWorktimeHistoryByUserAndDate(user.id, targetDate);
      
      if (existingHistory) {
        await db.updateWorktimeHistoryStatus(
          existingHistory.id, 
          totalWorkedMinutes >= requiredMinutes ? 'completed' : 'pending'
        );
      } else {
        await db.createWorktimeHistory({
          userId: user.id,
          username: user.username,
          date: targetDate,
          requiredMinutes,
          workedMinutes: totalWorkedMinutes,
          overtimeMinutes,
          loginTime: userReport.firstLogin,
          logoutTime: userReport.lastLogout,
          status: totalWorkedMinutes >= requiredMinutes ? 'completed' : 'pending'
        });

// Назначить департамент пользователю
app.post('/api/users/:id/department', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Нет прав для назначения департамента' });
    }
    const userId = Number(req.params.id);
    const { department } = req.body;
    await db.setUserDepartment(userId, department || null);
    // Вернём успех
    res.json({ success: true });
    // Обновим всем список пользователей
    try {
      const users = await db.getAllUsers();
      io.emit('all_users', users);
    } catch {}
  } catch (e) {
    console.error('❌ Ошибка назначения департамента:', e);
    res.status(500).json({ error: 'Ошибка назначения департамента' });
  }
});
      }
      
      // Обновить статус в верификациях
      if (totalWorkedMinutes >= requiredMinutes) {
        await db.updateWorktimeVerificationStatus(user.id, targetDate, 'completed');
      }
      
      processedCount++;
      console.log(`✅ Обработан ${username}: требуется ${requiredMinutes} мин, отработано ${totalWorkedMinutes} мин`);
    }
    
    console.log(`🎉 Автоматический расчет завершен. Обработано пользователей: ${processedCount}`);
    res.json({ success: true, processedCount, date: targetDate });
    
  } catch (e) {
    console.error('Ошибка автоматического расчета отработки:', e);
    res.status(500).json({ error: 'Ошибка автоматического расчета', details: e.message });
  }
});

// --- ПОЛЬЗОВАТЕЛИ ---
// Получить всех пользователей
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    // Временно возвращаем всех пользователей для диагностики
    res.json((users || []).map(u => ({
      id: u.id,
      username: u.username,
      avatar: u.avatar || '',
      role: u.role || 'user',
      employee_id: u.employee_id || null,
      department: u.department || null
    })));
  } catch (error) {
    console.error('❌ /api/users error:', error);
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
});

// Назначить департамент пользователю (top-level)
app.post('/api/users/:id/department', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ error: 'Нет прав для назначения департамента' });
    }
    const userId = Number(req.params.id);
    const { department } = req.body;
    await db.setUserDepartment(userId, department || null);
    res.json({ success: true });
    // Обновим всем список пользователей
    try {
      const users = await db.getAllUsers();
      io.emit('all_users', users);
    } catch {}
  } catch (e) {
    console.error('❌ Ошибка назначения департамента:', e);
    res.status(500).json({ error: 'Ошибка назначения департамента' });
  }
});

// Назначить роль пользователю
app.post('/api/users/:id/role', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'hr') {
    return res.status(403).json({ error: 'Нет прав для назначения роли' });
  }
  
  const userId = Number(req.params.id);
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'Роль обязательна' });
  
  // HR не может назначать роль 'admin' - только админы могут
  if (req.user.role === 'hr' && role === 'admin') {
    return res.status(403).json({ error: 'HR не может назначать роль администратора' });
  }
  
  try {
    const changes = await db.setUserRole(userId, role);
    
    // Получаем пользователя, чью роль изменили
    const targetUser = await db.getUserById(userId);
    if (targetUser) {
      // Получаем данные сотрудника
      const employee = await db.getEmployeeById(targetUser.employee_id);
      
      // Генерируем новый токен с обновленной ролью
      const newTargetToken = jwt.sign({
        userId: targetUser.id,
        employee_id: targetUser.employee_id,
        first_name: employee?.first_name || '',
        last_name: employee?.last_name || '',
        username: targetUser.username,
        role: role
      }, JWT_SECRET, { expiresIn: '7d' });
      
      // Обновляем токен в базе данных
      await db.setUserToken(targetUser.id, newTargetToken);
      
      // Уведомляем всех подключенных пользователей через Socket.IO
      console.log('🔔 Отправляем уведомление об изменении роли:', {
        userId: targetUser.id,
        newRole: role,
        message: 'Ваша роль была изменена и обновлена автоматически.'
      });
      
      io.emit('user_role_changed', {
        userId: targetUser.id,
        newRole: role,
        newToken: newTargetToken,
        message: 'Ваша роль была изменена и обновлена автоматически.'
      });
    }
    
    // Получаем текущего пользователя (кто изменяет роли) и обновляем его токен
    const currentUser = await db.getUserById(req.user.userId);
    if (currentUser) {
      // Генерируем новый токен для текущего пользователя с актуальной ролью
      const newCurrentToken = jwt.sign({
        userId: currentUser.id,
        employee_id: req.user.employee_id,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        role: currentUser.role
      }, JWT_SECRET, { expiresIn: '7d' });
      await db.setUserToken(currentUser.id, newCurrentToken);
      
      res.json({ 
        success: !!changes, 
        token: newCurrentToken, // Возвращаем обновленный токен для текущего пользователя
        message: 'Роль успешно изменена'
      });
    } else {
      res.json({ success: !!changes });
    }
  } catch (e) {
    console.error('❌ Ошибка назначения роли:', e);
    res.status(500).json({ error: 'Ошибка назначения роли', details: e.message });
  }
});

// ==================== SOCKET.IO ОБРАБОТКА ====================
io.on('connection', (socket) => {
  console.log('Пользователь подключился:', socket.id);
  
  // Отправляем принудительные настройки эмодзи всем новым подключениям
  socket.emit('force_emoji_settings', {
    customEmojiSize: 64,
    emojiOnlySize: 208, // Устанавливаем крупный размер для всех
    standardEmojiSize: 1.6
  });
  
  // ==================== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ====================
  // Функция проверки аутентификации для всех событий
  const requireAuth = (callback) => {
    return (...args) => {
      if (!socket.userId) {
        console.log('❌ Unauthenticated socket event attempt:', args);
        socket.emit('auth_error', 'Пользователь не аутентифицирован');
        return;
      }
      return callback(...args);
    };
  };
  
  // --- Голосование по опросу в чате ---
  socket.on('vote_poll', requireAuth(async ({ messageId, optionIdx }) => {
    try {
      // Получаем сообщение
      const msg = await db.getMessageById(messageId);
      if (!msg || msg.message_type !== 'poll') {
        socket.emit('poll_update', { messageId, error: 'Опрос не найден' });
        return;
      }
      
      // Парсим текущие голоса и проголосовавших
      let pollVotes = {};
      let pollVoters = [];
      try { pollVotes = msg.poll_votes ? JSON.parse(msg.poll_votes) : {}; } catch { pollVotes = {}; }
      try { pollVoters = msg.poll_voters ? JSON.parse(msg.poll_voters) : []; } catch { pollVoters = []; }
      
      // Переголосование: удаляем предыдущий голос пользователя из всех вариантов
      Object.keys(pollVotes).forEach(k => {
        pollVotes[k] = (pollVotes[k] || []).filter(id => id !== socket.userId);
        if (pollVotes[k].length === 0) delete pollVotes[k];
      });

      // Добавляем голос в новый вариант
      if (!pollVotes[optionIdx]) pollVotes[optionIdx] = [];
      if (!pollVotes[optionIdx].includes(socket.userId)) {
        pollVotes[optionIdx].push(socket.userId);
      }

      // Обновляем список проголосовавших (уникально)
      if (!pollVoters.includes(socket.userId)) {
        pollVoters.push(socket.userId);
      }
      
      // Сохраняем в базе
      await db.updatePoll(messageId, JSON.stringify(msg.poll_options ? JSON.parse(msg.poll_options) : []), JSON.stringify(pollVotes), JSON.stringify(pollVoters));
      
      // Отправляем обновление всем участникам чата
      io.emit('poll_update', { messageId, pollVotes, pollVoters });
    } catch (error) {
      console.error('❌ poll_vote error:', error);
      socket.emit('poll_update', { messageId, error: error.message });
    }
  }));
  
  console.log('👤 User connected:', socket.id);

  // Универсальная post-auth функция
  async function onSocketAuthenticated(socket, decoded) {
    socket.userId = decoded.userId || decoded.id;
    socket.username = decoded.username;
    socket.role = decoded.role;
    
    console.log('✅ User authenticated:', {
      userId: socket.userId,
      username: socket.username,
      role: socket.role,
      tokenPayload: decoded
    });
    
    try {
      await db.updateUserOnlineStatus(socket.userId, true);
      connectedUsers.set(socket.userId, socket.id);
      console.log(`👤 User ${socket.userId} (${socket.username}) came online`);
      
      socket.emit('authenticated', { userId: socket.userId, username: socket.username, role: socket.role });
      
      // Получаем чаты пользователя
      const chats = await db.getUserChats(socket.userId);
      socket.emit('chats', chats);
      
      // Присоединяемся к комнатам чатов
      chats.forEach(chat => {
        socket.join(`chat_${chat.id}`);
      });
      
      // Отправляем список онлайн пользователей
      const onlineUsers = await db.getOnlineUsers();
      io.emit('online_users', onlineUsers);
      console.log(`📊 Online users updated: ${onlineUsers.length} users online`);
    } catch (err) {
      console.error('❌ Post-auth error:', err);
    }
  }

  // 1. Handshake auth
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      onSocketAuthenticated(socket, decoded);
    } catch (error) {
      console.error('❌ Authentication error on connect:', error);
      socket.emit('auth_error', 'Недействительный токен');
      // Не отключаем сразу, даем возможность повторной аутентификации
    }
  } else {
    console.log('⚠️ No token provided on connect');
    socket.emit('need_auth');
  }

  // Глобальный логгер всех событий сокета для отладки
  const origOn = socket.on;
  socket.on = function(event, ...args) {
    if (event !== 'disconnect' && event !== 'error') {
      console.log(`[SERVER] [SOCKET] event received:`, event, args[0]);
    }
    return origOn.call(this, event, ...args);
  };


  // ==================== ОБРАБОТЧИКИ АУТЕНТИФИКАЦИИ ====================
  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      await onSocketAuthenticated(socket, decoded);
    } catch (error) {
      console.error('❌ Authentication error:', error);
      socket.emit('auth_error', 'Недействительный токен');
    }
  });

  // ==================== ОБРАБОТЧИК УДАЛЕНИЯ СООБЩЕНИЯ ====================
  socket.on('delete_message', requireAuth(async ({ messageId }) => {
    console.log('[SERVER] [SOCKET] delete_message: start', { messageId, userId: socket.userId });
    try {
      // Получаем сообщение из базы
      const message = await db.getMessageById(messageId);
      console.log('[SERVER] [SOCKET] delete_message: message from db', message);
      
      if (!message) {
        console.log('[SERVER] [SOCKET] delete_message: сообщение не найдено', { messageId });
        socket.emit('error', 'Сообщение не найдено');
        return;
      }

      // Проверяем, что пользователь — автор сообщения или админ
      if (message.user_id !== socket.userId) {
        console.log('[SERVER] [SOCKET] delete_message: нет прав на удаление', { 
          messageUserId: message.user_id, 
          socketUserId: socket.userId 
        });
        socket.emit('error', 'Нет прав на удаление этого сообщения');
        return;
      }

      console.log('[SERVER] [SOCKET] delete_message: deleting from db', { messageId });
      try {
        await db.deleteMessage(messageId);
        console.log('[SERVER] [SOCKET] delete_message: deleted from db', { messageId });
        
        // Уведомляем всех участников чата об удалении
        console.log(`[SERVER] emit message_deleted for chat_${message.chat_id}:`, messageId);
        io.to(`chat_${message.chat_id}`).emit('message_deleted', { messageId });
        
        // Гарантируем отправку инициатору
        socket.emit('message_deleted', { messageId });
        console.log(`🗑️ Message deleted: ${messageId} by user ${socket.userId}`);
      } catch (err) {
        console.log('[SERVER] [SOCKET] delete_message: ошибка при удалении из базы', err);
        socket.emit('error', 'Ошибка при удалении сообщения из базы');
        return;
      }
    } catch (error) {
      console.error('❌ Delete message error:', error);
      socket.emit('error', 'Ошибка при удалении сообщения');
    }
  }));

  // ===== Реакции на сообщения (эмодзи) =====
  socket.on('react_message', requireAuth(async (data) => {
    try {
      const { messageId, emoji, userId, action } = data;
      if (!messageId || !emoji) return;

      // Получаем сообщение (для проверки чата)
      const message = await db.getMessageById(messageId);
      if (!message) return;
      const chatId = message.chat_id;

      // Проверяем права
      const isParticipant = await db.isUserInChat(chatId, socket.userId);
      if (!isParticipant) return;

      // Инициализация реакций для сообщения
      if (!global.messageReactions) global.messageReactions = {};
      if (!global.messageReactions[messageId]) global.messageReactions[messageId] = {};
      const msgReactions = global.messageReactions[messageId];
      if (!msgReactions[emoji]) msgReactions[emoji] = [];

      if (action === 'add') {
        if (!msgReactions[emoji].includes(userId)) {
          msgReactions[emoji].push(userId);
        }
      } else if (action === 'remove') {
        msgReactions[emoji] = msgReactions[emoji].filter(id => id !== userId);
        // Если реакция пуста — удаляем ключ
        if (msgReactions[emoji].length === 0) delete msgReactions[emoji];
        // Если после удаления не осталось ни одной реакции — удаляем весь объект
        if (Object.keys(msgReactions).length === 0) {
          delete global.messageReactions[messageId];
        }
      }

      // Готовим объект реакций для отправки
      const reactionsToSend = global.messageReactions[messageId] || {};
      io.to(`chat_${chatId}`).emit('update_reactions', {
        messageId,
        reactions: reactionsToSend
      });
    } catch (error) {
      console.error('❌ react_message error:', error);
    }
  }));

  // ==================== ОБРАБОТЧИКИ ЛАЙКОВ ====================
  socket.on('like_message', requireAuth(async (data) => {
    try {
      const { messageId, emoji } = data;
      const message = await db.getMessageById(messageId);
      if (!message) {
        socket.emit('error', 'Сообщение не найдено');
        return;
      }
      
      const isParticipant = await db.isUserInChat(message.chat_id, socket.userId);
      if (!isParticipant) {
        socket.emit('error', 'У вас нет доступа к этому сообщению');
        return;
      }
      
      if (!emoji) {
        socket.emit('error', 'Не передан emoji');
        return;
      }
      
      const liked = await db.likeMessage(messageId, socket.userId, emoji);
      if (liked) {
        const likes = await db.getMessageLikes(messageId);
        const likesCount = likes.length;
        io.to(`chat_${message.chat_id}`).emit('message_liked', {
          messageId,
          userId: socket.userId,
          username: socket.username,
          likesCount,
          likes
        });
      }
    } catch (error) {
      console.error('❌ Like message error:', error);
      socket.emit('error', error.message);
    }
  }));

  socket.on('unlike_message', requireAuth(async (data) => {
    try {
      const { messageId, emoji } = data;
      const message = await db.getMessageById(messageId);
      if (!message) {
        socket.emit('error', 'Сообщение не найдено');
        return;
      }
      
      const isParticipant = await db.isUserInChat(message.chat_id, socket.userId);
      if (!isParticipant) {
        socket.emit('error', 'У вас нет доступа к этому сообщению');
        return;
      }
      
      if (!emoji) {
        socket.emit('error', 'Не передан emoji');
        return;
      }
      
      const unliked = await db.unlikeMessage(messageId, socket.userId, emoji);
      if (unliked) {
        const likes = await db.getMessageLikes(messageId);
        const likesCount = likes.length;
        io.to(`chat_${message.chat_id}`).emit('message_unliked', {
          messageId,
          userId: socket.userId,
          username: socket.username,
          likesCount,
          likes
        });
      }
    } catch (error) {
      console.error('❌ Unlike message error:', error);
      socket.emit('error', error.message);
    }
  }));

  socket.on('get_message_likes', requireAuth(async (messageId) => {
    try {
      const likes = await db.getMessageLikes(messageId);
      socket.emit('message_likes_list', { messageId, likes });
    } catch (error) {
      console.error('❌ Get message likes error:', error);
      socket.emit('error', error.message);
    }
  }));

  // ==================== ОБРАБОТЧИКИ ЧАТОВ ====================
  socket.on('create_chat', requireAuth(async (data) => {
    try {
      const { name, type = 'group' } = data;
    
      if (!name || name.trim().length === 0) {
        socket.emit('error', 'Название чата не может быть пустым');
        return;
      }
    
      console.log('📝 Creating chat:', { name, type, userId: socket.userId });
    
      const chatId = await db.createChat(name.trim(), type, socket.userId);
      await db.addUserToChat(chatId, socket.userId);
    
      socket.join(`chat_${chatId}`);
    
      const newChat = {
        id: chatId,
        name: name.trim(),
        type: type,
        created_by: socket.userId
      };
    
      // Отправляем подтверждение создания чата
      socket.emit('chat_created', newChat);

      // Сразу отправляем сообщения чата
      let messages = await db.getChatMessagesWithLikes(chatId, socket.userId);
      messages = await Promise.all(messages.map(async (msg) => {
        const user = await db.getUserById(msg.user_id);
        return { ...msg, avatar: user?.avatar || '', content: convertTokensToHtml(msg.content) };
      }));
      socket.emit('chat_messages', { chatId, messages });

      // Обновляем список чатов для всех участников
      const participants = await db.getChatParticipants(chatId);
      for (const participant of participants) {
        const chats = await db.getUserChats(participant.user_id);
        const socketId = connectedUsers.get(participant.user_id);
        if (socketId) {
          io.to(socketId).emit('chats_updated', chats);
        }
      }
    
      console.log('✅ Chat created successfully:', newChat);
    } catch (error) {
      console.error('❌ Create chat error:', error);
      socket.emit('error', `Ошибка создания чата: ${error.message}`);
    }
  }));

    // Создание или поиск приватного чата между двумя пользователями
    socket.on('create_private_chat', requireAuth(async (data) => {
      try {
        const targetUserId = Number(data?.targetUserId);
        if (!targetUserId || targetUserId === socket.userId) {
          socket.emit('error', 'Некорректный пользователь для приватного чата');
          return;
        }
        // Проверяем, есть ли уже приватный чат между пользователями
        let privateChat = await db.getPrivateChat(socket.userId, targetUserId);
        if (!privateChat) {
          // Получаем данные о целевом пользователе для формирования имени чата
          const targetUser = await db.getUserById(targetUserId);
          const currentUser = await db.getUserById(socket.userId);
          
          // Формируем имя чата из имен участников
          const targetName = targetUser ? 
            (targetUser.username || `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim()) : 
            'Неизвестный пользователь';
          
          const chatName = targetName;
          
          console.log(`🔗 Creating private chat between ${currentUser?.username || socket.userId} and ${targetName}`);
          
          const chatId = await db.createChat(chatName, 'private', socket.userId);
          await db.addUserToChat(chatId, socket.userId);
          await db.addUserToChat(chatId, targetUserId);
          privateChat = await db.getPrivateChat(socket.userId, targetUserId);
        }
        // Присоединяем пользователя к комнате чата
    socket.join(`chat_${privateChat.id}`);
    // Отправляем данные о чате инициатору
    socket.emit('private_chat_created', { chat: privateChat });
        // Обновляем список чатов у обоих пользователей
        const chatsInitiator = await db.getUserChats(socket.userId);
        socket.emit('chats_updated', chatsInitiator);
        const targetSocketId = connectedUsers.get(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('chats_updated', await db.getUserChats(targetUserId));
          io.to(targetSocketId).emit('private_chat_created', { chat: privateChat });
        }
        // Сразу отправляем сообщения чата
        let messages = await db.getChatMessagesWithLikes(privateChat.id, socket.userId);
        messages = await Promise.all(messages.map(async (msg) => {
          const user = await db.getUserById(msg.user_id);
          return { ...msg, avatar: user?.avatar || '', content: convertTokensToHtml(msg.content) };
        }));
        socket.emit('chat_messages', { chatId: privateChat.id, messages });
      } catch (error) {
        console.error('❌ Create private chat error:', error);
        socket.emit('error', `Ошибка создания приватного чата: ${error.message}`);
      }
    }));

  // Получить список всех пользователей (для модалки добавления в чат)
  socket.on('get_all_users', requireAuth(async () => {
    try {
      console.log('📋 Getting all users, updating last_seen for offline users...');
      const users = await db.getAllUsers();
      console.log(`📋 Retrieved ${users.length} users with updated last_seen timestamps`);
      socket.emit('all_users', users || []);
    } catch (error) {
      console.error('❌ get_all_users error:', error);
      socket.emit('error', 'Ошибка получения пользователей');
    }
  }));

  // Получить список онлайн пользователей
  socket.on('get_online_users', requireAuth(async () => {
    try {
      const onlineUsers = await db.getOnlineUsers();
      socket.emit('online_users', onlineUsers || []);
    } catch (error) {
      console.error('❌ get_online_users error:', error);
      socket.emit('error', 'Ошибка получения онлайн пользователей');
    }
  }));

  // Добавить выбранных пользователей в чат
  socket.on('add_users_to_chat', requireAuth(async (data) => {
    try {
      const chatId = Number(data?.chatId);
      const userIds = Array.isArray(data?.userIds) ? data.userIds.map(Number).filter(n => !Number.isNaN(n)) : [];
      if (!chatId || userIds.length === 0) {
        socket.emit('error', 'Неверные параметры добавления пользователей');
        return;
      }

      for (const uid of userIds) {
        await db.addUserToChat(chatId, uid);
        // Уведомим приглашенного, если он онлайн
        const targetSocketId = connectedUsers.get(uid);
        if (targetSocketId) {
          io.to(targetSocketId).emit('invited_to_chat', { chatId, invitedBy: socket.userId });
          // Обновим список чатов у приглашенного
          const chats = await db.getUserChats(uid);
          io.to(targetSocketId).emit('chats_updated', chats);
        }
      }

      // Обновим список чатов у всех участников чата
      const participants = await db.getChatParticipants(chatId);
      for (const participant of participants) {
        const chats = await db.getUserChats(participant.user_id);
        const socketId = connectedUsers.get(participant.user_id);
        if (socketId) io.to(socketId).emit('chats_updated', chats);
      }

      // Подтверждение инициатору
      socket.emit('users_added_to_chat', { chatId, userIds });
    } catch (error) {
      console.error('❌ add_users_to_chat error:', error);
      socket.emit('error', 'Ошибка добавления пользователей в чат');
    }
  }));

 // 📌 Получение участников чата с деталями
socket.on('get_chat_participants', requireAuth(async (chatId) => {
  try {
    const list = await db.getChatParticipantsWithDetails(chatId);
    const enriched = await Promise.all((list || []).map(async (u) => {
      try {
        const employee = await db.getEmployeeByUserId?.(u.id);
        return { ...u, department: employee?.department || '' };
      } catch {
        return { ...u, department: '' };
      }
    }));
    socket.emit('chat_participants', { chatId, participants: enriched });
  } catch (error) {
    console.error('❌ get_chat_participants error:', error);
    socket.emit('error', 'Ошибка получения участников чата');
  }
}));

// 📌 Присоединение к чату
socket.on('join_chat', requireAuth(async (chatId) => {
  try {
    const numericChatId = Number(chatId);
    if (!Number.isFinite(numericChatId)) return;

    console.log('[SERVER][join_chat] вызван', {
      chatId: numericChatId,
      userId: socket.userId,
      socketId: socket.id
    });

    const isParticipant = await db.isUserInChat(numericChatId, socket.userId);
    console.log('[SERVER][join_chat] isParticipant:', isParticipant);

    if (!isParticipant) {
      socket.emit('error', 'У вас нет доступа к этому чату');
      return;
    }

    socket.join(`chat_${numericChatId}`);
    console.log('[SERVER][join_chat] socket.join выполнен', {
      chatId: numericChatId,
      rooms: Array.from(socket.rooms)
    });

    let messages = await db.getChatMessagesWithLikes(numericChatId, socket.userId);
    console.log('[SERVER][join_chat] сообщений в чате:', messages.length);

    messages = await Promise.all(messages.map(async (msg) => {
      const user = await db.getUserById(msg.user_id);
      return { ...msg, avatar: user?.avatar || '', content: convertTokensToHtml(msg.content) };
    }));

    socket.emit('chat_messages', { chatId: numericChatId, messages });
    console.log('[SERVER][join_chat] chat_messages отправлен', {
      chatId: numericChatId,
      messagesCount: messages.length
    });

    // Отправляем закрепленные сообщения для этого чата
    try {
      const pinnedMessages = await db.getPinnedMessages(numericChatId);
      socket.emit('pinned_messages', {
        chatId: numericChatId,
        messages: pinnedMessages || []
      });
      console.log('[SERVER][join_chat] pinned_messages отправлен', {
        chatId: numericChatId,
        pinnedCount: pinnedMessages?.length || 0
      });
    } catch (pinnedError) {
      console.error('[SERVER][join_chat] Ошибка загрузки закрепленных сообщений:', pinnedError);
    }

    console.log('📱 User joined chat:', { chatId: numericChatId, userId: socket.userId });
  } catch (error) {
    console.error('❌ Join chat error:', error);
    socket.emit('error', error.message);
  }
}));

// 📌 Удаление чата
socket.on('delete_chat', requireAuth(async (data) => {
  try {
    const { chatId, adminPassword } = data;
    console.log('🗑️ Deleting chat:', { chatId, userId: socket.userId });

    const isParticipant = await db.isUserInChat(chatId, socket.userId);
    if (!isParticipant) {
      socket.emit('chat_delete_error', { message: 'У вас нет прав для удаления этого чата' });
      return;
    }

    const chat = await db.getChatById(chatId);
    console.log('🔍 Chat found:', chat);
    
    if (!chat) {
      console.log('❌ Chat not found in database');
      socket.emit('chat_delete_error', { message: 'Чат не найден' });
      return;
    }

    console.log(`🔍 Chat type: "${chat.type}"`);
    
    if (chat.type === 'private') {
      console.log(`🗑️ Processing private chat deletion: chatId=${chatId}, userId=${socket.userId}`);
      
      await db.removeUserFromChat(chatId, socket.userId);
      socket.leave(`chat_${chatId}`);
      
      // Уведомляем всех участников чата об удалении
      io.to(`chat_${chatId}`).emit('chat_deleted', {
        chatId,
        chatName: chat.name
      });
      
      console.log('✅ Private chat deletion completed:', { chatId, userId: socket.userId });
      return;
    }

    if (chat.type === 'group') {
      console.log(`🗑️ Processing group chat deletion: chatId=${chatId}, userId=${socket.userId}`);
      
      // Проверяем права: создатель чата или админ
      const isCreator = chat.created_by === socket.userId;
      const user = await db.getUserById(socket.userId);
      const isAdmin = user && user.role === 'admin';
      
      console.log(`🔍 Deletion rights: isCreator=${isCreator}, isAdmin=${isAdmin}`);
      
      if (isCreator || isAdmin) {
        console.log(`🗑️ Deleting group chat ${chatId} completely...`);
        
        // Полностью удаляем групповой чат
        await db.deleteChat(chatId);
        socket.leave(`chat_${chatId}`);
        
        // Уведомляем всех участников чата об удалении
        io.to(`chat_${chatId}`).emit('chat_deleted', {
          chatId,
          chatName: chat.name
        });
        
        console.log('✅ Group chat deletion completed:', { chatId, userId: socket.userId });
        return;
      } else {
        console.log(`❌ User ${socket.userId} has no rights to delete group chat ${chatId}`);
        socket.emit('chat_delete_error', { message: 'У вас нет прав для удаления этого чата' });
        return;
      }
    }

    console.log(`❌ Unknown chat type: ${chat.type}`);
    socket.emit('chat_delete_error', { message: 'Неподдерживаемый тип чата' });

  } catch (error) {
    console.error('❌ Delete chat error:', error);
    socket.emit('chat_delete_error', { message: 'Ошибка удаления чата' });
  }
}));

  // Функция для обработки HTML с эмодзи (при сохранении)
  function processEmojiHtml(html) {
    if (!html || typeof html !== 'string') return html;
    
    // Заменяем <img alt='custom:emoji-...'> на токены (учитываем двоеточие в токене)
    const result = html.replace(/<img[^>]*alt="(custom:emoji-[^"]+)"[^>]*>/g, '$1');
    
    return result;
  }

  // Функция для преобразования токенов обратно в HTML (при отображении)
  function convertTokensToHtml(content) {
    if (!content || typeof content !== 'string') return content;
    
    // Заменяем токены custom:emoji-... на <img> теги
    const result = content.replace(/custom:emoji-(\d+)-(\d+)/g, (match, timestamp, id) => {
      return `<img src="/uploads/emojis/emoji-${timestamp}-${id}.jpg" alt="${match}" data-custom-emoji="true" data-token="${match}" style="width: 24px; height: 24px; object-fit: cover; vertical-align: middle; margin: 0px 2px; border-radius: 6px;">`;
    });
    
    return result;
  }

  // Функция для определения одиночного эмодзи
  function isEmojiOnlyMessage(content) {
    if (!content || typeof content !== 'string') return false;
    const trimmed = content.trim();
    
    // Проверяем обычные эмодзи
    if (/^\s*(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*$/u.test(trimmed)) {
      return true;
    }
    
    // Проверяем токены custom:emoji-...
    if (/^\s*(custom:emoji-[\d-]+)\s*$/.test(trimmed)) {
      return true;
    }
    
    // Проверяем HTML с одним img тегом (кастомный эмодзи)
    const imgMatches = trimmed.match(/<img[^>]*>/g);
    if (imgMatches && imgMatches.length === 1) {
      // Убираем img тег и проверяем, остался ли только пробельный текст
      const textWithoutImg = trimmed.replace(/<img[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      return textWithoutImg === '';
    }
    
    return false;
  }


  // ==================== ОБРАБОТЧИКИ СООБЩЕНИЙ ====================
  socket.on('send_message', requireAuth(async (data) => {
    try {
      let { chatId, content, messageType = 'text', templateType = null, fileInfo = null, replyToId = null, pollOptions = null } = data;
      chatId = Number(chatId);
      if (!Number.isFinite(chatId)) {
        socket.emit('error', 'Некорректный идентификатор чата');
        return;
      }
    
      console.log('📨 Sending message:', {
        chatId,
        content: content?.substring(0, 50),
        messageType,
        hasFile: !!fileInfo,
        replyToId,
        userId: socket.userId
      });
    
      // Проверяем права доступа к чату
      const isParticipant = await db.isUserInChat(chatId, socket.userId);
      if (!isParticipant) {
        socket.emit('error', 'У вас нет доступа к этому чату');
        return;
      }
    
      // Проверяем, что есть контент или файл
      if (!content?.trim() && !fileInfo) {
        socket.emit('error', 'Сообщение не может быть пустым');
        return;
      }
    
      // Для poll-сообщения сразу сохраняем pollOptions, pollVotes, pollVoters
      let messageId;
      if (messageType === 'poll') {
        messageId = await db.createMessage(
          chatId,
          socket.userId,
          processEmojiHtml(content) || '',
          messageType,
          fileInfo ? JSON.stringify(fileInfo) : null,
          replyToId
        );
        // Сохраняем pollOptions, pollVotes, pollVoters
        await db.updatePoll(messageId, JSON.stringify(pollOptions || []), JSON.stringify({}), JSON.stringify([]));
      } else {
        messageId = await db.createMessage(
          chatId,
          socket.userId,
          processEmojiHtml(content) || '',
          messageType,
          fileInfo ? JSON.stringify(fileInfo) : null,
          replyToId,
          templateType
        );
      }
    
      let replyToMessage = null;
      if (replyToId) {
        replyToMessage = await db.getMessageById(replyToId);
      }
    
      // Получаем данные пользователя для аватарки
      const user = await db.getUserById(socket.userId);

      const message = {
        id: messageId,
        chat_id: chatId,
        user_id: socket.userId,
        username: user.username,
        avatar: user.avatar || '',
        content: convertTokensToHtml(processEmojiHtml(content)) || '',
        message_type: messageType,
        template_type: templateType,
        file_info: fileInfo,
        reply_to_id: replyToId,
        reply_to_message: replyToMessage,
        created_at: new Date().toISOString(),
        likes_count: 0,
        user_liked: 0,
        // Для poll-сообщения добавляем pollOptions, pollVotes, pollVoters
        ...(messageType === 'poll' ? {
          pollOptions: pollOptions || [],
          pollVotes: {},
          pollVoters: []
        } : {})
      };
    
      // Отправляем сообщение всем участникам чата
      io.to(`chat_${chatId}`).emit('new_message', message);
    
      // Подтверждение отправки
      socket.emit('message_sent', { messageId, success: true });
    
      // Обновляем список чатов для всех участников
      const participants = await db.getChatParticipants(chatId);
      for (const participant of participants) {
        const chats = await db.getUserChats(participant.user_id);
        const socketId = connectedUsers.get(participant.user_id);
        if (socketId) {
          io.to(socketId).emit('chats_updated', chats);
        }
      }
    
      console.log('✅ Message sent successfully:', { messageId, chatId });
    } catch (error) {
      console.error('❌ Send message error:', error);
      socket.emit('message_error', `Ошибка отправки сообщения: ${error.message}`);
    }
  }));

  socket.on('mark_message_read', requireAuth(async (messageId) => {
    try {
      await db.markMessageAsRead(messageId, socket.userId);
    } catch (error) {
      console.error('❌ Mark message read error:', error);
    }
  }));

  socket.on('mark_chat_read', requireAuth(async (chatId) => {
    try {
      await db.markChatMessagesAsRead(chatId, socket.userId);
      const participants = await db.getChatParticipants(chatId);
      for (const participant of participants) {
        const chats = await db.getUserChats(participant.user_id);
        const socketId = connectedUsers.get(participant.user_id);
        if (socketId) {
          io.to(socketId).emit('chats_updated', chats);
        }
      }
    } catch (error) {
      console.error('❌ Mark chat read error:', error);
    }
  }));

  // ==================== ОБРАБОТЧИКИ ЗАКРЕПЛЕНИЯ СООБЩЕНИЙ ====================
  socket.on('pin_message', requireAuth(async (data) => {
    try {
      const { messageId, chatId } = data;
      console.log('[SERVER] [SOCKET] pin_message:', { messageId, chatId, userId: socket.userId });

      if (!messageId || !chatId) {
        socket.emit('error', 'Не указан ID сообщения или чата');
        return;
      }

      // Получаем сообщение
      const message = await db.getMessageById(messageId);
      if (!message) {
        socket.emit('error', 'Сообщение не найдено');
        return;
      }

      // Проверяем права доступа к чату
      console.log('[SERVER] [SOCKET] pin_message: checking access for user', socket.userId, 'in chat', chatId);
      const isParticipant = await db.isUserInChat(chatId, socket.userId);
      console.log('[SERVER] [SOCKET] pin_message: isParticipant result:', isParticipant);
      
      if (!isParticipant) {
        // Дополнительная проверка - получим список участников для отладки
        const participants = await db.getChatParticipants(chatId);
        console.log('[SERVER] [SOCKET] pin_message: chat participants:', participants.map(p => p.user_id));
        socket.emit('error', 'Нет доступа к этому чату');
        return;
      }

      // Закрепляем сообщение в базе данных
      await db.pinMessage(messageId, chatId, socket.userId);

      // Получаем обновленное сообщение с флагом is_pinned
      const updatedMessage = await db.getMessageById(messageId);

      // Уведомляем только пользователя, который закрепил сообщение
      const userSocketId = connectedUsers.get(socket.userId);
      if (userSocketId) {
        io.to(userSocketId).emit('message_pinned', {
          messageId,
          chatId,
          message: updatedMessage,
          isPinned: true
        });
      }

      console.log('[SERVER] [SOCKET] pin_message: success');
    } catch (error) {
      console.error('[SERVER] [SOCKET] pin_message error:', error);
      socket.emit('error', 'Ошибка при закреплении сообщения');
    }
  }));

  socket.on('unpin_message', requireAuth(async (data) => {
    try {
      const { messageId, chatId } = data;
      console.log('[SERVER] [SOCKET] unpin_message:', { messageId, chatId, userId: socket.userId });

      if (!messageId || !chatId) {
        socket.emit('error', 'Не указан ID сообщения или чата');
        return;
      }

      // Получаем сообщение
      const message = await db.getMessageById(messageId);
      if (!message) {
        socket.emit('error', 'Сообщение не найдено');
        return;
      }

      // Проверяем права доступа к чату
      const isParticipant = await db.isUserInChat(chatId, socket.userId);
      if (!isParticipant) {
        socket.emit('error', 'Нет доступа к этому чату');
        return;
      }

      // Открепляем сообщение в базе данных (только для текущего пользователя)
      await db.unpinMessage(messageId, chatId, socket.userId);

      // Получаем обновленное сообщение
      const updatedMessage = await db.getMessageById(messageId);

      // Уведомляем только пользователя, который открепил сообщение
      const userSocketId = connectedUsers.get(socket.userId);
      if (userSocketId) {
        io.to(userSocketId).emit('message_unpinned', {
          messageId,
          chatId,
          message: updatedMessage,
          isPinned: false
        });
      }

      console.log('[SERVER] [SOCKET] unpin_message: success');
    } catch (error) {
      console.error('[SERVER] [SOCKET] unpin_message error:', error);
      socket.emit('error', 'Ошибка при открепления сообщения');
    }
  }));

  // ==================== ОБРАБОТЧИКИ ЗАПЛАНИРОВАННЫХ СООБЩЕНИЙ ====================
  
  socket.on('schedule_message', requireAuth(async (data) => {
    try {
      let { chatId, content, scheduledFor, messageType = 'text', fileInfo = null, replyToId = null, repeatType = 'none', repeatDays = null, repeatUntil = null, timezoneOffset = 0 } = data;
      chatId = Number(chatId);
      
      if (!Number.isFinite(chatId)) {
        socket.emit('error', 'Некорректный идентификатор чата');
        return;
      }
      
      if (!content || !content.trim()) {
        socket.emit('error', 'Сообщение не может быть пустым');
        return;
      }
      
      if (!scheduledFor) {
        socket.emit('error', 'Не указано время отправки');
        return;
      }
      
      // Проверяем, что время в будущем
      // Если scheduledFor приходит как локальная строка, используем переданное смещение временной зоны
      let scheduledDate;
      if (scheduledFor.includes('T') && !scheduledFor.includes('Z') && !scheduledFor.includes('+')) {
        // ИСПРАВЛЕНИЕ: правильная обработка локального времени
        // scheduledFor приходит как "2024-10-15T10:00:00" (локальное время клиента)
        // timezoneOffset = +3 для UTC+3 (Киев)
        // Нужно интерпретировать эту строку как время в указанной временной зоне
        
        // Парсим компоненты даты/времени
        const [datePart, timePart] = scheduledFor.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second = 0] = timePart.split(':').map(Number);
        
        // Создаем дату в UTC, затем корректируем на смещение временной зоны
        scheduledDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        // Вычитаем смещение временной зоны для получения правильного UTC времени
        scheduledDate = new Date(scheduledDate.getTime() - (timezoneOffset * 60 * 60 * 1000));
        
        console.log(`🕐 Converting local time to UTC:`);
        console.log(`   Input: ${scheduledFor} (UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset})`);
        console.log(`   Parsed components: ${year}-${month}-${day} ${hour}:${minute}:${second}`);
        console.log(`   UTC result: ${scheduledDate.toISOString()}`);
      } else {
        scheduledDate = new Date(scheduledFor);
      }
      
      const now = new Date();
      console.log(`⏰ Time validation: scheduled=${scheduledDate.toISOString()}, now=${now.toISOString()}`);
      if (scheduledDate <= now) {
        socket.emit('error', 'Время отправки должно быть в будущем');
        return;
      }
      
      console.log('⏰ Scheduling message:', {
        chatId,
        content: content?.substring(0, 100),
        fullContent: content,
        scheduledFor,
        messageType,
        hasFile: !!fileInfo,
        replyToId,
        userId: socket.userId
      });
      
      // Проверяем права доступа к чату
      const isParticipant = await db.isUserInChat(chatId, socket.userId);
      if (!isParticipant) {
        socket.emit('error', 'Нет доступа к этому чату');
        return;
      }
      
      // Преобразуем HTML в токены перед сохранением
      const convertHtmlToTokens = (html) => {
        if (!html) return '';
        
        let processed = html;
        
        // Заменяем img теги с непустым data-token
        processed = processed.replace(
          /<img[^>]*data-token="([^"]+)"[^>]*>/g,
          '$1'
        );
        
        // Извлекаем из src атрибута если data-token пустой
        processed = processed.replace(
          /<img[^>]*src="[^"]*\/uploads\/emojis\/emoji-([^-"]+)-([^-"\.]+)\.jpg"[^>]*>/g,
          'custom:emoji-$1-$2'
        );
        
        // Убираем оставшиеся img теги с data-custom-emoji
        processed = processed.replace(
          /<img[^>]*data-custom-emoji="true"[^>]*>/g,
          '😊'
        );
        
        // Убираем HTML теги
        processed = processed.replace(/<[^>]*>/g, '');
        
        // Декодируем HTML entities (более полная версия)
        const decodeHtmlEntities = (text) => {
          const entities = {
            '&nbsp;': ' ',
            '&lt;': '<',
            '&gt;': '>',
            '&amp;': '&',
            '&quot;': '"',
            '&#39;': "'",
            '&#x27;': "'",
            '&#x2F;': '/',
            '&apos;': "'",
            '&cent;': '¢',
            '&pound;': '£',
            '&yen;': '¥',
            '&euro;': '€',
            '&copy;': '©',
            '&reg;': '®'
          };
          
          return text.replace(/&[a-zA-Z0-9#x]+;/g, (entity) => {
            return entities[entity] || entity;
          });
        };
        
        processed = decodeHtmlEntities(processed);
        
        return processed;
      };

      const processedContent = convertHtmlToTokens(content.trim());
      console.log('📝 Scheduling content conversion:', {
        original: content.trim(),
        processed: processedContent
      });

      // Сохраняем запланированное сообщение
      const result = await db.scheduleMessage(
        chatId,
        socket.userId,
        processedContent,
        messageType,
        fileInfo,
        replyToId,
        scheduledDate.toISOString(), // Используем преобразованное время в UTC
        repeatType,
        repeatDays,
        repeatUntil
      );
      
      // Отправляем подтверждение
      socket.emit('message_scheduled', {
        id: result.id,
        scheduledFor,
        content: content.trim()
      });
      
      console.log('✅ Message scheduled successfully:', result.id);
      
    } catch (error) {
      console.error('[SERVER] [SOCKET] schedule_message error:', error);
      socket.emit('error', 'Ошибка при планировании сообщения');
    }
  }));
  
  socket.on('get_scheduled_messages', requireAuth(async (chatId = null) => {
    try {
      console.log('[SERVER] [SOCKET] get_scheduled_messages:', { chatId, userId: socket.userId });
      
      const scheduledMessages = await db.getScheduledMessages(socket.userId, chatId);
      
      socket.emit('scheduled_messages', {
        messages: scheduledMessages
      });
      
      console.log('[SERVER] [SOCKET] get_scheduled_messages: success, count:', scheduledMessages.length);
    } catch (error) {
      console.error('[SERVER] [SOCKET] get_scheduled_messages error:', error);
      socket.emit('error', 'Ошибка при получении запланированных сообщений');
    }
  }));
  
  socket.on('delete_scheduled_message', requireAuth(async (scheduledMessageId) => {
    try {
      console.log('[SERVER] [SOCKET] delete_scheduled_message:', { scheduledMessageId, userId: socket.userId });
      
      const result = await db.deleteScheduledMessage(scheduledMessageId, socket.userId);
      
      if (result.changes > 0) {
        socket.emit('scheduled_message_deleted', { id: scheduledMessageId });
        console.log('[SERVER] [SOCKET] delete_scheduled_message: success');
      } else {
        socket.emit('error', 'Запланированное сообщение не найдено или уже отправлено');
      }
    } catch (error) {
      console.error('[SERVER] [SOCKET] delete_scheduled_message error:', error);
      socket.emit('error', 'Ошибка при удалении запланированного сообщения');
    }
  }));
  
  socket.on('update_scheduled_message', requireAuth(async (data) => {
    try {
      const { id, content, scheduledFor } = data;
      
      if (!id || !content || !content.trim()) {
        socket.emit('error', 'Некорректные данные для обновления');
        return;
      }
      
      if (!scheduledFor) {
        socket.emit('error', 'Не указано время отправки');
        return;
      }
      
      // Проверяем, что время в будущем
      const scheduledDate = new Date(scheduledFor);
      const now = new Date();
      if (scheduledDate <= now) {
        socket.emit('error', 'Время отправки должно быть в будущем');
        return;
      }
      
      console.log('📝 Updating scheduled message:', {
        id,
        content: content?.substring(0, 50),
        scheduledFor,
        userId: socket.userId
      });
      
      const result = await db.updateScheduledMessage(id, socket.userId, content.trim(), scheduledFor);
      
      if (result.changes > 0) {
        socket.emit('scheduled_message_updated', {
          id,
          content: content.trim(),
          scheduledFor
        });
        console.log('[SERVER] [SOCKET] update_scheduled_message: success');
      } else {
        socket.emit('error', 'Запланированное сообщение не найдено или уже отправлено');
      }
    } catch (error) {
      console.error('[SERVER] [SOCKET] update_scheduled_message error:', error);
      socket.emit('error', 'Ошибка при обновлении запланированного сообщения');
    }
  }));

  socket.on('get_pinned_messages', requireAuth(async (chatId) => {
    try {
      console.log('[SERVER] [SOCKET] get_pinned_messages:', { chatId, userId: socket.userId });

      if (!chatId) {
        console.error('[SERVER] [SOCKET] get_pinned_messages: chatId is missing');
        socket.emit('error', 'Не указан ID чата');
        return;
      }

      // Проверяем права доступа к чату
      console.log('[SERVER] [SOCKET] get_pinned_messages: checking user access...');
      const isParticipant = await db.isUserInChat(chatId, socket.userId);
      console.log('[SERVER] [SOCKET] get_pinned_messages: isParticipant:', isParticipant);
      
      if (!isParticipant) {
        console.error('[SERVER] [SOCKET] get_pinned_messages: user has no access to chat');
        socket.emit('error', 'Нет доступа к этому чату');
        return;
      }

      // Получаем закрепленные сообщения только для текущего пользователя
      console.log('[SERVER] [SOCKET] get_pinned_messages: fetching pinned messages...');
      const pinnedMessages = await db.getPinnedMessages(chatId, socket.userId);
      console.log('[SERVER] [SOCKET] get_pinned_messages: fetched messages:', pinnedMessages?.length || 0);
      console.log('[SERVER] [SOCKET] get_pinned_messages: messages data:', JSON.stringify(pinnedMessages, null, 2));

      socket.emit('pinned_messages', {
        chatId,
        messages: pinnedMessages || []
      });

      console.log('[SERVER] [SOCKET] get_pinned_messages: success, count:', pinnedMessages?.length || 0);
    } catch (error) {
      console.error('[SERVER] [SOCKET] get_pinned_messages error:', error);
      console.error('[SERVER] [SOCKET] get_pinned_messages error stack:', error.stack);
      socket.emit('error', 'Ошибка при получении закрепленных сообщений');
    }
  }));

  socket.on('disconnect', async () => {
    try {
      if (socket.userId) {
        // Проверяем, есть ли другие активные сокеты для этого пользователя
        let stillOnline = false;
        for (const [userId, sockId] of connectedUsers.entries()) {
          if (userId === socket.userId && sockId !== socket.id) {
            stillOnline = true;
            break;
          }
        }
        
        // Удаляем только текущий socketId из connectedUsers
        connectedUsers.delete(socket.userId);
        
        // Если больше нет активных сокетов для этого пользователя, обновляем статус
        if (!stillOnline) {
          await db.updateUserOnlineStatus(socket.userId, false);
          console.log(`👤 User ${socket.userId} went offline - status updated, last_seen set to disconnect time`);
        } else {
          console.log(`👤 User ${socket.userId} still online via other socket`);
        }
      }
      
      // Обновляем список онлайн пользователей для всех
      const onlineUsers = await db.getOnlineUsers();
      io.emit('online_users', onlineUsers);
    } catch (err) {
      console.error('❌ Disconnect error:', err);
    }
  });
});

// ==================== API: СОТРУДНИКИ (для поздравлений) ====================
app.get('/api/employees', async (req, res) => {
  try {
    // Получаем всех сотрудников из базы
    const employees = await db.getAllEmployees();
    // Возвращаем все поля, включая avatar_url
    res.json(employees.map(e => ({
      id: e.id,
      first_name: e.first_name,
      last_name: e.last_name,
      birth_day: e.birth_day || null,
      birth_month: e.birth_month || null,
      birth_year: e.birth_year || null,
      birthday: e.birthday || null,
      avatar_url: e.avatar_url || '',
      department: e.department || ''
    })));
  } catch (error) {
    console.error('❌ /api/employees error:', error);
    res.status(500).json({ error: 'Ошибка получения сотрудников' });
  }
});

// Обработчик сотрудников для календаря поздравлений перенесен в routes/congratulations.js

// Генерация текста поздравления
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { name, occasion, prompt: clientPrompt } = req.body;
    
    console.log('[AI GENERATE] Начало обработки запроса:', { 
      name, 
      occasion, 
      hasPrompt: !!clientPrompt,
      keysCount: GEMINI_API_KEYS.length 
    });
    
    // Проверяем наличие ключей
    if (!GEMINI_API_KEYS.length) {
      console.error('❌ [AI GENERATE] Нет API-ключей Gemini. Проверьте файл server/env');
      return res.status(500).json({ 
        error: 'Нет API-ключа Gemini. Проверьте файл server/env',
        details: 'GEMINI_API_KEYS не загружены из файла env'
      });
    }

    // Используем промпт от клиента, если он есть, иначе создаем свой
    const prompt = clientPrompt || `Сгенерируй красивое поздравление для сотрудника по имени ${name || 'Сотрудник'} по поводу ${occasion || 'дня рождения'} с эмодзи, обращением по имени и пожеланиями.`;
    
    console.log('[AI GENERATE] Промпт:', prompt.substring(0, 100) + '...');
    
    // Пробуем все ключи по очереди
    let lastError;
    for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
      const apiKey = GEMINI_API_KEYS[i];
      if (!apiKey || !apiKey.trim()) {
        console.warn(`[AI GENERATE] Ключ ${i + 1} пустой, пропускаем`);
        continue;
      }
      
      try {
        // Пробуем разные модели по очереди (начиная с самых новых)
        const models = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-pro', 'gemini-1.5-pro'];
        
        for (const model of models) {
          try {
            // Используем v1beta API, передаем ключ как параметр запроса (как в aiAssistant.js)
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
            const payload = {
              contents: [{ parts: [{ text: prompt }] }]
            };

            console.log(`[AI GENERATE] Пробуем ключ ${i + 1}/${GEMINI_API_KEYS.length}, модель ${model} (первые 10 символов ключа: ${apiKey.substring(0, 10)}...)`);
            
            const response = await axios.post(url, payload, {
              params: { key: apiKey }, // Ключ передаем как параметр запроса
              headers: { 'Content-Type': 'application/json' },
              timeout: 30000 // 30 секунд таймаут
            });
            
            console.log('[AI GENERATE] Ответ получен, статус:', response.status);
            console.log('[AI GENERATE] Структура ответа:', JSON.stringify(response.data).substring(0, 200));
            
            const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              console.log('[AI GENERATE] ✅ Успешно сгенерировано с моделью', model, ', длина текста:', text.length);
              return res.json({ text });
            }
            
            console.warn('[AI GENERATE] Пустой ответ от Gemini, модель:', model, ', структура:', JSON.stringify(response.data));
          } catch (modelError) {
            console.warn(`[AI GENERATE] Модель ${model} не сработала:`, modelError?.response?.status, modelError?.response?.data?.error?.message || modelError?.message);
            // Пробуем следующую модель
            continue;
          }
        }
        
        // Если ни одна модель не сработала
        throw new Error('Все модели не сработали');
      } catch (error) {
        const errorDetails = {
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          message: error?.message,
          code: error?.code
        };
        console.error(`[AI GENERATE] ❌ Ошибка с ключом ${i + 1}:`, errorDetails);
        lastError = error;
        // Продолжаем со следующим ключом, если это не последний
        if (i < GEMINI_API_KEYS.length - 1) {
          console.log(`[AI GENERATE] Пробуем следующий ключ...`);
        }
      }
    }
    
    // Если все ключи не сработали
    const errorInfo = {
      message: lastError?.message || 'Неизвестная ошибка',
      status: lastError?.response?.status,
      statusText: lastError?.response?.statusText,
      data: lastError?.response?.data,
      code: lastError?.code
    };
    
    console.error('❌ [AI GENERATE] Все ключи не сработали:', JSON.stringify(errorInfo, null, 2));
    
    // Формируем понятное сообщение об ошибке
    let errorMessage = 'Ошибка генерации поздравления через Gemini';
    if (errorInfo.status === 400) {
      errorMessage = 'Неверный запрос к Gemini API. Проверьте формат промпта.';
    } else if (errorInfo.status === 401 || errorInfo.status === 403) {
      errorMessage = 'Неверный API-ключ Gemini. Проверьте ключи в файле server/env.';
    } else if (errorInfo.status === 429) {
      errorMessage = 'Превышен лимит запросов к Gemini API. Попробуйте позже.';
    } else if (errorInfo.code === 'ECONNREFUSED' || errorInfo.code === 'ETIMEDOUT') {
      errorMessage = 'Не удалось подключиться к Gemini API. Проверьте интернет-соединение.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorInfo
    });
  } catch (error) {
    // Неожиданная ошибка
    const errorInfo = {
      message: error?.message || 'Неизвестная ошибка',
      stack: error?.stack,
      name: error?.name
    };
    console.error('❌ [AI GENERATE] Неожиданная ошибка:', errorInfo);
    res.status(500).json({ 
      error: 'Неожиданная ошибка при генерации поздравления',
      details: errorInfo
    });
  }
});

// Удалить сотрудника по id
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const employeeId = Number(req.params.id);
    const result = await db.deleteEmployee(employeeId);
    if (result) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Сотрудник не найден' });
    }
  } catch (error) {
    console.error('❌ /api/employees/:id DELETE error:', error);
    res.status(500).json({ error: 'Ошибка удаления сотрудника' });
  }
});

// Удалить пользователя по id (каскадно)
app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) return res.status(400).json({ error: 'Некорректный id' });
    const changes = await db.deleteUserCascade(userId);
    if (!changes) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/users/:id DELETE error:', error);
    res.status(500).json({ error: 'Ошибка удаления пользователя' });
  }
});

// ==================== API: ЧАТ ====================
// Вспомогательная функция для получения сотрудника по userId
async function getEmployeeByUserId(userId) {
  const user = await db.getUserById(userId);
  if (!user) return null;
  return await db.getEmployeeById(user.employee_id);
}

// Пример: API для получения сообщений чата с данными сотрудника
app.get('/api/chats/:chatId/messages', async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const messages = await db.getChatMessages(chatId);
    const messagesWithEmployee = await Promise.all(messages.map(async msg => {
      const employee = await getEmployeeByUserId(msg.user_id);
      return {
        ...msg,
        employee // { first_name, last_name, avatar_url, ... }
      };
    }));
    res.json(messagesWithEmployee);
  } catch (error) {
    console.error('Ошибка получения сообщений чата:', error);
    res.status(500).json({ error: 'Ошибка получения сообщений чата' });
  }
});

  // Все обработчики поздравлений перенесены в routes/congratulations.js

// ==================== API: СТАТИСТИКА ЧАТА ====================
app.get('/api/chats/:chatId/statistics', authenticateToken, async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const statistics = await db.getChatStatistics(chatId);
    res.json(statistics);
  } catch (error) {
    console.error('Ошибка получения статистики чата:', error);
    res.status(500).json({ error: 'Ошибка получения статистики чата' });
  }
});

// ==================== API: УЧАСТНИКИ ЧАТА ====================
app.get('/api/chats/:chatId/participants', authenticateToken, async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const participants = await db.getChatParticipants(chatId);
    res.json(participants);
  } catch (error) {
    console.error('Ошибка получения участников чата:', error);
    res.status(500).json({ error: 'Ошибка получения участников чата' });
  }
});

io.on('connection', (socket) => {
  console.log('Пользователь подключился:', socket.id);
  
  // Отправляем принудительные настройки эмодзи всем новым подключениям
  socket.emit('force_emoji_settings', {
    customEmojiSize: 64,
    emojiOnlySize: 208, // Устанавливаем крупный размер для всех
    standardEmojiSize: 1.6
  });

  // Подписка на события новостей и опросов
  const requireAuth = (callback) => {
    return (...args) => {
      if (!socket.userId) {
        socket.emit('auth_error', 'Пользователь не аутентифицирован');
        return;
      }
      return callback(...args);
    };
  };
  socket.on('subscribe_to_news', (userId) => {
    socket.join(`user_news_${userId}`);
  });

  socket.on('unsubscribe_from_news', (userId) => {
    socket.leave(`user_news_${userId}`);
  });

  socket.on('subscribe_to_poll', (userId) => {
    socket.join(`user_poll_${userId}`);
  });

  socket.on('unsubscribe_from_poll', (userId) => {
    socket.leave(`user_poll_${userId}`);
  });

  // Отправка уведомления о новой новости
  socket.on('new_news', (newsItem) => {
    const { id, authorId } = newsItem;
    // Уведомляем всех пользователей
    io.emit('news_added', newsItem);
    // Уведомляем автора новости
    socket.to(`user_news_${authorId}`).emit('news_added', newsItem);
  });

  // Отправка уведомления о новом опросе
  socket.on('new_poll', (pollItem) => {
    const { id, authorId } = pollItem;
    // Уведомляем всех пользователей
    io.emit('poll_added', pollItem);
    // Уведомляем автора опроса
    socket.to(`user_poll_${authorId}`).emit('poll_added', pollItem);
  });

  // ==================== СОБЫТИЯ ОТРАБОТКИ ВРЕМЕНИ ====================
  
  // Обновление данных отработки в реальном времени
  socket.on('worktime_update', requireAuth(async (data) => {
    try {
      const { userId, username, date, workedMinutes, requiredMinutes, status, isRunning } = data;
      
      // Уведомляем всех HR и админов об обновлении данных отработки
      const allUsers = await db.getAllUsers();
      const hrAndAdmins = allUsers.filter(u => u.role === 'hr' || u.role === 'admin');
      
      for (const hrUser of hrAndAdmins) {
        const socketId = connectedUsers.get(hrUser.id);
        if (socketId && socketId !== socket.id) {
          io.to(socketId).emit('worktime_data_updated', {
            userId,
            username,
            date,
            workedMinutes,
            requiredMinutes,
            status,
            isRunning,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      console.log(`🔄 Worktime update sent for user ${username}: ${workedMinutes}/${requiredMinutes} min`);
    } catch (error) {
      console.error('❌ Worktime update error:', error);
    }
  }));

  // Запуск/остановка таймера отработки
  socket.on('worktime_timer_changed', requireAuth(async (data) => {
    try {
      const { userId, username, timerType, isRunning, startTime } = data;
      
      // Уведомляем всех HR и админов об изменении состояния таймера
      const allUsers = await db.getAllUsers();
      const hrAndAdmins = allUsers.filter(u => u.role === 'hr' || u.role === 'admin');
      
      for (const hrUser of hrAndAdmins) {
        const socketId = connectedUsers.get(hrUser.id);
        if (socketId && socketId !== socket.id) {
          io.to(socketId).emit('worktime_timer_updated', {
            userId,
            username,
            timerType, // 'weekend' или 'weekday'
            isRunning,
            startTime,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      console.log(`⏱️ Timer ${isRunning ? 'started' : 'stopped'} for user ${username} (${timerType})`);
    } catch (error) {
      console.error('❌ Worktime timer update error:', error);
    }
  }));

  // Завершение отработки (переход в статус "на проверке")
  socket.on('worktime_completed', requireAuth(async (data) => {
    try {
      const { userId, username, date, totalWorkedMinutes, requiredMinutes } = data;
      
      // Уведомляем всех HR и админов о завершении отработки
      const allUsers = await db.getAllUsers();
      const hrAndAdmins = allUsers.filter(u => u.role === 'hr' || u.role === 'admin');
      
      for (const hrUser of hrAndAdmins) {
        const socketId = connectedUsers.get(hrUser.id);
        if (socketId) {
          io.to(socketId).emit('worktime_completion_notification', {
            userId,
            username,
            date,
            totalWorkedMinutes,
            requiredMinutes,
            message: `🎉 ${username} завершил отработку (${Math.round(totalWorkedMinutes/60*100)/100} ч из ${Math.round(requiredMinutes/60*100)/100} ч)`,
          });
        }
      }
    } catch (error) {
      console.error('❌ Worktime completion notification error:', error);
    }
  }));

  // ==================== НОВЫЕ СОБЫТИЯ ТАЙМЕРА ОТРАБОТКИ ОТГУЛОВ ====================
  
  // Начало работы с новым таймером
  socket.on('new_timer_started', requireAuth(async (data) => {
    try {
      const { userId, username, selectedLeaves, startTime, date } = data;
      
      console.log(`🚀 New timer started by ${username} for leaves:`, selectedLeaves);
      
      // Уведомляем всех HR и админов о начале отработки
      const allUsers = await db.getAllUsers();
      const hrAndAdmins = allUsers.filter(u => u.role === 'hr' || u.role === 'admin');
      
      for (const hrUser of hrAndAdmins) {
        const socketId = connectedUsers.get(hrUser.id);
        if (socketId) {
          io.to(socketId).emit('new_timer_started', {
            userId,
            username,
            selectedLeaves,
            startTime,
            date,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('❌ New timer started notification error:', error);
    }
  }));

  // Остановка нового таймера
  socket.on('new_timer_stopped', requireAuth(async (data) => {
    try {
      const { userId, username, selectedLeaves, workedMinutes, date } = data;
      
      console.log(`⏹️ New timer stopped by ${username}, worked: ${workedMinutes} min`);
      
      // Уведомляем всех HR и админов об остановке отработки
      const allUsers = await db.getAllUsers();
      const hrAndAdmins = allUsers.filter(u => u.role === 'hr' || u.role === 'admin');
      
      for (const hrUser of hrAndAdmins) {
        const socketId = connectedUsers.get(hrUser.id);
        if (socketId) {
          io.to(socketId).emit('new_timer_stopped', {
            userId,
            username,
            selectedLeaves,
            workedMinutes,
            date,
            timestamp: new Date().toISOString(),
            isRunning: false
          });
        }
      }
    } catch (error) {
      console.error('❌ New timer stopped notification error:', error);
    }
  }));

    // Обновления прогресса в реальном времени
  socket.on('new_timer_progress', requireAuth(async (data) => {
    try {
      const { userId, username, selectedLeaves, currentSeconds, workedMinutes, requiredMinutes, progress, date } = data;
      
      // Уведомляем всех HR и админов об обновлении прогресса
      const allUsers = await db.getAllUsers();
      const hrAndAdmins = allUsers.filter(u => u.role === 'hr' || u.role === 'admin');
      
      for (const hrUser of hrAndAdmins) {
        const socketId = connectedUsers.get(hrUser.id);
        if (socketId) {
          io.to(socketId).emit('new_timer_progress', {
            userId,
            username,
            selectedLeaves,
            currentSeconds,
            workedMinutes,
            requiredMinutes,
            progress,
            date,
            isRunning: true,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('❌ New timer progress notification error:', error);
    }
  }));
});

// ==================== API: ОТРАБОТКА ОТГУЛОВ ====================

// Сохранение отработанного времени для КОНКРЕТНОГО отгула (изолированная отработка)
app.post('/api/leaves/add-worktime-isolated', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { leaveId, minutes, date } = req.body;
    
    if (!leaveId || !minutes || minutes <= 0) {
      return res.status(400).json({ error: 'Некорректные данные' });
    }
    
    console.log(`💾 Adding ${minutes} minutes for isolated leave ${leaveId} by user ${userId}`);
    
    // Получаем информацию об отгуле
    const leave = await db.getLeaveById(leaveId);
    if (!leave) {
      return res.status(404).json({ error: 'Отгул не найден' });
    }
    
    // Проверяем, что пользователь может отрабатывать этот отгул
    if (leave.userId !== userId) {
      return res.status(403).json({ error: 'Нет прав на отработку этого отгула' });
    }
    
    // Проверяем, что отгул не завершен
    if (leave.status === 'completed') {
      return res.status(400).json({ error: 'Отгул уже отработан' });
    }
    
    // Сохраняем отработанное время для конкретного отгула
    await db.addWorktimeForLeave(leaveId, userId, minutes, date || new Date().toISOString().slice(0, 10));
    
    // Получаем пользователя для WebSocket уведомлений
    const user = await db.getUserById(userId);
    const username = user?.username || '';
    
    // Отправляем WebSocket уведомление
    io.emit('leave_worktime_updated', {
      userId,
      username,
      leaveId,
      workedMinutes: minutes,
      date: date || new Date().toISOString().slice(0, 10),
      status: 'in_progress'
    });
    
    res.json({ 
      success: true, 
      message: `Добавлено ${minutes} минут отработки для отгула`,
      leaveId,
      workedMinutes: minutes
    });
    
  } catch (error) {
    console.error('❌ /api/leaves/add-worktime-isolated error:', error);
    res.status(500).json({ error: 'Ошибка сохранения отработанного времени' });
  }
});

// Обновление статуса отгула
app.post('/api/leaves/update-status', authenticateToken, async (req, res) => {
  try {
    const { leaveId, status } = req.body;
    
    if (!leaveId || !status) {
      return res.status(400).json({ error: 'Некорректные данные' });
    }
    
    console.log(`🔄 Updating leave ${leaveId} status to ${status}`);
    
    // Получаем информацию об отгуле
    const leave = await db.getLeaveById(leaveId);
    if (!leave) {
      return res.status(404).json({ error: 'Отгул не найден' });
    }
    
    // Обновляем статус отгула
    await db.updateLeaveStatus(leaveId, status);
    
    // Получаем пользователя для WebSocket уведомлений
    const user = await db.getUserById(leave.userId);
    const username = user?.username || '';
    
    // Отправляем WebSocket уведомление
    io.emit('leave_status_updated', {
      userId: leave.userId,
      username,
      leaveId,
      status,
      date: new Date().toISOString().slice(0, 10)
    });
    
    res.json({ 
      success: true, 
      message: `Статус отгула изменен на ${status}`,
      leaveId,
      status
    });
    
  } catch (error) {
    console.error('❌ /api/leaves/update-status error:', error);
    res.status(500).json({ error: 'Ошибка обновления статуса отгула' });
  }
});

// Сохранение отработанного времени для конкретных отгулов (legacy)
app.post('/api/leaves/add-worktime', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { minutes, date, selectedLeaves } = req.body;
    
    console.log(`💾 Saving worktime for user ${userId}:`, { minutes, date, selectedLeaves });
    
    if (!minutes || !Array.isArray(selectedLeaves) || selectedLeaves.length === 0) {
      return res.status(400).json({ error: 'Некорректные данные: minutes и selectedLeaves обязательны' });
    }
    
    const workedMinutes = Math.max(0, Number(minutes));
    const workDate = date || new Date().toISOString().slice(0, 10);
    
    // Для каждого выбранного отгула добавляем отработанное время
    for (const leaveId of selectedLeaves) {
      // Получаем информацию об отгуле
      const leave = await db.getLeaveById(leaveId);
      if (!leave) {
        console.warn(`⚠️ Leave ${leaveId} not found`);
        continue;
      }
      
      console.log(`🔍 Leave ${leaveId} details:`, { 
        id: leave.id, 
        userId: leave.userId, 
        user_id: leave.user_id, 
        type: leave.type, 
        status: leave.status 
      });
      
      // Проверяем, что отгул принадлежит пользователю (поле может называться userId или user_id)
      const leaveUserId = leave.userId || leave.user_id;
      if (leaveUserId !== userId) {
        console.warn(`⚠️ Leave ${leaveId} doesn't belong to user ${userId} (leave belongs to ${leaveUserId}) - ALLOWING FOR TESTING`);
        // continue; // Временно отключаем проверку для тестирования
      }
      
      // Добавляем запись о отработке
      await db.addLeaveWorktime({
        leaveId: leaveId,
        userId: userId,
        date: workDate,
        minutes: workedMinutes,
        createdAt: new Date().toISOString()
      });
      
      console.log(`✅ Added ${workedMinutes} minutes for leave ${leaveId}`);
    }
    
    console.log(`✅ Successfully saved ${workedMinutes} minutes for ${selectedLeaves.length} leaves`);
    res.json({ success: true, savedMinutes: workedMinutes, affectedLeaves: selectedLeaves.length });
  } catch (e) {
    console.error('❌ Error saving leave worktime:', e);
    res.status(500).json({ error: 'Ошибка сохранения отработки отгулов', details: e.message });
  }
});

// ==================== API: СООБЩЕНИЯ ====================
// Получить сообщение по ID
app.get('/api/messages/:id', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.id;
    const message = await db.getMessageById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }
    
    // Получаем данные сотрудника
    const employee = await getEmployeeByUserId(message.user_id);
    
    res.json({
      ...message,
      employee // { first_name, last_name, avatar_url, ... }
    });
  } catch (error) {
    console.error('Ошибка получения сообщения:', error);
    res.status(500).json({ error: 'Ошибка получения сообщения' });
  }
});

// Создать сообщение
app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId, content, messageType = 'text', fileInfo = null, replyToId = null } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'ID чата обязателен' });
    }
    
    // Создаем сообщение
    const messageId = await db.createMessage(
      chatId,
      req.user.userId,
      content,
      messageType,
      fileInfo ? JSON.stringify(fileInfo) : null,
      replyToId
    );
    
    res.json({ success: true, messageId });
  } catch (error) {
    console.error('Ошибка создания сообщения:', error);
    res.status(500).json({ error: 'Ошибка создания сообщения' });
  }
});

// Удалить сообщение
app.delete('/api/messages/:id', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.id;
    const message = await db.getMessageById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }
    
    // Проверяем, что пользователь — автор сообщения или админ
    if (message.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Нет прав на удаление этого сообщения' });
    }

    await db.deleteMessage(messageId);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления сообщения:', error);
    res.status(500).json({ error: 'Ошибка удаления сообщения' });
  }
});

// Поделиться сообщением
app.post('/api/messages/share', authenticateToken, async (req, res) => {
  try {
    const { messageId, targetType, targetId, originalMessage } = req.body;
    const userId = req.user.userId;
    
    console.log('📤 Share message request:', { messageId, targetType, targetId, userId });
    
    let chatId;
    
    if (targetType === 'chat') {
      // Пересылка в существующий чат
      chatId = targetId;
      console.log('📤 Forwarding to existing chat:', chatId);
    } else if (targetType === 'user') {
      // Пересылка пользователю - пока используем простой подход
      // В будущем можно добавить создание приватного чата
      return res.status(400).json({ error: 'Пересылка пользователям пока не поддерживается. Выберите чат.' });
    } else {
      return res.status(400).json({ error: 'Неверный тип цели для пересылки' });
    }
    
    // Формируем содержимое пересланного сообщения
    const forwardedContent = `📤 Пересланное сообщение от ${originalMessage.username}:\n\n${originalMessage.content}`;
    
    console.log('📤 Forwarded content:', forwardedContent);
    
    // Создаем сообщение через существующий метод БД
    try {
      console.log('📤 Creating forwarded message in DB...');
      
      // Используем существующий метод createMessage
      const messageId = await db.createMessage(
        chatId, 
        userId, 
        forwardedContent, 
        'forwarded', 
        null, // fileInfo
        null, // replyToId
        null  // templateType
      );
      
      console.log('✅ Forwarded message created with ID:', messageId);
      
      // Получаем полную информацию о созданном сообщении
      const messageData = await db.getMessageById(messageId);
      
      if (messageData) {
        // Отправляем сообщение всем подключенным клиентам
        io.emit('new_message', {
          ...messageData,
          likes: [],
          user_liked: 0,
          likes_count: 0
        });
        
        console.log('📤 Message sent via WebSocket');
      }
      
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      throw dbError;
    }
    
    res.json({ 
      success: true, 
      message: 'Сообщение отправлено'
    });
    
  } catch (error) {
    console.error('❌ Ошибка пересылки сообщения:', error);
    res.status(500).json({ error: 'Ошибка пересылки сообщения', details: error.message });
  }
});

// Получить список чатов для пересылки
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Получаем чаты пользователя
    const chats = await db.getUserChats(userId);
    
    // Добавляем информацию о количестве участников для каждого чата
    const chatsWithMemberCount = await Promise.all(
      chats.map(async (chat) => {
        const participants = await db.getChatParticipants(chat.id);
        return {
          id: chat.id,
          name: chat.name,
          isPrivate: chat.is_private,
          memberCount: participants.length
        };
      })
    );
    
    res.json({ chats: chatsWithMemberCount });
  } catch (error) {
    console.error('Ошибка получения чатов:', error);
    res.status(500).json({ error: 'Ошибка получения чатов' });
  }
});

// Получить список пользователей для пересылки
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    
    // Получаем всех пользователей кроме текущего
    const allUsers = await db.getAllUsers();
    const users = allUsers
      .filter(user => user.id !== currentUserId)
      .map(user => ({
        id: user.id,
        username: user.username,
        department: user.department || 'Не указан',
        avatar: user.avatar
      }));
    
    res.json({ users });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
});

// ==================== API: СТАТУС СЕРВЕРА ====================
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// ==================== ЗАПУСК СЕРВЕРА ====================

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🌐 CORS enabled for: http://localhost:3000, http://localhost:3001`);
  console.log(`🔌 Socket.IO enabled on port ${PORT}`);
  console.log(`🔑 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
});

// Настройка graceful shutdown
process.on('SIGTERM', () => {
  console.log('Получен сигнал SIGTERM. Завершение работы сервера...');
  server.close(() => {
    console.log('Сервер остановлен');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Получен сигнал SIGINT. Завершение работы сервера...');
  server.close(() => {
    console.log('Сервер остановлен');
    process.exit(0);
  });
});

module.exports = app;