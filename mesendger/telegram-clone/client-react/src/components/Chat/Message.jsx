import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../../styles/GlobalStyles';
import LikesModal from '../Modals/LikesModal';
import EmojiPicker from '../Common/EmojiPicker';
import { useEmojiSettings } from '../../hooks/useEmojiSettings';
import EmojiOnlyMessage, { isEmojiOnlyMessage } from './EmojiOnlyMessage';
import ForwardedMessage from './ForwardedMessage';
import { formatMessageTime } from '../../utils/timeFormatter';
import { 
  ModernMessageContainer, 
  ModernMessageBubble, 
  ModernMessageText, 
  ModernUsername, 
  ModernTimestamp 
} from './ModernMessageBubble';
import { FaRegDotCircle, FaRegCircle, FaCheckCircle, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { FiCornerUpLeft, FiTrash2, FiDownload, FiZap, FiAlertTriangle, FiInfo, FiShare2, FiBookmark } from 'react-icons/fi';
import excelIcon from '../../assets/icons/excel.png';
import pdfIcon from '../../assets/icons/pdf.png';
import wordIcon from '../../assets/icons/word.png';
import rarIcon from '../../assets/icons/rar.png';
// Динамический импорт всех иконок из папки Smile - ОЧИЩЕНО
// Все стоковые эмодзи удалены
const SMILE_IMAGES = [];

function mapIconNameToEmoji(fileName) {
  // Все эмодзи очищены - функция возвращает пустую строку
  return '';
}

const EMOJI_TO_ICON = SMILE_IMAGES.reduce((acc, img) => {
  const emoji = mapIconNameToEmoji(img.name);
  if (!acc[emoji]) acc[emoji] = img.src; // берем первый встреченный как представителя
  return acc;
}, {});

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

// --- PollMessage ---
const PollBox = styled.div`
  background: linear-gradient(145deg, #1a1f2e 0%, #2d3748 50%, #1a202c 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.4),
    0 8px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  min-width: 280px;
  max-width: 380px;
  margin: 0.5em 0;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  backdrop-filter: blur(10px);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    border-radius: 24px 24px 0 0;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(145deg, #667eea, #764ba2, #f093fb);
    border-radius: 26px;
    z-index: -1;
    opacity: 0.1;
  }
`;

const PollTitle = styled.div`
  font-size: 1.3rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  
  &::before {
    content: '🗳️';
    font-size: 1.5rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    border-radius: 1px;
    opacity: 0.6;
  }
  
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.02em;
`;

const PollOption = styled.button.withConfig({
  shouldForwardProp: (prop) => !['selected', 'active', 'percent', 'hasSelection'].includes(prop)
})`
  background: ${({ selected }) => 
    selected 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
      : 'rgba(255, 255, 255, 0.05)'
  };
  color: ${({ selected }) => selected ? '#fff' : '#e2e8f0'};
  border: 1px solid ${({ selected }) => 
    selected 
      ? 'rgba(102, 126, 234, 0.5)' 
      : 'rgba(255, 255, 255, 0.1)'
  };
  border-radius: 16px;
  padding: 1rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${({ percent }) => percent || 0}%;
    background: linear-gradient(135deg, 
      rgba(102, 126, 234, 0.2) 0%, 
      rgba(118, 75, 162, 0.2) 50%,
      rgba(240, 147, 251, 0.2) 100%
    );
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 15px;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 
      0 10px 25px rgba(102, 126, 234, 0.2),
      0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: rgba(102, 126, 234, 0.4);
    background: ${({ selected }) => 
      selected 
        ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' 
        : 'rgba(255, 255, 255, 0.08)'
    };
  }
  
  /* Дополнительные стили для невыбранных вариантов при наличии выбора */
  ${({ selected, hasSelection }) => !selected && hasSelection && `
    opacity: 0.7;
    
    &:hover:not(:disabled) {
      opacity: 1;
      border-color: rgba(102, 126, 234, 0.6);
      background: rgba(102, 126, 234, 0.1);
    }
  `}
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  &:active {
    transform: translateY(0) scale(0.98);
  }
  
  span:first-child {
    position: relative;
    z-index: 2;
    flex: 1;
    text-align: left;
  }
  
  span:last-child {
    position: relative;
    z-index: 2;
    font-weight: 700;
    font-size: 0.9rem;
    padding: 0.25rem 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    backdrop-filter: blur(5px);
  }
`;

const PollStats = styled.div`
  font-size: 1rem;
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  backdrop-filter: blur(5px);
  
  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
    
    .stat-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
    }
    
    .stat-voted {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }
    
    .stat-not-voted {
      background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      color: white;
    }
    
    .stat-text {
      flex: 1;
      font-weight: 600;
      color: #e2e8f0;
    }
    
    .stat-count {
      font-weight: 700;
      font-size: 1.1rem;
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
    }
  }
`;

const PollVotersToggle = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: #e2e8f0;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  margin-top: 0.5rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(102, 126, 234, 0.3);
    transform: translateY(-1px);
  }
  
  .toggle-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .toggle-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
  }
`;

const PollVotersList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  max-height: 150px;
  overflow-y: auto;
  
  .voter-card {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 0.4rem 0.75rem;
    font-size: 0.9rem;
    font-weight: 500;
    color: #e2e8f0;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.12);
      transform: translateY(-1px);
    }
    
    img {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
  }
`;

