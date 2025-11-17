# ⚡ Быстрый старт: Загрузка на GitHub и развертывание

## 🎯 Цель
Загрузить проект на GitHub и развернуть на Google Cloud сервере.

## 📋 Шаг 1: Загрузка на GitHub (на вашем компьютере)

### Вариант A: Автоматический скрипт (рекомендуется)

1. Откройте PowerShell в директории проекта:
   ```powershell
   cd C:\Users\Ronin\Desktop\mesendger-good\mesendger\telegram-clone
   ```

2. Запустите скрипт:
   ```powershell
   .\upload-to-github.ps1
   ```

Скрипт автоматически:
- Проверит установку Git
- Инициализирует репозиторий (если нужно)
- Добавит все файлы
- Создаст коммит
- Загрузит на GitHub

### Вариант B: Вручную

Если Git не установлен, сначала установите:
- Скачайте: https://git-scm.com/download/win
- Или: `winget install Git.Git`

Затем выполните:

```powershell
cd C:\Users\Ronin\Desktop\mesendger-good\mesendger\telegram-clone

# Инициализация
git init
git add .
git commit -m "Initial commit: мессенджер готов к развертыванию"
git branch -M main
git remote add origin https://github.com/klimovij/Klim.git
git push -u origin main
```

**Если репозиторий не пустой:**
```powershell
git pull origin main --allow-unrelated-histories
# Разрешите конфликты если есть, затем:
git push -u origin main
```

## 📋 Шаг 2: Развертывание на сервере

### 2.1 Подключение к серверу

**Через Google Cloud Console:**
1. Откройте https://console.cloud.google.com/compute/instances
2. Найдите `instance-20251115-102239`
3. Нажмите кнопку **"SSH"**

### 2.2 Установка Git и клонирование

На сервере выполните:

```bash
# Установка Git
sudo apt-get update
sudo apt-get install -y git

# Клонирование репозитория
cd /var/www
sudo git clone https://github.com/klimovij/Klim.git mesendger

# Создание пользователя (если нужно)
sudo useradd -m -s /bin/bash appuser
sudo chown -R appuser:appuser /var/www/mesendger
```

### 2.3 Настройка сервера

```bash
cd /var/www/mesendger

# Сделайте скрипты исполняемыми
sudo chmod +x deploy/*.sh

# Запустите настройку (установит Node.js, PM2, nginx)
sudo bash deploy/setup-server.sh
```

### 2.4 Настройка переменных окружения

```bash
cd /var/www/mesendger/server

# Создайте .env файл
sudo -u appuser nano .env
```

Добавьте:
```env
PORT=5000
NODE_ENV=production
JWT_SECRET=сгенерируйте-ключ-здесь
EXTERNAL_URL=http://34.136.222.226
CORS_ORIGINS=http://34.136.222.226
GEMINI_API_KEYS=
```

Сгенерируйте JWT_SECRET:
```bash
openssl rand -base64 32
```

### 2.5 Установка зависимостей и сборка

```bash
cd /var/www/mesendger

# Сервер
cd server
sudo -u appuser npm install --production

# Клиент
cd ../client-react
sudo -u appuser npm install
sudo -u appuser npm run build
```

### 2.6 Настройка Nginx

```bash
cd /var/www/mesendger

# Копируем и настраиваем nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/mesendger
sudo sed -i 's/YOUR_SERVER_IP_OR_DOMAIN/34.136.222.226/g' /etc/nginx/sites-available/mesendger
sudo ln -s /etc/nginx/sites-available/mesendger /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 2.7 Запуск приложения

```bash
cd /var/www/mesendger

# Запуск через PM2
sudo -u appuser pm2 start deploy/ecosystem.config.js
sudo -u appuser pm2 save
sudo -u appuser pm2 startup systemd -u appuser --hp /home/appuser
# Выполните команду, которую выведет PM2
```

### 2.8 Настройка файрвола Google Cloud

В Google Cloud Console:
1. VPC network → Firewall rules
2. Создайте правила:
   - **allow-http**: TCP порт 80
   - **allow-https**: TCP порт 443

Или через командную строку:
```bash
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 --source-ranges 0.0.0.0/0

gcloud compute firewall-rules create allow-https \
    --allow tcp:443 --source-ranges 0.0.0.0/0
```

## ✅ Проверка

Откройте в браузере: **http://34.136.222.226**

Проверка на сервере:
```bash
pm2 status
pm2 logs
sudo systemctl status nginx
```

## 🔄 Обновление приложения

Когда вносите изменения:

**На вашем компьютере:**
```powershell
cd C:\Users\Ronin\Desktop\mesendger-good\mesendger\telegram-clone
git add .
git commit -m "Описание изменений"
git push origin main
```

**На сервере:**
```bash
cd /var/www/mesendger
sudo -u appuser git pull origin main
cd server && sudo -u appuser npm install --production
cd ../client-react && sudo -u appuser npm run build
pm2 restart all
```

## 📚 Дополнительная документация

- [SETUP_GIT.md](SETUP_GIT.md) - детальная настройка Git
- [deploy/DEPLOY_FROM_GIT.md](deploy/DEPLOY_FROM_GIT.md) - полное руководство по развертыванию
- [deploy/DEPLOYMENT_GUIDE.md](deploy/DEPLOYMENT_GUIDE.md) - расширенная документация

---

**Готово!** 🎉 Ваше приложение развернуто и доступно по адресу http://34.136.222.226

