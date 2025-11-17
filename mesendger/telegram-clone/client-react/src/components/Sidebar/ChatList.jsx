import React, { useState, useEffect } from 'react';
import { playNotificationSound, playDeleteSound } from '../../utils/notificationSound';
import RemoveUserModal from '../Modals/RemoveUserModal';
import UserSelectionModal from '../Modals/UserSelectionModal';
import ParticipantsList from '../Chat/ParticipantsList';
import MessageList from '../Chat/MessageList';
import MessageInput from '../Chat/MessageInput';
import AdminPasswordModal from '../Modals/AdminPasswordModal';
import styled from 'styled-components';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../styles/GlobalStyles';
import Emoji from '../Common/Emoji';

const ChatInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
`;

const ChatName = styled.div`
  font-weight: 500;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ChatType = styled.div`
  font-size: 0.8rem;
  color: #a6b0b6;
  margin-bottom: 0.25rem;
`;

const LastMessage = styled.div`
  font-size: 0.86rem;
  color: #cdd6dd;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const ChatListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.7rem 0.2rem 0.7rem 0.2rem;
  background: transparent;
  border-radius: 18px;
  box-shadow: none;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(44,62,80,0.18);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #43e97b;
    border-radius: 3px;
  }
`;

const ChatItem = styled.div.withConfig({
  shouldForwardProp: (prop) => !['active', 'isGroup'].includes(prop)
})`
  padding: 1.2rem 1.4rem 1.2rem 1.2rem;
  margin: 0.42rem 0.15rem;
  cursor: pointer;
  border-radius: 16px;
  background: ${({active}) =>
    active
      ? 'linear-gradient(135deg, #1f2630 0%, #181c22 100%)'
      : 'rgba(255,255,255,0.03)'};
  color: #e6f7ef;
  box-shadow: ${({active}) => active
    ? '0 2px 16px #43e97b22, 0 0 0 2px #2193b022'
    : '0 1px 4px rgba(0,0,0,0.05)'};
  border-left: 6px solid ${({active, isGroup}) => active ? (isGroup ? '#43e97b' : '#6dd5ed') : 'transparent'};
  font-weight: 700;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  transition: background 0.22s, color 0.22s, box-shadow 0.22s, border-color 0.22s, transform 0.18s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &:hover {
    background: rgba(255,255,255,0.06);
    color: #fff;
    box-shadow: 0 8px 32px #2193b033, 0 0 0 2px #43e97b22 inset;
    border-left: 6px solid ${({isGroup}) => isGroup ? '#43e97b' : '#6dd5ed'};
    transform: translateY(-1px);
  }
`;

const ChatTime = styled.div`
  font-size: 0.78rem;
  color: #9fb0ba;
`;

const EmptyState = styled.div`
  padding: 2rem 1.5rem;
  text-align: center;
  color: #7f8c8d;
  font-style: italic;
`;

