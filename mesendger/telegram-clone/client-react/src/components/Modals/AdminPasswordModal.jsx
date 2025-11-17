import React, { useState } from 'react';
import styled from 'styled-components';
import { useApp } from '../../context/AppContext';
import { Modal, ModalContent, CloseButton, Button, Input } from '../../styles/GlobalStyles';
import { playDeleteSound } from '../../utils/notificationSound';

const ModalTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
  text-align: center;
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

export default function AdminPasswordModal({ chatId, onClose }) {
  const { state, dispatch } = useApp();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    window.socket.emit('delete_chat', { chatId, adminPassword: password });
  };

  React.useEffect(() => {
    const handleDeleteError = (data) => {
      setLoading(false);
      setError(data?.message || 'Ошибка удаления');
    };
    const handleDeleted = (data) => {
      setLoading(false);
      playDeleteSound(0.3);
      onClose();
    };
    window.socket.on('chat_delete_error', handleDeleteError);
    window.socket.on('chat_deleted', handleDeleted);
    return () => {
      window.socket.off('chat_delete_error', handleDeleteError);
      window.socket.off('chat_deleted', handleDeleted);
    };
  }, [onClose]);

  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <CloseButton onClick={onClose} />
        <ModalTitle>Введите пароль супер-админа для удаления группы</ModalTitle>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <form onSubmit={handleSubmit}>
          <Input
            type="password"
            placeholder="Пароль супер-админа"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <Button type="submit" $variant="danger" disabled={loading || !password} style={{ marginTop: '1rem', width: '100%' }}>
            Удалить
          </Button>
        </form>
      </ModalContent>
    </Modal>
  );
}