function PollMessage({ message, userId, participants }) {
  const { state } = useApp();
  const [showVoted, setShowVoted] = useState(false);
  const [showNotVoted, setShowNotVoted] = useState(false);

  const handleToggleVoted = () => {
    setShowVoted(v => {
      if (!v) setShowNotVoted(false);
      return !v;
    });
  };
  const handleToggleNotVoted = () => {
    setShowNotVoted(v => {
      if (!v) setShowVoted(false);
      return !v;
    });
  };

  const [selected, setSelected] = useState(null);
  const [votes, setVotes] = useState(message.pollVotes || {});
  const [voters, setVoters] = useState(message.pollVoters || []);
  const [closed, setClosed] = useState(message.pollClosed || false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!window.socket) return;
    const update = (data) => {
      if (data.messageId === message.id) {
        setVotes(data.pollVotes || {});
        setVoters(data.pollVoters || []);
        setClosed(!!data.pollClosed);
        // Если пришло обновление голосов, но участников нет — запросим их
        const chatId = state.currentChat?.id || message.chat_id;
        if ((!participants || participants.length === 0) && chatId && window.socket) {
          try { window.socket.emit('get_chat_participants', chatId); } catch (_) {}
        }
      }
    };
    if (window.socket && typeof window.socket.on === 'function') {
      window.socket.on('poll_update', update);
    }
    return () => {
      if (window.socket && typeof window.socket.off === 'function') {
        window.socket.off('poll_update', update);
      }
    };
  }, [message.id]);

  // Обеспечиваем наличие участников чата для отображения имён/аватарок в списке проголосовавших
  useEffect(() => {
    const chatId = state.currentChat?.id || message.chat_id;
    if (!window.socket || !chatId) return;
    if (!participants || participants.length === 0) {
      try { window.socket.emit('get_chat_participants', chatId); } catch (_) {}
    }
  }, [state.currentChat?.id]);

  // Если пользователь раскрывает список, а участников ещё нет — подтягиваем
  useEffect(() => {
    const chatId = state.currentChat?.id || message.chat_id;
    if (!window.socket || !chatId) return;
    if ((showVoted || showNotVoted) && (!participants || participants.length === 0)) {
      try { window.socket.emit('get_chat_participants', chatId); } catch (_) {}
    }
  }, [showVoted, showNotVoted, participants?.length, state.currentChat?.id]);

  useEffect(() => {
    if (!userId) return;
    for (const [idx, votersList] of Object.entries(votes)) {
      if (Array.isArray(votersList) && votersList.includes(userId)) {
        setSelected(Number(idx));
        break;
      }
    }
  }, [userId, votes]);

  // Получаем всех проголосовавших из голосов
  const allVotersFromVotes = Object.values(votes).flat().filter(Boolean);
  const uniqueVoters = [...new Set(allVotersFromVotes)]; // убираем дубликаты
  
  const totalParticipants = participants?.length || 0;
  const totalVotes = Object.values(votes).reduce((acc, arr) => acc + (arr?.length || 0), 0);
  const actualVoters = uniqueVoters.length > 0 ? uniqueVoters : voters;
  const notVoted = participants ? participants.filter(u => !actualVoters.includes(u.id)) : [];

  // Отладка
  console.log('Poll State:', {
    selected,
    votes,
    voters,
    uniqueVoters,
    userId,
    totalVotes,
    actualVoters: actualVoters.length
  });

  const handleVote = async (idx) => {
    if (closed) return;
    
    // Если пользователь уже выбрал этот вариант, ничего не делаем
    if (selected === idx) return;
    
    console.log('Попытка голосования:', {
      idx,
      selected,
      userId,
      messageId: message.id
    });
    
    setLoading(true);
    
    // Немедленно обновляем UI
    const previousSelected = selected;
    setSelected(idx);
    
    // Обновляем голоса локально
    setVotes(prev => {
      const newVotes = { ...prev };
      
      // Убираем голос с предыдущего варианта
      if (previousSelected !== null && newVotes[previousSelected]) {
        newVotes[previousSelected] = newVotes[previousSelected].filter(id => String(id) !== String(userId));
        console.log('Убрали голос с варианта', previousSelected);
      }
      
      // Добавляем голос к новому варианту
      if (!newVotes[idx]) {
        newVotes[idx] = [];
      }
      if (!newVotes[idx].some(id => String(id) === String(userId))) {
        newVotes[idx] = [...newVotes[idx], userId];
        console.log('Добавили голос к варианту', idx);
      }
      
      console.log('Новые голоса:', newVotes);
      return newVotes;
    });
    
    // Добавляем пользователя в список проголосовавших
    if (userId && !voters.includes(userId)) {
      setVoters(prev => [...prev, userId]);
    }
    
    try {
      // Отправляем на сервер (упрощаем формат)
      if (window.socket) {
        window.socket.emit('vote_poll', { 
          messageId: message.id, 
          optionIdx: idx
        });
        console.log('Отправили на сервер');
      }
    } catch (error) {
      console.error('Ошибка при голосовании:', error);
      // Откатываем изменения при ошибке
      setSelected(previousSelected);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PollBox>
      <PollTitle>{message.content}</PollTitle>
      {Array.isArray(message.pollOptions) && message.pollOptions.map((opt, idx) => {
        const count = votes[idx]?.length || 0;
        const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
        return (
          <PollOption
            key={idx}
            selected={selected === idx}
            hasSelection={selected !== null}
            disabled={closed}
            onClick={() => handleVote(idx)}
            percent={percent}
            title={
              closed 
                ? 'Голосование завершено' 
                : selected === idx 
                  ? 'Вы выбрали этот вариант' 
                  : selected !== null 
                    ? 'Нажмите, чтобы переголосовать' 
                    : 'Проголосовать'
            }
          >
            <span>{opt}</span>
            <span>{count} голосов • {percent}%</span>
          </PollOption>
        );
      })}
      
      <PollStats>
        <div className="stat-item">
          <div className="stat-icon stat-voted">✓</div>
          <span className="stat-text">Проголосовало</span>
          <span className="stat-count">{actualVoters.length} из {totalParticipants}</span>
        </div>
        <div className="stat-item">
          <div className="stat-icon stat-not-voted">○</div>
          <span className="stat-text">Не голосовали</span>
          <span className="stat-count">{notVoted.length}</span>
        </div>
      </PollStats>
      
      <div style={{marginTop: '1rem'}}>
        <PollVotersToggle onClick={handleToggleVoted}>
          <div className="toggle-left">
            <div className="toggle-icon stat-voted">✓</div>
            <span>Проголосовали: {actualVoters.length}</span>
          </div>
          {showVoted ? <FaChevronUp /> : <FaChevronDown />}
        </PollVotersToggle>
        {showVoted && actualVoters.length > 0 && (
          <PollVotersList>
            {actualVoters.map(uid => {
              const user = participants?.find(p => 
                String(p.id) === String(uid) || 
                String(p.user_id) === String(uid)
              );
              
              // console.log('Looking for user:', uid, 'Found:', user);
              
              // Если это текущий пользователь и его нет в participants
              if (!user && uid === userId && state.user) {
                const currentUser = state.user;
                const fullName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || 
                                currentUser.username || 
                                currentUser.name || 
                                'Вы';
                const avatarUrl = currentUser.avatarUrl || currentUser.avatar || currentUser.avatar_url;
                
                return (
                  <div key={uid} className="voter-card">
                    {avatarUrl && (
                      <img 
                        src={avatarUrl} 
                        alt="avatar" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <span>{fullName}</span>
                  </div>
                );
              }
              
              if (user) {
                // Формируем полное имя
                const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 
                                user.username || 
                                user.name || 
                                'Пользователь';
                                
                // Определяем аватарку
                const avatarUrl = user.avatarUrl || user.avatar || user.avatar_url;
                
                return (
                  <div key={uid} className="voter-card">
                    {avatarUrl && (
                      <img 
                        src={avatarUrl} 
                        alt="avatar" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <span>{fullName}</span>
                  </div>
                );
              }
              
              return (
                <div key={uid} className="voter-card">
                  <span>Пользователь (ID: {uid})</span>
                </div>
              );
            })}
          </PollVotersList>
        )}
        
        <PollVotersToggle onClick={handleToggleNotVoted} style={{marginTop: '0.5rem'}}>
          <div className="toggle-left">
            <div className="toggle-icon stat-not-voted">○</div>
            <span>Не голосовали: {notVoted.length}</span>
          </div>
          {showNotVoted ? <FaChevronUp /> : <FaChevronDown />}
        </PollVotersToggle>
        {showNotVoted && notVoted.length > 0 && (
          <PollVotersList>
            {notVoted.map(u => {
              // Формируем полное имя
              const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || 
                              u.username || 
                              u.name || 
                              'Пользователь';
                              
              // Определяем аватарку
              const avatarUrl = u.avatarUrl || u.avatar || u.avatar_url;
              
              return (
                <div key={u.id || u.user_id} className="voter-card">
                  {avatarUrl && (
                    <img 
                      src={avatarUrl} 
                      alt="avatar" 
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <span>{fullName}</span>
                </div>
              );
            })}
          </PollVotersList>
        )}
      </div>
    </PollBox>
  );
}

// Стили для emoji-only
const EmojiOnlyText = styled.div`
  font-size: 2.08rem;
  line-height: 1.1;
  background: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0.1em 0;
  display: inline-block;
  text-align: center;
  filter: none !important;
  animation: emojiBounceIn 380ms cubic-bezier(.2,.7,.3,1) both;
  transform-origin: center bottom;
  @keyframes emojiBounceIn {
    0% { opacity: 0; transform: translateY(6px) scale(0.7); filter: blur(1px); }
    60% { opacity: 1; transform: translateY(-2px) scale(1.15); }
    80% { transform: translateY(0) scale(0.95); }
    100% { transform: translateY(0) scale(1); }
  }
`;

const ImageMessage = styled.img`
  max-width: 440px;
  max-height: 440px;
  border-radius: 10px;
  margin-top: 0.12rem;
  box-shadow: 0 1.5px 8px 0 #3390ec22;
  cursor: pointer;
  object-fit: cover;
  background: #f8faff;
  transition: box-shadow 0.13s, border 0.13s, background 0.13s;
  &:hover {
    box-shadow: 0 3px 16px 0 #3390ec33;
    background: #e3f0ff;
    border: 1.5px solid #3390ec;
    transform: scale(1.01);
  }
`;

// Фильтрация пропсов для styled-components
const filterProps = (props) => {
  const { isOwn, isTemplate, isEmojiOnly, ...rest } = props;
  return rest;
};

const MessageContent = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn', 'isTemplate', 'isEmojiOnly'].includes(prop)
})`
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
`;

const MessageContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn'].includes(prop)
})`
  display: flex;
  align-items: flex-end;
  margin-bottom: 0.5rem;
  position: relative;
  animation: ${props => props.isOwn ? 'msgInRight 260ms cubic-bezier(.2,.7,.3,1) both' : 'msgInLeft 260ms cubic-bezier(.2,.7,.3,1) both'};
  &:hover .message-actions {
    opacity: 1;
  }
  @keyframes msgInLeft {
    from { opacity: 0; transform: translateY(8px) translateX(-6px) scale(0.98); filter: blur(2px); }
    to { opacity: 1; transform: none; filter: none; }
  }
  @keyframes msgInRight {
    from { opacity: 0; transform: translateY(8px) translateX(6px) scale(0.98); filter: blur(2px); }
    to { opacity: 1; transform: none; filter: none; }
  }
`;

const MessageBubble = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn', 'isTemplate', 'isEmojiOnly', 'templateType'].includes(prop)
})`
  background: ${props => {
    if (props.isTemplate) {
      switch (props.templateType) {
        case 'urgent': return 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
        case 'important': return 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)';
        case 'info': return 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)';
        default: return 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)';
      }
    }
    return 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)';
  }};
  border-radius: 12px;
  box-shadow: ${props => {
    if (props.isTemplate) {
      switch (props.templateType) {
        case 'urgent': return '0 6px 22px rgba(220, 38, 38, 0.35)';
        case 'important': return '0 6px 22px rgba(234, 88, 12, 0.35)';
        case 'info': return '0 6px 22px rgba(37, 99, 235, 0.35)';
        default: return '0 6px 22px rgba(37, 99, 235, 0.35)';
      }
    }
    return '0 4px 24px 0 rgba(33,150,243,0.18)';
  }};
  border: ${props => props.isTemplate ? '2px solid rgba(255,255,255,0.3)' : 'none'};
  padding: 1rem 1.5rem;
  margin: 0.2em 0;
  color: #fff;
  position: relative;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
  transition: all 0.3s ease;
`;

