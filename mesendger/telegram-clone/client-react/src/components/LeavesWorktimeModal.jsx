import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from 'react-modal';
import io from 'socket.io-client';

// Стили для уведомления (анимация)
const notificationStyles = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
  
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.7;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  @keyframes glow {
    0% {
      box-shadow: 0 0 5px rgba(67, 233, 123, 0.5);
    }
    50% {
      box-shadow: 0 0 20px rgba(67, 233, 123, 0.8);
    }
    100% {
      box-shadow: 0 0 5px rgba(67, 233, 123, 0.5);
    }
  }
`;

// Вставляем стили в head один раз
if (typeof document !== 'undefined') {
  if (!document.head.querySelector('style[data-notification-styles]')) {
    const styleSheet = document.createElement('style');
    styleSheet.setAttribute('data-notification-styles', 'true');
    styleSheet.textContent = notificationStyles;
    document.head.appendChild(styleSheet);
  }
}

// Указываем root для react-modal (лучше оставить для доступности)
if (typeof Modal !== 'undefined' && typeof document !== 'undefined') {
  try {
    Modal.setAppElement('#root');
  } catch (e) {
    // ignore in environments where #root doesn't exist
  }
}

function LeavesWorktimeModal({ isOpen, onRequestClose, token: propToken }) {
  // Флаг для предотвращения повторного показа уведомления после закрытия
  const worktimeCompletedDismissedRef = useRef(false);
  // UI state
  const [data, setData] = useState([]); // base leave obligations array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [worktimeMap, setWorktimeMap] = useState({}); // minutes keyed by username (legacy)
  const [worktimeByUserId, setWorktimeByUserId] = useState({}); // minutes keyed by userId (robust)
  const [weekendRunning, setWeekendRunning] = useState(false);
  const [weekendStartTs, setWeekendStartTs] = useState(null); // timestamp in ms
  const [weekendTodayMinutes, setWeekendTodayMinutes] = useState(0); // minutes accumulated on server today
  const [weekdayRunning, setWeekdayRunning] = useState(false);
  const [weekdayStartTs, setWeekdayStartTs] = useState(null);
  const [weekdayTodayMinutes, setWeekdayTodayMinutes] = useState(0);
  const [notification, setNotification] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filter, setFilter] = useState('pending'); // 'pending' | 'completed'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [nameFilter, setNameFilter] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [userRole, setUserRole] = useState('employee');
  const [currentUser, setCurrentUser] = useState(null);
  const [verifiedMap, setVerifiedMap] = useState({});
  // Данные таймеров всех пользователей для HR/Admin (в реальном времени)
  const [realtimeUpdates, setRealtimeUpdates] = useState({}); // { username: { workedMinutes, status, isRunning } }
  const [allUsersTimers, setAllUsersTimers] = useState({}); // Данные таймеров всех пользователей
  
  // Новые состояния для выбора отгулов и таймера
  const [selectedLeaves, setSelectedLeaves] = useState(new Set()); // Set с ID выбранных отгулов
  const [timerSeconds, setTimerSeconds] = useState(0); // Секунды текущего таймера
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState(null); // Время начала таймера
  const [goalAchieved, setGoalAchieved] = useState(false);
  const [dataSaved, setDataSaved] = useState(false); // Флаг для предотвращения двойного сохранения
  const [isSaving, setIsSaving] = useState(false); // Флаг процесса сохранения
  const savingRef = useRef(false); // Ref для более надежного отслеживания процесса сохранения
  const [isTimerMinimized, setIsTimerMinimized] = useState(() => {
    const saved = localStorage.getItem('timerMinimized');
    return saved === 'true';
  }); // Минимизирован ли таймер
  
  // Состояние для отключения проверки рабочего времени (доступно всем с паролем)
  const [workTimeCheckDisabled, setWorkTimeCheckDisabled] = useState(() => {
    const saved = localStorage.getItem('workTimeCheckDisabled');
    return saved === 'true';
  });
  
  // Состояние для модального окна ввода пароля
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Ref для звука
  const audioRef = useRef(null);

  // safe mounted ref
  const mountedRef = useRef(false);

  // refs to avoid stale closures in intervals
  const refs = useRef({
    currentUser: null,
    data: [],
    worktimeMap: {},
    weekendRunning: false,
    weekdayRunning: false,
    weekendStartTs: null,
    weekdayStartTs: null,
    weekendTodayMinutes: 0,
    weekdayTodayMinutes: 0,
    filter: 'all',
    nameFilter: ''
  });

  // flag to avoid re-triggering completion logic multiple times
  const completionHandledRef = useRef(false);
  

  // unify token usage
  const getToken = () => propToken || localStorage.getItem('token') || '';

  // WebSocket connection for real-time updates
  const [socket, setSocket] = useState(null);

  // helpers to sync refs
  useEffect(() => { refs.current.currentUser = currentUser; }, [currentUser]);
  useEffect(() => { refs.current.data = data; }, [data]);
  useEffect(() => { refs.current.worktimeMap = worktimeMap; }, [worktimeMap]);
  useEffect(() => { refs.current.worktimeByUserId = worktimeByUserId; }, [worktimeByUserId]);
  useEffect(() => { refs.current.weekendRunning = weekendRunning; }, [weekendRunning]);
  useEffect(() => { refs.current.weekdayRunning = weekdayRunning; }, [weekdayRunning]);
  useEffect(() => { refs.current.weekendStartTs = weekendStartTs; }, [weekendStartTs]);
  useEffect(() => { refs.current.weekdayStartTs = weekdayStartTs; }, [weekdayStartTs]);
  useEffect(() => { refs.current.weekendTodayMinutes = weekendTodayMinutes; }, [weekendTodayMinutes]);
  useEffect(() => { refs.current.weekdayTodayMinutes = weekdayTodayMinutes; }, [weekdayTodayMinutes]);
  useEffect(() => { refs.current.filter = filter; }, [filter]);
  useEffect(() => { refs.current.nameFilter = nameFilter; }, [nameFilter]);

  // Таймер для нового интерфейса отработки
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && !goalAchieved) {
      interval = setInterval(() => {
        setTimerSeconds(prevSeconds => {
          const newSeconds = prevSeconds + 1;
          const workedMinutes = Math.floor(newSeconds / 60);
          const requiredMinutes = getSelectedLeavesRequiredMinutes();
          
          // Сохраняем состояние каждые 5 секунд для экономии ресурсов
          if (newSeconds % 5 === 0) {
            saveTimerState(true, timerStartTime, Array.from(selectedLeaves), newSeconds);
            
            // Отправляем обновление прогресса каждые 5 секунд
            if (socket && currentUser) {
              socket.emit('new_timer_progress', {
                userId: currentUser.id,
                username: currentUser.username,
                selectedLeaves: Array.from(selectedLeaves),
                currentSeconds: newSeconds,
                workedMinutes: Math.floor(newSeconds / 60),
                requiredMinutes: requiredMinutes,
                progress: requiredMinutes > 0 ? Math.min(100, Math.round((Math.floor(newSeconds / 60) / requiredMinutes) * 100)) : 0,
                date: selectedDate
              });
            }
          }
          
          // КРИТИЧЕСКАЯ ПРОВЕРКА: достигли ли цели для КОНКРЕТНОГО отгула - МОМЕНТАЛЬНО ОСТАНАВЛИВАЕМ ТАЙМЕР!
          if (requiredMinutes > 0 && workedMinutes >= requiredMinutes && !goalAchieved) {
            console.log(`🎯 ЦЕЛЬ ДОСТИГНУТА! Отработано: ${workedMinutes} мин, требовалось: ${requiredMinutes} мин`);
            
            // МОМЕНТАЛЬНО останавливаем таймер - устанавливаем точное требуемое время
            const exactRequiredSeconds = requiredMinutes * 60;
            
            // Цель достигнута для выбранного отгула! ПОЛНОСТЬЮ останавливаем таймер
            setIsTimerRunning(false);
            setGoalAchieved(true);
            
            // Играем звук и показываем уведомление
            playNotificationSound();
            setNotification({
              type: 'success',
              message: `🎉 Отгул отработан! Отработано ${requiredMinutes} минут из ${requiredMinutes}. Статус изменен на "Отработано".`,
              show: true,
              persistent: false
            });
            
            // Автоматически сохраняем результат и обновляем статус отгула
            setTimeout(async () => {
              try {
                const leaveId = Array.from(selectedLeaves)[0];
                console.log(`🎯 Начинаем сохранение отработанного отгула:`, { leaveId, requiredMinutes });
                
                // Проверяем, не идет ли уже процесс сохранения
                if (savingRef.current || dataSaved) {
                  console.log(`⚠️ Сохранение уже выполняется или завершено, пропускаем автосохранение`);
                  return;
                }
                
                // Устанавливаем флаги, что данные сохраняются автоматически
                savingRef.current = true;
                setDataSaved(true);
                setIsSaving(true);
                
                // Шаг 1: Сохраняем ТОЧНОЕ требуемое количество минут для конкретного отгула
                console.log(`💾 Шаг 1: Сохраняем ${requiredMinutes} минут для отгула ${leaveId}`);
                await saveWorktimeDataForSpecificLeave(leaveId, requiredMinutes);
                console.log(`✅ Шаг 1 завершен: время отработки сохранено`);
                
                // Шаг 2: Обновляем статус отгула на "отработано"
                console.log(`🔄 Шаг 2: Обновляем статус отгула ${leaveId} на 'completed'`);
                await updateLeaveStatus(leaveId, 'completed');
                console.log(`✅ Шаг 2 завершен: статус обновлен на 'completed'`);
                
                // Шаг 3: Перезагружаем данные БЕЗ перезагрузки страницы
                console.log(`🔄 Шаг 3: Перезагружаем данные отгулов`);
                await reloadLeavesData();
                console.log(`✅ Шаг 3 завершен: данные перезагружены`);
                
                // Шаг 4: Автоматически переключаем на фильтр "Отработанные" чтобы показать результат
                console.log(`🔄 Шаг 4: Переключаем на фильтр 'completed'`);
                setFilter('completed');
                
                // Шаг 5: Очищаем состояние таймера
                console.log(`🧹 Шаг 5: Очищаем состояние таймера`);
                setTimerSeconds(exactRequiredSeconds);
                setSelectedLeaves(new Set());
                setTimerStartTime(null);
                clearTimerState();
                
                // Показываем успешное уведомление с переходом к отработанным
                setNotification({
                  type: 'success',
                  message: `🎉 Отгул ${leaveId} успешно отработан (${requiredMinutes} мин) и сохранен в "Отработанные"!`,
                  show: true,
                  persistent: false
                });
                
                console.log(`🎉 ВСЕ ШАГИ ЗАВЕРШЕНЫ! Отгул ${leaveId} отработан и сохранен.`);
                
                // Закрываем уведомление через 5 секунд
                setTimeout(() => {
                  setNotification(null);
                }, 5000);
              } catch (e) {
                console.error('❌ КРИТИЧЕСКАЯ ОШИБКА при сохранении отработанного отгула:', e);
                setNotification({
                  type: 'error',
                  message: `❌ Ошибка сохранения: ${e.message}. Проверьте консоль для деталей.`,
                  show: true,
                  persistent: true
                });
              } finally {
                // Всегда сбрасываем флаги сохранения в автоматическом сохранении
                savingRef.current = false;
                setIsSaving(false);
                console.log(`✅ Флаги сохранения сброшены после автосохранения`);
              }
            }, 2000);
            
            // ВАЖНО: возвращаем ТОЧНОЕ требуемое время в секундах, останавливаем счетчик
            return exactRequiredSeconds;
          }
          
          return newSeconds;
        });
      }, 1000);
    } else if (!isTimerRunning && timerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds, selectedLeaves, timerStartTime, goalAchieved]);

  // Восстановление состояния таймера при загрузке компонента
  useEffect(() => {
    if (isOpen && currentUser) {
      restoreTimerState().then(restored => {
        if (restored) {
          setNotification({
            type: 'info',
            message: '🔄 Состояние таймера восстановлено (сервер + localStorage)',
            show: true,
            persistent: false
          });
          setTimeout(() => setNotification(null), 3000);
        }
      }).catch(e => {
        console.error('Ошибка восстановления таймера:', e);
      });
    }
  }, [isOpen, currentUser]);

  // small helpers
  const safeParseTs = (ts) => {
    if (!ts) return null;
    const n = Number(ts);
    if (!Number.isNaN(n)) return n;
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const getSessionMinutes = (startTs) => {
    const s = safeParseTs(startTs);
    if (!s) return 0;
    const diffMs = Date.now() - s;
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const getTotalWeekendMinutes = () => {
    const base = Number(refs.current.weekendTodayMinutes || 0);
    const running = refs.current.weekendRunning && refs.current.weekendStartTs ? getSessionMinutes(refs.current.weekendStartTs) : 0;
    return base + running;
  };

  const getTotalWeekdayMinutes = () => {
    const base = Number(refs.current.weekdayTodayMinutes || 0);
    const running = refs.current.weekdayRunning && refs.current.weekdayStartTs ? getSessionMinutes(refs.current.weekdayStartTs) : 0;
    return base + running;
  };

  // Только текущие «бегущие» минуты (без накопленных за сегодня) — чтобы не удваивать
  const getRunningWeekendMinutes = () => {
    return refs.current.weekendRunning && refs.current.weekendStartTs ? getSessionMinutes(refs.current.weekendStartTs) : 0;
  };

  const getRunningWeekdayMinutes = () => {
    return refs.current.weekdayRunning && refs.current.weekdayStartTs ? getSessionMinutes(refs.current.weekdayStartTs) : 0;
  };

  // Получение динамических минут для любого пользователя (для HR/Admin)
  const getTotalWeekendMinutesForUser = (username) => {
    if (!username) return 0;
    const isCurrentUser = username === currentUser?.username;
    
    if (isCurrentUser) {
      // В таблице учитываем только «бегущие» минуты у текущего пользователя
      return getRunningWeekendMinutes();
    }
    
    // Для других пользователей берем данные из allUsersTimers
    const userTimer = allUsersTimers[username];
    if (!userTimer) return 0;
    
    const running = userTimer.weekendRunning && userTimer.weekendStartTs ? getSessionMinutes(userTimer.weekendStartTs) : 0;
    return running;
  };

  const getTotalWeekdayMinutesForUser = (username) => {
    if (!username) return 0;
    const isCurrentUser = username === currentUser?.username;
    
    if (isCurrentUser) {
      // В таблице учитываем только «бегущие» минуты у текущего пользователя
      return getRunningWeekdayMinutes();
    }
    
    // Для других пользователей берем данные из allUsersTimers
    const userTimer = allUsersTimers[username];
    if (!userTimer) return 0;
    
    const running = userTimer.weekdayRunning && userTimer.weekdayStartTs ? getSessionMinutes(userTimer.weekdayStartTs) : 0;
    return running;
  };

  const isTodayWeekend = () => {
    const d = new Date();
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  const isTodayWeekday = () => {
    const d = new Date();
    const day = d.getDay();
    return day >= 1 && day <= 5;
  };

  const isWorktimeAllowed = () => {
    // Если проверка времени отключена паролем - разрешаем всегда
    if (workTimeCheckDisabled) {
      return true;
    }
    
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const workStart = 9 * 60;
    const workEnd = 18 * 60;
    return minutes < workStart || minutes > workEnd;
  };

  // Проверка времени для отработки отгулов (до 9:00 или после 18:00) + наличие неотработанных отгулов
  const isLeaveWorktimeAllowed = () => {
    // Если проверка времени отключена паролем - разрешаем всегда
    if (workTimeCheckDisabled) {
      return true;
    }
    
    // Проверяем время (до 9:00 или после 18:00)
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const workStart = 9 * 60; // 9:00
    const workEnd = 18 * 60;  // 18:00
    const timeAllowed = minutes < workStart || minutes > workEnd;
    
    if (!timeAllowed) {
      return false;
    }
    
    // Проверяем наличие неотработанных отгулов у текущего пользователя
    if (!currentUser || !Array.isArray(data)) {
      return false;
    }
    
    const userLeaves = data.filter(row => {
      const fio = row.username || row.fio || '';
      return fio === currentUser.username && row.status === 'approved';
    });
    
    // Проверяем есть ли отгулы с нулевым прогрессом (неотработанные)
    const hasUnworkedLeaves = userLeaves.some(row => {
      const leaveHours = Number(row.leaveHours) || 0;
      const baseMapMinutes = Number(worktimeMap[currentUser.username] || 0);
      const requiredMinutes = Math.round(leaveHours * 60);
      const progress = requiredMinutes > 0 ? Math.min(100, Math.round((baseMapMinutes / requiredMinutes) * 100)) : 0;
      return progress < 100;
    });
    
    return hasUnworkedLeaves;
  };

  const isSameDay = (isoDate) => {
    if (!isoDate) return false;
    const d = new Date(isoDate);
    const today = new Date();
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  };

  const isPastDay = (isoDate) => {
    if (!isoDate) return false;
    const d = new Date(isoDate);
    const today = new Date();
    d.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    return d.getTime() < today.getTime();
  };

  // compute if a user has obligation (based on loaded data + worktimeMap)
  const hasWorktimeObligation = (user) => {
    if (!user) return false;
    const row = data.find(r => (r.username || r.fio || '') === user.username);
    if (!row) return false;
    const leaveHours = Number(row.leaveHours) || 0;
    return leaveHours > 0;
  };

  // Check completion for current user using minutes (prevent rounding bugs)
  const isWorktimeCompletedForUser = (user) => {
    if (!user) return false;
    const row = refs.current.data.find(r => (r.username || r.fio || '') === user.username);
    if (!row) return false;
    const requiredMinutes = Math.round((Number(row.leaveHours) || 0) * 60);
    const mapMinutes = Number(refs.current.worktimeMap[user.username] || 0);
    const totalExtra = getTotalWeekendMinutes() + getTotalWeekdayMinutes();
    return (mapMinutes + totalExtra) >= requiredMinutes && requiredMinutes > 0;
  };

  // Проигрывание звука
  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log("Ошибка воспроизведения звука:", e));
    }
  };

  // Открытие модального окна для ввода пароля
  const openPasswordModal = () => {
    setPasswordInput('');
    setPasswordModalOpen(true);
  };

  // Проверка пароля и переключение режима
  const handlePasswordSubmit = () => {
    const correctPassword = '1711';
    
    if (passwordInput === correctPassword) {
      // Пароль верный - переключаем режим
      const newState = !workTimeCheckDisabled;
      setWorkTimeCheckDisabled(newState);
      localStorage.setItem('workTimeCheckDisabled', newState.toString());
      
      setNotification({
        type: 'success',
        message: newState 
          ? '🔓 Проверка рабочего времени ОТКЛЮЧЕНА (режим тестирования)' 
          : '🔒 Проверка рабочего времени ВКЛЮЧЕНА (обычный режим)',
        show: true,
        persistent: false
      });
      setTimeout(() => setNotification(null), 3000);
      
      // Закрываем модальное окно
      setPasswordModalOpen(false);
      setPasswordInput('');
    } else {
      // Неверный пароль
      setNotification({
        type: 'error',
        message: '❌ Неверный пароль!',
        show: true,
        persistent: false
      });
      setTimeout(() => setNotification(null), 2000);
      setPasswordInput('');
    }
  };

  // Закрытие модального окна пароля
  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setPasswordInput('');
  };

  // Форматирование времени из часов в читаемый формат
  const formatTimeFromHours = (hours) => {
    if (!hours || hours <= 0) return '0 минут';
    
    const totalMinutes = Math.round(hours * 60);
    
    if (totalMinutes < 60) {
      return `${totalMinutes} минут`;
    }
    
    const fullHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    if (remainingMinutes === 0) {
      return fullHours === 1 ? '1 час' : `${fullHours} час`;
    }
    
    const hourText = fullHours === 1 ? '1 час' : `${fullHours} час`;
    return `${hourText} ${remainingMinutes} минут`;
  };

  // Main check that triggers stop/save + notification + reset sequence
  const handleCompletionIfNeeded = async () => {
    const user = refs.current.currentUser;
    if (!user) return;
    if (completionHandledRef.current) return; // already handled
    if (worktimeCompletedDismissedRef.current) return; // уведомление уже было закрыто
    if (!isWorktimeCompletedForUser(user)) return;

    completionHandledRef.current = true; // mark so we don't re-run

    try {
      // stop running timers on server (if any)
      if (refs.current.weekendRunning) {
        try { await stopWeekendInternal(); } catch (e) { /* ignore */ }
      }
      if (refs.current.weekdayRunning) {
        try { await stopWeekdayInternal(); } catch (e) { /* ignore */ }
      }

      // Получаем данные об отработанном времени для установки статуса
      const row = refs.current.data.find(r => (r.username || r.fio || '') === user.username);
      if (row) {
        const requiredMinutes = Math.round((Number(row.leaveHours) || 0) * 60);
        const mapMinutes = Number(refs.current.worktimeMap[user.username] || 0);
        const totalExtra = getTotalWeekendMinutes() + getTotalWeekdayMinutes();
        const totalWorkedMinutes = mapMinutes + totalExtra;

        // Устанавливаем статус "на проверке" через API
        try {
          await fetch('/api/worktime-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
              userId: user.id,
              date: selectedDate,
              status: 'checking',
              workedMinutes: totalWorkedMinutes
            })
          });

          // Отправляем WebSocket уведомление о завершении отработки
          if (socket) {
            socket.emit('worktime_completed', {
              userId: user.id,
              username: user.username,
              date: selectedDate,
              totalWorkedMinutes,
              requiredMinutes
            });
          }
        } catch (e) {
          console.warn('Не удалось обновить статус:', e);
        }
      }
    } catch (e) {
      // continue anyway
    }

    // show success notification (эффектное появление)
    setNotification({
      type: 'success',
      message: ' Отработка завершена и находится на проверке у HR!\n\nВаш статус изменен на "На проверке". HR-менеджер получит уведомление и сможет подтвердить вашу отработку.',
      show: true,
      persistent: true
    });

    // Проигрываем звук
    playNotificationSound();
    // after short delay reset worktime on server & local state
    setTimeout(async () => {
      try {
        await resetWorktime();
      } catch (e) {
        // ignore
      }
    }, 1800);
  };

  // Закрытие уведомления
  const closeNotification = () => {
    setNotification(null);
    // Если уведомление было успешным, сбрасываем только флаги
    if (notification && notification.type === 'success') {
      completionHandledRef.current = false;
      worktimeCompletedDismissedRef.current = true;
    }
  };

  // ------------------ Server interactions (helpers) ------------------

  const fetchJson = async (url, opts = {}) => {
    const controller = new AbortController();
    const signal = controller.signal;
    const token = getToken();
    const headers = { ...(opts.headers || {}), Authorization: `Bearer ${token}` };
    const finalOpts = { ...opts, headers, signal };
    try {
      const res = await fetch(url, finalOpts);
      if (!res.ok) {
        // try to parse error body
        let text;
        try { text = await res.text(); } catch (_) { text = ''; }
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
      }
      const json = await res.json().catch(() => ({}));
      return json;
    } finally {
      // no-op; caller may not need abort
    }
  };

  // Функция для перезагрузки данных отгулов
  const reloadLeavesData = async () => {
    try {
      console.log('🔄 Перезагружаем данные отгулов...');
      
      const rep = await fetch('/api/leaves-worktime-report', { headers: { Authorization: `Bearer ${getToken()}` } });
      if (rep.ok) {
        const json = await rep.json().catch(() => ([]));
        const newData = Array.isArray(json) ? json : [];
        setData(newData);
        console.log(`✅ Данные отгулов обновлены: ${newData.length} записей`);
        
        // Также обновляем верификации для текущей даты
        await loadVerifications(selectedDate);
      } else {
        console.error('❌ Ошибка загрузки данных отгулов:', rep.status);
      }
    } catch (e) {
      console.error('❌ Ошибка при перезагрузке данных отгулов:', e);
    }
  };

  // Загрузка подтверждений HR/Admin на выбранную дату
  const loadVerifications = async (dateIso) => {
    try {
      const day = (dateIso || new Date().toISOString().slice(0, 10)).slice(0, 10);
      const res = await fetch(`http://localhost:5000/api/leaves/verified?date=${encodeURIComponent(day)}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) { setVerifiedMap({}); return; }
      const list = await res.json().catch(() => []);
      const map = {};
      (Array.isArray(list) ? list : []).forEach(it => { if (it && it.user_id != null) map[it.user_id] = true; });
      setVerifiedMap(map);
    } catch { setVerifiedMap({}); }
  };

  // Загрузка данных таймеров всех пользователей для HR/Admin
  const loadAllUsersTimers = async () => {
    // Только для HR и админов
    if (userRole !== 'hr' && userRole !== 'admin') return;
    
    try {
      const res = await fetch('/api/all-users-timers', { 
        headers: { Authorization: `Bearer ${getToken()}` } 
      });
      if (!res.ok) { 
        setAllUsersTimers({}); 
        return; 
      }
      const data = await res.json().catch(() => ({}));
      setAllUsersTimers(data || {});
    } catch (e) {
      console.warn('Failed to load all users timers:', e);
      setAllUsersTimers({});
    }
  };

  // load status endpoints
  const loadWeekendTimer = async () => {
    try {
      const status = await fetchJson('/api/weekend-work/status');
      setWeekendRunning(!!status.running);
      setWeekendStartTs(safeParseTs(status.startTs) || null);
      setWeekendTodayMinutes(Number(status.todayMinutes) || 0);
    } catch (e) {
      setWeekendRunning(false);
      setWeekendStartTs(null);
    }
  };

  const loadWeekdayTimer = async () => {
    try {
      const status = await fetchJson('/api/weekday-work/status');
      setWeekdayRunning(!!status.running);
      setWeekdayStartTs(safeParseTs(status.startTs) || null);
      setWeekdayTodayMinutes(Number(status.todayMinutes) || 0);
    } catch (e) {
      setWeekdayRunning(false);
      setWeekdayStartTs(null);
    }
  };

  // start/stop helpers that return parsed json
  const startWeekend = async () => {
    try {
      const res = await fetch('/api/weekend-work/start', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error('Failed to start weekend work');
      const j = await res.json().catch(() => ({}));
      const ts = safeParseTs(j.startTs) || Date.now();
      setWeekendRunning(true);
      setWeekendStartTs(ts);
      
      // Отправляем WebSocket событие об изменении таймера
      if (socket && currentUser) {
        socket.emit('worktime_timer_changed', {
          userId: currentUser.id,
          username: currentUser.username,
          timerType: 'weekend',
          isRunning: true,
          startTime: ts
        });
      }
      
      return j;
    } catch (e) {
      console.error('startWeekend error', e);
      throw e;
    }
  };

  const stopWeekendInternal = async () => {
    // internal version used by completion logic that returns minutes
    try {
      const res = await fetch('/api/weekend-work/stop', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ date: selectedDate }) });
      if (!res.ok) throw new Error('Failed to stop weekend work');
      const j = await res.json().catch(() => ({}));
      const minutes = Number(j.minutes) || 0;
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setWeekendRunning(false);
      setWeekendStartTs(null);
      setWeekendTodayMinutes(v => Number(v || 0) + minutes);
      if (user.username) {
        setWorktimeMap(m => ({ ...(m || {}), [user.username]: (Number(m?.[user.username] || 0) + minutes) }));
      }

      // Отправляем WebSocket событие об изменении таймера
      if (socket && currentUser) {
        socket.emit('worktime_timer_changed', {
          userId: currentUser.id,
          username: currentUser.username,
          timerType: 'weekend',
          isRunning: false,
          startTime: null
        });
      }

      // check completion after update
      setTimeout(() => {
        handleCompletionIfNeeded();
      }, 100);
      return j;
    } catch (e) {
      console.error('stopWeekendInternal error', e);
      throw e;
    }
  };

  const stopWeekend = async () => {
    try {
      await stopWeekendInternal();
    } catch (e) {
      // show error if needed
      setNotification({ type: 'error', message: 'Ошибка при остановке отработки по выходным', show: true, persistent: false });
      setTimeout(() => setNotification(null), 2500);
    }
  };

  const startWeekday = async () => {
    try {
      const res = await fetch('/api/weekday-work/start', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error('Failed to start weekday work');
      const j = await res.json().catch(() => ({}));
      const ts = safeParseTs(j.startTs) || Date.now();
      setWeekdayRunning(true);
      setWeekdayStartTs(ts);

      // Отправляем WebSocket событие об изменении таймера
      if (socket && currentUser) {
        socket.emit('worktime_timer_changed', {
          userId: currentUser.id,
          username: currentUser.username,
          timerType: 'weekday',
          isRunning: true,
          startTime: ts
        });
      }

      return j;
    } catch (e) {
      console.error('startWeekday error', e);
      throw e;
    }
  };

  const stopWeekdayInternal = async () => {
    try {
      const res = await fetch('/api/weekday-work/stop', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ date: selectedDate }) });
      if (!res.ok) throw new Error('Failed to stop weekday work');
      const j = await res.json().catch(() => ({}));
      const minutes = Number(j.minutes) || 0;
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setWeekdayRunning(false);
      setWeekdayStartTs(null);
      setWeekdayTodayMinutes(v => Number(v || 0) + minutes);
      if (user.username) {
        setWorktimeMap(m => ({ ...(m || {}), [user.username]: (Number(m?.[user.username] || 0) + minutes) }));
      }

      // Отправляем WebSocket событие об изменении таймера
      if (socket && currentUser) {
        socket.emit('worktime_timer_changed', {
          userId: currentUser.id,
          username: currentUser.username,
          timerType: 'weekday',
          isRunning: false,
          startTime: null
        });
      }

      // check completion
      setTimeout(() => {
        handleCompletionIfNeeded();
      }, 100);
      return j;
    } catch (e) {
      console.error('stopWeekdayInternal error', e);
      throw e;
    }
  };

  const stopWeekday = async () => {
    try {
      await stopWeekdayInternal();
    } catch (e) {
      setNotification({ type: 'error', message: 'Ошибка при остановке отработки по будням', show: true, persistent: false });
      setTimeout(() => setNotification(null), 2500);
    }
  };

  const addManualMinutes = async ({ kind, minutes }) => {
    // kind: 'weekend' | 'weekday'
    if (!minutes || minutes <= 0) return;
    try {
      const url = kind === 'weekend' ? '/api/weekend-work/add-minutes' : '/api/weekday-work/add-minutes';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ minutes })
      });
      if (!res.ok) throw new Error('Failed to add minutes');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (kind === 'weekend') {
        setWeekendTodayMinutes(v => Number(v || 0) + minutes);
      } else {
        setWeekdayTodayMinutes(v => Number(v || 0) + minutes);
      }
      if (user.username) {
        setWorktimeMap(m => ({ ...(m || {}), [user.username]: (Number(m?.[user.username] || 0) + minutes) }));
      }
      handleCompletionIfNeeded();
    } catch (e) {
      console.error('addManualMinutes error', e);
      setNotification({ type: 'error', message: 'Ошибка при добавлении минут', show: true, persistent: false });
      setTimeout(() => setNotification(null), 2500);
    }
  };
  // ==================== ФУНКЦИИ ДЛЯ РАБОТЫ С ВЫБРАННЫМИ ОТГУЛАМИ ====================
  
  const toggleLeaveSelection = (leaveId) => {
    // Проверяем, что таймер не запущен
    if (isTimerRunning) {
      setNotification({
        type: 'warning',
        message: 'Нельзя изменять выбор отгулов во время работы таймера',
        show: true,
        persistent: false
      });
      setTimeout(() => setNotification(null), 2500);
      return;
    }

    // Проверяем, что отгул не отработан полностью
    const selectedLeave = data.find(row => (row.id || row.leaveId) === leaveId);
    if (selectedLeave && selectedLeave.status === 'completed') {
      setNotification({
        type: 'warning',
        message: 'Этот отгул уже полностью отработан и находится в архиве',
        show: true,
        persistent: false
      });
      setTimeout(() => setNotification(null), 2500);
      return;
    }

    setSelectedLeaves(prev => {
      // ВАЖНО: Разрешаем выбирать только ОДИН отгул за раз
      const newSet = new Set();
      if (!prev.has(leaveId)) {
        newSet.add(leaveId); // Выбираем только этот отгул, очищая все остальные
        
        // Сбрасываем таймер при выборе нового отгула
        setTimerSeconds(0);
        setTimerStartTime(null);
        setGoalAchieved(false);
        
        // Показываем информацию о выбранном отгуле
        if (selectedLeave) {
          const requiredHours = Number(selectedLeave.requiredHours) || Number(selectedLeave.leaveHours) || 0;
          const requiredMinutes = Math.round(requiredHours * 60);
          
          console.log(`📋 Выбран отгул:`, {
            id: selectedLeave.id || selectedLeave.leaveId,
            requiredHours: selectedLeave.requiredHours,
            leaveHours: selectedLeave.leaveHours,
            calculatedMinutes: requiredMinutes,
            rawData: selectedLeave
          });
          
          setNotification({
            type: 'info',
            message: `Выбран отгул для изолированной отработки. Требуется: ${requiredMinutes} минут (${Math.floor(requiredMinutes/60)}ч ${requiredMinutes%60}м)`,
            show: true,
            persistent: false
          });
          setTimeout(() => setNotification(null), 3000);
        }
      }
      // Если отгул уже выбран, просто очищаем выбор (newSet остается пустым)
      
      // Сохраняем выбранные отгулы в localStorage
      saveTimerState(false, null, Array.from(newSet), 0);
      
      return newSet;
    });
  };

  const selectAllLeaves = () => {
    // Отключаем функцию "Выбрать все" для изолированной отработки
    setNotification({
      type: 'info',
      message: 'Выберите только один отгул для изолированной отработки',
      show: true,
      persistent: false
    });
    setTimeout(() => setNotification(null), 2500);
  };

  const clearLeaveSelection = () => {
    setSelectedLeaves(new Set());
    
    // Сохраняем пустой выбор в localStorage
    if (!isTimerRunning) {
      saveTimerState(false, null, [], timerSeconds);
    }
  };

  // Расчет требуемого времени на основе выбранных отгулов
  const getSelectedLeavesRequiredMinutes = () => {
    if (selectedLeaves.size === 0) return 0;
    
    const userLeaves = data.filter(row => 
      (row.username || row.fio || '') === currentUser?.username && 
      selectedLeaves.has(row.id || row.leaveId)
    );
    
    return userLeaves.reduce((total, leave) => {
      // Конвертируем часы в минуты - используем правильное поле
      const requiredHours = Number(leave.requiredHours) || Number(leave.leaveHours) || 0;
      console.log(`📊 Отгул ${leave.id || leave.leaveId}: требуется ${requiredHours} часов (${requiredHours * 60} минут)`);
      return total + Math.round(requiredHours * 60);
    }, 0);
  };

  // ==================== ФУНКЦИИ ДЛЯ НОВОГО ТАЙМЕРА ====================
  
  // Сохранение состояния таймера в localStorage и на сервере
  const saveTimerState = async (running, startTime, selectedLeavesArray, seconds = 0) => {
    const timerState = {
      isRunning: running,
      startTime: startTime,
      selectedLeaves: selectedLeavesArray,
      savedSeconds: seconds,
      timestamp: Date.now()
    };
    
    // Сохраняем локально
    localStorage.setItem('worktimeTimer', JSON.stringify(timerState));
    
    // Состояние сохраняется только в localStorage
    console.log('💾 Состояние таймера сохранено в localStorage');
  };

  // Восстановление состояния таймера с сервера и localStorage
  const restoreTimerState = async () => {
    try {
      let timerState = null;
      
      // Восстанавливаем состояние из localStorage
      const savedState = localStorage.getItem('worktimeTimer');
      if (savedState) {
        try {
          timerState = JSON.parse(savedState);
          console.log('🔄 Состояние таймера восстановлено из localStorage');
        } catch (e) {
          console.warn('Ошибка парсинга сохранённого состояния таймера:', e);
        }
      }
      
      if (!timerState) return false;

      const now = Date.now();
      
      // Проверяем, что сохраненное состояние не старше 24 часов
      if (now - timerState.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('worktimeTimer');
        console.log('🗑️ Устаревшее состояние таймера очищено из localStorage');
        return false;
      }

      if (timerState.isRunning && timerState.startTime) {
        // Вычисляем сколько времени прошло с момента начала таймера
        const elapsedMs = now - timerState.startTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000) + (timerState.savedSeconds || 0);
        
        // Восстанавливаем состояние
        setSelectedLeaves(new Set(timerState.selectedLeaves || []));
        setTimerSeconds(elapsedSeconds);
        setIsTimerRunning(true);
        setTimerStartTime(timerState.startTime);
        
        return true;
      } else if (timerState.selectedLeaves && timerState.selectedLeaves.length > 0) {
        // Восстанавливаем только выбранные отгулы если таймер не запущен
        setSelectedLeaves(new Set(timerState.selectedLeaves));
        setTimerSeconds(timerState.savedSeconds || 0);
        return true;
      }
    } catch (e) {
      console.error('Ошибка восстановления состояния таймера:', e);
      localStorage.removeItem('worktimeTimer');
    }
    return false;
  };

  // Очистка сохраненного состояния таймера
  const clearTimerState = async () => {
    localStorage.removeItem('worktimeTimer');
    console.log('🗑️ Состояние таймера очищено из localStorage');
  };
  
  const formatTimerDisplay = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // Функция для сохранения данных отработки для конкретного отгула
  const saveWorktimeDataForSpecificLeave = async (leaveId, workedMinutes) => {
    const today = new Date().toISOString().slice(0, 10);
    
    console.log('💾 Auto-saving worktime for specific leave:', { 
      leaveId,
      workedMinutes, 
      date: today,
      currentUser: currentUser ? { id: currentUser.id, username: currentUser.username } : null
    });
    
    const res = await fetch('/api/leaves/add-worktime-isolated', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${getToken()}` 
      },
      body: JSON.stringify({ 
        leaveId: leaveId,
        minutes: workedMinutes,
        date: today
      })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Auto-save error for specific leave:', res.status, errorText);
      throw new Error(`Failed to auto-save worked time for leave: ${res.status} ${errorText}`);
    }
    
    const saveResult = await res.json();
    console.log('✅ Auto-save result for specific leave:', saveResult);
    
    // Отправляем WebSocket событие об завершении отработки конкретного отгула
    if (socket && currentUser) {
      socket.emit('leave_worktime_completed', {
        userId: currentUser.id,
        username: currentUser.username,
        leaveId: leaveId,
        workedMinutes: workedMinutes,
        date: selectedDate
      });
    }
  };

  // Функция для обновления статуса отгула
  const updateLeaveStatus = async (leaveId, status) => {
    console.log('🔄 Updating leave status:', { leaveId, status });
    
    const res = await fetch('/api/leaves/update-status', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${getToken()}` 
      },
      body: JSON.stringify({ 
        leaveId: leaveId,
        status: status
      })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Error updating leave status:', res.status, errorText);
      throw new Error(`Failed to update leave status: ${res.status} ${errorText}`);
    }
    
    const updateResult = await res.json();
    console.log('✅ Leave status updated:', updateResult);
    
    return updateResult;
  };

  // Функция для сохранения данных отработки без сброса интерфейса (legacy)
  const saveWorktimeData = async (leavesArray, workedMinutes) => {
    const today = new Date().toISOString().slice(0, 10);
    
    console.log('💾 Auto-saving worktime:', { 
      workedMinutes, 
      selectedLeaves: leavesArray, 
      date: today,
      currentUser: currentUser ? { id: currentUser.id, username: currentUser.username } : null
    });
    
    const res = await fetch('/api/leaves/add-worktime', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${getToken()}` 
      },
      body: JSON.stringify({ 
        minutes: workedMinutes,
        date: today,
        selectedLeaves: leavesArray
      })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Auto-save error:', res.status, errorText);
      throw new Error(`Failed to auto-save worked time: ${res.status} ${errorText}`);
    }
    
    const saveResult = await res.json();
    console.log('✅ Auto-save result:', saveResult);
    
    // Отправляем WebSocket событие об остановке таймера
    if (socket && currentUser) {
      socket.emit('new_timer_stopped', {
        userId: currentUser.id,
        username: currentUser.username,
        selectedLeaves: leavesArray,
        workedMinutes: workedMinutes,
        date: selectedDate
      });
    }
    
    // Перезагружаем данные после успешного сохранения
    console.log('🔄 Reloading data after auto-save...');
    await loadData();
    console.log('✅ Data reloaded successfully after auto-save');
  };

  const startNewTimer = () => {
    if (selectedLeaves.size === 0) {
      setNotification({
        type: 'error',
        message: 'Выберите отгулы для отработки',
        show: true,
        persistent: false
      });
      setTimeout(() => setNotification(null), 2500);
      return;
    }
    
    // Проверяем и логируем требуемое время перед запуском
    const requiredMinutes = getSelectedLeavesRequiredMinutes();
    console.log(`🚀 Запуск таймера: требуется ${requiredMinutes} минут для отгулов:`, Array.from(selectedLeaves));
    
    if (requiredMinutes <= 0) {
      setNotification({
        type: 'error',
        message: 'Не удалось определить требуемое время для выбранных отгулов',
        show: true,
        persistent: false
      });
      setTimeout(() => setNotification(null), 2500);
      return;
    }
    
    const startTime = Date.now();
    setIsTimerRunning(true);
    setGoalAchieved(false);
    setDataSaved(false); // Сбрасываем флаг сохранения для нового таймера
    setIsSaving(false); // Сбрасываем флаг процесса сохранения
    savingRef.current = false; // Сбрасываем ref
    setTimerStartTime(startTime);
    
    // Сохраняем состояние в localStorage
    saveTimerState(true, startTime, Array.from(selectedLeaves), 0);
    
    // Отправляем WebSocket событие о начале нового таймера
    if (socket && currentUser) {
      socket.emit('new_timer_started', {
        userId: currentUser.id,
        username: currentUser.username,
        selectedLeaves: Array.from(selectedLeaves),
        startTime: startTime,
        date: selectedDate,
        requiredMinutes: requiredMinutes
      });
    }
  };

  const stopNewTimer = async (autoSave = false) => {
    // Защита от повторного вызова
    if (savingRef.current) {
      console.log(`⚠️ Сохранение уже в процессе, пропускаем повторный вызов`);
      return;
    }
    
    setIsTimerRunning(false);
    
    // Очищаем уведомление при ручной остановке
    if (!autoSave) {
      setNotification(null);
    }
    
    if (timerSeconds < 60 && !autoSave) {
      setNotification({
        type: 'warning',
        message: 'Слишком мало времени для сохранения (минимум 1 минута)',
        show: true,
        persistent: false
      });
      setTimeout(() => setNotification(null), 2500);
      return;
    }
    
    try {
      const workedMinutes = Math.floor(timerSeconds / 60);
      
      if (selectedLeaves.size === 1) {
        // Изолированная отработка одного отгула
        const leaveId = Array.from(selectedLeaves)[0];
        
        // Проверяем, не были ли данные уже сохранены автоматически
        if (dataSaved) {
          console.log(`⚠️ Данные уже сохранены автоматически, пропускаем повторное сохранение`);
          // Сбрасываем флаг для следующего цикла
          setDataSaved(false);
          return;
        }
        
        // Устанавливаем флаги процесса сохранения
        savingRef.current = true;
        setIsSaving(true);
        console.log(`💾 Начинаем ручное сохранение для отгула ${leaveId}: ${workedMinutes} минут`);
        
        await saveWorktimeDataForSpecificLeave(leaveId, workedMinutes);
        
        // Проверяем, достигнута ли цель для этого отгула
        const requiredMinutes = getSelectedLeavesRequiredMinutes();
        if (workedMinutes >= requiredMinutes) {
          // Обновляем статус отгула на "отработано"
          await updateLeaveStatus(leaveId, 'completed');
          
          setNotification({
            type: 'success',
            message: `✅ Отгул полностью отработан! Статус изменен на "Отработано".`,
            show: true,
            persistent: true
          });
        } else {
          setNotification({
            type: 'success',
            message: `✅ Сохранено ${workedMinutes} минут отработки для отгула!`,
            show: true,
            persistent: true
          });
        }
      } else {
        // Legacy режим для множественного выбора (не должен использоваться)
        const today = new Date().toISOString().slice(0, 10);
        
        console.log('💾 Saving worktime (legacy):', { 
          workedMinutes, 
          selectedLeaves: Array.from(selectedLeaves), 
          date: today,
          currentUser: currentUser ? { id: currentUser.id, username: currentUser.username } : null
        });
        
        const res = await fetch('/api/leaves/add-worktime', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${getToken()}` 
          },
          body: JSON.stringify({ 
            minutes: workedMinutes,
            date: today,
            selectedLeaves: Array.from(selectedLeaves)
          })
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Server error:', res.status, errorText);
          throw new Error(`Failed to save worked time: ${res.status} ${errorText}`);
        }
        
        const saveResult = await res.json();
        console.log('✅ Save result:', saveResult);
        
        setNotification({
          type: 'success',
          message: `✅ Сохранено ${workedMinutes} минут отработки!`,
          show: true,
          persistent: true
        });
      }
      
      // Сохраняем selectedLeaves до очистки для WebSocket события
      const selectedLeavesArray = Array.from(selectedLeaves);
      
      // Отправляем WebSocket событие об остановке таймера ПЕРЕД очисткой состояния
      if (socket && currentUser) {
        socket.emit('new_timer_stopped', {
          userId: currentUser.id,
          username: currentUser.username,
          selectedLeaves: selectedLeavesArray,
          workedMinutes: workedMinutes,
          date: selectedDate
        });
      }
      
      // Обновляем данные
      handleCompletionIfNeeded();
      
      // Перезагружаем данные после успешного сохранения
      console.log('🔄 Reloading data after timer stop...');
      await loadData();
      console.log('✅ Data reloaded successfully');
      
      // Данные отработки теперь загружаются через новую систему в loadData()
      console.log('📊 Worktime data will be updated via loadData() call above');
      
      // ТОЛЬКО ПОСЛЕ перезагрузки данных очищаем состояние таймера с небольшой задержкой
      setTimeout(() => {
        setTimerSeconds(0);
        setSelectedLeaves(new Set());
        setTimerStartTime(null);
        setIsTimerRunning(false);
        
        // Очищаем сохраненное состояние
        clearTimerState();
        
        // Очищаем данные реального времени для текущего пользователя
        if (currentUser) {
          setRealtimeUpdates(prev => {
            const updated = { ...prev };
            delete updated[currentUser.username];
            return updated;
          });
        }
      }, 100); // Небольшая задержка для обновления UI
      
    } catch (e) {
      console.error('Ошибка сохранения времени:', e);
      setNotification({
        type: 'error',
        message: 'Ошибка при сохранении отработанного времени',
        show: true,
        persistent: false
      });
      setTimeout(() => setNotification(null), 2500);
    } finally {
      // Всегда сбрасываем флаги сохранения в конце
      savingRef.current = false;
      setIsSaving(false);
      console.log(`✅ Флаги сохранения сброшены`);
    }
  };

  const resetNewTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setTimerStartTime(null);
    setGoalAchieved(false); // Сбрасываем флаг при сбросе
    clearTimerState();
  };

