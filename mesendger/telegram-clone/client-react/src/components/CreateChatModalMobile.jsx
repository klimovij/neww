import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiUserPlus, FiMessageCircle, FiRefreshCw } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import { formatLastSeen } from '../utils/timeUtils';
import { Avatar } from '../styles/GlobalStyles';

export default function CreateChatModalMobile({ open, onClose, onOpenChatsList }) {
  const { state, dispatch } = useApp();
  
  // Вкладки
  const [activeTab, setActiveTab] = useState('create'); // 'create' или 'users'
  
  // Состояния для создания чата
  const [chatName, setChatName] = useState('');
  const [chatType, setChatType] = useState('group');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  
  // Состояния для добавления пользователей
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [selectedChatId, setSelectedChatId] = useState(state.currentChat?.id || '');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [removingUserId, setRemovingUserId] = useState(null);
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [onlyAuthorized, setOnlyAuthorized] = useState(true);
  const [onlyInChat, setOnlyInChat] = useState(false);
  const [authorizedUserIds, setAuthorizedUserIds] = useState([]);
  const [addingLoading, setAddingLoading] = useState(false);
  
  const ONLY_ONLINE_STORAGE_KEY = 'userSelection.onlyOnline';
  const ONLY_AUTH_STORAGE_KEY = 'userSelection.onlyAuthorized';
  const ONLY_IN_CHAT_STORAGE_KEY = 'userSelection.onlyInChat';
  
  const modalRef = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // Helper: онлайн статус
  const isUserOnline = (user) => {
    if (typeof user?.online === 'boolean') return user.online;
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

  // Сброс состояний при закрытии
  useEffect(() => {
    if (!open) {
      setChatName('');
      setChatType('group');
      setCreateError('');
      setCreateSuccess('');
      setCreating(false);
      setUsers([]);
      setFilteredUsers([]);
      setSearchQuery('');
      setSelectedUserIds([]);
      setUsersError('');
      setUsersLoading(false);
      setSelectedChatId(state.currentChat?.id || '');
      setAddingLoading(false);
      setActiveTab('create');
    }
  }, [open, state.currentChat?.id]);

  // Восстановление фильтров из localStorage
  useEffect(() => {
    if (!open) return;
    try { 
      const v = localStorage.getItem(ONLY_ONLINE_STORAGE_KEY); 
      if (v !== null) setOnlyOnline(v === 'true'); 
    } catch {}
    try { 
      const v = localStorage.getItem(ONLY_AUTH_STORAGE_KEY); 
      if (v !== null) setOnlyAuthorized(v === 'true'); 
    } catch {}
    try { 
      const v = localStorage.getItem(ONLY_IN_CHAT_STORAGE_KEY); 
      if (v !== null) setOnlyInChat(v === 'true'); 
    } catch {}
    if (activeTab === 'users') {
      fetchUsers();
      if (state.currentChat?.id && window.socket && window.isSocketAuthenticated) {
        window.socket.emit('get_chat_participants', state.currentChat.id);
      }
    }
  }, [open, activeTab]);

  // Сохранение фильтров
  useEffect(() => { 
    try { localStorage.setItem(ONLY_ONLINE_STORAGE_KEY, String(onlyOnline)); } catch {} 
  }, [onlyOnline]);
  useEffect(() => { 
    try { localStorage.setItem(ONLY_AUTH_STORAGE_KEY, String(onlyAuthorized)); } catch {} 
  }, [onlyAuthorized]);
  useEffect(() => { 
    try { localStorage.setItem(ONLY_IN_CHAT_STORAGE_KEY, String(onlyInChat)); } catch {} 
  }, [onlyInChat]);

  // Загрузка пользователей
  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      if (!window.socket) {
        setUsersError('Нет соединения с сервером');
        setUsersLoading(false);
        return;
      }
      if (!window.socket.connected) {
        setUsersError('Соединение с сервером потеряно');
        setUsersLoading(false);
        return;
      }
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const list = await res.json();
      if (Array.isArray(list)) {
        const fromDb = list
          .filter(u => u.id !== state.user?.id)
          .map(u => ({ ...u, online: isUserOnline(u) }));
        const sorted = fromDb.sort((a, b) => {
          if (a.online === b.online) return (a.username || '').localeCompare(b.username || '');
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
      console.error(e);
      setUsersError('Не удалось загрузить пользователей');
    } finally {
      setUsersLoading(false);
    }
  };

  // Обновление списка пользователей через socket
  useEffect(() => {
    if (!window.socket || !open) return;
    
    const handleAllUsers = (allUsers) => {
      if (!Array.isArray(allUsers)) return;
      const other = allUsers.filter(u => u.id !== state.user?.id).map(u => ({ ...u, online: isUserOnline(u) }));
      const sorted = other.sort((a,b) => (a.online === b.online) ? (a.username||'').localeCompare(b.username||'') : (a.online ? -1 : 1));
      setUsers(sorted);
      setFilteredUsers(sorted);
    };
    
    const handleAuthenticated = () => {
      if (open && activeTab === 'users') {
        window.socket.emit('get_all_users');
        if (state.currentChat?.id) window.socket.emit('get_chat_participants', state.currentChat.id);
      }
    };
    
    const handleUsersRemoved = ({ chatId, userIds }) => {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'info', message: `Пользователь${userIds.length>1?'и':''} удалён${userIds.length>1?'ы':''} из группы` } });
      setRemovingUserId(null);
      if (state.currentChat?.id) {
        if (window.isSocketAuthenticated) window.socket.emit('get_chat_participants', state.currentChat.id);
      }
      if (window.isSocketAuthenticated) window.socket.emit('get_chats');
    };
    
    const handleUsersAdded = (data) => {
      if (data && String(data.chatId) === String(selectedChatId)) {
        setAddingLoading(false);
        if (window.isSocketAuthenticated) window.socket.emit('get_chat_participants', selectedChatId);
        setSelectedUserIds([]);
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Пользователи успешно добавлены' } });
      }
    };

    window.socket.on('all_users', handleAllUsers);
    window.socket.on('authenticated', handleAuthenticated);
    window.socket.on('users_removed_from_chat', handleUsersRemoved);
    window.socket.on('users_added_to_chat', handleUsersAdded);

    return () => {
      if (!window.socket) return;
      window.socket.off('all_users', handleAllUsers);
      window.socket.off('authenticated', handleAuthenticated);
      window.socket.off('users_removed_from_chat', handleUsersRemoved);
      window.socket.off('users_added_to_chat', handleUsersAdded);
    };
  }, [open, activeTab, selectedChatId, state.currentChat, state.user, dispatch]);

  // Обновление online-статуса
  useEffect(() => {
    if (!users.length) return;
    setUsers(prev => prev.map(u => ({ ...u, online: isUserOnline(u) })));
  }, [state.onlineUsers]);

  // Фильтрация пользователей
  useEffect(() => {
    const participantIds = (state.chatParticipants || []).map(u => u.id);
    let filtered = onlyInChat ? users.filter(u => participantIds.includes(u.id)) : users.filter(u => !participantIds.includes(u.id));
    if (onlyAuthorized && authorizedUserIds.length > 0) filtered = filtered.filter(u => authorizedUserIds.includes(String(u.id)));
    if (onlyOnline) filtered = filtered.filter(u => u.online);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(u => (u.username || u.name || u.email || '').toLowerCase().includes(q));
    }
    setFilteredUsers(filtered);
  }, [searchQuery, users, state.chatParticipants, onlyOnline, onlyAuthorized, authorizedUserIds, onlyInChat]);

  // Сброс selectedChatId при открытии
  useEffect(() => {
    setSelectedChatId(state.currentChat?.id || '');
  }, [state.currentChat?.id]);

  // Обработчик создания чата
  const handleCreateChat = async (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!chatName.trim()) {
      setCreateError('Введите название чата');
      return;
    }
    if (!window.socket) {
      setCreateError('Нет соединения с сервером');
      return;
    }
    if (!window.socket.connected) {
      setCreateError('Соединение с сервером потеряно');
      return;
    }
    
    setCreating(true);
    setCreateError('');
    setCreateSuccess('');

    const chatData = { name: chatName.trim(), type: chatType };
    
    const handleChatCreated = (data) => {
      setCreateSuccess(`Чат "${data.name}" успешно создан!`);
      setCreating(false);
      if (window.socket) {
        window.socket.emit('get_chats');
      }
      setTimeout(() => {
        handleClose();
      }, 1500);
      window.socket.off('chat_created', handleChatCreated);
      window.socket.off('error', handleChatError);
    };
    
    const handleChatError = (err) => {
      setCreateError(err || 'Ошибка создания чата');
      setCreating(false);
      window.socket.off('chat_created', handleChatCreated);
      window.socket.off('error', handleChatError);
    };

    window.socket.once('chat_created', handleChatCreated);
    window.socket.once('error', handleChatError);
    window.socket.emit('create_chat', chatData);

    setTimeout(() => {
      if (creating) {
        setCreateError('Превышено время ожидания ответа от сервера');
        setCreating(false);
        window.socket.off('chat_created', handleChatCreated);
        window.socket.off('error', handleChatError);
      }
    }, 10000);
  };

  // Обработчики для добавления пользователей
  const handleRemoveUser = (userId) => {
    if (!window.socket || !state.currentChat?.id) return;
    if (!window.isSocketAuthenticated) {
      console.warn('Попытка remove_users_from_chat до аутентификации');
      return;
    }
    setRemovingUserId(userId);
    window.socket.emit('remove_users_from_chat', { chatId: state.currentChat.id, userIds: [userId] });
  };

  const handleCreatePrivateChat = (userId) => {
    if (!window.socket) {
      setUsersError('Нет соединения с сервером');
      return;
    }
    if (!window.socket.connected) {
      setUsersError('Соединение с сервером потеряно');
      return;
    }
    if (!window.isSocketAuthenticated) {
      console.warn('Попытка create_private_chat до аутентификации');
      return;
    }
    window.socket.emit('create_private_chat', { targetUserId: userId });
  };

  const handleUserCheckbox = (userId) => {
    setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleSelectAllFiltered = () => {
    setSelectedUserIds(filteredUsers.map(u => u.id));
  };

  const handleConfirmAddUsers = () => {
    if (!selectedChatId) {
      setUsersError('Сначала выберите чат');
      return;
    }
    if (selectedUserIds.length === 0) {
      setUsersError('Выберите хотя бы одного пользователя');
      return;
    }
    if (!window.socket) {
      setUsersError('Нет соединения с сервером');
      return;
    }
    if (!window.socket.connected) {
      setUsersError('Соединение с сервером потеряно');
      return;
    }
    if (!window.isSocketAuthenticated) {
      console.warn('Попытка add_users_to_chat до аутентификации');
      return;
    }

    const chatIdNum = Number(selectedChatId);
    const userIdsNum = selectedUserIds.map(id => Number(id)).filter(n => !Number.isNaN(n));
    setAddingLoading(true);
    setUsersError('');
    window.socket.emit('add_users_to_chat', { chatId: chatIdNum, userIds: userIdsNum });
  };

  if (!open) return null;

  const participants = state.chatParticipants || [];
  const currentUser = state.user;
  const isSuperAdmin = currentUser?.username === 'albertronin5@gmail.com';
  const isCreator = state.currentChat?.created_by === currentUser?.id;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 100002,
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
            {activeTab === 'create' ? 'Создать чат' : 'Добавить пользователей'}
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

        {/* Вкладки */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(67,233,123,0.1)',
          background: 'rgba(34,40,49,0.8)'
        }}>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: activeTab === 'create' ? '2px solid #43e97b' : '1px solid rgba(255,255,255,0.1)',
              background: activeTab === 'create' ? 'rgba(67,233,123,0.15)' : 'transparent',
              color: activeTab === 'create' ? '#43e97b' : '#e6f7ef',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.95rem',
              transition: 'all 0.2s'
            }}
          >
            Создать чат
          </button>
          <button
            onClick={() => {
              setActiveTab('users');
              if (users.length === 0) {
                fetchUsers();
              }
            }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: activeTab === 'users' ? '2px solid #43e97b' : '1px solid rgba(255,255,255,0.1)',
              background: activeTab === 'users' ? 'rgba(67,233,123,0.15)' : 'transparent',
              color: activeTab === 'users' ? '#43e97b' : '#e6f7ef',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.95rem',
              transition: 'all 0.2s'
            }}
          >
            Добавить пользователей
          </button>
        </div>

        {/* Контент */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '20px',
          background: 'linear-gradient(135deg, #232931 0%, #232b3a 100%)'
        }}>
          {activeTab === 'create' ? (
            <>
              {/* Сообщения об ошибках/успехе */}
              {createError && (
                <div style={{
                  background: 'rgba(255,99,71,0.15)',
                  color: '#ffb8b8',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  border: '1px solid rgba(255,99,71,0.3)'
                }}>
                  {createError}
                </div>
              )}
              
              {createSuccess && (
                <div style={{
                  background: 'rgba(163,255,176,0.15)',
                  color: '#a3ffb0',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  border: '1px solid rgba(163,255,176,0.3)'
                }}>
                  {createSuccess}
                </div>
              )}

              {/* Тип чата */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '12px',
                  color: '#9fb0ba',
                  fontWeight: 700,
                  fontSize: '1rem'
                }}>
                  Тип чата
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setChatType('group')}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '12px',
                      border: chatType === 'group' ? '2px solid #43e97b' : '1px solid rgba(255,255,255,0.1)',
                      background: chatType === 'group' ? 'rgba(67,233,123,0.15)' : 'rgba(255,255,255,0.03)',
                      color: '#e6f7ef',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '1rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    Группа
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatType('channel')}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '12px',
                      border: chatType === 'channel' ? '2px solid #43e97b' : '1px solid rgba(255,255,255,0.1)',
                      background: chatType === 'channel' ? 'rgba(67,233,123,0.15)' : 'rgba(255,255,255,0.03)',
                      color: '#e6f7ef',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '1rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    Канал
                  </button>
                </div>
              </div>

              {/* Название чата */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '12px',
                  color: '#9fb0ba',
                  fontWeight: 700,
                  fontSize: '1rem'
                }}>
                  Название чата
                </label>
                <input
                  type="text"
                  placeholder="Введите название чата..."
                  value={chatName}
                  onChange={e => setChatName(e.target.value)}
                  disabled={creating}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(67,233,123,0.25)',
                    background: '#232931',
                    color: '#e6f7ef',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    boxShadow: '0 2px 8px rgba(67,233,123,0.04)'
                  }}
                />
              </div>

              {/* Кнопки */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                marginTop: 'auto',
                paddingTop: '20px'
              }}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={creating}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '1rem',
                    opacity: creating ? 0.5 : 1
                  }}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleCreateChat}
                  disabled={creating || !chatName.trim()}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: creating || !chatName.trim() 
                      ? 'rgba(67,233,123,0.3)' 
                      : 'linear-gradient(90deg, #43e97b 0%, #ffe082 100%)',
                    color: '#232931',
                    cursor: creating || !chatName.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                    fontSize: '1rem',
                    opacity: creating || !chatName.trim() ? 0.6 : 1
                  }}
                >
                  {creating ? 'Создание...' : 'Создать чат'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Сообщения об ошибках */}
              {usersError && (
                <div style={{
                  background: 'rgba(255,99,71,0.15)',
                  color: '#ffb8b8',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  border: '1px solid rgba(255,99,71,0.3)'
                }}>
                  {usersError}
                </div>
              )}

              {/* Выбор чата */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#9fb0ba',
                  fontWeight: 700,
                  fontSize: '0.95rem'
                }}>
                  Выберите чат
                </label>
                <select
                  value={selectedChatId}
                  onChange={e => {
                    setSelectedChatId(e.target.value);
                    if (e.target.value && window.socket && window.isSocketAuthenticated) {
                      window.socket.emit('get_chat_participants', e.target.value);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: '#232931',
                    color: '#e6f7ef',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Выберите чат</option>
                  {state.chats.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.username || `Чат ${c.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Поиск и обновление */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Поиск пользователей..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: '#192022',
                    color: '#e6f7ef',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  onClick={fetchUsers}
                  disabled={usersLoading}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(67,233,123,0.3)',
                    background: 'rgba(67,233,123,0.15)',
                    color: '#43e97b',
                    cursor: usersLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '48px'
                  }}
                  title="Обновить"
                >
                  <FiRefreshCw size={20} />
                </button>
              </div>

              {/* Фильтры */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ color: '#9fb0ba', fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
                  Фильтры
                </div>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={onlyOnline}
                    onChange={e => setOnlyOnline(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ color: '#e6f7ef', fontSize: '0.95rem' }}>Только онлайн</span>
                </label>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={onlyAuthorized}
                    onChange={e => setOnlyAuthorized(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ color: '#e6f7ef', fontSize: '0.95rem' }}>Только авторизованные</span>
                </label>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={onlyInChat}
                    onChange={e => setOnlyInChat(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ color: '#e6f7ef', fontSize: '0.95rem' }}>Уже в чате</span>
                </label>
                <div style={{ marginTop: '4px', color: '#9fb0ba', fontSize: '0.9rem' }}>
                  Доступно: <b style={{ color: '#a3ffb0' }}>{filteredUsers.length}</b>
                </div>
              </div>

              {/* Список пользователей */}
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)',
                padding: '8px',
                marginBottom: '16px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {usersLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#9fb0ba' }}>
                    Загрузка пользователей...
                  </div>
                ) : usersError && !users.length ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#ffb8b8' }}>
                    {usersError}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#9fb0ba' }}>
                    {searchQuery ? 'Пользователи не найдены' : 'Нет доступных пользователей'}
                  </div>
                ) : filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleUserCheckbox(user.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      marginBottom: '6px',
                      background: selectedUserIds.includes(user.id) 
                        ? 'rgba(67,233,123,0.15)' 
                        : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleUserCheckbox(user.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <Avatar
                      size="48px"
                      online={user.online}
                      style={{ overflow: 'hidden', background: '#1f2630', flexShrink: 0 }}
                    >
                      <img
                        src={user.avatar || '/default-avatar.png'}
                        alt={user.username || 'User'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      />
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#e6f7ef', fontSize: '1rem', marginBottom: '4px' }}>
                        {user.username || user.name || 'Пользователь'}
                      </div>
                      <div style={{
                        fontSize: '0.85rem',
                        color: user.online ? '#a3ffb0' : '#9fb0ba',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {formatLastSeen(user.last_seen, user.online)}
                      </div>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleCreatePrivateChat(user.id);
                      }}
                      disabled={usersLoading}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(67,233,123,0.3)',
                        background: 'rgba(67,233,123,0.15)',
                        color: '#43e97b',
                        cursor: usersLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0
                      }}
                    >
                      <FiMessageCircle size={16} />
                      <span style={{ display: window.innerWidth > 400 ? 'inline' : 'none' }}>Написать</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Кнопки управления */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(67,233,123,0.1)',
                  border: '1px solid rgba(67,233,123,0.2)'
                }}>
                  <span style={{ color: '#e6f7ef', fontWeight: 700 }}>
                    Выбрано: <b style={{ color: '#a3ffb0' }}>{selectedUserIds.length}</b>
                  </span>
                  <button
                    onClick={handleSelectAllFiltered}
                    disabled={usersLoading || filteredUsers.length === 0}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      cursor: usersLoading || filteredUsers.length === 0 ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      opacity: usersLoading || filteredUsers.length === 0 ? 0.5 : 1
                    }}
                  >
                    Выбрать всех
                  </button>
                </div>
                <button
                  onClick={handleConfirmAddUsers}
                  disabled={addingLoading || !selectedChatId || selectedUserIds.length === 0}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: addingLoading || !selectedChatId || selectedUserIds.length === 0
                      ? 'rgba(67,233,123,0.3)'
                      : 'linear-gradient(90deg, #43e97b 0%, #ffe082 100%)',
                    color: '#232931',
                    cursor: addingLoading || !selectedChatId || selectedUserIds.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: addingLoading || !selectedChatId || selectedUserIds.length === 0 ? 0.6 : 1
                  }}
                >
                  <FiUserPlus size={20} />
                  {addingLoading ? 'Добавление...' : 'Добавить выбранных'}
                </button>
              </div>

              {/* Участники текущего чата */}
              {state.currentChat && (
                <div style={{ marginTop: '24px' }}>
                  <div style={{
                    color: '#ffe082',
                    fontWeight: 800,
                    fontSize: '1rem',
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255,224,130,0.2)'
                  }}>
                    Участники группы:
                  </div>
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '8px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {participants.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#9fb0ba' }}>
                        Нет участников
                      </div>
                    ) : participants.map(user => (
                      <div
                        key={user.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          borderRadius: '10px',
                          marginBottom: '6px',
                          background: 'rgba(255,255,255,0.03)'
                        }}
                      >
                        <Avatar
                          size="48px"
                          online={user.online}
                          style={{ overflow: 'hidden', background: '#1f2630', flexShrink: 0 }}
                        >
                          <img
                            src={user.avatar || '/default-avatar.png'}
                            alt={user.username || 'User'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                          />
                        </Avatar>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#e6f7ef', fontSize: '1rem', marginBottom: '4px' }}>
                            {user.username || user.name || 'Пользователь'}
                          </div>
                          <div style={{
                            fontSize: '0.85rem',
                            color: user.online ? '#a3ffb0' : '#9fb0ba'
                          }}>
                            {formatLastSeen(user.last_seen, user.online)}
                          </div>
                        </div>
                        {(isSuperAdmin || isCreator) && user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleRemoveUser(user.id)}
                            disabled={removingUserId === user.id}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '10px',
                              border: '1px solid rgba(231,76,60,0.3)',
                              background: 'rgba(231,76,60,0.15)',
                              color: '#ffb8b8',
                              cursor: removingUserId === user.id ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              opacity: removingUserId === user.id ? 0.6 : 1
                            }}
                          >
                            {removingUserId === user.id ? 'Удаление...' : 'Удалить'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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
