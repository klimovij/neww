#!/bin/bash
# Быстрый скрипт развертывания (для опытных пользователей)
# Использование: sudo bash quick-deploy.sh

set -e

echo "🚀 Быстрое развертывание мессенджера..."

# Проверка прав
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с sudo"
    exit 1
fi

DEPLOY_DIR="/var/www/mesendger"
PROJECT_ROOT="$(dirname "$(readlink -f "$0")")/.."

# 1. Установка зависимостей системы (если еще не установлены)
if ! command -v node &> /dev/null; then
    echo "📦 Установка Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "📦 Установка PM2..."
    npm install -g pm2
fi

if ! command -v nginx &> /dev/null; then
    echo "📦 Установка nginx..."
    apt-get install -y nginx
fi

# 2. Создание директорий
mkdir -p "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/logs"
mkdir -p "$DEPLOY_DIR/server/uploads/avatars"
mkdir -p "$DEPLOY_DIR/server/uploads/knowledge"

# 3. Копирование файлов (если код уже на сервере)
if [ -d "$PROJECT_ROOT/server" ]; then
    echo "📦 Копирование файлов..."
    rsync -av --exclude 'node_modules' \
              --exclude '.git' \
              --exclude 'build' \
              --exclude '*.log' \
              "$PROJECT_ROOT/" "$DEPLOY_DIR/"
fi

# 4. Установка прав
chown -R appuser:appuser "$DEPLOY_DIR" 2>/dev/null || {
    echo "⚠️  Пользователь appuser не найден, создаем..."
    useradd -m -s /bin/bash appuser 2>/dev/null || true
    chown -R appuser:appuser "$DEPLOY_DIR"
}

# 5. Установка зависимостей
echo "📦 Установка зависимостей..."
cd "$DEPLOY_DIR/server"
sudo -u appuser npm install --production || npm install --production

cd "$DEPLOY_DIR/client-react"
sudo -u appuser npm install || npm install
sudo -u appuser npm run build || npm run build

# 6. Создание .env
if [ ! -f "$DEPLOY_DIR/server/.env" ]; then
    echo "📝 Создание .env файла..."
    cat > "$DEPLOY_DIR/server/.env" << EOF
PORT=5000
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
EXTERNAL_URL=http://$(curl -s ifconfig.me || echo "34.136.222.226")
CORS_ORIGINS=http://$(curl -s ifconfig.me || echo "34.136.222.226")
GEMINI_API_KEYS=
EOF
    chown appuser:appuser "$DEPLOY_DIR/server/.env"
    echo "⚠️  Отредактируйте $DEPLOY_DIR/server/.env при необходимости"
fi

# 7. Настройка nginx
if [ ! -f "/etc/nginx/sites-enabled/mesendger" ]; then
    echo "🌐 Настройка nginx..."
    EXTERNAL_IP=$(curl -s ifconfig.me || echo "34.136.222.226")
    sed "s/YOUR_SERVER_IP_OR_DOMAIN/$EXTERNAL_IP/g" "$DEPLOY_DIR/deploy/nginx.conf" > /tmp/nginx-mesendger.conf
    cp /tmp/nginx-mesendger.conf /etc/nginx/sites-available/mesendger
    ln -sf /etc/nginx/sites-available/mesendger /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl restart nginx
fi

# 8. Запуск через PM2
echo "🚀 Запуск приложения..."
cd "$DEPLOY_DIR"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
sudo -u appuser pm2 start deploy/ecosystem.config.js || pm2 start deploy/ecosystem.config.js
pm2 save

echo "✅ Развертывание завершено!"
echo ""
echo "📊 Статус:"
pm2 status
echo ""
echo "🌐 Приложение доступно по адресу: http://$EXTERNAL_IP"
echo "📝 Логи: pm2 logs"

