import React, { useState } from 'react';
import Modal from 'react-modal';
import '../../styles/WorkTimeReportModal.css';
import AppUsageModal from './AppUsageModal';
import RemoteWorktimeReportModal from './RemoteWorktimeReportModal';
import UserWorkTimeDetailsModal from './UserWorkTimeDetailsModal';

Modal.setAppElement('#root');

// Вынесем парсер вне функции
function parseDate(str) {
  if (!str) return null;
  // Если ISO-формат
  if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) return new Date(str);
  // Если DD.MM.YYYY HH:mm:ss
  const match = str.match(/(\d{2})\.(\d{2})\.(\d{4})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [_, dd, mm, yyyy, hh, min, ss] = match;
    // В JS месяцы с 0, поэтому -1
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss));
  }
  // Если только дата без времени
  const matchDate = str.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (matchDate) {
    const [_, dd, mm, yyyy] = matchDate;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }
  // Падение в стандартный парсер
  return new Date(str);
}

function calculateWorkTime(logs, startDate, endDate) {
  const userMap = {};
  logs.forEach(log => {
    if (!userMap[log.username]) userMap[log.username] = [];
    userMap[log.username].push(log);
  });

  return Object.entries(userMap).map(([username, userLogs]) => {
    // Фильтруем только по дате (без времени), чтобы не было ошибок из-за формата
    const filtered = userLogs.filter(l => {
      const t = parseDate(l.event_time);
      const tDate = t.toISOString().slice(0, 10);
      return tDate >= startDate && tDate <= endDate;
    });

    if (filtered.length === 0) {
      return {
        username,
        firstLogin: '',
        lastLogout: '',
        workMinutes: 0,
        logs: []
      };
    }

    // Сортируем по времени
    const sorted = filtered.slice().sort((a, b) => parseDate(a.event_time) - parseDate(b.event_time));

    // Первый вход — событие с event_type 'login' или 'other'
    const logins = sorted.filter(l => l.event_type === 'login' || l.event_type === 'other');
    const firstLogin = logins.length > 0 ? logins.reduce((min, l) => parseDate(l.event_time) < parseDate(min.event_time) ? l : min) : null;

    // Последний выход — событие с event_type 'logout'
    const logouts = sorted.filter(l => l.event_type === 'logout');
    const lastLogout = logouts.length > 0 ? logouts.reduce((max, l) => parseDate(l.event_time) > parseDate(max.event_time) ? l : max) : null;

    // Для отображения: если нет выхода, показываем последний login
    let displayLastLogout = lastLogout ? lastLogout.event_time : '';
    if (!displayLastLogout && logins.length > 0) {
      displayLastLogout = logins[logins.length - 1].event_time;
    }

    let workMinutes = 0;
    if (firstLogin && displayLastLogout) {
      workMinutes = Math.round((parseDate(displayLastLogout) - parseDate(firstLogin.event_time)) / 60000);
    }

    // Отладочный вывод
    console.log('User:', username, 'First login:', firstLogin ? firstLogin.event_time : 'none', 'Last logout:', displayLastLogout, 'Work minutes:', workMinutes);

    return {
      username,
      firstLogin: firstLogin ? firstLogin.event_time : '',
      lastLogout: displayLastLogout,
      workMinutes,
      logs: sorted
    };
  });
}

