import React from 'react';
import AdminPasswordModal from '../Modals/AdminPasswordModal';
import ParticipantsList from './ParticipantsList';
import styled from 'styled-components';
import { useApp } from '../../context/AppContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import PinnedMessages from './PinnedMessages';
import ScheduledMessagesList from './ScheduledMessagesList';
import { FiUsers, FiInfo, FiTrash2, FiClock } from 'react-icons/fi';
import Emoji from '../Common/Emoji';
import EmployeesListModal from '../Modals/EmployeesListModal';
import ChatsListModal from '../Modals/ChatsListModal';
import { playDeleteSound } from '../../utils/notificationSound';

const ChatContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #232931 0%, #2193b0 100%);
  border-radius: 22px;
  box-shadow: 0 8px 40px #2193b044;
  position: relative;
  margin: 12px 0;
  overflow: visible;
  min-height: 0;
  height: calc(100% - 24px);
`;
const SlidePanel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 340px;
  background: #f8f9fa;
  box-shadow: -2px 0 8px rgba(44,62,80,0.08);
  z-index: 100;
  transform: translateX(${props => props.open ? '0' : '100%'});
  transition: transform 0.35s cubic-bezier(.4,0,.2,1);
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e9ecef;
`;

const SlideToggleBtn = styled.button`
  position: static;
  z-index: 101;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.3rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(44,62,80,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  &:hover {
    background: #217dbb;
  }
`;

const ChatHeader = styled.div`
  padding: 1.2rem 2rem;
  background: linear-gradient(135deg, #232931 0%, #2193b0 100%);
  border-bottom: 1.5px solid #1a222b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 12px #2193b022;
`;

const ChatTitle = styled.h3`
  color: #6dd5ed;
  margin: 0;
  font-weight: 700;
  font-size: 1.35rem;
  letter-spacing: 0.01em;
  text-shadow: 0 2px 8px #23293199;
`;

const ChatActions = styled.div`
  display: flex;
  gap: 10px;
`;

const ActionButton = styled.button`
  background: linear-gradient(135deg, #232931 0%, #2193b0 100%);
  border: none;
  font-size: 1.15rem;
  cursor: pointer;
  padding: 10px 18px;
  border-radius: 12px;
  color: #fff;
  box-shadow: 0 4px 16px #2193b022;
  transition: all 0.18s;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  position: relative;
  font-weight: 600;
  gap: 7px;
  &:hover {
    background: linear-gradient(135deg, #2193b0 0%, #232931 100%);
    color: #6dd5ed;
    transform: scale(1.07);
    box-shadow: 0 8px 24px #2193b044;
    z-index: 2;
  }
  svg {
    color: inherit;
    filter: drop-shadow(0 2px 6px #2193b044);
  }
`;

const WelcomeContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #232931 0%, #2193b0 100%);
  color: #b2bec3;
  text-align: center;
  padding: 2.5rem 2rem;
  border-radius: 22px;
  box-shadow: 0 4px 24px #2193b022;
`;

const WelcomeTitle = styled.h2`
  margin-bottom: 1.2rem;
  color: #6dd5ed;
  font-weight: 700;
  font-size: 2.1rem;
  letter-spacing: 0.01em;
  text-shadow: 0 2px 8px #23293199;
`;

const WelcomeText = styled.p`
  font-size: 1.15rem;
  max-width: 440px;
  line-height: 1.7;
  color: #b2bec3;
`;

const TypingIndicator = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'show'
})`
  padding: 0.3rem 1.5rem;
  font-style: italic;
  color: #6dd5ed;
  font-size: 0.95rem;
  background: #232931;
  border-top: 1.5px solid #2193b0;
  min-height: 24px;
  display: flex;
  align-items: center;
  opacity: ${props => props.show ? 1 : 0};
  transition: opacity 0.3s ease;
