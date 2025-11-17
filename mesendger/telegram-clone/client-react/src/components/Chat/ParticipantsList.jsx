import React, { useEffect, useState } from 'react';
import { FiTrash2, FiMessageCircle } from 'react-icons/fi';
import styled from 'styled-components';
import { Avatar } from '../../styles/GlobalStyles';
import { useApp } from '../../context/AppContext';
import { formatLastSeen } from '../../utils/timeUtils';

// --- Исправлено: фильтрация пропса online ---
const StyledAvatar = styled(Avatar).withConfig({
  shouldForwardProp: (prop) => !['online', 'lastSeen'].includes(prop)
})

const ListContainer = styled.div`
  padding: 1.7rem 1.3rem 1.3rem 1.3rem;
  background: rgba(44,62,80,0.92);
  backdrop-filter: blur(14px);
  border-radius: 28px 0 0 28px;
  box-shadow: 0 8px 40px 0 rgba(31,38,135,0.13);
  border-bottom: none;
  position: relative;
  margin: 1.1rem 0.7rem 0.7rem 0.7rem;
  border: none;
  animation: sidebarFadeIn 0.4s cubic-bezier(.4,0,.2,1);
  @keyframes sidebarFadeIn {
    from { opacity: 0; transform: translateX(-40px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
`;

const Title = styled.h4`
  margin: 0 0 0.5rem 0;
  color: #6dd5ed;
  font-size: 1.18rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 0.5em;
`;

const UserItem = styled.div.withConfig({
  shouldForwardProp: (prop) => !['selected', 'active'].includes(prop)
})`
  display: flex;
  align-items: center;
  padding: 1rem 1.2rem;
  border-radius: 16px;
  margin-bottom: 0.7rem;
  background: rgba(255,255,255,0.07);
  box-shadow: 0 2px 12px 0 rgba(44,62,80,0.08);
  transition: background 0.22s, box-shadow 0.22s, transform 0.22s, opacity 0.35s cubic-bezier(.4,0,.2,1);
  cursor: pointer;
  opacity: ${props => props.selected ? 0 : 1};
  transform: ${props => props.selected ? 'scale(0.96) translateX(30px)' : 'none'};
  z-index: ${props => props.selected ? 2 : 1};
  &:hover {
    background: rgba(52, 152, 219, 0.16);
    box-shadow: 0 4px 16px 0 rgba(52,152,219,0.13);
    transform: translateY(-2px) scale(1.04);
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
  font-weight: 700;
  color: #6dd5ed;
  font-size: 1.08rem;
  margin-bottom: 0.18rem;
  letter-spacing: 0.1px;
`;

// --- Исправлено: фильтрация пропса online ---
const UserStatus = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'online'
})`
  font-size: 0.85rem;
  color: ${props => props.online ? '#43e97b' : '#b0b0b0'};
  display: flex;
  align-items: center;
  gap: 0.32rem;
  &::before {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${props => props.online ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' : '#b0b0b0'};
    box-shadow: 0 0 6px #43e97b;
    border: 2px solid #fff;
    display: inline-block;
  }
`;

export default function ParticipantsList() {
  const [expanded, setExpanded] = useState(true);
  const { state, dispatch } = useApp();
  const chatId = state.currentChat?.id;
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    if (!window.socket || !chatId) return;

    window.socket.emit('get_chat_participants', chatId);

    const handleParticipants = ({ chatId: incomingId, participants }) => {
      if (incomingId === chatId) {
        dispatch({ type: 'SET_CHAT_PARTICIPANTS', payload: participants });
      }
    };

    window.socket.on('chat_participants', handleParticipants);

    return () => {
      if (window.socket) {
        window.socket.off('chat_participants', handleParticipants);
      }
    };
  }, [chatId, dispatch]);

  function handleCreatePrivateChat(userId) {
    if (window.socket) {
      window.socket.emit('create_private_chat', { targetUserId: userId });
    }
  }

  function animateAndOpenPrivate(userId) {
    setSelectedUserId(userId);
    setTimeout(() => {
      handleCreatePrivateChat(userId);
      setSelectedUserId(null);
    }, 320);
  }

  if (!chatId) return null;

  return (
    <ListContainer>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        <Title style={{ margin: 0 }}>
          Участники чата:
        </Title>
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.3rem',
            marginLeft: 'auto',
            color: '#3498db',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)'
          }}
          title={expanded ? 'Скрыть участников' : 'Показать участников'}
          onClick={() => setExpanded(e => !e)}
        >
          ▶
        </button>
      </div>
      {expanded && (
        <div>
          {state.chatParticipants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#7f8c8d' }}>Нет участников</div>
          ) : (
            state.chatParticipants.map(user => (
              <UserItem
                key={user.id}
                selected={selectedUserId === user.id}
                onClick={() => animateAndOpenPrivate(user.id)}
                title="Открыть личный чат"
              >
                <UserInfo>
                  {/* --- Исправлено: заменён Avatar на StyledAvatar --- */}
                  <StyledAvatar
                    size="40px"
                    online={user.online} // теперь фильтруется
                    style={{
                      background: user.online
                        ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: user.online ? '#222' : '#fff',
                      fontWeight: 700,
                      fontSize: '1.1em',
                      boxShadow: user.online ? '0 2px 8px rgba(67,233,123,0.13)' : '0 2px 8px rgba(102,126,234,0.13)',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={user.avatar || '/default-avatar.png'}
                      alt={user.username || 'User'}
                      style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}
                    />
                  </StyledAvatar>
                  <UserDetails>
                    <Username>
                      {user.username}
                      {user.department && (
                        <span style={{ display:'block', fontWeight:500, fontSize:'0.9rem', color:'#cfd8dc' }}>{user.department}</span>
                      )}
                    </Username>
                    <UserStatus online={user.online}>
                      {formatLastSeen(user.last_seen, user.online)}
                    </UserStatus>
                  </UserDetails>
                </UserInfo>
                <button
                  onClick={e => {
                    animateAndOpenPrivate(user.id);
                  }}
                  style={{
                    marginLeft: 8,
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    border: 'none',
                    borderRadius: 12,
                    color: '#222',
                    fontWeight: 600,
                    fontSize: '1.1em',
                    padding: '0.32rem 0.7rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 6px rgba(67,233,123,0.10)',
                    transition: 'all 0.2s',
                  }}
                  title="Личная переписка"
                >
                  <FiMessageCircle size={16} />
                </button>
              </UserItem>
            ))
          )}
        </div>
      )}
    </ListContainer>
  );
}