#!/bin/bash
# Скрипт для исправления пути PM2

echo "🔧 Исправление конфигурации PM2..."

# Останавливаем PM2
sudo -u appuser pm2 stop all
sudo -u appuser pm2 delete all

# Запускаем с правильной конфигурацией
cd /var/www/mesendger/mesendger/telegram-clone
sudo -u appuser pm2 start deploy/ecosystem.config.js

# Сохраняем конфигурацию
sudo -u appuser pm2 save

# Проверяем статус
sudo -u appuser pm2 show mesendger-server | grep -E "script path|exec cwd"

echo "✅ PM2 обновлён!"

