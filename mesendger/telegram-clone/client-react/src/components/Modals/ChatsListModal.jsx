import React from 'react';
import styled from 'styled-components';
import { Modal, ModalContent, CloseButton } from '../../styles/GlobalStyles';
import { FiX, FiMessageSquare, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { playDeleteSound } from '../../utils/notificationSound';

const StyledModalContent = styled(ModalContent)`
  background: linear-gradient(135deg, #232931 0%, #2193b0 100%);
  border-radius: 22px 0 0 22px;
  box-shadow: -8px 0 40px #2193b044, 0 4px 24px rgba(0,0,0,0.18);
  padding: 2.5rem 2rem 2rem 2rem;
  min-width: 420px;
  max-width: 420px;
  height: 100vh;
  position: fixed;
  top: 0;
  right: 0;
  border: none;
  z-index: 9999;
  animation: modalFadeIn 0.35s cubic-bezier(.4,0,.2,1);
  @keyframes modalFadeIn {
    from { opacity: 0; transform: translateX(40px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ModalTitle = styled.h3`
  margin-bottom: 1.8rem;
  color: #ffffff;
  font-weight: 700;
  font-size: 1.5rem;
  text-align: center;
`;

const ChatList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
`;

const ChatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 1.2rem 1.4rem 1.2rem 1.2rem;
  margin: 0.42rem 0.15rem;
  cursor: pointer;
  border-radius: 16px;
  background: ${({active}) =>
    active
      ? 'linear-gradient(135deg, #1f2630 0%, #181c22 100%)'
      : 'rgba(255,255,255,0.03)'};
  color: #ffffff;
  box-shadow: ${({active}) => active
    ? '0 2px 16px #43e97b22, 0 0 0 2px #2193b022'
    : '0 1px 4px rgba(0,0,0,0.05)'};
  border-left: 6px solid ${({active, isGroup}) => active ? (isGroup ? '#43e97b' : '#6dd5ed') : 'transparent'};
  font-weight: 700;
  transition: background 0.22s, color 0.22s, box-shadow 0.22s, border-color 0.22s, transform 0.18s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &:hover {
    background: rgba(67,233,123,0.08);
    color: #43e97b;
    box-shadow: 0 8px 32px #2193b033, 0 0 0 2px #43e97b22 inset;
    border-left: 6px solid ${({isGroup}) => isGroup ? '#43e97b' : '#6dd5ed'};
    transform: translateY(-1px);
  }
`;

const ChatName = styled.span`
  font-weight: 600;
  color: #ffffff;
  font-size: 1.08em;
`;

const NoResults = styled.div`
  text-align: center;
  color: #ffffff;
  padding: 20px 0;
  font-size: 16px;
  opacity: 0.8;
`;

const CreateChatButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(67,233,123,0.35);
  background: rgba(67,233,123,0.15);
  color: #b2ffb2;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95em;
  transition: all 0.2s ease;
  margin-bottom: 20px;
  
  &:hover {
    background: rgba(67,233,123,0.25);
    border-color: rgba(67,233,123,0.5);
    color: #ffffff;
    transform: translateY(-1px);
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
`;

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(231, 76, 60, 0.3);
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0;
  margin-left: 8px;
  flex-shrink: 0;
  
  &:hover {
    background: rgba(231, 76, 60, 0.2);
    border-color: rgba(231, 76, 60, 0.5);
    color: #ffffff;
    transform: scale(1.05);
  }
`;

const ChatItemContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 1.2rem 1.4rem 1.2rem 1.2rem;
  margin: 0.42rem 0.15rem;
  cursor: pointer;
  border-radius: 16px;
  background: ${({active}) =>
    active
      ? 'linear-gradient(135deg, #1f2630 0%, #181c22 100%)'
      : 'rgba(255,255,255,0.03)'};
  color: #ffffff;
  box-shadow: ${({active}) => active
    ? '0 2px 16px #43e97b22, 0 0 0 2px #2193b022'
    : '0 1px 4px rgba(0,0,0,0.05)'};
  border-left: 6px solid ${({active, isGroup}) => active ? (isGroup ? '#43e97b' : '#6dd5ed') : 'transparent'};
  font-weight: 700;
  transition: background 0.22s, color 0.22s, box-shadow 0.22s, border-color 0.22s, transform 0.18s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  &:hover {
    background: rgba(67,233,123,0.08);
    color: #43e97b;
    box-shadow: 0 8px 32px #2193b033, 0 0 0 2px #43e97b22 inset;
    border-left: 6px solid ${({isGroup}) => isGroup ? '#43e97b' : '#6dd5ed'};
    transform: translateY(-1px);
    
    ${DeleteButton} {
      opacity: 1;
    }
  }
`;

export default function ChatsListModal() {
  const { state, dispatch } = useApp();
  const chats = state.chats || [];
  const currentChatId = state.currentChat?.id;
  const [deletingChats, setDeletingChats] = React.useState(new Set());

  // Обработчики событий удаления чата
  React.useEffect(() => {
    if (!window.socket) return;

    const handleDeleteError = (error) => {
      console.error('Ошибка удаления чата:', error);
      alert('Не удалось удалить чат. Попробуйте еще раз.');
      // Убираем чат из списка удаляемых при ошибке
      setDeletingChats(prev => new Set());
    };

    const handleChatDeleted = (data) => {
      console.log('✅ Чат успешно удален:', data);
      // Убираем чат из списка удаляемых
      setDeletingChats(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.chatId);
        return newSet;
      });
      
      // Обновляем список чатов через dispatch
      dispatch({ type: 'DELETE_CHAT', payload: { chatId: data.chatId } });
      
      // Если удаленный чат был активным, сбрасываем текущий чат
      if (state.currentChat?.id === data.chatId) {
        dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
      }
      
      // Запрашиваем обновленный список чатов с сервера
      if (window.socket) {
        window.socket.emit('get_chats');
      }
    };

    window.socket.on('chat_delete_error', handleDeleteError);
    window.socket.on('chat_deleted', handleChatDeleted);
    
    return () => {
      window.socket.off('chat_delete_error', handleDeleteError);
      window.socket.off('chat_deleted', handleChatDeleted);
    };
  }, [dispatch, state.currentChat?.id]);

  const handleSelect = (chat) => {
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'chatsList', show: false } });
  };

  const handleCreateChat = () => {
    dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'createChat', show: true } });
    // Можно оставить модалку чатов открытой или закрыть её
    // dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'chatsList', show: false } });
  };

  const handleDeleteChat = (chatId, chatName, event) => {
    event.stopPropagation(); // Предотвращаем выбор чата при клике на кнопку удаления
    
    if (window.confirm(`Вы уверены, что хотите удалить чат "${chatName}"?`)) {
      // Воспроизводим звук удаления
      playDeleteSound(0.3);
      
      // Добавляем чат в список удаляемых
      setDeletingChats(prev => new Set([...prev, chatId]));
      
      // Отправляем событие удаления чата на сервер
      if (window.socket) {
        window.socket.emit('delete_chat', { chatId });
      } else {
        alert('Нет соединения с сервером');
        setDeletingChats(prev => {
          const newSet = new Set(prev);
          newSet.delete(chatId);
          return newSet;
        });
      }
      
      // Убираем из списка удаляемых через 5 секунд (на случай если сервер не ответит)
      setTimeout(() => {
        setDeletingChats(prev => {
          const newSet = new Set(prev);
          newSet.delete(chatId);
          return newSet;
        });
      }, 5000);
    }
  };

  return (
    <Modal onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'chatsList', show: false } })}>
      <StyledModalContent onClick={e => e.stopPropagation()}>
        <CloseButton onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'chatsList', show: false } })}><FiX /></CloseButton>
        <ModalTitle>Ваши чаты</ModalTitle>
        <ButtonContainer>
          <CreateChatButton onClick={handleCreateChat} title="Создать чат">
            <FiPlus size={18} /> Создать чат
          </CreateChatButton>
        </ButtonContainer>
        <ChatList>
          {chats.length === 0 ? (
            <NoResults>Нет чатов</NoResults>
          ) : (
            chats.map(chat => {
              const isGroup = chat.type === 'group';
              const active = currentChatId === chat.id;
              return (
                <ChatItemContainer
                  key={chat.id}
                  active={active}
                  isGroup={isGroup}
                  onClick={() => handleSelect(chat)}
                  style={{position:'relative'}}
                >
                  {/* Иконка типа чата */}
                  {isGroup ? <span style={{fontSize:'1.15em',marginRight:4}}>👥</span> : <span style={{fontSize:'1.15em',marginRight:4}}>👤</span>}
                  {/* Название чата + badge */}
                  <ChatName style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{chat.name || 'Приватный чат'}</ChatName>
                  {chat.unread_count > 0 && (
                    <span style={{background:'#43e97b',color:'#fff',borderRadius:8,padding:'2px 8px',fontWeight:700,fontSize:'0.92em',marginLeft:8}}>{chat.unread_count}</span>
                  )}
                  {/* Время последнего сообщения */}
                  <span style={{fontSize:'0.78em',color:'#9fb0ba',marginLeft:8,whiteSpace:'nowrap'}}>
                    {chat.last_message_time ? new Date(chat.last_message_time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}) : ''}
                  </span>
                  {/* Кнопка удаления чата */}
                  <DeleteButton
                    onClick={(e) => handleDeleteChat(chat.id, chat.name || 'Приватный чат', e)}
                    title="Удалить чат"
                    disabled={deletingChats.has(chat.id)}
                    style={{
                      opacity: deletingChats.has(chat.id) ? 0.6 : 1,
                      cursor: deletingChats.has(chat.id) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {deletingChats.has(chat.id) ? (
                      <div style={{
                        width: 16,
                        height: 16,
                        border: '2px solid #e74c3c',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    ) : (
                      <FiTrash2 size={16} />
                    )}
                  </DeleteButton>
                </ChatItemContainer>
              );
            })
          )}
        </ChatList>
      </StyledModalContent>
    </Modal>
  );
}
