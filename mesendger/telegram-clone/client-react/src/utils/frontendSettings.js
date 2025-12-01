// Утилита для управления настройками фронтенда

const DEFAULT_SETTINGS = {
  // Основной фон
  mainBackground: '#111827',
  mainBackgroundImage: '',
  mainBackgroundImageOpacity: 1,
  
  // Фон модалок
  modalBackground: '#1f2937',
  
  // Сайдбар
  sidebarButtonBackground: 'rgba(59, 130, 246, 0.1)',
  sidebarTextColor: '#ffffff',
  sidebarTextSize: '14px',
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
  
  // Применяем фон модалок
  document.documentElement.style.setProperty('--modal-background', activeSettings.modalBackground);
  
  // Применяем стили сайдбара
  document.documentElement.style.setProperty('--sidebar-button-background', activeSettings.sidebarButtonBackground);
  document.documentElement.style.setProperty('--sidebar-text-color', activeSettings.sidebarTextColor);
  document.documentElement.style.setProperty('--sidebar-text-size', activeSettings.sidebarTextSize);
  document.documentElement.style.setProperty('--sidebar-font-family', activeSettings.sidebarFontFamily);
};

// Инициализация при старте приложения
export const initializeFrontendSettings = () => {
  // Применяем сохраненные настройки
  applyFrontendSettings();
  
  // Слушаем изменения в localStorage (для синхронизации между вкладками)
  window.addEventListener('storage', (e) => {
    if (e.key === 'frontendSettings') {
      applyFrontendSettings();
    }
  });
};

