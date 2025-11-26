#!/bin/bash

# Скрипт для проверки данных активности в базе данных

set -e

MAIN_DB="/var/www/mesendger/messenger.db"

echo "🔍 Проверка данных активности в базе данных"
echo "=============================================="
echo ""

if [ ! -f "$MAIN_DB" ]; then
    echo "❌ База данных не найдена: $MAIN_DB"
    exit 1
fi

echo "📊 Общая статистика:"
echo "----------------------------------------"
echo ""

echo "1. Всего записей в activity_logs:"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs;" 2>/dev/null || echo "0"
echo ""

echo "2. Всего записей в activity_screenshots:"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_screenshots;" 2>/dev/null || echo "0"
echo ""

echo "3. Уникальные username в activity_logs:"
sudo sqlite3 "$MAIN_DB" "SELECT DISTINCT username FROM activity_logs ORDER BY username;" 2>/dev/null || echo "Нет данных"
echo ""

echo "4. Записи по датам (последние 7 дней):"
echo "----------------------------------------"
for i in {0..6}; do
    DATE=$(date -d "$i days ago" +%Y-%m-%d 2>/dev/null || date -v-${i}d +%Y-%m-%d 2>/dev/null || echo "")
    if [ ! -z "$DATE" ]; then
        COUNT=$(sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE date(timestamp) = '$DATE';" 2>/dev/null || echo "0")
        echo "$DATE: $COUNT записей"
    fi
done
echo ""

echo "5. Последние 10 записей активности:"
sudo sqlite3 "$MAIN_DB" "SELECT datetime(timestamp) as dt, username, proc_name FROM activity_logs ORDER BY timestamp DESC LIMIT 10;" 2>/dev/null || echo "Нет данных"
echo ""

echo "6. Статистика по пользователям (топ 10):"
sudo sqlite3 "$MAIN_DB" "SELECT username, COUNT(*) as count FROM activity_logs GROUP BY username ORDER BY count DESC LIMIT 10;" 2>/dev/null || echo "Нет данных"
echo ""

echo "7. Самая старая запись:"
sudo sqlite3 "$MAIN_DB" "SELECT datetime(timestamp) as dt, username FROM activity_logs ORDER BY timestamp ASC LIMIT 1;" 2>/dev/null || echo "Нет данных"
echo ""

echo "8. Самая новая запись:"
sudo sqlite3 "$MAIN_DB" "SELECT datetime(timestamp) as dt, username FROM activity_logs ORDER BY timestamp DESC LIMIT 1;" 2>/dev/null || echo "Нет данных"
echo ""

echo "✅ Проверка завершена!"

