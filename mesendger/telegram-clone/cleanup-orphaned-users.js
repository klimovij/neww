const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Подключаемся к базе данных
const dbPath = path.join(__dirname, 'server', 'messenger.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Поиск "осиротевших" пользователей (пользователей без сотрудника)...\n');

// Находим пользователей, у которых employee_id не существует в таблице employees
const query = `
  SELECT u.id, u.username, u.employee_id 
  FROM users u 
  LEFT JOIN employees e ON u.employee_id = e.id 
  WHERE u.employee_id IS NOT NULL AND e.id IS NULL
`;

db.all(query, (err, orphanedUsers) => {
  if (err) {
    console.error('❌ Ошибка при поиске пользователей:', err.message);
    db.close();
    return;
  }

  if (orphanedUsers.length === 0) {
    console.log('✅ "Осиротевших" пользователей не найдено\n');
    db.close();
    return;
  }

  console.log(`📋 Найдено "осиротевших" пользователей: ${orphanedUsers.length}\n`);
  console.table(orphanedUsers);

  // Спрашиваем подтверждение
  console.log('\n⚠️  ВНИМАНИЕ: Эти пользователи будут удалены!');
  console.log('Для удаления запустите скрипт с аргументом --delete\n');
  console.log('Пример: node cleanup-orphaned-users.js --delete\n');

  if (process.argv.includes('--delete')) {
    console.log('🗑️  Начинаю удаление...\n');
    
    let deletedCount = 0;
    let errorCount = 0;

    orphanedUsers.forEach((user, index) => {
      db.run('DELETE FROM users WHERE id = ?', [user.id], function(err) {
        if (err) {
          console.error(`❌ Ошибка при удалении пользователя ${user.id} (${user.username}):`, err.message);
          errorCount++;
        } else {
          console.log(`✅ Удален пользователь: ID=${user.id}, Username=${user.username}, Employee_ID=${user.employee_id}`);
          deletedCount++;
        }

        // Когда обработали всех пользователей
        if (index === orphanedUsers.length - 1) {
          console.log(`\n📊 Результат:`);
          console.log(`   ✅ Удалено: ${deletedCount}`);
          console.log(`   ❌ Ошибок: ${errorCount}`);
          
          db.close((err) => {
            if (err) {
              console.error('❌ Ошибка закрытия базы данных:', err.message);
            } else {
              console.log('✅ База данных закрыта');
            }
          });
        }
      });
    });
  } else {
    db.close();
  }
});

