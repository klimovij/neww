#!/bin/bash
# Скрипт для развертывания приложения
# Запускать из директории проекта: bash deploy/deploy-app.sh

set -e

# Определяем корневую директорию проекта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="/var/www/mesendger"

echo "🚀 Начинаем развертывание приложения..."
echo "📂 Проект: $PROJECT_ROOT"
echo "📂 Целевая директория: $DEPLOY_DIR"

# Проверка прав
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с sudo: sudo bash deploy/deploy-app.sh"
    exit 1
fi

# Копирование файлов проекта
echo "📦 Копирование файлов..."
rsync -av --exclude 'node_modules' \
          --exclude '.git' \
          --exclude 'build' \
          --exclude '*.log' \
          --exclude '.env' \
          "$PROJECT_ROOT/" "$DEPLOY_DIR/"

# Установка прав
chown -R appuser:appuser "$DEPLOY_DIR"

# Переключение на пользователя appuser для установки зависимостей
echo "📦 Установка зависимостей сервера..."
cd "$DEPLOY_DIR/server"
sudo -u appuser npm install --production

echo "📦 Сборка React приложения..."
cd "$DEPLOY_DIR/client-react"
sudo -u appuser npm install
sudo -u appuser npm run build

# Создание .env файла если его нет
if [ ! -f "$DEPLOY_DIR/server/.env" ]; then
    echo "📝 Создание .env файла..."
    cat > "$DEPLOY_DIR/server/.env" << EOF
PORT=5000
JWT_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
GEMINI_API_KEYS=
EOF
    chown appuser:appuser "$DEPLOY_DIR/server/.env"
    echo "⚠️  ВАЖНО: Отредактируйте $DEPLOY_DIR/server/.env и добавьте GEMINI_API_KEYS если нужно"
fi

# Создание директорий для загрузок
mkdir -p "$DEPLOY_DIR/server/uploads/avatars"
mkdir -p "$DEPLOY_DIR/server/uploads/knowledge"
chown -R appuser:appuser "$DEPLOY_DIR/server/uploads"

# Остановка старых процессов PM2
echo "🛑 Остановка старых процессов..."
pm2 stop all || true
pm2 delete all || true

# Запуск приложения через PM2
echo "🚀 Запуск приложения через PM2..."
cd "$DEPLOY_DIR"
sudo -u appuser pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup systemd -u appuser --hp /home/appuser

# Перезапуск nginx
echo "🔄 Перезапуск nginx..."
systemctl restart nginx
systemctl enable nginx

echo "✅ Развертывание завершено!"
echo ""
echo "📊 Проверка статуса:"
pm2 status
echo ""
echo "🌐 Приложение должно быть доступно по адресу: http://YOUR_SERVER_IP"
echo "📝 Логи: pm2 logs"
echo "📝 Перезапуск: pm2 restart all"

