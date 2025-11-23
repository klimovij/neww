import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { FiX, FiClock, FiLogIn, FiLogOut, FiEye, FiCalendar } from 'react-icons/fi';

function RemoteWorktimeReportModal({ isOpen, onRequestClose }) {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Инициализируем дату вчерашнего дня при открытии модалки
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

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

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Отчет удаленки"
      style={{
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100005,
        },
        content: {
          position: 'relative',
          background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
          borderRadius: '28px',
          width: '90%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          padding: '0',
          border: 'none',
          outline: 'none',
          color: '#fff',
          overflow: 'hidden',
        },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Заголовок */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 32px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <FiCalendar size={24} color="#43e97b" />
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#43e97b' }}>
              Отчет Удаленка
            </h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            />
            <button
              onClick={onRequestClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FiX />
            </button>
          </div>
        </div>

        {/* Контент */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
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

          {!loading && !error && report.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
              Нет данных за выбранную дату
            </div>
          )}

          {!loading && !error && report.length > 0 && (
            <div style={{ display: 'flex', gap: '24px', height: '100%' }}>
              {/* Список пользователей */}
              <div style={{ flex: selectedUser ? '0 0 60%' : '1', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#43e97b', fontSize: '14px', fontWeight: 600 }}>
                        ФИО
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#43e97b', fontSize: '14px', fontWeight: 600 }}>
                        Первый вход
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#43e97b', fontSize: '14px', fontWeight: 600 }}>
                        Последний выход
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#43e97b', fontSize: '14px', fontWeight: 600 }}>
                        Время
                      </th>
                      <th style={{ padding: '12px', textAlign: 'center', color: '#43e97b', fontSize: '14px', fontWeight: 600 }}>
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((user, index) => (
                      <tr
                        key={user.username}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          backgroundColor: selectedUser?.username === user.username ? 'rgba(67, 233, 123, 0.1)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px', fontSize: '14px' }}>{user.fio}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#888' }}>
                          {formatTime(user.firstLogin)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#888' }}>
                          {formatTime(user.lastLogout)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#43e97b' }}>
                          {calculateWorkTime(user.firstLogin, user.lastLogout)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleViewUser(user)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(67, 233, 123, 0.3)',
                              background: 'rgba(67, 233, 123, 0.15)',
                              color: '#43e97b',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <FiEye size={14} />
                            Просмотреть
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Детали пользователя */}
              {selectedUser && (
                <div style={{
                  flex: '0 0 40%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '20px',
                  overflow: 'auto',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                      {selectedUser.fio}
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setUserEvents([]);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '20px',
                      }}
                    >
                      <FiX />
                    </button>
                  </div>

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
          )}
        </div>
      </div>
    </Modal>
  );
}

export default RemoteWorktimeReportModal;

