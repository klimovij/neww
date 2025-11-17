import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { FiLogOut, FiX } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../../styles/GlobalStyles';
import SidebarNav from './SidebarNav';
import frostyImg from '../../assets/icons/Frosty.png';

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
  snowmanEnabled: false,
  snowmanImage: null,
  snowmanPositionX: 0,
  snowmanPositionY: 0,
  snowmanScale: 100,
  snowmanPositionType: 'relative',
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

export default function SidebarMobile({ open, onClose, onOpen }) {
  const { state, dispatch } = useApp();
  const fileInputRef = useRef();
  const [avatarHover, setAvatarHover] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
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
    const settings = getAppTitleSettings();
    setAppTitleSettings(settings);
    
    if (settings.customFontUrl) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = settings.customFontUrl;
      document.head.appendChild(link);
    }
    
    const handler = () => {
      const newSettings = getAppTitleSettings();
      setAppTitleSettings(newSettings);
      
      if (newSettings.customFontUrl) {
        const existingLink = document.querySelector(`link[href="${newSettings.customFontUrl}"]`);
        if (!existingLink) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = newSettings.customFontUrl;
          document.head.appendChild(link);
        }
      }
    };
    window.addEventListener('appTitleSettingsUpdated', handler);
    return () => window.removeEventListener('appTitleSettingsUpdated', handler);
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
    <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              color: '#fff',
              overflow: 'hidden'
            }}
          >
            {/* Заголовок с кнопкой закрытия */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(67,233,123,0.2)',
              background: 'rgba(34,40,49,0.95)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              overflow: 'visible'
            }}>
              {/* Снеговик (абсолютное позиционирование по блоку) */}
              {appTitleSettings.snowmanEnabled && appTitleSettings.snowmanPositionType === 'absolute' && (
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
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <h2 style={{
                  margin: 0,
                  color: '#43e97b',
                  fontWeight: 900,
                  fontSize: '1.3em',
                  textAlign: 'center'
                }}>
                  Меню
                </h2>
              </div>

              {/* Индикатор связи с сервером */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.9em',
                fontWeight: 600,
                padding: '8px',
                background: 'rgba(67,233,123,0.1)',
                borderRadius: '10px',
                marginBottom: '12px'
              }}>
                <span style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: socketConnected ? '#43e97b' : '#e74c3c',
                  display: 'inline-block',
                  boxShadow: socketConnected ? '0 0 6px #43e97b88' : '0 0 6px #e74c3c88'
                }}></span>
                {socketConnected ? 'Онлайн' : 'Нет соединения'}
              </div>

              {/* Название приложения */}
              <div style={{
                padding: '12px 0',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '1em',
                letterSpacing: '0.01em',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                overflow: 'visible'
              }}>
                {/* Снег */}
                {shouldShowSnow && (
                  <div className="snow-container" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '200px',
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
                          ['--snow-y']: `${140 + (index % 6) * 18}px`
                        }}
                      >
                        ❄
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Снеговик (относительно текста) */}
                {appTitleSettings.snowmanEnabled && appTitleSettings.snowmanPositionType === 'relative' && (
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
                
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span role="img" aria-label="chat">💬</span> Мессенджер
                </span>
                <span className="neon-issa-plus issa-plus-festive" style={(() => {
                  const style = {
                    fontSize: appTitleSettings.fontSize || '2em',
                    fontFamily: appTitleSettings.customFontName ? `"${appTitleSettings.customFontName}", ${appTitleSettings.fontFamily}` : appTitleSettings.fontFamily,
                    marginTop: 2,
                  };

                  const effectType = appTitleSettings.effectType || 'neon';
                  if (appTitleSettings.useGradient === true && effectType !== 'gradient-animation') {
                    const gradientStart = appTitleSettings.gradientStart || '#43e97b';
                    const gradientEnd = appTitleSettings.gradientEnd || '#2193b0';
                    style.background = `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`;
                    style.WebkitBackgroundClip = 'text';
                    style.WebkitTextFillColor = 'transparent';
                    style.backgroundClip = 'text';
                    style.color = 'transparent';
                  } else if (effectType === 'gradient-animation' && appTitleSettings.glowEnabled) {
                    style.color = 'transparent';
                  } else {
                    style.color = appTitleSettings.color || '#43e97b';
                    style.background = 'none';
                    style.WebkitBackgroundClip = 'unset';
                    style.WebkitTextFillColor = 'unset';
                    style.backgroundClip = 'unset';
                  }

                  if (appTitleSettings.glowEnabled === true) {
                    const intensity = Number(appTitleSettings.glowIntensity) || 12;
                    const spread = Number(appTitleSettings.glowSpread) || 32;
                    const glowColor = appTitleSettings.glowColor || '#43e97b';
                    
                    switch (effectType) {
                      case 'shadow':
                        style.textShadow = `3px 3px 6px rgba(0,0,0,0.5), 0 0 ${intensity}px ${glowColor}, 0 0 ${spread}px ${glowColor}`;
                        break;
                      case 'outline':
                        style.textShadow = `-1px -1px 0 ${glowColor}, 1px -1px 0 ${glowColor}, -1px 1px 0 ${glowColor}, 1px 1px 0 ${glowColor}, 0 0 ${intensity}px ${glowColor}, 0 0 ${spread}px ${glowColor}`;
                        break;
                      case 'sparkle':
                        style.textShadow = `0 0 ${intensity}px ${glowColor}, 0 0 ${spread}px ${glowColor}, 0 0 ${spread * 1.5}px ${glowColor}, 2px 2px 4px rgba(0,0,0,0.3), -2px -2px 4px ${glowColor}88`;
                        break;
                      case 'gradient-animation':
                        style.textShadow = `0 0 ${intensity}px ${glowColor}, 0 0 ${spread}px ${glowColor}`;
                        break;
                      case 'new-year':
                        style.textShadow = `0 0 ${intensity}px #ff0000, 0 0 ${spread}px #ff0000`;
                        break;
                      case 'neon':
                      default:
                        break;
                    }
                  } else {
                    style.textShadow = 'none';
                  }

                  return style;
                })()}>
                  <span className="issa-plus-text">
                    <span className="issa-plus-word">
                      {appTitleSettings.text}
                      {isWinterSeason && (
                        <span className="issa-plus-last">
                          <span className="santa-hat">
                            <span className="santa-hat__pom" />
                          </span>
                        </span>
                      )}
                    </span>
                  </span>
                </span>
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
                      if (state.user?.avatarUrl || appTitleSettings.avatarImage) setShowAvatarModal(true);
                      else fileInputRef.current?.click();
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
                  {showAvatarModal && (state.user?.avatarUrl || appTitleSettings.avatarImage) && (
                    <div
                      onClick={() => setShowAvatarModal(false)}
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        zIndex: 9999,
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
                          zIndex: 10000
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
                          borderRadius: '18px',
                          boxShadow: '0 8px 40px 0 rgba(31,38,135,0.25)'
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

            {/* Навигация */}
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

            {/* Подсказка о свайпе */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(67,233,123,0.1)',
              background: 'rgba(34,40,49,0.6)',
              textAlign: 'center',
              fontSize: '0.85em',
              color: '#b2bec3'
            }}>
              ← Свайпните вправо, чтобы закрыть
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
          display: block;
        }
        .issa-plus-festive { position: relative; }
        .issa-plus-text { position: relative; display: inline-flex; align-items: center; gap: 10px; }
        .issa-plus-word { position: relative; display: inline-flex; align-items: flex-start; gap: 2px; }
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
            transform: translate3d(var(--snow-x, 40px), var(--snow-y, 160px), 0) rotate(360deg); 
            opacity: 0; 
          }
        }
        .snow-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 200px;
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
        </div>,
    document.body
  );
}

