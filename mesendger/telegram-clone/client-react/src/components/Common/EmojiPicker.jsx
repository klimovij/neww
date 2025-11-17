import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
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

function useEmojiBlacklist() {
  const [blacklist, setBlacklist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('emojiBlacklist') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    const handler = (e) => setBlacklist(e?.detail || (() => { try { return JSON.parse(localStorage.getItem('emojiBlacklist') || '[]'); } catch { return []; } })());
    window.addEventListener('emojiBlacklistUpdated', handler);
    return () => window.removeEventListener('emojiBlacklistUpdated', handler);
  }, []);
  return blacklist;
}

const EmojiPickerContainer = styled.div`
  position: absolute;
  bottom: 8px;
  left: 36px;
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
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 8px;
  max-height: 250px;
  overflow-y: auto;
`;

const EmojiButton = styled.button`
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
  width: ${props => props.size || 64}px;
  height: ${props => props.size || 64}px;
  object-fit: cover;
  border-radius: 8px;
  image-rendering: crisp-edges;
`;

const StandardEmojiText = styled.span`
  font-size: ${props => props.size || 32}px;
  line-height: 1;
`;

const EmojiText = styled.span`
  font-size: 24px;
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

export default function EmojiPicker({ onEmojiSelect, isOpen, onClose, containerRef }) {
  const emojiSettings = useEmojiSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const customEmojis = useCustomEmojis();
  const blacklist = useEmojiBlacklist();

  if (!isOpen) return null;

  // Группируем эмодзи по категориям
  const groupedEmojis = SMILE_IMAGES.reduce((acc, img) => {
    const emoji = mapIconNameToEmoji(img.name);
    const stdKey = `std|${emoji}`;
    if (blacklist.includes(stdKey)) return acc;
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

  const allEmojis = [
    ...(emojiSettings.showStandardEmojis !== false
      ? SMILE_IMAGES.map(img => ({
          emoji: mapIconNameToEmoji(img.name),
          src: img.src,
          name: img.name,
          isCustom: false
        })).filter(item => !blacklist.includes(`std|${item.emoji}`))
      : []),
    ...customEmojis.map(e => ({
      emoji: `custom:${e.name}`,
      src: e.url,
      name: e.name,
      isCustom: true
    }))
  ];

  const handleEmojiClick = (emoji) => {
    if (typeof onEmojiSelect === 'function') onEmojiSelect(emoji);
    onClose();
  };

  return (
    <EmojiPickerContainer ref={containerRef}>
      {emojiSettings.showStandardEmojis !== false && Object.entries(groupedEmojis).map(([category, emojis]) => (
        <CategorySection key={category}>
          <CategoryTitle>{category}</CategoryTitle>
          <EmojiGrid>
            {emojis.map((item, index) => (
              <EmojiButton
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
              </EmojiButton>
            ))}
          </EmojiGrid>
        </CategorySection>
      ))}
      {/* Кастомные эмодзи */}
      {customEmojis.length > 0 && (
        <CategorySection>
          <CategoryTitle>Кастомные</CategoryTitle>
          <EmojiGrid>
            {customEmojis.map((e, i) => (
              <EmojiButton key={e.name + i} onClick={() => handleEmojiClick(`custom:${e.name}`)} title={e.name}>
                <EmojiImage src={e.url} alt={e.name} size={emojiSettings.customEmojiInPicker} />
              </EmojiButton>
            ))}
          </EmojiGrid>
        </CategorySection>
      )}
    </EmojiPickerContainer>
  );
}
