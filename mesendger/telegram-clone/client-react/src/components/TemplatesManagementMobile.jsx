import React, { useRef, useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiPlus, FiEdit2, FiTrash2, FiAlertTriangle, FiInfo, FiZap } from 'react-icons/fi';
import { useApp } from '../context/AppContext';

export default function TemplatesManagementMobile({ open, onClose, onOpenMobileSidebar }) {
  const { state } = useApp();
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    department: state.user?.department || ''
  });

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

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = state.user?.role === 'admin' ? '/api/templates' : '/api/templates/for-me';
      
      const response = await fetch(`http://localhost:5000${endpoint}`, {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Заполните все поля');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingTemplate 
        ? `http://localhost:5000/api/templates/${editingTemplate.id}`
        : 'http://localhost:5000/api/templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
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

  const handleDelete = async (templateId) => {
    if (!window.confirm('Удалить этот шаблон?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/templates/${templateId}`, {
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
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      if (showCreateForm) {
        setShowCreateForm(false);
        setEditingTemplate(null);
        setFormData({
          title: '',
          content: '',
          type: 'info',
          department: state.user?.department || ''
        });
      } else {
        if (onOpenMobileSidebar) {
          onOpenMobileSidebar();
        }
        onClose();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }, [onClose, onOpenMobileSidebar, showCreateForm, state.user?.department]);

  const handleClose = useCallback(() => {
    if (showCreateForm) {
      setShowCreateForm(false);
      setEditingTemplate(null);
      setFormData({
        title: '',
        content: '',
        type: 'info',
        department: state.user?.department || ''
      });
    } else {
      if (onOpenMobileSidebar) {
        onOpenMobileSidebar();
      }
      onClose();
    }
  }, [onClose, onOpenMobileSidebar, showCreateForm, state.user?.department]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 10001,
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
              zIndex: 10002,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            <button
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#232931',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
              }}
            >
              <FaArrowLeft />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#232931', fontWeight: 600, fontSize: '18px' }}>
              <FiInfo />
              <span>{showCreateForm ? (editingTemplate ? 'Редактировать шаблон' : 'Создать шаблон') : 'Управление шаблонами'}</span>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#232931',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
              }}
            >
              <FiX />
            </button>
          </div>

          {/* Swipe hint */}
          {!showCreateForm && (
            <div
              style={{
                position: 'fixed',
                top: '60px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(163, 230, 53, 0.2)',
                color: '#a3e635',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                zIndex: 10002,
                pointerEvents: 'none',
              }}
            >
              ← Свайп для возврата
            </div>
          )}

          {/* Content */}
          <div style={{ padding: '20px 16px', maxWidth: '100%' }}>
            {/* Department Info */}
            <div
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '20px',
                color: '#93c5fd',
                fontSize: '14px',
              }}
            >
              <strong>Департамент:</strong> {state.user?.department || 'Не указан'}
              {state.user?.role === 'admin' && (
                <span style={{ marginLeft: '12px', color: '#fbbf24', fontSize: '12px' }}>
                  (Администратор - видны все шаблоны)
                </span>
              )}
            </div>

            {/* Create Buttons */}
            {!showCreateForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <button
                  onClick={() => setShowCreateForm(true)}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    fontSize: '15px',
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
                      department: ''
                    });
                    setShowCreateForm(true);
                  }}
                  style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    fontSize: '15px',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                  }}
                >
                  🚨 Создать SOS шаблон
                </button>
              </div>
            )}

            {/* Create/Edit Form */}
            {showCreateForm && (
              <form
                onSubmit={handleSubmit}
                style={{
                  backgroundColor: '#2a2f38',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  border: '1px solid #444',
                }}
              >
                {formData.type === 'sos' && (
                  <div
                    style={{
                      backgroundColor: 'rgba(220, 38, 38, 0.15)',
                      border: '1px solid rgba(220, 38, 38, 0.4)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '16px',
                      color: '#fca5a5',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span>🚨</span>
                      <strong>SOS Экстренный шаблон</strong>
                    </div>
                    <div style={{ fontSize: '13px' }}>
                      Этот шаблон будет отправляться как экстренное сообщение с красно-оранжевым фоном и специальной иконкой.
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                    Название шаблона:
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #444',
                      backgroundColor: '#1a1d24',
                      color: '#e0e0e0',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Например: Приветствие клиента"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                    Тип шаблона:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(templateTypes)
                      .filter(([key]) => key !== 'sos' || state.user?.role === 'admin' || state.user?.role === 'hr')
                      .map(([key, type]) => (
                        <label
                          key={key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            padding: '12px',
                            borderRadius: '8px',
                            backgroundColor: formData.type === key ? type.bgColor : '#1a1d24',
                            border: `1px solid ${formData.type === key ? type.borderColor : '#444'}`,
                            color: formData.type === key ? type.color : '#e0e0e0',
                          }}
                        >
                          <input
                            type="radio"
                            name="type"
                            value={key}
                            checked={formData.type === key}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            style={{ display: 'none' }}
                          />
                          <span style={{ fontSize: '18px' }}>{type.icon}</span>
                          <span style={{ fontSize: '14px', fontWeight: 500 }}>{type.label}</span>
                        </label>
                      ))}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                    Текст шаблона:
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #444',
                      backgroundColor: '#1a1d24',
                      color: '#e0e0e0',
                      resize: 'vertical',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Введите текст шаблона..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '15px',
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
                      borderRadius: '8px',
                      padding: '12px',
                      cursor: 'pointer',
                      fontSize: '15px',
                    }}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}

            {/* Templates List */}
            {!showCreateForm && (
              <div>
                <h3 style={{ color: '#e0e0e0', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                  Существующие шаблоны ({templates.length})
                </h3>
                
                {loading ? (
                  <div style={{ color: '#999', textAlign: 'center', padding: '40px', fontSize: '14px' }}>
                    Загрузка...
                  </div>
                ) : templates.length === 0 ? (
                  <div style={{ color: '#999', textAlign: 'center', padding: '40px', fontSize: '14px' }}>
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
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '8px',
                                flexWrap: 'wrap',
                              }}>
                                <span style={{ color: type.color, fontSize: '18px' }}>
                                  {type.icon}
                                </span>
                                <h4 style={{
                                  margin: 0,
                                  color: type.color,
                                  fontSize: '16px',
                                  fontWeight: 600,
                                }}>
                                  {template.title}
                                </h4>
                                <span style={{
                                  fontSize: '12px',
                                  color: '#999',
                                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                }}>
                                  {type.label}
                                </span>
                              </div>
                              <p style={{
                                margin: 0,
                                color: '#d1d5db',
                                fontSize: '14px',
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}>
                                {template.content}
                              </p>
                              {state.user?.role === 'admin' && template.department && (
                                <div style={{
                                  marginTop: '8px',
                                  fontSize: '12px',
                                  color: '#999',
                                }}>
                                  Департамент: {template.department}
                                </div>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                              <button
                                onClick={() => handleEdit(template)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#fbbf24',
                                  cursor: 'pointer',
                                  padding: '8px',
                                  fontSize: '18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Редактировать"
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                onClick={() => handleDelete(template.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '8px',
                                  fontSize: '18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Удалить"
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

