import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
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

export default function AllLeavesCalendar({ open, onClose, token }) {
  // Состояния
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

  // Определение типа события с учетом логики
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

  // Проверка роли HR
  const isHr = currentUser && (currentUser.role==='hr'||currentUser.role==='admin'||currentUser.role==='руководитель');

  // Фильтрация отгулов
  const filteredLeaves = useMemo(() => {
    return Array.isArray(leaves) ? leaves.filter(l => {
      // Пользователь/HR фильтр
      if (!isHr) {
        if (l.userId !== currentUser?.id) return false;
      } else {
        if (selectedUser !== 'all' && l.userId !== Number(selectedUser)) return false;
      }
      
      // Статус
      if (selectedStatus !== 'all' && l.status !== selectedStatus) return false;
      
      // Тип события
      const logicalType = getLogicalType(l);
      if (selectedType !== 'all' && logicalType !== selectedType) return false;
      
      return true;
    }) : [];
  }, [leaves, isHr, currentUser, selectedUser, selectedStatus, selectedType]);

  // Подсчет статистики месяца
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

  // Матрица дней
  const daysMatrix = useMemo(() => getDaysMatrix(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  // Получение отсутствующих на дату
  const getAbsentList = (date) => {
    return filteredLeaves.filter(l => {
      const startDateStr = formatDateToYYYYMMDD(l.startDate);
      const endDateStr = formatDateToYYYYMMDD(l.endDate);
      return isDateInRange(date, startDateStr, endDateStr);
    });
  };

  // Загрузка данных
  useEffect(() => {
    if (!open) return;
    
    // Загружаем отгулы
    fetch('/api/all-leaves', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setLeaves(Array.isArray(data) ? data : []));
    
    // Загружаем пользователей
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : (Array.isArray(data.users) ? data.users : []);
        setUsers(Object.fromEntries(arr.map(u => [u.id, u])));
      });
    
    // Получаем текущего пользователя
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem('user'));
    } catch {}
    setCurrentUser(user);
    
    // Загружаем баланс
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

  // Блокировка скролла
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

  // Сброс состояния при закрытии
  useEffect(() => {
    if (!open) {
      setCalendarCollapsed(false);
      setAbsentModal({ open: false, date: null, list: [] });
      setShowAddModal(false);
      setEditLeave(null);
    }
  }, [open]);

  // Загрузка истории
  useEffect(() => {
    if (!open || selectedUser === 'all' || !currentUser) return;
    fetch(`/api/leave-history/${currentUser.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setHistory);
  }, [open, selectedUser, currentUser, token]);

  if (!open) return null;

  return (
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
            {/* Кнопка закрытия */}
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

            {/* Заголовок */}
            <h2 style={{ marginTop:0, marginBottom:18, color:'#43e97b', fontWeight:900, fontSize:'2em' }}>
              Общий календарь отпусков и отгулов
            </h2>

            {/* Кнопка сворачивания календаря */}
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:8}}>
              <button
                style={{padding:'6px 16px',borderRadius:8,background:'rgba(67,233,123,0.15)',color:'#43e97b',border:'1px solid #43e97b',cursor:'pointer',fontWeight:700,fontSize:'1em'}}
                onClick={()=>setCalendarCollapsed(v=>!v)}
                title={calendarCollapsed ? 'Показать календарь' : 'Свернуть календарь'}
              >
                {calendarCollapsed ? 'Показать календарь' : 'Свернуть календарь'}
              </button>
            </div>

            {/* Заявки на одобрение для HR */}
            {isHr && (
              <div style={{marginBottom:24,padding:'16px 20px',background:'#fffbe6',borderRadius:12,boxShadow:'0 2px 8px #f9ca2422'}}>
                <b style={{color:'#f9ca24',fontSize:'1.1em'}}>Заявки на одобрение</b>
                <ul style={{margin:0,paddingLeft:18}}>
                  {Array.isArray(leaves) && leaves.filter(l=>{
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
                    <li key={l.id} style={{marginBottom:12,padding:'12px 10px',background:'#fff',borderRadius:10,boxShadow:'0 1px 4px #f9ca2422',display:'flex',alignItems:'center',gap:12,borderLeft:`6px solid ${getLogicalType(l)==='vacation'?'#43e97b':getLogicalType(l)==='sick'?'#e74c3c':'#6dd5ed'}`}}>
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
                      }}>✔️ Одобрить</button>
                      <button title="Отклонить" style={{padding:'6px 10px',borderRadius:8,background:'#e74c3c',color:'#fff',border:'none',cursor:'pointer',fontSize:16}} onClick={async()=>{
                        await fetch(`/api/leaves/${l.id}/status`, {
                          method:'PUT',
                          headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
                          body:JSON.stringify({status:'declined'})
                        });
                        fetch('/api/all-leaves', { headers: { Authorization: `Bearer ${token}` } })
                          .then(r => r.json()).then(setLeaves);
                      }}>❌ Отклонить</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Фильтры */}
            <div style={{display:'flex',gap:24,marginBottom:18,flexWrap:'wrap'}}>
              {/* Месяц */}
              <div>
                <span style={{color:'#2193b0',fontSize:'0.95em'}}>Месяц</span><br/>
                <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))} style={{padding:'8px 12px',borderRadius:8,fontSize:'1.1em',marginTop:2}}>
                  {months.map((m,i)=>(<option key={i} value={i}>{m}</option>))}
                </select>
              </div>

              {/* Год */}
              <div>
                <span style={{color:'#2193b0',fontSize:'0.95em'}}>Год</span><br/>
                <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))} style={{padding:'8px 12px',borderRadius:8,fontSize:'1.1em',marginTop:2}}>
                  {years.map(y=>(<option key={y} value={y}>{y}</option>))}
                </select>
              </div>

              {/* Поиск сотрудника для HR */}
              {isHr && (
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
                    </div>
                  )}
                </div>
              )}

              {/* Тип события */}
              <div>
                <span style={{color:'#2193b0',fontSize:'0.95em'}}>Тип события</span><br/>
                <div style={{ display:'flex', gap:8, marginTop:2 }}>
                  <button onClick={()=>setSelectedType('all')} style={{ padding:'8px 12px', borderRadius:8, border: '1px solid #43e97b', background: selectedType==='all' ? 'rgba(67,233,123,0.2)' : 'rgba(67,233,123,0.1)', color:'#43e97b', fontWeight:700, cursor:'pointer' }}>Все</button>
                  <button onClick={()=>setSelectedType('vacation')} style={{ padding:'8px 12px', borderRadius:8, border: '1px solid #43e97b', background: selectedType==='vacation' ? 'rgba(67,233,123,0.2)' : 'rgba(67,233,123,0.1)', color:'#43e97b', fontWeight:700, cursor:'pointer' }}>Отпуск</button>
                  <button onClick={()=>setSelectedType('leave')} style={{ padding:'8px 12px', borderRadius:8, border: '1px solid #43e97b', background: selectedType==='leave' ? 'rgba(67,233,123,0.2)' : 'rgba(67,233,123,0.1)', color:'#43e97b', fontWeight:700, cursor:'pointer' }}>Отгул</button>
                  <button onClick={()=>setSelectedType('sick')} style={{ padding:'8px 12px', borderRadius:8, border: '1px solid #43e97b', background: selectedType==='sick' ? 'rgba(67,233,123,0.2)' : 'rgba(67,233,123,0.1)', color:'#43e97b', fontWeight:700, cursor:'pointer' }}>Больничный</button>
                </div>
              </div>

              {/* Статус заявки */}
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

            {/* Календарь */}
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
                            for (const leave of filteredLeaves) {
                              const startDateStr = formatDateToYYYYMMDD(leave.startDate);
                              const endDateStr = formatDateToYYYYMMDD(leave.endDate);
                              
                              if (isDateInRange(date, startDateStr, endDateStr)) {
                                let icon = null;
                                const logicalType = getLogicalType(leave);
                                if (logicalType === 'vacation') icon = <FaUmbrellaBeach style={{color:'#43e97b',fontSize:22}} title="Отпуск" />;
                                else if (logicalType === 'sick') icon = <FaBed style={{color:'#e74c3c',fontSize:22}} title="Больничный" />;
                                else if (logicalType === 'leave') icon = <FaWalking style={{color:'#6dd5ed',fontSize:22}} title="Отгул" />;
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

            {/* Баланс отпусков */}
            {balance && (
              <div style={{marginTop:18,marginBottom:8,padding:'12px 18px',background:'#f8f9fa',borderRadius:10}}>
                <b>Баланс отпусков:</b>
                <span style={{marginLeft:12,color:'#43e97b'}}>Отпуск: {balance.vacationDays} дн.</span>
                <span style={{marginLeft:12,color:'#6dd5ed'}}>Отгул: {balance.leaveDays} дн.</span>
                <span style={{marginLeft:12,color:'#e74c3c'}}>Больничный: {balance.sickDays} дн.</span>
              </div>
            )}

            {/* Легенда с счетчиками */}
            <div style={{marginTop:18,display:'flex',gap:16}}>
              <span style={{display:'flex',alignItems:'center',gap:6}}>
                <FaWalking style={{color:'#6dd5ed',fontSize:28}} /> 
                Отгул: <strong style={{color:'#6dd5ed'}}>{monthlyStats.leave} шт.</strong>
              </span>
              <span style={{display:'flex',alignItems:'center',gap:6}}>
                <FaUmbrellaBeach style={{color:'#43e97b',fontSize:28}} /> 
                Отпуск: <strong style={{color:'#43e97b'}}>{monthlyStats.vacation} шт.</strong>
              </span>
              <span style={{display:'flex',alignItems:'center',gap:6}}>
                <FaBed style={{color:'#e74c3c',fontSize:28}} /> 
                Больничный: <strong style={{color:'#e74c3c'}}>{monthlyStats.sick} шт.</strong>
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Модальное окно отсутствующих */}
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
                const logicalType = getLogicalType(l);
                let icon = null;
                if (logicalType === 'vacation') icon = <FaUmbrellaBeach style={{color:'#43e97b',fontSize:22}} title="Отпуск" />;
                else if (logicalType === 'sick') icon = <FaBed style={{color:'#e74c3c',fontSize:22}} title="Больничный" />;
                else if (logicalType === 'leave') icon = <FaWalking style={{color:'#6dd5ed',fontSize:22}} title="Отгул" />;
                
                return (
                  <li key={idx} style={{marginBottom:12,padding:'12px 10px',background:'#f8f9fa',borderRadius:10,boxShadow:'0 1px 4px #00000011',display:'flex',alignItems:'center',gap:12,borderLeft:`6px solid ${logicalType==='vacation'?'#43e97b':logicalType==='sick'?'#e74c3c':'#6dd5ed'}`}}>
                    {icon}
                    <span style={{color:'#2193b0',fontWeight:600,marginRight:8}}>{users[l.userId]?.username || 'Сотрудник'}</span>
                    <b style={{minWidth:70}}>{logicalType === 'vacation' ? 'Отпуск' : logicalType === 'sick' ? 'Больничный' : 'Отгул'}</b>
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
