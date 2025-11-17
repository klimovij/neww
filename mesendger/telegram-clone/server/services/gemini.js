// Реальная интеграция с Gemini API, автоматическое переключение между ключами
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../env') });

const apiKeys = process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(',') : [];
let currentKeyIndex = 0;

async function geminiGenerate(prompt) {
  if (!apiKeys.length) throw new Error('Нет доступных ключей Gemini API');
  let lastError;
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[currentKeyIndex];
    try {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }]
      };
      const headers = { 'Content-Type': 'application/json' };
      console.log('[Gemini] Запрос:', { url, payload, headers });
      const response = await axios.post(url, payload, { headers });
      console.log('[Gemini] Ответ:', response.status, response.data);
      // Парсим ответ Gemini
      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      throw new Error('Пустой ответ Gemini');
    } catch (err) {
      console.error('[Gemini] Ошибка:', err?.response?.status, err?.response?.data, err?.message);
      lastError = err;
      // Переключаемся на следующий ключ
      currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    }
  }
  throw new Error('Все ключи Gemini API недоступны: ' + lastError);
}

module.exports = { geminiGenerate };
