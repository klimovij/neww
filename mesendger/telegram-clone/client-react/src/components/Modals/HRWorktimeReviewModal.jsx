import React, { useState, useEffect, useMemo } from 'react';
import Modal from 'react-modal';
import { useApp } from '../../context/AppContext';
import { useSocket } from '../../hooks/useSocket';
import './HRWorktimeReviewModal.css';

const HRWorktimeReviewModal = ({ isOpen, onClose }) => {
  const { state } = useApp();
  const user = state.user;
  const socket = useSocket(user?.token);
  const [worktimeData, setWorktimeData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, checking, completed

  // Проверяем права HR/админа (временно отключено для тестирования)
  const isHR = true; // user?.role === 'hr' || user?.role === 'admin';

  useEffect(() => {
    if (isOpen && isHR) {
      fetchWorktimeData();
    }
  }, [isOpen, selectedDate, isHR]);

  const fetchWorktimeData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:5000/api/leaves/hr-worktime?date=${selectedDate}`;
      console.log('🔍 Fetching from URL:', url);
      console.log('🔍 Token:', token ? 'exists' : 'missing');
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 HR Worktime data received:', data);
        setWorktimeData(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch worktime data:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных отработки:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWorktime = async (userId, date, status) => {
    try {
      const token = localStorage.getItem('token');
      // Найдём текущую строку, чтобы передать минуты на сервер
      const row = (worktimeData || []).find((r) => r.userId === userId);
      const leaveMinutes = row && typeof row.requiredMinutes === 'number' ? row.requiredMinutes : undefined;
      const workedMinutes = row && typeof row.workedMinutes === 'number' ? row.workedMinutes : undefined;
      const response = await fetch('http://localhost:5000/api/leaves/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId,
          date,
          status,
          verifiedBy: user.id,
          leaveMinutes,
          workedMinutes
        })
      });

      if (response.ok) {
        await fetchWorktimeData(); // Обновляем данные
        // Уведомляем пользователя через сокет
        socket?.emit('worktime_verified', { userId, date, status });
      }
    } catch (error) {
      console.error('Ошибка подтверждения отработки:', error);
    }
  };

  const handleShowDetails = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/leaves/user-worktime-details?userId=${userId}&date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const details = await response.json();
        setSelectedUserDetails(details);
        setDetailsModalOpen(true);
      }
    } catch (error) {
      console.error('Ошибка загрузки деталей:', error);
    }
  };

  const filteredData = useMemo(() => {
    console.log('🔍 Filtering data:', { filter, totalItems: worktimeData.length, worktimeData });
    if (filter === 'all') return worktimeData;
    const filtered = worktimeData.filter(item => {
      switch (filter) {
        case 'pending':
          return item.status === 'pending';
        case 'checking':
          return item.status === 'checking';
        case 'completed':
          return item.status === 'completed';
        default:
          return true;
      }
    });
    console.log('🔍 Filtered result:', { filter, filteredCount: filtered.length, filtered });
    return filtered;
  }, [worktimeData, filter]);

  const getStatusBadge = (status) => {
    // Нормализуем статус с бэка (verified -> completed)
    const normalized = status === 'verified' ? 'completed' : status;
    const badges = {
      pending: { text: 'В обработке', className: 'status-pending' },
      checking: { text: 'На проверке', className: 'status-checking' },
      completed: { text: 'Отработано', className: 'status-completed' }
    };
    const badge = badges[normalized] || badges.pending;
    return <span className={`status-badge ${badge.className}`}>{badge.text}</span>;
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  const calcPercent = (worked, required) => {
    const w = Number(worked) || 0;
    const r = Number(required) || 0;
    if (r <= 0) return w > 0 ? 100 : 0;
    return Math.max(0, Math.min(100, Math.round((w / r) * 100)));
  };

  if (!isHR) {
    return null;
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onRequestClose={onClose}
        className="hr-worktime-modal"
        overlayClassName="hr-worktime-overlay"
        contentLabel="HR Worktime Review"
      >
        <div className="hr-worktime-header">
          <h2>Контроль отработки времени</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="hr-worktime-controls">
          <div className="date-filter">
            <label>Дата:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="status-filters">
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              Все
            </button>
            <button
              className={filter === 'pending' ? 'active' : ''}
              onClick={() => setFilter('pending')}
            >
              В обработке
            </button>
            <button
              className={filter === 'checking' ? 'active' : ''}
              onClick={() => setFilter('checking')}
            >
              На проверке
            </button>
            <button
              className={filter === 'completed' ? 'active' : ''}
              onClick={() => setFilter('completed')}
            >
              Отработано
            </button>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              className="verify-btn"
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch('http://localhost:5000/api/leaves/auto-verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ date: selectedDate })
                  });
                  if (!res.ok) throw new Error('Автопересчет не выполнен');
                  await fetchWorktimeData();
                } catch (e) {
                  console.error('Автопересчет не выполнен:', e);
                }
              }}
            >
              Пересчитать день
            </button>
          </div>
        </div>

        <div className="hr-worktime-content">
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : (
            <div className="worktime-table">
              <div className="table-header">
                <div>Сотрудник</div>
                <div>Статус</div>
                <div>Время отработки</div>
                <div>Отработано</div>
                <div>Действия</div>
              </div>
              
              {filteredData.map((item) => (
                <div key={`${item.userId}-${selectedDate}`} className="table-row">
                  <div className="user-info">
                    <div className="user-avatar">
                      <img src={item.avatar || '/default-avatar.png'} alt={item.userName} />
                    </div>
                    <div className="user-details">
                      <div className="user-name">{item.userName}</div>
                      <div className="user-role">{item.userRole}</div>
                    </div>
                  </div>
                  
                  <div className="status-cell">
                    {getStatusBadge(item.status)}
                  </div>
                  
                  <div className="time-cell">
                    {formatTime(item.requiredMinutes)}
                  </div>
                  
                  <div className="progress-cell">
                    {formatTime(item.workedMinutes)}
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${calcPercent(item.workedMinutes, item.requiredMinutes)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="actions-cell">
                    <button
                      className="details-btn"
                      onClick={() => handleShowDetails(item.userId)}
                    >
                      Детали
                    </button>
                    
                    {item.status !== 'completed' && (
                      <button
                        className="verify-btn"
                        onClick={() => handleVerifyWorktime(item.userId, selectedDate, 'completed')}
                      >
                        Подтвердить
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredData.length === 0 && (
                <div className="no-data">Нет данных для отображения</div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Модалка с деталями */}
      <Modal
        isOpen={detailsModalOpen}
        onRequestClose={() => setDetailsModalOpen(false)}
        className="details-modal"
        overlayClassName="details-overlay"
        contentLabel="Worktime Details"
      >
        {selectedUserDetails && (
          <div className="details-content">
            <div className="details-header">
              <h3>Детали отработки</h3>
              <button className="close-btn" onClick={() => setDetailsModalOpen(false)}>×</button>
            </div>
            
            <div className="details-body">
              <div className="user-info">
                <img src={selectedUserDetails.avatar || '/default-avatar.png'} alt={selectedUserDetails.userName} />
                <div>
                  <h4>{selectedUserDetails.userName}</h4>
                  <p>{selectedUserDetails.userRole}</p>
                </div>
              </div>
              
              <div className="worktime-details">
                <div className="detail-item">
                  <label>Период отработки:</label>
                  <span>{selectedUserDetails.leaveStartDate} - {selectedUserDetails.leaveEndDate}</span>
                </div>
                
                <div className="detail-item">
                  <label>Требуется отработать:</label>
                  <span>{formatTime(selectedUserDetails.requiredMinutes)}</span>
                </div>
                
                <div className="detail-item">
                  <label>Отработано:</label>
                  <span>{formatTime(selectedUserDetails.workedMinutes)}</span>
                </div>
                
                <div className="detail-item">
                  <label>Прогресс:</label>
                  <span>{Math.round((selectedUserDetails.workedMinutes / selectedUserDetails.requiredMinutes) * 100)}%</span>
                </div>
                
                <div className="detail-item">
                  <label>Статус:</label>
                  {getStatusBadge(selectedUserDetails.status)}
                </div>
              </div>
              
              {selectedUserDetails.sessions && selectedUserDetails.sessions.length > 0 && (
                <div className="sessions-details">
                  <h4>Сессии отработки:</h4>
                  {selectedUserDetails.sessions.map((session, index) => (
                    <div key={index} className="session-item">
                      <span>{session.date}</span>
                      <span>{formatTime(session.minutes)}</span>
                      <span className={session.completed ? 'completed' : 'pending'}>
                        {session.completed ? 'Завершено' : 'В процессе'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default HRWorktimeReviewModal;
