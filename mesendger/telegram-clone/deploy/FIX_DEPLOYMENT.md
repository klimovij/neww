# 🔧 Исправление развертывания

Если репозиторий был клонирован не в `/var/www`, выполните следующие команды:

## Исправление пути

```bash
# Создайте директорию /var/www если её нет
sudo mkdir -p /var/www

# Переместите репозиторий в правильное место
sudo mv ~/mesendger /var/www/mesendger

# Или если репозиторий в другой директории, найдите его:
# find ~ -name "mesendger" -type d

# Установите правильные права
sudo chown -R appuser:appuser /var/www/mesendger

# Продолжите настройку
cd /var/www/mesendger
sudo chmod +x deploy/*.sh
sudo bash deploy/setup-server.sh
```

## Если репозиторий уже в /var/www

Просто выполните:
```bash
cd /var/www/mesendger
sudo chown -R appuser:appuser /var/www/mesendger
sudo chmod +x deploy/*.sh
sudo bash deploy/setup-server.sh
```

