import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiClock, FiX, FiCalendar, FiSend } from 'react-icons/fi';
import DOMPurify from 'dompurify';
import { useSystemTime } from '../../context/SystemTimeContext';

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
  max-width: 500px;
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

const MessagePreview = styled.div`
  background: rgba(44, 62, 80, 0.3);
  border: 2px solid rgba(44, 62, 80, 0.5);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
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

const Label = styled.label`
  font-size: 0.9rem;
  color: #b2bec3;
  font-weight: 600;
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

const ScheduleButton = styled.button`
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

export default function ScheduledMessageModal({ 
  isOpen, 
  onClose, 
  messageContent, 
  onSchedule 
}) {
  const { currentTime, getTimeAfterMinutes, getDateString, getTimeString } = useSystemTime();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customDateTime, setCustomDateTime] = useState('');
  const [repeatType, setRepeatType] = useState('none');
  const [repeatUntil, setRepeatUntil] = useState('');
  const [showRepeatOptions, setShowRepeatOptions] = useState(false);
  const [isValidDateTime, setIsValidDateTime] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isOpen && !isInitialized) {
      // Используем актуальное время на момент открытия модального окна
      const now = new Date();
      const todayStr = getDateString(now);
      setSelectedDate(todayStr);
      
      // Устанавливаем время через 5 минут от текущего времени
      const futureTime = new Date(now.getTime() + 5 * 60 * 1000);
      const timeStr = getTimeString(futureTime);
      setSelectedTime(timeStr);
      setIsInitialized(true);
      
      console.log('🕐 Modal initialized with time:', timeStr);
    }
    
    // Сбрасываем флаг при закрытии модального окна
    if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen, getDateString, getTimeString, isInitialized]);

  useEffect(() => {
    if (selectedDate && selectedTime) {
      const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}`);
      // Используем системное время для сравнения, но с буфером в 1 минуту
      const timeBuffer = 60 * 1000; // 1 минута в миллисекундах
      setIsValidDateTime(scheduledDateTime.getTime() > (currentTime.getTime() + timeBuffer));
    } else {
      setIsValidDateTime(false);
    }
  }, [selectedDate, selectedTime]);

  const handleQuickSelect = (minutes) => {
    // Используем актуальное время на момент нажатия кнопки
    const now = new Date();
    const futureTime = new Date(now.getTime() + minutes * 60 * 1000);
    const dateStr = getDateString(futureTime);
    const timeStr = getTimeString(futureTime);
    
    console.log('⚡ Quick select:', minutes, 'minutes ->', timeStr);
    setSelectedDate(dateStr);
    setSelectedTime(timeStr);
  };

  const handleSchedule = () => {
    const dateTime = getScheduledDateTime();
    // Используем актуальное время на момент нажатия кнопки
    const now = new Date();
    if (!dateTime || dateTime <= now) {
      return;
    }
    
    // Получаем смещение временной зоны клиента
    const timezoneOffset = dateTime.getTimezoneOffset(); // в минутах
    const timezoneOffsetHours = -timezoneOffset / 60; // конвертируем в часы (инвертируем знак)
    
    const localDateTime = `${selectedDate}T${selectedTime}:00`;
    console.log('📅 Client scheduling details (using system time):');
    console.log('   Selected date/time:', selectedDate, selectedTime);
    console.log('   Local datetime string:', localDateTime);
    console.log('   Browser timezone offset (minutes):', timezoneOffset);
    console.log('   Timezone offset (hours):', timezoneOffsetHours);
    console.log('   System current time:', currentTime.toISOString());
    console.log('   Scheduled time object:', dateTime.toISOString());
    
    const scheduleData = {
      scheduledFor: localDateTime,
      content: messageContent,
      repeatType: showRepeatOptions ? repeatType : 'none',
      repeatUntil: repeatUntil || null,
      timezoneOffset: timezoneOffsetHours // Передаем смещение временной зоны
    };

    // Для будних дней добавляем дни недели
    if (repeatType === 'weekdays') {
      scheduleData.repeatDays = JSON.stringify([1, 2, 3, 4, 5]); // Пн-Пт
    }
    
    onSchedule(scheduleData);
    onClose();
  };

  const getScheduledDateTime = () => {
    if (!selectedDate || !selectedTime) return null;
    return new Date(`${selectedDate}T${selectedTime}`);
  };

  const formatScheduledTime = () => {
    if (!selectedDate || !selectedTime) return '';
    
    const dateTime = new Date(`${selectedDate}T${selectedTime}`);
    return dateTime.toLocaleString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRepeatDescription = () => {
    switch (repeatType) {
      case 'daily': return 'каждый день';
      case 'weekdays': return 'по будням (Пн-Пт)';
      case 'weekly': return 'каждую неделю';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <FiClock />
            Запланировать сообщение
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </ModalHeader>

        <MessagePreview 
          dangerouslySetInnerHTML={{ 
            __html: messageContent ? safeHtml(messageContent) : 'Пустое сообщение' 
          }}
        />

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
              min={getDateString(currentTime)}
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
              onChange={(e) => {
                console.log('⏰ Time input changed:', e.target.value);
                setSelectedTime(e.target.value);
              }}
              onBlur={(e) => {
                console.log('⏰ Time input blur:', e.target.value);
              }}
            />
          </InputGroup>
        </DateTimeSection>

        {/* Секция повторения */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <input
              type="checkbox"
              id="repeatCheckbox"
              checked={showRepeatOptions}
              onChange={(e) => {
                setShowRepeatOptions(e.target.checked);
                if (!e.target.checked) {
                  setRepeatType('none');
                  setRepeatUntil('');
                }
              }}
              style={{ marginRight: 8 }}
            />
            <label htmlFor="repeatCheckbox" style={{ color: '#6dd5ed', fontSize: '0.9rem' }}>
              🔄 Повторять сообщение
            </label>
          </div>

          {showRepeatOptions && (
            <div style={{ marginLeft: 24, paddingLeft: 16, borderLeft: '2px solid #43e97b22' }}>
              <div style={{ marginBottom: 12 }}>
                <Label style={{ marginBottom: 8 }}>Частота повторения:</Label>
                <select
                  value={repeatType}
                  onChange={(e) => setRepeatType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e6eef7',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#fff'
                  }}
                >
                  <option value="none">Не повторять</option>
                  <option value="daily">Каждый день</option>
                  <option value="weekdays">По будням (Пн-Пт)</option>
                  <option value="weekly">Каждую неделю</option>
                </select>
              </div>

              {repeatType !== 'none' && (
                <div>
                  <Label style={{ marginBottom: 8 }}>Повторять до (необязательно):</Label>
                  <input
                    type="date"
                    value={repeatUntil}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                    min={selectedDate}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e6eef7',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 4 }}>
                    Оставьте пустым для бесконечного повторения
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedDate && selectedTime && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#6dd5ed', fontSize: '0.9rem', marginBottom: 4 }}>
              {repeatType !== 'none' ? 'Первая отправка:' : 'Сообщение будет отправлено:'}
            </div>
            <div style={{ color: '#43e97b', fontWeight: 600 }}>
              {formatScheduledTime()}
            </div>
            {repeatType !== 'none' && (
              <div style={{ color: '#6dd5ed', fontSize: '0.8rem', marginTop: 4 }}>
                📅 Повторение: {getRepeatDescription()}
                {repeatUntil && ` до ${new Date(repeatUntil).toLocaleDateString('ru-RU')}`}
              </div>
            )}
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
          <ScheduleButton 
            onClick={handleSchedule}
            disabled={!isValidDateTime}
          >
            <FiSend />
            Запланировать
          </ScheduleButton>
        </ActionButtons>
      </ModalContainer>
    </ModalOverlay>
  );
}
