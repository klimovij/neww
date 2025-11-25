#!/bin/bash

# Поиск базы данных messenger.db

set -e

echo "🔍 Поиск базы данных messenger.db..."
echo ""

# 1. Ищем все файлы messenger.db
echo "📋 Поиск всех файлов messenger.db:"
echo "=============================================="
find /var/www -name "messenger.db" -type f 2>/dev/null | while read db_file; do
    echo ""
    echo "Найден: $db_file"
    echo "Размер: $(ls -lh "$db_file" | awk '{print $5}')"
    echo "Дата изменения: $(ls -l "$db_file" | awk '{print $6, $7, $8}')"
    echo ""
    echo "Проверяем наличие таблицы activity_logs:"
    sudo sqlite3 "$db_file" "SELECT name FROM sqlite_master WHERE type='table' AND name='activity_logs';" 2>/dev/null || echo "Ошибка при запросе"
    echo ""
    echo "Количество записей в activity_logs:"
    sudo sqlite3 "$db_file" "SELECT COUNT(*) FROM activity_logs;" 2>/dev/null || echo "Ошибка при запросе"
    echo ""
    echo "Количество записей для Ksendzik_Oleg:"
    sudo sqlite3 "$db_file" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg';" 2>/dev/null || echo "Ошибка при запросе"
    echo ""
    echo "Последние 5 записей для Ksendzik_Oleg:"
    sudo sqlite3 "$db_file" "SELECT datetime, procName FROM activity_logs WHERE username = 'Ksendzik_Oleg' ORDER BY datetime DESC LIMIT 5;" 2>/dev/null || echo "Ошибка при запросе"
    echo ""
    echo "Проверяем даты записей:"
    sudo sqlite3 "$db_file" "SELECT MIN(datetime) as earliest, MAX(datetime) as latest FROM activity_logs WHERE username = 'Ksendzik_Oleg';" 2>/dev/null || echo "Ошибка при запросе"
    echo "---"
done
echo ""

# 2. Проверяем логи PM2 для пути к базе
echo "📋 Проверка пути к базе в логах PM2:"
echo "=============================================="
sudo -u appuser pm2 logs --lines 100 --nostream | grep -i "database path\|Using database\|Database opened" | head -5 || echo "Не найдено"
echo ""

# 3. Проверяем переменные окружения
echo "📋 Проверка переменных окружения:"
echo "=============================================="
if [ -f "/var/www/mesendger/mesendger/telegram-clone/server/env" ]; then
    echo "Файл env существует, проверяем DATABASE_PATH:"
    grep "DATABASE_PATH" "/var/www/mesendger/mesendger/telegram-clone/server/env" || echo "DATABASE_PATH не найден"
else
    echo "Файл env не найден"
fi
echo ""

echo "✅ Готово!"

