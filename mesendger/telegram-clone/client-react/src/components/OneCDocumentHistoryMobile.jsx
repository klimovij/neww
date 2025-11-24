import React, { useRef, useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft, FaFileAlt } from 'react-icons/fa';
import { FiX, FiSearch, FiCalendar, FiUser, FiClock } from 'react-icons/fi';

function formatTime(dtStr) {
  if (!dtStr) return '—';
  const d = new Date(dtStr);
  return `${d.toLocaleDateString('ru-RU')}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function OneCDocumentHistoryMobile({
  open,
  onClose,
  onOpenMobileSidebar,
}) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  
  // Диапазон дат (по умолчанию вчера)
  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };
  
  const [startDate, setStartDate] = useState(getYesterdayDate);
  const [endDate, setEndDate] = useState(getYesterdayDate);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDocuments, setUserDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  
  // Поиск
  const [searchTerm, setSearchTerm] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);

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
      if (selectedUser) {
        setSelectedUser(null);
        setUserDocuments([]);
      } else {
        handleClose();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleClose = () => {
    if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
    setSelectedUser(null);
    setUserDocuments([]);
    onClose();
  };

  // Загрузка отчета
  useEffect(() => {
    if (open && !selectedUser) {
      loadReport();
    }
  }, [open, startDate, endDate, selectedUser]);

  const loadReport = async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/onec-history-report?start=${startDate}&end=${endDate}`);
      const data = await response.json();
      if (data.success) {
        setReport(data.report || []);
      } else {
        console.error('Ошибка загрузки отчета:', data.error);
        setReport([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки отчета:', error);
      setReport([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Опции для автозаполнения поиска
  const userOptions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const search = searchTerm.toLowerCase().trim();
    const uniqueUsers = Array.from(new Set(report.map(u => u.username || u.fio)));
    return uniqueUsers.filter(u => u.toLowerCase().includes(search)).slice(0, 10);
  }, [searchTerm, report]);
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowAutocomplete(true);
  };
  
  const handleClearSearch = () => {
    setSearchTerm('');
    setShowAutocomplete(false);
  };
  
  const handleSelectUser = (userName) => {
    setSearchTerm(userName);
    setShowAutocomplete(false);
  };
  
  // Фильтрация отчета по поисковому запросу
  const filteredReport = useMemo(() => {
    if (!searchTerm.trim()) return report;
    const search = searchTerm.toLowerCase().trim();
    return report.filter(user => {
      const username = (user.username || '').toLowerCase();
      const fio = (user.fio || '').toLowerCase();
      return username.includes(search) || fio.includes(search);
    });
  }, [report, searchTerm]);

  // Загрузка документов пользователя
  const loadUserDocuments = async (username) => {
    if (!startDate || !endDate) {
      console.error('[OneCDocumentHistoryMobile] loadUserDocuments: отсутствуют даты', { startDate, endDate });
      return;
    }
    
    if (!username) {
      console.error('[OneCDocumentHistoryMobile] loadUserDocuments: отсутствует username', { username });
      return;
    }
    
    console.log('[OneCDocumentHistoryMobile] Загрузка документов пользователя:', { username, startDate, endDate });
    setLoadingDocuments(true);
    try {
      const url = `/api/onec-history-user-documents?username=${encodeURIComponent(username)}&start=${startDate}&end=${endDate}`;
      console.log('[OneCDocumentHistoryMobile] Запрос:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('[OneCDocumentHistoryMobile] Ответ от API:', data);
      
      if (data.success) {
        const documents = data.documents || [];
        console.log('[OneCDocumentHistoryMobile] Документов получено:', documents.length, documents);
        setUserDocuments(documents);
      } else {
        console.error('[OneCDocumentHistoryMobile] Ошибка загрузки документов:', data.error);
        setUserDocuments([]);
      }
    } catch (error) {
      console.error('[OneCDocumentHistoryMobile] Ошибка загрузки документов:', error);
      setUserDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleViewUser = async (user) => {
    console.log('[OneCDocumentHistoryMobile] handleViewUser вызван:', user);
    setSelectedUser(user);
    
    const username = user.username || user.fio;
    if (!username) {
      console.error('[OneCDocumentHistoryMobile] handleViewUser: нет username в объекте user', user);
      return;
    }
    
    console.log('[OneCDocumentHistoryMobile] Используем username для запроса:', username);
    await loadUserDocuments(username);
  };

  const handleBack = () => {
    setSelectedUser(null);
    setUserDocuments([]);
  };

  // Проверяем, что мы на мобильном устройстве
  const [isMobileDevice, setIsMobileDevice] = useState(() => {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileDevice(window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!open) {
    return null;
  }

  // Показываем только на мобильных устройствах
  if (!isMobileDevice) {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 100009,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        visibility: 'visible',
        opacity: 1,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Заголовок */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
        flexShrink: 0,
        minHeight: '56px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {selectedUser ? (
            <button
              onClick={handleBack}
              style={{
                background: 'none',
                border: 'none',
                color: '#43e97b',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <FaArrowLeft size={20} />
            </button>
          ) : (
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#43e97b',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <FaArrowLeft size={20} />
            </button>
          )}
          <h2 style={{
            color: '#ffe082',
            fontSize: '18px',
            fontWeight: 600,
            margin: 0,
          }}>
            {selectedUser ? `Документы: ${selectedUser.username || selectedUser.fio}` : 'История 1С'}
          </h2>
        </div>
      </div>

      {/* Контент */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '16px',
        paddingBottom: '80px',
        width: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
      }}>
        {!selectedUser ? (
          <>
            {/* Фильтры */}
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Даты */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    color: '#ffe082',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}>
                    Начало
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => {
                      const newStartDate = e.target.value;
                      setStartDate(newStartDate);
                      const today = new Date().toISOString().slice(0, 10);
                      if (newStartDate === today) {
                        setEndDate(today);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '2px solid rgba(255, 224, 130, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    color: '#ffe082',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}>
                    Конец
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => {
                      const newEndDate = e.target.value;
                      setEndDate(newEndDate);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '2px solid rgba(255, 224, 130, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Поиск сотрудника */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  display: 'block',
                  color: '#ffe082',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '6px',
                }}>
                  Поиск сотрудника
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Введите имя сотрудника..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setShowAutocomplete(true)}
                    onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 12px',
                      borderRadius: '12px',
                      border: '2px solid rgba(255, 224, 130, 0.3)',
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
                      color: '#ffe082',
                      pointerEvents: 'none',
                    }}
                  />
                  {searchTerm && (
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

                {showAutocomplete && userOptions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'rgba(35, 41, 49, 0.98)',
                    border: '2px solid rgba(255, 224, 130, 0.3)',
                    borderRadius: '12px',
                    zIndex: 10002,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '6px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                  }}>
                    {userOptions.map((u, i) => (
                      <div
                        key={u + i}
                        onMouseDown={() => handleSelectUser(u)}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: i < userOptions.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                          color: '#fff',
                          fontSize: '14px',
                        }}
                      >
                        {u}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Кнопка загрузки */}
              <button
                onClick={loadReport}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '2px solid rgba(67, 233, 123, 0.3)',
                  background: loading
                    ? 'rgba(67, 233, 123, 0.3)'
                    : 'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)',
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
                {loading ? 'Загрузка...' : 'Показать отчет'}
              </button>
            </div>

            {/* Загрузка */}
            {loading && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#ffe082',
              }}>
                Загрузка...
              </div>
            )}

            {/* Список пользователей */}
            {!loading && filteredReport.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#fff',
                opacity: 0.6,
              }}>
                Нет данных за выбранный период
              </div>
            )}

            {!loading && filteredReport.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredReport.map((user, index) => (
                  <div
                    key={user.username || index}
                    onClick={() => handleViewUser(user)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(255, 224, 130, 0.2)',
                      borderRadius: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(255, 224, 130, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 224, 130, 0.2)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FiUser size={18} color="#43e97b" />
                        <span style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>
                          {user.username || user.fio || 'Неизвестно'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#ffe082' }}>
                      <span>📄 Документов: {user.totalDocuments || 0}</span>
                      <span>🔄 Действий: {user.totalActions || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Документы пользователя */}
            {loadingDocuments && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#ffe082',
              }}>
                Загрузка...
              </div>
            )}

            {!loadingDocuments && userDocuments.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#fff',
                opacity: 0.6,
              }}>
                Нет документов за выбранный период
              </div>
            )}

            {!loadingDocuments && userDocuments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {userDocuments.map((doc, index) => (
                  <div
                    key={doc.id || index}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(255, 224, 130, 0.2)',
                      borderRadius: '12px',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <FaFileAlt size={18} color="#43e97b" />
                      <span style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>
                        {doc.document_name || 'Неизвестный документ'}
                      </span>
                    </div>
                    {doc.document_type && (
                      <div style={{ fontSize: '13px', color: '#ffe082', marginBottom: '6px' }}>
                        Тип: {doc.document_type}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#fff', opacity: 0.8 }}>
                      <FiClock size={14} />
                      <span>{formatTime(doc.event_time)}</span>
                      {doc.action_type && (
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          background: doc.action_type === 'open' ? 'rgba(67, 233, 123, 0.2)' : 'rgba(255, 224, 130, 0.2)',
                          color: doc.action_type === 'open' ? '#43e97b' : '#ffe082',
                          fontSize: '11px',
                          fontWeight: 600,
                          marginLeft: '8px'
                        }}>
                          {doc.action_type === 'open' ? 'Открыт' : doc.action_type === 'edit' ? 'Изменен' : doc.action_type}
                        </span>
                      )}
                    </div>
                    {doc.computer_name && (
                      <div style={{ fontSize: '12px', color: '#fff', opacity: 0.6, marginTop: '6px' }}>
                        Компьютер: {doc.computer_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