`;

export default function ChatArea() {
  const { state, dispatch } = useApp();
  const [showPanel, setShowPanel] = React.useState(false);
  const [showScheduledMessages, setShowScheduledMessages] = React.useState(false);
  React.useEffect(() => {
    if (showPanel && window.socket && state.currentChat?.id) {
      window.socket.emit('get_chat_participants', state.currentChat.id);
    }
  }, [showPanel, state.currentChat?.id]);
  const [showAdminModal, setShowAdminModal] = React.useState(false);
  const [pendingDeleteChatId, setPendingDeleteChatId] = React.useState(null);

  React.useEffect(() => {
    if (!window.socket) return;
    const onChatDeleted = ({ chatId }) => {
      dispatch({ type: 'DELETE_CHAT', payload: { chatId } });
      // Если удалён текущий чат, сбрасываем выбранный чат и сообщения
      if (state.currentChat && state.currentChat.id === chatId) {
        dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
        dispatch({ type: 'SET_MESSAGES', payload: [] });
      }
      window.socket.emit('get_chats');
    };

    // Обработчики для закрепленных сообщений
    const onMessagePinned = ({ messageId, chatId, message, isPinned }) => {
      if (isPinned) {
        dispatch({ 
          type: 'ADD_PINNED_MESSAGE', 
          payload: { chatId, message } 
        });
      } else {
        dispatch({ 
          type: 'REMOVE_PINNED_MESSAGE', 
          payload: { chatId, messageId } 
        });
      }
      dispatch({ 
        type: 'UPDATE_MESSAGE_PIN_STATUS', 
        payload: { messageId, isPinned } 
      });
    };

    const onPinnedMessagesLoaded = ({ chatId, messages }) => {
      dispatch({ 
        type: 'SET_PINNED_MESSAGES', 
        payload: { chatId, messages } 
      });
    };

    window.socket.on('chat_deleted', onChatDeleted);
    window.socket.on('message_pinned', onMessagePinned);
    window.socket.on('message_unpinned', onMessagePinned);
    window.socket.on('pinned_messages', onPinnedMessagesLoaded);

    return () => {
      if (window.socket) {
        window.socket.off('chat_deleted', onChatDeleted);
        window.socket.off('message_pinned', onMessagePinned);
        window.socket.off('message_unpinned', onMessagePinned);
        window.socket.off('pinned_messages', onPinnedMessagesLoaded);
      }
    };
  }, [dispatch, state.currentChat]);

  const handleDeleteChat = (chatId) => {
    playDeleteSound(0.3);
    // Проверка: если текущий пользователь не супер-админ и не создатель — показываем модальное окно
    const currentUser = state.user;
    const chat = state.currentChat;
    const isSuperAdmin = currentUser?.username === 'albertronin5@gmail.com';
    const isCreator = chat?.created_by === currentUser?.id;
    if (!isSuperAdmin && !isCreator) {
      setPendingDeleteChatId(chatId);
      setShowAdminModal(true);
      return;
    }
    window.socket?.emit('delete_chat', { chatId });
  };

  const handleShowUsers = () => {
    if (!state.currentChat) {
      // Если нет выбранного чата, показываем сообщение
      alert('Сначала выберите чат');
      return;
    }
    
    window.socket?.emit('get_chat_participants', state.currentChat.id);
    dispatch({ 
      type: 'TOGGLE_MODAL', 
      payload: { modal: 'chatInfo', show: true } 
    });
  };

  const handleAddUsers = () => {
    if (!state.currentChat) {
      // Если нет выбранного чата, показываем сообщение
      alert('Сначала выберите чат');
      return;
    }
    
    window.socket?.emit('get_all_users');
    dispatch({ 
      type: 'TOGGLE_MODAL', 
      payload: { modal: 'userSelection', show: true } 
    });
  };

  // Убираем условие - всегда показываем интерфейс чата
  // if (!state.currentChat) {
  //   return (
  //     <ChatContainer>
  //       <WelcomeContainer>
  //         <WelcomeTitle>💬 Добро пожаловать в мессенджер!</WelcomeTitle>
  //         <WelcomeText>
  //           Добавьте аватарку, выберите чат из списка слева или создайте новый, чтобы начать общение.
  //           Здесь вы можете отправлять сообщения, файлы, ставить лайки и многое другое!
  //         </WelcomeText>
  //       </WelcomeContainer>
  //     </ChatContainer>
  //   );
  // }

  const currentUser = state.user;
  const chat = state.currentChat;
  const isSuperAdmin = currentUser?.username === 'albertronin5@gmail.com';
  const isCreator = chat?.created_by === currentUser?.id;

  // Обработчики для закрепленных сообщений
  const handleScrollToMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Подсветим сообщение на короткое время
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

  // Получаем закрепленные сообщения для текущего чата
  const pinnedMessages = state.currentChat ? 
    (state.pinnedMessages[state.currentChat.id] || []) : [];

  return (
    <>
      <ChatContainer>
        <ChatHeader>
          <ChatTitle>
            {(() => {
              const current = state.currentChat;
              if (!current) return 'Мессенджер';
              // Для приватных чатов стараемся показать имя собеседника
              if (current.isPrivate || current.type === 'private') {
                const meId = state.user?.id;
                
                // 1) Если имя чата не "Приватный чат", используем его (новая логика сервера)
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
                
                // 3) Пробуем найти этот же чат в state.chats и взять его участников
                const fromList = (state.chats || []).find(c => c.id === current.id);
                if (fromList && Array.isArray(fromList.participants)) {
                  const other = fromList.participants.find(p => p.id !== meId);
                  if (other) {
                    const name = other.username || ((other.first_name || '') + ' ' + (other.last_name || '')).trim();
                    if (name) return name;
                  }
                }
                
                // 4) Пробуем взять имя автора последнего сообщения не от меня
                const otherMsg = (state.messages || []).slice().reverse().find(m => m.user_id && m.user_id !== meId);
                if (otherMsg && otherMsg.username) return otherMsg.username;
                
                // 5) Фолбэк: если сохраняли цель в модалке
                if (state.lastPrivateTarget) {
                  const t = state.lastPrivateTarget;
                  const name = t.username || ((t.first_name || '') + ' ' + (t.last_name || '')).trim();
                  if (name) return name;
                }
                
                // 6) Последний фолбэк
                return current.name || 'Собеседник';
              }
              // Для групп — используем name
              return current.name || 'Чат';
            })()}
          </ChatTitle>
          
          <ChatActions>
            <ActionButton 
              onClick={() => setShowScheduledMessages(true)}
              title="Запланированные сообщения"
            >
              <FiClock />
            </ActionButton>
          </ChatActions>
        </ChatHeader>
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '0.7rem 2rem 0.3rem 2rem',
          background: 'transparent',
        }}>
          {/* Оставляем только кнопку сотрудников */}
          <ActionButton
            onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'employeesList', show: true } })}
            title="Все сотрудники"
            aria-label="Все сотрудники"
            style={{ minWidth: 36, minHeight: 36, borderRadius: 12, padding: '6px 12px', fontSize: '1rem', gap: 6, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}
          >
            <FiUsers style={{ color: '#fff', fontSize: '1.1em', marginRight: 5 }} />
            <span style={{ fontSize: '0.98em', fontWeight: 500, color: '#fff', letterSpacing: 0.2 }}>Сотрудники</span>
          </ActionButton>
        </div>
        {/* ВРЕМЕННО ЗАКОММЕНТИРОВАНО - выезжающая панель участников
        <SlidePanel open={showPanel}>
          <SlideToggleBtn onClick={() => setShowPanel(false)} title="Закрыть список участников">
            &times;
          </SlideToggleBtn>
          <ParticipantsList />
        </SlidePanel>
        */}
        {state.currentChat ? (
          <>
            <PinnedMessages 
              pinnedMessages={pinnedMessages}
              onScrollToMessage={handleScrollToMessage}
              onUnpinMessage={handleUnpinMessage}
            />
            <MessageList />
            <TypingIndicator show={state.typingUsers.length > 0}>
              {state.typingUsers.length > 0 && `${state.typingUsers[0]} печатает...`}
            </TypingIndicator>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            textAlign: 'center'
          }}>
            <div>
              <h3 style={{ color: '#43e97b', marginBottom: '20px', fontSize: '1.5em' }}>
                💬 Добро пожаловать в мессенджер!
              </h3>
              <p style={{ color: '#fff', marginBottom: '10px', fontSize: '1.1em' }}>
                Выберите чат из списка слева или создайте новый
              </p>
              <p style={{ color: '#b2bec3', fontSize: '0.9em' }}>
                Здесь вы можете отправлять сообщения, файлы, ставить лайки и многое другое!
              </p>
            </div>
          </div>
        )}
      </ChatContainer>
      {state.currentChat && <MessageInput />}
      {showAdminModal && (
        <AdminPasswordModal
          chatId={pendingDeleteChatId}
          onClose={() => {
            setShowAdminModal(false);
            setPendingDeleteChatId(null);
          }}
        />
      )}
  {/* Модалка сотрудников */}
  {state.modals.employeesList && (
    <EmployeesListModal 
      open={true} 
      onClose={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'employeesList', show: false } })} 
    />
  )}
  {/* Модалка чатов */}
  {state.modals.chatsList && <ChatsListModal />}
  
  {/* Модалка запланированных сообщений */}
  <ScheduledMessagesList
    isOpen={showScheduledMessages}
    onClose={() => setShowScheduledMessages(false)}
  />
    </>
  );
}