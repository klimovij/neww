#!/bin/bash
set -e

INSTANCE_NAME="instance-20251117-204836"
ZONE="us-central1-c"
EXTERNAL_IP="35.232.108.72"
GIT_REPO="https://github.com/klimovij/neww.git"

echo "🚀 Начинаем развертывание мессенджера..."

# Обновление системы
echo "📦 Обновление системы..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Установка необходимых пакетов
echo "📦 Установка пакетов..."
sudo apt-get install -y git curl build-essential

# Установка Node.js 20.x если не установлен
if ! command -v node &> /dev/null; then
    echo "📦 Установка Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Установка PM2 если не установлен
if ! command -v pm2 &> /dev/null; then
    echo "📦 Установка PM2..."
    sudo npm install -g pm2
fi

# Установка nginx если не установлен
if ! command -v nginx &> /dev/null; then
    echo "📦 Установка nginx..."
    sudo apt-get install -y nginx
fi

# Создание пользователя appuser если не существует
if ! id -u appuser &>/dev/null; then
    echo "👤 Создание пользователя appuser..."
    sudo useradd -m -s /bin/bash appuser
    # Добавляем appuser в группу sudo для удобства
    sudo usermod -aG sudo appuser
fi

# Создание директорий
echo "📁 Создание директорий..."
sudo mkdir -p /var/www/mesendger
sudo mkdir -p /var/www/mesendger/logs
sudo mkdir -p /var/www/mesendger/server/uploads/avatars
sudo mkdir -p /var/www/mesendger/server/uploads/knowledge

# Клонирование репозитория
echo "📥 Клонирование репозитория..."
cd /tmp
if [ -d "mesendger-god" ]; then
    sudo rm -rf mesendger-god
fi
sudo git clone "$GIT_REPO" mesendger-god

# Копирование файлов проекта
echo "📦 Копирование файлов проекта..."
sudo rsync -av --exclude 'node_modules' \
              --exclude '.git' \
              --exclude 'build' \
              --exclude '*.log' \
              --exclude '*.db' \
              --exclude '*.db-shm' \
              --exclude '*.db-wal' \
              --exclude '*.db.bak_*' \
              mesendger-god/mesendger/telegram-clone/ /var/www/mesendger/

# Установка прав
echo "🔐 Настройка прав доступа..."
sudo chown -R appuser:appuser /var/www/mesendger

# Установка зависимостей сервера
echo "📦 Установка зависимостей сервера..."
cd /var/www/mesendger/server
sudo -u appuser npm install --production

# Сборка React приложения
echo "🏗️ Сборка React приложения..."
cd /var/www/mesendger/client-react
sudo -u appuser npm install
sudo -u appuser CI=false npm run build

# Создание env файла если его нет (проект использует файл 'env', а не '.env')
if [ ! -f "/var/www/mesendger/server/env" ]; then
    echo "📝 Создание env файла..."
    JWT_SECRET=$(openssl rand -base64 32)
    sudo -u appuser bash -c "cat > /var/www/mesendger/server/env << 'ENVEOF'
PORT=5000
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
EXTERNAL_URL=http://${EXTERNAL_IP}
CORS_ORIGINS=http://${EXTERNAL_IP},http://localhost:3000,http://localhost:3001
GEMINI_API_KEYS=
ENVEOF"
    echo "⚠️  ВАЖНО: Отредактируйте /var/www/mesendger/server/env и добавьте GEMINI_API_KEYS если нужно"
fi

# Обновление CORS в server.js для работы с внешним IP
echo "🔧 Обновление CORS в server.js..."
sudo sed -i "s|'http://localhost:3000',|'http://${EXTERNAL_IP}', 'http://localhost:3000',|g" /var/www/mesendger/server/server.js
sudo sed -i "s|'http://localhost:3001'|'http://${EXTERNAL_IP}', 'http://localhost:3001'|g" /var/www/mesendger/server/server.js

# Настройка nginx
echo "🌐 Настройка nginx..."
sudo cp /var/www/mesendger/deploy/nginx.conf /etc/nginx/sites-available/mesendger
sudo sed -i "s/YOUR_SERVER_IP_OR_DOMAIN/${EXTERNAL_IP}/g" /etc/nginx/sites-available/mesendger

# Создание симлинка
if [ -L /etc/nginx/sites-enabled/mesendger ]; then
    sudo rm /etc/nginx/sites-enabled/mesendger
fi
sudo ln -s /etc/nginx/sites-available/mesendger /etc/nginx/sites-enabled/

# Удаление дефолтной конфигурации
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

# Проверка конфигурации nginx
sudo nginx -t

# Остановка старых процессов PM2
echo "🛑 Остановка старых процессов PM2..."
sudo -u appuser pm2 stop all || true
sudo -u appuser pm2 delete all || true

# Запуск приложения через PM2
echo "🚀 Запуск приложения через PM2..."
cd /var/www/mesendger
sudo -u appuser pm2 start deploy/ecosystem.config.js
sudo -u appuser pm2 save

# Настройка автозапуска PM2
echo "⚙️ Настройка автозапуска PM2..."
sudo -u appuser pm2 startup systemd -u appuser --hp /home/appuser | grep "sudo" | bash || true

# Перезапуск nginx
echo "🔄 Перезапуск nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Настройка файрвола
echo "🔥 Настройка файрвола..."
sudo ufw --force enable || true
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

echo ""
echo "✅ Развертывание завершено!"
echo ""
echo "📊 Статус приложения:"
sudo -u appuser pm2 status
echo ""
echo "🌐 Приложение должно быть доступно по адресу: http://${EXTERNAL_IP}"
echo "📝 Логи: sudo -u appuser pm2 logs"
echo "📝 Перезапуск: sudo -u appuser pm2 restart all"

