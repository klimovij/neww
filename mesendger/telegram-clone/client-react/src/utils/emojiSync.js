/**
 * Утилита для синхронизации кастомных эмодзи между клиентом и сервером
 */

/**
 * Загружает эмодзи с сервера и объединяет с локальными
 */
export async function loadEmojisFromServer() {
  try {
    const response = await fetch('/api/emojis/list');
    if (!response.ok) throw new Error('Failed to fetch emojis');
    const serverEmojis = await response.json();
    
    // Сохраняем серверные эмодзи в localStorage
    if (Array.isArray(serverEmojis)) {
      localStorage.setItem('serverCustomEmojis', JSON.stringify(serverEmojis));
      window.dispatchEvent(new CustomEvent('customEmojisUpdated'));
    }
    
    return serverEmojis;
  } catch (error) {
    console.error('❌ Ошибка загрузки эмодзи с сервера:', error);
    return [];
  }
}

/**
 * Синхронизирует локальные эмодзи с сервером (загружает те, которых нет на сервере)
 * @param {boolean} force - принудительная синхронизация всех эмодзи
 */
export async function syncEmojisToServer(force = false) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ Нет токена авторизации, синхронизация пропущена');
      return { synced: 0, skipped: 0 };
    }

    // Получаем локальные эмодзи
    const localEmojis = JSON.parse(localStorage.getItem('customEmojis') || '[]');
    if (!Array.isArray(localEmojis) || localEmojis.length === 0) {
      console.log('ℹ️ Нет локальных эмодзи для синхронизации');
      return { synced: 0, skipped: 0 };
    }

    // Получаем список эмодзи с сервера
    const serverEmojis = await loadEmojisFromServer();
    const serverNames = new Set(serverEmojis.map(e => e.name));

    // Фильтруем эмодзи, которых нет на сервере
    const emojisToSync = localEmojis.filter(emoji => {
      // Пропускаем эмодзи, которые уже есть на сервере (если не принудительная синхронизация)
      if (!force && serverNames.has(emoji.name)) {
        return false;
      }
      
      // Пропускаем эмодзи с data URL (base64) - их нужно загрузить на сервер
      if (emoji.src && emoji.src.startsWith('data:')) {
        return true;
      }
      
      // Пропускаем эмодзи с относительными путями (локальные файлы)
      if (emoji.src && !emoji.src.startsWith('http') && !emoji.src.startsWith('/uploads/')) {
        return true;
      }
      
      return false;
    });

    if (emojisToSync.length === 0) {
      console.log('✅ Все эмодзи уже синхронизированы с сервером');
      return { synced: 0, skipped: localEmojis.length };
    }

    console.log(`🔄 Синхронизация ${emojisToSync.length} эмодзи с сервером...`);

    // Загружаем эмодзи на сервер пакетами
    const batchSize = 10;
    let synced = 0;
    let failed = 0;

    for (let i = 0; i < emojisToSync.length; i += batchSize) {
      const batch = emojisToSync.slice(i, i + batchSize);
      
      try {
        const formData = new FormData();
        const names = [];

        // Конвертируем data URL в файлы
        for (const emoji of batch) {
          if (emoji.src && emoji.src.startsWith('data:')) {
            try {
              const [header, data] = emoji.src.split(',');
              const mimeMatch = header.match(/data:([^;]+)/);
              const mime = mimeMatch ? mimeMatch[1] : 'image/png';
              const byteString = atob(data);
              const byteArray = new Uint8Array(byteString.length);
              for (let j = 0; j < byteString.length; j++) {
                byteArray[j] = byteString.charCodeAt(j);
              }
              const blob = new Blob([byteArray], { type: mime });
              const file = new File([blob], `${emoji.name}.${mime.split('/')[1] || 'png'}`, { type: mime });
              formData.append('emojis', file);
              names.push(emoji.name);
            } catch (err) {
              console.error(`❌ Ошибка конвертации эмодзи ${emoji.name}:`, err);
              failed++;
            }
          }
        }

        if (formData.getAll('emojis').length === 0) {
          console.warn('⚠️ Нет файлов для загрузки в этом батче');
          continue;
        }

        formData.append('names', JSON.stringify(names));

        const response = await fetch('/api/custom-emoji/batch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || 'Failed to sync emojis');
        }

        const result = await response.json();
        synced += result.count || 0;
        console.log(`✅ Загружено ${result.count || 0} эмодзи на сервер`);

        // Обновляем локальные эмодзи, заменяя data URL на серверные URL
        const localEmojisUpdated = JSON.parse(localStorage.getItem('customEmojis') || '[]');
        result.emojis.forEach((serverEmoji, idx) => {
          const localIdx = localEmojisUpdated.findIndex(e => e.name === serverEmoji.name);
          if (localIdx !== -1) {
            localEmojisUpdated[localIdx].src = serverEmoji.url;
          }
        });
        localStorage.setItem('customEmojis', JSON.stringify(localEmojisUpdated));

      } catch (error) {
        console.error(`❌ Ошибка синхронизации батча:`, error);
        failed += batch.length;
      }
    }

    // Перезагружаем эмодзи с сервера
    await loadEmojisFromServer();
    window.dispatchEvent(new CustomEvent('customEmojisUpdated'));

    console.log(`✅ Синхронизация завершена: ${synced} загружено, ${failed} ошибок, ${localEmojis.length - emojisToSync.length} уже было на сервере`);
    
    return { synced, failed, skipped: localEmojis.length - emojisToSync.length };
  } catch (error) {
    console.error('❌ Ошибка синхронизации эмодзи:', error);
    return { synced: 0, failed: 0, skipped: 0, error: error.message };
  }
}

/**
 * Инициализирует синхронизацию эмодзи при старте приложения
 */
export async function initEmojiSync() {
  // Загружаем эмодзи с сервера
  await loadEmojisFromServer();
  
  // Если пользователь авторизован, синхронизируем локальные эмодзи с сервером
  const token = localStorage.getItem('token');
  if (token) {
    // Проверяем, была ли уже выполнена синхронизация
    const lastSync = localStorage.getItem('emojiSyncLastRun');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Синхронизируем, если прошло больше суток или это первая синхронизация
    if (!lastSync || (now - parseInt(lastSync)) > oneDay) {
      console.log('🔄 Автоматическая синхронизация эмодзи...');
      await syncEmojisToServer();
      localStorage.setItem('emojiSyncLastRun', now.toString());
    }
  }
}

