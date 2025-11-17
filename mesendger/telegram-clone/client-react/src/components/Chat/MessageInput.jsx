import React, { useState, useRef, useEffect, useCallback } from 'react';
// Простая функция debounce
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const later = () => {
      timeout = null;
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

import { playNotificationSound } from '../../utils/notificationSound';
import styled from 'styled-components';
import { FiPaperclip, FiSmile, FiArrowRight, FiX, FiFileText, FiClock, FiChevronDown } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import Emoji from '../Common/Emoji';
import EmojiInput from '../Common/EmojiInput';
import TemplatesQuickPicker from './TemplatesQuickPicker';
import ScheduledMessageModal from './ScheduledMessageModal';


// === ИСПРАВЛЕНИЕ: Объявляем PollModalOverlay ДО его использования ===
const PollModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(25, 30, 40, 0.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

// === Теперь можно безопасно использовать PollModalOverlay ===
// Модалка создания голосования
const CreatePollModalOverlay = styled(PollModalOverlay)``;

const CreatePollModal = styled.div`
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border-radius: 22px;
  border: 1px solid #e6eef7;
  box-shadow: 0 10px 30px rgba(0,0,0,0.12), 0 0 0 2px #43e97b11 inset;
  padding: 1.6rem 1.6rem 1.4rem 1.6rem;
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
`;

const PollFormLabel = styled.label`
  font-weight: 800;
  color: #2266aa;
  margin-bottom: 0.35rem;
  align-self: flex-start;
  letter-spacing: 0.01em;
`;

const PollFormInput = styled.input`
  width: 100%;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  border: 1.5px solid #d6e6f7;
  background: #ffffff;
  font-size: 1.02rem;
  margin-bottom: 0.8rem;
  outline: none;
  transition: box-shadow .18s ease, border-color .18s ease, background .18s ease;
  &:focus {
    border-color: #43e97b;
    box-shadow: 0 0 0 4px #43e97b22;
    background: #f8fffb;
  }
`;

const PollFormOptionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const RemoveOptionBtn = styled.button`
  background: #f44336;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.2rem;
  transition: background 0.18s;
  &:hover { background: #b71c1c; }
`;

const AddOptionBtn = styled.button`
  background: linear-gradient(90deg, #43e97b 0%, #6df6a1 100%);
  color: #0f172a;
  border: none;
  border-radius: 12px;
  padding: 0.6rem 1rem;
  font-weight: 800;
  font-size: 0.98rem;
  margin-top: 0.25rem;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
  box-shadow: 0 6px 16px #43e97b33;
  &:hover { filter: brightness(1.05); transform: translateY(-1px); }
`;


const PollButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMobile'
})`
  background: linear-gradient(120deg, #e3f0ff 0%, #b3d8ff 100%);
  color: #225;
  border: none;
  border-radius: 12px;
  padding: ${props => props.isMobile ? '12px 16px' : '0 14px'};
  height: ${props => props.isMobile ? '48px' : '38px'};
  margin-right: ${props => props.isMobile ? '8px' : '0.5rem'};
  font-weight: 600;
  font-size: ${props => props.isMobile ? '1rem' : '0.98rem'};
  box-shadow: 0 2px 8px 0 rgba(80,140,255,0.10);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s;
  &:hover {
    background: linear-gradient(120deg, #d2e7ff 0%, #e3f0ff 100%);
    color: #113366;
    box-shadow: 0 5px 18px 0 rgba(80,140,255,0.18);
    transform: scale(1.04);
  }
`;

// Убираем дублирующее объявление PollModalOverlay (уже есть выше)
const PollModal = styled.div`
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 32px 0 rgba(33,150,243,0.18);
  padding: 2.2rem 2.5rem 2rem 2.5rem;
  min-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  position: relative;
`;

const PollTitle = styled.div`
  font-size: 1.22rem;
  font-weight: 900;
  color: #1e293b;
  text-align: center;
  margin: 0.2rem 0 0.4rem 0;
`;

const PollOptionButton = styled.button`
  background: linear-gradient(90deg, #43e97b 0%, #6df6a1 100%);
  color: #0f172a;
  border: none;
  border-radius: 14px;
  padding: 0.9rem 1.4rem;
  font-size: 1.02rem;
  font-weight: 900;
  margin-bottom: 0.4rem;
  box-shadow: 0 8px 20px #43e97b33;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
  &:hover { transform: translateY(-1px); filter: brightness(1.04); }
`;

const PollClose = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99,102,241,0.22);
  color: #1e293b;
  font-size: 0.92rem;
  font-weight: 800;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 10px;
  transition: all 0.18s ease;
  &:hover { background: rgba(99,102,241,0.12); transform: translateY(-1px); }
