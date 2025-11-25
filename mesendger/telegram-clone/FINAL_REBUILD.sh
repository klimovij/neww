#!/bin/bash

# Финальная пересборка фронтенда

set -e

echo "🔨 Финальная пересборка фронтенда..."
echo ""

cd /var/www/mesendger/mesendger/telegram-clone

echo "📥 Обновление кода..."
sudo -u appuser git pull origin main

echo ""
echo "🔨 Пересборка frontend..."
cd client-react
sudo -u appuser npm run build 2>&1 | tail -20

echo ""
echo "🔄 Перезагрузка Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Фронтенд пересобран!"
echo ""
echo "📋 Теперь в браузере:"
echo "   1. Обновите страницу (Ctrl+Shift+R)"
echo "   2. Откройте модалку 'Мониторинг времени'"
echo "   3. Даты должны быть в киевском времени"
echo "   4. Выберите сегодняшнюю дату"
echo "   5. Проверьте, что данные появляются"

