import React, { useEffect, useState } from 'react';
import LeaveCalendarModal from './LeaveCalendarModal';
import { FaUserCircle, FaFilter, FaSort } from 'react-icons/fa';
import styled from 'styled-components';


const Wrapper = styled.div`
  width: 100%;
  max-width: ${p => p.$full ? '100%' : '540px'};
  margin: ${p => p.$full ? '0' : '48px auto'};
  background: ${p => p.$full ? 'transparent' : 'linear-gradient(135deg, rgba(35,41,49,0.92) 0%, rgba(33,147,176,0.93) 100%)'};
  border-radius: ${p => p.$full ? '0' : '32px'};
  box-shadow: ${p => p.$full ? 'none' : '0 0 0 4px #43e97b33, 0 8px 40px #2193b066, 0 1.5px 8px 0 #43e97b55, 0 0 32px #43e97b55, 0 0 0 2.5px #43e97b88 inset'};
  padding: ${p => p.$full ? '0' : '54px 38px 38px 38px'};
  display: flex;
  flex-direction: column;
  align-items: center;
  border: ${p => p.$full ? 'none' : '2.5px solid #43e97b99'};
  position: relative;
  backdrop-filter: ${p => p.$full ? 'none' : 'blur(3.5px) saturate(1.13)'};
  overflow: visible;
  &::before { display: ${p => p.$full ? 'none' : 'block'}; content: ''; position: absolute; inset: 0; pointer-events: none; background: url('https://www.transparenttextures.com/patterns/noise.png'); opacity: 0.13; z-index: 1; }
`;
const Title = styled.h2`
  color: var(--modal-leaves-title-color, #43e97b);
  font-size: 2.2em;
  font-weight: 900;
  margin-bottom: 28px;
  letter-spacing: 0.01em;
  text-shadow: 0 0 22px var(--modal-leaves-title-color, #43e97b), 0 0 32px rgba(67, 233, 123, 0.27), 0 0 2px #fff, 0 0 24px rgba(67, 233, 123, 0.53);
  text-align: center;
  animation: titlePop 0.7s cubic-bezier(.4,0,.2,1);
  @keyframes titlePop {
    from { opacity: 0; transform: translateY(-18px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;
const Form = styled.form`
  display: flex;
  gap: 14px;
  margin-bottom: 32px;
  flex-wrap: wrap;
  justify-content: center;
  background: var(--modal-leaves-form-background, rgba(44,62,80,0.22));
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(67, 233, 123, 0.13), 0 0 0 2px rgba(33, 147, 176, 0.27);
  padding: 18px 12px 10px 12px;
  border: 1.5px solid var(--modal-leaves-border-color, rgba(67, 233, 123, 0.27));
