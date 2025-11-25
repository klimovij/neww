#!/bin/bash

# Проверка базы данных и данных

set -e

echo "🔍 Проверка базы данных и данных..."
echo ""

# 1. Проверяем логи PM2 для пути к базе
echo "📋 Путь к базе данных из логов PM2:"
echo "=============================================="
sudo -u appuser pm2 logs --lines 100 --nostream | grep -i "Database\|Using database path\|Database opened" | head -5
echo ""

# 2. Проверяем большую базу данных
MAIN_DB="/var/www/mesendger/messenger.db"
echo "📊 Проверка большой базы данных: $MAIN_DB"
echo "=============================================="
if [ -f "$MAIN_DB" ]; then
    echo "✅ База существует"
    echo ""
    
    echo "Проверяем структуру таблицы activity_logs:"
    sudo sqlite3 "$MAIN_DB" "PRAGMA table_info(activity_logs);" 2>/dev/null | head -20 || echo "Ошибка"
    echo ""
    
    echo "Проверяем формат timestamp (первые 5 записей):"
    sudo sqlite3 "$MAIN_DB" "SELECT datetime, timestamp, username, proc_name FROM activity_logs WHERE username = 'Ksendzik_Oleg' ORDER BY timestamp DESC LIMIT 5;" 2>/dev/null || echo "Ошибка при запросе"
    echo ""
    
    echo "Проверяем, какие даты есть в базе:"
    sudo sqlite3 "$MAIN_DB" "SELECT DISTINCT date(timestamp) as date FROM activity_logs WHERE username = 'Ksendzik_Oleg' ORDER BY date DESC LIMIT 10;" 2>/dev/null || echo "Ошибка"
    echo ""
    
    echo "Тест запроса с фильтром по датам (сегодня и вчера):"
    TODAY=$(date +%Y-%m-%d)
    YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d 2>/dev/null || echo "")
    
    if [ -z "$YESTERDAY" ]; then
        YESTERDAY=$(date -d "1 day ago" +%Y-%m-%d 2>/dev/null || echo "")
    fi
    
    echo "Проверяем за сегодня ($TODAY):"
    sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '$TODAY';" 2>/dev/null || echo "Ошибка"
    
    if [ ! -z "$YESTERDAY" ]; then
        echo "Проверяем за вчера ($YESTERDAY):"
        sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '$YESTERDAY';" 2>/dev/null || echo "Ошибка"
        echo ""
        echo "Проверяем диапазон ($YESTERDAY - $TODAY):"
        sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) >= '$YESTERDAY' AND date(timestamp) <= '$TODAY';" 2>/dev/null || echo "Ошибка"
    fi
else
    echo "❌ База не найдена: $MAIN_DB"
fi
echo ""

# 3. Проверяем другую базу
OTHER_DB="/var/www/mesendger/server/messenger.db"
echo "📊 Проверка другой базы: $OTHER_DB"
echo "=============================================="
if [ -f "$OTHER_DB" ]; then
    echo "✅ База существует"
    echo "Проверяем данные для Ksendzik_Oleg:"
    sudo sqlite3 "$OTHER_DB" "SELECT datetime, timestamp FROM activity_logs WHERE username = 'Ksendzik_Oleg' ORDER BY timestamp DESC LIMIT 3;" 2>/dev/null || echo "Ошибка"
fi
echo ""

# 4. Проверяем последние логи activity-details
echo "📋 Последние логи activity-details:"
echo "=============================================="
sudo -u appuser pm2 logs --lines 100 --nostream | grep -i "activity-details" | tail -30
echo ""

echo "✅ Готово!"

