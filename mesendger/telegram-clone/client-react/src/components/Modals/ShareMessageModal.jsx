import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FiX, FiSearch, FiUsers, FiUser, FiSend } from 'react-icons/fi';

const ShareMessageModal = ({ isOpen, onClose, messageToShare }) => {
  const { state, dispatch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [chats, setChats] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Загрузка списка чатов и пользователей
  useEffect(() => {
    if (isOpen) {
      loadChatsAndUsers();
    }
  }, [isOpen]);

  const loadChatsAndUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Загружаем чаты
      const chatsResponse = await fetch('/api/chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const chatsData = await chatsResponse.json();
      
      // Загружаем пользователей
      const usersResponse = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersResponse.json();
      
      setChats(chatsData.chats || []);
      setUsers(usersData.users || []);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  // Фильтрация по поисковому запросу
  const filteredChats = chats.filter(chat => 
    chat.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    user.id !== state.user?.id // Исключаем себя
  );

  // Добавление/удаление цели для пересылки
  const toggleTarget = (target) => {
    setSelectedTargets(prev => {
      const exists = prev.find(t => t.id === target.id && t.type === target.type);
      if (exists) {
        return prev.filter(t => !(t.id === target.id && t.type === target.type));
      } else {
        return [...prev, target];
      }
    });
  };

  // Отправка сообщения
  const handleShare = async () => {
    if (selectedTargets.length === 0) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      for (const target of selectedTargets) {
        await fetch('/api/messages/share', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            messageId: messageToShare.id,
            targetType: target.type, // 'chat' или 'user'
            targetId: target.id,
            originalMessage: {
              content: messageToShare.content,
              username: messageToShare.username,
              timestamp: messageToShare.timestamp,
              chatId: messageToShare.chatId
            }
          })
        });
      }
      
      // Показываем уведомление об успехе
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: `Сообщение отправлено в ${selectedTargets.length} ${selectedTargets.length === 1 ? 'чат' : 'чатов'}`
        }
      });
      
      onClose();
      setSelectedTargets([]);
      setSearchTerm('');
    } catch (error) {
      console.error('Ошибка пересылки:', error);
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          message: 'Ошибка при пересылке сообщения'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !messageToShare) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200003,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
        border: '1px solid rgba(75, 85, 99, 0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Заголовок */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            margin: 0,
            color: '#f3f4f6',
            fontSize: '1.5rem',
            fontWeight: '600'
          }}>
            Поделиться сообщением
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '1.5rem',
              padding: '4px'
            }}
          >
            <FiX />
          </button>
        </div>

        {/* Превью сообщения */}
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          color: '#93c5fd'
        }}>
          <div style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
            <strong>{messageToShare.username}</strong>
          </div>
          <div style={{ color: '#f3f4f6' }}>
            {messageToShare.content}
          </div>
        </div>

        {/* Поиск */}
        <div style={{
          position: 'relative',
          marginBottom: '16px'
        }}>
          <FiSearch style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af'
          }} />
          <input
            type="text"
            placeholder="Поиск чатов и пользователей..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              backgroundColor: '#374151',
              border: '1px solid rgba(75, 85, 99, 0.5)',
              borderRadius: '8px',
              color: '#f3f4f6',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        {/* Список выбранных целей */}
        {selectedTargets.length > 0 && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px'
          }}>
            <div style={{ color: '#22c55e', fontSize: '0.875rem', marginBottom: '8px' }}>
              Выбрано: {selectedTargets.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedTargets.map(target => (
                <span
                  key={`${target.type}-${target.id}`}
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {target.type === 'chat' ? <FiUsers size={12} /> : <FiUser size={12} />}
                  {target.name || target.username}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Список чатов и пользователей */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          marginBottom: '20px'
        }}>
          {/* Чаты */}
          {filteredChats.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{
                color: '#9ca3af',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Чаты
              </h3>
              {filteredChats.map(chat => {
                const isSelected = selectedTargets.some(t => t.id === chat.id && t.type === 'chat');
                return (
                  <div
                    key={chat.id}
                    onClick={() => toggleTarget({ ...chat, type: 'chat' })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                      border: isSelected ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                      marginBottom: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#4f46e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <FiUsers size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#f3f4f6', fontWeight: '500' }}>
                        {chat.name}
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                        Участников: {chat.memberCount || 0}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Пользователи - временно отключено */}
          {false && filteredUsers.length > 0 && (
            <div>
              <h3 style={{
                color: '#9ca3af',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Пользователи (скоро будет доступно)
              </h3>
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#6b7280',
                fontStyle: 'italic'
              }}>
                Пересылка в личные сообщения будет добавлена в следующем обновлении
              </div>
            </div>
          )}

          {filteredChats.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: '#9ca3af',
              padding: '40px 20px'
            }}>
              {searchTerm ? 'Ничего не найдено' : 'Загрузка...'}
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(75, 85, 99, 0.5)',
              borderRadius: '8px',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Отмена
          </button>
          <button
            onClick={handleShare}
            disabled={selectedTargets.length === 0 || loading}
            style={{
              padding: '12px 24px',
              backgroundColor: selectedTargets.length > 0 ? '#3b82f6' : '#374151',
              border: 'none',
              borderRadius: '8px',
              color: selectedTargets.length > 0 ? 'white' : '#6b7280',
              cursor: selectedTargets.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FiSend size={16} />
            {loading ? 'Отправка...' : `Отправить${selectedTargets.length > 0 ? ` (${selectedTargets.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareMessageModal;
