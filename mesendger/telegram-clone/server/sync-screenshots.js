const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Путь к базе данных
const dbPath = path.join(__dirname, '../../messenger.db');
const screenshotsDir = path.join(__dirname, 'uploads/screenshots');

// Подключение к БД
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err);
    process.exit(1);
  }
  console.log('✅ Подключено к БД:', dbPath);
});

// Функция для парсинга имени файла скриншота
// Формат: screenshot_{username}_{date}_{time}.jpg
// Пример: screenshot_Ksendzik_Oleg_2025-11-28_18-37-08-532Z.jpg
function parseScreenshotFilename(filename) {
  const match = filename.match(/^screenshot_(.+?)_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2}-\d+Z)\.jpg$/);
  if (!match) {
    return null;
  }
  
  const [, username, date, time] = match;
  // Преобразуем формат времени: 18-37-08-532Z -> 2025-11-28T18:37:08.532Z
  const timestamp = `${date}T${time.replace(/-/g, ':').replace(/(\d+Z)$/, '.$1')}`;
  
  return { username, timestamp };
}

// Функция для проверки существования записи в БД
function checkExistsInDB(username, timestamp, filePath) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM activity_screenshots WHERE username = ? AND timestamp = ? AND file_path = ?',
      [username, timestamp, filePath],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      }
    );
  });
}

// Функция для добавления записи в БД
function addToDB(username, timestamp, filePath, fileSize) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO activity_screenshots (username, timestamp, file_path, file_size) VALUES (?, ?, ?, ?)',
      [username, timestamp, filePath, fileSize],
      function(err) {
        if (err) {
          // Игнорируем ошибку UNIQUE constraint (запись уже существует)
          if (err.message.includes('UNIQUE')) {
            resolve({ inserted: false, reason: 'already_exists' });
          } else {
            reject(err);
          }
        } else {
          resolve({ inserted: true, id: this.lastID });
        }
      }
    );
  });
}

// Основная функция синхронизации
async function syncScreenshots() {
  console.log('🔄 Начинаем синхронизацию скриншотов...');
  console.log('📁 Папка со скриншотами:', screenshotsDir);
  
  if (!fs.existsSync(screenshotsDir)) {
    console.error('❌ Папка со скриншотами не найдена:', screenshotsDir);
    process.exit(1);
  }
  
  const files = fs.readdirSync(screenshotsDir)
    .filter(file => file.startsWith('screenshot_') && file.endsWith('.jpg'));
  
  console.log(`📸 Найдено файлов скриншотов: ${files.length}`);
  
  let processed = 0;
  let added = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const file of files) {
    try {
      const filePath = path.join(screenshotsDir, file);
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      
      const parsed = parseScreenshotFilename(file);
      if (!parsed) {
        console.log(`⚠️  Не удалось распарсить имя файла: ${file}`);
        skipped++;
        continue;
      }
      
      const { username, timestamp } = parsed;
      const fullPath = filePath; // Полный путь к файлу
      
      // Проверяем, существует ли уже запись
      const exists = await checkExistsInDB(username, timestamp, fullPath);
      
      if (exists) {
        skipped++;
        if (processed % 100 === 0) {
          console.log(`⏳ Обработано: ${processed}/${files.length} (добавлено: ${added}, пропущено: ${skipped})`);
        }
      } else {
        // Добавляем в БД
        const result = await addToDB(username, timestamp, fullPath, fileSize);
        if (result.inserted) {
          added++;
        } else {
          skipped++;
        }
        
        if (added % 10 === 0 || processed % 100 === 0) {
          console.log(`⏳ Обработано: ${processed}/${files.length} (добавлено: ${added}, пропущено: ${skipped})`);
        }
      }
      
      processed++;
    } catch (error) {
      console.error(`❌ Ошибка при обработке файла ${file}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n✅ Синхронизация завершена!');
  console.log(`📊 Статистика:`);
  console.log(`   - Всего файлов: ${files.length}`);
  console.log(`   - Обработано: ${processed}`);
  console.log(`   - Добавлено в БД: ${added}`);
  console.log(`   - Пропущено (уже есть): ${skipped}`);
  console.log(`   - Ошибок: ${errors}`);
  
  db.close((err) => {
    if (err) {
      console.error('❌ Ошибка при закрытии БД:', err);
    } else {
      console.log('✅ БД закрыта');
    }
    process.exit(0);
  });
}

// Запуск
syncScreenshots().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  db.close();
  process.exit(1);
});

