#!/bin/bash

# Финальное исправление Nginx для гарантированного отключения кэширования index.html

set -e

echo "🔧 Финальное исправление конфигурации Nginx..."
echo ""

cd /var/www/mesendger/mesendger/telegram-clone

# Обновляем код
sudo -u appuser git pull origin main

# Копируем новую конфигурацию
echo "📋 Копируем новую конфигурацию..."
NGINX_CONF="/etc/nginx/sites-available/mesendger"
sudo cp deploy/nginx.conf "$NGINX_CONF"

# Получаем server_name из старой конфигурации
OLD_SERVER_NAME=$(grep "server_name" "$NGINX_CONF" | grep -v "#" | head -1 | awk '{print $2}' | tr -d ';')
if [ -z "$OLD_SERVER_NAME" ] || [ "$OLD_SERVER_NAME" = "YOUR_SERVER_IP_OR_DOMAIN;" ]; then
    OLD_SERVER_NAME=$(grep "server_name" /etc/nginx/sites-enabled/mesendger 2>/dev/null | grep -v "#" | head -1 | awk '{print $2}' | tr -d ';' || echo "")
fi

# Если есть старый server_name, заменяем
if [ ! -z "$OLD_SERVER_NAME" ] && [ "$OLD_SERVER_NAME" != "YOUR_SERVER_IP_OR_DOMAIN;" ]; then
    echo "🔄 Обновляем server_name: $OLD_SERVER_NAME"
    sudo sed -i "s/YOUR_SERVER_IP_OR_DOMAIN/$OLD_SERVER_NAME/g" "$NGINX_CONF"
fi

# Проверяем конфигурацию
echo ""
echo "🔍 Проверка конфигурации Nginx..."
if sudo nginx -t; then
    echo "✅ Конфигурация валидна"
else
    echo "❌ Ошибка в конфигурации!"
    exit 1
fi

# Очищаем ВСЕ кэши Nginx
echo ""
echo "🧹 Полная очистка кэша Nginx..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
sudo find /var/cache/nginx -type f -delete 2>/dev/null || true

# Полностью перезапускаем Nginx (не reload, а restart)
echo ""
echo "🔄 Полный перезапуск Nginx..."
sudo systemctl stop nginx
sleep 2
sudo systemctl start nginx

echo ""
echo "✅ Nginx перезапущен"
echo ""

# Проверяем, что отдаётся правильный index.html
echo "📄 Проверка, что Nginx отдаёт правильный index.html:"
curl -s http://localhost/ | grep -o 'src="/static/js/[^"]*"' | head -1

echo ""
echo "✅ Готово!"
echo ""
echo "📋 Теперь в браузере:"
echo "   1. Закройте ВСЕ вкладки с сайтом"
echo "   2. Закройте браузер полностью"
echo "   3. Откройте браузер заново"
echo "   4. Откройте режим ИНКОГНИТО (Ctrl+Shift+N)"
echo "   5. Откройте DevTools (F12) → Network → 'Disable cache'"
echo "   6. Откройте сайт"
echo "   7. Проверьте, что загружается main.b03f4702.js"

