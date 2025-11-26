import React, { useState, useEffect, useMemo } from 'react';
import Modal from 'react-modal';
import '../../styles/WorkTimeReportModal.css';
import AppUsageModal from './AppUsageModal';
import RemoteWorktimeReportModal from './RemoteWorktimeReportModal';
import UserWorkTimeDetailsMobile from '../UserWorkTimeDetailsMobile';

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

  // Состояния для модалки локального отчета
  const [localReportStartDate, setLocalReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [localReportEndDate, setLocalReportEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [localReportSearchTerm, setLocalReportSearchTerm] = useState('');
  const [localReportUsers, setLocalReportUsers] = useState([]);
  const [localReportUsersList, setLocalReportUsersList] = useState([]);
  const [localReportUserOptions, setLocalReportUserOptions] = useState([]);
  const [localReportShowAutocomplete, setLocalReportShowAutocomplete] = useState(false);
  const [loadingLocalReport, setLoadingLocalReport] = useState(false);
  const [localReportDetailsModal, setLocalReportDetailsModal] = useState({
    open: false,
    logs: [],
    username: '',
    realUsername: '',
    activityStats: null,
    urls: [],
    applications: [],
    screenshots: [],
    startDate: '',
    endDate: ''
  });

  // Загрузка списка пользователей
  useEffect(() => {
    if (showLocalReport) {
      fetch('/api/worktime-users')
        .then(res => res.json())
        .then(data => {
          setLocalReportUsersList(data.users || []);
          setLocalReportUserOptions(data.users || []);
        })
        .catch(() => {
          setLocalReportUsersList([]);
          setLocalReportUserOptions([]);
        });
    }
  }, [showLocalReport]);

  // Загрузка отчета при изменении дат
  const fetchLocalReport = React.useCallback(async () => {
    if (!localReportStartDate || !localReportEndDate) return;
    
    setLoadingLocalReport(true);
    try {
      const url = `/api/local-worktime-report?start=${localReportStartDate}&end=${localReportEndDate}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success && Array.isArray(data.report)) {
        setLocalReportUsers(data.report);
      } else {
        setLocalReportUsers([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки локального отчета:', error);
      setLocalReportUsers([]);
    }
    setLoadingLocalReport(false);
  }, [localReportStartDate, localReportEndDate]);

  // Автозагрузка при открытии модалки и изменении дат
  useEffect(() => {
    if (showLocalReport && localReportStartDate && localReportEndDate) {
      fetchLocalReport();
    }
  }, [showLocalReport, localReportStartDate, localReportEndDate, fetchLocalReport]);
  
  const handleOpenLocalReport = () => {
    console.log('🔘 [WorkTimeReportModal] Кнопка "Отчет активности локальных ПК" нажата');
    console.log('🔘 [WorkTimeReportModal] showLocalReport до:', showLocalReport);
    setShowLocalReport(true);
    console.log('🔘 [WorkTimeReportModal] setShowLocalReport(true) вызван');
  };

  // Обработка поиска
  const handleLocalReportSearchChange = (e) => {
    const value = e.target.value;
    setLocalReportSearchTerm(value);
    if (value.length > 0) {
      setLocalReportShowAutocomplete(true);
      setLocalReportUserOptions(localReportUsersList.filter(u => u.toLowerCase().includes(value.toLowerCase())));
    } else {
      setLocalReportShowAutocomplete(false);
      setLocalReportUserOptions(localReportUsersList);
    }
  };

  // Фильтрация пользователей по поиску
  const filteredLocalReportUsers = useMemo(() => {
    if (!localReportSearchTerm.trim()) return localReportUsers;
    const search = localReportSearchTerm.toLowerCase();
    return localReportUsers.filter(user => {
      const fio = (user.fio || user.username || '').toLowerCase();
      return fio.includes(search);
    });
  }, [localReportUsers, localReportSearchTerm]);

  // Открытие деталей пользователя
  const handleOpenLocalUserDetails = async (user) => {
    setLoadingLocalReport(true);
    try {
      const detailsParams = new URLSearchParams({
        username: user.username,
        start: localReportStartDate,
        end: localReportEndDate
      });
      
      const detailsRes = await fetch(`/api/activity-details?${detailsParams.toString()}`);
      const detailsData = await detailsRes.json();
      
      if (detailsRes.ok && detailsData.success) {
        setLocalReportDetailsModal({
          open: true,
          logs: user.sessions || [],
          username: user.fio || user.username,
          realUsername: user.username,
          activityStats: detailsData.activityStats || null,
          urls: detailsData.urls || [],
          applications: detailsData.applications || [],
          screenshots: detailsData.screenshots || [],
          startDate: localReportStartDate,
          endDate: localReportEndDate
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки деталей:', error);
    }
    setLoadingLocalReport(false);
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
          {/* Модалка для локального отчета */}
          {console.log('🔍 [WorkTimeReportModal] Рендер модалки локального отчета, showLocalReport =', showLocalReport)}
          <Modal
            isOpen={showLocalReport}
            onRequestClose={() => {
              console.log('🔴 [WorkTimeReportModal] Закрываем модалку локального отчета');
              setShowLocalReport(false);
              setLocalReportUsers([]);
              setLocalReportSearchTerm('');
            }}
            contentLabel="Отчет активности локальных ПК"
            style={modalStyles}
            ariaHideApp={false}
          >
            <div onClick={(e) => e.stopPropagation()} style={{
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
              <button onClick={() => {
                setShowLocalReport(false);
                setLocalReportUsers([]);
                setLocalReportSearchTerm('');
              }} style={{
                position: 'absolute', top: 16, right: 16, fontSize: 28, background: 'transparent', border: 'none',
                cursor: 'pointer', color: '#fff', fontWeight: 'bold', width: 36, height: 36, borderRadius: '50%'
              }}>×</button>

              <h2 style={{ marginTop: 0, marginBottom: 24, color: '#43e97b', fontWeight: 900, fontSize: '2em' }}>
                Отчет активности локальных ПК
              </h2>

              {/* Календарь и поиск */}
              <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <label>
                  Начало:
                  <input 
                    type="date" 
                    value={localReportStartDate} 
                    onChange={e => setLocalReportStartDate(e.target.value)}
                    style={{ marginLeft: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #43e97b', background: '#2d3748', color: '#fff' }} 
                  />
                </label>

                <label>
                  Конец:
                  <input 
                    type="date" 
                    value={localReportEndDate} 
                    onChange={e => setLocalReportEndDate(e.target.value)}
                    style={{ marginLeft: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #43e97b', background: '#2d3748', color: '#fff' }} 
                  />
                </label>

                <div style={{ position: 'relative', marginLeft: 'auto' }}>
                  <input
                    type="text"
                    placeholder="Поиск по имени..."
                    value={localReportSearchTerm}
                    onChange={handleLocalReportSearchChange}
                    onFocus={() => setLocalReportShowAutocomplete(true)}
                    onBlur={() => setTimeout(() => setLocalReportShowAutocomplete(false), 150)}
                    style={{ width: 240, padding: '6px 12px', borderRadius: 8, border: '1px solid #43e97b', background: '#2d3748', color: '#fff' }}
                  />
                  {localReportShowAutocomplete && localReportUserOptions && localReportUserOptions.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, background: '#232931', color: '#fff',
                      border: '1px solid #43e97b', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto', width: 240, marginTop: 6
                    }}>
                      {localReportUserOptions.map((u, i) => (
                        <div key={u + i}
                          onMouseDown={() => {
                            setLocalReportSearchTerm(u);
                            setLocalReportShowAutocomplete(false);
                          }}
                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: i < localReportUserOptions.length - 1 ? '1px solid #4a5568' : 'none' }}>
                          {u}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Кнопки действий */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                  <button onClick={fetchLocalReport} style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid #43e97b', background: 'rgba(67,233,123,0.1)', color: '#43e97b', cursor: 'pointer', fontWeight: 600
                  }}>
                    Показать отчет
                  </button>

                  <button
                    onClick={() => handleDeleteByDateRange(localReportStartDate, localReportEndDate)}
                    disabled={!localReportStartDate || !localReportEndDate}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px solid rgba(231, 76, 60, 0.5)',
                      background: (!localReportStartDate || !localReportEndDate) ? 'rgba(231, 76, 60, 0.3)' : 'rgba(231, 76, 60, 0.2)',
                      color: '#fff',
                      cursor: (!localReportStartDate || !localReportEndDate) ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      opacity: (!localReportStartDate || !localReportEndDate) ? 0.6 : 1,
                    }}
                  >
                    🗑️ Удалить за период
                  </button>

                  <button
                    onClick={() => handleDeleteByPeriod('week')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px solid rgba(231, 76, 60, 0.5)',
                      background: 'rgba(231, 76, 60, 0.2)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    🗑️ За неделю
                  </button>

                  <button
                    onClick={() => handleDeleteByPeriod('month')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px solid rgba(231, 76, 60, 0.5)',
                      background: 'rgba(231, 76, 60, 0.2)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    🗑️ За месяц
                  </button>
                </div>
              </div>

              {/* Таблица с пользователями */}
              {loadingLocalReport ? (
                <div style={{ textAlign: 'center', padding: 40 }}>Загрузка...</div>
              ) : filteredLocalReportUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.6)' }}>
                  <p style={{ fontSize: '16px' }}>Нет данных за выбранный период</p>
                </div>
              ) : (
                <div style={{ maxHeight: 500, overflowY: 'auto', borderRadius: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', color: '#e6f7ef' }}>
                    <thead>
                      <tr style={{ background: '#1f2630' }}>
                        <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082' }}>ФИО</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082' }}>Первый вход</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082' }}>Последний выход</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082' }}>Отработано</th>
                        <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082' }}>Детали</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLocalReportUsers.map((row, idx) => (
                        <tr key={idx} style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid #2a323d' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700 }}>{row.fio}</td>
                          <td style={{ padding: '12px 14px' }}>{row.firstLogin ? formatTime(row.firstLogin) : '—'}</td>
                          <td style={{ padding: '12px 14px' }}>{row.lastLogout ? formatTime(row.lastLogout) : '—'}</td>
                          <td style={{ padding: '12px 14px' }}>{row.totalTimeStr || '—'}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenLocalUserDetails(row)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 10,
                                border: 'none',
                                background: '#2193b0',
                                color: '#fff',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Подробнее
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Modal>

          {/* Модалка деталей пользователя с вкладками */}
          {localReportDetailsModal.open && (
            <UserWorkTimeDetailsMobile
              open={localReportDetailsModal.open}
              onClose={() => setLocalReportDetailsModal({ ...localReportDetailsModal, open: false })}
              logs={localReportDetailsModal.logs}
              username={localReportDetailsModal.username}
              realUsername={localReportDetailsModal.realUsername}
              activityStats={localReportDetailsModal.activityStats}
              urls={localReportDetailsModal.urls}
              applications={localReportDetailsModal.applications}
              screenshots={localReportDetailsModal.screenshots}
              startDate={localReportDetailsModal.startDate}
              endDate={localReportDetailsModal.endDate}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

export default WorkTimeReportModal;