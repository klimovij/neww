import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Modal, ModalContent, CloseButton, Button, Avatar } from '../../styles/GlobalStyles';
import { FiX, FiTrash2, FiUserMinus } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { formatLastSeen } from '../../utils/timeUtils';

const ModalTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
  text-align: center;
`;

const UsersList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 8px;
`;

const UserItem = styled.div`
  display: flex;
  align-items: center;
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

const Username = styled.div`
  font-weight: 500;
  color: #333;
`;

const UserStatus = styled.div`
  font-size: 0.8rem;
  color: ${props => props.online ? '#28a745' : '#6c757d'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ErrorMessage = styled.div`
  background: #fee;
  color: #c33;
  padding: 0.75rem;
  border-radius: 5px;
  margin-bottom: 1rem;
  border: 1px solid #fcc;
  text-align: center;
`;

const ActionButton = styled(Button)`
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export default function RemoveUserModal() {
  const { state, dispatch } = useApp();
  const [participants, setParticipants] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (state.modals.removeUser && state.currentChat) {
      setLoading(true);
      setError('');
      window.socket?.emit('get_chat_participants', state.currentChat.id);
    }
  }, [state.modals.removeUser, state.currentChat]);

  // Исправление: useEffect всегда вызывается, а логика внутри условия
  // (переносим вызов useEffect на верхний уровень)

  useEffect(() => {
    const handleParticipants = (users) => {
      if (Array.isArray(users)) {
        setParticipants(users.filter(u => u.id !== state.user?.id));
      } else if (users && Array.isArray(users.participants)) {
        setParticipants(users.participants.filter(u => u.id !== state.user?.id));
      } else {
        setParticipants([]);
      }
      setLoading(false);
    };
    const handleError = (msg) => {
      setError(msg || 'Ошибка загрузки участников');
      setLoading(false);
    };
    window.socket?.on('chat_participants', handleParticipants);
    window.socket?.on('participants_error', handleError);
    return () => {
      if (window.socket) {
        window.socket.off('chat_participants', handleParticipants);
        window.socket.off('participants_error', handleError);
      }
    };
  }, [state.user?.id]);


  // useEffect должен быть всегда на верхнем уровне
  useEffect(() => {
    if (!state.modals.removeUser) return;
    const handleUsersRemoved = (data) => {
      if (data && data.chatId === state.currentChat?.id) {
        setLoading(false);
        handleClose();
      }
    };
    window.socket?.on('users_removed_from_chat', handleUsersRemoved);
    return () => {
      if (window.socket) {
        window.socket.off('users_removed_from_chat', handleUsersRemoved);
      }
    };
  }, [state.currentChat, state.modals.removeUser]);

  if (!state.modals.removeUser) return null;

  const handleClose = () => {
    dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'removeUser', show: false } });
    setParticipants([]);
    setSelectedUserIds([]);
    setError('');
    setLoading(false);
  };

  const handleCheckbox = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleRemoveUsers = () => {
    if (!state.currentChat) {
      setError('Нет выбранного чата');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Выберите хотя бы одного пользователя');
      return;
    }
    setLoading(true);
    window.socket?.emit('remove_users_from_chat', {
      chatId: state.currentChat.id,
      userIds: selectedUserIds
    });
  };



  return (
    <Modal onClick={handleClose}>
  <ModalContent $large onClick={e => e.stopPropagation()}>
        <CloseButton onClick={handleClose}><FiX /></CloseButton>
        <ModalTitle>Удалить участников из чата</ModalTitle>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <UsersList>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>Загрузка участников...</div>
          ) : participants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>Нет других участников</div>
          ) : (
            participants.map(user => (
              <UserItem key={user.id}>
                <UserInfo>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => handleCheckbox(user.id)}
                    style={{
                      marginRight: '1rem',
                      width: '22px',
                      height: '22px',
                      accentColor: selectedUserIds.includes(user.id) ? '#e74c3c' : '#bdc3c7',
                      boxShadow: selectedUserIds.includes(user.id)
                        ? '0 0 0 2px #e74c3c'
                        : '0 0 0 1px #bdc3c7',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s, accent-color 0.2s'
                    }}
                  />
                  <Avatar size="40px" online={user.online}>
                    {user.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Username>{user.username}</Username>
                  <UserStatus online={user.online}>
                    {formatLastSeen(user.last_seen, user.online)}
                  </UserStatus>
                </UserInfo>
              </UserItem>
            ))
          )}
        </UsersList>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <ActionButton
            size="medium"
            $variant="secondary"
            onClick={() => setSelectedUserIds(participants.map(u => u.id))}
            disabled={loading || participants.length === 0}
          >
            Выбрать всех
          </ActionButton>
          <ActionButton
            size="medium"
            $variant="danger"
            onClick={handleRemoveUsers}
            disabled={loading || selectedUserIds.length === 0}
          >
            <FiUserMinus size={16} /> Удалить выбранных
          </ActionButton>
        </div>
      </ModalContent>
    </Modal>
  );
}
