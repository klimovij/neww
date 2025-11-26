import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiSearch, FiCalendar, FiRefreshCw, FiMonitor } from 'react-icons/fi';
import UserWorkTimeDetailsModal from './Modals/UserWorkTimeDetailsModal';
import UserWorkTimeDetailsMobile from './UserWorkTimeDetailsMobile';
import AppUsageModal from './Modals/AppUsageModal';
import AppUsageMobile from './AppUsageMobile';
import RemoteWorktimeReportModal from './Modals/RemoteWorktimeReportModal';
import RemoteWorktimeReportMobile from './RemoteWorktimeReportMobile';

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

// Функция для получения сегодняшней даты в локальном времени (киевское)
function getTodayLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function WorkTimeMobile({ open, onClose, onOpenMobileSidebar }) {
  // ВЕРСИЯ 5.0 - ДОБАВЛЕН realUsername, УЛУЧШЕНО ЛОГИРОВАНИЕ API
  console.log('%c🚨🚨🚨 КОМПОНЕНТ WorkTimeMobile V5.0 - BUILD 2025-01-20 🚨🚨🚨', 'background: #ff0000; color: #ffffff; font-size: 18px; font-weight: bold; padding: 8px;');
  console.log('🚨🚨🚨 [WorkTimeMobile] ====== КОМПОНЕНТ V5.0 - BUILD 2025-01-20 ======');
  console.log('🚨🚨🚨 [WorkTimeMobile] ЕСЛИ ВЫ ВИДИТЕ ЭТОТ ЛОГ - НОВЫЙ КОД ЗАГРУЖЕН! 🚨🚨🚨');
  
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
  // Используем локальное время (киевское), а не UTC
  const [startDate, setStartDate] = useState(() => getTodayLocalDate());
  const [endDate, setEndDate] = useState(() => getTodayLocalDate());
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsModal, setDetailsModal] = useState({ 
    open: false, 
    logs: [], 
    username: '',
    realUsername: '', // Правильный username для API запросов
    activityStats: null,
    urls: [],
    applications: [],
    screenshots: [],
    startDate: '',
    endDate: '',
  });
  const [importing, setImporting] = useState(false);
  const [importOk, setImportOk] = useState(null);
  const [showAppUsage, setShowAppUsage] = useState(false);
  const [showRemoteWorktime, setShowRemoteWorktime] = useState(false);
  const [showLocalReport, setShowLocalReport] = useState(false);
  
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

  // Загрузка списка пользователей для локального отчета
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
    if (!localReportStartDate || !localReportEndDate) {
      console.log('⚠️ [WorkTimeMobile] fetchLocalReport: нет дат', { localReportStartDate, localReportEndDate });
      return;
    }
    
    console.log('📥 [WorkTimeMobile] Загрузка локального отчета:', { start: localReportStartDate, end: localReportEndDate });
    setLoadingLocalReport(true);
    try {
      const url = `/api/local-worktime-report?start=${localReportStartDate}&end=${localReportEndDate}`;
      console.log('📡 [WorkTimeMobile] Запрос к API:', url);
      const res = await fetch(url);
      const data = await res.json();
      console.log('📥 [WorkTimeMobile] Ответ от API:', { success: data.success, reportLength: data.report?.length || 0, data });
      
      if (data.success && Array.isArray(data.report)) {
        console.log('✅ [WorkTimeMobile] Успешно загружено пользователей:', data.report.length);
        setLocalReportUsers(data.report);
      } else {
        console.warn('⚠️ [WorkTimeMobile] Нет данных или неверный формат ответа');
        setLocalReportUsers([]);
      }
    } catch (error) {
      console.error('❌ [WorkTimeMobile] Ошибка загрузки локального отчета:', error);
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

  // Обработка поиска в локальном отчете
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
  const filteredLocalReportUsers = React.useMemo(() => {
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

  // Автоматически загружаем данные при открытии модалки, если дата сегодняшняя
  useEffect(() => {
    if (open) {
      const today = getTodayLocalDate();
      if (startDate === today && endDate === today) {
        // Загружаем данные автоматически
        (async () => {
          setLoading(true);
          try {
            // Сервер сам расширяет диапазон для учёта часового пояса
            // Используем endpoint для ЛОКАЛЬНЫХ данных
            let url = `/api/local-worktime-report?start=${startDate}&end=${endDate}`;
            if (selectedUser) url += `&username=${encodeURIComponent(selectedUser)}`;
            const res = await fetch(url);
            const data = await res.json();
            console.log('📊 [WorkTimeMobile] Данные из local-worktime-report (локальные, автозагрузка):', data);
            if (data.report && data.report.length > 0) {
              console.log('📊 [WorkTimeMobile] Первый элемент отчёта:', JSON.stringify(data.report[0], null, 2));
              console.log('📊 [WorkTimeMobile] FIO:', data.report[0].fio, 'Username:', data.report[0].username);
              console.log('📊 [WorkTimeMobile] Sessions:', data.report[0].sessions?.length || 0, 'sessions');
            } else {
              console.warn('⚠️ [WorkTimeMobile] Нет данных в отчёте!', data);
            }
            setLogs(Array.isArray(data.report) ? data.report : []);
          } catch {
            setLogs([]);
          }
          setLoading(false);
        })();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startDate, endDate]);

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
      // Сервер сам расширяет диапазон для учёта часового пояса
      // Используем endpoint для ЛОКАЛЬНЫХ данных
      let url = `/api/local-worktime-report?start=${startDate}&end=${endDate}`;
      if (selectedUser) url += `&username=${encodeURIComponent(selectedUser)}`;
      const res = await fetch(url);
      const data = await res.json();
      console.log('📊 [WorkTimeMobile] Данные из local-worktime-report (локальные):', data);
      if (data.report && data.report.length > 0) {
        console.log('📊 [WorkTimeMobile] Первый элемент отчёта:', JSON.stringify(data.report[0], null, 2));
        console.log('📊 [WorkTimeMobile] FIO:', data.report[0].fio, 'Username:', data.report[0].username, 'Sessions:', data.report[0].sessions?.length || 0);
      } else {
        console.warn('⚠️ [WorkTimeMobile] Нет данных в отчёте!', data);
      }
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
      // Свайп влево - закрываем модалку, возвращаемся к SidebarNav
      onClose();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleClose = () => {
    // Просто закрываем модалку, возвращаемся к SidebarNav (который остается открытым)
    onClose();
  };

  // Рендерим модалки RemoteWorktime ВНЕ портала WorkTimeMobile, чтобы они всегда были доступны
  const remoteWorktimeModals = (
    <>
      <RemoteWorktimeReportMobile
        open={showRemoteWorktime}
        onClose={() => {
          console.log('🔴 [WorkTimeMobile] Закрываем RemoteWorktimeReportMobile');
          setShowRemoteWorktime(false);
        }}
        onOpenMobileSidebar={() => {
          // Не открываем сайдбар, так как мы уже внутри модалки
        }}
      />
      <RemoteWorktimeReportModal 
        isOpen={showRemoteWorktime} 
        onRequestClose={() => {
          console.log('🔴 [WorkTimeMobile] Закрываем RemoteWorktimeReportModal (desktop)');
          setShowRemoteWorktime(false);
        }} 
      />
    </>
  );

  return (
    <>
      {ReactDOM.createPortal(remoteWorktimeModals, document.body)}
      {open && ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 100002, // Выше SidebarNav (100001)
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

          {/* Кнопка отчета удаленки */}
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => {
                console.log('🔘 [WorkTimeMobile] Кнопка "Отчет Удаленка" нажата');
                setShowRemoteWorktime(true);
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '2px solid rgba(255, 224, 130, 0.5)',
                background: 'rgba(255, 224, 130, 0.2)',
                color: '#ffe082',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(255, 224, 130, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 224, 130, 0.3)';
                e.target.style.borderColor = '#ffe082';
                e.target.style.boxShadow = '0 4px 12px rgba(255, 224, 130, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 224, 130, 0.2)';
                e.target.style.borderColor = 'rgba(255, 224, 130, 0.5)';
                e.target.style.boxShadow = '0 2px 8px rgba(255, 224, 130, 0.2)';
              }}
            >
              <FiCalendar size={18} />
              Отчет Удаленка
            </button>
          </div>

          {/* Кнопка отчета локальных ПК */}
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => {
                console.log('🔘 [WorkTimeMobile] Кнопка "Отчет активности локальных ПК" нажата');
                console.log('🔘 [WorkTimeMobile] showLocalReport до:', showLocalReport);
                setShowLocalReport(true);
                console.log('🔘 [WorkTimeMobile] setShowLocalReport(true) вызван');
                setTimeout(() => {
                  console.log('🔘 [WorkTimeMobile] showLocalReport после (через 100ms):', showLocalReport);
                }, 100);
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '2px solid rgba(67, 233, 123, 0.3)',
                background: 'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(67, 233, 123, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = '0 4px 12px rgba(67, 233, 123, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = '0 2px 8px rgba(67, 233, 123, 0.2)';
              }}
            >
              <FiMonitor size={18} />
              Отчет активности локальных ПК
            </button>
          </div>
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
        {detailsModal.open && console.log('🔍 [WorkTimeMobile] Рендер модалки деталей:', { isMobile, open: detailsModal.open, logsCount: detailsModal.logs?.length, username: detailsModal.username })}
        {isMobile ? (
          <UserWorkTimeDetailsMobile
            open={detailsModal.open}
            onClose={() => {
              console.log('🔴 [WorkTimeMobile] Закрываем модалку деталей');
              setDetailsModal({ 
                open: false, 
                logs: [], 
                username: '',
                realUsername: '',
                activityStats: null,
                urls: [],
                applications: [],
                screenshots: [],
                startDate: '',
                endDate: '',
              });
            }}
            logs={detailsModal.logs}
            username={detailsModal.username}
            realUsername={detailsModal.realUsername}
            activityStats={detailsModal.activityStats}
            urls={detailsModal.urls || []}
            applications={detailsModal.applications || []}
            screenshots={detailsModal.screenshots || []}
            startDate={detailsModal.startDate}
            endDate={detailsModal.endDate}
            onOpenMobileSidebar={() => {
              // Не открываем сайдбар, так как мы уже внутри модалки
            }}
          />
        ) : (
          <UserWorkTimeDetailsModal
            isOpen={detailsModal.open}
            onRequestClose={() => {
              console.log('🔴 [WorkTimeMobile] Закрываем модалку деталей (desktop)');
              setDetailsModal({ 
                open: false, 
                logs: [], 
                username: '',
                realUsername: '',
                activityStats: null,
                urls: [],
                applications: [],
                screenshots: [],
                startDate: '',
                endDate: '',
              });
            }}
            logs={detailsModal.logs}
            username={detailsModal.username}
            activityStats={detailsModal.activityStats}
            urls={detailsModal.urls || []}
            applications={detailsModal.applications || []}
            screenshots={detailsModal.screenshots || []}
            startDate={detailsModal.startDate}
            endDate={detailsModal.endDate}
          />
        )}
      </div>
    </div>,
    document.body
      )}
      {/* Модалки рендерятся вне портала WorkTimeMobile, чтобы они были поверх */}
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
      {console.log('🔍 [WorkTimeMobile] Рендер модалок RemoteWorktime, isMobile =', isMobile, 'showRemoteWorktime =', showRemoteWorktime)}
      {/* Рендерим обе версии модалок одновременно, чтобы гарантировать отображение */}
      <RemoteWorktimeReportMobile
        open={showRemoteWorktime}
        onClose={() => {
          console.log('🔴 [WorkTimeMobile] Закрываем RemoteWorktimeReportMobile');
          setShowRemoteWorktime(false);
        }}
        onOpenMobileSidebar={() => {
          // Не открываем сайдбар, так как мы уже внутри модалки
        }}
      />
      <RemoteWorktimeReportModal 
        isOpen={showRemoteWorktime} 
        onRequestClose={() => {
          console.log('🔴 [WorkTimeMobile] Закрываем RemoteWorktimeReportModal (desktop)');
          setShowRemoteWorktime(false);
        }} 
      />
      
      {/* Модалка локального отчета - рендерится вне основного портала */}
      {showLocalReport && (
        <LocalWorktimeReportModalMobile
          open={showLocalReport}
          onClose={() => {
            console.log('🔴 [WorkTimeMobile] Закрываем модалку локального отчета');
            setShowLocalReport(false);
            setLocalReportUsers([]);
            setLocalReportSearchTerm('');
          }}
          startDate={localReportStartDate}
          endDate={localReportEndDate}
          onStartDateChange={setLocalReportStartDate}
          onEndDateChange={setLocalReportEndDate}
          searchTerm={localReportSearchTerm}
          onSearchChange={handleLocalReportSearchChange}
          users={filteredLocalReportUsers}
          loading={loadingLocalReport}
          onUserClick={handleOpenLocalUserDetails}
          userOptions={localReportUserOptions}
          showAutocomplete={localReportShowAutocomplete}
          onSelectUser={(user) => {
            setLocalReportSearchTerm(user);
            setLocalReportShowAutocomplete(false);
          }}
          formatTime={formatTime}
          onFetchReport={fetchLocalReport}
        />
      )}
    </>
  );
}

// Модалка локального отчета - отдельный компонент
function LocalWorktimeReportModalMobile({ 
  open, 
  onClose, 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange,
  searchTerm,
  onSearchChange,
  users,
  loading,
  onUserClick,
  userOptions,
  showAutocomplete,
  onSelectUser,
  formatTime,
  onFetchReport
}) {
  const modalRef = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      onClose();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!open) {
    console.log('🚫 [LocalWorktimeReportModalMobile] Модалка закрыта, не рендерим');
    return null;
  }

  console.log('✅ [LocalWorktimeReportModalMobile] Рендерим модалку локального отчета');

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
        zIndex: 100003, // Выше основной модалки WorkTimeMobile (100002)
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
          <div
            ref={modalRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              color: '#fff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Заголовок */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'linear-gradient(90deg, #43e97b 0%, #38d9a9 100%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              zIndex: 10001,
            }}>
              <h2 style={{
                margin: 0,
                color: '#fff',
                fontSize: '18px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flex: 1,
                textAlign: 'center',
                justifyContent: 'center',
              }}>
                <FiMonitor size={18} />
                Отчет активности локальных ПК
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Закрыть"
              >
                <FiX />
              </button>
            </div>

            {/* Контент */}
            <div style={{ flex: 1, padding: '24px 16px', overflowY: 'auto', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
              {/* Календарь */}
              <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
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
                    onChange={e => onStartDateChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '2px solid rgba(255, 224, 130, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '15px',
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
                    onChange={e => onEndDateChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '2px solid rgba(255, 224, 130, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '15px',
                    }}
                  />
                </div>
              </div>

              {/* Поиск */}
              <div style={{ marginBottom: '20px', position: 'relative' }}>
                <label style={{
                  display: 'block',
                  color: '#ffe082',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '6px',
                }}>
                  Поиск по имени
                </label>
                <input
                  type="text"
                  placeholder="Введите имя..."
                  value={searchTerm}
                  onChange={onSearchChange}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 12px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255, 224, 130, 0.3)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '15px',
                  }}
                />
                <FiSearch
                  size={18}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '38px',
                    color: '#ffe082',
                    pointerEvents: 'none',
                  }}
                />
                {showAutocomplete && userOptions && userOptions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'rgba(35, 41, 49, 0.98)',
                    border: '2px solid rgba(255, 224, 130, 0.3)',
                    borderRadius: '12px',
                    zIndex: 100003,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '6px',
                  }}>
                    {userOptions.map((u, i) => (
                      <div
                        key={u + i}
                        onMouseDown={() => {
                          onSelectUser(u);
                        }}
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

              {/* Кнопка "Показать отчет" */}
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={() => {
                    console.log('🔘 [LocalWorktimeReportModalMobile] Кнопка "Показать отчет" нажата');
                    console.log('🔘 [LocalWorktimeReportModalMobile] startDate:', startDate, 'endDate:', endDate);
                    if (onFetchReport) {
                      onFetchReport();
                    }
                  }}
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: loading ? 0.6 : 1,
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
              </div>

              {/* Таблица */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#ffe082' }}>
                  Загрузка...
                </div>
              ) : !users || users.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  Нет данных за выбранный период
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {users.map((row, idx) => {
                    const displayName = row.fio && !row.fio.includes('?') && row.fio.trim() ? row.fio : (row.username || 'Неизвестный');
                    return (
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
                            {displayName}
                          </h3>
                          <button
                            type="button"
                            onClick={() => onUserClick(row)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '10px',
                              border: '2px solid rgba(33, 147, 176, 0.5)',
                              background: 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '14px',
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
                              {row.totalTimeStr || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      );
}

