import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiLogIn, FiLogOut, FiClock, FiCalendar, FiEye } from 'react-icons/fi';

function formatTime(dtStr) {
  if (!dtStr) return '—';
  const d = new Date(dtStr);
  return `${d.toLocaleDateString('ru-RU')}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function RemoteWorktimeReportMobile({
  open,
  onClose,
  onOpenMobileSidebar,
}) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

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
      if (selectedUser) {
        setSelectedUser(null);
        setUserEvents([]);
      } else {
        handleClose();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleClose = () => {
    if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
    setSelectedUser(null);
    setUserEvents([]);
    onClose();
  };

  // Загрузка отчета
  useEffect(() => {
    if (open && !selectedUser) {
      loadReport();
    }
  }, [open, selectedDate, selectedUser]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/remote-worktime-report?date=${selectedDate}`);
      const data = await response.json();
      if (data.success) {
        setReport(data.report || []);
      } else {
        console.error('Ошибка загрузки отчета:', data.error);
        setReport([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки отчета:', error);
      setReport([]);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка событий пользователя
  const loadUserEvents = async (username) => {
    setLoadingEvents(true);
    try {
      const response = await fetch(`/api/remote-worktime-user-events?username=${encodeURIComponent(username)}&date=${selectedDate}`);
      const data = await response.json();
      if (data.success) {
        setUserEvents(data.events || []);
      } else {
        console.error('Ошибка загрузки событий:', data.error);
        setUserEvents([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки событий:', error);
      setUserEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    await loadUserEvents(user.username);
  };

  const handleBack = () => {
    setSelectedUser(null);
    setUserEvents([]);
  };

  // Применение полноэкранных стилей
  useEffect(() => {
    if (open && modalRef.current) {
      const modalElement = modalRef.current;
      const parentElement = modalElement.parentElement;
      
      if (parentElement) {
        parentElement.style.setProperty('position', 'fixed', 'important');
        parentElement.style.setProperty('top', '0', 'important');
        parentElement.style.setProperty('left', '0', 'important');
        parentElement.style.setProperty('right', '0', 'important');
        parentElement.style.setProperty('bottom', '0', 'important');
        parentElement.style.setProperty('width', '100vw', 'important');
        parentElement.style.setProperty('height', '100vh', 'important');
        parentElement.style.setProperty('margin', '0', 'important');
        parentElement.style.setProperty('padding', '0', 'important');
        parentElement.style.setProperty('display', 'flex', 'important');
        parentElement.style.setProperty('align-items', 'stretch', 'important');
        parentElement.style.setProperty('justify-content', 'stretch', 'important');
        parentElement.style.setProperty('z-index', '100007', 'important');
        parentElement.style.setProperty('overflow', 'hidden', 'important');
      }
      
      modalElement.style.setProperty('width', '100%', 'important');
      modalElement.style.setProperty('height', '100%', 'important');
      modalElement.style.setProperty('min-width', '100vw', 'important');
      modalElement.style.setProperty('min-height', '100vh', 'important');
      modalElement.style.setProperty('margin', '0', 'important');
      modalElement.style.setProperty('max-width', 'none', 'important');
      modalElement.style.setProperty('max-height', 'none', 'important');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  // Глобальные стили для полноэкранного режима
  if (typeof document !== 'undefined') {
    const styleId = 'remote-worktime-fullscreen-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .remote-worktime-fullscreen-outer {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          z-index: 100007 !important;
          overflow: hidden !important;
          display: flex !important;
          align-items: stretch !important;
          justify-content: stretch !important;
        }
        .remote-worktime-fullscreen-inner {
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
          min-width: 100vw !important;
          min-height: 100vh !important;
          margin: 0 !important;
          max-width: none !important;
          max-height: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  return ReactDOM.createPortal(
    <div
      ref={modalRef}
      className="remote-worktime-fullscreen-inner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 100007,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Заголовок */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {selectedUser ? (
            <button
              onClick={handleBack}
              style={{
                background: 'none',
                border: 'none',
                color: '#43e97b',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <FaArrowLeft size={20} />
            </button>
          ) : (
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#43e97b',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <FaArrowLeft size={20} />
            </button>
          )}
          <h2 style={{
            color: '#ffe082',
            fontSize: '18px',
            fontWeight: 600,
            margin: 0,
          }}>
            {selectedUser ? `События: ${selectedUser.fio || selectedUser.username}` : 'Отчет Удаленка'}
          </h2>
        </div>
      </div>

      {/* Контент */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        paddingBottom: '80px',
      }}>
        {!selectedUser ? (
          <>
            {/* Выбор даты */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#ffe082',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '8px',
              }}>
                Дата отчета:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid rgba(67, 233, 123, 0.3)',
                  background: 'rgba(20, 20, 20, 0.8)',
                  color: '#fff',
                  fontSize: '15px',
                }}
              />
            </div>

            {/* Загрузка */}
            {loading && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#ffe082',
              }}>
                Загрузка...
              </div>
            )}

            {/* Список пользователей */}
            {!loading && report.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#999',
              }}>
                Нет данных за выбранную дату
              </div>
            )}

            {!loading && report.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {report.map((user) => (
                  <div
                    key={user.username}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: '2px solid rgba(67, 233, 123, 0.2)',
                      background: 'rgba(67, 233, 123, 0.05)',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          color: '#43e97b',
                          fontSize: '16px',
                          fontWeight: 600,
                          marginBottom: '8px',
                        }}>
                          {user.fio || user.username}
                        </div>
                        <div style={{
                          color: '#999',
                          fontSize: '13px',
                        }}>
                          Событий: {user.totalEvents}
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewUser(user)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: '2px solid rgba(67, 233, 123, 0.3)',
                          background: 'rgba(67, 233, 123, 0.15)',
                          color: '#43e97b',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <FiEye size={14} />
                        Просмотреть
                      </button>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginTop: '12px',
                    }}>
                      {user.firstLogin && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#fff',
                          fontSize: '14px',
                        }}>
                          <FiLogIn size={16} color="#43e97b" />
                          <span style={{ color: '#999' }}>Первый вход:</span>
                          <span>{formatTime(user.firstLogin)}</span>
                        </div>
                      )}
                      {user.lastLogout && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#fff',
                          fontSize: '14px',
                        }}>
                          <FiLogOut size={16} color="#ff6b6b" />
                          <span style={{ color: '#999' }}>Последний выход:</span>
                          <span>{formatTime(user.lastLogout)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* События пользователя */}
            {loadingEvents && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#ffe082',
              }}>
                Загрузка событий...
              </div>
            )}

            {!loadingEvents && userEvents.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#999',
              }}>
                Нет событий за выбранную дату
              </div>
            )}

            {!loadingEvents && userEvents.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {userEvents.map((event, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: `2px solid ${event.event_type === 'login' ? 'rgba(67, 233, 123, 0.3)' : 'rgba(255, 107, 107, 0.3)'}`,
                      background: `${event.event_type === 'login' ? 'rgba(67, 233, 123, 0.05)' : 'rgba(255, 107, 107, 0.05)'}`,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      {event.event_type === 'login' ? (
                        <FiLogIn size={20} color="#43e97b" />
                      ) : (
                        <FiLogOut size={20} color="#ff6b6b" />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          color: event.event_type === 'login' ? '#43e97b' : '#ff6b6b',
                          fontSize: '16px',
                          fontWeight: 600,
                          marginBottom: '4px',
                        }}>
                          {event.event_type === 'login' ? 'Вход' : 'Выход'}
                        </div>
                        <div style={{
                          color: '#999',
                          fontSize: '14px',
                        }}>
                          <FiClock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                          {formatTime(event.event_time)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

