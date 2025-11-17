const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Подключаемся к базе данных
const dbPath = path.join(__dirname, 'server', 'messenger.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Проверяем структуру и содержимое базы данных...\n');

// Функция для выполнения запросов
function runQuery(query, description) {
  return new Promise((resolve, reject) => {
    console.log(`📊 ${description}:`);
    console.log(`SQL: ${query}\n`);
    
    db.all(query, (err, rows) => {
      if (err) {
        console.error(`❌ Ошибка: ${err.message}\n`);
        reject(err);
      } else {
        if (rows.length === 0) {
          console.log('📋 Результат: Таблица пустая или не найдена\n');
        } else {
          console.log(`📋 Результат (${rows.length} записей):`);
          console.table(rows);
          console.log('');
        }
        resolve(rows);
      }
    });
  });
}

async function checkDatabase() {
  try {
    // 1. Проверяем все таблицы в базе
    await runQuery(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      "Список всех таблиц в базе данных"
    );

    // 2. Проверяем структуру таблицы leaves
    await runQuery(
      "PRAGMA table_info(leaves)",
      "Структура таблицы leaves"
    );

    // 3. Проверяем структуру таблицы leave_worktime
    await runQuery(
      "PRAGMA table_info(leave_worktime)",
      "Структура таблицы leave_worktime"
    );

    // 4. Проверяем содержимое таблицы leaves
    await runQuery(
      "SELECT * FROM leaves ORDER BY id DESC LIMIT 10",
      "Последние 10 записей в таблице leaves"
    );

    // 5. Проверяем содержимое таблицы leave_worktime
    await runQuery(
      "SELECT * FROM leave_worktime ORDER BY created_at DESC LIMIT 10",
      "Последние 10 записей в таблице leave_worktime"
    );

    // 6. Проверяем количество записей в каждой таблице
    await runQuery(
      "SELECT COUNT(*) as count FROM leaves",
      "Общее количество записей в таблице leaves"
    );

    await runQuery(
      "SELECT COUNT(*) as count FROM leave_worktime",
      "Общее количество записей в таблице leave_worktime"
    );

    // 7. Проверяем статусы отгулов
    await runQuery(
      "SELECT status, COUNT(*) as count FROM leaves GROUP BY status",
      "Распределение отгулов по статусам"
    );

    // 8. Проверяем связанные данные
    await runQuery(
      `SELECT 
        l.id as leave_id,
        l.status,
        l.type,
        l.reason,
        l.startDate,
        l.endDate,
        lw.minutes as worked_minutes,
        lw.date as work_date,
        lw.created_at
      FROM leaves l 
      LEFT JOIN leave_worktime lw ON l.id = lw.leave_id 
      ORDER BY l.id DESC 
      LIMIT 10`,
      "Связанные данные отгулов и отработки"
    );

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Ошибка закрытия базы данных:', err.message);
      } else {
        console.log('✅ База данных закрыта');
      }
    });
  }
}

checkDatabase();
