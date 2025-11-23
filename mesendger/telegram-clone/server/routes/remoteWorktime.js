const express = require('express');
const router = express.Router();
const db = require('../database');

// API ключ для аутентификации удаленных запросов
// Hardcoded for consistency with client scripts
const REMOTE_WORKTIME_API_KEY = 'BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA=';

// Middleware для проверки API ключа
const authenticateRemoteRequest = (req, res, next) => {
  // Проверяем заголовок в разных регистрах (HTTP заголовки case-insensitive, но Express приводит к нижнему регистру)
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.query.apiKey;
  
  // Логируем для отладки (только если ключ не совпадает)
  if (!apiKey) {
    console.log('[REMOTE-WORKTIME] No API key provided. Headers:', Object.keys(req.headers).filter(k => k.toLowerCase().includes('api')));
    return res.status(401).json({ 
      success: false, 
      error: 'API key required. Provide it in header: X-API-Key or query parameter: apiKey' 
    });
  }
  
  if (apiKey !== REMOTE_WORKTIME_API_KEY) {
    console.log(`[REMOTE-WORKTIME] Invalid API key. Expected: ${REMOTE_WORKTIME_API_KEY.substring(0, 10)}..., Received: ${apiKey.substring(0, 10)}...`);
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid API key' 
    });
  }
  
  next();
};

// Функция для нормализации имени пользователя
function normalizeUsername(raw) {
  if (!raw) return '';
  let username = String(raw).replace(/^"|"$/g, '').trim();
  const bsIndex = username.lastIndexOf('\\');
  if (bsIndex !== -1) username = username.slice(bsIndex + 1);
  return username;
}

// Фильтр технических аккаунтов
const TECHNICAL_USERS_LOWER = new Set([
  'system', 'система',
  'local service', 'network service',
  'anonymous logon', 'defaultaccount', 'wdagutilityaccount',
  'umfd', 'dwm'
]);

function isTechnicalAccount(raw) {
  const username = normalizeUsername(raw);
  if (!username) return true;
  const lower = username.toLowerCase();
  if (TECHNICAL_USERS_LOWER.has(lower)) return true;
  if (/^dwm-\d+$/i.test(username)) return true;
  if (/^umfd-\d+$/i.test(username)) return true;
  if (/\$$/.test(username)) return true; // machine accounts ending with $
  return false;
}

// Функция для конвертации формата даты из DD.MM.YYYY HH:mm:ss в YYYY-MM-DD HH:mm:ss
function convertDateFormat(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Убираем кавычки и лишние пробелы
    const cleanDate = dateStr.replace(/^"|"$/g, '').trim();
    
    // Проверяем формат DD.MM.YYYY HH:mm:ss
    const match = cleanDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    if (match) {
      const [, day, month, year, hour, minute, second] = match;
      // Форматируем в YYYY-MM-DD HH:mm:ss с ведущими нулями
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
    }
    
    // Если формат уже правильный (YYYY-MM-DD HH:mm:ss), возвращаем как есть
    if (cleanDate.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/)) {
      return cleanDate;
    }
    
    console.warn('Неизвестный формат даты:', cleanDate);
    return cleanDate; // Возвращаем как есть, если не можем распознать
  } catch (error) {
    console.error('Ошибка конвертации даты:', error, 'Исходная дата:', dateStr);
    return dateStr;
  }
}

