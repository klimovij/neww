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

// Вывеска статуса сервера в стиле магазина
const ServerStatus = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  font-weight: 800;
  padding: 12px 20px;
  margin: 0 auto;
  margin-top: 10px;
  margin-bottom: 12px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
  animation: ${props => props.connected ? 'pulse-green 2s ease-in-out infinite' : 'pulse-red 2s ease-in-out infinite'};
  box-shadow: ${props => props.connected 
    ? '0 0 20px rgba(67, 233, 123, 0.5), inset 0 0 20px rgba(67, 233, 123, 0.1)' 
    : '0 0 20px rgba(231, 76, 60, 0.5), inset 0 0 20px rgba(231, 76, 60, 0.1)'};
  color: ${props => props.connected ? '#43e97b' : '#e74c3c'};
  background: ${props => props.connected 
    ? 'linear-gradient(135deg, rgba(67, 233, 123, 0.15) 0%, rgba(67, 233, 123, 0.05) 100%)' 
    : 'linear-gradient(135deg, rgba(231, 76, 60, 0.15) 0%, rgba(231, 76, 60, 0.05) 100%)'};
  border: 2px solid ${props => props.connected ? 'rgba(67, 233, 123, 0.4)' : 'rgba(231, 76, 60, 0.4)'};
  
  @keyframes pulse-green {
    0%, 100% {
      text-shadow: 0 0 10px #43e97b, 0 0 20px #43e97b, 0 0 30px #43e97b;
      box-shadow: 0 0 20px rgba(67, 233, 123, 0.5), inset 0 0 20px rgba(67, 233, 123, 0.1);
    }
    50% {
      text-shadow: 0 0 15px #43e97b, 0 0 30px #43e97b, 0 0 45px #43e97b;
      box-shadow: 0 0 30px rgba(67, 233, 123, 0.7), inset 0 0 30px rgba(67, 233, 123, 0.2);
    }
  }
  
  @keyframes pulse-red {
    0%, 100% {
      text-shadow: 0 0 10px #e74c3c, 0 0 20px #e74c3c, 0 0 30px #e74c3c;
      box-shadow: 0 0 20px rgba(231, 76, 60, 0.5), inset 0 0 20px rgba(231, 76, 60, 0.1);
    }
    50% {
      text-shadow: 0 0 15px #e74c3c, 0 0 30px #e74c3c, 0 0 45px #e74c3c;
      box-shadow: 0 0 30px rgba(231, 76, 60, 0.7), inset 0 0 30px rgba(231, 76, 60, 0.2);
    }
  }
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

  // Функция нормализации URL аватарки (аналогично NewsFeed.jsx)
  const normalizeAvatarUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    let trimmed = url.trim();
    // Normalize Windows backslashes to forward slashes
    trimmed = trimmed.replace(/\\/g, '/');
    // If absolute local path contains uploads/avatars, strip to web path
    const idx = trimmed.toLowerCase().indexOf('/uploads/avatars/');
    if (idx !== -1) {
      const path = trimmed.slice(idx);
      // If running on different origin (e.g., 3000), prefix backend origin
      if (typeof window !== 'undefined' && window.location && !path.startsWith('http')) {
        return `${window.location.origin}${path}`;
      }
      return path;
    }
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/uploads') || trimmed.startsWith('/images')) {
      return `${window.location.origin}${trimmed}`;
    }
    if (trimmed.startsWith('uploads/')) return `${window.location.origin}/${trimmed}`;
    return `${window.location.origin}/uploads/avatars/${trimmed.replace(/^\/+/, '')}`;
  };

  // Нормализованный URL аватарки пользователя
  const normalizedAvatarUrl = state.user?.avatarUrl ? normalizeAvatarUrl(state.user.avatarUrl) : null;

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
          {/* Текст и название перенесены в SidebarNav */}
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
                if (normalizedAvatarUrl || appTitleSettings.avatarImage) setShowAvatarModal(true);
                else fileInputRef.current?.click();
              }}
              title={(normalizedAvatarUrl || appTitleSettings.avatarImage) ? 'Просмотреть/изменить аватар' : 'Загрузить аватар'}
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
              ) : normalizedAvatarUrl ? (
                <>
                  <img src={normalizedAvatarUrl} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'12px'}} />
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
      {showAvatarModal && (normalizedAvatarUrl || appTitleSettings.avatarImage) && (
        <AvatarModalBg onClick={()=>setShowAvatarModal(false)}>
          <AvatarModalCloseButton 
            onClick={()=>setShowAvatarModal(false)}
            title="Закрыть"
          >
            <FiX />
          </AvatarModalCloseButton>
          <AvatarModalImg src={appTitleSettings.avatarImage || normalizedAvatarUrl} alt="avatar-large" onClick={e=>e.stopPropagation()} />
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