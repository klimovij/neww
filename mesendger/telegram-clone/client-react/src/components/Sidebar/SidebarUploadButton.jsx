import React from 'react';
import loadFileIcon from '../../assets/icons/load file.png';

export default function SidebarUploadButton({ onClick }) {
  return (
    <button
      className="sidebar-upload-btn"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px 0',
        borderRadius: 12,
        background: 'linear-gradient(90deg,#3a7bd5 0%,#00d2ff 100%)',
        color: '#fff',
        fontWeight: 700,
        fontSize: '1.08em',
        border: 'none',
        cursor: 'pointer',
        marginTop: 12,
        marginBottom: 8,
        boxShadow: '0 2px 8px #43e97b33',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        transition: 'background 0.2s',
        outline: 'none',
      }}
      onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(90deg,#2193b0 0%,#6dd5ed 100%)'}
      onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(90deg,#3a7bd5 0%,#00d2ff 100%)'}
    >
  <img src={loadFileIcon} alt="Загрузка" style={{ width: 44, height: 44, marginRight: 12, objectFit: 'contain' }} />
  Загрузка документа
    </button>
  );
}
