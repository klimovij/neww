import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Modal, ModalContent, CloseButton, Input } from '../../styles/GlobalStyles';
import { FiX, FiUser, FiUsers, FiUserCheck, FiUserX, FiMessageSquare, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';

const StyledModalContent = styled(ModalContent)`
  background: linear-gradient(135deg, #232931 0%, #2193b0 100%);
  border-radius: 22px 0 0 22px;
  box-shadow: -8px 0 40px #2193b044, 0 4px 24px rgba(0,0,0,0.18);
  padding: 2.5rem 2rem 2rem 2rem;
  min-width: 420px;
  max-width: 420px;
  height: 100vh;
  position: fixed;
  top: 0;
  right: 0;
  border: none;
  z-index: 9999;
  animation: modalFadeIn 0.35s cubic-bezier(.4,0,.2,1);
  @keyframes modalFadeIn {
    from { opacity: 0; transform: translateX(40px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
`;

const ModalTitle = styled.h3`
  margin-bottom: 1.8rem;
  color: #ffe082;
  font-weight: 700;
  font-size: 1.5rem;
  text-align: center;
`;

const EmployeeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
`;

const StatusIndicator = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== '$online'
})`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 12px;
  background: ${props => props.$online 
    ? 'linear-gradient(135deg, rgba(67,233,123,0.15) 0%, rgba(67,233,123,0.05) 100%)' 
    : 'linear-gradient(135deg, rgba(231,76,60,0.15) 0%, rgba(231,76,60,0.05) 100%)'};
  border: 1px solid ${props => props.$online ? 'rgba(67,233,123,0.3)' : 'rgba(231,76,60,0.3)'};
  font-size: 0.75em;
  font-weight: 600;
  color: ${props => props.$online ? '#43e97b' : '#e74c3c'};
  flex-shrink: 0;
  transition: all 0.2s ease;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px ${props => props.$online ? 'rgba(67,233,123,0.3)' : 'rgba(231,76,60,0.3)'};
  }
`;

const EmployeeItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 1.2rem 1.4rem 1.2rem 1.2rem;
  margin: 0.42rem 0.15rem;
  cursor: pointer;
  border-radius: 16px;
  background: rgba(255,255,255,0.03);
  color: #ffe082;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  border-left: 6px solid transparent;
  font-weight: 700;
  transition: all 0.22s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;
  
  &:hover {
    background: rgba(67,233,123,0.08);
    color: #43e97b;
    box-shadow: 0 8px 32px #2193b033, 0 0 0 2px #43e97b22 inset;
    border-left: 6px solid #6dd5ed;
    transform: translateY(-1px);
    
    ${StatusIndicator} {
      transform: scale(1.05);
    }
  }
  
  /* Анимация появления */
  animation: slideIn 0.3s ease-out;
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const Avatar = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  object-fit: cover;
  background: #e3eaf2;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  border: 2px solid rgba(255,255,255,0.1);
`;

const StatusDot = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== '$online'
})`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$online ? '#43e97b' : '#e74c3c'};
  box-shadow: 0 0 6px ${props => props.$online ? '#43e97b88' : '#e74c3c88'};
  animation: ${props => props.$online ? 'pulse 2s infinite' : 'none'};
  
  @keyframes pulse {
    0% { 
      box-shadow: 0 0 0 0 ${props => props.$online ? '#43e97b88' : '#e74c3c88'};
    }
    70% { 
      box-shadow: 0 0 0 4px ${props => props.$online ? 'rgba(67,233,123,0)' : 'rgba(231,76,60,0)'};
    }
    100% { 
      box-shadow: 0 0 0 0 ${props => props.$online ? 'rgba(67,233,123,0)' : 'rgba(231,76,60,0)'};
    }
  }
`;

const Name = styled.span`
  font-weight: 600;
  color: #ffe082;
  font-size: 1.08em;
`;

const SearchWrapper = styled.div`
  margin: 10px 0 18px 0;
`;

const NoResults = styled.div`
  text-align: center;
  color: #888;
  padding: 20px 0;
  font-size: 16px;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
`;

const CreateChatButton = styled.button`
  background: linear-gradient(135deg, #67e9a0 0%, #2193b0 100%);
  border: none;
  border-radius: 24px;
  padding: 10px 20px;
  color: #fff;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.3s ease, transform 0.2s ease;
  
  &:hover {
    background: linear-gradient(135deg, #57d89a 0%, #1a7f9d 100%);
    transform: translateY(-2px);
  }
`;

