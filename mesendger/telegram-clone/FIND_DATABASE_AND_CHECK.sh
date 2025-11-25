#!/bin/bash

# Поиск базы данных и проверка данных

set -e

echo "🔍 Поиск базы данных..."
echo ""

# 1. Ищем все файлы database.sqlite
echo "📋 Поиск всех файлов database.sqlite:"
echo "=============================================="
find /var/www -name "database.sqlite" -type f 2>/dev/null | while read db_file; do
    echo ""
    echo "Найден: $db_file"
    echo "Размер: $(ls -lh "$db_file" | awk '{print $5}')"
    echo "Дата: $(ls -l "$db_file" | awk '{print $6, $7, $8}')"
    echo ""
    echo "Количество записей в activity_logs:"
    sudo sqlite3 "$db_file" "SELECT COUNT(*) FROM activity_logs;" 2>/dev/null || echo "Ошибка при запросе"
    echo ""
    echo "Количество записей для Ksendzik_Oleg:"
    sudo sqlite3 "$db_file" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg';" 2>/dev/null || echo "Ошибка при запросе"
    echo ""
    echo "Последние 5 записей для Ksendzik_Oleg:"
    sudo sqlite3 "$db_file" "SELECT datetime, procName, windowTitle FROM activity_logs WHERE username = 'Ksendzik_Oleg' ORDER BY datetime DESC LIMIT 5;" 2>/dev/null || echo "Ошибка при запросе"
    echo "---"
done
echo ""

# 2. Проверяем, какой путь к базе в коде сервера
echo "📋 Проверка пути к базе в коде:"
echo "=============================================="
SERVER_FILE="/var/www/mesendger/mesendger/telegram-clone/server/server.js"
if [ -f "$SERVER_FILE" ]; then
    echo "Ищем пути к database.sqlite:"
    grep -n "database.sqlite\|sqlite" "$SERVER_FILE" | head -5 || echo "Не найдено"
else
    echo "Файл сервера не найден: $SERVER_FILE"
fi
echo ""

# 3. Проверяем переменные окружения PM2
echo "📋 Проверка конфигурации PM2:"
echo "=============================================="
ECOSYSTEM="/var/www/mesendger/mesendger/telegram-clone/deploy/ecosystem.config.js"
if [ -f "$ECOSYSTEM" ]; then
    echo "Рабочая директория (cwd):"
    grep -n "cwd" "$ECOSYSTEM" | head -2
    echo ""
    echo "Переменные окружения:"
    grep -A 5 "env:" "$ECOSYSTEM" | head -10
fi
echo ""

# 4. Проверяем логи PM2 на детали
echo "📋 Детальные логи PM2 (последние 30 строк):"
echo "=============================================="
sudo -u appuser pm2 logs --lines 30 --nostream | tail -30
echo ""

echo "✅ Готово!"

