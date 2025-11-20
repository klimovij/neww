#!/bin/bash
# Выполнить на сервере: sudo bash <(curl -s) или скопировать содержимое и выполнить

cd /var/www/mesendger

echo "🔐 Настройка прав доступа..."

# 1. Устанавливаем владельца для всего проекта
chown -R appuser:appuser /var/www/mesendger

# 2. Права на директории
find /var/www/mesendger -type d -exec chmod 755 {} \;

# 3. Права на файлы
find /var/www/mesendger -type f -exec chmod 644 {} \;

# 4. Права на скрипты
find /var/www/mesendger -type f -name "*.sh" -exec chmod 755 {} \;

# 5. Права на базу данных (666 для записи)
chmod 666 /var/www/mesendger/messenger.db 2>/dev/null || true
chmod 666 /var/www/mesendger/messenger.db-shm 2>/dev/null || true
chmod 666 /var/www/mesendger/messenger.db-wal 2>/dev/null || true
find /var/www/mesendger -type f -name "*.db" -exec chmod 666 {} \;
find /var/www/mesendger -type f -name "*.db-shm" -exec chmod 666 {} \;
find /var/www/mesendger -type f -name "*.db-wal" -exec chmod 666 {} \;

# 6. Создаём и настраиваем директории для записи
mkdir -p /var/www/mesendger/server/uploads/avatars
mkdir -p /var/www/mesendger/server/uploads/documents
mkdir -p /var/www/mesendger/client-react/build
mkdir -p /var/www/mesendger/logs
chmod 775 /var/www/mesendger/server/uploads
chmod 775 /var/www/mesendger/server/uploads/avatars
chmod 775 /var/www/mesendger/server/uploads/documents
chmod 775 /var/www/mesendger/client-react/build
chmod 775 /var/www/mesendger/logs
chown -R appuser:appuser /var/www/mesendger/server/uploads
chown -R appuser:appuser /var/www/mesendger/client-react/build
chown -R appuser:appuser /var/www/mesendger/logs

# 7. Git safe.directory
sudo -u appuser git config --global --add safe.directory /var/www/mesendger 2>/dev/null || true

echo "✅ Готово! Все права настроены."

