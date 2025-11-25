#!/bin/bash

# Перезапуск PM2 с обновлённым кодом

set -e

echo "🔄 Перезапуск PM2..."
echo ""

cd /var/www/mesendger/mesendger/telegram-clone

echo "📥 Обновление кода..."
sudo -u appuser git pull origin main

echo ""
echo "🔄 Перезапуск PM2..."
sudo -u appuser pm2 restart all

echo ""
echo "⏳ Ожидание запуска (3 секунды)..."
sleep 3

echo ""
echo "📊 Статус PM2:"
sudo -u appuser pm2 list

echo ""
echo "✅ PM2 перезапущен!"
echo ""
echo "📋 Теперь quick-db-report будет включать пользователей из activity_logs," 
echo "   даже если нет login/logout событий"

