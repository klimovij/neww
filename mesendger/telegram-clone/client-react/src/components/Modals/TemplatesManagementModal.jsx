import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FiX, FiPlus, FiEdit2, FiTrash2, FiAlertTriangle, FiInfo, FiZap } from 'react-icons/fi';

const TemplatesManagementModal = ({ isOpen, onClose }) => {
  const { state } = useApp();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info', // info, urgent, important, sos
    department: state.user?.department || ''
  });

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

  // Загрузка шаблонов
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = state.user?.role === 'admin' ? '/api/templates' : '/api/templates/for-me';
      
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        console.error('Ошибка загрузки шаблонов');
      }
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  // Создание/обновление шаблона
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Заполните все поля');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingTemplate 
        ? `/api/templates/${editingTemplate.id}`
        : '/api/templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      // Для SOS шаблонов убираем департамент, чтобы они были доступны всем
      const templateData = {
        ...formData,
        department: formData.type === 'sos' ? '' : formData.department
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(templateData)
      });

      if (response.ok) {
        setShowCreateForm(false);
        setEditingTemplate(null);
        setFormData({
          title: '',
          content: '',
          type: 'info',
          department: state.user?.department || ''
        });
        loadTemplates();
      } else {
        const error = await response.json();
        alert('Ошибка: ' + (error.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка сохранения шаблона');
    }
  };

  // Удаление шаблона
  const handleDelete = async (templateId) => {
    if (!window.confirm('Удалить этот шаблон?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        loadTemplates();
      } else {
        alert('Ошибка удаления шаблона');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка удаления шаблона');
    }
  };

  // Редактирование шаблона
  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title || '',
      content: template.content || '',
      type: template.type || 'info',
      department: template.department || ''
    });
    setShowCreateForm(true);
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
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200002,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid rgba(75, 85, 99, 0.3)'
      }}>
        {/* Заголовок */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            margin: 0,
            color: '#f3f4f6',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            Управление шаблонами
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '1.5rem',
              padding: '4px'
            }}
          >
            <FiX />
          </button>
        </div>

        {/* Информация о департаменте */}
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          color: '#93c5fd'
        }}>
          <strong>Департамент:</strong> {state.user?.department || 'Не указан'}
          {state.user?.role === 'admin' && (
            <span style={{ marginLeft: '16px', color: '#fbbf24' }}>
              (Администратор - видны все шаблоны)
            </span>
          )}
        </div>

        {/* Кнопки создания */}
        {!showCreateForm && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600'
              }}
            >
              <FiPlus /> Создать шаблон
            </button>
            <button
              onClick={() => {
                setFormData({
                  title: '',
                  content: '',
                  type: 'sos',
                  department: '' // SOS шаблоны создаются без департамента для доступа всем
                });
                setShowCreateForm(true);
              }}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
              }}
            >
              🚨 Создать SOS шаблон
            </button>
          </div>
        )}

        {/* Форма создания/редактирования */}
        {showCreateForm && (
          <form onSubmit={handleSubmit} style={{
            backgroundColor: 'rgba(55, 65, 81, 0.5)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid rgba(75, 85, 99, 0.3)'
          }}>
            <h3 style={{ color: '#f3f4f6', marginTop: 0 }}>
              {editingTemplate ? 'Редактировать шаблон' : 'Создать новый шаблон'}
            </h3>
            
            {formData.type === 'sos' && (
              <div style={{
                backgroundColor: 'rgba(220, 38, 38, 0.15)',
                border: '1px solid rgba(220, 38, 38, 0.4)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                color: '#fca5a5'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span>🚨</span>
                  <strong>SOS Экстренный шаблон</strong>
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  Этот шаблон будет отправляться как экстренное сообщение с красно-оранжевым фоном и специальной иконкой.
                </div>
              </div>
            )}
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#d1d5db', display: 'block', marginBottom: '8px' }}>
                Название шаблона:
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(75, 85, 99, 0.5)',
                  backgroundColor: '#374151',
                  color: '#f3f4f6'
                }}
                placeholder="Например: Приветствие клиента"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#d1d5db', display: 'block', marginBottom: '8px' }}>
                Тип шаблона:
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {Object.entries(templateTypes)
                  .filter(([key]) => key !== 'sos' || state.user?.role === 'admin' || state.user?.role === 'hr')
                  .map(([key, type]) => (
                  <label key={key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: formData.type === key ? type.bgColor : 'transparent',
                    border: `1px solid ${formData.type === key ? type.borderColor : 'rgba(75, 85, 99, 0.3)'}`,
                    color: formData.type === key ? type.color : '#d1d5db'
                  }}>
                    <input
                      type="radio"
                      name="type"
                      value={key}
                      checked={formData.type === key}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      style={{ display: 'none' }}
                    />
                    {type.icon}
                    {type.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#d1d5db', display: 'block', marginBottom: '8px' }}>
                Текст шаблона:
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(75, 85, 99, 0.5)',
                  backgroundColor: '#374151',
                  color: '#f3f4f6',
                  resize: 'vertical'
                }}
                placeholder="Введите текст шаблона..."
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {editingTemplate ? 'Сохранить' : 'Создать'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingTemplate(null);
                  setFormData({
                    title: '',
                    content: '',
                    type: 'info',
                    department: state.user?.department || ''
                  });
                }}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        )}

        {/* Список шаблонов */}
        <div>
          <h3 style={{ color: '#f3f4f6', marginBottom: '16px' }}>
            Существующие шаблоны ({templates.length})
          </h3>
          
          {loading ? (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
              Загрузка...
            </div>
          ) : templates.length === 0 ? (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
              Шаблонов пока нет
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {templates.map((template) => {
                const type = templateTypes[template.type] || templateTypes.info;
                return (
                  <div
                    key={template.id}
                    style={{
                      backgroundColor: type.bgColor,
                      border: `1px solid ${type.borderColor}`,
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                      }}>
                        <span style={{ color: type.color }}>
                          {type.icon}
                        </span>
                        <h4 style={{
                          margin: 0,
                          color: type.color,
                          fontSize: '1rem',
                          fontWeight: '600'
                        }}>
                          {template.title}
                        </h4>
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#9ca3af',
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {type.label}
                        </span>
                      </div>
                      <p style={{
                        margin: 0,
                        color: '#d1d5db',
                        fontSize: '0.9rem',
                        lineHeight: '1.4'
                      }}>
                        {template.content}
                      </p>
                      {state.user?.role === 'admin' && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '0.75rem',
                          color: '#9ca3af'
                        }}>
                          Департамент: {template.department}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button
                        onClick={() => handleEdit(template)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#fbbf24',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        title="Редактировать"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        title="Удалить"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplatesManagementModal;
