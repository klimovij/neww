// Универсальная функция для воспроизведения звука уведомления чата
// Можно расширять для разных типов звуков


// Простой механизм «разблокировки» аудио по пользовательскому жесту
let isAudioUnlocked = false;
let queuedVolumes = [];
let audioContextUnlocked = false;

// Разблокируем аудио при первом взаимодействии пользователя
function unlockAudioContext() {
  if (audioContextUnlocked) return;
  
  // Пробуем разблокировать через реальное воспроизведение звука
  try {
    const src = window.MESSAGE_SOUND_URL || '/message2.mp3';
    const audio = new window.Audio(src);
    audio.volume = 0.01; // Очень тихий звук для разблокировки
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(() => {
        audioContextUnlocked = true;
        isAudioUnlocked = true;
        audio.pause();
        audio.currentTime = 0;
        // Воспроизводим отложенные звуки
        const pending = queuedVolumes.slice();
        queuedVolumes = [];
        pending.forEach(v => safePlay(v));
      }).catch((err) => {
        // Аудио все еще заблокировано, но попробуем позже
        console.log('[notificationSound] Audio unlock failed, will retry on next interaction');
      });
    } else {
      // Старые браузеры
      audioContextUnlocked = true;
      isAudioUnlocked = true;
      audio.pause();
      audio.currentTime = 0;
      const pending = queuedVolumes.slice();
      queuedVolumes = [];
      pending.forEach(v => safePlay(v));
    }
  } catch (err) {
    // Если не получилось — попробуем позже
    console.log('[notificationSound] Audio unlock error:', err);
  }
}

function safePlay(volume) {
  const baseSrc = window.MESSAGE_SOUND_URL || '/message2.mp3';
  const altPaths = [
    baseSrc,
    '/message2.mp3',
    '/build/message2.mp3',
    './message2.mp3',
    'message2.mp3'
  ];
  
  const tryPlay = (src, pathIndex = 0) => {
    try {
      const audio = new window.Audio(src);
      audio.volume = volume || 0.3;
      audio.preload = 'auto';
      
      // Обработка ошибок загрузки
      const errorHandler = (e) => {
        console.error('[notificationSound] Audio load error for', src, e);
        // Пробуем следующий путь
        const nextIndex = pathIndex + 1;
        if (nextIndex < altPaths.length) {
          tryPlay(altPaths[nextIndex], nextIndex);
        } else {
          console.error('[notificationSound] All audio paths failed');
        }
      };
      
      audio.addEventListener('error', errorHandler, { once: true });
      
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            // Успешно воспроизвели
            console.log('[notificationSound] Sound played successfully from', src);
          })
          .catch((err) => {
            // Если ошибка автоплея, пробуем разблокировать или следующий путь
            if (err.name === 'NotAllowedError' || err.name === 'NotSupportedError') {
              if (!audioContextUnlocked) {
                unlockAudioContext();
              }
            } else {
              // Другая ошибка - пробуем следующий путь
              const nextIndex = pathIndex + 1;
              if (nextIndex < altPaths.length) {
                tryPlay(altPaths[nextIndex], nextIndex);
              } else {
                console.error('[notificationSound] All audio paths failed to play');
              }
            }
          });
      }
    } catch (err) {
      console.error('[notificationSound] Play error for', src, err);
      // Пробуем следующий путь
      const nextIndex = pathIndex + 1;
      if (nextIndex < altPaths.length) {
        tryPlay(altPaths[nextIndex], nextIndex);
      } else {
        console.error('[notificationSound] All audio paths failed');
      }
    }
  };
  
  tryPlay(altPaths[0], 0);
}