const Username = styled.span`
  font-weight: 800;
{{ ... }}
  color: ${props => props.$isTemplate ? '#ffffff' : '#ffe082'};
  letter-spacing: 0.01em;
  font-size: 1.08rem;
  opacity: 1;
`;

const Timestamp = styled.span.withConfig({
  shouldForwardProp: (prop) => !['isOwn'].includes(prop)
})`
  font-size: 0.7rem;
  color: ${props => (props.isOwn ? '#6dd5edcc' : '#b2bec3cc')};
`;

const MessageText = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn', 'isTemplate'].includes(prop)
})`
  font-family: 'Segoe UI', 'Arial', 'sans-serif';
  line-height: 1.4;
  font-size: ${props => (props.isTemplate ? '1.13rem' : '1.04rem')};
  font-weight: ${props => (props.isTemplate ? 900 : 400)};
  color: #fff;
  letter-spacing: 0.01em;
  opacity: 1;
  text-transform: ${props => (props.isTemplate ? 'uppercase' : 'none')};
  ${props => props.isTemplate ? 'text-shadow: 0 1px 8px rgba(255,60,60,0.35);' : ''};
`;

const ReplyInfo = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn'].includes(prop)
})`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: linear-gradient(90deg, #e6f5ff 60%, #f8fbff 100%);
  border-left: 4px solid #3390ec;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(51,144,236,0.08);
  padding: 10px 14px 10px 10px;
  margin-bottom: 8px;
  min-height: 38px;
  transition: background 0.2s;
`;

