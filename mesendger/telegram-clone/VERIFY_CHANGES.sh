#!/bin/bash
# Скрипт для проверки, что изменения применены на сервере

cd /var/www/mesendger

echo "=========================================="
echo "Проверка изменений в activity.js"
echo "=========================================="
echo ""

# Проверяем, есть ли дедупликация
echo "1. Проверка дедупликации приложений:"
if grep -q "uniqueApplicationsMap" server/routes/activity.js; then
    echo "✅ Дедупликация найдена"
else
    echo "❌ Дедупликация НЕ найдена - изменения не применены!"
fi

echo ""
echo "2. Проверка улучшенного логирования:"
if grep -q "Уникальных приложений для пользователя" server/routes/activity.js; then
    echo "✅ Улучшенное логирование найдено"
else
    echo "❌ Улучшенное логирование НЕ найдено"
fi

echo ""
echo "3. Проверка строки с дедупликацией:"
grep -A 5 "uniqueApplicationsMap" server/routes/activity.js | head -10

echo ""
echo "=========================================="
echo "Если изменения не найдены, выполните:"
echo "  cd /var/www/mesendger"
echo "  sudo -u appuser git pull origin main"
echo "  sudo -u appuser pm2 restart mesendger-server"
echo "=========================================="

