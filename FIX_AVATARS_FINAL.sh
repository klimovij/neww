#!/bin/bash

# Скрипт для исправления аватарок на сервере

cd /var/www/mesendger

echo "=== Исправление аватарок ==="
echo ""

# 1. Проверка существующих файлов
echo "1. Существующие файлы в server/uploads/avatars/:"
ls -la /var/www/mesendger/server/uploads/avatars/*.{png,jpg} 2>/dev/null

echo ""
echo "2. Существующие файлы в uploads/avatars/:"
ls -la /var/www/mesendger/uploads/avatars/*.{png,jpg} 2>/dev/null | head -5

echo ""

# 3. Находим первый существующий файл
FIRST_AVATAR=$(ls /var/www/mesendger/server/uploads/avatars/*.png 2>/dev/null | head -1)
if [ -z "$FIRST_AVATAR" ]; then
    FIRST_AVATAR=$(ls /var/www/mesendger/uploads/avatars/*.png 2>/dev/null | head -1)
fi

if [ -n "$FIRST_AVATAR" ]; then
    AVATAR_NAME=$(basename "$FIRST_AVATAR")
    
    # Определяем правильный путь в зависимости от расположения файла
    if [[ "$FIRST_AVATAR" == *"/server/uploads/avatars/"* ]]; then
        AVATAR_PATH="/uploads/avatars/$AVATAR_NAME"
    else
        AVATAR_PATH="/uploads/avatars/$AVATAR_NAME"
    fi
    
    echo "3. Используем файл: $AVATAR_NAME"
    echo "   Путь для базы: $AVATAR_PATH"
    echo ""
    
    # 4. Обновление всех пользователей
    echo "4. Обновление путей в базе данных..."
    sudo -u appuser sqlite3 messenger.db "UPDATE users SET avatar = '$AVATAR_PATH' WHERE avatar IS NOT NULL AND avatar != '';"
    
    echo "5. Проверка результата:"
    sudo -u appuser sqlite3 messenger.db "SELECT id, username, avatar FROM users LIMIT 5;"
else
    echo "Файлы аватарок не найдены!"
fi

echo ""
echo "=== Проверка прав доступа ==="
# Проверка прав на директорию uploads
ls -ld /var/www/mesendger/server/uploads/avatars/
ls -ld /var/www/mesendger/uploads/avatars/ 2>/dev/null || echo "Директория /var/www/mesendger/uploads/avatars/ не существует"

echo ""
echo "=== Проверка конфигурации Nginx ==="
sudo nginx -t

echo ""
echo "=== Готово ==="