`;

const InputContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMobile'
})`
  background: ${props => props.isMobile ? 'transparent' : 'rgba(255,255,255,0.95)'};
  border-top: ${props => props.isMobile ? 'none' : '1px solid #e3e6ec'};
  padding: ${props => props.isMobile ? '0' : '0.8rem 1.5rem'};
  position: ${props => props.isMobile ? 'relative' : 'absolute'};
  bottom: ${props => props.isMobile ? 'auto' : '10px'};
  left: ${props => props.isMobile ? 'auto' : '360px'};
  right: ${props => props.isMobile ? 'auto' : '16px'};
  border-radius: ${props => props.isMobile ? '0' : '0 0 18px 18px'};
  box-shadow: ${props => props.isMobile ? 'none' : '0 -2px 16px rgba(44,62,80,0.08)'};
  box-sizing: border-box;
  z-index: 100;
`;

const MessageTextarea = styled.textarea`
  flex: 1;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  font-family: inherit;
  resize: none;
  outline: none;
  min-height: 44px;
  max-height: 120px;
  transition: border-color 0.3s ease;
  &:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
  &::placeholder {
    color: #adb5bd;
  }
  &:disabled {
    background: #f8f9fa;
    cursor: not-allowed;
  }
`;

const ReplyPreview = styled.div`
  background: linear-gradient(90deg, #e3f2fd 60%, #fff 100%);
  border-left: 5px solid #2196f3;
  box-shadow: 0 2px 12px rgba(33,150,243,0.08);
  padding: 0.85rem 1rem 0.85rem 0.85rem;
  margin-bottom: 0.85rem;
  border-radius: 0 12px 12px 0;
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  animation: replyFadeIn 0.3s cubic-bezier(.4,0,.2,1);
  @keyframes replyFadeIn {
    from { opacity: 0; transform: translateY(-10px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
`;

const ReplyInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ReplyAuthor = styled.div`
  font-weight: 700;
  color: #1976d2;
  font-size: 1rem;
  margin-bottom: 0.15rem;
  letter-spacing: 0.01em;
`;

const ReplyContent = styled.div`
  color: #444;
  font-size: 0.97rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
  opacity: 0.92;
  .emoji {
    font-size: 1.5em !important;
    vertical-align: middle;
  }
`;

const CloseReplyButton = styled.button`
  background: #fff;
  border: 1.5px solid #2196f3;
  cursor: pointer;
  color: #2196f3;
  padding: 0.18rem 0.32rem;
  border-radius: 50%;
  margin-left: 8px;
  font-size: 1.1rem;
  box-shadow: 0 1px 4px rgba(33,150,243,0.08);
  transition: all 0.18s;
  &:hover {
    background: #e3f2fd;
    color: #1976d2;
    border-color: #1976d2;
    transform: scale(1.12);
  }
`;

const FilePreview = styled.div`
  background: linear-gradient(120deg, #e3f0ff 0%, #f8faff 100%);
  border: 1.5px solid #d0e6ff;
  border-radius: 14px;
  padding: 1.1rem 1.3rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1.1rem;
  box-shadow: 0 2px 12px 0 rgba(33,150,243,0.07);
  transition: box-shadow 0.2s, border 0.2s, background 0.2s;
  animation: filePreviewAppear 0.25s cubic-bezier(.4,0,.2,1);
  @keyframes filePreviewAppear {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
`;

const FilePreviewContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const FilePreviewImage = styled.img`
  width: 70px;
  height: 70px;
  object-fit: cover;
  border-radius: 10px;
  border: 1.5px solid #d0e6ff;
  box-shadow: 0 2px 8px 0 #b3d8ff33;
`;

const FilePreviewInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const FileName = styled.div`
  font-weight: 700;
  margin-bottom: 0.18rem;
  color: #2266aa;
  word-break: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1.08rem;
`;

const FileSize = styled.div`
  font-size: 0.85rem;
  color: #3390ec;
  font-weight: 500;
`;

const UploadProgress = styled.div`
  width: 100%;
  height: 7px;
  background: #e3f0ff;
  border-radius: 4px;
  margin-top: 0.6rem;
  overflow: hidden;
  box-shadow: 0 1.5px 6px 0 #b3d8ff33;
`;

const ProgressBar = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #3390ec 0%, #007bff 100%);
  border-radius: 4px;
  transition: width 0.22s cubic-bezier(.4,0,.2,1);
  width: ${props => props.progress}%;
  box-shadow: 0 1.5px 6px 0 #3390ec33;
`;

const RemoveFileButton = styled.button`
  background: linear-gradient(135deg, #e57373 0%, #f44336 100%);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  box-shadow: 0 2px 8px rgba(244,67,54,0.10);
  transition: all 0.22s cubic-bezier(.4,0,.2,1);
  outline: none;
  border: 2px solid transparent;
  &:hover {
    background: linear-gradient(135deg, #f44336 0%, #e57373 100%);
    border: 2px solid #e57373;
    transform: scale(1.13);
    box-shadow: 0 6px 24px 0 rgba(244,67,54,0.18);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const InputRow = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMobile'
})`
  display: flex;
  align-items: flex-end;
  gap: ${props => props.isMobile ? '8px' : '0.5rem'};
  width: 100%;
  max-width: 100%;
  ${props => props.isMobile && `
    flex-wrap: wrap;
  `}
`;

const InputActions = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const ActionButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMobile'
})`
  background: none;
  border: none;
  cursor: pointer;
  padding: ${props => props.isMobile ? '12px' : '0.75rem'};
  border-radius: 50%;
  color: #6c757d;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: ${props => props.isMobile ? '48px' : 'auto'};
  min-height: ${props => props.isMobile ? '48px' : 'auto'};

  &:hover {
    background: #f8f9fa;
    color: #007bff;
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  svg {
    width: ${props => props.isMobile ? '24px' : '18px'};
    height: ${props => props.isMobile ? '24px' : '18px'};
  }
`;

const SendButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const SendButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMobile' && prop !== 'single'
})`
  background: linear-gradient(120deg, #e3f0ff 0%, #cbe7ff 100%);
  color: #225;
  border: none;
  border-radius: ${props => props.isMobile ? '24px' : '15px 0 0 15px'};
  min-width: ${props => props.isMobile ? '56px' : '56px'};
  height: ${props => props.isMobile ? '48px' : '44px'};
  padding: ${props => props.isMobile ? '12px 20px' : '0 20px'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: ${props => props.isMobile ? '1rem' : '1.06rem'};
  box-shadow: 0 2.5px 14px 0 rgba(80,140,255,0.13), 0 1.5px 0.5px 0 rgba(255,255,255,0.13) inset;
  backdrop-filter: blur(5px);
  transition: all 0.15s cubic-bezier(.4,0,.2,1);
  position: relative;

  ${props => props.single && `
    border-radius: ${props.isMobile ? '24px' : '15px'};
  `}

  &:hover:not(:disabled) {
    background: linear-gradient(120deg, #d2e7ff 0%, #e3f0ff 100%);
    color: #113366;
    box-shadow: 0 5px 18px 0 rgba(80,140,255,0.18);
    transform: translateY(-1.5px) scale(1.03);
  }

  &:active:not(:disabled) {
    background: #e3f0ff;
    color: #0d223a;
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
`;

const ScheduleButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMobile'
})`
  background: linear-gradient(120deg, #e3f0ff 0%, #cbe7ff 100%);
  color: #225;
  border: none;
  border-radius: ${props => props.isMobile ? '24px' : '0 15px 15px 0'};
  width: ${props => props.isMobile ? '48px' : '44px'};
  height: ${props => props.isMobile ? '48px' : '44px'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2.5px 14px 0 rgba(80,140,255,0.13), 0 1.5px 0.5px 0 rgba(255,255,255,0.13) inset;
  backdrop-filter: blur(5px);
  transition: all 0.15s cubic-bezier(.4,0,.2,1);
  position: relative;
  border-left: ${props => props.isMobile ? 'none' : '1px solid rgba(34, 37, 85, 0.1)'};

  &:hover:not(:disabled) {
    background: linear-gradient(120deg, #d2e7ff 0%, #e3f0ff 100%);
    color: #113366;
    box-shadow: 0 5px 18px 0 rgba(80,140,255,0.18);
    transform: translateY(-1.5px) scale(1.03);
  }

  &:active:not(:disabled) {
    background: #e3f0ff;
    color: #0d223a;
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
`;

const EmojiPicker = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isMobile'
})`
  position: ${props => props.isMobile ? 'fixed' : 'absolute'};
  bottom: ${props => props.isMobile ? '80px' : '70px'};
  ${props => props.isMobile ? `
    left: 50%;
    transform: translateX(-50%);
    right: auto;
  ` : `
    right: 20px;
  `}
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  z-index: 1000;
  width: ${props => props.isMobile ? 'calc(100vw - 32px)' : '480px'};
  max-width: ${props => props.isMobile ? '400px' : '520px'};
  max-height: ${props => props.isMobile ? '300px' : '380px'};
  overflow-y: auto;
  min-width: ${props => props.isMobile ? '300px' : '420px'};

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
  grid-template-columns: repeat(12, 1fr);
  gap: 0.5rem;
  padding: 0.2rem 0.2rem 0 0.2rem;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const ErrorMessage = styled.div`
  background: #fee;
  color: #c33;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.75rem;
  border: 1px solid #fcc;
  font-size: 0.85rem;
`;

// Расширенный набор эмодзи
const emojis = [
  '😊', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', 
  '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
  '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
  '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😔', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩',
  '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯',
  '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟',
  '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
  '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤝',
  '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
  '💘', '💝', '💟', '♥️', '💯', '💢', '💥', '💫',
  '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️',
  '💭', '💤', '🔥', '⭐', '🌟', '✨', '⚡', '☄️',
  '💥', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫',
  '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷',
  '🎉', '🎊', '🎈', '🎁', '🎀', '🎗️', '🎟️', '🎫',
  '🎖️', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '🏀',
  '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
  '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃',
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
  '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅',
  '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽',
  '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥖',
  '🍞', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈', '🥞',
  '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔',
  '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸',
  '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦',
  '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺',
  '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌',
  '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️'
];

export default function MessageInput({ isMobile = false }) {
  // Состояния для модалки создания голосования
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showTemplatesPicker, setShowTemplatesPicker] = useState(false);
  
  // Состояния для планирования сообщений
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledTemplateContent, setScheduledTemplateContent] = useState('');
  const quickPollTemplates = [
    {
      question: 'У всех не работает 1с?',
      options: ['Да', 'Нет']
    },
    {
      question: 'Удаленка у всех глючит?',
      options: ['Да', 'Нет']
    },
    // Добавьте другие шаблоны по необходимости
  ];

  

  const [showQuickPollMenu, setShowQuickPollMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const { state, dispatch } = useApp();
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Загрузка быстрых шаблонов по департаменту пользователя
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/templates/for-me');
        if (!cancelled) setDeptTemplates(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        // тихо игнорируем
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Подстраховка: отправляем отложенное сообщение по событиям сокета
  useEffect(() => {
    const tryFlushPending = (chat) => {
      if (!pendingMessage) return;
      const realChatIdRaw = chat?.id || state.currentChat?.id;
      const realChatId = Number(realChatIdRaw);
      const isTemp = !realChatId || String(realChatId).startsWith('temp_private_');
      if (isTemp) return;
      if (!window.socket || !window.socket.connected) return;
      // На всякий случай присоединимся к комнате чата перед отправкой
      window.socket.emit('join_chat', realChatId);
      const messageData = {
        chatId: realChatId,
        content: pendingMessage,
        messageType: 'text',
        fileInfo: null,
        replyToId: state.replyToMessage?.id || null
      };
      // Небольшая задержка, чтобы сервер успел добавить участников в чат
      setTimeout(() => {
        window.socket.emit('send_message', messageData);
      }, 200);
      playNotificationSound(0.3);
      setPendingMessage('');
      dispatch({ type: 'SET_REPLY_TO_MESSAGE', payload: null });
    };

    const onPrivateCreated = (data) => {
      tryFlushPending(data?.chat);
    };
    const onChatExists = (chat) => {
      tryFlushPending(chat);
    };

    if (window.socket) {
      window.socket.on('private_chat_created', onPrivateCreated);
      window.socket.on('chat_exists', onChatExists);
    }
    return () => {
      if (window.socket) {
        window.socket.off('private_chat_created', onPrivateCreated);
        window.socket.off('chat_exists', onChatExists);
      }
    };
  }, [pendingMessage, state.replyToMessage?.id]);

  // Если сообщение было поставлено в очередь во время создания приватного чата,
  // отправляем его сразу после того, как у текущего чата появится реальный id
  useEffect(() => {
    const chat = state.currentChat;
    if (!chat) return;
    const isTemp = String(chat.id).startsWith('temp_private_');
    if (!isTemp && pendingMessage && window.socket && window.socket.connected) {
      const messageData = {
        chatId: chat.id,
        content: pendingMessage,
        messageType: 'text',
        fileInfo: null,
        replyToId: state.replyToMessage?.id || null
      };
      window.socket.emit('send_message', messageData);
      playNotificationSound(0.3);
      setPendingMessage('');
      dispatch({ type: 'SET_REPLY_TO_MESSAGE', payload: null });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        window.socket.emit('stop_typing', { chatId: chat.id });
      }
    }
  }, [state.currentChat?.id]);

  const handleSendPoll = (poll) => {
  if (!state.currentChat) return;
  if (String(state.currentChat.id).startsWith('temp_private_')) {
    setError('Создаётся приватный чат, подождите...');
    return;
  }
  if (!window.socket || !window.socket.connected) return;

  const pollData = {
    chatId: state.currentChat.id,
    content: poll.question,
    messageType: 'poll',
    pollOptions: poll.options,
    fileInfo: null,
    replyToId: state.replyToMessage?.id || null,
  };

  window.socket.emit('send_message', pollData);
  playNotificationSound(0.3);
  setMessage('');
  dispatch({ type: 'SET_REPLY_TO_MESSAGE', payload: null });
  setError('');
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
    window.socket.emit('stop_typing', { chatId: state.currentChat.id });
  }
};
// Преобразует HTML с картинками эмодзи обратно в коды
const convertHtmlToEmojiCodes = (html) => {
  if (!html) return '';
  
  // Создаем временный div для парсинга HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Находим все img с data-token и заменяем на коды
  const images = tempDiv.querySelectorAll('img[data-token]');
  images.forEach(img => {
    const token = img.getAttribute('data-token');
    if (token) {
      img.outerHTML = token;
    }
  });
  
  return tempDiv.textContent || tempDiv.innerText || '';
};

  const handleSend = () => {
    if ((!message.trim() && !state.filePreview) || !state.currentChat) {
      return;
    }
    console.log('[MessageInput] handleSend called', {
      currentChatId: state.currentChat?.id,
      isTemp: String(state.currentChat?.id || '').startsWith('temp_private_'),
      hasFile: !!state.filePreview,
      socketConnected: !!(window.socket && window.socket.connected)
    });
    // Больше не создаём временных чатов — проверка лишняя
    if (!window.socket) {
      setError('Нет соединения с сервером');
      console.error('[MessageInput] window.socket is undefined');
      return;
    }
    if (!window.socket.connected) {
      setError('Соединение с сервером потеряно');
      console.error('[MessageInput] socket is not connected');
      return;
    }
    const chatId = Number(state.currentChat.id);
    // Подстраховка: присоединяемся к комнате и небольшая задержка
    window.socket.emit('join_chat', chatId);
    const messageData = {
      chatId,
      content: message.trim(),
      messageType: state.filePreview ? 'file' : 'text',
      fileInfo: state.filePreview,
      replyToId: state.replyToMessage?.id || null
    };
    setTimeout(() => {
      window.socket.emit('send_message', messageData);
    }, 150);
    playNotificationSound(0.3);
    setMessage('');
    // Очищаем contentEditable элемент
    if (textareaRef.current) {
      textareaRef.current.innerHTML = '';
    }
    dispatch({ type: 'SET_FILE_PREVIEW', payload: null });
    dispatch({ type: 'SET_REPLY_TO_MESSAGE', payload: null });
    setError('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      window.socket.emit('stop_typing', { chatId: state.currentChat.id });
    }
    // Не добавляем сообщение в state.messages вручную! Ждём событие new_message от сервера.
  };

  // Функция для планирования сообщения
  const handleScheduleMessage = (scheduleData) => {
    if (!state.currentChat) return;
    
    console.log('[MessageInput] Scheduling message:', scheduleData);
    
    const messageData = {
      chatId: Number(state.currentChat.id),
      content: scheduleData.content,
      scheduledFor: scheduleData.scheduledFor,
      messageType: state.filePreview ? 'file' : 'text',
      fileInfo: state.filePreview,
      replyToId: state.replyToMessage?.id || null,
      repeatType: scheduleData.repeatType || 'none',
      repeatDays: scheduleData.repeatDays || null,
      repeatUntil: scheduleData.repeatUntil || null,
      timezoneOffset: scheduleData.timezoneOffset || 0
    };
    
    if (window.socket && window.socket.connected) {
      window.socket.emit('schedule_message', messageData);
      
      // Очищаем форму
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.innerHTML = '';
      }
      dispatch({ type: 'SET_FILE_PREVIEW', payload: null });
      dispatch({ type: 'SET_REPLY_TO_MESSAGE', payload: null });
      setError('');
      
      // Показываем уведомление
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: `Сообщение запланировано на ${new Date(scheduleData.scheduledFor).toLocaleString('ru-RU')}`
        }
      });
    } else {
      setError('Нет соединения с сервером');
    }
  };

  const handleKeyPress = (e) => {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  } else {
    handleTyping();
  }
};

// Разрешить вставку изображений из буфера обмена (Ctrl+V) с автоматической загрузкой
useEffect(() => {
  const el = textareaRef.current;
  if (!el) return;

  const onPaste = async (e) => {
    try {
      const items = e.clipboardData?.items || [];
      const images = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it && it.kind === 'file') {
          const f = it.getAsFile();
          const type = f?.type || 'image/png';
          if (f && /^image\/(jpeg|jpg|png|gif|webp|bmp)$/i.test(type)) {
            Object.defineProperty(f, 'type', { value: type, configurable: true });
            images.push(f);
          }
        }
      }
      if (images.length === 0) return;

      e.preventDefault();
      const file = images[0];

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('Файл слишком большой. Максимальный размер: 10MB');
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      setError('');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('originalName', file.name || 'pasted-image');
      try {
        const response = await api.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });
        const fileData = {
          ...response.data,
          originalName: response.data.originalName || file.name || 'pasted-image',
          mimetype: response.data.mimetype || file.type
        };
        dispatch({ type: 'SET_FILE_PREVIEW', payload: fileData });
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Изображение вставлено и загружено' } });
      } catch (error) {
        let errorMessage = 'Ошибка загрузки изображения';
        if (error.response?.data?.message) errorMessage = error.response.data.message;
        else if (error.message) errorMessage = error.message;
        setError(errorMessage);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    } catch (err) {
    }
  };

  el.addEventListener('paste', onPaste);
  return () => {
    el.removeEventListener('paste', onPaste);
  };
}, []);

const handleTyping = useCallback(
  debounce(() => {
    if (!state.currentChat || !window.socket) return;
    window.socket.emit('typing', { chatId: state.currentChat.id });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      window.socket.emit('stop_typing', { chatId: state.currentChat.id });
    }, 1000);
  }, 300),
  [state.currentChat]
);

const handleFileSelect = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    setError('Файл слишком большой. Максимальный размер: 10MB');
    return;
  }
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-rar-compressed'
  ];
  if (!allowedTypes.includes(file.type)) {
    setError('Неподдерживаемый тип файла');
    return;
  }
  setUploading(true);
  setUploadProgress(0);
  setError('');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('originalName', file.name);
  try {
    const response = await api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      }
    });
    const fileData = {
      ...response.data,
      originalName: response.data.originalName || file.name,
      mimetype: response.data.mimetype || file.type
    };
    dispatch({ type: 'SET_FILE_PREVIEW', payload: fileData });
    dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Файл успешно загружен' } });
  } catch (error) {
    let errorMessage = 'Ошибка загрузки файла';
    if (error.response?.data?.message) errorMessage = error.response.data.message;
    else if (error.message) errorMessage = error.message;
    setError(errorMessage);
  } finally {
    setUploading(false);
    setUploadProgress(0);
    e.target.value = '';
  }
};

  const handleEmojiSelect = (emoji) => {
    if (!textareaRef.current) return;
    textareaRef.current.focus();
    
    const str = String(emoji || '');
    
    if (str.startsWith('custom:')) {
      // Для кастомных эмодзи - вставляем как картинку
      const url = `/uploads/emojis/${str.replace('custom:emoji-', 'emoji-')}.jpg`;
      const img = document.createElement('img');
      img.src = url;
      img.alt = str;
      img.setAttribute('data-custom-emoji', 'true');
      img.setAttribute('data-token', str);
      img.style.width = '24px';
      img.style.height = '24px';
      img.style.objectFit = 'cover';
      img.style.verticalAlign = 'middle';
      img.style.margin = '0 2px';
      img.style.borderRadius = '6px';
      
      const range = window.getSelection && window.getSelection().getRangeAt && window.getSelection().rangeCount > 0 ? window.getSelection().getRangeAt(0) : null;
      if (range) {
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.setEndAfter(img);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        textareaRef.current.appendChild(img);
      }
    } else {
      // Для обычных эмодзи - вставляем как текст
      document.execCommand('insertText', false, str);
    }
    
    const currentHtml = textareaRef.current ? textareaRef.current.innerHTML : '';
    setMessage(currentHtml);
    dispatch({ type: 'CLOSE_EMOJI_PICKER' });
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!state.currentChat) return null;

  const handleSendQuickTemplate = (tpl) => {
    setShowTemplatesPicker(false);
    if (!state.currentChat) return;
    if (!window.socket || !window.socket.connected) return;

    // Если tpl — объект с вопросом и вариантами, отправляем как poll
    if (String(state.currentChat.id).startsWith('temp_private_')) {
      setError('Создаётся приватный чат, подождите...');
      return;
    }
    if (typeof tpl === 'object' && tpl.question && tpl.options) {
      const pollData = {
        chatId: state.currentChat.id,
        content: tpl.question,
        messageType: 'poll',
        pollOptions: tpl.options,
        fileInfo: null,
        replyToId: state.replyToMessage?.id || null
      };
      window.socket.emit('send_message', pollData);
    } else {
      // Если просто текст — отправляем как обычное сообщение
      const messageData = {
        chatId: state.currentChat.id,
        content: tpl,
        messageType: 'text',
        fileInfo: null,
        replyToId: state.replyToMessage?.id || null
      };
      window.socket.emit('send_message', messageData);
    }

    playNotificationSound(0.3);
    setMessage('');
    dispatch({ type: 'SET_REPLY_TO_MESSAGE', payload: null });
    setError('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      window.socket.emit('stop_typing', { chatId: state.currentChat.id });
    }
  };

  // Функция для отправки шаблона напрямую
  const handleSendTemplate = (templateContent, templateType) => {
    if (!state.currentChat) return;
    if (!window.socket || !window.socket.connected) return;

    if (String(state.currentChat.id).startsWith('temp_private_')) {
      setError('Создаётся приватный чат, подождите...');
      return;
    }

    const messageData = {
      chatId: state.currentChat.id,
      content: templateContent,
      messageType: 'template',
      templateType: templateType, // urgent, important, info
      fileInfo: null,
      replyToId: state.replyToMessage?.id || null
    };

    window.socket.emit('send_message', messageData);
    playNotificationSound(0.3);
    setMessage('');
    dispatch({ type: 'SET_REPLY_TO_MESSAGE', payload: null });
    setError('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      window.socket.emit('stop_typing', { chatId: state.currentChat.id });
    }
  };

  return (
  <InputContainer isMobile={isMobile}>
    {error && <ErrorMessage>{error}</ErrorMessage>}

    {state.replyToMessage && (
      <ReplyPreview>
        {state.replyToMessage.avatar && (
          <img
            src={state.replyToMessage.avatar}
            alt="avatar"
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', marginRight: 10, boxShadow: '0 2px 8px #2196f344' }}
          />
        )}
        <ReplyInfo>
          <ReplyAuthor>Ответ для {state.replyToMessage.username}</ReplyAuthor>
          <ReplyContent>{state.replyToMessage.content}</ReplyContent>
        </ReplyInfo>
        <CloseReplyButton onClick={() => dispatch({ type: 'SET_REPLY_TO_MESSAGE', payload: null })}>
          <FiX size={16} />
        </CloseReplyButton>
      </ReplyPreview>
    )}

    {state.filePreview && (
      <FilePreview>
        <FilePreviewContent>
          {state.filePreview.mimetype?.startsWith('image/') ? (
            <FilePreviewImage
              src={state.filePreview.url}
              alt={state.filePreview.originalName || 'Изображение'}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div style={{ fontSize: '2.5rem' }}>📎</div>
          )}
          <FilePreviewInfo>
            <FileName>{state.filePreview.originalName || 'Файл'}</FileName>
            <FileSize>{formatFileSize(state.filePreview.size)}</FileSize>
            {uploading && (
              <UploadProgress>
                <ProgressBar progress={uploadProgress} />
              </UploadProgress>
            )}
          </FilePreviewInfo>
        </FilePreviewContent>
        <RemoveFileButton onClick={() => dispatch({ type: 'SET_FILE_PREVIEW', payload: null })} disabled={uploading}>×</RemoveFileButton>
      </FilePreview>
    )}

    <InputRow style={{ position: 'relative' }} isMobile={isMobile}>
      <InputActions>
        <ActionButton isMobile={isMobile} onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Прикрепить файл">
          <FiPaperclip size={isMobile ? 24 : 18} />
        </ActionButton>

        <EmojiInput onEmojiSelect={handleEmojiSelect} placeholder="Выберите эмодзи" />
        
        <ActionButton 
          isMobile={isMobile}
          onClick={() => setShowTemplatesPicker(v => !v)} 
          disabled={uploading} 
          title="Быстрые шаблоны сообщений"
          style={{
            backgroundColor: showTemplatesPicker ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: showTemplatesPicker ? '#3b82f6' : '#6b7280'
          }}
        >
          <FiFileText size={isMobile ? 24 : 18} />
        </ActionButton>
      </InputActions>



      <PollButton isMobile={isMobile} type="button" onClick={() => setShowCreatePoll(true)} title="Быстрое голосование">
        🗳️ Быстрое голосование
      </PollButton>

      {showCreatePoll && (
        <CreatePollModalOverlay style={isMobile ? { padding: '16px' } : {}}>
          <CreatePollModal style={isMobile ? { width: 'calc(100vw - 32px)', maxWidth: '500px', padding: '20px' } : {}}>
            <PollTitle>Создать голосование</PollTitle>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) return;
                if (!state.currentChat || !window.socket || !window.socket.connected) return;
                const pollData = {
                  chatId: state.currentChat.id,
                  content: pollQuestion.trim(),
                  messageType: 'poll',
                  pollOptions: pollOptions.map(opt => opt.trim()),
                  fileInfo: null,
                  replyToId: state.replyToMessage?.id || null,
                };
                window.socket.emit('send_message', pollData);
                playNotificationSound(0.3);
                setShowCreatePoll(false);
                setPollQuestion('');
                setPollOptions(['', '']);
                dispatch({ type: 'SET_REPLY_TO_MESSAGE', payload: null });
                setError('');
                if (typingTimeoutRef.current) {
                  clearTimeout(typingTimeoutRef.current);
                  window.socket.emit('stop_typing', { chatId: state.currentChat.id });
                }
              }}
              style={{ width: '100%' }}
            >
              <PollFormLabel htmlFor="poll-question">Тема голосования</PollFormLabel>
              <PollFormInput
                id="poll-question"
                type="text"
                value={pollQuestion}
                onChange={e => setPollQuestion(e.target.value)}
                placeholder="Введите тему..."
                required
                maxLength={120}
                autoFocus
              />
              <PollFormLabel>Варианты ответа</PollFormLabel>
              {pollOptions.map((opt, idx) => (
                <PollFormOptionRow key={idx}>
                  <PollFormInput
                    type="text"
                    value={opt}
                    onChange={e => setPollOptions(
                      pollOptions.map((o, i) => i === idx ? e.target.value : o)
                    )}
                    placeholder={`Вариант ${idx + 1}`}
                    required
                    maxLength={60}
                  />
                  {pollOptions.length > 2 && (
                    <RemoveOptionBtn type="button" onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} title="Удалить вариант">×</RemoveOptionBtn>
                  )}
                </PollFormOptionRow>
              ))}
              <AddOptionBtn type="button" onClick={() => setPollOptions([...pollOptions, ''])}>+ Добавить вариант</AddOptionBtn>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.2rem' }}>
                <PollClose type="button" onClick={() => { setShowCreatePoll(false); setPollQuestion(''); setPollOptions(['', '']); }} title="Отмена">Отмена</PollClose>
                <PollOptionButton as="button" type="submit" style={{ minWidth: 120 }}>Создать</PollOptionButton>
              </div>
            </form>
          </CreatePollModal>
        </CreatePollModalOverlay>
      )}

      <div
        ref={textareaRef}
        contentEditable
        dir="ltr"
        onInput={(e) => {
          const html = e.currentTarget ? e.currentTarget.innerHTML : '';
          setMessage(html);
        }}
        onKeyPress={handleKeyPress}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          const html = e.currentTarget ? e.currentTarget.innerHTML : '';
          setMessage(html);
        }}
        suppressContentEditableWarning
        style={{ flex: 1, minHeight: isMobile ? 48 : 44, padding: isMobile ? '14px 18px' : '12px 16px', borderRadius: isMobile ? 24 : 20, border: '1px solid #dee2e6', background: '#fff', fontSize: isMobile ? '16px' : '1rem', outline: 'none', overflowY: 'auto', textAlign: 'left', direction: 'ltr', unicodeBidi: 'bidi-override', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', color: '#2c3e50', boxSizing: 'border-box', maxWidth: '100%', width: '100%', maxHeight: '120px', lineHeight: isMobile ? '1.5' : 'normal' }}
      />

      <SendButtonGroup>
        <SendButton 
          isMobile={isMobile}
          onClick={handleSend} 
          disabled={(!message.trim() && !state.filePreview) || uploading} 
          title="Отправить сейчас"
          single={!message.trim() && !state.filePreview}
        >
          <span style={{ fontWeight: 600, letterSpacing: '0.01em', marginRight: 6, color: '#225' }}>Отправить</span>
          <FiArrowRight size={isMobile ? 20 : 22} color="#225" />
        </SendButton>
        
        {(message.trim() || state.filePreview) && !uploading && (
          <ScheduleButton 
            isMobile={isMobile}
            onClick={() => setShowScheduleModal(true)}
            title="Запланировать отправку"
          >
            <FiClock size={isMobile ? 20 : 18} color="#225" />
          </ScheduleButton>
        )}
      </SendButtonGroup>
    </InputRow>

    {state.showEmojiPicker && (
      <EmojiPicker className="emoji-picker" isMobile={isMobile}>
        <EmojiGrid className="emoji-grid">
          {emojis.map((emoji, index) => (
            <Emoji
              key={index}
              size="2.2rem"
              clickable
              onClick={() => handleEmojiSelect(emoji)}
              title={`Добавить ${emoji}`}
              style={{
                padding: '0.8rem',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '55px',
                minHeight: '55px',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f8f9fa';
                e.target.style.transform = 'scale(1.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.transform = 'scale(1)';
              }}
            >
              {emoji}
            </Emoji>
          ))}
        </EmojiGrid>
      </EmojiPicker>
    )}

    <HiddenFileInput
      ref={fileInputRef}
      type="file"
      onChange={handleFileSelect}
      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
    />

    <TemplatesQuickPicker
      isOpen={showTemplatesPicker}
      onClose={() => setShowTemplatesPicker(false)}
      onSelectTemplate={(templateContent) => {
        setMessage(prev => (prev ? (prev + (prev.endsWith('\n') ? '' : '\n') + templateContent) : templateContent));
      }}
      onSendTemplate={(templateContent, templateType) => {
        handleSendTemplate(templateContent, templateType);
        setShowTemplatesPicker(false);
      }}
      onScheduleTemplate={(templateContent) => {
        setScheduledTemplateContent(templateContent || '');
        setShowScheduleModal(true);
        setShowTemplatesPicker(false);
      }}
    />

    <ScheduledMessageModal
      isOpen={showScheduleModal}
      onClose={() => { setShowScheduleModal(false); setScheduledTemplateContent(''); }}
      messageContent={scheduledTemplateContent || message}
      onSchedule={handleScheduleMessage}
    />
  </InputContainer>
);
}