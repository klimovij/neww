import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiX, FiMonitor, FiSave, FiTrash2, FiUserPlus, FiEdit2, FiUser, FiHardDrive } from 'react-icons/fi';

export default function PcActivityManagementModal({ open, onClose }) {
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [diskInfo, setDiskInfo] = useState(null);
  const [diskInfoLoading, setDiskInfoLoading] = useState(false);
  
  // Состояния для добавления/редактирования пользователя
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFio, setNewFio] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editFio, setEditFio] = useState('');

  // Загрузка информации о дисковом пространстве
  const loadDiskInfo = async () => {
    setDiskInfoLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/server-disk-info', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.diskInfo) {
          setDiskInfo(data.diskInfo);
        }
      }
    } catch (err) {
      console.error('Error loading disk info:', err);
    } finally {
      setDiskInfoLoading(false);
    }
  };

  // Загрузка пользователей и настроек
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      
      // Загружаем пользователей
      const usersRes = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }
      
      // Загружаем настройки активности ПК
      const settingsRes = await fetch('/api/pc-activity-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.success && Array.isArray(settingsData.settings)) {
          const settingsMap = {};
          settingsData.settings.forEach(setting => {
            settingsMap[setting.username] = {
              screenshots_blocked: setting.screenshots_blocked === 1,
              screenshot_interval_minutes: setting.screenshot_interval_minutes || 5
            };
          });
          setSettings(settingsMap);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadData();
    loadDiskInfo();
  }, [open]);

  // Обновление настройки для пользователя
  const updateUserSetting = (username, field, value) => {
    setSettings(prev => ({
      ...prev,
      [username]: {
        ...(prev[username] || { screenshots_blocked: false, screenshot_interval_minutes: 5 }),
        [field]: value
      }
    }));
  };

  // Сохранение настроек
  const saveSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const updates = Object.entries(settings).map(([username, setting]) => ({
        username,
        screenshots_blocked: setting.screenshots_blocked,
        screenshot_interval_minutes: setting.screenshot_interval_minutes
      }));
      
      // Сохраняем настройки для каждого пользователя
      const promises = updates.map(update =>
        fetch('/api/pc-activity-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(update)
        })
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => !r.ok);
      
      if (errors.length > 0) {
        setError('Не удалось сохранить некоторые настройки');
      } else {
        setSuccess('Настройки успешно сохранены');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  // Добавление нового пользователя
  const handleAddUser = async () => {
    if (!newUsername.trim()) {
      setError('Введите username');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/pc-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          fio: newFio.trim() || null
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccess(data.updated ? 'FIO обновлен' : 'Пользователь создан');
        setNewUsername('');
        setNewFio('');
        setShowAddUserForm(false);
        setTimeout(() => setSuccess(''), 3000);
        await loadData(); // Перезагружаем список пользователей
      } else {
        setError(data.error || 'Не удалось добавить пользователя');
      }
    } catch (err) {
      console.error('Error adding user:', err);
      setError('Ошибка при добавлении пользователя');
    } finally {
      setSaving(false);
    }
  };

  // Редактирование FIO
  const handleEditFio = async (username) => {
    if (!editFio.trim()) {
      setError('Введите ФИО');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/pc-users/${username}/fio`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fio: editFio.trim()
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccess('FIO обновлен');
        setEditingUser(null);
        setEditFio('');
        setTimeout(() => setSuccess(''), 3000);
        await loadData(); // Перезагружаем список пользователей
      } else {
        setError(data.error || 'Не удалось обновить FIO');
      }
    } catch (err) {
      console.error('Error updating FIO:', err);
      setError('Ошибка при обновлении FIO');
    } finally {
      setSaving(false);
    }
  };

  // Удаление пользователя и всех его данных
  const handleDeleteUser = async (username) => {
    const confirmMessage = `ВНИМАНИЕ! Это удалит ВСЕ данные пользователя ${username}:\n\n` +
      `- Все записи входов/выходов (work_time_logs)\n` +
      `- Все записи активности (сайты, приложения)\n` +
      `- Все скриншоты (файлы и записи в БД)\n` +
      `- Все настройки активности ПК\n\n` +
      `Это действие НЕОБРАТИМО! Продолжить?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/pc-users/${username}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccess(`Все данные пользователя ${username} удалены`);
        setTimeout(() => setSuccess(''), 3000);
        await loadData(); // Перезагружаем список пользователей
      } else {
        setError(data.error || 'Не удалось удалить данные пользователя');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Ошибка при удалении данных пользователя');
    } finally {
      setSaving(false);
    }
  };

  // Удаление настроек для пользователя
  const deleteUserSettings = async (username) => {
    if (!window.confirm(`Удалить настройки для пользователя ${username}?`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/pc-activity-settings/${username}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setSettings(prev => {
          const newSettings = { ...prev };
          delete newSettings[username];
          return newSettings;
        });
        setSuccess('Настройки удалены');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Не удалось удалить настройки');
      }
    } catch (err) {
      console.error('Error deleting settings:', err);
      setError('Ошибка при удалении настроек');
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FiMonitor size={24} color="#86efac" />
            <h2 style={{ margin: 0, color: '#86efac', fontSize: '20px', fontWeight: 700 }}>
              Управление активностью ПК
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FiX />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          {/* Информация о дисковом пространстве */}
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <FiHardDrive size={20} color="#93c5fd" />
              <h3 style={{ margin: 0, color: '#93c5fd', fontSize: '16px', fontWeight: 700 }}>
                Дисковое пространство сервера
              </h3>
            </div>
            {diskInfoLoading ? (
              <div style={{ color: '#999', fontSize: '14px' }}>Загрузка...</div>
            ) : diskInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>Всего:</span>
                  <span style={{ color: '#93c5fd', fontSize: '14px', fontWeight: 700 }}>{diskInfo.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>Использовано:</span>
                  <span style={{ color: '#fecaca', fontSize: '14px', fontWeight: 700 }}>{diskInfo.used}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>Свободно:</span>
                  <span style={{ color: '#86efac', fontSize: '14px', fontWeight: 700 }}>{diskInfo.free}</span>
                </div>
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: '#fff', fontSize: '14px' }}>Заполнено:</span>
                    <span 
                      style={{ 
                        color: parseFloat(diskInfo.percentUsed) > 80 ? '#fecaca' : parseFloat(diskInfo.percentUsed) > 60 ? '#fbbf24' : '#86efac',
                        fontSize: '14px',
                        fontWeight: 700
                      }}
                    >
                      {diskInfo.percentUsed}
                    </span>
                  </div>
                  {/* Прогресс-бар */}
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: diskInfo.percentUsed,
                        height: '100%',
                        background: parseFloat(diskInfo.percentUsed) > 80 
                          ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                          : parseFloat(diskInfo.percentUsed) > 60
                          ? 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)'
                          : 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#999', fontSize: '14px' }}>Не удалось загрузить информацию</div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: '#fff', padding: '40px' }}>
              Загрузка...
            </div>
          ) : (
            <>
              {error && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    color: '#fecaca',
                    marginBottom: '16px'
                  }}
                >
                  {error}
                </div>
              )}
              
              {success && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.5)',
                    color: '#86efac',
                    marginBottom: '16px'
                  }}
                >
                  {success}
                </div>
              )}

              {/* Кнопка добавления пользователя */}
              <div style={{ marginBottom: '20px' }}>
                {!showAddUserForm ? (
                  <button
                    onClick={() => setShowAddUserForm(true)}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '10px',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: '#93c5fd',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      justifyContent: 'center'
                    }}
                  >
                    <FiUserPlus size={18} />
                    Добавить пользователя
                  </button>
                ) : (
                  <div
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    <h3 style={{ margin: '0 0 12px 0', color: '#93c5fd', fontSize: '16px', fontWeight: 700 }}>
                      Добавить пользователя
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', color: '#fff', marginBottom: '6px', fontSize: '14px' }}>
                          Username <span style={{ color: '#fecaca' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="например: oleg_ksendzik"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: '#fff',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#fff', marginBottom: '6px', fontSize: '14px' }}>
                          ФИО
                        </label>
                        <input
                          type="text"
                          value={newFio}
                          onChange={(e) => setNewFio(e.target.value)}
                          placeholder="например: Олег Ксендзик"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: '#fff',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleAddUser}
                          disabled={saving || !newUsername.trim()}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid rgba(34, 197, 94, 0.5)',
                            background: 'rgba(34, 197, 94, 0.2)',
                            color: '#86efac',
                            cursor: saving || !newUsername.trim() ? 'not-allowed' : 'pointer',
                            fontWeight: 700,
                            fontSize: '14px',
                            opacity: saving || !newUsername.trim() ? 0.6 : 1
                          }}
                        >
                          {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                        <button
                          onClick={() => {
                            setShowAddUserForm(false);
                            setNewUsername('');
                            setNewFio('');
                          }}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px'
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {users.map(user => {
                  const userSettings = settings[user.username] || {
                    screenshots_blocked: false,
                    screenshot_interval_minutes: 5
                  };
                  
                  const isEditing = editingUser === user.username;
                  
                  return (
                    <div
                      key={user.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <input
                                type="text"
                                value={editFio}
                                onChange={(e) => setEditFio(e.target.value)}
                                placeholder="Введите ФИО"
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(34, 197, 94, 0.5)',
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  color: '#fff',
                                  fontSize: '14px'
                                }}
                              />
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleEditFio(user.username)}
                                  disabled={saving || !editFio.trim()}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(34, 197, 94, 0.5)',
                                    background: 'rgba(34, 197, 94, 0.2)',
                                    color: '#86efac',
                                    cursor: saving || !editFio.trim() ? 'not-allowed' : 'pointer',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    opacity: saving || !editFio.trim() ? 0.6 : 1
                                  }}
                                >
                                  Сохранить
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUser(null);
                                    setEditFio('');
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '12px'
                                  }}
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 700 }}>
                                {user.fio || user.username}
                              </h3>
                              <p style={{ margin: '4px 0 0 0', color: '#999', fontSize: '14px' }}>
                                {user.username}
                              </p>
                            </>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {!isEditing && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingUser(user.username);
                                  setEditFio(user.fio || '');
                                }}
                                style={{
                                  padding: '8px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(59, 130, 246, 0.5)',
                                  background: 'rgba(59, 130, 246, 0.2)',
                                  color: '#93c5fd',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  title: 'Редактировать ФИО'
                                }}
                                title="Редактировать ФИО"
                              >
                                <FiEdit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.username)}
                                style={{
                                  padding: '8px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(239, 68, 68, 0.5)',
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  color: '#fecaca',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Удалить пользователя и все данные"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Блокировка скриншотов */}
                      <div style={{ marginBottom: '12px' }}>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={userSettings.screenshots_blocked}
                            onChange={(e) => updateUserSetting(user.username, 'screenshots_blocked', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span>Блокировать скриншоты</span>
                        </label>
                        <p style={{ margin: '4px 0 0 26px', color: '#999', fontSize: '12px' }}>
                          Если включено, скриншоты от этого пользователя не будут сохраняться на сервер
                        </p>
                      </div>

                      {/* Интервал сохранения скриншотов */}
                      {!userSettings.screenshots_blocked && (
                        <div>
                          <label style={{ display: 'block', color: '#fff', marginBottom: '8px', fontSize: '14px' }}>
                            Интервал сохранения скриншотов (минут):
                          </label>
                          <select
                            value={userSettings.screenshot_interval_minutes}
                            onChange={(e) => updateUserSetting(user.username, 'screenshot_interval_minutes', parseInt(e.target.value))}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(0, 0, 0, 0.3)',
                              color: '#fff',
                              fontSize: '14px',
                              cursor: 'pointer'
                            }}
                          >
                            <option value={5}>5 минут (по умолчанию)</option>
                            <option value={15}>15 минут</option>
                            <option value={20}>20 минут</option>
                            <option value={30}>30 минут</option>
                          </select>
                          <p style={{ margin: '4px 0 0 0', color: '#999', fontSize: '12px' }}>
                            Скриншоты будут сохраняться только с указанным интервалом
                          </p>
                        </div>
                      )}
                      
                      {settings[user.username] && (
                        <div style={{ marginTop: '12px' }}>
                          <button
                            onClick={() => deleteUserSettings(user.username)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(239, 68, 68, 0.5)',
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: '#fecaca',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            Удалить настройки активности
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(0, 0, 0, 0.3)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            Отмена
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: '1px solid rgba(34, 197, 94, 0.5)',
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#86efac',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: saving ? 0.6 : 1
            }}
          >
            <FiSave size={16} />
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