// Endpoint для приема одного события рабочего времени с удаленного ПК
router.post('/remote-worktime', authenticateRemoteRequest, async (req, res) => {
  try {
    const { username, event_type, event_time, event_id } = req.body;
    
    if (!username || !event_type || !event_time) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: username, event_type, event_time' 
      });
    }
    
    // Нормализуем имя пользователя
    const normalizedUsername = normalizeUsername(username);
    
    // Пропускаем технические аккаунты
    if (isTechnicalAccount(normalizedUsername)) {
      return res.json({ 
        success: true, 
        skipped: true, 
        reason: 'Technical account skipped',
        username: normalizedUsername 
      });
    }
    
    // Конвертируем формат даты
    const convertedTime = convertDateFormat(event_time);
    if (!convertedTime) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid event_time format' 
      });
    }
    
    // Определяем event_id если не указан
    let finalEventId = event_id;
    if (!finalEventId) {
      finalEventId = event_type === 'logout' ? 4634 : 4624;
    }
    
        // Добавляем в отдельную таблицу для удаленных ПК
        await db.addRemoteWorkTimeLog({
          username: normalizedUsername,
          event_type: event_type.toLowerCase(),
          event_time: convertedTime,
          event_id: finalEventId
        });
        
        console.log(`✅ Remote worktime log added: ${normalizedUsername} - ${event_type} - ${convertedTime}`);
    
    res.json({ 
      success: true, 
      imported: true,
      username: normalizedUsername,
      event_type: event_type.toLowerCase(),
      event_time: convertedTime
    });
  } catch (error) {
    console.error('❌ Error adding remote worktime log:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint для массового приема событий рабочего времени с удаленного ПК
router.post('/remote-worktime-batch', authenticateRemoteRequest, async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : (req.body.events || []);
    
    if (!events || events.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No events provided. Send array of events or { events: [...] }' 
      });
    }
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const errorsList = [];
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      try {
        const { username, event_type, event_time, event_id } = event;
        
        if (!username || !event_type || !event_time) {
          skipped++;
          continue;
        }
        
        // Нормализуем имя пользователя
        const normalizedUsername = normalizeUsername(username);
        
        // Пропускаем технические аккаунты
        if (isTechnicalAccount(normalizedUsername)) {
          skipped++;
          continue;
        }
        
        // Конвертируем формат даты
        const convertedTime = convertDateFormat(event_time);
        if (!convertedTime) {
          skipped++;
          continue;
        }
        
        // Определяем event_id если не указан
        let finalEventId = event_id;
        if (!finalEventId) {
          finalEventId = event_type === 'logout' ? 4634 : 4624;
        }
        
        // Добавляем в отдельную таблицу для удаленных ПК
        await db.addRemoteWorkTimeLog({
          username: normalizedUsername,
          event_type: event_type.toLowerCase(),
          event_time: convertedTime,
          event_id: finalEventId
        });
        
        imported++;
        
      } catch (eventError) {
        errors++;
        errorsList.push({
          index: i,
          error: eventError.message,
          event: event
        });
        
        // Если слишком много ошибок подряд, прерываем импорт
        if (errors > 50) {
          console.error('Слишком много ошибок, прерываем импорт');
          break;
        }
      }
    }
    
    console.log(`✅ Remote batch import completed: ${imported} imported, ${skipped} skipped, ${errors} errors`);
    
    res.json({ 
      success: true, 
      imported, 
      skipped, 
      errors,
      total: events.length,
      errorsList: errorsList.slice(0, 10) // Первые 10 ошибок для отладки
    });
  } catch (error) {
    console.error('❌ Error in remote batch import:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint для проверки подключения (без добавления данных)
router.get('/remote-worktime-health', authenticateRemoteRequest, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Remote worktime API is working',
    timestamp: new Date().toISOString(),
    serverTime: new Date().toISOString()
  });
});

