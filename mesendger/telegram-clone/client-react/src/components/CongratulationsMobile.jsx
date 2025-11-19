import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiUsers, FiCalendar, FiPlus, FiStar, FiEdit3, FiTrash2, FiGift } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import CongratulationSendModal from './Modals/CongratulationSendModal';
import CongratulationSendMobile from './CongratulationSendMobile';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import AddEmployeeMobile from './AddEmployeeMobile';

export default function CongratulationsMobile({ open, onClose, onOpenMobileSidebar }) {
  const modalRef = useRef(null);
  const { state } = useApp();
  
  const [tab, setTab] = useState('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersByEmployeeId, setUsersByEmployeeId] = useState({});
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [congratsUser, setCongratsUser] = useState(null);

  // Логирование изменений состояний для отладки
  useEffect(() => {
    console.log('📱 Mobile: editUser changed:', editUser);
  }, [editUser]);

  useEffect(() => {
    console.log('📱 Mobile: congratsUser changed:', congratsUser);
  }, [congratsUser]);

  // Защита: employees всегда массив
  const safeEmployees = Array.isArray(employees) ? employees : [];

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      api.get('/api/employees'),
      api.get('/api/users').catch(() => ({ data: [] }))
    ])
      .then(([empRes, usersRes]) => {
        const empArr = Array.isArray(empRes.data) ? empRes.data : [];
        const usersArr = Array.isArray(usersRes.data) ? usersRes.data : [];
        const map = {};
        usersArr.forEach(u => {
          const key = String(u.employee_id || u.employeeId || '');
          if (key) map[key] = u;
        });
        setUsersByEmployeeId(map);
        setEmployees(empArr);
      })
      .catch(() => {
        setUsersByEmployeeId({});
        setEmployees([]);
      })
      .finally(() => setLoading(false));
  }, [open, showAddModal, editUser]);

  const filteredEmployees = safeEmployees.filter((e) =>
    (e.first_name + ' ' + e.last_name).toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleClose = () => {
    if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
    onClose();
  };

  // Функция для получения градиента по имени
  const getGradientByName = (name) => {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    ];
    const index = (name || '').length % gradients.length;
    return gradients[index];
  };

  // Приводим URL аватарок к абсолютному
  const normalizeAvatarUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('/')) return `${api.defaults.baseURL}${trimmed}`;
    return `${api.defaults.baseURL}/${trimmed}`;
  };

  const getAge = (birth_day, birth_month, birth_year) => {
    if (!birth_day || !birth_month || !birth_year) return null;
    const today = new Date();
    let age = today.getFullYear() - birth_year;
    const m = today.getMonth() + 1 - birth_month;
    if (m < 0 || (m === 0 && today.getDate() < birth_day)) {
      age--;
    }
    return age;
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Удалить сотрудника ${emp.first_name} ${emp.last_name}?`)) return;
    try {
      console.log('🗑️ Deleting employee with id:', emp.id);
      const response = await api.delete(`/api/employees/${emp.id}`);
      console.log('✅ Delete response:', response);
      
      // Проверяем, что ответ успешный
      if (response && response.status >= 200 && response.status < 300) {
        console.log('✅ Employee deleted successfully');
        
        // Обновляем список сотрудников
        setEmployees((prev) => prev.filter(e => e.id !== emp.id));
        
        // Обновляем карту пользователей
        const usersMap = usersByEmployeeId || {};
        const user = usersMap[String(emp.id)];
        if (user && user.id) {
          try { 
            console.log('🗑️ Deleting linked user with id:', user.id);
            await api.delete(`/api/users/${user.id}`);
            console.log('✅ Linked user deleted');
          } catch(e) {
            console.error('⚠️ Error deleting linked user:', e);
            // Не показываем ошибку пользователю, т.к. сотрудник уже удален
          }
        }
      } else {
        throw new Error('Неожиданный ответ сервера');
      }
    } catch (err) {
      console.error('❌ Error deleting employee:', err);
      console.error('❌ Error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data,
        config: err.config
      });
      
      let errorMessage = 'Неизвестная ошибка';
      if (err.response) {
        // Сервер вернул ответ с ошибкой
        errorMessage = err.response.data?.error || err.response.data?.message || `Ошибка ${err.response.status}`;
      } else if (err.request) {
        // Запрос был отправлен, но ответа не получено
        errorMessage = 'Не удалось получить ответ от сервера';
      } else {
        // Ошибка при настройке запроса
        errorMessage = err.message || 'Ошибка при отправке запроса';
      }
      
      alert(`Ошибка при удалении сотрудника: ${errorMessage}`);
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
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 100000,
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
          paddingBottom: '80px',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '56px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
              fontSize: '18px',
              fontWeight: 700,
              margin: 0,
              flex: 1,
              textAlign: 'center',
            }}
          >
            Сотрудники компании
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

        {/* Tabs и кнопки действий */}
        <div
          style={{
            position: 'sticky',
            top: '56px',
            background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
            padding: '12px 16px',
            zIndex: 10000,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setTab('list')}
              style={{
                background: tab === 'list' 
                  ? 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: tab === 'list' ? '0 2px 8px rgba(67, 233, 123, 0.3)' : 'none',
              }}
            >
              <FiUsers size={16} />
              Список
            </button>
            <button
              onClick={() => setTab('calendar')}
              style={{
                background: tab === 'calendar' 
                  ? 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: tab === 'calendar' ? '0 2px 8px rgba(67, 233, 123, 0.3)' : 'none',
              }}
            >
              <FiCalendar size={16} />
              Календарь
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(67, 233, 123, 0.3)',
              }}
            >
              <FiPlus size={16} />
              Добавить
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event('show-employee-rating'))}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
              }}
            >
              <FiStar size={16} />
              Рейтинг
            </button>
          </div>
          
          {/* Поиск */}
          <input
            type="text"
            placeholder="🔍 Поиск сотрудников..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '2px solid rgba(67, 233, 123, 0.3)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 500,
              outline: 'none',
            }}
          />
        </div>

        {/* Контент */}
        <div style={{ flex: 1, padding: '16px', paddingTop: '16px', marginTop: '8px' }}>
          {tab === 'list' && (
            <>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '16px' }}>
                  Загрузка...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '16px' }}>
                  Сотрудники не найдены
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredEmployees.map((emp) => {
                    const user = usersByEmployeeId[String(emp.id)] || {};
                    const avatarUrl = normalizeAvatarUrl(user.avatar);
                    const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`;
                    const age = getAge(emp.birth_day, emp.birth_month, emp.birth_year);
                    const birthday = emp.birth_day && emp.birth_month 
                      ? `${emp.birth_day}.${emp.birth_month}${emp.birth_year ? `.${emp.birth_year}` : ''}`
                      : null;

                    return (
                      <div
                        key={emp.id}
                        style={{
                          background: 'linear-gradient(135deg, rgba(44, 62, 80, 0.9) 0%, rgba(52, 73, 94, 0.9) 100%)',
                          borderRadius: '16px',
                          padding: '16px',
                          border: '2px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          {/* Аватар */}
                          <div
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '12px',
                              background: avatarUrl
                                ? `url(${avatarUrl}) center/cover`
                                : getGradientByName(`${emp.first_name} ${emp.last_name}`),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 'bold',
                              fontSize: '20px',
                              flexShrink: 0,
                              border: '2px solid rgba(255, 255, 255, 0.2)',
                            }}
                          >
                            {!avatarUrl && initials}
                          </div>
                          
                          {/* Имя и информация */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              color: '#fff', 
                              fontSize: '16px', 
                              fontWeight: 600,
                              marginBottom: '4px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {emp.first_name} {emp.last_name}
                            </div>
                            {emp.position && (
                              <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>
                                {emp.position}
                              </div>
                            )}
                            {birthday && (
                              <div style={{ color: '#43e97b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🎂 {birthday} {age && `(${age} лет)`}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Кнопки действий */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('✏️ Mobile: Редактировать clicked for employee:', emp);
                              console.log('✏️ Mobile: setEditUser function:', typeof setEditUser, setEditUser);
                              if (emp && emp.id) {
                                try {
                                  // Сбрасываем congratsUser перед установкой editUser
                                  setCongratsUser(null);
                                  setEditUser(emp);
                                  console.log('✅ Mobile: setEditUser called successfully, congratsUser cleared');
                                } catch (err) {
                                  console.error('❌ Mobile: Error calling setEditUser:', err);
                                  alert('Ошибка при открытии модалки редактирования: ' + err.message);
                                }
                              } else {
                                console.error('❌ Mobile: Invalid employee object for edit:', emp);
                                alert('Ошибка: данные сотрудника некорректны');
                              }
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              console.log('✏️ Mobile: Редактировать touchStart');
                            }}
                            style={{
                              flex: 1,
                              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                              color: '#232931',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '10px',
                              fontSize: '14px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 8px rgba(67, 233, 123, 0.3)',
                              position: 'relative',
                              zIndex: 1000,
                              pointerEvents: 'auto',
                              touchAction: 'manipulation',
                            }}
                          >
                            <FiEdit3 size={16} />
                            Редактировать
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('🎉 Mobile: Поздравить clicked for employee:', emp);
                              console.log('🎉 Mobile: setCongratsUser function:', typeof setCongratsUser, setCongratsUser);
                              if (emp && emp.id) {
                                try {
                                  // Сбрасываем editUser перед установкой congratsUser
                                  setEditUser(null);
                                  setCongratsUser(emp);
                                  console.log('✅ Mobile: setCongratsUser called successfully, editUser cleared');
                                } catch (err) {
                                  console.error('❌ Mobile: Error calling setCongratsUser:', err);
                                  alert('Ошибка при открытии модалки поздравления: ' + err.message);
                                }
                              } else {
                                console.error('❌ Mobile: Invalid employee object:', emp);
                                alert('Ошибка: данные сотрудника некорректны');
                              }
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              console.log('🎉 Mobile: Поздравить touchStart');
                            }}
                            style={{
                              flex: 1,
                              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '10px',
                              fontSize: '14px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 8px rgba(245, 87, 108, 0.3)',
                              position: 'relative',
                              zIndex: 1000,
                              pointerEvents: 'auto',
                              touchAction: 'manipulation',
                            }}
                          >
                            <FiGift size={16} />
                            Поздравить
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            style={{
                              background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '10px',
                              fontSize: '14px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 8px rgba(231, 76, 60, 0.3)',
                              minWidth: '50px',
                            }}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'calendar' && (
            <BirthdayCalendarMobile employees={employees} />
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
      </div>

      {/* Модалки */}
      {showAddModal && (
        <AddEmployeeMobile 
          open={showAddModal}
          onClose={() => setShowAddModal(false)} 
          onOpenMobileSidebar={() => {
            // Не открываем сайдбар, так как мы уже внутри модалки
          }}
          onAdded={() => {
            setShowAddModal(false);
            // Обновление произойдет автоматически через useEffect
          }}
        />
      )}
    </div>,
    document.body
      )}
      
      {/* Модалки рендерятся через отдельный portal, чтобы быть выше родительского контейнера */}
      {editUser && ReactDOM.createPortal(
        (() => {
          console.log('📱 Mobile: Rendering EditUserModal with user:', editUser);
          return (
            <EditUserModal 
              user={editUser} 
              onClose={() => {
                console.log('📱 Mobile: Closing EditUserModal');
                setEditUser(null);
              }} 
              onSaved={() => {
                console.log('📱 Mobile: User saved, closing EditUserModal');
                setEditUser(null);
              }} 
            />
          );
        })(),
        document.body
      )}
      {congratsUser && ReactDOM.createPortal(
        (() => {
          console.log('📱 Mobile: Rendering CongratulationSendMobile with user:', congratsUser);
          return (
            <CongratulationSendMobile
              user={congratsUser}
              open={!!congratsUser}
              onClose={() => {
                console.log('📱 Mobile: Closing CongratulationSendMobile');
                setCongratsUser(null);
              }}
              onOpenMobileSidebar={() => {
                // Не открываем сайдбар, так как мы уже внутри модалки
              }}
              onSent={() => {
                console.log('📱 Mobile: Congratulation sent');
                setCongratsUser(null);
                window.dispatchEvent(new CustomEvent('news-published'));
              }}
            />
          );
        })(),
        document.body
      )}
    </>
  );
}

