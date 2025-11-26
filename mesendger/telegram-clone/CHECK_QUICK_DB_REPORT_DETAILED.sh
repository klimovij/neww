#!/bin/bash

echo "🔍 Детальная проверка quick-db-report и логов..."
echo ""

# 1. Проверяем все логи PM2 (без фильтрации)
echo "1. Все последние логи PM2 (последние 50 строк):"
echo "=============================================="
sudo -u appuser pm2 logs --lines 50 --nostream 2>&1 | tail -50
echo ""

# 2. Делаем тестовый запрос
echo "2. Тестовый запрос за 26 число:"
echo "=============================================="
curl -v "http://localhost:5000/api/quick-db-report?start=2025-11-26&end=2025-11-26" 2>&1 | head -30
echo ""

# 3. Ждём немного и снова проверяем логи
echo "3. Логи после запроса (последние 20 строк):"
echo "=============================================="
sleep 1
sudo -u appuser pm2 logs --lines 20 --nostream 2>&1 | tail -20
echo ""

# 4. Проверяем данные в базе за 25 число
echo "4. Проверка данных в базе за 25 число:"
echo "=============================================="
DB_PATH="/var/www/mesendger/messenger.db"
if [ -f "$DB_PATH" ]; then
    echo "База данных найдена: $DB_PATH"
    sqlite3 "$DB_PATH" "SELECT COUNT(*) as total FROM activity_logs WHERE date(timestamp) = '2025-11-25';"
    sqlite3 "$DB_PATH" "SELECT DISTINCT username FROM activity_logs WHERE date(timestamp) = '2025-11-25' LIMIT 5;"
else
    echo "❌ База данных не найдена: $DB_PATH"
    echo "Ищем альтернативные пути..."
    find /var/www -name "messenger.db" 2>/dev/null | head -3
fi
echo ""

# 5. Проверяем work_time_logs за 25 число
echo "5. Проверка work_time_logs за 25 число:"
echo "=============================================="
if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" "SELECT COUNT(*) as total FROM work_time_logs WHERE date(event_time) = '2025-11-25';"
    sqlite3 "$DB_PATH" "SELECT DISTINCT username FROM work_time_logs WHERE date(event_time) = '2025-11-25' LIMIT 5;"
fi
echo ""

echo "✅ Проверка завершена!"

