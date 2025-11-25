#!/bin/bash

# Проверка почему quick-db-report возвращает пустой массив

set -e

echo "🔍 Проверка quick-db-report..."
echo ""

MAIN_DB="/var/www/mesendger/messenger.db"
TODAY=$(date +%Y-%m-%d)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d 2>/dev/null || date -d "1 day ago" +%Y-%m-%d 2>/dev/null || echo "")

echo "📊 Проверка данных в базе:"
echo "=============================================="
echo "Сегодня: $TODAY"
if [ ! -z "$YESTERDAY" ]; then
    echo "Вчера: $YESTERDAY"
fi
echo ""

echo "1. Всего записей в activity_logs:"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs;" 2>/dev/null || echo "0"
echo ""

echo "2. Записей за сегодня ($TODAY):"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE date(timestamp) = '$TODAY';" 2>/dev/null || echo "0"
echo ""

echo "3. Уникальные username в базе:"
sudo sqlite3 "$MAIN_DB" "SELECT DISTINCT username FROM activity_logs ORDER BY username;" 2>/dev/null || echo "Ошибка"
echo ""

echo "4. Последние 5 записей:"
sudo sqlite3 "$MAIN_DB" "SELECT datetime(timestamp) as dt, username, proc_name FROM activity_logs ORDER BY timestamp DESC LIMIT 5;" 2>/dev/null || echo "Ошибка"
echo ""

echo "📡 Тест API quick-db-report:"
echo "=============================================="
echo "Тест 1: Запрос за сегодня ($TODAY):"
curl -s "http://localhost/api/quick-db-report?start=$TODAY&end=$TODAY" | python3 -m json.tool 2>/dev/null | head -50 || curl -s "http://localhost/api/quick-db-report?start=$TODAY&end=$TODAY" | head -500
echo ""
echo ""

if [ ! -z "$YESTERDAY" ]; then
    echo "Тест 2: Запрос за вчера ($YESTERDAY):"
    curl -s "http://localhost/api/quick-db-report?start=$YESTERDAY&end=$YESTERDAY" | python3 -m json.tool 2>/dev/null | head -50 || curl -s "http://localhost/api/quick-db-report?start=$YESTERDAY&end=$YESTERDAY" | head -500
    echo ""
    echo ""
fi

echo "Тест 3: Запрос за диапазон (последние 7 дней):"
START_DATE=$(date -d "7 days ago" +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d 2>/dev/null || echo "")
if [ ! -z "$START_DATE" ]; then
    curl -s "http://localhost/api/quick-db-report?start=$START_DATE&end=$TODAY" | python3 -m json.tool 2>/dev/null | head -50 || curl -s "http://localhost/api/quick-db-report?start=$START_DATE&end=$TODAY" | head -500
else
    echo "Не удалось определить дату 7 дней назад"
fi
echo ""

echo "✅ Готово!"

