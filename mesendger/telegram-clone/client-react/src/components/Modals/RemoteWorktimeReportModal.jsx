import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { FiX, FiLogIn, FiLogOut, FiClock, FiCalendar, FiEye } from 'react-icons/fi';

Modal.setAppElement('#root');

function formatTime(dtStr) {
  if (!dtStr) return '—';
  const d = new Date(dtStr);
  return `${d.toLocaleDateString('ru-RU')}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

function RemoteWorktimeReportModal({ isOpen, onRequestClose }) {
  // Проверяем, что мы на десктопе
  const [isDesktopDevice, setIsDesktopDevice] = useState(() => {
    return window.innerWidth > 768 && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });

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

  // Все useEffect должны быть объявлены до условного return
  useEffect(() => {
    const handleResize = () => {
      setIsDesktopDevice(window.innerWidth > 768 && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Функции загрузки данных
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

  // Все useEffect должны быть объявлены до условного return
  useEffect(() => {
    const handleResize = () => {
      setIsDesktopDevice(window.innerWidth > 768 && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Загрузка отчета
  useEffect(() => {
    if (isOpen && !selectedUser && isDesktopDevice) {
      loadReport();
    }
  }, [isOpen, selectedDate, selectedUser, isDesktopDevice]);

  // Показываем только на десктопе - проверка ПОСЛЕ всех хуков
  if (!isDesktopDevice) {
    return null;
  }
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

  // Все useEffect должны быть объявлены до условного return
  useEffect(() => {
    const handleResize = () => {
      setIsDesktopDevice(window.innerWidth > 768 && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Загрузка отчета
  useEffect(() => {
    if (isOpen && !selectedUser && isDesktopDevice) {
      loadReport();
    }
  }, [isOpen, selectedDate, selectedUser, isDesktopDevice]);

  // Показываем только на десктопе - проверка ПОСЛЕ всех хуков
  if (!isDesktopDevice) {
    return null;
  }

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    await loadUserEvents(user.username);
  };

  const handleBack = () => {
    setSelectedUser(null);
    setUserEvents([]);
  };

  const handleClose = () => {
    setSelectedUser(null);
    setUserEvents([]);
    setReport([]);
    onRequestClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      className="worktime-modal"
      overlayClassName="worktime-modal-overlay"
      style={{
        content: {
          maxWidth: '900px',
          width: '90%',
          maxHeight: '90vh',
          margin: 'auto',
          borderRadius: '16px',
          border: '2px solid rgba(67, 233, 123, 0.3)',
          background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98) 0%, rgba(30, 30, 30, 0.98) 100%)',
          padding: 0,
          color: '#fff',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 100009, // Выше всех других модалок
        },
      }}
    >
      {/* Заголовок */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {selectedUser && (
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
              ← Назад
            </button>
          )}
          <h2 style={{
            color: '#ffe082',
            fontSize: '20px',
            fontWeight: 600,
            margin: 0,
          }}>
            {selectedUser ? `События: ${selectedUser.fio || selectedUser.username}` : 'Отчет Удаленка'}
          </h2>
        </div>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <FiX size={24} />
        </button>
      </div>

      {/* Контент */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
      }}>
        {!selectedUser ? (
          <>
            {/* Выбор даты */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: '#ffe082',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '10px',
              }}>
                Дата отчета:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '300px',
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
                padding: '60px',
                color: '#ffe082',
              }}>
                Загрузка...
              </div>
            )}

            {/* Список пользователей */}
            {!loading && report.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '60px',
                color: '#999',
              }}>
                Нет данных за выбранную дату
              </div>
            )}

            {!loading && report.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '16px',
              }}>
                {report.map((user) => (
                  <div
                    key={user.username}
                    style={{
                      padding: '20px',
                      borderRadius: '12px',
                      border: '2px solid rgba(67, 233, 123, 0.2)',
                      background: 'rgba(67, 233, 123, 0.05)',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '16px',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          color: '#43e97b',
                          fontSize: '18px',
                          fontWeight: 600,
                          marginBottom: '8px',
                        }}>
                          {user.fio || user.username}
                        </div>
                        <div style={{
                          color: '#999',
                          fontSize: '14px',
                        }}>
                          Событий: {user.totalEvents}
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewUser(user)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '8px',
                          border: '2px solid rgba(67, 233, 123, 0.3)',
                          background: 'rgba(67, 233, 123, 0.15)',
                          color: '#43e97b',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(67, 233, 123, 0.25)';
                          e.target.style.borderColor = '#43e97b';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(67, 233, 123, 0.15)';
                          e.target.style.borderColor = 'rgba(67, 233, 123, 0.3)';
                        }}
                      >
                        <FiEye size={16} />
                        Просмотреть
                      </button>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      marginTop: '16px',
                    }}>
                      {user.firstLogin && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          color: '#fff',
                          fontSize: '14px',
                        }}>
                          <FiLogIn size={18} color="#43e97b" />
                          <span style={{ color: '#999' }}>Первый вход:</span>
                          <span>{formatTime(user.firstLogin)}</span>
                        </div>
                      )}
                      {user.lastLogout && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          color: '#fff',
                          fontSize: '14px',
                        }}>
                          <FiLogOut size={18} color="#ff6b6b" />
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
                padding: '60px',
                color: '#ffe082',
              }}>
                Загрузка событий...
              </div>
            )}

            {!loadingEvents && userEvents.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '60px',
                color: '#999',
              }}>
                Нет событий за выбранную дату
              </div>
            )}

            {!loadingEvents && userEvents.length > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                {userEvents.map((event, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '20px',
                      borderRadius: '12px',
                      border: `2px solid ${event.event_type === 'login' ? 'rgba(67, 233, 123, 0.3)' : 'rgba(255, 107, 107, 0.3)'}`,
                      background: `${event.event_type === 'login' ? 'rgba(67, 233, 123, 0.05)' : 'rgba(255, 107, 107, 0.05)'}`,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}>
                      {event.event_type === 'login' ? (
                        <FiLogIn size={24} color="#43e97b" />
                      ) : (
                        <FiLogOut size={24} color="#ff6b6b" />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          color: event.event_type === 'login' ? '#43e97b' : '#ff6b6b',
                          fontSize: '18px',
                          fontWeight: 600,
                          marginBottom: '6px',
                        }}>
                          {event.event_type === 'login' ? 'Вход' : 'Выход'}
                        </div>
                        <div style={{
                          color: '#999',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}>
                          <FiClock size={16} />
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
    </Modal>
  );
}

export default RemoteWorktimeReportModal;
