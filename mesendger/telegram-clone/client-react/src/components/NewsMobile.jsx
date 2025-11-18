import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiPlus } from 'react-icons/fi';
import NewsFeed from './NewsFeed';

export default function NewsMobile({ open, onClose, onOpenMobileSidebar }) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
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

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {canManageNews && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddModal(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(67, 233, 123, 0.3)',
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                title="Создать новость"
              >
                <FiPlus />
              </button>
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
    </>
  );
}

