#!/bin/bash

# Скрипт для проверки статуса сервера и аватарок

echo "=== Проверка статуса сервера ==="
cd /var/www/mesendger

# 1. Статус PM2
echo "1. Статус PM2:"
sudo -u appuser pm2 status

# 2. Последние логи сервера
echo ""
echo "2. Последние логи сервера (последние 10 строк):"
sudo -u appuser pm2 logs mesendger-server --lines 10 --nostream

# 3. Проверка данных пользователей в базе
echo ""
echo "3. Данные пользователей в базе:"
sudo -u appuser sqlite3 messenger.db "SELECT id, username, avatar FROM users LIMIT 5;"

# 4. Проверка доступности аватарок через Nginx
echo ""
echo "4. Проверка доступности аватарок:"
curl -I http://localhost/uploads/avatars/1760984942433-378417123.png 2>&1 | head -3
curl -I http://localhost/uploads/avatars/1760984959900-378051061.jpg 2>&1 | head -3

# 5. Проверка, что клиент пересобран
echo ""
echo "5. Проверка сборки клиента:"
ls -lh /var/www/mesendger/client-react/build/static/js/main.*.js 2>/dev/null | head -1 || echo "Файлы сборки не найдены"

echo ""
echo "=== Готово ==="

