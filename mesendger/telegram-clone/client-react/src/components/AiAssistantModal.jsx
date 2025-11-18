import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';

// Функция для озвучки текста (без Markdown-символов)
function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  // Удаляем Markdown-символы: *, #, -, >, _, `, [, ], (, ), !
  const clean = text.replace(/[\*#\-\>_`\[\]\(\)!]/g, '').replace(/\s{2,}/g, ' ');
  const utter = new window.SpeechSynthesisUtterance(clean);
  utter.lang = 'ru-RU';
  utter.rate = 1;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

// Кнопка для остановки озвучки
function StopSpeechButton() {
  return (
    <button
      style={{marginLeft:4,background:'none',border:'none',cursor:'pointer',fontSize:20,color:'#e74c3c'}}
      title="Остановить озвучку"
      onClick={()=>window.speechSynthesis && window.speechSynthesis.cancel()}
    >⏹️</button>
  );
}

const ModalBg = styled.div`
  position: fixed;
  top: 0;
  left: 320px;
  right: 0;
  height: 100vh;
  min-width: 340px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-shadow: -8px 0 40px #ffe08244, 0 2px 16px #23293133;
  background: none;
`;
const ModalContent = styled.div`
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #fffbe6 0%, #ffe082 100%);
  border-radius: 0 0 0 0;
  box-shadow: none;
  padding: 32px 28px 24px 28px;
  box-sizing: border-box;
  overflow-y: auto;
  position: relative;
  animation: modalFadeIn .35s cubic-bezier(.4,0,.2,1);
  display: flex;
  flex-direction: column;
`;
const CloseBtn = styled.button`
  position: absolute;
  top: 18px;
  right: 22px;
  font-size: 2rem;
  background: none;
  border: none;
  color: #232931;
  cursor: pointer;
  font-weight: 900;
`;
const ChatBox = styled.div`
  min-height: 320px;
  max-height: 420px;
  overflow-y: auto;
  background: #fffde7;
  border-radius: 14px;
  padding: 18px 12px;
  margin-bottom: 18px;
  box-shadow: 0 2px 8px #ffe08233;
  & ul, & ol {
    padding-left: 22px;
    margin: 8px 0 8px 0;
  }
  & li {
    margin-bottom: 4px;
    word-break: break-word;
    list-style-position: inside;
  }
`;
const Message = styled.div`
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  &.user { justify-content: flex-end; }
  &.ai { justify-content: flex-start; }
`;
const Bubble = styled.div`
  background: ${({ai})=>ai?'#ffe082':'#43e97b'};
  color: ${({ai})=>ai?'#232931':'#fff'};
  padding: 10px 14px;
  border-radius: 14px;
  max-width: 80%;
  font-size: 1.08em;
  box-shadow: 0 2px 8px #23293111;
`;
const InputRow = styled.form`
  display: flex;
  gap: 10px;
`;
const Input = styled.input`
  flex: 1;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #ffe082;
  font-size: 1.08em;
`;
const SendBtn = styled.button`
  background: #43e97b;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  font-weight: 700;
  font-size: 1.08em;
  cursor: pointer;
  transition: background .18s;
  &:hover { background: #2193b0; }
`;

export default function AiAssistantModal({ open, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Здравствуйте! Я корпоративный ИИ-помощник. Задайте вопрос по правилам компании, бухгалтерии, возвратам или скриптам для колл-центра.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef();

  useEffect(() => {
    if (open && chatRef.current) {
      setTimeout(() => {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }, 100);
    }
  }, [messages, open]);

  if (!open) return null;

  // Закрытие по клику вне модалки (только если клик по фону, а не по контенту)
  const handleBgClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages(msgs => [...msgs, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: input,
          history: messages.filter(m=>m.role!=='system').map(m=>m.text)
        })
      });
      const data = await res.json();
      setMessages(msgs => [...msgs, { role: 'ai', text: data.reply || 'Нет ответа от ИИ.' }]);
    } catch {
      setMessages(msgs => [...msgs, { role: 'ai', text: 'Ошибка обращения к ИИ.' }]);
    }
    setLoading(false);
  };

  return (
    <ModalBg onClick={handleBgClick}>
      <ModalContent>
        <CloseBtn onClick={onClose}>×</CloseBtn>
        <h2 style={{color:'#232931',fontWeight:800,marginBottom:10}}>🤖 Всезнайка</h2>
        <div style={{color:'#232931',marginBottom:10,fontSize:'1.01em'}}>База знаний: корпоративные правила, бухгалтерия, возвраты, скрипты для колл-центра.</div>
        <ChatBox ref={chatRef}>
          {messages.map((m,i)=>(
            <Message key={i} className={m.role}>
              <Bubble ai={m.role==='ai'}>
                {m.role === 'ai' ? <>
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                  <button
                    style={{marginLeft:8,background:'none',border:'none',cursor:'pointer',fontSize:20,color:'#2193b0'}}
                    title="Озвучить ответ"
                    onClick={()=>speakText(m.text)}
                  >🔊</button>
                  <StopSpeechButton />
                </> : m.text}
              </Bubble>
            </Message>
          ))}
          {loading && <Message className="ai"><Bubble ai={true}>Генерируется ответ...</Bubble></Message>}
        </ChatBox>
        <InputRow onSubmit={handleSend}>
          <Input
            value={input}
            onChange={e=>setInput(e.target.value)}
            placeholder="Ваш вопрос..."
            disabled={loading}
            autoFocus
          />
          <SendBtn type="submit" disabled={loading || !input.trim()}>Отправить</SendBtn>
        </InputRow>
      </ModalContent>
    </ModalBg>
  );
}
