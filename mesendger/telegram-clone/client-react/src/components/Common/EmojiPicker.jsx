import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { useEmojiSettings } from '../../hooks/useEmojiSettings';
import { FiX } from 'react-icons/fi';

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

const EmojiPickerContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMobile'
})`
  position: ${props => props.isMobile ? 'fixed' : 'absolute'};
  ${props => props.isMobile ? `
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
    border-radius: 0;
    z-index: 100002;
    padding: 20px 16px;
    padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  ` : `
    bottom: 8px;
    left: 36px;
    width: 480px;
    max-width: 520px;
    max-height: 380px;
    border-radius: 12px;
    padding: 12px;
    z-index: 1000;
    overflow-y: auto;
  `}
  background: #fff;
  border: ${props => props.isMobile ? 'none' : '1.5px solid #e3f0ff'};
  box-shadow: ${props => props.isMobile ? 'none' : '0 4px 20px rgba(51, 144, 236, 0.15)'};
  
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
  
  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
    border-radius: 0;
    border: none;
    box-shadow: none;
    z-index: 100002;
    padding: 20px 16px;
    padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    overscroll-behavior: contain;
  }
`;

const MobileOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 100001;
  backdrop-filter: blur(4px);
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const MobileHeader = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e3e6ec;
  }
`;

const MobileTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
`;

const CloseButton = styled.button`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: rgba(44, 62, 80, 0.1);
    color: #2c3e50;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:active {
      background: rgba(44, 62, 80, 0.2);
      transform: scale(0.95);
    }
  }
`;

const EmojiGrid = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMobile'
})`
  display: grid;
  grid-template-columns: ${props => props.isMobile ? 'repeat(auto-fill, minmax(70px, 1fr))' : 'repeat(auto-fill, minmax(60px, 1fr))'};
  gap: ${props => props.isMobile ? '12px' : '8px'};
  max-height: ${props => props.isMobile ? 'none' : '250px'};
  overflow-y: ${props => props.isMobile ? 'visible' : 'auto'};
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 12px;
    max-height: none;
    overflow-y: visible;
  }
`;

const EmojiButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMobile'
})`
  background: none;
  border: none;
  cursor: pointer;
  padding: ${props => props.isMobile ? '8px' : '4px'};
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: ${props => props.isMobile ? '70px' : '60px'};
  min-width: ${props => props.isMobile ? '70px' : '60px'};
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  
  &:hover {
    background: #f0f8ff;
    transform: scale(1.1);
  }
  
  &:active {
    background: ${props => props.isMobile ? '#e3f0ff' : 'none'};
    transform: scale(0.95);
  }
  
  @media (max-width: 768px) {
    padding: 8px;
    min-height: 70px;
    min-width: 70px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    
    &:active {
      background: #e3f0ff;
      transform: scale(0.95);
    }
  }
`;

const EmojiImage = styled.img`
  width: ${props => props.size || 64}px;
  height: ${props => props.size || 64}px;
  object-fit: cover;
  border-radius: 8px;
  image-rendering: crisp-edges;
  
  @media (max-width: 768px) {
    width: ${props => props.size || 56}px;
    height: ${props => props.size || 56}px;
  }
`;

const StandardEmojiText = styled.span`
  font-size: ${props => props.size || 32}px;
  line-height: 1;
  
  @media (max-width: 768px) {
    font-size: ${props => props.size || 40}px;
  }
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
  
  @media (max-width: 768px) {
    font-size: 16px;
    margin: 0 0 12px 0;
  }
`;

const CategorySection = styled.div`
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  @media (max-width: 768px) {
    margin-bottom: 24px;
    
    &:last-child {
      margin-bottom: 0;
      padding-bottom: 20px;
    }
  }
`;

export default function EmojiPicker({ onEmojiSelect, isOpen, onClose, containerRef }) {
  const emojiSettings = useEmojiSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const customEmojis = useCustomEmojis();
  const blacklist = useEmojiBlacklist();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Блокируем скроллинг body на мобильных устройствах, когда пикер открыт
  useEffect(() => {
    if (!isOpen || !isMobile) return;
    
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen, isMobile]);

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

  const pickerContent = (
    <>
      {isMobile && <MobileOverlay onClick={onClose} />}
      <EmojiPickerContainer ref={containerRef} isMobile={isMobile} onClick={(e) => e.stopPropagation()}>
        {isMobile && (
          <MobileHeader>
            <MobileTitle>Выберите эмодзи</MobileTitle>
            <CloseButton onClick={onClose} title="Закрыть">
              <FiX size={24} />
            </CloseButton>
          </MobileHeader>
        )}
        {emojiSettings.showStandardEmojis !== false && Object.entries(groupedEmojis).map(([category, emojis]) => (
          <CategorySection key={category}>
            <CategoryTitle>{category}</CategoryTitle>
            <EmojiGrid isMobile={isMobile}>
              {emojis.map((item, index) => (
                <EmojiButton
                  key={`${item.emoji}-${index}`}
                  isMobile={isMobile}
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
            <EmojiGrid isMobile={isMobile}>
              {customEmojis.map((e, i) => (
                <EmojiButton key={e.name + i} isMobile={isMobile} onClick={() => handleEmojiClick(`custom:${e.name}`)} title={e.name}>
                  <EmojiImage src={e.url} alt={e.name} size={emojiSettings.customEmojiInPicker} />
                </EmojiButton>
              ))}
            </EmojiGrid>
          </CategorySection>
        )}
      </EmojiPickerContainer>
    </>
  );

  // На мобильных устройствах используем портал для отображения на весь экран
  if (isMobile) {
    return ReactDOM.createPortal(pickerContent, document.body);
  }

  return pickerContent;
}
