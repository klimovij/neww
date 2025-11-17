const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Открываем базу данных
const dbPath = path.join(__dirname, 'messenger.db');
const db = new sqlite3.Database(dbPath);

console.log('Исправление статусов задач...');

// Обновляем все задачи без статуса или с пустым статусом
db.run(`UPDATE tasks SET status = 'open' WHERE status IS NULL OR status = ''`, function(err) {
  if (err) {
    console.error('Ошибка при обновлении статусов:', err);
  } else {
    console.log(`Обновлено задач: ${this.changes}`);
  }
  
  // Проверяем результат
  db.all('SELECT id, title, status FROM tasks', (err, rows) => {
    if (err) {
      console.error('Ошибка при проверке:', err);
    } else {
      console.log('Текущие задачи:');
      rows.forEach(row => {
        console.log(`ID: ${row.id}, Title: ${row.title}, Status: ${row.status}`);
      });
    }
    db.close();
  });
});
