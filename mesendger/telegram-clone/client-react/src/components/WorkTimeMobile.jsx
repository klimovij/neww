import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiSearch, FiCalendar, FiRefreshCw } from 'react-icons/fi';
import UserWorkTimeDetailsModal from './Modals/UserWorkTimeDetailsModal';
import UserWorkTimeDetailsMobile from './UserWorkTimeDetailsMobile';
import AppUsageModal from './Modals/AppUsageModal';
import AppUsageMobile from './AppUsageMobile';

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

export default function WorkTimeMobile({ open, onClose, onOpenMobileSidebar }) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });
  
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
  const [detailsModal, setDetailsModal] = useState({ open: false, logs: [], username: '' });
  const [importing, setImporting] = useState(false);
  const [importOk, setImportOk] = useState(null);
  const [showAppUsage, setShowAppUsage] = useState(false);

  useEffect(() => {
    if (open) {
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
  }, [open]);

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

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedUser('');
    setShowAutocomplete(false);
    setUserOptions(usersList);
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = `/api/quick-db-report?start=${startDate}&end=${endDate}`;
      if (selectedUser) url += `&username=${encodeURIComponent(selectedUser)}`;
      const res = await fetch(url);
      const data = await res.json();
      console.log('Данные из quick-db-report:', data);
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

  // Фильтрация строк таблицы
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
        {/* Header */}
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
            title="Назад"
          >
            <FaArrowLeft />
          </button>
          
          <h2
            style={{
              color: '#fff',
              fontSize: '16px',
              fontWeight: 700,
              margin: 0,
              flex: 1,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <FiCalendar size={18} />
            Мониторинг времени
          </h2>

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

        {/* Контент */}
        <div style={{ flex: 1, padding: '24px 16px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          {/* Кнопка отчета запусков приложения */}
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => setShowAppUsage(true)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '2px solid rgba(67, 233, 123, 0.3)',
                background: 'rgba(67, 233, 123, 0.15)',
                color: '#43e97b',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
              <FiRefreshCw size={18} />
              Отчёт запусков приложения
            </button>
          </div>

          {/* Фильтры */}
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Даты */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  color: '#ffe082',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '6px',
                }}>
                  Начало
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255, 224, 130, 0.3)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 500,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  color: '#ffe082',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '6px',
                }}>
                  Конец
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255, 224, 130, 0.3)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 500,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Поиск сотрудника */}
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                color: '#ffe082',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '6px',
              }}>
                Поиск сотрудника
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Введите имя сотрудника..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => setShowAutocomplete(true)}
                  onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 12px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255, 224, 130, 0.3)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 500,
                    outline: 'none',
                  }}
                />
                <FiSearch
                  size={18}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#ffe082',
                    pointerEvents: 'none',
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    style={{
                      position: 'absolute',
                      right: '40px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {showAutocomplete && userOptions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'rgba(35, 41, 49, 0.98)',
                  border: '2px solid rgba(255, 224, 130, 0.3)',
                  borderRadius: '12px',
                  zIndex: 10002,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginTop: '6px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                }}>
                  {userOptions.map((u, i) => (
                    <div
                      key={u + i}
                      onMouseDown={() => handleSelectUser(u)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: i < userOptions.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                        color: '#fff',
                        fontSize: '14px',
                      }}
                    >
                      {u}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Кнопки действий */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={fetchReport}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: '2px solid rgba(67, 233, 123, 0.3)',
                  background: loading
                    ? 'rgba(67, 233, 123, 0.3)'
                    : 'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '15px',
                  opacity: loading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite',
                    }} />
                    Загрузка...
                  </>
                ) : (
                  'Показать отчет'
                )}
              </button>

              <button
                onClick={triggerYesterdayImport}
                disabled={importing}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: '2px solid rgba(56, 217, 169, 0.3)',
                  background: importing
                    ? 'rgba(56, 217, 169, 0.3)'
                    : 'rgba(56, 217, 169, 0.15)',
                  color: '#38d9a9',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '15px',
                  opacity: importing ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  position: 'relative',
                }}
              >
                {importing ? (
                  <>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(56, 217, 169, 0.3)',
                      borderTopColor: '#38d9a9',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite',
                    }} />
                    Получение...
                  </>
                ) : (
                  'Получить данные'
                )}
                <div
                  title={importOk === true ? 'Импорт успешен' : importOk === false ? 'Импорт не выполнен' : 'Статус импорта неизвестен'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: importOk === true ? '#43e97b' : importOk === false ? '#e74c3c' : '#95a5a6',
                  }}
                />
              </button>
            </div>
          </div>

          {/* Результаты */}
          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#ffe082',
              fontSize: '16px',
              fontWeight: 600,
            }}>
              Загрузка данных...
            </div>
          ) : displayedRows.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '15px',
            }}>
              Нет данных для отображения
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {displayedRows.map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(255, 224, 130, 0.2)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}>
                    <h3 style={{
                      margin: 0,
                      color: '#ffe082',
                      fontSize: '16px',
                      fontWeight: 700,
                    }}>
                      {row.fio || row.username}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailsModal({ open: true, logs: row.sessions || row.logs || [], username: row.fio || row.username });
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#2193b0',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      Подробнее
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Первый вход:</span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>
                        {row.firstLogin ? formatTime(row.firstLogin) : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Последний выход:</span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>
                        {row.lastLogout ? formatTime(row.lastLogout) : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Отработано:</span>
                      <span style={{ color: '#43e97b', fontWeight: 700, fontSize: '15px' }}>
                        {row.totalTimeStr || (row.firstLogin && row.lastLogout ? formatWorkTime(Math.round((new Date(row.lastLogout) - new Date(row.firstLogin)) / 60000)) : '—')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

        {/* CSS для анимации загрузки */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* Модалки */}
        {isMobile ? (
          <UserWorkTimeDetailsMobile
            open={detailsModal.open}
            onClose={() => setDetailsModal({ open: false, logs: [], username: '' })}
            logs={detailsModal.logs}
            username={detailsModal.username}
            onOpenMobileSidebar={() => {
              // Не открываем сайдбар, так как мы уже внутри модалки
            }}
          />
        ) : (
          <UserWorkTimeDetailsModal
            isOpen={detailsModal.open}
            onRequestClose={() => setDetailsModal({ open: false, logs: [], username: '' })}
            logs={detailsModal.logs}
            username={detailsModal.username}
          />
        )}
        {isMobile ? (
          <AppUsageMobile
            open={showAppUsage}
            onClose={() => setShowAppUsage(false)}
            onOpenMobileSidebar={() => {
              // Не открываем сайдбар, так как мы уже внутри модалки
            }}
          />
        ) : (
          <AppUsageModal isOpen={showAppUsage} onRequestClose={() => setShowAppUsage(false)} />
        )}
      </div>
    </div>,
    document.body
  );
}

