#!/bin/bash

echo "🔍 Проверка конфигурации Nginx для аватаров..."
echo "=========================================="

NGINX_CONFIG="/etc/nginx/sites-available/mesendger"

echo ""
echo "Текущий location /uploads:"
echo "----------------------------------------"
sed -n '/location \/uploads {/,/^[[:space:]]*}/p' "$NGINX_CONFIG"

echo ""
echo ""
echo "Проверка доступности файла через Nginx..."
echo "----------------------------------------"

# Находим пример файла
EXAMPLE_AVATAR=$(find /var/www/mesendger/mesendger/telegram-clone/server/uploads/avatars -type f | head -1)
if [ -n "$EXAMPLE_AVATAR" ]; then
    AVATAR_FILENAME=$(basename "$EXAMPLE_AVATAR")
    echo "Тестируем: /uploads/avatars/$AVATAR_FILENAME"
    echo ""
    curl -I "http://localhost/uploads/avatars/$AVATAR_FILENAME" 2>&1 | head -10
else
    echo "⚠️  Не найден файл для тестирования"
fi

echo ""
echo ""
echo "✅ Проверка завершена!"

