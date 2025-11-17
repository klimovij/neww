import React from 'react';
import Calendar from 'react-calendar';
import { FaUmbrellaBeach, FaBed, FaWalking } from 'react-icons/fa';
import styled from 'styled-components';

const ModalBg = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.55);
  z-index: 9999; display: flex; align-items: center; justify-content: center;
`;
const ModalBox = styled.div`
  background: #fff; border-radius: 24px; box-shadow: 0 12px 48px #2193b055;
  padding: 40px 36px; min-width: 620px; max-width: 1200px; min-height: 520px;
  display: flex; flex-direction: column; align-items: center;
`;
const Title = styled.h2`
  color: #2193b0; font-size: 2em; margin-bottom: 24px; font-weight: 800;
  letter-spacing: 1px;
`;
const Legend = styled.div`
  margin-top: 24px; display: flex; gap: 24px;
`;
const LegendItem = styled.span`
  display: flex; align-items: center; gap: 8px; font-size: 1.1em;
`;

export default function GeneralCalendarModal({ open, onClose, events }) {
  if (!open) return null;
  // Определяем цвет и иконку для дня
  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    const d = date.toISOString().slice(0,10);
    const found = events.find(e => d >= e.startDate && d <= e.endDate);
    if (found) {
      if (found.type === 'vacation') return 'vacation-day';
      if (found.type === 'leave') return 'leave-day';
      if (found.type === 'sick') return 'sick-day';
    }
    return '';
  };
  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const d = date.toISOString().slice(0,10);
    const found = events.find(e => d >= e.startDate && d <= e.endDate);
    if (found) {
      if (found.type === 'vacation') return <FaUmbrellaBeach style={{color:'#43e97b',fontSize:32}} title="Отпуск" />;
      if (found.type === 'leave') return <FaWalking style={{color:'#6dd5ed',fontSize:32}} title="Отгул" />;
      if (found.type === 'sick') return <FaBed style={{color:'#e74c3c',fontSize:32}} title="Больничный" />;
    }
    return null;
  };
  return (
    <ModalBg onClick={onClose}>
      <ModalBox onClick={e=>e.stopPropagation()}>
        <Title>Общий календарь событий</Title>
        <Calendar
          tileClassName={tileClassName}
          tileContent={tileContent}
          locale="ru-RU"
          calendarType="iso8601"
          className="super-modern-calendar"
          style={{width:'100%',height:'420px',fontSize:'1.15em',margin:'0 auto',boxShadow:'0 2px 12px #2193b033',borderRadius:'14px'}}
        />
        <Legend>
          <LegendItem><FaWalking style={{color:'#6dd5ed',fontSize:24}} /> Отгул</LegendItem>
          <LegendItem><FaUmbrellaBeach style={{color:'#43e97b',fontSize:24}} /> Отпуск</LegendItem>
          <LegendItem><FaBed style={{color:'#e74c3c',fontSize:24}} /> Больничный</LegendItem>
        </Legend>
        <button style={{marginTop:32,padding:'10px 28px',borderRadius:12,background:'#2193b0',color:'#fff',fontWeight:700,fontSize:'1.1em',border:'none',cursor:'pointer',boxShadow:'0 2px 12px #2193b033'}} onClick={onClose}>Закрыть</button>
        <style>{`
          .super-modern-calendar {
            width: 100%;
            font-size: 1.15em;
            max-width: 1100px;
            min-height: 420px;
          }
          .react-calendar__tile {
            min-width: 64px !important;
            min-height: 64px !important;
            font-size: 1.08em;
            border-radius: 16px !important;
            position: relative;
            transition: background .18s, box-shadow .18s;
            cursor: pointer;
          }
          .vacation-day {
            background: linear-gradient(135deg,#43e97b33 0%,#38f9d733 100%);
          }
          .leave-day {
            background: linear-gradient(135deg,#6dd5ed33 0%,#2193b033 100%);
          }
          .sick-day {
            background: linear-gradient(135deg,#e74c3c33 0%,#fcb69f33 100%);
          }
          .react-calendar__tile--active,
          .react-calendar__tile:active {
            box-shadow: 0 0 0 4px #2193b0;
            background: #eafaf1;
          }
          .react-calendar__tile:hover {
            background: #43e97b22;
            box-shadow: 0 0 0 2px #43e97b;
          }
        `}</style>
      </ModalBox>
    </ModalBg>
  );
}
