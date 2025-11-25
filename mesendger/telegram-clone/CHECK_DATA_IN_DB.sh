#!/bin/bash

# Проверка данных в базе - почему приложения не возвращаются

set -e

echo "🔍 Проверка данных в базе данных..."
echo ""

MAIN_DB="/var/www/mesendger/messenger.db"

echo "📊 Анализ данных для Ksendzik_Oleg за сегодня:"
echo "=============================================="
TODAY=$(date +%Y-%m-%d)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d 2>/dev/null || date -d "1 day ago" +%Y-%m-%d 2>/dev/null || echo "")

echo "За сегодня ($TODAY):"
echo ""

echo "1. Всего записей:"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '$TODAY';" 2>/dev/null || echo "0"
echo ""

echo "2. Записей с browser_url (пойдут в 'urls'):"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '$TODAY' AND browser_url IS NOT NULL AND browser_url != '';" 2>/dev/null || echo "0"
echo ""

echo "3. Записей БЕЗ browser_url (могут быть приложениями):"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '$TODAY' AND (browser_url IS NULL OR browser_url = '');" 2>/dev/null || echo "0"
echo ""

echo "4. Записей с proc_name:"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '$TODAY' AND proc_name IS NOT NULL AND proc_name != '';" 2>/dev/null || echo "0"
echo ""

echo "5. Примеры записей БЕЗ browser_url (первые 10):"
sudo sqlite3 "$MAIN_DB" "SELECT proc_name, window_title FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '$TODAY' AND (browser_url IS NULL OR browser_url = '') AND proc_name IS NOT NULL AND proc_name != '' LIMIT 10;" 2>/dev/null || echo "Ошибка"
echo ""

echo "6. Уникальные proc_name БЕЗ browser_url (первые 20):"
sudo sqlite3 "$MAIN_DB" "SELECT DISTINCT proc_name FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '$TODAY' AND (browser_url IS NULL OR browser_url = '') AND proc_name IS NOT NULL AND proc_name != '' LIMIT 20;" 2>/dev/null || echo "Ошибка"
echo ""

if [ ! -z "$YESTERDAY" ]; then
    echo "За вчера ($YESTERDAY):"
    echo ""
    echo "Всего записей:"
    sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '$YESTERDAY';" 2>/dev/null || echo "0"
    echo ""
    echo "Записей БЕЗ browser_url:"
    sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '$YESTERDAY' AND (browser_url IS NULL OR browser_url = '');" 2>/dev/null || echo "0"
    echo ""
    echo "Уникальные proc_name БЕЗ browser_url:"
    sudo sqlite3 "$MAIN_DB" "SELECT DISTINCT proc_name FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '$YESTERDAY' AND (browser_url IS NULL OR browser_url = '') AND proc_name IS NOT NULL AND proc_name != '' LIMIT 20;" 2>/dev/null || echo "Ошибка"
fi

echo ""
echo "✅ Готово!"

