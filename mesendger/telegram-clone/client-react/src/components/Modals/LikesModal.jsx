import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useApp } from '../../context/AppContext';
import { Modal, ModalContent, CloseButton, Avatar } from '../../styles/GlobalStyles';
import { useEmojiSettings } from '../../hooks/useEmojiSettings';
import { FiX, FiHeart } from 'react-icons/fi';
import Emoji from '../Common/Emoji';

// Импорт эмодзи из папки Smile - ОЧИЩЕНО
const SMILE_IMAGES = [];

function mapIconNameToEmoji(fileName) {
  // Все эмодзи очищены - функция возвращает пустую строку
  return '';
}

const EMOJI_TO_ICON = SMILE_IMAGES.reduce((acc, img) => {
  const emoji = mapIconNameToEmoji(img.name);
  if (!acc[emoji]) acc[emoji] = img.src;
  return acc;
}, {});
function useCustomEmojiMap() {
  const [map, setMap] = useState({});
  useEffect(() => {
    fetch('/api/emojis/list').then(r => r.json()).then(list => {
      const m = {}; (Array.isArray(list) ? list : []).forEach(e => { m[`custom:${e.name}`] = e.url; });
      setMap(m);
    }).catch(()=>{});
  }, []);
  return map;
}
const ModalTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const LikesList = styled.div`
  max-height: 400px;
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

const LikeItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #f8f9fa;
  transition: background 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f8f9fa;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
`;

const UserDetails = styled.div`
  flex: 1;
`;

const Username = styled.div`
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
`;

const LikeTime = styled.div`
  font-size: 0.8rem;
  color: #6c757d;
`;

const LikeIcon = styled.div`
  font-size: 1.5rem;
  color: #e74c3c;
  animation: pulse 2s infinite;

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6c757d;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #6c757d;
`;

const StatsContainer = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  text-align: center;
`;

const StatsText = styled.div`
  color: #6c757d;
  font-size: 0.9rem;
`;


export default function LikesModal({ open, onClose, likes = [], emoji, messageId }) {
  const emojiSettings = useEmojiSettings();
  const customEmojiMap = useCustomEmojiMap();
  
  if (!open) return null;
  // likes: только для выбранного emoji
  // emoji, messageId — для информации, если нужно
  // onClose — функция закрытия

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now - date) / (1000 * 60);
    
    if (diffInMinutes < 1) {
      return 'только что';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)} мин назад`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} ч назад`;
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <FiX />
        </CloseButton>

        <ModalTitle>
          <FiHeart color="#e74c3c" />
          Лайки {emoji ? (
            <span style={{fontSize:'1.2em',marginLeft:6}}>
              {(customEmojiMap[emoji] || (useEmojiSettings().showStandardEmojis !== false && !JSON.parse(localStorage.getItem('emojiBlacklist')||'[]').includes(`std|${emoji}`) && EMOJI_TO_ICON[emoji])) ? (
                <img 
                  src={customEmojiMap[emoji] || EMOJI_TO_ICON[emoji]} 
                  alt={emoji} 
                  style={{ 
                    width: emojiSettings.customEmojiInModal, 
                    height: emojiSettings.customEmojiInModal,
                    objectFit: 'cover',
                    borderRadius: '6px',
                    imageRendering: 'crisp-edges'
                  }} 
                />
              ) : (
                emoji
              )}
            </span>
          ) : null}
        </ModalTitle>

        {likes.length > 0 && (
          <StatsContainer>
            <StatsText>
              {likes.length} {likes.length === 1 ? 'лайк' : likes.length < 5 ? 'лайка' : 'лайков'}
            </StatsText>
          </StatsContainer>
        )}

        <LikesList>
          {likes.length === 0 ? (
            null
          ) : (
            likes.map((like, index) => (
              <LikeItem key={`${like.user_id}-${index}`}>
                <UserInfo>
                  <Avatar size="40px">
                    {like.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <UserDetails>
                    <Username>{like.username}</Username>
                    <LikeTime>{formatTime(like.created_at)}</LikeTime>
                  </UserDetails>
                </UserInfo>
                <LikeIcon>
                  {(customEmojiMap[emoji] || (useEmojiSettings().showStandardEmojis !== false && !JSON.parse(localStorage.getItem('emojiBlacklist')||'[]').includes(`std|${emoji}`) && EMOJI_TO_ICON[emoji])) ? (
                    <img 
                      src={customEmojiMap[emoji] || EMOJI_TO_ICON[emoji]} 
                      alt={emoji} 
                      style={{ 
                        width: emojiSettings.customEmojiInModal, 
                        height: emojiSettings.customEmojiInModal,
                        objectFit: 'cover',
                        borderRadius: '6px',
                        imageRendering: 'crisp-edges'
                      }} 
                    />
                  ) : (
                    '❤️'
                  )}
                </LikeIcon>
              </LikeItem>
            ))
          )}
        </LikesList>
      </ModalContent>
    </Modal>
  );
}