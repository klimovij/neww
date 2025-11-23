# Инструкция по обновлению сервера

## Быстрое обновление кода на сервере

### Вариант 1: Использование скрипта (рекомендуется)

1. Подключитесь к серверу через SSH:
   ```bash
   ssh username@35.232.108.72
   ```

2. Загрузите скрипт обновления на сервер:
   ```bash
   # На вашем компьютере (PowerShell):
   scp update-server.sh username@35.232.108.72:/tmp/
   ```

3. Выполните скрипт на сервере:
   ```bash
   sudo bash /tmp/update-server.sh
   ```

### Вариант 2: Обновление вручную

Выполните команды на сервере:

```bash
# 1. Обновление кода из Git
cd /tmp
sudo rm -rf mesendger-god
sudo git clone https://github.com/klimovij/neww.git mesendger-god

# 2. Копирование обновленных файлов
sudo rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'build' --exclude '*.log' --exclude '*.db*' mesendger-god/mesendger/telegram-clone/ /var/www/mesendger/

# 3. Установка прав
sudo chown -R appuser:appuser /var/www/mesendger

# 4. Обновление зависимостей сервера (если нужно)
cd /var/www/mesendger/server
sudo -u appuser npm install --production

# 5. Сборка React приложения
cd /var/www/mesendger/client-react
sudo -u appuser npm install
sudo -u appuser CI=false npm run build

# 6. Перезапуск приложения через PM2
sudo -u appuser pm2 restart all

# 7. Проверка статуса
sudo -u appuser pm2 status
```

### Проверка обновления

После обновления проверьте:
- Статус приложения: `sudo -u appuser pm2 status`
- Логи приложения: `sudo -u appuser pm2 logs --lines 50`
- Веб-интерфейс: откройте http://35.232.108.72 в браузере

