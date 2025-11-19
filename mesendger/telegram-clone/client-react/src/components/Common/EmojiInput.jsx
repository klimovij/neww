import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
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
    touch-action: pan-y;
    overscroll-behavior: contain;
  ` : `
    bottom: 100%;
    left: 0;
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
`;

const MobileOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 100001;
`;

const MobileHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
`;

const MobileTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const EmojiGrid = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMobile'
})`
  display: grid;
  grid-template-columns: ${props => props.isMobile ? 'repeat(auto-fill, minmax(70px, 1fr))' : 'repeat(8, 1fr)'};
  gap: ${props => props.isMobile ? '12px' : '10px'};
  max-height: ${props => props.isMobile ? 'none' : '300px'};
  overflow-y: ${props => props.isMobile ? 'visible' : 'auto'};
`;

const EmojiItem = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMobile'
})`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: ${props => props.isMobile ? '70px' : '60px'};
  min-width: ${props => props.isMobile ? '70px' : '60px'};
  touch-action: ${props => props.isMobile ? 'manipulation' : 'auto'};
  
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

const CategoryTitle = styled.h4.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMobile'
})`
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: ${props => props.isMobile ? '16px' : '14px'};
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
  const [isMobile, setIsMobile] = useState(false);
  const pickerRef = useRef(null);
  const serverCustomEmojis = useCustomEmojis();
  const localCustomEmojis = useLocalCustomEmojis();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (isMobile && showPicker) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isMobile, showPicker]);

  useEffect(() => {
    if (!isMobile) {
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
    }
  }, [showPicker, isMobile]);

  const handleEmojiClick = (emoji) => {
    onEmojiSelect(emoji);
    setShowPicker(false);
  };

  const handleClose = () => {
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

  const pickerContent = showPicker ? (
    <>
      {isMobile && <MobileOverlay onClick={handleClose} />}
      <EmojiPickerContainer isMobile={isMobile}>
        {isMobile && (
          <MobileHeader>
            <MobileTitle>Выберите эмодзи</MobileTitle>
            <CloseButton onClick={handleClose}>
              <FiX size={20} />
            </CloseButton>
          </MobileHeader>
        )}
        {emojiSettings.showStandardEmojis !== false && Object.entries(groupedEmojis).map(([category, emojis]) => (
          <CategorySection key={category}>
            <CategoryTitle isMobile={isMobile}>{category}</CategoryTitle>
            <EmojiGrid isMobile={isMobile}>
              {emojis.map((item, index) => (
                <EmojiItem
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
                </EmojiItem>
              ))}
            </EmojiGrid>
          </CategorySection>
        ))}
        {customEmojis.length > 0 && (
          <CategorySection>
            <CategoryTitle isMobile={isMobile}>Кастомные</CategoryTitle>
            <EmojiGrid isMobile={isMobile}>
              {customEmojis.map((e, i) => (
                <EmojiItem 
                  key={e.name + i} 
                  isMobile={isMobile}
                  onClick={() => handleEmojiClick(`custom:${e.name}`)} 
                  title={e.title || e.name}
                >
                  <EmojiImage src={e.url} alt={e.title || e.name} size={emojiSettings.customEmojiInPicker} />
                </EmojiItem>
              ))}
            </EmojiGrid>
          </CategorySection>
        )}
      </EmojiPickerContainer>
    </>
  ) : null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={pickerRef}>
      <EmojiButton
        onClick={() => setShowPicker(!showPicker)}
        title={placeholder}
      >
        <FiSmile size={20} />
      </EmojiButton>

      {!isMobile && pickerContent}
      {isMobile && pickerContent && ReactDOM.createPortal(pickerContent, document.body)}
    </div>
  );
}
