// Скрипт для полной очистки всех эмодзи
// Выполните этот код в консоли браузера (F12 -> Console)

console.log('🧹 Начинаем очистку всех эмодзи...');

// Очищаем localStorage
localStorage.removeItem('customEmojis');
localStorage.removeItem('emojiBlacklist');
localStorage.removeItem('emojiSettings');

console.log('✅ localStorage очищен от эмодзи');

// Отправляем события об обновлении
window.dispatchEvent(new CustomEvent('customEmojisUpdated', { detail: [] }));
window.dispatchEvent(new CustomEvent('emojiBlacklistUpdated', { detail: [] }));
window.dispatchEvent(new CustomEvent('emojiSettingsUpdated', { detail: {} }));

console.log('✅ События обновления отправлены');

// Очистка серверных эмодзи (если есть токен)
async function clearServerEmojis() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('⚠️ Токен не найден, пропускаем очистку сервера');
      return;
    }

    const response = await fetch('/api/emojis/list', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const emojis = await response.json();
      console.log(`🗂️ Найдено ${emojis.length} серверных эмодзи для удаления`);

      for (const emoji of emojis) {
        try {
          const match = String(emoji.src || '').match(/\/uploads\/emojis\/([^/?#]+)/);
          const filename = match && match[1];

          if (filename) {
            await fetch(`/api/custom-emoji/${filename}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`🗑️ Удален: ${emoji.name}`);
          }
        } catch (err) {
          console.warn(`⚠️ Не удалось удалить эмодзи: ${emoji.name}`, err);
        }
      }
      console.log('✅ Серверные эмодзи очищены');
    }
  } catch (error) {
    console.error('❌ Ошибка при очистке серверных эмодзи:', error);
  }
}

// Запускаем очистку сервера
clearServerEmojis().then(() => {
  console.log('🎉 Полная очистка эмодзи завершена!');
  console.log('🔄 Перезагружаем страницу...');
  
  // Перезагружаем страницу через 2 секунды
  setTimeout(() => {
    window.location.reload();
  }, 2000);
});
