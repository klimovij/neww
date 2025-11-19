import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../../context/AppContext';
import { FiFileText, FiX, FiZap, FiAlertTriangle, FiInfo } from 'react-icons/fi';

const TemplatesQuickPicker = ({ isOpen, onClose, onSelectTemplate, onSendTemplate, onScheduleTemplate }) => {
  const { state } = useApp();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [isMobile, setIsMobile] = useState(false);

  // Типы шаблонов с иконками и цветами
  const templateTypes = {
    urgent: { 
      label: 'Срочные', 
      icon: <FiZap />, 
      color: '#ef4444', 
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    important: { 
      label: 'Важные', 
      icon: <FiAlertTriangle />, 
      color: '#eab308', 
      bgColor: 'rgba(234, 179, 8, 0.1)',
      borderColor: 'rgba(234, 179, 8, 0.3)'
    },
    info: { 
      label: 'Информационные', 
      icon: <FiInfo />, 
      color: '#3b82f6', 
      bgColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 0.3)'
    },
    sos: { 
      label: 'SOS Экстренные', 
      icon: <span style={{fontSize: '14px'}}>🚨</span>, 
      color: '#dc2626', 
      bgColor: 'rgba(220, 38, 38, 0.15)',
      borderColor: 'rgba(220, 38, 38, 0.4)'
    }
  };

  // Загрузка шаблонов для текущего департамента
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/templates/for-me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 Templates loaded:', data);
        setTemplates(data);
      } else {
        console.error('❌ Ошибка загрузки шаблонов:', response.status, response.statusText);
        setTemplates([]);
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация шаблонов по типу
  const filteredTemplates = selectedType === 'all' 
    ? templates 
    : templates.filter(t => t.type === selectedType);

  // Группировка по типам для отображения
  const groupedTemplates = templates.reduce((acc, template) => {
    const type = template.type || 'info';
    if (!acc[type]) acc[type] = [];
    acc[type].push(template);
    return acc;
  }, {});

  // Обработка выбора шаблона (вставка в поле ввода)
  const handleSelectTemplate = (template) => {
    onSelectTemplate(template.content);
    onClose();
  };

  // Обработка отправки шаблона (отправка напрямую)
  const handleSendTemplate = (template) => {
    if (onSendTemplate) {
      onSendTemplate(template.content, template.type);
    }
    onClose();
  };

  // Обработка планирования шаблона
  const handleScheduleTemplate = (template) => {
    if (onScheduleTemplate) {
      // Передаем объект шаблона, а не только контент, чтобы сохранить информацию о типе
      onScheduleTemplate({
        content: template.content,
        templateType: template.type,
        templateId: template.id,
        templateTitle: template.title
      });
    }
    onClose();
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (isMobile && isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isMobile, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <>
      {isMobile && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 100001
          }}
        />
      )}
      <div style={{
        position: isMobile ? 'fixed' : 'fixed',
        ...(isMobile ? {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          borderRadius: 0,
          zIndex: 100002
        } : {
          bottom: '80px',
          right: '20px',
          width: '400px',
          maxHeight: '500px',
          borderRadius: '12px',
          zIndex: 1000
        }),
        backgroundColor: '#1f2937',
        border: isMobile ? 'none' : '1px solid rgba(75, 85, 99, 0.3)',
        boxShadow: isMobile ? 'none' : '0 10px 25px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Заголовок */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '20px 16px' : '16px',
          borderBottom: '1px solid rgba(75, 85, 99, 0.3)',
          backgroundColor: 'rgba(55, 65, 81, 0.5)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiFileText style={{ color: '#93c5fd', fontSize: isMobile ? '20px' : '18px' }} />
            <h3 style={{ 
              margin: 0, 
              color: '#f3f4f6', 
              fontSize: isMobile ? '1.2rem' : '1rem',
              fontWeight: 600
            }}>
              Быстрые шаблоны
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: isMobile ? '1.5rem' : '1.2rem',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.3)';
              e.currentTarget.style.color = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            <FiX />
          </button>
        </div>

        {/* Информация о департаменте */}
        <div style={{
          padding: isMobile ? '14px 16px' : '12px 16px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
          fontSize: isMobile ? '0.9rem' : '0.85rem',
          color: '#93c5fd',
          flexShrink: 0
        }}>
          <strong>Департамент:</strong> {state.user?.department || 'Не указан'}
        </div>

        {/* Фильтры по типам */}
        <div style={{
          padding: isMobile ? '14px 16px' : '12px 16px',
          borderBottom: '1px solid rgba(75, 85, 99, 0.3)',
          display: 'flex',
          gap: isMobile ? '10px' : '8px',
          flexWrap: 'wrap',
          flexShrink: 0,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          ...(isMobile && {
            paddingBottom: '14px'
          })
        }}>
          <button
            onClick={() => setSelectedType('all')}
            style={{
              padding: isMobile ? '8px 14px' : '6px 12px',
              borderRadius: '8px',
              border: selectedType === 'all' ? '1px solid #93c5fd' : '1px solid rgba(75, 85, 99, 0.3)',
              backgroundColor: selectedType === 'all' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: selectedType === 'all' ? '#93c5fd' : '#d1d5db',
              cursor: 'pointer',
              fontSize: isMobile ? '0.85rem' : '0.8rem',
              fontWeight: selectedType === 'all' ? 600 : 400,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              touchAction: 'manipulation'
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Все ({templates.length})
          </button>
          {Object.entries(templateTypes).map(([key, type]) => {
            const count = groupedTemplates[key]?.length || 0;
            return (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                style={{
                  padding: isMobile ? '8px 14px' : '6px 12px',
                  borderRadius: '8px',
                  border: selectedType === key ? `1px solid ${type.color}` : '1px solid rgba(75, 85, 99, 0.3)',
                  backgroundColor: selectedType === key ? type.bgColor : 'transparent',
                  color: selectedType === key ? type.color : '#d1d5db',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.85rem' : '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: selectedType === key ? 600 : 400,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  touchAction: 'manipulation'
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {type.icon}
                {type.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Список шаблонов */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: isMobile ? '12px 16px' : '8px',
          paddingBottom: isMobile ? `calc(12px + env(safe-area-inset-bottom, 0px))` : '8px',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          overscrollBehavior: 'contain'
        }}>
          {loading ? (
            <div style={{ 
              padding: '40px 20px', 
              textAlign: 'center', 
              color: '#9ca3af',
              fontSize: isMobile ? '1rem' : '0.9rem'
            }}>
              Загрузка...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div style={{ 
              padding: '40px 20px', 
              textAlign: 'center', 
              color: '#9ca3af',
              fontSize: isMobile ? '1rem' : '0.9rem'
            }}>
              {selectedType === 'all' 
                ? 'Шаблонов пока нет' 
                : `Нет шаблонов типа "${templateTypes[selectedType]?.label}"`
              }
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '8px' }}>
              {filteredTemplates.map((template) => {
                const type = templateTypes[template.type] || templateTypes.info;
                return (
                  <div
                    key={template.id}
                    style={{
                      padding: isMobile ? '16px' : '12px',
                      borderRadius: '12px',
                      border: `1px solid ${type.borderColor}`,
                      backgroundColor: type.bgColor,
                      transition: 'all 0.2s',
                      ...(isMobile && {
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      })
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: isMobile ? '10px' : '8px'
                    }}>
                      <span style={{ color: type.color, fontSize: isMobile ? '18px' : '16px' }}>
                        {type.icon}
                      </span>
                      <span style={{
                        color: type.color,
                        fontSize: isMobile ? '1rem' : '0.9rem',
                        fontWeight: '600'
                      }}>
                        {template.title}
                      </span>
                    </div>
                    <div style={{
                      color: '#d1d5db',
                      fontSize: isMobile ? '0.9rem' : '0.85rem',
                      lineHeight: '1.5',
                      marginBottom: isMobile ? '14px' : '12px',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}>
                      {isMobile 
                        ? template.content
                        : (template.content.length > 80 
                            ? template.content.substring(0, 80) + '...' 
                            : template.content)
                      }
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: isMobile ? '10px' : '8px',
                      justifyContent: 'flex-end',
                      flexWrap: isMobile ? 'wrap' : 'nowrap'
                    }}>
                      <button
                        onClick={() => handleSelectTemplate(template)}
                        style={{
                          padding: isMobile ? '10px 16px' : '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(156, 163, 175, 0.3)',
                          backgroundColor: 'rgba(75, 85, 99, 0.2)',
                          color: '#d1d5db',
                          cursor: 'pointer',
                          fontSize: isMobile ? '0.9rem' : '0.8rem',
                          fontWeight: isMobile ? 500 : 400,
                          transition: 'all 0.2s',
                          touchAction: 'manipulation',
                          flex: isMobile ? '1' : 'none',
                          minWidth: isMobile ? '0' : 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                          if (!isMobile) {
                            e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isMobile) {
                            e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.2)';
                          }
                        }}
                        onTouchStart={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.4)';
                          e.currentTarget.style.transform = 'scale(0.98)';
                        }}
                        onTouchEnd={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.2)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Вставить в поле ввода"
                      >
                        Вставить
                      </button>
                      <button
                        onClick={() => handleSendTemplate(template)}
                        style={{
                          padding: isMobile ? '10px 16px' : '6px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${type.color}`,
                          backgroundColor: type.color,
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontSize: isMobile ? '0.9rem' : '0.8rem',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                          touchAction: 'manipulation',
                          flex: isMobile ? '1' : 'none',
                          minWidth: isMobile ? '0' : 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                          if (!isMobile) {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${type.color}40`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isMobile) {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }
                        }}
                        onTouchStart={(e) => {
                          e.currentTarget.style.transform = 'scale(0.98)';
                          e.currentTarget.style.opacity = '0.9';
                        }}
                        onTouchEnd={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.opacity = '1';
                        }}
                        title="Отправить сразу"
                      >
                        Отправить
                      </button>
                      <button
                        onClick={() => handleScheduleTemplate(template)}
                        style={{
                          padding: isMobile ? '10px 16px' : '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(156, 163, 175, 0.3)',
                          backgroundColor: 'rgba(75, 85, 99, 0.2)',
                          color: '#d1d5db',
                          cursor: 'pointer',
                          fontSize: isMobile ? '0.9rem' : '0.8rem',
                          fontWeight: isMobile ? 500 : 400,
                          transition: 'all 0.2s',
                          touchAction: 'manipulation',
                          flex: isMobile ? '1' : 'none',
                          minWidth: isMobile ? '0' : 'auto',
                          width: isMobile ? '100%' : 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                          if (!isMobile) {
                            e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isMobile) {
                            e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.2)';
                          }
                        }}
                        onTouchStart={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.4)';
                          e.currentTarget.style.transform = 'scale(0.98)';
                        }}
                        onTouchEnd={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.2)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Планировать отправку"
                      >
                        Планировать
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return ReactDOM.createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default TemplatesQuickPicker;
