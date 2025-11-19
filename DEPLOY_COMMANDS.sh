#!/bin/bash
# Команды для развертывания мессенджера на Google Cloud
# Скопируйте и выполните эти команды на сервере через SSH

set -e

EXTERNAL_IP="35.232.108.72"
GIT_REPO="https://github.com/klimovij/neww.git"

echo "🚀 Начинаем развертывание мессенджера..."

# 1. Обновление системы
echo "📦 Шаг 1: Обновление системы..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Установка необходимых пакетов
echo "📦 Шаг 2: Установка пакетов..."
sudo apt-get install -y git curl build-essential

# 3. Установка Node.js 20.x
echo "📦 Шаг 3: Установка Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
node --version
npm --version

# 4. Установка PM2
echo "📦 Шаг 4: Установка PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# 5. Установка nginx
echo "📦 Шаг 5: Установка nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
fi

# 6. Создание пользователя appuser
echo "👤 Шаг 6: Создание пользователя..."
if ! id -u appuser &>/dev/null; then
    sudo useradd -m -s /bin/bash appuser
    sudo usermod -aG sudo appuser
fi

# 7. Создание директорий
echo "📁 Шаг 7: Создание директорий..."
sudo mkdir -p /var/www/mesendger
sudo mkdir -p /var/www/mesendger/logs
sudo mkdir -p /var/www/mesendger/server/uploads/avatars
sudo mkdir -p /var/www/mesendger/server/uploads/knowledge

# 8. Клонирование репозитория
echo "📥 Шаг 8: Клонирование репозитория..."
cd /tmp
if [ -d "mesendger-god" ]; then
    sudo rm -rf mesendger-god
fi
sudo git clone "$GIT_REPO" mesendger-god

# 9. Копирование файлов проекта
echo "📦 Шаг 9: Копирование файлов проекта..."
sudo rsync -av --exclude 'node_modules' \
              --exclude '.git' \
              --exclude 'build' \
              --exclude '*.log' \
              --exclude '*.db' \
              --exclude '*.db-shm' \
              --exclude '*.db-wal' \
              --exclude '*.db.bak_*' \
              mesendger-god/mesendger/telegram-clone/ /var/www/mesendger/

# 10. Установка прав
echo "🔐 Шаг 10: Настройка прав доступа..."
sudo chown -R appuser:appuser /var/www/mesendger

# 11. Установка зависимостей сервера
echo "📦 Шаг 11: Установка зависимостей сервера..."
cd /var/www/mesendger/server
sudo -u appuser npm install --production

# 12. Сборка React приложения
echo "🏗️ Шаг 12: Сборка React приложения..."
cd /var/www/mesendger/client-react
sudo -u appuser npm install
sudo -u appuser CI=false npm run build

# 13. Создание env файла
echo "📝 Шаг 13: Создание env файла..."
if [ ! -f "/var/www/mesendger/server/env" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    sudo -u appuser bash -c "cat > /var/www/mesendger/server/env << 'ENVEOF'
PORT=5000
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
EXTERNAL_URL=http://${EXTERNAL_IP}
CORS_ORIGINS=http://${EXTERNAL_IP},http://localhost:3000,http://localhost:3001
GEMINI_API_KEYS=
ENVEOF"
    echo "✅ Файл env создан"
    echo "⚠️  ВАЖНО: Отредактируйте /var/www/mesendger/server/env и добавьте GEMINI_API_KEYS если нужно"
fi

# 14. Обновление CORS в server.js
echo "🔧 Шаг 14: Обновление CORS в server.js..."
sudo sed -i "s|'http://localhost:3000',|'http://${EXTERNAL_IP}', 'http://localhost:3000',|g" /var/www/mesendger/server/server.js
sudo sed -i "s|'http://localhost:3001'|'http://${EXTERNAL_IP}', 'http://localhost:3001'|g" /var/www/mesendger/server/server.js

# 15. Настройка nginx
echo "🌐 Шаг 15: Настройка nginx..."
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

# 16. Остановка старых процессов PM2
echo "🛑 Шаг 16: Остановка старых процессов PM2..."
sudo -u appuser pm2 stop all || true
sudo -u appuser pm2 delete all || true

# 17. Запуск приложения через PM2
echo "🚀 Шаг 17: Запуск приложения через PM2..."
cd /var/www/mesendger
sudo -u appuser pm2 start deploy/ecosystem.config.js
sudo -u appuser pm2 save

# 18. Настройка автозапуска PM2
echo "⚙️ Шаг 18: Настройка автозапуска PM2..."
STARTUP_CMD=$(sudo -u appuser pm2 startup systemd -u appuser --hp /home/appuser | grep "sudo")
if [ ! -z "$STARTUP_CMD" ]; then
    eval "$STARTUP_CMD"
fi

# 19. Перезапуск nginx
echo "🔄 Шаг 19: Перезапуск nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# 20. Настройка файрвола
echo "🔥 Шаг 20: Настройка файрвола..."
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
echo "🌐 Приложение доступно по адресу: http://${EXTERNAL_IP}"
echo ""
echo "📝 Полезные команды:"
echo "  Логи: sudo -u appuser pm2 logs"
echo "  Статус: sudo -u appuser pm2 status"
echo "  Перезапуск: sudo -u appuser pm2 restart all"
echo "  Остановка: sudo -u appuser pm2 stop all"

