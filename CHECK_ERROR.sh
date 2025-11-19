#!/bin/bash

# Проверка ошибок сервера

cd /var/www/mesendger

echo "=== Проверка ошибок сервера ==="
echo ""

# 1. Последние логи ошибок
echo "1. Последние ошибки:"
sudo -u appuser pm2 logs mesendger-server --lines 30 --err --nostream

# 2. Проверка синтаксиса server.js
echo ""
echo "2. Проверка синтаксиса server.js:"
cd /var/www/mesendger/server
node -c server.js 2>&1

# 3. Проверка существования необходимых файлов
echo ""
echo "3. Проверка файлов:"
ls -la /var/www/mesendger/server/server.js
ls -la /var/www/mesendger/server/uploads/avatars/ 2>/dev/null | head -3

# 4. Попытка запуска вручную для диагностики
echo ""
echo "4. Попытка запуска для диагностики:"
cd /var/www/mesendger/server
timeout 3 node server.js 2>&1 | head -20 || echo "Сервер не запустился"

echo ""
echo "=== Готово ==="

