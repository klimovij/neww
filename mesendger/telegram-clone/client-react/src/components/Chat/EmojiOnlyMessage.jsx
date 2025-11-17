import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

// Контейнер для одиночных эмодзи без пузыря
const EmojiOnlyContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn'].includes(prop)
})`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
  margin-bottom: 0.5rem;
  animation: ${props => props.isOwn ? 'msgInRight 260ms cubic-bezier(.2,.7,.3,1) both' : 'msgInLeft 260ms cubic-bezier(.2,.7,.3,1) both'};
  
  @keyframes msgInLeft {
    from { opacity: 0; transform: translateY(8px) translateX(-6px) scale(0.98); filter: blur(2px); }
    to { opacity: 1; transform: none; filter: none; }
  }
  @keyframes msgInRight {
    from { opacity: 0; transform: translateY(8px) translateX(6px) scale(0.98); filter: blur(2px); }
    to { opacity: 1; transform: none; filter: none; }
  }
`;

const EmojiOnlyUsername = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn'].includes(prop)
})`
  font-size: 0.75rem;
  color: #b2bec3;
  margin-bottom: 4px;
  font-weight: 600;
  text-align: ${props => props.isOwn ? 'right' : 'left'};
`;

const EmojiOnlyContent = styled.div.withConfig({
  shouldForwardProp: (prop) => !['emojiSize'].includes(prop)
})`
  font-size: ${props => `${Math.max(props.emojiSize || 64, 64) / 16}rem`};
  line-height: 1;
  animation: emojiBounceIn 380ms cubic-bezier(.2,.7,.3,1) both;
  transform-origin: center bottom;
  
  img, img[src] {
    width: ${props => Math.max(props.emojiSize || 64, 64)}px !important;
    height: ${props => Math.max(props.emojiSize || 64, 64)}px !important;
    border-radius: 12px !important;
    margin: 0 !important;
    padding: 0 !important;
    object-fit: cover !important;
    image-rendering: crisp-edges !important;
  }
  
  @keyframes emojiBounceIn {
    0% { opacity: 0; transform: translateY(6px) scale(0.7); filter: blur(1px); }
    60% { opacity: 1; transform: translateY(-2px) scale(1.15); }
    80% { transform: translateY(0) scale(0.95); }
    100% { transform: translateY(0) scale(1); }
  }
`;

// Функция для определения одиночного эмодзи
export function isEmojiOnlyMessage(msgText) {
  if (typeof msgText !== 'string') return false;
  const trimmed = msgText.trim();
  
  console.log('🔍 Checking if emoji-only:', { msgText, trimmed });
  
  // Проверяем обычные эмодзи
  if (/^\s*(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*$/u.test(trimmed)) {
    console.log('✅ Detected as standard emoji-only');
    return true;
  }
  
  // Проверяем токены custom:emoji-...
  if (/^\s*(custom:emoji-[\d-]+)\s*$/.test(trimmed)) {
    console.log('✅ Detected as custom emoji token');
    return true;
  }
  
  // Проверяем HTML с одним img тегом (кастомный эмодзи)
  const imgMatches = trimmed.match(/<img[^>]*>/g);
  if (imgMatches && imgMatches.length === 1) {
    // Убираем img тег и проверяем, остался ли только пробельный текст
    const textWithoutImg = trimmed.replace(/<img[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    const isEmojiOnly = textWithoutImg === '';
    console.log('🔍 HTML img check:', { imgMatches, textWithoutImg, isEmojiOnly });
    return isEmojiOnly;
  }
  
  console.log('❌ Not emoji-only message');
  return false;
}

export default function EmojiOnlyMessage({ message, isOwn, state }) {
  // ИСПРАВЛЕНИЕ: Устанавливаем фиксированный размер эмодзи для всех пользователей
  // Это обеспечит одинаковое отображение эмодзи у всех сотрудников
  const [emojiSize, setEmojiSize] = useState(64); // Увеличен размер по умолчанию
  
  // Добавляем логирование для отладки
  console.log('🔍 EmojiOnlyMessage rendered:', {
    messageId: message.id,
    content: message.content,
    text: message.text,
    emojiSize,
    isOwn
  });
  
  useEffect(() => {
    // Загружаем размер из настроек, но с фиксированным минимумом
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('emojiSettings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          // Устанавливаем минимальный размер 64px для обеспечения видимости
          const size = Math.max(settings.emojiOnlySize || 64, 64);
          setEmojiSize(size);
        } else {
          // Если настроек нет, устанавливаем размер по умолчанию 64px
          setEmojiSize(64);
        }
      } catch (error) {
        console.error('Error loading emoji settings:', error);
        setEmojiSize(64); // Fallback размер
      }
    };

    loadSettings();

    // Слушаем изменения настроек
    const handleSettingsUpdate = (event) => {
      const settings = event.detail;
      if (settings && settings.emojiOnlySize) {
        // Применяем минимальный размер 64px
        const size = Math.max(settings.emojiOnlySize, 64);
        setEmojiSize(size);
      }
    };

    window.addEventListener('emojiSettingsUpdated', handleSettingsUpdate);
    
    // Добавляем функцию для принудительного обновления размера эмодзи
    window.forceEmojiSize = (size = 208) => {
      console.log(`🔧 Принудительно устанавливаем размер эмодзи: ${size}px`);
      setEmojiSize(size);
      
      // Также обновляем localStorage
      const currentSettings = JSON.parse(localStorage.getItem('emojiSettings') || '{}');
      const newSettings = { ...currentSettings, emojiOnlySize: size };
      localStorage.setItem('emojiSettings', JSON.stringify(newSettings));
      
      // Отправляем событие обновления
      window.dispatchEvent(new CustomEvent('emojiSettingsUpdated', { detail: newSettings }));
    };
    
    return () => {
      window.removeEventListener('emojiSettingsUpdated', handleSettingsUpdate);
      delete window.forceEmojiSize;
    };
  }, []);

  const msgText = typeof message.text === 'string' ? message.text : message.content;
  
  // ИСПРАВЛЕНИЕ: Очищаем встроенные стили из HTML, которые перекрывают наши CSS
  const cleanedMsgText = msgText ? msgText.replace(/style="[^"]*"/g, '') : msgText;
  
  // Дополнительное логирование для отладки
  console.log('🎯 EmojiOnlyMessage final render:', {
    messageId: message.id,
    emojiSize,
    originalMsgText: msgText,
    cleanedMsgText,
    finalSize: Math.max(emojiSize || 64, 64)
  });
  
  return (
    <EmojiOnlyContainer isOwn={isOwn}>
      <EmojiOnlyUsername isOwn={isOwn}>
        {isOwn ? state.user?.username || 'Вы' : message.username || 'Неизвестный'}
      </EmojiOnlyUsername>
      <EmojiOnlyContent emojiSize={emojiSize} dangerouslySetInnerHTML={{ __html: cleanedMsgText }} />
    </EmojiOnlyContainer>
  );
}
