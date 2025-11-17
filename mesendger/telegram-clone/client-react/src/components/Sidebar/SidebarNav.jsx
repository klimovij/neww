import React, { useEffect, useState, useCallback } from 'react';
import AllLeavesCalendar from '../AllLeavesCalendar';
import AllLeavesCalendarMobile from '../AllLeavesCalendarMobile';
import ChatsListModalMobile from '../ChatsListModalMobile';
import ChatsListModal from '../Modals/ChatsListModal';
import ChatAreaMobile from '../Chat/ChatAreaMobile';
import CreateChatModalMobile from '../CreateChatModalMobile';
import LeaveCalendarModal from '../LeaveCalendarModal';
import LeavesMobile from '../LeavesMobile';
import TasksMobile from '../TasksMobile';
import TodoMobile from '../TodoMobile';
import NewsMobile from '../NewsMobile';
import EmployeesMobile from '../EmployeesMobile';
import CongratulationsMobile from '../CongratulationsMobile';
import RatingMobile from '../RatingMobile';
import WorkTimeMobile from '../WorkTimeMobile';
import LeavesWorktimeMobile from '../LeavesWorktimeMobile';
import AdminMobile from '../AdminMobile';
import { FaCalendarAlt, FaTasks, FaNewspaper, FaComments, FaUserCircle } from 'react-icons/fa';
import { FiSettings, FiAlertTriangle, FiSmile, FiFileText, FiX } from 'react-icons/fi';
import { Badge } from '../../styles/GlobalStyles';
import { useApp } from '../../context/AppContext';
import ChatList from './ChatList';
import ReactDOM from 'react-dom';
import SidebarUploadButton from '../Sidebar/SidebarUploadButton';
import UploadModal from '../UploadModal';
import UploadModalMobile from '../UploadModalMobile';
import NewsModal from '../NewsModal';
import TasksModal from '../TasksModal';
import WorkTimeReportModal from '../Modals/WorkTimeReportModal';
import LeavesWorktimeModal from '../LeavesWorktimeModal';
import CongratulationsModal from '../Congratulations/CongratulationsModal';
import EmployeesListModal from '../Modals/EmployeesListModal';
import EmojiSettingsModal from '../Modals/EmojiSettingsModal';
import TemplatesManagementModal from '../Modals/TemplatesManagementModal';
import TodoModal from '../Modals/TodoModal';
import EmployeeRatingModal from '../Rating/EmployeeRatingModal';
import AppTitleSettingsModal from '../Modals/AppTitleSettingsModal';

const navs = [
  { key: 'all-leaves', label: 'Общий календарь', icon: <FaUserCircle />, color: '#b2bec3', event: 'show-all-leaves', tip: 'Календарь всех сотрудников' },
  { key: 'chats', label: 'Чаты', icon: <FaComments />, color: '#43e97b', event: 'show-chats', tip: 'Вернуться к чатам' },
  { key: 'leaves', label: 'Отгулы', icon: <FaCalendarAlt />, color: '#6dd5ed', event: 'show-leaves', tip: 'Календарь отгулов' },
  { key: 'tasks', label: 'Задачи', icon: <FaTasks />, color: '#2193b0', event: 'show-tasks', tip: 'Ваши задачи' },
  { key: 'todo', label: 'Список дел', icon: <FiFileText />, color: '#9b59b6', event: 'show-todo', tip: 'Персональный список дел' },
  { key: 'news', label: 'Новости', icon: <FaNewspaper />, color: '#fcb69f', event: 'show-news', tip: 'Новостная лента' },
  { key: 'employees', label: 'Сотрудники компании', icon: <FaUserCircle />, color: '#b2ffb2', event: 'show-employees', tip: 'Список сотрудников компании' },
  { key: 'worktime', label: 'Мониторинг времени', icon: <FaCalendarAlt />, color: '#ffe082', event: 'show-worktime', tip: 'Отчет по рабочему времени' },
  { key: 'leaves-worktime', label: 'Отработка отгулов', icon: <FaCalendarAlt />, color: '#b2ffb2', event: 'show-leaves-worktime', tip: 'Отчет по отработке отгулов' },
  { key: 'admin', label: 'Управление', icon: <FiSettings />, color: '#a3e635', event: 'show-admin', tip: 'Администрирование' },
];

