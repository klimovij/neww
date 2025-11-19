const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Подключаемся к базе данных (тот же путь, что и в приложении)
const dbPath = path.join(__dirname, 'messenger.db');
console.log('🔍 Подключение к базе данных:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.message);
    process.exit(1);
  }
  console.log('✅ Подключено к базе данных');
});

// Находим "осиротевших" пользователей
console.log('\n🔍 Поиск "осиротевших" пользователей...\n');

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
    process.exit(1);
  }

  if (orphanedUsers.length === 0) {
    console.log('✅ "Осиротевших" пользователей не найдено\n');
    db.close();
    return;
  }

  console.log(`📋 Найдено "осиротевших" пользователей: ${orphanedUsers.length}\n`);
  console.table(orphanedUsers);

  console.log('\n🗑️  Начинаю удаление...\n');

  let deletedCount = 0;
  let errorCount = 0;
  let processedCount = 0;

  orphanedUsers.forEach((user) => {
    // Сначала удаляем связанные данные
    db.serialize(() => {
      db.run('DELETE FROM chat_participants WHERE user_id = ?', [user.id], (err) => {
        if (err) console.error(`⚠️  Ошибка удаления chat_participants для ${user.id}:`, err.message);
      });
      
      db.run('DELETE FROM message_likes WHERE user_id = ?', [user.id], (err) => {
        if (err) console.error(`⚠️  Ошибка удаления message_likes для ${user.id}:`, err.message);
      });
      
      db.run('DELETE FROM message_reads WHERE user_id = ?', [user.id], (err) => {
        if (err) console.error(`⚠️  Ошибка удаления message_reads для ${user.id}:`, err.message);
      });
      
      db.run('DELETE FROM news_comments WHERE user_id = ?', [user.id], (err) => {
        if (err) console.error(`⚠️  Ошибка удаления news_comments для ${user.id}:`, err.message);
      });
      
      db.run('DELETE FROM news_likes WHERE user_id = ?', [user.id], (err) => {
        if (err) console.error(`⚠️  Ошибка удаления news_likes для ${user.id}:`, err.message);
      });
      
      db.run('DELETE FROM messages WHERE user_id = ?', [user.id], (err) => {
        if (err) console.error(`⚠️  Ошибка удаления messages для ${user.id}:`, err.message);
      });
      
      db.run('DELETE FROM congrat_comments WHERE user_id = ?', [user.id], (err) => {
        if (err) console.error(`⚠️  Ошибка удаления congrat_comments для ${user.id}:`, err.message);
      });
      
      db.run('DELETE FROM congrat_likes WHERE user_id = ?', [user.id], (err) => {
        if (err) console.error(`⚠️  Ошибка удаления congrat_likes для ${user.id}:`, err.message);
      });
      
      db.run('DELETE FROM leaves WHERE userId = ?', [user.id], (err) => {
        if (err) console.error(`⚠️  Ошибка удаления leaves для ${user.id}:`, err.message);
      });
      
      db.run('DELETE FROM tasks WHERE assignedTo = ? OR authorId = ?', [user.id, user.id], (err) => {
        if (err) console.error(`⚠️  Ошибка удаления tasks для ${user.id}:`, err.message);
      });

      // Наконец удаляем самого пользователя
      db.run('DELETE FROM users WHERE id = ?', [user.id], function(err) {
        processedCount++;
        
        if (err) {
          console.error(`❌ Ошибка при удалении пользователя ${user.id} (${user.username}):`, err.message);
          errorCount++;
        } else {
          console.log(`✅ Удален пользователь: ID=${user.id}, Username=${user.username}, Employee_ID=${user.employee_id}`);
          deletedCount++;
        }

        // Когда обработали всех пользователей
        if (processedCount === orphanedUsers.length) {
          console.log(`\n📊 Результат:`);
          console.log(`   ✅ Удалено: ${deletedCount}`);
          console.log(`   ❌ Ошибок: ${errorCount}`);
          
          db.close((err) => {
            if (err) {
              console.error('❌ Ошибка закрытия базы данных:', err.message);
              process.exit(1);
            } else {
              console.log('\n✅ База данных закрыта');
              process.exit(0);
            }
          });
        }
      });
    });
  });
});