const resetWorktime = async () => {
  try {
    const res = await fetch('/api/worktime-reset', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) throw new Error('Failed reset');

    // Сбрасываем только локальные счётчики и таймеры, НЕ трогаем worktimeMap
    setWeekendTodayMinutes(0);
    setWeekdayTodayMinutes(0);
    setWeekendRunning(false);
    setWeekdayRunning(false);
    setWeekendStartTs(null);
    setWeekdayStartTs(null);

    // ВАЖНО: НЕ сбрасываем worktimeMap, так как он содержит данные завершенных сессий отработки!
    // worktimeMap обновляется только при смене даты или загрузке модалки

    // Обновляем статусы таймеров с сервера (без перезагрузки data)
    await loadWeekendTimer();
    await loadWeekdayTimer();
    
    // Перезагружаем worktimeMap для текущей даты, чтобы получить актуальные данные
    try {
      const day = new Date(selectedDate).toISOString().slice(0, 10);
      const worktimeUrl = `/api/worktime-stats/${day}`;
      const worktimeRes = await fetch(worktimeUrl, { 
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      
      if (worktimeRes.ok) {
        const worktimeData = await worktimeRes.json().catch(() => ({}));
        const map = {};
        
        if (Array.isArray(worktimeData)) {
          worktimeData.forEach(userStat => {
            const username = userStat.username || '';
            if (username && userStat.totalMinutes !== undefined) {
              map[username] = Number(userStat.totalMinutes) || 0;
            }
          });
        }
        
        setWorktimeMap(map);
      }
    } catch (e) {
      console.warn('Failed to reload worktime stats after reset:', e);
    }

    setNotification({ type: 'success', message: '✨ Время учтено и находится на проверке у HR', show: true, persistent: true });

    completionHandledRef.current = false; // allow next completion cycle
  } catch (e) {
    console.error('resetWorktime error', e);
    throw e;
  }
};

  // ------------------ Data loading function ------------------
  const loadData = async (signal = null) => {
    try {
      // current user from localStorage (keep for backward compat)
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setCurrentUser(user);
      setUserRole(user.role || 'employee');

      // load users list for HR/Admin
      try {
        if ((user.role === 'hr' || user.role === 'admin')) {
          const usersRes = await fetch('/api/users', { headers: { Authorization: `Bearer ${getToken()}` }, signal });
          if (usersRes.ok) {
            const users = await usersRes.json().catch(() => ([]));
            setAllUsers(Array.isArray(users) ? users : []);
          } else {
            setAllUsers([]);
          }
        } else {
          setAllUsers([user]);
        }
      } catch (e) {
        setAllUsers(user ? [user] : []);
      }

      // 1) load leaves-worktime-report (obligations)
      try {
        const rep = await fetch('/api/leaves-worktime-report', { headers: { Authorization: `Bearer ${getToken()}` }, signal });
        if (rep.ok) {
          const json = await rep.json().catch(() => ([]));
          setData(Array.isArray(json) ? json : []);
        } else {
          setData([]);
        }
      } catch (e) {
        setData([]);
      }
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };


  // ------------------ WebSocket connection setup ------------------
  useEffect(() => {
    if (!isOpen) return;

    // Инициализируем WebSocket соединение
    const socketConnection = io('http://192.168.0.85:5000');
    
    socketConnection.on('connect', () => {
      console.log('📡 WebSocket connected for worktime updates');
      socketConnection.emit('authenticate', getToken());
    });

    // Обработчики WebSocket событий для всех ролей
    // Обновление данных отработки в реальном времени
    socketConnection.on('worktime_data_updated', (updateData) => {
      console.log('🔄 Received worktime update:', updateData);
      console.log('👤 Current user role:', userRole);
      console.log('📅 Selected date:', selectedDate);
      console.log('📅 Update date:', updateData.date);
      
      // Обновляем карты минут по username и по userId
      if (updateData.date === selectedDate) {
        if (updateData.username) {
          setWorktimeMap(prev => ({
            ...prev,
            [updateData.username]: updateData.workedMinutes
          }));
          
          // Сохраняем real-time обновления для HR/Admin
          if (userRole === 'hr' || userRole === 'admin') {
            console.log('💾 Saving real-time update for HR/Admin:', updateData.username);
            setRealtimeUpdates(prev => ({
              ...prev,
              [updateData.username]: {
                workedMinutes: updateData.workedMinutes,
                status: updateData.status,
                isRunning: updateData.isRunning
              }
            }));
          }
        }
        if (updateData.userId != null) {
          setWorktimeByUserId(prev => ({
            ...prev,
            [String(updateData.userId)]: updateData.workedMinutes
          }));
        }
      }
    });

    // Обновление статуса таймера
    socketConnection.on('worktime_timer_updated', (timerData) => {
      console.log('⏱️ Received timer update:', timerData);
      
      // Обновляем данные таймеров для всех пользователей
      if (timerData.username) {
        setAllUsersTimers(prev => {
          const updated = { ...prev };
          if (!updated[timerData.username]) {
            updated[timerData.username] = {
              weekendRunning: false,
              weekdayRunning: false,
              weekendStartTs: null,
              weekdayStartTs: null,
              weekendTodayMinutes: 0,
              weekdayTodayMinutes: 0
            };
          }
          
          if (timerData.timerType === 'weekend') {
            updated[timerData.username].weekendRunning = timerData.isRunning;
            updated[timerData.username].weekendStartTs = timerData.isRunning ? timerData.startTime : null;
          } else if (timerData.timerType === 'weekday') {
            updated[timerData.username].weekdayRunning = timerData.isRunning;
            updated[timerData.username].weekdayStartTs = timerData.isRunning ? timerData.startTime : null;
          }
          
          return updated;
        });
      }
    });

    // Уведомления о завершении отработки
    socketConnection.on('worktime_completion_notification', (completionData) => {
      console.log('🎉 Received completion notification:', completionData);
      
      // Показать уведомление HR/Admin
      if (userRole === 'hr' || userRole === 'admin') {
        setNotification({
          type: 'info',
          message: `📋 Сотрудник ${completionData.username} завершил отработку отгула!\n\nТребовалось: ${Math.round(completionData.requiredMinutes/60*100)/100} ч\nОтработано: ${Math.round(completionData.totalWorkedMinutes/60*100)/100} ч\n\nСтатус: На проверке`,
          show: true,
          persistent: true
        });
        
        // Проигрываем звук для HR
        playNotificationSound();
      }
      
      // Обновить верификации
      loadVerifications(selectedDate);
    });

    // Уведомления о подтверждении отработки HR
    socketConnection.on('worktime_verified', (verificationData) => {
      console.log('✅ Received verification notification:', verificationData);
      
      // Показать уведомление сотруднику о подтверждении
      if (currentUser && verificationData.userId === currentUser.id) {
        setNotification({
          type: 'success',
          message: `🎉 Ваша отработка отгула подтверждена HR!\n\nСтатус изменен на "Отработано". Отработка засчитана и добавлена в историю.`,
          show: true,
          persistent: true
        });
        
        // Проигрываем звук
        playNotificationSound();
      }
      
      // Обновить верификации
      loadVerifications(selectedDate);
    });

    // Обработчики для нового таймера отработки отгулов
    socketConnection.on('new_timer_started', (timerData) => {
      console.log('🚀 Received new timer started:', timerData);
      
      // Показать уведомление HR о начале отработки
      if ((userRole === 'hr' || userRole === 'admin') && timerData.userId !== currentUser?.id) {
        setNotification({
          type: 'info',
          message: `⏱️ Сотрудник ${timerData.username} начал отработку отгулов`,
          show: true,
          persistent: true
        });
      }
      
      // Обновляем данные для перерисовки таблицы
      reloadLeavesData();
    });

    socketConnection.on('new_timer_stopped', async (timerData) => {
      console.log('⏹️ Received new timer stopped:', timerData);
      
      // Показать уведомление HR об остановке отработки (только для других пользователей)
      if ((userRole === 'hr' || userRole === 'admin') && timerData.userId !== currentUser?.id) {
        setNotification({
          type: 'info',
          message: `⏸️ Сотрудник ${timerData.username} завершил отработку (${timerData.workedMinutes} мин)`,
          show: true,
          persistent: true
        });
      }
      
      // Обновляем данные для перерисовки таблицы
      await reloadLeavesData();
      
      // Данные отработки обновляются через loadData() выше
      console.log('📊 Worktime data updated via loadData() call');
      
      // Очищаем данные реального времени для остановленного пользователя (для всех)
      setRealtimeUpdates(prev => {
        const updated = { ...prev };
        delete updated[timerData.username];
        return updated;
      });
    });

    // Обработчик обновлений прогресса в реальном времени
    socketConnection.on('new_timer_progress', (progressData) => {
      console.log('📊 Received timer progress update:', progressData);
      
      // Обновляем состояние для отображения в таблице
      // Для HR/Admin - показываем всех пользователей
      // Для обычных пользователей - показываем только свои данные
      const shouldUpdate = (userRole === 'hr' || userRole === 'admin') || 
                          (progressData.userId === currentUser?.id);
      
      if (shouldUpdate) {
        // Сохраняем данные прогресса для отображения в таблице
        setRealtimeUpdates(prev => ({
          ...prev,
          [progressData.username]: {
            workedMinutes: progressData.workedMinutes,
            progress: progressData.progress,
            isRunning: true,
            selectedLeaves: progressData.selectedLeaves,
            currentSeconds: progressData.currentSeconds,
            lastUpdate: Date.now()
          }
        }));
        
        // Также обновляем worktimeMap для синхронизации
        if (progressData.date === selectedDate) {
          setWorktimeMap(prev => ({
            ...prev,
            [progressData.username]: progressData.workedMinutes
          }));
        }
        
        console.log(`✅ Updated realtime data for ${progressData.username}: ${progressData.workedMinutes} min`);
      }
    });

    setSocket(socketConnection);

    return () => {
      if (socketConnection) {
        socketConnection.disconnect();
      }
    };
  }, [isOpen, userRole, selectedDate]);

  // ------------------ Initial data load when modal opens ------------------
  useEffect(() => {
    if (!isOpen) return;

  mountedRef.current = true;
  setLoading(true);
  setError('');
  completionHandledRef.current = false;
  worktimeCompletedDismissedRef.current = false;

    const controller = new AbortController();

    (async () => {
      try {
        await loadData(controller.signal);

        // 2) load worktime sessions for selected date (worktimeMap)
        try {
          const day = new Date(selectedDate).toISOString().slice(0, 10);
          
          // Загружаем данные сессий отработки для выбранной даты
          const worktimeUrl = `/api/worktime-stats/${day}`;
          const worktimeRes = await fetch(worktimeUrl, { 
            headers: { Authorization: `Bearer ${getToken()}` }, 
            signal: controller.signal 
          });
          
          if (worktimeRes.ok) {
            const worktimeData = await worktimeRes.json().catch(() => ({}));
            const map = {};
            
            // Если это API возвращает статистику по пользователям
            if (Array.isArray(worktimeData)) {
              worktimeData.forEach(userStat => {
                const username = userStat.username || '';
                if (username && userStat.totalMinutes !== undefined) {
                  map[username] = Number(userStat.totalMinutes) || 0;
                }
              });
            } else {
              // Если это объект с данными текущего пользователя
              const user = JSON.parse(localStorage.getItem('user') || '{}');
              if (user.username && worktimeData.totalMinutes) {
                map[user.username] = Number(worktimeData.totalMinutes) || 0;
              }
            }
            
      setWorktimeMap(map);
      // Также построим карту по userId, если сможем сопоставить
      try {
        const byId = {};
        (Array.isArray(allUsers) ? allUsers : []).forEach(u => {
          if (u && u.username && u.id != null && map[u.username] != null) {
            byId[String(u.id)] = Number(map[u.username]) || 0;
          }
        });
        setWorktimeByUserId(byId);
      } catch {}
          } else {
            // Fallback: используем старый метод через quick-db-report
            const url = `/api/quick-db-report?start=${day}&end=${day}`;
            const r = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` }, signal: controller.signal });
            if (r.ok) {
              const json = await r.json().catch(() => ({}));
              const report = Array.isArray(json?.report) ? json.report : [];
              const map = {};
              report.forEach(row => {
                const fio = row.fio || row.username || row.user || '';
                let overtimeMinutes = 0;
                try {
                  const first = row.firstLogin ? new Date(row.firstLogin) : null;
                  const last = row.lastLogout ? new Date(row.lastLogout) : null;
                  if (first) {
                    const workStart = new Date(first);
                    workStart.setHours(9, 0, 0, 0);
                    if (first < workStart) {
                      overtimeMinutes += Math.max(0, Math.round((workStart - first) / 60000));
                    }
                  }
                  if (last) {
                    const workEnd = new Date(last);
                    workEnd.setHours(18, 0, 0, 0);
                    if (last > workEnd) {
                      overtimeMinutes += Math.max(0, Math.round((last - workEnd) / 60000));
                    }
                  }
                } catch (ee) {}
                map[fio] = overtimeMinutes;
              });
      setWorktimeMap(map);
      try {
        const byId = {};
        (Array.isArray(allUsers) ? allUsers : []).forEach(u => {
          if (u && u.username && u.id != null && map[u.username] != null) {
            byId[String(u.id)] = Number(map[u.username]) || 0;
          }
        });
        setWorktimeByUserId(byId);
      } catch {}
            } else {
              setWorktimeMap({});
            }
          }
        } catch (e) {
          setWorktimeMap({});
        }

        // 3) load timers state
        try {
          await Promise.all([loadWeekendTimer(), loadWeekdayTimer()]);
        } catch (e) {
          // ignore
        }

        // 4) load verifications for selected date
        await loadVerifications(selectedDate);

        // 5) load all users timers for HR/Admin (real-time data)
        if (currentUser?.role === 'hr' || currentUser?.role === 'admin') {
          await loadAllUsersTimers();
        }

        // initial completion check
        setTimeout(() => {
          try { handleCompletionIfNeeded(); } catch (e) { /* ignore */ }
        }, 600);

      } catch (e) {
        console.error('Initial load error', e);
        setError('Ошибка загрузки данных');
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [isOpen, propToken, selectedDate]);

  // Отдельный эффект для перезагрузки worktimeMap при смене даты
  useEffect(() => {
    if (!isOpen) return;
    
    const loadWorktimeForDate = async () => {
      try {
        const day = new Date(selectedDate).toISOString().slice(0, 10);
        const worktimeUrl = `/api/worktime-stats/${day}`;
        const worktimeRes = await fetch(worktimeUrl, { 
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        
        if (worktimeRes.ok) {
          const worktimeData = await worktimeRes.json().catch(() => ({}));
          const map = {};
          
          if (Array.isArray(worktimeData)) {
            worktimeData.forEach(userStat => {
              const username = userStat.username || '';
              if (username && userStat.totalMinutes !== undefined) {
                map[username] = Number(userStat.totalMinutes) || 0;
              }
            });
          }
          
      setWorktimeMap(map);
      try {
        const byId = {};
        (Array.isArray(allUsers) ? allUsers : []).forEach(u => {
          if (u && u.username && u.id != null && map[u.username] != null) {
            byId[String(u.id)] = Number(map[u.username]) || 0;
          }
        });
        setWorktimeByUserId(byId);
      } catch {}
        } else {
          // Fallback: используем старый метод
          const url = `/api/quick-db-report?start=${day}&end=${day}`;
          const r = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
          if (r.ok) {
            const json = await r.json().catch(() => ({}));
            const report = Array.isArray(json?.report) ? json.report : [];
            const map = {};
            report.forEach(row => {
              const fio = row.fio || row.username || row.user || '';
              let overtimeMinutes = 0;
              try {
                const first = row.firstLogin ? new Date(row.firstLogin) : null;
                const last = row.lastLogout ? new Date(row.lastLogout) : null;
                if (first) {
                  const workStart = new Date(first);
                  workStart.setHours(9, 0, 0, 0);
                  if (first < workStart) {
                    overtimeMinutes += Math.max(0, Math.round((workStart - first) / 60000));
                  }
                }
                if (last) {
                  const workEnd = new Date(last);
                  workEnd.setHours(18, 0, 0, 0);
                  if (last > workEnd) {
                    overtimeMinutes += Math.max(0, Math.round((last - workEnd) / 60000));
                  }
                }
              } catch (ee) {}
              map[fio] = overtimeMinutes;
            });
            setWorktimeMap(map);
          } else {
            setWorktimeMap({});
          }
        }
        
        // Также обновляем подтверждения для новой даты
        await loadVerifications(selectedDate);
      } catch (e) {
        console.warn('Failed to load worktime for date:', e);
        setWorktimeMap({});
      }
    };
    
    loadWorktimeForDate();
  }, [selectedDate, isOpen]);

  // ------------------ intervals: update time & poll server status ------------------
  useEffect(() => {
    if (!isOpen) return;

    mountedRef.current = true;
    
    // Интервал обновления данных таблицы каждые 5 секунд для синхронизации прогресса
    const dataUpdateInterval = setInterval(async () => {
      try {
        // Перезагружаем данные отгулов для обновления прогресса
        await reloadLeavesData();
        
        // Обновляем данные отработанного времени для выбранной даты
        const day = new Date(selectedDate).toISOString().slice(0, 10);
        const worktimeUrl = `/api/worktime-stats/${day}`;
        const worktimeRes = await fetch(worktimeUrl, { 
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        
        if (worktimeRes.ok) {
          const worktimeData = await worktimeRes.json().catch(() => ({}));
          const map = {};
          
          if (Array.isArray(worktimeData)) {
            worktimeData.forEach(userStat => {
              const username = userStat.username || '';
              if (username && userStat.totalMinutes !== undefined) {
                map[username] = Number(userStat.totalMinutes) || 0;
              }
            });
          }
          
          setWorktimeMap(map);
          
          // Обновляем карту по userId
          try {
            const byId = {};
            (Array.isArray(allUsers) ? allUsers : []).forEach(u => {
              if (u && u.username && u.id != null && map[u.username] != null) {
                byId[String(u.id)] = Number(map[u.username]) || 0;
              }
            });
            setWorktimeByUserId(byId);
          } catch {}
        }
        
        // Загружаем данные таймеров всех пользователей для HR/Admin
        if (userRole === 'hr' || userRole === 'admin') {
          await loadAllUsersTimers();
        }
        
        // Очищаем устаревшие данные реального времени (старше 30 секунд)
        const now = Date.now();
        setRealtimeUpdates(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(username => {
            const data = updated[username];
            if (data.lastUpdate && (now - data.lastUpdate) > 30000) {
              delete updated[username];
              console.log(`🗑️ Очищены устаревшие данные для ${username}`);
            }
          });
          return updated;
        });
        
        console.log('🔄 Данные таблицы обновлены (каждые 5 сек)');
      } catch (e) {
        console.warn('Ошибка обновления данных таблицы:', e);
      }
    }, 5000);
    
    // Poll server timers every 15s to keep in sync
    const pollInterval = setInterval(() => {
      loadWeekendTimer();
      loadWeekdayTimer();
      // обновляем подтверждения HR/Admin для выбранной даты
      loadVerifications(selectedDate);
      // Also ensure we check completion occasionally
      handleCompletionIfNeeded();
    }, 15000);

    // Update UI time every second and check for completion and auto-stop
    const tickInterval = setInterval(() => {
      setCurrentTime(new Date());
      // If user has completed obligation => handleCompletionIfNeeded will stop timers + notify
      handleCompletionIfNeeded();

      // Отправляем обновления данных каждые 5 секунд (когда таймер работает)
      if (socket && currentUser && (weekendRunning || weekdayRunning)) {
        const now = Date.now();
        if (!window.lastWorktimeUpdate || now - window.lastWorktimeUpdate > 5000) {
          window.lastWorktimeUpdate = now;
          
          const row = refs.current.data.find(r => (r.username || r.fio || '') === currentUser.username);
          if (row) {
            const requiredMinutes = Math.round((Number(row.leaveHours) || 0) * 60);
            const mapMinutes = Number(refs.current.worktimeMap[currentUser.username] || 0);
            const totalExtra = getRunningWeekendMinutes() + getRunningWeekdayMinutes();
            const totalWorkedMinutes = mapMinutes + totalExtra;
            
            socket.emit('worktime_update', {
              userId: currentUser.id,
              username: currentUser.username,
              date: selectedDate,
              workedMinutes: totalWorkedMinutes,
              requiredMinutes,
              status: totalWorkedMinutes >= requiredMinutes ? 'checking' : 'in_progress',
              isRunning: weekendRunning || weekdayRunning
            });
          }
        }
      }
    }, 1000);

    return () => {
      clearInterval(dataUpdateInterval);
      clearInterval(pollInterval);
      clearInterval(tickInterval);
    };
  }, [isOpen, selectedDate, userRole]);

  // recompute filtered data with useMemo for perf
  const filteredData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.filter(row => {
      const fio = row.username || row.fio || '';
      const leaveHours = Number(row.leaveHours) || 0;

      // employee sees only self
      if (userRole === 'employee' && fio !== currentUser?.username) return false;

      // name filter for HR/Admin
      if (nameFilter && !fio.toLowerCase().includes(nameFilter.toLowerCase())) return false;

      // compute progress for display
      const isCurrentUser = fio === currentUser?.username;
      // base minutes from worktimeMap
      const baseMapMinutes = Number(worktimeMap[fio] || 0);
      // add dynamic minutes - теперь для всех пользователей если сегодняшний день и HR/Admin
      const dayIsToday = isSameDay(selectedDate);
      let extraMinutes = 0;
      
      // Проверяем данные реального времени для более точного отображения
      const realtimeData = realtimeUpdates[fio];
      
      if (dayIsToday) {
        if (isCurrentUser) {
          // Для текущего пользователя: используем данные нового таймера если активен, иначе старые таймеры
          if (isTimerRunning && selectedLeaves.size > 0) {
            // Новый таймер отработки отгулов активен
            extraMinutes = Math.floor(timerSeconds / 60);
          } else {
            // Старые таймеры выходных/будней
            extraMinutes = getRunningWeekendMinutes() + getRunningWeekdayMinutes();
          }
        } else if (userRole === 'hr' || userRole === 'admin') {
          // HR/Admin видят данные других пользователей
          if (realtimeData && realtimeData.isRunning) {
            // Используем данные реального времени если доступны
            extraMinutes = realtimeData.workedMinutes || 0;
          } else {
            // Fallback на старые таймеры
            extraMinutes = getTotalWeekendMinutesForUser(fio) + getTotalWeekdayMinutesForUser(fio);
          }
        }
      }
      
      const workedMinutes = Math.max(0, baseMapMinutes + extraMinutes);
      const requiredMinutes = Math.round(leaveHours * 60);
      const progress = requiredMinutes > 0 ? Math.min(100, Math.round((workedMinutes / requiredMinutes) * 100)) : 0;

      // Для фильтрации различаем "На проверке" (сегодня достигнут 100%) и "Отработано" (вчера/прошлые дни по отчёту >= требуемых минут)
      const dayIsPast = isPastDay(selectedDate);
      const baseOnlyProgress = requiredMinutes > 0 ? Math.min(100, Math.round((Math.max(0, baseMapMinutes) / requiredMinutes) * 100)) : 0;
      // Если уже есть подтверждение на выбранную дату — исключаем из "На проверке"
      const rowUser = (allUsers || []).find(u => (u && (u.username === fio)));
      const isVerified = rowUser && verifiedMap[rowUser.id];

      switch (filter) {
        case 'completed': {
          // Отработанные отгулы - подтвержденные HR или со статусом "completed"
          // Показываем ВСЕ отработанные отгулы с полной информацией
          const isCompleted = isVerified || (row.status === 'completed') || (dayIsPast && baseOnlyProgress >= 100);
          
          // Для HR показываем все отработанные отгулы всех сотрудников
          if (userRole === 'hr' || userRole === 'admin') {
            return isCompleted;
          }
          
          // Для обычных сотрудников показываем только свои отработанные отгулы
          return isCompleted && (fio === currentUser?.username);
        }
        case 'pending': {
          // На очереди - отгулы которые еще не начинали отрабатываться
          // Показываем только отгулы со статусом 'approved' и с нулевым прогрессом
          const isPending = (row.status === 'approved') && (progress === 0) && !isVerified;
          
          // Для HR показываем все ожидающие отгулы всех сотрудников
          if (userRole === 'hr' || userRole === 'admin') {
            return isPending;
          }
          
          // Для обычных сотрудников показываем только свои ожидающие отгулы
          return isPending && (fio === currentUser?.username);
        }
        default: return true;
      }
    });
  }, [data, userRole, currentUser, nameFilter, filter, worktimeMap, weekendTodayMinutes, weekdayTodayMinutes, weekendRunning, weekdayRunning, allUsers, verifiedMap, selectedDate, allUsersTimers, realtimeUpdates, timerSeconds, isTimerRunning, selectedLeaves]);

  // UI helpers for display formatting
  const formatHoursOrMinutes = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)} мин`;
    const hours = (minutes / 60);
    if (hours < 1) return `${Math.round(minutes)} мин`;
    return `${hours.toFixed(2)} ч`;
  };

  // UI event handlers for manual minutes (kept prompt for simplicity)
  const handleAddManualWeekend = async () => {
    const val = prompt('Сколько минут добавить к отработке за сегодня?');
    const minutes = Math.max(0, Number(val) || 0);
    if (!minutes) return;
    await addManualMinutes({ kind: 'weekend', minutes });
  };

  const handleAddManualWeekday = async () => {
    const val = prompt('Сколько минут добавить к отработке за сегодня?');
    const minutes = Math.max(0, Number(val) || 0);
    if (!minutes) return;
    await addManualMinutes({ kind: 'weekday', minutes });
  };

  // Render
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
    <>
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Отработанное время по отгулам"
      style={modalStyles}
    >
      {/* Скрытое аудио для воспроизведения звука */}
      <audio ref={audioRef} src="/time_of.mp3" preload="auto" />

      <div
        onClick={onRequestClose}
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
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
          }}
        >
          <button
            onClick={onRequestClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              fontSize: 28,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              fontWeight: 'bold',
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.3s, color 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.18)';
              e.currentTarget.style.color = '#43e97b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#fff';
            }}
            aria-label="Close modal"
          >
            ×
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <h2 style={{
              marginTop: 0,
              marginBottom: 0,
              color: '#43e97b',
              fontWeight: 900,
              fontSize: '2em',
              letterSpacing: '0.5px',
              textShadow: '0 0 22px #43e97b, 0 0 32px #43e97b44, 0 0 2px #fff, 0 0 24px #43e97b88'
            }}>
              Мониторинг отработанного времени
            </h2>


            <div style={{
              padding: '4px 12px',
              borderRadius: 20,
              background: userRole === 'admin'
                ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)'
                : userRole === 'hr'
                  ? 'linear-gradient(135deg, #4dabf7 0%, #339af0 100%)'
                  : 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              {userRole === 'admin' ? '👑 Админ' : userRole === 'hr' ? '👥 HR' : '👤 Сотрудник'}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: '#ffe082', fontWeight: 600, fontSize: '0.9rem' }}>Фильтр:</span>
              <button onClick={() => setFilter('pending')} style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: filter === 'pending' ? '2px solid #43e97b' : '1px solid #4a5568',
                background: filter === 'pending' ? '#43e97b22' : 'transparent',
                color: filter === 'pending' ? '#43e97b' : '#a0aec0',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>📋 На очереди</button>
              <button onClick={() => setFilter('completed')} style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: filter === 'completed' ? '2px solid #28a745' : '1px solid #4a5568',
                background: filter === 'completed' ? '#28a74522' : 'transparent',
                color: filter === 'completed' ? '#28a745' : '#a0aec0',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>💼 Отработанные</button>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: '#ffe082', fontWeight: 600, fontSize: '0.9rem' }}>Дата:</span>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #4a5568',
                background: '#2d3748',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none'
              }} />
            </div>

            {(userRole === 'hr' || userRole === 'admin') && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#ffe082', fontWeight: 600, fontSize: '0.9rem' }}>Поиск:</span>
                <input type="text" placeholder={
                  filter === 'completed' 
                    ? "Поиск отработанных отгулов по имени..." 
                    : "Введите имя сотрудника..."
                } value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #4a5568',
                  background: '#2d3748',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  minWidth: '200px'
                }} />
                {nameFilter && <button onClick={() => setNameFilter('')} style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #ff6b6b',
                  background: 'rgba(255, 107, 107, 0.1)',
                  color: '#ff6b6b',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}>✕</button>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={resetWorktime} style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #ff6b6b',
                background: 'rgba(255, 107, 107, 0.1)',
                color: '#ff6b6b',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)'; e.currentTarget.style.borderColor = '#ff5252'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'; e.currentTarget.style.borderColor = '#ff6b6b'; }}
              >
                🔄 Сбросить время
              </button>
              
              
              {/* Кнопка для отключения проверки рабочего времени (доступна всем с паролем) */}
              <button 
                onClick={openPasswordModal}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: workTimeCheckDisabled ? '1px solid #28a745' : '1px solid #ffc107',
                    background: workTimeCheckDisabled ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)',
                    color: workTimeCheckDisabled ? '#28a745' : '#ffc107',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  onMouseEnter={(e) => { 
                    if (workTimeCheckDisabled) {
                      e.currentTarget.style.background = 'rgba(40, 167, 69, 0.2)'; 
                      e.currentTarget.style.borderColor = '#1e7e34'; 
                    } else {
                      e.currentTarget.style.background = 'rgba(255, 193, 7, 0.2)'; 
                      e.currentTarget.style.borderColor = '#e0a800'; 
                    }
                  }}
                  onMouseLeave={(e) => { 
                    if (workTimeCheckDisabled) {
                      e.currentTarget.style.background = 'rgba(40, 167, 69, 0.1)'; 
                      e.currentTarget.style.borderColor = '#28a745'; 
                    } else {
                      e.currentTarget.style.background = 'rgba(255, 193, 7, 0.1)'; 
                      e.currentTarget.style.borderColor = '#ffc107'; 
                    }
                  }}
                  title={workTimeCheckDisabled ? 'Проверка времени отключена (режим тестирования)' : 'Проверка времени включена (обычный режим)'}
                >
                  {workTimeCheckDisabled ? '🔓' : '🔒'} Тест режим
                </button>
            </div>

          </div>

          {/* Информационное сообщение когда таймер отработки отгулов недоступен */}
          {currentUser && !isLeaveWorktimeAllowed() && !workTimeCheckDisabled && (
            <div style={{
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              textAlign: 'center'
            }}>
              <div style={{ color: '#ffc107', fontWeight: 600, marginBottom: 8 }}>
                ⏰ Таймер отработки отгулов недоступен
              </div>
              <div style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
                {(() => {
                  const now = new Date();
                  const minutes = now.getHours() * 60 + now.getMinutes();
                  const workStart = 9 * 60;
                  const workEnd = 18 * 60;
                  const timeAllowed = minutes < workStart || minutes > workEnd;
                  
                  if (!timeAllowed) {
                    return "Отработка отгулов доступна только до 9:00 утра или после 18:00";
                  } else {
                    return "У вас нет неотработанных отгулов";
                  }
                })()}
              </div>
            </div>
          )}

          {/* Weekend panel */}
          {isTodayWeekend() && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
              background: 'rgba(67,233,123,0.08)',
              border: '1px solid rgba(67,233,123,0.35)',
              borderRadius: 12,
              padding: '12px 14px'
            }}>
              <span style={{ color: '#b2ffb2', fontWeight: 700 }}>Отработка по выходным (сегодня):</span>
              <span style={{ color: '#fff' }}>
                накоплено {Math.floor(getTotalWeekendMinutes() / 60)} ч {getTotalWeekendMinutes() % 60} мин
                {weekendRunning && !isWorktimeCompletedForUser(currentUser) && <span style={{ color: '#43e97b', fontWeight: 'bold' }}> ⏱️ работает</span>}
              </span>

              {!weekendRunning ? (
                <button onClick={startWeekend} disabled={isWorktimeCompletedForUser(currentUser)} style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid #43e97b88',
                  background: isWorktimeCompletedForUser(currentUser) ? '#4a5568' : '#2a3a2f',
                  color: isWorktimeCompletedForUser(currentUser) ? '#a0aec0' : '#b2ffb2',
                  cursor: isWorktimeCompletedForUser(currentUser) ? 'not-allowed' : 'pointer',
                  opacity: isWorktimeCompletedForUser(currentUser) ? 0.6 : 1
                }}>
                  {isWorktimeCompletedForUser(currentUser) ? 'Отработка завершена' : (getTotalWeekendMinutes() > 0 ? 'Продолжить отработку' : 'Начать отработку')}
                </button>
              ) : (
                <button onClick={stopWeekend} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ffe08288', background: '#3a332a', color: '#ffe082', cursor: 'pointer' }}>Пауза (сохранить)</button>
              )}

              <button onClick={handleAddManualWeekend} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #6dd5ed88', background: '#253642', color: '#6dd5ed', cursor: 'pointer' }}>Добавить минуты вручную</button>
            </div>
          )}

          {/* Weekday panel */}
          {isTodayWeekday() && hasWorktimeObligation(currentUser) && isWorktimeAllowed() && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
              background: 'rgba(255,193,7,0.08)',
              border: '1px solid rgba(255,193,7,0.35)',
              borderRadius: 12,
              padding: '12px 14px'
            }}>
              <span style={{ color: '#ffd700', fontWeight: 700 }}>Отработка по будням (сегодня):</span>
              <span style={{ color: '#fff' }}>
                накоплено {Math.floor(getTotalWeekdayMinutes() / 60)} ч {getTotalWeekdayMinutes() % 60} мин
                {weekdayRunning && !isWorktimeCompletedForUser(currentUser) && <span style={{ color: '#43e97b', fontWeight: 'bold' }}> ⏱️ работает</span>}
              </span>

              {!weekdayRunning ? (
                <button
                  onClick={async () => {
                    try {
                      await startWeekday();
                    } catch (e) {
                      setNotification({
                        type: 'error',
                        message: 'Ошибка запуска отработки по будням: ' + (e?.message || 'Не удалось начать'),
                        show: true,
                        persistent: false
                      });
                      setTimeout(() => setNotification(null), 2500);
                    }
                  }}
                  disabled={isWorktimeCompletedForUser(currentUser)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid #ffc10788',
                    background: isWorktimeCompletedForUser(currentUser) ? '#4a5568' : '#3a332a',
                    color: isWorktimeCompletedForUser(currentUser) ? '#a0aec0' : '#ffd700',
                    cursor: isWorktimeCompletedForUser(currentUser) ? 'not-allowed' : 'pointer',
                    opacity: isWorktimeCompletedForUser(currentUser) ? 0.6 : 1
                  }}
                >
                  {isWorktimeCompletedForUser(currentUser) ? 'Отработка завершена' : (getTotalWeekdayMinutes() > 0 ? 'Продолжить отработку' : 'Начать отработку')}
                </button>
              ) : (
                <button onClick={stopWeekday} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ffe08288', background: '#3a332a', color: '#ffe082', cursor: 'pointer' }}>Пауза (сохранить)</button>
              )}

              <button onClick={handleAddManualWeekday} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #6dd5ed88', background: '#253642', color: '#6dd5ed', cursor: 'pointer' }}>Добавить минуты вручную</button>
            </div>
          )}

          {/* ПАНЕЛЬ ВЫБРАННЫХ ОТГУЛОВ */}
          {currentUser && selectedLeaves.size > 0 && (
            <div style={{
              background: 'rgba(67, 233, 123, 0.1)',
              border: '1px solid rgba(67, 233, 123, 0.3)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 12
              }}>
                <span style={{ color: '#43e97b', fontWeight: 700 }}>
                  {selectedLeaves.size > 0 ? `Выбран отгул для изолированной отработки` : 'Выберите ОДИН отгул для отработки'}
                </span>
                {selectedLeaves.size > 0 && (
                  <button
                    onClick={clearLeaveSelection}
                    style={{
                      background: 'rgba(220, 53, 69, 0.2)',
                      border: '1px solid #dc3545',
                      borderRadius: 6,
                      color: '#dc3545',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Очистить
                  </button>
                )}
              </div>
              <div style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
                Время к отработке: <strong style={{ color: '#ffc107' }}>
                  {getSelectedLeavesRequiredMinutes()} минут ({Math.floor(getSelectedLeavesRequiredMinutes() / 60)}ч {getSelectedLeavesRequiredMinutes() % 60}м)
                </strong>
              </div>
              <div style={{ color: '#6c757d', fontSize: '0.8rem', marginTop: 4 }}>
                ⚠️ Каждый отгул отрабатывается отдельно и изолированно
              </div>
            </div>
          )}


          {/* НОВЫЙ ИНТЕРФЕЙС ТАЙМЕРА ОТРАБОТКИ */}
          {currentUser && isLeaveWorktimeAllowed() && (
            <div style={{
              background: 'linear-gradient(135deg, #2a3441 0%, #3a4553 100%)',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              border: '1px solid rgba(67, 233, 123, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              {/* Заголовок */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: isTimerRunning ? '#43e97b' : '#6c757d'
                  }} />
                  <span style={{ color: '#43e97b', fontWeight: 700, fontSize: '1.1rem' }}>
                    Таймер отработки
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => {
                      const newState = !isTimerMinimized;
                      setIsTimerMinimized(newState);
                      localStorage.setItem('timerMinimized', newState.toString());
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 6,
                      color: '#ffffff',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title={isTimerMinimized ? 'Развернуть таймер' : 'Свернуть таймер'}
                  >
                    {isTimerMinimized ? '🔼' : '🔽'}
                  </button>
                  <button
                    onClick={() => setIsTimerRunning(false)}
                    style={{
                      background: isTimerRunning ? 'rgba(67, 233, 123, 0.2)' : 'rgba(108, 117, 125, 0.2)',
                      border: `1px solid ${isTimerRunning ? 'rgba(67, 233, 123, 0.3)' : 'rgba(108, 117, 125, 0.3)'}`,
                      borderRadius: 8,
                      color: isTimerRunning ? '#43e97b' : '#6c757d',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    {isTimerRunning ? 'Активен' : 'Остановлен'}
                  </button>
                </div>
              </div>

              {/* Компактный режим таймера */}
              {isTimerMinimized && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: '#ffffff',
                      fontFamily: 'monospace'
                    }}>
                      {formatTimerDisplay(timerSeconds)}
                    </div>
                    {getSelectedLeavesRequiredMinutes() > 0 && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: '0.8rem',
                        color: '#a0aec0'
                      }}>
                        {Math.floor(timerSeconds / 60)}/{getSelectedLeavesRequiredMinutes()} мин
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!isTimerRunning ? (
                      <button
                        onClick={startNewTimer}
                        style={{
                          background: 'rgba(67, 233, 123, 0.2)',
                          border: '1px solid #43e97b',
                          borderRadius: 6,
                          color: '#43e97b',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        ▶ Старт
                      </button>
                    ) : (
                      <button
                        onClick={stopNewTimer}
                        style={{
                          background: 'rgba(255, 193, 7, 0.2)',
                          border: '1px solid #ffc107',
                          borderRadius: 6,
                          color: '#ffc107',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        ⏸ Стоп
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Контент таймера - скрывается при сворачивании */}
              {!isTimerMinimized && (
                <>
                  {/* Большой таймер */}
                  <div style={{
                    textAlign: 'center',
                    marginBottom: 30
                  }}>
                <div style={{
                  fontSize: '4rem',
                  fontWeight: 'bold',
                  color: getSelectedLeavesRequiredMinutes() > 0 && Math.floor(timerSeconds / 60) >= getSelectedLeavesRequiredMinutes() 
                    ? '#43e97b' 
                    : '#ffffff',
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                  textShadow: getSelectedLeavesRequiredMinutes() > 0 && Math.floor(timerSeconds / 60) >= getSelectedLeavesRequiredMinutes() 
                    ? '0 0 20px rgba(67, 233, 123, 0.5)' 
                    : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {formatTimerDisplay(timerSeconds)}
                </div>
                {getSelectedLeavesRequiredMinutes() > 0 && Math.floor(timerSeconds / 60) >= getSelectedLeavesRequiredMinutes() && (
                  <div style={{
                    color: '#43e97b',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    marginTop: 10,
                    animation: 'pulse 1.5s infinite'
                  }}>
                    🎉 ЦЕЛЬ ДОСТИГНУТА! 🎉
                  </div>
                )}
              </div>

              {/* Статистика */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 20,
                gap: 20
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#a0aec0', fontSize: '0.9rem', marginBottom: 4 }}>
                    Всего отработано
                  </div>
                  <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {Math.floor(timerSeconds / 60)} мин
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#a0aec0', fontSize: '0.9rem', marginBottom: 4 }}>
                    Требуется
                  </div>
                  <div style={{ color: '#ffc107', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {getSelectedLeavesRequiredMinutes()} мин
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#a0aec0', fontSize: '0.9rem', marginBottom: 4 }}>
                    Осталось
                  </div>
                  <div style={{ 
                    color: getSelectedLeavesRequiredMinutes() - Math.floor(timerSeconds / 60) <= 0 ? '#43e97b' : '#ffc107', 
                    fontWeight: 'bold', 
                    fontSize: '1.1rem' 
                  }}>
                    {Math.max(0, getSelectedLeavesRequiredMinutes() - Math.floor(timerSeconds / 60))} мин
                  </div>
                </div>
              </div>

              {/* Прогресс-бар */}
              {getSelectedLeavesRequiredMinutes() > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 10,
                    height: 8,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: `linear-gradient(90deg, ${
                        Math.floor(timerSeconds / 60) >= getSelectedLeavesRequiredMinutes() 
                          ? '#43e97b' 
                          : '#ffc107'
                      } 0%, ${
                        Math.floor(timerSeconds / 60) >= getSelectedLeavesRequiredMinutes() 
                          ? '#38d9a9' 
                          : '#ffb300'
                      } 100%)`,
                      height: '100%',
                      width: `${Math.min(100, (Math.floor(timerSeconds / 60) / getSelectedLeavesRequiredMinutes()) * 100)}%`,
                      transition: 'width 0.3s ease, background 0.3s ease'
                    }} />
                  </div>
                  <div style={{ 
                    textAlign: 'center', 
                    marginTop: 8, 
                    color: '#a0aec0', 
                    fontSize: '0.8rem' 
                  }}>
                    Прогресс: {Math.min(100, Math.round((Math.floor(timerSeconds / 60) / getSelectedLeavesRequiredMinutes()) * 100))}%
                  </div>
                </div>
              )}

              {/* Кнопка управления таймером */}
              <div style={{ textAlign: 'center' }}>
                {!isTimerRunning ? (
                  <button
                    onClick={startNewTimer}
                    style={{
                      background: 'linear-gradient(135deg, #43e97b 0%, #38d9a9 100%)',
                      border: 'none',
                      borderRadius: 12,
                      color: '#ffffff',
                      padding: '12px 24px',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      margin: '0 auto',
                      boxShadow: '0 4px 16px rgba(67, 233, 123, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(67, 233, 123, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(67, 233, 123, 0.3)';
                    }}
                  >
                    ▶ Начать отработку
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button
                      onClick={stopNewTimer}
                      style={{
                        background: 'rgba(255, 193, 7, 0.2)',
                        border: '1px solid #ffc107',
                        borderRadius: 8,
                        color: '#ffc107',
                        padding: '8px 16px',
                        cursor: 'pointer'
                      }}
                    >
                      ⏸ Пауза
                    </button>
                    <button
                      onClick={resetNewTimer}
                      style={{
                        background: 'rgba(220, 53, 69, 0.2)',
                        border: '1px solid #dc3545',
                        borderRadius: 8,
                        color: '#dc3545',
                        padding: '8px 16px',
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Сброс
                    </button>
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          )}

          {loading ? <div>Загрузка...</div> : error ? <div>{error}</div> : (
            <div>
              <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
                    Показано: <strong style={{ color: '#43e97b' }}>{filteredData.length}</strong> из <strong style={{ color: '#ffe082' }}>{data.length}</strong> записей
                    {filter !== 'pending' && (
                      <span style={{ marginLeft: 8, color: '#ffc107' }}>
                        (фильтр: {filter === 'completed' ? 'Отработанные' : 'На очереди'})
                      </span>
                    )}
                    {nameFilter && <span style={{ marginLeft: 8, color: '#4dabf7' }}> (поиск: "{nameFilter}")</span>}
                  </span>
                  
                  {filter === 'completed' && (userRole === 'hr' || userRole === 'admin') && (
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: '#a0aec0',
                      fontStyle: 'italic',
                      marginTop: 4,
                      padding: '4px 8px',
                      background: 'rgba(67, 233, 123, 0.1)',
                      borderRadius: 4,
                      border: '1px solid rgba(67, 233, 123, 0.2)'
                    }}>
                      💡 <strong>Архив отработанных отгулов:</strong> Полная история с датами завершения. 
                      Используйте поиск для быстрого поиска по сотрудникам.
                    </div>
                  )}
                  
                  {filter === 'completed' && userRole === 'employee' && (
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: '#a0aec0',
                      fontStyle: 'italic',
                      marginTop: 4,
                      padding: '4px 8px',
                      background: 'rgba(255, 193, 7, 0.1)',
                      borderRadius: 4,
                      border: '1px solid rgba(255, 193, 7, 0.2)'
                    }}>
                      📚 <strong>Ваши отработанные отгулы</strong> с полной информацией о времени завершения
                    </div>
                  )}

                  {filter === 'pending' && (userRole === 'hr' || userRole === 'admin') && (
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#a0aec0',
                      fontStyle: 'italic',
                      marginTop: 4,
                      padding: '4px 8px',
                      background: 'rgba(67, 233, 123, 0.1)',
                      borderRadius: 4,
                      border: '1px solid rgba(67, 233, 123, 0.2)'
                    }}>
                      📋 <strong>Отгулы на очереди:</strong> Новые отгулы, готовые к отработке.
                      Показаны только те, которые еще не начинали отрабатываться.
                    </div>
                  )}

                  {filter === 'pending' && userRole === 'employee' && (
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#a0aec0',
                      fontStyle: 'italic',
                      marginTop: 4,
                      padding: '4px 8px',
                      background: 'rgba(67, 233, 123, 0.1)',
                      borderRadius: 4,
                      border: '1px solid rgba(67, 233, 123, 0.2)'
                    }}>
                      📋 <strong>Ваши отгулы на очереди</strong> - готовые к отработке
                    </div>
                  )}
                </div>
              </div>

              <table style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                background: 'transparent',
                color: '#e6f7ef',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 2px 16px #43e97b22, 0 0 0 2px #2193b022'
              }}>
                <thead>
                  <tr style={{ background: '#1f2630' }}>
                    <th style={{ padding: '12px 14px', textAlign: 'center', color: '#ffe082', fontWeight: 800, width: '50px' }}>
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAllLeaves();
                          } else {
                            clearLeaveSelection();
                          }
                        }}
                        checked={selectedLeaves.size > 0 && selectedLeaves.size === data.filter(row => 
                          (row.username || row.fio || '') === currentUser?.username
                        ).length}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082', fontWeight: 800 }}>ФИО</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082', fontWeight: 800 }}>Период отгула</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082', fontWeight: 800 }}>Причина</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082', fontWeight: 800 }}>Требуется</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082', fontWeight: 800 }}>Отработано</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082', fontWeight: 800 }}>Прогресс (%)</th>
                    {(userRole === 'hr' || userRole === 'admin') && (
                      <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082', fontWeight: 800 }}>Таймеры</th>
                    )}
                    {filter === 'completed' && (
                      <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082', fontWeight: 800 }}>Дата завершения</th>
                    )}
                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#ffe082', fontWeight: 800 }}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                {filteredData.map((row, index) => {
  // Отладочная информация о данных таблицы (только при необходимости)
  // if (index === 0) {
  //   console.log(`📋 Данные таблицы (${filteredData.length} строк):`, {
  //     currentUser: currentUser?.username,
  //     firstRow: row,
  //     allData: filteredData
  //   });
  // }
  
  // Новая логика для отдельных отгулов
  const fio = row.fio || row.username || '';
  const requiredHours = Number(row.requiredHours) || 0;
  const workedHours = Number(row.workedHours) || 0;
  let status = row.status || 'Не начато';
  
  // Используем индивидуальные данные отгула вместо общих данных пользователя
  const isCurrentUser = fio === currentUser?.username;
  
  // Для каждого отгула используем его собственные данные
  const individualWorkedHours = Number(row.workedHours) || 0;
  const individualWorkedMinutes = Math.round(individualWorkedHours * 60);
  
  // Если это текущий пользователь и сегодняшний день, добавляем время от активного таймера
  const dayIsToday = isSameDay(selectedDate);
  let extraMinutes = 0;
  let isActivelyWorking = false;
  
  // Получаем данные реального времени для всех пользователей (нужно для HR столбца)
  const realtimeData = realtimeUpdates[fio];
  
  if (dayIsToday) {
    if (isCurrentUser) {
      // Добавляем время от текущего таймера только если этот отгул выбран
      const leaveId = row.id || row.leaveId;
      if (selectedLeaves.has(leaveId) && isTimerRunning) {
        extraMinutes = Math.floor(timerSeconds / 60);
        isActivelyWorking = true;
      }
    } else if ((userRole === 'hr' || userRole === 'admin')) {
      // HR видит реальные данные от других пользователей через WebSocket
      if (realtimeData && realtimeData.isRunning) {
        const leaveId = row.id || row.leaveId;
        // Проверяем, работает ли пользователь над этим конкретным отгулом
        if (realtimeData.selectedLeaves && realtimeData.selectedLeaves.includes(leaveId)) {
          extraMinutes = realtimeData.workedMinutes || 0;
          isActivelyWorking = true;
        }
      }
    }
  }
  
  const totalWorkedMinutes = individualWorkedMinutes + extraMinutes;
  const requiredMinutes = Math.round(requiredHours * 60);
  const progressPercent = requiredMinutes > 0 ? Math.min(100, Math.round((totalWorkedMinutes / requiredMinutes) * 100)) : 0;
  
  // Обновляем статус в зависимости от активности таймера и прогресса
  if (isActivelyWorking) {
    status = '⏱️ В работе';
  } else if (progressPercent >= 100) {
    status = row.status === 'completed' ? '✅ Отработано' : '🔍 На проверке';
  } else if (totalWorkedMinutes > 0) {
    status = '📊 В процессе';
  } else {
    status = '❌ Не начато';
  }
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU');
    } catch {
      return dateStr;
    }
  };
  
  const leavePeriod = row.leaveStartDate === row.leaveEndDate 
    ? formatDate(row.leaveStartDate)
    : `${formatDate(row.leaveStartDate)} - ${formatDate(row.leaveEndDate)}`;
  
  const isCurrentUserRow = (row.username || row.fio || '') === currentUser?.username;
  
  // Отладочная информация для диагностики чекбоксов (только при необходимости)
  // console.log(`🔍 Строка таблицы:`, {
  //   fio,
  //   isCurrentUserRow,
  //   currentUserName: currentUser?.username,
  //   rowStatus: row.status,
  //   shouldShowCheckbox: isCurrentUserRow && row.status !== 'completed',
  //   rowId: row.id || row.leaveId
  // });
  
  return (
    <tr key={row.leaveId || index} style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid #2a323d' }}>
      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
        {isCurrentUserRow && row.status !== 'completed' && (
          <input
            type="checkbox"
            checked={selectedLeaves.has(row.id || row.leaveId)}
            onChange={() => toggleLeaveSelection(row.id || row.leaveId)}
            style={{ 
              cursor: 'pointer',
              transform: 'scale(1.2)',
              accentColor: '#43e97b'
            }}
            title="Выберите этот отгул для изолированной отработки"
          />
        )}
        {isCurrentUserRow && row.status === 'completed' && (
          <span style={{ color: '#28a745', fontSize: '1.2rem' }} title="Отгул полностью отработан">
            ✅
          </span>
        )}
      </td>
      <td style={{ padding: '12px 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
        <img
          src={row.avatar || '/api/avatars/default.png'}
          alt={fio}
          style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(67,233,123,0.3)' }}
          onError={(e) => { e.currentTarget.src = '/api/avatars/default.png'; }}
        />
        <span>{fio}</span>
      </td>
      <td style={{ padding: '12px 14px', color: '#a3ffd1' }}>{leavePeriod}</td>
      <td style={{ padding: '12px 14px', color: '#a3ffd1' }}>{row.leaveReason || 'Отгул'}</td>
      <td style={{ padding: '12px 14px', color: '#a3ffd1' }}>{formatTimeFromHours(requiredHours)}</td>
      <td style={{ padding: '12px 14px', color: '#a3ffd1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{formatTimeFromHours(totalWorkedMinutes / 60)}</span>
          {isActivelyWorking && (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              borderRadius: 8,
              backgroundColor: 'rgba(67, 233, 123, 0.1)',
              border: '1px solid rgba(67, 233, 123, 0.3)'
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#43e97b',
                animation: 'pulse 1.5s infinite'
              }} />
              <span style={{ 
                color: '#43e97b', 
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                LIVE
              </span>
            </div>
          )}
        </div>
      </td>
      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ 
            color: isActivelyWorking ? '#43e97b' : 'inherit',
            fontWeight: isActivelyWorking ? 'bold' : 'normal',
            minWidth: '40px'
          }}>
            {progressPercent}%
          </span>
          <div style={{
            width: '60px',
            height: '6px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              backgroundColor: progressPercent >= 100 ? '#43e97b' : 
                             progressPercent >= 75 ? '#ffd93d' : 
                             progressPercent >= 50 ? '#ff9800' : '#ff6b6b',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
              animation: isActivelyWorking ? 'glow 2s infinite' : 'none'
            }} />
          </div>
          {isActivelyWorking && progressPercent < 100 && (
            <span style={{ fontSize: '0.8rem' }}>📈</span>
          )}
        </div>
      </td>
      {(userRole === 'hr' || userRole === 'admin') && (
        <td style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem' }}>
            {isActivelyWorking ? (
              <div style={{ 
                color: '#43e97b', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#43e97b',
                  animation: 'pulse 1.5s infinite'
                }} />
                Активен
              </div>
            ) : (
              <span style={{ color: '#666' }}>Остановлен</span>
            )}
            {realtimeData && realtimeData.currentSeconds && (
              <div style={{ color: '#a3ffd1', fontSize: '0.8rem' }}>
                {formatTimerDisplay(realtimeData.currentSeconds)}
              </div>
            )}
          </div>
        </td>
      )}
      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ 
            color: status.includes('✅') ? '#43e97b' : 
                   status.includes('⏱️') ? '#00bcd4' : 
                   status.includes('📊') ? '#ffd93d' : 
                   status.includes('🔍') ? '#ff9800' : '#ff6b6b',
            fontWeight: status.includes('⏱️') ? 'bold' : 'normal',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            {filter === 'completed' ? (
              row.status === 'completed' && row.completedAt ? 
                new Date(row.completedAt).toLocaleDateString('ru-RU') + ' ' + 
                new Date(row.completedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                : (selectedDate ? new Date(selectedDate).toLocaleDateString('ru-RU') : 'Сегодня')
            ) : status}
            {isActivelyWorking && (
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#43e97b',
                animation: 'pulse 2s infinite',
                marginLeft: 4
              }} />
            )}
          </span>
        </div>
        {/* Кнопка подтверждения для HR */}
        {(userRole === 'hr' || userRole === 'admin') && status === 'На проверке' && (
          <button
            onClick={async () => {
              try {
                // Подтверждение отработки конкретного отгула
                const verifyRes = await fetch('/api/leaves/verify', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json', 
                    Authorization: `Bearer ${getToken()}` 
                  },
                  body: JSON.stringify({
                    leaveId: row.leaveId,
                    userId: row.userId,
                    date: selectedDate,
                    workedHours: workedHours
                  })
                });
                
                if (verifyRes.ok) {
                  setNotification({
                    type: 'success',
                    message: `✅ Отработка отгула подтверждена для ${fio}!`,
                    show: true,
                    persistent: false
                  });
                  setTimeout(() => setNotification(null), 2500);
                  
                  // Перезагружаем данные
                  window.location.reload();
                }
              } catch (e) {
                console.error('Ошибка подтверждения:', e);
                setNotification({
                  type: 'error',
                  message: 'Ошибка при подтверждении отработки',
                  show: true,
                  persistent: false
                });
                setTimeout(() => setNotification(null), 2500);
              }
            }}
            style={{
              marginLeft: 10,
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #43e97b55',
              background: '#1f2630',
              color: '#43e97b',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.82rem'
            }}
            title="Подтвердить отработку отгула"
          >
            Подтвердить
          </button>
        )}
      </td>
        
      {/* Колонка даты завершения для отработанных отгулов */}
      {filter === 'completed' && (
        <td style={{ padding: '12px 14px', color: '#a3ffd1' }}>
            <span style={{ 
              color: status.includes('✅') ? '#43e97b' : 
                     status.includes('⏱️') ? '#00bcd4' : 
                     status.includes('📊') ? '#ffd93d' : 
                     status.includes('🔍') ? '#ff9800' : '#ff6b6b',
              fontWeight: status.includes('⏱️') ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              {status}
              {isActivelyWorking && (
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#43e97b',
                  animation: 'pulse 2s infinite',
                  marginLeft: 4
                }} />
              )}
            </span>
        </td>
      )}
    </tr>
  );
})}
                </tbody>
              </table>
            </div>
          )}

          <button onClick={onRequestClose} style={{
            marginTop: 16, width: '100%', padding: '12px 18px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(90deg, #a3ffb0 0%, #ffe082 100%)', color: '#232931', fontWeight: 800, fontSize: '1.06rem', boxShadow: '0 2px 12px rgba(67,233,123,0.25)'
          }}>Закрыть</button>

          {/* Notification */}
          {notification && notification.show && (
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: notification.type === 'success' ? 'linear-gradient(135deg, #43e97b 0%, #38d9a9 100%)' : notification.type === 'info' ? 'linear-gradient(135deg, #4dabf7 0%, #339af0 100%)' : 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)',
              color: '#fff',
              padding: '20px 24px',
              borderRadius: 16,
              boxShadow: notification.type === 'success' ? '0 8px 32px rgba(67,233,123,0.4)' : notification.type === 'info' ? '0 8px 32px rgba(77,171,247,0.4)' : '0 8px 32px rgba(255,107,107,0.4)',
              zIndex: 10000,
              fontSize: '1.05rem',
              fontWeight: 700,
              textAlign: 'center',
              animation: 'slideIn 0.3s ease-out',
              border: '2px solid rgba(255,255,255,0.3)',
              minWidth: 360,
              maxWidth: '80%'
            }}>
              <div style={{ marginBottom: 12 }}>{notification.message}</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={closeNotification} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#232931', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Закрыть уведомление</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>


    {/* Модальное окно для ввода пароля */}
    {passwordModalOpen && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001
      }}>
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          minWidth: 320,
          maxWidth: 400,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '1.2rem',
            fontWeight: 600,
            color: '#333',
            textAlign: 'center'
          }}>
            🔐 Введите пароль
          </h3>
          
          <p style={{
            margin: '0 0 20px 0',
            fontSize: '0.9rem',
            color: '#666',
            textAlign: 'center',
            lineHeight: 1.4
          }}>
            Для переключения режима тестирования требуется пароль
          </p>

          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Введите пароль..."
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e9ecef',
              borderRadius: 8,
              fontSize: '1rem',
              marginBottom: 20,
              outline: 'none',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#4dabf7'}
            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePasswordSubmit();
              }
            }}
            autoFocus
          />

          <div style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={closePasswordModal}
              style={{
                padding: '10px 20px',
                border: '1px solid #dee2e6',
                background: '#f8f9fa',
                color: '#6c757d',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e9ecef';
                e.currentTarget.style.borderColor = '#adb5bd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#dee2e6';
              }}
            >
              Отмена
            </button>
            
            <button
              onClick={handlePasswordSubmit}
              style={{
                padding: '10px 20px',
                border: '1px solid #4dabf7',
                background: '#4dabf7',
                color: 'white',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#339af0';
                e.currentTarget.style.borderColor = '#339af0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#4dabf7';
                e.currentTarget.style.borderColor = '#4dabf7';
              }}
            >
              Подтвердить
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
}

export default LeavesWorktimeModal;