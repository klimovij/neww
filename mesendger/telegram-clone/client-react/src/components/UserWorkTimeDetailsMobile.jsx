import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiLogIn, FiLogOut, FiClock } from 'react-icons/fi';

function formatTime(dtStr) {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  return `${d.toLocaleDateString('ru-RU')}, ${d.toLocaleTimeString('ru-RU')}`;
}

export default function UserWorkTimeDetailsMobile({ open, onClose, logs, username, onOpenMobileSidebar }) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);

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

  if (!open) return null;

  // Сортируем логи по времени
  const sortedLogs = [...(logs || [])].sort((a, b) => {
    const timeA = new Date(a.event_time || 0);
    const timeB = new Date(b.event_time || 0);
    return timeA - timeB;
  });

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 20000,
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
            background: 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 20001,
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
            <FiClock size={18} />
            Детали: {username}
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
          {!sortedLogs || sortedLogs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '15px',
            }}>
              Нет данных о событиях
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedLogs.map((log, idx) => {
                const isLogin = log.event_type === 'login' || log.event_type === 'other';
                return (
                  <div
                    key={idx}
                    style={{
                      background: isLogin
                        ? 'rgba(67, 233, 123, 0.1)'
                        : 'rgba(231, 76, 60, 0.1)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: `2px solid ${isLogin ? 'rgba(67, 233, 123, 0.3)' : 'rgba(231, 76, 60, 0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: isLogin
                        ? 'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)'
                        : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '20px',
                      flexShrink: 0,
                    }}>
                      {isLogin ? <FiLogIn size={24} /> : <FiLogOut size={24} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: isLogin ? '#43e97b' : '#e74c3c',
                        fontSize: '15px',
                        fontWeight: 700,
                        marginBottom: '4px',
                      }}>
                        {isLogin ? 'Вход' : 'Выход'}
                      </div>
                      <div style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <FiClock size={14} />
                        {formatTime(log.event_time)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Статистика */}
          {sortedLogs && sortedLogs.length > 0 && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 224, 130, 0.3)',
            }}>
              <div style={{
                color: '#ffe082',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
              }}>
                Статистика
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Всего событий:</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{sortedLogs.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Входов:</span>
                  <span style={{ color: '#43e97b', fontWeight: 600 }}>
                    {sortedLogs.filter(l => l.event_type === 'login' || l.event_type === 'other').length}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Выходов:</span>
                  <span style={{ color: '#e74c3c', fontWeight: 600 }}>
                    {sortedLogs.filter(l => l.event_type === 'logout').length}
                  </span>
                </div>
              </div>
            </div>
          )}
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
            zIndex: 20002,
          }}
        >
          ← Свайпните влево для возврата
        </div>
      </div>
    </div>,
    document.body
  );
}

