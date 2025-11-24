const express = require('express');
const router = express.Router();
const db = require('../database');

// Endpoint для получения отчета по истории документов 1С
router.get('/onec-history-report', async (req, res) => {
  try {
    const { date, start, end, username } = req.query;
    
    let startDate, endDate;
    if (start && end) {
      startDate = start;
      endDate = end;
    } else if (date) {
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
    
    const report = await db.getOneCDocumentReport({
      start: startDate,
      end: endDate,
      username: username || null
    });
    
    res.json({
      success: true,
      startDate,
      endDate,
      report
    });
  } catch (error) {
    console.error('❌ Error getting 1C history report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint для получения детальной истории документов конкретного пользователя
router.get('/onec-history-user-events', async (req, res) => {
  // Alias для совместимости
  handleUserDocuments(req, res);
});

router.get('/onec-history-user-documents', async (req, res) => {
  handleUserDocuments(req, res);
});

async function handleUserDocuments(req, res) {
  try {
    let username = req.query.username;
    const date = req.query.date;
    const start = req.query.start;
    const end = req.query.end;
    
    // Декодируем username из URL
    if (username) {
      try {
        if (username.includes('%')) {
          username = decodeURIComponent(username);
        }
      } catch (e) {
        console.warn('⚠️ Error decoding username:', e);
      }
    }
    
    let startDate, endDate;
    if (start && end) {
      startDate = start;
      endDate = end;
    } else if (date) {
      startDate = date;
      endDate = date;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать либо date, либо start и end'
      });
    }
    
    if (!username || username.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      });
    }
    
    // Пробуем найти по ФИО, если не найдено по username
    let events = await db.getOneCUserDocumentHistory({
      username: username,
      start: startDate,
      end: endDate
    });
    
    // Если не найдено, пробуем найти по ФИО
    if (!events || events.length === 0) {
      const userByFio = await new Promise((resolve, reject) => {
        db.db.get('SELECT username FROM users WHERE fio = ?', [username], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }).catch(() => null);
      
      if (userByFio && userByFio.username) {
        events = await db.getOneCUserDocumentHistory({
          username: userByFio.username,
          start: startDate,
          end: endDate
        });
      }
    }
    
      // Получаем информацию о пользователе
    const userInfo = await new Promise((resolve, reject) => {
      db.db.get('SELECT id, fio, username FROM users WHERE username = ? OR fio = ?', [username, username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }).catch(() => null);
    
    res.json({
      success: true,
      username,
      fio: userInfo?.fio || username,
      startDate,
      endDate,
      events: events || [],
      documents: events || [] // Alias для совместимости
    });
  } catch (error) {
    console.error('❌ Error getting 1C user documents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Middleware для проверки API ключа (для удаленных запросов)
function checkApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.REMOTE_WORKTIME_API_KEY || 'BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA=';
  
  // Если нет JWT токена, требуем API ключ
  if (!req.headers.authorization) {
    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or missing API key'
      });
    }
  }
  
  next();
}

// Endpoint для приема данных истории документов 1С (одиночная запись)
router.post('/onec-history', checkApiKey, async (req, res) => {
  try {
    const { username, document_name, document_type, action_type, event_time, session_id, computer_name } = req.body;
    
    if (!username || !document_name || !event_time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: username, document_name, event_time'
      });
    }
    
    await db.addOneCDocumentHistory({
      username,
      document_name,
      document_type: document_type || null,
      action_type: action_type || 'open',
      event_time,
      session_id: session_id || null,
      computer_name: computer_name || null
    });
    
    res.json({
      success: true,
      message: '1C document history record added'
    });
  } catch (error) {
    console.error('❌ Error adding 1C document history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint для пакетной отправки истории документов 1С
router.post('/onec-history-batch', checkApiKey, async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid events array'
      });
    }
    
    if (events.length === 0) {
      return res.json({
        success: true,
        message: 'No events to add',
        added: 0
      });
    }
    
    let added = 0;
    let errors = 0;
    
    // Добавляем события пакетно
    for (const event of events) {
      try {
        if (!event.username || !event.document_name || !event.event_time) {
          console.warn('⚠️ Skipping event with missing required fields:', event);
          errors++;
          continue;
        }
        
        await db.addOneCDocumentHistory({
          username: event.username,
          document_name: event.document_name,
          document_type: event.document_type || null,
          action_type: event.action_type || 'open',
          event_time: event.event_time,
          session_id: event.session_id || null,
          computer_name: event.computer_name || null
        });
        
        added++;
      } catch (err) {
        console.error('❌ Error adding event:', err.message, event);
        errors++;
      }
    }
    
    console.log(`✅ 1C history batch: added ${added} events, ${errors} errors`);
    
    res.json({
      success: true,
      message: `1C document history batch processed`,
      added,
      errors,
      total: events.length
    });
  } catch (error) {
    console.error('❌ Error processing 1C history batch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

