import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiSearch, FiCalendar, FiRefreshCw, FiClock } from 'react-icons/fi';

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

export default function AppUsageMobile({ open, onClose, onOpenMobileSidebar }) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [includeAll, setIncludeAll] = useState(true);
  const [detailsRow, setDetailsRow] = useState(null);

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
        arr = arr.filter(r => String(r.user_username || '').toLowerCase().includes(s));
      }
      setReport(arr);
    } catch {
      setReport([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date, includeAll, q]);

  // Обработчики свайпа
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      if (onOpenMobileSidebar) {
        onOpenMobileSidebar();
      }
      onClose();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleClose = () => {
    if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
    onClose();
  };

  const handleClearSearch = () => {
    setQ('');
  };

  if (!open) return null;

  return ReactDOM.createPortal(
    <>
      {/* Основная модалка */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}
        onClick={handleClose}
      >
        <div
          ref={modalRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingTop: '56px',
            paddingBottom: '20px',
            boxSizing: 'border-box',
          }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: '56px',
              background: 'linear-gradient(135deg, #a3e635 0%, #84cc16 100%)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              zIndex: 10001,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'background-color 0.2s',
              }}
              title="Назад"
            >
              <FaArrowLeft />
            </button>
            
            <h2
              style={{
                color: '#fff',
                fontSize: '16px',
                fontWeight: 700,
                margin: 0,
                flex: 1,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <FiRefreshCw size={18} />
              Запуски приложения
            </h2>

            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'background-color 0.2s',
              }}
              title="Закрыть"
            >
              <FiX />
            </button>
          </div>

          {/* Контент */}
          <div style={{ flex: 1, padding: '24px 16px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            {/* Фильтры */}
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Дата */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#a3e635',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '6px',
                }}>
                  <FiCalendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Дата
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '2px solid rgba(163, 230, 53, 0.3)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 500,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Чекбокс "Показать всех" */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(163, 230, 53, 0.1)',
                border: '2px solid rgba(163, 230, 53, 0.3)',
              }}>
                <input
                  type="checkbox"
                  checked={includeAll}
                  onChange={e => setIncludeAll(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                  }}
                />
                Показать всех
              </label>

              {/* Поиск */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  display: 'block',
                  color: '#a3e635',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '6px',
                }}>
                  Поиск по ФИО
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Введите имя сотрудника..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 12px',
                      borderRadius: '12px',
                      border: '2px solid rgba(163, 230, 53, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                  <FiSearch
                    size={18}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#a3e635',
                      pointerEvents: 'none',
                    }}
                  />
                  {q && (
                    <button
                      onClick={handleClearSearch}
                      style={{
                        position: 'absolute',
                        right: '40px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontSize: '18px',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Кнопка обновить */}
              <button
                onClick={fetchReport}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '2px solid rgba(163, 230, 53, 0.3)',
                  background: loading
                    ? 'rgba(163, 230, 53, 0.3)'
                    : 'linear-gradient(135deg, #a3e635 0%, #84cc16 100%)',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '15px',
                  opacity: loading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite',
                    }} />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <FiRefreshCw size={18} />
                    Обновить
                  </>
                )}
              </button>
            </div>

            {/* Результаты */}
            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#a3e635',
                fontSize: '16px',
                fontWeight: 600,
              }}>
                Загрузка данных...
              </div>
            ) : (!report || report.length === 0) ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '15px',
              }}>
                Нет данных для отображения
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {report.map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid rgba(163, 230, 53, 0.2)',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '12px',
                    }}>
                      {row.user_avatar ? (
                        <img
                          src={row.user_avatar}
                          alt={row.user_username}
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid rgba(163, 230, 53, 0.3)',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #a3e635 0%, #84cc16 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '18px',
                        }}>
                          {(row.user_username || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          margin: 0,
                          color: '#a3e635',
                          fontSize: '16px',
                          fontWeight: 700,
                        }}>
                          {row.user_username}
                        </h3>
                        <div style={{
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '13px',
                          marginTop: '2px',
                        }}>
                          {row.date}
                        </div>
                      </div>
                      <button
                        onClick={() => setDetailsRow(row)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#0ea5e9',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        Подробнее
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FiClock size={14} />
                          Первый запуск:
                        </span>
                        <span style={{ color: '#fff', fontWeight: 500 }}>
                          {formatTime(row.first_start)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FiClock size={14} />
                          Последнее закрытие:
                        </span>
                        <span style={{ color: '#fff', fontWeight: 500 }}>
                          {formatTime(row.last_stop)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Промежуток:</span>
                        <span style={{ color: '#a3e635', fontWeight: 700, fontSize: '15px' }}>
                          {formatDurationSec(row.span_seconds)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Подсказка о свайпе */}
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '12px',
              pointerEvents: 'none',
              zIndex: 10002,
            }}
          >
            ← Свайпните влево для возврата
          </div>

          {/* CSS для анимации загрузки */}
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>

      {/* Модалка деталей сессий */}
      {detailsRow && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 20000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setDetailsRow(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
              border: '2px solid rgba(163, 230, 53, 0.3)',
              borderRadius: '16px',
              color: '#fff',
              padding: '20px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header деталей */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <div style={{ fontWeight: 800, color: '#a3e635', fontSize: '16px' }}>
                Сессии: {detailsRow.user_username} — {detailsRow.date}
              </div>
              <button
                onClick={() => setDetailsRow(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '24px',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* Список сессий */}
            <div style={{
              overflow: 'auto',
              flex: 1,
              borderRadius: '10px',
              border: '1px solid rgba(163, 230, 53, 0.2)',
            }}>
              {Array.isArray(detailsRow.sessions) && detailsRow.sessions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
                  {detailsRow.sessions
                    .slice()
                    .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
                    .map((s, idx) => (
                      <div
                        key={s.id || idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '10px',
                          padding: '12px',
                          border: '1px solid rgba(163, 230, 53, 0.2)',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Начало:</span>
                            <span style={{ color: '#fff', fontWeight: 500 }}>{formatTime(s.start_at)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Конец:</span>
                            <span style={{ color: '#fff', fontWeight: 500 }}>{formatTime(s.end_at)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Длительность:</span>
                            <span style={{ color: '#a3e635', fontWeight: 700 }}>{formatDurationSec(s.duration_sec)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '15px',
                }}>
                  Нет запусков за день
                </div>
              )}
            </div>

            {/* Кнопка закрыть */}
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => setDetailsRow(null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #a3e635 0%, #84cc16 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

