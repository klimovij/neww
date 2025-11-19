#!/bin/bash

# Скрипт для диагностики и исправления проблем с аватарками

echo "=== Диагностика аватарок ==="
echo ""

cd /var/www/mesendger

# 1. Проверка базы данных
echo "1. Проверка путей к аватаркам в базе данных:"
sudo -u appuser sqlite3 messenger.db "SELECT id, username, avatar FROM users WHERE avatar IS NOT NULL AND avatar != '' LIMIT 10;"
echo ""

# 2. Проверка существующих файлов
echo "2. Проверка существующих файлов аватарок:"
ls -la /var/www/mesendger/server/uploads/avatars/ 2>/dev/null | head -15
echo ""

# 3. Получение списка всех аватарок из базы
echo "3. Все пути к аватаркам в базе:"
sudo -u appuser sqlite3 messenger.db "SELECT DISTINCT avatar FROM users WHERE avatar IS NOT NULL AND avatar != '';"
echo ""

# 4. Поиск существующих файлов
echo "4. Поиск существующих файлов аватарок:"
EXISTING_AVATARS=$(ls /var/www/mesendger/server/uploads/avatars/*.{png,jpg,jpeg} 2>/dev/null | head -5)
if [ -n "$EXISTING_AVATARS" ]; then
    echo "Найдены файлы:"
    echo "$EXISTING_AVATARS"
    echo ""
    
    # Берем первый существующий файл
    FIRST_AVATAR=$(echo "$EXISTING_AVATARS" | head -1)
    AVATAR_NAME=$(basename "$FIRST_AVATAR")
    AVATAR_PATH="/uploads/avatars/$AVATAR_NAME"
    echo "Используем файл: $AVATAR_NAME"
    echo "Путь для базы: $AVATAR_PATH"
    echo ""
    
    # 5. Проверка, какие пользователи имеют несуществующие аватарки
    echo "5. Проверка пользователей с несуществующими аватарками:"
    sudo -u appuser sqlite3 messenger.db "SELECT id, username, avatar FROM users WHERE avatar IS NOT NULL AND avatar != '';" | while IFS='|' read -r uid username avatar_path; do
        if [ -n "$avatar_path" ]; then
            # Извлекаем имя файла из пути
            filename=$(basename "$avatar_path" 2>/dev/null || echo "$avatar_path")
            # Проверяем существование файла
            if [ ! -f "/var/www/mesendger/server/uploads/avatars/$filename" ]; then
                echo "Пользователь $uid ($username) имеет несуществующий путь: $avatar_path"
            fi
        fi
    done
    echo ""
    
    # 6. Обновление всех пользователей с несуществующими или пустыми аватарками
    echo "6. Обновление путей к аватаркам в базе данных..."
    sudo -u appuser sqlite3 messenger.db "
        UPDATE users 
        SET avatar = '$AVATAR_PATH' 
        WHERE (avatar IS NULL OR avatar = '' OR avatar NOT LIKE '%$AVATAR_NAME%');
    "
    echo "Обновлено."
    echo ""
    
    # 7. Проверка результата
    echo "7. Проверка обновленных данных:"
    sudo -u appuser sqlite3 messenger.db "SELECT id, username, avatar FROM users LIMIT 5;"
else
    echo "Файлы аватарок не найдены в /var/www/mesendger/server/uploads/avatars/"
    echo "Проверяем альтернативные пути..."
    find /var/www/mesendger -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" | grep -i avatar | head -5
fi

echo ""
echo "=== Проверка доступности через Nginx ==="
if [ -n "$FIRST_AVATAR" ]; then
    curl -I "http://localhost/uploads/avatars/$AVATAR_NAME" 2>&1 | head -5
fi

echo ""
echo "=== Проверка структуры базы данных ==="
sudo -u appuser sqlite3 messenger.db ".schema users" | grep -i avatar

echo ""
echo "=== Готово ==="

