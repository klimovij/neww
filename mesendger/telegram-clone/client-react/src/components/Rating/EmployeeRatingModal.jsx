import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  FiX, 
  FiTrendingUp, 
  FiUsers, 
  FiAward, 
  FiStar, 
  FiSettings,
  FiDollarSign,
  FiCheckCircle,
  FiTruck,
  FiShoppingCart,
  FiShoppingBag,
  FiMonitor,
  FiFileText,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiMinus
} from 'react-icons/fi';
import { FaStar, FaMedal, FaTrophy, FaCrown, FaArrowUp, FaBolt } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 350px;
  right: 0;
  bottom: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100001;
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #232931 0%, #181c22 100%);
  border-radius: 20px;
  width: 90%;
  max-width: 1170px;
  height: 95vh;
  max-height: 900px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  color: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const ModalTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 1.6rem;
  color: #fff;
  font-weight: 700;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
`;

const TabsContainer = styled.div`
  display: flex;
  padding: 0 32px;
  background: rgba(44, 62, 80, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Tab = styled.button`
  background: none;
  border: none;
  color: ${props => props.active ? '#43e97b' : '#b2bec3'};
  padding: 16px 24px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  border-bottom: 2px solid ${props => props.active ? '#43e97b' : 'transparent'};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    color: #43e97b;
  }
`;

const ModalContent = styled.div`
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
  }
`;

const DepartmentSection = styled.div`
  margin-bottom: 32px;
`;

const DepartmentTitle = styled.h3`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #6dd5ed;
  font-size: 1.3rem;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(109, 213, 237, 0.3);
`;

const DepartmentTitleLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const VisibilityButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'isHidden',
})`
  background: ${props => props.isHidden ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)'};
  border: 1px solid ${props => props.isHidden ? '#e74c3c' : '#2ecc71'};
  color: ${props => props.isHidden ? '#e74c3c' : '#2ecc71'};
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.isHidden ? 'rgba(231, 76, 60, 0.3)' : 'rgba(46, 204, 113, 0.3)'};
  }
`;

const EmployeesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
`;

const EmployeeCard = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isTop',
})`
  background: linear-gradient(135deg, rgba(44, 62, 80, 0.8) 0%, rgba(52, 73, 94, 0.8) 100%);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  border: 2px solid ${props => props.isTop ? '#f39c12' : 'rgba(255, 255, 255, 0.1)'};
  box-shadow: ${props => props.isTop ? '0 6px 24px rgba(243, 156, 18, 0.3)' : '0 3px 12px rgba(0, 0, 0, 0.2)'};
  transition: all 0.3s ease;
  min-height: 220px;
  position: relative;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
`;

const TopBadge = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
  color: #fff;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const EmployeeAvatar = styled.div`
  width: 90px;
  height: 90px;
  border-radius: 12px;
  margin: 0 auto 16px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 700;
  color: #ffffff;
  border: 3px solid rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px;
  }
`;

const EmployeeName = styled.h4`
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  color: #fff;
  font-weight: 600;
`;

const EmployeeDepartment = styled.p`
  margin: 0 0 16px 0;
  font-size: 0.85rem;
  color: #b2bec3;
`;

const StarsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 12px;
`;

const StarButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['filled', 'canEdit'].includes(prop),
})`
  background: none;
  border: none;
  color: ${props => props.filled ? '#f39c12' : '#636e72'};
  cursor: ${props => props.canEdit ? 'pointer' : 'default'};
  font-size: 1.2rem;
  transition: all 0.2s;
  
  &:hover {
    color: ${props => props.canEdit ? '#f39c12' : props.filled ? '#f39c12' : '#636e72'};
    transform: ${props => props.canEdit ? 'scale(1.2)' : 'none'};
  }
`;

const RatingInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #6dd5ed;
  font-weight: 600;
`;

const AchievementBadges = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
`;

const AchievementBadge = styled.div`
  background: ${props => {
    switch(props.type) {
      case 'gold': return 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
      case 'silver': return 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)';
      case 'bronze': return 'linear-gradient(135deg, #d35400 0%, #e74c3c 100%)';
      case 'purple': return 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)';
      case 'blue': return 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
      default: return 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
    }
  }};
  color: #fff;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #b2bec3;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6dd5ed;
  font-size: 1.1rem;
`;

