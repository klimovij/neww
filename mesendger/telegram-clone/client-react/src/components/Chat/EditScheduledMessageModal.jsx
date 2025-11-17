import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiClock, FiX, FiCalendar, FiSave, FiEdit3 } from 'react-icons/fi';
import DOMPurify from 'dompurify';

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
  z-index: 10001;
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #232931 0%, #181c22 100%);
  border-radius: 20px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  color: #fff;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
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

const ContentSection = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-size: 0.9rem;
  color: #b2bec3;
  font-weight: 600;
  margin-bottom: 8px;
`;

const MessageTextarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 16px;
  border: 2px solid #2c3e50;
  border-radius: 12px;
  background: rgba(44, 62, 80, 0.3);
  color: #fff;
  font-size: 1rem;
  font-family: inherit;
  outline: none;
  resize: vertical;
  transition: all 0.2s;
  
  &:focus {
    border-color: #6dd5ed;
    background: rgba(44, 62, 80, 0.5);
  }
  
  &::placeholder {
    color: #7f8c8d;
  }
`;

const DateTimeSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DateInput = styled.input`
  padding: 12px 16px;
  border: 2px solid #2c3e50;
  border-radius: 12px;
  background: rgba(44, 62, 80, 0.3);
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
  
  &:focus {
    border-color: #6dd5ed;
    background: rgba(44, 62, 80, 0.5);
  }
  
  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
  }
`;

const TimeInput = styled.input`
  padding: 12px 16px;
  border: 2px solid #2c3e50;
  border-radius: 12px;
  background: rgba(44, 62, 80, 0.3);
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
  
  &:focus {
    border-color: #6dd5ed;
    background: rgba(44, 62, 80, 0.5);
  }
  
  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
  }
`;

const QuickButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const QuickButton = styled.button`
  padding: 8px 16px;
  background: rgba(109, 213, 237, 0.1);
  border: 2px solid rgba(109, 213, 237, 0.3);
  border-radius: 20px;
  color: #6dd5ed;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(109, 213, 237, 0.2);
    border-color: rgba(109, 213, 237, 0.5);
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  background: transparent;
  border: 2px solid #6c757d;
  border-radius: 12px;
  color: #6c757d;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #e74c3c;
    color: #e74c3c;
  }
`;

const SaveButton = styled.button`
  padding: 12px 24px;
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  
  &:hover {
    background: linear-gradient(135deg, #38f9d7 0%, #43e97b 100%);
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const WarningText = styled.div`
  color: #f39c12;
  font-size: 0.85rem;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MessagePreview = styled.div`
  background: rgba(44, 62, 80, 0.3);
  border: 2px solid rgba(44, 62, 80, 0.5);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  max-height: 120px;
  overflow-y: auto;
  font-size: 0.95rem;
  line-height: 1.4;
  color: #e8e8e8;
  word-wrap: break-word;
  
  /* Стили для эмодзи */
  img {
    width: 20px;
    height: 20px;
    vertical-align: middle;
    margin: 0 2px;
    display: inline-block;
  }
  
  /* Стили для кастомных эмодзи */
  img[src*="/uploads/emojis/"] {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
`;

