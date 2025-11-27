import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { FiLogOut, FiX, FiArrowLeft } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../../styles/GlobalStyles';
import SidebarNav from './SidebarNav';
import frostyImg from '../../assets/icons/Frosty.png';
import api from 'services/api';

const SNOWFLAKE_COUNT = 14;

const DEFAULT_APP_TITLE_SETTINGS = {
  text: 'Issa Plus',
  fontSize: '2em',
  fontFamily: 'Arial, sans-serif',
  customFontUrl: '',
  customFontName: '',
  color: '#43e97b',
  useGradient: false,
  gradientStart: '#43e97b',
  gradientEnd: '#2193b0',
  glowEnabled: true,
  glowColor: '#43e97b',
  glowIntensity: 12,
  glowSpread: 32,
  effectType: 'neon',
  snowEnabled: null,
  snowmanEnabled: false,
  snowmanImage: null,
  snowmanPositionX: 0,
  snowmanPositionY: 0,
  snowmanScale: 100,
  snowmanPositionType: 'relative',
  snowmanImages: [], // Массив изображений для снеговика
  avatarImage: null,
  avatarPositionX: 0,
  avatarPositionY: 0,
  avatarWidth: 88,
  avatarHeight: 88
};

function getAppTitleSettings() {
  try {
    const saved = localStorage.getItem('appTitleSettings');
    if (saved) {
      return { ...DEFAULT_APP_TITLE_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading app title settings:', e);
  }
  return DEFAULT_APP_TITLE_SETTINGS;
}

export default function SidebarMobile({ open, onClose, onOpen, showNav = true, onOpenNav }) {
  const { state, dispatch } = useApp();
  const fileInputRef = useRef();
  const [avatarHover, setAvatarHover] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showAvatarActionsModal, setShowAvatarActionsModal] = useState(false);
  const [socketConnected, setSocketConnected] = useState(() => window.socket?.connected ?? false);
  const [appTitleSettings, setAppTitleSettings] = useState(getAppTitleSettings());
  const [showChatsModal, setShowChatsModal] = useState(false);
  
  // Для обработки свайпа
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const sidebarRef = useRef(null);

  const snowflakes = React.useMemo(
    () => Array.from({ length: SNOWFLAKE_COUNT }),
    []
  );
  
  const isWinterSeason = React.useMemo(() => {
    const today = new Date();
    const month = today.getMonth();
    const day = today.getDate();
    if (month === 11) return true;
    if (month === 0) return true;
    if (month === 1 && day <= 28) return true;
    return false;
  }, []);

  const [snowEnabled, setSnowEnabled] = React.useState(() => {
    try {
      const saved = localStorage.getItem('appTitleSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.snowEnabled !== undefined ? settings.snowEnabled : null;
      }
    } catch (e) {
      console.error('Error loading snow settings:', e);
    }
    return null;
  });

  const shouldShowSnow = React.useMemo(() => {
    if (snowEnabled === true) return true;
    if (snowEnabled === false) return false;
    return isWinterSeason;
  }, [snowEnabled, isWinterSeason]);

  useEffect(() => {
    const handler = () => {
      try {
        const saved = localStorage.getItem('appTitleSettings');
        if (saved) {
          const settings = JSON.parse(saved);
          setSnowEnabled(settings.snowEnabled !== undefined ? settings.snowEnabled : null);
        } else {
          setSnowEnabled(null);
        }
      } catch (e) {
        console.error('Error loading snow settings:', e);
      }
    };
    window.addEventListener('appTitleSettingsUpdated', handler);
    return () => window.removeEventListener('appTitleSettingsUpdated', handler);
  }, []);

  useEffect(() => {
    // Функция для оптимизации настроек перед сохранением в localStorage
    // Удаляет base64 изображения, чтобы избежать QuotaExceededError
    const optimizeForLocalStorage = (settings) => {
      const optimized = { ...settings };
      
      // Удаляем base64 изображения из снеговиков
      if (Array.isArray(optimized.snowmanImages)) {
        optimized.snowmanImages = optimized.snowmanImages.map(img => {
          if (typeof img === 'object' && img !== null) {
            const imgCopy = { ...img };
            // Если изображение base64, удаляем его, оставляем только URL
            if (imgCopy.image && imgCopy.image.startsWith('data:image')) {
              imgCopy.image = null; // Удаляем base64, но сохраняем структуру
            }
            return imgCopy;
          }
          return img;
        });
      }
      
      // Удаляем base64 из одиночного изображения снеговика
      if (optimized.snowmanImage && optimized.snowmanImage.startsWith('data:image')) {
        optimized.snowmanImage = null;
      }
      
      // Удаляем base64 из изображения аватара
      if (optimized.avatarImage && optimized.avatarImage.startsWith('data:image')) {
        optimized.avatarImage = null;
      }
      
      return optimized;
    };

    const loadSettings = (serverSettings = null) => {
      // Приоритет: настройки с сервера > localStorage
      let settings;
      if (serverSettings) {
        // Проверяем, что настройки - это объект, а не строка
        let parsedServerSettings = serverSettings;
        if (typeof serverSettings === 'string') {
          try {
            parsedServerSettings = JSON.parse(serverSettings);
          } catch (e) {
            console.error('Error parsing serverSettings string:', e);
            parsedServerSettings = {};
          }
        }
        
        // Если это строка, разбитая на символы (объект с числовыми ключами), это ошибка
        if (parsedServerSettings && typeof parsedServerSettings === 'object' && !Array.isArray(parsedServerSettings)) {
          const keys = Object.keys(parsedServerSettings);
          // Если все ключи - числа от 0 до N, это строка, разбитая на символы
          if (keys.length > 0 && keys.every((k, i) => k === String(i))) {
            console.error('❌ Settings came as string split into characters, trying to join and parse...');
            try {
              const joinedString = keys.map(k => parsedServerSettings[k]).join('');
              parsedServerSettings = JSON.parse(joinedString);
            } catch (e) {
              console.error('Error parsing joined string:', e);
              parsedServerSettings = {};
            }
          }
        }
        
        // Объединяем с дефолтными настройками, чтобы все поля были заполнены
        settings = {
          ...DEFAULT_APP_TITLE_SETTINGS,
          ...parsedServerSettings,
          // Убеждаемся, что snowmanImages всегда массив
          snowmanImages: Array.isArray(parsedServerSettings.snowmanImages) 
            ? parsedServerSettings.snowmanImages 
            : []
        };
        console.log('✅ Loading settings (from server):', settings);
        console.log('🖼️ Snowman images:', settings.snowmanImages?.length || 0, 'images');
        // Сохраняем настройки с сервера в localStorage для офлайн-доступа
        // Оптимизируем, удаляя base64 изображения
        try {
          const optimizedSettings = optimizeForLocalStorage(settings);
          localStorage.setItem('appTitleSettings', JSON.stringify(optimizedSettings));
        } catch (e) {
          console.error('Error saving server settings to localStorage:', e);
          // Если ошибка, попробуем очистить старые данные и сохранить заново
          try {
            localStorage.removeItem('appTitleSettings');
            const optimizedSettings = optimizeForLocalStorage(settings);
            localStorage.setItem('appTitleSettings', JSON.stringify(optimizedSettings));
          } catch (e2) {
            console.error('Failed to save even after cleanup:', e2);
          }
        }
      } else {
        const localSettings = getAppTitleSettings();
        settings = {
          ...DEFAULT_APP_TITLE_SETTINGS,
          ...localSettings,
          // Убеждаемся, что snowmanImages всегда массив
          snowmanImages: Array.isArray(localSettings.snowmanImages) 
            ? localSettings.snowmanImages 
            : []
        };
        console.log('✅ Loading settings (from local):', settings);
        console.log('🖼️ Snowman images:', settings.snowmanImages?.length || 0, 'images');
      }
      
      console.log('📦 Final settings to apply:', settings);
      console.log('❄️ Snow enabled:', settings.snowEnabled);
      console.log('⛄ Snowman enabled:', settings.snowmanEnabled);
      console.log('🖼️ Snowman images array:', settings.snowmanImages);
      
      setAppTitleSettings(settings);
      
      if (settings.customFontUrl) {
        const existingLink = document.querySelector(`link[data-custom-font="${settings.customFontUrl}"]`);
        if (!existingLink) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = settings.customFontUrl;
          link.setAttribute('data-custom-font', settings.customFontUrl);
          document.head.appendChild(link);
        }
      }
    };
    
    // Загружаем настройки с сервера при монтировании
    const loadServerSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          console.log('📡 Loading sidebar settings from server...');
          const response = await api.get('/api/sidebar-settings');
          console.log('📡 Server response:', response.data);
          if (response.data.success && response.data.settings) {
            console.log('✅ Settings loaded from server:', response.data.settings);
            
            // Парсим настройки, если они пришли как строка
            let parsedSettings = response.data.settings;
            if (typeof parsedSettings === 'string') {
              try {
                parsedSettings = JSON.parse(parsedSettings);
              } catch (e) {
                console.error('Error parsing settings string:', e);
                parsedSettings = {};
              }
            }
            
            // Убеждаемся, что snowmanImages всегда массив
            const serverSettings = {
              ...DEFAULT_APP_TITLE_SETTINGS,
              ...parsedSettings,
              snowmanImages: Array.isArray(parsedSettings.snowmanImages) 
                ? parsedSettings.snowmanImages 
                : []
            };
            loadSettings(serverSettings);
            return;
          } else {
            console.log('⚠️ No settings on server, using defaults');
          }
        }
      } catch (error) {
        console.error('❌ Error loading sidebar settings from server:', error);
        // Продолжаем с локальными настройками
      }
      // Если не удалось загрузить с сервера, используем локальные
      loadSettings();
    };
    
    loadServerSettings();
    
    // Обработчик обновления настроек через событие (локальные изменения)
    const handler = () => {
      loadSettings();
    };
    window.addEventListener('appTitleSettingsUpdated', handler);
    
    // Обработчик обновления настроек через WebSocket (изменения от других пользователей)
    const socketHandler = (data) => {
      console.log('📡 Received sidebar-settings-updated event via WebSocket:', data);
      console.log('📡 Data type:', typeof data);
      console.log('📡 Settings type:', typeof data?.settings);
      
      if (data && data.settings) {
        console.log('✅ Loading settings from WebSocket:', data.settings);
        
        // Парсим настройки, если они пришли как строка
        let parsedSettings = data.settings;
        if (typeof parsedSettings === 'string') {
          try {
            parsedSettings = JSON.parse(parsedSettings);
          } catch (e) {
            console.error('Error parsing WebSocket settings string:', e);
            parsedSettings = {};
          }
        }
        
        // Если это строка, разбитая на символы (объект с числовыми ключами), это ошибка
        if (parsedSettings && typeof parsedSettings === 'object' && !Array.isArray(parsedSettings)) {
          const keys = Object.keys(parsedSettings);
          // Если все ключи - числа от 0 до N, это строка, разбитая на символы
          if (keys.length > 0 && keys.every((k, i) => k === String(i))) {
            console.error('❌ WebSocket settings came as string split into characters, trying to join and parse...');
            try {
              const joinedString = keys.map(k => parsedSettings[k]).join('');
              parsedSettings = JSON.parse(joinedString);
            } catch (e) {
              console.error('Error parsing joined WebSocket string:', e);
              parsedSettings = {};
            }
          }
        }
        
        const serverSettings = {
          ...DEFAULT_APP_TITLE_SETTINGS,
          ...parsedSettings,
          snowmanImages: Array.isArray(parsedSettings.snowmanImages) 
            ? parsedSettings.snowmanImages 
            : []
        };
        loadSettings(serverSettings);
      } else {
        // Если настройки не в data.settings, перезагружаем с сервера
        console.log('⚠️ Settings not in WebSocket data, reloading from server...');
        loadServerSettings();
      }
    };
    
    // Настройка обработчика WebSocket с проверкой подключения
    const setupSocketListener = () => {
      if (window.socket) {
        if (window.socket.connected) {
          console.log('✅ Socket connected, setting up sidebar-settings-updated listener');
          window.socket.on('sidebar-settings-updated', socketHandler);
        } else {
          console.log('⚠️ Socket not connected yet, waiting...');
          window.socket.once('connect', () => {
            console.log('✅ Socket connected, setting up sidebar-settings-updated listener');
            window.socket.on('sidebar-settings-updated', socketHandler);
          });
        }
      } else {
        // Если socket еще не создан, пробуем через небольшую задержку
        setTimeout(() => {
          if (window.socket) {
            setupSocketListener();
          }
        }, 1000);
      }
    };
    
    setupSocketListener();
    
    return () => {
      window.removeEventListener('appTitleSettingsUpdated', handler);
      if (window.socket) {
        window.socket.off('sidebar-settings-updated', socketHandler);
      }
    };
  }, []);

  React.useEffect(() => {
    const check = () => setSocketConnected(window.socket?.connected ?? false);
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    
    return () => {
      document.body.style.overflow = originalOverflow || '';
      document.body.style.paddingRight = originalPaddingRight || '';
    };
  }, [open]);

  React.useEffect(() => {
    const onCloseAll = () => {
      setShowAvatarModal(false);
    };
    window.addEventListener('close-all-modals', onCloseAll);
    return () => window.removeEventListener('close-all-modals', onCloseAll);
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await res.json();
      if (data?.avatarUrl) {
        dispatch({ type: 'UPDATE_USER_AVATAR', payload: data.avatarUrl });
      }
    } catch (err) {
      alert('Ошибка загрузки аватара');
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Удалить аватар?')) return;
    try {
      const res = await fetch('/api/remove-avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data?.success) {
        dispatch({ type: 'UPDATE_USER_AVATAR', payload: null });
      }
    } catch (err) {
      alert('Ошибка удаления аватара');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
    onClose();
  };

  // Обработчики свайпа
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchEndX.current - touchStartX.current;
    const minSwipeDistance = 100;
    
    // Свайп вправо (закрытие сайдбара)
    if (distance > minSwipeDistance) {
      onClose();
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Не размонтируем компонент, а просто скрываем его, чтобы сохранить состояние SidebarNav
  return ReactDOM.createPortal(
    <>
    <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            background: 'rgba(0,0,0,0.85)',
            zIndex: 100000,
            display: open ? 'flex' : 'none',
            flexDirection: 'row',
            overflow: 'hidden',
            pointerEvents: open ? 'auto' : 'none'
          }}
          onClick={onClose}
        >
          <div
            ref={sidebarRef}
            onClick={e => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
              width: '100%',
              height: '100%',
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              color: '#fff',
              overflow: 'hidden'
            }}
          >
            {/* Заголовок с кнопкой стрелки назад */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(67,233,123,0.2)',
              background: 'rgba(34,40,49,0.95)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              overflow: 'visible',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              gap: '12px'
            }}>
              {/* Кнопка стрелки назад - показываем только если есть onOpenNav (для мобильных) */}
              {onOpenNav && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    // Небольшая задержка для плавного перехода
                    setTimeout(() => {
                      if (onOpenNav) {
                        onOpenNav();
                      }
                    }, 100);
                  }}
                  style={{
                    background: 'rgba(67,233,123,0.2)',
                    border: '1px solid #43e97b',
                    borderRadius: '12px',
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#43e97b',
                    fontSize: '24px',
                    padding: 0,
                    boxShadow: '0 4px 12px rgba(67,233,123,0.3)',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                    marginTop: '0'
                  }}
                  title="Назад к навигации"
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(67,233,123,0.3)';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(67,233,123,0.2)';
                    e.target.style.transform = 'none';
                  }}
                >
                  <FiArrowLeft />
                </button>
              )}
              
              <div style={{ flex: 1, position: 'relative' }}>
                {/* Изображения (абсолютное позиционирование по блоку) */}
                {appTitleSettings.snowmanEnabled && (appTitleSettings.snowmanImages || []).filter(img => img.enabled !== false && img.positionType === 'absolute').map((img) => (
                  <img
                    key={img.id}
                    src={img.image || frostyImg}
                    alt={`Изображение ${img.id}`}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${img.positionX || 0}px)`,
                      top: `${img.positionY || 0}px`,
                      transform: 'translateX(-50%)',
                      width: `${(img.scale || 100) * 0.6}px`,
                      height: 'auto',
                      zIndex: 10,
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}
                  />
                ))}
                
                {/* Обратная совместимость: старое одиночное изображение */}
                {appTitleSettings.snowmanEnabled && (!appTitleSettings.snowmanImages || appTitleSettings.snowmanImages.length === 0) && appTitleSettings.snowmanImage && appTitleSettings.snowmanPositionType === 'absolute' && (
                  <img
                    src={appTitleSettings.snowmanImage || frostyImg}
                    alt="Снеговик"
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${appTitleSettings.snowmanPositionX || 0}px)`,
                      top: `${appTitleSettings.snowmanPositionY || 0}px`,
                      transform: 'translateX(-50%)',
                      width: `${(appTitleSettings.snowmanScale || 100) * 0.6}px`,
                      height: 'auto',
                      zIndex: 10,
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}
                  />
                )}
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: onOpenNav ? 'flex-start' : 'center',
                  marginBottom: '12px'
                }}>
                  <h2 style={{
                    margin: 0,
                    color: '#43e97b',
                    fontWeight: 900,
                    fontSize: '1.3em',
                    textAlign: onOpenNav ? 'left' : 'center',
                    flex: 1
                  }}>
                    Меню
                  </h2>
                </div>

                {/* Название приложения */}
                <div style={{
                  padding: '12px 0',
                  textAlign: onOpenNav ? 'left' : 'center',
                  fontWeight: 700,
                  fontSize: '1em',
                  letterSpacing: '0.01em',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: onOpenNav ? 'flex-start' : 'center',
                  position: 'relative',
                  overflow: 'visible'
                }}>
                {/* Снег */}
                {shouldShowSnow && (
                  <div className="snow-container" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: '100vh',
                    width: '100%',
                    pointerEvents: 'none',
                    overflow: 'visible',
                    zIndex: 1
                  }}>
                    {snowflakes.map((_, index) => (
                      <span
                        key={index}
                        className={`snowflake snowflake-${index}`}
                        style={{
                          position: 'absolute',
                          top: '-20px',
                          left: `${(index / SNOWFLAKE_COUNT) * 100}%`,
                          color: 'rgba(255, 255, 255, 0.92)',
                          opacity: 0,
                          animationName: 'snowFall',
                          animationIterationCount: 'infinite',
                          animationTimingFunction: 'linear',
                          animationDelay: `${index * 0.45}s`,
                          animationDuration: `${4 + (index % 3)}s`,
                          fontSize: `${12 + (index % 4) * 2}px`,
                          filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.45))',
                          pointerEvents: 'none',
                          ['--snow-x']: `${-30 + (index % 7) * 12}px`,
                          ['--snow-y']: `calc(100vh + 20px)`
                        }}
                      >
                        ❄
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Изображения (относительно текста) */}
                {appTitleSettings.snowmanEnabled && (appTitleSettings.snowmanImages || []).filter(img => img.enabled !== false && img.positionType === 'relative').map((img) => (
                  <img
                    key={img.id}
                    src={img.image || frostyImg}
                    alt={`Изображение ${img.id}`}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${img.positionX || 0}px)`,
                      top: `${img.positionY || 0}px`,
                      transform: 'translateX(-50%)',
                      width: `${(img.scale || 100) * 0.6}px`,
                      height: 'auto',
                      zIndex: 10,
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}
                  />
                ))}
                
                {/* Обратная совместимость: старое одиночное изображение */}
                {appTitleSettings.snowmanEnabled && (!appTitleSettings.snowmanImages || appTitleSettings.snowmanImages.length === 0) && appTitleSettings.snowmanImage && appTitleSettings.snowmanPositionType === 'relative' && (
                  <img
                    src={appTitleSettings.snowmanImage || frostyImg}
                    alt="Снеговик"
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${appTitleSettings.snowmanPositionX || 0}px)`,
                      top: `${appTitleSettings.snowmanPositionY || 0}px`,
                      transform: 'translateX(-50%)',
                      width: `${(appTitleSettings.snowmanScale || 100) * 0.6}px`,
                      height: 'auto',
                      zIndex: 10,
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}
                  />
                )}
                
                {/* Текст "Мульти-мессенджер" и название "Issa Plus" удалены - теперь отображаются только в SidebarNav */}
                </div>
              </div>

              {/* Информация о пользователе */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 0',
                borderTop: '1px solid rgba(67,233,123,0.1)',
                marginTop: '12px'
              }}>
                <div style={{
                  position: 'relative',
                  left: `${appTitleSettings.avatarPositionX || 0}px`,
                  top: `${appTitleSettings.avatarPositionY || 0}px`
                }}>
                  <Avatar
                    size={`${Math.min(appTitleSettings.avatarWidth || 88, 80)}px`}
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      background: appTitleSettings.avatarImage ? 'transparent' : '#e3eaf2',
                      cursor: (state.user?.avatarUrl || appTitleSettings.avatarImage) ? 'zoom-in' : 'pointer',
                      fontSize: 24,
                      width: `${Math.min(appTitleSettings.avatarWidth || 88, 80)}px`,
                      height: `${Math.min(appTitleSettings.avatarHeight || 88, 80)}px`
                    }}
                    onMouseEnter={() => setAvatarHover(true)}
                    onMouseLeave={() => setAvatarHover(false)}
                    onClick={() => {
                      if (state.user?.avatarUrl || appTitleSettings.avatarImage) {
                        setShowAvatarActionsModal(true);
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    title={(state.user?.avatarUrl || appTitleSettings.avatarImage) ? 'Просмотреть/изменить аватар' : 'Загрузить аватар'}
                  >
                    {appTitleSettings.avatarImage ? (
                      <>
                        <img src={appTitleSettings.avatarImage} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                        {avatarHover && (
                          <>
                            <span
                              style={{
                                position: 'absolute', top: 2, right: 2, width: 18, height: 18, background: '#fff', borderRadius: '50%', boxShadow: '0 0 2px #aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#e74c3c', border: '1.5px solid #e3eaf2', cursor: 'pointer', zIndex: 2
                              }}
                              title="Удалить аватар"
                              onClick={e => { e.stopPropagation(); handleRemoveAvatar(); }}
                            >✕</span>
                            <span
                              style={{
                                position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, background: '#fff', borderRadius: '50%', boxShadow: '0 0 2px #aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#3498db', border: '1.5px solid #e3eaf2', cursor: 'pointer', zIndex: 2
                              }}
                              title="Загрузить новый аватар"
                              onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            >✎</span>
                          </>
                        )}
                      </>
                    ) : state.user?.avatarUrl ? (
                      <>
                        <img src={state.user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                        {avatarHover && (
                          <>
                            <span
                              style={{
                                position: 'absolute', top: 2, right: 2, width: 18, height: 18, background: '#fff', borderRadius: '50%', boxShadow: '0 0 2px #aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#e74c3c', border: '1.5px solid #e3eaf2', cursor: 'pointer', zIndex: 2
                              }}
                              title="Удалить аватар"
                              onClick={e => { e.stopPropagation(); handleRemoveAvatar(); }}
                            >✕</span>
                            <span
                              style={{
                                position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, background: '#fff', borderRadius: '50%', boxShadow: '0 0 2px #aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#3498db', border: '1.5px solid #e3eaf2', cursor: 'pointer', zIndex: 2
                              }}
                              title="Загрузить новый аватар"
                              onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            >✎</span>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {state.user?.username?.charAt(0).toUpperCase()}
                        <span style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, background: '#fff', borderRadius: '50%', boxShadow: '0 0 2px #aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#3498db', border: '1.5px solid #e3eaf2' }}>✎</span>
                      </>
                    )}
                  </Avatar>
                  
                  {/* Модалка действий с аватаркой */}
                  {showAvatarActionsModal && (state.user?.avatarUrl || appTitleSettings.avatarImage) && (
                    <div
                      onClick={() => setShowAvatarActionsModal(false)}
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        zIndex: 100010,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                      }}
                    >
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
                          borderRadius: '20px',
                          padding: '30px',
                          maxWidth: '400px',
                          width: '100%',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                          border: '2px solid rgba(67, 233, 123, 0.2)',
                        }}
                      >
                        {/* Превью аватарки */}
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                          <img
                            src={appTitleSettings.avatarImage || state.user.avatarUrl}
                            alt="avatar-preview"
                            style={{
                              width: '120px',
                              height: '120px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '3px solid rgba(67, 233, 123, 0.3)',
                              boxShadow: '0 4px 16px rgba(67, 233, 123, 0.3)',
                              margin: '0 auto',
                            }}
                          />
                        </div>

                        {/* Кнопки действий */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <button
                            onClick={() => {
                              setShowAvatarActionsModal(false);
                              setShowAvatarModal(true);
                            }}
                            style={{
                              padding: '14px 20px',
                              borderRadius: '12px',
                              border: '2px solid rgba(67, 233, 123, 0.3)',
                              background: 'linear-gradient(135deg, rgba(67, 233, 123, 0.15) 0%, rgba(67, 233, 123, 0.05) 100%)',
                              color: '#43e97b',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '16px',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(67, 233, 123, 0.25) 0%, rgba(67, 233, 123, 0.15) 100%)';
                              e.currentTarget.style.borderColor = '#43e97b';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(67, 233, 123, 0.15) 0%, rgba(67, 233, 123, 0.05) 100%)';
                              e.currentTarget.style.borderColor = 'rgba(67, 233, 123, 0.3)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            👁️ Просмотреть
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAvatarActionsModal(false);
                              fileInputRef.current?.click();
                            }}
                            style={{
                              padding: '14px 20px',
                              borderRadius: '12px',
                              border: '2px solid rgba(255, 224, 130, 0.3)',
                              background: 'linear-gradient(135deg, rgba(255, 224, 130, 0.15) 0%, rgba(255, 224, 130, 0.05) 100%)',
                              color: '#ffe082',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '16px',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 224, 130, 0.25) 0%, rgba(255, 224, 130, 0.15) 100%)';
                              e.currentTarget.style.borderColor = '#ffe082';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 224, 130, 0.15) 0%, rgba(255, 224, 130, 0.05) 100%)';
                              e.currentTarget.style.borderColor = 'rgba(255, 224, 130, 0.3)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            ✏️ Изменить
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAvatarActionsModal(false);
                              handleRemoveAvatar();
                            }}
                            style={{
                              padding: '14px 20px',
                              borderRadius: '12px',
                              border: '2px solid rgba(231, 76, 60, 0.3)',
                              background: 'linear-gradient(135deg, rgba(231, 76, 60, 0.15) 0%, rgba(231, 76, 60, 0.05) 100%)',
                              color: '#e74c3c',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '16px',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(231, 76, 60, 0.25) 0%, rgba(231, 76, 60, 0.15) 100%)';
                              e.currentTarget.style.borderColor = '#e74c3c';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(231, 76, 60, 0.15) 0%, rgba(231, 76, 60, 0.05) 100%)';
                              e.currentTarget.style.borderColor = 'rgba(231, 76, 60, 0.3)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            🗑️ Удалить
                          </button>

                          <button
                            onClick={() => setShowAvatarActionsModal(false)}
                            style={{
                              padding: '14px 20px',
                              borderRadius: '12px',
                              border: '2px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.1)',
                              color: '#fff',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '16px',
                              transition: 'all 0.2s',
                              marginTop: '8px',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            }}
                          >
                            ✕ Закрыть
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Модалка просмотра аватарки */}
                  {showAvatarModal && (state.user?.avatarUrl || appTitleSettings.avatarImage) && (
                    <div
                      onClick={() => setShowAvatarModal(false)}
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.9)',
                        zIndex: 100011,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <button
                        onClick={() => setShowAvatarModal(false)}
                        style={{
                          position: 'absolute',
                          top: 20,
                          right: 20,
                          width: 40,
                          height: 40,
                          background: 'rgba(0, 0, 0, 0.7)',
                          border: 'none',
                          borderRadius: '50%',
                          color: '#fff',
                          fontSize: 20,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 100012,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(231, 76, 60, 0.8)';
                          e.currentTarget.style.borderColor = '#e74c3c';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Закрыть"
                      >
                        <FiX />
                      </button>
                      <img
                        src={appTitleSettings.avatarImage || state.user.avatarUrl}
                        alt="avatar-large"
                        onClick={e => e.stopPropagation()}
                        style={{
                          maxWidth: '90vw',
                          maxHeight: '90vh',
                          borderRadius: '20px',
                          boxShadow: '0 8px 40px rgba(67, 233, 123, 0.3)',
                          border: '3px solid rgba(67, 233, 123, 0.2)',
                        }}
                      />
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#6dd5ed', fontSize: '1.05em', marginBottom: '4px' }}>
                    {state.user?.username}
                  </div>
                  {state.user?.department && (
                    <div style={{ fontSize: '0.9em', color: '#b2bec3' }}>{state.user.department}</div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'linear-gradient(135deg, #e74c3c 0%, #fcb69f 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    fontSize: '1em',
                    boxShadow: '0 2px 8px rgba(231,76,60,0.2)',
                    transition: 'all 0.2s',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #fcb69f 0%, #e74c3c 100%)';
                    e.target.style.transform = 'translateY(-2px) scale(1.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #e74c3c 0%, #fcb69f 100%)';
                    e.target.style.transform = 'none';
                  }}
                >
                  <FiLogOut size={18} />
                  Выйти
                </button>
              </div>
            </div>

            {/* Навигация - только если showNav === true */}
            {showNav && (
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                WebkitOverflowScrolling: 'touch'
              }}>
                <SidebarNav 
                  showChatsModal={showChatsModal} 
                  setShowChatsModal={setShowChatsModal}
                  onCloseMobileSidebar={onClose}
                  onOpenMobileSidebar={() => {
                    // Открываем сайдбар, если он закрыт
                    if (!open && onOpen) {
                      onOpen();
                    } else if (!open) {
                      // Fallback: используем событие для открытия
                      window.dispatchEvent(new CustomEvent('open-mobile-sidebar'));
                    }
                  }}
                />
              </div>
            )}

          </div>
        </div>
      <style>{`
        @keyframes neonGlow {
          0% { 
            text-shadow: 0 0 ${Number(appTitleSettings.glowIntensity) || 12}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        0 0 ${((Number(appTitleSettings.glowSpread) || 32) * 0.5)}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        0 0 2px #fff, 
                        0 0 ${((Number(appTitleSettings.glowSpread) || 32) * 0.75)}px ${appTitleSettings.glowColor || '#43e97b'}88; 
          }
          50% { 
            text-shadow: 0 0 ${((Number(appTitleSettings.glowIntensity) || 12) * 2)}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        0 0 ${Number(appTitleSettings.glowSpread) || 32}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        0 0 8px #fff, 
                        0 0 ${Number(appTitleSettings.glowSpread) || 32}px ${appTitleSettings.glowColor || '#43e97b'}cc; 
          }
          100% { 
            text-shadow: 0 0 ${Number(appTitleSettings.glowIntensity) || 12}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        0 0 ${((Number(appTitleSettings.glowSpread) || 32) * 0.5)}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        0 0 2px #fff, 
                        0 0 ${((Number(appTitleSettings.glowSpread) || 32) * 0.75)}px ${appTitleSettings.glowColor || '#43e97b'}88; 
          }
        }
        @keyframes gradientAnimation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes sparkleAnimation {
          0%, 100% { 
            text-shadow: 0 0 ${Number(appTitleSettings.glowIntensity) || 12}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        0 0 ${Number(appTitleSettings.glowSpread) || 32}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        2px 2px 4px rgba(0,0,0,0.3),
                        -2px -2px 4px ${appTitleSettings.glowColor || '#43e97b'}88;
          }
          25% { 
            text-shadow: 0 0 ${Number(appTitleSettings.glowIntensity) || 12}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        0 0 ${Number(appTitleSettings.glowSpread) || 32}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        4px 4px 8px rgba(0,0,0,0.3),
                        -4px -4px 8px ${appTitleSettings.glowColor || '#43e97b'}cc,
                        0 0 ${(Number(appTitleSettings.glowSpread) || 32) * 1.5}px ${appTitleSettings.glowColor || '#43e97b'};
          }
          50% { 
            text-shadow: 0 0 ${Number(appTitleSettings.glowIntensity) || 12}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        0 0 ${Number(appTitleSettings.glowSpread) || 32}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        2px 2px 4px rgba(0,0,0,0.3),
                        -2px -2px 4px ${appTitleSettings.glowColor || '#43e97b'}88;
          }
          75% { 
            text-shadow: 0 0 ${Number(appTitleSettings.glowIntensity) || 12}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        0 0 ${Number(appTitleSettings.glowSpread) || 32}px ${appTitleSettings.glowColor || '#43e97b'}, 
                        -4px -4px 8px rgba(0,0,0,0.3),
                        4px 4px 8px ${appTitleSettings.glowColor || '#43e97b'}cc,
                        0 0 ${(Number(appTitleSettings.glowSpread) || 32) * 1.5}px ${appTitleSettings.glowColor || '#43e97b'};
          }
        }
        @keyframes newYearAnimation {
          0% { 
            text-shadow: 0 0 ${Number(appTitleSettings.glowIntensity) || 12}px #ff0000, 
                        0 0 ${Number(appTitleSettings.glowSpread) || 32}px #ff0000, 
                        0 0 ${(Number(appTitleSettings.glowSpread) || 32) * 0.5}px #ffd700,
                        2px 2px 4px rgba(255, 0, 0, 0.5);
            filter: hue-rotate(0deg);
          }
          25% { 
            text-shadow: 0 0 ${Number(appTitleSettings.glowIntensity) || 12}px #00ff00, 
                        0 0 ${Number(appTitleSettings.glowSpread) || 32}px #00ff00, 
                        0 0 ${(Number(appTitleSettings.glowSpread) || 32) * 0.5}px #ffd700,
                        2px 2px 4px rgba(0, 255, 0, 0.5);
            filter: hue-rotate(90deg);
          }
          50% { 
            text-shadow: 0 0 ${Number(appTitleSettings.glowIntensity) || 12}px #ffd700, 
                        0 0 ${Number(appTitleSettings.glowSpread) || 32}px #ffd700, 
                        0 0 ${(Number(appTitleSettings.glowSpread) || 32) * 0.5}px #ff0000,
                        2px 2px 4px rgba(255, 215, 0, 0.5);
            filter: hue-rotate(180deg);
          }
          75% { 
            text-shadow: 0 0 ${Number(appTitleSettings.glowIntensity) || 12}px #ff1493, 
                        0 0 ${Number(appTitleSettings.glowSpread) || 32}px #ff1493, 
                        0 0 ${(Number(appTitleSettings.glowSpread) || 32) * 0.5}px #00ff00,
                        2px 2px 4px rgba(255, 20, 147, 0.5);
            filter: hue-rotate(270deg);
          }
          100% { 
            text-shadow: 0 0 ${Number(appTitleSettings.glowIntensity) || 12}px #ff0000, 
                        0 0 ${Number(appTitleSettings.glowSpread) || 32}px #ff0000, 
                        0 0 ${(Number(appTitleSettings.glowSpread) || 32) * 0.5}px #ffd700,
                        2px 2px 4px rgba(255, 0, 0, 0.5);
            filter: hue-rotate(360deg);
          }
        }
        .neon-issa-plus {
          ${(appTitleSettings.glowEnabled === true && (appTitleSettings.effectType || 'neon') === 'neon') ? 'animation: neonGlow 1.6s infinite alternate;' : ''}
          ${(appTitleSettings.glowEnabled === true && appTitleSettings.effectType === 'gradient-animation') ? 'animation: gradientAnimation 3s ease infinite;' : ''}
          ${(appTitleSettings.glowEnabled === true && appTitleSettings.effectType === 'gradient-animation') ? `background: linear-gradient(-45deg, ${appTitleSettings.glowColor || '#43e97b'}, ${appTitleSettings.color || '#43e97b'}, ${appTitleSettings.glowColor || '#43e97b'}, ${appTitleSettings.color || '#43e97b'});` : ''}
          ${(appTitleSettings.glowEnabled === true && appTitleSettings.effectType === 'gradient-animation') ? 'background-size: 400% 400%;' : ''}
          ${(appTitleSettings.glowEnabled === true && appTitleSettings.effectType === 'gradient-animation') ? '-webkit-background-clip: text;' : ''}
          ${(appTitleSettings.glowEnabled === true && appTitleSettings.effectType === 'gradient-animation') ? '-webkit-text-fill-color: transparent;' : ''}
          ${(appTitleSettings.glowEnabled === true && appTitleSettings.effectType === 'gradient-animation') ? 'background-clip: text;' : ''}
          ${(appTitleSettings.glowEnabled === true && appTitleSettings.effectType === 'sparkle') ? 'animation: sparkleAnimation 2s ease-in-out infinite;' : ''}
          ${(appTitleSettings.glowEnabled === true && appTitleSettings.effectType === 'new-year') ? 'animation: newYearAnimation 3s ease-in-out infinite;' : ''}
          display: inline;
          white-space: nowrap;
        }
        .issa-plus-festive { position: relative; }
        .issa-plus-text { position: relative; display: inline-flex; align-items: center; gap: 10px; }
        .issa-plus-word { position: relative; display: inline-flex; align-items: flex-start; gap: 2px; white-space: nowrap; }
        .issa-plus-last { position: relative; display: inline-block; padding-right: 2px; }
        .santa-hat { position: absolute; top: -12px; left: -4px; width: 24px; height: 18px; transform: rotate(-15deg); }
        .santa-hat::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 0;
          border-left: 12px solid transparent;
          border-right: 12px solid transparent;
          border-bottom: 20px solid #ff4d6d;
          filter: drop-shadow(0 0 4px rgba(255,77,109,0.4));
        }
        .santa-hat::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: -5px;
          width: 28px;
          height: 8px;
          background: #fff;
          border-radius: 9px;
          box-shadow: 0 0 6px rgba(255,255,255,0.4);
        }
        .santa-hat__pom {
          position: absolute;
          bottom: -8px;
          right: -7px;
          width: 10px;
          height: 10px;
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 0 5px rgba(255,255,255,0.45);
        }
        @keyframes snowFall {
          0% { 
            transform: translate3d(var(--snow-x, 40px), 0, 0) rotate(0deg); 
            opacity: 0; 
          }
          10% { 
            opacity: 0.9; 
          }
          100% { 
            transform: translate3d(var(--snow-x, 40px), var(--snow-y, calc(100vh + 20px)), 0) rotate(360deg); 
            opacity: 0; 
          }
        }
        .snow-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          height: 100vh;
          width: 100%;
          pointer-events: none;
          overflow: visible;
        }
        .snowflake {
          position: absolute;
          top: -20px;
          color: rgba(255, 255, 255, 0.92);
          opacity: 0;
          animation-name: snowFall;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
          filter: drop-shadow(0 0 6px rgba(255,255,255,0.45));
        }
      `}</style>
    </>,
    document.body
  );
}

