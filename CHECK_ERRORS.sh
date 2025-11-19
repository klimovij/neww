#!/bin/bash
# Проверка ошибок приложения

echo "📋 Проверка логов PM2..."
sudo -u appuser pm2 logs mesendger-server --lines 50 --nostream

echo ""
echo "📋 Проверка файлов..."
ls -la /var/www/mesendger/server/server.js
ls -la /var/www/mesendger/deploy/ecosystem.config.js

echo ""
echo "📋 Проверка env файла..."
ls -la /var/www/mesendger/server/env

echo ""
echo "📋 Проверка прав доступа..."
ls -ld /var/www/mesendger

