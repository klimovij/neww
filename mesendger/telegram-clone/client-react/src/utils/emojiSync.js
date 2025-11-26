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
      return { synced: 0, skipped: 0, error: 'Нет токена авторизации' };
    }

    // Получаем локальные эмодзи
    const localEmojis = JSON.parse(localStorage.getItem('customEmojis') || '[]');
    console.log('📋 Локальные эмодзи для синхронизации:', localEmojis.length);
    
    if (!Array.isArray(localEmojis) || localEmojis.length === 0) {
      console.log('ℹ️ Нет локальных эмодзи для синхронизации');
      return { synced: 0, skipped: 0, error: 'Нет локальных эмодзи' };
    }

    // Получаем список эмодзи с сервера
    const serverEmojis = await loadEmojisFromServer();
    const serverNames = new Set(serverEmojis.map(e => e.name));
    const serverUrls = new Set(serverEmojis.map(e => e.url));
    console.log('📋 Эмодзи на сервере:', serverEmojis.length);
    
    // Если на сервере нет эмодзи, но локально есть - принудительная синхронизация
    if (serverEmojis.length === 0 && localEmojis.length > 0) {
      console.log('🔄 Сервер пустой, но есть локальные эмодзи - принудительная синхронизация');
      force = true;
    }

    // Фильтруем эмодзи, которых нет на сервере
    const emojisToSync = localEmojis.filter(emoji => {
      // Пропускаем эмодзи, которые уже есть на сервере (если не принудительная синхронизация)
      if (!force && serverNames.has(emoji.name)) {
        // Проверяем, действительно ли файл существует на сервере
        const serverEmoji = serverEmojis.find(e => e.name === emoji.name);
        if (serverEmoji && serverUrls.has(emoji.src)) {
          console.log(`⏭️ Пропуск эмодзи "${emoji.name}" - уже есть на сервере`);
          return false;
        } else {
          // Имя есть, но URL не совпадает или файла нет - нужно перезагрузить
          console.log(`🔄 Эмодзи "${emoji.name}" будет перезагружено (файл отсутствует или URL не совпадает)`);
          return true;
        }
      }
      
      // Пропускаем эмодзи с data URL (base64) - их нужно загрузить на сервер
      if (emoji.src && emoji.src.startsWith('data:')) {
        console.log(`✅ Эмодзи "${emoji.name}" будет загружено (data URL)`);
        return true;
      }
      
      // Пропускаем эмодзи с относительными путями (локальные файлы)
      if (emoji.src && !emoji.src.startsWith('http') && !emoji.src.startsWith('/uploads/')) {
        console.log(`✅ Эмодзи "${emoji.name}" будет загружено (локальный путь: ${emoji.src.substring(0, 50)}...)`);
        return true;
      }
      
      // Если эмодзи имеет путь /uploads/emojis/, но его нет в списке сервера - нужно загрузить
      if (emoji.src && emoji.src.startsWith('/uploads/emojis/') && !serverUrls.has(emoji.src)) {
        console.log(`🔄 Эмодзи "${emoji.name}" будет перезагружено (файл отсутствует на сервере: ${emoji.src})`);
        return true;
      }
      
      console.log(`⏭️ Пропуск эмодзи "${emoji.name}" - уже на сервере (${emoji.src?.substring(0, 50) || 'нет src'}...)`);
      return false;
    });

    if (emojisToSync.length === 0) {
      const message = '✅ Все эмодзи уже синхронизированы с сервером';
      console.log(message);
      console.log('📊 Детали:', {
        localTotal: localEmojis.length,
        serverTotal: serverEmojis.length,
        serverNames: Array.from(serverNames),
        localNames: localEmojis.map(e => e.name)
      });
      return { synced: 0, skipped: localEmojis.length, message, error: 'Нет эмодзи для синхронизации' };
    }

    console.log(`🔄 Синхронизация ${emojisToSync.length} эмодзи с сервером...`);
    console.log('📝 Эмодзи для синхронизации:', emojisToSync.map(e => ({ name: e.name, srcType: e.src?.substring(0, 50) || 'нет src' })));

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
          // Проверяем data URL в src или в поле dataUrl
          const dataUrl = (emoji.src && emoji.src.startsWith('data:')) ? emoji.src : emoji.dataUrl;
          
          if (dataUrl && dataUrl.startsWith('data:')) {
            try {
              const [header, data] = dataUrl.split(',');
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
              console.log(`📤 Добавлен файл для эмодзи "${emoji.name}" (data URL, размер: ${blob.size} байт)`);
            } catch (err) {
              console.error(`❌ Ошибка конвертации эмодзи ${emoji.name}:`, err);
              failed++;
            }
          } else {
            console.warn(`⚠️ Эмодзи "${emoji.name}" пропущено - нет data URL (src: ${emoji.src?.substring(0, 50) || 'нет'}...)`);
            // Не увеличиваем failed, так как это не ошибка, а просто нет исходного файла
          }
        }

        const filesInFormData = formData.getAll('emojis');
        if (filesInFormData.length === 0) {
          console.warn('⚠️ Нет файлов для загрузки в этом батче');
          continue;
        }

        console.log(`📤 Отправка батча: ${filesInFormData.length} файлов, имена:`, names);
        formData.append('names', JSON.stringify(names));

        const response = await fetch('/api/custom-emoji/batch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        console.log(`📡 Ответ сервера: статус ${response.status}, ok: ${response.ok}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Ошибка ответа сервера:', errorText);
          let error;
          try {
            error = JSON.parse(errorText);
          } catch {
            error = { error: errorText || 'Unknown error' };
          }
          throw new Error(error.error || 'Failed to sync emojis');
        }

        const result = await response.json();
        console.log('📦 Результат от сервера:', result);
        synced += result.count || 0;
        console.log(`✅ Загружено ${result.count || 0} эмодзи на сервер`);

        // Обновляем локальные эмодзи, добавляя серверный URL, но сохраняя data URL
        // Это важно, чтобы можно было перезагрузить эмодзи, если файл на сервере будет удален
        const localEmojisUpdated = JSON.parse(localStorage.getItem('customEmojis') || '[]');
        result.emojis.forEach((serverEmoji, idx) => {
          const localIdx = localEmojisUpdated.findIndex(e => e.name === serverEmoji.name);
          if (localIdx !== -1) {
            // Сохраняем и data URL (если есть), и серверный URL
            const originalEmoji = localEmojisUpdated[localIdx];
            if (originalEmoji.src && originalEmoji.src.startsWith('data:')) {
              // Сохраняем data URL в отдельном поле, а серверный URL в src
              localEmojisUpdated[localIdx] = {
                ...originalEmoji,
                src: serverEmoji.url,
                dataUrl: originalEmoji.src // Сохраняем исходный data URL
              };
            } else {
              // Если data URL нет, просто обновляем src
              localEmojisUpdated[localIdx].src = serverEmoji.url;
            }
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

