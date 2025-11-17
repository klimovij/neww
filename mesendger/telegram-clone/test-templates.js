// Скрипт для создания тестовых шаблонов
// Запустите этот скрипт в консоли браузера после авторизации

const testTemplates = [
  // Шаблоны для менеджера склада
  {
    department: 'менеджер склада',
    title: 'Товар поступил на склад',
    content: 'Уважаемые коллеги! Товар поступил на склад и готов к отгрузке. Просьба обновить остатки в системе.',
    type: 'info'
  },
  {
    department: 'менеджер склада',
    title: 'СРОЧНО: Нехватка места на складе',
    content: 'ВНИМАНИЕ! На складе критически не хватает места. Необходимо срочно организовать отгрузку готовой продукции!',
    type: 'urgent'
  },
  {
    department: 'менеджер склада',
    title: 'Важно: Инвентаризация склада',
    content: 'Напоминаю о плановой инвентаризации склада. Просьба подготовить все необходимые документы до конца недели.',
    type: 'important'
  },

  // Шаблоны для менеджера колл-центра
  {
    department: 'менеджер колл центра',
    title: 'Приветствие клиента',
    content: 'Добро пожаловать! Меня зовут [ИМЯ], я менеджер компании. Чем могу помочь?',
    type: 'info'
  },
  {
    department: 'менеджер колл центра',
    title: 'СРОЧНО: Системы недоступны',
    content: 'ВНИМАНИЕ! Системы временно недоступны. Принимаем заявки в ручном режиме. Просьба записывать все обращения!',
    type: 'urgent'
  },
  {
    department: 'менеджер колл центра',
    title: 'Важно: Новые тарифы',
    content: 'С понедельника вступают в силу новые тарифы. Просьба ознакомиться с прайс-листом и уведомить клиентов.',
    type: 'important'
  },

  // Шаблоны для IT отдела
  {
    department: 'IT',
    title: 'Плановые работы',
    content: 'Запланированы технические работы на сервере. Время: [ВРЕМЯ]. Ожидаемая продолжительность: [ДЛИТЕЛЬНОСТЬ].',
    type: 'info'
  },
  {
    department: 'IT',
    title: 'СРОЧНО: Сбой в системе',
    content: 'КРИТИЧЕСКИЙ СБОЙ! Система недоступна. Ведутся восстановительные работы. ETA: [ВРЕМЯ].',
    type: 'urgent'
  },
  {
    department: 'IT',
    title: 'Важно: Обновление безопасности',
    content: 'Обязательное обновление системы безопасности. Просьба не выключать компьютеры до завершения установки.',
    type: 'important'
  }
];

async function createTestTemplates() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('Токен не найден. Авторизуйтесь в системе.');
    return;
  }

  console.log('Создание тестовых шаблонов...');
  
  for (const template of testTemplates) {
    try {
      const response = await fetch('http://localhost:5000/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(template)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Создан шаблон: ${template.title} (ID: ${result.id})`);
      } else {
        const error = await response.json();
        console.error(`❌ Ошибка создания шаблона "${template.title}":`, error.error);
      }
    } catch (error) {
      console.error(`❌ Ошибка запроса для шаблона "${template.title}":`, error);
    }
  }
  
  console.log('Создание тестовых шаблонов завершено!');
}

// Запуск создания шаблонов
createTestTemplates();
