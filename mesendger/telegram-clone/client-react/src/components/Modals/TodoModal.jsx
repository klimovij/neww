import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiPlus, FiX, FiCheck, FiTrash2, FiEdit3, FiSave } from 'react-icons/fi';
import { FaTasks } from 'react-icons/fa';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: calc(380px + max((100vw - 380px - 1200px)/2, 0px));
  width: 1170px;
  min-width: 700px;
  max-width: 1170px;
  height: 96vh;
  margin: 16px 0;
  z-index: 200001;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  pointer-events: auto;
  
  @media (max-width: 1360px) {
    left: 380px;
    width: calc(100vw - 420px);
    max-width: none;
  }
  
  @media (max-width: 980px) {
    left: 0;
    right: 0;
    width: 100vw;
    min-width: 0;
    height: 100vh;
    margin: 0;
    padding: 12px;
    align-items: flex-start;
    justify-content: center;
  }
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #232931 0%, #181c22 100%);
  border-radius: 32px;
  width: 100%;
  min-width: 700px;
  max-width: 1200px;
  height: 100%;
  box-sizing: border-box;
  box-shadow: 0 12px 48px 0 rgba(109, 213, 237, 0.12), 0 2px 10px 0 rgba(155, 89, 182, 0.06);
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid #2c3e50;
  background: linear-gradient(135deg, #2c3e50 0%, #232931 100%);
`;

const ModalTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 800;
  font-size: 1.4rem;
  color: #6dd5ed;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 1.6rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  &:hover {
    background: rgba(231, 76, 60, 0.2);
    color: #e74c3c;
  }
`;

const ModalBody = styled.div`
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const AddTodoSection = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const TodoInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #2c3e50;
  border-radius: 12px;
  background: rgba(44, 62, 80, 0.3);
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
  
  &:focus {
    border-color: #6dd5ed;
    background: rgba(44, 62, 80, 0.5);
  }
  
  &::placeholder {
    color: #b2bec3;
  }
`;

const PrioritySelect = styled.select`
  padding: 12px 16px;
  border: 2px solid #2c3e50;
  border-radius: 12px;
  background: rgba(44, 62, 80, 0.3);
  color: #fff;
  font-size: 1rem;
  outline: none;
  cursor: pointer;
  
  &:focus {
    border-color: #6dd5ed;
  }
  
  option {
    background: #232931;
    color: #fff;
  }
`;

const AddButton = styled.button`
  padding: 12px 16px;
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  
  &:hover {
    background: linear-gradient(135deg, #38f9d7 0%, #43e97b 100%);
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const TodoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TodoItem = styled.div.withConfig({
  shouldForwardProp: (prop) => !['completed', 'priority'].includes(prop)
})`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: ${props => props.completed ? 'rgba(67, 233, 123, 0.1)' : 'rgba(44, 62, 80, 0.3)'};
  border: 2px solid ${props => props.completed ? 'rgba(67, 233, 123, 0.3)' : 'rgba(44, 62, 80, 0.5)'};
  border-radius: 16px;
  transition: all 0.3s ease;
  opacity: ${props => props.completed ? 0.7 : 1};

  &:hover {
    background: ${props => props.completed ? 'rgba(67, 233, 123, 0.15)' : 'rgba(44, 62, 80, 0.4)'};
    border-color: ${props => props.completed ? 'rgba(67, 233, 123, 0.4)' : 'rgba(108, 117, 125, 0.6)'};
  }

  ${props => props.priority === 'high' && `
    border-left: 4px solid #e74c3c;
  `}
  ${props => props.priority === 'medium' && `
    border-left: 4px solid #f39c12;
  `}
  ${props => props.priority === 'low' && `
    border-left: 4px solid #27ae60;
  `}
`;

const TodoCheckbox = styled.button`
  width: 24px;
  height: 24px;
  border: 2px solid ${props => props.checked ? '#43e97b' : '#6c757d'};
  border-radius: 6px;
  background: ${props => props.checked ? '#43e97b' : 'transparent'};
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    border-color: #43e97b;
    background: ${props => props.checked ? '#43e97b' : 'rgba(67, 233, 123, 0.1)'};
  }
`;

const TodoText = styled.div`
  flex: 1;
  font-size: 1rem;
  line-height: 1.4;
`;

const TodoEditInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #6dd5ed;
  border-radius: 8px;
  background: rgba(44, 62, 80, 0.5);
  color: #fff;
  font-size: 1rem;
  outline: none;
`;

const PriorityBadge = styled.span`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => 
    props.priority === 'high' ? '#e74c3c' :
    props.priority === 'medium' ? '#f39c12' : '#27ae60'
  };
  color: #fff;
`;

const ActionButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['danger'].includes(prop)
})`
  padding: 8px;
  background: transparent;
  border: none;
  color: #b2bec3;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: ${props => props.danger ? '#e74c3c' : '#6dd5ed'};
  }
`;

const StatsSection = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(44, 62, 80, 0.2);
  border-radius: 12px;
`;

const StatItem = styled.div`
  text-align: center;
  flex: 1;
