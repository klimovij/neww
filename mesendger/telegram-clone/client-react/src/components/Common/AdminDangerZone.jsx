import React from 'react';

export default function AdminDangerZone({ onClear }) {
  return (
    <div style={{margin:'32px 0',padding:'24px',background:'#fff3f3',border:'2px solid #e74c3c',borderRadius:16,maxWidth:420}}>
      <h3 style={{color:'#e74c3c',marginBottom:12}}>Опасная зона (только для администратора)</h3>
      <p style={{color:'#b71c1c',marginBottom:18}}>Внимание! Кнопка ниже удалит всех пользователей, все задачи и все новости. Это действие необратимо!</p>
      <button
        style={{background:'#e74c3c',color:'#fff',padding:'12px 28px',border:'none',borderRadius:8,fontWeight:700,fontSize:'1.1em',cursor:'pointer'}}
        onClick={onClear}
      >
        Удалить всех пользователей, задачи и новости
      </button>
    </div>
  );
}
