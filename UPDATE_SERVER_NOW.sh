#!/bin/bash
# Скрипт для быстрого обновления кода на сервере
# Выполните этот скрипт на сервере через SSH

set -e

EXTERNAL_IP="35.232.108.72"
APP_DIR="/var/www/mesendger"
GIT_REPO="https://github.com/klimovij/neww.git"

echo "🚀 Обновление кода на сервере..."

# Обновление кода из Git
echo "📥 Обновление кода из Git..."
cd /tmp
if [ -d "mesendger-god" ]; then
    sudo rm -rf mesendger-god
fi
sudo git clone "$GIT_REPO" mesendger-god

# Копирование обновленных файлов
echo "📦 Копирование обновленных файлов..."
sudo rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'build' --exclude '*.log' --exclude '*.db*' mesendger-god/mesendger/telegram-clone/ "$APP_DIR/"

# Установка прав
sudo chown -R appuser:appuser "$APP_DIR"

# Обновление зависимостей сервера (если нужно)
echo "📦 Проверка зависимостей сервера..."
cd "$APP_DIR/server"
sudo -u appuser npm install --production

# Сборка React приложения
echo "🏗️ Сборка React приложения..."
cd "$APP_DIR/client-react"
sudo -u appuser npm install
sudo -u appuser CI=false npm run build

# Перезапуск приложения через PM2
echo "🔄 Перезапуск приложения..."
sudo -u appuser pm2 restart all

echo ""
echo "✅ Обновление завершено!"
echo ""
echo "📊 Статус приложения:"
sudo -u appuser pm2 status

echo ""
echo "📝 Логи (последние 20 строк):"
sudo -u appuser pm2 logs --lines 20 --nostream