const MessageActions = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn'].includes(prop)
})`
  position: absolute;
  top: -15px;
  right: ${(props) => (props.isOwn ? 'auto' : '10px')};
  left: ${(props) => (props.isOwn ? '10px' : 'auto')};
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.3s ease;
  background: white;
  border-radius: 15px;
  padding: 5px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: #6c757d;

  &:hover {
    background: #f8f9fa;
    color: #007bff;
    transform: scale(1.1);
  }
`;

const PinButton = styled(ActionButton).withConfig({
  shouldForwardProp: (prop) => prop !== 'isPinned'
})`
  background: ${props => props.isPinned ? 'rgba(255, 212, 59, 0.15)' : 'rgba(0, 123, 255, 0.1)'};
  border: 1px solid ${props => props.isPinned ? 'rgba(255, 212, 59, 0.4)' : 'rgba(0, 123, 255, 0.3)'};
  color: ${props => props.isPinned ? '#ffd43b' : '#007bff'};
  font-weight: bold;
  
  &:hover {
    background: ${props => props.isPinned ? 'rgba(255, 212, 59, 0.25)' : 'rgba(0, 123, 255, 0.2)'};
    border-color: ${props => props.isPinned ? 'rgba(255, 212, 59, 0.6)' : 'rgba(0, 123, 255, 0.5)'};
    color: ${props => props.isPinned ? '#ffcc00' : '#0056b3'};
    transform: scale(1.15);
    box-shadow: 0 2px 8px ${props => props.isPinned ? 'rgba(255, 212, 59, 0.3)' : 'rgba(0, 123, 255, 0.3)'};
  }
`;

const MessageFooter = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOwn'
})`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: auto;
  background: none;
`;

const LikeButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['liked', 'isOwn'].includes(prop)
})`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.35rem;
  padding: 0 0.18rem;
  border-radius: 0;
  color: ${(props) => (props.liked ? '#e74c3c' : props.isOwn ? 'rgba(255,255,255,0.7)' : '#3390ec')};
  outline: none;
  box-shadow: none;
  position: relative;
  display: inline-flex;
  align-items: center;
  transition: color 0.18s;
  &:hover {
    color: #e74c3c;
    background: none;
    border: none;
    transform: scale(1.18);
  }
`;

const LikesCount = styled.span`
  font-size: 1.05rem;
  color: #e74c3c;
  cursor: pointer;
  font-weight: 600;
  margin-left: 0.18rem;
  background: #fff;
  border: 1.5px solid #eee;
  box-shadow: 0 1.5px 6px 0 #ffb6b633;
  padding: 0.18em 0.6em;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.7em;
  min-height: 1.7em;
  transition: color 0.18s, border 0.18s, background 0.18s;
  &:hover {
    color: #b71c1c;
    border: 1.5px solid #e74c3c;
    background: #fff;
  }
`;

// Кнопка «плюс» в левом нижнем углу пузыря сообщения
const PlusButton = styled.button`
  position: absolute;
  left: -12px;
  bottom: -12px;
  background: linear-gradient(135deg, #e3f0ff 0%, #f8faff 100%);
  border: none;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  cursor: pointer;
  font-size: 0.8rem;
  color: #3390ec;
  box-shadow: 0 2px 8px 0 rgba(33,150,243,0.10);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.18s ease;
`;

const DocumentMessage = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn'].includes(prop)
})`
  border: 1px solid #d0e6ff;
  border-radius: 5px;
  padding: 0.18rem 0.32rem;
  background: linear-gradient(120deg, #e3f0ff 0%, #f8faff 100%);
  display: flex;
  align-items: center;
  gap: 0.28rem;
  margin-top: 0.12rem;
  box-shadow: 0 0.5px 2px 0 rgba(33,150,243,0.03);
  font-size: 0.82rem;
  min-height: 22px;
  max-width: 210px;
  transition: box-shadow 0.13s, border 0.13s, background 0.13s;
  &:hover {
    background: linear-gradient(120deg, #e3f0ff 0%, #eaf6ff 100%);
    box-shadow: 0 1px 4px 0 rgba(33,150,243,0.07);
    border: 1px solid #3390ec;
    transform: translateY(-0.5px) scale(1.01);
  }
`;

