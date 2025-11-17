import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../../styles/GlobalStyles';
import LikesModal from '../Modals/LikesModal';
import EmojiPicker from '../Common/EmojiPicker';
import { useEmojiSettings } from '../../hooks/useEmojiSettings';
import EmojiOnlyMessage, { isEmojiOnlyMessage } from './EmojiOnlyMessage';
import { 
  ModernMessageContainer, 
  MessageBubble, 
  MessageContent, 
  MessageTime, 
  MessageAuthor,
  MessageActions,
  ActionButton,
  LikeButton,
  EmojiButton,
  ReplyButton
} from '../../styles/MessageStyles';
import { 
  FaHeart, 
  FaRegHeart, 
  FaReply, 
  FaSmile, 
  FaCheckCircle, 
  FaRegCircle, 
  FaChevronUp, 
  FaChevronDown 
} from 'react-icons/fa';

// Функция для получения черного списка эмодзи
function useEmojiBlacklist() {
  const [blacklist, setBlacklist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('emojiBlacklist') || '[]');
    } catch {
      return [];
    }
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
  shouldForwardProp: (prop) => !['selected', 'active', 'percent'].includes(prop)
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
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
  }
`;

function PollMessage({ message, userId, participants }) {
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

  const totalVotes = Object.values(votes).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  const totalParticipants = participants?.length || 0;
  const notVoted = participants?.filter(p => !voters.includes(p.id)) || [];

  const handleVote = async (idx) => {
    if (selected !== null || closed) return;
    setLoading(true);
    try {
      if (window.socket) {
        window.socket.emit('vote_poll', { messageId: message.id, optionIdx: idx });
      }
      setSelected(idx);
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
            disabled={closed || selected !== null}
            onClick={() => handleVote(idx)}
            percent={percent}
            title={closed ? 'Голосование завершено' : selected !== null ? 'Вы уже голосовали' : 'Проголосовать'}
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
          <span className="stat-count">{voters.length} из {totalParticipants}</span>
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
            <span>Проголосовали: {voters.length}</span>
          </div>
          {showVoted ? <FaChevronUp /> : <FaChevronDown />}
        </PollVotersToggle>
        {showVoted && voters.length > 0 && (
          <PollVotersList>
            {voters.map(uid => {
              const user = participants?.find(p => p.id === uid);
              return user ? (
                <div key={uid} className="voter-card">
                  {user.avatar && <img src={user.avatar} alt="avatar" />}
                  <span>{user.username}</span>
                </div>
              ) : (
                <div key={uid} className="voter-card">
                  <span>Пользователь</span>
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
            {notVoted.map(u => (
              <div key={u.id} className="voter-card">
                {u.avatar && <img src={u.avatar} alt="avatar" />}
                <span>{u.username}</span>
              </div>
            ))}
          </PollVotersList>
        )}
      </div>
    </PollBox>
  );
}

// Остальная часть компонента Message остается без изменений
// Здесь должен быть остальной код компонента Message...

export default function Message({ message, userId, isOwn, onReply, showAvatar = true }) {
  // Основная логика компонента Message
  const { state, dispatch } = useApp();
  
  // Если это голосование, рендерим PollMessage
  if (message.message_type === 'poll') {
    const participants = state.chatParticipants?.length > 0
      ? state.chatParticipants
      : (state.currentChat?.participants || []);
    return <PollMessage message={message} userId={state.user?.id} participants={participants} />;
  }
  
  // Остальная логика для обычных сообщений...
  return (
    <div>
      {/* Здесь должен быть код для обычных сообщений */}
      <p>Обычное сообщение: {message.content}</p>
    </div>
  );
}
