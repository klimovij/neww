import React, { useRef, useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';
import LeavesWorktimeModal from './LeavesWorktimeModal';

export default function LeavesWorktimeMobile({ open, onClose, token, onOpenMobileSidebar }) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  const [modalKey, setModalKey] = useState(() => Date.now());
  const prevOpenRef = useRef(false);
  const modalInstanceRef = useRef(null);
  
  // Обновляем ключ при открытии модалки
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Генерируем новый ключ только при переходе из closed в open
      setModalKey(Date.now());
    }
    prevOpenRef.current = open;
  }, [open]);
  
  // Обработчики свайпа
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
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
  }, [onClose, onOpenMobileSidebar]);

  const handleClose = useCallback(() => {
    if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
    onClose();
  }, [onOpenMobileSidebar, onClose]);
  
  // Мемоизируем компонент модалки, чтобы избежать лишних пересозданий
  const modalComponent = useMemo(() => {
    if (!open) return null;
    
    return (
      <LeavesWorktimeModal 
        key={`leaves-worktime-mobile-${modalKey}`}
        isOpen={true} 
        onRequestClose={handleClose} 
        token={token} 
      />
    );
  }, [open, modalKey, token, handleClose]);
  
  // Добавляем обработчики свайпа на react-modal после рендеринга и исправляем стили
  useEffect(() => {
    if (!open) return;
    
    // Используем MutationObserver для отслеживания появления react-modal в DOM
    const observer = new MutationObserver(() => {
      const modalOverlay = document.querySelector('body > div.ReactModal__Overlay');
      const modalContent = document.querySelector('body > div[role="dialog"]');
      
      if (modalOverlay && modalContent) {
        const innerContainer = modalContent.querySelector('div > div');
        
        // Исправляем стили напрямую через DOM API для переопределения inline стилей
        if (innerContainer) {
          innerContainer.style.minWidth = '100%';
          innerContainer.style.maxWidth = '100%';
          innerContainer.style.width = '100%';
          innerContainer.style.borderRadius = '0';
          innerContainer.style.padding = '16px';
          innerContainer.style.paddingTop = '70px';
        }
        
        // Добавляем обработчики свайпа
        modalOverlay.addEventListener('touchstart', handleTouchStart, { passive: true });
        modalOverlay.addEventListener('touchmove', handleTouchMove, { passive: true });
        modalOverlay.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        modalContent.addEventListener('touchstart', handleTouchStart, { passive: true });
        modalContent.addEventListener('touchmove', handleTouchMove, { passive: true });
        modalContent.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        // Останавливаем наблюдение, так как нашли react-modal
        observer.disconnect();
      }
    });
    
    // Начинаем наблюдение за изменениями в body
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Также проверяем сразу на случай, если react-modal уже есть
    const checkModal = () => {
      const modalOverlay = document.querySelector('body > div.ReactModal__Overlay');
      const modalContent = document.querySelector('body > div[role="dialog"]');
      
      if (modalOverlay && modalContent) {
        const innerContainer = modalContent.querySelector('div > div');
        
        if (innerContainer) {
          innerContainer.style.minWidth = '100%';
          innerContainer.style.maxWidth = '100%';
          innerContainer.style.width = '100%';
          innerContainer.style.borderRadius = '0';
          innerContainer.style.padding = '16px';
          innerContainer.style.paddingTop = '70px';
        }
        
        modalOverlay.addEventListener('touchstart', handleTouchStart, { passive: true });
        modalOverlay.addEventListener('touchmove', handleTouchMove, { passive: true });
        modalOverlay.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        modalContent.addEventListener('touchstart', handleTouchStart, { passive: true });
        modalContent.addEventListener('touchmove', handleTouchMove, { passive: true });
        modalContent.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        observer.disconnect();
      }
    };
    
    // Проверяем сразу и через небольшие интервалы
    checkModal();
    const intervalId = setInterval(() => {
      checkModal();
    }, 100);
    
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      observer.disconnect();
    }, 2000);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      observer.disconnect();
      
      const modalOverlay = document.querySelector('body > div.ReactModal__Overlay');
      const modalContent = document.querySelector('body > div[role="dialog"]');
      
      if (modalOverlay) {
        modalOverlay.removeEventListener('touchstart', handleTouchStart);
        modalOverlay.removeEventListener('touchmove', handleTouchMove);
        modalOverlay.removeEventListener('touchend', handleTouchEnd);
      }
      if (modalContent) {
        modalContent.removeEventListener('touchstart', handleTouchStart);
        modalContent.removeEventListener('touchmove', handleTouchMove);
        modalContent.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [open, handleTouchStart, handleTouchMove, handleTouchEnd]);


  if (!open) return null;

  // Отладка
  useEffect(() => {
    if (open) {
      console.log('LeavesWorktimeMobile: open =', open, 'token =', token ? 'present' : 'missing');
      // Проверяем, появился ли react-modal через некоторое время
      setTimeout(() => {
        const modalOverlay = document.querySelector('body > div.ReactModal__Overlay');
        const modalContent = document.querySelector('body > div[role="dialog"]');
        console.log('LeavesWorktimeMobile: modalOverlay =', modalOverlay ? 'found' : 'not found');
        console.log('LeavesWorktimeMobile: modalContent =', modalContent ? 'found' : 'not found');
      }, 500);
    }
  }, [open, token]);

  return (
    <>
      {/* Рендерим LeavesWorktimeModal - он сам создаст свой портал через react-modal */}
      {modalComponent}

      {/* CSS оверрайды для мобильной адаптации - применяем глобально */}
      {open && <style>{`
            /* Адаптируем оверлей react-modal для мобильных - применяем ко всем состояниям */
            body > div.ReactModal__Overlay {
              background: rgba(0, 0, 0, 0.85) !important;
              backdrop-filter: blur(8px) !important;
              z-index: 10000 !important;
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              pointer-events: auto !important;
              opacity: 1 !important;
              visibility: visible !important;
            }
            
            body > div.ReactModal__Overlay.ReactModal__Overlay--after-open {
              background: rgba(0, 0, 0, 0.85) !important;
              backdrop-filter: blur(8px) !important;
              z-index: 10000 !important;
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              pointer-events: auto !important;
              opacity: 1 !important;
              visibility: visible !important;
            }
            
            /* Адаптируем контент react-modal для мобильных - применяем ко всем состояниям */
            body > div[role="dialog"] {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              width: 100% !important;
              height: 100% !important;
              max-width: 100% !important;
              min-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: transparent !important;
              border: none !important;
              overflow: visible !important;
              z-index: 10001 !important;
              inset: 0 !important;
              pointer-events: auto !important;
              opacity: 1 !important;
              visibility: visible !important;
            }
            
            body > div[role="dialog"].ReactModal__Content {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              width: 100% !important;
              height: 100% !important;
              max-width: 100% !important;
              min-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: transparent !important;
              border: none !important;
              overflow: visible !important;
              z-index: 10001 !important;
              inset: 0 !important;
              pointer-events: auto !important;
              opacity: 1 !important;
              visibility: visible !important;
            }
            
            body > div[role="dialog"].ReactModal__Content.ReactModal__Content--after-open {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              width: 100% !important;
              height: 100% !important;
              max-width: 100% !important;
              min-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: transparent !important;
              border: none !important;
              overflow: visible !important;
              z-index: 10001 !important;
              inset: 0 !important;
              pointer-events: auto !important;
              opacity: 1 !important;
              visibility: visible !important;
            }
            
            body > div[role="dialog"] > div {
              width: 100% !important;
              height: 100% !important;
              max-width: 100% !important;
              min-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: transparent !important;
              border: none !important;
              overflow: visible !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: flex-start !important;
            }
            
            /* Переопределяем внутренний контейнер с контентом - убираем фиксированные размеры для мобильных */
            body > div[role="dialog"] > div > div {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              height: 100% !important;
              border-radius: 0 !important;
              padding: 16px !important;
              padding-top: 70px !important;
              box-sizing: border-box !important;
              background: linear-gradient(135deg, #232931 0%, #181c22 100%) !important;
              flex: 1 !important;
              overflow-y: auto !important;
              overflow-x: hidden !important;
              box-shadow: none !important;
              position: relative !important;
              display: flex !important;
              flex-direction: column !important;
            }
            
            /* Убираем фиксированные размеры из inline стилей - используем более специфичные селекторы */
            body > div[role="dialog"] > div > div[style*="minWidth"],
            body > div[role="dialog"] > div > div[style*="600px"],
            body > div[role="dialog"] > div > div[style*="1200px"] {
              min-width: 100% !important;
              max-width: 100% !important;
              width: 100% !important;
            }
            
            /* Переопределяем все inline стили для мобильных */
            body > div[role="dialog"] > div > div {
              min-width: 100% !important;
              max-width: 100% !important;
              width: 100% !important;
            }
            
            /* Убеждаемся, что контент виден */
            body > div[role="dialog"] > div > div > * {
              position: relative !important;
              z-index: 1 !important;
            }
            
            /* Адаптация таблиц для мобильных устройств */
            body > div[role="dialog"] table {
              width: 100% !important;
              font-size: 12px !important;
              border-collapse: collapse !important;
              display: table !important;
              overflow-x: auto !important;
              -webkit-overflow-scrolling: touch !important;
            }
            
            body > div[role="dialog"] table th,
            body > div[role="dialog"] table td {
              padding: 8px 6px !important;
              font-size: 11px !important;
              word-break: break-word !important;
              white-space: nowrap !important;
              min-width: 80px !important;
            }
            
            /* Обертка для горизонтальной прокрутки таблиц */
            body > div[role="dialog"] > div > div > div[style*="overflow"] {
              overflow-x: auto !important;
              -webkit-overflow-scrolling: touch !important;
              width: 100% !important;
            }
            
            /* Адаптация кнопок */
            body > div[role="dialog"] button {
              padding: 10px 16px !important;
              font-size: 14px !important;
              min-height: 44px !important;
              touch-action: manipulation !important;
            }
            
            /* Адаптация инпутов */
            body > div[role="dialog"] input,
            body > div[role="dialog"] select,
            body > div[role="dialog"] textarea {
              padding: 10px !important;
              font-size: 16px !important;
              min-height: 44px !important;
              box-sizing: border-box !important;
            }
            
            /* Адаптация фильтров и контролов */
            body > div[role="dialog"] > div > div > div {
              flex-direction: column !important;
              gap: 12px !important;
            }
            
            /* Адаптация таймера */
            body > div[role="dialog"] > div > div > div > div {
              width: 100% !important;
              max-width: 100% !important;
            }
            
            /* Адаптация уведомлений */
            body > div[role="dialog"] > div > div[style*="position: fixed"] {
              min-width: 90% !important;
              max-width: 90% !important;
              padding: 16px !important;
              font-size: 14px !important;
              left: 50% !important;
              transform: translateX(-50%) !important;
            }
            
            /* Адаптация модального окна пароля */
            body > div[style*="position: fixed"][style*="z-index: 10001"] {
              padding: 16px !important;
            }
            
            body > div[style*="position: fixed"][style*="z-index: 10001"] > div {
              min-width: 90% !important;
              max-width: 90% !important;
              padding: 20px !important;
            }
            
            /* Адаптация прогресс-баров и других элементов */
            body > div[role="dialog"] progress,
            body > div[role="dialog"] [role="progressbar"] {
              width: 100% !important;
              height: 24px !important;
            }
            
            /* Улучшаем читаемость текста */
            body > div[role="dialog"] {
              color: #fff !important;
            }
            
            body > div[role="dialog"] * {
              box-sizing: border-box !important;
            }
          `}</style>}

      {/* Header с кнопками возврата - поверх react-modal через отдельный портал */}
      {open && ReactDOM.createPortal(
        <>
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
              zIndex: 10010,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              pointerEvents: 'auto',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
              Отработка отгулов
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
              zIndex: 10010,
            }}
          >
            ← Свайпните влево для возврата
          </div>
        </>,
        document.body
      )}
    </>
  );
}

