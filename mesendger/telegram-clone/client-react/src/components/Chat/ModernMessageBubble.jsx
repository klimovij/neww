import React from 'react';
import styled, { keyframes } from 'styled-components';

// 🎨 Современные анимации появления сообщений
const slideInLeft = keyframes`
  0% { 
    opacity: 0; 
    transform: translateX(-50px) translateY(20px) scale(0.85) rotateY(-12deg); 
    filter: blur(6px) brightness(0.7);
  }
  25% {
    opacity: 0.4;
    transform: translateX(-20px) translateY(8px) scale(0.95) rotateY(-4deg);
    filter: blur(3px) brightness(0.85);
  }
  60% { 
    opacity: 0.8; 
    transform: translateX(5px) translateY(-4px) scale(1.05) rotateY(2deg); 
    filter: blur(1px) brightness(1.1);
  }
  85% {
    opacity: 0.95;
    transform: translateX(-1px) translateY(1px) scale(1.01) rotateY(-0.5deg);
    filter: blur(0.2px) brightness(1.02);
  }
  100% { 
    opacity: 1; 
    transform: translateX(0) translateY(0) scale(1) rotateY(0deg); 
    filter: blur(0) brightness(1);
  }
`;

const slideInRight = keyframes`
  0% { 
    opacity: 0; 
    transform: translateX(50px) translateY(20px) scale(0.85) rotateY(12deg); 
    filter: blur(6px) brightness(0.7);
  }
  25% {
    opacity: 0.4;
    transform: translateX(20px) translateY(8px) scale(0.95) rotateY(4deg);
    filter: blur(3px) brightness(0.85);
  }
  60% { 
    opacity: 0.8; 
    transform: translateX(-5px) translateY(-4px) scale(1.05) rotateY(-2deg); 
    filter: blur(1px) brightness(1.1);
  }
  85% {
    opacity: 0.95;
    transform: translateX(1px) translateY(1px) scale(1.01) rotateY(0.5deg);
    filter: blur(0.2px) brightness(1.02);
  }
  100% { 
    opacity: 1; 
    transform: translateX(0) translateY(0) scale(1) rotateY(0deg); 
    filter: blur(0) brightness(1);
  }
`;

// 🌟 Анимация пульсации для важных сообщений
const templatePulse = keyframes`
  0%, 100% { 
    box-shadow: 0 8px 32px rgba(255,60,60,0.4), 0 0 0 0 rgba(255,60,60,0.7);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 12px 40px rgba(255,60,60,0.6), 0 0 0 8px rgba(255,60,60,0.1);
    transform: scale(1.02);
  }
`;

// 💫 Анимация мерцания для обычных сообщений
const bubbleGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 6px 25px rgba(33,150,243,0.25), 0 0 0 0 rgba(33,150,243,0.4);
  }
  50% { 
    box-shadow: 0 8px 35px rgba(33,150,243,0.35), 0 0 0 4px rgba(33,150,243,0.1);
  }
