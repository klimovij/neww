import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

// Функция для нормализации URL эмодзи
const normalizeEmojiUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  let trimmed = url.trim();
  if (!trimmed) return url;
  
  // Если уже абсолютный URL, возвращаем как есть
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  
  // Если путь начинается с /uploads/emojis/, нормализуем его
  if (trimmed.startsWith('/uploads/emojis/')) {
    // Если путь уже правильный, возвращаем как есть
    return trimmed;
  }
  
  // Если путь относительный без начального слеша
  if (trimmed.startsWith('uploads/emojis/')) {
    return `/${trimmed}`;
  }
  
  // Если путь содержит uploads/emojis где-то внутри
  const emojiIndex = trimmed.toLowerCase().indexOf('/uploads/emojis/');
  if (emojiIndex !== -1) {
    return trimmed.slice(emojiIndex);
  }
  
  return trimmed;
};

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
  if (typeof msgText !== 'string' || !msgText) return false;
  
  // Создаем временный элемент для парсинга HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = msgText;
  
  // Получаем текстовое содержимое без HTML тегов
  const textContent = tempDiv.textContent || tempDiv.innerText || '';
  const trimmedText = textContent.trim();
  
  // Получаем все img теги
  const imgElements = tempDiv.querySelectorAll('img');
  const imgCount = imgElements.length;
  
  // Убираем все HTML теги и пробелы для проверки
  const htmlWithoutTags = msgText
    .replace(/<[^>]+>/g, '') // Убираем все HTML теги
    .replace(/&nbsp;/g, ' ') // Заменяем &nbsp; на пробел
    .replace(/&[a-z]+;/gi, '') // Убираем другие HTML entities
    .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
    .trim();
  
  console.log('🔍 Checking if emoji-only:', { 
    msgText, 
    trimmedText, 
    htmlWithoutTags,
    imgCount 
  });
  
  // Случай 1: Обычные эмодзи (Unicode)
  if (trimmedText && /^\s*(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})+\s*$/u.test(trimmedText)) {
    console.log('✅ Detected as standard emoji-only');
    return true;
  }
  
  // Случай 2: Токены custom:emoji-...
  if (/^\s*(custom:emoji-[\d-]+)\s*$/.test(trimmedText) || /^\s*(custom:emoji-[\d-]+)\s*$/.test(htmlWithoutTags)) {
    console.log('✅ Detected as custom emoji token');
    return true;
  }
  
  // Случай 3: HTML с одним или несколькими img тегами (кастомные эмодзи)
  if (imgCount > 0) {
    // Проверяем, что после удаления img тегов остался только пробельный текст
    const textAfterRemovingImgs = htmlWithoutTags.trim();
    const isEmojiOnly = textAfterRemovingImgs === '' || textAfterRemovingImgs.length === 0;
    
    console.log('🔍 HTML img check:', { 
      imgCount, 
      textAfterRemovingImgs, 
      isEmojiOnly 
    });
    
    if (isEmojiOnly) {
      console.log('✅ Detected as HTML emoji-only (img tags)');
      return true;
    }
  }
  
  // Случай 4: Только пробелы и HTML теги (пустое сообщение после очистки)
  if (htmlWithoutTags === '' && imgCount === 0 && trimmedText === '') {
    console.log('❌ Empty message after cleaning');
    return false;
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
  // Также нормализуем URL изображений эмодзи
  const cleanedMsgText = msgText ? (() => {
    let cleaned = msgText;
    
    // Сначала нормализуем все src атрибуты в img тегах
    cleaned = cleaned.replace(/<img([^>]*)\ssrc="([^"]*)"([^>]*)>/gi, (match, before, src, after) => {
      const normalizedSrc = normalizeEmojiUrl(src);
      return `<img${before} src="${normalizedSrc}"${after}>`;
    });
    
    // Затем убираем встроенные стили и атрибуты размеров
    cleaned = cleaned
      .replace(/style="[^"]*"/gi, '') // Убираем style атрибуты
      .replace(/width="[^"]*"/gi, '') // Убираем width атрибуты
      .replace(/height="[^"]*"/gi, '') // Убираем height атрибуты
      .replace(/width:\s*[^;]+;?/gi, '') // Убираем width из inline стилей
      .replace(/height:\s*[^;]+;?/gi, '') // Убираем height из inline стилей
      .replace(/max-width:\s*[^;]+;?/gi, '') // Убираем max-width
      .replace(/max-height:\s*[^;]+;?/gi, '') // Убираем max-height
      .replace(/min-width:\s*[^;]+;?/gi, '') // Убираем min-width
      .replace(/min-height:\s*[^;]+;?/gi, '') // Убираем min-height
      .replace(/vertical-align:\s*[^;]+;?/gi, '') // Убираем vertical-align
      .replace(/margin:\s*[^;]+;?/gi, '') // Убираем margin
      .replace(/padding:\s*[^;]+;?/gi, ''); // Убираем padding
    
    return cleaned;
  })() : msgText;
  
  // Дополнительное логирование для отладки
  console.log('🎯 EmojiOnlyMessage final render:', {
    messageId: message.id,
    emojiSize,
    originalMsgText: msgText,
    cleanedMsgText,
    finalSize: Math.max(emojiSize || 64, 64)
  });
  
  // Добавляем обработчик ошибок для изображений после рендера
  useEffect(() => {
    if (!cleanedMsgText) return;
    
    // Небольшая задержка, чтобы DOM успел обновиться
    const timeoutId = setTimeout(() => {
      // Находим все img теги в компоненте и добавляем обработчики ошибок
      const container = document.querySelector(`[data-emoji-message-id="${message.id}"]`);
      if (container) {
        const images = container.querySelectorAll('img');
        images.forEach(img => {
          // Получаем оригинальный src из атрибута
          const originalSrc = img.getAttribute('src') || img.src;
          
          // Нормализуем src если нужно
          let normalizedSrc = normalizeEmojiUrl(originalSrc);
          
          // Если путь относительный, делаем его абсолютным относительно текущего origin
          if (normalizedSrc && !normalizedSrc.startsWith('http')) {
            if (!normalizedSrc.startsWith('/')) {
              normalizedSrc = `/${normalizedSrc}`;
            }
            // Обновляем src только если он изменился
            if (normalizedSrc !== originalSrc) {
              img.src = normalizedSrc;
            }
          }
          
          // Добавляем обработчик ошибок
          const handleError = () => {
            console.warn('❌ Failed to load emoji image:', img.src, 'Original:', originalSrc);
            
            // Пытаемся найти альтернативный путь через data-token
            const dataToken = img.getAttribute('data-token');
            if (dataToken && dataToken.startsWith('custom:emoji-')) {
              // Формируем путь из токена
              const tokenParts = dataToken.replace('custom:emoji-', '');
              const alternativePath = `/uploads/emojis/emoji-${tokenParts}.jpg`;
              console.log('🔄 Trying alternative path:', alternativePath);
              
              // Пробуем альтернативный путь
              if (img.src !== alternativePath) {
                img.src = alternativePath;
                return; // Не скрываем, ждем загрузки альтернативного пути
              }
            }
            
            // Если альтернативный путь не помог, показываем placeholder
            img.style.display = 'none';
            img.alt = 'Эмодзи не загружен';
          };
          
          // Добавляем обработчик только если его еще нет
          if (!img.hasAttribute('data-error-handler-added')) {
            img.addEventListener('error', handleError, { once: true });
            img.setAttribute('data-error-handler-added', 'true');
          }
        });
      }
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [cleanedMsgText, message.id]);

  return (
    <EmojiOnlyContainer isOwn={isOwn} data-emoji-message-id={message.id}>
      <EmojiOnlyUsername isOwn={isOwn}>
        {isOwn ? state.user?.username || 'Вы' : message.username || 'Неизвестный'}
      </EmojiOnlyUsername>
      <EmojiOnlyContent emojiSize={emojiSize} dangerouslySetInnerHTML={{ __html: cleanedMsgText }} />
    </EmojiOnlyContainer>
  );
}
