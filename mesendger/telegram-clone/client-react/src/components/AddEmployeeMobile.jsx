import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiPlus, FiUser, FiCalendar, FiImage } from 'react-icons/fi';
import api from '../services/api';

export default function AddEmployeeMobile({ open, onClose, onOpenMobileSidebar, onAdded }) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

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
    // Сброс формы при закрытии
    setFirstName('');
    setLastName('');
    setBirthDate('');
    setAvatar(null);
    setMessage('');
    setMessageType('');
    
    if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
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
        setMessage('Сотрудник успешно добавлен!');
        setMessageType('success');
        // Сброс формы
        setFirstName('');
        setLastName('');
        setBirthDate('');
        setAvatar(null);
        // Вызываем onAdded callback, если он передан
        if (onAdded) {
          setTimeout(() => {
            onAdded();
          }, 1200);
        } else {
          // Закрытие модалки через 1.5 секунды, если нет callback
          setTimeout(() => {
            handleClose();
          }, 1500);
        }
      } else {
        setMessage('Ошибка при добавлении сотрудника');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Ошибка при добавлении сотрудника');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 10000,
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <FiPlus size={18} />
            Добавить сотрудника
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

        {/* Форма */}
        <div style={{ flex: 1, padding: '24px 16px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Имя */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#43e97b',
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '10px',
              }}>
                <FiUser size={16} />
                Имя *
              </label>
              <input
                type="text"
                placeholder="Введите имя сотрудника"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(67, 233, 123, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#43e97b'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(67, 233, 123, 0.3)'}
              />
            </div>

            {/* Фамилия */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#43e97b',
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '10px',
              }}>
                <FiUser size={16} />
                Фамилия *
              </label>
              <input
                type="text"
                placeholder="Введите фамилию сотрудника"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(67, 233, 123, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#43e97b'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(67, 233, 123, 0.3)'}
              />
            </div>

            {/* Дата рождения */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#43e97b',
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '10px',
              }}>
                <FiCalendar size={16} />
                Дата рождения
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(67, 233, 123, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#43e97b'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(67, 233, 123, 0.3)'}
              />
            </div>

            {/* Фото */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#43e97b',
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '10px',
              }}>
                <FiImage size={16} />
                Фото сотрудника
              </label>
              <div style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '2px dashed rgba(67, 233, 123, 0.3)',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#43e97b';
                e.currentTarget.style.background = 'rgba(67, 233, 123, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(67, 233, 123, 0.3)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatar(e.target.files[0])}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#94a3b8',
                  fontSize: '14px',
                }}>
                  <FiImage size={32} style={{ color: '#43e97b' }} />
                  <span>{avatar ? avatar.name : 'Нажмите для выбора фото'}</span>
                  {avatar && (
                    <span style={{ fontSize: '12px', color: '#43e97b' }}>
                      ✓ Файл выбран
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Сообщение */}
            {message && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: messageType === 'success' 
                  ? 'rgba(67, 233, 123, 0.15)' 
                  : 'rgba(231, 76, 60, 0.15)',
                border: `2px solid ${messageType === 'success' ? '#43e97b' : '#e74c3c'}`,
                color: messageType === 'success' ? '#43e97b' : '#e74c3c',
                fontSize: '14px',
                fontWeight: 600,
                textAlign: 'center',
              }}>
                {message}
              </div>
            )}

            {/* Кнопки */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(231, 76, 60, 0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(231, 76, 60, 0.3)';
                }}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving || !firstName.trim() || !lastName.trim()}
                style={{
                  flex: 1,
                  background: saving || !firstName.trim() || !lastName.trim()
                    ? 'rgba(67, 233, 123, 0.3)'
                    : 'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: saving || !firstName.trim() || !lastName.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: saving || !firstName.trim() || !lastName.trim()
                    ? 'none'
                    : '0 2px 8px rgba(67, 233, 123, 0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  opacity: saving || !firstName.trim() || !lastName.trim() ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!saving && firstName.trim() && lastName.trim()) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(67, 233, 123, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving && firstName.trim() && lastName.trim()) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(67, 233, 123, 0.3)';
                  }
                }}
              >
                {saving ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite',
                    }} />
                    Сохранение...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <FiPlus size={18} />
                    Добавить
                  </span>
                )}
              </button>
            </div>
          </form>
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
      </div>
    </div>,
    document.body
  );
}

