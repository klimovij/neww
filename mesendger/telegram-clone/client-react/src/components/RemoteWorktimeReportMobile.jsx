import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiClock, FiLogIn, FiLogOut, FiEye, FiCalendar } from 'react-icons/fi';

function RemoteWorktimeReportMobile({ open, onClose, onOpenMobileSidebar }) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Инициализируем дату вчерашнего дня при открытии модалки
  useEffect(() => {
    if (open) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      setSelectedDate(dateStr);
      loadReport(dateStr);
    } else {
      setReport([]);
      setSelectedUser(null);
      setUserEvents([]);
      setError(null);
    }
  }, [open]);

  const loadReport = async (date) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/remote-worktime-report?date=${date}`);
      const data = await response.json();
      
      if (data.success) {
        setReport(data.report || []);
      } else {
        setError(data.error || 'Ошибка загрузки отчета');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    loadReport(newDate);
  };

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setLoadingEvents(true);
    setUserEvents([]);
    
    try {
      const response = await fetch(`/api/remote-worktime-user-events?username=${encodeURIComponent(user.username)}&date=${selectedDate}`);
      const data = await response.json();
      
      if (data.success) {
        setUserEvents(data.events || []);
      } else {
        setError(data.error || 'Ошибка загрузки событий');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
      console.error('Error loading user events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const calculateWorkTime = (firstLogin, lastLogout) => {
    if (!firstLogin || !lastLogout) return '—';
    try {
      const start = new Date(firstLogin);
      const end = new Date(lastLogout);
      const diffMs = end - start;
      if (diffMs <= 0) return '—';
      
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      return `${hours}ч ${minutes}мин`;
    } catch {
      return '—';
    }
  };

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
      // Свайп влево - закрываем модалку
      if (selectedUser) {
        setSelectedUser(null);
        setUserEvents([]);
      } else {
        onClose();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleClose = () => {
    setSelectedUser(null);
    setUserEvents([]);
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
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 100006, // Выше WorkTimeMobile (100002)
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'stretch',
        backdropFilter: 'blur(8px)',
        overflow: 'hidden',
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
        {/* Заголовок */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '56px',
            background: 'linear-gradient(135deg, #ffe082 0%, #ffb74d 100%)',
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
            onClick={selectedUser ? () => { setSelectedUser(null); setUserEvents([]); } : handleClose}
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
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FiCalendar size={18} />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
              {selectedUser ? selectedUser.fio : 'Отчет Удаленка'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!selectedUser && (
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  maxWidth: '120px',
                }}
              />
            )}
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
        </div>

        {/* Контент */}
        <div style={{ flex: 1, padding: '24px 16px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
              Загрузка отчета...
            </div>
          )}

          {error && (
            <div style={{
              padding: '16px',
              borderRadius: '8px',
              background: 'rgba(255, 0, 0, 0.2)',
              color: '#ff6b6b',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {!loading && !error && !selectedUser && report.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
              Нет данных за выбранную дату
            </div>
          )}

          {!loading && !error && !selectedUser && report.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {report.map((user, index) => (
                <div
                  key={user.username}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                        {user.fio}
                      </h3>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}>
                        Первый вход: {formatTime(user.firstLogin)}
                      </div>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                        Последний выход: {formatTime(user.lastLogout)}
                      </div>
                      <div style={{ fontSize: '14px', color: '#43e97b', fontWeight: 600 }}>
                        Время: {calculateWorkTime(user.firstLogin, user.lastLogout)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewUser(user)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(67, 233, 123, 0.3)',
                        background: 'rgba(67, 233, 123, 0.15)',
                        color: '#43e97b',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      <FiEye size={14} />
                      Просмотреть
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Детали пользователя */}
          {selectedUser && (
            <div>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: '#888' }}>
                Дата: {new Date(selectedDate).toLocaleDateString('ru-RU')}
              </div>

              {loadingEvents && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                  Загрузка событий...
                </div>
              )}

              {!loadingEvents && userEvents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                  Нет событий
                </div>
              )}

              {!loadingEvents && userEvents.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {userEvents.map((event, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: event.event_type === 'login' 
                          ? 'rgba(67, 233, 123, 0.1)' 
                          : 'rgba(255, 107, 107, 0.1)',
                        border: `1px solid ${event.event_type === 'login' 
                          ? 'rgba(67, 233, 123, 0.3)' 
                          : 'rgba(255, 107, 107, 0.3)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        {event.event_type === 'login' ? (
                          <FiLogIn size={16} color="#43e97b" />
                        ) : (
                          <FiLogOut size={16} color="#ff6b6b" />
                        )}
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: event.event_type === 'login' ? '#43e97b' : '#ff6b6b',
                          textTransform: 'uppercase',
                        }}>
                          {event.event_type === 'login' ? 'Вход' : 'Выход'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', marginLeft: '24px' }}>
                        {formatDateTime(event.event_time)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default RemoteWorktimeReportMobile;

