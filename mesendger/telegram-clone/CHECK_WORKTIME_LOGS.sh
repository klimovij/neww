#!/bin/bash

# Проверка данных в work_time_logs (для quick-db-report)

set -e

echo "🔍 Проверка данных в work_time_logs..."
echo ""

MAIN_DB="/var/www/mesendger/messenger.db"

echo "📊 Проверка таблицы work_time_logs:"
echo "=============================================="

echo "1. Проверяем, существует ли таблица work_time_logs:"
sudo sqlite3 "$MAIN_DB" "SELECT name FROM sqlite_master WHERE type='table' AND name='work_time_logs';" 2>/dev/null || echo "Ошибка"
echo ""

echo "2. Всего записей в work_time_logs:"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM work_time_logs;" 2>/dev/null || echo "0"
echo ""

echo "3. Записей за сегодня (2025-11-25):"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM work_time_logs WHERE date(event_time) = '2025-11-25';" 2>/dev/null || echo "0"
echo ""

echo "4. Последние 10 записей:"
sudo sqlite3 "$MAIN_DB" "SELECT datetime(event_time) as dt, username, event_type FROM work_time_logs ORDER BY event_time DESC LIMIT 10;" 2>/dev/null || echo "Ошибка"
echo ""

echo "5. Уникальные username в work_time_logs:"
sudo sqlite3 "$MAIN_DB" "SELECT DISTINCT username FROM work_time_logs ORDER BY username;" 2>/dev/null || echo "Ошибка"
echo ""

echo "6. Всего записей в activity_logs (для сравнения):"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs;" 2>/dev/null || echo "0"
echo ""

echo "✅ Готово!"
echo ""
echo "📋 Важно:"
echo "   - work_time_logs: данные для quick-db-report (login/logout события)"
echo "   - activity_logs: данные для activity-details (приложения, сайты, скриншоты)"
echo "   - Если work_time_logs пустая, то quick-db-report вернёт пустой массив"
echo "   - Но activity-details всё равно должен работать с activity_logs"

