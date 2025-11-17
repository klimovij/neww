import React, { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';

const TextareaContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 44px;
  max-height: 120px;
`;

const HiddenTextarea = styled.textarea`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 120px;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  padding: 12px 16px;
  font-size: 1rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  resize: none;
  outline: none;
  background: transparent;
  color: transparent;
  caret-color: #2c3e50;
  z-index: 3;
  box-sizing: border-box;
  overflow-y: auto;
  

  &:focus {
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }

  &::placeholder {
    color: #95a5a6;
  }
`;

const VisualLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 120px;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  padding: 12px 16px;
  font-size: 1rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #fff;
  color: #2c3e50;
  pointer-events: none;
  z-index: 1;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow: hidden;
  line-height: 1.4;
  min-height: 44px;
  box-sizing: border-box;
`;

const EmojiImage = styled.img`
  width: 20px;
  height: 20px;
  vertical-align: middle;
  margin: 0 1px;
`;

// Функция для загрузки кастомных эмодзи
const useCustomEmojis = () => {
  const [customEmojis, setCustomEmojis] = useState({});

  useEffect(() => {
    const loadEmojis = async () => {
      try {
        const response = await fetch('/api/emojis/list');
        const emojis = await response.json();
        const emojiMap = {};
        emojis.forEach(emoji => {
          emojiMap[`custom:${emoji.name}`] = emoji.url || emoji.src;
        });
        setCustomEmojis(emojiMap);
      } catch (error) {
        console.error('Ошибка загрузки эмодзи:', error);
      }
    };

    loadEmojis();

    const handleEmojiUpdate = () => loadEmojis();
    window.addEventListener('customEmojisUpdated', handleEmojiUpdate);
    return () => window.removeEventListener('customEmojisUpdated', handleEmojiUpdate);
  }, []);

  return customEmojis;
};

// Функция для рендеринга текста с эмодзи
const renderTextWithEmojis = (text, customEmojis) => {
  if (!text) return '';

  console.log('=== NEW ALGORITHM ===');
  console.log('Rendering text:', text);
  console.log('Text length:', text.length);
  console.log('Available emojis:', Object.keys(customEmojis));

  // Используем более точное регулярное выражение с глобальным поиском
  const emojiRegex = /custom:emoji-\d+-\d+/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = emojiRegex.exec(text)) !== null) {
    console.log('Found match:', match[0], 'at index:', match.index);
    // Добавляем текст перед эмодзи
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      console.log('Text before emoji:', beforeText);
      parts.push(beforeText);
    }
    // Добавляем сам эмодзи
    parts.push(match[0]);
    lastIndex = match.index + match[0].length;
    console.log('LastIndex updated to:', lastIndex);
  }
  
  // Добавляем оставшийся текст
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    console.log('Remaining text:', remainingText);
    parts.push(remainingText);
  }
  console.log('Final parts:', parts);
  
  return parts.map((part, index) => {
    if (part.startsWith('custom:')) {
      const emojiSrc = customEmojis[part];
      console.log(`Emoji ${part}:`, emojiSrc);
      if (emojiSrc) {
        return (
          <EmojiImage
            key={index}
            src={emojiSrc}
            alt={part}
            title={part}
          />
        );
      } else {
        console.warn(`Emoji not found: ${part}`);
        // Если эмодзи не найден, возвращаем текст как есть для отладки
        return <span key={index} style={{color: 'red'}}>{part}</span>;
      }
    }
    // Возвращаем обычный текст
    return part;
  }).filter(Boolean); // Убираем пустые элементы
};

const EmojiTextarea = React.forwardRef(({ value, onChange, onKeyPress, placeholder, style, ...props }, ref) => {
  const textareaRef = useRef(null);
  const visualLayerRef = useRef(null);
  const customEmojis = useCustomEmojis();
  
  console.log('=== EMOJI TEXTAREA ===');
  console.log('Received value:', value);
  console.log('Value length:', value?.length);
  
  // Функция для замены кодов эмодзи на один символ
  const replaceEmojiCodesWithSymbols = (text) => {
    return text.replace(/custom:emoji-\d+-\d+/g, '🙂');
  };
  
  // Обработанное значение для скрытой текстареа
  const hiddenValue = replaceEmojiCodesWithSymbols(value || '');
  console.log('Hidden value:', hiddenValue);

  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(textareaRef.current);
      } else {
        ref.current = textareaRef.current;
      }
    }
  }, [ref]);

  useEffect(() => {
    if (textareaRef.current && visualLayerRef.current) {
      const textarea = textareaRef.current;
      const visual = visualLayerRef.current;
      
      // Синхронизируем высоту
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = scrollHeight + 'px';
      visual.style.height = scrollHeight + 'px';
    }
  }, [value]);

  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <TextareaContainer style={style}>
      <VisualLayer ref={visualLayerRef}>
        {value ? renderTextWithEmojis(value, customEmojis) : (
          <span style={{ color: '#95a5a6', userSelect: 'none' }}>
            {!value && placeholder}
          </span>
        )}
      </VisualLayer>
      <HiddenTextarea
        ref={textareaRef}
        value={hiddenValue}
        onChange={handleChange}
        onKeyPress={onKeyPress}
        placeholder={placeholder}
        {...props}
      />
    </TextareaContainer>
  );
});

EmojiTextarea.displayName = 'EmojiTextarea';

export default EmojiTextarea;
