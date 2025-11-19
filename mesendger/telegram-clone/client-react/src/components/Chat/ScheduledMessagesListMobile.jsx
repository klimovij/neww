import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiClock, FiX, FiEdit3, FiTrash2, FiCalendar, FiMessageSquare, FiFileText } from 'react-icons/fi';
import DOMPurify from 'dompurify';
import { useApp } from '../../context/AppContext';
import EditScheduledMessageModal from './EditScheduledMessageModal';

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
  
  // Сначала преобразуем HTML с data-token обратно в токены
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
  const scheduled = new Date(scheduledFor);
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

export default function ScheduledMessagesListMobile({ 
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
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' или 'templates'

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
      console.log('📋 Mobile: Received scheduled messages:', data);
      setScheduledMessages(data.messages || []);
      setLoading(false);
    };

    const handleScheduledMessageDeleted = (data) => {
      console.log('🗑️ Mobile: Scheduled message deleted:', data);
      setScheduledMessages(prev => prev.filter(msg => msg.id !== data.id));
    };

    const handleScheduledMessageUpdated = (data) => {
      console.log('📝 Mobile: Scheduled message updated:', data);
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

  // Предотвращение прокрутки body при открытой модалке
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

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
    const utcDate = new Date(scheduledFor);
    return utcDate.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Разделяем сообщения на обычные и шаблоны
  // Шаблоны определяем по наличию template_type, message_type === 'template' или другим признакам
  // Более широкая фильтрация для определения шаблонов - без ограничений по количеству
  const templateMessages = scheduledMessages.filter(msg => {
    // Проверяем наличие template_type (из базы данных) или templateType (из объекта)
    const hasTemplateType = !!(msg.template_type || msg.templateType);
    
    // Проверяем message_type
    const isTemplateMessageType = msg.message_type === 'template';
    
    // Логируем для отладки
    if (scheduledMessages.indexOf(msg) < 3) {
      console.log('🔍 Template filter check for message:', {
        id: msg.id,
        template_type: msg.template_type,
        templateType: msg.templateType,
        message_type: msg.message_type,
        hasTemplateType,
        isTemplateMessageType,
        contentPreview: (msg.content || '').substring(0, 50)
      });
    }
    
    // Если есть template_type или message_type === 'template' - это точно шаблон
    if (hasTemplateType || isTemplateMessageType) {
      return true;
    }
    
    // Проверяем признаки шаблона в контенте (для старых записей без template_type)
    const content = (msg.content || '').toLowerCase();
    const hasTemplateIndicators = 
      content.includes('custom:emoji') || // Кастомные эмодзи
      content.includes('🚨') || // SOS шаблоны
      content.includes('⚠️') || // Важные шаблоны
      content.includes('⏰') || // Часто используется в шаблонах
      content.includes('ежедневное') || // Типичное начало шаблонов
      content.includes('напоминание') || // Напоминания часто из шаблонов
      content.includes('авто-перезагрузка') || // Типичный контент шаблонов
      content.includes('автоперезагрузка') || // Вариант написания
      content.includes('сервера 1с') || // Конкретный контент из скриншота
      content.includes('сервера 1c') || // Вариант написания
      content.includes('всем выйти') || // Типичный контент шаблонов
      content.includes('перезагрузка') || // Типичный контент шаблонов
      content.includes('пока не напишу') || // Типичный контент шаблонов
      content.includes('начинаю перезагрузку'); // Типичный контент шаблонов
    
    return hasTemplateIndicators;
  });
  
  const regularMessages = scheduledMessages.filter(msg => {
    // Обычные сообщения - все, что не является шаблоном
    const hasTemplateType = !!(msg.template_type || msg.templateType);
    const isTemplateMessageType = msg.message_type === 'template';
    
    // Если есть template_type или message_type === 'template' - это не обычное сообщение
    if (hasTemplateType || isTemplateMessageType) {
      return false;
    }
    
    const content = (msg.content || '').toLowerCase();
    const hasTemplateIndicators = 
      content.includes('custom:emoji') ||
      content.includes('🚨') ||
      content.includes('⚠️') ||
      content.includes('⏰') ||
      content.includes('ежедневное') ||
      content.includes('напоминание') ||
      content.includes('авто-перезагрузка') ||
      content.includes('автоперезагрузка') ||
      content.includes('сервера 1с') ||
      content.includes('сервера 1c') ||
      content.includes('всем выйти') ||
      content.includes('перезагрузка') ||
      content.includes('пока не напишу') ||
      content.includes('начинаю перезагрузку');
    
    return !hasTemplateIndicators;
  });

  const displayMessages = activeTab === 'templates' ? templateMessages : regularMessages;

  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 200000
        }}
      />

      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 200001,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(55, 65, 81, 0.5)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FiClock style={{ color: '#6dd5ed', fontSize: '24px' }} />
            <h2 style={{ 
              margin: 0, 
              color: '#f3f4f6', 
              fontSize: '1.2rem',
              fontWeight: 700
            }}>
              Запланированные
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#b2bec3',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              transition: 'all 0.2s'
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.2)';
              e.currentTarget.style.color = '#e74c3c';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#b2bec3';
            }}
          >
            <FiX />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          flexShrink: 0,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <button
            onClick={() => setActiveTab('messages')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: activeTab === 'messages' ? '2px solid #6dd5ed' : '2px solid rgba(75, 85, 99, 0.3)',
              backgroundColor: activeTab === 'messages' ? 'rgba(109, 213, 237, 0.2)' : 'transparent',
              color: activeTab === 'messages' ? '#6dd5ed' : '#d1d5db',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'messages' ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              touchAction: 'manipulation',
              whiteSpace: 'nowrap'
            }}
          >
            <FiMessageSquare size={18} />
            Сообщения ({regularMessages.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: activeTab === 'templates' ? '2px solid #6dd5ed' : '2px solid rgba(75, 85, 99, 0.3)',
              backgroundColor: activeTab === 'templates' ? 'rgba(109, 213, 237, 0.2)' : 'transparent',
              color: activeTab === 'templates' ? '#6dd5ed' : '#d1d5db',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'templates' ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              touchAction: 'manipulation',
              whiteSpace: 'nowrap'
            }}
          >
            <FiFileText size={18} />
            Шаблоны ({templateMessages.length})
          </button>
        </div>

        {/* Messages List */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px',
          paddingBottom: `calc(100px + env(safe-area-inset-bottom, 0px))`, // Увеличен padding для кнопок
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          position: 'relative'
        }}>
          {loading ? (
            <div style={{ 
              padding: '40px 20px', 
              textAlign: 'center', 
              color: '#9ca3af',
              fontSize: '1rem'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>⏳</div>
              <div style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#e8e8e8' }}>Загрузка...</div>
            </div>
          ) : displayMessages.length === 0 ? (
            <div style={{ 
              padding: '40px 20px', 
              textAlign: 'center', 
              color: '#9ca3af',
              fontSize: '1rem'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>📅</div>
              <div style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#e8e8e8' }}>
                {activeTab === 'templates' 
                  ? 'Нет запланированных шаблонов' 
                  : 'Нет запланированных сообщений'
                }
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                {activeTab === 'templates'
                  ? 'Запланируйте шаблон, чтобы увидеть его здесь'
                  : 'Запланируйте сообщение, чтобы увидеть его здесь'
                }
              </div>
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              paddingBottom: '32px' // Дополнительный padding для последнего элемента
            }}>
              {displayMessages.map((message, index) => (
                <div
                  key={message.id}
                  style={{
                    background: 'rgba(44, 62, 80, 0.3)',
                    border: '2px solid rgba(44, 62, 80, 0.5)',
                    borderRadius: '16px',
                    padding: '16px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: '#b2bec3',
                      fontSize: '0.85rem'
                    }}>
                      <FiMessageSquare />
                      <span style={{ color: '#6dd5ed', fontWeight: 600 }}>
                        {message.chat_name || `Чат #${message.chat_id}`}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#43e97b',
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}>
                      <FiCalendar />
                      {formatScheduledTime(message.scheduled_for)}
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(52, 73, 94, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '12px',
                    fontSize: '0.95rem',
                    lineHeight: '1.4',
                    color: '#e8e8e8',
                    wordWrap: 'break-word',
                    maxHeight: '150px',
                    overflowY: 'auto'
                  }}
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
                      padding: '6px 10px',
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

                  <div style={{
                    fontSize: '0.8rem',
                    color: '#f39c12',
                    marginBottom: '12px'
                  }}>
                    {getTimeRemaining(message.scheduled_for)}
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => handleEdit(message)}
                      style={{
                        background: 'rgba(109, 213, 237, 0.1)',
                        border: '2px solid rgba(109, 213, 237, 0.3)',
                        borderRadius: '8px',
                        color: '#6dd5ed',
                        padding: '10px 16px',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                        touchAction: 'manipulation',
                        flex: 1,
                        minWidth: '120px',
                        justifyContent: 'center'
                      }}
                      onTouchStart={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(109, 213, 237, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(109, 213, 237, 0.5)';
                      }}
                      onTouchEnd={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(109, 213, 237, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(109, 213, 237, 0.3)';
                      }}
                    >
                      <FiEdit3 size={16} />
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(message.id)}
                      style={{
                        background: 'rgba(231, 76, 60, 0.1)',
                        border: '2px solid rgba(231, 76, 60, 0.3)',
                        borderRadius: '8px',
                        color: '#e74c3c',
                        padding: '10px 16px',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                        touchAction: 'manipulation',
                        flex: 1,
                        minWidth: '120px',
                        justifyContent: 'center'
                      }}
                      onTouchStart={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(231, 76, 60, 0.5)';
                      }}
                      onTouchEnd={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(231, 76, 60, 0.3)';
                      }}
                    >
                      <FiTrash2 size={16} />
                      Отменить
                    </button>
                  </div>
                </div>
              ))}
              {/* Дополнительное пустое пространство внизу для удобной прокрутки */}
              <div style={{ 
                height: '100px', 
                minHeight: '100px',
                width: '100%',
                flexShrink: 0
              }} />
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal - рендерится через отдельный портал с более высоким z-index */}
      {showEditModal && editingMessage && ReactDOM.createPortal(
        <EditScheduledMessageModal
          isOpen={showEditModal}
          onClose={handleCloseEdit}
          message={editingMessage}
          onSave={handleSaveEdit}
        />,
        document.body
      )}
    </>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