// Функция для получения достижений на основе количества звезд
const getAchievements = (stars) => {
  const achievements = [];
  
  // Мотивирующие значки для каждого уровня
  if (stars === 1) {
    achievements.push({ type: 'bronze', icon: FiStar, text: 'Начало положено' });
  } else if (stars === 2) {
    achievements.push({ type: 'blue', icon: FaArrowUp, text: 'Целеустремленный' });
  } else if (stars === 3) {
    achievements.push({ type: 'purple', icon: FaBolt, text: 'Флеш' });
  } else if (stars === 4) {
    achievements.push({ type: 'silver', icon: FaCrown, text: 'Лидер' });
  } else if (stars === 5) {
    achievements.push({ type: 'gold', icon: FaTrophy, text: 'ТОП' });
  }
  
  return achievements;
};


// Функция для генерации градиента аватарки на основе ID
const getAvatarGradient = (id) => {
  const gradients = [
    '#667eea 0%, #764ba2 100%',
    '#f093fb 0%, #f5576c 100%',
    '#4facfe 0%, #00f2fe 100%',
    '#43e97b 0%, #38f9d7 100%',
    '#ffecd2 0%, #fcb69f 100%',
    '#a8edea 0%, #fed6e3 100%',
    '#ff9a9e 0%, #fecfef 100%',
    '#ffeaa7 0%, #fab1a0 100%'
  ];
  return gradients[id % gradients.length];
};

// Функция для определения отдела по должности
const getDepartmentByPosition = (position, departments) => {
  if (!position) return null;
  
  const positionLower = position.toLowerCase();
  
  // Сначала ищем точное совпадение должности в списке отделов
  for (const dept of departments) {
    if (dept.positions.includes(position)) {
      return dept.name;
    }
  }
  
  // Если точного совпадения нет, ищем по ключевым словам
  const departmentKeywords = {
    'IT-отдел': ['it', 'ит', 'системный', 'администратор', 'программист', 'разработчик', 'техник'],
    'HR-отдел': ['hr', 'эйчар', 'кадры', 'персонал', 'рекрутер'],
    'Колл-центр': ['колл', 'call', 'оператор', 'центр', 'звонки', 'телефон', 'консультант'],
    'Склад': ['склад', 'warehouse', 'кладовщик', 'завсклад', 'хранение'],
    'Отдел возвратов': ['возврат', 'return', 'обмен', 'рекламация', 'претензия'],
    'Финансовый отдел': ['финанс', 'бухгалтер', 'cfo', 'finance', 'accounting'],
    'Маркетинг': ['smm', 'маркетинг', 'контент', 'реклама', 'продвижение'],
    'Отдел продаж': ['продаж', 'sales', 'менеджер по продажам'],
    'Логистика': ['логистика', 'водитель', 'доставка', 'транспорт'],
    'Руководство': ['ceo', 'директор', 'владелец', 'руководитель', 'управляющий']
  };
  
  // Ищем совпадения по ключевым словам
  for (const [deptName, keywords] of Object.entries(departmentKeywords)) {
    for (const keyword of keywords) {
      if (positionLower.includes(keyword)) {
        return deptName;
      }
    }
  }
  
  return null; // Если не найдено совпадений
};