export default function SidebarNav({ onCloseMobileSidebar, onOpenMobileSidebar }) {
  const { state: appState } = useApp();
  const [active, setActive] = useState('chats');
  const [pendingCount, setPendingCount] = useState(0);
  const [myTasksCount, setMyTasksCount] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGeneralCalendar, setShowGeneralCalendar] = useState(false);
  const justOpenedGeneralCalendar = React.useRef(false);
  
  // Защищенная функция для закрытия модалки календаря
  const setShowGeneralCalendarSafe = React.useCallback((value) => {
    if (value === false && justOpenedGeneralCalendar.current) {
      console.log('SidebarNav: Предотвращено закрытие модалки календаря через setShowGeneralCalendar');
      return;
    }
    setShowGeneralCalendar(value);
  }, []);
  const [isMobile, setIsMobile] = useState(() => {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });
  const [showLeaveCalendar, setShowLeaveCalendar] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showChatsModal, setShowChatsModal] = useState(false);
  const [showChatAreaModal, setShowChatAreaModal] = useState(false);
  const [showCreateChatModal, setShowCreateChatModal] = useState(false);
  const [showWorkTimeModal, setShowWorkTimeModal] = useState(false);
  const [showLeavesWorktimeModal, setShowLeavesWorktimeModal] = useState(false);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false); // список сотрудников/чаты
  const [showBirthdaysModal, setShowBirthdaysModal] = useState(false); // дни рождения/поздравления
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showEmojiSettingsModal, setShowEmojiSettingsModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showUserRightsModal, setShowUserRightsModal] = useState(false);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showAppTitleSettingsModal, setShowAppTitleSettingsModal] = useState(false);
  const [portalKey, setPortalKey] = useState(0);
  const { state, dispatch } = useApp();
  const [showLeavesWorktimeButton, setShowLeavesWorktimeButton] = useState(false);
  // Admin users state
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminHost, setAdminHost] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [adminEnabledFilter, setAdminEnabledFilter] = useState('all'); // all | enabled | disabled
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newNoExpire, setNewNoExpire] = useState(true);
  const [newAddRdp, setNewAddRdp] = useState(true);
  const [editRow, setEditRow] = useState(null); // {name, description, noExpire}
  // User rights states
  const [deptMap, setDeptMap] = useState({}); // { [userId]: department }
  const [didSyncDepts, setDidSyncDepts] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [roleMap, setRoleMap] = useState({}); // { [userId]: role }
  const departments = [
    'Организатор фотосессий',
    'Супервайзер колл-центра',
    'Менеджер отдела возвратов',
    'Менеджер склада',
    'Оператор колл-центра',
    'Менеджер отдела продаж',
    'Финансовый менеджер',
    'ОТК (отдел технического контроля)',
    'SMM-менеджер',
    'Водитель',
    'Менеджер по дропшиппингу',
    'Менеджер по качеству обслуживания клиентов',
    'Менеджер маркетплейса',
    'Бухгалтер по первичной документации',
    'Руководитель отдела закупок',
    'Супервайзер отдела возвратов',
    'CEO (генеральный директор)',
    'Контент-менеджер',
    'Завсклад (заведующий складом)',
    'Системный администратор',
    'Владелец компании',
    'Помощник SMM-менеджера',
    'Руководитель отдела логистики',
    'HR-менеджер (менеджер по персоналу)',
    'Менеджер отдела маркетинга',
    'Менеджер отдела закупок',
    'CFO (финансовый директор)',
    'Оператор-учётчик'
  ];
  
  const roles = [
    { value: 'user', label: 'Пользователь', color: '#10b981' },
    { value: 'hr', label: 'HR', color: '#f59e0b' },
    { value: 'admin', label: 'Администратор', color: '#ef4444' }
  ];

  // Load employees when user rights modal opens
  useEffect(() => {
    if (!showUserRightsModal) return;
    if (!window.socket) return;

    const handleAllUsers = (users) => {
      setEmployees(users || []);
    };

    window.socket.emit('get_all_users');
    window.socket.on('all_users', handleAllUsers);

    return () => {
      window.socket.off('all_users', handleAllUsers);
    };
  }, [showUserRightsModal]);

  // Initialize dept map and role map from employees
  useEffect(() => {
    const deptMap = {};
    const roleMapLocal = {};
    (employees || []).forEach(u => {
      if (u && u.department) deptMap[u.id] = u.department;
      if (u && u.role) roleMapLocal[u.id] = u.role;
    });
    if (Object.keys(deptMap).length) setDeptMap(deptMap);
    if (Object.keys(roleMapLocal).length) setRoleMap(roleMapLocal);
  }, [employees]);

  // Department management function
  const setDepartment = async (userId, department) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/users/${userId}/department`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ department })
      });
      if (res.ok) {
        const next = { ...(deptMap || {}) };
        if (department) next[userId] = department; else delete next[userId];
        setDeptMap(next);
        if (window.socket) window.socket.emit('get_all_users');
        return true;
      }
    } catch (error) {
      console.error('Error setting department:', error);
    }
    
    // Fallback: socket event
    try {
      if (window.socket && window.socket.connected) {
        window.socket.emit('set_user_department', { userId, department });
        const next = { ...(deptMap || {}) };
        if (department) next[userId] = department; else delete next[userId];
        setDeptMap(next);
        return true;
      }
    } catch (error) {
      console.error('Socket error:', error);
    }
    
    return false;
  };

  // Role management function
  const setUserRole = async (userId, role) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        const next = { ...(roleMap || {}) };
        if (role) next[userId] = role; else delete next[userId];
        setRoleMap(next);
        if (window.socket) window.socket.emit('get_all_users');
        return true;
      }
    } catch (error) {
      console.error('Error setting role:', error);
    }
    
    // Fallback: socket event
    try {
      if (window.socket && window.socket.connected) {
        window.socket.emit('set_user_role', { userId, role });
        const next = { ...(roleMap || {}) };
        if (role) next[userId] = role; else delete next[userId];
        setRoleMap(next);
        return true;
      }
    } catch (error) {
      console.error('Socket error:', error);
    }
    
    return false;
  };

  // Единый контейнер для всех порталов
  const modalRoot = React.useMemo(() => {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('app-modal-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'app-modal-root';
      el.style.position = 'relative';
      el.style.zIndex = '10000';
      try {
        document.body.appendChild(el);
      } catch (error) {
        console.warn('Failed to append modal root:', error);
        return null;
      }
    }
    return el;
  }, []);

  // Безопасное создание портала с дополнительными проверками
  const createSafePortal = (component, condition) => {
    if (!condition || !modalRoot) return null;
    
    try {
      // Проверяем, что modalRoot все еще находится в DOM
      if (!document.body.contains(modalRoot)) {
        console.warn('Modal root not in DOM, skipping portal creation');
        return null;
      }
      return ReactDOM.createPortal(component, modalRoot);
    } catch (error) {
      console.warn('Failed to create portal:', error);
      return null;
    }
  };

  // Универсальное закрытие всех модалок (для адаптивности и UX)
  const closeAllModals = React.useCallback(() => {
    // Не закрываем модалку календаря, если она только что была открыта
    if (justOpenedGeneralCalendar.current) {
      console.log('SidebarNav: Предотвращено закрытие модалки календаря (только что открыта)');
      return;
    }
    setShowUploadModal(false);
    setShowGeneralCalendarSafe(false);
    setShowLeaveCalendar(false);
    setShowNewsModal(false);
    setShowTasksModal(false);
    setShowChatsModal(false);
    setShowChatAreaModal(false);
    setShowCreateChatModal(false);
    setShowWorkTimeModal(false);
    setShowLeavesWorktimeModal(false);
    setShowEmployeesModal(false);
    setShowBirthdaysModal(false);
    setShowTodoModal(false);
    setShowRatingModal(false);
    setPortalKey(k => k + 1);
    
    // Безопасная очистка модального контейнера
    setTimeout(() => {
      try {
        const root = document.getElementById('app-modal-root');
        if (root && root.parentNode && document.body.contains(root)) {
          // Проверяем, что элемент все еще в DOM перед очисткой
          // Дожидаемся завершения всех React обновлений
          requestAnimationFrame(() => {
            try {
              if (root && root.parentNode && document.body.contains(root)) {
                // Очищаем только если нет активных порталов
                const hasActivePortals = Array.from(root.children).some(child => 
                  child && child.parentNode === root
                );
                if (!hasActivePortals) {
                  root.innerHTML = '';
                }
              }
            } catch (innerError) {
              console.warn('Failed to clear modal root in RAF:', innerError);
            }
          });
        }
      } catch (error) {
        console.warn('Failed to clear modal root:', error);
      }
    }, 150);
  }, []);

  // Отслеживание изменения размера окна для определения мобильного устройства
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Закрытие по Esc и по глобальному событию
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeAllModals();
    };
    const onCloseAll = () => {
      // Не закрываем модалку календаря, если она только что была открыта
      if (justOpenedGeneralCalendar.current) {
        console.log('SidebarNav: onCloseAll - предотвращено закрытие модалки календаря');
        return;
      }
      closeAllModals();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('close-all-modals', onCloseAll);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('close-all-modals', onCloseAll);
    };
  }, [closeAllModals]);

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      try {
        const root = document.getElementById('app-modal-root');
        if (root && root.parentNode && document.body.contains(root)) {
          // Ждем завершения всех React операций
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              try {
                if (root && root.parentNode && document.body.contains(root)) {
                  root.innerHTML = '';
                }
              } catch (error) {
                console.warn('Failed to cleanup modal root on unmount:', error);
              }
            });
          });
        }
      } catch (error) {
        console.warn('Failed to cleanup modal root on unmount:', error);
      }
    };
  }, []);

  // Проверка, показывать ли кнопку "Отработка отгулов"
  useEffect(() => {
    const checkLeavesWorktime = async () => {
      const token = localStorage.getItem('token');
      const role = state.user?.role;
      if (role === 'hr' || role === 'admin' || role === 'руководитель') {
        setShowLeavesWorktimeButton(true);
        return;
      }
      if (!token) { setShowLeavesWorktimeButton(false); return; }
      try {
        const res = await fetch('/api/leaves-worktime-report', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setShowLeavesWorktimeButton(Array.isArray(data) && data.length > 0);
      } catch {
        setShowLeavesWorktimeButton(false);
      }
    };
    checkLeavesWorktime();
    // Подписка на событие обновления отгулов
    const handler = () => checkLeavesWorktime();
    window.addEventListener('leaves-worktime-updated', handler);
    return () => window.removeEventListener('leaves-worktime-updated', handler);
  }, [state.user]);

  // Счетчик новых новостей
  useEffect(() => {
    async function fetchNewsCount() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return dispatch({ type: 'RESET_UNREAD_NEWS' });
        const res = await fetch('/api/news', { headers: { Authorization: `Bearer ${token}` } });
        const newsArr = await res.json();
        const lastReadId = Number(localStorage.getItem('lastNewsId') || 0);
        if (newsArr && newsArr.length > 0) {
          const idx = newsArr.findIndex(n => n.id === lastReadId);
          dispatch({ type: 'SET_UNREAD_NEWS_COUNT', payload: idx === -1 ? newsArr.length : idx });
        } else {
          dispatch({ type: 'RESET_UNREAD_NEWS' });
        }
      } catch {
        dispatch({ type: 'RESET_UNREAD_NEWS' });
      }
    }
    fetchNewsCount();
    const handleNewsRead = () => fetchNewsCount();
    window.addEventListener('news-read', handleNewsRead);
    return () => window.removeEventListener('news-read', handleNewsRead);
  }, [dispatch]);

  // Получение количества заявок в статусе pending
  const fetchPendingCount = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/all-leaves', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPendingCount(data.filter(l => l.status === 'pending').length);
        }
      })
      .catch(() => setPendingCount(0));
  }, []);

  // Получение количества открытых задач для текущего пользователя
  const fetchMyTasksCount = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token || !state.user) return;
    fetch('http://localhost:5000/api/tasks/open', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Получаем просмотренные задачи
          let viewed = JSON.parse(localStorage.getItem('viewedTasks') || '[]');
          // Считаем только задачи, назначенные текущему пользователю и не просмотренные
          setMyTasksCount(data.filter(t => String(t.assignedTo) === String(state.user.id) && !viewed.includes(t.id)).length);
        }
      })
      .catch(() => setMyTasksCount(0));
  }, [state.user]);

  useEffect(() => {
    const set = (k) => () => setActive(k);
    window.addEventListener('show-chats', set('chats'));
    window.addEventListener('show-leaves', set('leaves'));
    window.addEventListener('show-tasks', set('tasks'));
    window.addEventListener('show-news', set('news'));
    window.addEventListener('show-employees', set('employees'));
    window.addEventListener('show-admin', set('admin'));
    
    // Загружаем количество заявок и задач при монтировании
    fetchPendingCount();
    fetchMyTasksCount();

    // Polling для новых сообщений в чатах
    async function fetchUnreadChats() {
      try {
        const token = localStorage.getItem('token');
        if (!token || !state.user) return dispatch({ type: 'SET_UNREAD_CHATS', payload: 0 });
        const res = await fetch('/api/chats/unread', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        // Поддерживаем оба формата ответа: массив непрочитанных или объект { unreadCount }
        const count = Array.isArray(data) ? data.length : (typeof data?.unreadCount === 'number' ? data.unreadCount : 0);
        dispatch({ type: 'SET_UNREAD_CHATS', payload: count });
      } catch {
        dispatch({ type: 'SET_UNREAD_CHATS', payload: 0 });
      }
    }

    // Обновлять каждые 5 секунд
    const interval = setInterval(() => {
      fetchPendingCount();
      fetchMyTasksCount();
      fetchUnreadChats();
    }, 5000);

    // Также обновлять при открытии календаря
    window.addEventListener('show-all-leaves', fetchPendingCount);
    window.addEventListener('show-tasks', fetchMyTasksCount);
    
    // Обработчик для модалки рейтинга
    window.addEventListener('show-employee-rating', () => setShowRatingModal(true));

    return () => {
      window.removeEventListener('show-chats', set('chats'));
      window.removeEventListener('show-leaves', set('leaves'));
      window.removeEventListener('show-tasks', set('tasks'));
      window.removeEventListener('show-news', set('news'));
      window.removeEventListener('show-employees', set('employees'));
      window.removeEventListener('show-admin', set('admin'));
      window.removeEventListener('show-all-leaves', fetchPendingCount);
      window.removeEventListener('show-tasks', fetchMyTasksCount);
      window.removeEventListener('show-employee-rating', () => setShowRatingModal(true));
      clearInterval(interval);
    };
  }, [fetchPendingCount, fetchMyTasksCount, state.user, dispatch]);

  // Admin: load local users when modal opens
  useEffect(() => {
    async function loadUsers() {
      const token = localStorage.getItem('token');
      if (!token) return;
      setAdminLoading(true);
      setAdminError('');
      try {
        // hostname (for clarity where users are created)
        try {
          const rh = await fetch('/api/admin/host', { headers: { Authorization: `Bearer ${token}` } });
          const hd = await rh.json();
          if (hd && hd.success && hd.host) setAdminHost(hd.host);
        } catch {}
        const r = await fetch('/api/admin/local-users', { headers: { Authorization: `Bearer ${token}` } });
        const data = await r.json();
        if (Array.isArray(data)) setAdminUsers(data);
        else setAdminUsers([]);
      } catch (e) {
        setAdminError('Не удалось получить пользователей: ' + e.message);
      } finally {
        setAdminLoading(false);
      }
    }
    if (showAdminModal) loadUsers();
  }, [showAdminModal]);

  async function adminCreateUser(addRdpParam) {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch('/api/admin/local-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName, password: newPassword, description: newDescription, noExpire: newNoExpire, addToRdp: (typeof addRdpParam === 'boolean' ? addRdpParam : newAddRdp) })
      });
      const data = await r.json();
      if (!r.ok || data?.success === false) throw new Error(data?.error || 'Ошибка создания');
      const createdName = newName;
      setNewName(''); setNewPassword(''); setNewDescription(''); setNewNoExpire(true); setNewAddRdp(true);
      // reload
      const rr = await fetch('/api/admin/local-users', { headers: { Authorization: `Bearer ${token}` } });
      const users = await rr.json();
      setAdminUsers(Array.isArray(users) ? users : []);
      // Явно добавить в RDP после создания, если выбрано (поверх серверной логики)
      const needAdd = (typeof addRdpParam === 'boolean' ? addRdpParam : newAddRdp);
      if (needAdd && createdName) {
        try {
          await fetch(`/api/admin/local-users/${encodeURIComponent(createdName)}/rdp`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ add: true }) });
        } catch {}
      }
      alert('Пользователь создан');
    } catch (e) {
      alert('Ошибка: ' + e.message);
    }
  }

  async function adminSetPassword(name) {
    const pwd = window.prompt('Введите новый пароль для ' + name);
    if (!pwd) return;
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(`/api/admin/local-users/${encodeURIComponent(name)}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: pwd })
      });
      const data = await r.json();
      if (!r.ok || data?.success === false) throw new Error(data?.error || 'Ошибка');
      alert('Пароль обновлен');
    } catch (e) {
      alert('Ошибка: ' + e.message);
    }
  }

  async function adminEnable(name, enable) {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(`/api/admin/local-users/${encodeURIComponent(name)}/${enable ? 'enable' : 'disable'}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      if (!r.ok || data?.success === false) throw new Error(data?.error || 'Ошибка');
      // refresh list
      const rr = await fetch('/api/admin/local-users', { headers: { Authorization: `Bearer ${token}` } });
      const users = await rr.json();
      setAdminUsers(Array.isArray(users) ? users : []);
    } catch (e) {
      alert('Ошибка: ' + e.message);
    }
  }

  async function adminDelete(name) {
    if (!window.confirm('Удалить пользователя ' + name + '?')) return;
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(`/api/admin/local-users/${encodeURIComponent(name)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      if (!r.ok || data?.success === false) throw new Error(data?.error || 'Ошибка');
      // refresh list
      const rr = await fetch('/api/admin/local-users', { headers: { Authorization: `Bearer ${token}` } });
      const users = await rr.json();
      setAdminUsers(Array.isArray(users) ? users : []);
    } catch (e) {
      alert('Ошибка: ' + e.message);
    }
  }

  async function adminRdp(name, add) {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(`/api/admin/local-users/${encodeURIComponent(name)}/rdp`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ add }) });
      const data = await r.json();
      if (!r.ok || data?.success === false) throw new Error(data?.error || 'Ошибка');
      alert(add ? 'Добавлен в группу RDP' : 'Удален из группы RDP');
    } catch (e) {
      alert('Ошибка: ' + e.message);
    }
  }

  // Пример добавления новых задач/новостей через событие:
  useEffect(() => {
    function onNewTask() { setMyTasksCount(c => c + 1); }
    function onResetTasksCount() { setMyTasksCount(0); }
    window.addEventListener('new-task', onNewTask);
    window.addEventListener('reset-tasks-count', onResetTasksCount);
    return () => {
      window.removeEventListener('new-task', onNewTask);
      window.removeEventListener('reset-tasks-count', onResetTasksCount);
    };
  }, []);

  useEffect(() => {
    function onNewsPublished(e) {
      console.log('SidebarNav: PUSH news-published', e.detail);
      dispatch({ type: 'SET_UNREAD_NEWS_COUNT', payload: state.unreadNews + 1 });
    }
    window.addEventListener('news-published', onNewsPublished);
    return () => window.removeEventListener('news-published', onNewsPublished);
  }, [state.unreadNews, dispatch]);

  const handleNavClick = (n) => {
    setActive(n.key);
    
    // Определяем, является ли это модалкой
    const isModal = ['all-leaves', 'tasks', 'news', 'todo', 'leaves', 'chats'].includes(n.key);
    
    // Для модалок: сначала открываем модалку, потом закрываем сайдбар
    // Для не-модалок: закрываем все модалки и сайдбар
    if (isModal) {
      // Для модалок: закрываем только другие модалки (не ту, которую открываем)
      // НЕ вызываем closeAllModals() и не отправляем событие close-all-modals,
      // чтобы не закрыть модалку, которую мы только что открыли
      if (n.key !== 'all-leaves') setShowGeneralCalendarSafe(false);
      if (n.key !== 'leaves') setShowLeaveCalendar(false);
      if (n.key !== 'news') setShowNewsModal(false);
      if (n.key !== 'tasks') setShowTasksModal(false);
      if (n.key !== 'todo') setShowTodoModal(false);
      if (n.key !== 'chats') {
        setShowChatsModal(false);
        setShowChatAreaModal(false);
      }
      // Закрываем остальные модалки
      setShowUploadModal(false);
      setShowWorkTimeModal(false);
      setShowLeavesWorktimeModal(false);
      setShowEmployeesModal(false);
      setShowBirthdaysModal(false);
      setShowRatingModal(false);
      
      // Открываем нужную модалку сразу
      switch (n.key) {
        case 'all-leaves':
          fetchPendingCount();
          // Устанавливаем флаг, что мы только что открыли модалку
          justOpenedGeneralCalendar.current = true;
          console.log('SidebarNav: Открываем модалку календаря, устанавливаем защиту');
          // Открываем модалку синхронно, чтобы она точно открылась
          setShowGeneralCalendar(true);
          // Сбрасываем флаг через задержку, чтобы защитить от случайного закрытия
          setTimeout(() => {
            console.log('SidebarNav: Снимаем защиту с модалки календаря');
            justOpenedGeneralCalendar.current = false;
          }, 500);
          break;
        case 'leaves':
          if (isMobile) {
            requestAnimationFrame(() => {
              setShowLeaveCalendar(true);
            });
          } else {
            requestAnimationFrame(() => {
              setShowLeaveCalendar(true);
            });
          }
          break;
        case 'news':
          if (isMobile) {
            requestAnimationFrame(() => {
              setShowNewsModal(true);
            });
          } else {
            requestAnimationFrame(() => {
              setShowNewsModal(true);
            });
          }
          dispatch({ type: 'RESET_UNREAD_NEWS' });
          fetch('/api/news', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            .then(r => r.json())
            .then(newsArr => {
              if (Array.isArray(newsArr) && newsArr.length > 0) {
                localStorage.setItem('lastNewsId', String(newsArr[0].id));
              }
            });
          break;
        case 'tasks':
          requestAnimationFrame(() => {
            setShowTasksModal(true);
          });
          setMyTasksCount(0);
          setTimeout(() => fetchMyTasksCount(), 300);
          break;
        case 'todo':
          requestAnimationFrame(() => {
            setShowTodoModal(true);
          });
          break;
        case 'chats':
          if (isMobile) {
            requestAnimationFrame(() => {
              setShowChatsModal(true);
            });
          } else {
            // Для десктопной версии: открываем ChatArea и модалку чатов
            // Сначала открываем ChatArea через событие show-chat
            window.dispatchEvent(new CustomEvent('show-chat'));
            // Небольшая задержка, чтобы ChatArea успел отрендериться
            setTimeout(() => {
              dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'chatsList', show: true } });
            }, 100);
          }
          break;
        default:
          break;
      }
      
      // Закрываем мобильный сайдбар после задержки, чтобы модалка успела открыться
      if (onCloseMobileSidebar) {
        setTimeout(() => {
          onCloseMobileSidebar();
        }, 100);
      }
    } else {
      // Для не-модалок: закрываем все модалки и сайдбар
      try { window.dispatchEvent(new Event('close-all-modals')); } catch {}
      closeAllModals();
      if (onCloseMobileSidebar) {
        onCloseMobileSidebar();
      }
      // Переключаем основной контент
      window.dispatchEvent(new CustomEvent(n.event));
    }
    
    // Обработка остальных случаев (для не-модалок)
    if (!isModal) {
      switch (n.key) {
      case 'employees':
        // Для обычных пользователей показываем только рейтинг, для админов/HR - полную модалку
        const userRole = appState.user?.role;
        if (userRole === 'user') {
          // Обычные пользователи видят только рейтинг
          window.dispatchEvent(new Event('show-employee-rating'));
        } else {
          // Админы и HR видят полную модалку с функциями сотрудников (список, дни рождения, календарь, рейтинг)
          if (isMobile) {
            requestAnimationFrame(() => {
              setShowBirthdaysModal(true);
            });
          } else {
            setTimeout(() => setShowBirthdaysModal(true), 0);
          }
        }
        break;
      case 'chats':
        if (isMobile) {
          requestAnimationFrame(() => {
            setShowChatsModal(true);
          });
        } else {
          // Для десктопной версии: открываем ChatArea и модалку чатов
          window.dispatchEvent(new CustomEvent('show-chat'));
          dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'chatsList', show: true } });
        }
        break;
      case 'ai':
        window.dispatchEvent(new CustomEvent('show-ai'));
        break;
      case 'worktime':
        if (isMobile) {
          requestAnimationFrame(() => {
            setShowWorkTimeModal(true);
          });
        } else {
          setTimeout(() => setShowWorkTimeModal(true), 0);
        }
        break;
      case 'leaves-worktime':
        setTimeout(() => setShowLeavesWorktimeModal(true), 0);
        break;
      case 'admin':
        setTimeout(() => setShowAdminModal(true), 0);
        break;
      default:
        break;
      }
    }
  };

  return (
    <>
      <div style={{marginTop:20, display:'flex', flexDirection:'column', gap:8}}>
        {navs.map(n => {
          // Кнопка "Мониторинг времени" только для HR и админа
          if (n.key === 'worktime') {
            const role = state.user?.role;
            if (role !== 'hr' && role !== 'admin') return null;
          }
          // Кнопка "Управление" для пользователей с департаментом
          if (n.key === 'admin') {
            const department = state.user?.department;
            if (!department) return null;
          }
          // Кнопка "Сотрудники компании" доступна всем пользователям
          if (n.key === 'leaves-worktime' && !showLeavesWorktimeButton) return null;
          return (
            <button
              key={n.key}
              style={{
                width:'100%',
                padding:10,
                borderRadius:10,
                background: active===n.key ? n.color : '#232931',
                color: active===n.key ? (n.key==='tasks'? '#fff':'#222') : '#fff',
                fontWeight:600,
                border:'none',
                cursor:'pointer',
                display:'flex',
                alignItems:'center',
                gap:10,
                fontSize:'1.08em',
                boxShadow: active===n.key ? '0 2px 8px #43e97b33' : 'none',
                transition:'all .18s',
                outline: active===n.key ? '2px solid #43e97b' : 'none',
                position:'relative'
              }}
              title={n.tip}
              onClick={() => handleNavClick(n)}
            >
              {n.icon} {n.label}
              {n.key === 'all-leaves' && pendingCount > 0 && (
                <Badge>{pendingCount}</Badge>
              )}
              {n.key === 'tasks' && myTasksCount > 0 && (
                <Badge>{myTasksCount}</Badge>
              )}
              {n.key === 'news' && state.unreadNews > 0 && (
                <Badge style={{background:'#e74c3c',color:'#fff'}}>{state.unreadNews}</Badge>
              )}
              {n.key === 'chats' && state.unreadChats > 0 && (
                <Badge style={{background:'#43e97b',color:'#fff'}}>{state.unreadChats}</Badge>
              )}
            </button>
          );
        })}
      </div>
      <SidebarUploadButton onClick={() => setShowUploadModal(true)} />
      
      {createSafePortal(
        isMobile ? (
          <UploadModalMobile
            key={`upload-mobile-${portalKey}`}
            open={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onOpenMobileSidebar={onOpenMobileSidebar}
          />
        ) : (
          <UploadModal key={`upload-${portalKey}`} open={showUploadModal} onClose={() => setShowUploadModal(false)} />
        ),
        showUploadModal
      )}
      
      {createSafePortal(
        isMobile ? (
          <AllLeavesCalendarMobile key={`all-leaves-mobile-${portalKey}`} open={showGeneralCalendar} onClose={()=>setShowGeneralCalendarSafe(false)} token={localStorage.getItem('token')} onOpenMobileSidebar={onOpenMobileSidebar} />
        ) : (
          <AllLeavesCalendar key={`all-leaves-${portalKey}`} open={showGeneralCalendar} onClose={()=>setShowGeneralCalendarSafe(false)} token={localStorage.getItem('token')} />
        ),
        showGeneralCalendar
      )}
      
      {createSafePortal(
        isMobile ? (
          <LeavesMobile 
            key={`leaves-mobile-${portalKey}`} 
            open={showLeaveCalendar} 
            onClose={()=>setShowLeaveCalendar(false)} 
            token={localStorage.getItem('token')} 
            onOpenMobileSidebar={onOpenMobileSidebar} 
          />
        ) : (
          <LeaveCalendarModal key={`leave-${portalKey}`} open={showLeaveCalendar} onClose={()=>setShowLeaveCalendar(false)} leaves={[]} />
        ),
        showLeaveCalendar
      )}
      
      {/* Мобильная версия модалки чатов */}
      {isMobile && createSafePortal(
        <ChatsListModalMobile 
          key={`chats-mobile-${portalKey}`} 
          open={showChatsModal} 
          onClose={()=>setShowChatsModal(false)} 
          onOpenMobileSidebar={onOpenMobileSidebar}
          onOpenChat={() => {
            setShowChatsModal(false);
            setShowChatAreaModal(true);
          }}
          onOpenCreateChat={() => {
            setShowChatsModal(false);
            setShowCreateChatModal(true);
          }}
        />,
        showChatsModal
      )}
      
      {/* Мобильная версия модалки создания чата */}
      {isMobile && createSafePortal(
        <CreateChatModalMobile
          key={`create-chat-mobile-${portalKey}`}
          open={showCreateChatModal}
          onClose={() => setShowCreateChatModal(false)}
          onOpenChatsList={() => {
            setShowCreateChatModal(false);
            setShowChatsModal(true);
          }}
        />,
        showCreateChatModal
      )}
      
      {/* Десктопная версия модалки чатов рендерится в ChatArea.jsx через state.modals.chatsList */}
      
      {createSafePortal(
        isMobile ? (
          <ChatAreaMobile 
            key={`chat-area-mobile-${portalKey}`} 
            open={showChatAreaModal} 
            onClose={()=>setShowChatAreaModal(false)}
            onOpenChatsList={() => {
              setShowChatAreaModal(false);
              setShowChatsModal(true);
            }}
          />
        ) : null,
        showChatAreaModal && isMobile
      )}
      
      {createSafePortal(
        isMobile ? (
          <NewsMobile 
            key={`news-mobile-${portalKey}`} 
            open={showNewsModal} 
            onClose={() => setShowNewsModal(false)} 
            onOpenMobileSidebar={onOpenMobileSidebar} 
          />
        ) : (
          <NewsModal key={`news-${portalKey}`} open={showNewsModal} onClose={() => setShowNewsModal(false)} />
        ),
        showNewsModal
      )}
      
      {createSafePortal(
        isMobile ? (
          <TasksMobile 
            key={`tasks-mobile-${portalKey}`} 
            open={showTasksModal} 
            onClose={() => setShowTasksModal(false)} 
            onOpenMobileSidebar={onOpenMobileSidebar} 
          />
        ) : (
          <TasksModal key={`tasks-${portalKey}`} open={showTasksModal} onClose={() => setShowTasksModal(false)} />
        ),
        showTasksModal
      )}
      
      {createSafePortal(
        isMobile ? (
          <TodoMobile 
            key={`todo-mobile-${portalKey}`} 
            open={showTodoModal} 
            onClose={() => setShowTodoModal(false)} 
            onOpenMobileSidebar={onOpenMobileSidebar} 
          />
        ) : (
          <TodoModal key={`todo-${portalKey}`} open={showTodoModal} onClose={() => setShowTodoModal(false)} />
        ),
        showTodoModal
      )}
      
      {createSafePortal(
        isMobile ? (
          <RatingMobile 
            key={`rating-mobile-${portalKey}`} 
            open={showRatingModal} 
            onClose={() => setShowRatingModal(false)} 
            onOpenMobileSidebar={onOpenMobileSidebar} 
          />
        ) : (
          <EmployeeRatingModal key={`rating-${portalKey}`} isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} />
        ),
        showRatingModal
      )}
      
      {createSafePortal(
        isMobile ? (
          <WorkTimeMobile
            key={`worktime-mobile-${portalKey}`}
            open={showWorkTimeModal}
            onClose={() => setShowWorkTimeModal(false)}
            onOpenMobileSidebar={onOpenMobileSidebar}
          />
        ) : (
          <WorkTimeReportModal key={`worktime-${portalKey}`} isOpen={showWorkTimeModal} onRequestClose={() => setShowWorkTimeModal(false)} />
        ),
        showWorkTimeModal
      )}
      
      {createSafePortal(
        isMobile ? (
          <LeavesWorktimeMobile 
            key={`leaves-worktime-mobile-${portalKey}`} 
            open={showLeavesWorktimeModal} 
            onClose={() => setShowLeavesWorktimeModal(false)} 
            token={localStorage.getItem('token')}
            onOpenMobileSidebar={onOpenMobileSidebar}
          />
        ) : (
          <LeavesWorktimeModal key={`leaves-worktime-${portalKey}`} isOpen={showLeavesWorktimeModal} onRequestClose={() => setShowLeavesWorktimeModal(false)} token={localStorage.getItem('token')} />
        ),
        showLeavesWorktimeModal
      )}
      {createSafePortal(
        isMobile ? (
          <AdminMobile
            key={`admin-mobile-${portalKey}`}
            open={showAdminModal}
            onClose={() => setShowAdminModal(false)}
            onOpenMobileSidebar={onOpenMobileSidebar}
            onOpenEmojiSettings={() => setShowEmojiSettingsModal(true)}
            onOpenTemplates={() => setShowTemplatesModal(true)}
            onOpenAppTitleSettings={() => setShowAppTitleSettingsModal(true)}
            onOpenUserRights={() => setShowUserRightsModal(true)}
          />
        ) : (
          <div
            style={{
              position:'fixed',
              top:0,
              left:0,
              right:0,
              bottom:0,
              backgroundColor:'rgba(0, 0, 0, 0.7)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              zIndex:200002,
              padding:'20px',
              paddingLeft:'350px'
            }}
            onClick={()=>setShowAdminModal(false)}
          >
          <div style={{
            backgroundColor:'#1f2937',
            borderRadius:'16px',
            padding:'24px',
            width:'100%',
            maxWidth:'1150px',
            maxHeight:'94vh',
            overflow:'auto',
            border:'1px solid rgba(75, 85, 99, 0.3)',
            color:'#fff'
          }} onClick={e=>e.stopPropagation()}>
            {/* Заголовок */}
            <div style={{
              display:'flex',
              justifyContent:'space-between',
              alignItems:'center',
              marginBottom:'24px'
            }}>
              <h2 style={{ margin:0, fontWeight:900, fontSize:'1.8em', color:'#a3e635' }}>Управление</h2>
              <button
                onClick={()=>setShowAdminModal(false)}
                style={{
                  background:'none',
                  border:'none',
                  color:'#9ca3af',
                  cursor:'pointer',
                  fontSize:'1.5rem',
                  padding:'4px'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Информация о хосте */}
            <div style={{
              backgroundColor:'rgba(59, 130, 246, 0.1)',
              border:'1px solid rgba(59, 130, 246, 0.3)',
              borderRadius:'8px',
              padding:'12px',
              marginBottom:'20px',
              color:'#93c5fd'
            }}>
              <strong>Хост:</strong> <span style={{color:'#b2ffb2', fontWeight:700}}>{adminHost || '...'}</span>
            </div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', marginBottom:16 }}>
              {state.user?.role === 'admin' && (
                <button
                  onClick={() => setShowEmojiSettingsModal(true)}
                  style={{
                    padding:'12px 16px',
                    borderRadius:12,
                    border:'1px solid rgba(255,193,7,0.45)',
                    background:'rgba(255,193,7,0.18)',
                    color:'#ffd43b',
                    cursor:'pointer',
                    fontWeight:700,
                    display:'inline-flex',
                    alignItems:'center',
                    gap:8
                  }}
                  title="Настройки эмодзи"
                >
                  <FiSmile size={18} /> Управление эмодзи
                </button>
              )}
              <button
                onClick={() => setShowTemplatesModal(true)}
                style={{
                  padding:'12px 16px',
                  borderRadius:12,
                  border:'1px solid rgba(59,130,246,0.45)',
                  background:'rgba(59,130,246,0.18)',
                  color:'#93c5fd',
                  cursor:'pointer',
                  fontWeight:700,
                display:'inline-flex',
                alignItems:'center',
                gap:8
              }}
              title="Управление шаблонами сообщений"
            >
              <FiFileText size={18} /> Шаблоны
            </button>
            <button
              onClick={() => setShowAppTitleSettingsModal(true)}
              style={{
                padding:'12px 16px',
                borderRadius:12,
                border:'1px solid rgba(163,230,53,0.45)',
                background:'rgba(163,230,53,0.18)',
                color:'#a3e635',
                cursor:'pointer',
                fontWeight:700,
                display:'inline-flex',
                alignItems:'center',
                gap:8
              }}
              title="Управление названием приложения"
            >
              <FiSettings size={18} /> Управление названием приложения
            </button>
            {(state.user?.role === 'admin' || state.user?.role === 'hr') && (
              <button
                onClick={() => setShowUserRightsModal(true)}
                style={{
                  display:'inline-flex',
                  alignItems:'center',
                  gap:8,
                  padding:'10px 14px',
                  borderRadius:10,
                  border:'1px solid rgba(139,69,255,0.35)',
                  background:'rgba(139,69,255,0.15)',
                  color:'#c084fc',
                  cursor:'pointer',
                  fontSize:'0.95em',
                  fontWeight:600,
                  transition:'all 0.2s ease',
                  alignItems:'center',
                  gap:8
                }}
                title="Права пользователей"
              >
                <FiSettings size={18} /> Права пользователей
              </button>
            )}
            {state.user?.role === 'admin' && (
              <button
                onClick={async () => {
                  if (!window.confirm('Вы уверены, что хотите завершить все сеансы 1С?')) return;
                  const token = localStorage.getItem('token');
                  try {
                    const response = await fetch('/api/admin/shutdown-1c', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data?.success) {
                      alert(data?.message || 'Команда выполнена успешно');
                    } else {
                      alert('Ошибка: ' + (data?.error || 'неизвестно'));
                    }
                  } catch (error) {
                    alert('Ошибка запроса: ' + error.message);
                  }
                }}
                style={{
                  padding:'12px 16px',
                  borderRadius:12,
                  border:'1px solid rgba(239,68,68,0.45)',
                  background:'rgba(239,68,68,0.18)',
                  color:'#fecaca',
                  cursor:'pointer',
                  fontWeight:700,
                  display:'inline-flex',
                  alignItems:'center',
                  gap:8
                }}
                title="Завершить сеансы 1С"
              >
                <FiAlertTriangle size={18} /> Выбросить всех с 1С
              </button>
            )}
            {state.user?.role === 'admin' && (
                <>
                  <button
                    onClick={async ()=>{
                      const token = localStorage.getItem('token');
                      try {
                        setAdminLoading(true);
                        const r = await fetch('/api/admin/local-users', { headers: { Authorization: `Bearer ${token}` } });
                        const data = await r.json();
                        setAdminUsers(Array.isArray(data) ? data : []);
                      } catch (e) {
                        alert('Ошибка обновления списка: ' + e.message);
                      } finally { setAdminLoading(false); }
                    }}
                    style={{
                      padding:'12px 16px',
                      borderRadius:12,
                      border:'1px solid rgba(67,233,123,0.35)',
                      background:'rgba(67,233,123,0.15)',
                      color:'#b2ffb2',
                      cursor:'pointer',
                      fontWeight:700
                    }}
                  >Обновить список пользователей</button>
                  <div style={{flex:1}} />
                  <input
                    value={adminFilter}
                    onChange={e=>setAdminFilter(e.target.value)}
                    placeholder="Поиск пользователя..."
                    style={{padding:'10px 12px', borderRadius:10, border:'1px solid #2f3440', background:'#0e1420', color:'#fff', minWidth:240}}
                  />
                  <select
                    value={adminEnabledFilter}
                    onChange={e=>setAdminEnabledFilter(e.target.value)}
                    title="Фильтр по статусу"
                    style={{padding:'10px 12px', borderRadius:10, border:'1px solid #2f3440', background:'#0e1420', color:'#fff'}}
              >
                <option value="all">Все</option>
                <option value="enabled">Включен</option>
                <option value="disabled">Отключен</option>
              </select>
                </>
              )}
            </div>
            {state.user?.role === 'admin' && (
            <div style={{
              display:'grid',
              gridTemplateColumns:'minmax(320px, 0.9fr) minmax(520px, 1.4fr)',
              gap:16,
              marginBottom:16
            }}>
              <div style={{
                background:'rgba(255,255,255,0.04)',
                borderRadius:16,
                padding:16
              }}>
                <h3 style={{marginTop:0, color:'#fff'}}>Создать локального пользователя</h3>
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Имя пользователя" style={{padding:12, fontSize:16, borderRadius:10, border:'1px solid #333', background:'#111', color:'#fff'}} />
                  <input type="text" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Пароль" style={{padding:12, fontSize:16, borderRadius:10, border:'1px solid #333', background:'#111', color:'#fff'}} />
                  <input value={newDescription} onChange={e=>setNewDescription(e.target.value)} placeholder="Описание" style={{padding:12, fontSize:16, borderRadius:10, border:'1px solid #333', background:'#111', color:'#fff'}} />
                  <label style={{display:'flex', alignItems:'center', gap:8, color:'#ddd'}}>
                    <input type="checkbox" checked={newNoExpire} onChange={e=>setNewNoExpire(e.target.checked)} />
                    Пароль не истекает
                  </label>
                  <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                    <button onClick={()=>adminCreateUser(false)} style={{
                      padding:'12px 16px', fontSize:16, borderRadius:10, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', cursor:'pointer'
                    }}>Создать</button>
                    <button onClick={()=>adminCreateUser(true)} style={{
                      padding:'12px 16px', fontSize:16, borderRadius:10, border:'1px solid rgba(67,233,123,0.35)', background:'rgba(67,233,123,0.15)', color:'#b2ffb2', cursor:'pointer', fontWeight:700
                    }}>Создать и добавить в RDP</button>
                  </div>
                </div>
              </div>
              <div style={{
                background:'rgba(255,255,255,0.04)',
                borderRadius:16,
                padding:16,
                display:'flex',
                flexDirection:'column',
                minHeight:480
              }}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                  <h3 style={{marginTop:0, color:'#fff'}}>Локальные пользователи</h3>
                  {adminLoading && <div style={{color:'#aaa'}}>Загрузка...</div>}
                </div>
                {adminError && <div style={{color:'#fca5a5'}}>{adminError}</div>}
                <div style={{flex:1, overflowY:'auto', overflowX:'hidden', maxHeight:'60vh', WebkitOverflowScrolling:'touch', borderRadius:12, border:'1px solid #2a2f37'}}>
                  <table style={{width:'100%', borderCollapse:'separate', borderSpacing:0}}>
                    <thead>
                      <tr style={{textAlign:'left', color:'#b2bec3', position:'sticky', top:0, background:'#111827', zIndex:1}}>
                        <th style={{padding:'10px 12px', fontWeight:700}}>Имя</th>
                        <th style={{padding:'10px 12px', fontWeight:700}}>Статус</th>
                        <th style={{padding:'10px 12px', fontWeight:700}}>Описание</th>
                        <th style={{padding:'10px 12px', fontWeight:700, width:360}}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers
                        .filter(u => !adminFilter || (u?.Name || '').toLowerCase().includes(adminFilter.toLowerCase()))
                        .filter(u => {
                          if (adminEnabledFilter === 'all') return true;
                          if (adminEnabledFilter === 'enabled') return !!u?.Enabled;
                          return !u?.Enabled;
                        })
                        .map((u, idx) => (
                        <tr
                          key={`${u.Name || 'user'}-${idx}`}
                          style={{
                            borderTop:'1px solid #2a2f37',
                            borderBottom:'1px solid #2a2f37',
                            background: idx % 2 === 0 ? '#0f1424' : '#0b1120'
                          }}
                          onMouseEnter={e=>{ e.currentTarget.style.background = '#111a2e'; }}
                          onMouseLeave={e=>{ e.currentTarget.style.background = (idx % 2 === 0 ? '#0f1424' : '#0b1120'); }}
                        >
                          <td style={{padding:'12px 14px', color:'#fff', whiteSpace:'nowrap', borderLeft:'3px solid #1f2937'}} title={u.Name}>{u.Name}</td>
                          <td style={{padding:'12px 14px'}}>
                            <span style={{color: u.Enabled ? '#b2ffb2' : '#fca5a5'}}>{u.Enabled ? 'Включен' : 'Отключен'}</span>
                          </td>
                          <td style={{padding:'12px 14px', color:'#ddd'}} title={u.Description || ''}>{u.Description || ''}</td>
                          <td style={{padding:'12px 14px'}}>
                            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                              <button onClick={()=>setEditRow({ name: u.Name, originalName: u.Name, description: u.Description || '', password: u.password || '', noExpire: false, enabled: u.Enabled })} style={{padding:'8px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#93c5fd', cursor:'pointer'}}>Изменить</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
        ),
        showAdminModal
      )}
      {/* Модалка редактирования пользователя - только для десктопа */}
      {!isMobile && createSafePortal(
        editRow && (
          <div style={{position:'fixed', inset:0, zIndex:200003, display:'flex', alignItems:'center', justifyContent:'center'}}>
            <div onClick={()=>setEditRow(null)} style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.75)'}} />
            <div style={{position:'relative', width:'min(720px, 96vw)', background:'linear-gradient(135deg, #232931 0%, #181c22 100%)', borderRadius:20, padding:20, boxShadow:'0 10px 40px rgba(0,0,0,0.4)', color:'#fff'}} onClick={e=>e.stopPropagation()}>
              <button onClick={()=>setEditRow(null)} style={{position:'absolute', top:10, right:10, background:'transparent', border:'none', color:'#fff', fontSize:24, cursor:'pointer'}}>×</button>
              <h3 style={{marginTop:0, marginBottom:14, fontWeight:900}}>Изменить пользователя</h3>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <div>
                  <label style={{display:'block', fontSize:12, color:'#9ca3af', marginBottom:6}}>Новое имя</label>
                  <input value={editRow.name} onChange={e=>setEditRow({...editRow, name:e.target.value})} style={{width:'100%', padding:12, borderRadius:10, border:'1px solid #2f3440', background:'#0e1420', color:'#fff'}} />
                </div>
                <div>
                  <label style={{display:'block', fontSize:12, color:'#9ca3af', marginBottom:6}}>Описание</label>
                  <input value={editRow.description} onChange={e=>setEditRow({...editRow, description:e.target.value})} style={{width:'100%', padding:12, borderRadius:10, border:'1px solid #2f3440', background:'#0e1420', color:'#fff'}} />
                </div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:10}}>
                <div>
                  <label style={{display:'block', fontSize:12, color:'#9ca3af', marginBottom:6}}>Новый пароль (по желанию)</label>
                  <input type="text" value={editRow.password || ''} onChange={e=>setEditRow({...editRow, password:e.target.value})} style={{width:'100%', padding:12, borderRadius:10, border:'1px solid #2f3440', background:'#0e1420', color:'#fff'}} />
                </div>
                <div>
                  <label style={{display:'block', fontSize:12, color:'#9ca3af', marginBottom:6}}>Членство в RDP</label>
                  <div style={{display:'flex', gap:8}}>
                    <button onClick={async()=>{ try { const t = localStorage.getItem('token'); await fetch(`/api/admin/local-users/${encodeURIComponent(editRow.name)}/rdp`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${t}` }, body: JSON.stringify({ add: true }) }); alert('Добавлен в RDP'); } catch(e){ alert('Ошибка: '+e.message); } }} style={{padding:'8px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#b2ffb2', cursor:'pointer'}}>Добавить</button>
                    <button onClick={async()=>{ try { const t = localStorage.getItem('token'); await fetch(`/api/admin/local-users/${encodeURIComponent(editRow.name)}/rdp`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${t}` }, body: JSON.stringify({ add: false }) }); alert('Убран из RDP'); } catch(e){ alert('Ошибка: '+e.message); } }} style={{padding:'8px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fecaca', cursor:'pointer'}}>Убрать</button>
                  </div>
                </div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:10, color:'#ddd', marginTop:10}}>
                <label style={{display:'flex', alignItems:'center', gap:8}}>
                  <input type="checkbox" checked={!!editRow.noExpire} onChange={e=>setEditRow({...editRow, noExpire:e.target.checked})} /> Пароль не истекает
                </label>
                <button
                  onClick={async ()=>{
                    try {
                      const token = localStorage.getItem('token');
                      await fetch(`/api/admin/local-users/${encodeURIComponent(editRow.name)}/no-expire`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ noExpire: true }) });
                      alert('Флаг «пароль не истекает» установлен');
                    } catch(e){ alert('Ошибка: '+e.message); }
                  }}
                  style={{padding:'8px 12px', borderRadius:8, border:'1px solid rgba(67,233,123,0.35)', background:'rgba(67,233,123,0.12)', color:'#b2ffb2', cursor:'pointer'}}
                >Применить сейчас</button>
              </div>
              <div style={{display:'flex', gap:10, marginTop:16, justifyContent:'space-between'}}>
                <div style={{display:'flex', gap:8}}>
                  {editRow.enabled ? (
                    <button onClick={async ()=>{ try { const t = localStorage.getItem('token'); await fetch(`/api/admin/local-users/${encodeURIComponent(editRow.name)}/disable`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${t}` } }); alert('Пользователь отключен'); setEditRow({...editRow, enabled: false}); try { const r = await fetch('/api/admin/local-users', { headers: { Authorization: `Bearer ${t}` } }); const users = await r.json(); setAdminUsers(Array.isArray(users) ? users : []); } catch {} } catch(e){ alert('Ошибка: '+e.message); } }} style={{padding:'10px 14px', borderRadius:10, border:'1px solid rgba(239,68,68,0.35)', background:'rgba(239,68,68,0.15)', color:'#fecaca', cursor:'pointer'}}>Отключить</button>
                  ) : (
                    <button onClick={async ()=>{ try { const t = localStorage.getItem('token'); await fetch(`/api/admin/local-users/${encodeURIComponent(editRow.name)}/enable`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${t}` }, body: JSON.stringify({ enabled: true }) }); alert('Пользователь включен'); setEditRow({...editRow, enabled: true}); } catch(e){ alert('Ошибка: '+e.message); } }} style={{padding:'10px 14px', borderRadius:10, border:'1px solid rgba(67,233,123,0.35)', background:'rgba(67,233,123,0.15)', color:'#b2ffb2', cursor:'pointer'}}>Включить</button>
                  )}
                  <button onClick={async ()=>{ if(confirm('Удалить пользователя? Это действие нельзя отменить.')){ try { const t = localStorage.getItem('token'); await fetch(`/api/admin/local-users/${encodeURIComponent(editRow.name)}`, { method:'DELETE', headers:{ Authorization:`Bearer ${t}` } }); alert('Пользователь удален'); setEditRow(null); const r = await fetch('/api/admin/local-users', { headers: { Authorization: `Bearer ${t}` } }); const users = await r.json(); setAdminUsers(Array.isArray(users) ? users : []); } catch(e){ alert('Ошибка: '+e.message); } } }} style={{padding:'10px 14px', borderRadius:10, border:'1px solid rgba(239,68,68,0.45)', background:'rgba(239,68,68,0.18)', color:'#fecaca', cursor:'pointer'}}>Удалить</button>
                </div>
                <div style={{display:'flex', gap:10}}>
                  <button onClick={()=>setEditRow(null)} style={{padding:'10px 14px', borderRadius:10, border:'1px solid #374151', background:'#111827', color:'#e5e7eb', cursor:'pointer'}}>Отмена</button>
                <button onClick={async ()=>{
                  const token = localStorage.getItem('token');
                  try {
                    // Определяем актуальное имя пользователя (может измениться после переименования)
                    let currentUserName = editRow.name;
                    
                    // Если имя изменилось, сначала переименовываем
                    if (editRow.name && editRow.name !== (editRow.originalName || '')) {
                      const renameRes = await fetch(`/api/admin/local-users/${encodeURIComponent(editRow.originalName)}/rename`, { 
                        method:'POST', 
                        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, 
                        body: JSON.stringify({ newName: editRow.name }) 
                      });
                      if (!renameRes.ok) {
                        const errorData = await renameRes.json().catch(() => ({ message: 'Ошибка переименования' }));
                        throw new Error(errorData.message || `Ошибка переименования: ${renameRes.status}`);
                      }
                      currentUserName = editRow.name;
                    }
                    
                    // Обновляем описание
                    const descRes = await fetch(`/api/admin/local-users/${encodeURIComponent(currentUserName)}/description`, { 
                      method:'POST', 
                      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, 
                      body: JSON.stringify({ description: editRow.description || '' }) 
                    });
                    if (!descRes.ok) {
                      const errorData = await descRes.json().catch(() => ({ message: 'Ошибка обновления описания' }));
                      throw new Error(errorData.message || `Ошибка обновления описания: ${descRes.status}`);
                    }
                    
                    // Обновляем флаг no-expire
                    const noExpireRes = await fetch(`/api/admin/local-users/${encodeURIComponent(currentUserName)}/no-expire`, { 
                      method:'POST', 
                      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, 
                      body: JSON.stringify({ noExpire: !!editRow.noExpire }) 
                    });
                    if (!noExpireRes.ok) {
                      const errorData = await noExpireRes.json().catch(() => ({ message: 'Ошибка обновления флага no-expire' }));
                      throw new Error(errorData.message || `Ошибка обновления флага no-expire: ${noExpireRes.status}`);
                    }
                    
                    // Обновляем пароль, если он указан
                    if ((editRow.password || '').trim().length > 0) {
                      const passwordRes = await fetch(`/api/admin/local-users/${encodeURIComponent(currentUserName)}/password`, { 
                        method:'POST', 
                        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, 
                        body: JSON.stringify({ password: editRow.password.trim() }) 
                      });
                      if (!passwordRes.ok) {
                        const errorData = await passwordRes.json().catch(() => ({ error: 'Ошибка изменения пароля' }));
                        throw new Error(errorData.error || errorData.message || `Ошибка изменения пароля: ${passwordRes.status}`);
                      }
                    }
                    
                    // Обновляем список пользователей
                    const r = await fetch('/api/admin/local-users', { headers: { Authorization: `Bearer ${token}` } });
                    if (!r.ok) {
                      throw new Error(`Ошибка загрузки списка пользователей: ${r.status}`);
                    }
                    const users = await r.json();
                    setAdminUsers(Array.isArray(users) ? users : []);
                    setEditRow(null);
                    alert('Изменения сохранены успешно');
                  } catch (e) {
                    alert('Ошибка сохранения: ' + e.message);
                    console.error('Ошибка сохранения пользователя:', e);
                  }
                }} style={{padding:'10px 14px', borderRadius:10, border:'1px solid rgba(67,233,123,0.35)', background:'rgba(67,233,123,0.15)', color:'#b2ffb2', cursor:'pointer', fontWeight:700}}>Сохранить</button>
                </div>
              </div>
            </div>
          </div>
        ),
        !!editRow
      )}
      {createSafePortal(
        isMobile ? (
          <EmployeesMobile 
            key={`employees-mobile-${portalKey}`} 
            open={showEmployeesModal} 
            onClose={() => setShowEmployeesModal(false)} 
            onOpenMobileSidebar={onOpenMobileSidebar} 
          />
        ) : (
          <EmployeesListModal key={`employees-${portalKey}`} open={showEmployeesModal} onClose={() => setShowEmployeesModal(false)} />
        ),
        showEmployeesModal
      )}
      {createSafePortal(
        isMobile ? (
          <CongratulationsMobile 
            key={`congratulations-mobile-${portalKey}`} 
            open={showBirthdaysModal} 
            onClose={() => setShowBirthdaysModal(false)} 
            onOpenMobileSidebar={onOpenMobileSidebar} 
          />
        ) : (
          <div
            style={{
              position:'fixed',
              top:0,
              left:'calc(380px + max((100vw - 380px - 1200px)/2, 0px))',
              width:'1170px',
              minWidth:'600px',
              maxWidth:'1170px',
              height:'92vh',
              margin:'32px 0',
              zIndex:100000,
              background:'transparent',
              display:'flex',
              alignItems:'center',
              justifyContent:'flex-start',
              pointerEvents:'auto'
            }}
            onClick={()=>setShowBirthdaysModal(false)}
          >
            <div style={{
              background:'linear-gradient(135deg, #232931 0%, #181c22 100%)',
              borderRadius:'28px',
              width:'100%',
              minWidth:'600px',
              maxWidth:'1200px',
              height:'100%',
              boxSizing:'border-box',
              boxShadow:'0 4px 32px rgba(0,0,0,0.15)',
              display:'flex',
              flexDirection:'column',
              position:'relative',
              color:'#fff',
              padding:'0',
              overflow:'hidden'
            }} onClick={e=>e.stopPropagation()}>
              <button
                onClick={()=>setShowBirthdaysModal(false)}
                style={{
                  position:'absolute',
                  top:16,
                  right:16,
                  fontSize:28,
                  background:'transparent',
                  border:'none',
                  cursor:'pointer',
                  color:'#fff',
                  fontWeight:'bold',
                  width:36,
                  height:36,
                  borderRadius:'50%',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  transition:'background-color 0.3s, color 0.3s'
                }}
                onMouseEnter={e=>{ e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.18)'; e.currentTarget.style.color = '#43e97b'; }}
                onMouseLeave={e=>{ e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#fff'; }}
                aria-label="Close modal"
              >
                ×
              </button>
              <div style={{width:'100%', height:'100%', background:'#fff', color:'#111', overflow:'auto'}}>
                <CongratulationsModal onClose={() => setShowBirthdaysModal(false)} />
              </div>
            </div>
          </div>
        ),
        showBirthdaysModal
      )}
      {createSafePortal(
        <EmojiSettingsModal 
          key={`emoji-settings-${portalKey}`} 
          open={showEmojiSettingsModal} 
          onClose={() => setShowEmojiSettingsModal(false)} 
        />,
        showEmojiSettingsModal
      )}
      {createSafePortal(
        <TemplatesManagementModal 
          key={`templates-${portalKey}`} 
          isOpen={showTemplatesModal} 
          onClose={() => setShowTemplatesModal(false)} 
        />,
        showTemplatesModal
      )}
      {createSafePortal(
        <AppTitleSettingsModal 
          key={`app-title-settings-${portalKey}`} 
          open={showAppTitleSettingsModal} 
          onClose={() => setShowAppTitleSettingsModal(false)} 
        />,
        showAppTitleSettingsModal
      )}
      {createSafePortal(
        <div 
          onClick={() => setShowUserRightsModal(false)} 
          style={{
            position:'fixed', 
            inset:0, 
            background:'rgba(2,6,23,0.55)', 
            zIndex: 200003,
            display:'flex', 
            alignItems:'flex-start', 
            justifyContent:'flex-end', 
            padding:'24px',
            paddingRight:'210px'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{
              background:'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
              borderRadius:'16px',
              padding:'24px',
              width:'100%',
              maxWidth:'1160px',
              maxHeight:'80vh',
              overflow:'auto',
              border:'1px solid rgba(75, 85, 99, 0.3)',
              color:'#e2e8f0'
            }}
          >
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <h3 style={{margin:0,fontWeight:900,fontSize:'1.12em'}}>Права пользователей — департаменты</h3>
              <button 
                onClick={() => setShowUserRightsModal(false)}
                style={{
                  background:'transparent',
                  border:'none',
                  color:'#9ca3af',
                  cursor:'pointer',
                  fontSize:'1.5rem',
                  padding:'4px',
                  borderRadius:'4px'
                }}
              >
                <FiX />
              </button>
            </div>
            <p style={{margin:'0 0 20px 0',color:'#94a3b8',fontSize:'0.96em'}}>
              Управление ролями и департаментами пользователей. Выберите роль и департамент для каждого сотрудника.
            </p>
            
            {/* Заголовки колонок */}
            <div style={{
              display:'grid',
              gridTemplateColumns: '50px 1fr 200px 150px 120px',
              alignItems:'center',
              gap:12,
              padding:'8px 16px',
              marginBottom:'12px',
              borderBottom:'1px solid rgba(255,255,255,0.1)',
              fontSize:'0.8rem',
              fontWeight:600,
              color:'#9ca3af',
              textTransform:'uppercase',
              letterSpacing:'0.5px'
            }}>
              <div></div>
              <div>Пользователь</div>
              <div>Роль</div>
              <div>Департамент</div>
              <div>ID</div>
            </div>
            
            <div style={{maxHeight:'60vh',overflowY:'auto',paddingRight:6}}>
              {employees.length === 0 ? (
                <div style={{textAlign:'center', padding:'40px 20px', color:'#6b7280'}}>
                  Загрузка пользователей...
                </div>
              ) : (
                employees.map(emp => {
                  const label = emp.username || ((emp.first_name||'') + ' ' + (emp.last_name||''));
                  const currentDept = deptMap?.[emp.id] || '';
                  const currentRole = roleMap?.[emp.id] || emp.role || 'user';
                  const roleInfo = roles.find(r => r.value === currentRole) || roles[0];
                  
                  return (
                    <div key={emp.id} style={{
                      display:'grid',
                      gridTemplateColumns: '50px 1fr 200px 150px 120px',
                      alignItems:'center',
                      gap:12,
                      margin:'8px 0',
                      padding:'12px 16px',
                      borderRadius:12,
                      background:'rgba(255,255,255,0.04)',
                      border:'1px solid rgba(255,255,255,0.08)',
                      transition:'all 0.2s ease'
                    }}>
                      <div style={{
                        width:'40px',
                        height:'40px',
                        borderRadius:'50%',
                        background: emp.avatar ? `url(${emp.avatar})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        color:'white',
                        fontSize:'1.2rem',
                        fontWeight:'600'
                      }}>
                        {!emp.avatar && (label.charAt(0)?.toUpperCase() || 'U')}
                      </div>
                      
                      <div style={{display:'flex', flexDirection:'column', gap:2}}>
                        <span style={{fontWeight:600, color:'#e2e8f0', fontSize:'0.95rem'}}>{label}</span>
                        <span style={{
                          fontSize:'0.8rem',
                          fontWeight:600,
                          color: roleInfo.color,
                          textTransform:'uppercase',
                          letterSpacing:'0.5px'
                        }}>
                          {roleInfo.label}
                        </span>
                      </div>
                      
                      <select 
                        value={currentRole} 
                        onChange={e => {
                          const val = e.target.value;
                          setUserRole(emp.id, val);
                        }} 
                        style={{
                          padding:'6px 10px',
                          borderRadius:6,
                          border:'1px solid rgba(255,255,255,0.16)',
                          background:'rgba(17,24,39,0.65)',
                          color:'#e5e7eb',
                          fontSize:'0.85rem'
                        }}
                      >
                        {roles.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                      
                      <select 
                        value={currentDept} 
                        onChange={e => {
                          const val = e.target.value;
                          setDepartment(emp.id, val);
                        }} 
                        style={{
                          padding:'6px 10px',
                          borderRadius:6,
                          border:'1px solid rgba(255,255,255,0.16)',
                          background:'rgba(17,24,39,0.65)',
                          color:'#e5e7eb',
                          fontSize:'0.85rem'
                        }}
                      >
                        <option value="">Без отдела</option>
                        {departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      
                      <div style={{
                        textAlign:'center',
                        fontSize:'0.75rem',
                        color:'#6b7280'
                      }}>
                        ID: {emp.id}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        showUserRightsModal
      )}
      {/* {showChatsModal && ReactDOM.createPortal(
        <div
          style={{
            position:'fixed',
            top:0,
            right:0,
            bottom:0,
            left:'320px',
            zIndex:99999,
            background:'transparent',
            display:'flex',
            justifyContent:'flex-end',
            alignItems:'center'
          }}
          onClick={()=>setShowChatsModal(false)}
        >
          <div style={{
            width:'100%',
            maxWidth:'600px',
            minWidth:'380px',
            height:'90%',
            background:'linear-gradient(135deg, #232931 0%, #181c22 100%)',
            borderRadius:'28px 0 0 28px',
            padding:'40px 48px',
            boxSizing:'border-box',
            overflowY:'auto',
            position:'relative',
            boxShadow:'-8px 0 40px #2193b044, 0 4px 32px rgba(0,0,0,0.15)',
            border:'none',
            animation:'modalFadeIn .35s cubic-bezier(.4,0,.2,1)',
            color:'#fff'
          }} onClick={e=>e.stopPropagation()}>
            <button
              onClick={()=>setShowChatsModal(false)}
              style={{
                position:'absolute',
                top:16,
                right:16,
                fontSize:28,
                background:'transparent',
                border:'none',
                cursor:'pointer',
                color:'#fff',
                fontWeight:'bold',
                width:36,
                height:36,
                borderRadius:'50%',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                transition:'background-color 0.3s, color 0.3s'
              }}
              onMouseEnter={e=>{ e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.18)'; e.currentTarget.style.color = '#43e97b'; }}
              onMouseLeave={e=>{ e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#fff'; }}
              aria-label="Close modal"
            >
              ×
            </button>
            <h2 style={{
              marginTop:0,
              marginBottom:18,
              color:'#43e97b',
              fontWeight:900,
              fontSize:'2em',
              letterSpacing:'0.5px',
              textShadow:'0 0 22px #43e97b, 0 0 32px #43e97b44, 0 0 2px #fff, 0 0 24px #43e97b88'
            }}>Ваши чаты</h2>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
              <button
                onClick={() => {
                  dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'createChat', show: true } });
                  // при необходимости можно закрыть список чатов:
                  // setShowChatsModal(false);
                }}
                style={{
                  display:'inline-flex',
                  alignItems:'center',
                  gap:8,
                  padding:'10px 14px',
                  borderRadius:10,
                  border:'1px solid rgba(67,233,123,0.35)',
                  background:'rgba(67,233,123,0.15)',
                  color:'#b2ffb2',
                  cursor:'pointer'
                }}
                title="Создать чат"
              >
                <FiPlus size={18} /> Создать чат
              </button>
            </div>
            <ChatList setShowChatsModal={setShowChatsModal} />
          </div>
        </div>,
        document.body
      )} */}
    </>
  );
}