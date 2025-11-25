#!/bin/bash

# Проверка данных за 26 число

set -e

echo "🔍 Проверка данных за 26 число..."
echo ""

MAIN_DB="/var/www/mesendger/messenger.db"

echo "📊 Проверка данных в базе:"
echo "=============================================="

echo "1. Записей в activity_logs за 25 ноября:"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE date(timestamp) = '2025-11-25';" 2>/dev/null || echo "0"
echo ""

echo "2. Записей в activity_logs за 26 ноября:"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE date(timestamp) = '2025-11-26';" 2>/dev/null || echo "0"
echo ""

echo "3. Последние 5 записей с датами:"
sudo sqlite3 "$MAIN_DB" "SELECT datetime(timestamp) as dt, date(timestamp) as d, username, proc_name FROM activity_logs ORDER BY timestamp DESC LIMIT 5;" 2>/dev/null || echo "Ошибка"
echo ""

echo "4. Уникальные даты в activity_logs (последние 5):"
sudo sqlite3 "$MAIN_DB" "SELECT DISTINCT date(timestamp) as date FROM activity_logs ORDER BY date DESC LIMIT 5;" 2>/dev/null || echo "Ошибка"
echo ""

echo "5. Тест API quick-db-report за 26 ноября:"
curl -s "http://localhost/api/quick-db-report?start=2025-11-26&end=2025-11-26" | python3 -c "import sys, json; data = json.load(sys.stdin); print('Success:', data.get('success')); print('Report count:', len(data.get('report', []))); print('Users:', [r.get('username') for r in data.get('report', [])])" 2>/dev/null || echo "Ошибка"
echo ""

echo "✅ Готово!"

