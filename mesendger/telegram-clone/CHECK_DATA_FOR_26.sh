#!/bin/bash

# Проверка данных за 26 ноября

set -e

echo "🔍 Проверка данных за 26 ноября..."
echo ""

MAIN_DB="/var/www/mesendger/messenger.db"

# Проверяем данные за сегодня (26 ноября)
TODAY=$(date +%Y-%m-%d)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d 2>/dev/null || date -d "1 day ago" +%Y-%m-%d 2>/dev/null || echo "")

echo "📊 Проверка данных для Ksendzik_Oleg:"
echo "=============================================="
echo "Сегодня: $TODAY"
if [ ! -z "$YESTERDAY" ]; then
    echo "Вчера: $YESTERDAY"
fi
echo ""

echo "1. Записей за сегодня ($TODAY):"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '$TODAY';" 2>/dev/null || echo "0"
echo ""

if [ ! -z "$YESTERDAY" ]; then
    echo "2. Записей за вчера ($YESTERDAY):"
    sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '$YESTERDAY';" 2>/dev/null || echo "0"
    echo ""
fi

echo "3. Последние 10 записей с временными метками:"
sudo sqlite3 "$MAIN_DB" "SELECT datetime(timestamp) as dt, date(timestamp) as d, proc_name FROM activity_logs WHERE username = 'Ksendzik_Oleg' ORDER BY timestamp DESC LIMIT 10;" 2>/dev/null || echo "Ошибка"
echo ""

echo "4. Проверка формата timestamp (последние 3):"
sudo sqlite3 "$MAIN_DB" "SELECT timestamp, proc_name FROM activity_logs WHERE username = 'Ksendzik_Oleg' ORDER BY timestamp DESC LIMIT 3;" 2>/dev/null || echo "Ошибка"
echo ""

echo "5. Все уникальные даты в базе для Ksendzik_Oleg (последние 5):"
sudo sqlite3 "$MAIN_DB" "SELECT DISTINCT date(timestamp) as date FROM activity_logs WHERE username = 'Ksendzik_Oleg' ORDER BY date DESC LIMIT 5;" 2>/dev/null || echo "Ошибка"
echo ""

echo "6. Проверка данных за диапазон (2025-11-25 - 2025-11-26):"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) as count, date(timestamp) as date FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) >= '2025-11-25' AND date(timestamp) <= '2025-11-26' GROUP BY date(timestamp) ORDER BY date DESC;" 2>/dev/null || echo "Ошибка"
echo ""

echo "✅ Готово!"
echo ""
echo "📋 Если данные есть за $YESTERDAY, но нет за $TODAY:"
echo "   - Возможно, проблема в часовом поясе (UTC vs локальное время)"
echo "   - Данные могут сохраняться с датой вчерашнего дня по UTC"
echo "   - Попробуйте выбрать в модалке вчерашнюю дату ($YESTERDAY)"

