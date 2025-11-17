import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';
import EmployeesListModal from './Modals/EmployeesListModal';

export default function EmployeesMobile({ open, onClose, onOpenMobileSidebar }) {
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
        zIndex: 10000,
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
            Сотрудники компании
          </h2>

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

        {/* Контент - компонент EmployeesListModal */}
        <div
          style={{
            flex: 1,
            width: '100%',
            maxWidth: '100%',
            marginTop: '8px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <style>{`
            /* Скрываем внешнюю модалку EmployeesListModal на мобильных */
            div[style*="position: fixed"] {
              position: static !important;
              transform: none !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              max-height: none !important;
              left: auto !important;
              top: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: transparent !important;
            }
            /* Скрываем Modal overlay */
            div[style*="position: fixed"][style*="inset: 0"] {
              position: static !important;
              background: transparent !important;
            }
            /* Адаптируем контент для мобильных */
            div[style*="flex: 1"] {
              padding: 16px !important;
            }
            /* Адаптируем сетку сотрудников для мобильных - 2 колонки вместо 5 */
            div[style*="grid-template-columns"] {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 12px !important;
            }
            /* Адаптируем заголовок */
            h2 {
              font-size: 1.2rem !important;
            }
            /* Адаптируем размер аватаров для мобильных */
            img[style*="width: 90px"] {
              width: 60px !important;
              height: 60px !important;
            }
            /* Адаптируем карточки сотрудников */
            div[style*="min-height: 220px"] {
              min-height: 160px !important;
              padding: 12px !important;
            }
          `}</style>
          <EmployeesListModal open={true} onClose={handleClose} />
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
  );
}

