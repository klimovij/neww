const express = require('express');
const router = express.Router();
const axios = require('axios');

// Проверка всех ключей Gemini
router.get('/check-keys', async (req, res) => {
  const prompt = 'Проверка ключа: ответь "OK".';
  const results = [];
  for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
    const apiKey = GEMINI_API_KEYS[i];
    try {
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        {
          contents: [{ parts: [{ text: prompt }] }],
        },
        {
          params: { key: apiKey },
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const aiReply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      results.push({ key: apiKey, status: 'OK', reply: aiReply });
    } catch (err) {
      const code = err.response?.status;
      let status = 'ERROR';
      if (code === 429) status = 'LIMIT';
      if (code === 403 || code === 401) status = 'INVALID';
      results.push({ key: apiKey, status, error: err.message });
    }
  }
  res.json({ results });
});


// Поддержка нескольких ключей через запятую
const GEMINI_API_KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY').split(',').map(k=>k.trim()).filter(Boolean);

// База знаний (можно вынести в отдельный файл или БД)
// База знаний теперь читается из knowledgeBase.md
const fs = require('fs');
const path = require('path');
const knowledgeBasePath = path.join(__dirname, '../../knowledgeBase.md');

// POST /api/ai-assistant
router.post('/', async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Некорректное или пустое тело запроса. Проверьте Content-Type: application/json и формат.' });
  }
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Нет сообщения' });

  // Читаем актуальную базу знаний из файла
  let kbText = '';
  try {
    kbText = fs.readFileSync(knowledgeBasePath, 'utf-8');
  } catch (e) {
    kbText = 'База знаний пуста или недоступна.';
  }
    // Формируем промпт для Gemini с инструкцией по форматированию
    const prompt = `Вот база знаний:
    ${kbText}
  \nИстория диалога: ${history.map((h, i) => `\n${i%2===0?'Пользователь':'ИИ'}: ${h}`).join('')}
  \nВопрос: ${message}

    Ответь максимально понятно, подробно и красиво. Оформляй ответ структурировано, используй списки, подзаголовки, выделяй важные фразы жирным, применяй Markdown для форматирования. Если есть перечни — делай их списком. Форматируй текст для лучшей читаемости. Важно: компания и её сотрудники находятся в Украине, поэтому опирайся на украинское законодательство, нормы и практики. Не используй российские законы и стандарты.`;
  let lastError = null;
  for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
    const apiKey = GEMINI_API_KEYS[i];
    try {
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        {
          contents: [{ parts: [{ text: prompt }] }],
        },
        {
          params: { key: apiKey },
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const aiReply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Нет ответа от ИИ.';
      return res.json({ reply: aiReply });
    } catch (err) {
      lastError = err;
      // Если ошибка лимита или авторизации — пробуем следующий ключ
      const code = err.response?.status;
      if (code === 429 || code === 403 || code === 401) {
        // Пробуем следующий ключ
        continue;
      } else {
        // Любая другая ошибка — не пробуем дальше
        break;
      }
    }
  }
  // Если все ключи не сработали
  res.status(500).json({ error: 'Все ключи Gemini исчерпаны или недействительны. Пожалуйста, попробуйте ещё раз позже или обратитесь к администратору.' });
});

module.exports = router;
