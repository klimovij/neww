#!/bin/bash

# Скрипт для исправления Nginx и принудительной перезагрузки

set -e

echo "🔧 Исправление конфигурации Nginx..."
echo ""

# Путь к конфигурации
NGINX_CONF="/etc/nginx/sites-available/mesendger"

if [ ! -f "$NGINX_CONF" ]; then
    echo "❌ Конфигурация Nginx не найдена: $NGINX_CONF"
    exit 1
fi

# Обновляем конфигурацию из репозитория
cd /var/www/mesendger/mesendger/telegram-clone
sudo -u appuser git pull origin main

# Копируем новую конфигурацию
echo "📋 Копируем новую конфигурацию..."
sudo cp deploy/nginx.conf "$NGINX_CONF"

# Получаем IP или домен из старой конфигурации (чтобы сохранить)
OLD_SERVER_NAME=$(grep "server_name" "$NGINX_CONF" | grep -v "#" | head -1 | awk '{print $2}' | tr -d ';')
if [ -z "$OLD_SERVER_NAME" ] || [ "$OLD_SERVER_NAME" = "YOUR_SERVER_IP_OR_DOMAIN;" ]; then
    # Если не найден, пытаемся получить из /etc/nginx/sites-enabled/
    OLD_SERVER_NAME=$(grep "server_name" /etc/nginx/sites-enabled/mesendger 2>/dev/null | grep -v "#" | head -1 | awk '{print $2}' | tr -d ';' || echo "")
fi

# Если есть старый server_name, заменяем
if [ ! -z "$OLD_SERVER_NAME" ] && [ "$OLD_SERVER_NAME" != "YOUR_SERVER_IP_OR_DOMAIN;" ]; then
    echo "🔄 Обновляем server_name: $OLD_SERVER_NAME"
    sudo sed -i "s/YOUR_SERVER_IP_OR_DOMAIN/$OLD_SERVER_NAME/g" "$NGINX_CONF"
fi

echo ""
echo "✅ Конфигурация обновлена"
echo ""

# Проверяем конфигурацию
echo "🔍 Проверка конфигурации Nginx..."
if sudo nginx -t; then
    echo "✅ Конфигурация валидна"
else
    echo "❌ Ошибка в конфигурации!"
    exit 1
fi

# Очищаем кэш Nginx
echo ""
echo "🧹 Очистка кэша Nginx..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
sudo find /var/cache/nginx -type f -delete 2>/dev/null || true

# Перезапускаем Nginx
echo ""
echo "🔄 Перезапуск Nginx..."
sudo systemctl reload nginx || sudo systemctl restart nginx

echo ""
echo "✅ Nginx перезапущен"
echo ""

# Проверяем, что правильный путь к build
BUILD_DIR="/var/www/mesendger/mesendger/telegram-clone/client-react/build"
echo "📁 Проверка build директории:"
if [ -d "$BUILD_DIR" ]; then
    echo "   ✅ Директория существует: $BUILD_DIR"
    if [ -f "$BUILD_DIR/index.html" ]; then
        JS_FILE=$(grep -o 'src="/static/js/[^"]*"' "$BUILD_DIR/index.html" | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
        if [ -f "$BUILD_DIR/$JS_FILE" ]; then
            echo "   ✅ JS файл: $JS_FILE"
            if grep -q "V5.0" "$BUILD_DIR/$JS_FILE" 2>/dev/null; then
                echo "   ✅ V5.0 найдена в файле"
            fi
        fi
    fi
else
    echo "   ❌ Директория не существует: $BUILD_DIR"
fi

echo ""
echo "✅ Готово!"
echo ""
echo "📋 Теперь в браузере:"
echo "   1. Закройте все вкладки с сайтом"
echo "   2. Откройте новую вкладку"
echo "   3. Откройте DevTools (F12) → Network"
echo "   4. Установите 'Disable cache'"
echo "   5. Откройте сайт"
echo "   6. Проверьте, что загружается main.b03f4702.js"

