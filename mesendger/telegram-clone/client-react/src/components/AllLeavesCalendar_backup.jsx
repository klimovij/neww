import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Calendar from 'react-calendar';
import styled from 'styled-components';
import { FaUmbrellaBeach, FaBed, FaWalking, FaUserCircle } from 'react-icons/fa';

const ModalBg = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45);
  z-index: 9999; display: flex; align-items: center; justify-content: center;
`;
const ModalBox = styled.div`
  background: linear-gradient(135deg, #232931 0%, #2193b0 100%);
  border-radius: 18px;
  box-shadow: 0 8px 40px #2193b044;
  padding: 32px 24px;
  width: 90vw;
  height: 90vh;
  max-width: 1200px;
  max-height: 900px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 0 0 340px;
`;
const Title = styled.h3`
  color: #2193b0; font-size: 1.4em; margin-bottom: 18px;
`;

const months = [
  'Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
];
const years = Array.from({length: 5}, (_,i) => new Date().getFullYear()-2+i);
const weekDays = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

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
  if(week.length) { while(week.length<7) week.push(null); matrix.push(week); }
  return matrix;
}

// Вспомогательная функция для форматирования даты в YYYY-MM-DD
function formatDateToYYYYMMDD(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Функция для проверки, попадает ли дата в диапазон
function isDateInRange(targetDate, startDate, endDate) {
  const target = new Date(targetDate);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Устанавливаем время в 00:00:00 для корректного сравнения дат
  target.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  return target >= start && target <= end;
}

export default function AllLeavesCalendar({ open, onClose, token }) {
  const [leaves, setLeaves] = useState([]);
  const [users, setUsers] = useState({});
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [showUserAutocomplete, setShowUserAutocomplete] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editLeave, setEditLeave] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [absentModal, setAbsentModal] = useState({ open: false, date: null, list: [] });
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);

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
    const uid = user?.id;
    if (uid != null) {
      fetch(`/api/leave-balance/${uid}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then(setBalance)
        .catch(()=>setBalance(null));
    } else {
      setBalance(null);
    }
  }, [open, token]);

  // Когда появится currentUser, до-запрашиваем баланс, если его ещё нет
  useEffect(() => {
    if (!open) return;
    if (!currentUser || currentUser.id == null) return;
    fetch(`/api/leave-balance/${currentUser.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setBalance)
      .catch(()=>setBalance(null));
  }, [open, token, currentUser]);

  // Блокируем скролл фона и компенсируем ширину скроллбара, чтобы не смещалось позиционирование панели
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

  // Сброс состояния при закрытии модалки, чтобы не оставались "свернутые" и прочие режимы
  useEffect(() => {
    if (!open) {
      setCalendarCollapsed(false);
      setAbsentModal({ open: false, date: null, list: [] });
      setShowAddModal(false);
      setEditLeave(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || selectedUser === 'all' || !currentUser) return;
    fetch(`/api/leave-history/${currentUser.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setHistory);
  }, [open, selectedUser, currentUser, token]);

  const isHr = currentUser && (currentUser.role==='hr'||currentUser.role==='admin'||currentUser.role==='руководитель');
  const [showAllLeaves, setShowAllLeaves] = useState(true);
  // Нормализуем тип события (часть "больничных" может храниться как leave с текстом в причине)
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

  const filteredLeaves = Array.isArray(leaves) ? leaves.filter(l => {
    // Пользователь/HR фильтр
    if (!isHr) {
      if (l.userId !== currentUser?.id) return false;
    } else {
      if (selectedUser !== 'all' && l.userId !== Number(selectedUser)) return false;
    }
    // Статус: если HR не выбрал "Все", то применяем выбранный статус
    if (selectedStatus !== 'all' && l.status !== selectedStatus) return false;
    // Переключатель "Показывать все" для HR: если выключен — показываем только одобренные
    if (isHr && !showAllLeaves && l.status !== 'approved') return false;
    // Тип события
    const logicalType = getLogicalType(l);
    if (selectedType !== 'all' && logicalType !== selectedType) return false;
    return true;
  }) : [];

  // Исправленная функция для определения класса ячейки
  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    
    const dateStr = formatDateToYYYYMMDD(date);
    
    for (const leave of filteredLeaves) {
      const startDateStr = formatDateToYYYYMMDD(leave.startDate);
      const endDateStr = formatDateToYYYYMMDD(leave.endDate);
      
      if (isDateInRange(date, startDateStr, endDateStr)) {
        const logicalType = getLogicalType(leave);
        if (logicalType === 'vacation') return 'vacation-day';
        if (logicalType === 'sick') return 'sick-day';
        if (logicalType === 'leave') return 'leave-day';
      }
    }
    return '';
  };

  // Исправленная функция для содержимого ячейки
  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    
    const dateStr = formatDateToYYYYMMDD(date);
    
    for (const leave of filteredLeaves) {
      const startDateStr = formatDateToYYYYMMDD(leave.startDate);
      const endDateStr = formatDateToYYYYMMDD(leave.endDate);
      
      if (isDateInRange(date, startDateStr, endDateStr)) {
        const logicalType = getLogicalType(leave);
        let icon = <FaWalking style={{color:'#6dd5ed',fontSize:22}} title="Отгул" />;
        if (logicalType === 'vacation') icon = <FaUmbrellaBeach style={{color:'#43e97b',fontSize:22}} title="Отпуск" />;
        if (logicalType === 'sick') icon = <FaBed style={{color:'#e74c3c',fontSize:22}} title="Больничный" />;
        
        const user = users[leave.userId];
        return (
          <span title={user?.username || ''} style={{display:'flex',alignItems:'center',gap:2}}>
            {icon}
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" style={{width:22,height:22,borderRadius:6,objectFit:'cover',marginLeft:2}} />
              : <FaUserCircle size={20} color="#b2bec3" />}
          </span>
        );
      }
    }
    return null;
  };

  const daysMatrix = getDaysMatrix(selectedYear, selectedMonth);

  // Функция для получения отсутствующих сотрудников на выбранную дату
  function getAbsentList(date) {
    const dateStr = formatDateToYYYYMMDD(date);
    
    return filteredLeaves.filter(l => {
      const startDateStr = formatDateToYYYYMMDD(l.startDate);
      const endDateStr = formatDateToYYYYMMDD(l.endDate);
      return isDateInRange(date, startDateStr, endDateStr);
    });
  }

  return !open ? null : (
    <>
      {open && ReactDOM.createPortal(
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
        onClick={onClose}
      >
        <div
          onClick={e=>e.stopPropagation()}
          style={{
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
            padding:'40px 48px',
            overflowY:'auto',
            overflowX:'hidden'
          }}
        >
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              position:'absolute',top:16,right:16,fontSize:28,background:'transparent',border:'none',
              cursor:'pointer',color:'#fff',fontWeight:'bold',width:36,height:36,borderRadius:'50%'
            }}
          >
            ×
          </button>
          <h2 style={{ marginTop:0, marginBottom:18, color:'#43e97b', fontWeight:900, fontSize:'2em' }}>
            Общий календарь отпусков и отгулов
          </h2>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:8}}>
          <button
            style={{padding:'6px 16px',borderRadius:8,background:'rgba(67,233,123,0.15)',color:'#43e97b',border:'1px solid #43e97b',cursor:'pointer',fontWeight:700,fontSize:'1em'}}
            onClick={()=>setCalendarCollapsed(v=>!v)}
            title={calendarCollapsed ? 'Показать календарь' : 'Свернуть календарь'}
          >
            {calendarCollapsed ? 'Показать календарь' : 'Свернуть календарь'}
          </button>
        </div>

        {currentUser && (currentUser.role==='hr'||currentUser.role==='admin'||currentUser.role==='руководитель') && (
          <div style={{marginBottom:24,padding:'16px 20px',background:'#fffbe6',borderRadius:12,boxShadow:'0 2px 8px #f9ca2422'}}>
            <b style={{color:'#f9ca24',fontSize:'1.1em'}}>Заявки на одобрение</b>
            <ul style={{margin:0,paddingLeft:18}}>
              {Array.isArray(leaves) && leaves.filter(l=>{
                // применяем выбранные фильтры к блоку заявок
                if (l.status !== 'pending') return false;
                if (selectedStatus !== 'all' && l.status !== selectedStatus) return false;
                if (selectedUser !== 'all' && l.userId !== Number(selectedUser)) return false;
                const logicalType = getLogicalType(l);
                if (selectedType !== 'all' && logicalType !== selectedType) return false;
                return true;
              }).length === 0 && (
                <li style={{color:'#888'}}>Нет заявок на одобрение</li>
              )}
              {Array.isArray(leaves) && leaves.filter(l=>{
                if (l.status !== 'pending') return false;
                if (selectedStatus !== 'all' && l.status !== selectedStatus) return false;
                if (selectedUser !== 'all' && l.userId !== Number(selectedUser)) return false;
                const logicalType = getLogicalType(l);
                if (selectedType !== 'all' && logicalType !== selectedType) return false;
                return true;
              }).map(l => (
                <li key={l.id} style={{marginBottom:12,padding:'12px 10px',background:'#fff',borderRadius:10,boxShadow:'0 1px 4px #f9ca2422',display:'flex',alignItems:'center',gap:12,borderLeft:`6px solid ${l.type==='vacation'?'#43e97b':l.type==='sick'?'#e74c3c':'#6dd5ed'}`}}>
                  <span style={{color:'#888',minWidth:90}}>{l.startDate} - {l.endDate}</span>
                  <b style={{minWidth:70}}>{(() => { const t = getLogicalType(l); return t==='vacation'?'Отпуск':t==='sick'?'Больничный':'Отгул'; })()}</b>
                  <span style={{color:'#555',flex:1}}>{l.reason}</span>
                  <span style={{color:'#2193b0',fontWeight:600,marginRight:8}}>{users[l.userId]?.username || 'Сотрудник'}</span>
                  <button title="Одобрить" style={{padding:'6px 10px',borderRadius:8,background:'#43e97b',color:'#fff',border:'none',cursor:'pointer',fontSize:16,marginRight:6}} onClick={async()=>{
                    await fetch(`/api/leaves/${l.id}/status`, {
                      method:'PUT',
                      headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
                      body:JSON.stringify({status:'approved'})
                    });
                    fetch('/api/all-leaves', { headers: { Authorization: `Bearer ${token}` } })
                      .then(r => r.json()).then(setLeaves);
                    if (currentUser) {
                      fetch(`/api/leave-history/${currentUser.id}`, { headers: { Authorization: `Bearer ${token}` } })
                        .then(r => r.json()).then(setHistory);
                    }
                  }}>✔️ Одобрить</button>
                  <button title="Отклонить" style={{padding:'6px 10px',borderRadius:8,background:'#e74c3c',color:'#fff',border:'none',cursor:'pointer',fontSize:16}} onClick={async()=>{
                    await fetch(`/api/leaves/${l.id}/status`, {
                      method:'PUT',
                      headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
                      body:JSON.stringify({status:'declined'})
                    });
                    fetch('/api/all-leaves', { headers: { Authorization: `Bearer ${token}` } })
                      .then(r => r.json()).then(setLeaves);
                    if (currentUser) {
                      fetch(`/api/leave-history/${currentUser.id}`, { headers: { Authorization: `Bearer ${token}` } })
                        .then(r => r.json()).then(setHistory);
                    }
                  }}>❌ Отклонить</button>
                </li>
              ))}
            </ul>
          </div>
        )}
            <div style={{display:'flex',gap:24,marginBottom:18}}>
              <div>
                <span style={{color:'#2193b0',fontSize:'0.95em'}}>Месяц</span><br/>
                <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))} style={{padding:'8px 12px',borderRadius:8,fontSize:'1.1em',marginTop:2}}>
                  {months.map((m,i)=>(<option key={i} value={i}>{m}</option>))}
                </select>
              </div>
              <div>
                <span style={{color:'#2193b0',fontSize:'0.95em'}}>Год</span><br/>
                <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))} style={{padding:'8px 12px',borderRadius:8,fontSize:'1.1em',marginTop:2}}>
                  {years.map(y=>(<option key={y} value={y}>{y}</option>))}
                </select>
              </div>
              {isHr ? (
                <div style={{display:'flex',flexDirection:'column',minWidth:280, position:'relative'}}>
                  <span style={{color:'#2193b0',fontSize:'0.95em'}}>Сотрудник</span>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginTop:2}}>
                    <input
                      type="text"
                      value={userSearch}
                      placeholder="Быстрый поиск по имени или фамилии..."
                      onChange={e=>{ setUserSearch(e.target.value); setShowUserAutocomplete(true); }}
                      onFocus={()=>setShowUserAutocomplete(true)}
                      onBlur={()=>setTimeout(()=>setShowUserAutocomplete(false), 150)}
                      style={{padding:'8px 12px',borderRadius:8,fontSize:'1.05em', width:240, border:'1px solid #43e97b', background:'#2d3748', color:'#fff'}}
                    />
                    <button
                      onClick={()=>{ setSelectedUser('all'); setUserSearch(''); }}
                      style={{padding:'8px 10px',borderRadius:8,border:'1px solid #43e97b',background:'rgba(67,233,123,0.1)',color:'#43e97b',fontWeight:700,cursor:'pointer'}}
                      title="Показать всех"
                    >Все</button>
                  </div>
                  {showUserAutocomplete && (
                    <div style={{ position:'absolute', top:62, left:0, width:280, maxHeight:220, overflowY:'auto', background:'#232931', border:'1px solid #43e97b', borderRadius:10, zIndex:10 }}>
                      {Object.values(users)
                        .filter(u => {
                          const q = userSearch.trim().toLowerCase();
                          if (!q) return true;
                          const first = (u.first_name||'').toLowerCase();
                          const last = (u.last_name||'').toLowerCase();
                          const usern = (u.username||'').toLowerCase();
                          return usern.includes(q) || first.includes(q) || last.includes(q);
                        })
                        .slice(0, 50)
                        .map(u => (
                          <div
                            key={u.id}
                            onMouseDown={()=>{ setSelectedUser(u.id); setUserSearch(u.username || `${u.first_name||''} ${u.last_name||''}`.trim()); setShowUserAutocomplete(false); }}
                            style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #2a323d', color:'#fff' }}
                          >
                            {u.username || `${u.first_name||''} ${u.last_name||''}`}
                          </div>
                        ))}
                      {Object.values(users).length === 0 && (
                        <div style={{ padding:8, color:'#b2bec3' }}>Нет данных</div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
              <div>
                <span style={{color:'#2193b0',fontSize:'0.95em'}}>Тип события</span><br/>
                <div style={{ display:'flex', gap:8, marginTop:2 }}>
                  <button onClick={()=>setSelectedType('all')} style={{ padding:'8px 12px', borderRadius:8, border: '1px solid #43e97b', background: selectedType==='all' ? 'rgba(67,233,123,0.2)' : 'rgba(67,233,123,0.1)', color:'#43e97b', fontWeight:700, cursor:'pointer' }}>Все</button>
                  <button onClick={()=>setSelectedType('vacation')} style={{ padding:'8px 12px', borderRadius:8, border: '1px solid #43e97b', background: selectedType==='vacation' ? 'rgba(67,233,123,0.2)' : 'rgba(67,233,123,0.1)', color:'#43e97b', fontWeight:700, cursor:'pointer' }}>Отпуск</button>
                  <button onClick={()=>setSelectedType('leave')} style={{ padding:'8px 12px', borderRadius:8, border: '1px solid #43e97b', background: selectedType==='leave' ? 'rgba(67,233,123,0.2)' : 'rgba(67,233,123,0.1)', color:'#43e97b', fontWeight:700, cursor:'pointer' }}>Отгул</button>
                  <button onClick={()=>setSelectedType('sick')} style={{ padding:'8px 12px', borderRadius:8, border: '1px solid #43e97b', background: selectedType==='sick' ? 'rgba(67,233,123,0.2)' : 'rgba(67,233,123,0.1)', color:'#43e97b', fontWeight:700, cursor:'pointer' }}>Больничный</button>
                </div>
              </div>
              <div>
                <span style={{color:'#2193b0',fontSize:'0.95em'}}>Статус заявки</span><br/>
                <select
                  value={selectedStatus}
                  onChange={e=>setSelectedStatus(e.target.value)}
                  style={{padding:'8px 12px',borderRadius:8,fontSize:'1.1em',marginTop:2, border:'1px solid #6dd5ed', background:'#2d3748', color:'#fff'}}
                >
                  <option value="all">Все</option>
                  <option value="approved">Одобрено</option>
                  <option value="pending">Ожидает</option>
                  <option value="rejected">Отклонено</option>
                </select>
              </div>
            </div>
        {!calendarCollapsed && (
          <div style={{display:'flex',width:'100%',gap:'32px'}}>
              <div style={{flex:1}}>
                <div style={{background:'rgba(34,40,49,0.97)',borderRadius:12,padding:'12px',boxShadow:'0 2px 12px #2193b022',width:'100%',margin:'0 auto'}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'10px',marginBottom:8,background:'#f5f6fa',borderRadius:12}}>
                    {weekDays.map(d=>(<div key={d} style={{fontWeight:700,fontSize:'1.08em',padding:'10px 0',textAlign:'center',background:'#f5f6fa',color:'#2193b0',borderRadius:8}}>{d}</div>))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'10px',background:'#f5f6fa',borderRadius:12,padding:'4px 0'}}>
                    {daysMatrix.flat().map((date,i)=>date?
                      <div key={i} style={{minHeight:70,padding:'8px',background:'#fff',borderRadius:10,boxShadow:'0 1px 6px #2193b022',display:'flex',flexDirection:'column',alignItems:'flex-start',justifyContent:'flex-start',position:'relative',color:'#222',cursor:'pointer'}}
                        onClick={()=>{
                          const absentList = getAbsentList(date);
                          if (absentList.length > 0) {
                            setAbsentModal({ open: true, date, list: absentList });
                          }
                        }}
                      >
                        <span style={{fontWeight:700,fontSize:'1.08em',color:'#2193b0'}}>{date.getDate()}</span>
                        {(() => {
                          const dateStr = formatDateToYYYYMMDD(date);
                          
                          for (const leave of filteredLeaves) {
                            const startDateStr = formatDateToYYYYMMDD(leave.startDate);
                            const endDateStr = formatDateToYYYYMMDD(leave.endDate);
                            
                            if (isDateInRange(date, startDateStr, endDateStr)) {
                              let icon = null;
                              if (leave.type === 'vacation') icon = <FaUmbrellaBeach style={{color:'#43e97b',fontSize:22}} title="Отпуск" />;
                              else if (leave.type === 'sick') icon = <FaBed style={{color:'#e74c3c',fontSize:22}} title="Больничный" />;
                              else if (leave.type === 'leave') icon = <FaWalking style={{color:'#6dd5ed',fontSize:22}} title="Отгул" />;
                              return <div style={{marginTop:'auto'}}>{icon}</div>;
                            }
                          }
                          return null;
                        })()}
                      </div>
                      :<div key={i} style={{minHeight:70,padding:'8px',background:'#fff',borderRadius:10}}></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
        )}

        {showAddModal && (
          <ModalBg onClick={()=>setShowAddModal(false)}>
            <ModalBox onClick={e=>e.stopPropagation()}>
              <Title>Добавить событие сотруднику</Title>
              <form onSubmit={async e => {
                e.preventDefault();
                const form = e.target;
                let userId = form.userId.value;
                if (!userId && currentUser) userId = currentUser.id;
                if (typeof userId === 'string') userId = parseInt(userId, 10);
                const type = form.type.value;
                const startDate = form.startDate.value ? form.startDate.value.slice(0,10) : '';
                const endDate = form.endDate.value ? form.endDate.value.slice(0,10) : '';
                const reason = form.reason.value;
                const hours = Number(form.hours?.value || 0) || 0;
                const minutesOnly = Number(form.minutesOnly?.value || 0) || 0;
                const minutes = Number(hours * 60 + minutesOnly) || 0;
                const time = form.time?.value || null;
                if (!userId || isNaN(userId)) {
                  alert('Ошибка: не выбран сотрудник!');
                  return;
                }
                const res = await fetch('/api/leaves', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ userId, type, startDate, endDate, reason, minutes, time })
                });
                if (res.ok) {
                  setShowAddModal(false);
                  fetch('/api/all-leaves', { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.json()).then(setLeaves);
                  if (currentUser) {
                    fetch(`/api/leave-history/${selectedUser==='all'?currentUser.id:selectedUser}`, { headers: { Authorization: `Bearer ${token}` } })
                      .then(r => r.json()).then(setHistory);
                  }
                } else {
                  const err = await res.json().catch(()=>({error:'Ошибка при добавлении события'}));
                  alert('Ошибка при добавлении события: ' + (err.details || err.error || ''));
                }
              }} style={{display:'flex',flexDirection:'column',gap:12}}>
                <label>Сотрудник:
                  <select name="userId" required style={{marginLeft:8,padding:'6px 12px',borderRadius:8}} defaultValue={currentUser?.id}>
                    {Object.values(users).map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </label>
                <label>Тип:
                  <select name="type" required style={{marginLeft:8,padding:'6px 12px',borderRadius:8}}>
                    <option value="vacation">Отпуск</option>
                    <option value="leave">Отгул</option>
                    <option value="sick">Больничный</option>
                  </select>
                </label>
                <label>С:</label>
                <input type="date" name="startDate" required style={{padding:'6px 12px',borderRadius:8}} />
                <label>По:</label>
                <input type="date" name="endDate" required style={{padding:'6px 12px',borderRadius:8}} />
                <label>Отгул на:</label>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <select name="hours" defaultValue={0} style={{padding:'6px 12px',borderRadius:8}}>
                    {[...Array(9).keys()].map(h => (
                      <option key={h} value={h}>{h} ч</option>
                    ))}
                  </select>
                  <select name="minutesOnly" defaultValue={0} style={{padding:'6px 12px',borderRadius:8}}>
                    {[0,5,10,15,20,30,45].map(m => (
                      <option key={m} value={m}>{m} мин</option>
                    ))}
                  </select>
                </div>
                {/* Временной пикер убран по требованию */}
                <label>Причина:</label>
                <input type="text" name="reason" placeholder="Причина" style={{padding:'6px 12px',borderRadius:8}} />
                <div style={{display:'flex',gap:12,marginTop:8}}>
                  <button type="submit" style={{padding:'8px 18px',borderRadius:8,background:'#2193b0',color:'#fff',fontWeight:600,border:'none',cursor:'pointer'}}>Добавить</button>
                  <button type="button" style={{padding:'8px 18px',borderRadius:8,background:'#b2bec3',color:'#fff',fontWeight:600,border:'none',cursor:'pointer'}} onClick={()=>setShowAddModal(false)}>Отмена</button>
                </div>
              </form>
            </ModalBox>
          </ModalBg>
        )}

        {balance && (
          <div style={{marginTop:18,marginBottom:8,padding:'12px 18px',background:'#f8f9fa',borderRadius:10}}>
            <b>Баланс отпусков:</b>
            <span style={{marginLeft:12,color:'#43e97b'}}>Отпуск: {balance.vacationDays} дн.</span>
            <span style={{marginLeft:12,color:'#6dd5ed'}}>Отгул: {balance.leaveDays} дн.</span>
            <span style={{marginLeft:12,color:'#e74c3c'}}>Больничный: {balance.sickDays} дн.</span>
          </div>
        )}

        {selectedUser === 'all' ? (
          (() => {
            const isHr = currentUser && (currentUser.role==='hr'||currentUser.role==='admin'||currentUser.role==='руководитель');
            const today = new Date();
            today.setHours(0,0,0,0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayMs = yesterday.getTime();
            const activeLeaves = Array.isArray(leaves)
              ? leaves.filter(l => {
                  if (l.status !== 'approved') return false;
                  // Для HR скрываем только те, что закончились раньше вчерашнего дня
                  if (isHr) {
                    const endMs = (() => { const d = new Date(l.endDate); d.setHours(0,0,0,0); return d.getTime(); })();
                    if (endMs < yesterdayMs) return false;
                  }
                  // фильтры выбранного типа/статуса/пользователя
                  if (selectedStatus !== 'all' && l.status !== selectedStatus) return false;
                  const t = getLogicalType(l);
                  if (selectedType !== 'all' && t !== selectedType) return false;
                  if (selectedUser !== 'all' && l.userId !== Number(selectedUser)) return false;
                  return true;
                })
              : [];
            return activeLeaves.length > 0 && (
              <div style={{marginBottom:8,padding:'12px 18px',background:'#f8f9fa',borderRadius:10}}>
                <b>Действующие заявки всех сотрудников:</b>
                <ul style={{margin:0,paddingLeft:18}}>
                  {activeLeaves.map((h,i) => (
                    <li key={i} style={{marginBottom:12,padding:'14px 12px',background:'#fff',borderRadius:10,boxShadow:'0 2px 8px #2193b022',display:'flex',alignItems:'center',gap:16,borderLeft:`6px solid ${h.type==='vacation'?'#43e97b':h.type==='leave'&&/болею|больнич/i.test(h.reason)?'#e74c3c':'#6dd5ed'}`}}>
                      <span style={{fontSize:20,display:'flex',alignItems:'center'}}>
                        {(() => { const t = getLogicalType(h); return t==='vacation' ? <FaUmbrellaBeach style={{color:'#43e97b'}} title="Отпуск" /> : t==='sick' ? <FaBed style={{color:'#e74c3c'}} title="Больничный" /> : <FaWalking style={{color:'#6dd5ed'}} title="Отгул" />; })()}
                      </span>
                      <span style={{color:'#888',minWidth:110}}>{h.startDate} - {h.endDate}</span>
                      <b style={{minWidth:90}}>{(() => { const t = getLogicalType(h); return t==='vacation'?'Отпуск':t==='sick'?'Больничный':'Отгул'; })()}</b>
                      <span style={{color:'#555',flex:1}}>{h.reason}</span>
                      <span style={{color:'#2193b0',fontWeight:600,marginRight:8}}>{users[h.userId]?.username || 'Сотрудник'}</span>
                      <button
                        title="Удалить заявку"
                        style={{padding:'6px 14px',borderRadius:8,background:'#e74c3c',color:'#fff',fontWeight:600,border:'none',cursor:'pointer',marginLeft:8}}
                        onClick={async()=>{
                          if (!window.confirm('Удалить заявку?')) return;
                          await fetch(`/api/leaves/${h.id}`, {
                            method:'DELETE',
                            headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}
                          });
                          fetch('/api/all-leaves', { headers: { Authorization: `Bearer ${token}` } })
                            .then(r => r.json()).then(setLeaves);
                          if (currentUser) {
                            fetch(`/api/leave-history/${currentUser.id}`, { headers: { Authorization: `Bearer ${token}` } })
                              .then(r => r.json()).then(setHistory);
                          }
                          if (window && window.dispatchEvent) {
                            window.dispatchEvent(new Event('leaves-updated'));
                          }
                        }}
                      >Удалить</button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()
        ) : (
          history.length > 0 && (
            <div style={{marginBottom:8,padding:'12px 18px',background:'#f8f9fa',borderRadius:10}}>
              <b>История заявок:</b>
              <ul style={{margin:0,paddingLeft:18}}>
                {history.map((h,i) => (
                  <li
                    key={i}
                    draggable={currentUser && (currentUser.role==='hr'||currentUser.role==='admin'||currentUser.role==='руководитель')}
                    onDragStart={e=>e.dataTransfer.setData('leaveId',h.id)}
                    onDrop={async e=>{
                      const leaveId = e.dataTransfer.getData('leaveId');
                      if (leaveId && leaveId==h.id) {
                      }
                    }}
                    style={{
                      marginBottom:12,
                      padding:'14px 12px',
                      background:'#fff',
                      borderRadius:10,
                      boxShadow:'0 2px 8px #2193b022',
                      display:'flex',
                      alignItems:'center',
                      gap:16,
                      borderLeft:`6px solid ${h.type==='vacation'?'#43e97b':h.type==='leave'&&/болею|больнич/i.test(h.reason)?'#e74c3c':'#6dd5ed'}`
                    }}
                  >
                    <span style={{color:'#888',minWidth:110}}>{h.startDate} - {h.endDate}</span>
                    <b style={{minWidth:90}}>{h.type === 'vacation' ? 'Отпуск' : /болею|больнич/i.test(h.reason) ? 'Больничный' : 'Отгул'}</b>
                    <span style={{color:'#555',flex:1}}>{h.reason}</span>
                    <span style={{padding:'4px 14px',borderRadius:8,background:h.status==='approved'?'#43e97b22':h.status==='rejected'?'#e74c3c22':'#f9ca2422',color:h.status==='approved'?'#43e97b':h.status==='rejected'?'#e74c3c':'#f9ca24',fontWeight:600,marginRight:8}}>
                      {h.status==='approved'?'Одобрено':h.status==='rejected'?'Отклонено':'Ожидает'}
                    </span>
                    {currentUser && (currentUser.role==='hr'||currentUser.role==='admin'||currentUser.role==='руководитель') && (
                      <div style={{display:'flex',gap:8}}>
                        {h.status==='pending' && (
                          <>
                            <button title="Одобрить" style={{padding:'8px 12px',borderRadius:8,background:'#43e97b',color:'#fff',border:'none',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',gap:4}} onClick={async()=>{
                              await fetch(`/api/leaves/${h.id}/status`, {
                                method:'PUT',
                                headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
                                body:JSON.stringify({status:'approved'})
                              });
                              fetch(`/api/leave-history/${selectedUser==='all'?currentUser?.id:selectedUser}`, { headers: { Authorization: `Bearer ${token}` } })
                                .then(r => r.json()).then(setHistory);
                            }}><span style={{fontSize:20,lineHeight:1}}>✔️</span>Одобрить</button>
                            <button title="Отклонить" style={{padding:'8px 12px',borderRadius:8,background:'#e74c3c',color:'#fff',border:'none',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',gap:4}} onClick={async()=>{
                              await fetch(`/api/leaves/${h.id}/status`, {
                                method:'PUT',
                                headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
                                body:JSON.stringify({status:'rejected'})
                              });
                              fetch(`/api/leave-history/${selectedUser==='all'?currentUser?.id:selectedUser}`, { headers: { Authorization: `Bearer ${token}` } })
                                .then(r => r.json()).then(setHistory);
                            }}><span style={{fontSize:20,lineHeight:1}}>❌</span>Отклонить</button>
                          </>
                        )}
                        <button title="Редактировать" style={{padding:'8px 12px',borderRadius:8,background:'#2193b0',color:'#fff',border:'none',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',gap:4}} onClick={()=>setEditLeave(h)}><span style={{fontSize:20,lineHeight:1}}>✏️</span>Редактировать</button>
                        <button title="Удалить" style={{padding:'8px 12px',borderRadius:8,background:'#b2bec3',color:'#fff',border:'none',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',gap:4}} onClick={async()=>{
                            await fetch(`/api/leaves/${h.id}`, {
                              method:'DELETE',
                              headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}
                            });
                            fetch(`/api/leave-history/${selectedUser==='all'?currentUser?.id:selectedUser}`, { headers: { Authorization: `Bearer ${token}` } })
                              .then(r => r.json()).then(setHistory);
                            fetch('/api/all-leaves', { headers: { Authorization: `Bearer ${token}` } })
                              .then(r => r.json()).then(setLeaves);
                            window.dispatchEvent(new CustomEvent('leaves-worktime-updated'));
                        }}><span style={{fontSize:20,lineHeight:1}}>🗑️</span>Удалить</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )
        )}

        {editLeave && (
          <ModalBg onClick={()=>setEditLeave(null)}>
            <ModalBox onClick={e=>e.stopPropagation()}>
              <Title>Редактировать событие</Title>
              <form onSubmit={async e => {
                e.preventDefault();
                const form = e.target;
                const type = form.type.value;
                const startDate = form.startDate.value;
                const endDate = form.endDate.value;
                const reason = form.reason.value;
                await fetch(`/api/leaves/${editLeave.id}`, {
                  method:'PUT',
                  headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
                  body:JSON.stringify({ type, startDate, endDate, reason })
                });
                setEditLeave(null);
                fetch(`/api/leave-history/${selectedUser==='all'?currentUser?.id:selectedUser}`, { headers: { Authorization: `Bearer ${token}` } })
                  .then(r => r.json()).then(setHistory);
              }} style={{display:'flex',flexDirection:'column',gap:12}}>
                <label>Тип:
                  <select name="type" defaultValue={editLeave.type} required style={{marginLeft:8,padding:'6px 12px',borderRadius:8}}>
                    <option value="vacation">Отпуск</option>
                    <option value="leave">Отгул</option>
                    <option value="sick">Больничный</option>
                  </select>
                </label>
                <label>С:</label>
                <input type="date" name="startDate" defaultValue={editLeave.startDate} required style={{padding:'6px 12px',borderRadius:8}} />
                <label>По:</label>
                <input type="date" name="endDate" defaultValue={editLeave.endDate} required style={{padding:'6px 12px',borderRadius:8}} />
                <label>Причина:</label>
                <input type="text" name="reason" defaultValue={editLeave.reason} style={{padding:'6px 12px',borderRadius:8}} />
                <div style={{display:'flex',gap:12,marginTop:8}}>
                  <button type="submit" style={{padding:'8px 18px',borderRadius:8,background:'#2193b0',color:'#fff',fontWeight:600,border:'none',cursor:'pointer'}}>Сохранить</button>
                  <button type="button" style={{padding:'8px 18px',borderRadius:8,background:'#b2bec3',color:'#fff',fontWeight:600,border:'none',cursor:'pointer'}} onClick={()=>setEditLeave(null)}>Отмена</button>
                </div>
              </form>
            </ModalBox>
          </ModalBg>
        )}
        <div style={{marginTop:18,display:'flex',gap:16}}>
          <span style={{display:'flex',alignItems:'center',gap:6}}>
            <FaWalking style={{color:'#6dd5ed',fontSize:28}} /> Отгул
          </span>
          <span style={{display:'flex',alignItems:'center',gap:6}}>
            <FaUmbrellaBeach style={{color:'#43e97b',fontSize:28}} /> Отпуск
          </span>
          <span style={{display:'flex',alignItems:'center',gap:6}}>
            <FaBed style={{color:'#e74c3c',fontSize:28}} /> Больничный
          </span>
        </div>
        </div>
      </div>,
      document.body)}
    {absentModal.open && ReactDOM.createPortal(
      <div
        onClick={()=>setAbsentModal({ open: false, date: null, list: [] })}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:300000, display:'flex', alignItems:'center', justifyContent:'center' }}
      >
        <div
          onClick={e=>e.stopPropagation()}
          style={{
            background:'#fff',
            color:'#111',
            borderRadius:18,
            boxShadow:'0 8px 40px rgba(0,0,0,0.25)',
            padding:'24px 24px',
            width:'90vw',
            maxWidth:800,
            maxHeight:'80vh',
            overflow:'auto'
          }}
        >
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <h3 style={{ margin:0, color:'#2193b0' }}>Отсутствующие сотрудники — {absentModal.date && absentModal.date.toLocaleDateString('ru-RU')}</h3>
            <button
              onClick={()=>setAbsentModal({ open: false, date: null, list: [] })}
              aria-label="Close"
              style={{ background:'transparent', border:'none', fontSize:24, cursor:'pointer', color:'#111', width:36, height:36, borderRadius:18 }}
            >×</button>
          </div>
          <ul style={{margin:0,paddingLeft:18}}>
            {absentModal.list.map((l, idx) => {
              let icon = null;
              if (l.type === 'vacation') icon = <FaUmbrellaBeach style={{color:'#43e97b',fontSize:22}} title="Отпуск" />;
              else if (l.type === 'sick') icon = <FaBed style={{color:'#e74c3c',fontSize:22}} title="Больничный" />;
              else if (l.type === 'leave') icon = <FaWalking style={{color:'#6dd5ed',fontSize:22}} title="Отгул" />;
              return (
                <li key={idx} style={{marginBottom:12,padding:'12px 10px',background:'#f8f9fa',borderRadius:10,boxShadow:'0 1px 4px #00000011',display:'flex',alignItems:'center',gap:12,borderLeft:`6px solid ${l.type==='vacation'?'#43e97b':l.type==='sick'?'#e74c3c':'#6dd5ed'}`}}>
                  {icon}
                  <span style={{color:'#2193b0',fontWeight:600,marginRight:8}}>{users[l.userId]?.username || 'Сотрудник'}</span>
                  <b style={{minWidth:70}}>{l.type === 'vacation' ? 'Отпуск' : l.type === 'sick' ? 'Больничный' : 'Отгул'}</b>
                  <span style={{color:'#666',minWidth:170}}>{String(l.startDate).slice(0,10)} — {String(l.endDate).slice(0,10)}</span>
                  <span style={{color:'#555',flex:1}}>{l.reason}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}