// Утилита для полной очистки всех эмодзи из системы

export function clearAllEmojis() {
  try {
    // Очищаем кастомные эмодзи
    localStorage.removeItem('customEmojis');
    
    // Очищаем blacklist стандартных эмодзи
    localStorage.removeItem('emojiBlacklist');
    
    // Очищаем настройки эмодзи
    localStorage.removeItem('emojiSettings');
    
    // Отправляем события об обновлении
    window.dispatchEvent(new CustomEvent('customEmojisUpdated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('emojiBlacklistUpdated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('emojiSettingsUpdated', { detail: {} }));
    
    console.log('✅ Все эмодзи успешно очищены из localStorage');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при очистке эмодзи:', error);
    return false;
  }
}

// Функция для очистки эмодзи на сервере
export async function clearServerEmojis() {
  try {
    const token = localStorage.getItem('token');
    
    // Получаем список всех эмодзи с сервера
    const response = await fetch('/api/emojis/list', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    
    if (response.ok) {
      const emojis = await response.json();
      
      // Удаляем каждый эмодзи
      for (const emoji of emojis) {
        try {
          const match = String(emoji.src || '').match(/\/uploads\/emojis\/([^/?#]+)/);
          const filename = match && match[1];
          
          if (filename) {
            await fetch(`/api/custom-emoji/${filename}`, {
              method: 'DELETE',
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
          }
        } catch (err) {
          console.warn('Не удалось удалить эмодзи:', emoji.name, err);
        }
      }
    }
    
    console.log('✅ Серверные эмодзи очищены');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при очистке серверных эмодзи:', error);
    return false;
  }
}

// Полная очистка всех эмодзи
export async function clearAllEmojisCompletely() {
  console.log('🧹 Начинаем полную очистку всех эмодзи...');
  
  const localCleared = clearAllEmojis();
  const serverCleared = await clearServerEmojis();
  
  if (localCleared && serverCleared) {
    console.log('✅ Полная очистка эмодзи завершена успешно!');
    alert('✅ Все эмодзи успешно удалены! Теперь можно добавлять свои кастомные эмодзи.');
  } else {
    console.log('⚠️ Очистка завершена с предупреждениями');
    alert('⚠️ Очистка завершена. Проверьте консоль для деталей.');
  }
  
  // Перезагружаем страницу для применения изменений
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}
