# 📦 Развертывание с GitHub на Google Cloud

## Предварительно

Убедитесь, что код загружен на GitHub:
- Репозиторий: https://github.com/klimovij/Klim.git
- Все файлы закоммичены и запушены

## Шаг 1: Подключение к серверу

### Через Google Cloud Console:
1. Откройте [Google Cloud Console](https://console.cloud.google.com/compute/instances)
2. Найдите инстанс `instance-20251115-102239`
3. Нажмите кнопку **"SSH"**

### Или через командную строку:
```bash
gcloud compute ssh instance-20251115-102239 --zone=us-central1-c
```

## Шаг 2: Установка Git на сервере

```bash
# Обновление системы
sudo apt-get update

# Установка Git
sudo apt-get install -y git

# Проверка установки
git --version
```

## Шаг 3: Клонирование репозитория

```bash
# Перейдите в директорию для веб-приложений
cd /var/www

# Клонируйте репозиторий
sudo git clone https://github.com/klimovij/Klim.git mesendger

# Установите правильные права
sudo chown -R appuser:appuser /var/www/mesendger

# Если пользователя appuser еще нет, создайте его:
sudo useradd -m -s /bin/bash appuser
sudo chown -R appuser:appuser /var/www/mesendger
```

## Шаг 4: Первоначальная настройка сервера

```bash
cd /var/www/mesendger

# Сделайте скрипты исполняемыми
sudo chmod +x deploy/*.sh

# Запустите скрипт настройки (установит Node.js, PM2, nginx)
sudo bash deploy/setup-server.sh
```

## Шаг 5: Настройка переменных окружения

```bash
cd /var/www/mesendger/server

# Создайте .env файл
sudo -u appuser nano .env
```

Добавьте следующее содержимое:

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=сгенерируйте-безопасный-ключ-здесь
EXTERNAL_URL=http://34.136.222.226
CORS_ORIGINS=http://34.136.222.226
GEMINI_API_KEYS=
```

**Сгенерируйте JWT_SECRET:**
```bash
openssl rand -base64 32
```

## Шаг 6: Установка зависимостей и сборка

```bash
cd /var/www/mesendger

# Установка зависимостей сервера
cd server
sudo -u appuser npm install --production

# Сборка React приложения
cd ../client-react
sudo -u appuser npm install
sudo -u appuser npm run build
```

## Шаг 7: Настройка Nginx

```bash
cd /var/www/mesendger

# Копируем конфигурацию nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/mesendger

# Редактируем конфигурацию (замените YOUR_SERVER_IP_OR_DOMAIN на 34.136.222.226)
sudo sed -i 's/YOUR_SERVER_IP_OR_DOMAIN/34.136.222.226/g' /etc/nginx/sites-available/mesendger

# Создаем симлинк
sudo ln -s /etc/nginx/sites-available/mesendger /etc/nginx/sites-enabled/

# Удаляем дефолтную конфигурацию
sudo rm -f /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Шаг 8: Запуск приложения через PM2

```bash
cd /var/www/mesendger

# Запуск через PM2
sudo -u appuser pm2 start deploy/ecosystem.config.js

# Сохранение конфигурации
sudo -u appuser pm2 save

# Настройка автозапуска
sudo -u appuser pm2 startup systemd -u appuser --hp /home/appuser
# Выполните команду, которую выведет PM2
```

## Шаг 9: Настройка файрвола Google Cloud

В Google Cloud Console:

1. Перейдите в **VPC network** → **Firewall rules**
2. Создайте правила:
   - **allow-http**: TCP порт 80, источник 0.0.0.0/0
   - **allow-https**: TCP порт 443, источник 0.0.0.0/0

Или через командную строку:
```bash
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTP traffic"

gcloud compute firewall-rules create allow-https \
    --allow tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTPS traffic"
```

## Шаг 10: Проверка

```bash
# Проверка статуса PM2
pm2 status

# Просмотр логов
pm2 logs

# Проверка nginx
sudo systemctl status nginx
```

Откройте в браузере: **http://34.136.222.226**

## 🔄 Обновление приложения (когда вносите изменения)

```bash
cd /var/www/mesendger

# Получите последние изменения с GitHub
sudo -u appuser git pull origin main

# Переустановите зависимости (если изменились package.json)
cd server
sudo -u appuser npm install --production

cd ../client-react
sudo -u appuser npm install
sudo -u appuser npm run build

# Перезапустите приложение
pm2 restart all
```

## 📝 Полезные команды

```bash
# Просмотр статуса
pm2 status
pm2 monit

# Просмотр логов
pm2 logs
pm2 logs --lines 100

# Перезапуск
pm2 restart all

# Остановка
pm2 stop all

# Просмотр логов nginx
sudo tail -f /var/log/nginx/mesendger-error.log
sudo tail -f /var/log/nginx/mesendger-access.log
```

## 🆘 Решение проблем

### Приложение не запускается
```bash
pm2 logs mesendger-server
sudo tail -f /var/log/nginx/error.log
```

### Ошибки подключения
- Проверьте файрвол в Google Cloud
- Проверьте, что nginx запущен: `sudo systemctl status nginx`
- Проверьте порты: `sudo netstat -tlnp | grep -E ':(80|5000)'`

### Проблемы с правами доступа
```bash
sudo chown -R appuser:appuser /var/www/mesendger
```

---

**Готово!** Приложение должно быть доступно по адресу http://34.136.222.226

