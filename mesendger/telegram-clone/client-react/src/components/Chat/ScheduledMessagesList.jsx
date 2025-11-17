import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiClock, FiX, FiEdit3, FiTrash2, FiCalendar, FiMessageSquare } from 'react-icons/fi';
import DOMPurify from 'dompurify';
import { useApp } from '../../context/AppContext';
import EditScheduledMessageModal from './EditScheduledMessageModal';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #232931 0%, #181c22 100%);
  border-radius: 20px;
  padding: 24px;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  color: #fff;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-shrink: 0;
`;

const ModalTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 1.4rem;
  color: #6dd5ed;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #b2bec3;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(231, 76, 60, 0.2);
    color: #e74c3c;
  }
`;

const MessagesList = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #b2bec3;
  
  .icon {
    font-size: 3rem;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  .title {
    font-size: 1.2rem;
    margin-bottom: 8px;
    color: #e8e8e8;
  }
  
  .subtitle {
    font-size: 0.9rem;
    opacity: 0.7;
  }
`;

const MessageCard = styled.div`
  background: rgba(44, 62, 80, 0.3);
  border: 2px solid rgba(44, 62, 80, 0.5);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  transition: all 0.2s;
  
  &:hover {
    border-color: rgba(109, 213, 237, 0.3);
    background: rgba(44, 62, 80, 0.4);
  }
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const MessageInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: #b2bec3;
  font-size: 0.85rem;
`;

const ChatName = styled.span`
  color: #6dd5ed;
  font-weight: 600;
`;

const ScheduledTime = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #43e97b;
  font-weight: 600;
  font-size: 0.9rem;
`;

const MessageContent = styled.div`
  background: rgba(52, 73, 94, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 0.95rem;
  line-height: 1.4;
  color: #e8e8e8;
  word-wrap: break-word;
  max-height: 100px;
  overflow-y: auto;
  
  /* Стили для эмодзи */
  img {
    width: 18px;
    height: 18px;
    vertical-align: middle;
    margin: 0 2px;
    display: inline-block;
  }
  
  /* Стили для кастомных эмодзи */
  img[src*="/uploads/emojis/"] {
    width: 18px;
    height: 18px;
    object-fit: contain;
  }
`;

const MessageActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  background: ${props => props.danger ? 'rgba(231, 76, 60, 0.1)' : 'rgba(109, 213, 237, 0.1)'};
  border: 2px solid ${props => props.danger ? 'rgba(231, 76, 60, 0.3)' : 'rgba(109, 213, 237, 0.3)'};
  border-radius: 8px;
  color: ${props => props.danger ? '#e74c3c' : '#6dd5ed'};
  padding: 8px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.danger ? 'rgba(231, 76, 60, 0.2)' : 'rgba(109, 213, 237, 0.2)'};
    border-color: ${props => props.danger ? 'rgba(231, 76, 60, 0.5)' : 'rgba(109, 213, 237, 0.5)'};
  }
`;

const TimeRemaining = styled.div`
  font-size: 0.8rem;
  color: #f39c12;
  margin-top: 4px;
