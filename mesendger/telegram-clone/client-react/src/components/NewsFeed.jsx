import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import CustomEmojiPicker from './Common/EmojiPicker';
import { io } from 'socket.io-client';
import { FaUserCircle, FaSort } from 'react-icons/fa';
import DOMPurify from 'dompurify';
import { getCustomEmojiSizeForArea, subscribeEmojiSettings } from '../utils/emojiSettings';

// Декодируем HTML-сущности, сохраняя теги (не превращаем HTML в простой текст)
const decodeHtmlEntities = (html) => {
  if (!html) return '';
  try {
    const container = document.createElement('div');
    // Помещаем строку в DOM, чтобы браузер раскодировал сущности
    container.innerHTML = html;
    // Возвращаем HTML как строку с сохранением тегов
    return container.innerHTML;
  } catch (e) {
    return html;
  }
};

const safeHtml = (html) => DOMPurify.sanitize(decodeHtmlEntities(html));

const stripHtml = (html) => decodeHtmlEntities(html).replace(/\s+/g, ' ').trim();

// Styled components
const CommentModalBg = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 9999;
  background: rgba(34,40,49,0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  height: 100vh;
`;

const CommentModal = styled.div`
  width: 100%;
  max-width: 730px;
  height: 600px;
  max-height: 190vh;
  background: #fff;
  border-radius: 18px;
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

const CommentInput = styled.textarea`
  width: 100%;
  min-height: 64px;
  max-height: 80px;
  border-radius: 10px;
  border: 1.5px solid #2193b0;
  font-size: 1.08em;
  padding: 12px 14px;
  margin-bottom: 12px;
  background: #f9f9f9;
  resize: none;
  overflow: hidden;
  box-sizing: border-box;
  &:focus { border: 2px solid #43e97b; outline: none; box-shadow: 0 0 8px #43e97b55; }
`;

const CommentsBlock = styled.div`
  margin-top: 16px;
  background: #f9f9f9;
  border-radius: 12px;
  box-shadow: 0 2px 8px #2193b011;
  padding: 14px 18px 8px 18px;
  overflow: hidden;
`;

const CommentItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #43e97b33;
  &:last-child { border-bottom: none; }
  font-family: 'Segoe UI Emoji', 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI', 'Arial', sans-serif;
`;

const Wrapper = styled.div`
  flex: 1 1 0%;
  min-width: 0;
  min-height: 100vh;
  margin: 0;
  background: #0b1220;
  padding: 32px 20px 28px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: auto;
`;

const Title = styled.h2`
  color: #e2e8f0;
  font-size: 1.8em;
  font-weight: 800;
  margin-bottom: 18px;
  letter-spacing: 0.01em;
  text-align: center;
`;

const Input = styled.input`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid #2193b0;
  font-size: 1.08rem;
  background: rgba(255,255,255,0.92);
  transition: border .2s, box-shadow .2s;
  &:focus { border: 2px solid #43e97b; outline: none; box-shadow: 0 0 8px #43e97b55; }
`;

const Textarea = styled.textarea`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid #e74c3c;
  font-size: 1.08rem;
  background: rgba(255,255,255,0.92);
  min-height: 60px;
  resize: vertical;
  transition: border .2s, box-shadow .2s;
  &:focus { border: 2px solid #fcb69f; outline: none; box-shadow: 0 0 8px #fcb69f55; }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #2193b0 0%, #43e97b 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 7px 14px;
  font-weight: 600;
  font-size: 0.93em;
  cursor: pointer;
  box-shadow: 0 2px 8px #43e97b22, 0 0 0 2px #2193b044;
  transition: background 0.2s, color 0.2s;
  outline: none;
  filter: drop-shadow(0 0 8px #2193b088);
  &:hover {
    background: linear-gradient(135deg, #43e97b 0%, #2193b0 100%);
    color: #fff;
    transform: scale(1.07);
    box-shadow: 0 4px 24px #43e97b88, 0 0 32px #2193b088;
    border-color: #43e97b;
    filter: drop-shadow(0 0 16px #43e97bcc);
  }
`;

const CardList = styled.ul`
  list-style: none;
  padding: 0;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
`;

const Card = styled.li`
  background: #0f172a;
  border: 1px solid #1f2937;
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(0,0,0,.25);
  margin-bottom: 18px;
  padding: 22px 24px 18px 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  font-size: 0.95em;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  position: relative;
  overflow: hidden;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 36px rgba(0,0,0,.35);
    border-color: #334155;
  }
`;

const CardInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const CardTitle = styled.span`
  color: #f8fafc;
  font-weight: 900;
  font-size: 1.35em;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  position: relative;
  padding-left: 16px;
  padding-right: 12px;
  padding-top: 8px;
  padding-bottom: 8px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(36,48,65,.92) 0%, rgba(17,24,39,.92) 100%);
  border: 1px solid #243041;
  box-shadow: 0 6px 20px rgba(0,0,0,.25);
  &::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent, #38bdf8);
    box-shadow: 0 0 0 3px rgba(56,189,248,.15);
  }
`;

const CardContent = styled.div`
  color: #232931;
  font-size: 1.12em;
  margin-top: 2px;
  line-height: 1.6;
`;

const DeleteBtn = styled(Button)`
  background: linear-gradient(135deg, #e74c3c 0%, #fcb69f 100%);
  color: #fff;
  margin-left: 18px;
  filter: drop-shadow(0 0 8px #e74c3c88);
  &:hover {
    background: linear-gradient(135deg, #fcb69f 0%, #e74c3c 100%);
    filter: drop-shadow(0 0 16px #e74c3ccc);
  }
`;

// Сдержанный стиль для варианта опроса
const CardOption = styled.div`
  background: #f7f9fc;
  border: 1px solid #e5eaf0;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 14px;
  color: #2c3e50;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  position: relative;
  display: block;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  &:hover {
    border-color: #d7dde6;
    box-shadow: 0 4px 14px rgba(16, 24, 40, 0.08);
  }
`;

// Main component
export default function NewsFeed({ token, modal = false }) {
  // State declarations
  const [news, setNews] = useState([]);
  const [votersInfo, setVotersInfo] = useState({});
  const [commentModal, setCommentModal] = useState({ open: false, congratId: null, newsId: null });
  const [commentText, setCommentText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [congratulations, setCongratulations] = useState([]);
  const commentEditorRef = useRef(null);

  const tokenizeFromHtml = (html) => {
    if (!html) return '';
    const container = document.createElement('div');
    container.innerHTML = html;
    // replace inline custom emoji images back to tokens
    container.querySelectorAll('img[data-custom-emoji]')?.forEach(img => {
      const token = img.getAttribute('data-token');
      const textNode = document.createTextNode(token || '');
      img.replaceWith(textNode);
    });
    return container.textContent || container.innerText || '';
  };

  const insertCustomEmojiAtCursor = (token) => {
    if (!commentEditorRef.current) return;
    commentEditorRef.current.focus();
    const url = customEmojiMap[token];
    if (!url) {
      document.execCommand('insertText', false, token);
      return;
    }
    const img = document.createElement('img');
    img.src = url;
    img.alt = token;
    img.setAttribute('data-custom-emoji', 'true');
    img.setAttribute('data-token', token);
    const px = Number((commentModal.congratId ? emojiSizes.congratsComments : emojiSizes.newsComments) || 24);
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
      commentEditorRef.current.appendChild(img);
    }
    // sync text state for counter
    const text = tokenizeFromHtml(commentEditorRef.current.innerHTML);
    setCommentText(text.slice(0, MAX_COMMENT_LEN));
  };

  const [form, setForm] = useState({ title: '', content: '', publishAt: '' });
  const [pollVoteLoading, setPollVoteLoading] = useState({});
  const [pollVoteError, setPollVoteError] = useState({});
  const [likeLoading, setLikeLoading] = useState({});
  const [createPollOpen, setCreatePollOpen] = useState(false);
  const [pollForm, setPollForm] = useState({ question: '', options: ['',''] });
  const [pollCreateLoading, setPollCreateLoading] = useState(false);
  const [pollCreateError, setPollCreateError] = useState('');
  const [collapsedVoters, setCollapsedVoters] = useState({});
  const [showContentModal, setShowContentModal] = useState(false);
  const [tempContent, setTempContent] = useState('');
  const [sort, setSort] = useState('desc');
  const [user, setUser] = useState(null);
  const [isCommentSending, setIsCommentSending] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [customEmojiMap, setCustomEmojiMap] = useState({});
  const [emojiSizes, setEmojiSizes] = useState({
    news: getCustomEmojiSizeForArea('news'),
    newsComments: getCustomEmojiSizeForArea('newsComments'),
    congrats: getCustomEmojiSizeForArea('congrats'),
    congratsComments: getCustomEmojiSizeForArea('congratsComments'),
    chatModal: getCustomEmojiSizeForArea('chatModal')
  });
  // Refs for keeping focus on the commented item
  const itemRefs = useRef({});
  const MAX_COMMENT_LEN = 500;
  // Helper to extract avatar url from different payload shapes
  // Backend origin resolver for static files
  const getApiOrigin = () => {
    // Allow global override or env var; fallback to localhost:5000
    const g = (typeof window !== 'undefined' && (window.__API_ORIGIN__ || window.API_ORIGIN)) || '';
    const env = (typeof process !== 'undefined' && process.env && (process.env.REACT_APP_API_ORIGIN || process.env.VITE_API_ORIGIN)) || '';
    return g || env || 'http://localhost:5000';
  };

  const getAvatarUrl = (src) => {
    if (!src) return null;
    if (typeof src === 'string') return normalizeAvatarUrl(src);
    if (typeof src !== 'object') return null;
    return (
      normalizeAvatarUrl(src.avatar_url) ||
      normalizeAvatarUrl(src.authorAvatar) ||
      normalizeAvatarUrl(src.author_avatar) ||
      normalizeAvatarUrl(src.userAvatar) ||
      normalizeAvatarUrl(src.user_avatar) ||
      (src.employee && normalizeAvatarUrl(src.employee.avatar_url)) ||
      (src.author && (normalizeAvatarUrl(src.author.avatar_url) || normalizeAvatarUrl(src.author.avatar))) ||
      // Fallback: if this item authored by current user, use their avatar from localStorage
      ((src.authorId && user && (src.authorId === user.id) && normalizeAvatarUrl(user.avatar_url)) || null) ||
      null
    );
  };
  // For congratulations entries coming from /api/congratulations,
  // get author's avatar from the congratulation data itself
  const getAuthorAvatarForCongrat = (congrat) => {
    if (congrat && congrat.author_avatar) {
      return normalizeAvatarUrl(congrat.author_avatar);
    }
    // Fallback: try to find corresponding news item to get author's avatar
    const relatedNews = Array.isArray(news) ? news.find(n => n && n.congratulationId === congrat.id) : null;
    return relatedNews ? getAvatarUrl(relatedNews) : null;
  };
  // Normalize avatar url helper
  const normalizeAvatarUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    let trimmed = url.trim();
    // Normalize Windows backslashes to forward slashes
    trimmed = trimmed.replace(/\\/g, '/');
    // If absolute local path contains uploads/avatars, strip to web path
    const idx = trimmed.toLowerCase().indexOf('/uploads/avatars/');
    if (idx !== -1) {
      const path = trimmed.slice(idx);
      // If running on different origin (e.g., 3000), prefix backend origin
      if (typeof window !== 'undefined' && window.location && !path.startsWith('http')) {
        return `${getApiOrigin()}${path}`;
      }
      return path;
    }
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/uploads') || trimmed.startsWith('/images')) {
      return `${getApiOrigin()}${trimmed}`;
    }
    if (trimmed.startsWith('uploads/')) return `${getApiOrigin()}/` + trimmed;
    return `${getApiOrigin()}/uploads/avatars/` + trimmed.replace(/^\/+/, '');
  };
  
  // Derived values
  const userId = user?.id;
  const isAdminOrHr = user?.role === 'admin' || user?.role === 'hr';
  const now = Date.now();

  // Effect: Lock body scroll when comment modal is open
  useEffect(() => {
    if (commentModal.open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [commentModal.open]);

  // Load custom emojis map for rendering tokens like custom:name
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

  // Подписка на обновления настроек эмодзи для динамического изменения размеров
  useEffect(() => {
    const unsubscribe = subscribeEmojiSettings(() => {
      setEmojiSizes({
        news: getCustomEmojiSizeForArea('news'),
        newsComments: getCustomEmojiSizeForArea('newsComments'),
        congrats: getCustomEmojiSizeForArea('congrats'),
        congratsComments: getCustomEmojiSizeForArea('congratsComments'),
        chatModal: getCustomEmojiSizeForArea('chatModal')
      });
    });
    return unsubscribe;
  }, []);

  const renderTextWithCustomEmojis = (text, area = 'news') => {
    if (typeof text !== 'string' || !text) return text;
    const parts = text.split(/(custom:[\w.-]+)/g);
    return parts.map((part, idx) => {
      if (/^custom:[\w.-]+$/.test(part) && customEmojiMap[part]) {
        const px = Number(
          area === 'news' ? emojiSizes.news
          : area === 'newsComments' ? emojiSizes.newsComments
          : area === 'congrats' ? emojiSizes.congrats
          : area === 'congratsComments' ? emojiSizes.congratsComments
          : emojiSizes.news
        ) || 24;
        return (
          <img
            key={`ce-${idx}`}
            src={customEmojiMap[part]}
            alt={part}
            style={{ width: px, height: px, objectFit: 'cover', verticalAlign: 'middle', margin: '0 2px', borderRadius: 6 }}
          />
        );
      }
      return <span key={`t-${idx}`}>{part}</span>;
    });
  };

  // Effect: Setup socket listener (only once)
  useEffect(() => {
    const socket = io('http://localhost:5000');
    socket.on('new_congratulation', (congrat) => {
      setCongratulations(prev => [congrat, ...prev]);
    });
    socket.on('congratulation-deleted', ({ id }) => {
      setCongratulations(prev => prev.filter(c => c.id !== id));
    });
    // --- Новое: слушаем удаление новости ---
    socket.on('news-deleted', ({ id }) => {
      setNews(prev => prev.filter(n => n.id !== id));
    });
    return () => {
      socket.off('new_congratulation');
      socket.off('congratulation-deleted');
      socket.off('news-deleted');
    };
  }, []);

  // Effect: Fetch congratulations when token is available
  useEffect(() => {
    if (!token) return;
    
    fetch('/api/congratulations', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCongratulations(data);
        } else {
          console.error('API returned non-array data:', data);
          setCongratulations([]);
        }
      })
      .catch((error) => {
        console.error('Error fetching congratulations:', error);
        setCongratulations([]);
      });
  }, [token]);

  // Effect: Fetch news periodically and user from localStorage
  useEffect(() => {
    const fetchNews = () => {
      fetch('/api/news', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(newsArr => {
          if (Array.isArray(newsArr)) {
            setNews(newsArr);
            if (newsArr.length > 0) {
              localStorage.setItem('lastNewsId', newsArr[0].id);
              window.dispatchEvent(new CustomEvent('news-read'));
            }
          } else {
            setNews([]);
          }
        })
        .catch(() => setNews([]));
    };
    fetchNews();
    const interval = setInterval(fetchNews, 15000);
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    const handler = () => fetchNews();
    window.addEventListener('news-published', handler);
    return () => {
      clearInterval(interval);
      window.removeEventListener('news-published', handler);
    };
  }, [token]);

  // Effect: Load voters info for polls
  useEffect(() => {
    const pollNews = news.filter(n => n.type === 'poll' || !!n.pollOptions);
    pollNews.forEach(item => {
      fetch(`/api/news/${item.id}/voters`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          setVotersInfo(prev => ({ ...prev, [item.id]: data }));
        })
        .catch(() => {
          setVotersInfo(prev => ({ ...prev, [item.id]: { voted: [], notVoted: [], totalWorkUsers: 0 } }));
        });
    });
  }, [news, token]);

  // Handlers
  const handleLike = (id, isNews = false, userLiked = false) => {
    if (!userId || likeLoading[id]) return; // Предотвращаем множественные клики
    
    // Устанавливаем состояние загрузки
    setLikeLoading(prev => ({ ...prev, [id]: true }));
    
    // Оптимистичное обновление UI - сразу меняем состояние локально
    if (isNews) {
      setNews(prevNews => 
        prevNews.map(item => 
          item.id === id 
            ? { 
                ...item, 
                likes: userLiked ? (item.likes || 0) - 1 : (item.likes || 0) + 1,
                newsLikes: userLiked 
                  ? (item.newsLikes || []).filter(like => like.user_id !== userId)
                  : [...(item.newsLikes || []), { user_id: userId }]
              }
            : item
        )
      );
    } else {
      setCongratulations(prevCongrats => 
        prevCongrats.map(item => 
          item.id === id 
            ? { 
                ...item, 
                likes: userLiked ? (item.likes || 0) - 1 : (item.likes || 0) + 1,
                likedByUser: !userLiked
              }
            : item
        )
      );
    }

    // Отправляем запрос на сервер
    const url = isNews
      ? (userLiked ? `/api/news/${id}/unlike` : `/api/news/${id}/like`)
      : `/api/congratulations/${id}/like`;

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({})
    }).then(response => {
      setLikeLoading(prev => ({ ...prev, [id]: false })); // Снимаем состояние загрузки
      
      if (!response.ok) {
        // Если запрос не удался, откатываем изменения
        if (isNews) {
          setNews(prevNews => 
            prevNews.map(item => 
              item.id === id 
                ? { 
                    ...item, 
                    likes: userLiked ? (item.likes || 0) + 1 : (item.likes || 0) - 1,
                    newsLikes: userLiked 
                      ? [...(item.newsLikes || []), { user_id: userId }]
                      : (item.newsLikes || []).filter(like => like.user_id !== userId)
                  }
                : item
            )
          );
        } else {
          setCongratulations(prevCongrats => 
            prevCongrats.map(item => 
              item.id === id 
                ? { 
                    ...item, 
                    likes: userLiked ? (item.likes || 0) + 1 : (item.likes || 0) - 1,
                    likedByUser: userLiked
                  }
                : item
            )
          );
        }
        console.error('Ошибка при обновлении лайка');
      }
    }).catch(error => {
      setLikeLoading(prev => ({ ...prev, [id]: false })); // Снимаем состояние загрузки
      
      // Если произошла ошибка, откатываем изменения
      if (isNews) {
        setNews(prevNews => 
          prevNews.map(item => 
            item.id === id 
              ? { 
                  ...item, 
                  likes: userLiked ? (item.likes || 0) + 1 : (item.likes || 0) - 1,
                  newsLikes: userLiked 
                    ? [...(item.newsLikes || []), { user_id: userId }]
                    : (item.newsLikes || []).filter(like => like.user_id !== userId)
                }
              : item
          )
        );
      } else {
        setCongratulations(prevCongrats => 
          prevCongrats.map(item => 
            item.id === id 
              ? { 
                  ...item, 
                  likes: userLiked ? (item.likes || 0) + 1 : (item.likes || 0) - 1,
                  likedByUser: userLiked
                }
              : item
          )
        );
      }
      console.error('Ошибка при обновлении лайка:', error);
    });
  };

  // Fix local comment addition in handleComment to ensure username and text are strings
  const handleComment = (id, commentText, isNews = false) => {
    setIsCommentSending(true);
    setCommentError('');

    const url = isNews
      ? `/api/news/${id}/comment`
      : `/api/congratulations/${id}/comment`;

    let body;
    if (isNews) {
      body = JSON.stringify({ commentText });
    } else {
      body = JSON.stringify({ commentText });
    }

    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body
    };

    fetch(url, fetchOptions)
      .then(res => {
        if (!res.ok) throw new Error('Ошибка при отправке комментария');
        setCommentText('');

        // Normalize commentText and username to strings
        const normalizedText = String(commentText);
        const normalizedUsername = String(user?.username || '');

        // Locally update comments for instant display
        if (isNews) {
          setNews(prevNews => prevNews.map(n =>
            n.id === id
              ? {
                  ...n,
                  newsComments: [...(n.newsComments || []), { username: normalizedUsername, text: normalizedText, avatar: user?.avatarUrl || null }]
                }
              : n
          ));
        } else {
          setCongratulations(prev => prev.map(c =>
            c.id === id
              ? {
                  ...c,
                  comments: [...(c.comments || []), { username: normalizedUsername, text: normalizedText, avatar: user?.avatarUrl || null }]
                }
              : c
          ));
        }

        // Keep focus on the commented card
        const key = isNews ? `news-${id}` : `congrat-${id}`;
        const doScroll = () => {
          const el = itemRefs.current[key];
          if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        };
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(doScroll);
        } else {
          setTimeout(doScroll, 0);
        }

        // Close comment modal after successful send
        setCommentModal({ open: false, congratId: null, newsId: null });
      })
      .catch(() => setCommentError('Не удалось отправить комментарий.'))
      .finally(() => setIsCommentSending(false));
  };

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const addPollOption = () => {
    setPollForm(p => ({ ...p, options: [...p.options, ''] }));
  };
  const removePollOption = (idx) => {
    setPollForm(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }));
  };
  const updatePollOption = (idx, value) => {
    setPollForm(p => ({ ...p, options: p.options.map((opt, i) => i === idx ? value : opt) }));
  };
  const submitPoll = async () => {
    setPollCreateError('');
    const question = pollForm.question.trim();
    const options = pollForm.options.map(o => o.trim()).filter(Boolean);
    if (!question || options.length < 2) {
      setPollCreateError('Введите вопрос и минимум 2 варианта.');
      return;
    }
    setPollCreateLoading(true);
    try {
      const res = await fetch('/api/news/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, options })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Ошибка создания опроса');
      }
      setCreatePollOpen(false);
      setPollForm({ question: '', options: ['',''] });
      // Refresh news
      fetch('/api/news', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(newsArr => { if (Array.isArray(newsArr)) setNews(newsArr); });
    } catch (e) {
      setPollCreateError(e.message || 'Ошибка создания опроса');
    } finally {
      setPollCreateLoading(false);
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (e.target && e.target.name === 'plan' && !form.publishAt) {
      alert('Укажите дату публикации для планирования!');
      return;
    }
    
    fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: form.title, content: form.content, publishAt: form.publishAt })
    })
      .then(() => {
        setForm({ title: '', content: '', publishAt: '' });
        fetch('/api/news', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(newsArr => {
            if (Array.isArray(newsArr)) {
              setNews(newsArr);
              if (newsArr.length > 0) {
                localStorage.setItem('lastNewsId', newsArr[0].id);
                window.dispatchEvent(new CustomEvent('news-read'));
              }
            } else {
              setNews([]);
            }
          })
          .catch(() => setNews([]));
      });
  };

  const handleDelete = async id => {
    try {
      const response = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        setNews(n => n.filter(item => item.id !== id));
      } else {
        const error = await response.json();
        console.error('Ошибка удаления новости:', error);
        alert(`Ошибка удаления новости: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении новости:', error);
      alert('Ошибка при удалении новости. Попробуйте еще раз.');
    }
  };

  // Удалить поздравление
  const handleDeleteCongrat = async id => {
    try {
      const response = await fetch(`/api/congratulations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        setCongratulations(arr => arr.filter(c => c.id !== id));
      } else {
        const error = await response.json();
        console.error('Ошибка удаления поздравления:', error);
        alert(`Ошибка удаления поздравления: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении поздравления:', error);
      alert('Ошибка при удалении поздравления. Попробуйте еще раз.');
    }
  };


  // --- Для голосования в опросах новостей ---
  const handlePollVote = async (newsId, optionIdx) => {
    if (!userId) return;
    setPollVoteLoading(prev => ({ ...prev, [newsId]: true }));
    setPollVoteError(prev => ({ ...prev, [newsId]: '' }));
    
    try {
      const res = await fetch(`/api/news/${newsId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, optionIndex: optionIdx })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Ошибка голосования');
      }
      
      // После голосования обновляем новости
      fetch('/api/news', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(newsArr => {
          if (Array.isArray(newsArr)) setNews(newsArr);
        });
    } catch (e) {
      setPollVoteError(prev => ({ ...prev, [newsId]: e.message || 'Ошибка голосования' }));
    } finally {
      setPollVoteLoading(prev => ({ ...prev, [newsId]: false }));
    }
  };

  // Переключение состояния свернутости для конкретного варианта
  const toggleVotersCollapse = (newsId, optionIdx) => {
    setCollapsedVoters(prev => ({
      ...prev,
      [newsId]: {
        ...(prev[newsId] || {}),
        [optionIdx]: !((prev[newsId] || {})[optionIdx])
      }
    }));
  };

  // Sorting and filtering
  const sortedNews = [...news].sort((a, b) => sort === 'desc' ? b.id - a.id : a.id - b.id);
  const visibleNews = modal
    ? sortedNews
    : sortedNews.filter(n => isAdminOrHr || (!n.publishAt || new Date(n.publishAt) <= now));

  // Unified feed (news + congratulations) for modal view, newest-first by default
  const combinedFeed = React.useMemo(() => {
    // normalize timestamp for sorting
    const mapNews = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.map(n => ({
        kind: 'news',
        ts: (n.publishAt ? Date.parse(n.publishAt) : (n.createdAt ? Date.parse(n.createdAt) : 0)) || n.id || 0,
        item: n
      }));
    };
    const mapCongrats = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.map(c => ({
        kind: 'congrat',
        ts: (c.scheduled_at ? Date.parse(c.scheduled_at) : (c.created_at ? Date.parse(c.created_at) : 0)) || c.id || 0,
        item: c
      }));
    };

    const baseNews = modal ? news : visibleNews;
    const unified = [...mapNews(baseNews), ...mapCongrats(congratulations)];
    unified.sort((a, b) => (sort === 'desc' ? b.ts - a.ts : a.ts - b.ts));
    return unified;
  }, [modal, news, visibleNews, congratulations, sort]);

  // Selected item for comment modal header
  const currentCommentTarget = React.useMemo(() => {
    if (!commentModal.open) return null;
    if (commentModal.congratId) {
      return { kind: 'congrat', data: congratulations.find(c => c.id === commentModal.congratId) };
    }
    if (commentModal.newsId) {
      return { kind: 'news', data: news.find(n => n.id === commentModal.newsId) };
    }
    return null;
  }, [commentModal, news, congratulations]);

  return (
    <Wrapper>
      <Title>Новостная лента</Title>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center' }}>
        <FaSort title="Сортировка" style={{ color: '#e74c3c' }} />
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: 6, borderRadius: 6, border: '1px solid #b2bec3' }} title="Сортировка">
          <option value="desc">Сначала новые</option>
          <option value="asc">Сначала старые</option>
        </select>
        <span style={{ marginLeft: 16, color: '#636e72', fontSize: '0.98em' }}>Всего: {visibleNews.length}</span>
        
      </div>

      {/* Modal for editing news content */}
      {showContentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(34,40,49,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowContentModal(false)}>
          <div style={{ width: '100%', maxWidth: 'none', minHeight: '100vh', height: '100%', background: '#fff', borderRadius: 0, padding: '48px 48px 32px 48px', boxSizing: 'border-box', position: 'relative', fontFamily: 'inherit', color: '#222', fontSize: '1.08em', overflow: 'hidden', overflowY: 'hidden', border: 'none' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowContentModal(false)} style={{ position: 'absolute', top: 18, right: 24, fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', color: '#2193b0' }}>×</button>
            <h3 style={{ marginBottom: 18, color: '#e74c3c' }}>Текст новости</h3>
            <Textarea
              name="modalContent"
              placeholder="Введите текст новости..."
              value={tempContent}
              onChange={e => setTempContent(e.target.value)}
              style={{ width: '100%', minHeight: 320, fontSize: '1.18em', padding: '18px 22px', resize: 'vertical' }}
              autoFocus
            />
            <Button type="button" style={{ marginTop: 18 }} onClick={() => { setForm(f => ({ ...f, content: tempContent })); setShowContentModal(false); }}>Сохранить</Button>
          </div>
        </div>
      )}

      {/* Create Poll Modal */}
      {isAdminOrHr && createPollOpen && (
        <CommentModalBg onClick={() => setCreatePollOpen(false)}>
          <CommentModal onClick={e => e.stopPropagation()}>
            <button onClick={() => setCreatePollOpen(false)} style={{ position: 'absolute', top: 12, right: 16, fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#2193b0' }}>×</button>
            <h3 style={{ marginBottom: 14, color: '#e74c3c' }}>Создать опрос</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Input
                placeholder="Вопрос опроса"
                value={pollForm.question}
                onChange={e => setPollForm(p => ({ ...p, question: e.target.value }))}
                style={{ fontSize: '1.08em' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pollForm.options.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Input
                      placeholder={`Вариант #${idx + 1}`}
                      value={opt}
                      onChange={e => updatePollOption(idx, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {pollForm.options.length > 2 && (
                      <DeleteBtn type="button" onClick={() => removePollOption(idx)} title="Удалить вариант">Удалить</DeleteBtn>
                    )}
                  </div>
                ))}
                <Button type="button" style={{ background: '#ffe082', color: '#232931' }} onClick={addPollOption}>Добавить вариант</Button>
              </div>
              {pollCreateError && <div style={{ color: '#e74c3c' }}>{pollCreateError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button type="button" style={{ background: '#e0f7fa', color: '#232931' }} onClick={() => setCreatePollOpen(false)}>Отмена</Button>
                <Button type="button" onClick={submitPoll} disabled={pollCreateLoading} style={{ opacity: pollCreateLoading ? 0.7 : 1 }}>
                  {pollCreateLoading ? 'Создание...' : 'Опубликовать'}
                </Button>
              </div>
            </div>
          </CommentModal>
        </CommentModalBg>
      )}

      <CardList>
        {/* Modal: render unified combined feed */}
        {modal && combinedFeed.map(entry => {
          if (entry.kind === 'congrat') {
            const c = entry.item;
            return (
              <Card key={`congrat-${c.id}`} ref={el => { itemRefs.current[`congrat-${c.id}`] = el; }} style={{ borderLeft: '7px solid #fcb69f', background: 'linear-gradient(135deg, #fff5f2 60%, #ffe8e0 100%)' }}>
                <CardInfo>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {getAuthorAvatarForCongrat(c) || getAvatarUrl(c)
                      ? <img src={getAuthorAvatarForCongrat(c) || getAvatarUrl(c)} alt="avatar" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', boxShadow: '0 2px 8px #e74c3c33' }} />
                      : <FaUserCircle size={32} color="#b2bec3" title="Аватар" />}
                    <div>
                      <CardTitle style={{ display: 'block', marginBottom: 8 }}>
                        {c.first_name} {c.last_name}
                      </CardTitle>
                      <span style={{ color: '#888', fontSize: '0.98em', marginBottom: 8, display: 'block' }}>
                        {c.birth_day && c.birth_month && c.birth_year
                          ? `Дата рождения: ${c.birth_day.padStart(2, '0')}.${c.birth_month.padStart(2, '0')}.${c.birth_year}`
                          : ''}
                      </span>
                      {c.file_url && (
                        c.file_url.endsWith('.mp4') ? (
                          <video src={c.file_url} controls style={{ maxWidth: 320, maxHeight: 220, margin: '10px 0', borderRadius: 12, boxShadow: '0 2px 8px #2193b033' }} />
                        ) : (
                          <img src={c.file_url} alt="media" style={{ maxWidth: 320, maxHeight: 220, margin: '10px 0', borderRadius: 12, boxShadow: '0 2px 8px #2193b033' }} />
                        )
                      )}
                      <CardContent 
                        style={{ display: 'block', marginTop: 8, whiteSpace: 'pre-line', fontSize: '1.08em' }}
                        dangerouslySetInnerHTML={{ __html: safeHtml(c.congrat_text || '') }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'center' }}>
                    <Button 
                      style={{ 
                        background: '#e0f7fa', 
                        color: '#232931',
                        opacity: likeLoading[c.id] ? 0.6 : 1,
                        cursor: likeLoading[c.id] ? 'not-allowed' : 'pointer'
                      }} 
                      onClick={() => handleLike(c.id, false, c.likedByUser)}
                      disabled={likeLoading[c.id]}
                    >
                      {likeLoading[c.id] ? '⏳' : '👍'} Лайк ({c.likes || 0})
                    </Button>
                    <Button style={{ background: '#2193b0', color: '#fff' }} onClick={() => {
                      setCommentModal({ open: true, congratId: c.id, newsId: null });
                      setCommentText('');
                      setShowEmoji(false);
                    }}>💬 Комментировать</Button>
                    {isAdminOrHr && (
                      <DeleteBtn style={{ marginLeft: 8 }} onClick={() => handleDeleteCongrat(c.id)}>Удалить</DeleteBtn>
                    )}
                  </div>
                  {Array.isArray(c.comments) && c.comments.length > 0 && (
                    <CommentsBlock>
                      <strong style={{ color: '#e74c3c', fontSize: '1.08em' }}>Комментарии:</strong>
                      <ul style={{ marginTop: 10, marginBottom: 0, padding: 0 }}>
                        {c.comments.map((cm, i) => (
                          <CommentItem key={i}>
                            {cm && typeof cm === 'object' && cm.avatar
                              ? <img src={cm.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover', boxShadow: '0 1px 4px #e74c3c22' }} />
                              : <FaUserCircle size={24} color="#b2bec3" title="Аватар" />}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, color: '#e74c3c', marginBottom: 2 }}>{cm && typeof cm === 'object' ? (cm.username || '') : ''}</span>
                              <span style={{ background: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: '1.04em', color: '#222', boxShadow: '0 1px 4px #e74c3c11', fontFamily: "'Segoe UI Emoji', 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI', 'Arial', sans-serif" }}>{renderTextWithCustomEmojis(cm && typeof cm === 'object' ? (cm.commentText || cm.text || '') : String(cm), 'congratsComments')}</span>
                            </div>
                          </CommentItem>
                        ))}
                      </ul>
                    </CommentsBlock>
                  )}
                </CardInfo>
              </Card>
            );
          }
          // news entry
          const item = entry.item;
          const isPlanned = item.publishAt && new Date(item.publishAt) > now;
          const isCongrat = !!item.congratulationId || (item.title && item.title.startsWith('Поздравление'));
          const isPoll = item.type === 'poll' || !!item.pollOptions;
          
          if (isPoll) {
            // --- Опрос в ленте новостей с голосованием ---
            const options = item.options || item.pollOptions || [];
            const votes = item.votes || [];
            const voters = item.voters || [];
            const totalVotes = votes.reduce((a, b) => a + b, 0);
            const userVotedIdx = Array.isArray(item.votedUsers)
              ? item.votedUsers.findIndex(v => v === userId)
              : (Array.isArray(voters) ? voters.findIndex(v => v === userId) : -1);
            const hasVoted = userVotedIdx !== -1;

            const info = votersInfo[item.id] || { voted: [], notVoted: [], totalWorkUsers: 0 };

            return (
              <Card key={item.id} ref={el => { itemRefs.current[`news-${item.id}`] = el; }} style={{ borderLeft: '7px solid #3b82f6', background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)', color: '#e5e7eb' }}>
                <CardInfo>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {getAvatarUrl(item)
                      ? <img src={getAvatarUrl(item)} alt="avatar" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
                      : <FaUserCircle size={32} color="#b2bec3" title="Аватар" />}
                    <CardTitle style={{ marginBottom: 0, background: 'transparent', color: 'inherit', boxShadow: 'none', textShadow: 'none', padding: 0 }}>
                      <FaSort style={{ color: '#bfa100', fontSize: '1.2em', marginRight: 4 }} />
                      Голосование
                    </CardTitle>
                  </div>
                  <span style={{ color: '#888', fontSize: '0.98em', marginBottom: 8, display: 'block' }}>
                    {item.publishAt
                      ? `Опубликовано: ${new Date(item.publishAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                      : ''}
                  </span>
                  <div style={{marginBottom: 10, fontWeight:700, fontSize:'1.13em', color:'#e5e7eb'}}>{item.question || item.content}</div>
                  {/* Fancy progress visualization */}
                  {Array.isArray(options) && options.map((opt, idx) => {
                    const votesForOption = votes[idx] || 0;
                    const percent = totalVotes > 0 ? Math.round((votesForOption / totalVotes) * 100) : 0;
                    const votedUsers = Array.isArray(info.votedByOption)
                      && info.votedByOption[idx]
                      && Array.isArray(info.votedByOption[idx].users)
                      ? info.votedByOption[idx].users
                      : [];
                    return (
                      <CardOption key={idx} style={{
                        opacity: hasVoted && userVotedIdx !== idx ? 0.7 : 1,
                        border: hasVoted && userVotedIdx === idx ? '2.5px solid #43e97b' : 'none',
                      }}>
                        <div style={{ fontWeight: 700, fontSize: '1.02em', color: '#344054', marginBottom: 8 }}>{opt}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
                          <div style={{ flex: 1, height: 8, borderRadius: 999, background: '#eef2f6', overflow: 'hidden' }}>
                            <div style={{ width: percent + '%', height: '100%', background: '#3b82f6', transition: 'width .4s' }} />
                          </div>
                          <span style={{ color: '#475467', fontWeight: 700, minWidth: 88, textAlign: 'right' }}>{votesForOption} ({percent}%)</span>
                          <button
                            type="button"
                            style={{ minWidth: 92, padding: '6px 10px', background: '#f8fafc', color: '#344054', borderRadius: 8, border: '1px solid #e5eaf0', fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => toggleVotersCollapse(item.id, idx)}
                          >
                            {collapsedVoters[item.id]?.[idx] ? 'Скрыть' : 'Показать'}
                          </button>
                          {hasVoted ? null : (
                            <button
                              style={{ minWidth: 110, padding: '6px 10px', background: '#3b82f6', color: '#fff', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer', opacity: pollVoteLoading[item.id] ? 0.7 : 1 }}
                              disabled={pollVoteLoading[item.id]}
                              onClick={() => handlePollVote(item.id, idx)}
                            >
                              {pollVoteLoading[item.id] ? 'Голос...' : 'Голосовать'}
                            </button>
                          )}
                        </div>
                        {hasVoted && (
                          <div style={{
                            position: 'absolute',
                            left: 0, bottom: 0, height: 4,
                            width: percent + '%',
                            background: '#ffe082',
                            borderRadius: '0 0 10px 10px',
                            transition: 'width 0.5s',
                            zIndex: 0,
                          }} />
                        )}
                        <div style={{ marginTop: 14, fontSize: '1.04em', fontWeight: 600 }}>
                          {collapsedVoters[item.id]?.[idx] ? (
                            Array.isArray(votedUsers) && votedUsers.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {votedUsers.map(u => (
                                  <span key={u.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 7,
                                    background: 'linear-gradient(90deg, #43e97b22 0%, #ffe08244 100%)',
                                    borderRadius: 50,
                                    padding: '5px 16px',
                                    boxShadow: '0 2px 12px #43e97b22',
                                    transition: 'box-shadow 0.2s, transform 0.2s',
                                    fontWeight: 700,
                                    fontSize: '1.08em',
                                    color: '#2193b0',
                                    letterSpacing: '0.5px',
                                    cursor: 'pointer',
                                    border: '2px solid #43e97b33',
                                  }}>
                                    {u.avatar ? <img src={u.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 8px #ffe08233', marginRight: 4 }} /> : <FaUserCircle size={24} color="#b2bec3" />}
                                    <span>{u.username}</span>
                                  </span>
                                ))}
                              </div>
                            ) : <span style={{ color: '#888', fontStyle: 'italic', fontSize: '1.08em' }}>😶 Нет проголосовавших</span>
                          ) : null}
                        </div>
                      </CardOption>
                    );
                  })}
                  {/* Сообщение об ошибке голосования */}
                  {pollVoteError[item.id] && <div style={{ color: '#e74c3c', marginTop: 8 }}>{pollVoteError[item.id]}</div>}
                  {/* Информация о количестве проголосовавших */}
                  <div style={{ marginTop: 8, color: '#888', fontSize: '0.98em' }}>
                    Проголосовало: {totalVotes}
                  </div>
                  {hasVoted && <div style={{ color: '#43e97b', marginTop: 4, fontWeight: 600 }}>Вы уже голосовали</div>}

                  {/* Новый блок: кто проголосовал и кто нет */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: 700, color: '#232931', marginBottom: 4 }}>Сотрудники, не проголосовали:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {Array.isArray(info.notVoted) && info.notVoted.length === 0 && <span style={{ color: '#888' }}>Нет</span>}
                      {Array.isArray(info.notVoted) ? info.notVoted.map(u => (
                        <span key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ffe08222', borderRadius: 6, padding: '2px 8px' }}>
                          {u.avatar ? <img src={u.avatar} alt="avatar" style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'cover', marginRight: 4 }} /> : <FaUserCircle size={20} color="#b2bec3" />}
                          {u.username}
                        </span>
                      )) : null}
                    </div>
                  </div>
                </CardInfo>
              </Card>
            );
          }
          
          // Обычная новость/поздравление
          return (
            <Card key={`news-${item.id}`} ref={el => { itemRefs.current[`news-${item.id}`] = el; }} style={isCongrat ? { borderLeft: '7px solid #fcb69f', background: 'linear-gradient(135deg, #fff5f2 60%, #ffe8e0 100%)' } : { borderLeft: '7px solid #2193b0', background: 'linear-gradient(135deg, #f5f7ff 60%, #e8f0ff 100%)' }}>
              <CardInfo>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {getAvatarUrl(item)
                    ? <img src={getAvatarUrl(item)} alt="avatar" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', boxShadow: '0 2px 8px #e74c3c33' }} />
                    : <FaUserCircle size={32} color="#b2bec3" title="Аватар" />}
                  <div>
                    <CardTitle style={{ display: 'block', marginBottom: 8 }}>{item.title}</CardTitle>
                    <span style={{ color: '#888', fontSize: '0.98em', marginBottom: 8, display: 'block' }}>
                      {isPlanned && isAdminOrHr
                        ? `Запланировано на: ${new Date(item.publishAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                        : item.publishAt
                          ? `Опубликовано: ${new Date(item.publishAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                          : ''}
                    </span>
                    {/* Показываем media для поздравлений */}
                    {isCongrat && item.file_url && (
                      item.file_url.endsWith('.mp4') ? (
                        <video src={item.file_url} controls style={{ maxWidth: 320, maxHeight: 220, margin: '10px 0', borderRadius: 12, boxShadow: '0 2px 8px #2193b033' }} />
                      ) : (
                        <img src={item.file_url} alt="media" style={{ maxWidth: 320, maxHeight: 220, margin: '10px 0', borderRadius: 12, boxShadow: '0 2px 8px #2193b033' }} />
                      )
                    )}
                    <CardContent
                      style={{ display: 'block', marginTop: 8, fontSize: '1.08em', lineHeight: 1.5, wordBreak: 'break-word', fontFamily: "'Segoe UI Emoji', 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI', 'Arial', sans-serif" }}
                      dangerouslySetInnerHTML={{ __html: safeHtml(item.content || '') }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'center' }}>
                  <Button 
                    style={{ 
                      background: isCongrat ? '#e0f7fa' : '#2193b0', 
                      color: isCongrat ? '#232931' : '#fff',
                      opacity: likeLoading[isCongrat ? item.congratulationId : item.id] ? 0.6 : 1,
                      cursor: likeLoading[isCongrat ? item.congratulationId : item.id] ? 'not-allowed' : 'pointer'
                    }} 
                    onClick={() => handleLike(isCongrat ? item.congratulationId : item.id, !isCongrat, isCongrat ? item.likedByUser : item.newsLikes?.some(like => like.user_id === userId))}
                    disabled={likeLoading[isCongrat ? item.congratulationId : item.id]}
                  >
                    {likeLoading[isCongrat ? item.congratulationId : item.id] ? '⏳' : '👍'} Лайк ({(isCongrat ? item.likes : (item.newsLikes?.length || 0)) || 0})
                  </Button>
                  <Button style={{ background: '#2193b0', color: '#fff' }} onClick={() => {
                    setCommentModal({ open: true, congratId: isCongrat ? item.congratulationId : null, newsId: !isCongrat ? item.id : null });
                    setCommentText('');
                    setShowEmoji(false);
                  }}>💬 Комментировать</Button>
                </div>
                {isCongrat && Array.isArray(item.comments) && item.comments.length > 0 && (
                  <CommentsBlock>
                    <strong style={{ color: '#e74c3c', fontSize: '1.08em' }}>Комментарии:</strong>
                    <ul style={{ marginTop: 10, marginBottom: 0, padding: 0 }}>
                      {item.comments.map((cmt, i) => (
                        <CommentItem key={i}>
                          {cmt.avatar
                            ? <img src={cmt.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover', boxShadow: '0 1px 4px #e74c3c22' }} />
                            : <FaUserCircle size={24} color="#b2bec3" title="Аватар" />}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: '#e74c3c', marginBottom: 2 }}>{cmt.username}</span>
                            <span style={{ background: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: '1.04em', color: '#222', boxShadow: '0 1px 4px #e74c3c11', fontFamily: "'Segoe UI Emoji', 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI', 'Arial', sans-serif" }}>{renderTextWithCustomEmojis(cmt.commentText || cmt.text, 'congratsComments')}</span>
                          </div>
                        </CommentItem>
                      ))}
                    </ul>
                  </CommentsBlock>
                )}
                {!isCongrat && Array.isArray(item.newsComments) && item.newsComments.length > 0 && (
                  <CommentsBlock>
                    <strong style={{ color: '#e74c3c', fontSize: '1.08em' }}>Комментарии:</strong>
                    <ul style={{ marginTop: 10, marginBottom: 0, padding: 0 }}>
                      {item.newsComments.map((cmt, i) => (
                        <CommentItem key={i}>
                          {cmt.avatar
                            ? <img src={cmt.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover', boxShadow: '0 1px 4px #e74c3c22' }} />
                            : <FaUserCircle size={24} color="#b2bec3" title="Аватар" />}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: '#e74c3c', marginBottom: 2 }}>{cmt.username}</span>
                            <span style={{ background: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: '1.04em', color: '#222', boxShadow: '0 1px 4px #e74c3c11' }}>{renderTextWithCustomEmojis(cmt.commentText || cmt.text, 'newsComments')}</span>
                          </div>
                        </CommentItem>
                      ))}
                    </ul>
                  </CommentsBlock>
                )}
                {isAdminOrHr && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <DeleteBtn onClick={() => handleDelete(item.id)} title="Удалить новость">Удалить</DeleteBtn>
                  </div>
                )}
              </CardInfo>
            </Card>
          );
        })}

        {/* Non-modal: original split rendering */}
        {!modal && [...congratulations].sort((a, b) => b.id - a.id).map(congrat => (
          <Card key={congrat.id} style={{ borderLeft: '7px solid #fcb69f' }}>
            <CardInfo>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {getAuthorAvatarForCongrat(congrat) || getAvatarUrl(congrat)
                  ? <img src={getAuthorAvatarForCongrat(congrat) || getAvatarUrl(congrat)} alt="avatar" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', boxShadow: '0 2px 8px #e74c3c33' }} />
                  : <FaUserCircle size={32} color="#b2bec3" title="Аватар" />}
                <div>
                  <CardTitle style={{ display: 'block', marginBottom: 8 }}>
                    {congrat.first_name} {congrat.last_name}
                  </CardTitle>
                  <span style={{ color: '#888', fontSize: '0.98em', marginBottom: 8, display: 'block' }}>
                    {congrat.birth_day && congrat.birth_month && congrat.birth_year
                      ? `Дата рождения: ${congrat.birth_day.padStart(2, '0')}.${congrat.birth_month.padStart(2, '0')}.${congrat.birth_year}`
                      : ''}
                  </span>
                  {congrat.file_url && (
                    congrat.file_url.endsWith('.mp4') ? (
                      <video src={congrat.file_url} controls style={{ maxWidth: 320, maxHeight: 220, margin: '10px 0', borderRadius: 12, boxShadow: '0 2px 8px #2193b033' }} />
                    ) : (
                      <img src={congrat.file_url} alt="media" style={{ maxWidth: 320, maxHeight: 220, margin: '10px 0', borderRadius: 12, boxShadow: '0 2px 8px #2193b033' }} />
                    )
                  )}
                  <CardContent 
                    style={{ display: 'block', marginTop: 8, whiteSpace: 'pre-line', fontSize: '1.08em' }}
                    dangerouslySetInnerHTML={{ __html: safeHtml(congrat.congrat_text || '') }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'center' }}>
                <Button style={{ background: '#e0f7fa', color: '#232931' }} onClick={() => handleLike(congrat.id, false, congrat.likedByUser)}>👍 Лайк ({congrat.likes || 0})</Button>
                <Button style={{ background: '#2193b0', color: '#fff' }} onClick={() => {
                  setCommentModal({ open: true, congratId: congrat.id, newsId: null });
                  setCommentText('');
                  setShowEmoji(false);
                }}>💬 Комментировать</Button>
                {isAdminOrHr && (
                  <DeleteBtn style={{ marginLeft: 8 }} onClick={() => handleDeleteCongrat(congrat.id)}>Удалить</DeleteBtn>
                )}
              </div>
            </CardInfo>
          </Card>
        ))}

        {/* Non-modal news rendering continues above; remove stray opener */}
      </CardList>

      {/* Comment modal */}
      {commentModal.open && (
        <CommentModalBg onClick={() => setCommentModal({ open: false, congratId: null, newsId: null })}>
          <CommentModal onClick={e => e.stopPropagation()}>
            {/* Close */}
            <button onClick={() => setCommentModal({ open: false, congratId: null, newsId: null })} style={{ position: 'absolute', top: 12, right: 16, fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#2193b0' }}>×</button>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {currentCommentTarget?.kind === 'congrat' ? (
                currentCommentTarget?.data?.avatar_url
                  ? <img src={currentCommentTarget.data.avatar_url} alt="avatar" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', boxShadow: '0 2px 8px #e74c3c33' }} />
                  : <FaUserCircle size={32} color="#b2bec3" title="Аватар" />
              ) : (
                currentCommentTarget?.data?.authorAvatar
                  ? <img src={currentCommentTarget.data.authorAvatar} alt="avatar" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', boxShadow: '0 2px 8px #e74c3c33' }} />
                  : <FaUserCircle size={32} color="#b2bec3" title="Аватар" />
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.12em', color: '#e74c3c' }}>
                  {currentCommentTarget?.kind === 'congrat' ? 'Комментарий к поздравлению' : 'Комментарий к новости'}
                </div>
                <div style={{ color: '#636e72', fontSize: '0.92em', maxWidth: 540, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentCommentTarget?.kind === 'congrat'
                    ? stripHtml(currentCommentTarget?.data?.congrat_text || '')
                    : stripHtml(currentCommentTarget?.data?.title || currentCommentTarget?.data?.content || '')}
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowEmoji(v => !v)}
                  style={{ background: 'linear-gradient(135deg, #ffe082 0%, #fcb69f 100%)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', boxShadow: '0 1px 6px #e74c3c33', color: '#232931', fontWeight: 700 }}
                  title="Эмодзи"
                >
                  😊 Эмодзи
                </button>
              </div>
              <div style={{ color: commentText.length > MAX_COMMENT_LEN ? '#e74c3c' : '#888', fontWeight: 700 }}>
                {commentText.length}/{MAX_COMMENT_LEN}
              </div>
            </div>

            {/* Input */}
            <div style={{ position: 'relative', marginBottom: 12, width: '100%' }}>
              <div
                ref={commentEditorRef}
                contentEditable
                role="textbox"
                aria-multiline="true"
                dir="ltr"
                placeholder="Введите текст... (Ctrl/⌘ + Enter — отправить)"
                onInput={(e) => {
                  const text = tokenizeFromHtml(e.currentTarget.innerHTML);
                  if (text.length > MAX_COMMENT_LEN) {
                    // enforce limit by trimming and re-hydrating
                    const trimmed = text.slice(0, MAX_COMMENT_LEN);
                    setCommentText(trimmed);
                  } else {
                    setCommentText(text);
                  }
                }}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isCommentSending) {
                    const text = tokenizeFromHtml(commentEditorRef.current?.innerHTML || '').trim();
                    if (!text) return;
                    if (commentModal.congratId) handleComment(commentModal.congratId, text, false);
                    if (commentModal.newsId) handleComment(commentModal.newsId, text, true);
                    // clear editor on send
                    if (commentEditorRef.current) commentEditorRef.current.innerHTML = '';
                  }
                }}
                style={{
                  fontSize: '1.18em',
                  minHeight: 100,
                  paddingRight: 48,
                  fontFamily: "'Segoe UI Emoji', 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI', 'Arial', sans-serif",
                  border: '1.5px solid #2193b0',
                  borderRadius: 10,
                  padding: '12px 14px',
                  background: '#f9f9f9',
                  outline: 'none'
                }}
              />
              {/* Removed live preview to avoid duplicate text while typing */}
              {showEmoji && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 8, zIndex: 100 }} onClick={e => e.stopPropagation()}>
                  <CustomEmojiPicker
                    isOpen={showEmoji}
                    onClose={() => setShowEmoji(false)}
                    onEmojiSelect={(emoji) => {
                      const token = String(emoji || '');
                      if (token.startsWith('custom:')) insertCustomEmojiAtCursor(token);
                      else document.execCommand('insertText', false, token);
                      // sync
                      const text = tokenizeFromHtml(commentEditorRef.current?.innerHTML || '');
                      setCommentText(text.slice(0, MAX_COMMENT_LEN));
                    }}
                  />
                </div>
              )}
            </div>

            {commentError && <div style={{ color: '#e74c3c', marginBottom: 8 }}>{commentError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                type="button"
                style={{ background: '#e0f7fa', color: '#232931' }}
                onClick={() => setCommentModal({ open: false, congratId: null, newsId: null })}
              >Отмена</Button>
              <Button
                type="button"
                style={{ marginTop: 0, opacity: isCommentSending ? 0.6 : 1, pointerEvents: isCommentSending ? 'none' : 'auto' }}
                disabled={isCommentSending || !commentText.trim()}
                onClick={() => {
                  if (commentText.trim() && !isCommentSending) {
                    if (commentModal.congratId) handleComment(commentModal.congratId, commentText.trim(), false);
                    if (commentModal.newsId) handleComment(commentModal.newsId, commentText.trim(), true);
                  }
                }}
              >
                {isCommentSending ? 'Отправка...' : 'Отправить'}
              </Button>
            </div>
          </CommentModal>
        </CommentModalBg>
      )}
      
    </Wrapper>
  );
}