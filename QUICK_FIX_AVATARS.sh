#!/bin/bash

# Быстрое исправление проблемы с аватарками

cd /var/www/mesendger

echo "=== Быстрое исправление аватарок ==="
echo ""

# 1. Обновление кода с GitHub
echo "1. Обновление кода..."
cd /tmp
sudo rm -rf mesendger-god 2>/dev/null
sudo git clone https://github.com/klimovij/neww.git mesendger-god
sudo rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'build' --exclude '*.log' --exclude '*.db*' /tmp/mesendger-god/mesendger/telegram-clone/server/ /var/www/mesendger/server/

# 2. Перемещение существующих файлов из uploads в server/uploads
echo ""
echo "2. Перемещение существующих файлов..."
if [ -d "/var/www/mesendger/uploads/avatars" ]; then
    sudo mkdir -p /var/www/mesendger/server/uploads/avatars
    sudo cp -r /var/www/mesendger/uploads/avatars/* /var/www/mesendger/server/uploads/avatars/ 2>/dev/null
    echo "Файлы скопированы"
fi

# 3. Обновление путей в базе данных для всех пользователей
echo ""
echo "3. Обновление путей в базе данных..."
# Находим все существующие файлы
EXISTING_FILES=$(ls /var/www/mesendger/server/uploads/avatars/*.{png,jpg,jpeg} 2>/dev/null | head -5)
if [ -n "$EXISTING_FILES" ]; then
    FIRST_FILE=$(echo "$EXISTING_FILES" | head -1)
    AVATAR_NAME=$(basename "$FIRST_FILE")
    AVATAR_PATH="/uploads/avatars/$AVATAR_NAME"
    
    # Обновляем всех пользователей с несуществующими путями
    sudo -u appuser sqlite3 /var/www/mesendger/messenger.db "
        UPDATE users 
        SET avatar = '$AVATAR_PATH' 
        WHERE avatar IS NOT NULL 
        AND avatar != '' 
        AND avatar NOT LIKE '%$AVATAR_NAME%';
    "
    echo "Пути обновлены"
fi

# 4. Перезапуск PM2
echo ""
echo "4. Перезапуск сервера..."
cd /var/www/mesendger
sudo -u appuser pm2 restart all

# 5. Проверка статуса
echo ""
echo "5. Статус сервера:"
sudo -u appuser pm2 status

echo ""
echo "=== Готово! ==="
echo "Теперь перелогиньтесь в браузере, чтобы получить обновленные данные."