export default function ChatList({ setShowChatsModal }) {
  const { state, dispatch } = useApp();
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState(null);
  
  // Состояние для отложенного выбора чата
  const [pendingChat, setPendingChat] = useState(null);

  // Функция выбора чата — вынесена для повторного использования
  const selectChat = (chat) => {
    console.log('[ChatList] Выбираем чат', chat);
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    dispatch({ type: 'SET_MESSAGES', payload: [] });
    // Сбрасываем непрочитанные для выбранного чата
    dispatch({ type: 'MARK_CHAT_AS_READ', payload: { chatId: chat.id, participants: chat.participants } });
    if (window.socket && window.socket.connected) {
      window.socket.emit('join_chat', chat.id);
      window.socket.emit('get_chat_messages', chat.id);
      window.socket.emit('get_pinned_messages', chat.id);
      window.socket.emit('mark_chat_read', chat.id);
    }
    if (setShowChatsModal) setShowChatsModal(false);
    if (window.setMessengerView) window.setMessengerView('chat');
  };

  // Обработчик выбора чата с отложенной логикой
  const handleChatSelect = (chat) => {
    if (!window.isSocketAuthenticated) {
      console.warn('[ChatList] Сокет не аутентифицирован, откладываем выбор чата', chat);
      setPendingChat(chat);
      return;
    }
    selectChat(chat);
  };

  // Эффект, который срабатывает при аутентификации сокета и выбирает отложенный чат
  useEffect(() => {
    if (window.isSocketAuthenticated && pendingChat) {
      selectChat(pendingChat);
      setPendingChat(null);
    }
  }, [window.isSocketAuthenticated, pendingChat]);

  useEffect(() => {
    if (showParticipants && state.currentChat?.id && window.socket) {
      window.socket.emit('get_chat_participants', state.currentChat.id);
    }
  }, [showParticipants, state.currentChat]);

  useEffect(() => {
    if (!window.socket) return;
    const onChatsUpdated = (chats) => {
      console.log('[DEBUG] Получен список чатов:', chats.map(c => ({ id: c.id, name: c.name })));
      dispatch({ type: 'SET_CHATS', payload: chats });
      // Если текущий чат был удалён, сбрасываем выбранный чат и сообщения
      if (chats.length > 0 && state.currentChat && !chats.some(c => c.id === state.currentChat.id)) {
        dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
        dispatch({ type: 'SET_MESSAGES', payload: [] });
      }
    };
    window.socket.on('chats_updated', onChatsUpdated);
    window.socket.on('chats', onChatsUpdated);
    return () => {
      window.socket.off('chats_updated', onChatsUpdated);
      window.socket.off('chats', onChatsUpdated);
    };
  }, [dispatch, state.currentChat]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit'
      });
    }
  };

  if (state.chats.length === 0) {
    return (
      <>
        <ChatListContainer>
          <EmptyState>
            Нет чатов.<br />
            Создайте новый чат для начала общения.
          </EmptyState>
        </ChatListContainer>
      </>
    );
  }

  // Фильтруем приватные 1:1 чаты из списока «Ваши чаты» боковой панели
  const visibleChats = (state.chats || []).filter(chat => !chat.isPrivate);

  return (
    <>
      {/* Заголовок теперь только в Sidebar.jsx */}
      <ChatListContainer>
        {visibleChats.map(chat => {
          const isGroup = chat.type === 'group';
          const isCreator = chat.created_by === state.user?.id;
          const isSuperAdmin = state.user?.username === 'albertronin5@gmail.com';
          // Корректное имя для приватных чатов: имя собеседника
          let displayName = chat.name;
          if (!isGroup && (chat.isPrivate || chat.type === 'private')) {
            // Если имя чата не "Приватный чат", используем его (новая логика сервера)
            if (chat.name && chat.name !== 'Приватный чат') {
              displayName = chat.name;
            } else if (Array.isArray(chat.participants)) {
              const meId = state.user?.id;
              const other = chat.participants.find(p => p.id !== meId);
              const otherName = other?.username || `${other?.first_name || ''} ${other?.last_name || ''}`.trim();
              displayName = otherName || chat.name || 'Собеседник';
            }
          }
          return (
            <ChatItem
              key={chat.id}
              active={state.currentChat?.id === chat.id}
              isGroup={isGroup}
              isPrivate={chat.isPrivate}
              isSuperAdmin={isSuperAdmin}
              isCreator={isCreator}
              onClick={() => handleChatSelect(chat)}
              style={{position:'relative'}}
            >
              {/* Кнопка удаления в правом верхнем углу */}
              {isGroup && (
                <button
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'rgba(231, 76, 60, 0.15)',
                    color: '#ffb8b8',
                    border: '1px solid rgba(231, 76, 60, 0.35)',
                    borderRadius: 10,
                    padding: '4px 10px',
                    fontWeight: 800,
                    fontSize: '0.86em',
                    cursor: 'pointer',
                    zIndex: 2,
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(4px)'
                  }}
                  title="Удалить группу"
                  onClick={e => {
                    e.stopPropagation();
                    if (isSuperAdmin || isCreator) {
                      window.socket.emit('delete_chat', { chatId: chat.id });
                      playDeleteSound();
                    } else {
                      setDeleteChatId(chat.id);
                      setShowAdminModal(true);
                    }
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(231, 76, 60, 0.28)';
                    e.currentTarget.style.color = '#ffd6d6';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(231, 76, 60, 0.15)';
                    e.currentTarget.style.color = '#ffb8b8';
                  }}
                >Удалить</button>
              )}
              <ChatInfo style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:isGroup?24:0}}>
                <ChatName style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                  {isGroup ? <span style={{fontSize:'1.15em',marginRight:4}}>👥</span> : <span style={{fontSize:'1.15em',marginRight:4}}>👤</span>}
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{displayName || 'Чат'}</span>
                  {chat.unread_count > 0 && (
                    <Badge>{chat.unread_count}</Badge>
                  )}
                </ChatName>
                <ChatTime style={{whiteSpace:'nowrap',marginLeft:8}}>
                  {formatTime(chat.last_message_time)}
                </ChatTime>
              </ChatInfo>
              <ChatType>
                {isGroup && <span style={{color:'#43e97b',fontWeight:800}}>Группа</span>}
              </ChatType>
              {chat.last_message && (
                <LastMessage>
                  {chat.last_message}
                </LastMessage>
              )}
            </ChatItem>
          );
        })}
      </ChatListContainer>
      {/* ВРЕМЕННО ЗАКОММЕНТИРОВАНО - кнопка показа участников чата
      <button
        style={{
          position: 'fixed',
          top: '50%',
          right: 0,
          transform: 'translateY(-50%)',
          zIndex: 100,
          background: showParticipants ? 'linear-gradient(90deg, #43e97b 0%, #ffe082 100%)' : 'rgba(255,255,255,0.08)',
          color: showParticipants ? '#232931' : '#43e97b',
          border: '1.5px solid #43e97b55',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          boxShadow: showParticipants ? '0 4px 16px rgba(67,233,123,0.25)' : '0 2px 10px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        title={showParticipants ? 'Скрыть участников' : 'Показать участников'}
        onClick={() => setShowParticipants(v => !v)}
      >
        {showParticipants ? (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>
      */}
      {/* ВРЕМЕННО ЗАКОММЕНТИРОВАНО - модалка участников чата
      {showParticipants && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            height: '100vh',
            width: '350px',
            background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
            boxShadow: '-8px 0 40px #2193b044, 0 4px 24px rgba(0,0,0,0.18)',
            zIndex: 99,
            overflowY: 'auto',
            transition: 'transform 0.3s',
            transform: showParticipants ? 'translateX(0)' : 'translateX(100%)',
            color: '#fff',
            borderLeft: '2px solid #43e97b33'
          }}
        >
          <div style={{position:'sticky', top:0, background:'transparent', padding:'14px 16px 8px 16px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <h3 style={{
              margin: 0,
              color:'#43e97b',
              fontWeight: 900,
              letterSpacing: '0.5px',
              textShadow: '0 0 14px #43e97b55'
            }}>Пользователи онлайн</h3>
            <button
              onClick={() => setShowParticipants(false)}
              style={{
                fontSize: 22,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#fff',
                width: 34,
                height: 34,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.3s, color 0.3s'
              }}
              onMouseEnter={e=>{ e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.18)'; e.currentTarget.style.color = '#43e97b'; }}
              onMouseLeave={e=>{ e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#fff'; }}
              aria-label="Close online users"
            >
              ×
            </button>
          </div>
          <div style={{padding: '0 12px 12px 12px'}}>
            <ParticipantsList />
          </div>
        </div>
      )}
      */}
      <UserSelectionModal />
      <RemoveUserModal />
      {showAdminModal && deleteChatId && (
        <AdminPasswordModal
          chatId={deleteChatId}
          onClose={() => {
            setShowAdminModal(false);
            setDeleteChatId(null);
          }}
        />
      )}
    </>
  );
}