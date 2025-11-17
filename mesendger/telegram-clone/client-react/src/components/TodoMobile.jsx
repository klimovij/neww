import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiPlus, FiCheck, FiTrash2, FiEdit3, FiSave } from 'react-icons/fi';
import { FaTasks } from 'react-icons/fa';

export default function TodoMobile({ open, onClose, onOpenMobileSidebar }) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);

  // Логика из TodoModal
  const [todos, setTodos] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [viewTodoId, setViewTodoId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [isInitialized, setIsInitialized] = useState(false);

  // Загрузка из localStorage
  useEffect(() => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      try {
        const parsedTodos = JSON.parse(savedTodos);
        setTodos(parsedTodos);
      } catch (e) {
        console.error('Error parsing todos from localStorage:', e);
        setTodos([]);
      }
    }
    setIsInitialized(true);
  }, []);

  // Сохранение в localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('todos', JSON.stringify(todos));
    }
  }, [todos, isInitialized]);

  const addTodo = () => {
    if (!newTitle.trim()) return;
    
    const todo = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      text: newText.trim() || '',
      completed: false,
      priority: newPriority,
      createdAt: new Date().toISOString()
    };
    
    setTodos(prev => [todo, ...prev]);
    setNewTitle('');
    setNewText('');
  };

  const toggleTodo = (id) => {
    setTodos(prev => prev.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title || '');
    setEditText(todo.text || '');
  };

  const saveEdit = () => {
    if (!editTitle.trim()) return;
    
    setTodos(prev => prev.map(todo => 
      todo.id === editingId ? { ...todo, title: editTitle.trim(), text: editText.trim() } : todo
    ));
    setEditingId(null);
    setEditTitle('');
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditText('');
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    } else if (e.key === 'Escape' && action === cancelEdit) {
      cancelEdit();
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    active: todos.filter(t => !t.completed).length,
    high: todos.filter(t => t.priority === 'high' && !t.completed).length
  };

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

  if (!open) return null;

  return ReactDOM.createPortal(
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
          paddingTop: '60px',
          paddingBottom: '20px',
          paddingLeft: '16px',
          paddingRight: '16px',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header с кнопками возврата */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '56px',
            backgroundColor: 'rgba(35, 41, 49, 0.95)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 10001,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            title="Назад"
          >
            <FaArrowLeft />
          </button>
          
          <h2
            style={{
              color: '#fff',
              fontSize: '18px',
              fontWeight: 700,
              margin: 0,
              flex: 1,
              textAlign: 'center',
            }}
          >
            Список дел
          </h2>

          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            title="Закрыть"
          >
            <FiX />
          </button>
        </div>

        {/* Контент */}
        <div
          style={{
            flex: 1,
            width: '100%',
            maxWidth: '100%',
            marginTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Статистика */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '16px',
              background: 'rgba(44, 62, 80, 0.2)',
              borderRadius: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ textAlign: 'center', flex: 1, minWidth: '60px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6dd5ed' }}>{stats.total}</div>
              <div style={{ fontSize: '0.9rem', color: '#b2bec3', marginTop: '4px' }}>Всего</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1, minWidth: '60px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#43e97b' }}>{stats.completed}</div>
              <div style={{ fontSize: '0.9rem', color: '#b2bec3', marginTop: '4px' }}>Выполнено</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1, minWidth: '60px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f39c12' }}>{stats.active}</div>
              <div style={{ fontSize: '0.9rem', color: '#b2bec3', marginTop: '4px' }}>Активных</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1, minWidth: '60px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e74c3c' }}>{stats.high}</div>
              <div style={{ fontSize: '0.9rem', color: '#b2bec3', marginTop: '4px' }}>Важных</div>
            </div>
          </div>

          {/* Добавление задачи */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <input
              type="text"
              placeholder="Название задания..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '2px solid #2c3e50',
                borderRadius: '12px',
                background: 'rgba(44, 62, 80, 0.3)',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
            <textarea
              placeholder="Текст задания (опционально)..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={3}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '2px solid #2c3e50',
                borderRadius: '12px',
                background: 'rgba(44, 62, 80, 0.3)',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '2px solid #2c3e50',
                  borderRadius: '12px',
                  background: 'rgba(44, 62, 80, 0.3)',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
              <button
                onClick={addTodo}
                disabled={!newTitle.trim()}
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: !newTitle.trim() ? 0.5 : 1,
                }}
              >
                <FiPlus />
                Добавить
              </button>
            </div>
          </div>

          {/* Фильтры */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '8px 16px',
                border: `2px solid ${filter === 'all' ? '#6dd5ed' : '#2c3e50'}`,
                borderRadius: '8px',
                background: filter === 'all' ? 'rgba(109, 213, 237, 0.2)' : 'transparent',
                color: filter === 'all' ? '#6dd5ed' : '#b2bec3',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              Все ({stats.total})
            </button>
            <button
              onClick={() => setFilter('active')}
              style={{
                padding: '8px 16px',
                border: `2px solid ${filter === 'active' ? '#6dd5ed' : '#2c3e50'}`,
                borderRadius: '8px',
                background: filter === 'active' ? 'rgba(109, 213, 237, 0.2)' : 'transparent',
                color: filter === 'active' ? '#6dd5ed' : '#b2bec3',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              Активные ({stats.active})
            </button>
            <button
              onClick={() => setFilter('completed')}
              style={{
                padding: '8px 16px',
                border: `2px solid ${filter === 'completed' ? '#6dd5ed' : '#2c3e50'}`,
                borderRadius: '8px',
                background: filter === 'completed' ? 'rgba(109, 213, 237, 0.2)' : 'transparent',
                color: filter === 'completed' ? '#6dd5ed' : '#b2bec3',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              Выполненные ({stats.completed})
            </button>
          </div>

          {/* Список задач */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredTodos.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                color: '#b2bec3',
                fontSize: '1.1rem'
              }}>
                {filter === 'all' ? 'Пока нет задач' : 
                 filter === 'active' ? 'Нет активных задач' : 
                 'Нет выполненных задач'}
              </div>
            ) : (
              filteredTodos.map(todo => {
                const priorityColor = todo.priority === 'high' ? '#e74c3c' : todo.priority === 'medium' ? '#f39c12' : '#27ae60';
                return (
                  <div
                    key={todo.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      background: todo.completed ? 'rgba(67, 233, 123, 0.1)' : 'rgba(44, 62, 80, 0.3)',
                      border: `2px solid ${todo.completed ? 'rgba(67, 233, 123, 0.3)' : 'rgba(44, 62, 80, 0.5)'}`,
                      borderLeft: `4px solid ${priorityColor}`,
                      borderRadius: '16px',
                      opacity: todo.completed ? 0.7 : 1,
                    }}
                  >
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      style={{
                        width: '24px',
                        height: '24px',
                        border: `2px solid ${todo.completed ? '#43e97b' : '#6c757d'}`,
                        borderRadius: '6px',
                        background: todo.completed ? '#43e97b' : 'transparent',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {todo.completed && <FiCheck />}
                    </button>
                    
                    {editingId === todo.id ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Название..."
                          style={{
                            padding: '8px 12px',
                            border: '2px solid #6dd5ed',
                            borderRadius: '8px',
                            background: 'rgba(44, 62, 80, 0.5)',
                            color: '#fff',
                            fontSize: '1rem',
                            outline: 'none',
                          }}
                        />
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          placeholder="Текст..."
                          rows={3}
                          style={{
                            padding: '8px 12px',
                            border: '2px solid #6dd5ed',
                            borderRadius: '8px',
                            background: 'rgba(44, 62, 80, 0.5)',
                            color: '#fff',
                            fontSize: '1rem',
                            outline: 'none',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ flex: 1, fontSize: '1rem', lineHeight: 1.4, fontWeight: 600 }}>
                        {todo.title || todo.text || 'Без названия'}
                      </div>
                    )}
                    
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: priorityColor,
                        color: '#fff',
                      }}
                    >
                      {todo.priority === 'high' ? 'Высокий' :
                       todo.priority === 'medium' ? 'Средний' : 'Низкий'}
                    </span>
                    
                    {editingId === todo.id ? (
                      <>
                        <button
                          onClick={saveEdit}
                          style={{
                            padding: '8px',
                            background: 'transparent',
                            border: 'none',
                            color: '#6dd5ed',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FiSave />
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            padding: '8px',
                            background: 'transparent',
                            border: 'none',
                            color: '#b2bec3',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FiX />
                        </button>
                      </>
                    ) : (
                      <>
                        {(todo.text || todo.title) && (
                          <button
                            onClick={() => setViewTodoId(todo.id)}
                            style={{
                              padding: '8px 12px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            Открыть
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(todo)}
                          style={{
                            padding: '8px',
                            background: 'transparent',
                            border: 'none',
                            color: '#b2bec3',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FiEdit3 />
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          style={{
                            padding: '8px',
                            background: 'transparent',
                            border: 'none',
                            color: '#e74c3c',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FiTrash2 />
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Модалка просмотра задания */}
        {viewTodoId && (() => {
          const viewTodo = todos.find(t => t.id === viewTodoId);
          if (!viewTodo) return null;
          return (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                zIndex: 10003,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
              }}
              onClick={() => setViewTodoId(null)}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  maxWidth: '600px',
                  width: '100%',
                  maxHeight: '80vh',
                  overflowY: 'auto',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#6dd5ed', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                    {viewTodo.title || 'Без названия'}
                  </h3>
                  <button
                    onClick={() => setViewTodoId(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: '24px',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '8px',
                    }}
                  >
                    <FiX />
                  </button>
                </div>
                {viewTodo.text && (
                  <div style={{ color: '#fff', fontSize: '1rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {viewTodo.text}
                  </div>
                )}
                {!viewTodo.text && (
                  <div style={{ color: '#b2bec3', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    Текст задания отсутствует
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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
      </div>
    </div>,
    document.body
  );
}
