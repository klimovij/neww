import React, { useRef, useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiSettings, FiAlertTriangle, FiSmile, FiFileText } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import EmojiSettingsMobile from './EmojiSettingsMobile';
import TemplatesManagementMobile from './TemplatesManagementMobile';
import AppTitleSettingsMobile from './AppTitleSettingsMobile';
import UserRightsMobile from './UserRightsMobile';

export default function AdminMobile({ 
  open, 
  onClose, 
  onOpenMobileSidebar,
  onOpenEmojiSettings,
  onOpenTemplates,
  onOpenAppTitleSettings,
  onOpenUserRights
}) {
  const { state } = useApp();
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  
  // Admin states
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminHost, setAdminHost] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [adminEnabledFilter, setAdminEnabledFilter] = useState('all');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newNoExpire, setNewNoExpire] = useState(true);
  const [editRow, setEditRow] = useState(null);
  const [showEmojiSettings, setShowEmojiSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAppTitleSettings, setShowAppTitleSettings] = useState(false);
  const [showUserRights, setShowUserRights] = useState(false);

  // Load users when modal opens
  useEffect(() => {
    async function loadUsers() {
      const token = localStorage.getItem('token');
      if (!token) return;
      setAdminLoading(true);
      setAdminError('');
      try {
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
    if (open) loadUsers();
  }, [open]);

  const adminCreateUser = async (addRdpParam) => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch('/api/admin/local-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName, password: newPassword, description: newDescription, noExpire: newNoExpire, addToRdp: addRdpParam })
      });
      const data = await r.json();
      if (!r.ok || data?.success === false) throw new Error(data?.error || 'Ошибка создания');
      const createdName = newName;
      setNewName(''); setNewPassword(''); setNewDescription(''); setNewNoExpire(true);
      const rr = await fetch('/api/admin/local-users', { headers: { Authorization: `Bearer ${token}` } });
      const users = await rr.json();
      setAdminUsers(Array.isArray(users) ? users : []);
      if (addRdpParam && createdName) {
        try {
          await fetch(`/api/admin/local-users/${encodeURIComponent(createdName)}/rdp`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ add: true }) });
        } catch {}
      }
      alert('Пользователь создан');
    } catch (e) {
      alert('Ошибка: ' + e.message);
    }
  };

  const adminRefreshUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      setAdminLoading(true);
      const r = await fetch('/api/admin/local-users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      setAdminUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      alert('Ошибка обновления списка: ' + e.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const adminShutdown1C = async () => {
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
  };

  const handleSaveEdit = async () => {
    const token = localStorage.getItem('token');
    try {
      let currentUserName = editRow.name;
      
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
      
      const descRes = await fetch(`/api/admin/local-users/${encodeURIComponent(currentUserName)}/description`, { 
        method:'POST', 
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, 
        body: JSON.stringify({ description: editRow.description || '' }) 
      });
      if (!descRes.ok) {
        const errorData = await descRes.json().catch(() => ({ message: 'Ошибка обновления описания' }));
        throw new Error(errorData.message || `Ошибка обновления описания: ${descRes.status}`);
      }
      
      const noExpireRes = await fetch(`/api/admin/local-users/${encodeURIComponent(currentUserName)}/no-expire`, { 
        method:'POST', 
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, 
        body: JSON.stringify({ noExpire: !!editRow.noExpire }) 
      });
      if (!noExpireRes.ok) {
        const errorData = await noExpireRes.json().catch(() => ({ message: 'Ошибка обновления флага no-expire' }));
        throw new Error(errorData.message || `Ошибка обновления флага no-expire: ${noExpireRes.status}`);
      }
      
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
  };

  const adminRdp = async (name, add) => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(`/api/admin/local-users/${encodeURIComponent(name)}/rdp`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ add }) });
      const data = await r.json();
      if (!r.ok || data?.success === false) throw new Error(data?.error || 'Ошибка');
      alert(add ? 'Добавлен в группу RDP' : 'Удален из группы RDP');
    } catch (e) {
      alert('Ошибка: ' + e.message);
    }
  };

  const adminEnable = async (name, enable) => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(`/api/admin/local-users/${encodeURIComponent(name)}/${enable ? 'enable' : 'disable'}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      if (!r.ok || data?.success === false) throw new Error(data?.error || 'Ошибка');
      const rr = await fetch('/api/admin/local-users', { headers: { Authorization: `Bearer ${token}` } });
      const users = await rr.json();
      setAdminUsers(Array.isArray(users) ? users : []);
      if (editRow && editRow.name === name) {
        setEditRow({...editRow, enabled: enable});
      }
    } catch (e) {
      alert('Ошибка: ' + e.message);
    }
  };

  const adminDelete = async (name) => {
    if (!window.confirm('Удалить пользователя? Это действие нельзя отменить.')) return;
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(`/api/admin/local-users/${encodeURIComponent(name)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      if (!r.ok || data?.success === false) throw new Error(data?.error || 'Ошибка');
      const rr = await fetch('/api/admin/local-users', { headers: { Authorization: `Bearer ${token}` } });
      const users = await rr.json();
      setAdminUsers(Array.isArray(users) ? users : []);
      if (editRow && editRow.name === name) {
        setEditRow(null);
      }
      alert('Пользователь удален');
    } catch (e) {
      alert('Ошибка: ' + e.message);
    }
  };

  // Обработчики свайпа
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

  const handleClose = () => {
    if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
    onClose();
  };

  if (!open) return null;

  const filteredUsers = adminUsers
    .filter(u => !adminFilter || (u?.Name || '').toLowerCase().includes(adminFilter.toLowerCase()))
    .filter(u => {
      if (adminEnabledFilter === 'all') return true;
      if (adminEnabledFilter === 'enabled') return !!u?.Enabled;
      return !u?.Enabled;
    });

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
            backgroundColor: 'rgba(35, 41, 49, 0.95)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 10001,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <button
            onClick={handleClose}
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
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            title="Назад"
          >
            <FaArrowLeft />
          </button>
          
          <h2
            style={{
              color: '#a3e635',
              fontSize: '18px',
              fontWeight: 900,
              margin: 0,
              flex: 1,
              textAlign: 'center',
            }}
          >
            Управление
          </h2>

          <button
            onClick={handleClose}
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
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            title="Закрыть"
          >
            <FiX />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
          {/* Информация о хосте */}
          <div style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '20px',
            color: '#93c5fd',
            fontSize: '14px'
          }}>
            <strong>Хост:</strong> <span style={{color:'#b2ffb2', fontWeight:700}}>{adminHost || '...'}</span>
          </div>

          {/* Кнопки управления */}
          <div style={{ display:'flex', flexDirection: 'column', gap:12, marginBottom:20 }}>
            {state.user?.role === 'admin' && (
              <button
                onClick={() => {
                  setShowEmojiSettings(true);
                }}
                style={{
                  padding:'14px 16px',
                  borderRadius:12,
                  border:'1px solid rgba(255,193,7,0.45)',
                  background:'rgba(255,193,7,0.18)',
                  color:'#ffd43b',
                  cursor:'pointer',
                  fontWeight:700,
                  display:'flex',
                  alignItems:'center',
                  gap:10,
                  fontSize: '15px',
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                <FiSmile size={20} /> Управление эмодзи
              </button>
            )}
            <button
              onClick={() => {
                setShowTemplates(true);
              }}
              style={{
                padding:'14px 16px',
                borderRadius:12,
                border:'1px solid rgba(59,130,246,0.45)',
                background:'rgba(59,130,246,0.18)',
                color:'#93c5fd',
                cursor:'pointer',
                fontWeight:700,
                display:'flex',
                alignItems:'center',
                gap:10,
                fontSize: '15px',
                width: '100%',
                justifyContent: 'center'
              }}
            >
              <FiFileText size={20} /> Шаблоны
            </button>
            <button
              onClick={() => {
                setShowAppTitleSettings(true);
              }}
              style={{
                padding:'14px 16px',
                borderRadius:12,
                border:'1px solid rgba(163,230,53,0.45)',
                background:'rgba(163,230,53,0.18)',
                color:'#a3e635',
                cursor:'pointer',
                fontWeight:700,
                display:'flex',
                alignItems:'center',
                gap:10,
                fontSize: '15px',
                width: '100%',
                justifyContent: 'center'
              }}
            >
              <FiSettings size={20} /> Управление названием приложения
            </button>
            {(state.user?.role === 'admin' || state.user?.role === 'hr') && (
              <button
                onClick={() => {
                  setShowUserRights(true);
                }}
                style={{
                  padding:'14px 16px',
                  borderRadius:12,
                  border:'1px solid rgba(139,69,255,0.35)',
                  background:'rgba(139,69,255,0.15)',
                  color:'#c084fc',
                  cursor:'pointer',
                  fontWeight:600,
                  display:'flex',
                  alignItems:'center',
                  gap:10,
                  fontSize: '15px',
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                <FiSettings size={20} /> Права пользователей
              </button>
            )}
            {state.user?.role === 'admin' && (
              <button
                onClick={adminShutdown1C}
                style={{
                  padding:'14px 16px',
                  borderRadius:12,
                  border:'1px solid rgba(239,68,68,0.45)',
                  background:'rgba(239,68,68,0.18)',
                  color:'#fecaca',
                  cursor:'pointer',
                  fontWeight:700,
                  display:'flex',
                  alignItems:'center',
                  gap:10,
                  fontSize: '15px',
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                <FiAlertTriangle size={20} /> Выбросить всех с 1С
              </button>
            )}
          </div>

          {/* Админские функции */}
          {state.user?.role === 'admin' && (
            <>
              {/* Фильтры и обновление */}
              <div style={{ display:'flex', flexDirection: 'column', gap:12, marginBottom:20 }}>
                <button
                  onClick={adminRefreshUsers}
                  style={{
                    padding:'14px 16px',
                    borderRadius:12,
                    border:'1px solid rgba(67,233,123,0.35)',
                    background:'rgba(67,233,123,0.15)',
                    color:'#b2ffb2',
                    cursor:'pointer',
                    fontWeight:700,
                    fontSize: '15px',
                    width: '100%'
                  }}
                >
                  {adminLoading ? 'Загрузка...' : 'Обновить список пользователей'}
                </button>
                <input
                  value={adminFilter}
                  onChange={e=>setAdminFilter(e.target.value)}
                  placeholder="Поиск пользователя..."
                  style={{
                    padding:'12px',
                    borderRadius:10,
                    border:'1px solid #2f3440',
                    background:'#0e1420',
                    color:'#fff',
                    fontSize: '16px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <select
                  value={adminEnabledFilter}
                  onChange={e=>setAdminEnabledFilter(e.target.value)}
                  style={{
                    padding:'12px',
                    borderRadius:10,
                    border:'1px solid #2f3440',
                    background:'#0e1420',
                    color:'#fff',
                    fontSize: '16px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="all">Все</option>
                  <option value="enabled">Включен</option>
                  <option value="disabled">Отключен</option>
                </select>
              </div>

              {/* Создание пользователя */}
              <div style={{
                background:'rgba(255,255,255,0.04)',
                borderRadius:16,
                padding:16,
                marginBottom:20
              }}>
                <h3 style={{marginTop:0, color:'#fff', fontSize: '18px', marginBottom: 16}}>Создать локального пользователя</h3>
                <div style={{display:'flex', flexDirection:'column', gap:12}}>
                  <input 
                    value={newName} 
                    onChange={e=>setNewName(e.target.value)} 
                    placeholder="Имя пользователя" 
                    style={{
                      padding:12, 
                      fontSize:16, 
                      borderRadius:10, 
                      border:'1px solid #333', 
                      background:'#111', 
                      color:'#fff',
                      boxSizing: 'border-box',
                      width: '100%'
                    }} 
                  />
                  <input 
                    type="text" 
                    value={newPassword} 
                    onChange={e=>setNewPassword(e.target.value)} 
                    placeholder="Пароль" 
                    style={{
                      padding:12, 
                      fontSize:16, 
                      borderRadius:10, 
                      border:'1px solid #333', 
                      background:'#111', 
                      color:'#fff',
                      boxSizing: 'border-box',
                      width: '100%'
                    }} 
                  />
                  <input 
                    value={newDescription} 
                    onChange={e=>setNewDescription(e.target.value)} 
                    placeholder="Описание" 
                    style={{
                      padding:12, 
                      fontSize:16, 
                      borderRadius:10, 
                      border:'1px solid #333', 
                      background:'#111', 
                      color:'#fff',
                      boxSizing: 'border-box',
                      width: '100%'
                    }} 
                  />
                  <label style={{display:'flex', alignItems:'center', gap:8, color:'#ddd', fontSize: '15px'}}>
                    <input 
                      type="checkbox" 
                      checked={newNoExpire} 
                      onChange={e=>setNewNoExpire(e.target.checked)} 
                      style={{ width: '20px', height: '20px' }}
                    />
                    Пароль не истекает
                  </label>
                  <div style={{display:'flex', flexDirection: 'column', gap:8}}>
                    <button 
                      onClick={()=>adminCreateUser(false)} 
                      style={{
                        padding:'14px 16px', 
                        fontSize:16, 
                        borderRadius:10, 
                        border:'1px solid #334155', 
                        background:'#0f172a', 
                        color:'#e2e8f0', 
                        cursor:'pointer',
                        width: '100%',
                        fontWeight: 600
                      }}
                    >
                      Создать
                    </button>
                    <button 
                      onClick={()=>adminCreateUser(true)} 
                      style={{
                        padding:'14px 16px', 
                        fontSize:16, 
                        borderRadius:10, 
                        border:'1px solid rgba(67,233,123,0.35)', 
                        background:'rgba(67,233,123,0.15)', 
                        color:'#b2ffb2', 
                        cursor:'pointer', 
                        fontWeight:700,
                        width: '100%'
                      }}
                    >
                      Создать и добавить в RDP
                    </button>
                  </div>
                </div>
              </div>

              {/* Список пользователей */}
              <div style={{
                background:'rgba(255,255,255,0.04)',
                borderRadius:16,
                padding:16
              }}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12}}>
                  <h3 style={{marginTop:0, color:'#fff', fontSize: '18px'}}>Локальные пользователи</h3>
                  {adminLoading && <div style={{color:'#aaa', fontSize: '14px'}}>Загрузка...</div>}
                </div>
                {adminError && <div style={{color:'#fca5a5', marginBottom: 12, fontSize: '14px'}}>{adminError}</div>}
                <div style={{
                  overflowY:'auto',
                  overflowX:'auto',
                  maxHeight:'50vh',
                  WebkitOverflowScrolling:'touch',
                  borderRadius:12,
                  border:'1px solid #2a2f37'
                }}>
                  <div style={{ minWidth: '100%', display: 'table' }}>
                    <div style={{ display: 'table-header-group', background: '#111827', position: 'sticky', top: 0, zIndex: 1 }}>
                      <div style={{ display: 'table-row' }}>
                        <div style={{ display: 'table-cell', padding:'10px 12px', fontWeight:700, color:'#b2bec3', fontSize: '13px', borderBottom: '1px solid #2a2f37' }}>Имя</div>
                        <div style={{ display: 'table-cell', padding:'10px 12px', fontWeight:700, color:'#b2bec3', fontSize: '13px', borderBottom: '1px solid #2a2f37' }}>Статус</div>
                        <div style={{ display: 'table-cell', padding:'10px 12px', fontWeight:700, color:'#b2bec3', fontSize: '13px', borderBottom: '1px solid #2a2f37' }}>Действия</div>
                      </div>
                    </div>
                    <div style={{ display: 'table-row-group' }}>
                      {filteredUsers.map((u, idx) => (
                        <div
                          key={`${u.Name || 'user'}-${idx}`}
                          style={{
                            display: 'table-row',
                            borderTop:'1px solid #2a2f37',
                            borderBottom:'1px solid #2a2f37',
                            background: idx % 2 === 0 ? '#0f1424' : '#0b1120'
                          }}
                        >
                          <div style={{display: 'table-cell', padding:'12px 14px', color:'#fff', fontSize: '14px', borderLeft:'3px solid #1f2937'}} title={u.Name}>{u.Name}</div>
                          <div style={{display: 'table-cell', padding:'12px 14px', fontSize: '14px'}}>
                            <span style={{color: u.Enabled ? '#b2ffb2' : '#fca5a5'}}>{u.Enabled ? 'Включен' : 'Отключен'}</span>
                          </div>
                          <div style={{display: 'table-cell', padding:'12px 14px'}}>
                            <button 
                              onClick={()=>setEditRow({ name: u.Name, originalName: u.Name, description: u.Description || '', password: '', noExpire: false, enabled: u.Enabled })} 
                              style={{
                                padding:'10px 14px', 
                                borderRadius:8, 
                                border:'1px solid #334155', 
                                background:'#0f172a', 
                                color:'#93c5fd', 
                                cursor:'pointer',
                                fontSize: '14px',
                                width: '100%',
                                fontWeight: 600
                              }}
                            >
                              Изменить
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {filteredUsers.length === 0 && (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888', fontSize: '15px' }}>
                      {adminLoading ? 'Загрузка...' : 'Нет пользователей'}
                    </div>
                  )}
                </div>
              </div>
            </>
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

        {/* Модалка редактирования пользователя */}
        {editRow && ReactDOM.createPortal(
          <div 
            style={{
              position:'fixed', 
              inset:0, 
              zIndex:200003, 
              display:'flex', 
              alignItems:'center', 
              justifyContent:'center',
              background: 'rgba(0, 0, 0, 0.9)',
              padding: '16px'
            }}
            onClick={()=>setEditRow(null)}
          >
            <div 
              style={{
                position:'relative', 
                width:'100%',
                maxWidth: '500px',
                background:'linear-gradient(135deg, #232931 0%, #181c22 100%)', 
                borderRadius:20, 
                padding:20, 
                boxShadow:'0 10px 40px rgba(0,0,0,0.4)', 
                color:'#fff',
                maxHeight: '90vh',
                overflowY: 'auto'
              }} 
              onClick={e=>e.stopPropagation()}
            >
              <button 
                onClick={()=>setEditRow(null)} 
                style={{
                  position:'absolute', 
                  top:10, 
                  right:10, 
                  background:'transparent', 
                  border:'none', 
                  color:'#fff', 
                  fontSize:24, 
                  cursor:'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
              <h3 style={{marginTop:0, marginBottom:14, fontWeight:900, fontSize: '20px'}}>Изменить пользователя</h3>
              <div style={{display:'flex', flexDirection:'column', gap:12}}>
                <div>
                  <label style={{display:'block', fontSize:12, color:'#9ca3af', marginBottom:6}}>Новое имя</label>
                  <input 
                    value={editRow.name} 
                    onChange={e=>setEditRow({...editRow, name:e.target.value})} 
                    style={{
                      width:'100%', 
                      padding:12, 
                      borderRadius:10, 
                      border:'1px solid #2f3440', 
                      background:'#0e1420', 
                      color:'#fff',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                <div>
                  <label style={{display:'block', fontSize:12, color:'#9ca3af', marginBottom:6}}>Описание</label>
                  <input 
                    value={editRow.description} 
                    onChange={e=>setEditRow({...editRow, description:e.target.value})} 
                    style={{
                      width:'100%', 
                      padding:12, 
                      borderRadius:10, 
                      border:'1px solid #2f3440', 
                      background:'#0e1420', 
                      color:'#fff',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                <div>
                  <label style={{display:'block', fontSize:12, color:'#9ca3af', marginBottom:6}}>Новый пароль (по желанию)</label>
                  <input 
                    type="text" 
                    value={editRow.password || ''} 
                    onChange={e=>setEditRow({...editRow, password:e.target.value})} 
                    style={{
                      width:'100%', 
                      padding:12, 
                      borderRadius:10, 
                      border:'1px solid #2f3440', 
                      background:'#0e1420', 
                      color:'#fff',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                <div>
                  <label style={{display:'block', fontSize:12, color:'#9ca3af', marginBottom:6}}>Членство в RDP</label>
                  <div style={{display:'flex', gap:8, flexDirection: 'column'}}>
                    <button 
                      onClick={async()=>{ 
                        try { 
                          const t = localStorage.getItem('token'); 
                          await fetch(`/api/admin/local-users/${encodeURIComponent(editRow.name)}/rdp`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${t}` }, body: JSON.stringify({ add: true }) }); 
                          alert('Добавлен в RDP'); 
                        } catch(e){ alert('Ошибка: '+e.message); } 
                      }} 
                      style={{
                        padding:'12px 16px', 
                        borderRadius:8, 
                        border:'1px solid #334155', 
                        background:'#0f172a', 
                        color:'#b2ffb2', 
                        cursor:'pointer',
                        fontSize: '15px',
                        width: '100%',
                        fontWeight: 600
                      }}
                    >
                      Добавить в RDP
                    </button>
                    <button 
                      onClick={async()=>{ 
                        try { 
                          const t = localStorage.getItem('token'); 
                          await fetch(`/api/admin/local-users/${encodeURIComponent(editRow.name)}/rdp`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${t}` }, body: JSON.stringify({ add: false }) }); 
                          alert('Убран из RDP'); 
                        } catch(e){ alert('Ошибка: '+e.message); } 
                      }} 
                      style={{
                        padding:'12px 16px', 
                        borderRadius:8, 
                        border:'1px solid #334155', 
                        background:'#0f172a', 
                        color:'#fecaca', 
                        cursor:'pointer',
                        fontSize: '15px',
                        width: '100%',
                        fontWeight: 600
                      }}
                    >
                      Убрать из RDP
                    </button>
                  </div>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:10, color:'#ddd', marginTop:10}}>
                  <label style={{display:'flex', alignItems:'center', gap:8, fontSize: '15px'}}>
                    <input 
                      type="checkbox" 
                      checked={!!editRow.noExpire} 
                      onChange={e=>setEditRow({...editRow, noExpire:e.target.checked})} 
                      style={{ width: '20px', height: '20px' }}
                    /> 
                    Пароль не истекает
                  </label>
                  <button
                    onClick={async ()=>{
                      try {
                        const token = localStorage.getItem('token');
                        await fetch(`/api/admin/local-users/${encodeURIComponent(editRow.name)}/no-expire`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ noExpire: true }) });
                        alert('Флаг «пароль не истекает» установлен');
                      } catch(e){ alert('Ошибка: '+e.message); }
                    }}
                    style={{
                      padding:'10px 14px', 
                      borderRadius:8, 
                      border:'1px solid rgba(67,233,123,0.35)', 
                      background:'rgba(67,233,123,0.12)', 
                      color:'#b2ffb2', 
                      cursor:'pointer',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    Применить сейчас
                  </button>
                </div>
                <div style={{display:'flex', flexDirection: 'column', gap:10, marginTop:16}}>
                  <div style={{display:'flex', gap:8, flexDirection: 'column'}}>
                    {editRow.enabled ? (
                      <button 
                        onClick={async ()=>{ 
                          try { 
                            await adminEnable(editRow.name, false);
                            alert('Пользователь отключен'); 
                          } catch(e){ alert('Ошибка: '+e.message); } 
                        }} 
                        style={{
                          padding:'12px 16px', 
                          borderRadius:10, 
                          border:'1px solid rgba(239,68,68,0.35)', 
                          background:'rgba(239,68,68,0.15)', 
                          color:'#fecaca', 
                          cursor:'pointer',
                          fontSize: '15px',
                          width: '100%',
                          fontWeight: 600
                        }}
                      >
                        Отключить
                      </button>
                    ) : (
                      <button 
                        onClick={async ()=>{ 
                          try { 
                            await adminEnable(editRow.name, true);
                            alert('Пользователь включен'); 
                          } catch(e){ alert('Ошибка: '+e.message); } 
                        }} 
                        style={{
                          padding:'12px 16px', 
                          borderRadius:10, 
                          border:'1px solid rgba(67,233,123,0.35)', 
                          background:'rgba(67,233,123,0.15)', 
                          color:'#b2ffb2', 
                          cursor:'pointer',
                          fontSize: '15px',
                          width: '100%',
                          fontWeight: 600
                        }}
                      >
                        Включить
                      </button>
                    )}
                    <button 
                      onClick={async ()=>{ 
                        if(window.confirm('Удалить пользователя? Это действие нельзя отменить.')){ 
                          try { 
                            await adminDelete(editRow.name);
                          } catch(e){ alert('Ошибка: '+e.message); } 
                        } 
                      }} 
                      style={{
                        padding:'12px 16px', 
                        borderRadius:10, 
                        border:'1px solid rgba(239,68,68,0.45)', 
                        background:'rgba(239,68,68,0.18)', 
                        color:'#fecaca', 
                        cursor:'pointer',
                        fontSize: '15px',
                        width: '100%',
                        fontWeight: 600
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                  <div style={{display:'flex', gap:10, flexDirection: 'column'}}>
                    <button 
                      onClick={()=>setEditRow(null)} 
                      style={{
                        padding:'12px 16px', 
                        borderRadius:10, 
                        border:'1px solid #374151', 
                        background:'#111827', 
                        color:'#e5e7eb', 
                        cursor:'pointer',
                        fontSize: '15px',
                        width: '100%',
                        fontWeight: 600
                      }}
                    >
                      Отмена
                    </button>
                    <button 
                      onClick={handleSaveEdit} 
                      style={{
                        padding:'12px 16px', 
                        borderRadius:10, 
                        border:'1px solid rgba(67,233,123,0.35)', 
                        background:'rgba(67,233,123,0.15)', 
                        color:'#b2ffb2', 
                        cursor:'pointer', 
                        fontWeight:700,
                        fontSize: '15px',
                        width: '100%'
                      }}
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
      
      {/* Emoji Settings Mobile Modal */}
      <EmojiSettingsMobile
        open={showEmojiSettings}
        onClose={() => setShowEmojiSettings(false)}
        onOpenMobileSidebar={onOpenMobileSidebar}
      />
      
      {/* Templates Management Mobile Modal */}
      <TemplatesManagementMobile
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onOpenMobileSidebar={onOpenMobileSidebar}
      />
      
      {/* App Title Settings Mobile Modal */}
      <AppTitleSettingsMobile
        open={showAppTitleSettings}
        onClose={() => setShowAppTitleSettings(false)}
        onOpenMobileSidebar={onOpenMobileSidebar}
      />
      
      {/* User Rights Mobile Modal */}
      <UserRightsMobile
        open={showUserRights}
        onClose={() => setShowUserRights(false)}
        onOpenMobileSidebar={onOpenMobileSidebar}
      />
    </div>,
    document.body
  );
}

