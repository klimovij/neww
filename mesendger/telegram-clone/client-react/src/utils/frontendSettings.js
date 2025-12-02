// Утилита для управления настройками фронтенда

const DEFAULT_SETTINGS = {
  // Основной фон
  mainBackground: '#111827',
  mainBackgroundImage: '',
  mainBackgroundImageOpacity: 1,
  
  // Фон модалок
  modalBackground: '#1f2937',
  modalBackgroundImage: '',
  modalBackgroundImageOpacity: 1,
  
  // Сайдбар
  sidebarButtonBackground: '#3b82f6',
  sidebarButtonBackgroundImage: '',
  sidebarButtonBackgroundImageOpacity: 0.1,
  sidebarTextColor: '#ffffff',
  sidebarTextSize: '14px',
  sidebarTextAlign: 'left',
  sidebarFontFamily: 'Inter, system-ui, -apple-system, sans-serif',
};

// Загрузка настроек из localStorage
export const loadFrontendSettings = () => {
  try {
    const saved = localStorage.getItem('frontendSettings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Ошибка загрузки настроек фронтенда:', error);
  }
  return DEFAULT_SETTINGS;
};

// Применение настроек к DOM
export const applyFrontendSettings = (settings = null) => {
  const activeSettings = settings || loadFrontendSettings();
  
  // Применяем основной фон
  document.documentElement.style.setProperty('--main-background', activeSettings.mainBackground);
  
  // Применяем изображение фона
  if (activeSettings.mainBackgroundImage) {
    document.documentElement.style.setProperty('--main-background-image', `url(${activeSettings.mainBackgroundImage})`);
    document.documentElement.style.setProperty('--main-background-image-opacity', activeSettings.mainBackgroundImageOpacity);
  } else {
    document.documentElement.style.setProperty('--main-background-image', 'none');
  }
  
  // Применяем фон модалок (общий дефолт)
  document.documentElement.style.setProperty('--modal-background', activeSettings.modalBackground);
  if (activeSettings.modalBackgroundImage) {
    document.documentElement.style.setProperty('--modal-background-image', `url(${activeSettings.modalBackgroundImage})`);
    document.documentElement.style.setProperty('--modal-background-image-opacity', activeSettings.modalBackgroundImageOpacity);
  } else {
    document.documentElement.style.setProperty('--modal-background-image', 'none');
  }
  
  // Применяем индивидуальные настройки для каждой модалки
  if (activeSettings.modals) {
    const modalIds = ['calendar', 'chats', 'leaves', 'tasks', 'todo', 'news', 'employees', 'monitoring', 'worktime', 'management'];
    
    modalIds.forEach(modalId => {
      const modalSettings = activeSettings.modals[modalId];
      if (modalSettings) {
        // Фон модалки
        document.documentElement.style.setProperty(`--modal-${modalId}-background`, modalSettings.background);
        
        if (modalSettings.backgroundImage) {
          document.documentElement.style.setProperty(`--modal-${modalId}-background-image`, `url(${modalSettings.backgroundImage})`);
          document.documentElement.style.setProperty(`--modal-${modalId}-background-image-opacity`, modalSettings.backgroundImageOpacity);
        } else {
          document.documentElement.style.setProperty(`--modal-${modalId}-background-image`, 'none');
          document.documentElement.style.setProperty(`--modal-${modalId}-background-image-opacity`, '1');
        }
        
        // Стили кнопок
        const buttonBg = modalSettings.buttonBackgroundImage 
          ? `url(${modalSettings.buttonBackgroundImage})`
          : modalSettings.buttonBackground;
        document.documentElement.style.setProperty(`--modal-${modalId}-button-background`, buttonBg);
        document.documentElement.style.setProperty(`--modal-${modalId}-button-background-opacity`, modalSettings.buttonBackgroundImageOpacity || 0.1);
        
        // Стили текста
        document.documentElement.style.setProperty(`--modal-${modalId}-text-color`, modalSettings.textColor);
        document.documentElement.style.setProperty(`--modal-${modalId}-text-size`, modalSettings.textSize);
        document.documentElement.style.setProperty(`--modal-${modalId}-text-align`, modalSettings.textAlign);
        document.documentElement.style.setProperty(`--modal-${modalId}-font-family`, modalSettings.fontFamily);
      }
    });
  }
  
  // Применяем стили сайдбара
  const buttonBg = activeSettings.sidebarButtonBackgroundImage 
    ? `url(${activeSettings.sidebarButtonBackgroundImage})`
    : activeSettings.sidebarButtonBackground;
  document.documentElement.style.setProperty('--sidebar-button-background', buttonBg);
  document.documentElement.style.setProperty('--sidebar-button-background-opacity', activeSettings.sidebarButtonBackgroundImageOpacity || 0.1);
  document.documentElement.style.setProperty('--sidebar-text-color', activeSettings.sidebarTextColor);
  document.documentElement.style.setProperty('--sidebar-text-size', activeSettings.sidebarTextSize);
  document.documentElement.style.setProperty('--sidebar-text-align', activeSettings.sidebarTextAlign || 'left');
  document.documentElement.style.setProperty('--sidebar-font-family', activeSettings.sidebarFontFamily);
};

// Сохранение настроек в localStorage
export const saveFrontendSettings = (settings) => {
  try {
    localStorage.setItem('frontendSettings', JSON.stringify(settings));
    // Отправляем событие для синхронизации между вкладками
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error('Ошибка сохранения настроек фронтенда:', error);
  }
};

// Инициализация при старте приложения
export const initializeFrontendSettings = async () => {
  // Сначала применяем локальные настройки
  applyFrontendSettings();
  
  // Затем пытаемся загрузить с сервера
  try {
    const response = await fetch('/api/frontend-settings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.settings) {
        console.log('📥 Настройки фронтенда загружены с сервера при запуске');
        localStorage.setItem('frontendSettings', JSON.stringify(result.settings));
        applyFrontendSettings(result.settings);
      }
    }
  } catch (error) {
    console.warn('⚠️ Не удалось загрузить настройки фронтенда с сервера, используем локальные:', error);
  }
  
  // Слушаем изменения в localStorage (для синхронизации между вкладками)
  window.addEventListener('storage', (e) => {
    if (e.key === 'frontendSettings') {
      applyFrontendSettings();
    }
  });
  
  // Слушаем WebSocket для синхронизации с другими устройствами
  if (window.socket) {
    window.socket.on('frontend-settings-updated', (updatedSettings) => {
      if (updatedSettings === null) {
        // Сброс настроек к дефолтным
        console.log('📡 Получен сброс настроек через WebSocket (глобальная синхронизация)');
        localStorage.removeItem('frontendSettings');
        applyFrontendSettings(DEFAULT_SETTINGS);
        // Перезагружаем страницу для полного сброса
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        console.log('📡 Получены обновленные настройки фронтенда через WebSocket (глобальная синхронизация)');
        localStorage.setItem('frontendSettings', JSON.stringify(updatedSettings));
        applyFrontendSettings(updatedSettings);
      }
    });
  }
};

