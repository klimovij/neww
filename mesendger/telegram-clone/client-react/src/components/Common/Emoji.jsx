import React from 'react';
import styled from 'styled-components';


const EmojiSpan = styled.span.withConfig({
  shouldForwardProp: (prop) => !['clickable', 'active'].includes(prop)
})`
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Android Emoji', sans-serif;
  font-size: ${props => props.size || '2.5em'};
  line-height: 1;
  vertical-align: middle;
  display: inline-block;
  margin: 0 0.1em;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  transition: transform 0.2s ease;
  
  &:hover {
    transform: ${props => props.clickable ? 'scale(1.2)' : 'none'};
  }
`;

const Emoji = ({ children, size, clickable, onClick, ...props }) => {
  return (
    <EmojiSpan 
      size={size} 
      clickable={clickable}
      onClick={onClick}
      {...props}
    >
      {children}
    </EmojiSpan>
  );
};

export default Emoji;