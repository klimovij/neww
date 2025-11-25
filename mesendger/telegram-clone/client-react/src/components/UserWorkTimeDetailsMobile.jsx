import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiLogIn, FiLogOut, FiClock, FiGlobe, FiCamera, FiExternalLink, FiMonitor } from 'react-icons/fi';

function formatTime(dtStr) {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  return `${d.toLocaleDateString('ru-RU')}, ${d.toLocaleTimeString('ru-RU')}`;
}

export default function UserWorkTimeDetailsMobile({
  open,
  onClose,
  logs,
  username,
  activityStats,
  urls = [],
  applications = [],
  screenshots = [],
  startDate,
  endDate,
  onOpenMobileSidebar,
}) {
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
  const [localApplications, setLocalApplications] = useState([]);
  const [localScreenshots, setLocalScreenshots] = useState(screenshots);
  const [localActivityStats, setLocalActivityStats] = useState(activityStats);

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
    setLocalUrls(urls);
    setLocalApplications(applications);
    setLocalScreenshots(screenshots);
    setLocalActivityStats(activityStats);
  }, [urls, applications, screenshots, activityStats]);
  
  // Инициализируем приложения если они переданы в props (для обратной совместимости)
  useEffect(() => {
    if (activityStats && activityStats.topApps) {
      // Конвертируем topApps в формат приложений
      const apps = activityStats.topApps.map(app => ({
        procName: app.name,
        windowTitle: app.name,
        timestamp: null,
        browserUrl: '',
      }));
      setLocalApplications(apps);
    }
  }, [activityStats]);

  // Функция для перезагрузки данных активности (мемоизация)
  const reloadActivityData = useCallback(async () => {
    if (!username || !startDate || !endDate) return;
    
    try {
      const params = new URLSearchParams({
        username: username.split(' ')[0] || username,
        start: startDate,
        end: endDate,
      });
      const res = await fetch(`/api/activity-details?${params.toString()}`);
      const data = await res.json();
      
      if (res.ok && data.success) {
        if (data.urls) setLocalUrls(data.urls);
        if (data.applications) setLocalApplications(data.applications);
        if (data.screenshots) setLocalScreenshots(data.screenshots);
        if (data.activityStats) setLocalActivityStats(data.activityStats);
      }
    } catch (err) {
      console.error('❌ [UserWorkTimeDetailsMobile] Error reloading activity data:', err);
    }
  }, [username, startDate, endDate]);

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

  if (!open) {
    return null;
  }

  // Сортируем логи по времени (мемоизация для оптимизации)
  const sortedLogs = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    return [...logs].sort((a, b) => {
      const timeA = new Date(a.event_time || 0).getTime();
      const timeB = new Date(b.event_time || 0).getTime();
      return timeA - timeB;
    });
  }, [logs]);

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
              onClick={() => handleTabChange('applications')}
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
          {activeTab === 'applications' && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
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
                <div style={{ 
                  maxHeight: 'calc(100vh - 300px)', 
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}>
                  {localApplications.map((app, idx) => (
                    <div
                      key={`app-${app.timestamp || idx}-${app.procName || idx}`}
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
                      {app.windowTitle && app.windowTitle !== app.procName && (
                        <div style={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '14px',
                          marginBottom: '8px',
                        }}>
                          {app.windowTitle}
                        </div>
                      )}
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
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Таб: Скриншоты */}
          {activeTab === 'screenshots' && (
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
                localScreenshots.map((shot, idx) => (
                  <div
                    key={idx}
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
                      <div style={{
                        marginLeft: 'auto',
                        color: 'rgba(255, 255, 255, 0.4)',
                        fontSize: '11px',
                      }}>
                        {(shot.fileSize / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <div style={{
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(0, 0, 0, 0.3)',
                    }}>
                      <img
                        src={shot.url}
                        alt={`Скриншот ${idx + 1}`}
                        onError={(e) => {
                          console.error('Failed to load screenshot:', shot.url, shot);
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `
                            <div style="padding: 40px 20px; text-align: center; color: rgba(255, 100, 100, 0.8);">
                              Не удалось загрузить скриншот<br/>
                              <small style="font-size: 11px; color: rgba(255, 255, 255, 0.4);">URL: ${shot.url}</small>
                            </div>
                          `;
                        }}
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          // Открываем скриншот в новой вкладке в полном размере
                          window.open(shot.url, '_blank');
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div style="padding: 40px; text-align: center; color: rgba(255,255,255,0.5);">Не удалось загрузить скриншот</div>';
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
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

