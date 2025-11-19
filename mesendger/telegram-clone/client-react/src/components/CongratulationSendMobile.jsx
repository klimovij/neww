import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiSmile } from 'react-icons/fi';
import CustomEmojiPicker from './Common/EmojiPicker';
import api from '../services/api';

const PROMPT = `Згенеруй розгорнуте привітання з Днем народження для співробітника. Звертайся на "ти", стиль сучасний, дружній, неофіційний, з гумором і святковим настроєм. Додай кілька різних побажань для роботи, особистого життя, здоров'я, натхнення. Використовуй смайлики у тексті. Не використовуй слово "Issa Plus" у тексті привітання, тільки у підписі в самому кінці. Не використовуй фрази про новий рік, такі як "цей рік", "наступний рік", "цей роком" — це не новорічне привітання! Приклад підпису: \n\nЗ повагою,\nКолектив Issa Plus. Не пиши привітання з нагоди прийому на роботу!`;

export default function CongratulationSendMobile({ user, open, onClose, onSent, onOpenMobileSidebar }) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const editorRef = useRef(null);
  const [customEmojiMap, setCustomEmojiMap] = useState({});

  // Обработчики свайпа
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      handleClose();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleClose = () => {
    // Сброс формы при закрытии
    setText('');
    setShowEmoji(false);
    setError('');
    setSendError('');
    
    if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
    onClose();
  };

  const handleGenerate = async () => {
    setGenLoading(true);
    setError('');
    try {
      const res = await api.post('/api/ai/generate', {
        name: `${user.first_name} ${user.last_name}`,
        occasion: 'день рождения',
        prompt: PROMPT
      });
      console.log('[AI GENERATE][FRONT] Ответ сервера:', res);
      if (res.data && res.data.text) {
        setText(res.data.text);
        setError('');
      }
    } catch (e) {
      console.error('[AI GENERATE][FRONT] Ошибка:', e, e.response);
      let errorMessage = 'Не вдалося згенерувати текст. Спробуйте ще раз або напишіть привітання вручну.';
      
      // Пытаемся извлечь сообщение об ошибке из ответа сервера
      if (e.response) {
        const responseData = e.response.data;
        if (responseData) {
          if (responseData.error) {
            // Если ошибка на русском, переводим на украинский для консистентности
            const serverError = responseData.error;
            if (serverError.includes('Ошибка генерации поздравления через Gemini')) {
              errorMessage = 'Помилка генерації привітання через AI. Спробуйте ще раз або напишіть привітання вручну.';
            } else if (serverError.includes('Gemini')) {
              errorMessage = 'Сервіс генерації тимчасово недоступний. Напишіть привітання вручну.';
            } else {
              errorMessage = serverError;
            }
          } else if (responseData.message) {
            errorMessage = responseData.message;
          }
        }
      } else if (e.message) {
        errorMessage = `Помилка: ${e.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setGenLoading(false);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setSendError('');
    try {
      if (!user || !user.id) {
        setLoading(false);
        setSendError('Помилка: не вказано користувача');
        return;
      }
      // Берем актуальный HTML из редактора
      const currentHtml = editorRef.current ? editorRef.current.innerHTML : text;
      if (!currentHtml || !currentHtml.trim()) {
        setLoading(false);
        setSendError('Будь ласка, введіть текст привітання');
        return;
      }
      await api.post('/api/congratulations/', {
        employeeId: user.id,
        congratText: currentHtml
      });
      if (onSent) {
        onSent();
      }
      handleClose();
    } catch (e) {
      console.error('Ошибка отправки:', e);
      let errorMessage = 'Не вдалося відправити привітання. Спробуйте ще раз.';
      if (e.response && e.response.data && e.response.data.error) {
        errorMessage = e.response.data.error;
      } else if (e.message) {
        errorMessage = `Помилка: ${e.message}`;
      }
      setSendError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Синхронизация editor DOM при изменении text программно
  useEffect(() => {
    if (editorRef.current && typeof text === 'string') {
      if (editorRef.current.innerHTML !== text) {
        editorRef.current.innerHTML = text;
      }
    }
  }, [text]);

  // Загрузка кастомных эмодзи
  useEffect(() => {
    fetch('/api/emojis/list').then(r => r.json()).then(list => {
      const map = {}; (Array.isArray(list) ? list : []).forEach(e => { map[`custom:${e.name}`] = e.url; });
      setCustomEmojiMap(map);
    }).catch(()=>{});
  }, []);

  const insertCustomEmojiAtCursor = (token) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const url = customEmojiMap[token];
    if (!url) {
      document.execCommand('insertText', false, token);
      const currentHtml = editorRef.current ? editorRef.current.innerHTML : '';
      setText(currentHtml);
      return;
    }
    const img = document.createElement('img');
    img.src = url; img.alt = token;
    img.setAttribute('data-custom-emoji', 'true');
    img.setAttribute('data-token', token);
    img.style.width = '24px'; img.style.height = '24px';
    img.style.objectFit = 'cover'; img.style.verticalAlign = 'middle';
    img.style.margin = '0 2px'; img.style.borderRadius = '6px';
    const range = window.getSelection && window.getSelection().getRangeAt && window.getSelection().rangeCount > 0 ? window.getSelection().getRangeAt(0) : null;
    if (range) {
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img); range.setEndAfter(img);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    } else {
      editorRef.current.appendChild(img);
    }
    const currentHtml = editorRef.current ? editorRef.current.innerHTML : '';
    setText(currentHtml);
  };

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 200000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: '56px',
          paddingBottom: '20px',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '56px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 10001,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
        >
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
            }}
            title="Назад"
          >
            <FaArrowLeft />
          </button>
          
          <h2
            style={{
              color: '#fff',
              fontSize: '16px',
              fontWeight: 700,
              margin: 0,
              flex: 1,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '20px' }}>🎉</span>
            Поздравление для {user?.first_name} {user?.last_name}
          </h2>

          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
            }}
            title="Закрыть"
          >
            <FiX />
          </button>
        </div>

        {/* Контент */}
        <div style={{ flex: 1, padding: '24px 16px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          {/* Кнопка генерации */}
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={handleGenerate}
              disabled={genLoading}
              style={{
                width: '100%',
                background: genLoading
                  ? 'rgba(67, 233, 123, 0.3)'
                  : 'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: genLoading ? 'not-allowed' : 'pointer',
                boxShadow: genLoading
                  ? 'none'
                  : '0 2px 8px rgba(67, 233, 123, 0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                opacity: genLoading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (!genLoading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(67, 233, 123, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!genLoading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(67, 233, 123, 0.3)';
                }
              }}
            >
              {genLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }} />
                  Генерируем...
                </span>
              ) : (
                '✨ Згенерувати текст'
              )}
            </button>
            {/* Сообщение об ошибке генерации */}
            {error && (
              <div style={{
                marginTop: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(231, 76, 60, 0.15)',
                border: '2px solid #e74c3c',
                color: '#e74c3c',
                fontSize: '14px',
                fontWeight: 600,
                textAlign: 'center',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}>
                <span style={{ flex: 1 }}>{error}</span>
                <button
                  onClick={() => setError('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#e74c3c',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    flexShrink: 0,
                  }}
                  title="Закрыть"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Редактор текста */}
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <div
              ref={editorRef}
              contentEditable
              onInput={(e) => {
                const html = e.currentTarget ? e.currentTarget.innerHTML : '';
                setText(html);
                // Очищаем ошибки при изменении текста
                if (error) setError('');
                if (sendError) setSendError('');
              }}
              suppressContentEditableWarning
              style={{
                width: '100%',
                minHeight: '250px',
                borderRadius: '12px',
                border: '2px solid rgba(67, 233, 123, 0.3)',
                padding: '16px',
                fontWeight: 500,
                fontSize: '16px',
                marginTop: '12px',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#222',
                outline: 'none',
                lineHeight: '1.6',
              }}
              placeholder="Текст привітання..."
            />
            {!text && (
              <div
                style={{
                  position: 'absolute',
                  top: '28px',
                  left: '16px',
                  color: '#94a3b8',
                  fontSize: '16px',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                Текст привітання...
              </div>
            )}
          </div>

          {/* Кнопка эмодзи */}
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowEmoji(v => !v)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #ffe082 0%, #fcb69f 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(255, 224, 130, 0.3)',
                color: '#232931',
                fontWeight: 600,
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(255, 224, 130, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(255, 224, 130, 0.3)';
              }}
            >
              <FiSmile size={20} />
              Эмодзи
            </button>
            {showEmoji && (
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '100%',
                marginTop: '8px',
                zIndex: 10002,
                background: 'rgba(35, 41, 49, 0.98)',
                borderRadius: '12px',
                padding: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              }}>
                <CustomEmojiPicker
                  isOpen={showEmoji}
                  onClose={() => setShowEmoji(false)}
                  onEmojiSelect={(emoji) => {
                    const token = String(emoji || '');
                    if (token.startsWith('custom:')) {
                      insertCustomEmojiAtCursor(token);
                    } else if (editorRef.current) {
                      editorRef.current.focus();
                      document.execCommand('insertText', false, token);
                      const currentHtml = editorRef.current ? editorRef.current.innerHTML : '';
                      setText(currentHtml);
                    } else {
                      setText(t => (t + token).slice(0, 5000));
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Сообщение об ошибке отправки */}
          {sendError && (
            <div style={{
              marginBottom: '16px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(231, 76, 60, 0.15)',
              border: '2px solid #e74c3c',
              color: '#e74c3c',
              fontSize: '14px',
              fontWeight: 600,
              textAlign: 'center',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}>
              <span style={{ flex: 1 }}>{sendError}</span>
              <button
                onClick={() => setSendError('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#e74c3c',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  flexShrink: 0,
                }}
                title="Закрыть"
              >
                ×
              </button>
            </div>
          )}

          {/* Кнопки действий */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(231, 76, 60, 0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(231, 76, 60, 0.3)';
              }}
            >
              Відміна
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !text.trim()}
              style={{
                flex: 1,
                background: loading || !text.trim()
                  ? 'rgba(67, 233, 123, 0.3)'
                  : 'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
                boxShadow: loading || !text.trim()
                  ? 'none'
                  : '0 2px 8px rgba(67, 233, 123, 0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                opacity: loading || !text.trim() ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading && text.trim()) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(67, 233, 123, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && text.trim()) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(67, 233, 123, 0.3)';
                }
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }} />
                  Відправляємо...
                </span>
              ) : (
                'Відправити'
              )}
            </button>
          </div>
        </div>

        {/* Подсказка о свайпе */}
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 10002,
          }}
        >
          ← Свайпните влево для возврата
        </div>

        {/* CSS для анимации загрузки */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
}

