# Быстрое обновление сервера

## Вариант 1: Через одну команду (рекомендуется)

Подключитесь к серверу через SSH и выполните:

```bash
bash <(curl -s https://raw.githubusercontent.com/klimovij/neww/main/mesendger/telegram-clone/deploy/update-server.sh)
```

## Вариант 2: Если нет curl

```bash
cd /tmp && wget -O update.sh https://raw.githubusercontent.com/klimovij/neww/main/mesendger/telegram-clone/deploy/update-server.sh && bash update.sh
```

## Вариант 3: Вручную

```bash
cd /tmp
sudo rm -rf mesendger-god
sudo git clone https://github.com/klimovij/neww.git mesendger-god
sudo rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'build' --exclude '*.log' --exclude '*.db*' mesendger-god/mesendger/telegram-clone/ /var/www/mesendger/
sudo chown -R appuser:appuser /var/www/mesendger
cd /var/www/mesendger/server
sudo -u appuser npm install --production
cd /var/www/mesendger/client-react
sudo -u appuser npm install
sudo -u appuser CI=false npm run build
sudo -u appuser pm2 restart all
sudo -u appuser pm2 status
```

