import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Modal, ModalContent, CloseButton, Input, Button, Avatar } from '../../styles/GlobalStyles';
import { FiX, FiUserPlus, FiMessageCircle, FiSearch } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { formatLastSeen } from '../../utils/timeUtils';
import Emoji from '../Common/Emoji';

const DarkCloseButton = styled(CloseButton)`
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s, color 0.3s;
  &:hover {
    color: #43e97b;
    background: rgba(34, 197, 94, 0.18);
  }
  svg { width: 22px; height: 22px; }
`;

const StyledModalContent = styled(ModalContent)`
  background: linear-gradient(135deg, #232931 0%, #181c22 100%);
  color: #fff;
  border-radius: 28px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.15), 0 0 0 2px #2193b022;
  padding: 40px 48px;
  min-width: 480px;
  max-width: 980px;
  border: none;
  position: relative;
  animation: modalFadeIn 0.35s cubic-bezier(.4,0,.2,1);
  @keyframes modalFadeIn {
    from { opacity: 0; transform: translateY(24px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
`;

const ModalTitle = styled.h3`
  margin: 0 0 1.2rem 0;
  color: #43e97b;
  text-align: center;
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 0.01em;
  text-shadow: 0 0 22px #43e97b, 0 0 32px #43e97b44, 0 0 2px #fff, 0 0 24px #43e97b88;
`;

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 1.5rem;
`;

const StyledInput = styled(Input)`
  border-radius: 14px;
  border: 1.5px solid #43e97b55;
  padding: 0.9rem 1.2rem 0.9rem 2.5rem;
  font-size: 1.02rem;
  background: #232931;
  color: #e6f7ef;
  box-shadow: 0 2px 8px rgba(67,233,123,0.08);
  transition: border-color 0.3s, box-shadow 0.3s;
  &::placeholder { color: #a6b0b6; }
  &:focus {
    border-color: #43e97b;
    box-shadow: 0 0 0 2px rgba(67,233,123,0.18);
    outline: none;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9fb0ba;
`;

const UsersList = styled.div`
  max-height: 420px;
  overflow-y: auto;
  border: none;
  border-radius: 16px;
  background: rgba(255,255,255,0.03);
  box-shadow: 0 2px 16px #2193b022, 0 0 0 1px #2193b011 inset;
  margin-bottom: 0.5rem;
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
    &:hover {
      background: #6df6a1;
    }
  }
`;

const UserItem = styled.div`
  display: flex;
  align-items: center;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  transition: background 0.2s, box-shadow 0.2s;
  border-radius: 12px;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: rgba(255,255,255,0.06);
    box-shadow: 0 2px 8px rgba(67,233,123,0.12);
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
`;

const UserDetails = styled.div`
  flex: 1;
`;

const Username = styled.div`
  font-weight: 700;
  color: #e6f7ef;
  margin-bottom: 0.15rem;
`;

const UserStatus = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'online'
})`
  font-size: 0.8rem;
  color: ${props => props.online ? '#a3ffb0' : '#9fb0ba'};
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.online ? '#43e97b' : '#6c757d'};
  }
`;

const UserActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled(Button)`
  border-radius: 10px;
  font-size: 0.98rem;
  font-weight: 600;
  padding: 0.65rem 1.3rem;
  box-shadow: 0 2px 8px rgba(44,62,80,0.10);
  transition: all 0.18s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  &:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.04);
    box-shadow: 0 4px 16px rgba(44,62,80,0.13);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #9fb0ba;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #9fb0ba;
`;

const ErrorMessage = styled.div`
  background: rgba(255, 99, 71, 0.12);
  color: #ffb8b8;
  padding: 0.75rem;
  border-radius: 10px;
  margin-bottom: 1rem;
  border: 1px solid rgba(255, 99, 71, 0.25);
  text-align: center;
