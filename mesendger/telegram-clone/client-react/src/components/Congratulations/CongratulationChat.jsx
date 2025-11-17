import React, { useState } from 'react';
import api from '../../services/api';
import styles from './CongratulationChat.module.css';

const sparkleIcon = (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#4f8cff" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="5" fill="#6ed0fa"/>
  </svg>
);

const sendIcon = (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12l18-9-9 18-2-7-7-2z" fill="#4f8cff"/>
  </svg>
);

export default function CongratulationChat({ employee, onCongratSent }) {
  const [congratText, setCongratText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/congratulations/congratulate', {
        employeeId: employee.id,
        style: 'business-humor',
      });
      setCongratText(res.data.congratText);
    } catch (e) {
      setError('Ошибка генерации поздравления');
    }
    setLoading(false);
  };

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    try {
      let scheduledAt = null;
      if (date && time) {
        scheduledAt = new Date(date + 'T' + time);
      }
  await api.post('/api/congratulations', {
        employeeId: employee.id,
        congratText,
        scheduledAt,
      });
      onCongratSent && onCongratSent();
      setCongratText('');
      setDate('');
      setTime('');
    } catch (e) {
      setError('Ошибка отправки поздравления');
    }
    setLoading(false);
  };

  return (
    <div className={styles.congratulationChatContainer}>
      {employee.avatarUrl && (
        <img
          src={employee.avatarUrl}
          alt={employee.first_name + ' ' + employee.last_name}
          className={styles.avatar}
        />
      )}
      <h4 className={styles.title}>
        {sparkleIcon}
        Поздравление для {employee.first_name} {employee.last_name}
      </h4>
      <button
        className={styles.generateButton}
        onClick={handleGenerate}
        disabled={loading}
      >
        {sparkleIcon}
        {loading ? 'Генерируется...' : 'Сгенерировать поздравление ИИ'}
      </button>
      <textarea
        className={styles.textarea}
        value={congratText}
        onChange={e => setCongratText(e.target.value)}
        rows={6}
        placeholder="Текст поздравления..."
      />
      <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
        <div>
          <label style={{ fontWeight: 600, color: '#2a3a4d', marginRight: 8 }}>Дата отправки:</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: 6, borderRadius: 6, border: '1px solid #cbe6ff' }} />
        </div>
        <div>
          <label style={{ fontWeight: 600, color: '#2a3a4d', marginRight: 8 }}>Время:</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ padding: 6, borderRadius: 6, border: '1px solid #cbe6ff' }} />
        </div>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={loading || !congratText}
        >
          {sendIcon}
          {date && time ? 'Запланировать поздравление' : 'Отправить поздравление'}
        </button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
