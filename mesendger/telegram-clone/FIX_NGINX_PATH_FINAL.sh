#!/bin/bash

# Финальное исправление пути в Nginx

set -e

echo "🔧 Исправление пути в конфигурации Nginx..."
echo ""

cd /var/www/mesendger/mesendger/telegram-clone

# Обновляем код
sudo -u appuser git pull origin main

# Копируем конфигурацию
echo "📋 Копируем конфигурацию..."
NGINX_CONF="/etc/nginx/sites-available/mesendger"
sudo cp deploy/nginx.conf "$NGINX_CONF"

# Исправляем путь - заменяем старый путь на новый
echo "🔄 Исправляем пути в конфигурации..."
sudo sed -i 's|/var/www/mesendger/client-react/build|/var/www/mesendger/mesendger/telegram-clone/client-react/build|g' "$NGINX_CONF"

# Получаем server_name и заменяем
OLD_SERVER_NAME=$(grep "server_name" "$NGINX_CONF" | grep -v "#" | head -1 | awk '{print $2}' | tr -d ';')
if [ -z "$OLD_SERVER_NAME" ] || [ "$OLD_SERVER_NAME" = "YOUR_SERVER_IP_OR_DOMAIN;" ]; then
    OLD_SERVER_NAME=$(grep "server_name" /etc/nginx/sites-enabled/mesendger 2>/dev/null | grep -v "#" | head -1 | awk '{print $2}' | tr -d ';' || echo "")
fi

if [ ! -z "$OLD_SERVER_NAME" ] && [ "$OLD_SERVER_NAME" != "YOUR_SERVER_IP_OR_DOMAIN;" ]; then
    echo "🔄 Обновляем server_name: $OLD_SERVER_NAME"
    sudo sed -i "s/YOUR_SERVER_IP_OR_DOMAIN/$OLD_SERVER_NAME/g" "$NGINX_CONF"
fi

# Проверяем конфигурацию
echo ""
echo "🔍 Проверка конфигурации..."
if sudo nginx -t; then
    echo "✅ Конфигурация валидна"
    echo ""
    echo "Проверка путей в конфигурации:"
    echo "  location /:"
    grep -A 3 "location /" "$NGINX_CONF" | grep "root" | head -1 || echo "    Не найден"
    echo "  location = /:"
    grep -A 3 "location = /" "$NGINX_CONF" | grep "root" | head -1 || echo "    Не найден"
    echo "  location = /index.html:"
    grep -A 3 "location = /index.html" "$NGINX_CONF" | grep "root" | head -1 || echo "    Не найден"
else
    echo "❌ Ошибка в конфигурации!"
    exit 1
fi

# Очищаем кэш
echo ""
echo "🧹 Очистка кэша Nginx..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true

# Полностью перезапускаем Nginx
echo ""
echo "🔄 Полный перезапуск Nginx..."
sudo systemctl stop nginx
sleep 2
sudo systemctl start nginx

echo ""
echo "✅ Nginx перезапущен"
echo ""

# Проверяем, что теперь отдаётся правильный файл
echo "📡 Проверка: Что отдаёт Nginx сейчас?"
NGINX_RESPONSE=$(curl -s http://localhost/ 2>/dev/null)
JS_FILE=$(echo "$NGINX_RESPONSE" | grep -o 'src="/static/js/[^"]*"' | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
echo "JS файл в ответе: $JS_FILE"

if [ "$JS_FILE" = "static/js/main.b03f4702.js" ]; then
    echo "✅ ПРАВИЛЬНО! Nginx отдаёт новый файл с V5.0"
else
    echo "❌ ВСЁ ЕЩЁ НЕПРАВИЛЬНО! Nginx отдаёт: $JS_FILE"
    echo "   Нужна дополнительная диагностика"
fi

echo ""
echo "✅ Готово!"
echo ""
echo "📋 Теперь в браузере:"
echo "   1. Закройте все вкладки"
echo "   2. Откройте режим инкогнито (Ctrl+Shift+N)"
echo "   3. DevTools → Network → 'Disable cache'"
echo "   4. Откройте сайт"
echo "   5. Проверьте, что загружается main.b03f4702.js"

