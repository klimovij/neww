import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCalendarAlt, FaTasks, FaNewspaper, FaComments } from 'react-icons/fa';
import styled from 'styled-components';
import { FiLogOut, FiPlus, FiShield, FiX } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { Button, Avatar } from '../../styles/GlobalStyles';
import SidebarNav from './SidebarNav';
import ChatList from './ChatList';
import AllUsers from '../AllUsers';
// import christmasTreeImg from '../../assets/icons/cristmas.png';
import frostyImg from '../../assets/icons/Frosty.png';

const SNOWFLAKE_COUNT = 14;

// Индикатор связи с сервером
const ServerStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.01em;
  font-weight: 600;
  padding: 10px 0 0 0;
  margin-bottom: 2px;
  margin-left: 10px;
`;
// import GeneralCalendarModal from '../GeneralCalendarModal';
// import OnlineUsers from './OnlineUsers';
// import Emoji from '../Common/Emoji';

// Модальное окно для просмотра аватарки
const AvatarModalBg = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
`;
const AvatarModalImg = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  border-radius: 18px;
  box-shadow: 0 8px 40px 0 rgba(31,38,135,0.25);
`;
const AvatarModalCloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10000;
  
  &:hover {
    background: rgba(231, 76, 60, 0.8);
    transform: scale(1.1);
  }
`;
const SidebarContainer = styled.div`
  width: 320px;
  background: rgba(34, 40, 49, 0.93);
  color: #f5f6fa;
  display: flex;
  flex-direction: column;
  border-radius: 28px 0 0 28px;
  box-shadow: 0 8px 40px 0 rgba(31,38,135,0.13);
  margin: 18px 0 18px 18px;
  overflow: hidden;
  backdrop-filter: blur(14px);
  border: none;
  animation: sidebarFadeIn 0.4s cubic-bezier(.4,0,.2,1);
  @keyframes sidebarFadeIn {
    from { opacity: 0; transform: translateX(-40px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
  
  @media (max-width: 768px) {
    display: none; /* Скрываем десктопный сайдбар на мобильных устройствах */
  }
`;

const SidebarHeader = styled.div`
  padding: 1.5rem 2rem 1.2rem 2rem;
  border-bottom: 1px solid #232931;
  background: linear-gradient(135deg, #232526 0%, #232931 100%);
  box-shadow: 0 2px 12px rgba(44,62,80,0.10);
  position: relative;
  overflow: hidden;
`;

const UserInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
`;

const Username = styled.span`
  font-weight: 700;
  color: #6dd5ed;
  font-size: 1.05rem;
