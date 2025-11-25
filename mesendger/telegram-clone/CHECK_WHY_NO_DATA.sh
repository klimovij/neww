#!/bin/bash

# Проверка, почему данные не возвращаются

set -e

echo "🔍 Проверка, почему данные не возвращаются..."
echo ""

# 1. Проверяем последние логи PM2 для activity-details
echo "📋 Последние логи PM2 (activity-details):"
echo "=============================================="
sudo -u appuser pm2 logs --lines 50 --nostream | grep -i "activity-details" | tail -20 || echo "Нет логов с activity-details"
echo ""

# 2. Проверяем базу данных - есть ли данные
echo "📊 Проверка базы данных:"
echo "=============================================="
DB_FILE="/var/www/mesendger/mesendger/telegram-clone/server/database.sqlite"
if [ -f "$DB_FILE" ]; then
    echo "✅ База данных существует"
    echo ""
    echo "Проверяем наличие данных activity_logs:"
    sudo sqlite3 "$DB_FILE" "SELECT COUNT(*) as total_logs FROM activity_logs;" 2>/dev/null || echo "Ошибка при запросе"
    echo ""
    echo "Проверяем наличие данных для пользователя Ksendzik_Oleg:"
    sudo sqlite3 "$DB_FILE" "SELECT COUNT(*) as user_logs FROM activity_logs WHERE username = 'Ksendzik_Oleg';" 2>/dev/null || echo "Ошибка при запросе"
    echo ""
    echo "Проверяем последние 5 записей для Ksendzik_Oleg:"
    sudo sqlite3 "$DB_FILE" "SELECT username, datetime, procName FROM activity_logs WHERE username = 'Ksendzik_Oleg' ORDER BY datetime DESC LIMIT 5;" 2>/dev/null || echo "Ошибка при запросе"
else
    echo "❌ База данных не найдена: $DB_FILE"
fi
echo ""

# 3. Проверяем, какие параметры ожидает API
echo "📋 Тест API с параметрами:"
echo "=============================================="
echo "Тест запроса activity-details (должен вернуть ошибку авторизации, но показать структуру):"
curl -s "http://localhost/api/activity-details?username=Ksendzik_Oleg&start=2025-11-24&end=2025-11-25" | head -c 200
echo ""
echo ""

# 4. Проверяем код сервера - как обрабатывается запрос
echo "📋 Проверка обработки запроса в коде:"
echo "=============================================="
ACTIVITY_ROUTES="/var/www/mesendger/mesendger/telegram-clone/server/routes/activity.js"
if [ -f "$ACTIVITY_ROUTES" ]; then
    echo "Проверяем, есть ли логирование в activity-details:"
    grep -n "activity-details\|console.log" "$ACTIVITY_ROUTES" | head -10 || echo "Не найдено"
else
    echo "Файл маршрутов не найден: $ACTIVITY_ROUTES"
fi
echo ""

# 5. Проверяем, правильно ли фильтруются данные
echo "📋 Информация о проблеме:"
echo "=============================================="
echo "Если API возвращает success:true, но пустые массивы, возможные причины:"
echo "1. Неправильный username в запросе"
echo "2. Неправильные даты (формат или диапазон)"
echo "3. Данные не попадают в выборку из-за фильтрации"
echo ""
echo "Проверьте в браузере:"
echo "- DevTools → Network → запрос к /api/activity-details"
echo "- Посмотрите параметры запроса (Query String Parameters)"
echo "- Username должен быть: Ksendzik_Oleg"
echo "- Даты должны быть в формате YYYY-MM-DD"
echo ""

echo "✅ Готово!"

