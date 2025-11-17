import React from 'react';
import styled from 'styled-components';
import { FiCornerUpRight } from 'react-icons/fi';

const ForwardedContainer = styled.div`
  border-left: 3px solid #3b82f6;
  padding-left: 12px;
  margin: 8px 0;
  background: rgba(59, 130, 246, 0.05);
  border-radius: 0 8px 8px 0;
`;

const ForwardedHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #3b82f6;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 6px;
`;

const ForwardedContent = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOwn'].includes(prop)
})`
  color: ${props => props.isOwn ? 'rgba(255, 255, 255, 0.9)' : '#374151'};
  font-size: 0.95rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const ForwardedMessage = ({ content, isOwn }) => {
  // Парсим содержимое пересланного сообщения
  const parseForwardedContent = (content) => {
    const forwardPattern = /^📤 Пересланное сообщение от (.+?):\n\n(.+)$/s;
    const match = content.match(forwardPattern);
    
    if (match) {
      return {
        originalAuthor: match[1],
        originalContent: match[2]
      };
    }
    
    return {
      originalAuthor: 'Неизвестный пользователь',
      originalContent: content
    };
  };

  const { originalAuthor, originalContent } = parseForwardedContent(content);

  return (
    <ForwardedContainer>
      <ForwardedHeader>
        <FiCornerUpRight size={14} />
        Пересланное от {originalAuthor}
      </ForwardedHeader>
      <ForwardedContent isOwn={isOwn}>
        {originalContent}
      </ForwardedContent>
    </ForwardedContainer>
  );
};

export default ForwardedMessage;
