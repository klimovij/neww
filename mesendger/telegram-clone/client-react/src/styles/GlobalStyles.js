import styled, { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #232526 0%, #414345 100%);
    min-height: 100vh;
    height: 100vh;
    overflow: hidden;
    color: #f8f8f8;
    letter-spacing: 0.01em;
  }

  #root {
    height: 100vh;
  }

  /* === СТИЛИ ДЛЯ ЭМОДЗИ === */
  
  /* Основные стили для эмодзи в сообщениях */
  .emoji {
    font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Android Emoji', 'Twemoji Mozilla', sans-serif;
    font-size: 2.5em !important; /* Увеличено в 2.5 раза */
    line-height: 1 !important;
    vertical-align: middle;
    display: inline-block;
    margin: 0 0.15em;
    font-weight: normal;
    font-style: normal;
    text-decoration: none;
  }
  
  /* Для сообщений, состоящих только из эмодзи */
  .emoji-only {
    font-size: 4em !important; /* Еще больше для сообщений только с эмодзи */
    text-align: center;
    padding: 1rem !important;
    line-height: 1.2 !important;
    
    .emoji {
      font-size: 1em !important; /* Относительно родителя */
      margin: 0 0.2em;
    }
  }

 /* Стили для эмодзи в пикере */
.emoji-picker {
  .emoji-grid {
    display: grid !important;
    grid-template-columns: repeat(7, 1fr) !important; /* Больше колонок */
    gap: 0.5rem !important; /* Меньше gap */
    
    > * {
      font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Android Emoji', sans-serif !important;
      font-size: 1.3rem !important; /* Уменьшен размер */
      padding: 0.6rem !important; /* Уменьшен padding */
      min-width: 45px !important; /* Уменьшена ширина */
      min-height: 45px !important; /* Уменьшена высота */
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      border-radius: 8px !important;
      transition: all 0.2s ease !important;
      background: transparent !important;
      border: none !important;
      
      &:hover {
        background: #f8f9fa !important;
        transform: scale(1.2) !important; /* Уменьшено масштабирование */
      }
      
      &:active {
        transform: scale(1.1) !important;
        background: #e9ecef !important;
      }
    }
  }
}

  /* Для обычного HTML клиента */
  .message-content {
    .emoji {
      font-size: 2.5em !important;
      line-height: 1 !important;
      vertical-align: middle;
      margin: 0 0.15em;
    }
    
    &.emoji-only {
      font-size: 4em !important;
      text-align: center;
      padding: 1rem !important;
      
      .emoji {
        font-size: 1em !important;
        margin: 0 0.2em;
      }
    }
  }

  /* Стили для эмодзи в разных контекстах */
  .chat-message .emoji {
    font-size: 2.5em !important;
  }
  
  .reply-preview .emoji {
    font-size: 1.8em !important; /* Немного меньше в превью ответа */
  }
  
  .typing-indicator .emoji {
    font-size: 1.5em !important; /* Еще меньше в индикаторе печати */
  }

  /* Для браузеров, которые не поддерживают цветные эмодзи */
  @supports not (font-variation-settings: normal) {
    .emoji {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333;
    }
  }

  /* Адаптивность для мобильных устройств */
  @media (max-width: 768px) {
  .emoji {
    font-size: 2.5em !important; /* Немного меньше на мобильных */
  }
  
  .emoji-only {
    font-size: 4em !important;
  }
  
  .emoji-picker .emoji-grid > * {
    font-size: 1.5rem !important;
    min-width: 40px !important;
    min-height: 40px !important;
    padding: 0.5rem !important;
  }
}

  /* Анимации для эмодзи */
  @keyframes emojiPop {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
    }
  }

  .emoji.new-emoji {
    animation: emojiPop 0.3s ease-out;
  }

  /* Стили для часто используемых эмодзи */
  .emoji.heart {
    color: #e74c3c !important;
  }
  
  .emoji.fire {
    color: #f39c12 !important;
  }
  
  .emoji.star {
    color: #f1c40f !important;
  }
`;

export const Container = styled.div`
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

export const MessengerContainer = styled.div`
  display: flex;
  height: 98vh;
  width: 98vw;
  max-width: 1500px;
  margin: 1vh auto;
  background: rgba(255,255,255,0.07);
  border-radius: 22px;
  overflow: visible;
  box-shadow: 0 10px 40px 0 rgba(44,62,80,0.18), 0 1.5px 8px 0 rgba(67,233,123,0.07);
  border: 1.5px solid rgba(255,255,255,0.09);
  backdrop-filter: blur(2.5px);
`;

export const Button = styled.button`
  padding: ${props => props.size === 'small' ? '5px 10px' : '10px 20px'};
  color: white;
  border: none;
  border-radius: ${props => props.rounded ? '20px' : '5px'};
  cursor: pointer;
  font-size: ${props => props.size === 'small' ? '0.8rem' : '1rem'};
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.$variant === 'secondary' ? '#7f8c8d' : '#2980b9'};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.3s ease;

  &:focus {
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

export const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
`;

export const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 10px;
  width: 92%;
  max-width: ${props => props.$large ? '1100px' : '900px'};
  max-height: 88vh;
  overflow-y: auto;
  position: relative;
  animation: slideIn 0.3s ease;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #aaa;
  transition: color 0.3s ease;

  &:hover {
    color: #000;
  }
`;

export const Badge = styled.span`
  background: linear-gradient(135deg, #ff512f 0%, #dd2476 100%);
  color: #fff;
  border-radius: 50%;
  padding: 3px 8px 2px 8px;
  font-size: 0.92rem;
  font-weight: 700;
  margin-left: 7px;
  min-width: 22px;
  min-height: 22px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px 0 #dd247655, 0 1px 0.5px 0 #fff2 inset;
  border: 2px solid #fff3;
  letter-spacing: 0.01em;
  transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  animation: badgePop 0.25s cubic-bezier(.4,0,.2,1);
  user-select: none;
  @keyframes badgePop {
    from { transform: scale(0.7); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
`;

// --- Исправлено: фильтрация пропса online ---
export const Avatar = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'online'
})`
  width: ${props => props.size || '40px'};
  height: ${props => props.size || '40px'};
  border-radius: 12px;
  background: ${props => props.online ? '#2ecc71' : '#3498db'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: ${props => props.size === '20px' ? '0.7rem' : '1rem'};
  position: relative;
  
  /* Индикатор онлайн статуса */
  ${props => props.online && `
    &::after {
      content: '';
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 12px;
      height: 12px;
      background: #2ecc71;
      border: 2px solid white;
      border-radius: 50%;
    }
  `}
`;

export const Tooltip = styled.div.withConfig({
  shouldForwardProp: (prop) => !['show', 'active'].includes(prop)
})`
  position: absolute;
  background: #333;
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 0.8rem;
  white-space: nowrap;
  z-index: 1001;
  opacity: ${props => props.show ? 1 : 0};
  visibility: ${props => props.show ? 'visible' : 'hidden'};
  transition: all 0.3s ease;
  
  /* Стрелочка для тултипа */
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #333 transparent transparent transparent;
  }
`;

/* Дополнительный компонент для эмодзи */
export const EmojiWrapper = styled.span.withConfig({
  shouldForwardProp: (prop) => !['clickable', 'active'].includes(prop)
})`
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Android Emoji', sans-serif;
  font-size: ${props => props.size || '2.5em'};
  line-height: 1;
  vertical-align: middle;
  display: inline-block;
  margin: 0 0.15em;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  transition: transform 0.2s ease;
  
  &:hover {
    transform: ${props => props.clickable ? 'scale(1.2)' : 'none'};
  }
`;