

import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import styled from 'styled-components';
import api from '../../services/api';
import Select from 'react-select';

const CalendarWrapper = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  background: #181c22;
  border-radius: 18px;
  box-shadow: 0 2px 18px #2193b055;
  padding: 24px 18px 32px 18px;
  position: relative;
  left: 400px;

@media (min-width: 900px) {
  transform: translateX(-400px);
  border-color: green;
}
`;
const CalendarTitle = styled.h2`
  background: linear-gradient(90deg,#43e97b 0%,#2193b0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 1.6em;
  font-weight: 800;
  margin-bottom: 18px;
  text-align: left;
`;

const Legend = styled.div`
  margin-top: 18px;
  display: flex;
  gap: 24px;
`;
const LegendItem = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1em;
`;

const BirthdayList = styled.ul`
  margin-top: 18px;
  padding-left: 0;
  list-style: none;
  @media (min-width: 900px) and (max-width: 1399px) {
    margin-left: 60px;
  }
`;

const BirthdayItem = styled.li`
  color: #fff;
  font-size: 1em;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #232931;
  border-radius: 10px;
  padding: 8px 16px;
  box-shadow: 0 1px 6px #2193b022;
`;

export default function BirthdayCalendar() {
  const [employees, setEmployees] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [birthdays, setBirthdays] = useState([]);
  const [activeMonth, setActiveMonth] = useState(selectedDate.getMonth());
  const [activeYear, setActiveYear] = useState(selectedDate.getFullYear());

  useEffect(() => {
    api.get('/api/congratulations/employees').then(res => {
      setEmployees(res.data);
    });
  }, []);

  useEffect(() => {
    const day = selectedDate.getDate();
    const month = selectedDate.getMonth() + 1;
    const todayBirthdays = Array.isArray(employees)
      ? employees.filter(e => e.birth_day === day && e.birth_month === month)
      : [];
    setBirthdays(todayBirthdays);
  }, [selectedDate, employees]);

  // Массив месяцев и лет для селекторов
  const months = [
    'Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
  ];
  const years = Array.from({length: 8}, (_,i) => 2022+i);

  const handleMonthChange = option => {
    setActiveMonth(option.value);
    setSelectedDate(new Date(activeYear, option.value, 1));
  };
  const handleYearChange = option => {
    setActiveYear(option.value);
    setSelectedDate(new Date(option.value, activeMonth, 1));
  };

  return (
    <CalendarWrapper>
      <CalendarTitle>Календарь дней рождения</CalendarTitle>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'flex-start', marginBottom: 18 }}>
        <Select
          options={months.map((m,i)=>({label:m,value:i}))}
          value={{label:months[activeMonth],value:activeMonth}}
          onChange={handleMonthChange}
          styles={{
            control: base => ({...base,background:'#181c22',borderRadius:12,border:'none',color:'#fff',minWidth:120}),
            singleValue: base => ({...base,color:'#43e97b',fontWeight:700}),
            menu: base => ({...base,background:'#232931',color:'#fff'}),
            option: (base,state) => ({...base,background:state.isSelected?'#2193b0':state.isFocused?'#43e97b22':'#232931',color:'#fff',fontWeight:state.isSelected?700:500})
          }}
          isSearchable={false}
        />
        <Select
          options={years.map(y=>({label:y,value:y}))}
          value={{label:activeYear,value:activeYear}}
          onChange={handleYearChange}
          styles={{
            control: base => ({...base,background:'#181c22',borderRadius:12,border:'none',color:'#fff',minWidth:90}),
            singleValue: base => ({...base,color:'#43e97b',fontWeight:700}),
            menu: base => ({...base,background:'#232931',color:'#fff'}),
            option: (base,state) => ({...base,background:state.isSelected?'#2193b0':state.isFocused?'#43e97b22':'#232931',color:'#fff',fontWeight:state.isSelected?700:500})
          }}
          isSearchable={false}
        />
      </div>
      <Calendar
        onChange={date => {
          setSelectedDate(date);
          setActiveMonth(date.getMonth());
          setActiveYear(date.getFullYear());
        }}
        value={selectedDate}
        calendarType="iso8601"
        locale="ru-RU"
        className="super-modern-calendar"
        tileContent={({ date, view }) => {
          if (view === 'month') {
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const birthdayEmployees = Array.isArray(employees)
              ? employees.filter(e => e.birth_day === day && e.birth_month === month)
              : [];
            if (birthdayEmployees.length > 0) {
              return (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',fontSize:'0.95em'}}>
                  <span role="img" aria-label="birthday" style={{fontSize:'1.3em'}}>🎂</span>
                  {birthdayEmployees.map(e => (
                    <span key={e.id} style={{fontSize:'0.92em',color:'#43e97b',fontWeight:600}}>{e.last_name}</span>
                  ))}
                </div>
              );
            }
            return null;
          }
        }}
        activeStartDate={new Date(activeYear, activeMonth, 1)}
        style={{width:'100%',height:'420px',fontSize:'1.15em',margin:'0 auto',boxShadow:'0 2px 12px #2193b033',borderRadius:'14px'}}
      />
      <Legend>
        <LegendItem><span role="img" aria-label="birthday" style={{fontSize:20}}>🎂</span> День рождения</LegendItem>
      </Legend>
      <div style={{ marginTop: 18, width: '100%' }}>
        <h4 style={{fontSize:'1.08em',color:'#43e97b'}}>Именинники {selectedDate.toLocaleDateString()}:</h4>
        {birthdays.length === 0 ? (
          <div style={{color:'#b2bec3'}}>Нет именинников</div>
        ) : (
          <BirthdayList>
            {birthdays.map(e => (
              <BirthdayItem key={e.id}>
                <span>{e.first_name} {e.last_name} — {e.birth_day}.{e.birth_month}.{e.birth_year}</span>
              </BirthdayItem>
            ))}
          </BirthdayList>
        )}
      </div>
      <style>{`
        .super-modern-calendar {
          width: 100%;
          font-size: 1.15em;
          max-width: 1200px;
          min-height: 420px;
          background: #181c22;
          border-radius: 18px;
          box-shadow: 0 2px 18px #2193b055;
          padding: 12px 0;
        }
        @media (min-width: 900px) and (max-width: 1399px) {
          .super-modern-calendar {
            margin-left: 60px !important;
          }
        }
        @media (min-width: 1400px) {
          .super-modern-calendar {
            margin-left: 0 !important;
          }
        }
        .react-calendar__month-view {
          border-radius: 18px;
          overflow: hidden;
        }
        .react-calendar__tile {
          min-width: 48px !important;
          min-height: 48px !important;
          font-size: 1.08em;
          border-radius: 16px !important;
          position: relative;
          transition: background .18s, box-shadow .18s;
          cursor: pointer;
          background: #232931;
          color: #fff;
          box-shadow: 0 1px 6px #2193b022;
          border: 2px solid transparent;
        }
        .react-calendar__tile--active,
        .react-calendar__tile:active {
          box-shadow: 0 0 0 4px #43e97b;
          background: #2193b0;
          color: #fff;
          border: 2px solid #43e97b;
        }
        .react-calendar__tile:hover {
          background: #43e97b22;
          box-shadow: 0 0 0 2px #43e97b;
          color: #43e97b;
          border: 2px solid #43e97b;
        }
        .react-calendar__tile--now {
          background: #43e97b33;
          color: #43e97b;
          border: 2px solid #2193b0;
        }
        .react-calendar__navigation {
          display: none !important;
        }
      `}</style>
    </CalendarWrapper>
  );
}
