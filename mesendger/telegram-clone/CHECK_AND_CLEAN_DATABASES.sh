#!/bin/bash

# Проверка и очистка лишних баз данных

set -e

echo "🔍 Проверка баз данных..."
echo ""

# Ищем все файлы messenger.db
echo "📋 Поиск всех файлов messenger.db:"
echo "=============================================="
find /var/www -name "messenger.db" -type f 2>/dev/null | while read db_file; do
    echo ""
    echo "Найден: $db_file"
    echo "Размер: $(ls -lh "$db_file" | awk '{print $5}')"
    echo "Дата изменения: $(ls -l "$db_file" | awk '{print $6, $7, $8}')"
    echo ""
    echo "Количество записей в activity_logs:"
    RECORDS=$(sudo sqlite3 "$db_file" "SELECT COUNT(*) FROM activity_logs;" 2>/dev/null || echo "0")
    echo "$RECORDS"
    echo "---"
done

echo ""
echo "📋 Проверка, какая база используется сервером:"
echo "=============================================="
# Проверяем логи PM2 для пути к базе
sudo -u appuser pm2 logs --lines 50 --nostream | grep -i "Database opened\|Using database path" | tail -3 || echo "Не найдено в логах"

echo ""
echo "📋 Проверка конфигурации:"
echo "=============================================="
DB_FILE="/var/www/mesendger/mesendger/telegram-clone/server/database.js"
if [ -f "$DB_FILE" ]; then
    echo "Проверяем путь к базе в database.js:"
    grep -A 5 "dbPath.*=" "$DB_FILE" | head -10 || echo "Не найдено"
fi

echo ""
echo "✅ Анализ завершён!"
echo ""
echo "📋 Основная база данных (используется сервером):"
echo "   /var/www/mesendger/messenger.db"
echo ""
echo "⚠️  Если есть другие базы, их можно удалить."
echo "   Но сначала убедитесь, что они не используются!"