const FileIcon = styled.div`
  font-size: 1.05rem;
  opacity: 0.9;
  filter: drop-shadow(0 0.5px 1.5px #b3d8ff22);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FileDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const FileName = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn'].includes(prop)
})`
  font-weight: 500;
  margin-bottom: 0.06rem;
  color: #1a2633;
  word-break: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.82em;
`;

const FileSize = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn'].includes(prop)
})`
  font-size: 0.72rem;
  color: #1a2633;
  font-weight: 400;
  letter-spacing: 0.01em;
`;

const DownloadButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['isOwn'].includes(prop)
})`
  background: linear-gradient(135deg, #3390ec 0%, #007bff 100%);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0.5px 2px rgba(33,150,243,0.04);
  font-size: 0.68rem;
  transition: all 0.11s cubic-bezier(.4,0,.2,1);
  outline: none;
  border: 1px solid transparent;
  &:hover {
    background: linear-gradient(135deg, #007bff 0%, #3390ec 100%);
    border: 1px solid #3390ec;
    transform: scale(1.05);
    box-shadow: 0 1px 4px 0 rgba(33,150,243,0.07);
  }
`;

const IMPORTANT_KEYWORDS = [
  'sos', 'zoiper', 'гудков', '1с', 'программа', 'не работает', 'медленно', 'нет гудков', 'не слышу', 'ошибка', 'авария', 'срочно', 'помогите', 'help', 'alarm', 'emergency'
];

// Компонент иконки шаблона
const TemplateIcon = styled.div.withConfig({
  shouldForwardProp: (prop) => !['templateType'].includes(prop)
})`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  margin-right: 10px;
  color: #ffffff;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
`;

// Функция для получения иконки по типу шаблона
const getTemplateIcon = (templateType) => {
  switch (templateType) {
    case 'urgent': return <FiZap size={16} />;
    case 'important': return <FiAlertTriangle size={16} />;
    case 'info': return <FiInfo size={16} />;
    case 'sos': return <span style={{fontSize: '14px'}}>🚨</span>;
    default: return <FiInfo size={16} />;
  }
};

export default function Message({ message, showAvatar }) {
  const { state, dispatch } = useApp();
  const emojiSettings = useEmojiSettings();
  const isOwn = message.user_id === state.user?.id;

  const IMPORTANT_LIKES = ['👍', '👎', '🔥', '🙏', '💯', '👏', '❤️'];
  const [customEmojiMap, setCustomEmojiMap] = useState(() => {
    try {
      const local = JSON.parse(localStorage.getItem('customEmojis') || '[]');
      const server = JSON.parse(localStorage.getItem('serverCustomEmojis') || '[]');
      const map = {};
      (Array.isArray(local) ? local : []).forEach(e => { if (e && e.name && e.src) map[`custom:${e.name}`] = e.src; });
      (Array.isArray(server) ? server : []).forEach(e => { if (e && e.name && e.url) map[`custom:${e.name}`] = e.url; });
      return map;
    } catch {
      return {};
    }
  });
  useEffect(() => {
    let alive = true;
    fetch('/api/emojis/list')
      .then(r => r.json())
      .then(list => {
        const map = {};
        const server = Array.isArray(list) ? list : [];
        server.forEach(e => { map[`custom:${e.name}`] = e.url; });
        try { localStorage.setItem('serverCustomEmojis', JSON.stringify(server)); } catch {}
        if (alive) setCustomEmojiMap(prev => ({ ...prev, ...map }));
      })
      .catch(() => {});
    const onLocalUpdated = (ev) => {
      try {
        const arr = ev?.detail || JSON.parse(localStorage.getItem('customEmojis') || '[]');
        const map = {};
        (Array.isArray(arr) ? arr : []).forEach(e => { if (e && e.name && e.src) map[`custom:${e.name}`] = e.src; });
        setCustomEmojiMap(prev => ({ ...prev, ...map }));
      } catch {}
    };
    window.addEventListener('customEmojisUpdated', onLocalUpdated);
    return () => { alive = false; window.removeEventListener('customEmojisUpdated', onLocalUpdated); };
  }, []);

  function renderTextWithCustomEmojis(text) {
    if (typeof text !== 'string' || !text) return text;
    const parts = text.split(/(custom:[\w.-]+)/g);
    return parts.map((part, idx) => {
      if (/^custom:[\w.-]+$/.test(part) && customEmojiMap[part]) {
        return (
          <img
            key={`ce-${idx}`}
            src={customEmojiMap[part]}
            alt={part}
            style={{ width: 24, height: 24, objectFit: 'cover', verticalAlign: 'middle', margin: '0 2px' }}
          />
        );
      }
      return <span key={`t-${idx}`}>{part}</span>;
    });
  }
  const getLikeUserId = (l) => String(l?.userId ?? l?.user_id ?? '');
  const [likes, setLikes] = useState(message.likes || []);
  const [showLikePicker, setShowLikePicker] = useState(false);
  const likePickerRef = useRef(null);
  const pickerContainerRef = useRef(null);
  const [showLikesList, setShowLikesList] = useState(null);
  const [likesForModal, setLikesForModal] = useState([]);
  const [modalMessageId, setModalMessageId] = useState(null);
  const myId = state.user?.id;
  const myLikes = likes.filter(l => getLikeUserId(l) === String(myId)).map(l => l.emoji);

  const handleDelete = () => {
    if (!window.socket) {
      alert('Нет соединения с сервером!');
      return;
    }
    if (!window.confirm('Удалить это сообщение?')) return;
    window.socket.emit('delete_message', { messageId: message.id });
    window.socket.once('error', (err) => {
      alert('Ошибка удаления: ' + err);
    });
  };

  const handlePin = () => {
    if (!window.socket) {
      alert('Нет соединения с сервером!');
      return;
    }
    
    // Проверяем, закреплено ли сообщение текущим пользователем
    const currentChatId = state.currentChat?.id;
    const pinnedMessages = currentChatId ? (state.pinnedMessages[currentChatId] || []) : [];
    const isPinned = pinnedMessages.some(pm => pm.id === message.id);
    
    const action = isPinned ? 'unpin_message' : 'pin_message';
    const confirmText = isPinned ? 'Открепить это сообщение?' : 'Закрепить это сообщение?';
    
    if (!window.confirm(confirmText)) return;
    
    console.log('[CLIENT] handlePin: sending', action, 'with data:', { 
      messageId: message.id, 
      chatId: message.chat_id,
      currentChatId: state.currentChat?.id
    });
    
    window.socket.emit(action, { 
      messageId: message.id, 
      chatId: message.chat_id 
    });
    
    window.socket.once('error', (err) => {
      alert(`Ошибка ${isPinned ? 'открепления' : 'закрепления'}: ` + err);
    });
  };

  const renderReply = () => {
  if (!message.reply_to_message) return null;
  const reply = message.reply_to_message;
  return (
    <ReplyInfo isOwn={isOwn}>
      {reply.avatar && (
        <img
          src={reply.avatar}
          alt="avatar"
          style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginRight: 6, boxShadow: '0 1px 4px #2196f344' }}
        />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <span style={{ fontWeight: 700, color: '#3390ec', fontSize: '0.98em' }}>{reply.username}</span>
        <span style={{ display: 'block', color: '#333', fontSize: '0.97em', marginTop: 2 }}>{reply.content}</span>
      </div>
    </ReplyInfo>
  );
};

const handleLike = (emoji) => {
  if (!window.socket) return;
  const hasMine = myLikes.includes(emoji);
  if (hasMine) {
    setLikes(prev => prev.filter(l => !(getLikeUserId(l) === String(myId) && l.emoji === emoji)));
    window.socket.emit('unlike_message', { messageId: message.id, emoji });
  } else {
    setLikes(prev => ([...prev, { userId: myId, username: state.user?.username, emoji }]));
    window.socket.emit('like_message', { messageId: message.id, emoji });
  }
  setShowLikePicker(false);
};

useEffect(() => {
  if (!window.socket) return;
  const handleLikesList = (data) => {
    if (data.messageId !== message.id) return;
    if (Array.isArray(data.likes)) {
      setLikes(data.likes);
      if (modalMessageId === message.id && showLikesList) {
        setLikesForModal(data.likes.filter(l => l.emoji === showLikesList));
      }
    }
  };
  const handleLiked = (data) => {
    if (data.messageId !== message.id) return;
    if (Array.isArray(data.likes)) {
      setLikes(data.likes);
    } else {
      const uid = String(data.userId ?? data.user_id ?? '');
      const username = data.username || '';
      const emoji = data.emoji;
      if (!emoji) return;
      setLikes(prev => ([
        ...prev.filter(l => getLikeUserId(l) !== uid),
        { userId: uid, username, emoji }
      ]));
    }
  };
  const handleUnliked = (data) => {
    if (data.messageId !== message.id) return;
    if (Array.isArray(data.likes)) {
      setLikes(data.likes);
    } else {
      const uid = String(data.userId ?? data.user_id ?? '');
      const emoji = data.emoji;
      setLikes(prev => prev.filter(l => !(getLikeUserId(l) === uid && l.emoji === emoji)));
    }
  };
  window.socket.on('message_likes_list', handleLikesList);
  window.socket.on('message_liked', handleLiked);
  if (window.socket && typeof window.socket.on === 'function') {
    window.socket.on('message_unliked', handleUnliked);
  }
  return () => {
    if (window.socket && typeof window.socket.off === 'function') {
      window.socket.off('message_likes_list', handleLikesList);
      window.socket.off('message_liked', handleLiked);
      window.socket.off('message_unliked', handleUnliked);
    }
  };
}, [message.id, modalMessageId, showLikesList]);

useEffect(() => {
  if (!showLikePicker) return;
  const handleClick = (e) => {
    const insidePicker = pickerContainerRef.current && pickerContainerRef.current.contains(e.target);
    const insideButton = likePickerRef.current && likePickerRef.current.contains(e.target);
    if (!insidePicker && !insideButton) {
      setShowLikePicker(false);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
  return () => document.removeEventListener('mousedown', handleClick);
}, [showLikePicker]);

useEffect(() => {
  if (window.socket) {
    window.socket.emit('get_message_likes', message.id);
  }
}, [message.id]);

const handleShowLikesList = (emoji) => {
  setShowLikesList(emoji);
  setModalMessageId(message.id);
  setLikesForModal(likes.filter(l => l.emoji === emoji));
  if (window.socket) {
    window.socket.emit('get_message_likes', message.id);
  }
};

const handleCloseLikesModal = () => {
  setShowLikesList(null);
  setLikesForModal([]);
  setModalMessageId(null);
};

const parseFileInfo = (fileInfo) => {
  if (!fileInfo) return null;
  try {
    if (typeof fileInfo === 'object') return fileInfo;
    if (typeof fileInfo === 'string') return JSON.parse(fileInfo);
    return null;
  } catch (error) {
    console.error('Error parsing file info:', error);
    return null;
  }
};

const handleDownloadFile = async (fileInfo) => {
  try {
    if (fileInfo.mimetype?.startsWith('image/')) {
      window.open(fileInfo.url, '_blank');
      return;
    }
    const response = await fetch(fileInfo.url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Ошибка загрузки файла');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    const fileName = fileInfo.originalName || fileInfo.filename || 'file';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    window.open(fileInfo.url, '_blank');
  }
};

const renderFileContent = () => {
  if (message.message_type === 'poll') {
    const participants = state.chatParticipants?.length > 0
      ? state.chatParticipants
      : (state.currentChat?.participants || []);
    return <PollMessage message={message} userId={state.user?.id} participants={participants} />;
  }
  if (message.message_type !== 'file') return null;
  const fileInfo = parseFileInfo(message.file_info);
  if (!fileInfo) return null;
  const isImage = fileInfo.mimetype?.startsWith('image/');
  const displayName = fileInfo.originalName || fileInfo.filename || 'Файл';
  if (isImage) {
    return (
      <ImageMessage
        src={fileInfo.url}
        alt={displayName}
        onClick={() => handleDownloadFile(fileInfo)}
        title="Нажмите для просмотра"
        onError={(e) => {
          e.target.style.display = 'none';
          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
        }}
      />
    );
  }
  return (
    <DocumentMessage isOwn={isOwn}>
      <FileIcon>{getFileIcon(fileInfo.mimetype, isOwn)}</FileIcon>
      <FileDetails>
        <FileName isOwn={isOwn}>{displayName}</FileName>
        <FileSize isOwn={isOwn}>{formatFileSize(fileInfo.size)}</FileSize>
      </FileDetails>
      <DownloadButton isOwn={isOwn} onClick={() => handleDownloadFile(fileInfo)} title="Скачать файл">
        <FiDownload size={16} />
      </DownloadButton>
    </DocumentMessage>
  );
};

function getFileIcon(mimetype, isOwn) {
  const lowerMime = String(mimetype || '').toLowerCase();
  if (isOwn) {
    if (lowerMime.includes('pdf')) {
      return <img src={pdfIcon} alt="pdf" style={{ width: 22, height: 22 }} />;
    }
    // Excel сначала, чтобы не схватить 'officedocument' как 'document'
    if (
      lowerMime.includes('excel') ||
      lowerMime.includes('spreadsheet') ||
      lowerMime.includes('vnd.ms-excel') ||
      lowerMime.includes('officedocument.spreadsheetml')
    ) {
      return <img src={excelIcon} alt="excel" style={{ width: 22, height: 22 }} />;
    }
    if (
      lowerMime.includes('msword') ||
      lowerMime.includes('officedocument.wordprocessingml') ||
      lowerMime.includes('application/msword') ||
      lowerMime.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
      lowerMime.includes('word')
    ) {
      return <img src={wordIcon} alt="word" style={{ width: 22, height: 22 }} />;
    }
    if (lowerMime.includes('zip') || lowerMime.includes('rar') || lowerMime.includes('compressed')) {
      return <img src={rarIcon} alt="archive" style={{ width: 22, height: 22 }} />;
    }
  }
  if (!lowerMime) return '📎';
  if (lowerMime.startsWith('image/')) return '🖼️';
  if (lowerMime.includes('pdf')) return '📄';
  if (
    lowerMime.includes('excel') ||
    lowerMime.includes('spreadsheet') ||
    lowerMime.includes('vnd.ms-excel') ||
    lowerMime.includes('officedocument.spreadsheetml')
  ) return '📊';
  if (
    lowerMime.includes('msword') ||
    lowerMime.includes('officedocument.wordprocessingml') ||
    lowerMime.includes('application/msword')
  ) return '📝';
  if (lowerMime.includes('zip') || lowerMime.includes('rar')) return '📦';
  if (lowerMime.includes('text')) return '📃';
  return '📎';
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


// удалены дублирующие определения styled-компонентов

const msgText = typeof message.text === 'string' ? message.text : message.content;
const isTemplateMessage = (message.message_type === 'template' && message.template_type) || message.message_type === 'sos';
const templateType = message.message_type === 'sos' ? 'sos' : message.template_type; // urgent, important, info, sos

// Проверяем, является ли сообщение одиночным эмодзи
const isEmojiOnly = (() => {
  if (typeof msgText !== 'string') return false;
  const trimmed = msgText.trim();
  
  // Проверяем обычные эмодзи
  if (/^\s*(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*$/u.test(trimmed)) {
    return true;
  }
  
  // Проверяем токены custom:emoji-...
  if (/^\s*(custom:emoji-[\d-]+)\s*$/.test(trimmed)) {
    return true;
  }
  
  // Проверяем HTML с одним img тегом (кастомный эмодзи)
  const imgMatches = trimmed.match(/<img[^>]*>/g);
  if (imgMatches && imgMatches.length === 1) {
    // Убираем img тег и проверяем, остался ли только пробельный текст
    const textWithoutImg = trimmed.replace(/<img[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return textWithoutImg === '';
  }
  
  return false;
})();

// Если это одиночный эмодзи, используем специальный компонент
if (isEmojiOnlyMessage(msgText)) {
  return <EmojiOnlyMessage message={message} isOwn={isOwn} state={state} />;
}

return (
  <ModernMessageContainer isOwn={isOwn}>
    {!isOwn && showAvatar && (
      <Avatar size="40px" style={{ overflow: 'hidden', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', marginRight: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <img
          src={message.avatar || '/default-avatar.png'}
          alt="avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      </Avatar>
    )}

    <ModernMessageBubble className="modern-bubble" isOwn={isOwn} isTemplate={isTemplateMessage} templateType={templateType} isEmojiOnly={isEmojiOnly}>
      <MessageContent isOwn={isOwn}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isTemplateMessage && (
              <TemplateIcon templateType={templateType}>
                {getTemplateIcon(templateType)}
              </TemplateIcon>
            )}
            <ModernUsername isTemplate={isTemplateMessage}>
              {isOwn ? state.user?.username || 'Вы' : message.username || 'Неизвестный'}
            </ModernUsername>
          </div>
          <ModernTimestamp isOwn={isOwn}>
            {formatMessageTime(message.created_at)}
          </ModernTimestamp>
        </div>

        {renderReply()}

        {msgText && isEmojiOnly ? (
          /^\s*custom:[\w.-]+\s*$/.test(msgText.trim()) && customEmojiMap[msgText.trim()] ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={customEmojiMap[msgText.trim()]}
                alt={msgText.trim()}
                style={{ width: Math.max(emojiSettings.customEmojiSize, 64), height: Math.max(emojiSettings.customEmojiSize, 64), objectFit: 'cover', borderRadius: 8, imageRendering: 'crisp-edges' }}
              />
            </div>
          ) : (
            <EmojiOnlyText>{msgText.trim()}</EmojiOnlyText>
          )
        ) : msgText ? (
          message.message_type === 'forwarded' ? (
            <ForwardedMessage content={message.content} isOwn={isOwn} />
          ) : (
            <ModernMessageText isOwn={isOwn} isTemplate={isTemplateMessage} dangerouslySetInnerHTML={{ __html: msgText }} />
          )
        ) : null}

        {renderFileContent()}

        <MessageFooter isOwn={isOwn}>
          <PlusButton
            className="plus-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowLikePicker(true);
            }}
            title="Поставить лайк"
          >
            +
          </PlusButton>
          {/* Плавающий контейнер с реакциями справа от пузыря */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 'calc(100% + 8px)',
              transform: (Array.isArray(likes) && likes.length > 0) ? 'translateX(0) translateY(-50%)' : 'translateX(18px) translateY(-50%)',
              opacity: (Array.isArray(likes) && likes.length > 0) ? 1 : 0,
              transition: 'transform .24s cubic-bezier(.2,.7,.3,1), opacity .24s cubic-bezier(.2,.7,.3,1)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 4000,
              pointerEvents: 'auto'
            }}
          >
            {Array.isArray(likes) &&
              likes.length > 0 &&
              Object.entries(
                likes.reduce((acc, l) => {
                  if (l.emoji) {
                    if (!acc[l.emoji]) acc[l.emoji] = [];
                    acc[l.emoji].push(l);
                  }
                  return acc;
                }, {})
              ).map(([emoji, arr]) => (
                <LikeButton
                  key={emoji}
                  liked={arr.some((l) => getLikeUserId(l) === String(myId))}
                  isOwn={isOwn}
                  onClick={() => handleLike(emoji)}
                  title={arr.some((l) => getLikeUserId(l) === String(myId)) ? 'Убрать лайк' : 'Поставить лайк'}
                  disabled={false}
                  style={{ marginLeft: 0, position: 'relative' }}
                >
                  {customEmojiMap[emoji] || ((emojiSettings.showStandardEmojis !== false && !JSON.parse(localStorage.getItem('emojiBlacklist') || '[]').includes(`std|${emoji}`)) && EMOJI_TO_ICON[emoji]) ? (
                    <img 
                      src={customEmojiMap[emoji] || EMOJI_TO_ICON[emoji]} 
                      alt={emoji} 
                      style={{ 
                        width: Math.max(emojiSettings.customEmojiSize, 64), 
                        height: Math.max(emojiSettings.customEmojiSize, 64),
                        objectFit: 'cover',
                        borderRadius: '8px',
                        imageRendering: 'crisp-edges'
                      }} 
                    />
                  ) : (
                    <span role="img" aria-label="like" style={{ fontSize: `${emojiSettings.standardEmojiSize}rem` }}>{emoji}</span>
                  )}
                  {arr.length > 1 && (
                    <LikesCount
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowLikesList(emoji);
                      }}
                      title="Показать кто лайкнул"
                      style={{ transform: 'scale(0.5)', transformOrigin: 'center', marginLeft: 2 }}
                    >
                      {arr.length}
                    </LikesCount>
                  )}
                </LikeButton>
              ))}
          </div>
          {/* Плавающий пикер справа */}
          <div
            ref={pickerContainerRef}
            style={{
              position: 'absolute',
              top: '50%',
              left: 'calc(100% - 150px)',
              transform: showLikePicker ? 'translateX(0) translateY(-50%)' : 'translateX(18px) translateY(-50%)',
              opacity: showLikePicker ? 1 : 0,
              transition: 'transform .24s cubic-bezier(.2,.7,.3,1), opacity .24s cubic-bezier(.2,.7,.3,1)',
              zIndex: 5000,
              pointerEvents: showLikePicker ? 'auto' : 'none'
            }}
          >
            <EmojiPicker
              isOpen={showLikePicker}
              onEmojiSelect={handleLike}
              onClose={() => setShowLikePicker(false)}
              containerRef={pickerContainerRef}
            />
          </div>
          {showLikesList && (
            <LikesModal
              open={!!showLikesList}
              onClose={handleCloseLikesModal}
              likes={likesForModal}
              emoji={showLikesList}
              messageId={modalMessageId}
            />
          )}
        </MessageFooter>
      </MessageContent>

      <MessageActions className="message-actions" isOwn={isOwn}>
        <ActionButton
          onClick={() => {
            dispatch({
              type: 'SET_REPLY_TO_MESSAGE',
              payload: {
                id: message.id,
                username: message.username,
                content: message.content,
              },
            });
          }}
          title="Ответить"
        >
          <FiCornerUpLeft size={14} />
        </ActionButton>
        <PinButton
          onClick={handlePin}
          title={(() => {
            const currentChatId = state.currentChat?.id;
            const pinnedMessages = currentChatId ? (state.pinnedMessages[currentChatId] || []) : [];
            const isPinned = pinnedMessages.some(pm => pm.id === message.id);
            return isPinned ? "Открепить сообщение" : "Закрепить сообщение";
          })()}
          isPinned={(() => {
            const currentChatId = state.currentChat?.id;
            const pinnedMessages = currentChatId ? (state.pinnedMessages[currentChatId] || []) : [];
            return pinnedMessages.some(pm => pm.id === message.id);
          })()}
        >
          <FiBookmark size={16} />
        </PinButton>
        <ActionButton
          onClick={() => {
            dispatch({
              type: 'SHOW_SHARE_MODAL',
              payload: {
                message: {
                  id: message.id,
                  username: message.username,
                  content: message.content,
                  timestamp: message.timestamp,
                  chatId: message.chatId
                }
              }
            });
          }}
          title="Поделиться"
        >
          <FiShare2 size={14} />
        </ActionButton>
        {isOwn && (
          <ActionButton onClick={handleDelete} title="Удалить сообщение">
            <FiTrash2 size={14} />
          </ActionButton>
        )}
      </MessageActions>
    </ModernMessageBubble>

    {isOwn && showAvatar && (
      <Avatar
        size="40px"
        style={{
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'absolute',
          right: '-12px',
          bottom: '-12px',
          marginLeft: 0,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
        }}
      >
        <img
          src={state.user?.avatarUrl || '/default-avatar.png'}
          alt="avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      </Avatar>
    )}
  </ModernMessageContainer>
);
}
