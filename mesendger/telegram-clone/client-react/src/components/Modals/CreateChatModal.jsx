import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Modal, ModalContent, CloseButton, Input, Button, Avatar } from '../../styles/GlobalStyles';
import { FiX, FiUsers, FiUser, FiPlus, FiTrash2, FiMessageCircle, FiUserPlus } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { formatLastSeen } from '../../utils/timeUtils';
import Emoji from '../Common/Emoji';

/* ============================
   Styled Components
   ============================ */

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
  padding: 28px;
  min-width: 480px;
  max-width: 1180px;
  border: none;
  position: relative;
  animation: modalFadeIn 0.28s cubic-bezier(.4,0,.2,1);
  display: flex;
  gap: 24px;
  flex-direction: column;
  @keyframes modalFadeIn {
    from { opacity: 0; transform: translateY(24px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
`;

const ModalTitle = styled.h3`
  margin: 0 0 12px 0;
  color: #43e97b;
  text-align: left;
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: 0.01em;
  text-shadow: 0 0 12px #43e97b22;
`;

const Tabs = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
`;

const TabButton = styled.button`
  background: ${props => props.active ? 'linear-gradient(90deg, #43e97b 0%, #6df6a1 100%)' : 'transparent'};
  color: ${props => props.active ? '#232931' : '#e6f7ef'};
  border: 1px solid ${props => props.active ? '#43e97b' : 'rgba(255,255,255,0.06)'};
  padding: 8px 14px;
  border-radius: 12px;
  font-weight: 800;
  cursor: pointer;
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  width: 420px;
  min-width: 320px;
  gap: 12px;
`;

const RightColumn = styled.div`
  flex: 1;
  min-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StyledInput = styled(Input)`
  border-radius: 12px;
  border: 1.5px solid rgba(67,233,123,0.25);
  padding: 0.75rem 1rem;
  font-size: 1.02rem;
  background: #232931;
  color: #e6f7ef;
  box-shadow: 0 2px 8px rgba(67,233,123,0.04);
  &::placeholder { color: #9fb0ba; }
`;

const ChatCreateBox = styled.div`
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  padding: 12px;
`;

const UsersList = styled.div`
  max-height: 420px;
  overflow-y: auto;
  border-radius: 12px;
  background: rgba(255,255,255,0.02);
  box-shadow: 0 2px 16px #2193b022, 0 0 0 1px #2193b011 inset;
  margin-bottom: 0.5rem;
  padding: 6px;
`;

const UserItem = styled.div`
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 10px;
  gap: 12px;
  transition: background 0.12s, box-shadow 0.12s;
  &:hover { background: rgba(255,255,255,0.03); box-shadow: 0 2px 8px rgba(67,233,123,0.06); }
`;

const UserInfo = styled.div`
  display:flex;
  gap:12px;
  align-items:center;
  flex:1;
`;

const UserDetails = styled.div`
  flex:1;
`;

const Username = styled.div`
  font-weight:700;
  color:#e6f7ef;
`;

const UserStatus = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'online'
})`
  font-size:0.82rem;
  color: ${p => p.online ? '#a3ffb0' : '#9fb0ba'};
  display:flex;
  gap:8px;
  align-items:center;
`;

/* ============================
   Компонент
   ============================ */

export default function ChatManagerModal() {
  const { state, dispatch } = useApp();

  // видимость модалки — если открыт один из старых модалов
  const isOpen = Boolean(state.modals?.createChat || state.modals?.userSelection);
  // выбранная вкладка: 'create' | 'users'
  const initialTab = state.modals?.createChat ? 'create' : 'users';
  const [activeTab, setActiveTab] = useState(initialTab);

  // --- Create Chat states (из первого компонента) ---
  const [chatName, setChatName] = useState('');
  const [chatType, setChatType] = useState('group');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // --- Users / Selection states (из второго компонента) ---
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
  const ONLY_ONLINE_STORAGE_KEY = 'userSelection.onlyOnline';
  const ONLY_AUTH_STORAGE_KEY = 'userSelection.onlyAuthorized';
  const ONLY_IN_CHAT_STORAGE_KEY = 'userSelection.onlyInChat';
  const [addingLoading, setAddingLoading] = useState(false);

  // helper: онлайн статус (как в исходнике)
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

  // Сброс состояний при закрытии
  const handleClose = () => {
    dispatch({
      type: 'TOGGLE_MODAL',
      payload: { modal: 'createChat', show: false }
    });
    dispatch({
      type: 'TOGGLE_MODAL',
      payload: { modal: 'userSelection', show: false }
    });
    // очистки
    setChatName('');
    setChatType('group');
    setCreateError('');
    setCreateSuccess('');
    setUsers([]);
    setFilteredUsers([]);
    setSearchQuery('');
    setSelectedUserIds([]);
    setUsersError('');
    setUsersLoading(false);
    setSelectedChatId(state.currentChat?.id || '');
    setAddingLoading(false);
  };

  // При открытии — выставляем таб и загружаем данные, восстанавливаем фильтры из localStorage
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    // восстановление фильтров
    try { const v = localStorage.getItem(ONLY_ONLINE_STORAGE_KEY); if (v !== null) setOnlyOnline(v === 'true'); } catch {}
    try { const v = localStorage.getItem(ONLY_AUTH_STORAGE_KEY); if (v !== null) setOnlyAuthorized(v === 'true'); } catch {}
    try { const v = localStorage.getItem(ONLY_IN_CHAT_STORAGE_KEY); if (v !== null) setOnlyInChat(v === 'true'); } catch {}
    // если открыт таб users — загрузим пользователей
    if (state.modals?.userSelection || initialTab === 'users') {
      fetchUsers();
      if (state.currentChat?.id && window.socket && window.isSocketAuthenticated) {
        window.socket.emit('get_chat_participants', state.currentChat.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // сохраняем фильтры
  useEffect(() => { try { localStorage.setItem(ONLY_ONLINE_STORAGE_KEY, String(onlyOnline)); } catch {} }, [onlyOnline]);
  useEffect(() => { try { localStorage.setItem(ONLY_AUTH_STORAGE_KEY, String(onlyAuthorized)); } catch {} }, [onlyAuthorized]);
  useEffect(() => { try { localStorage.setItem(ONLY_IN_CHAT_STORAGE_KEY, String(onlyInChat)); } catch {} }, [onlyInChat]);

  // Загрузка пользователей через REST (как в исходнике)
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

  // Обновление локального списка при приходе сокет-ивентов (all_users / authenticated / users_removed_from_chat / users_added_to_chat)
  useEffect(() => {
    if (!window.socket) return;
    const handleAllUsers = (allUsers) => {
      if (!Array.isArray(allUsers)) return;
      const other = allUsers.filter(u => u.id !== state.user?.id).map(u => ({ ...u, online: isUserOnline(u) }));
      const sorted = other.sort((a,b) => (a.online === b.online) ? (a.username||'').localeCompare(b.username||'') : (a.online ? -1 : 1));
      setUsers(sorted);
      setFilteredUsers(sorted);
    };
    const handleAuthenticated = () => {
      // когда аутентифицировались, запрашиваем заново
      if (isOpen) {
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
        // обновляем участников
        if (window.isSocketAuthenticated) window.socket.emit('get_chat_participants', selectedChatId);
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
  }, [isOpen, selectedChatId, state.currentChat, state.user, dispatch]);

  // обновляем online-статус пользователей, когда глобальный список меняется
  useEffect(() => {
    if (!users.length) return;
    setUsers(prev => prev.map(u => ({ ...u, online: isUserOnline(u) })));
  }, [state.onlineUsers]);

  // фильтрация пользователей на основе чекбоксов и поиска
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

  // ---- Create Chat handlers (из первого компонента) ----
  const handleCreateChat = async (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!chatName.trim()) { setCreateError('Введите название чата'); return; }
    if (!window.socket) { setCreateError('Нет соединения с сервером'); return; }
    if (!window.socket.connected) { setCreateError('Соединение с сервером потеряно'); return; }
    setCreating(true); setCreateError(''); setCreateSuccess('');

    const chatData = { name: chatName.trim(), type: chatType };
    const handleChatCreated = (data) => {
      setCreateSuccess(`Чат "${data.name}" успешно создан!`);
      setCreating(false);
      // handleClose() не вызываем — окно остаётся открытым
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

    // таймаут
    setTimeout(() => {
      if (creating) {
        setCreateError('Превышено время ожидания ответа от сервера');
        setCreating(false);
        window.socket.off('chat_created', handleChatCreated);
        window.socket.off('error', handleChatError);
      }
    }, 10000);
  };

  // ---- Users handlers ----
  const handleRemoveUser = (userId) => {
    if (!window.socket || !state.currentChat?.id) return;
    if (!window.isSocketAuthenticated) { console.warn('Попытка remove_users_from_chat до аутентификации'); return; }
    setRemovingUserId(userId);
    window.socket.emit('remove_users_from_chat', { chatId: state.currentChat.id, userIds: [userId] });
  };

  const handleCreatePrivateChat = (userId) => {
    if (!window.socket) { setUsersError('Нет соединения с сервером'); return; }
    if (!window.socket.connected) { setUsersError('Соединение с сервером потеряно'); return; }
    if (!window.isSocketAuthenticated) { console.warn('Попытка create_private_chat до аутентификации'); return; }
    window.socket.emit('create_private_chat', { targetUserId: userId });
  };

  const handleUserCheckbox = (userId) => {
    setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleSelectAllFiltered = () => {
    setSelectedUserIds(filteredUsers.map(u => u.id));
  };

  const handleConfirmAddUsers = () => {
    if (!selectedChatId) { setUsersError('Сначала выберите чат'); return; }
    if (selectedUserIds.length === 0) { setUsersError('Выберите хотя бы одного пользователя'); return; }
    if (!window.socket) { setUsersError('Нет соединения с сервером'); return; }
    if (!window.socket.connected) { setUsersError('Соединение с сервером потеряно'); return; }
    if (!window.isSocketAuthenticated) { console.warn('Попытка add_users_to_chat до аутентификации'); return; }

    const chatIdNum = Number(selectedChatId);
    const userIdsNum = selectedUserIds.map(id => Number(id)).filter(n => !Number.isNaN(n));
    setAddingLoading(true);
    window.socket.emit('add_users_to_chat', { chatId: chatIdNum, userIds: userIdsNum });
  };

  // сбрасываем selectedChatId при открытии
  useEffect(() => {
    setSelectedChatId(state.currentChat?.id || '');
  }, [state.modals?.userSelection, state.currentChat]);

  // UI
  if (!isOpen) return null;

  const participants = state.chatParticipants || [];
  const currentUser = state.user;
  const isSuperAdmin = currentUser?.username === 'albertronin5@gmail.com';
  const isCreator = state.currentChat?.created_by === currentUser?.id;

  return (
    <Modal
      onClick={handleClose}
      style={{
        display: 'block',
        background: 'transparent',
        justifyContent: 'flex-start',
        alignItems: 'center',
        left: '350px',
        right: 0,
        width: 'auto'
      }}
    >
      <StyledModalContent onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ModalTitle>Управление чатами и пользователями</ModalTitle>
            <Tabs>
              <TabButton active={activeTab === 'create'} onClick={() => setActiveTab('create')}>Создать чат</TabButton>
              <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>Пользователи / Участники</TabButton>
            </Tabs>
          </div>
          <DarkCloseButton onClick={handleClose} aria-label="Close modal"><FiX /></DarkCloseButton>
        </div>

        <div style={{ display: 'flex', gap: 20, width: '100%' }}>
          <LeftColumn>
            {activeTab === 'create' ? (
              <ChatCreateBox>
                {createError && <div style={{ background: 'rgba(255,99,71,0.08)', color: '#ffb8b8', padding: 8, borderRadius: 8 }}>{createError}</div>}
                {createSuccess && <div style={{ background: 'rgba(163,255,176,0.08)', color: '#a3ffb0', padding: 8, borderRadius: 8 }}>{createSuccess}</div>}

                <div style={{ marginBottom: 10 }}>
                  <label style={{ display:'block', marginBottom:6, color:'#9fb0ba', fontWeight:700 }}>Тип чата</label>
                  <div style={{ display:'flex', gap:8 }}>
                    <button type="button" onClick={() => setChatType('group')} style={{ flex:1, padding:10, borderRadius:10, border: chatType==='group' ? '2px solid #43e97b' : '1px solid rgba(255,255,255,0.06)', background: chatType==='group' ? 'rgba(67,233,123,0.08)' : 'transparent', color:'#e6f7ef', cursor:'pointer' }}>Группа</button>
                    <button type="button" onClick={() => setChatType('channel')} style={{ flex:1, padding:10, borderRadius:10, border: chatType==='channel' ? '2px solid #43e97b' : '1px solid rgba(255,255,255,0.06)', background: chatType==='channel' ? 'rgba(67,233,123,0.08)' : 'transparent', color:'#e6f7ef', cursor:'pointer' }}>Канал</button>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display:'block', marginBottom:6, color:'#9fb0ba', fontWeight:700 }}>Название чата</label>
                  <StyledInput placeholder="Введите название чата..." value={chatName} onChange={e => setChatName(e.target.value)} disabled={creating} autoFocus />
                </div>

                <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                  <Button type="button" onClick={handleClose} $variant="secondary" disabled={creating} style={{ background: 'rgba(255,255,255,0.04)', color:'#fff' }}>Отмена</Button>
                  <Button type="button" onClick={handleCreateChat} disabled={creating || !chatName.trim()} style={{ background: 'linear-gradient(90deg,#43e97b 0%,#ffe082 100%)', color:'#232931', fontWeight:800 }}>
                    {creating ? 'Создание...' : 'Создать чат'}
                  </Button>
                </div>
              </ChatCreateBox>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'flex', gap:8 }}>
                  <select value={selectedChatId} onChange={e => setSelectedChatId(e.target.value)} style={{ padding:'10px', borderRadius:10, border:'1px solid rgba(255,255,255,0.06)', background:'transparent', color:'#e6f7ef' }}>
                    <option value="">Выберите чат</option>
                    {state.chats.map(c => <option key={c.id} value={c.id}>{c.name || c.username || `Чат ${c.id}`}</option>)}
                  </select>
                  <Button onClick={() => { if (selectedChatId) { setActiveTab('users'); } }} disabled={!selectedChatId} $variant="secondary">Выбрать</Button>
                </div>

                <div style={{ display:'flex', gap:8 }}>
                  <input type="text" placeholder="Поиск пользователей..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid rgba(255,255,255,0.06)', background:'#192022', color:'#e6f7ef' }} />
                  <Button onClick={fetchUsers} disabled={usersLoading} $variant="secondary">Обновить</Button>
                </div>

                <div style={{ display:'flex', gap:12, alignItems:'center', justifyContent:'space-between', color:'#9fb0ba' }}>
                  <div style={{ display:'flex', gap:12 }}>
                    <label style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <input type="checkbox" checked={onlyOnline} onChange={e => setOnlyOnline(e.target.checked)} /> Только онлайн
                    </label>
                    <label style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <input type="checkbox" checked={onlyAuthorized} onChange={e => setOnlyAuthorized(e.target.checked)} /> Только авторизованные
                    </label>
                    <label style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <input type="checkbox" checked={onlyInChat} onChange={e => setOnlyInChat(e.target.checked)} /> Уже в чате
                    </label>
                  </div>
                  <div>Доступно: <b style={{ color:'#a3ffb0' }}>{filteredUsers.length}</b></div>
                </div>

                <UsersList>
                  {usersLoading ? (
                    <div style={{ padding:20, textAlign:'center', color:'#9fb0ba' }}>Загрузка пользователей...</div>
                  ) : usersError && !users.length ? (
                    <div style={{ padding:20, textAlign:'center', color:'#ffb8b8' }}>{usersError}</div>
                  ) : filteredUsers.length === 0 ? (
                    <div style={{ padding:20, textAlign:'center', color:'#9fb0ba' }}>
                      {searchQuery ? 'Пользователи не найдены' : 'Нет доступных пользователей'}
                    </div>
                  ) : filteredUsers.map(user => (
                    <UserItem key={user.id} onClick={() => handleUserCheckbox(user.id)} title={selectedUserIds.includes(user.id) ? 'Убрать' : 'Выбрать'}>
                      <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => handleUserCheckbox(user.id)} onClick={e => e.stopPropagation()} />
                      <UserInfo>
                        <Avatar size="40px" online={user.online} style={{ overflow:'hidden', background:'#1f2630' }}>
                          <img src={user.avatar || '/default-avatar.png'} alt={user.username || 'User'} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
                        </Avatar>
                        <UserDetails>
                          <Username>{user.username}</Username>
                          <UserStatus online={user.online}>{formatLastSeen(user.last_seen, user.online)}</UserStatus>
                        </UserDetails>
                      </UserInfo>
                      <div style={{ display:'flex', gap:8 }}>
                        <Button size="small" onClick={e => { e.stopPropagation(); handleCreatePrivateChat(user.id); }} disabled={usersLoading} $variant="primary" style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <FiMessageCircle /> Написать
                        </Button>
                      </div>
                    </UserItem>
                  ))}
                </UsersList>

                <div style={{ display:'flex', gap:12, justifyContent:'center', alignItems:'center' }}>
                  <div>Выбрано: <b style={{ color:'#a3ffb0' }}>{selectedUserIds.length}</b></div>
                  <Button onClick={handleSelectAllFiltered} disabled={usersLoading || filteredUsers.length === 0} $variant="secondary">Выбрать всех</Button>
                  <Button onClick={handleConfirmAddUsers} disabled={addingLoading || !selectedChatId || selectedUserIds.length === 0} style={{ background: 'linear-gradient(90deg,#43e97b 0%,#ffe082 100%)', color:'#232931', fontWeight:800 }}>
                    {addingLoading ? 'Добавление...' : (<><FiUserPlus /> Добавить выбранных</>)}
                  </Button>
                </div>
              </div>
            )}
          </LeftColumn>

          <RightColumn>
            <div style={{ color:'#ffe082', fontWeight:800, marginBottom:6 }}>Участники группы:</div>
            <UsersList>
              {participants.length === 0 ? (
                <div style={{ padding:20, textAlign:'center', color:'#9fb0ba' }}>Нет участников</div>
              ) : participants.map(user => (
                <UserItem key={user.id}>
                  <UserInfo>
                    <Avatar size="40px" online={user.online} style={{ overflow:'hidden', background:'#1f2630' }}>
                      <img src={user.avatar || '/default-avatar.png'} alt={user.username || 'User'} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
                    </Avatar>
                    <UserDetails>
                      <Username>{user.username}</Username>
                      <UserStatus online={user.online}>{formatLastSeen(user.last_seen, user.online)}</UserStatus>
                    </UserDetails>
                  </UserInfo>
                  {(isSuperAdmin || isCreator) && user.id !== currentUser?.id && (
                    <div>
                      <Button $variant="danger" onClick={() => handleRemoveUser(user.id)} disabled={removingUserId === user.id} style={{ background: 'rgba(231,76,60,0.12)', color:'#ffb8b8' }}>
                        {removingUserId === user.id ? 'Удаление...' : 'Удалить'}
                      </Button>
                    </div>
                  )}
                </UserItem>
              ))}
            </UsersList>

            <div style={{ marginTop: 'auto', display:'flex', justifyContent:'flex-end', gap:8 }}>
              <Button onClick={handleClose} $variant="secondary">Закрыть</Button>
            </div>
          </RightColumn>
        </div>
      </StyledModalContent>
    </Modal>
  );
}