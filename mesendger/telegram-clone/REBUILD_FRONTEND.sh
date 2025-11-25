#!/bin/bash

# Пересборка фронтенда с последними изменениями

set -e

echo "🔨 Пересборка фронтенда..."
echo ""

cd /var/www/mesendger/mesendger/telegram-clone

echo "📥 Обновление кода..."
sudo -u appuser git pull origin main

echo ""
echo "🔨 Пересборка frontend..."
cd client-react
sudo -u appuser npm run build

echo ""
echo "🔄 Перезагрузка Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Фронтенд пересобран и обновлён!"
echo ""
echo "📋 Теперь:"
echo "   1. Подождите несколько минут, пока агент отправит новые данные"
echo "   2. Откройте модалку 'Мониторинг времени'"
echo "   3. Выберите сегодняшнюю дату"
echo "   4. Проверьте, что данные появляются"

