const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');

// Настройка multer для скриншотов
const screenshotsDir = path.join(__dirname, '../uploads/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
  console.log('📁 Created screenshots directory:', screenshotsDir);
}

const screenshotUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, screenshotsDir);
    },
    filename: function (req, file, cb) {
      const username = req.body.username || 'unknown';
      const timestamp = req.body.timestamp || Date.now();
      const dateStr = new Date(timestamp).toISOString().split('T')[0];
      const timeStr = new Date(timestamp).toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
      const filename = `screenshot_${username}_${dateStr}_${timeStr}.jpg`;
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    console.log('📸 [screenshot-upload] File filter check:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    // Принимаем файлы с правильными расширениями или правильными mimetypes
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (validMimeTypes.includes(file.mimetype) || validExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      console.error('❌ [screenshot-upload] Invalid file type:', file.mimetype, fileExtension);
      cb(new Error(`Only JPEG and PNG images are allowed. Received: ${file.mimetype}, extension: ${fileExtension}`), false);
    }
  }
});

// Используем тот же API-ключ, что и для удалённого учёта времени
// Захардкожен для совместимости с клиентскими скриптами
const REMOTE_WORKTIME_API_KEY = 'BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA=';

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
    // Логируем что пришло для отладки
    console.log('📥 Received activity-log-batch request');
    console.log('📥 Content-Type:', req.get('Content-Type'));
    console.log('📥 Body type:', typeof req.body);
    console.log('📥 Body is array:', Array.isArray(req.body));
    console.log('📥 Body keys:', req.body ? Object.keys(req.body).slice(0, 10) : 'null');
    console.log('📥 Body preview:', JSON.stringify(req.body).substring(0, 500));
    
    // Получаем события из запроса
    const events = Array.isArray(req.body) ? req.body : req.body?.events || [];
    
    // Логируем первые несколько событий для проверки кодировки
    if (events.length > 0) {
      console.log('📥 First event windowTitle:', events[0].windowTitle);
      console.log('📥 First event windowTitle bytes:', Buffer.from(events[0].windowTitle || '', 'utf8').toString('hex').substring(0, 100));
    }

    if (!events || events.length === 0) {
      console.log('❌ No events found in request');
      return res.status(400).json({
        success: false,
        error: 'No events provided. Send array of events or { events: [...] }',
      });
    }
    
    console.log(`✅ Found ${events.length} events in request`);

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
        browserUrl: (e.browserUrl || e.url || '').toString().slice(0, 512),
      }))
      .filter((e) => e.username && e.timestamp);
    
    // Логируем события с browserUrl для отладки
    const eventsWithBrowserUrl = sanitized.filter(e => e.browserUrl && e.browserUrl.trim() !== '');
    if (eventsWithBrowserUrl.length > 0) {
      console.log(`📊 [activity-log-batch] Событий с browserUrl: ${eventsWithBrowserUrl.length} из ${sanitized.length}`);
      console.log(`📊 [activity-log-batch] Пример browserUrl:`, eventsWithBrowserUrl[0].browserUrl.substring(0, 100));
    } else if (sanitized.length > 0) {
      console.log(`⚠️ [activity-log-batch] НЕТ событий с browserUrl из ${sanitized.length} событий`);
      const firstEvent = sanitized[0];
      console.log(`⚠️ [activity-log-batch] Первое событие:`, {
        username: firstEvent.username,
        procName: firstEvent.procName,
        windowTitle: firstEvent.windowTitle?.substring(0, 50),
        browserUrl: firstEvent.browserUrl || '(empty)',
        rawEventKeys: Object.keys(events[0] || {}),
        rawEventBrowserUrl: events[0]?.browserUrl || '(not in raw)'
      });
    }

    if (!sanitized.length) {
      return res.status(400).json({
        success: false,
        error: 'No valid events after normalization',
      });
    }

    const inserted = await db.addActivityLogsBatch(sanitized);

    // Отправляем обновление через WebSocket для обновления в реальном времени
    if (global.io && sanitized.length > 0) {
      // Группируем по username и дате для отправки обновлений
      const updatesByUser = {};
      sanitized.forEach(event => {
        if (event.username && event.timestamp) {
          const date = new Date(event.timestamp).toISOString().split('T')[0];
          const key = `${event.username}_${date}`;
          if (!updatesByUser[key]) {
            updatesByUser[key] = {
              username: event.username,
              date: date
            };
          }
        }
      });
      
      // Отправляем обновления для каждого пользователя и даты
      Object.values(updatesByUser).forEach(update => {
        global.io.emit('activity_data_updated', {
          username: update.username,
          date: update.date,
          count: inserted
        });
        console.log(`📡 [activity-log-batch] Emitted activity_data_updated for ${update.username} on ${update.date}`);
      });
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
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
    
    // Логируем для отладки
    console.log(`📊 [activity-summary] Запрос: start=${start}, end=${end}`);
    console.log(`📊 [activity-summary] Найдено логов в базе: ${logs.length}`);
    if (logs.length > 0) {
      console.log(`📊 [activity-summary] Первый лог: username=${logs[0].username}, timestamp=${logs[0].timestamp}, windowTitle=${logs[0].window_title?.substring(0, 50)}`);
    }

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

    // Подтягиваем ФИО из таблицы users, чтобы в отчётах видеть русские имена
    const usernames = Object.keys(perUser);
    const fioByUsername = {};

    for (const u of usernames) {
      try {
        const userRow = await db.getUserByUsername(u);
        if (userRow && userRow.fio) {
          fioByUsername[u] = userRow.fio;
        }
      } catch (e) {
        // Не падаем, если что-то пошло не так с конкретным пользователем
        console.error('Ошибка при получении ФИО для пользователя', u, e);
      }
    }

    // Приводим к массиву и добавляем topApps + fio
    const summary = Object.values(perUser).map((u) => {
      const appsArray = Object.entries(u.apps)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, minutes]) => ({ name, minutes }));

      return {
        username: u.username,
        fio: fioByUsername[u.username] || null,
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

// Приём скриншотов от агентов на ПК
router.post('/activity-screenshot', authenticateActivityRequest, (req, res, next) => {
  console.log('📸 [activity-screenshot] Received request:', {
    contentType: req.get('Content-Type'),
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    username: req.body?.username
  });
  next();
}, screenshotUpload.single('screenshot'), async (req, res) => {
  try {
    console.log('📸 [activity-screenshot] After multer:', {
      hasFile: !!req.file,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : null,
      body: req.body
    });
    
    if (!req.file) {
      console.error('❌ [activity-screenshot] No file received');
      return res.status(400).json({
        success: false,
        error: 'Screenshot file is required',
      });
    }

    const username = req.body.username?.trim();
    const timestamp = req.body.timestamp || new Date().toISOString();

    if (!username) {
      // Удаляем загруженный файл, если нет username
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Username is required',
      });
    }

    // Сохраняем информацию о скриншоте в базу данных
    const screenshotPath = req.file.path;
    const fileSize = req.file.size;

    await db.addActivityScreenshot({
      username,
      timestamp,
      filePath: screenshotPath,
      fileSize,
    });

    console.log(`📸 Screenshot saved: ${username} at ${timestamp} (${fileSize} bytes)`);

    // Отправляем обновление через WebSocket для обновления в реальном времени
    if (global.io) {
      const date = new Date(timestamp).toISOString().split('T')[0];
      const fileName = path.basename(screenshotPath);
      const screenshotUrl = `/uploads/screenshots/${fileName}`;
      
      global.io.emit('activity_screenshot_added', {
        username: username,
        date: date,
        timestamp: timestamp,
        filePath: screenshotPath,
        fileName: fileName,
        url: screenshotUrl,
        fileSize: fileSize
      });
      console.log(`📡 [activity-screenshot] Emitted activity_screenshot_added for ${username} on ${date}`);
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: true,
      message: 'Screenshot saved successfully',
      filePath: screenshotPath,
      fileSize,
    });
  } catch (error) {
    console.error('❌ Error in /activity-screenshot:', error);
    
    // Удаляем файл при ошибке
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('❌ Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить URL-адреса и скриншоты для конкретного пользователя за период
router.get('/activity-details', async (req, res) => {
  try {
    const { username, start, end } = req.query;

    if (!username || !start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Username, start date, and end date are required',
      });
    }

    console.log(`📊 [activity-details] Запрос для username=${username}, start=${start}, end=${end}`);
    
    // Получаем URL-адреса из activity_logs
    const activityLogs = await db.getActivityLogsBetween({ start, end });
    console.log(`📊 [activity-details] Получено ${activityLogs.length} логов из базы`);
    
    // Логируем первые несколько логов для отладки
    const userLogs = activityLogs.filter(log => log.username === username);
    console.log(`📊 [activity-details] Логов для пользователя ${username}: ${userLogs.length}`);
    if (userLogs.length > 0) {
      const withUrls = userLogs.filter(log => log.browser_url && log.browser_url.trim() !== '');
      console.log(`📊 [activity-details] Логов с URL: ${withUrls.length}`);
      if (withUrls.length > 0) {
        console.log(`📊 [activity-details] Пример URL:`, withUrls[0].browser_url);
      }
    }
    
    // Получаем URL-адреса (только с browserUrl)
    const urls = activityLogs
      .filter(log => log.username === username && log.browser_url && log.browser_url.trim() !== '')
      .map(log => ({
        url: log.browser_url,
        timestamp: log.timestamp,
        windowTitle: log.window_title || '',
        procName: log.proc_name || '',
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Получаем приложения (программы) - только НЕ-браузеры без browser_url
    // Исключаем браузеры и записи с browser_url (они уже в разделе "Сайты")
    const browserProcessNames = ['chrome', 'msedge', 'firefox', 'opera', 'brave', 'safari', 'yandex'];
    
    // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ
    const userLogs = activityLogs.filter(log => log.username === username);
    console.log(`🔍 [activity-details] Всего логов для ${username}: ${userLogs.length}`);
    console.log(`🔍 [activity-details] Логов с proc_name: ${userLogs.filter(l => l.proc_name && l.proc_name.trim() !== '').length}`);
    console.log(`🔍 [activity-details] Логов с browser_url: ${userLogs.filter(l => l.browser_url && l.browser_url.trim() !== '').length}`);
    console.log(`🔍 [activity-details] Логов без browser_url: ${userLogs.filter(l => !l.browser_url || l.browser_url.trim() === '').length}`);
    
    // Показываем примеры proc_name
    const uniqueProcNames = [...new Set(userLogs.map(l => l.proc_name).filter(p => p && p.trim() !== ''))];
    console.log(`🔍 [activity-details] Уникальных proc_name: ${uniqueProcNames.length}`);
    if (uniqueProcNames.length > 0) {
      console.log(`🔍 [activity-details] Примеры proc_name (первые 10):`, uniqueProcNames.slice(0, 10));
    }
    
    const applications = activityLogs
      .filter(log => {
        if (log.username !== username) return false;
        if (!log.proc_name || log.proc_name.trim() === '') return false;
        // Исключаем записи с browser_url (они в разделе "Сайты")
        if (log.browser_url && log.browser_url.trim() !== '') return false;
        // Исключаем браузеры даже без URL
        const procNameLower = log.proc_name.toLowerCase();
        const isBrowser = browserProcessNames.some(browser => procNameLower.includes(browser));
        if (isBrowser) return false;
        return true;
      })
      .map(log => ({
        procName: log.proc_name,
        windowTitle: log.window_title || '',
        timestamp: log.timestamp,
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    console.log(`📊 [activity-details] Приложений для пользователя ${username}: ${applications.length}`);
    if (applications.length > 0) {
      console.log(`📊 [activity-details] Примеры приложений:`, applications.slice(0, 5).map(a => a.procName));
    } else {
      console.warn(`⚠️ [activity-details] НЕТ ПРИЛОЖЕНИЙ! Проверьте фильтрацию выше.`);
      // Показываем, что было отфильтровано
      const filteredOut = userLogs.filter(log => {
        if (!log.proc_name || log.proc_name.trim() === '') return true;
        if (log.browser_url && log.browser_url.trim() !== '') return true;
        const procNameLower = log.proc_name.toLowerCase();
        return browserProcessNames.some(browser => procNameLower.includes(browser));
      });
      console.log(`⚠️ [activity-details] Отфильтровано записей: ${filteredOut.length}`);
      if (filteredOut.length > 0) {
        const uniqueFiltered = [...new Set(filteredOut.map(l => l.proc_name).filter(p => p))];
        console.log(`⚠️ [activity-details] Отфильтрованные proc_name (примеры):`, uniqueFiltered.slice(0, 10));
      }
    }

    // Получаем скриншоты
    const screenshots = await db.getActivityScreenshots({ username, start, end });
    console.log(`📊 [activity-details] Получено ${screenshots.length} скриншотов для пользователя ${username}`);

    // Формируем пути для доступа к файлам
    const screenshotsWithUrl = screenshots.map(shot => {
      // Извлекаем имя файла из полного пути
      let fileName = path.basename(shot.file_path);
      // Если путь уже содержит имя файла, используем его
      // Иначе формируем имя из timestamp
      if (!fileName || fileName === '' || fileName === '/') {
        const ts = new Date(shot.timestamp);
        fileName = `screenshot_${username}_${ts.toISOString().split('T')[0]}_${ts.toISOString().split('T')[1].replace(/[:.]/g, '-').split('.')[0]}.jpg`;
      }
      
      // Убеждаемся, что путь правильный - удаляем все префиксы путей, оставляем только имя файла
      fileName = fileName.replace(/^.*[\/\\]/, ''); // Убираем все пути перед именем файла
      
      // Формируем URL для доступа к файлу
      const screenshotUrl = `/uploads/screenshots/${fileName}`;
      
      console.log(`📸 [activity-details] Screenshot mapping:`, {
        id: shot.id,
        file_path: shot.file_path,
        fileName,
        url: screenshotUrl
      });
      
      return {
        id: shot.id,
        timestamp: shot.timestamp,
        filePath: shot.file_path,
        fileSize: shot.file_size,
        // URL для доступа к файлу (будет обслуживаться через статический сервер)
        url: screenshotUrl,
      };
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: true,
      urls: urls,
      applications: applications,  // Добавляем список всех приложений
      screenshots: screenshotsWithUrl,
    });
  } catch (error) {
    console.error('❌ Error in /activity-details:', error);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;


