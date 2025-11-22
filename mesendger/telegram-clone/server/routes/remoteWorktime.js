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
    
    // Добавляем в базу данных (skipGoogleSync = true, т.к. данные уже пришли с удаленного сервера)
    await db.addWorkTimeLog({
      username: normalizedUsername,
      event_type: event_type.toLowerCase(),
      event_time: convertedTime,
      event_id: finalEventId,
      skipGoogleSync: true
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
        
        // Добавляем в базу данных (skipGoogleSync = true, т.к. данные уже пришли с удаленного сервера)
        await db.addWorkTimeLog({
          username: normalizedUsername,
          event_type: event_type.toLowerCase(),
          event_time: convertedTime,
          event_id: finalEventId,
          skipGoogleSync: true
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

module.exports = router;

