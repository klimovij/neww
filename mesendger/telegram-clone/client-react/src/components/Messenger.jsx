import React from 'react';
import Sidebar from './Sidebar/Sidebar';
import SidebarMobile from './Sidebar/SidebarMobile';
import SidebarNav from './Sidebar/SidebarNav';
import AiAssistantModal from './AiAssistantModal';
import ChatArea from './Chat/ChatArea';
import Leaves from './Leaves';
import Tasks from './Tasks';
import NewsFeed from './NewsFeed';
import AllLeavesCalendar from './AllLeavesCalendar';
import CreateChatModal from './Modals/CreateChatModal';
import UserSelectionModal from './Modals/UserSelectionModal';
import ShareMessageModal from './Modals/ShareMessageModal';
import { MessengerContainer } from '../styles/GlobalStyles';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import Clock from './Common/Clock';
import { useApp } from '../context/AppContext';
import { FaBars } from 'react-icons/fa';
const TopCenterClockWrap = styled.div`
  position: fixed;
  top: 8px;
  left: calc(50% + 170px); /* сдвиг вправо на 50px */
  transform: translateX(-50%);
  z-index: 100000000; /* поверх всех окон */
  padding: 10px 18px;
  border-radius: 14px;
  color: #eaf2f9;
  font-weight: 700;
  font-size: 1.35rem; /* крупнее */
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 10px 28px rgba(0,0,0,0.25), 0 2px 0 rgba(255,255,255,0.06) inset;
  border: 1px solid rgba(255,255,255,0.16);
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  pointer-events: none; /* не перехватывает клики */
  
  @media (max-width: 768px) {
    display: none; /* Скрываем часы на мобильных устройствах */
  }
`;

