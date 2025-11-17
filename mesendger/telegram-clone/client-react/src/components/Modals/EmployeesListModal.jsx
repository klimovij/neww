import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Modal, ModalContent, CloseButton, Input } from '../../styles/GlobalStyles';
import { FiX, FiUser, FiUsers, FiUserCheck, FiUserX, FiMessageSquare, FiPlus, FiTrash2, FiRefreshCw, FiCalendar, FiList } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { formatLastSeen } from '../../utils/timeUtils';
import { playDeleteSound } from '../../utils/notificationSound';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const StyledModalContent = styled(ModalContent)`
  background: linear-gradient(135deg, #232931 0%, #181c22 100%);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  padding: 0;
  width: 90%;
  max-width: 1170px;
  height: 95vh;
  max-height: 910px;
  position: fixed;
  top: 50%;
  left: calc(50% + 170px);
  transform: translate(-50%, -50%);
  border: none;
  z-index: 100001;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalFadeIn 0.35s cubic-bezier(.4,0,.2,1);
  @keyframes modalFadeIn {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
`;
const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: 1.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CloseBtn = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
`;

const ModalBody = styled.div`
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  background: linear-gradient(135deg, #232931 0%, #181c22 100%);
`;

const EmployeeList = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-top: 20px;
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
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px ${props => props.$online ? 'rgba(67,233,123,0.3)' : 'rgba(231,76,60,0.3)'};
  }
`;

const EmployeeItem = styled.div`
  background: linear-gradient(135deg, rgba(44, 62, 80, 0.8) 0%, rgba(52, 73, 94, 0.8) 100%);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  min-height: 220px;
  position: relative;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
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
  width: 90px;
  height: 90px;
  border-radius: 12px;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
`;

const EmployeeName = styled.div`
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 8px;
  text-align: center;
`;

const EmployeeDepartment = styled.div`
  color: #94a3b8;
  font-size: 0.85rem;
  text-align: center;
  margin-bottom: 12px;
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

const TitleWithRefresh = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 24px 0 8px 0;
`;

const RefreshButton = styled.button`
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  border: none;
  border-radius: 8px;
  color: #232931;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 6px 12px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(67, 233, 123, 0.2);
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(67, 233, 123, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  svg {
    margin-right: 6px;
    animation: ${props => props.$isRefreshing ? 'spin 1s linear infinite' : 'none'};
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

export default function EmployeesListModal({ open, onClose }) {
  const { state, dispatch } = useApp();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState('all'); // 'all', 'online', 'offline'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [view, setView] = useState('list'); // 'list' или 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Departments permissions (all mapped to role 'user')

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

  // Функция обновления статусов пользователей
  const handleRefreshStatuses = async () => {
    if (!window.socket || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Запрашиваем обновленные данные пользователей и онлайн статусы
      window.socket.emit('get_all_users');
      window.socket.emit('get_online_users');
      
      // Имитируем небольшую задержку для показа анимации
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Ошибка при обновлении статусов:', error);
      setIsRefreshing(false);
    }
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
      playDeleteSound(0.3);
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
        <ModalHeader>
          <ModalTitle>
            <FiUsers />
            Сотрудники
          </ModalTitle>
          <CloseBtn onClick={handleClose}>
            <FiX />
          </CloseBtn>
        </ModalHeader>
        <ModalBody>
          {false && view === 'calendar' ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden', paddingLeft: '60px' }}>
              <h2 style={{ 
                margin: '0 0 20px 0', 
                color: '#43e97b', 
                fontSize: '1.5em', 
                fontWeight: 700,
                textAlign: 'left',
                width: '100%'
              }}>
                Календарь дней рождения
              </h2>
              <SearchWrapper style={{ width: '100%', maxWidth: '600px' }}>
                <Input
                  type="text"
                  placeholder="Быстрый поиск..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </SearchWrapper>
              <div style={{ width: '100%', maxWidth: '100%', margin: '0', padding: '0 10px', overflow: 'hidden' }}>
                <Calendar
                  onChange={setSelectedDate}
                  value={selectedDate}
                  calendarType="iso8601"
                  locale="ru-RU"
                  className="employees-birthday-calendar"
                  tileContent={({ date, view }) => {
                    if (view === 'month') {
                      const day = date.getDate();
                      const month = date.getMonth() + 1;
                      const birthdayEmployees = Array.isArray(employees)
                        ? employees.filter(e => {
                            if (!e.birth_day || !e.birth_month) return false;
                            return e.birth_day === day && e.birth_month === month;
                          })
                        : [];
                      if (birthdayEmployees.length > 0) {
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.75em', marginTop: '2px' }}>
                            <span role="img" aria-label="birthday" style={{ fontSize: '1em' }}>🎂</span>
                            {birthdayEmployees.slice(0, 1).map(e => (
                              <span key={e.id} style={{ fontSize: '0.65em', color: '#43e97b', fontWeight: 600, marginTop: '1px', lineHeight: '1.1' }}>
                                {e.last_name || e.username || ''}
                              </span>
                            ))}
                            {birthdayEmployees.length > 1 && (
                              <span style={{ fontSize: '0.6em', color: '#43e97b', fontWeight: 600 }}>+{birthdayEmployees.length - 1}</span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }
                  }}
                  style={{ width: '100%', maxWidth: '100%', fontSize: '0.95em', margin: '0 auto' }}
                />
                <style>{`
                  .employees-birthday-calendar {
                    width: 100% !important;
                    max-width: 100% !important;
                    font-size: 0.95em !important;
                    background: #181c22;
                    border-radius: 18px;
                    box-shadow: 0 2px 18px #2193b055;
                    padding: 8px;
                    border: 1px solid rgba(255,255,255,0.1);
                    box-sizing: border-box;
                  }
                  .react-calendar__month-view {
                    border-radius: 18px;
                    overflow: hidden;
                    width: 100% !important;
                  }
                  .react-calendar__month-view__days {
                    width: 100% !important;
                  }
                  .react-calendar__tile {
                    min-width: 0 !important;
                    width: calc(14.28% - 4px) !important;
                    aspect-ratio: 1;
                    max-width: none !important;
                    min-height: 50px !important;
                    max-height: 60px !important;
                    font-size: 0.85em !important;
                    border-radius: 10px !important;
                    position: relative;
                    transition: background .18s, box-shadow .18s;
                    cursor: pointer;
                    background: #232931;
                    color: #fff;
                    box-shadow: 0 1px 6px #2193b022;
                    border: 2px solid transparent;
                    padding: 4px 2px !important;
                    margin: 2px !important;
                    box-sizing: border-box;
                    overflow: hidden;
                  }
                  .react-calendar__tile--active,
                  .react-calendar__tile:active {
                    box-shadow: 0 0 0 3px #43e97b;
                    background: #2193b0;
                    color: #fff;
                    border: 2px solid #43e97b;
                  }
                  .react-calendar__tile:hover {
                    background: #43e97b22;
                    box-shadow: 0 0 0 2px #43e97b;
                    color: #43e97b;
                    border: 2px solid #43e97b;
                  }
                  .react-calendar__tile--now {
                    background: #43e97b33;
                    color: #43e97b;
                    border: 2px solid #2193b0;
                  }
                  .react-calendar__navigation {
                    margin-bottom: 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  }
                  .react-calendar__navigation button {
                    color: #43e97b;
                    font-weight: 700;
                    font-size: 0.95em;
                    background: rgba(67,233,123,0.1);
                    border: 1px solid rgba(67,233,123,0.3);
                    border-radius: 8px;
                    padding: 6px 10px;
                    transition: all 0.2s ease;
                    min-width: 40px;
                  }
                  .react-calendar__navigation button:hover {
                    background: rgba(67,233,123,0.2);
                    border-color: rgba(67,233,123,0.5);
                  }
                  .react-calendar__navigation__label {
                    font-size: 1em !important;
                    font-weight: 700;
                    color: #43e97b;
                  }
                  .react-calendar__month-view__weekdays {
                    color: #43e97b;
                    font-weight: 700;
                    font-size: 0.8em;
                    margin-bottom: 6px;
                  }
                  .react-calendar__month-view__weekdays__weekday {
                    padding: 6px 2px;
                    font-size: 0.85em;
                  }
                  .react-calendar__month-view__days__day {
                    font-size: 0.9em;
                  }
                `}</style>
              </div>
            </div>
          ) : (
            <>

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

        <TitleWithRefresh>
          <ModalTitle style={{ margin: 0, textAlign: 'center' }}>Все сотрудники</ModalTitle>
          <RefreshButton 
            onClick={handleRefreshStatuses}
            disabled={isRefreshing}
            $isRefreshing={isRefreshing}
            title="Обновить статусы пользователей"
          >
            <FiRefreshCw size={14} />
            {isRefreshing ? 'Обновление...' : 'Обновить'}
          </RefreshButton>
        </TitleWithRefresh>
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
                    <span>{formatLastSeen(emp.last_seen, isOnline)}</span>
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
            </>
          )}
        </ModalBody>
      </StyledModalContent>
    </Modal>
  );
}
