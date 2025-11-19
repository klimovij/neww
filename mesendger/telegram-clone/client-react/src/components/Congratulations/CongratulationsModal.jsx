import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import CongratulationSendModal from '../Modals/CongratulationSendModal';
import BirthdayCalendar from './BirthdayCalendar';
import { FiX, FiUsers } from 'react-icons/fi';

// Styled компоненты в стиле модалки рейтинга
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100001;
  transform: translateX(175px);
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #232931 0%, #181c22 100%);
  border-radius: 20px;
  width: 90%;
  max-width: 1170px;
  height: 95vh;
  max-height: 900px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  color: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: 1.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CloseBtn = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
`;

const ModalBody = styled.div`
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  overflow-x: hidden;
  background: linear-gradient(135deg, #232931 0%, #181c22 100%);
`;

// Styled компоненты для сетки сотрудников
const EmployeesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-top: 20px;
`;

const EmployeeCard = styled.div`
  background: linear-gradient(135deg, rgba(44, 62, 80, 0.8) 0%, rgba(52, 73, 94, 0.8) 100%);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  min-height: 200px;
  position: relative;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
`;

const EmployeeAvatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  border: 3px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px;
  }
`;

const EmployeeName = styled.div`
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 4px;
`;

const EmployeeDepartment = styled.div`
  color: #94a3b8;
  font-size: 0.75rem;
  text-align: center;
  margin-bottom: 8px;
`;

const ActionButton = styled.button`
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  border: none;
  border-radius: 8px;
  color: #232931;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 8px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(67, 233, 123, 0.3);
  }