`;
const Input = styled.input`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid var(--modal-leaves-border-color, #2193b0);
  font-size: 1.08rem;
  background: var(--modal-leaves-input-background, rgba(255,255,255,0.92));
  color: var(--modal-leaves-input-text-color, #333);
  transition: border .2s, box-shadow .2s;
  &:focus { border: 2px solid var(--modal-leaves-title-color, #43e97b); outline: none; box-shadow: 0 0 8px rgba(67, 233, 123, 0.33); }
`;
const Select = styled.select`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid var(--modal-leaves-border-color, #2193b0);
  font-size: 1.08rem;
  background: var(--modal-leaves-input-background, rgba(255,255,255,0.92));
  color: var(--modal-leaves-input-text-color, #333);
  transition: border .2s, box-shadow .2s;
  &:focus { border: 2px solid var(--modal-leaves-title-color, #43e97b); outline: none; box-shadow: 0 0 8px rgba(67, 233, 123, 0.33); }
`;
const Button = styled.button`
  background: linear-gradient(135deg, #6dd5ed 0%, #2193b0 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 22px;
  font-weight: 700;
  font-size: 1.08rem;
  cursor: pointer;
  box-shadow: 0 2px 12px #2193b044, 0 0 16px #43e97b55;
  transition: all .22s cubic-bezier(.4,0,.2,1);
  outline: none;
  filter: drop-shadow(0 0 8px #43e97b88);
  &:hover {
    background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
    color: #fff;
    transform: scale(1.07);
    box-shadow: 0 4px 24px #43e97b88, 0 0 32px #6dd5ed88;
    border-color: #6dd5ed;
    filter: drop-shadow(0 0 16px #6dd5edcc);
  }
`;
const CardList = styled.ul`
  list-style: none;
  padding: 0;
  width: 100%;
  z-index: 2;
`;
const Card = styled.li`
  background: var(--modal-leaves-card-background, linear-gradient(135deg, rgba(255,255,255,0.93) 0%, rgba(33,147,176,0.13) 100%));
  border-radius: 18px;
  box-shadow: 0 2px 16px rgba(67, 233, 123, 0.2), 0 0 0 2px rgba(33, 147, 176, 0.27);
  margin-bottom: 18px;
  padding: 20px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1.13em;
  transition: box-shadow .22s, transform .18s;
  border-left: 7px solid var(--modal-leaves-title-color, #43e97b);
  position: relative;
  overflow: hidden;
  &:hover {
    box-shadow: 0 4px 32px rgba(67, 233, 123, 0.33), 0 0 32px rgba(33, 147, 176, 0.33);
    transform: scale(1.025);
  }
`;
const CardInfo = styled.div`
  display: flex;
  flex-direction: column;
`;
const CardDates = styled.span`
  color: var(--modal-leaves-card-text-color, #2193b0);
  font-weight: 700;
  font-size: 1.08em;
`;
const CardReason = styled.span`
  color: var(--modal-leaves-card-reason-color, #636e72);
  font-size: 1em;
  margin-top: 2px;
`;
const DeleteBtn = styled(Button)`
  background: linear-gradient(135deg, #e74c3c 0%, #fcb69f 100%);
  color: #fff;
  margin-left: 18px;
  filter: drop-shadow(0 0 8px #e74c3c88);
  &:hover {
    background: linear-gradient(135deg, #fcb69f 0%, #e74c3c 100%);
    filter: drop-shadow(0 0 16px #e74c3ccc);
  }
`;

// UI helpers
const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
`;
const FieldLabel = styled.span`
  color: #ecf0f1;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.02em;
`;
const GroupRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-end;
`;
const Hint = styled.span`
  color: #dfe6e9;
  font-size: 0.88rem;
`;


export default function Leaves({ token, hideTime = false, fullWidth = false }) {
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '', type: 'leave', hours: 0, minutesOnly: 0 });
  const [showCalendar, setShowCalendar] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('desc');
  const [user, setUser] = useState(null);

  // Переопределяем фон для LeaveCalendarModal через глобальный стиль
  const modalBgStyle = {
    background: 'linear-gradient(135deg, rgba(35,41,49,0.92) 0%, rgba(33,147,176,0.93) 100%)',
    borderRadius: '0',
    boxShadow: '0 8px 40px #2193b044',
    padding: '0',
    width: '100%',
    height: '100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflowY: 'auto',
    overflowX: 'hidden',
    left: '120px',
  };

  // Функция для загрузки актуальных данных
  const fetchLeaves = async () => {
    try {
      const response = await fetch('/api/leaves', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[LEAVES] fetch result:', data);
      
      // Проверяем, что data является массивом
      if (Array.isArray(data)) {
        setLeaves(data);
      } else {
        console.warn('[LEAVES] Получены некорректные данные:', data);
        setLeaves([]);
      }
      
    } catch (error) {
      console.error('[LEAVES] Ошибка загрузки данных:', error);
      // Не показываем alert при автообновлении, только логируем
      if (error.message !== 'HTTP 401') {
        setLeaves([]);
      }
    }
  };
  useEffect(() => {
    fetchLeaves();
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    // Автоматическое обновление статуса заявок каждые 5 секунд
    const interval = setInterval(fetchLeaves, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Обновлять заявки при смене фильтра
  useEffect(() => {
    fetchLeaves();
  }, [filter]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    
    // Получаем userId из localStorage (user или currentUser)
    let userId = null;
    const u = localStorage.getItem('user') || localStorage.getItem('currentUser');
    if (u) {
      try {
        const parsed = JSON.parse(u);
        userId = parsed.id || parsed.userId;
      } catch (err) {
        console.error('Ошибка парсинга пользователя:', err);
      }
    }
    
    if (!userId) {
      alert('Ошибка: не найден userId. Пожалуйста, войдите заново.');
      return;
    }

    // Валидация дат
    if (new Date(form.startDate) > new Date(form.endDate)) {
      alert('Дата начала не может быть позже даты окончания');
      return;
    }

    // Исправление: если выбран тип 'sick', отправлять type: 'sick', иначе как есть
    const leaveType = form.type === 'sick' ? 'sick' : form.type;
    
    // Считаем итоговые минуты для отгула
    const totalMinutes = form.type === 'leave'
      ? (Number(form.hours || 0) * 60 + Number(form.minutesOnly || 0))
      : 0;

    try {
      const response = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason,
          type: leaveType,
          minutes: Number(totalMinutes) || 0,
          userId
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Сбрасываем форму после успешного создания
      setForm({ startDate: '', endDate: '', reason: '', type: 'leave', hours: 0, minutesOnly: 0 });
      fetchLeaves();
      alert('Заявка успешно создана!');
      
    } catch (error) {
      console.error('Ошибка создания заявки:', error);
      alert(`Ошибка создания заявки: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту заявку?')) {
      return;
    }

    try {
      const response = await fetch(`/api/leaves/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      fetchLeaves();
      alert('Заявка успешно удалена!');
      
    } catch (error) {
      console.error('Ошибка удаления заявки:', error);
      alert(`Ошибка удаления заявки: ${error.message}`);
    }
  };

  // Фильтрация и сортировка
  // Показывать все заявки пользователя, статус отображается в карточке
  let filtered = Array.isArray(leaves) ? leaves : [];
  
  if (filter !== 'all') {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Устанавливаем время на начало дня
    
    if (filter === 'future') {
      filtered = filtered.filter(l => {
        const startDate = new Date(l.startDate);
        startDate.setHours(0, 0, 0, 0);
        return startDate >= now;
      });
    }
    
    if (filter === 'past') {
      filtered = filtered.filter(l => {
        const endDate = new Date(l.endDate);
        endDate.setHours(23, 59, 59, 999); // Устанавливаем время на конец дня
        return endDate < now;
      });
    }
  }
  
  // Безопасная сортировка с проверкой наличия дат
  filtered = [...filtered].sort((a, b) => {
    const dateA = a.startDate || '';
    const dateB = b.startDate || '';
    return sort === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
  });

  return (
  <Wrapper $full={fullWidth}>
      <Title style={fullWidth ? {marginTop: 8} : undefined}>Заявка на отгулы</Title>
      <div style={{display:'flex',gap:12,marginBottom:18,alignItems:'center'}}>
        <FaFilter title="Фильтр" style={{color:'#2193b0'}} />
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:6,borderRadius:6,border:'1px solid #b2bec3'}} title="Фильтр по дате">
          <option value="all">Все</option>
          <option value="future">Будущие</option>
          <option value="past">Прошедшие</option>
        </select>
        <FaSort title="Сортировка" style={{color:'#2193b0',marginLeft:10}} />
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{padding:6,borderRadius:6,border:'1px solid #b2bec3'}} title="Сортировка">
          <option value="desc">Сначала новые</option>
          <option value="asc">Сначала старые</option>
        </select>
        <span style={{marginLeft:16,color:'#636e72',fontSize:'0.98em'}}>Всего: {filtered.length}</span>
      </div>
      <Form onSubmit={handleSubmit}>
        <GroupRow>
          <Field>
            <FieldLabel>С даты</FieldLabel>
            <Input name="startDate" type="date" value={form.startDate} onChange={handleChange} required />
          </Field>
          <Field>
            <FieldLabel>По дату</FieldLabel>
            <Input name="endDate" type="date" value={form.endDate} onChange={handleChange} required />
          </Field>
        </GroupRow>
        <Field style={{minWidth:'100%'}}>
          <FieldLabel>Причина</FieldLabel>
          <Input name="reason" placeholder="Например: личные дела / к врачу" value={form.reason} onChange={handleChange} required />
        </Field>
        <GroupRow>
          <Field>
            <FieldLabel>Тип</FieldLabel>
            <Select name="type" value={form.type} onChange={handleChange} title="Тип">
              <option value="leave">Отгул</option>
              <option value="vacation">Отпуск</option>
              <option value="sick">Больничный</option>
            </Select>
          </Field>
          {form.type === 'leave' && (
            <Field style={{minWidth: '320px'}}>
              <FieldLabel>Отгул на</FieldLabel>
              <GroupRow>
                <Select name="hours" value={form.hours} onChange={handleChange} title="Часы отгула">
                  {[...Array(9).keys()].map(h => (
                    <option key={h} value={h}>{h} ч</option>
                  ))}
                </Select>
                <Select name="minutesOnly" value={form.minutesOnly} onChange={handleChange} title="Минуты отгула">
                  {[0,5,10,15,20,30,45].map(m => (
                    <option key={m} value={m}>{m} мин</option>
                  ))}
                </Select>
              </GroupRow>
              <Hint>Оставьте 0 ч 0 мин для полного дня</Hint>
            </Field>
          )}
          <div style={{display:'flex',alignItems:'flex-end'}}>
            <Button type="submit">Добавить</Button>
          </div>
        </GroupRow>
      </Form>
      {/* Календарь отгулов убран по требованию, но если появится модалка, используйте modalBgStyle */}
      <CardList>
        {filtered.map(l => (
          <Card key={l.id} style={{
            borderLeft: `6px solid ${l.type==='vacation' ? '#43e97b' : l.type==='sick' ? '#e74c3c' : '#6dd5ed'}`
          }}>
            <CardInfo>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="avatar" style={{width:32,height:32,borderRadius:8,objectFit:'cover',boxShadow:'0 2px 8px #2193b033'}} />
                  : <FaUserCircle size={32} color="#b2bec3" title="Аватар" />}
                <div>
                  <CardDates>{l.startDate} — {l.endDate}</CardDates>
                  <CardReason>{l.reason}</CardReason>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                    <span style={{
                      color: l.type==='vacation' ? '#43e97b' : l.type==='sick' ? '#e74c3c' : '#6dd5ed',
                      fontWeight:600,fontSize:'0.98em'}}>
                      {l.type==='vacation' ? 'Отпуск' : l.type==='sick' ? 'Больничный' : 'Отгул'}
                    </span>
                    {l.type === 'leave' && l.minutes > 0 && (
                      <span style={{
                        color:'#636e72',
                        fontSize:'0.9em',
                        fontWeight:500,
                        background:'rgba(99,110,114,0.1)',
                        padding:'2px 8px',
                        borderRadius:6
                      }}>
                        {l.minutes < 60 
                          ? `${l.minutes} мин` 
                          : `${Math.floor(l.minutes/60)} ч ${l.minutes%60 > 0 ? `${l.minutes%60} мин` : ''}`
                        }
                      </span>
                    )}
                  </div>
                  <div style={{marginTop:6}}>
                    <span style={{
                      padding:'4px 12px',
                      borderRadius:10,
                      background:l.status==='approved'?'#43e97b':l.status==='declined'?'#e74c3c':l.status==='completed'?'#6dd5ed':'#f9ca24',
                      color:'#fff',
                      fontWeight:700,
                      fontSize:'1em',
                      boxShadow:'0 0 8px '+(l.status==='approved'?'#43e97b':l.status==='declined'?'#e74c3c':l.status==='completed'?'#6dd5ed':'#f9ca24'),
                      border:'1.5px solid '+(l.status==='approved'?'#219150':l.status==='declined'?'#c0392b':l.status==='completed'?'#2193b0':'#e67e22'),
                      textShadow:'0 1px 4px #000',
                      letterSpacing:'0.03em',
                      display:'inline-flex',
                      alignItems:'center',
                      gap:'6px'
                    }}>
                      {l.status==='approved' && <span style={{fontSize:'1.1em'}}>✔️</span>}
                      {l.status==='declined' && <span style={{fontSize:'1.1em'}}>❌</span>}
                      {l.status==='completed' && <span style={{fontSize:'1.1em'}}>🎯</span>}
                      {l.status==='pending' && <span style={{fontSize:'1.1em'}}>⏳</span>}
                      {l.status==='approved'?'Одобрено':l.status==='declined'?'Отклонено':l.status==='completed'?'Отработано':'Ожидает'}
                    </span>
                  </div>
                </div>
              </div>
            </CardInfo>
            <DeleteBtn onClick={() => handleDelete(l.id)} title="Удалить отгул">Удалить</DeleteBtn>
          </Card>
        ))}
      </CardList>
    </Wrapper>
  );
}
