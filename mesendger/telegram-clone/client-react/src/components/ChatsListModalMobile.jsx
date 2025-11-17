import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiPlus, FiTrash2, FiRefreshCw, FiCalendar, FiList, FiUsers, FiUserCheck, FiUserX, FiMessageSquare, FiUser } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import { playDeleteSound } from '../utils/notificationSound';
import { formatLastSeen } from '../utils/timeUtils';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function ChatsListModalMobile({ open, onClose, onOpenMobileSidebar, onOpenChat, onOpenCreateChat }) {
  const { state, dispatch } = useApp();
  const chats = state.chats || [];
  const currentChatId = state.currentChat?.id;
  const [deletingChats, setDeletingChats] = useState(new Set());
  const [deletedChatBackup, setDeletedChatBackup] = useState(null);
  
  // Состояния для сотрудников
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState('all'); // 'all', 'online', 'offline'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [view, setView] = useState('list'); // 'list' или 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pendingPrivateTargets, setPendingPrivateTargets] = useState(new Set());
  
  const modalRef = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // Функция для определения онлайн статуса пользователя
  const isUserOnline = (userId) => {
    if (!state.onlineUsers || !Array.isArray(state.onlineUsers)) return false;
    return state.onlineUsers.some(user => {
      const entryId = typeof user === 'object' ? (user.id || user.userId) : user;
      return String(entryId) === String(userId);
    });
  };

  // Хелпер: определяем, что чат — приватный 1:1
  const isOneToOnePrivate = (chat) => {
    if (!chat) return false;
    if (chat.isPrivate) return true;
    if (chat.type === 'private') return true;
    const twoParticipants = Array.isArray(chat.participants) && chat.participants.length === 2;
    if (twoParticipants && !chat.isGroup) return true;
    if (typeof chat.name === 'string' && chat.name.trim().toLowerCase() === 'приватный чат') return true;
    return false;
  };

  // Скрываем из секции "Ваши чаты" все приватные 1:1 чаты
  const visibleChats = (chats || []).filter(chat => !isOneToOnePrivate(chat));

  // Загрузка сотрудников
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

  // Обновление списка пользователей при изменении onlineUsers
  useEffect(() => {
    if (!open) return;
    if (!window.socket || !window.socket.connected) return;
    window.socket.emit('get_all_users');
  }, [state.onlineUsers, open]);

  // Слушаем создание/приход чатов от сервера
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

    const onPrivateChatCreated = (data) => {
      if (!data || !data.chat) return;
      console.log('✅ Private chat created in mobile modal:', data);
      
      // Убираем pending метку
      if (data.chat.isPrivate && Array.isArray(data.chat.participants)) {
        const other = data.chat.participants.find(p => p.id !== state.user?.id);
        if (other) {
          setPendingPrivateTargets(prev => {
            const next = new Set(prev);
            next.delete(other.id);
            return next;
          });
        }
      }
      
      // Устанавливаем текущий чат
      dispatch({ type: 'SET_CURRENT_CHAT', payload: data.chat });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      dispatch({ type: 'MARK_CHAT_AS_READ', payload: { chatId: data.chat.id, participants: data.chat.participants } });
      
      // Присоединяемся к чату и загружаем сообщения
      if (window.socket && window.socket.connected) {
        window.socket.emit('join_chat', data.chat.id);
        window.socket.emit('get_chat_messages', data.chat.id);
        window.socket.emit('get_pinned_messages', data.chat.id);
        window.socket.emit('mark_chat_read', data.chat.id);
      }
      
      // Открываем модалку чата в мобильной версии
      if (onOpenChat) {
        onOpenChat();
      }
      
      // Закрываем модалку списка чатов
      onClose();
    };

    window.socket.on('chat_created', onNewChat);
    window.socket.on('private_chat_created', onPrivateChatCreated);

    return () => {
      window.socket.off('chat_created', onNewChat);
      window.socket.off('private_chat_created', onPrivateChatCreated);
    };
  }, [state.user?.id, dispatch, onOpenChat, onClose]);

  // Обработчики событий удаления чата
  useEffect(() => {
    if (!window.socket) return;

    const handleDeleteError = (error) => {
      console.error('Ошибка удаления чата:', error);
      alert('Не удалось удалить чат. Попробуйте еще раз.');
      setDeletingChats(prev => new Set());
      
      // Восстанавливаем чат в списке при ошибке
      setDeletedChatBackup(prevBackup => {
        if (prevBackup) {
          // Обновляем список чатов с сервера для восстановления
          if (window.socket) {
            window.socket.emit('get_chats');
          }
        }
        return null;
      });
    };

    const handleChatDeleted = (data) => {
      console.log('✅ Чат успешно удален:', data);
      setDeletingChats(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.chatId);
        return newSet;
      });
      
      // Очищаем backup после успешного удаления
      setDeletedChatBackup(null);
      
      // Удаление уже было выполнено в handleDeleteChat, но обновляем список с сервера для синхронизации
      if (window.socket) {
        window.socket.emit('get_chats');
      }
    };

    window.socket.on('chat_delete_error', handleDeleteError);
    window.socket.on('chat_deleted', handleChatDeleted);
    
    return () => {
      window.socket.off('chat_delete_error', handleDeleteError);
      window.socket.off('chat_deleted', handleChatDeleted);
    };
  }, [dispatch]);

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
    
    // Свайп влево (возврат в меню)
    if (distance > minSwipeDistance) {
      if (onOpenMobileSidebar) {
        onOpenMobileSidebar();
      }
      onClose();
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleClose = () => {
    if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
    onClose();
  };

  const handleSelect = (chat) => {
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    dispatch({ type: 'SET_MESSAGES', payload: [] });
    dispatch({ type: 'MARK_CHAT_AS_READ', payload: { chatId: chat.id, participants: chat.participants } });
    if (window.socket && window.socket.connected) {
      window.socket.emit('join_chat', chat.id);
      window.socket.emit('get_chat_messages', chat.id);
      window.socket.emit('get_pinned_messages', chat.id);
      window.socket.emit('mark_chat_read', chat.id);
    }
    if (onOpenChat) {
      onOpenChat();
    }
    onClose();
  };

  const handleSelectChat = (chat) => {
    handleSelect(chat);
  };

  const handleCreateChat = () => {
    if (onOpenCreateChat) {
      onOpenCreateChat();
    } else {
      dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'createChat', show: true } });
    }
  };

  const handleDeleteChat = (chatId, chatName, event) => {
    event.stopPropagation();
    
    if (window.confirm(`Вы уверены, что хотите удалить чат "${chatName}"?`)) {
      playDeleteSound(0.3);
      
      // Сохраняем удаляемый чат для возможного восстановления при ошибке
      const chatToDelete = chats.find(chat => chat.id === chatId);
      if (chatToDelete) {
        setDeletedChatBackup(chatToDelete);
      }
      
      setDeletingChats(prev => new Set([...prev, chatId]));
      
      // Сразу удаляем чат из списка для мгновенного обновления UI
      dispatch({ type: 'DELETE_CHAT', payload: { chatId } });
      
      // Если удаленный чат был активным, сбрасываем текущий чат
      if (state.currentChat?.id === chatId) {
        dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
        dispatch({ type: 'SET_MESSAGES', payload: [] });
      }
      
      if (window.socket && window.socket.connected) {
        window.socket.emit('delete_chat', { chatId });
      } else {
        alert('Нет соединения с сервером');
        setDeletingChats(prev => {
          const newSet = new Set(prev);
          newSet.delete(chatId);
          return newSet;
        });
        // Восстанавливаем чат в списке при ошибке
        if (chatToDelete) {
          dispatch({ type: 'SET_CHATS', payload: [...state.chats, chatToDelete] });
        }
        setDeletedChatBackup(null);
      }
      
      setTimeout(() => {
        setDeletingChats(prev => {
          const newSet = new Set(prev);
          newSet.delete(chatId);
          return newSet;
        });
        // Очищаем backup после успешного удаления
        setDeletedChatBackup(null);
      }, 5000);
    }
  };

  // Обработчик клика по сотруднику
  const handleSelectEmployee = (userId) => {
    const me = state.user;
    const otherUser = employees.find(e => e.id === userId);
    dispatch({ type: 'SET_LAST_PRIVATE_TARGET', payload: otherUser });

    const privateChat = (chats || []).find(
      chat => chat.isPrivate && chat.participants?.some(p => p.id === userId)
    );

    if (privateChat) {
      handleSelect(privateChat);
    } else {
      setPendingPrivateTargets(prev => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });

      if (window.socket) {
        window.socket.emit('create_private_chat', { targetUserId: userId });
      }
    }
  };

  // Функция обновления статусов пользователей
  const handleRefreshStatuses = async () => {
    if (!window.socket || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      window.socket.emit('get_all_users');
      window.socket.emit('get_online_users');
      
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Ошибка при обновлении статусов:', error);
      setIsRefreshing(false);
    }
  };

  // Фильтрация сотрудников
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

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 100000,
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '20px',
              padding: 0,
              marginRight: '12px',
              flexShrink: 0
            }}
            title="Вернуться в меню"
          >
            <FaArrowLeft />
          </button>
          <h2 style={{
            margin: 0,
            color: '#fff',
            fontWeight: 700,
            fontSize: '1.4em',
            flex: 1,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <FiUsers size={24} />
            Сотрудники
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
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


        {/* Контент */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '16px',
          background: 'linear-gradient(135deg, #232931 0%, #232b3a 100%)'
        }}>
          {false && view === 'calendar' ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ 
                margin: '0 0 20px 0', 
                color: '#43e97b', 
                fontSize: '1.3em', 
                fontWeight: 700,
                textAlign: 'center',
                width: '100%'
              }}>
                Календарь дней рождения
              </h2>
              <div style={{ width: '100%', maxWidth: '100%', margin: '0', padding: '0' }}>
                <Calendar
                  onChange={setSelectedDate}
                  value={selectedDate}
                  calendarType="iso8601"
                  locale="ru-RU"
                  className="employees-birthday-calendar-mobile"
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
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.7em', marginTop: '2px' }}>
                            <span role="img" aria-label="birthday" style={{ fontSize: '0.9em' }}>🎂</span>
                            {birthdayEmployees.slice(0, 1).map(e => (
                              <span key={e.id} style={{ fontSize: '0.6em', color: '#43e97b', fontWeight: 600, marginTop: '1px', lineHeight: '1.1' }}>
                                {e.last_name || e.username || ''}
                              </span>
                            ))}
                            {birthdayEmployees.length > 1 && (
                              <span style={{ fontSize: '0.55em', color: '#43e97b', fontWeight: 600 }}>+{birthdayEmployees.length - 1}</span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }
                  }}
                  style={{ width: '100%', maxWidth: '100%', fontSize: '0.85em', margin: '0 auto' }}
                />
                <style>{`
                  .employees-birthday-calendar-mobile {
                    width: 100% !important;
                    max-width: 100% !important;
                    font-size: 0.85em !important;
                    background: #181c22;
                    border-radius: 12px;
                    box-shadow: 0 2px 18px #2193b055;
                    padding: 8px;
                    border: 1px solid rgba(255,255,255,0.1);
                    box-sizing: border-box;
                  }
                  .employees-birthday-calendar-mobile .react-calendar__tile {
                    min-width: 0 !important;
                    width: calc(14.28% - 2px) !important;
                    aspect-ratio: 1;
                    max-width: none !important;
                    min-height: 40px !important;
                    max-height: 50px !important;
                    font-size: 0.75em !important;
                    border-radius: 8px !important;
                    padding: 2px !important;
                    margin: 1px !important;
                  }
                  .employees-birthday-calendar-mobile .react-calendar__navigation button {
                    font-size: 0.85em !important;
                    padding: 4px 8px !important;
                    min-width: 32px !important;
                  }
                `}</style>
              </div>
            </div>
          ) : (
            <>
              {/* Фильтры */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginBottom: '16px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setFilter('all')}
                  style={{
                    background: filter === 'all' ? 'rgba(67,233,123,0.25)' : 'rgba(255,255,255,0.1)',
                    border: `1px solid ${filter === 'all' ? 'rgba(67,233,123,0.5)' : 'rgba(255,255,255,0.2)'}`,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: filter === 'all' ? '#43e97b' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.85em',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    flex: 1,
                    minWidth: '80px',
                    justifyContent: 'center'
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
                    padding: '8px 12px',
                    color: filter === 'online' ? '#43e97b' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.85em',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    flex: 1,
                    minWidth: '80px',
                    justifyContent: 'center'
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
                    padding: '8px 12px',
                    color: filter === 'offline' ? '#e74c3c' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.85em',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    flex: 1,
                    minWidth: '80px',
                    justifyContent: 'center'
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
                    padding: '8px 12px',
                    color: '#43e97b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.85em',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    flex: 1,
                    minWidth: '80px',
                    justifyContent: 'center'
                  }}
                  title="Создать чат"
                >
                  <FiPlus size={14} />
                  Чат
                </button>
              </div>

              {/* Секция "Ваши чаты" */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  color: '#ffe082',
                  fontSize: '1.2em',
                  fontWeight: 700,
                  textAlign: 'center'
                }}>
                  Ваши чаты
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {visibleChats.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: '#888',
                      padding: '20px 0',
                      fontSize: '14px'
                    }}>
                      Нет чатов
                    </div>
                  ) : (
                    visibleChats.map(chat => {
                      const active = chat.id === currentChatId;
                      return (
                        <div
                          key={chat.id}
                          onClick={() => handleSelectChat(chat)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: active ? 'rgba(67,233,123,0.1)' : 'rgba(255,255,255,0.03)',
                            color: '#ffe082',
                            cursor: 'pointer',
                            transition: 'background 0.3s ease',
                            position: 'relative'
                          }}
                        >
                          <FiMessageSquare style={{ color: active ? '#43e97b' : '#fff', fontSize: '1.2em', marginRight: '12px' }} />
                          <span style={{
                            flexGrow: 1,
                            fontWeight: 500,
                            color: '#ffe082',
                            fontSize: '1em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {chat.name}
                          </span>
                          {Number(chat.unread_count) > 0 && (
                            <span style={{
                              background: '#43e97b',
                              color: '#232931',
                              fontWeight: 800,
                              borderRadius: 10,
                              padding: '1px 6px',
                              fontSize: '0.8em',
                              marginRight: 8
                            }}>
                              {chat.unread_count}
                            </span>
                          )}
                          <button
                            title="Удалить чат"
                            onClick={e => handleDeleteChat(chat.id, chat.name, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#e74c3c',
                              cursor: 'pointer',
                              padding: '4px',
                              marginLeft: '8px',
                              transition: 'color 0.3s ease',
                              opacity: deletingChats.has(chat.id) ? 0.6 : 1
                            }}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Секция "Все сотрудники" */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <h3 style={{
                    margin: 0,
                    color: '#ffe082',
                    fontSize: '1.2em',
                    fontWeight: 700,
                    textAlign: 'center',
                    flex: 1
                  }}>
                    Все сотрудники
                  </h3>
                  <button
                    onClick={handleRefreshStatuses}
                    disabled={isRefreshing}
                    style={{
                      background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#232931',
                      cursor: isRefreshing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85em',
                      fontWeight: 600,
                      padding: '6px 12px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(67, 233, 123, 0.2)',
                      opacity: isRefreshing ? 0.6 : 1,
                      gap: '6px'
                    }}
                    title="Обновить статусы пользователей"
                  >
                    <FiRefreshCw size={14} style={{
                      animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
                    }} />
                    {isRefreshing ? '...' : 'Обновить'}
                  </button>
                </div>

                {/* Поиск */}
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="Поиск по имени или фамилии..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: '100%',
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
                </div>

                {/* Список сотрудников */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  {filteredEmployees.length === 0 ? (
                    <div style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      color: '#888',
                      padding: '20px 0',
                      fontSize: '14px'
                    }}>
                      Ничего не найдено
                    </div>
                  ) : (
                    filteredEmployees.map((emp, index) => {
                      const isOnline = isUserOnline(emp.id);
                      const privateChat = (chats || []).find(chat =>
                        isOneToOnePrivate(chat) && chat.participants?.some(p => p.id === emp.id)
                      );
                      const showChatIcon = Boolean(privateChat) || pendingPrivateTargets.has(emp.id) || (state.unreadByUser?.[emp.id] > 0);

                      return (
                        <div
                          key={emp.id}
                          onClick={() => handleSelectEmployee(emp.id)}
                          style={{
                            background: 'linear-gradient(135deg, rgba(44, 62, 80, 0.8) 0%, rgba(52, 73, 94, 0.8) 100%)',
                            borderRadius: '12px',
                            padding: '12px',
                            textAlign: 'center',
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 3px 12px rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            minHeight: '160px'
                          }}
                        >
                          {emp.avatar ? (
                            <img
                              src={emp.avatar}
                              alt="avatar"
                              style={{
                                width: '70px',
                                height: '70px',
                                borderRadius: '12px',
                                objectFit: 'cover',
                                border: '3px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '70px',
                              height: '70px',
                              borderRadius: '12px',
                              background: 'rgba(255,255,255,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              border: '2px solid rgba(255,255,255,0.1)'
                            }}>
                              <FiUser style={{ fontSize: '2em', color: '#ffe082' }} />
                            </div>
                          )}

                          <div style={{
                            fontWeight: 600,
                            color: '#ffe082',
                            fontSize: '0.95em',
                            textAlign: 'center',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            width: '100%'
                          }}>
                            {emp.username || (emp.first_name + ' ' + emp.last_name)}
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            background: isOnline
                              ? 'linear-gradient(135deg, rgba(67,233,123,0.15) 0%, rgba(67,233,123,0.05) 100%)'
                              : 'linear-gradient(135deg, rgba(231,76,60,0.15) 0%, rgba(231,76,60,0.05) 100%)',
                            border: `1px solid ${isOnline ? 'rgba(67,233,123,0.3)' : 'rgba(231,76,60,0.3)'}`,
                            fontSize: '0.7em',
                            fontWeight: 600,
                            color: isOnline ? '#43e97b' : '#e74c3c',
                            flexShrink: 0,
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            <span style={{
                              display: 'inline-block',
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isOnline ? '#43e97b' : '#e74c3c',
                              boxShadow: `0 0 6px ${isOnline ? '#43e97b88' : '#e74c3c88'}`,
                              marginRight: '4px'
                            }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {formatLastSeen(emp.last_seen, isOnline)}
                            </span>
                          </div>

                          {showChatIcon && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: '4px' }}>
                              <FiMessageSquare style={{ color: '#43e97b', fontSize: '1.2em' }} title="Есть переписка" />
                              {(privateChat?.unread_count > 0 || (state.unreadByUser?.[emp.id] > 0)) && (
                                <span style={{
                                  background: '#43e97b',
                                  color: '#232931',
                                  fontWeight: 800,
                                  borderRadius: 10,
                                  padding: '1px 6px',
                                  fontSize: '0.75em'
                                }}>
                                  {privateChat?.unread_count || state.unreadByUser?.[emp.id]}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Подсказка о свайпе */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(67,233,123,0.1)',
          background: 'rgba(34,40,49,0.6)',
          textAlign: 'center',
          fontSize: '0.85em',
          color: '#b2bec3'
        }}>
          ← Свайпните вправо, чтобы вернуться в меню
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  );
}