`;

const tabBtnStyle = (active) => ({
  background: active ? 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)' : 'rgba(35,41,49,0.85)',
  color: active ? '#fff' : '#b2bec3',
  border: 'none',
  borderRadius: 12,
  fontWeight: 600,
  fontSize: '0.93em',
  padding: '6px 18px',
  cursor: 'pointer',
  marginRight: 8,
  boxShadow: active ? '0 2px 8px #43e97b33' : 'none',
  transition: 'background .2s,color .2s, box-shadow .2s',
});

function getAge(birth_day, birth_month, birth_year) {
  if (!birth_day || !birth_month || !birth_year) return '-';
  const today = new Date();
  let age = today.getFullYear() - birth_year;
  const m = today.getMonth() + 1 - birth_month;
  if (m < 0 || (m === 0 && today.getDate() < birth_day)) {
    age--;
  }
  return age;
}

// Приводим URL аватарок к абсолютному, если приходит относительный путь от бэкенда
function normalizeAvatarUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return `${api.defaults.baseURL}${trimmed}`;
  return `${api.defaults.baseURL}/${trimmed}`;
}



function EmployeeList({ employees, loading, onEdit, onCongrats, setEmployees, usersByEmployeeId }) {
  const [search, setSearch] = useState('');

  const safeEmployees = Array.isArray(employees) ? employees : [];
  const filteredEmployees = safeEmployees.filter((e) =>
    (e.first_name + ' ' + e.last_name).toLowerCase().includes(search.trim().toLowerCase())
  );

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

  return (
    <div style={{ width: '100%', marginLeft: -220, paddingLeft: 0, maxWidth: 1000 }}>
      <style>{`
        .styled-empl-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 1em;
          margin-left: 160px;
          background: linear-gradient(135deg, rgba(44, 62, 80, 0.8) 0%, rgba(52, 73, 94, 0.8) 100%);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }
        .styled-empl-table th, .styled-empl-table td {
          padding: 16px;
          text-align: left;
        }
        .styled-empl-table th {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          font-size: 1.1em;
          font-weight: 700;
          border-bottom: 2px solid rgba(255, 255, 255, 0.2);
        }
        .styled-empl-table tr {
          transition: all 0.3s ease;
        }
        .styled-empl-table tbody tr:nth-child(even) {
          background: rgba(255, 255, 255, 0.05);
        }
        .styled-empl-table tbody tr:hover {
          background: rgba(67, 233, 123, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }
        .styled-empl-table td {
          color: #ffffff;
          font-size: 1em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .styled-empl-table td:last-child {
          white-space: nowrap;
        }
      `}</style>
      <input
        type="text"
        placeholder="Поиск сотрудников..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '12px 16px',
          marginBottom: '20px',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          fontSize: '1em',
          marginLeft: 160,
          background: 'rgba(255, 255, 255, 0.05)',
          color: '#ffffff',
          outline: 'none',
        }}
      />
      <table className="styled-empl-table">
        <thead>
          <tr>
            <th>Фото</th>
            <th>Имя</th>
            <th>Должность</th>
            <th>Дата рождения</th>
            <th>Возраст</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '1.1em' }}>
                Загрузка...
              </td>
            </tr>
          ) : filteredEmployees.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '1.1em' }}>
                Сотрудники не найдены
              </td>
            </tr>
          ) : (
            filteredEmployees.map((emp) => {
              const user = usersByEmployeeId[String(emp.id)] || {};
              const avatarUrl = normalizeAvatarUrl(user.avatar);
              const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`;

              return (
                <tr key={emp.id}>
                  <td>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: avatarUrl
                          ? `url(${avatarUrl}) center/cover`
                          : getGradientByName(`${emp.first_name} ${emp.last_name}`),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '0.9em',
                      }}
                    >
                      {!avatarUrl && initials}
                    </div>
                  </td>
                  <td>{emp.first_name} {emp.last_name}</td>
                  <td>{emp.position}</td>
                  <td>
                    {emp.birth_day && emp.birth_month
                      ? `${emp.birth_day}.${emp.birth_month}${emp.birth_year ? `.${emp.birth_year}` : ''}`
                      : '-'}
                  </td>
                  <td>{getAge(emp.birth_day, emp.birth_month, emp.birth_year)}</td>
                  <td>
                    <ActionButton
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('✏️ Редактировать clicked for employee:', emp);
                        if (emp && emp.id) {
                          onEdit(emp);
                        } else {
                          console.error('❌ Invalid employee object for edit:', emp);
                          alert('Ошибка: данные сотрудника некорректны');
                        }
                      }}
                      style={{ 
                        marginRight: '8px',
                        position: 'relative',
                        zIndex: 10
                      }}
                    >
                      Редактировать
                    </ActionButton>
                    <ActionButton
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🎉 Поздравить clicked for employee:', emp);
                        if (emp && emp.id) {
                          onCongrats(emp);
                        } else {
                          console.error('❌ Invalid employee object:', emp);
                          alert('Ошибка: данные сотрудника некорректны');
                        }
                      }}
                      style={{ 
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        marginRight: '8px',
                        position: 'relative',
                        zIndex: 10
                      }}
                    >
                      Поздравить
                    </ActionButton>
                    <ActionButton
                      style={{ background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' }}
                      onClick={async () => {
                        if (window.confirm('Удалить сотрудника и связанного пользователя?')) {
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
                              
                              // Перезагружаем список сотрудников для синхронизации
                              setTimeout(async () => {
                                try {
                                  const empRes = await api.get('/api/employees');
                                  const empArr = Array.isArray(empRes.data) ? empRes.data : [];
                                  setEmployees(empArr);
                                } catch (e) {
                                  console.error('⚠️ Error reloading employees:', e);
                                }
                              }, 100);
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
                        }
                      }}
                    >
                      Удалить
                    </ActionButton>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

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
      const response = await api.post('/api/congratulations/edit-employee', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('✅ Employee updated:', response);
      
      // Сохраняем изменения - onSaved вызовет перезагрузку списка
      onSaved();
    } catch (err) {
      console.error('❌ Error updating employee:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Неизвестная ошибка';
      alert(`Ошибка при сохранении: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: 100002,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
          color: '#fff',
          borderRadius: 20,
          minWidth: 500,
          maxWidth: 600,
          width: '90%',
          padding: 0,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          fontSize: '1em',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Заголовок в стиле модалки рейтинга */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 32px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
          <h2 style={{
            margin: 0,
            color: '#ffffff',
            fontSize: '1.5rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            👤 Редактировать сотрудника
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '20px',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ 
                  fontWeight: 600, 
                  color: '#ffffff', 
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '1rem'
                }}>Имя:</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  style={{ 
                    width: '100%',
                    borderRadius: 12, 
                    border: '2px solid rgba(255, 255, 255, 0.1)', 
                    padding: '12px 16px', 
                    fontWeight: 500, 
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  fontWeight: 600, 
                  color: '#ffffff', 
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '1rem'
                }}>Фамилия:</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  style={{ 
                    width: '100%',
                    borderRadius: 12, 
                    border: '2px solid rgba(255, 255, 255, 0.1)', 
                    padding: '12px 16px', 
                    fontWeight: 500, 
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  fontWeight: 600, 
                  color: '#ffffff', 
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '1rem'
                }}>Дата рождения:</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  style={{ 
                    width: '100%',
                    borderRadius: 12, 
                    border: '2px solid rgba(255, 255, 255, 0.1)', 
                    padding: '12px 16px', 
                    fontWeight: 500, 
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  fontWeight: 600, 
                  color: '#ffffff', 
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '1rem'
                }}>Фото сотрудника:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatar(e.target.files[0])}
                  style={{ 
                    width: '100%',
                    borderRadius: 12, 
                    border: '2px solid rgba(255, 255, 255, 0.1)', 
                    padding: '12px 16px', 
                    fontWeight: 500, 
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                />
              </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
            <ActionButton
              type="button"
              onClick={onClose}
              style={{ background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' }}
            >
              Отмена
            </ActionButton>
            <ActionButton
              type="submit"
              disabled={saving}
              style={{ background: 'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)' }}
            >
              {saving ? 'Сохраняю...' : 'Применить'}
            </ActionButton>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AddUserModal({ onClose, onAdded }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // только success

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
      // Ошибки не отображаем
    const formData = new FormData();
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
      const res = await api.post('/api/congratulations/add-employee', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data && res.data.success) {
        setMessage('Сотрудник и аватарка успешно добавлены!');
        setMessageType('success');
        setTimeout(() => {
          onAdded();
        }, 1200);
      } else {
        setMessage('Сотрудник добавлен, но аватарка не загружена.');
          // Ошибки не отображаем
      }
    } catch (err) {
      setMessage('Ошибка при добавлении пользователя или аватарки');
        // Ошибки не отображаем
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(34,40,49,0.82)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#232526',
          color: '#fff',
          borderRadius: 24,
          minWidth: 420,
          maxWidth: 520,
          width: '100%',
          padding: '38px 38px 28px 38px',
          boxShadow: '0 8px 40px #2193b044, 0 0 16px #43e97b55',
          position: 'relative',
          fontSize: '0.93em',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 18,
            right: 24,
            fontSize: 28,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#2193b0',
          }}
        >
          ×
        </button>
        <h3 style={{ marginBottom: 18, color: '#43e97b', fontWeight: 800, fontSize: '1.22em' }}>
          Добавить пользователя
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Имя"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            style={{
              width: '100%',
              marginBottom: 12,
              padding: 10,
              borderRadius: 8,
              border: '2px solid #43e97b',
              fontWeight: 600,
              fontSize: '0.93em',
            }}
          />
          <input
            placeholder="Фамилия"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            style={{
              width: '100%',
              marginBottom: 12,
              padding: 10,
              borderRadius: 8,
              border: '2px solid #43e97b',
              fontWeight: 600,
              fontSize: '0.93em',
            }}
          />
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            style={{
              width: '100%',
              marginBottom: 12,
              padding: 10,
              borderRadius: 8,
              border: '2px solid #2193b0',
              fontWeight: 600,
              fontSize: '0.93em',
            }}
          />
          <label style={{ fontWeight: 600, color: '#43e97b', marginBottom: 6 }}>Аватар:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatar(e.target.files[0])}
            style={{ borderRadius: 8, border: '2px solid #43e97b', padding: 8, background: '#fff', color: '#2193b0' }}
          />
          {message && (
            <div
              style={{
                marginTop: 12,
                color: messageType === 'success' ? '#43e97b' : '#e74c3c',
                fontWeight: 600,
              }}
            >
              {message}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...tabBtnStyle(false), background: '#e74c3c', color: '#fff' }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...tabBtnStyle(false),
                background: 'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)',
                color: '#fff',
              }}
            >
              {saving ? 'Сохраняю...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CongratulationsModal({ onClose }) {
  const { state } = useApp();
  const [tab, setTab] = useState('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersByEmployeeId, setUsersByEmployeeId] = useState({});
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [congratsUser, setCongratsUser] = useState(null);

  // Логирование изменений congratsUser для отладки
  useEffect(() => {
    if (congratsUser) {
      console.log('🎉 congratsUser set to:', congratsUser);
    } else {
      console.log('🔒 congratsUser cleared');
    }
  }, [congratsUser]);

  // Защита: employees всегда массив
  const safeEmployees = Array.isArray(employees) ? employees : [];

  useEffect(() => {
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
  }, [showAddModal, editUser]);

  const filteredEmployees = safeEmployees.filter((e) =>
    (e.first_name + ' ' + e.last_name).toLowerCase().includes(search.trim().toLowerCase())
  );
  console.log('employees:', employees);
  console.log('safeEmployees:', safeEmployees);
  console.log('filteredEmployees:', filteredEmployees);

  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>
            <FiUsers />
            Сотрудники
          </ModalTitle>
          <CloseBtn onClick={onClose}>
            <FiX />
          </CloseBtn>
        </ModalHeader>
        <ModalBody>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '0 auto 24px',
        width: '100%',
        maxWidth: 1120,
        padding: '0 16px',
        boxSizing: 'border-box',
        marginLeft: 50
      }}>
        <button style={tabBtnStyle(tab === 'list')} onClick={() => setTab('list')}>
          Список
        </button>
        <button style={tabBtnStyle(tab === 'calendar')} onClick={() => setTab('calendar')}>
          Календарь
        </button>
        <button
          style={{ ...tabBtnStyle(false), background: 'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)', color: '#fff' }}
          onClick={() => setShowAddModal(true)}
        >
          Добавить пользователя
        </button>
        <button
          style={{ ...tabBtnStyle(false), background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}
          onClick={() => window.dispatchEvent(new Event('show-employee-rating'))}
        >
          Рейтинг успеваемости
        </button>
        <input
          type="text"
          placeholder="Быстрый поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginLeft: 18,
            padding: '7px 16px',
            borderRadius: 10,
            border: '2px solid #43e97b',
            fontSize: '0.97em',
            fontWeight: 600,
            outline: 'none',
          }}
        />
      </div>
      {tab === 'list' && (
        <div style={{ width: '100%', maxWidth: 1120, margin: '0 auto', padding: '0 16px', boxSizing: 'border-box' }}>
          <div style={{ marginLeft: 200 }}>
            <EmployeeList
              employees={filteredEmployees}
              loading={loading}
              onEdit={setEditUser}
              onCongrats={setCongratsUser}
              setEmployees={setEmployees}
              usersByEmployeeId={usersByEmployeeId}
            />
          </div>
        </div>
      )}
{tab === 'calendar' && <BirthdayCalendar employees={employees} />}
{showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onAdded={() => setShowAddModal(false)} />}
{editUser && (
  <EditUserModal 
    user={editUser} 
    onClose={() => {
      console.log('🔒 Closing EditUserModal, editUser:', editUser);
      setEditUser(null);
    }} 
    onSaved={() => {
      console.log('✅ User saved, reloading...');
      setEditUser(null);
      // Перезагружаем список сотрудников
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
    }} 
  />
)}
{congratsUser && (
  <CongratulationSendModal
    user={congratsUser}
    open={!!congratsUser}
    onClose={() => {
      console.log('🔒 Closing CongratulationSendModal, congratsUser:', congratsUser);
      setCongratsUser(null);
    }}
    onSent={() => {
      console.log('✅ Congratulation sent');
      setCongratsUser(null);
      window.dispatchEvent(new CustomEvent('news-published'));
    }}
  />
)}
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
  );
}