import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiLogIn, FiLogOut, FiClock, FiGlobe, FiCamera, FiExternalLink, FiMonitor } from 'react-icons/fi';

function formatTime(dtStr) {
  if (!dtStr) return '';
  // Парсим время как локальное (формат YYYY-MM-DD HH:mm:ss без часового пояса)
  // Явно создаем Date объект с локальным временем, чтобы избежать проблем с UTC
  const match = dtStr.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [_, year, month, day, hour, minute, second] = match;
    // Создаем Date объект с локальным временем (месяцы в JS с 0, поэтому -1)
    const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    if (!isNaN(d.getTime())) {
      return `${d.toLocaleDateString('ru-RU')}, ${d.toLocaleTimeString('ru-RU')}`;
    }
  }
  // Fallback на стандартный парсинг
  const d = new Date(dtStr);
  if (isNaN(d.getTime())) {
    return dtStr; // Возвращаем оригинальную строку, если не удалось распарсить
  }
  return `${d.toLocaleDateString('ru-RU')}, ${d.toLocaleTimeString('ru-RU')}`;
}

export default function UserWorkTimeDetailsMobile({
  open,
  onClose,
  logs,
  username,
  realUsername, // Правильный username для API запросов (например, "Ksendzik_Oleg")
  activityStats,
  urls = [],
  applications = [],
  screenshots = [],
  startDate,
  endDate,
  onOpenMobileSidebar,
}) {
  // КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ В НАЧАЛЕ - сразу при получении props
  // ВЕРСИЯ 5.0 - ДОБАВЛЕН realUsername, УЛУЧШЕНА ОБРАБОТКА applications
  console.log('%c🚨🚨🚨 КОМПОНЕНТ UserWorkTimeDetailsMobile V5.0 - BUILD 2025-01-20 🚨🚨🚨', 'background: #ff0000; color: #ffffff; font-size: 18px; font-weight: bold; padding: 8px;');
  console.log('🚨🚨🚨 [UserWorkTimeDetailsMobile] ====== НАЧАЛО КОМПОНЕНТА V5.0 - BUILD 2025-01-20 ======');
  console.log('🚨🚨🚨 [UserWorkTimeDetailsMobile] ЕСЛИ ВЫ ВИДИТЕ ЭТОТ ЛОГ - НОВЫЙ КОД ЗАГРУЖЕН! 🚨🚨🚨');
  console.log('🚨 [UserWorkTimeDetailsMobile] Все props:', {
    open,
    username, // displayName для отображения
    realUsername, // правильный username для API (например, "Ksendzik_Oleg")
    urlsCount: urls?.length || 0,
    applicationsCount: applications?.length || 0,
    applications: applications,
    screenshotsCount: screenshots?.length || 0,
    hasActivityStats: !!activityStats,
    logsCount: logs?.length || 0,
  });
  console.log('🚨 [UserWorkTimeDetailsMobile] applications (полностью):', applications);
  console.log('🚨 [UserWorkTimeDetailsMobile] realUsername для API:', realUsername);
  console.log('🚨 [UserWorkTimeDetailsMobile] ====================================');

  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'urls', 'applications', 'screenshots'
  
  // Оптимизированное переключение вкладок
  const handleTabChange = useCallback((tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  }, [activeTab]);
  const [localUrls, setLocalUrls] = useState(urls);
  const [localApplications, setLocalApplications] = useState(applications || []);
  const [localScreenshots, setLocalScreenshots] = useState(screenshots);
  const [localActivityStats, setLocalActivityStats] = useState(activityStats);

  // УДАЛЕН ДУБЛИКАТ ЛОГИРОВАНИЯ V3.0 - используем только V4.0 выше
  
  useEffect(() => {
    console.log('🔍 [UserWorkTimeDetailsMobile] Props applications:', applications?.length || 0, applications);
    console.log('🔍 [UserWorkTimeDetailsMobile] localApplications:', localApplications?.length || 0, localApplications);
    console.log('🔍 [UserWorkTimeDetailsMobile] localUrls:', localUrls?.length || 0);
    console.log('🔍 [UserWorkTimeDetailsMobile] localScreenshots:', localScreenshots?.length || 0);
  }, [applications, localApplications, localUrls, localScreenshots]);

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

  // Обновляем локальное состояние при изменении props
  useEffect(() => {
    console.log('🔄 [UserWorkTimeDetailsMobile] Обновление локального состояния:', {
      urlsCount: urls?.length || 0,
      applicationsCount: applications?.length || 0,
      applications: applications,
      screenshotsCount: screenshots?.length || 0,
      hasActivityStats: !!activityStats,
      currentLocalApplicationsCount: localApplications?.length || 0
    });
    setLocalUrls(urls);
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Всегда используем applications из props, если они переданы
    // Если applications передан (даже пустой массив), значит данные были загружены - используем его
    if (applications !== undefined && applications !== null) {
      // applications явно передан в props (даже если пустой массив)
      console.log('✅ [UserWorkTimeDetailsMobile] Используем applications из props:', applications.length);
      if (applications.length > 0) {
        console.log('✅ [UserWorkTimeDetailsMobile] Первые 3 приложения:', applications.slice(0, 3).map(a => a.procName || a.name));
      }
      setLocalApplications(applications);
    } else if (activityStats && activityStats.topApps && activityStats.topApps.length > 0) {
      // Только если applications НЕ передан вообще (undefined), используем topApps для обратной совместимости
      console.log('⚠️ [UserWorkTimeDetailsMobile] applications не передан в props, используем topApps для обратной совместимости:', activityStats.topApps.length);
      const apps = activityStats.topApps.map(app => ({
        procName: app.name,
        windowTitle: app.name,
        timestamp: null,
        browserUrl: '',
      }));
      setLocalApplications(apps);
    } else {
      console.log('ℹ️ [UserWorkTimeDetailsMobile] Нет данных для applications, оставляем текущее состояние');
      // НЕ перезаписываем, если данных нет
    }
    setLocalScreenshots(screenshots);
    setLocalActivityStats(activityStats);
  }, [urls, applications, screenshots, activityStats]);

  // Функция для перезагрузки данных активности (мемоизация)
  const reloadActivityData = useCallback(async () => {
    // Используем realUsername для API запросов, если доступен, иначе username
    const apiUsername = realUsername || username;
    if (!apiUsername || !startDate || !endDate) {
      console.warn('⚠️ [UserWorkTimeDetailsMobile] reloadActivityData: недостаточно параметров', { apiUsername, startDate, endDate, realUsername, username });
      return;
    }
    
    console.log('🔄 [UserWorkTimeDetailsMobile] reloadActivityData вызывается с username:', apiUsername, 'realUsername:', realUsername);
    
    try {
      // Учитываем киевское время: данные в базе в UTC, но пользователь работает по киевскому времени
      // Расширяем диапазон на 1 день назад и вперёд, чтобы захватить все данные
      // которые попали в выбранный день по киевскому времени
      let apiStartDate = startDate;
      let apiEndDate = endDate;
      
      if (startDate && endDate) {
        // Расширяем диапазон для учёта разницы часовых поясов (Киев UTC+2/UTC+3)
        const startDateObj = new Date(startDate + 'T00:00:00');
        startDateObj.setDate(startDateObj.getDate() - 1);
        apiStartDate = startDateObj.toISOString().slice(0, 10);
        
        const endDateObj = new Date(endDate + 'T23:59:59');
        endDateObj.setDate(endDateObj.getDate() + 1);
        apiEndDate = endDateObj.toISOString().slice(0, 10);
        
        console.log('🌍 [UserWorkTimeDetailsMobile] Конвертация времени:');
        console.log('   Выбрано (киевское время):', startDate, '-', endDate);
        console.log('   Запрашиваем (UTC с запасом):', apiStartDate, '-', apiEndDate);
      }
      
      const params = new URLSearchParams({
        username: apiUsername, // Используем правильный username без split
        start: apiStartDate,
        end: apiEndDate,
      });
      const apiUrl = `/api/activity-details?${params.toString()}`;
      console.log('📡 [UserWorkTimeDetailsMobile] Запрос к API:', apiUrl);
      const res = await fetch(apiUrl);
      const data = await res.json();
      
      console.log('📡 [UserWorkTimeDetailsMobile] Ответ от API:', {
        status: res.status,
        success: data.success,
        urlsCount: data.urls?.length || 0,
        applicationsCount: data.applications?.length || 0,
        screenshotsCount: data.screenshots?.length || 0,
        applications: data.applications?.slice(0, 5),
        screenshots: data.screenshots?.slice(0, 3) // Показываем первые 3 скриншота для отладки
      });
      
      if (res.ok && data.success) {
        console.log('✅ [UserWorkTimeDetailsMobile] Данные получены от API:', {
          urlsCount: data.urls?.length || 0,
          applicationsCount: data.applications?.length || 0,
          applications: data.applications,
          screenshotsCount: data.screenshots?.length || 0,
          screenshots: data.screenshots
        });
        
        // Детальное логирование скриншотов
        if (data.screenshots && data.screenshots.length > 0) {
          console.log('📸 [UserWorkTimeDetailsMobile] Скриншоты из API:', data.screenshots.length);
          data.screenshots.forEach((shot, idx) => {
            console.log(`📸 [${idx}] Screenshot from API:`, {
              id: shot.id,
              url: shot.url,
              filePath: shot.filePath,
              timestamp: shot.timestamp,
              fileSize: shot.fileSize
            });
          });
        } else {
          console.warn('⚠️ [UserWorkTimeDetailsMobile] Скриншоты отсутствуют в ответе API');
        }
        
        if (data.urls) setLocalUrls(data.urls);
        if (data.applications) {
          console.log('✅ [UserWorkTimeDetailsMobile] Устанавливаем applications:', data.applications.length, data.applications.slice(0, 3));
          setLocalApplications(data.applications);
        } else {
          console.warn('⚠️ [UserWorkTimeDetailsMobile] applications отсутствуют в ответе API');
          setLocalApplications([]);
        }
        if (data.screenshots) {
          console.log('✅ [UserWorkTimeDetailsMobile] Устанавливаем screenshots:', data.screenshots.length);
          setLocalScreenshots(data.screenshots);
        } else {
          console.warn('⚠️ [UserWorkTimeDetailsMobile] screenshots отсутствуют в ответе API');
          setLocalScreenshots([]);
        }
        if (data.activityStats) setLocalActivityStats(data.activityStats);
      } else {
        console.error('❌ [UserWorkTimeDetailsMobile] Ошибка ответа API:', data);
      }
    } catch (err) {
      console.error('❌ [UserWorkTimeDetailsMobile] Error reloading activity data:', err);
    }
  }, [realUsername, username, startDate, endDate]);

  // WebSocket для обновления данных в реальном времени (используем общий socket)
  useEffect(() => {
    if (!open || !username || !startDate || !endDate) return;

    // Используем общий socket из SocketProvider вместо создания нового
    const socket = window.socket;
    if (!socket || !socket.connected) return;

    // Слушаем обновления данных активности
    const handleActivityUpdate = async (updateData) => {
      // Проверяем, относится ли обновление к текущему пользователю и дате
      const updateDate = updateData.date || (updateData.timestamp ? new Date(updateData.timestamp).toISOString().split('T')[0] : null);
      const usernameForMatch = username.split(' ')[0] || username;
      const matchesUser = updateData.username === username || updateData.username === usernameForMatch;
      const matchesDate = updateDate && updateDate >= startDate && updateDate <= endDate;
      
      if (matchesUser && matchesDate) {
        // Перезагружаем данные активности
        reloadActivityData();
      }
    };

    // Слушаем добавление новых скриншотов
    const handleScreenshotAdded = (screenshotData) => {
      // Проверяем, относится ли скриншот к текущему пользователю и дате
      const screenshotDate = screenshotData.date || (screenshotData.timestamp ? new Date(screenshotData.timestamp).toISOString().split('T')[0] : null);
      const usernameForMatch = username.split(' ')[0] || username;
      const matchesUser = screenshotData.username === username || screenshotData.username === usernameForMatch;
      const matchesDate = screenshotDate && screenshotDate >= startDate && screenshotDate <= endDate;
      
      if (matchesUser && matchesDate) {
        // Добавляем новый скриншот в список
        setLocalScreenshots(prev => {
          // Проверяем, нет ли уже такого скриншота
          const exists = prev.some(s => s.fileName === screenshotData.fileName || s.url === screenshotData.url);
          if (exists) return prev;
          
          return [...prev, {
            file_path: screenshotData.filePath,
            fileName: screenshotData.fileName,
            url: screenshotData.url,
            timestamp: screenshotData.timestamp,
            file_size: screenshotData.fileSize
          }].sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA; // Сортируем по убыванию (новые сверху)
          });
        });
      }
    };

    socket.on('activity_data_updated', handleActivityUpdate);
    socket.on('activity_screenshot_added', handleScreenshotAdded);

    return () => {
      if (socket) {
        socket.off('activity_data_updated', handleActivityUpdate);
        socket.off('activity_screenshot_added', handleScreenshotAdded);
      }
    };
  }, [open, username, startDate, endDate, reloadActivityData]);

  // Сортируем логи по времени (мемоизация для оптимизации)
  // ВАЖНО: хуки должны вызываться ДО условного возврата
  const sortedLogs = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    return [...logs].sort((a, b) => {
      const timeA = new Date(a.event_time || 0).getTime();
      const timeB = new Date(b.event_time || 0).getTime();
      return timeA - timeB;
    });
  }, [logs]);

  if (!open) {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 100003, // Должен быть выше WorkTimeMobile (100002)
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
            background: 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 20001,
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
            <FiClock size={18} />
            Подробности: {username}
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

        {/* Табы */}
        {(() => {
          console.log('📑 [UserWorkTimeDetailsMobile] Рендер секции табов, activeTab:', activeTab, 'localApplications count:', localApplications?.length || 0, 'localApplications:', localApplications);
          return (
        <div style={{
          position: 'sticky',
          top: '56px',
          background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
          zIndex: 20000,
          padding: '12px 16px 0',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={() => handleTabChange('events')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'events' 
                  ? 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              События
            </button>
            <button
              onClick={() => handleTabChange('urls')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'urls' 
                  ? 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <FiGlobe size={14} />
              Сайты ({localUrls?.length || 0})
            </button>
            <button
              onClick={() => {
                console.log('🖱️ [UserWorkTimeDetailsMobile] Клик по вкладке Приложения, localApplications:', localApplications?.length || 0, localApplications);
                handleTabChange('applications');
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'applications' 
                  ? 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                zIndex: 10,
                position: 'relative',
              }}
            >
              <FiMonitor size={14} />
              Приложения ({localApplications?.length || 0})
            </button>
            <button
              onClick={() => handleTabChange('screenshots')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'screenshots' 
                  ? 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <FiCamera size={14} />
              Скриншоты ({localScreenshots?.length || 0})
            </button>
          </div>
        </div>
          );
        })()}

        {/* Контент */}
        <div style={{ flex: 1, padding: '24px 16px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          {/* Таб: События */}
          {activeTab === 'events' && (
            <>
          {!sortedLogs || sortedLogs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '15px',
            }}>
              Нет данных о событиях
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedLogs.map((log, idx) => {
                const isLogin = log.event_type === 'login' || log.event_type === 'other';
                return (
                  <div
                    key={idx}
                    style={{
                      background: isLogin
                        ? 'rgba(67, 233, 123, 0.1)'
                        : 'rgba(231, 76, 60, 0.1)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: `2px solid ${isLogin ? 'rgba(67, 233, 123, 0.3)' : 'rgba(231, 76, 60, 0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: isLogin
                        ? 'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)'
                        : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '20px',
                      flexShrink: 0,
                    }}>
                      {isLogin ? <FiLogIn size={24} /> : <FiLogOut size={24} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: isLogin ? '#43e97b' : '#e74c3c',
                        fontSize: '15px',
                        fontWeight: 700,
                        marginBottom: '4px',
                      }}>
                        {isLogin ? 'Вход' : 'Выход'}
                      </div>
                      <div style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <FiClock size={14} />
                        {formatTime(log.event_time)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Статистика */}
          {sortedLogs && sortedLogs.length > 0 && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 224, 130, 0.3)',
            }}>
              <div style={{
                color: '#ffe082',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
              }}>
                Статистика
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Всего событий:</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{sortedLogs.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Входов:</span>
                  <span style={{ color: '#43e97b', fontWeight: 600 }}>
                    {sortedLogs.filter(l => l.event_type === 'login' || l.event_type === 'other').length}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Выходов:</span>
                  <span style={{ color: '#e74c3c', fontWeight: 600 }}>
                    {sortedLogs.filter(l => l.event_type === 'logout').length}
                  </span>
                </div>
                {activityStats && (
                  <>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Активность за период:</span>
                      <span style={{ color: '#43e97b', fontWeight: 600 }}>
                        {activityStats.totalActiveMinutes} мин активно / {activityStats.totalIdleMinutes} мин простоя
                      </span>
                    </div>
                    {activityStats.topApps && activityStats.topApps.length > 0 && (
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                        Топ приложений:{' '}
                        {activityStats.topApps
                          .map(app => `${app.name || 'unknown'} (${app.minutes} мин)`)
                          .join(', ')}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
            </>
          )}

          {/* Таб: Сайты */}
          {activeTab === 'urls' && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
            }}>
              {/* Краткая статистика */}
              {localActivityStats && (
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(33, 147, 176, 0.3)',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    color: '#2193b0',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '8px',
                  }}>
                    Активность за период
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                    {localActivityStats.totalActiveMinutes} мин активно / {localActivityStats.totalIdleMinutes} мин простоя
                  </div>
                </div>
              )}
              {!localUrls || localUrls.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '15px',
                }}>
                  Нет данных об открытых сайтах
                </div>
              ) : (
                <div style={{ 
                  maxHeight: 'calc(100vh - 300px)', 
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}>
                  {localUrls.map((item, idx) => (
                    <div
                      key={`url-${item.timestamp || idx}-${item.url?.substring(0, 20) || idx}`}
                      style={{
                        background: 'rgba(33, 147, 176, 0.1)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '2px solid rgba(33, 147, 176, 0.3)',
                        marginBottom: idx < localUrls.length - 1 ? '12px' : 0,
                      }}
                    >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px',
                    }}>
                      <FiGlobe size={20} color="#2193b0" />
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#43e97b',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: 600,
                          wordBreak: 'break-all',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        {item.url.length > 50 ? item.url.substring(0, 50) + '...' : item.url}
                        <FiExternalLink size={14} />
                      </a>
                    </div>
                    {item.windowTitle && (
                      <div style={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '13px',
                        marginBottom: '8px',
                      }}>
                        {item.windowTitle}
                      </div>
                    )}
                    <div style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <FiClock size={12} />
                      {formatTime(item.timestamp)}
                    </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Таб: Приложения */}
          {activeTab === 'applications' && (() => {
            console.log('📱 [UserWorkTimeDetailsMobile] Рендер вкладки Приложения, activeTab:', activeTab, 'localApplications:', localApplications?.length || 0);
            console.log('📱 [UserWorkTimeDetailsMobile] ВСЕ localApplications:', localApplications);
            if (localApplications && localApplications.length > 0) {
              console.log('📱 [UserWorkTimeDetailsMobile] Всего приложений для отображения:', localApplications.length);
              localApplications.forEach((app, idx) => {
                console.log(`  [${idx}] ${app.procName || 'NO procName'} - timestamp: ${app.timestamp || 'NO timestamp'}`);
                if (app.procName && (app.procName.toLowerCase().includes('telegram') || app.procName.toLowerCase().includes('viber'))) {
                  console.log(`  🔍 [${idx}] МЕССЕНДЖЕР ${app.procName}:`, {
                    procName: app.procName,
                    windowTitle: app.windowTitle,
                    hasWindowTitle: !!app.windowTitle,
                    windowTitleLength: app.windowTitle?.length || 0
                  });
                }
              });
            }
            return (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              position: 'relative',
              zIndex: 5,
            }}>
              {!localApplications || localApplications.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '15px',
                }}>
                  Нет данных об открытых приложениях
                </div>
              ) : (
                <div>
                  {/* Информация о количестве приложений */}
                  <div style={{
                    padding: '12px 16px',
                    background: 'rgba(67, 233, 123, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    border: '1px solid rgba(67, 233, 123, 0.3)',
                    textAlign: 'center',
                    color: '#43e97b',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}>
                    Всего приложений: {localApplications.length}
                    {localApplications.length > 3 && (
                      <div style={{ fontSize: '12px', marginTop: '4px', color: 'rgba(255, 255, 255, 0.7)' }}>
                        Прокрутите вниз, чтобы увидеть все
                      </div>
                    )}
                  </div>
                  <div style={{ 
                    maxHeight: 'calc(100vh - 350px)', 
                    overflowY: 'auto',
                    paddingRight: '4px',
                    WebkitOverflowScrolling: 'touch', // Плавная прокрутка на мобильных
                  }}>
                  {localApplications.map((app, idx) => {
                    // Уникальный ключ: используем комбинацию procName и индекса, чтобы избежать дубликатов
                    const uniqueKey = `app-${idx}-${app.procName || 'unknown'}-${app.timestamp || Date.now()}`;
                    return (
                    <div
                      key={uniqueKey}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '2px solid rgba(67, 233, 123, 0.3)',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{
                        color: '#43e97b',
                        fontSize: '16px',
                        fontWeight: 700,
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <FiMonitor size={18} />
                        {app.procName || 'Unknown'}
                      </div>
                      {app.windowTitle && (() => {
                        // Для мессенджеров (Telegram, Viber) всегда показываем windowTitle,
                        // так как он содержит информацию о группе/чате
                        const isMessenger = app.procName && (
                          app.procName.toLowerCase().includes('telegram') ||
                          app.procName.toLowerCase().includes('viber') ||
                          app.procName.toLowerCase().includes('whatsapp') ||
                          app.procName.toLowerCase().includes('discord') ||
                          app.procName.toLowerCase().includes('skype')
                        );
                        // Показываем windowTitle если он отличается от procName ИЛИ это мессенджер
                        const shouldShow = isMessenger || app.windowTitle !== app.procName;
                        
                        // Очищаем windowTitle от невидимых символов (left-to-right mark, right-to-left mark и т.д.)
                        const cleanWindowTitle = app.windowTitle
                          .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '') // Удаляем направляющие символы
                          .trim();
                        
                        // Логирование для отладки мессенджеров
                        if (isMessenger) {
                          console.log(`🔍 [UserWorkTimeDetailsMobile] Рендер мессенджера ${app.procName}:`, {
                            procName: app.procName,
                            windowTitle: app.windowTitle,
                            cleanWindowTitle: cleanWindowTitle,
                            shouldShow,
                            isMessenger
                          });
                        }
                        
                        if (shouldShow && cleanWindowTitle) {
                          if (isMessenger) {
                            console.log(`✅ [UserWorkTimeDetailsMobile] РЕНДЕРИМ windowTitle для ${app.procName}:`, cleanWindowTitle);
                          }
                          return (
                            <div style={{
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '14px',
                              marginBottom: '8px',
                              fontWeight: isMessenger ? 600 : 400,
                              display: 'block', // Явно указываем display
                              visibility: 'visible', // Явно указываем visibility
                              opacity: 1, // Явно указываем opacity
                            }}>
                              {cleanWindowTitle}
                            </div>
                          );
                        } else {
                          if (isMessenger) {
                            console.warn(`⚠️ [UserWorkTimeDetailsMobile] НЕ РЕНДЕРИМ windowTitle для ${app.procName}:`, {
                              shouldShow,
                              cleanWindowTitle,
                              hasCleanTitle: !!cleanWindowTitle
                            });
                          }
                          return null;
                        }
                      })()}
                      {app.timestamp && (
                        <div style={{
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          <FiClock size={12} />
                          {formatTime(app.timestamp)}
                        </div>
                      )}
                    </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          {/* Таб: Скриншоты */}
          {activeTab === 'screenshots' && (() => {
            console.log('📸 [UserWorkTimeDetailsMobile] Рендер вкладки Скриншоты');
            console.log('📸 [UserWorkTimeDetailsMobile] localScreenshots:', localScreenshots?.length || 0, localScreenshots);
            if (localScreenshots && localScreenshots.length > 0) {
              localScreenshots.forEach((shot, idx) => {
                console.log(`📸 [${idx}] Screenshot:`, {
                  id: shot.id,
                  url: shot.url,
                  filePath: shot.filePath,
                  timestamp: shot.timestamp,
                  fileSize: shot.fileSize
                });
              });
            }
            return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Краткая статистика */}
              {activityStats && (
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 224, 130, 0.3)',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    color: '#ffe082',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '8px',
                  }}>
                    Активность за период
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                    {activityStats.totalActiveMinutes} мин активно / {activityStats.totalIdleMinutes} мин простоя
                  </div>
                </div>
              )}
              {!localScreenshots || localScreenshots.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '15px',
                }}>
                  Нет скриншотов
                </div>
              ) : (
                localScreenshots.map((shot, idx) => {
                  // Формируем правильный URL - убеждаемся, что он начинается с /
                  const screenshotUrl = shot.url && shot.url.startsWith('/') 
                    ? shot.url 
                    : shot.url && shot.url.startsWith('http')
                    ? shot.url
                    : `/uploads/screenshots/${shot.filePath ? shot.filePath.split(/[\/\\]/).pop() : shot.url || `screenshot_${idx}.jpg`}`;
                  
                  console.log(`📸 [UserWorkTimeDetailsMobile] Рендер скриншота ${idx}:`, {
                    originalUrl: shot.url,
                    filePath: shot.filePath,
                    finalUrl: screenshotUrl
                  });
                  
                  return (
                  <div
                    key={shot.id || `screenshot-${idx}`}
                    style={{
                      background: 'rgba(255, 224, 130, 0.1)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '2px solid rgba(255, 224, 130, 0.3)',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '12px',
                    }}>
                      <FiCamera size={20} color="#ffe082" />
                      <div style={{
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <FiClock size={12} />
                        {formatTime(shot.timestamp)}
                      </div>
                      {shot.fileSize && (
                        <div style={{
                          marginLeft: 'auto',
                          color: 'rgba(255, 255, 255, 0.4)',
                          fontSize: '11px',
                        }}>
                          {(shot.fileSize / 1024 / 1024).toFixed(2)} MB
                        </div>
                      )}
                    </div>
                    <div style={{
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(0, 0, 0, 0.3)',
                    }}>
                      <img
                        src={screenshotUrl}
                        alt={`Скриншот ${idx + 1}`}
                        onLoad={() => {
                          console.log(`✅ [UserWorkTimeDetailsMobile] Скриншот ${idx} загружен успешно:`, screenshotUrl);
                        }}
                        onError={(e) => {
                          console.error('❌ [UserWorkTimeDetailsMobile] Ошибка загрузки скриншота:', {
                            idx,
                            url: screenshotUrl,
                            originalUrl: shot.url,
                            filePath: shot.filePath,
                            shot
                          });
                          e.target.style.display = 'none';
                          const errorDiv = document.createElement('div');
                          errorDiv.style.cssText = 'padding: 40px 20px; text-align: center; color: rgba(255, 100, 100, 0.8);';
                          errorDiv.innerHTML = `
                            Не удалось загрузить скриншот<br/>
                            <small style="font-size: 11px; color: rgba(255, 255, 255, 0.4);">URL: ${screenshotUrl}</small><br/>
                            <small style="font-size: 10px; color: rgba(255, 255, 255, 0.3);">Path: ${shot.filePath || 'N/A'}</small>
                          `;
                          e.target.parentElement.appendChild(errorDiv);
                        }}
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          // Открываем скриншот в новой вкладке в полном размере
                          window.open(screenshotUrl, '_blank');
                        }}
                      />
                    </div>
                  </div>
                  );
                })
              )}
            </div>
            );
          })()}
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
            zIndex: 20002,
          }}
        >
          ← Свайпните влево для возврата
        </div>
      </div>
    </div>,
    document.body
  );
}

