#!/bin/bash
set -e

GIT_REPO="https://github.com/klimovij/neww.git"
WORK_DIR="/var/www/mesendger"

echo "🔄 Начинаем обновление приложения..."

# Клонирование обновленного репозитория
echo "📥 Клонирование обновленного репозитория..."
cd /tmp
if [ -d "mesendger-god" ]; then
    sudo rm -rf mesendger-god
fi
sudo git clone "$GIT_REPO" mesendger-god

# Копирование обновленных файлов
echo "📦 Копирование обновленных файлов..."
sudo rsync -av --exclude 'node_modules' \
              --exclude '.git' \
              --exclude 'build' \
              --exclude '*.log' \
              --exclude '*.db' \
              --exclude '*.db-shm' \
              --exclude '*.db-wal' \
              --exclude '*.db.bak_*' \
              mesendger-god/mesendger/telegram-clone/ "$WORK_DIR/"

# Установка прав
echo "🔐 Настройка прав доступа..."
sudo chown -R appuser:appuser "$WORK_DIR"

# Пересборка React приложения
echo "🏗️ Пересборка React приложения..."
cd "$WORK_DIR/client-react"
sudo -u appuser npm install
sudo -u appuser CI=false npm run build

# Перезапуск приложения
echo "🔄 Перезапуск приложения..."
cd "$WORK_DIR"
sudo -u appuser pm2 restart all

echo ""
echo "✅ Обновление завершено!"
echo ""
echo "📊 Статус приложения:"
sudo -u appuser pm2 status
echo ""
echo "📝 Логи: sudo -u appuser pm2 logs"
echo "📝 Перезапуск: sudo -u appuser pm2 restart all"

