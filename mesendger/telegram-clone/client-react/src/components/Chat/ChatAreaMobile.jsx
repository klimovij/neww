import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import PinnedMessages from './PinnedMessages';

export default function ChatAreaMobile({ open, onClose, onOpenChatsList }) {
  const { state } = useApp();
  const modalRef = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // Обработчики свайпа
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 100;
    
    // Свайп влево (возврат к списку чатов)
    if (distance > minSwipeDistance) {
      if (onOpenChatsList) {
        onOpenChatsList();
      }
      onClose();
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleClose = () => {
    if (onOpenChatsList) {
      onOpenChatsList();
    }
    onClose();
  };

  if (!open || !state.currentChat) return null;

  // Получаем название чата
  const getChatName = () => {
    const current = state.currentChat;
    if (!current) return 'Мессенджер';
    
    // Для приватных чатов стараемся показать имя собеседника
    if (current.isPrivate || current.type === 'private') {
      const meId = state.user?.id;
      
      // 1) Если имя чата не "Приватный чат", используем его
      if (current.name && current.name !== 'Приватный чат') {
        return current.name;
      }
      
      // 2) Пробуем participants в currentChat
      if (Array.isArray(current.participants)) {
        const other = current.participants.find(p => p.id !== meId);
        if (other) {
          const name = other.username || ((other.first_name || '') + ' ' + (other.last_name || '')).trim();
          if (name) return name;
        }
      }
      
      // 3) Пробуем найти этот же чат в state.chats
      const fromList = (state.chats || []).find(c => c.id === current.id);
      if (fromList && Array.isArray(fromList.participants)) {
        const other = fromList.participants.find(p => p.id !== meId);
        if (other) {
          const name = other.username || ((other.first_name || '') + ' ' + (other.last_name || '')).trim();
          if (name) return name;
        }
      }
      
      // 4) Пробуем взять имя автора последнего сообщения
      const otherMsg = (state.messages || []).slice().reverse().find(m => m.user_id && m.user_id !== meId);
      if (otherMsg && otherMsg.username) return otherMsg.username;
      
      // 5) Фолбэк
      if (state.lastPrivateTarget) {
        const t = state.lastPrivateTarget;
        const name = t.username || ((t.first_name || '') + ' ' + (t.last_name || '')).trim();
        if (name) return name;
      }
      
      return current.name || 'Собеседник';
    }
    
    // Для групп — используем name
    return current.name || 'Чат';
  };

  // Получаем закрепленные сообщения для текущего чата
  const pinnedMessages = state.currentChat ? 
    (state.pinnedMessages[state.currentChat.id] || []) : [];

  const handleScrollToMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    }
  };

  const handleUnpinMessage = (messageId) => {
    if (!window.socket) {
      alert('Нет соединения с сервером!');
      return;
    }
    
    if (!window.confirm('Открепить это сообщение?')) return;
    
    window.socket.emit('unpin_message', { 
      messageId, 
      chatId: state.currentChat?.id 
    });
  };

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 100001,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      onClick={handleClose}
    >
      <div
        ref={modalRef}
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
        {/* Заголовок с кнопками */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(67,233,123,0.2)',
          background: 'rgba(34,40,49,0.95)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(67,233,123,0.15)',
              border: '1px solid #43e97b',
              borderRadius: '50%',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#43e97b',
              fontSize: '20px',
              padding: 0,
              marginRight: '12px',
              flexShrink: 0
            }}
            title="Вернуться к чатам"
          >
            <FaArrowLeft />
          </button>
          <h2 style={{
            margin: 0,
            color: '#43e97b',
            fontWeight: 900,
            fontSize: '1.4em',
            flex: 1,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {getChatName()}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(67,233,123,0.15)',
              border: '1px solid #43e97b',
              borderRadius: '50%',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#43e97b',
              fontSize: '20px',
              padding: 0,
              marginLeft: '12px',
              flexShrink: 0
            }}
            title="Закрыть"
          >
            <FiX />
          </button>
        </div>

        {/* Закрепленные сообщения */}
        <PinnedMessages 
          pinnedMessages={pinnedMessages}
          onScrollToMessage={handleScrollToMessage}
          onUnpinMessage={handleUnpinMessage}
        />

        {/* Список сообщений */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          background: 'linear-gradient(135deg, #232931 0%, #232b3a 100%)'
        }}>
          <MessageList />
        </div>

        {/* Индикатор печати */}
        {state.typingUsers.length > 0 && (
          <div style={{
            padding: '8px 20px',
            fontStyle: 'italic',
            color: '#6dd5ed',
            fontSize: '0.95rem',
            background: '#232931',
            borderTop: '1.5px solid #2193b0',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center'
          }}>
            {state.typingUsers[0]} печатает...
          </div>
        )}

        {/* Поле ввода сообщения */}
        <div style={{
          borderTop: '1px solid rgba(67,233,123,0.1)',
          background: 'rgba(34,40,49,0.95)',
          padding: '12px 16px',
          position: 'relative'
        }}>
          <MessageInput isMobile={true} />
        </div>

        {/* Подсказка о свайпе */}
        <div style={{
          padding: '8px 20px',
          borderTop: '1px solid rgba(67,233,123,0.1)',
          background: 'rgba(34,40,49,0.6)',
          textAlign: 'center',
          fontSize: '0.75em',
          color: '#b2bec3'
        }}>
          ← Свайпните вправо, чтобы вернуться к чатам
        </div>
      </div>
    </div>,
    document.body
  );
}