export function playNotificationSound(volume = 0.3) {
  // Если аудио уже разблокировано, воспроизводим сразу
  if (isAudioUnlocked && audioContextUnlocked) {
    safePlay(volume);
    return;
  }
  
  // Если аудио не разблокировано, пробуем разблокировать
  // (вызов происходит в результате пользовательского действия - клик на кнопку отправки)
  if (!audioContextUnlocked) {
    unlockAudioContext();
    // Также ставим в очередь на случай, если разблокировка займет время
    queuedVolumes.push(volume);
    return;
  }
  
  // Если разблокировка в процессе, ставим в очередь
  if (!isAudioUnlocked) {
    queuedVolumes.push(volume);
    // Навесим одноразовые слушатели на жесты для гарантии
    const tryUnlock = () => {
      document.removeEventListener('click', tryUnlock);
      document.removeEventListener('keydown', tryUnlock);
      document.removeEventListener('touchstart', tryUnlock);
      unlockAudioContext();
    };
    document.addEventListener('click', tryUnlock, { once: true, passive: true });
    document.addEventListener('keydown', tryUnlock, { once: true });
    document.addEventListener('touchstart', tryUnlock, { once: true, passive: true });
    return;
  }
  
  safePlay(volume);
}

// Функция для воспроизведения звука удаления чата/группы
function safePlayDelete(volume) {
  const baseSrc = window.DELETE_SOUND_URL || '/delete-bin.mp3';
  const altPaths = [
    baseSrc,
    '/delete-bin.mp3',
    '/build/delete-bin.mp3',
    './delete-bin.mp3',
    'delete-bin.mp3'
  ];
  
  const tryPlay = (src, pathIndex = 0) => {
    try {
      const audio = new window.Audio(src);
      audio.volume = volume || 0.3;
      audio.preload = 'auto';
      
      // Обработка ошибок загрузки
      const errorHandler = (e) => {
        console.error('[notificationSound] Delete sound load error for', src, e);
        // Пробуем следующий путь
        const nextIndex = pathIndex + 1;
        if (nextIndex < altPaths.length) {
          tryPlay(altPaths[nextIndex], nextIndex);
        } else {
          console.error('[notificationSound] All delete sound paths failed');
        }
      };
      
      audio.addEventListener('error', errorHandler, { once: true });
      
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            // Успешно воспроизвели
            console.log('[notificationSound] Delete sound played successfully from', src);
          })
          .catch((err) => {
            // Если ошибка автоплея, пробуем разблокировать или следующий путь
            if (err.name === 'NotAllowedError' || err.name === 'NotSupportedError') {
              if (!audioContextUnlocked) {
                unlockAudioContext();
              }
            } else {
              // Другая ошибка - пробуем следующий путь
              const nextIndex = pathIndex + 1;
              if (nextIndex < altPaths.length) {
                tryPlay(altPaths[nextIndex], nextIndex);
              } else {
                console.error('[notificationSound] All delete sound paths failed to play');
              }
            }
          });
      }
    } catch (err) {
      console.error('[notificationSound] Delete sound play error for', src, err);
      // Пробуем следующий путь
      const nextIndex = pathIndex + 1;
      if (nextIndex < altPaths.length) {
        tryPlay(altPaths[nextIndex], nextIndex);
      } else {
        console.error('[notificationSound] All delete sound paths failed');
      }
    }
  };
  
  tryPlay(altPaths[0], 0);
}

export function playDeleteSound(volume = 0.3) {
  // Если аудио уже разблокировано, воспроизводим сразу
  if (isAudioUnlocked && audioContextUnlocked) {
    safePlayDelete(volume);
    return;
  }
  
  // Если аудио не разблокировано, пробуем разблокировать
  // (вызов происходит в результате пользовательского действия - клик на кнопку удаления)
  if (!audioContextUnlocked) {
    unlockAudioContext();
    // Также воспроизводим звук сразу, так как это пользовательское действие
    safePlayDelete(volume);
    return;
  }
  
  // Если разблокировка в процессе, воспроизводим сразу
  // (удаление - это пользовательское действие, поэтому аудио должно быть доступно)
  safePlayDelete(volume);
}

// Экспортируем для ручного теста из консоли браузера
window.playNotificationSound = playNotificationSound;
window.playDeleteSound = playDeleteSound;
