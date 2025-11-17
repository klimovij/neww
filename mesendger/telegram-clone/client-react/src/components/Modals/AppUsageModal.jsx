import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';

Modal.setAppElement('#root');

function formatTime(dtStr) {
  if (!dtStr) return '—';
  const d = new Date(dtStr);
  return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatDurationSec(sec) {
  if (!sec || sec <= 0) return '0с';
  if (sec < 60) return `${sec}с`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м${s > 0 ? ' ' + s + 'с' : ''}`;
}

export default function AppUsageModal({ isOpen, onRequestClose }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [includeAll, setIncludeAll] = useState(true);
  const [detailsRow, setDetailsRow] = useState(null);

  const modalStyles = {
    overlay: {
      backgroundColor: 'rgba(0,0,0,0.55)',
      zIndex: 200010
    },
    content: {
      // Явно переопределяем дефолтные стили React-Modal, чтобы не возвращался translate(-50%,-50%)
      inset: 'unset',
      position: 'fixed',
      top: '2%',
      left: '615px',
      right: 'auto',
      bottom: 'auto',
      transform: 'none',
      margin: 0,
      width: '1170px',
      maxWidth: '1170px',
      height: '95vh',
      background: 'transparent',
      border: 'none',
      padding: 0,
      overflow: 'visible'
    }
  };

  const applyModalPosition = (node) => {
    if (!node) return;
    const s = node.style;
    s.position = 'fixed';
    s.inset = 'auto';
    s.top = '2%';
    s.left = '615px';
    s.right = 'auto';
    s.bottom = 'auto';
    s.transform = 'none';
    s.margin = '0';
    s.width = '1170px';
    s.maxWidth = '1170px';
    s.height = '95vh';
    s.background = 'transparent';
    s.border = 'none';
    s.padding = '0';
    s.overflow = 'visible';
    // гарантированно поверх
    s.zIndex = '200020';
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ start: date, end: date, includeAll: String(includeAll) });
      const res = await fetch(`/api/app-usage/report?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      let arr = Array.isArray(data.report) ? data.report : [];
      if (q.trim()) {
        const s = q.trim().toLowerCase();
        arr = arr.filter(r => String(r.user_username||'').toLowerCase().includes(s));
      }
      setReport(arr);
    } catch {
      setReport([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, date, includeAll, q]);

  return (
    <>
      <style>{`
        .app-usage-modal,
        .app-usage-modal.ReactModal__Content,
        .app-usage-modal.ReactModal__Content--after-open,
        .app-usage-modal.ReactModal__Content--before-close{
          position:fixed !important;
          inset:auto !important;
          top:2% !important;
          left:615px !important;
          right:auto !important;
          bottom:auto !important;
          transform:none !important;
          margin:0 !important;
          width:1170px !important;
          max-width:1170px !important;
          height:95vh !important;
          background:transparent !important;
          border:none !important;
          padding:0 !important;
          overflow:visible !important;
        }
      `}</style>
      <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={modalStyles}
      contentLabel="Отчёт запуска приложения"
      ariaHideApp={false}
      parentSelector={() => document.body}
      contentClassName="app-usage-modal"
      contentRef={applyModalPosition}
      onAfterOpen={() => {
        const el = document.querySelector('.app-usage-modal');
        if (el) applyModalPosition(el);
      }}
    >
      <div onClick={onRequestClose} style={{ width: '100%', height: '100%' }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
          borderRadius: 20,
          width: '100%',
          height: '100%',
          color: '#fff',
          padding: 24,
          position: 'relative',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)'
        }}>
          <button onClick={onRequestClose} aria-label="close" style={{ position: 'absolute', right: 14, top: 10, background: 'transparent', border: 'none', color: '#fff', fontSize: 26, cursor: 'pointer' }}>×</button>
          <h3 style={{ margin: 0, marginBottom: 12, fontWeight: 900, color: '#a3e635' }}>Запуски приложения по сотрудникам</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <label>
              Дата:
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                     style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid #43e97b', background: '#0f172a', color: '#fff' }} />
            </label>
            {/* склейка удалена по требованию */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={includeAll} onChange={e => setIncludeAll(e.target.checked)} /> Показать всех
            </label>
            <input
              type="text"
              placeholder="Поиск по ФИО"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #43e97b', background: '#0f172a', color: '#fff', width: 240 }}
            />
            <button onClick={fetchReport} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #43e97b', background: 'rgba(67,233,123,0.12)', color: '#43e97b', fontWeight: 700, cursor: 'pointer' }}>
              Обновить
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 20 }}>Загрузка...</div>
          ) : (
            <div style={{ overflow: 'auto', maxHeight: '70vh', borderRadius: 12, border: '1px solid #2a2f37' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: '#111827', color: '#b2bec3', position: 'sticky', top: 0 }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px' }}>Аватар</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px' }}>Имя</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px' }}>Дата</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px' }}>Первый запуск</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px' }}>Последнее закрытие</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px' }}>Промежуток</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px' }}>Детали</th>
                  </tr>
                </thead>
                <tbody>
                  {(!report || report.length === 0) ? (
                    <tr><td colSpan={6} style={{ padding: 20, color: '#94a3b8' }}>Нет данных</td></tr>
                  ) : report.map((row, idx) => (
                    <React.Fragment key={idx}>
                      <tr style={{ borderTop: '1px solid #2a2f37', background: 'rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          {row.user_avatar ? (
                            <img src={row.user_avatar} alt={row.user_username} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>{(row.user_username || '?')[0]}</div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{row.user_username}</td>
                        <td style={{ padding: '10px 12px' }}>{row.date}</td>
                        <td style={{ padding: '10px 12px' }}>{formatTime(row.first_start)}</td>
                        <td style={{ padding: '10px 12px' }}>{formatTime(row.last_stop)}</td>
                        <td style={{ padding: '10px 12px' }}>{formatDurationSec(row.span_seconds)}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            onClick={() => setDetailsRow(row)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 10,
                              border: 'none',
                              background: '#0ea5e9',
                              color: '#fff',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >Подробнее</button>
                        </td>
                      </tr>
                      {false && Array.isArray(row.sessions) && row.sessions.length > 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: 0 }}>
                            <div style={{ padding: '6px 12px 12px 12px', background: 'rgba(0,0,0,0.15)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ color: '#cbd5e1' }}>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Начало</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Конец</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Длительность</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.sessions.map(s => (
                                    <tr key={s.id}>
                                      <td style={{ padding: '6px 8px' }}>{formatTime(s.start_at)}</td>
                                      <td style={{ padding: '6px 8px' }}>{formatTime(s.end_at)}</td>
                                      <td style={{ padding: '6px 8px' }}>{formatDurationSec(s.duration_sec)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {detailsRow && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 200030,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} onClick={() => setDetailsRow(null)}>
              <div onClick={e => e.stopPropagation()} style={{
                width: 700,
                maxWidth: '90vw',
                maxHeight: '80vh',
                background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                border: '1px solid #334155',
                borderRadius: 16,
                color: '#fff',
                padding: 16,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, color: '#a3e635' }}>
                    Сессии: {detailsRow.user_username} — {detailsRow.date}
                  </div>
                  <button onClick={() => setDetailsRow(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ overflow: 'auto', maxHeight: 'calc(80vh - 80px)', borderRadius: 10, border: '1px solid #2a2f37' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ background: '#0b1220', color: '#b2bec3', position: 'sticky', top: 0 }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px' }}>Начало</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px' }}>Конец</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px' }}>Длительность</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(detailsRow.sessions) && detailsRow.sessions.length > 0 ? (
                        detailsRow.sessions
                          .slice()
                          .sort((a,b) => new Date(a.start_at) - new Date(b.start_at))
                          .map(s => (
                            <tr key={s.id} style={{ borderTop: '1px solid #2a2f37', background: 'rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '8px 10px' }}>{formatTime(s.start_at)}</td>
                              <td style={{ padding: '8px 10px' }}>{formatTime(s.end_at)}</td>
                              <td style={{ padding: '8px 10px' }}>{formatDurationSec(s.duration_sec)}</td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={3} style={{ padding: 16, color: '#94a3b8' }}>Нет запусков за день</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 10, textAlign: 'right' }}>
                  <button onClick={() => setDetailsRow(null)} style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: 'linear-gradient(90deg, #a3ffb0 0%, #ffe082 100%)', color: '#232931', fontWeight: 800, cursor: 'pointer' }}>Закрыть</button>
                </div>
              </div>
            </div>
          )}

          <button onClick={onRequestClose} style={{ marginTop: 12, width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none', background: 'linear-gradient(90deg, #a3ffb0 0%, #ffe082 100%)', color: '#232931', fontWeight: 800, cursor: 'pointer' }}>Закрыть</button>
        </div>
      </div>
      </Modal>
    </>
  );
}