const PreviewLabel = styled.div`
  font-size: 0.85rem;
  color: #b2bec3;
  margin-bottom: 8px;
  font-weight: 600;
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
    '<img src="http://localhost:5000/uploads/emojis/emoji-$1-$2.jpg" alt="custom-emoji-$1-$2" data-custom-emoji="true" style="width: 20px; height: 20px; object-fit: cover; vertical-align: middle; margin: 0 2px; border-radius: 6px; display: inline-block;" onerror="this.style.display=\'none\'">'
  );
  
  let sanitized = DOMPurify.sanitize(textWithTokens);
  
  // Исправляем URL эмодзи - заменяем относительные пути на абсолютные с правильным сервером
  sanitized = sanitized.replace(
    /src="\/uploads\/emojis\//g, 
    'src="http://localhost:5000/uploads/emojis/'
  );
  
  return sanitized;
};

// Функция для извлечения текста из HTML
const extractTextFromHtml = (html) => {
  if (!html) return '';
  
  let text = decodeHtmlEntities(html);
  
  // Сначала обрабатываем кастомные эмодзи - заменяем их на простой текст для редактирования
  text = text.replace(
    /custom:emoji-([^-\s]+)-([^-\s]+)/g,
    '😊' // Заменяем на простой эмодзи для удобства редактирования
  );
  
  // Создаем временный div для парсинга оставшегося HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  
  // Заменяем img теги на их alt текст или эмодзи
  const images = tempDiv.querySelectorAll('img');
  images.forEach(img => {
    const alt = img.getAttribute('alt') || img.getAttribute('data-emoji') || '🙂';
    img.replaceWith(document.createTextNode(alt));
  });
  
  return tempDiv.textContent || tempDiv.innerText || '';
};

export default function EditScheduledMessageModal({ 
  isOpen, 
  onClose, 
  message,
  onSave 
}) {
  const [content, setContent] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [isValidDateTime, setIsValidDateTime] = useState(false);

  useEffect(() => {
    if (isOpen && message) {
      // Извлекаем текст из HTML содержимого
      const textContent = extractTextFromHtml(message.content);
      setContent(textContent);
      
      // Парсим дату и время
      // message.scheduled_for содержит UTC время, нужно конвертировать в локальное
      const scheduledDate = new Date(message.scheduled_for);
      
      // Получаем локальное время для отображения в форме
      const year = scheduledDate.getFullYear();
      const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
      const day = String(scheduledDate.getDate()).padStart(2, '0');
      const hours = String(scheduledDate.getHours()).padStart(2, '0');
      const minutes = String(scheduledDate.getMinutes()).padStart(2, '0');
      
      const dateStr = `${year}-${month}-${day}`;
      const timeStr = `${hours}:${minutes}`;
      
      console.log('📝 Loading scheduled message for editing:');
      console.log('   UTC scheduled_for:', message.scheduled_for);
      console.log('   Parsed UTC date:', scheduledDate.toISOString());
      console.log('   Local date for form:', dateStr);
      console.log('   Local time for form:', timeStr);
      
      setSelectedDate(dateStr);
      setSelectedTime(timeStr);
    }
  }, [isOpen, message]);

  useEffect(() => {
    if (selectedDate && selectedTime) {
      const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const now = new Date();
      setIsValidDateTime(scheduledDateTime > now);
    } else {
      setIsValidDateTime(false);
    }
  }, [selectedDate, selectedTime]);

  const handleQuickSelect = (minutes) => {
    const futureTime = new Date(Date.now() + minutes * 60000);
    const dateStr = futureTime.toISOString().split('T')[0];
    const timeStr = futureTime.toTimeString().slice(0, 5);
    
    setSelectedDate(dateStr);
    setSelectedTime(timeStr);
  };

  const handleSave = () => {
    if (!isValidDateTime || !content.trim()) return;
    
    const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}`);
    
    // Получаем смещение временной зоны клиента (аналогично ScheduledMessageModal)
    const timezoneOffset = scheduledDateTime.getTimezoneOffset(); // в минутах
    const timezoneOffsetHours = -timezoneOffset / 60; // конвертируем в часы (инвертируем знак)
    
    const localDateTime = `${selectedDate}T${selectedTime}:00`;
    console.log('📝 Editing scheduled message:');
    console.log('   Selected date/time:', selectedDate, selectedTime);
    console.log('   Local datetime string:', localDateTime);
    console.log('   Browser timezone offset (minutes):', timezoneOffset);
    console.log('   Timezone offset (hours):', timezoneOffsetHours);
    console.log('   Current time:', new Date().toISOString());
    
    onSave({
      id: message.id,
      content: content.trim(),
      scheduledFor: localDateTime, // Отправляем локальное время как строку
      timezoneOffset: timezoneOffsetHours // Добавляем смещение временной зоны
    });
    onClose();
  };

  const getScheduledDateTime = () => {
    if (!selectedDate || !selectedTime) return null;
    return new Date(`${selectedDate}T${selectedTime}`);
  };

  const formatScheduledTime = () => {
    const dateTime = getScheduledDateTime();
    if (!dateTime) return '';
    
    return dateTime.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen || !message) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <FiEdit3 />
            Редактировать сообщение
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </ModalHeader>

        {message && (
          <div style={{ marginBottom: 24 }}>
            <PreviewLabel>Исходное сообщение:</PreviewLabel>
            <MessagePreview 
              dangerouslySetInnerHTML={{ 
                __html: safeHtml(message.content) 
              }}
            />
          </div>
        )}

        <ContentSection>
          <Label>Текст сообщения</Label>
          <MessageTextarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Введите текст сообщения..."
          />
          
          {content && content.trim() && (
            <div style={{ marginTop: 12 }}>
              <PreviewLabel>Предварительный просмотр:</PreviewLabel>
              <MessagePreview style={{ fontSize: '0.9rem', padding: '12px' }}>
                {content.trim()}
              </MessagePreview>
            </div>
          )}
        </ContentSection>

        <QuickButtons>
          <QuickButton onClick={() => handleQuickSelect(5)}>
            Через 5 мин
          </QuickButton>
          <QuickButton onClick={() => handleQuickSelect(30)}>
            Через 30 мин
          </QuickButton>
          <QuickButton onClick={() => handleQuickSelect(60)}>
            Через 1 час
          </QuickButton>
          <QuickButton onClick={() => handleQuickSelect(1440)}>
            Завтра
          </QuickButton>
        </QuickButtons>

        <DateTimeSection>
          <InputGroup>
            <Label>
              <FiCalendar style={{ marginRight: 6 }} />
              Дата
            </Label>
            <DateInput
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </InputGroup>
          
          <InputGroup>
            <Label>
              <FiClock style={{ marginRight: 6 }} />
              Время
            </Label>
            <TimeInput
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            />
          </InputGroup>
        </DateTimeSection>

        {selectedDate && selectedTime && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#6dd5ed', fontSize: '0.9rem', marginBottom: 4 }}>
              Сообщение будет отправлено:
            </div>
            <div style={{ color: '#43e97b', fontWeight: 600 }}>
              {formatScheduledTime()}
            </div>
            {!isValidDateTime && (
              <WarningText>
                ⚠️ Выберите время в будущем
              </WarningText>
            )}
          </div>
        )}

        <ActionButtons>
          <CancelButton onClick={onClose}>
            Отмена
          </CancelButton>
          <SaveButton 
            onClick={handleSave}
            disabled={!isValidDateTime || !content.trim()}
          >
            <FiSave />
            Сохранить
          </SaveButton>
        </ActionButtons>
      </ModalContainer>
    </ModalOverlay>
  );
}