`;

const LogoutButton = styled.button`
  background: linear-gradient(135deg, #e74c3c 0%, #fcb69f 100%);
  color: #fff;
  border: none;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(231,76,60,0.10);
  transition: all 0.2s;
  &:hover {
    background: linear-gradient(135deg, #fcb69f 0%, #e74c3c 100%);
    transform: translateY(-2px) scale(1.04);
    box-shadow: 0 4px 16px rgba(231,76,60,0.13);
  }
`;

const ChatControls = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #232931;
  background: rgba(44,62,80,0.85);
`;

const CreateChatButton = styled(Button)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
  color: #fff;
  font-weight: 700;
  font-size: 1.08rem;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(44,62,80,0.10);
  border: none;
  margin-top: 6px;
  transition: all 0.2s;
  &:hover {
    background: linear-gradient(135deg, #6dd5ed 0%, #2193b0 100%);
    color: #fff;
    transform: scale(1.04);
    box-shadow: 0 4px 16px rgba(44,62,80,0.13);
  }
`;

const SidebarContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgba(44,62,80,0.80);
  border-radius: 0 0 0 28px;
  box-shadow: 0 2px 12px rgba(44,62,80,0.06);
`;

const RightsButton = styled(Button)`
  width: calc(100% - 32px);
  margin: 12px 16px 0 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(135deg, #6dd5ed 0%, #2193b0 100%);
  color: #fff;
  font-weight: 800;
  font-size: 1.08rem;
  padding: 12px 14px;
  border: none;
  border-radius: 14px;
  box-shadow: 0 6px 18px rgba(33,147,176,0.28), 0 0 0 2px rgba(67,233,123,0.12);
  transition: transform .12s ease, box-shadow .2s ease, opacity .2s ease, background .2s ease;
  &:hover {
    background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
    transform: translateY(-1px);
    box-shadow: 0 10px 28px rgba(33,147,176,0.36), 0 0 0 2px rgba(67,233,123,0.18);
  }
  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 12px rgba(33,147,176,0.24), 0 0 0 2px rgba(67,233,123,0.16);
  }
`;
// Обертка и панель с размерами как у модалки создания задач
const RightsWrapper = styled.div`
  position: fixed;
  top: 0;
  left: calc(380px + max((100vw - 380px - 1200px)/2, 0px));
  width: 1170px;
  min-width: 600px;
  max-width: 1170px;
  height: 92vh;
  margin: 32px 0;
  z-index: 200000;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  pointer-events: auto;
`;

const RightsPanel = styled.div`
  background: linear-gradient(135deg, #232931 0%, #181c22 100%);
  border-radius: 28px;
  width: 100%;
  min-width: 600px;
  max-width: 1200px;
  height: 100%;
  box-sizing: border-box;
  box-shadow: 0 4px 32px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  position: relative;
  color: #fff;
  padding: 40px 48px;
  overflow-y: auto;
  overflow-x: hidden;
`;

const RightsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 14px 0;
  color: #fff;
`;

const RightsTitle = styled.div`
  font-weight: 800;
  font-size: 1.08rem;
`;

const RightsClose = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 1.6rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s, color 0.3s;
  &:hover { background: rgba(34, 197, 94, 0.18); color: #43e97b; }
`;

const RightsBody = styled.div`
  flex: 1;
  overflow: auto;
  padding-right: 8px;
`;

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

export default function Sidebar() {
  const { state, dispatch } = useApp();
  const fileInputRef = useRef();
  const [avatarHover, setAvatarHover] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showGeneralCalendar, setShowGeneralCalendar] = useState(false);
  const [generalEvents, setGeneralEvents] = useState([]);
  const [socketConnected, setSocketConnected] = useState(() => window.socket?.connected ?? false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [appTitleSettings, setAppTitleSettings] = useState(getAppTitleSettings());

  const snowflakes = React.useMemo(
    () => Array.from({ length: SNOWFLAKE_COUNT }),
    []
  );
  const isWinterSeason = React.useMemo(() => {
    const today = new Date();
    const month = today.getMonth(); // 0 - январь, 11 - декабрь
    const day = today.getDate();
    if (month === 11) return true; // декабрь
    if (month === 0) return true; // январь
    if (month === 1 && day <= 28) return true; // февраль до 28 включительно
    return false;
  }, []);

  // Настройка снега из localStorage
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
    return null; // null = автоматически
  });

  // Определяем, показывать ли снег
  const shouldShowSnow = React.useMemo(() => {
    if (snowEnabled === true) return true; // всегда включен
    if (snowEnabled === false) return false; // всегда выключен
    return isWinterSeason; // автоматически по сезону
  }, [snowEnabled, isWinterSeason]);

  // Слушаем изменения настроек снега
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
  
  // Загрузка настроек названия приложения и загрузка кастомных шрифтов
  useEffect(() => {
    const settings = getAppTitleSettings();
    setAppTitleSettings(settings);
    
    // Загрузка кастомного шрифта, если указан URL
    if (settings.customFontUrl) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = settings.customFontUrl;
      document.head.appendChild(link);
    }
    
    const handler = () => {
      const newSettings = getAppTitleSettings();
      setAppTitleSettings(newSettings);
      
      // Загрузка нового кастомного шрифта, если изменился URL
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

  // Открытие панели прав из других частей приложения
  useEffect(() => {
    const handler = () => setShowAllUsers(v => !v);
    window.addEventListener('toggle-users-rights', handler);
    return () => window.removeEventListener('toggle-users-rights', handler);
  }, []);

  const [showChatsModal, setShowChatsModal] = useState(false);

  // Следим за статусом соединения
  React.useEffect(() => {
    const check = () => setSocketConnected(window.socket?.connected ?? false);
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // TODO: добавить валидацию типа/размера
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
  };

  const handleCreateChat = () => {
    dispatch({ 
      type: 'TOGGLE_MODAL', 
      payload: { modal: 'createChat', show: true } 
    });
  };

  React.useEffect(() => {
    const handler = () => setShowGeneralCalendar(true);
    window.addEventListener('show-all-leaves', handler);
    return () => window.removeEventListener('show-all-leaves', handler);
  }, []);

  // Реакция на глобальное закрытие всех модалок
  React.useEffect(() => {
    const onCloseAll = () => {
      setShowAllUsers(false);
      setShowAvatarModal(false);
    };
    window.addEventListener('close-all-modals', onCloseAll);
    return () => window.removeEventListener('close-all-modals', onCloseAll);
  }, []);

  React.useEffect(() => {
    // Здесь можно получить события для общего календаря
    // Например, fetch('/api/all-leaves').then(r=>r.json()).then(setGeneralEvents);
    setGeneralEvents([
      { startDate: '2025-08-10', endDate: '2025-08-12', type: 'vacation' },
      { startDate: '2025-08-13', endDate: '2025-08-13', type: 'leave' },
      { startDate: '2025-08-14', endDate: '2025-08-15', type: 'sick' }
    ]);
  }, []);

  return (
    <SidebarContainer>
      {/* Индикатор связи с сервером */}
      <ServerStatus>
        <span style={{width:14,height:14,borderRadius:'50%',background:socketConnected?'#43e97b':'#e74c3c',display:'inline-block',boxShadow:socketConnected?'0 0 6px #43e97b88':'0 0 6px #e74c3c88'}}></span>
        {socketConnected ? 'Онлайн' : 'Нет соединения'}
      </ServerStatus>
      <SidebarHeader>
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
        {shouldShowSnow && (
          <div className="snow-container">
            {snowflakes.map((_, index) => (
              <span
                key={index}
                className={`snowflake snowflake-${index}`}
                style={{
                  left: `${(index / SNOWFLAKE_COUNT) * 100}%`,
                  animationDelay: `${index * 0.45}s`,
                  animationDuration: `${4 + (index % 3)}s`,
                  fontSize: `${12 + (index % 4) * 2}px`,
                  ['--snow-x']: `${-30 + (index % 7) * 12}px`,
                  ['--snow-y']: `${140 + (index % 6) * 18}px`
                }}
              >
                ❄
              </span>
            ))}
          </div>
        )}
        <div style={{padding:'18px 0 8px 0',textAlign:'center',fontWeight:700,fontSize:'1.18em',letterSpacing:'0.01em',color:'#fff',display:'flex',flexDirection:'column',alignItems:'center', position: 'relative'}}>
          {/* Снеговик */}
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
          <span style={{display:'flex',alignItems:'center',gap:6,marginLeft:-50,}}>
            <span role="img" aria-label="chat">💬</span> Мессенджер
          </span>
          <span className="neon-issa-plus issa-plus-festive" style={(() => {
            const style = {
              fontSize: appTitleSettings.fontSize || '2em',
              fontFamily: appTitleSettings.customFontName ? `"${appTitleSettings.customFontName}", ${appTitleSettings.fontFamily}` : appTitleSettings.fontFamily,
              marginTop: 2,
              marginLeft: -50,
            };

            // Применяем градиент (если не используется градиентная анимация)
            const effectType = appTitleSettings.effectType || 'neon';
            if (appTitleSettings.useGradient === true && effectType !== 'gradient-animation') {
              const gradientStart = appTitleSettings.gradientStart || '#43e97b';
              const gradientEnd = appTitleSettings.gradientEnd || '#2193b0';
              style.background = `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`;
              style.WebkitBackgroundClip = 'text';
              style.WebkitTextFillColor = 'transparent';
              style.backgroundClip = 'text';
              // Убираем color при градиенте
              style.color = 'transparent';
            } else if (effectType === 'gradient-animation' && appTitleSettings.glowEnabled) {
              // Градиентная анимация будет применена через CSS класс
              style.color = 'transparent';
            } else {
              style.color = appTitleSettings.color || '#43e97b';
              // Убираем градиентные свойства
              style.background = 'none';
              style.WebkitBackgroundClip = 'unset';
              style.WebkitTextFillColor = 'unset';
              style.backgroundClip = 'unset';
            }

            // Применяем эффекты в зависимости от выбранного типа
            if (appTitleSettings.glowEnabled === true) {
              const intensity = Number(appTitleSettings.glowIntensity);
              const spread = Number(appTitleSettings.glowSpread);
              const glowColor = appTitleSettings.glowColor || '#43e97b';
              
              // Убеждаемся, что значения не undefined или NaN
              const finalIntensity = (isNaN(intensity) || intensity === 0) ? 12 : intensity;
              const finalSpread = (isNaN(spread) || spread === 0) ? 32 : spread;
              
              switch (effectType) {
                case 'shadow':
                  // Эффект тени
                  style.textShadow = `3px 3px 6px rgba(0,0,0,0.5), 0 0 ${finalIntensity}px ${glowColor}, 0 0 ${finalSpread}px ${glowColor}`;
                  break;
                case 'outline':
                  // Эффект обводки
                  style.textShadow = `-1px -1px 0 ${glowColor}, 1px -1px 0 ${glowColor}, -1px 1px 0 ${glowColor}, 1px 1px 0 ${glowColor}, 0 0 ${finalIntensity}px ${glowColor}, 0 0 ${finalSpread}px ${glowColor}`;
                  break;
                case 'sparkle':
                  // Эффект искр
                  style.textShadow = `0 0 ${finalIntensity}px ${glowColor}, 0 0 ${finalSpread}px ${glowColor}, 0 0 ${finalSpread * 1.5}px ${glowColor}, 2px 2px 4px rgba(0,0,0,0.3), -2px -2px 4px ${glowColor}88`;
                  break;
                case 'gradient-animation':
                  // Градиентная анимация
                  style.textShadow = `0 0 ${finalIntensity}px ${glowColor}, 0 0 ${finalSpread}px ${glowColor}`;
                  break;
                case 'new-year':
                  // Новогодняя анимация (будет через анимацию)
                  // Не устанавливаем textShadow здесь, анимация будет управлять им
                  break;
                case 'neon':
                default:
                  // Неоновое свечение (будет через анимацию)
                  // Не устанавливаем textShadow здесь, анимация будет управлять им
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
              {/* <img src={christmasTreeImg} alt="Новогодняя ёлка" className="issa-plus-tree" /> */}
            </span>
          </span>
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
              0% { 
                background-position: 0% 50%;
              }
              50% { 
                background-position: 100% 50%;
              }
              100% { 
                background-position: 0% 50%;
              }
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
            .issa-plus-festive {
              position: relative;
            }
            .issa-plus-text {
              position: relative;
              display: inline-flex;
              align-items: center;
              gap: 10px;
            }
            .issa-plus-word {
              position: relative;
              display: inline-flex;
              align-items: flex-start;
              gap: 2px;
            }
            .issa-plus-last {
              position: relative;
              display: inline-block;
              padding-right: 2px;
            }
            .santa-hat {
              position: absolute;
              top: -12px;
              left: -4px;
              width: 24px;
              height: 18px;
              transform: rotate(-15deg);
            }
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
            .issa-plus-tree {
              width: 50px;
              height: auto;
              display: inline-block;
              filter: drop-shadow(0 0 8px rgba(67,233,123,0.45));
              transform-origin: bottom center;
              margin-left: 6px;
              margin-top: -6px;
              pointer-events: none;
            }
            .snow-container {
              position: absolute;
              top: 46px;
              left: 0;
              right: 0;
              height: 160px;
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
            @keyframes snowFall {
              0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
              10% { opacity: 0.9; }
              100% { transform: translate3d(var(--snow-x, 40px), var(--snow-y, 160px), 0) rotate(360deg); opacity: 0; }
            }
          `}</style>
        </div>
        <UserInfo>
          <UserDetails style={{
            position: 'relative',
            left: `${appTitleSettings.avatarPositionX || 0}px`,
            top: `${appTitleSettings.avatarPositionY || 0}px`
          }}>
            <Avatar
              size={`${appTitleSettings.avatarWidth || 88}px`}
              style={{
                position:'relative',
                overflow:'hidden',
                background: appTitleSettings.avatarImage ? 'transparent' : '#e3eaf2',
                cursor: (state.user?.avatarUrl || appTitleSettings.avatarImage) ? 'zoom-in' : 'pointer',
                fontSize:28,
                width: `${appTitleSettings.avatarWidth || 88}px`,
                height: `${appTitleSettings.avatarHeight || 88}px`
              }}
              onMouseEnter={()=>setAvatarHover(true)}
              onMouseLeave={()=>setAvatarHover(false)}
              onClick={()=>{
                if (state.user?.avatarUrl || appTitleSettings.avatarImage) setShowAvatarModal(true);
                else fileInputRef.current?.click();
              }}
              title={(state.user?.avatarUrl || appTitleSettings.avatarImage) ? 'Просмотреть/изменить аватар' : 'Загрузить аватар'}
            >
              {appTitleSettings.avatarImage ? (
                <>
                  <img src={appTitleSettings.avatarImage} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'12px'}} />
                  {avatarHover && (
                    <>
                      <span
                        style={{
                          position:'absolute',top:2,right:2,width:18,height:18,background:'#fff',borderRadius:'50%',boxShadow:'0 0 2px #aaa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#e74c3c',border:'1.5px solid #e3eaf2',cursor:'pointer',zIndex:2
                        }}
                        title="Удалить аватар"
                        onClick={e=>{e.stopPropagation();handleRemoveAvatar();}}
                      >✕</span>
                      <span
                        style={{
                          position:'absolute',bottom:2,right:2,width:18,height:18,background:'#fff',borderRadius:'50%',boxShadow:'0 0 2px #aaa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#3498db',border:'1.5px solid #e3eaf2',cursor:'pointer',zIndex:2
                        }}
                        title="Загрузить новый аватар"
                        onClick={e=>{e.stopPropagation();fileInputRef.current?.click();}}
                      >✎</span>
                    </>
                  )}
                </>
              ) : state.user?.avatarUrl ? (
                <>
                  <img src={state.user.avatarUrl} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'12px'}} />
                  {avatarHover && (
                    <>
                      <span
                        style={{
                          position:'absolute',top:2,right:2,width:18,height:18,background:'#fff',borderRadius:'50%',boxShadow:'0 0 2px #aaa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#e74c3c',border:'1.5px solid #e3eaf2',cursor:'pointer',zIndex:2
                        }}
                        title="Удалить аватар"
                        onClick={e=>{e.stopPropagation();handleRemoveAvatar();}}
                      >✕</span>
                      <span
                        style={{
                          position:'absolute',bottom:2,right:2,width:18,height:18,background:'#fff',borderRadius:'50%',boxShadow:'0 0 2px #aaa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#3498db',border:'1.5px solid #e3eaf2',cursor:'pointer',zIndex:2
                        }}
                        title="Загрузить новый аватар"
                        onClick={e=>{e.stopPropagation();fileInputRef.current?.click();}}
                      >✎</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  {state.user?.username?.charAt(0).toUpperCase()}
                  <span style={{position:'absolute',bottom:0,right:0,width:16,height:16,background:'#fff',borderRadius:'50%',boxShadow:'0 0 2px #aaa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#3498db',border:'1.5px solid #e3eaf2'}}>✎</span>
                </>
              )}
            </Avatar>
      {showAvatarModal && (state.user?.avatarUrl || appTitleSettings.avatarImage) && (
        <AvatarModalBg onClick={()=>setShowAvatarModal(false)}>
          <AvatarModalCloseButton 
            onClick={()=>setShowAvatarModal(false)}
            title="Закрыть"
          >
            <FiX />
          </AvatarModalCloseButton>
          <AvatarModalImg src={appTitleSettings.avatarImage || state.user.avatarUrl} alt="avatar-large" onClick={e=>e.stopPropagation()} />
        </AvatarModalBg>
      )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarChange} />
            <Username>{state.user?.username}</Username>
            {state.user?.department && (
              <div style={{ fontSize:'0.92em', color:'#b2bec3', marginTop:2  }}>{state.user.department}</div>
            )}
          </UserDetails>
          <LogoutButton onClick={handleLogout}>
            <FiLogOut size={16} />
          </LogoutButton>
        </UserInfo>
      </SidebarHeader>
      {/* Кнопка перенесена в модалку "Сотрудники компании" */}
      {/* Кнопка создания чата перенесена в модалку "Ваши чаты" */}

      <SidebarContent>
        {/* Убрано: {!showChatsModal && !state.currentChat && <ChatList />} */}
        <SidebarNav showChatsModal={showChatsModal} setShowChatsModal={setShowChatsModal} />
      </SidebarContent>
      {showAllUsers && createPortal((
        <RightsWrapper onClick={()=>setShowAllUsers(false)}>
          <RightsPanel onClick={e=>e.stopPropagation()}>
            <RightsClose onClick={()=>setShowAllUsers(false)} title="Закрыть" style={{position:'absolute',top:16,right:16}}>×</RightsClose>
            <RightsHeader>
              <RightsTitle>Права пользователей</RightsTitle>
            </RightsHeader>
            <RightsBody>
              <AllUsers token={localStorage.getItem('token')} isAdmin={state.user?.role === 'admin'} />
            </RightsBody>
          </RightsPanel>
        </RightsWrapper>
      ), document.body)}
      
      {/* <GeneralCalendarModal open={showGeneralCalendar} onClose={()=>setShowGeneralCalendar(false)} events={generalEvents} /> */}
    </SidebarContainer>
  );
}