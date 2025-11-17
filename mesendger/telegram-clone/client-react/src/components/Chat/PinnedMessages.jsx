import React, { useState } from 'react';
import styled from 'styled-components';
import { FiBookmark, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const PinnedContainer = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin: 8px 16px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
`;

const PinnedHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
`;

const PinnedTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
`;

const PinnedCount = styled.span`
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 700;
`;

const CollapseButton = styled.button`
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const PinnedList = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'collapsed'
})`
  margin-top: 12px;
  max-height: ${props => props.collapsed ? '0' : '200px'};
  overflow-y: auto;
  transition: max-height 0.3s ease;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
  }
`;

const PinnedMessage = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const MessageAuthor = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 0.8rem;
  margin-bottom: 4px;
  opacity: 0.9;
`;

const MessageContent = styled.div`
  color: #fff;
  font-size: 0.85rem;
  line-height: 1.3;
  opacity: 0.95;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MessageTime = styled.div`
  color: #fff;
  font-size: 0.7rem;
  opacity: 0.7;
  margin-top: 4px;
`;

const UnpinButton = styled.button`
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  position: absolute;
  top: 4px;
  right: 4px;
  
  &:hover {
    opacity: 1;
  }
`;

const PinnedMessages = ({ pinnedMessages, onScrollToMessage, onUnpinMessage }) => {
  const [collapsed, setCollapsed] = useState(true);

  if (!pinnedMessages || pinnedMessages.length === 0) {
    return null;
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleMessageClick = (message) => {
    if (onScrollToMessage) {
      onScrollToMessage(message.id);
    }
  };

  const handleUnpin = (e, messageId) => {
    e.stopPropagation();
    if (onUnpinMessage) {
      onUnpinMessage(messageId);
    }
  };

  return (
    <PinnedContainer>
      <PinnedHeader onClick={() => setCollapsed(!collapsed)}>
        <PinnedTitle>
          <FiBookmark size={16} />
          Закрепленные сообщения
          <PinnedCount>{pinnedMessages.length}</PinnedCount>
        </PinnedTitle>
        <CollapseButton>
          {collapsed ? <FiChevronDown size={16} /> : <FiChevronUp size={16} />}
        </CollapseButton>
      </PinnedHeader>
      
      <PinnedList collapsed={collapsed}>
        {pinnedMessages.map((message, index) => (
          <PinnedMessage 
            key={`pinned-${message.id}-${message.pinned_at || index}`} 
            onClick={() => handleMessageClick(message)}
          >
            <UnpinButton 
              onClick={(e) => handleUnpin(e, message.id)}
              title="Открепить сообщение"
            >
              <FiX size={12} />
            </UnpinButton>
            <MessageAuthor>
              {message.username || 'Пользователь'}
            </MessageAuthor>
            <MessageContent>
              {message.content}
            </MessageContent>
            <MessageTime>
              {formatTime(message.timestamp)}
            </MessageTime>
          </PinnedMessage>
        ))}
      </PinnedList>
    </PinnedContainer>
  );
};

export default PinnedMessages;