const ChatList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ChatItemContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== '$active' && prop !== '$isGroup'
})`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${props => props.$active ? 'rgba(67,233,123,0.1)' : 'rgba(255,255,255,0.03)'};
  color: #ffe082;
  cursor: pointer;
  transition: background 0.3s ease;
  position: relative;
  
  &:hover {
    background: rgba(67,233,123,0.08);
  }
`;

const ChatName = styled.span`
  flex-grow: 1;
  margin-left: 12px;
  font-weight: 500;
  color: #ffe082;
  font-size: 1em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
  transition: color 0.3s ease;
  
  &:hover {
    color: #c0392b;
  }
`;

export default function EmployeesListModal({ open, onClose }) {
  const { state, dispatch } = useApp();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState('all'); // 'all', 'online', 'offline'

  // pendingPrivateTargets — чтобы сразу показать иконку чата напротив пользователя,
  // пока сервер создаёт реальный приватный чат
  const [pendingPrivateTargets, setPendingPrivateTargets] = useState(new Set());

  // Закрытие модалки
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!window.socket) return;

    const refreshData = () => {
      window.socket.emit('get_all_users');
      window.socket.emit('get_online_users');
    };

    refreshData();

    const handleAllUsers = (users) => {
      setEmployees(users || []);
    };

    window.socket.on('all_users', handleAllUsers);

    return () => {
      window.socket.off('all_users', handleAllUsers);
    };
  }, [open]);

  // Когда список onlineUsers меняется — обновляем список пользователей
  useEffect(() => {
    if (!open) return;
    if (!window.socket || !window.socket.connected) return;
    window.socket.emit('get_all_users');
  }, [state.onlineUsers, open]);

  // Слушаем создание/приход чатов от сервера — чтобы убрать pending метку
  useEffect(() => {
    if (!window.socket) return;

    const onNewChat = (newChat) => {
      if (!newChat) return;
      if (newChat.isPrivate && Array.isArray(newChat.participants)) {
        const other = newChat.participants.find(p => p.id !== state.user?.id);
        if (other) {
          setPendingPrivateTargets(prev => {
            if (!prev.has(other.id)) return prev;
            const next = new Set(prev);
            next.delete(other.id);
            return next;
          });
        }
      }
    };

    window.socket.on('chat_created', onNewChat);
    window.socket.on('private_chat_created', onNewChat);

    return () => {
      window.socket.off('chat_created', onNewChat);
      window.socket.off('private_chat_created', onNewChat);
    };
  }, [state.user?.id]);

  // Функция для определения онлайн статуса пользователя
  const isUserOnline = (userId) => {
    return state.onlineUsers.some(user => user.id === userId);
  };

  // Форматирование last seen (оставлено без изменений)
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Неизвестно';
    const now = new Date();
    let lastSeenDate;
    if (typeof lastSeen === 'string' && lastSeen.includes(' ')) {
      const [datePart, timePart] = lastSeen.split(' ');
      const [y, m, d] = (datePart || '').split('-').map(Number);
      const [hh, mm, ss] = (timePart || '').split(':').map(Number);
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
        lastSeenDate = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
      }
    }
    if (!lastSeenDate) lastSeenDate = new Date(lastSeen);
    if (!(lastSeenDate instanceof Date) || isNaN(lastSeenDate.getTime())) return 'Неизвестно';
    const pad = (n) => String(n).padStart(2, '0');
    const sameDay = now.getFullYear() === lastSeenDate.getFullYear() && now.getMonth() === lastSeenDate.getMonth() && now.getDate() === lastSeenDate.getDate();
    const hhmm = `${pad(lastSeenDate.getHours())}:${pad(lastSeenDate.getMinutes())}`;
    if (sameDay) return `Сегодня ${hhmm}`;
    return null;
  };

  // Фильтрация сотрудников по имени, фамилии и статусу
  const filteredEmployees = employees.filter(emp => {
    const query = search.trim().toLowerCase();
    const isOnline = isUserOnline(emp.id);

    if (filter === 'online' && !isOnline) return false;
    if (filter === 'offline' && isOnline) return false;

    if (!query) return true;
    return (
      (emp.username && emp.username.toLowerCase().includes(query)) ||
      (emp.first_name && emp.first_name.toLowerCase().includes(query)) ||
      (emp.last_name && emp.last_name.toLowerCase().includes(query))
    );
  });

  const chats = state.chats || [];
  const currentChatId = state.currentChat?.id;
  const [deletingChats, setDeletingChats] = useState(new Set());

  // Хелпер: определяем, что чат — приватный 1:1 (разные варианты с сервера)
  const isOneToOnePrivate = (chat) => {
    if (!chat) return false;
    if (chat.isPrivate) return true;
    if (chat.type === 'private') return true;
    const twoParticipants = Array.isArray(chat.participants) && chat.participants.length === 2;
    if (twoParticipants && !chat.isGroup) return true;
    if (typeof chat.name === 'string' && chat.name.trim().toLowerCase() === 'приватный чат') return true;
    return false;
  };

  // ВАЖНО: скрываем из секции "Ваши чаты" все приватные 1:1 чаты,
  // чтобы они не дублировались в списке чатов. (Иконка напротив сотрудника
  // показывает наличие переписки.)
  const visibleChats = (chats || []).filter(chat => !isOneToOnePrivate(chat));

  const handleSelectChat = (chat) => {
    handleClose();
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    dispatch({ type: 'MARK_CHAT_AS_READ', payload: { chatId: chat.id, participants: chat.participants } });
    if (window.socket && window.socket.connected) {
      window.socket.emit('join_chat', chat.id);
      window.socket.emit('mark_chat_read', chat.id);
    }
    if (window.setMessengerView) window.setMessengerView('chat');
  };

  const handleCreateChat = () => {
    handleClose();
    dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'createChat', show: true } });
  };

  const handleDeleteChat = (chatId, chatName, event) => {
    event.stopPropagation();
    if (window.confirm(`Вы уверены, что хотите удалить чат "${chatName}"?`)) {
      setDeletingChats(prev => new Set([...prev, chatId]));
      dispatch({ type: 'DELETE_CHAT', payload: { chatId } });
      if (window.socket) window.socket.emit('delete_chat', { chatId });
      setTimeout(() => {
        setDeletingChats(prev => {
          const next = new Set(prev);
          next.delete(chatId);
          return next;
        });
      }, 2000);
    }
  };

  // Обработчик клика по сотруднику
  const handleSelect = (userId) => {
    handleClose();

    const me = state.user;
    const otherUser = employees.find(e => e.id === userId);
    // Запомним последнюю цель приватного чата для заголовка
    dispatch({ type: 'SET_LAST_PRIVATE_TARGET', payload: otherUser });

    // Проверяем, есть ли приватный чат с этим пользователем
    const privateChat = (chats || []).find(
      chat => chat.isPrivate && chat.participants?.some(p => p.id === userId)
    );

    if (privateChat) {
      // Открываем существующий приватный чат
      dispatch({ type: 'SET_CURRENT_CHAT', payload: privateChat });
      dispatch({ type: 'MARK_CHAT_AS_READ', payload: { chatId: privateChat.id, participants: privateChat.participants } });
      if (window.socket && window.socket.connected) {
        window.socket.emit('join_chat', privateChat.id);
        window.socket.emit('mark_chat_read', privateChat.id);
      }
      if (window.setMessengerView) window.setMessengerView('chat');
    } else {
      // Если приватного чата ещё нет — помечаем пользователя как pending (покажем иконку рядом)
      setPendingPrivateTargets(prev => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });

      // Запрашиваем создание приватного чата. Не создаём временный чат и не переключаемся до подтверждения
      if (window.socket) {
        window.socket.emit('create_private_chat', { targetUserId: userId });
      }
    }
  };

  if (!open) return null;

  return (
    <Modal onClick={handleClose}>
      <StyledModalContent onClick={e => e.stopPropagation()}>
        <CloseButton onClick={handleClose}><FiX /></CloseButton>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                background: filter === 'all' ? 'rgba(67,233,123,0.25)' : 'rgba(255,255,255,0.1)',
                border: `1px solid ${filter === 'all' ? 'rgba(67,233,123,0.5)' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '8px',
                padding: '6px 10px',
                color: filter === 'all' ? '#43e97b' : '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.85em',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              title="Все сотрудники"
            >
              <FiUsers size={14} />
              Все
            </button>

            <button
              onClick={() => setFilter('online')}
              style={{
                background: filter === 'online' ? 'rgba(67,233,123,0.25)' : 'rgba(255,255,255,0.1)',
                border: `1px solid ${filter === 'online' ? 'rgba(67,233,123,0.5)' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '8px',
                padding: '6px 10px',
                color: filter === 'online' ? '#43e97b' : '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.85em',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              title="Только онлайн"
            >
              <FiUserCheck size={14} />
              Онлайн
            </button>

            <button
              onClick={() => setFilter('offline')}
              style={{
                background: filter === 'offline' ? 'rgba(231,76,60,0.25)' : 'rgba(255,255,255,0.1)',
                border: `1px solid ${filter === 'offline' ? 'rgba(231,76,60,0.5)' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '8px',
                padding: '6px 10px',
                color: filter === 'offline' ? '#e74c3c' : '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.85em',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              title="Только офлайн"
            >
              <FiUserX size={14} />
              Офлайн
            </button>

            <button
              onClick={handleCreateChat}
              style={{
                background: 'rgba(67,233,123,0.25)',
                border: '1px solid rgba(67,233,123,0.5)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: '#43e97b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.85em',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              title="Создать чат"
            >
              <FiPlus size={14} />
              Создать чат
            </button>
          </div>
        </div>

        {/* --- СЕКЦИЯ ЧАТОВ (скрываем 1:1 приватные чаты) --- */}
        <ModalTitle style={{ margin: '0 0 8px 0', textAlign: 'center' }}>Ваши чаты</ModalTitle>
        <ChatList>
          {visibleChats.length === 0 ? (
            <NoResults>Нет чатов</NoResults>
          ) : (
            visibleChats.map(chat => (
              <ChatItemContainer
                key={chat.id}
                $active={chat.id === currentChatId}
                $isGroup={!!chat.isGroup}
                onClick={() => handleSelectChat(chat)}
              >
                <FiMessageSquare style={{ color: chat.id === currentChatId ? '#43e97b' : '#fff', fontSize: '1.2em' }} />
                <ChatName>{chat.name}</ChatName>
                {Number(chat.unread_count) > 0 && (
                  <span style={{
                    background: '#43e97b',
                    color: '#232931',
                    fontWeight: 800,
                    borderRadius: 10,
                    padding: '1px 6px',
                    fontSize: '0.8em',
                    marginRight: 8
                  }}>{chat.unread_count}</span>
                )}
                <DeleteButton
                  title="Удалить чат"
                  onClick={e => handleDeleteChat(chat.id, chat.name, e)}
                  style={{ opacity: deletingChats.has(chat.id) ? 1 : undefined }}
                >
                  <FiTrash2 />
                </DeleteButton>
              </ChatItemContainer>
            ))
          )}
        </ChatList>

        <ModalTitle style={{ margin: '24px 0 8px 0', textAlign: 'center' }}>Все сотрудники</ModalTitle>
        <SearchWrapper>
          <Input
            type="text"
            placeholder="Поиск по имени или фамилии..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </SearchWrapper>

        <EmployeeList>
          {filteredEmployees.length === 0 ? (
            <NoResults>Ничего не найдено</NoResults>
          ) : (
            filteredEmployees.map((emp, index) => {
              const isOnline = isUserOnline(emp.id);

              // Проверяем, есть ли приватный 1:1 чат с этим пользователем
              const privateChat = (chats || []).find(chat =>
                isOneToOnePrivate(chat) && chat.participants?.some(p => p.id === emp.id)
              );

              // Показываем иконку справа от индикатора, если приватная переписка существует
              // либо если она только что инициирована (pending)
              const showChatIcon = Boolean(privateChat) || pendingPrivateTargets.has(emp.id) || (state.unreadByUser?.[emp.id] > 0);

              return (
                <EmployeeItem
                  key={emp.id}
                  onClick={() => handleSelect(emp.id)}
                  style={{
                    animationDelay: `${index * 0.05}s`
                  }}
                >
                  {emp.avatar ? (
                    <Avatar src={emp.avatar} alt="avatar" />
                  ) : (
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      border: '2px solid rgba(255,255,255,0.1)'
                    }}>
                      <FiUser style={{ fontSize: '1.5em', color: '#ffe082' }} />
                    </div>
                  )}

                  <Name>{emp.username || (emp.first_name + ' ' + emp.last_name)}</Name>

                  <StatusIndicator $online={isOnline}>
                    <StatusDot $online={isOnline} />
                    <span>{isOnline ? 'В сети' : 'Не в сети'}</span>
                  </StatusIndicator>

                  {/* Иконка чата рядом с индикатором (не добавляет чат в список чатов) */}
                  {showChatIcon && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                      <FiMessageSquare style={{ color: '#43e97b', fontSize: '1.2em' }} title="Есть переписка" />
                      {(privateChat?.unread_count > 0 || (state.unreadByUser?.[emp.id] > 0)) && (
                        <span style={{
                          background: '#43e97b',
                          color: '#232931',
                          fontWeight: 800,
                          borderRadius: 10,
                          padding: '1px 6px',
                          fontSize: '0.8em'
                        }}>{privateChat?.unread_count || state.unreadByUser?.[emp.id]}</span>
                      )}
                    </div>
                  )}
                </EmployeeItem>
              );
            })
          )}
        </EmployeeList>
      </StyledModalContent>
    </Modal>
  );
}