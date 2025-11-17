import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useApp } from '../../context/AppContext';
import Message from './Message';
import Emoji from '../Common/Emoji';

const MessagesContainer = styled.div`
  flex: 1;
  padding: 1.5rem 2rem 6rem 2rem;
  overflow-y: auto;
  background: linear-gradient(135deg, #232931 0%, #232b3a 100%);
  border-radius: 18px;
  box-shadow: 0 4px 32px #2193b022;
  margin: 18px 18px 0 18px;
  transition: background 0.3s;
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
{{ ... }}
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #2193b0;
    border-radius: 4px;
    &:hover {
      background: #6dd5ed;
    }
  }
`;

const MessageGroup = styled.div`
  margin-bottom: 1rem;
`;

const DateSeparator = styled.div`
  text-align: center;
  margin: 1rem 0;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1.5px;
    background: #2193b0;
    opacity: 0.25;
  }
`;

const DateText = styled.span`
  background: #232931;
  padding: 0.5rem 1rem;
  border-radius: 15px;
  font-size: 0.8rem;
  color: #6dd5ed;
  position: relative;
  z-index: 1;
  box-shadow: 0 2px 8px #2193b022;
`;

export default function MessageList() {
  const { state } = useApp();
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);


  // Скроллим вниз всегда при смене чата, а при новых сообщениях — только если пользователь был внизу
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // Проверка: был ли пользователь внизу
  const wasAtBottom = useRef(true);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      // 30px tolerance
      wasAtBottom.current = container.scrollHeight - container.scrollTop - container.clientHeight < 30;
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const prevMessagesLengthRef = useRef(0);
  useEffect(() => {
    const prevLen = prevMessagesLengthRef.current;
    const nextLen = state.messages.length;
    prevMessagesLengthRef.current = nextLen;
    // Автоскролл только при добавлении новых сообщений
    if (nextLen > prevLen) {
      if (wasAtBottom.current || nextLen <= 1) {
        scrollToBottom();
        setTimeout(() => scrollToBottom(false), 100);
      }
    }
  }, [state.messages]);

  // При смене чата всегда скроллим вниз
  useEffect(() => {
    scrollToBottom(false);
  }, [state.currentChat]);

  useEffect(() => {
    if (state.currentChat) {
      window.socket?.emit('mark_chat_read', state.currentChat.id);
    }
  }, [state.currentChat]);

  const groupMessagesByDate = (messages) => {
    const groups = {};
    
    messages.forEach(message => {
      // Правильная обработка даты с учетом временных зон
      let messageDate;
      if (typeof message.created_at === 'string' && 
          message.created_at.includes('T') && 
          !message.created_at.includes('Z') && 
          !message.created_at.includes('+')) {
        messageDate = new Date(message.created_at + 'Z');
      } else {
        messageDate = new Date(message.created_at);
      }
      
      const date = messageDate.toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const messageGroups = groupMessagesByDate(state.messages);

  return (
    <MessagesContainer ref={containerRef}>
      {Object.entries(messageGroups).map(([date, messages], index) => (
        <MessageGroup key={date}>
          {index > 0 && (
            <DateSeparator>
              <DateText>{formatDate(date)}</DateText>
            </DateSeparator>
          )}
          {messages.map((message) => (
            <div key={message.id} id={`message-${message.id}`}>
              <Message 
                message={message} 
                showAvatar={true}
              />
            </div>
          ))}
        </MessageGroup>
      ))}
      <div ref={messagesEndRef} />
    </MessagesContainer>
  );
}