const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const authenticateToken = require('../middleware/authenticateToken');

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
      
      // Отправляем отдельные события для URLs и приложений для динамического обновления счетчиков
      sanitized.forEach(event => {
        if (event.username && event.timestamp) {
          const date = new Date(event.timestamp).toISOString().split('T')[0];
          
          // Если есть browserUrl - это URL
          if (event.browserUrl && event.browserUrl.trim() !== '') {
            global.io.emit('activity_url_added', {
              username: event.username,
              date: date,
              timestamp: event.timestamp,
              url: event.browserUrl,
              windowTitle: event.windowTitle
            });
          }
          
          // Если есть procName - это приложение
          if (event.procName && event.procName.trim() !== '') {
            global.io.emit('activity_application_added', {
              username: event.username,
              date: date,
              timestamp: event.timestamp,
              procName: event.procName,
              windowTitle: event.windowTitle
            });
          }
        }
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
        file_path: screenshotPath, // Дублируем для совместимости
        fileName: fileName,
        file_name: fileName, // Дублируем для совместимости
        url: screenshotUrl,
        fileSize: fileSize,
        file_size: fileSize // Дублируем для совместимости
      });
      console.log(`📡 [activity-screenshot] Emitted activity_screenshot_added for ${username} on ${date}`, {
        username,
        date,
        url: screenshotUrl,
        fileName
      });
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

    console.log(`📊 [activity-details] Запрос для username="${username}", start=${start}, end=${end}`);
    
    // Получаем URL-адреса из activity_logs
    const activityLogs = await db.getActivityLogsBetween({ start, end });
    console.log(`📊 [activity-details] Получено ${activityLogs.length} логов из базы`);
    
    // Проверяем уникальные username в логах для диагностики
    const uniqueUsernames = [...new Set(activityLogs.map(log => log.username).filter(u => u))];
    console.log(`🔍 [activity-details] Уникальные username в логах (первые 10):`, uniqueUsernames.slice(0, 10));
    console.log(`🔍 [activity-details] Ищем совпадение для username="${username}" (точное совпадение)`);
    
    // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ
    const userLogs = activityLogs.filter(log => log.username === username);
    console.log(`🔍 [activity-details] Всего логов для "${username}": ${userLogs.length}`);
    console.log(`🔍 [activity-details] Логов с proc_name: ${userLogs.filter(l => l.proc_name && l.proc_name.trim() !== '').length}`);
    console.log(`🔍 [activity-details] Логов с browser_url: ${userLogs.filter(l => l.browser_url && l.browser_url.trim() !== '').length}`);
    console.log(`🔍 [activity-details] Логов без browser_url: ${userLogs.filter(l => !l.browser_url || l.browser_url.trim() === '').length}`);
    
    // Показываем примеры proc_name
    const uniqueProcNames = [...new Set(userLogs.map(l => l.proc_name).filter(p => p && p.trim() !== ''))];
    console.log(`🔍 [activity-details] Уникальных proc_name: ${uniqueProcNames.length}`);
    if (uniqueProcNames.length > 0) {
      console.log(`🔍 [activity-details] Примеры proc_name (первые 10):`, uniqueProcNames.slice(0, 10));
    }
    
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
      .sort((a, b) => {
        // Сортируем по времени (новые сверху, как для приложений)
        // Безопасная обработка дат
        const parseDate = (ts) => {
          if (!ts) return 0;
          const date = new Date(ts);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        };
        const timeA = parseDate(a.timestamp);
        const timeB = parseDate(b.timestamp);
        return timeB - timeA; // Убывание (новые сверху)
      });
    
    // Получаем приложения (программы) - только НЕ-браузеры без browser_url
    // Исключаем браузеры и записи с browser_url (они уже в разделе "Сайты")
    const browserProcessNames = ['chrome', 'msedge', 'firefox', 'opera', 'brave', 'safari', 'yandex'];
    
    // ДЕТАЛЬНАЯ ДИАГНОСТИКА: показываем, что фильтруется
    const userLogsWithProcName = userLogs.filter(log => log.proc_name && log.proc_name.trim() !== '');
    const logsWithBrowserUrl = userLogsWithProcName.filter(log => log.browser_url && log.browser_url.trim() !== '');
    const logsWithoutBrowserUrl = userLogsWithProcName.filter(log => !log.browser_url || log.browser_url.trim() === '');
    const logsIdentifiedAsBrowsers = logsWithoutBrowserUrl.filter(log => {
      const procNameLower = log.proc_name.toLowerCase();
      return browserProcessNames.some(browser => procNameLower.includes(browser));
    });
    
    console.log(`🔍 [activity-details] ДИАГНОСТИКА ФИЛЬТРАЦИИ для ${username}:`);
    console.log(`  - Всего логов: ${userLogs.length}`);
    console.log(`  - Логов с proc_name: ${userLogsWithProcName.length}`);
    console.log(`  - Логов с browser_url (пойдут в "Сайты"): ${logsWithBrowserUrl.length}`);
    console.log(`  - Логов БЕЗ browser_url: ${logsWithoutBrowserUrl.length}`);
    console.log(`  - Из них идентифицированы как браузеры: ${logsIdentifiedAsBrowsers.length}`);
    
    if (logsWithoutBrowserUrl.length > 0) {
      const nonBrowserLogs = logsWithoutBrowserUrl.filter(log => {
        const procNameLower = log.proc_name.toLowerCase();
        return !browserProcessNames.some(browser => procNameLower.includes(browser));
      });
      console.log(`  - НЕ-браузеров (должны быть в "Приложения"): ${nonBrowserLogs.length}`);
      if (nonBrowserLogs.length > 0) {
        const uniqueNonBrowsers = [...new Set(nonBrowserLogs.map(l => l.proc_name))];
        console.log(`  - Уникальных НЕ-браузеров: ${uniqueNonBrowsers.length}`);
        console.log(`  - Примеры НЕ-браузеров (первые 20):`, uniqueNonBrowsers.slice(0, 20));
      }
    }
    
    const allApplications = activityLogs
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
      }));
    
    console.log(`📊 [activity-details] Всего записей приложений для ${username}: ${allApplications.length}`);
    
    // НЕ дедуплицируем - показываем все события открытия/переключения приложений
    // Сортируем по времени (новые сверху, как для сайтов)
    const applications = allApplications
      .sort((a, b) => {
        // Сортируем по времени (новые сверху)
        // Безопасная обработка дат
        const parseDate = (ts) => {
          if (!ts) return 0;
          const date = new Date(ts);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        };
        const timeA = parseDate(a.timestamp);
        const timeB = parseDate(b.timestamp);
        return timeB - timeA; // Убывание (новые сверху)
      });
    
    console.log(`📊 [activity-details] Всего событий приложений для пользователя ${username}: ${applications.length}`);
    if (applications.length > 0) {
      console.log(`📊 [activity-details] Примеры событий приложений (первые 10):`, applications.slice(0, 10).map(a => ({ procName: a.procName, timestamp: a.timestamp, windowTitle: a.windowTitle?.substring(0, 30) || '' })));
      console.log(`📊 [activity-details] Все события приложений (первые 20):`, applications.slice(0, 20).map(a => ({ procName: a.procName, windowTitle: a.windowTitle?.substring(0, 30) || '', timestamp: a.timestamp })));
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
    console.log(`📸 [activity-details] Запрос скриншотов для ${username}, период: ${start} - ${end}`);
    const screenshots = await db.getActivityScreenshots({ username, start, end });
    console.log(`📊 [activity-details] Получено ${screenshots.length} скриншотов для пользователя ${username} за период ${start} - ${end}`);
    if (screenshots.length > 0) {
      console.log(`📸 [activity-details] Первые 3 скриншота из БД:`, screenshots.slice(0, 3).map(s => ({
        id: s.id,
        timestamp: s.timestamp,
        file_path: s.file_path
      })));
    } else {
      console.warn(`⚠️ [activity-details] Скриншоты не найдены для ${username} за период ${start} - ${end}`);
      // Проверяем, есть ли вообще скриншоты для этого пользователя
      const allScreenshots = await db.getActivityScreenshots({ username });
      console.log(`📸 [activity-details] Всего скриншотов для ${username} (без фильтра по дате): ${allScreenshots.length}`);
      if (allScreenshots.length > 0) {
        console.log(`📸 [activity-details] Примеры дат скриншотов:`, allScreenshots.slice(0, 5).map(s => {
          try {
            if (!s.timestamp) return { timestamp: s.timestamp, date: 'N/A' };
            const date = new Date(s.timestamp);
            return {
              timestamp: s.timestamp,
              date: isNaN(date.getTime()) ? 'Invalid' : date.toISOString().split('T')[0]
            };
          } catch (e) {
            return { timestamp: s.timestamp, date: 'Error' };
          }
        }));
      }
    }

    // Формируем пути для доступа к файлам
    const screenshotsWithUrl = screenshots.map(shot => {
      try {
        // Извлекаем имя файла из полного пути
        let fileName = path.basename(shot.file_path);
        console.log(`📸 [activity-details] Обработка скриншота:`, {
          id: shot.id,
          file_path: shot.file_path,
          basename: fileName,
          timestamp: shot.timestamp
        });
        
        // Если путь уже содержит имя файла, используем его
        // Иначе формируем имя из timestamp
        if (!fileName || fileName === '' || fileName === '/') {
          try {
            // Исправляем невалидный формат timestamp (например, '2025-11-28T18:52:24:.027Z' -> '2025-11-28T18:52:24.027Z')
            let fixedTimestamp = shot.timestamp;
            if (fixedTimestamp && typeof fixedTimestamp === 'string') {
              // Исправляем формат с лишней точкой перед миллисекундами
              fixedTimestamp = fixedTimestamp.replace(/T(\d{2}):(\d{2}):(\d{2}):\.(\d+)/, 'T$1:$2:$3.$4');
            }
            
            const ts = new Date(fixedTimestamp);
            if (isNaN(ts.getTime())) {
              // Если timestamp невалидный, используем текущую дату
              console.warn(`⚠️ [activity-details] Невалидный timestamp для скриншота ${shot.id}: ${shot.timestamp} (исправлен: ${fixedTimestamp})`);
              const now = new Date();
              fileName = `screenshot_${username}_${now.toISOString().split('T')[0]}_${now.toISOString().split('T')[1].replace(/[:.]/g, '-').split('.')[0]}.jpg`;
            } else {
              fileName = `screenshot_${username}_${ts.toISOString().split('T')[0]}_${ts.toISOString().split('T')[1].replace(/[:.]/g, '-').split('.')[0]}.jpg`;
            }
            console.log(`📸 [activity-details] Сгенерировано имя файла из timestamp:`, fileName);
          } catch (e) {
            console.error(`❌ [activity-details] Ошибка обработки timestamp для скриншота ${shot.id}:`, e.message);
            const now = new Date();
            fileName = `screenshot_${username}_${now.toISOString().split('T')[0]}_${now.toISOString().split('T')[1].replace(/[:.]/g, '-').split('.')[0]}.jpg`;
          }
        }
        
        // Убеждаемся, что путь правильный - удаляем все префиксы путей, оставляем только имя файла
        fileName = fileName.replace(/^.*[\/\\]/, ''); // Убираем все пути перед именем файла
        
        // Проверяем, существует ли файл
        const fullPath = path.join(screenshotsDir, fileName);
        const fileExists = fs.existsSync(fullPath);
        console.log(`📸 [activity-details] Проверка файла:`, {
          fileName,
          fullPath,
          exists: fileExists
        });
        
        // Формируем URL для доступа к файлу
        const screenshotUrl = `/uploads/screenshots/${fileName}`;
        
        console.log(`📸 [activity-details] Screenshot mapping:`, {
          id: shot.id,
          file_path: shot.file_path,
          fileName,
          url: screenshotUrl,
          fileExists,
          fileSize: shot.file_size
        });
        
        return {
          id: shot.id,
          timestamp: shot.timestamp,
          filePath: shot.file_path,
          fileSize: shot.file_size,
          // URL для доступа к файлу (будет обслуживаться через статический сервер)
          url: screenshotUrl,
        };
      } catch (e) {
        console.error(`❌ [activity-details] Критическая ошибка при обработке скриншота ${shot.id}:`, e);
        // Возвращаем минимальный объект, чтобы не сломать весь ответ
        return {
          id: shot.id,
          timestamp: shot.timestamp || null,
          filePath: shot.file_path || '',
          fileSize: shot.file_size || 0,
          url: '',
          error: 'Ошибка обработки'
        };
      }
    });

    // ФИНАЛЬНОЕ ЛОГИРОВАНИЕ ПЕРЕД ОТПРАВКОЙ ОТВЕТА
    console.log(`🚀 [activity-details] ОТПРАВЛЯЕМ ОТВЕТ для ${username}:`);
    console.log(`  - URLs: ${urls?.length || 0}`);
    console.log(`  - Applications: ${applications?.length || 0}`);
    console.log(`  - Screenshots: ${screenshotsWithUrl?.length || 0}`);
    if (applications && applications.length > 0) {
      console.log(`  - Первые 5 приложений в ответе:`, applications.slice(0, 5).map(a => ({ procName: a.procName, windowTitle: a.windowTitle?.substring(0, 30) || '' })));
    } else {
      console.warn(`  ⚠️ [activity-details] ПУСТОЙ МАССИВ ПРИЛОЖЕНИЙ В ОТВЕТЕ!`);
    }
    
    // Детальное логирование скриншотов
    if (screenshotsWithUrl && screenshotsWithUrl.length > 0) {
      console.log(`📸 [activity-details] Первые 5 скриншотов в ответе:`, screenshotsWithUrl.slice(0, 5).map(s => ({
        id: s.id,
        url: s.url,
        filePath: s.filePath,
        timestamp: s.timestamp,
        fileSize: s.fileSize
      })));
      console.log(`📸 [activity-details] Всего скриншотов в ответе: ${screenshotsWithUrl.length}`);
    } else {
      console.warn(`  ⚠️ [activity-details] ПУСТОЙ МАССИВ СКРИНШОТОВ В ОТВЕТЕ!`);
      console.warn(`  ⚠️ [activity-details] Проверка: screenshots из БД = ${screenshots?.length || 0}, screenshotsWithUrl = ${screenshotsWithUrl?.length || 0}`);
    }
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const responseData = {
      success: true,
      urls: urls,
      applications: applications,  // Добавляем список всех приложений
      screenshots: screenshotsWithUrl,
    };
    console.log(`📤 [activity-details] Размер ответа (приблизительно):`, JSON.stringify(responseData).length, 'байт');
    console.log(`📤 [activity-details] Скриншоты в JSON ответе:`, JSON.stringify(responseData.screenshots?.slice(0, 2) || []));
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error in /activity-details:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      username: req.query?.username,
      start: req.query?.start,
      end: req.query?.end
    });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Invalid time value',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Endpoint для очистки данных активности