// Компонент редактирования пользователя
function EditUserModal({ user, onClose, onSaved }) {
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [birthDate, setBirthDate] = useState(
    user.birth_year && user.birth_month && user.birth_day
      ? `${user.birth_year}-${String(user.birth_month).padStart(2, '0')}-${String(user.birth_day).padStart(2, '0')}`
      : ''
  );
  const [avatar, setAvatar] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData();
    formData.append('id', user.id);
    formData.append('first_name', firstName);
    formData.append('last_name', lastName);
    if (birthDate) {
      const [year, month, day] = birthDate.split('-');
      formData.append('birth_year', year);
      formData.append('birth_month', month);
      formData.append('birth_day', day);
    }
    if (avatar) {
      formData.append('avatar', avatar);
    }
    try {
      await api.post('/api/congratulations/edit-employee', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSaved();
    } catch (err) {
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        zIndex: 200000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflow: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '500px',
          padding: '24px',
          border: '2px solid rgba(67, 233, 123, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '20px', color: '#43e97b', fontWeight: 700, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiEdit3 size={20} />
          Редактировать сотрудника
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Имя"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            style={{
              width: '100%',
              marginBottom: '12px',
              padding: '12px',
              borderRadius: '12px',
              border: '2px solid rgba(67, 233, 123, 0.3)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 500,
              outline: 'none',
            }}
          />
          <input
            placeholder="Фамилия"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            style={{
              width: '100%',
              marginBottom: '12px',
              padding: '12px',
              borderRadius: '12px',
              border: '2px solid rgba(67, 233, 123, 0.3)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 500,
              outline: 'none',
            }}
          />
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            style={{
              width: '100%',
              marginBottom: '12px',
              padding: '12px',
              borderRadius: '12px',
              border: '2px solid rgba(67, 233, 123, 0.3)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 500,
              outline: 'none',
            }}
          />
          <label style={{ display: 'block', marginBottom: '8px', color: '#43e97b', fontWeight: 600, fontSize: '14px' }}>
            Фото сотрудника:
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatar(e.target.files[0])}
            style={{
              width: '100%',
              marginBottom: '16px',
              padding: '10px',
              borderRadius: '12px',
              border: '2px solid rgba(67, 233, 123, 0.3)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '14px',
            }}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Мобильная версия календаря дней рождений