`;

// 🎭 Контейнер сообщения с продвинутыми анимациями
export const ModernMessageContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn'].includes(prop)
})`
  display: flex;
  align-items: flex-end;
  margin-bottom: 1rem;
  position: relative;
  animation: ${props => props.isOwn ? slideInRight : slideInLeft} 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  
  &:hover {
    transform: translateY(-3px);
    transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    
    .message-actions {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  &:hover .modern-bubble {
    transform: scale(1.02);
    filter: brightness(1.1) saturate(1.2);
  }
`;

// 🎨 Современный пузырь сообщения
export const ModernMessageBubble = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn', 'isTemplate', 'isEmojiOnly', 'templateType'].includes(prop)
})`
  background: ${props => {
    if (props.isTemplate) {
      switch (props.templateType) {
        case 'urgent': return 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)';
        case 'important': return 'linear-gradient(135deg, #eab308 0%, #facc15 50%, #fde047 100%)';
        case 'info': return 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)';
        case 'sos': return 'linear-gradient(135deg, #dc2626 0%, #f97316 50%, #fb923c 100%)';
        default: return 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)';
      }
    }
    return props.isOwn
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6B73FF 100%)'
      : 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 50%, #4facfe 100%)';
  }};
  
  border-radius: ${props => props.isOwn ? '20px 20px 6px 20px' : '20px 20px 20px 6px'};
  
  box-shadow: ${props => {
    if (props.isTemplate) {
      switch (props.templateType) {
        case 'urgent': return '0 10px 40px rgba(220, 38, 38, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset';
        case 'important': return '0 10px 40px rgba(234, 179, 8, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset';
        case 'info': return '0 10px 40px rgba(37, 99, 235, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset';
        case 'sos': return '0 10px 40px rgba(220, 38, 38, 0.5), 0 0 0 1px rgba(255,255,255,0.1) inset';
        default: return '0 10px 40px rgba(37, 99, 235, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset';
      }
    }
    return props.isOwn
      ? '0 8px 32px rgba(102,126,234,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset'
      : '0 8px 32px rgba(33,147,176,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset';
  }};
  
  border: ${props => props.isTemplate ? '2px solid rgba(255,255,255,0.3)' : 'none'};
  padding: 1.2rem 1.8rem;
  margin: 0.3em 0;
  color: #fff;
  max-width: 75%;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 140px;
  backdrop-filter: blur(10px);
  
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  
  animation: ${props => props.isTemplate ? templatePulse : bubbleGlow} 3s ease-in-out infinite;
  
  /* Стеклянный эффект */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
    border-radius: inherit;
    pointer-events: none;
  }
  
  /* Блик сверху */
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    right: 2px;
    height: 30%;
    background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%);
    border-radius: ${props => props.isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};
    pointer-events: none;
  }
  
  &:hover .plus-btn {
    opacity: 1;
    transform: scale(1.1) rotate(90deg);
  }
`;

// ✨ Современный текст сообщения
export const ModernMessageText = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn', 'isTemplate'].includes(prop)
})`
  font-family: 'Inter', 'Segoe UI', 'Arial', sans-serif;
  line-height: 1.5;
  font-size: ${props => props.isTemplate ? '1.15rem' : '1.05rem'};
  font-weight: ${props => props.isTemplate ? 700 : 500};
  color: #fff;
  letter-spacing: 0.02em;
  opacity: 1;
  text-transform: ${props => props.isTemplate ? 'uppercase' : 'none'};
  text-shadow: ${props => props.isTemplate ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.2)'};
  
  /* Плавная анимация появления текста */
  animation: textFadeIn 0.8s ease-out 0.2s both;
  
  @keyframes textFadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
      filter: blur(2px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }
  }
`;

// 🏷️ Современное имя пользователя
export const ModernUsername = styled.span.withConfig({
  shouldForwardProp: (prop) => !['isTemplate'].includes(prop)
})`
  font-weight: 800;
  color: ${props => props.isTemplate ? '#ffffff' : 'rgba(255,255,255,0.9)'};
  letter-spacing: 0.02em;
  font-size: 1.1rem;
  opacity: 1;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  margin-bottom: 0.3rem;
  display: block;
  
  /* Анимация появления имени */
  animation: usernameFadeIn 0.6s ease-out 0.1s both;
  
  @keyframes usernameFadeIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

// ⏰ Современная временная метка
export const ModernTimestamp = styled.span.withConfig({
  shouldForwardProp: (prop) => !['isOwn'].includes(prop)
})`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.7);
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  margin-top: 0.2rem;
  align-self: flex-end;
  
  /* Анимация появления времени */
  animation: timestampFadeIn 0.5s ease-out 0.4s both;
  
  @keyframes timestampFadeIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 0.7;
      transform: scale(1);
    }
  }
`;

export default {
  ModernMessageContainer,
  ModernMessageBubble,
  ModernMessageText,
  ModernUsername,
  ModernTimestamp
};
