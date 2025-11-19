# Быстрое развертывание на Google Cloud

## Самый простой способ (через браузер)

1. Откройте [Google Cloud Console](https://console.cloud.google.com/compute/instances)
2. Найдите вашу VM: **instance-20251117-204836**
3. Нажмите кнопку **SSH** (откроется терминал в браузере)
4. Скопируйте и вставьте следующие команды по очереди:

### Шаг 1: Обновление системы и установка пакетов
```bash
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y git curl build-essential
```

### Шаг 2: Установка Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
```

### Шаг 3: Установка PM2 и nginx
```bash
sudo npm install -g pm2
sudo apt-get install -y nginx
```

### Шаг 4: Создание пользователя и директорий
```bash
sudo useradd -m -s /bin/bash appuser || true
sudo mkdir -p /var/www/mesendger
sudo mkdir -p /var/www/mesendger/logs
sudo mkdir -p /var/www/mesendger/server/uploads/avatars
sudo mkdir -p /var/www/mesendger/server/uploads/knowledge
```

### Шаг 5: Клонирование репозитория
```bash
cd /tmp
sudo rm -rf mesendger-god
sudo git clone https://github.com/klimovij/neww.git mesendger-god
```

### Шаг 6: Копирование файлов
```bash
sudo rsync -av --exclude 'node_modules' \
              --exclude '.git' \
              --exclude 'build' \
              --exclude '*.log' \
              --exclude '*.db' \
              --exclude '*.db-shm' \
              --exclude '*.db-wal' \
              --exclude '*.db.bak_*' \
              mesendger-god/mesendger/telegram-clone/ /var/www/mesendger/
sudo chown -R appuser:appuser /var/www/mesendger
```

### Шаг 7: Установка зависимостей
```bash
# Сервер
cd /var/www/mesendger/server
sudo -u appuser npm install --production

# Клиент
cd /var/www/mesendger/client-react
sudo -u appuser npm install
sudo -u appuser CI=false npm run build
```

### Шаг 8: Создание файла env
```bash
JWT_SECRET=$(openssl rand -base64 32)
sudo -u appuser bash -c "cat > /var/www/mesendger/server/env << 'EOF'
PORT=5000
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
EXTERNAL_URL=http://35.232.108.72
CORS_ORIGINS=http://35.232.108.72,http://localhost:3000,http://localhost:3001
GEMINI_API_KEYS=
EOF"
```

### Шаг 9: Обновление CORS в server.js
```bash
sudo sed -i "s|'http://localhost:3000',|'http://35.232.108.72', 'http://localhost:3000',|g" /var/www/mesendger/server/server.js
sudo sed -i "s|'http://localhost:3001'|'http://35.232.108.72', 'http://localhost:3001'|g" /var/www/mesendger/server/server.js
```

### Шаг 10: Настройка nginx
```bash
sudo cp /var/www/mesendger/deploy/nginx.conf /etc/nginx/sites-available/mesendger
sudo sed -i "s/YOUR_SERVER_IP_OR_DOMAIN/35.232.108.72/g" /etc/nginx/sites-available/mesendger
sudo ln -sf /etc/nginx/sites-available/mesendger /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Шаг 11: Запуск приложения через PM2
```bash
cd /var/www/mesendger
sudo -u appuser pm2 start deploy/ecosystem.config.js
sudo -u appuser pm2 save
sudo -u appuser pm2 startup systemd -u appuser --hp /home/appuser | grep "sudo" | bash
```

### Шаг 12: Настройка файрвола (если нужно)
```bash
sudo ufw --force enable || true
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Шаг 13: Проверка
```bash
sudo -u appuser pm2 status
sudo systemctl status nginx
```

## Готово! 

Откройте в браузере: **http://35.232.108.72**

## Настройка файрвола Google Cloud

Если приложение не открывается, настройте файрвол в Google Cloud Console:

1. Перейдите в **VPC network** → **Firewall rules**
2. Убедитесь, что есть правила для портов 80 и 443
3. Или создайте новые:
   - **allow-http**: порт 80, источник 0.0.0.0/0
   - **allow-https**: порт 443, источник 0.0.0.0/0

## Полезные команды

```bash
# Просмотр логов
sudo -u appuser pm2 logs

# Перезапуск
sudo -u appuser pm2 restart all

# Статус
sudo -u appuser pm2 status
```

