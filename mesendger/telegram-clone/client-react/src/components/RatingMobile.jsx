import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
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
} from 'react-icons/fi';
import { FaStar, FaMedal, FaTrophy, FaCrown, FaArrowUp, FaBolt } from 'react-icons/fa';
import { useApp } from '../context/AppContext';

export default function RatingMobile({ open, onClose, onOpenMobileSidebar }) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  const { state } = useApp();
  
  const [activeTab, setActiveTab] = useState('rating');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hiddenDepartments, setHiddenDepartments] = useState([]);
  
  const departments = [
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
  ];

  const isHR = state.user?.role === 'admin' || state.user?.department === 'HR';

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
        setHiddenDepartments(prev => {
          if (newHiddenState) {
            return [...prev, deptId];
          } else {
            return prev.filter(id => id !== deptId);
          }
        });
      }
    } catch (error) {
      console.error('Error updating department visibility:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchEmployees();
      fetchDepartmentVisibility();
    }
  }, [open]);

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
        setEmployees(prev => prev.map(emp => 
          emp.id === employeeId ? { ...emp, stars } : emp
        ));
      }
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  // Функция для получения достижений
  const getAchievements = (stars) => {
    const achievements = [];
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

  // Функция для генерации градиента аватарки
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
    
    for (const dept of departments) {
      if (dept.positions.includes(position)) {
        return dept.name;
      }
    }
    
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
    
    for (const [deptName, keywords] of Object.entries(departmentKeywords)) {
      for (const keyword of keywords) {
        if (positionLower.includes(keyword)) {
          return deptName;
        }
      }
    }
    
    return null;
  };

  const renderStars = (currentStars, employeeId) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          onClick={() => {
            if (!isHR) return;
            const newRating = (currentStars === i) ? 0 : i;
            updateEmployeeRating(employeeId, newRating);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: i <= (currentStars || 0) ? '#f39c12' : '#636e72',
            cursor: isHR ? 'pointer' : 'default',
            fontSize: '18px',
            padding: '4px',
            transition: 'all 0.2s',
          }}
          disabled={!isHR}
        >
          <FaStar />
        </button>
      );
    }
    return stars;
  };

  const renderEmployeesByDepartment = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6dd5ed', fontSize: '16px' }}>
          Загрузка рейтинга...
        </div>
      );
    }

    if (employees.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#b2bec3', fontSize: '16px' }}>
          Нет данных о сотрудниках
        </div>
      );
    }

    // Группируем сотрудников по отделам
    const employeesByDept = {};
    const otherEmployees = [];
    
    employees.forEach(emp => {
      const position = emp.department;
      let standardDept = departments.find(d => d.name === position);
      
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
      
      if (isHidden) return;
      
      const topEmployee = deptEmployees.length > 0 ? 
        deptEmployees.reduce((top, current) => 
          (current.stars || 0) > (top.stars || 0) ? current : top
        ) : null;
      
      if (deptEmployees.length === 0) return;

      sections.push(
        <div key={dept.id} style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '2px solid rgba(109, 213, 237, 0.3)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#6dd5ed',
              fontSize: '18px',
              fontWeight: 700,
            }}>
              <dept.icon size={20} />
              <span>{dept.name}</span>
            </div>
            {isHR && (
              <button
                onClick={() => toggleDepartmentVisibility(dept.id)}
                style={{
                  background: isHidden ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)',
                  border: `1px solid ${isHidden ? '#e74c3c' : '#2ecc71'}`,
                  color: isHidden ? '#e74c3c' : '#2ecc71',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isHidden ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                {isHidden ? 'Показать' : 'Скрыть'}
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {deptEmployees.map(employee => {
              const isTop = topEmployee && employee.id === topEmployee.id && (employee.stars || 0) === 5;
              const achievements = getAchievements(employee.stars || 0);
              
              return (
                <div
                  key={employee.id}
                  style={{
                    background: isTop 
                      ? 'linear-gradient(135deg, rgba(243, 156, 18, 0.2) 0%, rgba(230, 126, 34, 0.2) 100%)'
                      : 'linear-gradient(135deg, rgba(44, 62, 80, 0.9) 0%, rgba(52, 73, 94, 0.9) 100%)',
                    borderRadius: '16px',
                    padding: '16px',
                    border: `2px solid ${isTop ? '#f39c12' : 'rgba(255, 255, 255, 0.1)'}`,
                    boxShadow: isTop ? '0 6px 24px rgba(243, 156, 18, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.2)',
                    position: 'relative',
                  }}
                >
                  {isTop && (
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      zIndex: 1,
                    }}>
                      <FaTrophy size={12} />
                      ТОП
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '12px',
                        background: !employee.avatarUrl ? 
                          `linear-gradient(135deg, ${getAvatarGradient(employee.id)})` : 'transparent',
                        backgroundImage: employee.avatarUrl ? `url(${employee.avatarUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '24px',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        flexShrink: 0,
                      }}
                    >
                      {!employee.avatarUrl && employee.username?.charAt(0)?.toUpperCase()}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 600,
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {employee.username}
                      </div>
                      {employee.department && (
                        <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                          {employee.department}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    marginBottom: '12px',
                  }}>
                    {renderStars(employee.stars || 0, employee.id)}
                  </div>

                  {achievements.length > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                    }}>
                      {achievements.map((achievement, index) => {
                        const bgColors = {
                          gold: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                          silver: 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)',
                          bronze: 'linear-gradient(135deg, #d35400 0%, #e74c3c 100%)',
                          purple: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                          blue: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                        };
                        return (
                          <div
                            key={index}
                            style={{
                              background: bgColors[achievement.type] || bgColors.blue,
                              color: '#fff',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <achievement.icon size={12} />
                            {achievement.text}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    });

    // Скрытые отделы для HR
    if (isHR) {
      const hiddenDepts = departments.filter(dept => hiddenDepartments.includes(dept.id));
      if (hiddenDepts.length > 0) {
        sections.push(
          <div key="hidden-control" style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#6dd5ed',
              fontSize: '18px',
              fontWeight: 700,
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '2px solid rgba(109, 213, 237, 0.3)',
            }}>
              <FiEyeOff size={20} />
              <span>Скрытые отделы ({hiddenDepts.length})</span>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px',
              background: 'rgba(231, 76, 60, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(231, 76, 60, 0.3)'
            }}>
              {hiddenDepts.map(dept => {
                const deptEmployees = (employeesByDept[dept.name] || []);
                return (
                  <div
                    key={dept.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <dept.icon size={16} />
                      <span style={{ fontSize: '14px', color: '#fff' }}>{dept.name}</span>
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#94a3b8',
                        marginLeft: '4px'
                      }}>
                        ({deptEmployees.length})
                      </span>
                    </div>
                    <button
                      onClick={() => toggleDepartmentVisibility(dept.id)}
                      style={{
                        background: 'rgba(46, 204, 113, 0.2)',
                        border: '1px solid #2ecc71',
                        color: '#2ecc71',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <FiEye size={12} />
                      Показать
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
    }

    // Остальные сотрудники
    if (otherEmployees.length > 0) {
      const sortedOthers = otherEmployees.sort((a, b) => (b.stars || 0) - (a.stars || 0));
      
      sections.push(
        <div key="others" style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#6dd5ed',
            fontSize: '18px',
            fontWeight: 700,
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '2px solid rgba(109, 213, 237, 0.3)',
          }}>
            <FiUsers size={20} />
            <span>Другие сотрудники</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedOthers.map(employee => {
              const achievements = getAchievements(employee.stars || 0);
              
              return (
                <div
                  key={employee.id}
                  style={{
                    background: 'linear-gradient(135deg, rgba(44, 62, 80, 0.9) 0%, rgba(52, 73, 94, 0.9) 100%)',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '12px',
                        background: !employee.avatarUrl ? 
                          `linear-gradient(135deg, ${getAvatarGradient(employee.id)})` : 'transparent',
                        backgroundImage: employee.avatarUrl ? `url(${employee.avatarUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '24px',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        flexShrink: 0,
                      }}
                    >
                      {!employee.avatarUrl && employee.username?.charAt(0)?.toUpperCase()}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 600,
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {employee.username}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                        {employee.department || 'Не указан'}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    marginBottom: '12px',
                  }}>
                    {renderStars(employee.stars || 0, employee.id)}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    color: '#6dd5ed',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '8px',
                  }}>
                    <FiStar size={16} />
                    <span>{employee.stars || 0} звезд</span>
                  </div>
                  
                  {achievements.length > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                    }}>
                      {achievements.map((achievement, index) => {
                        const bgColors = {
                          gold: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                          silver: 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)',
                          bronze: 'linear-gradient(135deg, #d35400 0%, #e74c3c 100%)',
                          purple: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                          blue: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                        };
                        return (
                          <div
                            key={index}
                            style={{
                              background: bgColors[achievement.type] || bgColors.blue,
                              color: '#fff',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <achievement.icon size={12} />
                            {achievement.text}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return sections;
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
          paddingTop: '56px',
          paddingBottom: '80px',
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
              fontSize: '18px',
              fontWeight: 700,
              margin: 0,
              flex: 1,
              textAlign: 'center',
            }}
          >
            Рейтинг успеваемости
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

        {/* Tabs */}
        <div
          style={{
            position: 'sticky',
            top: '56px',
            background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
            padding: '12px 16px',
            zIndex: 10000,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setActiveTab('rating')}
            style={{
              flex: 1,
              background: activeTab === 'rating' 
                ? 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)' 
                : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: activeTab === 'rating' ? '0 2px 8px rgba(67, 233, 123, 0.3)' : 'none',
            }}
          >
            <FiTrendingUp size={16} />
            Рейтинг
          </button>
          {isHR && (
            <button
              onClick={() => setActiveTab('management')}
              style={{
                flex: 1,
                background: activeTab === 'management' 
                  ? 'linear-gradient(135deg, #2193b0 0%, #43e97b 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: activeTab === 'management' ? '0 2px 8px rgba(67, 233, 123, 0.3)' : 'none',
              }}
            >
              <FiStar size={16} />
              Управление
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '16px', paddingTop: '8px' }}>
          {activeTab === 'rating' && renderEmployeesByDepartment()}
          {activeTab === 'management' && isHR && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#b2bec3',
            }}>
              <FiStar size={48} style={{ marginBottom: '16px', color: '#43e97b' }} />
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                Управление рейтингом
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6 }}>
                Кликайте на звезды сотрудников для изменения их рейтинга
              </p>
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
      </div>
    </div>,
    document.body
  );
}

