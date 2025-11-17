import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FiX, FiArrowLeft } from 'react-icons/fi';
import { useApp } from '../context/AppContext';

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

export default function UserRightsMobile({ open, onClose, onOpenMobileSidebar }) {
  const { state } = useApp();
  const [employees, setEmployees] = useState([]);
  const [deptMap, setDeptMap] = useState({});
  const [roleMap, setRoleMap] = useState({});
  const [loading, setLoading] = useState(false);
  
  const modalRef = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // Load employees when modal opens
  useEffect(() => {
    if (!open) return;
    if (!window.socket) return undefined;

    setLoading(true);
    const handleAllUsers = (users) => {
      setEmployees(users || []);
      setLoading(false);
    };

    window.socket.emit('get_all_users');
    window.socket.on('all_users', handleAllUsers);

    return () => {
      window.socket.off('all_users', handleAllUsers);
    };
  }, [open]);

  // Initialize dept map and role map from employees
  useEffect(() => {
    const deptMapLocal = {};
    const roleMapLocal = {};
    (employees || []).forEach(u => {
      if (u && u.department) deptMapLocal[u.id] = u.department;
      if (u && u.role) roleMapLocal[u.id] = u.role;
    });
    if (Object.keys(deptMapLocal).length) setDeptMap(deptMapLocal);
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

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
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
  }, [onClose, onOpenMobileSidebar]);

  const handleClose = useCallback(() => {
    if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
    onClose();
  }, [onClose, onOpenMobileSidebar]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 10001,
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
              background: 'linear-gradient(135deg, #8b45ff 0%, #6d28d9 100%)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              zIndex: 10002,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            <button
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              <FiArrowLeft size={24} />
            </button>
            <h2
              style={{
                margin: 0,
                color: '#fff',
                fontWeight: 900,
                fontSize: '1.1em',
                flex: 1,
                textAlign: 'center',
                paddingRight: '40px',
              }}
            >
              Права пользователей
            </h2>
            <button
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Swipe hint */}
          <div
            style={{
              position: 'fixed',
              top: '60px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(139, 69, 255, 0.2)',
              color: '#c084fc',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              zIndex: 10002,
              pointerEvents: 'none',
              animation: 'fadeOut 3s forwards',
            }}
          >
            ← Свайпните влево, чтобы закрыть
          </div>
          <style>{`
            @keyframes fadeOut {
              0% { opacity: 1; }
              70% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>

          {/* Content */}
          <div style={{ padding: '20px 16px' }}>
            <p style={{
              margin: '0 0 20px 0',
              color: '#94a3b8',
              fontSize: '0.9rem',
              lineHeight: '1.5'
            }}>
              Управление ролями и департаментами пользователей. Выберите роль и департамент для каждого сотрудника.
            </p>

            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#6b7280'
              }}>
                Загрузка пользователей...
              </div>
            ) : employees.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#6b7280'
              }}>
                Пользователи не найдены
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {employees.map(emp => {
                  const label = emp.username || ((emp.first_name || '') + ' ' + (emp.last_name || ''));
                  const currentDept = deptMap?.[emp.id] || '';
                  const currentRole = roleMap?.[emp.id] || emp.role || 'user';
                  const roleInfo = roles.find(r => r.value === currentRole) || roles[0];
                  
                  return (
                    <div
                      key={emp.id}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      {/* User info */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: emp.avatar ? `url(${emp.avatar})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '1.3rem',
                          fontWeight: '600',
                          flexShrink: 0
                        }}>
                          {!emp.avatar && (label.charAt(0)?.toUpperCase() || 'U')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600,
                            color: '#e2e8f0',
                            fontSize: '0.95rem',
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {label}
                          </div>
                          <div style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: roleInfo.color,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {roleInfo.label}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginTop: '4px'
                          }}>
                            ID: {emp.id}
                          </div>
                        </div>
                      </div>

                      {/* Role selector */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#9ca3af',
                          marginBottom: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Роль
                        </label>
                        <select
                          value={currentRole}
                          onChange={e => {
                            const val = e.target.value;
                            setUserRole(emp.id, val);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            background: 'rgba(17, 24, 39, 0.65)',
                            color: '#e5e7eb',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          {roles.map(role => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Department selector */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#9ca3af',
                          marginBottom: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Департамент
                        </label>
                        <select
                          value={currentDept}
                          onChange={e => {
                            const val = e.target.value;
                            setDepartment(emp.id, val);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            background: 'rgba(17, 24, 39, 0.65)',
                            color: '#e5e7eb',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="">Без отдела</option>
                          {departments.map(d => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