function BirthdayCalendarMobile({ employees }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [birthdays, setBirthdays] = useState([]);
  const [activeMonth, setActiveMonth] = useState(selectedDate.getMonth());
  const [activeYear, setActiveYear] = useState(selectedDate.getFullYear());

  useEffect(() => {
    const day = selectedDate.getDate();
    const month = selectedDate.getMonth() + 1;
    const todayBirthdays = Array.isArray(employees)
      ? employees.filter(e => e.birth_day === day && e.birth_month === month)
      : [];
    setBirthdays(todayBirthdays);
  }, [selectedDate, employees]);

  const months = [
    'Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
  ];
  const years = Array.from({length: 8}, (_,i) => 2022+i);

  const handleMonthChange = (e) => {
    const month = parseInt(e.target.value);
    setActiveMonth(month);
    setSelectedDate(new Date(activeYear, month, 1));
  };

  const handleYearChange = (e) => {
    const year = parseInt(e.target.value);
    setActiveYear(year);
    setSelectedDate(new Date(year, activeMonth, 1));
  };

  return (
    <div style={{
      width: '100%',
      background: 'linear-gradient(135deg, rgba(44, 62, 80, 0.9) 0%, rgba(52, 73, 94, 0.9) 100%)',
      borderRadius: '16px',
      padding: '16px',
      border: '2px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    }}>
      <h3 style={{
        color: '#43e97b',
        fontSize: '18px',
        fontWeight: 700,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        🎂 Календарь дней рождения
      </h3>

      {/* Селекторы месяца и года */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '16px',
        flexWrap: 'wrap',
      }}>
        <select
          value={activeMonth}
          onChange={handleMonthChange}
          style={{
            flex: 1,
            minWidth: '120px',
            padding: '10px 12px',
            borderRadius: '12px',
            border: '2px solid rgba(67, 233, 123, 0.3)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {months.map((m, i) => (
            <option key={i} value={i} style={{ background: '#232931', color: '#fff' }}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={activeYear}
          onChange={handleYearChange}
          style={{
            flex: 1,
            minWidth: '100px',
            padding: '10px 12px',
            borderRadius: '12px',
            border: '2px solid rgba(67, 233, 123, 0.3)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {years.map(y => (
            <option key={y} value={y} style={{ background: '#232931', color: '#fff' }}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Календарь */}
      <div style={{ marginBottom: '20px' }}>
        <Calendar
          onChange={date => {
            setSelectedDate(date);
            setActiveMonth(date.getMonth());
            setActiveYear(date.getFullYear());
          }}
          value={selectedDate}
          calendarType="iso8601"
          locale="ru-RU"
          className="mobile-birthday-calendar"
          tileContent={({ date, view }) => {
            if (view === 'month') {
              const day = date.getDate();
              const month = date.getMonth() + 1;
              const birthdayEmployees = Array.isArray(employees)
                ? employees.filter(e => e.birth_day === day && e.birth_month === month)
                : [];
              if (birthdayEmployees.length > 0) {
                return (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    fontSize: '0.7em',
                    marginTop: '2px',
                  }}>
                    <span role="img" aria-label="birthday" style={{ fontSize: '1em' }}>🎂</span>
                    {birthdayEmployees.length > 1 && (
                      <span style={{ 
                        fontSize: '0.7em', 
                        color: '#43e97b', 
                        fontWeight: 600,
                        marginTop: '2px',
                      }}>
                        +{birthdayEmployees.length - 1}
                      </span>
                    )}
                  </div>
                );
              }
              return null;
            }
          }}
          activeStartDate={new Date(activeYear, activeMonth, 1)}
        />
        <style>{`
          .mobile-birthday-calendar {
            width: 100% !important;
            background: transparent !important;
            border: none !important;
            font-size: 0.9em !important;
          }
          .mobile-birthday-calendar .react-calendar__navigation {
            margin-bottom: 12px !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .mobile-birthday-calendar .react-calendar__navigation button {
            color: #43e97b !important;
            font-weight: 700 !important;
            font-size: 14px !important;
            background: rgba(67, 233, 123, 0.1) !important;
            border: 1px solid rgba(67, 233, 123, 0.3) !important;
            border-radius: 8px !important;
            padding: 6px 10px !important;
            min-width: 40px !important;
          }
          .mobile-birthday-calendar .react-calendar__navigation__label {
            font-size: 14px !important;
            font-weight: 700 !important;
            color: #43e97b !important;
          }
          .mobile-birthday-calendar .react-calendar__month-view__weekdays {
            color: #43e97b !important;
            font-weight: 700 !important;
            font-size: 11px !important;
            margin-bottom: 8px !important;
          }
          .mobile-birthday-calendar .react-calendar__month-view__weekdays__weekday {
            padding: 4px 2px !important;
          }
          .mobile-birthday-calendar .react-calendar__tile {
            min-width: 0 !important;
            width: calc(14.28% - 4px) !important;
            aspect-ratio: 1 !important;
            max-width: none !important;
            min-height: 40px !important;
            max-height: 50px !important;
            font-size: 12px !important;
            border-radius: 10px !important;
            position: relative !important;
            transition: background .18s, box-shadow .18s !important;
            cursor: pointer !important;
            background: rgba(35, 41, 49, 0.8) !important;
            color: #fff !important;
            box-shadow: 0 1px 4px rgba(33, 147, 176, 0.15) !important;
            border: 2px solid transparent !important;
            padding: 4px 2px !important;
            margin: 2px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .mobile-birthday-calendar .react-calendar__tile--active,
          .mobile-birthday-calendar .react-calendar__tile:active {
            box-shadow: 0 0 0 3px #43e97b !important;
            background: #2193b0 !important;
            color: #fff !important;
            border: 2px solid #43e97b !important;
          }
          .mobile-birthday-calendar .react-calendar__tile:hover {
            background: rgba(67, 233, 123, 0.15) !important;
            box-shadow: 0 0 0 2px #43e97b !important;
            color: #43e97b !important;
            border: 2px solid #43e97b !important;
          }
          .mobile-birthday-calendar .react-calendar__tile--now {
            background: rgba(67, 233, 123, 0.2) !important;
            color: #43e97b !important;
            border: 2px solid #2193b0 !important;
          }
          .mobile-birthday-calendar .react-calendar__month-view__days {
            width: 100% !important;
          }
        `}</style>
      </div>

      {/* Легенда */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        padding: '8px',
        background: 'rgba(67, 233, 123, 0.1)',
        borderRadius: '10px',
        fontSize: '13px',
        color: '#43e97b',
        fontWeight: 600,
      }}>
        <span role="img" aria-label="birthday" style={{ fontSize: '18px' }}>🎂</span>
        <span>День рождения</span>
      </div>

      {/* Список именинников */}
      <div>
        <h4 style={{
          fontSize: '16px',
          color: '#43e97b',
          fontWeight: 700,
          marginBottom: '12px',
        }}>
          Именинники {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}:
        </h4>
        {birthdays.length === 0 ? (
          <div style={{
            color: '#94a3b8',
            fontSize: '14px',
            padding: '16px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
          }}>
            Нет именинников
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {birthdays.map(e => {
              const age = e.birth_year 
                ? new Date().getFullYear() - e.birth_year 
                : null;
              return (
                <div
                  key={e.id}
                  style={{
                    background: 'linear-gradient(135deg, rgba(67, 233, 123, 0.15) 0%, rgba(33, 147, 176, 0.15) 100%)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    border: '2px solid rgba(67, 233, 123, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span role="img" aria-label="birthday" style={{ fontSize: '24px' }}>🎂</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>
                      {e.first_name} {e.last_name}
                    </div>
                    <div style={{ color: '#43e97b', fontSize: '13px', marginTop: '2px' }}>
                      {e.birth_day}.{e.birth_month}.{e.birth_year || '????'}
                      {age && ` (${age} ${age === 1 ? 'год' : age < 5 ? 'года' : 'лет'})`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