`;

const StatNumber = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.color || '#6dd5ed'};
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: #b2bec3;
  margin-top: 4px;
`;

const FilterSection = styled.div`
  display: flex;
  gap: 8px;
`;

const FilterButton = styled.button`
  padding: 8px 16px;
  border: 2px solid ${props => props.active ? '#6dd5ed' : '#2c3e50'};
  border-radius: 8px;
  background: ${props => props.active ? 'rgba(109, 213, 237, 0.2)' : 'transparent'};
  color: ${props => props.active ? '#6dd5ed' : '#b2bec3'};
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
  
  &:hover {
    border-color: #6dd5ed;
    color: #6dd5ed;
  }
`;

export default function TodoModal({ open, onClose }) {
  const [todos, setTodos] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [viewTodoId, setViewTodoId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, completed
  const [isInitialized, setIsInitialized] = useState(false);

  // Загрузка из localStorage при монтировании компонента
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

  // Сохранение в localStorage при изменении todos (только после инициализации)
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

  if (!open) return null;

  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>
            <FaTasks />
            Список дел
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </ModalHeader>
        
        <ModalBody>
          <LeftColumn>
            <StatsSection>
              <StatItem>
                <StatNumber color="#6dd5ed">{stats.total}</StatNumber>
                <StatLabel>Всего</StatLabel>
              </StatItem>
              <StatItem>
                <StatNumber color="#43e97b">{stats.completed}</StatNumber>
                <StatLabel>Выполнено</StatLabel>
              </StatItem>
              <StatItem>
                <StatNumber color="#f39c12">{stats.active}</StatNumber>
                <StatLabel>Активных</StatLabel>
              </StatItem>
              <StatItem>
                <StatNumber color="#e74c3c">{stats.high}</StatNumber>
                <StatLabel>Важных</StatLabel>
              </StatItem>
            </StatsSection>

            <AddTodoSection style={{ flexDirection: 'column', gap: '12px' }}>
            <TodoInput
              type="text"
              placeholder="Название задания..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <TodoInput
              as="textarea"
              placeholder="Текст задания (опционально)..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'inherit', minHeight: '80px' }}
            />
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <PrioritySelect
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </PrioritySelect>
              <AddButton onClick={addTodo} disabled={!newTitle.trim()}>
                <FiPlus />
                Добавить
              </AddButton>
            </div>
          </AddTodoSection>
          </LeftColumn>

          <RightColumn>
            <FilterSection>
            <FilterButton 
              active={filter === 'all'} 
              onClick={() => setFilter('all')}
            >
              Все ({stats.total})
            </FilterButton>
            <FilterButton 
              active={filter === 'active'} 
              onClick={() => setFilter('active')}
            >
              Активные ({stats.active})
            </FilterButton>
            <FilterButton 
              active={filter === 'completed'} 
              onClick={() => setFilter('completed')}
            >
              Выполненные ({stats.completed})
            </FilterButton>
          </FilterSection>

          <TodoList>
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
              filteredTodos.map(todo => (
                <TodoItem 
                  key={todo.id} 
                  priority={todo.priority}
                  completed={todo.completed}
                >
                  <TodoCheckbox
                    checked={todo.completed}
                    onClick={() => toggleTodo(todo.id)}
                  >
                    {todo.completed && <FiCheck />}
                  </TodoCheckbox>
                  
                  {editingId === todo.id ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <TodoEditInput
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Название..."
                        autoFocus
                      />
                      <TodoEditInput
                        as="textarea"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        placeholder="Текст..."
                        rows={3}
                        style={{ resize: 'vertical', fontFamily: 'inherit', minHeight: '60px' }}
                      />
                    </div>
                  ) : (
                    <TodoText style={{ fontWeight: 600 }}>{todo.title || todo.text || 'Без названия'}</TodoText>
                  )}
                  
                  <PriorityBadge priority={todo.priority}>
                    {todo.priority === 'high' ? 'Высокий' :
                     todo.priority === 'medium' ? 'Средний' : 'Низкий'}
                  </PriorityBadge>
                  
                  {editingId === todo.id ? (
                    <>
                      <ActionButton onClick={saveEdit}>
                        <FiSave />
                      </ActionButton>
                      <ActionButton onClick={cancelEdit}>
                        <FiX />
                      </ActionButton>
                    </>
                  ) : (
                    <>
                      {(todo.text || todo.title) && (
                        <ActionButton 
                          onClick={() => setViewTodoId(todo.id)}
                          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', padding: '8px 12px' }}
                        >
                          Открыть
                        </ActionButton>
                      )}
                      <ActionButton onClick={() => startEdit(todo)}>
                        <FiEdit3 />
                      </ActionButton>
                      <ActionButton danger onClick={() => deleteTodo(todo.id)}>
                        <FiTrash2 />
                      </ActionButton>
                    </>
                  )}
                </TodoItem>
              ))
            )}
          </TodoList>
          </RightColumn>
        </ModalBody>
      </ModalContainer>
      
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
              zIndex: 200002,
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
                <CloseButton onClick={() => setViewTodoId(null)}>
                  <FiX />
                </CloseButton>
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
    </ModalOverlay>
  );
}