function WorkTimeReportModal({ isOpen, onRequestClose }) {
  const [showAppUsage, setShowAppUsage] = useState(false);
  const [showRemoteWorktime, setShowRemoteWorktime] = useState(false);
  const [showLocalReport, setShowLocalReport] = useState(false);
  const [localReportData, setLocalReportData] = useState({ logs: [], username: '', activityStats: null });

  const handleOpenLocalReport = async () => {
    setShowLocalReport(true);
    // Загружаем данные для локального отчета
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const startDate = yesterday.toISOString().slice(0, 10);
      const endDate = yesterday.toISOString().slice(0, 10);
      
      const url = `/api/local-worktime-report?start=${startDate}&end=${endDate}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success && Array.isArray(data.report)) {
        setLocalReportData({ 
          logs: data.report, 
          username: '', 
          activityStats: null 
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки локального отчета:', error);
    }
  };

  function formatTime(dtStr) {
    if (!dtStr) return '';
    const d = new Date(dtStr);
    return `${d.toLocaleDateString('ru-RU')}, ${d.toLocaleTimeString('ru-RU')}`;
  }
  function formatWorkTime(mins) {
    if (mins === 0) return '0м';
    if (!mins || mins < 0) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h > 0 ? h + 'ч ' : ''}${m}м`;
  }

  // Стили из эталонного кода
  const modalStyles = {
    overlay: {
      backgroundColor: 'transparent',
      zIndex: 1000,
      top: 0,
      right: 0,
      bottom: 0,
      left: 'calc(380px + max((100vw - 380px - 1200px)/2, 0px))'
    },
    content: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '1170px',
      minWidth: '600px',
      maxWidth: '1170px',
      height: '92vh',
      margin: '32px 0',
      inset: 'unset',
      right: 'auto',
      bottom: 'auto',
      border: 'none',
      background: 'transparent',
      padding: 0,
      overflow: 'visible'
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Мониторинг времени"
      style={modalStyles}
      ariaHideApp={false}
    >
      <div onClick={onRequestClose} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
          borderRadius: 28,
          width: '100%',
          minWidth: '600px',
          maxWidth: '1200px',
          height: '100%',
          boxSizing: 'border-box',
          boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          color: '#fff',
          padding: '40px 48px',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          <button onClick={onRequestClose} aria-label="Close modal" style={{
            position: 'absolute', top: 16, right: 16, fontSize: 28, background: 'transparent', border: 'none',
            cursor: 'pointer', color: '#fff', fontWeight: 'bold', width: 36, height: 36, borderRadius: '50%'
          }}>×</button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 40 }}>
            <h2 style={{ marginTop: 0, marginBottom: 0, color: '#43e97b', fontWeight: 900, fontSize: '2em' }}>
              Мониторинг отработанного времени
            </h2>
          </div>

          {/* Три кнопки отчетов */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
            <button
              type="button"
              onClick={() => setShowAppUsage(true)}
              style={{
                padding: '16px 24px',
                borderRadius: 12,
                border: '1px solid rgba(67,233,123,0.35)',
                background: 'rgba(67,233,123,0.15)',
                color: '#b2ffb2',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '16px',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(67,233,123,0.25)';
                e.target.style.transform = 'translateX(5px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(67,233,123,0.15)';
                e.target.style.transform = 'translateX(0)';
              }}
            >
              Отчет запусков приложения
            </button>

            <button
              type="button"
              onClick={() => setShowRemoteWorktime(true)}
              style={{
                padding: '16px 24px',
                borderRadius: 12,
                border: '1px solid rgba(67,233,123,0.35)',
                background: 'rgba(67,233,123,0.15)',
                color: '#b2ffb2',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '16px',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(67,233,123,0.25)';
                e.target.style.transform = 'translateX(5px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(67,233,123,0.15)';
                e.target.style.transform = 'translateX(0)';
              }}
            >
              Отчет Удаленка
            </button>

            <button
              type="button"
              onClick={handleOpenLocalReport}
              style={{
                padding: '16px 24px',
                borderRadius: 12,
                border: '1px solid rgba(67,233,123,0.35)',
                background: 'rgba(67,233,123,0.15)',
                color: '#b2ffb2',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '16px',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(67,233,123,0.25)';
                e.target.style.transform = 'translateX(5px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(67,233,123,0.15)';
                e.target.style.transform = 'translateX(0)';
              }}
            >
              Отчет активности локальных ПК
            </button>
          </div>

          <button onClick={onRequestClose} style={{
            marginTop: 16, width: '100%', padding: '12px 18px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(90deg, #a3ffb0 0%, #ffe082 100%)', color: '#232931', fontWeight: 800, fontSize: '1.06rem', cursor: 'pointer'
          }}>
            Закрыть
          </button>

          <AppUsageModal isOpen={showAppUsage} onRequestClose={() => setShowAppUsage(false)} />
          <RemoteWorktimeReportModal 
            isOpen={showRemoteWorktime} 
            onRequestClose={() => setShowRemoteWorktime(false)} 
          />
          <UserWorkTimeDetailsModal
            isOpen={showLocalReport}
            onRequestClose={() => setShowLocalReport(false)}
            logs={localReportData.logs}
            username={localReportData.username}
            activityStats={localReportData.activityStats}
          />
        </div>
      </div>
    </Modal>
  );
}

export default WorkTimeReportModal;