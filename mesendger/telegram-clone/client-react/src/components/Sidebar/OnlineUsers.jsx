import React from 'react';
import styled from 'styled-components';
import { FiUsers } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../../styles/GlobalStyles';
// import Emoji from '../Common/Emoji';
const OnlineContainer = styled.div`
  background: linear-gradient(135deg, #232526 0%, #414345 100%);
  box-shadow: 0 4px 24px 0 rgba(0,0,0,0.18);
  border-radius: 18px 18px 0 0;
  padding: 1.2rem 1rem 1rem 1rem;
  margin: 0.5rem 0.5rem 0 0.5rem;
  max-height: 270px;
  overflow-y: auto;
  border: none;
`;

const OnlineHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const OnlineTitle = styled.h4`
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 0.5em;
`;

const FindUsersButton = styled.button`
  background: linear-gradient(135deg, #6dd5ed 0%, #2193b0 100%);
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0.35rem 0.45rem;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(52,152,219,0.12);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1em;

  &:hover {
    background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
    transform: scale(1.13);
  }
`;

const UsersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const UserItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.55rem 0.7rem;
  border-radius: 12px;
  cursor: pointer;
  background: rgba(255,255,255,0.03);
  box-shadow: 0 1px 4px 0 rgba(0,0,0,0.07);
  transition: background 0.2s, box-shadow 0.2s, transform 0.2s;

  &:hover {
    background: rgba(52, 152, 219, 0.13);
    box-shadow: 0 2px 8px 0 rgba(52,152,219,0.10);
    transform: translateY(-2px) scale(1.03);
  }
`;

const UserName = styled.span`
  color: #f8f8f8;
  font-size: 0.97rem;
  font-weight: 500;
  flex: 1;
  letter-spacing: 0.1px;
`;

const WriteButton = styled.button`
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: #222;
  border: none;
  padding: 0.28rem 0.7rem;
  border-radius: 16px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 6px rgba(67,233,123,0.10);
  transition: all 0.2s;

  &:hover {
    background: linear-gradient(135deg, #38f9d7 0%, #43e97b 100%);
    color: #111;
    transform: scale(1.09);
  }
`;

const EmptyState = styled.div`
  color: #7f8c8d;
  font-size: 0.9rem;
  text-align: center;
  font-style: italic;
  padding: 1.2rem 0;
`;

export default function OnlineUsers({ onShowUsers }) {
  const { state } = useApp();

  const handleCreatePrivateChat = (userId) => {
    try {
      console.log('[OnlineUsers] create_private_chat click', { userId });
      if (window.socket && window.socket.connected) {
        window.socket.emit('create_private_chat', { targetUserId: userId });
      } else {
        console.warn('[OnlineUsers] socket not connected');
      }
    } catch (e) {
      console.error('[OnlineUsers] create_private_chat error', e);
    }
  };

  const otherUsers = state.onlineUsers.filter(user => user.id !== state.user?.id);

  return (
    <OnlineContainer>
      <OnlineHeader>
        <OnlineTitle>
          <span style={{fontSize: '1.2em'}}>🟢</span> Онлайн <span style={{opacity:0.7}}>({otherUsers.length})</span>
        </OnlineTitle>
        <FindUsersButton onClick={onShowUsers} title="Найти пользователей">
          <FiUsers size={18} />
        </FindUsersButton>
      </OnlineHeader>

      <UsersList>
        {otherUsers.length === 0 ? (
          <EmptyState>
            Нет пользователей онлайн
          </EmptyState>
        ) : (
          otherUsers.map(user => (
            <UserItem key={user.id} onClick={() => handleCreatePrivateChat(user.id)} title="Открыть приватный чат">
              <Avatar size="32px" online style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: '#222',
                fontWeight: 700,
                fontSize: '1.1em',
                boxShadow: '0 2px 8px rgba(67,233,123,0.13)'
              }}>
                {user.username?.charAt(0).toUpperCase()}
                <span style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 11,
                  height: 11,
                  background: '#2ecc71',
                  border: '2px solid #fff',
                  borderRadius: '50%',
                  boxShadow: '0 0 4px #2ecc71',
                  display: 'inline-block'
                }} />
              </Avatar>
              <UserName>{user.username}</UserName>
              <WriteButton
                type="button"
                onClick={e => { e.stopPropagation(); handleCreatePrivateChat(user.id); }}
                title="Написать"
              >
                ✉️
              </WriteButton>
              {state.user?.role === 'admin' && (
                <button
                  style={{marginLeft:8,padding:'0.28rem 0.7rem',borderRadius:16,background:'#e74c3c',color:'#fff',fontWeight:600,cursor:'pointer',border:'none'}}
                  onClick={e => {
                    e.stopPropagation();
                    fetch(`/api/users/${user.id}/role`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                      },
                      body: JSON.stringify({ role: 'hr' })
                    })
                    .then(r => r.json())
                    .then(res => {
                      if(res.success) {
                        if (res.token) {
                          localStorage.setItem('token', res.token);
                          // Обновляем информацию о пользователе в localStorage
                          const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                          const updatedUser = { ...currentUser, token: res.token };
                          localStorage.setItem('user', JSON.stringify(updatedUser));
                        }
                        alert('Пользователь назначен HR!');
                      } else {
                        alert('Ошибка: ' + (res.error || 'Не удалось назначить роль'));
                      }
                    });
                  }}
                  title="Назначить HR"
                >HR</button>
              )}
            </UserItem>
          ))
        )}
      </UsersList>
    </OnlineContainer>
  );
}