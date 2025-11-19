# Инструкция по развертыванию на Google Cloud

## Информация о сервере
- **Instance**: instance-20251117-204836
- **Zone**: us-central1-c
- **IP**: 35.232.108.72
- **OS**: Ubuntu 24.04

## Вариант 1: Через Google Cloud Console (SSH в браузере)

1. Откройте [Google Cloud Console](https://console.cloud.google.com)
2. Перейдите в **Compute Engine** → **VM instances**
3. Нажмите на вашу VM → кнопку **SSH** (откроется терминал в браузере)
4. В терминале выполните:

```bash
# Загрузите скрипт развертывания
curl -o deploy.sh https://raw.githubusercontent.com/klimovij/neww/main/deploy-server.sh
# Или скопируйте содержимое файла deploy-server.sh в терминал

# Сделайте скрипт исполняемым и запустите
chmod +x deploy.sh
bash deploy.sh
```

## Вариант 2: Через gcloud CLI (если установлен)

```powershell
# Запустите PowerShell скрипт
.\deploy-to-gcloud.ps1
```

## Вариант 3: Ручное развертывание

### Шаг 1: Подключение к серверу
```bash
# Через gcloud
gcloud compute ssh instance-20251117-204836 --zone=us-central1-c

# Или через обычный SSH (если настроены ключи)
ssh username@35.232.108.72
```

### Шаг 2: Настройка файрвола Google Cloud

В Google Cloud Console:
1. Перейдите в **VPC network** → **Firewall rules**
2. Убедитесь, что есть правила:
   - **default-allow-http** - разрешает порт 80
   - **default-allow-https** - разрешает порт 443
   - **default-allow-ssh** - разрешает порт 22

Или создайте через консоль:
```bash
# HTTP
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTP traffic"

# HTTPS
gcloud compute firewall-rules create allow-https \
    --allow tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTPS traffic"
```

### Шаг 3: Выполнение скрипта развертывания

На сервере выполните команды из файла `deploy-server.sh` или загрузите его:

```bash
# Загрузить скрипт с вашего компьютера через SCP
# (выполните на вашем компьютере)
scp deploy-server.sh username@35.232.108.72:~/

# На сервере
chmod +x ~/deploy-server.sh
bash ~/deploy-server.sh
```

## Проверка развертывания

После завершения скрипта:

1. **Проверьте статус приложения:**
```bash
sudo -u appuser pm2 status
```

2. **Проверьте логи:**
```bash
sudo -u appuser pm2 logs
```

3. **Проверьте nginx:**
```bash
sudo systemctl status nginx
```

4. **Откройте в браузере:**
   - http://35.232.108.72

## Полезные команды

```bash
# Перезапуск приложения
sudo -u appuser pm2 restart all

# Остановка приложения
sudo -u appuser pm2 stop all

# Просмотр логов в реальном времени
sudo -u appuser pm2 logs --lines 50

# Перезапуск nginx
sudo systemctl restart nginx

# Проверка конфигурации nginx
sudo nginx -t
```

## Устранение проблем

### Приложение не запускается
```bash
# Проверьте логи
sudo -u appuser pm2 logs mesendger-server

# Проверьте, что порт 5000 свободен
sudo netstat -tlnp | grep 5000
```

### Ошибки подключения
1. Проверьте файрвол Google Cloud
2. Проверьте, что nginx запущен: `sudo systemctl status nginx`
3. Проверьте логи nginx: `sudo tail -f /var/log/nginx/mesendger-error.log`

### Проблемы с базой данных
```bash
# Проверьте права на базу данных
ls -la /var/www/mesendger/server/messenger.db
sudo chown appuser:appuser /var/www/mesendger/server/messenger.db
```

## Обновление приложения

```bash
cd /var/www/mesendger
sudo git pull  # если используете git

# Переустановите зависимости (если нужно)
cd server && sudo -u appuser npm install --production
cd ../client-react && sudo -u appuser npm run build

# Перезапустите приложение
sudo -u appuser pm2 restart all
```

