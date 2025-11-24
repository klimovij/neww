#!/bin/bash
# Скрипт для обновления сервера с исправлениями для отображения активности

echo "=== ОБНОВЛЕНИЕ СЕРВЕРА ==="
echo ""

# Переходим в директорию проекта
cd /var/www/mesendger || exit 1

echo "1. Обновление кода из Git..."
sudo -u appuser git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при git pull"
    exit 1
fi

echo "✅ Код обновлён"
echo ""

echo "2. Проверка изменений в quickCsvReport.js..."
if grep -q "username: user" server/routes/quickCsvReport.js; then
    echo "✅ Исправление присутствует в quickCsvReport.js"
else
    echo "❌ Исправление НЕ найдено в quickCsvReport.js!"
    echo "Проверьте файл вручную"
    exit 1
fi
echo ""

echo "3. Пересборка frontend..."
cd client-react || exit 1
sudo -u appuser npm install
sudo -u appuser CI=false npm run build

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при сборке frontend"
    exit 1
fi

echo "✅ Frontend пересобран"
cd ..
echo ""

echo "4. Перезапуск сервера..."
sudo -u appuser pm2 restart all

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при перезапуске PM2"
    exit 1
fi

echo "✅ Сервер перезапущен"
echo ""

echo "5. Проверка статуса PM2..."
sudo -u appuser pm2 status

echo ""
echo "=== ОБНОВЛЕНИЕ ЗАВЕРШЕНО ==="
echo ""
echo "Проверьте логи:"
echo "  sudo -u appuser pm2 logs mesendger-server --lines 50"
echo ""
echo "Проверьте API:"
echo "  curl 'http://localhost/api/quick-db-report?start=2025-11-24&end=2025-11-24' | jq '.report[0] | {username, fio}'"

