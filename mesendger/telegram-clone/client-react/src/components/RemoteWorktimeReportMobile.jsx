import React, { useRef, useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiLogIn, FiLogOut, FiClock, FiCalendar, FiEye, FiSearch } from 'react-icons/fi';

function formatTime(dtStr) {
  if (!dtStr) return '—';
  // Парсим время как локальное (формат YYYY-MM-DD HH:mm:ss без часового пояса)
  // Явно создаем Date объект с локальным временем, чтобы избежать проблем с UTC
  const match = dtStr.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [_, year, month, day, hour, minute, second] = match;
    // Создаем Date объект с локальным временем (месяцы в JS с 0, поэтому -1)
    const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    if (!isNaN(d.getTime())) {
      return `${d.toLocaleDateString('ru-RU')}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
  }
  // Fallback на стандартный парсинг
  const d = new Date(dtStr);
  if (isNaN(d.getTime())) {
    return dtStr; // Возвращаем оригинальную строку, если не удалось распарсить
  }
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
  
  // Диапазон дат (по умолчанию вчера)
  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };
  
  const [startDate, setStartDate] = useState(getYesterdayDate);
  const [endDate, setEndDate] = useState(getYesterdayDate);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Поиск
  const [searchTerm, setSearchTerm] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);

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
  }, [open, startDate, endDate, selectedUser]);

  const loadReport = async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/remote-worktime-report?start=${startDate}&end=${endDate}`);
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
  
  // Опции для автозаполнения поиска
  const userOptions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const search = searchTerm.toLowerCase().trim();
    const uniqueUsers = Array.from(new Set(report.map(u => u.fio || u.username)));
    return uniqueUsers.filter(u => u.toLowerCase().includes(search)).slice(0, 10);
  }, [searchTerm, report]);
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowAutocomplete(true);
  };
  
  const handleClearSearch = () => {
    setSearchTerm('');
    setShowAutocomplete(false);
  };
  
  const handleSelectUser = (userName) => {
    setSearchTerm(userName);
    setShowAutocomplete(false);
  };
  
  // Фильтрация отчета по поисковому запросу
  const filteredReport = useMemo(() => {
    if (!searchTerm.trim()) return report;
    const search = searchTerm.toLowerCase().trim();
    return report.filter(user => {
      const fio = (user.fio || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      return fio.includes(search) || username.includes(search);
    });
  }, [report, searchTerm]);

  // Загрузка событий пользователя
  const loadUserEvents = async (username) => {
    if (!startDate || !endDate) {
      console.error('[RemoteWorktimeReportMobile] loadUserEvents: отсутствуют даты', { startDate, endDate });
      return;
    }
    
    if (!username) {
      console.error('[RemoteWorktimeReportMobile] loadUserEvents: отсутствует username', { username });
      return;
    }
    
    console.log('[RemoteWorktimeReportMobile] Загрузка событий пользователя:', { username, startDate, endDate });
    setLoadingEvents(true);
    try {
      const url = `/api/remote-worktime-user-events?username=${encodeURIComponent(username)}&start=${startDate}&end=${endDate}`;
      console.log('[RemoteWorktimeReportMobile] Запрос:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('[RemoteWorktimeReportMobile] Ответ от API:', data);
      
      if (data.success) {
        const events = data.events || [];
        console.log('[RemoteWorktimeReportMobile] Событий получено:', events.length, events);
        setUserEvents(events);
      } else {
        console.error('[RemoteWorktimeReportMobile] Ошибка загрузки событий:', data.error);
        setUserEvents([]);
      }
    } catch (error) {
      console.error('[RemoteWorktimeReportMobile] Ошибка загрузки событий:', error);
      setUserEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleViewUser = async (user) => {
    console.log('[RemoteWorktimeReportMobile] handleViewUser вызван:', user);
    console.log('[RemoteWorktimeReportMobile] Доступные поля:', Object.keys(user));
    setSelectedUser(user);
    
    // Используем технический username (из remote_work_time_logs), а не ФИО
    // technicalUsername - это оригинальный username из БД, username может быть заменен на ФИО
    // Если technicalUsername нет, значит отчет еще не обновлен - используем username
    let username = user.technicalUsername || user.username;
    
    // Если username равен ФИО (кириллица), пробуем найти технический username
    // Для этого нужно сделать запрос к серверу или использовать существующий username
    if (!username || (username === user.fio && /[А-Яа-яЁё]/.test(username))) {
      console.warn('[RemoteWorktimeReportMobile] Username равен ФИО, будет использован для поиска через API');
      // API endpoint сам найдет правильный username по ФИО
      username = user.fio || user.username;
    }
    
    if (!username) {
      console.error('[RemoteWorktimeReportMobile] handleViewUser: нет username в объекте user', user);
      return;
    }
    
    console.log('[RemoteWorktimeReportMobile] Используем username для запроса:', username);
    await loadUserEvents(username);
  };

  const handleBack = () => {
    setSelectedUser(null);
    setUserEvents([]);
  };

  // Проверяем, что мы на мобильном устройстве
  const [isMobileDevice, setIsMobileDevice] = useState(() => {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileDevice(window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Проверка после рендеринга - ДО условного return
  useEffect(() => {
    if (open && modalRef.current) {
      // Используем setTimeout, чтобы дать React время отрендерить портал
      const checkAndFixStyles = () => {
        const element = modalRef.current;
        if (!element) {
          console.warn('[RemoteWorktimeReportMobile] ⚠️ modalRef.current отсутствует');
          return;
        }
        
        console.log('[RemoteWorktimeReportMobile] 🔍 Модалка отрендерена в DOM, проверка стилей...');
        console.log('[RemoteWorktimeReportMobile] Элемент:', element);
        console.log('[RemoteWorktimeReportMobile] Parent:', element.parentElement);
        console.log('[RemoteWorktimeReportMobile] В document.body:', document.body.contains(element));
        
        const styles = window.getComputedStyle(element);
        console.log('[RemoteWorktimeReportMobile] Computed styles:', {
          position: styles.position,
          zIndex: styles.zIndex,
          width: styles.width,
          height: styles.height,
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          top: styles.top,
          left: styles.left,
        });
        
        // Принудительно устанавливаем стили
        element.style.setProperty('position', 'fixed', 'important');
        element.style.setProperty('top', '0', 'important');
        element.style.setProperty('left', '0', 'important');
        element.style.setProperty('right', '0', 'important');
        element.style.setProperty('bottom', '0', 'important');
        element.style.setProperty('width', '100vw', 'important');
        element.style.setProperty('height', '100vh', 'important');
        element.style.setProperty('z-index', '100009', 'important');
        element.style.setProperty('display', 'flex', 'important');
        element.style.setProperty('visibility', 'visible', 'important');
        element.style.setProperty('opacity', '1', 'important');
        element.style.setProperty('margin', '0', 'important');
        element.style.setProperty('padding', '0', 'important');
        
        // Проверяем, что стили применились
        const newStyles = window.getComputedStyle(element);
        console.log('[RemoteWorktimeReportMobile] ✅ Стили применены принудительно. Новые стили:', {
          position: newStyles.position,
          zIndex: newStyles.zIndex,
          width: newStyles.width,
          height: newStyles.height,
        });
      };
      
      // Проверяем сразу и через небольшую задержку
      checkAndFixStyles();
      setTimeout(checkAndFixStyles, 100);
      setTimeout(checkAndFixStyles, 300);
    }
  }, [open]);

  console.log('[RemoteWorktimeReportMobile] Рендерится, open =', open, 'selectedUser =', selectedUser, 'isMobileDevice =', isMobileDevice);
  
  if (!open) {
    console.log('[RemoteWorktimeReportMobile] Модалка закрыта, возвращаем null');
    return null;
  }

  // Показываем только на мобильных устройствах
  if (!isMobileDevice) {
    console.log('[RemoteWorktimeReportMobile] Не мобильное устройство, возвращаем null (будет показана десктоп версия)');
    return null;
  }

  console.log('[RemoteWorktimeReportMobile] ✅ Модалка открывается! open =', open);

  return ReactDOM.createPortal(
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 100009, // Выше всех других модалок (WorkTimeMobile имеет 100002)
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        visibility: 'visible',
        opacity: 1,
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
        minHeight: '56px',
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
        overflowX: 'hidden',
        padding: '16px',
        paddingBottom: '80px',
        width: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
      }}>
        {!selectedUser ? (
          <>
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
                    onChange={e => {
                      const newStartDate = e.target.value;
                      setStartDate(newStartDate);
                      // Автоматически обновляем endDate, если выбрана сегодняшняя дата
                      const today = new Date().toISOString().slice(0, 10);
                      if (newStartDate === today) {
                        setEndDate(today);
                      }
                    }}
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
                    onChange={e => {
                      const newEndDate = e.target.value;
                      setEndDate(newEndDate);
                    }}
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

              {/* Кнопка загрузки */}
              <button
                onClick={loadReport}
                disabled={loading}
                style={{
                  width: '100%',
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
                {loading ? 'Загрузка...' : 'Показать отчет'}
              </button>
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
            {!loading && filteredReport.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#999',
              }}>
                {searchTerm ? 'Нет результатов поиска' : 'Нет данных за выбранный период'}
              </div>
            )}

            {!loading && filteredReport.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredReport.map((user) => (
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
                          borderRadius: '10px',
                          border: '2px solid rgba(33, 147, 176, 0.5)',
                          background: 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(33, 147, 176, 0.3)',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.05)';
                          e.target.style.boxShadow = '0 4px 12px rgba(33, 147, 176, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = '0 2px 8px rgba(33, 147, 176, 0.3)';
                        }}
                      >
                        <FiEye size={14} />
                        Подробности
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
                      {user.totalTimeStr && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#fff',
                          fontSize: '14px',
                          marginTop: '4px',
                        }}>
                          <FiClock size={16} color="#ffe082" />
                          <span style={{ color: '#999' }}>Отработано:</span>
                          <span style={{ color: '#ffe082', fontWeight: 600 }}>{user.totalTimeStr}</span>
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
                Нет событий за выбранный период
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

