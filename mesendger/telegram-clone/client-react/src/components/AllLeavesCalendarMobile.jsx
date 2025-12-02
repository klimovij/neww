import React, { useEffect, useState, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FaUmbrellaBeach, FaBed, FaWalking, FaChevronLeft, FaChevronRight, FaArrowLeft } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';

const months = [
  'Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
];

const years = Array.from({length: 5}, (_,i) => new Date().getFullYear()-2+i);
const weekDays = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

// Утилиты
function getDaysMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0);
  const matrix = [];
  let week = [];
  let dayOfWeek = firstDay.getDay();
  
  for(let i=0;i<dayOfWeek;i++) week.push(null);
  for(let d=1;d<=lastDay.getDate();d++) {
    week.push(new Date(year, month, d));
    if(week.length===7) { matrix.push(week); week=[]; }
  }
  if(week.length) { 
    while(week.length<7) week.push(null); 
    matrix.push(week); 
  }
  return matrix;
}

function formatDateToYYYYMMDD(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDateInRange(targetDate, startDate, endDate) {
  const target = new Date(targetDate);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  target.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  return target >= start && target <= end;
}

export default function AllLeavesCalendarMobile({ open, onClose, token, onOpenMobileSidebar }) {
  const [leaves, setLeaves] = useState([]);
  const [users, setUsers] = useState({});
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [showUserAutocomplete, setShowUserAutocomplete] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [absentModal, setAbsentModal] = useState({ open: false, date: null, list: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' или 'list'
  
  // Для обработки свайпа
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);

  const getLogicalType = (leave) => {
    if (!leave) return 'leave';
    if (leave.type === 'vacation') return 'vacation';
    if (leave.type === 'sick') return 'sick';
    if (leave.type === 'leave') {
      const reason = String(leave.reason || '').toLowerCase();
      if (/болею|больнич/i.test(reason)) return 'sick';
      return 'leave';
    }
    return String(leave.type || 'leave');
  };

  const isHr = currentUser && (currentUser.role==='hr'||currentUser.role==='admin'||currentUser.role==='руководитель');

  const filteredLeaves = useMemo(() => {
    return Array.isArray(leaves) ? leaves.filter(l => {
      if (!isHr) {
        if (l.userId !== currentUser?.id) return false;
      } else {
        if (selectedUser !== 'all' && l.userId !== Number(selectedUser)) return false;
      }
      if (selectedStatus !== 'all' && l.status !== selectedStatus) return false;
      const logicalType = getLogicalType(l);
      if (selectedType !== 'all' && logicalType !== selectedType) return false;
      return true;
    }) : [];
  }, [leaves, isHr, currentUser, selectedUser, selectedStatus, selectedType]);

  const monthlyStats = useMemo(() => {
    const stats = { vacation: 0, leave: 0, sick: 0 };
    const processedLeaves = new Set();
    
    for (const leave of filteredLeaves) {
      if (!processedLeaves.has(leave.id)) {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        const currentMonth = new Date(selectedYear, selectedMonth);
        const nextMonth = new Date(selectedYear, selectedMonth + 1);
        
        if (startDate < nextMonth && endDate >= currentMonth) {
          const logicalType = getLogicalType(leave);
          if (logicalType === 'vacation') stats.vacation++;
          else if (logicalType === 'sick') stats.sick++;
          else if (logicalType === 'leave') stats.leave++;
          processedLeaves.add(leave.id);
        }
      }
    }
    return stats;
  }, [filteredLeaves, selectedYear, selectedMonth]);

  const daysMatrix = useMemo(() => getDaysMatrix(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  const getAbsentList = (date) => {
    return filteredLeaves.filter(l => {
      const startDateStr = formatDateToYYYYMMDD(l.startDate);
      const endDateStr = formatDateToYYYYMMDD(l.endDate);
      return isDateInRange(date, startDateStr, endDateStr);
    });
  };

  const handleDeleteLeave = async (leaveId) => {
    try {
      const response = await fetch(`/api/leaves/${leaveId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetch('/api/all-leaves', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => setLeaves(Array.isArray(data) ? data : []));
        alert('Отгул успешно удален');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении отгула:', error);
      alert(`Ошибка при удалении отгула: ${error.message}`);
    }
  };

  // Функция для одобрения заявки
  const handleApproveLeave = async (leaveId) => {
    try {
      const response = await fetch(`/api/leaves/${leaveId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'approved' })
      });

      if (response.ok) {
        // Обновляем список заявок
        fetch('/api/all-leaves', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => {
            setLeaves(Array.isArray(data) ? data : []);
            // Обновляем модалку, если она открыта
            if (absentModal.open) {
              const updatedList = absentModal.list.map(l => 
                l.id === leaveId ? { ...l, status: 'approved' } : l
              );
              setAbsentModal({ ...absentModal, list: updatedList });
            }
          });
        // Отправляем событие для обновления счетчика в SidebarNav
        window.dispatchEvent(new Event('show-all-leaves'));
        alert('Заявка одобрена');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка при одобрении заявки:', error);
      alert(`Ошибка при одобрении заявки: ${error.message}`);
    }
  };

  // Функция для отклонения заявки
  const handleRejectLeave = async (leaveId) => {
    try {
      const response = await fetch(`/api/leaves/${leaveId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'rejected' })
      });

      if (response.ok) {
        // Обновляем список заявок
        fetch('/api/all-leaves', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => {
            setLeaves(Array.isArray(data) ? data : []);
            // Обновляем модалку, если она открыта
            if (absentModal.open) {
              const updatedList = absentModal.list.map(l => 
                l.id === leaveId ? { ...l, status: 'rejected' } : l
              );
              setAbsentModal({ ...absentModal, list: updatedList });
            }
          });
        // Отправляем событие для обновления счетчика в SidebarNav
        window.dispatchEvent(new Event('show-all-leaves'));
        alert('Заявка отклонена');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка при отклонении заявки:', error);
      alert(`Ошибка при отклонении заявки: ${error.message}`);
    }
  };

  useEffect(() => {
    if (!open) return;
    
    fetch('/api/all-leaves', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setLeaves(Array.isArray(data) ? data : []));
    
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : (Array.isArray(data.users) ? data.users : []);
        setUsers(Object.fromEntries(arr.map(u => [u.id, u])));
      });
    
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem('user'));
    } catch {}
    setCurrentUser(user);
  }, [open, token]);

  useEffect(() => {
    if (!open) return;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    
    return () => {
      document.body.style.overflow = originalOverflow || '';
      document.body.style.paddingRight = originalPaddingRight || '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setAbsentModal({ open: false, date: null, list: [] });
      setShowFilters(false);
    }
  }, [open]);

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
    const minSwipeDistance = 100; // Минимальное расстояние для свайпа
    
    // Свайп влево - закрываем модалку, возвращаемся к SidebarNav
    if (distance > minSwipeDistance) {
      onClose();
    }
    
    // Сброс значений
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!open) return null;

  const handleMonthChange = (direction) => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  return (
    <>
      {open && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 100002, // Выше SidebarNav (100001)
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          onClick={() => {
            // Закрываем модалку, возвращаемся к SidebarNav
            onClose();
          }}
        >
          <div
            ref={modalRef}
            data-modal-id="calendar"
            onClick={e => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              background: 'var(--modal-calendar-background, linear-gradient(135deg, #232931 0%, #181c22 100%))',
              backgroundImage: 'var(--modal-calendar-background-image, none)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              color: '#fff',
              overflow: 'hidden'
            }}
          >
            {/* Заголовок с кнопкой возврата и закрытия */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--modal-calendar-border-color, rgba(67,233,123,0.2))',
              background: 'rgba(34,40,49,0.95)',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <button
                onClick={() => {
                  // Закрываем модалку, возвращаемся к SidebarNav
                  onClose();
                }}
                style={{
                  background: 'var(--modal-calendar-icon-button-background, rgba(67,233,123,0.15))',
                  border: '1px solid var(--modal-calendar-header-icon-color, #43e97b)',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--modal-calendar-header-icon-color, #43e97b)',
                  fontSize: '20px',
                  padding: 0,
                  marginRight: '12px',
                  flexShrink: 0
                }}
                title="Вернуться в меню"
              >
                <FaArrowLeft />
              </button>
              <h2 style={{
                margin: 0,
                color: 'var(--modal-calendar-header-icon-color, #43e97b)',
                fontWeight: 900,
                fontSize: '1.4em',
                flex: 1,
                textAlign: 'center'
              }}>
                Общий календарь
              </h2>
              <button
                onClick={() => {
                  // Закрываем модалку, возвращаемся к SidebarNav
                  onClose();
                }}
                style={{
                  background: 'var(--modal-calendar-icon-button-background, rgba(67,233,123,0.15))',
                  border: '1px solid var(--modal-calendar-header-icon-color, #43e97b)',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--modal-calendar-header-icon-color, #43e97b)',
                  fontSize: '20px',
                  padding: 0,
                  marginLeft: '12px',
                  flexShrink: 0
                }}
                title="Закрыть"
              >
                <FiX />
              </button>
            </div>

            {/* Переключатель вкладок */}
            <div style={{
              display: 'flex',
              padding: '12px 20px',
              gap: '8px',
              borderBottom: '1px solid var(--modal-calendar-border-color, rgba(67,233,123,0.1))',
              background: 'rgba(34,40,49,0.8)'
            }}>
              <button
                onClick={() => setActiveTab('calendar')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === 'calendar' ? 'var(--modal-calendar-button-background, #43e97b)' : 'var(--modal-calendar-button-normal-background, rgba(67,233,123,0.15))',
                  color: activeTab === 'calendar' ? 'var(--modal-calendar-button-text-color, #222)' : 'var(--modal-calendar-header-icon-color, #43e97b)',
                  fontWeight: 700,
                  fontSize: '1em',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📅 Календарь
              </button>
              <button
                onClick={() => setActiveTab('list')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === 'list' ? 'var(--modal-calendar-button-background, #43e97b)' : 'var(--modal-calendar-button-normal-background, rgba(67,233,123,0.15))',
                  color: activeTab === 'list' ? 'var(--modal-calendar-button-text-color, #222)' : 'var(--modal-calendar-header-icon-color, #43e97b)',
                  fontWeight: 700,
                  fontSize: '1em',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📋 Список
              </button>
            </div>

            {/* Кнопка фильтров */}
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--modal-calendar-border-color, rgba(67,233,123,0.1))',
              background: 'rgba(34,40,49,0.6)'
            }}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--modal-calendar-border-color, #43e97b)',
                  background: showFilters ? 'var(--modal-calendar-icon-button-background, rgba(67,233,123,0.2))' : 'var(--modal-calendar-button-normal-background, rgba(67,233,123,0.1))',
                  color: 'var(--modal-calendar-button-text-color, #43e97b)',
                  fontWeight: 700,
                  fontSize: '1em',
                  cursor: 'pointer'
                }}
              >
                {showFilters ? '▼ Скрыть фильтры' : '▲ Показать фильтры'}
              </button>
            </div>

            {/* Панель фильтров */}
            {showFilters && (
              <div style={{
                padding: '16px 20px',
                background: 'var(--modal-calendar-filter-block-background, rgba(67, 233, 123, 0.08))',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderBottom: '1px solid var(--modal-calendar-border-color, rgba(67,233,123,0.1))',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                {/* Месяц и год */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: 'var(--modal-calendar-header-icon-color, #43e97b)', fontSize: '0.9em', marginBottom: '6px', fontWeight: 600 }}>
                      Месяц
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        fontSize: '1em',
                        border: '1px solid var(--modal-calendar-border-color, #43e97b)',
                        background: 'var(--modal-calendar-input-background, #2d3748)',
                        color: 'var(--modal-calendar-input-text-color, #fff)'
                      }}
                    >
                      {months.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: 'var(--modal-calendar-header-icon-color, #43e97b)', fontSize: '0.9em', marginBottom: '6px', fontWeight: 600 }}>
                      Год
                    </label>
                    <select
                      value={selectedYear}
                      onChange={e => setSelectedYear(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        fontSize: '1em',
                        border: '1px solid var(--modal-calendar-border-color, #43e97b)',
                        background: 'var(--modal-calendar-input-background, #2d3748)',
                        color: 'var(--modal-calendar-input-text-color, #fff)'
                      }}
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Поиск сотрудника для HR */}
                {isHr && (
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', color: 'var(--modal-calendar-header-icon-color, #43e97b)', fontSize: '0.9em', marginBottom: '6px', fontWeight: 600 }}>
                      Сотрудник
                    </label>
                    <input
                      type="text"
                      value={userSearch}
                      placeholder="Поиск по имени..."
                      onChange={e => { setUserSearch(e.target.value); setShowUserAutocomplete(true); }}
                      onFocus={() => setShowUserAutocomplete(true)}
                      onBlur={() => setTimeout(() => setShowUserAutocomplete(false), 200)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        fontSize: '1em',
                        border: '1px solid var(--modal-calendar-border-color, #43e97b)',
                        background: 'var(--modal-calendar-input-background, #2d3748)',
                        color: 'var(--modal-calendar-input-text-color, #fff)',
                        boxSizing: 'border-box'
                      }}
                    />
                    {showUserAutocomplete && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        background: '#232931',
                        border: '1px solid var(--modal-calendar-border-color, #43e97b)',
                        borderRadius: '10px',
                        marginTop: '4px',
                        zIndex: 20
                      }}>
                        <div
                          onMouseDown={() => { setSelectedUser('all'); setUserSearch(''); setShowUserAutocomplete(false); }}
                          style={{
                            padding: '12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #2a323d',
                            color: 'var(--modal-calendar-input-text-color, #fff)',
                            fontWeight: 600
                          }}
                        >
                          Все сотрудники
                        </div>
                        {Object.values(users)
                          .filter(u => {
                            const q = userSearch.trim().toLowerCase();
                            if (!q) return true;
                            const first = (u.first_name || '').toLowerCase();
                            const last = (u.last_name || '').toLowerCase();
                            const usern = (u.username || '').toLowerCase();
                            return usern.includes(q) || first.includes(q) || last.includes(q);
                          })
                          .slice(0, 20)
                          .map(u => (
                            <div
                              key={u.id}
                              onMouseDown={() => {
                                setSelectedUser(u.id);
                                setUserSearch(u.username || `${u.first_name || ''} ${u.last_name || ''}`.trim());
                                setShowUserAutocomplete(false);
                              }}
                              style={{
                                padding: '12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #2a323d',
                                color: 'var(--modal-calendar-input-text-color, #fff)'
                              }}
                            >
                              {u.username || `${u.first_name || ''} ${u.last_name || ''}`}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Тип события */}
                <div>
                  <label style={{ display: 'block', color: 'var(--modal-calendar-header-icon-color, #43e97b)', fontSize: '0.9em', marginBottom: '8px', fontWeight: 600 }}>
                    Тип события
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    <button
                      onClick={() => setSelectedType('all')}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--modal-calendar-border-color, #43e97b)',
                        background: selectedType === 'all' ? 'var(--modal-calendar-button-background, #43e97b)' : 'rgba(67,233,123,0.1)',
                        color: selectedType === 'all' ? 'var(--modal-calendar-button-text-color, #222)' : 'var(--modal-calendar-header-icon-color, #43e97b)',
                        fontWeight: 700,
                        fontSize: '0.95em',
                        cursor: 'pointer'
                      }}
                    >
                      Все
                    </button>
                    <button
                      onClick={() => setSelectedType('vacation')}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--modal-calendar-border-color, #43e97b)',
                        background: selectedType === 'vacation' ? 'var(--modal-calendar-button-background, #43e97b)' : 'rgba(67,233,123,0.1)',
                        color: selectedType === 'vacation' ? 'var(--modal-calendar-button-text-color, #222)' : 'var(--modal-calendar-header-icon-color, #43e97b)',
                        fontWeight: 700,
                        fontSize: '0.95em',
                        cursor: 'pointer'
                      }}
                    >
                      🏖️ Отпуск
                    </button>
                    <button
                      onClick={() => setSelectedType('leave')}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--modal-calendar-border-color, #43e97b)',
                        background: selectedType === 'leave' ? 'var(--modal-calendar-button-background, #43e97b)' : 'rgba(67,233,123,0.1)',
                        color: selectedType === 'leave' ? 'var(--modal-calendar-button-text-color, #222)' : 'var(--modal-calendar-header-icon-color, #43e97b)',
                        fontWeight: 700,
                        fontSize: '0.95em',
                        cursor: 'pointer'
                      }}
                    >
                      🚶 Отгул
                    </button>
                    <button
                      onClick={() => setSelectedType('sick')}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--modal-calendar-border-color, #43e97b)',
                        background: selectedType === 'sick' ? 'var(--modal-calendar-button-background, #43e97b)' : 'rgba(67,233,123,0.1)',
                        color: selectedType === 'sick' ? 'var(--modal-calendar-button-text-color, #222)' : 'var(--modal-calendar-header-icon-color, #43e97b)',
                        fontWeight: 700,
                        fontSize: '0.95em',
                        cursor: 'pointer'
                      }}
                    >
                      🏥 Больничный
                    </button>
                  </div>
                </div>

                {/* Статус */}
                <div>
                  <label style={{ display: 'block', color: 'var(--modal-calendar-header-icon-color, #43e97b)', fontSize: '0.9em', marginBottom: '6px', fontWeight: 600 }}>
                    Статус
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      fontSize: '1em',
                      border: '1px solid var(--modal-calendar-border-color, #43e97b)',
                      background: 'var(--modal-calendar-input-background, #2d3748)',
                      color: 'var(--modal-calendar-input-text-color, #fff)'
                    }}
                  >
                    <option value="all">Все</option>
                    <option value="approved">Одобрено</option>
                    <option value="pending">Ожидает</option>
                    <option value="completed">Отработано</option>
                    <option value="rejected">Отклонено</option>
                  </select>
                </div>
              </div>
            )}

            {/* Контент - Календарь или Список */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              WebkitOverflowScrolling: 'touch'
            }}>
              {activeTab === 'calendar' ? (
                <div>
                  {/* Навигация по месяцам */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    padding: '12px',
                    background: 'var(--modal-calendar-nav-block-background, rgba(67,233,123,0.1))',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '12px'
                  }}>
                    <button
                      onClick={() => handleMonthChange('prev')}
                      style={{
                        background: 'var(--modal-calendar-icon-button-background, rgba(67,233,123,0.15))',
                        border: '1px solid var(--modal-calendar-border-color, #43e97b)',
                        borderRadius: '50%',
                        width: 44,
                        height: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--modal-calendar-header-icon-color, #43e97b)',
                        fontSize: '18px'
                      }}
                    >
                      <FaChevronLeft />
                    </button>
                    <div style={{
                      textAlign: 'center',
                      color: 'var(--modal-calendar-header-icon-color, #43e97b)',
                      fontWeight: 700,
                      fontSize: '1.2em'
                    }}>
                      {months[selectedMonth]} {selectedYear}
                    </div>
                    <button
                      onClick={() => handleMonthChange('next')}
                      style={{
                        background: 'var(--modal-calendar-icon-button-background, rgba(67,233,123,0.15))',
                        border: '1px solid var(--modal-calendar-border-color, #43e97b)',
                        borderRadius: '50%',
                        width: 44,
                        height: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--modal-calendar-header-icon-color, #43e97b)',
                        fontSize: '18px'
                      }}
                    >
                      <FaChevronRight />
                    </button>
                  </div>

                  {/* Календарь */}
                  <div style={{
                    background: 'var(--modal-calendar-calendar-grid-background, rgba(34,40,49,0.97))',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '16px',
                    padding: '12px',
                    boxShadow: '0 2px 12px rgba(33,147,176,0.15)'
                  }}>
                    {/* Дни недели */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '6px',
                      marginBottom: '8px'
                    }}>
                      {weekDays.map(d => (
                        <div key={d} style={{
                          fontWeight: 700,
                          fontSize: '0.85em',
                          padding: '8px 0',
                          textAlign: 'center',
                          color: 'var(--modal-calendar-calendar-weekday-color, #43e97b)'
                        }}>
                          {d}
                        </div>
                      ))}
                    </div>
                    {/* Дни месяца */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '6px'
                    }}>
                      {daysMatrix.flat().map((date, i) => date ? (
                        <div
                          key={i}
                          onClick={() => {
                            const absentList = getAbsentList(date);
                            if (absentList.length > 0) {
                              setAbsentModal({ open: true, date, list: absentList });
                            }
                          }}
                          style={{
                            minHeight: '50px',
                            padding: '6px',
                            background: 'var(--modal-calendar-calendar-cell-background, rgba(67, 233, 123, 0.05))',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            position: 'relative',
                            color: 'var(--modal-calendar-calendar-cell-text-color, #222)',
                            cursor: 'pointer',
                            fontSize: '0.9em'
                          }}
                        >
                          <span style={{
                            fontWeight: 700,
                            color: 'var(--modal-calendar-calendar-cell-text-color, #2193b0)',
                            fontSize: '1em'
                          }}>
                            {date.getDate()}
                          </span>
                          {(() => {
                            for (const leave of filteredLeaves) {
                              const startDateStr = formatDateToYYYYMMDD(leave.startDate);
                              const endDateStr = formatDateToYYYYMMDD(leave.endDate);
                              if (isDateInRange(date, startDateStr, endDateStr)) {
                                const logicalType = getLogicalType(leave);
                                if (logicalType === 'vacation') {
                                  return <FaUmbrellaBeach style={{ color: '#43e97b', fontSize: '16px', marginTop: '2px' }} />;
                                } else if (logicalType === 'sick') {
                                  return <FaBed style={{ color: '#e74c3c', fontSize: '16px', marginTop: '2px' }} />;
                                } else if (logicalType === 'leave') {
                                  return <FaWalking style={{ color: '#6dd5ed', fontSize: '16px', marginTop: '2px' }} />;
                                }
                              }
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        <div key={i} style={{ minHeight: '50px', padding: '6px', background: 'transparent' }}></div>
                      ))}
                    </div>
                  </div>

                  {/* Статистика */}
                  <div style={{
                    marginTop: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '16px',
                    background: 'rgba(67,233,123,0.1)',
                    borderRadius: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                      <FaWalking style={{ color: '#6dd5ed', fontSize: '24px' }} />
                      <span style={{ flex: 1 }}>Отгул:</span>
                      <strong style={{ color: '#6dd5ed', fontSize: '1.1em' }}>{monthlyStats.leave}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                      <FaUmbrellaBeach style={{ color: '#43e97b', fontSize: '24px' }} />
                      <span style={{ flex: 1 }}>Отпуск:</span>
                      <strong style={{ color: '#43e97b', fontSize: '1.1em' }}>{monthlyStats.vacation}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                      <FaBed style={{ color: '#e74c3c', fontSize: '24px' }} />
                      <span style={{ flex: 1 }}>Больничный:</span>
                      <strong style={{ color: '#e74c3c', fontSize: '1.1em' }}>{monthlyStats.sick}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 style={{
                    color: '#43e97b',
                    marginBottom: '16px',
                    fontSize: '1.2em',
                    textAlign: 'center'
                  }}>
                    События в {months[selectedMonth]} {selectedYear}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredLeaves
                      .filter(leave => {
                        const startDate = new Date(leave.startDate);
                        const endDate = new Date(leave.endDate);
                        const currentMonth = new Date(selectedYear, selectedMonth);
                        const nextMonth = new Date(selectedYear, selectedMonth + 1);
                        return startDate < nextMonth && endDate >= currentMonth;
                      })
                      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                      .map(leave => {
                        const logicalType = getLogicalType(leave);
                        let bgColor, icon, typeText;
                        
                        if (logicalType === 'vacation') {
                          bgColor = '#43e97b';
                          icon = <FaUmbrellaBeach style={{ color: '#fff', fontSize: '20px' }} />;
                          typeText = 'Отпуск';
                        } else if (logicalType === 'sick') {
                          bgColor = '#e74c3c';
                          icon = <FaBed style={{ color: '#fff', fontSize: '20px' }} />;
                          typeText = 'Больничный';
                        } else {
                          bgColor = '#6dd5ed';
                          icon = <FaWalking style={{ color: '#fff', fontSize: '20px' }} />;
                          typeText = 'Отгул';
                        }

                        return (
                          <div
                            key={leave.id}
                            onClick={() => {
                              const startDate = new Date(leave.startDate);
                              const endDate = new Date(leave.endDate);
                              const dates = [];
                              for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                                dates.push(new Date(d));
                              }
                              if (dates.length > 0) {
                                setAbsentModal({ open: true, date: dates[0], list: [leave] });
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '16px',
                              background: '#fff',
                              borderRadius: '12px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              borderLeft: `6px solid ${bgColor}`,
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 48,
                              height: 48,
                              borderRadius: '12px',
                              background: bgColor
                            }}>
                              {icon}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '4px',
                                flexWrap: 'wrap'
                              }}>
                                <span style={{
                                  fontWeight: 700,
                                  fontSize: '1em',
                                  color: '#2193b0'
                                }}>
                                  {users[leave.userId]?.username || 'Сотрудник'}
                                </span>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: bgColor,
                                  color: '#fff',
                                  fontSize: '0.8em',
                                  fontWeight: 600
                                }}>
                                  {typeText}
                                </span>
                              </div>
                              <div style={{ color: '#666', fontSize: '0.9em', marginBottom: '2px' }}>
                                {String(leave.startDate).slice(0, 10)} — {String(leave.endDate).slice(0, 10)}
                              </div>
                              {leave.reason && (
                                <div style={{
                                  color: '#888',
                                  fontSize: '0.85em',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  marginBottom: '4px'
                                }}>
                                  {leave.reason}
                                </div>
                              )}
                              {/* Статус заявки */}
                              <div style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: leave.status === 'approved' ? '#43e97b22' : 
                                           leave.status === 'pending' ? '#f9ca2422' : 
                                           leave.status === 'completed' ? '#6dd5ed22' : 
                                           leave.status === 'rejected' ? '#e74c3c22' : '#88888822',
                                color: leave.status === 'approved' ? '#43e97b' : 
                                      leave.status === 'pending' ? '#f9ca24' : 
                                      leave.status === 'completed' ? '#6dd5ed' : 
                                      leave.status === 'rejected' ? '#e74c3c' : '#888888',
                                fontSize: '0.75em',
                                fontWeight: 600,
                                display: 'inline-block',
                                marginTop: '4px'
                              }}>
                                {leave.status === 'approved' ? '✓ Одобрено' : 
                                 leave.status === 'pending' ? '⏳ Ожидает' : 
                                 leave.status === 'completed' ? '✓ Отработано' : 
                                 leave.status === 'rejected' ? '✗ Отклонено' : 'Неизвестно'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                              {/* Кнопки одобрения/отклонения для HR/админов */}
                              {isHr && leave.status === 'pending' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApproveLeave(leave.id);
                                    }}
                                    style={{
                                      background: '#43e97b',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '8px',
                                      padding: '8px 12px',
                                      fontSize: '0.85em',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    ✓ Одобрить
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm('Вы уверены, что хотите отклонить эту заявку?')) {
                                        handleRejectLeave(leave.id);
                                      }
                                    }}
                                    style={{
                                      background: '#e74c3c',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '8px',
                                      padding: '8px 12px',
                                      fontSize: '0.85em',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    ✗ Отклонить
                                  </button>
                                </>
                              )}
                              {/* Кнопка удаления для HR или владельца */}
                              {(isHr || leave.userId === currentUser?.id) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Удалить ${typeText.toLowerCase()}?`)) {
                                      handleDeleteLeave(leave.id);
                                    }
                                  }}
                                  style={{
                                    background: '#e74c3c',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    fontSize: '0.85em',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                  }}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {filteredLeaves.filter(leave => {
                      const startDate = new Date(leave.startDate);
                      const endDate = new Date(leave.endDate);
                      const currentMonth = new Date(selectedYear, selectedMonth);
                      const nextMonth = new Date(selectedYear, selectedMonth + 1);
                      return startDate < nextMonth && endDate >= currentMonth;
                    }).length === 0 && (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: '#888',
                        fontSize: '1em',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px'
                      }}>
                        <div style={{ fontSize: '2em', marginBottom: '8px' }}>📅</div>
                        Нет событий в этом месяце
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Модальное окно отсутствующих */}
      {absentModal.open && ReactDOM.createPortal(
        <div
          onClick={() => setAbsentModal({ open: false, date: null, list: [] })}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 300000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              color: '#111',
              borderRadius: '18px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
              padding: '20px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                color: '#2193b0',
                fontSize: '1.2em'
              }}>
                {absentModal.date && absentModal.date.toLocaleDateString('ru-RU')}
              </h3>
              <button
                onClick={() => setAbsentModal({ open: false, date: null, list: [] })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#111',
                  width: 36,
                  height: 36,
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {absentModal.list.map((l, idx) => {
                const logicalType = getLogicalType(l);
                let icon = null;
                if (logicalType === 'vacation') icon = <FaUmbrellaBeach style={{ color: '#43e97b', fontSize: '22px' }} />;
                else if (logicalType === 'sick') icon = <FaBed style={{ color: '#e74c3c', fontSize: '22px' }} />;
                else if (logicalType === 'leave') icon = <FaWalking style={{ color: '#6dd5ed', fontSize: '22px' }} />;
                
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      background: '#f8f9fa',
                      borderRadius: '12px',
                      borderLeft: `6px solid ${logicalType === 'vacation' ? '#43e97b' : logicalType === 'sick' ? '#e74c3c' : '#6dd5ed'}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      {icon}
                      <span style={{ color: '#2193b0', fontWeight: 600, flex: 1 }}>
                        {users[l.userId]?.username || 'Сотрудник'}
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: logicalType === 'vacation' ? '#43e97b' : logicalType === 'sick' ? '#e74c3c' : '#6dd5ed',
                        color: '#fff',
                        fontSize: '0.85em',
                        fontWeight: 600
                      }}>
                        {logicalType === 'vacation' ? 'Отпуск' : logicalType === 'sick' ? 'Больничный' : 'Отгул'}
                      </span>
                    </div>
                    <div style={{ color: '#666', fontSize: '0.9em', marginBottom: '4px' }}>
                      {String(l.startDate).slice(0, 10)} — {String(l.endDate).slice(0, 10)}
                    </div>
                    {l.reason && (
                      <div style={{ color: '#555', fontSize: '0.9em', marginBottom: '8px' }}>
                        {l.reason}
                      </div>
                    )}
                    {/* Статус заявки */}
                    <div style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: l.status === 'approved' ? '#43e97b22' : 
                                 l.status === 'pending' ? '#f9ca2422' : 
                                 l.status === 'completed' ? '#6dd5ed22' : 
                                 l.status === 'rejected' ? '#e74c3c22' : '#88888822',
                      color: l.status === 'approved' ? '#43e97b' : 
                            l.status === 'pending' ? '#f9ca24' : 
                            l.status === 'completed' ? '#6dd5ed' : 
                            l.status === 'rejected' ? '#e74c3c' : '#888888',
                      fontSize: '0.85em',
                      fontWeight: 600,
                      marginBottom: '8px',
                      display: 'inline-block'
                    }}>
                      {l.status === 'approved' ? '✓ Одобрено' : 
                       l.status === 'pending' ? '⏳ Ожидает' : 
                       l.status === 'completed' ? '✓ Отработано' : 
                       l.status === 'rejected' ? '✗ Отклонено' : 'Неизвестно'}
                    </div>
                    {/* Кнопки одобрения/отклонения для HR/админов */}
                    {isHr && l.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveLeave(l.id);
                          }}
                          style={{
                            flex: 1,
                            background: '#43e97b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 16px',
                            fontSize: '0.9em',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          ✓ Одобрить
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Вы уверены, что хотите отклонить эту заявку?')) {
                              handleRejectLeave(l.id);
                            }
                          }}
                          style={{
                            flex: 1,
                            background: '#e74c3c',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 16px',
                            fontSize: '0.9em',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          ✗ Отклонить
                        </button>
                      </div>
                    )}
                    {/* Кнопка удаления для HR или владельца */}
                    {(isHr || l.userId === currentUser?.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const typeText = logicalType === 'vacation' ? 'Отпуск' : logicalType === 'sick' ? 'Больничный' : 'Отгул';
                          if (window.confirm(`Удалить ${typeText.toLowerCase()}?`)) {
                            handleDeleteLeave(l.id);
                            setAbsentModal({ open: false, date: null, list: [] });
                          }
                        }}
                        style={{
                          marginTop: '8px',
                          background: '#e74c3c',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '0.85em',
                          cursor: 'pointer',
                          fontWeight: 600,
                          width: '100%'
                        }}
                      >
                        🗑️ Удалить
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

