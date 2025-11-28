const sqlite3 = require('sqlite3').verbose();
const dbPath = '/var/www/mesendger/messenger.db';
const db = new sqlite3.Database(dbPath);

// Проверяем формат дат
console.log('📊 Проверка формата дат в work_time_logs:');
db.all('SELECT event_time FROM work_time_logs LIMIT 5', [], (err, rows) => {
  if (err) {
    console.error('❌ Ошибка:', err);
    db.close();
    return;
  }
  console.log('Примеры дат:');
  rows.forEach((row, i) => {
    console.log(`  ${i + 1}. ${row.event_time} (длина: ${row.event_time.length})`);
  });
  
  // Проверяем, какие даты есть в базе
  console.log('\n📅 Проверяем даты в базе:');
  db.all('SELECT DISTINCT date(event_time) as date, COUNT(*) as count FROM work_time_logs GROUP BY date(event_time) ORDER BY date DESC LIMIT 10', [], (err, dateRows) => {
    if (err) {
      console.error('❌ Ошибка:', err);
      db.close();
      return;
    }
    console.log('Даты с количеством записей:');
    dateRows.forEach(row => {
      console.log(`  ${row.date}: ${row.count} записей`);
    });
    
    if (dateRows.length > 0) {
      // Тестируем удаление за последнюю дату
      const testDate = dateRows[0].date;
      console.log(`\n🗑️ Тестируем удаление за ${testDate}:`);
      
      const start = testDate;
      const end = testDate;
      
      // Проверяем, сколько записей будет удалено (используем date() как в реальном запросе)
      const checkQuery = `SELECT COUNT(*) as count FROM work_time_logs WHERE date(event_time) >= date(?) AND date(event_time) <= date(?)`;
      
      db.get(checkQuery, [start, end], (err, row) => {
        if (err) {
          console.error('❌ Ошибка проверки:', err);
          db.close();
          return;
        }
        console.log(`  Найдено записей для удаления: ${row.count}`);
        
        if (row.count > 0) {
          // Показываем примеры записей, которые будут удалены
          const sampleQuery = checkQuery.replace('COUNT(*) as count', '*');
          db.all(sampleQuery + ' LIMIT 3', [start, end], (err, samples) => {
            if (!err && samples) {
              console.log('  Примеры записей:');
              samples.forEach((s, i) => {
                console.log(`    ${i + 1}. ${s.username} - ${s.event_type} - ${s.event_time}`);
              });
            }
            db.close();
          });
        } else {
          db.close();
        }
      });
    } else {
      db.close();
    }
  });
});
