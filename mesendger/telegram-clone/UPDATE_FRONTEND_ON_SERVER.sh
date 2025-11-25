#!/bin/bash

# Скрипт для обновления frontend на сервере
# Выполняется на сервере от пользователя appuser

set -e  # Остановить при ошибке

echo "🔄 [1/4] Обновление кода из Git..."
cd /var/www/mesendger
sudo -u appuser git pull origin main

echo "🔄 [2/4] Переход в директорию client-react..."
cd /var/www/mesendger/mesendger/telegram-clone/client-react

echo "🔄 [3/4] Удаление старой сборки..."
sudo rm -rf build

echo "🔄 [4/4] Сборка frontend..."
sudo -u appuser npm run build

echo "🔄 [5/5] Перезапуск PM2 сервера..."
sudo -u appuser pm2 restart mesendger-server

echo "✅ Обновление завершено!"
echo ""
echo "📋 Проверьте логи:"
echo "   sudo -u appuser pm2 logs mesendger-server --lines 50"
echo ""
echo "🔍 Проверьте версию в браузере:"
echo "   Откройте DevTools → Console → найдите 'НАЧАЛО КОМПОНЕНТА V4.0'"

