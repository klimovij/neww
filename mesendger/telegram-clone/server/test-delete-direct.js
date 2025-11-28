const sqlite3 = require('sqlite3').verbose();
const dbPath = '/var/www/mesendger/messenger.db';
const db = new sqlite3.Database(dbPath);

const start = '2025-11-27';
const end = '2025-11-27';

console.log(`🗑️ Тестируем удаление work_time_logs за период: ${start} - ${end}`);

// Сначала проверяем, сколько записей есть
db.get(`SELECT COUNT(*) as count FROM work_time_logs WHERE date(event_time) >= date(?) AND date(event_time) <= date(?)`, [start, end], (err, row) => {
  if (err) {
    console.error('❌ Ошибка проверки:', err);
    db.close();
    return;
  }
  console.log(`📊 Найдено записей для удаления: ${row.count}`);
  
  if (row.count > 0) {
    // Показываем примеры
    db.all(`SELECT * FROM work_time_logs WHERE date(event_time) >= date(?) AND date(event_time) <= date(?) LIMIT 3`, [start, end], (err, samples) => {
      if (!err && samples) {
        console.log('Примеры записей:');
        samples.forEach((s, i) => {
          console.log(`  ${i + 1}. ${s.username} - ${s.event_type} - ${s.event_time}`);
        });
      }
      
      // Теперь пытаемся удалить
      console.log('\n🗑️ Выполняем удаление...');
      db.run('BEGIN TRANSACTION');
      db.run(`DELETE FROM work_time_logs WHERE date(event_time) >= date(?) AND date(event_time) <= date(?)`, [start, end], function(deleteErr) {
        if (deleteErr) {
          db.run('ROLLBACK');
          console.error('❌ Ошибка удаления:', deleteErr);
          db.close();
          return;
        }
        console.log(`✅ Удалено записей: ${this.changes}`);
        
        // Проверяем, сколько осталось
        db.get(`SELECT COUNT(*) as count FROM work_time_logs WHERE date(event_time) >= date(?) AND date(event_time) <= date(?)`, [start, end], (checkErr, checkRow) => {
          if (!checkErr) {
            console.log(`📊 Осталось записей: ${checkRow.count}`);
          }
          
          // Откатываем транзакцию (это тест)
          db.run('ROLLBACK', (rollbackErr) => {
            if (rollbackErr) {
              console.error('❌ Ошибка отката:', rollbackErr);
            } else {
              console.log('🔄 Транзакция откачена (тест)');
            }
            db.close();
          });
        });
      });
    });
  } else {
    console.log('⚠️ Нет записей для удаления');
    db.close();
  }
});

