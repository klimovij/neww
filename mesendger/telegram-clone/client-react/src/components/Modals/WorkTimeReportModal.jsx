import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import '../../styles/WorkTimeReportModal.css';
import UserWorkTimeDetailsModal from './UserWorkTimeDetailsModal';
import AppUsageModal from './AppUsageModal';

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
  const [selectedUser, setSelectedUser] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsModal, setDetailsModal] = useState({ open: false, logs: [], username: '', activityStats: null });
  const [importing, setImporting] = useState(false);
  const [importOk, setImportOk] = useState(null); // null | true | false
  const [showAppUsage, setShowAppUsage] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState(null); // { success: true/false, message: string }

  useEffect(() => {
    if (isOpen) {
      fetch('/api/worktime-users')
        .then(res => res.json())
        .then(data => {
          setUsersList(data.users || []);
          setUserOptions(data.users || []);
        })
        .catch(() => {
          setUsersList([]);
          setUserOptions([]);
        });
    }
  }, [isOpen]);

  // WebSocket для обновления данных в реальном времени (используем общий socket)
  useEffect(() => {
    if (!isOpen) return;

    // Используем общий socket из SocketProvider вместо создания нового
    const socket = window.socket;
    if (!socket || !socket.connected) return;

    // Слушаем обновления данных активности
    const handleActivityUpdate = (updateData) => {
      // Проверяем, попадает ли дата обновления в выбранный диапазон
      const updateDate = updateData.date;
      if (updateDate >= startDate && updateDate <= endDate) {
        // Обновляем данные, если они попадают в выбранный диапазон дат
        fetchReport();
      }
    };

    socket.on('activity_data_updated', handleActivityUpdate);

    return () => {
      if (socket) {
        socket.off('activity_data_updated', handleActivityUpdate);
      }
    };
  }, [isOpen, startDate, endDate, fetchReport]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length > 0) {
      setShowAutocomplete(true);
      setUserOptions(usersList.filter(u => u.toLowerCase().includes(value.toLowerCase())));
    } else {
      setShowAutocomplete(false);
      setUserOptions(usersList);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchTerm(user);
    setShowAutocomplete(false);
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      // Используем endpoint для ЛОКАЛЬНЫХ данных (work_time_logs + activity_logs)
      let url = `/api/local-worktime-report?start=${startDate}&end=${endDate}`;
      if (selectedUser) url += `&username=${encodeURIComponent(selectedUser)}`;
      const res = await fetch(url);
      const data = await res.json();
      // API возвращает { report: [...] }
      console.log('Данные из local-worktime-report (локальные):', data);
      setLogs(Array.isArray(data.report) ? data.report : []);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  };

  const triggerYesterdayImport = async () => {
    setImporting(true);
    setImportOk(null);
    try {
      const res = await fetch('/api/auto-import-csv-yesterday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      const ok = res.ok && data && data.success && typeof data.imported === 'number' && data.imported > 0;
      setImportOk(ok);
    } catch {
      setImportOk(false);
    }
    setImporting(false);
  };

  const clearActivityData = async (period) => {
    if (!window.confirm(`Вы уверены, что хотите удалить данные активности за ${period === 'day' ? 'день' : period === 'week' ? 'неделю' : 'месяц'}? Это действие нельзя отменить!`)) {
      return;
    }
    
    setClearing(true);
    setClearResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/activity-logs/clear', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ period })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setClearResult({ success: true, message: data.message || `Удалено ${data.deletedCount || 0} записей` });
        // Обновляем отчет после очистки
        setTimeout(() => {
          fetchReport();
          setClearResult(null);
        }, 2000);
      } else {
        setClearResult({ success: false, message: data.error || 'Ошибка при удалении данных' });
      }
    } catch (error) {
      setClearResult({ success: false, message: 'Ошибка при удалении данных: ' + error.message });
    }
    setClearing(false);
  };

  // Фильтрация строк таблицы по образцу
  const displayedRows = React.useMemo(() => {
    if (!Array.isArray(logs) || logs.length === 0) return [];
    const q = (searchTerm || '').trim().toLowerCase();
    return logs.filter(row => {
      const fio = (row.fio || row.username || '').trim();
      if (selectedUser) return fio === selectedUser;
      if (q) return fio.toLowerCase().includes(q);
      return true;
    });
  }, [logs, selectedUser, searchTerm]);

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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <h2 style={{ marginTop: 0, marginBottom: 18, color: '#43e97b', fontWeight: 900, fontSize: '2em' }}>
              Мониторинг отработанного времени
            </h2>
            <button
              type="button"
              onClick={() => setShowAppUsage(true)}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid rgba(67,233,123,0.35)',
                background: 'rgba(67,233,123,0.15)',
                color: '#b2ffb2',
                cursor: 'pointer',
                fontWeight: 800
              }}
            >
              Отчёт запусков приложения
            </button>
          </div>

          <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', position: 'relative' }}>
            <label>
              Начало:
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ marginLeft: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #43e97b', background: '#2d3748', color: '#fff' }} />
            </label>

            <label>
              Конец:
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{ marginLeft: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #43e97b', background: '#2d3748', color: '#fff' }} />
            </label>

            <div style={{ position: 'relative', marginLeft: 16 }}>
              {/* Убрана надпись "Сотрудник" */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="text"
                  placeholder="Поиск сотрудника..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => setShowAutocomplete(true)}
                  onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
                  style={{ width: 240, padding: '6px 12px', borderRadius: 8, border: '1px solid #43e97b', background: '#2d3748', color: '#fff' }}
                />
              </div>

              {showAutocomplete && userOptions && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, background: '#232931', color: '#fff',
                  border: '1px solid #43e97b', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto', width: 240, marginTop: 6
                }}>
                  {userOptions.length === 0 ? (
                    <div style={{ padding: 8 }}>Нет совпадений</div>
                  ) : (
                    userOptions.map((u, i) => (
                      <div key={u + i}
                        onMouseDown={() => handleSelectUser(u)}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: i < userOptions.length - 1 ? '1px solid #4a5568' : 'none' }}>
                        {u}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <button onClick={fetchReport} style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #43e97b', background: 'rgba(67,233,123,0.1)', color: '#43e97b', cursor: 'pointer', fontWeight: 600
            }}>
              Отчет активности локальных ПК
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={triggerYesterdayImport} disabled={importing} style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid #38d9a9', background: 'rgba(56,217,169,0.1)', color: '#38d9a9', cursor: importing ? 'not-allowed' : 'pointer', fontWeight: 600
              }}>
                {importing ? 'Получение…' : 'Получить данные'}
              </button>
              <div title={importOk === true ? 'Импорт успешен' : importOk === false ? 'Импорт не выполнен' : 'Статус импорта неизвестен'}
                style={{ width: 12, height: 12, borderRadius: '50%', background: importOk === true ? '#43e97b' : importOk === false ? '#e74c3c' : '#95a5a6' }} />
              
              {/* Кнопки очистки данных */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10, paddingLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginRight: 4 }}>Очистить:</span>
                <button 
                  onClick={() => clearActivityData('day')} 
                  disabled={clearing}
                  style={{
                    padding: '6px 10px', 
                    borderRadius: 6, 
                    border: '1px solid #e74c3c', 
                    background: 'rgba(231,76,60,0.1)', 
                    color: '#e74c3c', 
                    cursor: clearing ? 'not-allowed' : 'pointer', 
                    fontWeight: 600,
                    fontSize: '12px'
                  }}
                  title="Удалить данные за последний день"
                >
                  {clearing ? '...' : 'День'}
                </button>
                <button 
                  onClick={() => clearActivityData('week')} 
                  disabled={clearing}
                  style={{
                    padding: '6px 10px', 
                    borderRadius: 6, 
                    border: '1px solid #e74c3c', 
                    background: 'rgba(231,76,60,0.1)', 
                    color: '#e74c3c', 
                    cursor: clearing ? 'not-allowed' : 'pointer', 
                    fontWeight: 600,
                    fontSize: '12px'
                  }}
                  title="Удалить данные за последнюю неделю"
                >
                  {clearing ? '...' : 'Неделя'}
                </button>
                <button 
                  onClick={() => clearActivityData('month')} 
                  disabled={clearing}
                  style={{
                    padding: '6px 10px', 
                    borderRadius: 6, 
                    border: '1px solid #e74c3c', 
                    background: 'rgba(231,76,60,0.1)', 
                    color: '#e74c3c', 
                    cursor: clearing ? 'not-allowed' : 'pointer', 
                    fontWeight: 600,
                    fontSize: '12px'
                  }}
                  title="Удалить данные за последний месяц"
                >
                  {clearing ? '...' : 'Месяц'}
                </button>
              </div>
              
              {clearResult && (
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: clearResult.success ? 'rgba(67,233,123,0.2)' : 'rgba(231,76,60,0.2)',
                  color: clearResult.success ? '#43e97b' : '#e74c3c',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {clearResult.message}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>Загрузка...</div>
          ) : (
            <div style={{ maxHeight: 400, overflowY: 'auto', borderRadius: 12 }}>
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
                  {displayedRows.map((row, idx) => (
                    <tr key={idx} style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid #2a323d' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{row.fio}</td>
                      <td style={{ padding: '12px 14px' }}>{row.firstLogin ? formatTime(row.firstLogin) : '—'}</td>
                      <td style={{ padding: '12px 14px' }}>{row.lastLogout ? formatTime(row.lastLogout) : '—'}</td>
                      <td style={{ padding: '12px 14px' }}>{row.totalTimeStr || (row.firstLogin && row.lastLogout ? formatWorkTime(Math.round((new Date(row.lastLogout) - new Date(row.firstLogin)) / 60000)) : '—')}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          type="button"
                          onClick={async (e) => { 
                            e.stopPropagation();
                            // Загружаем данные активности перед открытием модалки
                            let activityStats = null;
                            try {
                              const params = new URLSearchParams({
                                start: startDate,
                                end: endDate,
                              });
                              console.log('🔍 [WorkTimeReportModal] Загружаем activity-summary...');
                              console.log('🔍 [WorkTimeReportModal] Row data:', { username: row.username, fio: row.fio });
                              console.log('🔍 [WorkTimeReportModal] Date range:', { start: startDate, end: endDate });
                              
                              const res = await fetch(`/api/activity-summary?${params.toString()}`);
                              const data = await res.json();
                              
                              console.log('🔍 [WorkTimeReportModal] Response status:', res.status);
                              console.log('🔍 [WorkTimeReportModal] Response data:', data);
                              
                              if (res.ok && data.success && Array.isArray(data.summary)) {
                                // Сопоставляем по username (важно для activity-summary)
                                const usernameForMatch = row.username || row.fio;
                                console.log('🔍 [WorkTimeReportModal] Ищем activityStats для username:', usernameForMatch);
                                console.log('🔍 [WorkTimeReportModal] Доступные usernames в summary:', data.summary.map(s => s.username));
                                
                                activityStats = data.summary.find(
                                  (s) => s.username === usernameForMatch
                                ) || null;
                                
                                if (activityStats) {
                                  console.log('✅ [WorkTimeReportModal] Найденный activityStats:', activityStats);
                                } else {
                                  console.warn('⚠️ [WorkTimeReportModal] activityStats НЕ найден!');
                                  console.warn('⚠️ [WorkTimeReportModal] Искали:', usernameForMatch);
                                  console.warn('⚠️ [WorkTimeReportModal] Доступны:', data.summary.map(s => s.username));
                                }
                              } else {
                                console.error('❌ [WorkTimeReportModal] Ошибка в ответе:', { ok: res.ok, success: data.success, isArray: Array.isArray(data.summary) });
                              }
                            } catch (err) {
                              console.error('Ошибка загрузки активности:', err);
                            }
                            setDetailsModal({ 
                              open: true, 
                              logs: row.sessions || row.logs || [], 
                              username: row.fio || row.username,
                              activityStats 
                            }); 
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 10,
                            border: 'none',
                            background: '#2193b0',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer',
                            pointerEvents: 'auto'
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

          <button onClick={onRequestClose} style={{
            marginTop: 16, width: '100%', padding: '12px 18px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(90deg, #a3ffb0 0%, #ffe082 100%)', color: '#232931', fontWeight: 800, fontSize: '1.06rem', cursor: 'pointer'
          }}>
            Закрыть
          </button>

          <UserWorkTimeDetailsModal
            isOpen={detailsModal.open}
            onRequestClose={() => setDetailsModal({ open: false, logs: [], username: '', activityStats: null })}
            logs={detailsModal.logs}
            username={detailsModal.username}
            activityStats={detailsModal.activityStats}
          />
          <AppUsageModal isOpen={showAppUsage} onRequestClose={() => setShowAppUsage(false)} />
        </div>
      </div>
    </Modal>
  );
}

export default WorkTimeReportModal;