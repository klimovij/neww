import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiPlus } from 'react-icons/fi';
import { FaVoteYea } from 'react-icons/fa';
import NewsFeed from './NewsFeed';

export default function NewsMobile({ open, onClose, onOpenMobileSidebar }) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isPollSending, setIsPollSending] = useState(false);
  const [tab, setTab] = useState('news');
  
  // Проверяем права пользователя на создание новостей
  const userRaw = localStorage.getItem('user');
  let userRole = '';
  try {
    userRole = JSON.parse(userRaw)?.role || '';
  } catch {}
  const normalizedRole = String(userRole || '').trim().toLowerCase();
  const canManageNews = ['admin', 'hr', 'hr manager', 'hr_manager', 'human resources', 'human_resources'].includes(normalizedRole);

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
      // Свайп влево - закрываем модалку и возвращаемся в сайдбар
      if (onOpenMobileSidebar) {
        onOpenMobileSidebar();
      }
      onClose();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleClose = () => {
    if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
    onClose();
  };

  const token = localStorage.getItem('token');

  return (
    <>
      {open && ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 100000,
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
          backgroundColor: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
          background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: '60px',
          paddingBottom: '20px',
          paddingLeft: '16px',
          paddingRight: '16px',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header с кнопками возврата */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '56px',
            backgroundColor: 'rgba(35, 41, 49, 0.95)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 10001,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            title="Назад"
          >
            <FaArrowLeft />
          </button>
          
          <h2
            style={{
              color: '#fff',
              fontSize: '18px',
              fontWeight: 700,
              margin: 0,
              flex: 1,
              textAlign: 'center',
            }}
          >
            Новости
          </h2>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {canManageNews && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(67, 233, 123, 0.3)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  title="Добавить новость"
                >
                  <FiPlus size={14} style={{ marginRight: '4px' }} />
                  Новость
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPollModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  title="Создать голосование"
                >
                  <FaVoteYea size={14} style={{ marginRight: '4px' }} />
                  Голосование
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTab('news');
                  }}
                  style={{
                    background: tab === 'news' ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' : 'rgba(255, 255, 255, 0.1)',
                    border: tab === 'news' ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    if (tab !== 'news') {
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (tab !== 'news') {
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  title="Новости"
                >
                  Новости
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              title="Закрыть"
            >
              <FiX />
            </button>
          </div>
        </div>

        {/* Контент - компонент NewsFeed */}
        <div
          style={{
            flex: 1,
            width: '100%',
            maxWidth: '100%',
            marginTop: '8px',
          }}
        >
          <NewsFeed modal onClose={handleClose} token={token} />
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
      </div>
    </div>,
    document.body
      )}
      
      {/* Модалка создания новости */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 100001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '600px',
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '24px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAddModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                fontSize: '24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#2193b0',
                padding: '4px',
              }}
            >
              ×
            </button>
            <h3 style={{ marginBottom: '16px', color: '#e74c3c', fontSize: '1.2em', fontWeight: 700 }}>
              Добавить новость
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const title = formData.get('title');
                const content = formData.get('content');
                if (!title || !content) return;
                
                try {
                  const response = await fetch('/api/news', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ title, content }),
                  });
                  
                  if (response.ok) {
                    setShowAddModal(false);
                    window.dispatchEvent(new CustomEvent('news-published'));
                  }
                } catch (error) {
                  console.error('Ошибка создания новости:', error);
                  alert('Ошибка создания новости');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <input
                name="title"
                placeholder="Заголовок новости"
                required
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #2193b0',
                  fontWeight: 700,
                  fontSize: '1.06em',
                  background: 'rgba(255,255,255,0.92)',
                }}
              />
              <textarea
                name="content"
                placeholder="Текст новости"
                required
                rows={8}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e74c3c',
                  fontSize: '1.06rem',
                  background: 'rgba(255,255,255,0.92)',
                  resize: 'vertical',
                  minHeight: '140px',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px #43e97b22',
                }}
              >
                Добавить
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* Модалка создания голосования */}
      {showPollModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 100001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowPollModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '600px',
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '24px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPollModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                fontSize: '24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#ff9800',
                padding: '4px',
              }}
            >
              ×
            </button>
            <h3 style={{ marginBottom: '16px', color: '#ff9800', fontSize: '1.2em', fontWeight: 700 }}>
              Создать голосование
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) {
                  alert('Заполните вопрос и все варианты ответа');
                  return;
                }
                
                setIsPollSending(true);
                try {
                  const response = await fetch('/api/news/poll', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      type: 'poll',
                      question: pollQuestion.trim(),
                      options: pollOptions.map(opt => opt.trim()).filter(Boolean),
                    }),
                  });
                  
                  if (response.ok) {
                    setShowPollModal(false);
                    setPollQuestion('');
                    setPollOptions(['', '']);
                    window.dispatchEvent(new CustomEvent('news-published'));
                  } else {
                    const error = await response.json().catch(() => ({}));
                    alert(`Ошибка создания голосования: ${error.error || 'Неизвестная ошибка'}`);
                  }
                } catch (error) {
                  console.error('Ошибка создания голосования:', error);
                  alert('Ошибка создания голосования');
                } finally {
                  setIsPollSending(false);
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <input
                type="text"
                placeholder="Тема голосования"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                required
                maxLength={120}
                autoFocus
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #ff9800',
                  fontWeight: 600,
                  fontSize: '1.06em',
                  background: 'rgba(255,255,255,0.92)',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder={`Вариант ${idx + 1}`}
                      value={opt}
                      onChange={(e) => setPollOptions(pollOptions.map((o, i) => i === idx ? e.target.value : o))}
                      required
                      maxLength={60}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #ff9800',
                        fontSize: '1em',
                        background: 'rgba(255,255,255,0.92)',
                      }}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#e74c3c',
                          fontSize: '22px',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                        title="Удалить вариант"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  style={{
                    background: 'none',
                    border: '1.5px dashed #ff9800',
                    color: '#ff9800',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.95em',
                  }}
                >
                  + Добавить вариант
                </button>
              </div>
              <button
                type="submit"
                disabled={isPollSending}
                style={{
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontWeight: 700,
                  cursor: isPollSending ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)',
                  opacity: isPollSending ? 0.7 : 1,
                }}
              >
                {isPollSending ? 'Создание...' : 'Создать'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

