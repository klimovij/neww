

import React, { useState, useRef, useEffect } from 'react';
import CustomEmojiPicker from './Common/EmojiPicker';
import NewsFeed from './NewsFeed';
import styled from 'styled-components';
import { getCustomEmojiSizeForArea, subscribeEmojiSettings } from '../utils/emojiSettings';

const ModalWrapper = styled.div`
  position: fixed;
  top: 0;
  left: calc(380px + max((100vw - 380px - 1200px)/2, 0px));
  width: 1170px;
  min-width: 600px;
  max-width: 1170px;
  height: 92vh;
  margin: 32px 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  pointer-events: auto;
  @media (max-width: 1360px) {
    left: 380px;
    width: calc(100vw - 420px);
    max-width: none;
  }
  @media (max-width: 980px) {
    left: 0;
    right: 0;
    width: 100vw;
    min-width: 0;
    height: 100vh;
    margin: 0;
    padding: 12px;
    align-items: flex-start;
    justify-content: center;
  }
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme?.colors?.panelBg || 'linear-gradient(135deg, #1f1f22 0%, #2a2f35 100%)'};
  border-radius: 32px;
  width: 100%;
  min-width: 600px;
  max-width: 1200px;
  height: 100%;
  box-sizing: border-box;
  box-shadow: 0 12px 48px 0 rgba(67,233,123,0.12), 0 2px 10px 0 rgba(56, 249, 215, 0.06);
  display: flex;
  flex-direction: column;
  position: relative;
  color: #fff;
  padding: 28px 36px 24px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1.5px solid ${({ theme }) => theme?.colors?.panelBorder || 'rgba(67,233,123,0.16)'};
  backdrop-filter: blur(3px);
  @media (max-width: 980px) {
    border-radius: 20px;
    min-width: 0;
    max-width: 100%;
    padding: 18px 16px 14px;
    height: calc(100vh - 24px);
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  font-size: 2.1rem;
  background: ${({ theme }) => theme?.colors?.accentGradient || 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'};
  border: none;
  cursor: pointer;
  color: #fff;
  font-weight: bold;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px #43e97b33;
  transition: background 0.3s, color 0.3s, box-shadow 0.2s;
  &:hover {
    background: ${({ theme }) => theme?.colors?.accentHoverGradient || 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)'};
    color: #eafff5;
    box-shadow: 0 10px 28px #43e97b55;
  }
  @media (max-width: 980px) {
    top: 10px;
    right: 10px;
    width: 40px;
    height: 40px;
    font-size: 1.8rem;
  }
`;

const HeaderBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 14px 6px 16px;
  border-bottom: 1px solid ${({ theme }) => theme?.colors?.divider || 'rgba(67,233,123,0.12)'};
  margin-bottom: 16px;
  @media (max-width: 980px) {
    gap: 10px;
    padding-top: 10px;
    padding-bottom: 10px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
`;

const TitleWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  h2 {
    margin: 0;
    font-size: 1.28rem;
    font-weight: 800;
    letter-spacing: 0.01em;
    color: ${({ theme }) => theme?.colors?.headerTitle || '#ffffff'};
  }
  @media (max-width: 980px) {
    h2 { font-size: 1.1rem; }
  }
`;

const ActionsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  width: 100%;
  @media (max-width: 980px) {
    justify-content: center;
    flex-wrap: wrap;
  }
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  font-size: 0.93em;
  font-weight: 700;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  color: #fff;
  background: ${({ variant, theme }) => variant === 'news'
    ? (theme?.colors?.primaryGradient || 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)')
    : (theme?.colors?.secondaryGradient || 'linear-gradient(135deg, #ff512f 0%, #dd2476 100%)')};
  box-shadow: 0 2px 8px #43e97b33;
  transition: transform .12s ease, box-shadow .2s ease, opacity .2s ease;
  will-change: transform;
  &:hover { transform: translateY(-1px); box-shadow: 0 6px 18px #43e97b44; }
  &:active { transform: translateY(0); box-shadow: 0 2px 8px #43e97b33; }
  @media (max-width: 980px) {
    padding: 8px 14px;
    font-size: 0.9em;
  }
`;

const TabButton = styled.button`
  padding: 6px 18px;
  font-size: 0.93em;
  font-weight: 600;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: ${({ active }) => active
    ? 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)'
    : 'rgba(40, 46, 54, 0.9)'};
  color: ${({ active }) => active ? '#fff' : '#cfd8dc'};
  box-shadow: ${({ active }) => active ? '0 2px 10px rgba(0,176,155,0.28)' : 'inset 0 0 0 1px rgba(255,255,255,0.06)'};
  transition: background .2s,color .2s, box-shadow .2s, transform .12s ease;
  letter-spacing: 0.01em;
  &:hover { transform: translateY(-1px); }
  @media (max-width: 980px) {
    padding: 6px 14px;
    font-size: 0.9em;
  }
`;

const IconTabButton = styled(TabButton)`
  padding: 8px;
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  @media (max-width: 980px) {
    width: 38px;
    height: 38px;
    padding: 6px;
  }
`;

const TooltipWrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover > span[data-tooltip] {
    opacity: 1;
    transform: translate(-50%, -6px);
    pointer-events: auto;
  }
`;

const Tooltip = styled.span`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translate(-50%, 0);
  background: rgba(20, 24, 28, 0.96);
  color: #e6f7ef;
  font-size: 12px;
  line-height: 1;
  padding: 8px 10px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.28);
  white-space: nowrap;
  opacity: 0;
  transition: opacity .16s ease, transform .16s ease;
  pointer-events: none;
  z-index: 5;
  &:after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px 6px 0 6px;
    border-style: solid;
    border-color: rgba(20, 24, 28, 0.96) transparent transparent transparent;
  }
`;

const GiftIcon = ({ size = 20, colored = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="giftGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ff5f6d"/>
        <stop offset="100%" stopColor="#ffc371"/>
      </linearGradient>
    </defs>
    <path d="M20 7h-2.18A3 3 0 0 0 15 3a2.5 2.5 0 0 0-2.5 2.5V7H12V5.5A2.5 2.5 0 0 0 9.5 3 3 3 0 0 0 6.18 7H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1ZM9.5 5a1 1 0 0 1 1 1V7H8.28A1.28 1.28 0 0 1 7 5.72 1.72 1.72 0 0 1 8.72 4 1.78 1.78 0 0 1 9.5 5Zm3 0a1 1 0 0 1 1-1 1.78 1.78 0 0 1 .78 1 1.72 1.72 0 0 1 1.72 1.72A1.28 1.28 0 0 1 13.72 7H12.5V6a1 1 0 0 1 0-1ZM5 9h6v2H5V9Zm2 4h4v7H7v-7Zm10 7h-4v-7h4v7Zm2-9h-6V9h6v2Z" fill={colored ? 'url(#giftGrad)' : 'currentColor'}/>
  </svg>
);

const ContentScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  @media (max-width: 980px) {
    padding-right: 4px;
  }
`;

// Overlay and small modal card used for add news / poll
const FullscreenOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme?.colors?.overlay || 'rgba(20, 24, 28, 0.82)'};
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SmallCard = styled.div`
  background: #ffffff;
  border-radius: 24px;
  min-width: 420px;
  max-width: 560px;
  width: 100%;
  padding: 34px 34px 26px;
  box-shadow: 0 10px 44px #2193b044, 0 0 20px #43e97b55;
  position: relative;
  color: #232931;
  font-size: 1.08em;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  @media (max-width: 520px) {
    min-width: 0;
    margin: 0 12px;
    border-radius: 18px;
    padding: 22px 18px 16px;
  }
`;

// Comment-modal-like styles for Add News (match NewsFeed comment modal aesthetics)
const AddModalBg = styled.div`
  position: fixed;
  top: 0; left: max(calc(380px + max((100vw - 380px - 1200px)/2, 0px) - 585px), 0px); right: 0; bottom: 0;
  z-index: 2000;
  background: rgba(34,40,49,0.82);
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  overflow: hidden;
  height: 100vh;
`;

const AddModal = styled.div`
  width: 100%;
  max-width: none;
  height: 100%;
  max-height: none;
  background: #fff;
  border-radius: 0;
  box-shadow: 0 8px 40px #2193b033, 0 0 0 2px #43e97b44;
  padding: 32px 28px 24px 28px;
  position: relative;
  font-family: inherit;
  color: #222;
  font-size: 1.08em;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const SmallCloseX = styled.button`
  position: absolute;
  top: 16px;
  right: 20px;
  font-size: 26px;
  background: none;
  border: none;
  cursor: pointer;
  color: #2193b0;
`;

const SmallTitle = styled.h3`
  margin: 0 0 16px;
  color: ${({ theme }) => theme?.colors?.primary || '#2193b0'};
  font-weight: 800;
  font-size: 1.2em;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const TextInput = styled.input`
  font-weight: 600;
  font-size: 1em;
  min-width: 220px;
  border-radius: 10px;
  border: 1.5px solid ${({ theme }) => theme?.colors?.primary || '#2193b0'};
  padding: 10px 14px;
  width: 100%;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 88px;
  font-size: 1.02em;
  background: #f9fafb;
  border-radius: 10px;
  border: 1.5px solid ${({ theme }) => theme?.colors?.primary || '#2193b0'};
  padding: 10px 14px;
`;

const SubmitButton = styled.button`
  background: linear-gradient(135deg, #2193b0 0%, #43e97b 100%);
    color: #fff;
  border: none;
  border-radius: 14px;
  font-weight: 700;
  font-size: 1.05em;
  padding: 12px 28px;
  cursor: pointer;
  box-shadow: 0 2px 12px #43e97b33;
  margin-top: 4px;
  transition: background .2s,color .2s, box-shadow .2s, opacity .2s;
  @media (max-width: 520px) {
    font-size: 1em;
    padding: 10px 22px;
  }
`;


const NewsModal = ({ open, onClose }) => {
  const [tab, setTab] = useState('news');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isPollSending, setIsPollSending] = useState(false);
  if (!open) return null;
  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');
  let userRole = '';
  try {
    userRole = JSON.parse(userRaw)?.role || '';
  } catch {}
  const normalizedRole = String(userRole || '').trim().toLowerCase();
  const canManageNews = ['admin', 'hr', 'hr manager', 'hr_manager', 'human resources', 'human_resources'].includes(normalizedRole);

  // Функция для перехода обратно к новостям
  const handleBackToNews = () => setTab('news');

  return (
    <ModalWrapper onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <CloseButton onClick={onClose} aria-label="Close modal">×</CloseButton>
        <HeaderBar>
          {canManageNews && (
            <ActionsGroup>
              <TooltipWrapper>
                <ActionButton variant="news" onClick={() => setShowAddModal(true)}>Добавить новость</ActionButton>
                <Tooltip data-tooltip>Добавить новость</Tooltip>
              </TooltipWrapper>
              <TooltipWrapper>
                <ActionButton variant="poll" onClick={() => setShowPollModal(true)}>Голосование</ActionButton>
                <Tooltip data-tooltip>Голосование</Tooltip>
              </TooltipWrapper>
              <TooltipWrapper>
                <TabButton active={tab==='news'} onClick={()=>setTab('news')}>Новости</TabButton>
                <Tooltip data-tooltip>Новости</Tooltip>
              </TooltipWrapper>
              
            </ActionsGroup>
          )}
        </HeaderBar>
        {/* Tabs moved into header actions row */}
        <ContentScroll>
          <NewsFeed modal onClose={onClose} token={token} />
        </ContentScroll>
        {/* Модалка добавления новости */}
        {showAddModal && (
          <AddModalBg onClick={() => setShowAddModal(false)}>
            <AddModal onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: 12, right: 16, fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#2193b0' }}>×</button>
              <h3 style={{ marginBottom: 14, color: '#e74c3c' }}>Добавить новость</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AddNewsForm token={token} onSuccess={() => setShowAddModal(false)} />
            </div>
            </AddModal>
          </AddModalBg>
        )}
        {/* Модалка создания голосования */}
        {showPollModal && (
          <FullscreenOverlay onClick={() => setShowPollModal(false)}>
            <SmallCard onClick={e => e.stopPropagation()}>
              <SmallCloseX onClick={() => setShowPollModal(false)}>×</SmallCloseX>
              <SmallTitle>Создать голосование</SmallTitle>
              <Form onSubmit={async e => {
                e.preventDefault();
                if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) return;
                setIsPollSending(true);
                try {
                  await fetch('/api/news/poll', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      type: 'poll',
                      question: pollQuestion.trim(),
                      options: pollOptions.map(opt => opt.trim())
                    })
                  });
                  setShowPollModal(false);
                  setPollQuestion('');
                  setPollOptions(['', '']);
                } finally {
                  setIsPollSending(false);
                }
              }}>
                <TextInput
                  name="question"
                  placeholder="Тема голосования"
                  value={pollQuestion}
                  onChange={e => setPollQuestion(e.target.value)}
                  required
                  maxLength={120}
                  autoFocus
                />
                {pollOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      type="text"
                      value={opt}
                      onChange={e => setPollOptions(
                        pollOptions.map((o, i) => i === idx ? e.target.value : o)
                      )}
                      placeholder={`Вариант ${idx + 1}`}
                      required
                      maxLength={60}
                    />
                    {pollOptions.length > 2 && (
                      <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: 22, cursor: 'pointer', marginLeft: 4 }} title="Удалить вариант">×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} style={{ background: 'none', border: '1.5px dashed #2193b0', color: '#2193b0', borderRadius: 8, padding: '8px 14px', fontWeight: 600, cursor: 'pointer', marginTop: 2 }}>+ Добавить вариант</button>
                <SubmitButton type="submit" style={{ opacity: isPollSending ? 0.7 : 1 }} disabled={isPollSending}>
                  {isPollSending ? 'Создание...' : 'Создать'}
                </SubmitButton>
              </Form>
            </SmallCard>
          </FullscreenOverlay>
        )}
      </ModalContent>
    </ModalWrapper>
  );
};

// Форма добавления новости
function AddNewsForm({ token, onSuccess }) {
  const [form, setForm] = useState({ title: '', content: '' });
  const [showContentModal, setShowContentModal] = useState(false);
  const [tempContent, setTempContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const editorRef = useRef(null);
  const [textColor, setTextColor] = useState('#2193b0');
  const [bgColor, setBgColor] = useState('#fff59d');
  const [customEmojiMap, setCustomEmojiMap] = useState({});
  const [emojiSizes, setEmojiSizes] = useState({
    news: getCustomEmojiSizeForArea('news')
  });

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    setIsSending(true);
    fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: form.title, content: form.content })
    })
      .then(() => {
        setForm({ title: '', content: '' });
        if (editorRef.current) editorRef.current.innerHTML = '';
        setIsSending(false);
        if (onSuccess) onSuccess();
      })
      .catch(() => setIsSending(false));
  };
  // Load custom emojis list for inline rendering
  useEffect(() => {
    fetch('/api/emojis/list')
      .then(r => r.json())
      .then(list => {
        const map = {};
        (Array.isArray(list) ? list : []).forEach(e => { map[`custom:${e.name}`] = e.url; });
        setCustomEmojiMap(map);
      })
      .catch(() => {});
  }, []);
  // Подписка на обновления настроек размеров эмодзи
  useEffect(() => {
    const unsubscribe = subscribeEmojiSettings(() => {
      setEmojiSizes({ news: getCustomEmojiSizeForArea('news') });
    });
    return unsubscribe;
  }, []);
  // Keep editor DOM in sync only when content is changed programmatically
  useEffect(() => {
    if (editorRef.current && typeof form.content === 'string') {
      // Avoid unnecessary writes: only set when different
      if (editorRef.current.innerHTML !== form.content) {
        editorRef.current.innerHTML = form.content;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.content]);


  const exec = (cmd, value = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
      // Используем execCommand для простого форматирования
      document.execCommand(cmd, false, value);
      // Обновляем state из текущего HTML
      const currentHtml = editorRef.current ? editorRef.current.innerHTML : '';
      setForm(f => ({ ...f, content: currentHtml }));
    }
  };

  const insertCustomEmojiAtCursor = (token) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const url = customEmojiMap[token];
    if (!url) {
      document.execCommand('insertText', false, token);
      const currentHtml = editorRef.current ? editorRef.current.innerHTML : '';
      setForm(f => ({ ...f, content: currentHtml }));
      return;
    }
    const img = document.createElement('img');
    img.src = url;
    img.alt = token;
    img.setAttribute('data-custom-emoji', 'true');
    img.setAttribute('data-token', token);
    const px = Number(emojiSizes.news || 24);
    img.style.width = px + 'px';
    img.style.height = px + 'px';
    img.style.objectFit = 'cover';
    img.style.verticalAlign = 'middle';
    img.style.margin = '0 2px';
    img.style.borderRadius = '6px';
    const range = window.getSelection && window.getSelection().getRangeAt && window.getSelection().rangeCount > 0 ? window.getSelection().getRangeAt(0) : null;
    if (range) {
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.setEndAfter(img);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editorRef.current.appendChild(img);
    }
    const currentHtml = editorRef.current ? editorRef.current.innerHTML : '';
    setForm(f => ({ ...f, content: currentHtml }));
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <input name="title" placeholder="Заголовок новости" value={form.title} onChange={handleChange} required style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #2193b0', fontWeight: 700, fontSize: '1.06em', background: 'rgba(255,255,255,0.92)' }} />
      <div style={{ position: 'relative' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" onClick={() => exec('bold')} style={{ background: '#e0f7fa', border: '1px solid #b2ebf2', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 800 }}>B</button>
          <button type="button" onClick={() => exec('italic')} style={{ background: '#e8eaf6', border: '1px solid #c5cae9', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontStyle: 'italic' }}>I</button>
          <button type="button" onClick={() => exec('underline')} style={{ background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', textDecoration: 'underline' }}>U</button>
          <button type="button" onClick={() => exec('insertUnorderedList')} style={{ background: '#f1f8e9', border: '1px solid #dcedc8', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>• Список</button>
          <button type="button" onClick={() => exec('insertOrderedList')} style={{ background: '#f1f8e9', border: '1px solid #dcedc8', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>1. Список</button>
          <button type="button" onClick={() => exec('justifyLeft')} style={{ background: '#fafafa', border: '1px solid #e0e0e0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>⟸</button>
          <button type="button" onClick={() => exec('justifyCenter')} style={{ background: '#fafafa', border: '1px solid #e0e0e0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>⟷</button>
          <button type="button" onClick={() => exec('justifyRight')} style={{ background: '#fafafa', border: '1px solid #e0e0e0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>⟹</button>
          <button type="button" onClick={() => exec('formatBlock', 'H1')} style={{ background: '#ede7f6', border: '1px solid #d1c4e9', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 800 }}>H1</button>
          <button type="button" onClick={() => exec('formatBlock', 'H2')} style={{ background: '#ede7f6', border: '1px solid #d1c4e9', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 800 }}>H2</button>
          <button type="button" onClick={() => exec('formatBlock', 'H3')} style={{ background: '#ede7f6', border: '1px solid #d1c4e9', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 800 }}>H3</button>
          <button type="button" onClick={() => exec('formatBlock', 'P')} style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}>Обычный</button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff' }}>
            Цвет
            <input type="color" value={textColor} onChange={(e) => { setTextColor(e.target.value); exec('foreColor', e.target.value); }} style={{ width: 26, height: 26, border: 'none', background: 'transparent', padding: 0 }} />
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff' }}>
            Маркер
            <input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); exec('hiliteColor', e.target.value); }} style={{ width: 26, height: 26, border: 'none', background: 'transparent', padding: 0 }} />
          </label>
          <button type="button" onClick={() => exec('removeFormat')} style={{ background: '#fafafa', border: '1px solid #e0e0e0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Очистить</button>
        </div>
        {/* Rich editor */}
        <div
          ref={editorRef}
          contentEditable
          dir="ltr"
          onInput={(e) => {
            const html = e.currentTarget ? e.currentTarget.innerHTML : '';
            setForm(f => ({ ...f, content: html }));
          }}
          suppressContentEditableWarning
          style={{ width: '100%', minHeight: 140, padding: '14px 52px 14px 18px', borderRadius: 12, border: '1.5px solid #e74c3c', background: '#fff', fontSize: '1.06rem', outline: 'none', overflowY: 'auto', textAlign: 'left', direction: 'ltr', unicodeBidi: 'bidi-override' }}
        />
        <button
          type="button"
          onClick={() => setShowEmoji(v => !v)}
          title="Эмодзи"
          style={{ position: 'absolute', right: 8, top: 48, background: 'linear-gradient(135deg, #ffe082 0%, #fcb69f 100%)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', boxShadow: '0 1px 6px #e74c3c33', color: '#232931', fontWeight: 700 }}
        >
          😊
        </button>
        {showEmoji && (
          <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 100, zIndex: 1000, width: '1120px', maxWidth: 'calc(100% - 16px)' }} onClick={e => e.stopPropagation()}>
            <CustomEmojiPicker
              isOpen={showEmoji}
              onClose={() => setShowEmoji(false)}
              onEmojiSelect={(emoji) => {
                const str = String(emoji || '');
                if (str.startsWith('custom:')) insertCustomEmojiAtCursor(str);
                else if (editorRef.current) {
                  editorRef.current.focus();
                  document.execCommand('insertText', false, str);
                  const currentHtml = editorRef.current ? editorRef.current.innerHTML : '';
                  setForm(f => ({ ...f, content: currentHtml }));
                } else {
                  setForm(f => ({ ...f, content: (f.content || '') + str }));
                }
              }}
            />
          </div>
        )}
      </div>
      <button type="submit" style={{ background: 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px #43e97b22, 0 0 0 2px #2193b044', opacity: isSending ? 0.7 : 1 }} disabled={isSending}>
        {isSending ? 'Добавление...' : 'Добавить'}
      </button>
    </form>
  );
}

export default NewsModal;
