import React from 'react';
import Modal from 'react-modal';

function UserWorkTimeDetailsModal({ isOpen, onRequestClose, logs, username }) {
  function formatTime(dtStr) {
    if (!dtStr) return '';
    const d = new Date(dtStr);
    return `${d.toLocaleDateString('ru-RU')}, ${d.toLocaleTimeString('ru-RU')}`;
  }
  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose} contentLabel="Детали рабочего времени" className="modal" overlayClassName="modal-overlay">
      <h2>Детали рабочего времени: {username}</h2>
      <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #333', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Тип события</th>
              <th>Время</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={idx}>
                <td>{log.event_type === 'login' ? 'Вход' : 'Выход'}</td>
                <td>{formatTime(log.event_time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={onRequestClose} style={{ marginTop: 16 }}>Закрыть</button>
    </Modal>
  );
}

export default UserWorkTimeDetailsModal;