`;

export default function UserSelectionModal() {
  const { state, dispatch } = useApp();
  const [removingUserId, setRemovingUserId] = useState(null);

  useEffect(() => {
    if (!window.socket) return;
    const handleUsersRemoved = ({ chatId, userIds }) => {
      console.log('[UserSelectionModal] users_removed_from_chat:', { chatId, userIds });
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'info',
          message: `Пользователь${userIds.length > 1 ? 'и' : ''} удалён${userIds.length > 1 ? 'ы' : ''} из группы`,
        }
      });
      setRemovingUserId(null);
      // После удаления всегда запрашиваем актуальный список участников с сервера по текущему чату
      const currentChatId = state.currentChat?.id || chatId;
      if (currentChatId) {
        console.log('[UserSelectionModal] emit get_chat_participants', currentChatId);
        if (!window.isSocketAuthenticated) {
          console.warn('[UserSelectionModal] Попытка get_chat_participants до аутентификации');
          return;
        }
        window.socket.emit('get_chat_participants', currentChatId);
      }
      // Модальное окно не закрываем!
  // Обновляем список чатов для текущего пользователя
  if (!window.isSocketAuthenticated) {
    console.warn('[UserSelectionModal] Попытка get_chats до аутентификации');
    return;
  }
  window.socket.emit('get_chats');
    };
    window.socket.on('users_removed_from_chat', handleUsersRemoved);
    return () => {
      if (window.socket) {
        window.socket.off('users_removed_from_chat', handleUsersRemoved);
      }
    };
  }, [dispatch, state.currentChat]);
  // useApp должен быть вызван до обращения к state
  // useApp должен быть вызван только один раз!
  // Получаем участников текущей группы
  const participants = state.chatParticipants || [];
  const currentUser = state.user;
  const chat = state.currentChat;
  const isSuperAdmin = currentUser?.username === 'albertronin5@gmail.com';
  const isCreator = chat?.created_by === currentUser?.id;

  const handleRemoveUser = (userId) => {
    if (!window.socket || !chat?.id) return;
    setRemovingUserId(userId);
    if (!window.isSocketAuthenticated) {
      console.warn('[UserSelectionModal] Попытка remove_users_from_chat до аутентификации');
      return;
    }
    window.socket.emit('remove_users_from_chat', { chatId: chat.id, userIds: [userId] });
  };
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedChatId, setSelectedChatId] = useState(state.currentChat?.id || '');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [onlyOnline, setOnlyOnline] = useState(false);
  const ONLY_ONLINE_STORAGE_KEY = 'userSelection.onlyOnline';
  const [onlyAuthorized, setOnlyAuthorized] = useState(true);
  const ONLY_AUTH_STORAGE_KEY = 'userSelection.onlyAuthorized';
  const [authorizedUserIds, setAuthorizedUserIds] = useState([]);
  const [onlyInChat, setOnlyInChat] = useState(false);
  const ONLY_IN_CHAT_STORAGE_KEY = 'userSelection.onlyInChat';

  // Определяем онлайн-статус пользователя, учитывая разные форматы данных
  const isUserOnline = (user) => {
    if (typeof user?.online === 'boolean') return user.online;
    // Сопоставляем с глобальным списком онлайн-пользователей
    const onlineEntry = (state.onlineUsers || []).find(u => {
      const entryId = typeof u === 'object' ? (u.id || u.userId) : u;
      return String(entryId) === String(user.id);
    });
    if (onlineEntry === undefined) return false;
    if (typeof onlineEntry === 'number' || typeof onlineEntry === 'string') return true;
    if (typeof onlineEntry?.online === 'boolean') return onlineEntry.online;
    if (typeof onlineEntry?.isOnline === 'boolean') return onlineEntry.isOnline;
    if (typeof onlineEntry?.status === 'string') return onlineEntry.status.toLowerCase() === 'online';
    return Boolean(onlineEntry);
  };

  // Запрос пользователей при открытии модального окна
  useEffect(() => {
    if (state.modals.userSelection) {
      // Загружаем сохранённое состояние фильтра "Только онлайн"
      try {
        const saved = localStorage.getItem(ONLY_ONLINE_STORAGE_KEY);
        if (saved !== null) setOnlyOnline(saved === 'true');
      } catch {}
      // Загружаем сохранённое состояние фильтра "Только авторизованные"
      try {
        const savedAuth = localStorage.getItem(ONLY_AUTH_STORAGE_KEY);
        if (savedAuth !== null) setOnlyAuthorized(savedAuth === 'true');
      } catch {}
      // Загружаем сохранённое состояние фильтра "Уже в чате"
      try {
        const savedInChat = localStorage.getItem(ONLY_IN_CHAT_STORAGE_KEY);
        if (savedInChat !== null) setOnlyInChat(savedInChat === 'true');
      } catch {}
      if (!window.socket) {
        setError('Нет соединения с сервером');
        return;
      }
      if (!window.socket.connected) {
        setError('Соединение с сервером потеряно');
        return;
      }
      setLoading(true);
      setError('');
      // Запрашиваем всех пользователей из БД (таблица Users)
      (async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
          const list = await res.json();
          if (Array.isArray(list)) {
            const fromDb = list
              .filter(user => user.id !== state.user?.id)
              .map(u => ({ ...u, online: isUserOnline(u) }));
            const sorted = fromDb.sort((a, b) => {
              if (a.online === b.online) {
                return (a.username || '').localeCompare(b.username || '');
              }
              return a.online ? -1 : 1;
            });
            setUsers(sorted);
            setFilteredUsers(sorted);
            setAuthorizedUserIds(list.map(u => String(u.id)));
          } else {
            setUsers([]);
            setFilteredUsers([]);
          }
        } catch (e) {
          setError('Не удалось загрузить пользователей');
        } finally {
          setLoading(false);
        }
      })();
      // Запрашиваем участников текущего чата
      if (state.currentChat?.id) {
        if (!window.isSocketAuthenticated) {
          console.warn('[UserSelectionModal] Попытка get_chat_participants (state.currentChat) до аутентификации');
          return;
        }
        window.socket.emit('get_chat_participants', state.currentChat.id);
      }
      const timeout = setTimeout(() => {
        setError('Превышено время ожидания ответа от сервера');
        setLoading(false);
      }, 10000);
      // Параллельно подтягиваем список авторизованных пользователей из REST API
      (async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;
          const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
          const list = await res.json();
          if (Array.isArray(list)) {
            setAuthorizedUserIds(list.map(u => String(u.id)));
          }
        } catch (e) {
          // игнорируем ошибки, просто не фильтруем по авторизованным
        }
      })();
      return () => clearTimeout(timeout);
    }
  }, [state.modals.userSelection, state.currentChat]);

  // Сохраняем состояние фильтра при изменении
  useEffect(() => {
    try {
      localStorage.setItem(ONLY_ONLINE_STORAGE_KEY, String(onlyOnline));
    } catch {}
  }, [onlyOnline]);

  useEffect(() => {
    try {
      localStorage.setItem(ONLY_AUTH_STORAGE_KEY, String(onlyAuthorized));
    } catch {}
  }, [onlyAuthorized]);

  useEffect(() => {
    try {
      localStorage.setItem(ONLY_IN_CHAT_STORAGE_KEY, String(onlyInChat));
    } catch {}
  }, [onlyInChat]);

  // Повторный запрос пользователей и участников чата после аутентификации, если модалка открыта
  useEffect(() => {
    function handleAuthenticated() {
      if (state.modals.userSelection) {
        if (window.socket && window.isSocketAuthenticated) {
          window.socket.emit('get_all_users');
          if (state.currentChat?.id) {
            window.socket.emit('get_chat_participants', state.currentChat.id);
          }
        }
      }
    }
    if (window.socket) {
      window.socket.on('authenticated', handleAuthenticated);
    }
    return () => {
      if (window.socket) {
        window.socket.off('authenticated', handleAuthenticated);
      }
    };
  }, [state.modals.userSelection, state.currentChat]);
  
  // Регистрация обработчика 'all_users' и мгновенный запрос при открытии модалки
  useEffect(() => {
    const handleAllUsers = (allUsers) => {
      console.log('📋 Получен список пользователей:', allUsers);
      if (!Array.isArray(allUsers)) {
        console.warn('⚠️ allUsers не является массивом:', allUsers);
        return;
      }
      const otherUsers = allUsers
        .filter(user => user.id !== state.user?.id)
        .map(u => ({ ...u, online: isUserOnline(u) }));
      const sorted = otherUsers.sort((a, b) => (a.online === b.online)
        ? (a.username || '').localeCompare(b.username || '')
        : (a.online ? -1 : 1));
      setUsers(sorted);
      setFilteredUsers(sorted);
      setLoading(false);
    };
    
    // Проверяем существование socket перед использованием
    if (!window.socket) {
      console.warn('⚠️ window.socket не существует, ожидаем инициализации...');
      // Попробуем через небольшую задержку
      const retryTimeout = setTimeout(() => {
        if (window.socket && state.modals.userSelection) {
          window.socket.emit('get_all_users');
        }
      }, 1000);
      return () => clearTimeout(retryTimeout);
    }
    
    if (window.socket) {
      window.socket.on('all_users', handleAllUsers);
      
      // Обработчик ошибок
      const handleError = (error) => {
        console.error('❌ Socket error:', error);
        setError('Ошибка получения пользователей');
        setLoading(false);
      };
      window.socket.on('error', handleError);
      
      // Если модалка открыта, запрашиваем список пользователей
      if (state.modals.userSelection) {
        console.log('🔍 Запрашиваем список всех пользователей...');
        console.log('🔍 Socket connected:', window.socket.connected);
        console.log('🔍 Socket authenticated:', window.isSocketAuthenticated);
        
        if (window.socket.connected) {
          window.socket.emit('get_all_users');
          setLoading(true);
          
          // Таймаут на случай если сервер не ответит
          setTimeout(() => {
            setLoading(false);
            if (users.length === 0) {
              setError('Превышено время ожидания ответа от сервера');
            }
          }, 5000);
        } else {
          console.warn('⚠️ Socket не подключен');
          setError('Нет соединения с сервером');
        }
      }
    }
    
    return () => { 
      if (window.socket) {
        window.socket.off('all_users', handleAllUsers);
        window.socket.off('error', handleError);
      }
    };
  }, [state.user?.id, state.modals.userSelection]);
  useEffect(() => {
    if (!users.length) return;
    const updated = users.map(u => ({ ...u, online: isUserOnline(u) }));
    setUsers(updated);
  }, [state.onlineUsers]);

  // Фильтрация пользователей по поисковому запросу и исключение участников
  useEffect(() => {
    // ids участников
    const participantIds = (state.chatParticipants || []).map(u => u.id);
    console.log('[UserSelectionModal] chatParticipants:', state.chatParticipants);
    let filtered = onlyInChat
      ? users.filter(user => participantIds.includes(user.id))
      : users.filter(user => !participantIds.includes(user.id));
    if (onlyAuthorized && authorizedUserIds.length > 0) {
      filtered = filtered.filter(user => authorizedUserIds.includes(String(user.id)));
    }
    if (onlyOnline) {
      filtered = filtered.filter(user => user.online);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(user => {
        const name = (user.username || user.name || user.email || '').toLowerCase();
        return name.includes(q);
      });
    }
    setFilteredUsers(filtered);
  }, [searchQuery, users, state.chatParticipants, onlyOnline, onlyAuthorized, authorizedUserIds, onlyInChat]);

  // Сброс выбранного чата при открытии модального окна
  useEffect(() => {
    setSelectedChatId(state.currentChat?.id || '');
  }, [state.modals.userSelection, state.currentChat]);

  // Модальное окно всегда рендерится, но скрывается через display: none

  const handleClose = () => {
    dispatch({ 
      type: 'TOGGLE_MODAL', 
      payload: { modal: 'userSelection', show: false } 
    });
    setUsers([]);
    setFilteredUsers([]);
    setSearchQuery('');
    setError('');
    setLoading(false);
    setSelectedChatId('');
    setSelectedUserIds([]);
    // Обновляем список чатов после закрытия модального окна
    if (window.socket && window.socket.connected) {
      if (!window.isSocketAuthenticated) {
        console.warn('[UserSelectionModal] Попытка get_chats (2) до аутентификации');
        return;
      }
      window.socket.emit('get_chats');
    }
  };

  const handleCreatePrivateChat = (userId) => {
    if (!window.socket) {
      setError('Нет соединения с сервером');
      return;
    }

    if (!window.socket.connected) {
      setError('Соединение с сервером потеряно');
      return;
    }

    if (!window.isSocketAuthenticated) {
      console.warn('[UserSelectionModal] Попытка create_private_chat до аутентификации');
      return;
    }
    window.socket.emit('create_private_chat', { targetUserId: userId });
    // handleClose();
  };

  const handleAddToSelectedChat = (userId) => {
    // теперь не используется, выбор через чекбоксы
    // оставлено для обратной совместимости
  };

  console.log('users:', users);
  const handleUserCheckbox = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleConfirmAddUsers = () => {
    if (!selectedChatId) {
      setError('Сначала выберите чат');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Выберите хотя бы одного пользователя');
      return;
    }
    if (!window.socket) {
      setError('Нет соединения с сервером');
      return;
    }
    if (!window.socket.connected) {
      setError('Соединение с сервером потеряно');
      return;
    }
    // Отправляем всех выбранных пользователей
    if (!window.isSocketAuthenticated) {
      console.warn('[UserSelectionModal] Попытка add_users_to_chat до аутентификации');
      return;
    }
    const chatIdNum = Number(selectedChatId);
    const userIdsNum = selectedUserIds.map(id => Number(id)).filter(n => !Number.isNaN(n));
    window.socket.emit('add_users_to_chat', {
      chatId: chatIdNum,
      userIds: userIdsNum
    });
    // Закрываем окно только после подтверждения от сервера
    setLoading(true);
  };

  // Обработка успешного добавления пользователей
  useEffect(() => {
    const handleUsersAdded = (data) => {
      if (data && data.chatId === selectedChatId) {
        setLoading(false);
        // handleClose();
      }
    };
    if (window.socket) {
      window.socket.on('users_added_to_chat', handleUsersAdded);
    }
    return () => {
      if (window.socket) {
        window.socket.off('users_added_to_chat', handleUsersAdded);
      }
    };
  }, [selectedChatId]);
  console.log('filteredUsers:', filteredUsers);
  console.log('selectedChatId:', selectedChatId);
  console.log('loading:', loading);

  return (
    <Modal
      onClick={handleClose}
      style={{
        display: state.modals.userSelection ? 'block' : 'none',
        background: 'transparent',
        justifyContent: 'flex-start',
        alignItems: 'center',
        left: '350px',
        right: 0,
        width: 'auto'
      }}
    >
  <StyledModalContent $large onClick={e => e.stopPropagation()} style={{
    position:'fixed',
    top: 0,
    left: 0,
    width: '1170px',
    minWidth: '600px',
    maxWidth: '1170px',
    height: '92vh',
    margin: '32px 0',
    inset: 'unset',
    right: 'auto',
    bottom: 'auto',
    overflow: 'auto'
  }}>
        <DarkCloseButton onClick={handleClose} aria-label="Close modal">
          <FiX />
        </DarkCloseButton>
        <ModalTitle>Выберите пользователей и чат</ModalTitle>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="chat-select" style={{ marginRight: 8, fontWeight: 700, color: '#ffe082' }}>Чат:</label>
          <select
            id="chat-select"
            value={selectedChatId}
            onChange={e => setSelectedChatId(e.target.value)}
            disabled={loading}
            style={{
              padding: '0.7rem 1.1rem',
              borderRadius: 12,
              border: '1.5px solid #43e97b55',
              fontSize: '1.05rem',
              background: '#232931',
              color: '#e6f7ef',
              boxShadow: '0 2px 8px rgba(67,233,123,0.08)',
              outline: 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s',
              minWidth: 220
            }}
          >
            <option value="">Выберите чат</option>
            {state.chats.map(chat => (
              <option key={chat.id} value={chat.id}>
                {chat.name || chat.username || `Чат ${chat.id}`}
              </option>
            ))}
          </select>
        </div>
        <SearchContainer>
          <StyledInput
            type="text"
            placeholder="Поиск пользователей..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            disabled={loading}
          />
          <SearchIcon>
            <FiSearch size={16} />
          </SearchIcon>
        </SearchContainer>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 0.8rem 0', color: '#9fb0ba' }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={onlyOnline}
                onChange={e => setOnlyOnline(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#43e97b' }}
              />
              Только онлайн
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={onlyAuthorized}
                onChange={e => setOnlyAuthorized(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#ffe082' }}
              />
              Только авторизованные
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={onlyInChat}
                onChange={e => setOnlyInChat(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#6dd5ed' }}
              />
              Уже в чате
            </label>
          </div>
          <div>
            Доступно к добавлению: <span style={{ color: '#a3ffb0', fontWeight: 900 }}>{filteredUsers.length}</span>
          </div>
        </div>
        {/* Секция участников группы */}
        <div style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#ffe082', fontWeight: 800 }}>Участники группы:</h4>
          <UsersList>
            {participants.length === 0 ? (
              <EmptyState>Нет участников</EmptyState>
            ) : (
              participants.map(user => (
                <UserItem key={user.id}>
                  <UserInfo>
                    <Avatar size="40px" online={user.online} style={{overflow:'hidden',background:'#1f2630',marginRight:8}}>
                      <img
                        src={user.avatar || '/default-avatar.png'}
                        alt={user.username || 'User'}
                        style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}
                      />
                    </Avatar>
                    <UserDetails>
                      <Username>{user.username}</Username>
                      <UserStatus online={user.online}>
                        {formatLastSeen(user.last_seen, user.online)}
                      </UserStatus>
                    </UserDetails>
                  </UserInfo>
                  {(isSuperAdmin || isCreator) && user.id !== currentUser?.id && (
                    <UserActions>
                      <ActionButton
                        size="small"
                        $variant="danger"
                        onClick={() => handleRemoveUser(user.id)}
                        disabled={removingUserId === user.id}
                        style={{
                          background: 'rgba(231, 76, 60, 0.15)',
                          color: '#ffb8b8',
                          border: '1px solid rgba(231, 76, 60, 0.35)'
                        }}
                        title="Удалить пользователя из чата"
                      >
                        {removingUserId === user.id ? 'Удаление...' : 'Удалить'}
                      </ActionButton>
                    </UserActions>
                  )}
                </UserItem>
              ))
            )}
          </UsersList>
        </div>
        {/* Секция добавления пользователей */}
        <UsersList>
          {loading ? (
            <LoadingState>
              <div>Загрузка пользователей...</div>
            </LoadingState>
          ) : error && !users.length ? (
            <EmptyState>
              <EmptyIcon>⚠️</EmptyIcon>
              <div>Не удалось загрузить пользователей</div>
            </EmptyState>
          ) : filteredUsers.length === 0 ? (
            <EmptyState>
              <EmptyIcon>👥</EmptyIcon>
              <div>
                {searchQuery ? 'Пользователи не найдены' : 'Нет доступных пользователей'}
              </div>
            </EmptyState>
          ) : filteredUsers.map(user => (
              <UserItem
                key={user.id}
                onClick={() => handleUserCheckbox(user.id)}
                title={selectedUserIds.includes(user.id) ? 'Убрать из выбранных' : 'Выбрать пользователя'}
                style={{ cursor: 'pointer' }}
              >
                <UserInfo>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onClick={e => e.stopPropagation()}
                    onChange={() => handleUserCheckbox(user.id)}
                    style={{
                      marginRight: '1rem',
                      width: '22px',
                      height: '22px',
                      accentColor: selectedUserIds.includes(user.id) ? '#43e97b' : '#bdc3c7',
                      boxShadow: selectedUserIds.includes(user.id)
                        ? '0 0 0 2px #43e97b'
                        : '0 0 0 1px #bdc3c7',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s, accent-color 0.2s',
                      background: '#fff',
                      border: '1.5px solid #b2bec3',
                    }}
                  />
                  <Avatar size="40px" online={user.online} style={{overflow:'hidden',background:'#1f2630',marginRight:8}}>
                    <img
                      src={user.avatar || '/default-avatar.png'}
                      alt={user.username || 'User'}
                      style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}
                    />
                  </Avatar>
                  <UserDetails>
                    <Username>{user.username}</Username>
                    <UserStatus online={user.online}>
                      {formatLastSeen(user.last_seen, user.online)}
                    </UserStatus>
                  </UserDetails>
                </UserInfo>
                <UserActions>
                  <ActionButton
                    size="small"
                    onClick={e => { e.stopPropagation(); handleCreatePrivateChat(user.id); }}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(90deg, #43e97b 0%, #ffe082 100%)',
                      color: '#232931',
                      fontWeight: 800
                    }}
                  >
                    <FiMessageCircle size={14} />
                    Написать
                  </ActionButton>
                </UserActions>
              </UserItem>
            ))
          }
        </UsersList>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', color:'#9fb0ba' }}>
          <div style={{alignSelf:'center'}}>Выбрано: <span style={{color:'#a3ffb0', fontWeight:900}}>{selectedUserIds.length}</span></div>
          <ActionButton
            size="medium"
            $variant="secondary"
            onClick={() => setSelectedUserIds(filteredUsers.map(u => u.id))}
            disabled={loading || filteredUsers.length === 0}
          >
            Выбрать всех
          </ActionButton>
          <ActionButton
            size="medium"
            $variant="primary"
            onClick={handleConfirmAddUsers}
            disabled={loading || !selectedChatId || selectedUserIds.length === 0}
            style={{
              background: 'linear-gradient(90deg, #43e97b 0%, #ffe082 100%)',
              color: '#232931',
              fontWeight: 900
            }}
          >
            <FiUserPlus size={16} /> Добавить выбранных
          </ActionButton>
        </div>
      </StyledModalContent>
    </Modal>
  );
}