router.delete('/activity-logs/clear', authenticateToken, async (req, res) => {
  console.log('🗑️ [activity-logs/clear] ========== REQUEST RECEIVED ==========');
  console.log('🗑️ [activity-logs/clear] Method:', req.method);
  console.log('🗑️ [activity-logs/clear] Path:', req.path);
  console.log('🗑️ [activity-logs/clear] Body:', JSON.stringify(req.body));
  console.log('🗑️ [activity-logs/clear] Headers:', JSON.stringify(req.headers));
  try {
    const { period, start, end } = req.body; // period: 'day', 'week', 'month' ИЛИ start/end: 'YYYY-MM-DD'
    const user = req.user; // Получаем пользователя из токена
    console.log('🗑️ [activity-logs/clear] User from token:', user ? { username: user.username, role: user.role } : 'null');
    
    // Проверка прав: только HR или Admin могут очищать данные
    if (!user || (user.role !== 'hr' && user.role !== 'admin')) {
      console.warn(`🚫 [activity-logs/clear] Пользователь ${user?.username} (роль: ${user?.role}) попытался очистить логи без прав.`);
      return res.status(403).json({ success: false, error: 'Недостаточно прав для выполнения операции' });
    }
    
    // Проверяем, что передан либо period, либо start/end
    if (!period && (!start || !end)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать либо period (day/week/month), либо start и end (YYYY-MM-DD)' 
      });
    }
    
    if (period && !['day', 'week', 'month'].includes(period)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Неверный период. Допустимые значения: day, week, month.' 
      });
    }
    
    console.log(`🗑️ [activity-logs/clear] Пользователь ${user.username} (роль: ${user.role}) очищает логи:`, { period, start, end });
    console.log(`🗑️ [activity-logs/clear] Типы параметров:`, { period: typeof period, start: typeof start, end: typeof end });
    console.log(`🗑️ [activity-logs/clear] Значения параметров:`, JSON.stringify({ period, start, end }));
    const deletedCount = await db.deleteActivityLogs({ period, start, end });
    console.log(`✅ [activity-logs/clear] Удалено ${deletedCount} записей активности`);
    console.log(`🗑️ [activity-logs/clear] Результат удаления:`, { deletedCount, period, start, end });
    
    let message;
    if (period) {
      message = `Удалено ${deletedCount} записей активности за ${period === 'day' ? 'день' : period === 'week' ? 'неделю' : 'месяц'}`;
    } else {
      message = `Удалено ${deletedCount} записей активности за период с ${start} по ${end}`;
    }
    
    res.json({ 
      success: true, 
      deletedCount,
      period,
      start,
      end,
      message
    });
  } catch (error) {
    console.error('❌ [activity-logs/clear] Ошибка при очистке логов активности:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;