export default function EmployeeRatingModal({ isOpen, onClose }) {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('rating');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments] = useState([
    { 
      id: 'photo_sessions', 
      name: 'Фотосессии', 
      icon: FiUsers,
      positions: ['Организатор фотосессий']
    },
    { 
      id: 'call_center', 
      name: 'Колл-центр', 
      icon: FiUsers,
      positions: ['Супервайзер колл-центра', 'Оператор колл-центра']
    },
    { 
      id: 'returns', 
      name: 'Отдел возвратов', 
      icon: FiAward,
      positions: ['Менеджер отдела возвратов', 'Супервайзер отдела возвратов']
    },
    { 
      id: 'warehouse', 
      name: 'Склад', 
      icon: FiTrendingUp,
      positions: ['Менеджер склада', 'Завсклад (заведующий складом)']
    },
    { 
      id: 'sales', 
      name: 'Отдел продаж', 
      icon: FiTrendingUp,
      positions: ['Менеджер отдела продаж']
    },
    { 
      id: 'finance', 
      name: 'Финансовый отдел', 
      icon: FiDollarSign,
      positions: ['Финансовый менеджер', 'CFO (финансовый директор)', 'Бухгалтер по первичной документации']
    },
    { 
      id: 'quality', 
      name: 'Контроль качества', 
      icon: FiCheckCircle,
      positions: ['ОТК (отдел технического контроля)', 'Менеджер по качеству обслуживания клиентов']
    },
    { 
      id: 'marketing', 
      name: 'Маркетинг', 
      icon: FiTrendingUp,
      positions: ['SMM-менеджер', 'Помощник SMM-менеджера', 'Контент-менеджер', 'Менеджер отдела маркетинга']
    },
    { 
      id: 'logistics', 
      name: 'Логистика', 
      icon: FiTruck,
      positions: ['Водитель', 'Руководитель отдела логистики']
    },
    { 
      id: 'ecommerce', 
      name: 'Электронная коммерция', 
      icon: FiShoppingCart,
      positions: ['Менеджер по дропшиппингу', 'Менеджер маркетплейса']
    },
    { 
      id: 'procurement', 
      name: 'Закупки', 
      icon: FiShoppingBag,
      positions: ['Руководитель отдела закупок', 'Менеджер отдела закупок']
    },
    { 
      id: 'management', 
      name: 'Руководство', 
      icon: FiStar,
      positions: ['CEO (генеральный директор)', 'Владелец компании']
    },
    { 
      id: 'it', 
      name: 'IT-отдел', 
      icon: FiMonitor,
      positions: ['Системный администратор']
    },
    { 
      id: 'hr', 
      name: 'HR-отдел', 
      icon: FiUsers,
      positions: ['HR-менеджер (менеджер по персоналу)']
    },
    { 
      id: 'accounting', 
      name: 'Учет', 
      icon: FiFileText,
      positions: ['Оператор-учётчик']
    }
  ]);
  
  const [hiddenDepartments, setHiddenDepartments] = useState([]);

  const isHR = state.user?.role === 'admin' || state.user?.department === 'HR';

  // Загрузить настройки видимости отделов
  const fetchDepartmentVisibility = async () => {
    try {
      const response = await fetch('/api/departments/visibility', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        const hiddenIds = Object.keys(data.settings).filter(id => data.settings[id]);
        setHiddenDepartments(hiddenIds);
      }
    } catch (error) {
      console.error('Error fetching department visibility:', error);
    }
  };

  // Функция для переключения видимости отдела
  const toggleDepartmentVisibility = async (deptId) => {
    const isCurrentlyHidden = hiddenDepartments.includes(deptId);
    const newHiddenState = !isCurrentlyHidden;
    
    try {
      const response = await fetch('/api/departments/visibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          departmentId: deptId, 
          isHidden: newHiddenState 
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Обновляем локальное состояние только после успешного сохранения
        setHiddenDepartments(prev => {
          if (newHiddenState) {
            return [...prev, deptId];
          } else {
            return prev.filter(id => id !== deptId);
          }
        });
      } else {
        console.error('Failed to update department visibility:', data.error);
      }
    } catch (error) {
      console.error('Error updating department visibility:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetchDepartmentVisibility();
    }
  }, [isOpen]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/employees/rating', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEmployeeRating = async (employeeId, stars) => {
    if (!isHR) return;
    
    try {
      const response = await fetch('/api/employees/rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ employeeId, stars })
      });
      
      const data = await response.json();
      if (data.success) {
        // Обновляем локальное состояние
        setEmployees(prev => prev.map(emp => 
          emp.id === employeeId ? { ...emp, stars } : emp
        ));
      }
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  const renderStars = (currentStars, employeeId) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <StarButton
          key={i}
          filled={i <= (currentStars || 0)}
          canEdit={isHR}
          onClick={() => {
            if (!isHR) return;
            // Если кликнули на уже заполненную звездочку, обнуляем рейтинг
            const newRating = (currentStars === i) ? 0 : i;
            updateEmployeeRating(employeeId, newRating);
          }}
        >
          <FaStar />
        </StarButton>
      );
    }
    return stars;
  };

  const renderEmployeesByDepartment = () => {
    if (loading) {
      return <LoadingState>Загрузка рейтинга...</LoadingState>;
    }

    if (employees.length === 0) {
      return <EmptyState>Нет данных о сотрудниках</EmptyState>;
    }

    // Группируем сотрудников по отделам
    const employeesByDept = {};
    const otherEmployees = [];
    
    employees.forEach(emp => {
      const position = emp.department; // В базе хранится должность в поле department
      
      // Сначала проверяем точное совпадение названия отдела
      let standardDept = departments.find(d => d.name === position);
      
      // Если точного совпадения нет, ищем по должности
      if (!standardDept && position) {
        const matchedDeptName = getDepartmentByPosition(position, departments);
        if (matchedDeptName) {
          standardDept = departments.find(d => d.name === matchedDeptName);
        }
      }
      
      if (standardDept) {
        const targetDeptName = standardDept.name;
        if (!employeesByDept[targetDeptName]) {
          employeesByDept[targetDeptName] = [];
        }
        employeesByDept[targetDeptName].push(emp);
      } else {
        otherEmployees.push(emp);
      }
    });

    const sections = [];

    // Отображаем стандартные отделы
    departments.forEach(dept => {
      const deptEmployees = (employeesByDept[dept.name] || [])
        .sort((a, b) => (b.stars || 0) - (a.stars || 0));
      
      const isHidden = hiddenDepartments.includes(dept.id);
      
      // Скрытые отделы не показываем вообще (даже HR/админам)
      if (isHidden) return;
      
      // Определяем топ сотрудника в этом отделе
      const topEmployee = deptEmployees.length > 0 ? 
        deptEmployees.reduce((top, current) => 
          (current.stars || 0) > (top.stars || 0) ? current : top
        ) : null;
      
      sections.push(
        <DepartmentSection key={dept.id}>
          <DepartmentTitle>
            <DepartmentTitleLeft>
              <dept.icon />
              {dept.name}
            </DepartmentTitleLeft>
            {isHR && (
              <VisibilityButton 
                isHidden={isHidden}
                onClick={() => toggleDepartmentVisibility(dept.id)}
              >
                {isHidden ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                {isHidden ? 'Показать' : 'Скрыть'}
              </VisibilityButton>
            )}
          </DepartmentTitle>
          {deptEmployees.length === 0 ? (
            <EmptyState>В этом отделе пока нет сотрудников</EmptyState>
          ) : (
            <EmployeesGrid>
              {deptEmployees.map(employee => {
                const isTop = topEmployee && employee.id === topEmployee.id && (employee.stars || 0) === 5;
                const achievements = getAchievements(employee.stars || 0);
                
                return (
                  <EmployeeCard key={employee.id} isTop={isTop}>
                    {isTop && (
                      <TopBadge>
                        <FaTrophy size={12} />
                        ТОП
                      </TopBadge>
                    )}
                    
                    <EmployeeAvatar 
                      style={{
                        background: !employee.avatarUrl ? 
                          `linear-gradient(135deg, ${getAvatarGradient(employee.id)})` : 'transparent'
                      }}
                    >
                      {employee.avatarUrl ? (
                        <img src={employee.avatarUrl} alt={employee.username} />
                      ) : (
                        employee.username?.charAt(0)?.toUpperCase()
                      )}
                    </EmployeeAvatar>
                    
                    <EmployeeName>{employee.username}</EmployeeName>
                    
                    <StarsContainer>
                      {renderStars(employee.stars || 0, employee.id)}
                    </StarsContainer>

                    {achievements.length > 0 && (
                      <AchievementBadges>
                        {achievements.map((achievement, index) => (
                          <AchievementBadge key={index} type={achievement.type}>
                            <achievement.icon size={12} />
                            {achievement.text}
                          </AchievementBadge>
                        ))}
                      </AchievementBadges>
                    )}
                  </EmployeeCard>
                );
              })}
            </EmployeesGrid>
          )}
        </DepartmentSection>
      );
    });

    // Добавляем панель управления скрытыми отделами для HR/админов
    if (isHR) {
      const hiddenDepts = departments.filter(dept => hiddenDepartments.includes(dept.id));
      if (hiddenDepts.length > 0) {
        sections.push(
          <DepartmentSection key="hidden-control">
            <DepartmentTitle>
              <DepartmentTitleLeft>
                <FiEyeOff />
                Скрытые отделы ({hiddenDepts.length})
              </DepartmentTitleLeft>
            </DepartmentTitle>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              padding: '16px',
              background: 'rgba(231, 76, 60, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(231, 76, 60, 0.3)'
            }}>
              {hiddenDepts.map(dept => {
                const deptEmployees = (employeesByDept[dept.name] || []);
                return (
                  <div key={dept.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <dept.icon size={16} />
                      <span style={{ fontSize: '0.9rem' }}>{dept.name}</span>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        color: '#94a3b8',
                        marginLeft: '4px'
                      }}>
                        ({deptEmployees.length})
                      </span>
                    </div>
                    <VisibilityButton 
                      isHidden={true}
                      onClick={() => toggleDepartmentVisibility(dept.id)}
                    >
                      <FiEye size={12} />
                      Показать
                    </VisibilityButton>
                  </div>
                );
              })}
            </div>
          </DepartmentSection>
        );
      }
    }

    // Добавляем секцию для остальных сотрудников
    if (otherEmployees.length > 0) {
      const sortedOthers = otherEmployees.sort((a, b) => (b.stars || 0) - (a.stars || 0));
      
      sections.push(
        <DepartmentSection key="others">
          <DepartmentTitle>
            <FiUsers />
            Другие сотрудники
          </DepartmentTitle>
          <EmployeesGrid>
            {sortedOthers.map(employee => {
              const achievements = getAchievements(employee.stars || 0);
              
              return (
                <EmployeeCard key={employee.id}>
                  <EmployeeAvatar 
                    style={{
                      background: !employee.avatarUrl ? 
                        `linear-gradient(135deg, ${getAvatarGradient(employee.id)})` : 'transparent'
                    }}
                  >
                    {employee.avatarUrl ? (
                      <img src={employee.avatarUrl} alt={employee.username} />
                    ) : (
                      employee.username?.charAt(0)?.toUpperCase()
                    )}
                  </EmployeeAvatar>
                  
                  <EmployeeName>{employee.username}</EmployeeName>
                  <EmployeeDepartment>{employee.department || 'Не указан'}</EmployeeDepartment>
                  
                  <StarsContainer>
                    {renderStars(employee.stars, employee.id)}
                  </StarsContainer>
                  
                  <RatingInfo>
                    <FiStar />
                    {employee.stars || 0} звезд
                  </RatingInfo>
                  
                  {achievements.length > 0 && (
                    <AchievementBadges>
                      {achievements.map((achievement, index) => (
                        <AchievementBadge key={index} type={achievement.type}>
                          <achievement.icon size={12} />
                          {achievement.text}
                        </AchievementBadge>
                      ))}
                    </AchievementBadges>
                  )}
                </EmployeeCard>
              );
            })}
          </EmployeesGrid>
        </DepartmentSection>
      );
    }

    return sections;
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <FiTrendingUp />
            Рейтинг успеваемости
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <FiX size={24} />
          </CloseButton>
        </ModalHeader>

        <TabsContainer>
          <Tab 
            active={activeTab === 'rating'} 
            onClick={() => setActiveTab('rating')}
          >
            <FiTrendingUp />
            Рейтинг сотрудников
          </Tab>
          {isHR && (
            <Tab 
              active={activeTab === 'management'} 
              onClick={() => setActiveTab('management')}
            >
              <FiStar />
              Управление рейтингом
            </Tab>
          )}
        </TabsContainer>

        <ModalContent>
          {activeTab === 'rating' && renderEmployeesByDepartment()}
          {activeTab === 'management' && isHR && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#b2bec3' }}>
              <FiStar size={48} style={{ marginBottom: '16px' }} />
              <h3>Управление рейтингом</h3>
              <p>Кликайте на звезды сотрудников для изменения их рейтинга</p>
            </div>
          )}
        </ModalContent>
      </ModalContainer>
    </ModalOverlay>
  );
}