// Endpoint для получения отчета удаленки за определенный период (без API ключа, для веб-интерфейса)
router.get('/remote-worktime-report', async (req, res) => {
  console.log('📊 [REMOTE-WORKTIME-REPORT] Request received:', req.query);
  try {
    const { date, start, end } = req.query;
    
    // Поддерживаем старый формат (date) и новый (start/end)
    let startDate, endDate;
    if (start && end) {
      startDate = start; // Формат: YYYY-MM-DD
      endDate = end; // Формат: YYYY-MM-DD
    } else if (date) {
      // Старый формат - одна дата
      startDate = date;
      endDate = date;
    } else {
      // По умолчанию - вчерашний день
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const defaultDate = yesterday.toISOString().split('T')[0];
      startDate = defaultDate;
      endDate = defaultDate;
    }
    
    // Получаем все логи за указанный период из таблицы удаленных ПК
    const logs = await db.getRemoteWorkTimeLogs({ 
      start: startDate, 
      end: endDate 
    });
    
    // Группируем по пользователям и находим первый вход и последний выход
    const userMap = new Map();
    
    for (const log of logs) {
      const { username, event_type, event_time } = log;
      
      if (!userMap.has(username)) {
        userMap.set(username, {
          username,
          firstLogin: null,
          lastLogout: null,
          events: []
        });
      }
      
      const userData = userMap.get(username);
      userData.events.push({ event_type, event_time });
      
      if (event_type === 'login') {
        if (!userData.firstLogin || new Date(event_time) < new Date(userData.firstLogin)) {
          userData.firstLogin = event_time;
        }
      } else if (event_type === 'logout') {
        if (!userData.lastLogout || new Date(event_time) > new Date(userData.lastLogout)) {
          userData.lastLogout = event_time;
        }
      }
    }
    
    // Получаем ФИО пользователей из таблицы users
    const report = [];
    for (const [username, userData] of userMap) {
      // Получаем информацию о пользователе из таблицы users
      const userInfo = await new Promise((resolve, reject) => {
        db.db.get('SELECT id, fio, username FROM users WHERE username = ?', [username], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }).catch(() => null);
      
      report.push({
        username, // Технический username из remote_work_time_logs
        technicalUsername: username, // Сохраняем технический username отдельно
        fio: userInfo?.fio || username,
        firstLogin: userData.firstLogin,
        lastLogout: userData.lastLogout,
        totalEvents: userData.events.length
      });
    }
    
    // Сортируем по ФИО
    report.sort((a, b) => {
      const fioA = a.fio || a.username;
      const fioB = b.fio || b.username;
      return fioA.localeCompare(fioB, 'ru');
    });
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: true,
      startDate,
      endDate,
      report
    });
  } catch (error) {
    console.error('❌ Error getting remote worktime report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint для получения всех событий конкретного пользователя за период (без API ключа)
router.get('/remote-worktime-user-events', async (req, res) => {
  console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Request received');
  console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Full URL:', req.url);
  console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Query object:', req.query);
  console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Query keys:', Object.keys(req.query));
  console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Query values:', Object.values(req.query));
  
  try {
    // Express автоматически декодирует query параметры, но проверим
    let username = req.query.username || req.query.Username;
    const date = req.query.date || req.query.Date;
    const start = req.query.start || req.query.Start;
    const end = req.query.end || req.query.End;
    
    console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Extracted params:', { 
      username, 
      usernameType: typeof username, 
      usernameLength: username ? username.length : 0,
      date, 
      start, 
      end 
    });
    
    // Декодируем username из URL (может быть закодирован кириллицей)
    if (username) {
      try {
        // Проверяем, нужно ли декодировать (если содержит %)
        if (username.includes('%')) {
          username = decodeURIComponent(username);
          console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Username decoded:', username);
        }
      } catch (e) {
        console.warn('⚠️ [REMOTE-WORKTIME-USER-EVENTS] Error decoding username:', e);
      }
    }
    
    console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Final params:', { username, date, start, end });
    
    // Поддерживаем старый формат (date) и новый (start/end)
    let startDate, endDate;
    if (start && end) {
      startDate = start;
      endDate = end;
    } else if (date) {
      startDate = date;
      endDate = date;
    } else {
      console.error('❌ [REMOTE-WORKTIME-USER-EVENTS] Missing date parameters');
      console.error('❌ [REMOTE-WORKTIME-USER-EVENTS] start:', start, 'end:', end, 'date:', date);
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать либо date, либо start и end'
      });
    }
    
    if (!username || (typeof username === 'string' && username.trim() === '')) {
      console.error('❌ [REMOTE-WORKTIME-USER-EVENTS] Missing or empty username');
      console.error('❌ [REMOTE-WORKTIME-USER-EVENTS] username value:', username);
      console.error('❌ [REMOTE-WORKTIME-USER-EVENTS] username type:', typeof username);
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      });
    }
    
    console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Query params:', { username, startDate, endDate });
    
    // Получаем все логи пользователя за указанный период из таблицы удаленных ПК
    // Пробуем искать по декодированному username (на случай, если передали ФИО)
    let logs = await db.getRemoteWorkTimeLogs({
      start: startDate,
      end: endDate,
      username: username
    });
    
    // Если не найдено по username, пробуем найти по ФИО из таблицы users
    if (!logs || logs.length === 0) {
      console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Не найдено по username, пробуем найти по ФИО...');
      const userByFio = await new Promise((resolve, reject) => {
        db.db.get('SELECT username FROM users WHERE fio = ?', [username], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }).catch(() => null);
      
      if (userByFio && userByFio.username) {
        console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Найден пользователь по ФИО:', userByFio.username);
        const logsByUsername = await db.getRemoteWorkTimeLogs({
          start: startDate,
          end: endDate,
          username: userByFio.username
        });
        if (logsByUsername && logsByUsername.length > 0) {
          logs = logsByUsername;
        }
      }
    }
    
    console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Logs found:', logs?.length || 0);
    if (logs && logs.length > 0) {
      console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Sample log:', logs[0]);
    }
    
    // Сортируем по времени
    logs.sort((a, b) => {
      const timeA = new Date(a.event_time).getTime();
      const timeB = new Date(b.event_time).getTime();
      return timeA - timeB;
    });
    
    // Получаем информацию о пользователе (используем username для поиска)
    const userInfo = await new Promise((resolve, reject) => {
      db.db.get('SELECT id, fio, username FROM users WHERE username = ? OR fio = ?', [username, username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }).catch(() => null);
    
    console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] User info:', userInfo);
    console.log('📊 [REMOTE-WORKTIME-USER-EVENTS] Returning events:', logs?.length || 0);
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: true,
      username,
      fio: userInfo?.fio || username,
      startDate,
      endDate,
      events: logs
    });
  } catch (error) {
    console.error('❌ Error getting user events:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