`;

// Функция для декодирования HTML entities
const decodeHtmlEntities = (text) => {
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

// Функция для безопасной обработки HTML с эмодзи
const safeHtml = (html) => {
  if (!html) return '';
  
  let processed = decodeHtmlEntities(html);
  
  // Сначала преобразуем HTML с data-token обратно в токены (как в NewsFeed.jsx)
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = processed;
  
  // Заменяем img с data-token на токены
  tempDiv.querySelectorAll('img[data-custom-emoji]')?.forEach(img => {
    const token = img.getAttribute('data-token');
    if (token) {
      const textNode = document.createTextNode(token);
      img.replaceWith(textNode);
    }
  });
  
  // Получаем текст с токенами
  let textWithTokens = tempDiv.textContent || tempDiv.innerText || '';
  
  // Теперь преобразуем токены обратно в правильные img элементы
  textWithTokens = textWithTokens.replace(
    /custom:emoji-([^-\s]+)-([^-\s]+)/g,
    '<img src="/uploads/emojis/emoji-$1-$2.jpg" alt="custom-emoji-$1-$2" data-custom-emoji="true" style="width: 18px; height: 18px; object-fit: cover; vertical-align: middle; margin: 0 2px; border-radius: 6px; display: inline-block;" onerror="this.style.display=\'none\'">'
  );
  
  let sanitized = DOMPurify.sanitize(textWithTokens);
  
  // Исправляем URL эмодзи
  sanitized = sanitized.replace(
    /src="\/uploads\/emojis\//g, 
    'src="/uploads/emojis/'
  );
  
  return sanitized;
};

// Функция для вычисления времени до отправки
const getTimeRemaining = (scheduledFor) => {
  const now = new Date();
  const scheduled = new Date(scheduledFor); // UTC время из базы
  const diff = scheduled - now;
  
  if (diff <= 0) return 'Готово к отправке';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `Через ${days} дн. ${hours} ч.`;
  } else if (hours > 0) {
    return `Через ${hours} ч. ${minutes} мин.`;
  } else {
    return `Через ${minutes} мин.`;
  }
};

// Функция для описания типа повторения
const getRepeatDescription = (repeatType) => {
  switch (repeatType) {
    case 'daily': return 'каждый день';
    case 'weekdays': return 'по будням (Пн-Пт)';
    case 'weekly': return 'каждую неделю';
    default: return '';
  }
};

export default function ScheduledMessagesList({ 
  isOpen, 
  onClose, 
  onEdit,
  onDelete 
}) {
  const { state } = useApp();
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Загружаем запланированные сообщения при открытии
  useEffect(() => {
    if (isOpen && window.socket && window.socket.connected) {
      setLoading(true);
      window.socket.emit('get_scheduled_messages');
    }
  }, [isOpen]);

  // Слушаем ответ с запланированными сообщениями
  useEffect(() => {
    if (!window.socket) return;

    const handleScheduledMessages = (data) => {
      console.log('📋 Received scheduled messages:', data);
      setScheduledMessages(data.messages || []);
      setLoading(false);
    };

    const handleScheduledMessageDeleted = (data) => {
      console.log('🗑️ Scheduled message deleted:', data);
      setScheduledMessages(prev => prev.filter(msg => msg.id !== data.id));
    };

    const handleScheduledMessageUpdated = (data) => {
      console.log('📝 Scheduled message updated:', data);
      setScheduledMessages(prev => prev.map(msg => 
        msg.id === data.id 
          ? { ...msg, content: data.content, scheduled_for: data.scheduledFor }
          : msg
      ));
    };

    window.socket.on('scheduled_messages', handleScheduledMessages);
    window.socket.on('scheduled_message_deleted', handleScheduledMessageDeleted);
    window.socket.on('scheduled_message_updated', handleScheduledMessageUpdated);

    return () => {
      window.socket.off('scheduled_messages', handleScheduledMessages);
      window.socket.off('scheduled_message_deleted', handleScheduledMessageDeleted);
      window.socket.off('scheduled_message_updated', handleScheduledMessageUpdated);
    };
  }, []);

  const handleDelete = (messageId) => {
    if (window.confirm('Вы уверены, что хотите отменить это запланированное сообщение?')) {
      window.socket.emit('delete_scheduled_message', messageId);
    }
  };

  const handleEdit = (message) => {
    setEditingMessage(message);
    setShowEditModal(true);
  };

  const handleSaveEdit = (editData) => {
    if (window.socket && window.socket.connected) {
      window.socket.emit('update_scheduled_message', editData);
    }
    setShowEditModal(false);
    setEditingMessage(null);
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    setEditingMessage(null);
  };

  const formatScheduledTime = (scheduledFor) => {
    // Время в базе хранится в UTC, конвертируем в локальное время пользователя для отображения
    const utcDate = new Date(scheduledFor);
    return utcDate.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
      // Убираем timeZone - будет использоваться локальная временная зона пользователя
    });
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <FiClock />
            Запланированные сообщения
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </ModalHeader>

        <MessagesList>
          {loading ? (
            <EmptyState>
              <div className="icon">⏳</div>
              <div className="title">Загрузка...</div>
            </EmptyState>
          ) : scheduledMessages.length === 0 ? (
            <EmptyState>
              <div className="icon">📅</div>
              <div className="title">Нет запланированных сообщений</div>
              <div className="subtitle">Запланируйте сообщение, чтобы увидеть его здесь</div>
            </EmptyState>
          ) : (
            scheduledMessages.map((message) => (
              <MessageCard key={message.id}>
                <MessageHeader>
                  <MessageInfo>
                    <FiMessageSquare />
                    <ChatName>
                      {message.chat_name || `Чат #${message.chat_id}`}
                    </ChatName>
                  </MessageInfo>
                  <ScheduledTime>
                    <FiCalendar />
                    {formatScheduledTime(message.scheduled_for)}
                  </ScheduledTime>
                </MessageHeader>

                <MessageContent 
                  dangerouslySetInnerHTML={{ 
                    __html: safeHtml(message.content) 
                  }}
                />

                {message.is_recurring && message.repeat_type !== 'none' && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '0.8rem', 
                    color: '#6dd5ed', 
                    marginBottom: '8px',
                    padding: '4px 8px',
                    backgroundColor: '#43e97b11',
                    borderRadius: '6px',
                    border: '1px solid #43e97b22'
                  }}>
                    🔄 {getRepeatDescription(message.repeat_type)}
                    {message.repeat_until && (
                      <span style={{ color: '#888' }}>
                        до {new Date(message.repeat_until).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                  </div>
                )}

                <TimeRemaining>
                  {getTimeRemaining(message.scheduled_for)}
                </TimeRemaining>

                <MessageActions>
                  <ActionButton onClick={() => handleEdit(message)}>
                    <FiEdit3 />
                    Редактировать
                  </ActionButton>
                  <ActionButton onClick={() => handleDelete(message.id)} danger>
                    <FiTrash2 />
                    Отменить
                  </ActionButton>
                </MessageActions>
              </MessageCard>
            ))
          )}
        </MessagesList>
      </ModalContainer>
      
      <EditScheduledMessageModal
        isOpen={showEditModal}
        onClose={handleCloseEdit}
        message={editingMessage}
        onSave={handleSaveEdit}
      />
    </ModalOverlay>
  );
}