function Messenger() {
  const { state, dispatch } = useApp();
  const [showLeaves, setShowLeaves] = React.useState(false);
  const [showTasks, setShowTasks] = React.useState(false);
  const [showNews, setShowNews] = React.useState(false);
  const [showAllLeaves, setShowAllLeaves] = React.useState(false);
  const [showChat, setShowChat] = React.useState(false); // По умолчанию ничего не показываем
  const [showAiModal, setShowAiModal] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(() => {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });
  const [showMobileSidebar, setShowMobileSidebar] = React.useState(false);
  const [showMobileSidebarNav, setShowMobileSidebarNav] = React.useState(false);

  // Отслеживание изменения размера окна для определения мобильного устройства
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Закрываем мобильный сайдбар при открытии модалок
  React.useEffect(() => {
    const handleCloseModals = () => {
      if (isMobile) {
        setShowMobileSidebar(false);
      }
    };
    window.addEventListener('close-all-modals', handleCloseModals);
    return () => window.removeEventListener('close-all-modals', handleCloseModals);
  }, [isMobile]);

  // Открываем мобильный сайдбар по событию
  React.useEffect(() => {
    const handleOpenSidebar = () => {
      if (isMobile) {
        setShowMobileSidebar(true);
      }
    };
    window.addEventListener('open-mobile-sidebar', handleOpenSidebar);
    return () => window.removeEventListener('open-mobile-sidebar', handleOpenSidebar);
  }, [isMobile]);

  React.useEffect(() => {
    const onShowAi = () => setShowAiModal(true);
    const onShowChat = () => { 
      setShowLeaves(false); 
      setShowTasks(false); 
      setShowNews(false); 
      setShowAllLeaves(false);
      setShowChat(true);
    };
    const onLeaves = () => { setShowLeaves(true); setShowTasks(false); setShowNews(false); setShowAllLeaves(false); setShowChat(false); };
    const onTasks = () => { setShowLeaves(false); setShowTasks(true); setShowNews(false); setShowAllLeaves(false); setShowChat(false); };
    const onNews = () => { setShowLeaves(false); setShowTasks(false); setShowNews(true); setShowAllLeaves(false); setShowChat(false); };
    const onAllLeaves = () => { setShowLeaves(false); setShowTasks(false); setShowNews(false); setShowAllLeaves(true); setShowChat(false); };
    
    window.addEventListener('show-ai', onShowAi);
    window.addEventListener('show-chat', onShowChat);
    window.addEventListener('show-leaves', onLeaves);
    window.addEventListener('show-tasks', onTasks);
    window.addEventListener('show-news', onNews);
    window.addEventListener('show-all-leaves', onAllLeaves);
    
    window.openNewsFeed = () => {
      setShowLeaves(false);
      setShowTasks(false);
      setShowNews(true);
      setShowAllLeaves(false);
      setShowChat(false);
    };
    window.setMessengerView = (view) => {
  setShowLeaves(false);
  setShowTasks(false);
  setShowNews(false);
  setShowAllLeaves(false);
  setShowChat(view === 'chat');
    };
    
    return () => {
      window.removeEventListener('show-ai', onShowAi);
      window.removeEventListener('show-chat', onShowChat);
      window.removeEventListener('show-leaves', onLeaves);
      window.removeEventListener('show-tasks', onTasks);
      window.removeEventListener('show-news', onNews);
      window.removeEventListener('show-all-leaves', onAllLeaves);
      delete window.openNewsFeed;
      delete window.setMessengerView;
    };
  }, []);
  const token = localStorage.getItem('token');
  // Функция для очистки базы через API
  const handleClearAll = () => {
    if (!window.confirm('Вы уверены, что хотите удалить всех пользователей, задачи и новости? Это действие необратимо!')) return;
    fetch('/api/admin/clear-all', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(res => {
        alert(res.message || 'База очищена!');
        window.location.reload();
      })
      .catch(()=>alert('Ошибка при очистке базы!'));
  };
  return (
    <MessengerContainer style={{ position: 'relative' }}>
      {createPortal(
        <TopCenterClockWrap>
          <Clock />
        </TopCenterClockWrap>,
        document.body
      )}
      
      {/* Кнопка открытия меню на мобильных */}
      {isMobile && (
        <button
          onClick={() => setShowMobileSidebar(true)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 99999,
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
            transition: 'all 0.2s'
          }}
          title="Открыть меню"
        >
          <FaBars />
        </button>
      )}
      
      {/* Десктопный сайдбар - скрыт на мобильных */}
      {!isMobile && <Sidebar />}
      
      {/* Мобильный сайдбар */}
      {isMobile && (
        <SidebarMobile 
          open={showMobileSidebar || (!showLeaves && !showTasks && !showNews && !showChat && !showAllLeaves)} 
          onClose={() => setShowMobileSidebar(false)}
          onOpen={() => setShowMobileSidebar(true)}
          showNav={false} // Не показываем навигацию внутри SidebarMobile на мобильных
          onOpenNav={() => setShowMobileSidebarNav(true)} // Кнопка стрелки назад открывает SidebarNav
        />
      )}
      
      {/* Мобильная навигация (отдельная модалка на весь экран) */}
      {isMobile && (
        <SidebarNav 
          onCloseMobileSidebar={() => setShowMobileSidebarNav(false)}
          onOpenMobileSidebar={() => {
            setShowMobileSidebarNav(false);
            setShowMobileSidebar(true);
          }}
          isMobileNavModal={true}
          open={showMobileSidebarNav}
        />
      )}
      
      <AiAssistantModal open={showAiModal} onClose={()=>setShowAiModal(false)} />
      {showAllLeaves && <AllLeavesCalendar open={showAllLeaves} onClose={()=>setShowAllLeaves(false)} token={token} />}
      {!showAllLeaves && (showLeaves ? <Leaves token={token} /> :
       showTasks ? <Tasks token={token} /> :
       showNews ? <NewsFeed token={token} /> :
       showChat ? <ChatArea /> : 
       !isMobile && (
         <div style={{ 
           flex: 1, 
           display: 'flex', 
           alignItems: 'center', 
           justifyContent: 'center', 
           background: 'linear-gradient(135deg, #232931 0%, #2193b0 100%)',
           borderRadius: '22px',
           margin: '24px 0',
           color: '#fff',
           fontSize: '1.2em',
           textAlign: 'center',
           padding: '40px'
         }}>
           <div>
             <h2 style={{ color: '#43e97b', marginBottom: '20px' }}>👋 Добро пожаловать!</h2>
             <p>Выберите раздел в меню слева, чтобы начать работу</p>
             <p style={{ marginTop: '10px', opacity: 0.7 }}>Нажмите "Чаты" для перехода к мессенджеру</p>
           </div>
         </div>
       ))}
      <CreateChatModal />
      <UserSelectionModal />
      <ShareMessageModal 
        isOpen={state.modals.shareMessage}
        onClose={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'shareMessage', show: false } })}
        messageToShare={state.shareMessageData}
      />
    </MessengerContainer>
  );
}

export default Messenger;