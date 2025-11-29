import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiLogIn, FiLogOut, FiClock, FiGlobe, FiCamera, FiExternalLink, FiMonitor, FiPrinter, FiDownload } from 'react-icons/fi';

function formatTime(dtStr) {
  if (!dtStr) return '';
  
  // Исправляем невалидный формат timestamp (например, '2025-11-28T18:52:24:.027Z' -> '2025-11-28T18:52:24.027Z')
  let fixedStr = dtStr;
  if (typeof fixedStr === 'string') {
    fixedStr = fixedStr.replace(/T(\d{2}):(\d{2}):(\d{2}):\.(\d+)/, 'T$1:$2:$3.$4');
  }
  
  // Парсим timestamp
  let d = new Date(fixedStr);
  
  if (isNaN(d.getTime())) {
    return dtStr; // Возвращаем оригинальную строку, если не удалось распарсить
  }
  
  // Конвертируем UTC в киевское время используя Intl.DateTimeFormat с timeZone
  // Это автоматически учитывает летнее/зимнее время
  try {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Kiev',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(d);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';
    const hour = parts.find(p => p.type === 'hour')?.value || '';
    const minute = parts.find(p => p.type === 'minute')?.value || '';
    const second = parts.find(p => p.type === 'second')?.value || '';
    
    return `${day}.${month}.${year}, ${hour}:${minute}:${second}`;
  } catch (e) {
    // Fallback: добавляем 3 часа вручную (зимнее время UTC+3)
    const kievOffset = 3 * 60 * 60 * 1000; // 3 часа в миллисекундах
    const kievTime = new Date(d.getTime() + kievOffset);
    
    const dateStr = kievTime.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const timeStr = kievTime.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    return `${dateStr}, ${timeStr}`;
  }
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
    screenshots: screenshots, // Добавляем полный массив для отладки
    hasActivityStats: !!activityStats,
    logsCount: logs?.length || 0,
    startDate,
    endDate
  });
  console.log('🚨 [UserWorkTimeDetailsMobile] applications (полностью):', applications);
  console.log('🚨 [UserWorkTimeDetailsMobile] screenshots (полностью):', screenshots);
  console.log('🚨 [UserWorkTimeDetailsMobile] realUsername для API:', realUsername);
  console.log('🚨 [UserWorkTimeDetailsMobile] ====================================');

  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'urls', 'applications', 'screenshots'
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    screenshots: true,
    urls: true,
    applications: true,
    events: true
  });
  
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
    if (screenshots !== undefined && screenshots !== null) {
      console.log('✅ [UserWorkTimeDetailsMobile] Устанавливаем screenshots из props:', screenshots.length);
      if (screenshots.length > 0) {
        console.log('📸 [UserWorkTimeDetailsMobile] Первые 3 скриншота из props:', screenshots.slice(0, 3).map(s => ({
          id: s.id,
          url: s.url,
          filePath: s.filePath,
          timestamp: s.timestamp
        })));
      }
      setLocalScreenshots(screenshots);
    } else {
      console.log('ℹ️ [UserWorkTimeDetailsMobile] screenshots не передан в props, оставляем текущее состояние');
    }
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
            if (idx < 3) { // Логируем только первые 3 для краткости
              console.log(`📸 [${idx}] Screenshot from API:`, {
                id: shot.id,
                url: shot.url,
                filePath: shot.filePath,
                timestamp: shot.timestamp,
                fileSize: shot.fileSize
              });
            }
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
          console.log('✅ [UserWorkTimeDetailsMobile] Устанавливаем screenshots через reloadActivityData:', data.screenshots.length);
          console.log('📸 [UserWorkTimeDetailsMobile] Первые 3 скриншота перед установкой:', data.screenshots.slice(0, 3).map(s => ({ id: s.id, url: s.url })));
          setLocalScreenshots(data.screenshots);
          // Проверяем, что state обновился
          setTimeout(() => {
            console.log('📸 [UserWorkTimeDetailsMobile] Проверка state после установки screenshots (через 100ms)');
          }, 100);
        } else {
          console.warn('⚠️ [UserWorkTimeDetailsMobile] screenshots отсутствуют в ответе API, устанавливаем пустой массив');
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
    if (!open || !realUsername || !startDate || !endDate) return;

    // Используем общий socket из SocketProvider вместо создания нового
    const socket = window.socket;
    if (!socket || !socket.connected) {
      console.log('⚠️ [UserWorkTimeDetailsMobile] Socket не подключен, пропускаем WebSocket обновления');
      return;
    }

    console.log('🔌 [UserWorkTimeDetailsMobile] Настраиваем WebSocket обновления для:', realUsername, startDate, endDate);

    // Слушаем обновления данных активности (общее обновление - перезагружаем все данные)
    const handleActivityUpdate = async (updateData) => {
      console.log('🔄 [UserWorkTimeDetailsMobile] Получено обновление активности:', updateData);
      // Проверяем, относится ли обновление к текущему пользователю и дате
      const updateDate = updateData.date || (updateData.timestamp ? new Date(updateData.timestamp).toISOString().split('T')[0] : null);
      const apiUsername = realUsername || username;
      const matchesUser = updateData.username === apiUsername || updateData.username === username;
      const matchesDate = updateDate && updateDate >= startDate && updateDate <= endDate;
      
      console.log('🔍 [UserWorkTimeDetailsMobile] Проверка совпадения:', {
        matchesUser,
        matchesDate,
        updateUsername: updateData.username,
        currentUsername: apiUsername,
        updateDate,
        dateRange: `${startDate} - ${endDate}`
      });
      
      if (matchesUser && matchesDate) {
        console.log('✅ [UserWorkTimeDetailsMobile] Обновление соответствует критериям, перезагружаем данные');
        // Перезагружаем данные активности
        reloadActivityData();
      }
    };

    // Слушаем добавление новых скриншотов
    const handleScreenshotAdded = (screenshotData) => {
      console.log('📸 [UserWorkTimeDetailsMobile] Получено событие добавления скриншота:', screenshotData);
      // Проверяем, относится ли скриншот к текущему пользователю и дате
      const screenshotDate = screenshotData.date || (screenshotData.timestamp ? new Date(screenshotData.timestamp).toISOString().split('T')[0] : null);
      const apiUsername = realUsername || username;
      // Упрощаем проверку username - сравниваем без учета регистра и пробелов
      const screenshotUser = (screenshotData.username || '').trim();
      const currentUser = (apiUsername || '').trim();
      const displayUser = (username || '').trim();
      const matchesUser = screenshotUser === currentUser || screenshotUser === displayUser || 
                         screenshotUser.toLowerCase() === currentUser.toLowerCase() ||
                         screenshotUser.toLowerCase() === displayUser.toLowerCase();
      const matchesDate = screenshotDate && screenshotDate >= startDate && screenshotDate <= endDate;
      
      console.log('🔍 [UserWorkTimeDetailsMobile] Проверка скриншота:', {
        matchesUser,
        matchesDate,
        screenshotUsername: screenshotUser,
        currentUsername: currentUser,
        displayUsername: displayUser,
        screenshotDate,
        dateRange: `${startDate} - ${endDate}`
      });
      
      if (matchesUser && matchesDate) {
        console.log('✅ [UserWorkTimeDetailsMobile] Скриншот соответствует критериям, добавляем в список');
        // Добавляем новый скриншот в список
        setLocalScreenshots(prev => {
          const fileName = screenshotData.fileName || screenshotData.file_name;
          const filePath = screenshotData.filePath || screenshotData.file_path;
          const url = screenshotData.url || (fileName ? `/uploads/screenshots/${fileName}` : null);
          
          // Проверяем, нет ли уже такого скриншота
          const exists = prev.some(s => 
            s.id === screenshotData.id || 
            (s.fileName && fileName && s.fileName === fileName) ||
            (s.file_name && fileName && s.file_name === fileName) ||
            (s.url && url && s.url === url) ||
            (s.file_path && filePath && s.file_path === filePath)
          );
          if (exists) {
            console.log('⚠️ [UserWorkTimeDetailsMobile] Скриншот уже существует, пропускаем');
            return prev;
          }
          
          console.log('✅ [UserWorkTimeDetailsMobile] Добавляем новый скриншот в список');
          return [...prev, {
            id: screenshotData.id,
            file_path: filePath,
            fileName: fileName,
            url: url,
            timestamp: screenshotData.timestamp,
            file_size: screenshotData.fileSize || screenshotData.file_size
          }].sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA; // Сортируем по убыванию (новые сверху)
          });
        });
      } else {
        console.log('❌ [UserWorkTimeDetailsMobile] Скриншот НЕ соответствует критериям');
      }
    };

    // Слушаем добавление новых URL
    const handleUrlAdded = (urlData) => {
      console.log('🌐 [UserWorkTimeDetailsMobile] Получено событие добавления URL:', urlData);
      const urlDate = urlData.date || (urlData.timestamp ? new Date(urlData.timestamp).toISOString().split('T')[0] : null);
      const apiUsername = realUsername || username;
      const urlUser = (urlData.username || '').trim();
      const currentUser = (apiUsername || '').trim();
      const displayUser = (username || '').trim();
      const matchesUser = urlUser === currentUser || urlUser === displayUser || 
                         urlUser.toLowerCase() === currentUser.toLowerCase() ||
                         urlUser.toLowerCase() === displayUser.toLowerCase();
      const matchesDate = urlDate && urlDate >= startDate && urlDate <= endDate;
      
      console.log('🔍 [UserWorkTimeDetailsMobile] Проверка URL:', {
        matchesUser,
        matchesDate,
        urlUsername: urlUser,
        currentUsername: currentUser
      });
      
      if (matchesUser && matchesDate) {
        console.log('✅ [UserWorkTimeDetailsMobile] URL соответствует критериям, добавляем в список');
        setLocalUrls(prev => {
          const exists = prev.some(u => u.id === urlData.id || (u.url === urlData.url && u.timestamp === urlData.timestamp));
          if (exists) {
            console.log('⚠️ [UserWorkTimeDetailsMobile] URL уже существует, пропускаем');
            return prev;
          }
          return [...prev, {
            id: urlData.id,
            url: urlData.url,
            timestamp: urlData.timestamp,
            windowTitle: urlData.windowTitle
          }].sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
          });
        });
      }
    };

    // Слушаем добавление новых приложений
    const handleApplicationAdded = (appData) => {
      console.log('💻 [UserWorkTimeDetailsMobile] Получено событие добавления приложения:', appData);
      const appDate = appData.date || (appData.timestamp ? new Date(appData.timestamp).toISOString().split('T')[0] : null);
      const apiUsername = realUsername || username;
      const appUser = (appData.username || '').trim();
      const currentUser = (apiUsername || '').trim();
      const displayUser = (username || '').trim();
      const matchesUser = appUser === currentUser || appUser === displayUser || 
                         appUser.toLowerCase() === currentUser.toLowerCase() ||
                         appUser.toLowerCase() === displayUser.toLowerCase();
      const matchesDate = appDate && appDate >= startDate && appDate <= endDate;
      
      console.log('🔍 [UserWorkTimeDetailsMobile] Проверка приложения:', {
        matchesUser,
        matchesDate,
        appUsername: appUser,
        currentUsername: currentUser
      });
      
      if (matchesUser && matchesDate) {
        console.log('✅ [UserWorkTimeDetailsMobile] Приложение соответствует критериям, добавляем в список');
        setLocalApplications(prev => {
          const exists = prev.some(a => a.id === appData.id || (a.procName === appData.procName && a.timestamp === appData.timestamp));
          if (exists) {
            console.log('⚠️ [UserWorkTimeDetailsMobile] Приложение уже существует, пропускаем');
            return prev;
          }
          return [...prev, {
            id: appData.id,
            procName: appData.procName,
            windowTitle: appData.windowTitle,
            timestamp: appData.timestamp
          }].sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
          });
        });
      }
    };

    socket.on('activity_data_updated', handleActivityUpdate);
    socket.on('activity_screenshot_added', handleScreenshotAdded);
    socket.on('activity_url_added', handleUrlAdded);
    socket.on('activity_application_added', handleApplicationAdded);

    return () => {
      if (socket) {
        socket.off('activity_data_updated', handleActivityUpdate);
        socket.off('activity_screenshot_added', handleScreenshotAdded);
        socket.off('activity_url_added', handleUrlAdded);
        socket.off('activity_application_added', handleApplicationAdded);
        console.log('🔌 [UserWorkTimeDetailsMobile] WebSocket обработчики отключены');
      }
    };
  }, [open, realUsername, username, startDate, endDate, reloadActivityData]);

  // Загружаем данные активности при открытии модалки
  useEffect(() => {
    if (open && realUsername && startDate && endDate) {
      console.log('🔄 [UserWorkTimeDetailsMobile] Модалка открыта, загружаем данные активности для:', realUsername, startDate, endDate);
      console.log('🔄 [UserWorkTimeDetailsMobile] Текущее состояние localScreenshots перед загрузкой:', localScreenshots?.length || 0);
      console.log('🔄 [UserWorkTimeDetailsMobile] Скриншоты из props:', screenshots?.length || 0);
      // Если скриншоты уже есть в props, используем их, иначе загружаем через API
      if (screenshots && screenshots.length > 0) {
        console.log('✅ [UserWorkTimeDetailsMobile] Используем скриншоты из props:', screenshots.length);
        setLocalScreenshots(screenshots);
      } else {
        console.log('🔄 [UserWorkTimeDetailsMobile] Скриншотов нет в props, загружаем через API');
        reloadActivityData();
      }
    } else {
      console.log('⚠️ [UserWorkTimeDetailsMobile] Не загружаем данные - недостаточно параметров:', {
        open,
        realUsername,
        startDate,
        endDate
      });
    }
  }, [open, realUsername, startDate, endDate, reloadActivityData, screenshots]);

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

  // Сортируем скриншоты по времени (от новых к старым, как приложения и сайты)
  const sortedScreenshots = useMemo(() => {
    if (!localScreenshots || localScreenshots.length === 0) return [];
    return [...localScreenshots].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA; // От новых к старым
    });
  }, [localScreenshots]);

  // Функция для скачивания скриншота
  const handleDownloadScreenshot = useCallback((screenshotUrl, timestamp) => {
    const dateStr = timestamp ? formatTime(timestamp).replace(/[^\w\s]/gi, '_') : 'screenshot';
    const fullUrl = screenshotUrl.startsWith('http') ? screenshotUrl : `${window.location.origin}${screenshotUrl}`;
    
    // Создаем временную ссылку для скачивания
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = `screenshot_${dateStr}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Функция для печати отдельного скриншота
  const handlePrintScreenshot = useCallback((screenshotUrl, timestamp) => {
    const dateStr = timestamp ? formatTime(timestamp) : 'Неизвестная дата';
    const fullUrl = screenshotUrl.startsWith('http') ? screenshotUrl : `${window.location.origin}${screenshotUrl}`;
    
    // Определяем, мобильное ли устройство
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Для всех устройств создаем страницу с кнопками управления
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Пожалуйста, разрешите всплывающие окна для печати');
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Скриншот - ${dateStr}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @media print {
              body { margin: 0; padding: 10px; }
              .header { margin-bottom: 15px; text-align: center; }
              .screenshot { max-width: 100%; height: auto; page-break-inside: avoid; }
              .controls { display: none !important; }
            }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              margin: 0;
              background: #fff;
            }
            .header { 
              margin-bottom: 20px; 
              text-align: center; 
              border-bottom: 2px solid #333; 
              padding-bottom: 10px; 
            }
            .screenshot { 
              max-width: 100%; 
              height: auto; 
              border: 1px solid #ddd; 
              display: block;
              margin: 20px auto;
            }
            .timestamp { 
              text-align: center; 
              margin-top: 10px; 
              color: #666; 
              font-size: 12px;
            }
            .loading {
              text-align: center;
              padding: 40px;
              color: #666;
            }
            .controls {
              text-align: center;
              margin: 20px 0;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 8px;
            }
            .controls button {
              padding: 12px 24px;
              margin: 5px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.2s;
            }
            .btn-print {
              background: #2193b0;
              color: white;
            }
            .btn-print:hover {
              background: #1a7a91;
            }
            .btn-download {
              background: #43e97b;
              color: white;
            }
            .btn-download:hover {
              background: #35c765;
            }
            .btn-close {
              background: #e74c3c;
              color: white;
            }
            .btn-close:hover {
              background: #c0392b;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 18px;">Скриншот активности</h1>
            <p style="margin: 5px 0; font-size: 14px;">Пользователь: ${username}</p>
            <p style="margin: 5px 0; font-size: 12px;">Дата и время: ${dateStr}</p>
          </div>
          
          <div class="controls">
            <button class="btn-print" onclick="window.print();">🖨️ Печать / Сохранить в PDF</button>
            <button class="btn-download" onclick="downloadImage();">💾 Скачать изображение</button>
            <button class="btn-close" onclick="window.close();">✕ Закрыть</button>
          </div>
          
          <div class="loading" id="loading">Загрузка изображения...</div>
          <img 
            id="screenshot-img"
            src="${fullUrl}" 
            alt="Скриншот" 
            class="screenshot" 
            style="display: none;"
            onload="
              document.getElementById('loading').style.display = 'none';
              this.style.display = 'block';
            "
            onerror="
              document.getElementById('loading').innerHTML = 'Ошибка загрузки изображения.<br/>Попробуйте открыть изображение напрямую.';
              document.getElementById('loading').style.color = '#e74c3c';
            "
          />
          <div class="timestamp">${dateStr}</div>
          
          <script>
            function downloadImage() {
              const img = document.getElementById('screenshot-img');
              const link = document.createElement('a');
              link.href = img.src;
              link.download = 'screenshot_${dateStr.replace(/[^\\w\\s]/gi, '_')}.jpg';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [username]);

  // Функция для печати полного отчета
  const handlePrintReport = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Пожалуйста, разрешите всплывающие окна для печати');
      return;
    }
    
    const dateRange = `${startDate} - ${endDate}`;
    let reportContent = '';
    
    // Заголовок
    reportContent += `
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 20px;">
        <h1 style="margin: 0; color: #333;">Отчет активности</h1>
        <p style="margin: 10px 0; color: #666; font-size: 16px;">Пользователь: ${username}</p>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">Период: ${dateRange}</p>
        <p style="margin: 5px 0; color: #666; font-size: 12px;">Дата формирования: ${new Date().toLocaleString('ru-RU')}</p>
      </div>
    `;
    
    // События (входы/выходы)
    if (printOptions.events && sortedLogs && sortedLogs.length > 0) {
      reportContent += `
        <div style="page-break-inside: avoid; margin-bottom: 30px;">
          <h2 style="color: #333; border-bottom: 2px solid #43e97b; padding-bottom: 10px;">События (${sortedLogs.length})</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Дата и время</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Тип события</th>
              </tr>
            </thead>
            <tbody>
      `;
      sortedLogs.forEach(log => {
        const eventType = log.event_type === 'login' ? 'Вход' : log.event_type === 'logout' ? 'Выход' : 'Другое';
        const eventColor = log.event_type === 'login' ? '#43e97b' : log.event_type === 'logout' ? '#e74c3c' : '#666';
        reportContent += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatTime(log.event_time)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; color: ${eventColor}; font-weight: 600;">${eventType}</td>
          </tr>
        `;
      });
      reportContent += `</tbody></table></div>`;
    }
    
    // Приложения
    if (printOptions.applications && localApplications && localApplications.length > 0) {
      reportContent += `
        <div style="page-break-inside: avoid; margin-bottom: 30px;">
          <h2 style="color: #333; border-bottom: 2px solid #43e97b; padding-bottom: 10px;">Приложения (${localApplications.length})</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Приложение</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Окно</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Время</th>
              </tr>
            </thead>
            <tbody>
      `;
      localApplications.slice(0, 100).forEach(app => {
        reportContent += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: 600;">${app.procName || 'Неизвестно'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${(app.windowTitle || '').substring(0, 50)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${app.timestamp ? formatTime(app.timestamp) : '-'}</td>
          </tr>
        `;
      });
      if (localApplications.length > 100) {
        reportContent += `
          <tr>
            <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #666;">
              ... и еще ${localApplications.length - 100} приложений
            </td>
          </tr>
        `;
      }
      reportContent += `</tbody></table></div>`;
    }
    
    // Сайты
    if (printOptions.urls && localUrls && localUrls.length > 0) {
      reportContent += `
        <div style="page-break-inside: avoid; margin-bottom: 30px;">
          <h2 style="color: #333; border-bottom: 2px solid #2193b0; padding-bottom: 10px;">Сайты (${localUrls.length})</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">URL</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Время</th>
              </tr>
            </thead>
            <tbody>
      `;
      localUrls.slice(0, 100).forEach(url => {
        reportContent += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; word-break: break-all;">${url.url || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${url.timestamp ? formatTime(url.timestamp) : '-'}</td>
          </tr>
        `;
      });
      if (localUrls.length > 100) {
        reportContent += `
          <tr>
            <td colspan="2" style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #666;">
              ... и еще ${localUrls.length - 100} сайтов
            </td>
          </tr>
        `;
      }
      reportContent += `</tbody></table></div>`;
    }
    
    // Скриншоты
    if (printOptions.screenshots && sortedScreenshots && sortedScreenshots.length > 0) {
      reportContent += `
        <div style="page-break-inside: avoid; margin-bottom: 30px;">
          <h2 style="color: #333; border-bottom: 2px solid #ffe082; padding-bottom: 10px;">Скриншоты (${sortedScreenshots.length})</h2>
      `;
      sortedScreenshots.forEach((shot, idx) => {
        const screenshotUrl = shot.url && shot.url.startsWith('/') 
          ? shot.url 
          : shot.url && shot.url.startsWith('http')
          ? shot.url
          : `/uploads/screenshots/${shot.filePath ? shot.filePath.split(/[\/\\]/).pop() : shot.url || `screenshot_${idx}.jpg`}`;
        const fullUrl = screenshotUrl.startsWith('http') ? screenshotUrl : `${window.location.origin}${screenshotUrl}`;
        
        reportContent += `
          <div style="page-break-inside: avoid; margin-bottom: 20px; border: 1px solid #ddd; padding: 15px;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">Скриншот ${idx + 1} - ${formatTime(shot.timestamp)}</p>
            <img src="${fullUrl}" alt="Скриншот ${idx + 1}" style="max-width: 100%; height: auto; border: 1px solid #ddd;" />
          </div>
        `;
      });
      reportContent += `</div>`;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Отчет активности - ${username}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              .page-break { page-break-before: always; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1, h2 { color: #333; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
            th { background: #f5f5f5; font-weight: 600; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          ${reportContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // Ждем загрузки изображений перед печатью
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }, [username, startDate, endDate, sortedLogs, localApplications, localUrls, sortedScreenshots, printOptions]);

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
            onClick={() => setShowPrintDialog(true)}
            style={{
              background: 'rgba(255, 224, 130, 0.2)',
              border: '1px solid rgba(255, 224, 130, 0.5)',
              color: '#ffe082',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 600,
              marginRight: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 224, 130, 0.3)';
              e.target.style.borderColor = '#ffe082';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 224, 130, 0.2)';
              e.target.style.borderColor = 'rgba(255, 224, 130, 0.5)';
            }}
            title="Печать отчета"
          >
            <FiPrinter size={16} />
            Печать
          </button>

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
                padding: '10px 8px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'events' 
                  ? 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
              title="События"
            >
              <FiClock size={18} />
              <span style={{ fontSize: '11px', fontWeight: 700 }}>{sortedLogs?.length || 0}</span>
            </button>
            <button
              onClick={() => handleTabChange('urls')}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'urls' 
                  ? 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
              title="Сайты"
            >
              <FiGlobe size={18} />
              <span style={{ fontSize: '11px', fontWeight: 700 }}>{localUrls?.length || 0}</span>
            </button>
            <button
              onClick={() => {
                console.log('🖱️ [UserWorkTimeDetailsMobile] Клик по вкладке Приложения, localApplications:', localApplications?.length || 0, localApplications);
                handleTabChange('applications');
              }}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'applications' 
                  ? 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                zIndex: 10,
                position: 'relative',
              }}
              title="Приложения"
            >
              <FiMonitor size={18} />
              <span style={{ fontSize: '11px', fontWeight: 700 }}>{localApplications?.length || 0}</span>
            </button>
            <button
              onClick={() => handleTabChange('screenshots')}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'screenshots' 
                  ? 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
              title="Скрины"
            >
              <FiCamera size={18} />
              <span style={{ fontSize: '11px', fontWeight: 700 }}>{localScreenshots?.length || 0}</span>
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
                sortedScreenshots.map((shot, idx) => {
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
                          color: 'rgba(255, 255, 255, 0.4)',
                          fontSize: '11px',
                        }}>
                          {(shot.fileSize / 1024 / 1024).toFixed(2)} MB
                        </div>
                      )}
                      <div style={{
                        marginLeft: 'auto',
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center',
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadScreenshot(screenshotUrl, shot.timestamp);
                          }}
                          style={{
                            background: 'rgba(67, 233, 123, 0.2)',
                            border: '1px solid rgba(67, 233, 123, 0.5)',
                            color: '#43e97b',
                            fontSize: '12px',
                            cursor: 'pointer',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(67, 233, 123, 0.3)';
                            e.target.style.borderColor = '#43e97b';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(67, 233, 123, 0.2)';
                            e.target.style.borderColor = 'rgba(67, 233, 123, 0.5)';
                          }}
                          title="Скачать скриншот"
                        >
                          <FiDownload size={14} />
                          Скачать
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintScreenshot(screenshotUrl, shot.timestamp);
                          }}
                          style={{
                            background: 'rgba(255, 224, 130, 0.2)',
                            border: '1px solid rgba(255, 224, 130, 0.5)',
                            color: '#ffe082',
                            fontSize: '12px',
                            cursor: 'pointer',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 224, 130, 0.3)';
                            e.target.style.borderColor = '#ffe082';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255, 224, 130, 0.2)';
                            e.target.style.borderColor = 'rgba(255, 224, 130, 0.5)';
                          }}
                          title="Печать / Сохранить в PDF"
                        >
                          <FiPrinter size={14} />
                          Печать
                        </button>
                      </div>
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

      {/* Диалог выбора элементов для печати */}
      {showPrintDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          zIndex: 100002,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }} onClick={() => setShowPrintDialog(false)}>
          <div style={{
            background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            border: '2px solid rgba(255, 224, 130, 0.3)',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{
              color: '#ffe082',
              margin: '0 0 20px 0',
              fontSize: '18px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <FiPrinter size={20} />
              Печать отчета
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '15px' }}>
                Выберите элементы для печати:
              </p>
              
              {[
                { key: 'events', label: 'События (входы/выходы)', count: sortedLogs?.length || 0 },
                { key: 'applications', label: 'Приложения', count: localApplications?.length || 0 },
                { key: 'urls', label: 'Сайты', count: localUrls?.length || 0 },
                { key: 'screenshots', label: 'Скриншоты', count: sortedScreenshots?.length || 0 },
              ].map(option => (
                <label key={option.key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  cursor: 'pointer',
                  border: printOptions[option.key] ? '2px solid rgba(255, 224, 130, 0.5)' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}>
                  <input
                    type="checkbox"
                    checked={printOptions[option.key]}
                    onChange={(e) => setPrintOptions(prev => ({
                      ...prev,
                      [option.key]: e.target.checked
                    }))}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>
                      {option.label}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                      {option.count} элементов
                    </div>
                  </div>
                </label>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPrintDialog(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (!printOptions.events && !printOptions.applications && !printOptions.urls && !printOptions.screenshots) {
                    alert('Выберите хотя бы один элемент для печати');
                    return;
                  }
                  handlePrintReport();
                  setShowPrintDialog(false);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FiPrinter size={16} />
                Печать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

