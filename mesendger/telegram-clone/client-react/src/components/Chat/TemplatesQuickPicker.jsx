import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FiFileText, FiX, FiZap, FiAlertTriangle, FiInfo } from 'react-icons/fi';

const TemplatesQuickPicker = ({ isOpen, onClose, onSelectTemplate, onSendTemplate, onScheduleTemplate }) => {
  const { state } = useApp();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('all');

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
      const response = await fetch('http://localhost:3001/api/templates/for-me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 Templates loaded:', data);
        setTemplates(data);
      } else {
        console.error('❌ Ошибка загрузки шаблонов:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Ошибка:', error);
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

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      width: '400px',
      maxHeight: '500px',
      backgroundColor: '#1f2937',
      borderRadius: '12px',
      border: '1px solid rgba(75, 85, 99, 0.3)',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      {/* Заголовок */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid rgba(75, 85, 99, 0.3)',
        backgroundColor: 'rgba(55, 65, 81, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiFileText style={{ color: '#93c5fd' }} />
          <h3 style={{ margin: 0, color: '#f3f4f6', fontSize: '1rem' }}>
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
            fontSize: '1.2rem',
            padding: '4px'
          }}
        >
          <FiX />
        </button>
      </div>

      {/* Информация о департаменте */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
        fontSize: '0.85rem',
        color: '#93c5fd'
      }}>
        <strong>Департамент:</strong> {state.user?.department || 'Не указан'}
      </div>

      {/* Фильтры по типам */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(75, 85, 99, 0.3)',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setSelectedType('all')}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: selectedType === 'all' ? '1px solid #93c5fd' : '1px solid rgba(75, 85, 99, 0.3)',
            backgroundColor: selectedType === 'all' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: selectedType === 'all' ? '#93c5fd' : '#d1d5db',
            cursor: 'pointer',
            fontSize: '0.8rem'
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
                padding: '6px 12px',
                borderRadius: '6px',
                border: selectedType === key ? `1px solid ${type.color}` : '1px solid rgba(75, 85, 99, 0.3)',
                backgroundColor: selectedType === key ? type.bgColor : 'transparent',
                color: selectedType === key ? type.color : '#d1d5db',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
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
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '8px'
      }}>
        {loading ? (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#9ca3af' 
          }}>
            Загрузка...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#9ca3af' 
          }}>
            {selectedType === 'all' 
              ? 'Шаблонов пока нет' 
              : `Нет шаблонов типа "${templateTypes[selectedType]?.label}"`
            }
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredTemplates.map((template) => {
              const type = templateTypes[template.type] || templateTypes.info;
              return (
                <div
                  key={template.id}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${type.borderColor}`,
                    backgroundColor: type.bgColor,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ color: type.color }}>
                      {type.icon}
                    </span>
                    <span style={{
                      color: type.color,
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}>
                      {template.title}
                    </span>
                  </div>
                  <div style={{
                    color: '#d1d5db',
                    fontSize: '0.85rem',
                    lineHeight: '1.3',
                    marginBottom: '12px'
                  }}>
                    {template.content.length > 80 
                      ? template.content.substring(0, 80) + '...' 
                      : template.content
                    }
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      onClick={() => handleSelectTemplate(template)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(156, 163, 175, 0.3)',
                        backgroundColor: 'rgba(75, 85, 99, 0.2)',
                        color: '#d1d5db',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.2)';
                      }}
                      title="Вставить в поле ввода"
                    >
                      Вставить
                    </button>
                    <button
                      onClick={() => handleSendTemplate(template)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${type.color}`,
                        backgroundColor: type.color,
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = `0 4px 12px ${type.color}40`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      title="Отправить сразу"
                    >
                      Отправить
                    </button>
                    <button
                      onClick={() => {
                        if (onScheduleTemplate) onScheduleTemplate(template.content);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(156, 163, 175, 0.3)',
                        backgroundColor: 'rgba(75, 85, 99, 0.2)',
                        color: '#d1d5db',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.2)';
                      }}
                      title="Запланировать отправку"
                    >
                      Запланировать
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatesQuickPicker;
