import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { FiSmile, FiX } from 'react-icons/fi';
import { useEmojiSettings } from '../../hooks/useEmojiSettings';

// Импорт стандартных эмодзи из папки Smile - ОЧИЩЕНО
const SMILE_IMAGES = [];

function mapIconNameToEmoji(fileName) {
  // Все эмодзи очищены - функция возвращает пустую строку
  return '';
}

const EMOJI_TO_ICON = SMILE_IMAGES.reduce((acc, img) => {
  acc[mapIconNameToEmoji(img.name)] = img.src;
  return acc;
}, {});

// --- ДОБАВЛЕНО: загрузка кастомных эмодзи с сервера ---
function useCustomEmojis() {
  const [customEmojis, setCustomEmojis] = useState([]);
  const load = () => {
    fetch('/api/emojis/list')
      .then(r => r.json())
      .then(data => setCustomEmojis(Array.isArray(data) ? data : []))
      .catch(()=>{});
  };
  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('customEmojisUpdated', handler);
    return () => window.removeEventListener('customEmojisUpdated', handler);
  }, []);
  return customEmojis;
}

// Локальные эмодзи из localStorage: customEmojis (с человекочитаемым name и src)
// и serverCustomEmojis (с name = 'emoji-...' и url)
function useLocalCustomEmojis() {
  const [local, setLocal] = useState([]);
  useEffect(() => {
    try {
      const ce = JSON.parse(localStorage.getItem('customEmojis') || '[]');
      const sce = JSON.parse(localStorage.getItem('serverCustomEmojis') || '[]');

      const listA = Array.isArray(sce) ? sce.map(e => ({
        name: e.name,           // 'emoji-...'
        url: e.url,
        title: e.name
      })) : [];

      const listB = Array.isArray(ce) ? ce.map(e => {
        const file = String(e.src || '').split('/').pop() || '';
        const base = file.replace(/\.[^.]+$/, ''); // 'emoji-...'
        return {
          name: base,
          url: e.src,
          title: e.name || base
        };
      }) : [];

      // Объединяем по name, приоритет serverCustomEmojis
      const map = new Map();
      listB.forEach(x => map.set(x.name, x));
      listA.forEach(x => map.set(x.name, x));
      setLocal(Array.from(map.values()));
    } catch {
      setLocal([]);
    }
  }, []);
  return local;
}

const EmojiButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  
  &:hover {
    background: #f8f9fa;
    color: #007bff;
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const EmojiPickerContainer = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  background: #fff;
  border: 1.5px solid #e3f0ff;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 20px rgba(51, 144, 236, 0.15);
  z-index: 1000;
  width: 480px;
  max-width: 520px;
  max-height: 380px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
    
    &:hover {
      background: #a8a8a8;
    }
  }
`;

const EmojiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
`;

const EmojiItem = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  min-width: 60px;
  
  &:hover {
    background: #f0f8ff;
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const EmojiImage = styled.img`
  width: ${props => props.size || 48}px;
  height: ${props => props.size || 48}px;
  object-fit: cover;
  border-radius: 6px;
  image-rendering: crisp-edges;
`;

const StandardEmojiText = styled.span`
  font-size: ${props => props.size || 24}px;
  line-height: 1;
`;

const CategoryTitle = styled.h4`
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CategorySection = styled.div`
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

export default function EmojiInput({ onEmojiSelect, placeholder = "Выберите эмодзи" }) {
  const emojiSettings = useEmojiSettings();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);
  const serverCustomEmojis = useCustomEmojis();
  const localCustomEmojis = useLocalCustomEmojis();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  const handleEmojiClick = (emoji) => {
    onEmojiSelect(emoji);
    setShowPicker(false);
  };

  // Группируем эмодзи по категориям
  const groupedEmojis = SMILE_IMAGES.reduce((acc, img) => {
    const emoji = mapIconNameToEmoji(img.name);
    const fileName = img.name.toLowerCase();
    
    let category = 'Другие';
    
    // Определяем категорию по имени файла
    if (fileName.includes('победитель') || fileName.includes('крутой') || fileName.includes('ботан')) {
      category = 'Достижения';
    } else if (fileName.includes('радость') || fileName.includes('смех') || fileName.includes('улыбка') || fileName.includes('с днем рождения')) {
      category = 'Радость';
    } else if (fileName.includes('злой') || fileName.includes('дизлайк') || fileName.includes('rage')) {
      category = 'Негатив';
    } else if (fileName.includes('влюбленность') || fileName.includes('поцелуй') || fileName.includes('heart')) {
      category = 'Любовь';
    } else if (fileName.includes('сонный') || fileName.includes('устал') || fileName.includes('weary')) {
      category = 'Состояние';
    } else if (fileName.includes('обед') || fileName.includes('еда') || fileName.includes('yum')) {
      category = 'Еда';
    } else if (fileName.includes('меломан') || fileName.includes('на связи') || fileName.includes('headphones')) {
      category = 'Музыка';
    } else if (fileName.includes('богатство') || fileName.includes('деньги')) {
      category = 'Деньги';
    }
    
    if (!acc[category]) {
      acc[category] = [];
    }
    
    acc[category].push({ emoji, src: img.src, name: img.name });
    
    return acc;
  }, {});

  // Список кастомных эмодзи: объединяем локальные и серверные (по name)
  const customEmojis = React.useMemo(() => {
    const map = new Map();
    [...localCustomEmojis, ...serverCustomEmojis].forEach(e => {
      if (e && e.name) map.set(e.name, e);
    });
    return Array.from(map.values());
  }, [localCustomEmojis, serverCustomEmojis]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={pickerRef}>
      <EmojiButton
        onClick={() => setShowPicker(!showPicker)}
        title={placeholder}
      >
        <FiSmile size={20} />
      </EmojiButton>

      {showPicker && (
        <EmojiPickerContainer>
          {emojiSettings.showStandardEmojis !== false && Object.entries(groupedEmojis).map(([category, emojis]) => (
            <CategorySection key={category}>
              <CategoryTitle>{category}</CategoryTitle>
              <EmojiGrid>
                {emojis.map((item, index) => (
                  <EmojiItem
                    key={`${item.emoji}-${index}`}
                    onClick={() => handleEmojiClick(item.emoji)}
                    title={item.name.replace('.png', '')}
                  >
                    {EMOJI_TO_ICON[item.emoji] ? (
                      <EmojiImage 
                        src={EMOJI_TO_ICON[item.emoji]} 
                        alt={item.emoji} 
                        size={emojiSettings.customEmojiInPicker}
                      />
                    ) : (
                      <StandardEmojiText size={emojiSettings.standardEmojiInPicker}>
                        {item.emoji}
                      </StandardEmojiText>
                    )}
                  </EmojiItem>
                ))}
              </EmojiGrid>
            </CategorySection>
          ))}
          {customEmojis.length > 0 && (
            <CategorySection>
              <CategoryTitle>Кастомные</CategoryTitle>
              <EmojiGrid>
                {customEmojis.map((e, i) => (
                  <EmojiItem key={e.name + i} onClick={() => handleEmojiClick(`custom:${e.name}`)} title={e.title || e.name}>
                    <EmojiImage src={e.url} alt={e.title || e.name} size={emojiSettings.customEmojiInPicker} />
                  </EmojiItem>
                ))}
              </EmojiGrid>
            </CategorySection>
          )}
        </EmojiPickerContainer>
      )}
    </div>
  );
}
