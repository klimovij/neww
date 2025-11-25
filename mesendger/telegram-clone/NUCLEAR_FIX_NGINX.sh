#!/bin/bash

# Ядерный вариант исправления - удаляем старую директорию и исправляем конфигурацию

set -e

echo "🚨 ЯДЕРНОЕ ИСПРАВЛЕНИЕ - удаление старой директории и исправление Nginx"
echo ""

cd /var/www/mesendger/mesendger/telegram-clone

# Обновляем код
sudo -u appuser git pull origin main

# 1. Резервная копия старой директории (на всякий случай)
OLD_BUILD="/var/www/mesendger/client-react/build"
if [ -d "$OLD_BUILD" ]; then
    echo "📦 Создаём резервную копию старой директории..."
    sudo mv "$OLD_BUILD" "${OLD_BUILD}.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    echo "✅ Старая директория перемещена в backup"
fi

# 2. Обновляем конфигурацию Nginx
echo ""
echo "📋 Обновляем конфигурацию Nginx..."
NGINX_CONF="/etc/nginx/sites-available/mesendger"
sudo cp deploy/nginx.conf "$NGINX_CONF"

# 3. Заменяем ВСЕ упоминания старого пути на новый
echo "🔄 Заменяем пути в конфигурации..."
sudo sed -i 's|/var/www/mesendger/client-react/build|/var/www/mesendger/mesendger/telegram-clone/client-react/build|g' "$NGINX_CONF"

# 4. Убеждаемся, что все location блоки имеют правильный root
echo "🔧 Проверяем и исправляем location блоки..."

# Для location = / добавляем root, если его нет
if ! grep -A 2 "location = /" "$NGINX_CONF" | grep -q "root"; then
    echo "   Добавляем root в location = /"
    sudo sed -i '/location = \//a\        root /var/www/mesendger/mesendger/telegram-clone/client-react/build;' "$NGINX_CONF"
fi

# Для location = /index.html добавляем root, если его нет
if ! grep -A 2 "location = /index.html" "$NGINX_CONF" | grep -q "root"; then
    echo "   Добавляем root в location = /index.html"
    sudo sed -i '/location = \/index.html/a\        root /var/www/mesendger/mesendger/telegram-clone/client-react/build;' "$NGINX_CONF"
fi

# 5. Исправляем server_name
OLD_SERVER_NAME=$(grep "server_name" "$NGINX_CONF" | grep -v "#" | head -1 | awk '{print $2}' | tr -d ';')
if [ -z "$OLD_SERVER_NAME" ] || [ "$OLD_SERVER_NAME" = "YOUR_SERVER_IP_OR_DOMAIN;" ]; then
    OLD_SERVER_NAME=$(grep "server_name" /etc/nginx/sites-enabled/mesendger 2>/dev/null | grep -v "#" | head -1 | awk '{print $2}' | tr -d ';' || echo "")
fi

if [ ! -z "$OLD_SERVER_NAME" ] && [ "$OLD_SERVER_NAME" != "YOUR_SERVER_IP_OR_DOMAIN;" ]; then
    echo "🔄 Обновляем server_name: $OLD_SERVER_NAME"
    sudo sed -i "s/YOUR_SERVER_IP_OR_DOMAIN/$OLD_SERVER_NAME/g" "$NGINX_CONF"
fi

# 6. Проверяем конфигурацию
echo ""
echo "🔍 Проверка конфигурации..."
if sudo nginx -t; then
    echo "✅ Конфигурация валидна"
    echo ""
    echo "📋 Текущие пути в конфигурации:"
    echo "   location = /:"
    grep -A 5 "location = /" "$NGINX_CONF" | grep "root" | head -1 | sed 's/^/      /' || echo "      Не найден"
    echo "   location = /index.html:"
    grep -A 5 "location = /index.html" "$NGINX_CONF" | grep "root" | head -1 | sed 's/^/      /' || echo "      Не найден"
    echo "   location /:"
    grep -A 5 "^    location /" "$NGINX_CONF" | grep "root" | head -1 | sed 's/^/      /' || echo "      Не найден"
else
    echo "❌ Ошибка в конфигурации!"
    exit 1
fi

# 7. Очищаем все кэши
echo ""
echo "🧹 Полная очистка кэшей..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
sudo find /var/cache/nginx -type f -delete 2>/dev/null || true

# 8. Полностью перезапускаем Nginx
echo ""
echo "🔄 Полный перезапуск Nginx..."
sudo systemctl stop nginx
sleep 3
sudo systemctl start nginx
sleep 2

# 9. Проверяем статус
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx запущен"
else
    echo "❌ Nginx не запустился!"
    sudo systemctl status nginx
    exit 1
fi

# 10. Проверяем, что отдаётся правильный файл
echo ""
echo "📡 ФИНАЛЬНАЯ ПРОВЕРКА: Что отдаёт Nginx?"
sleep 2
NGINX_RESPONSE=$(curl -s http://localhost/ 2>/dev/null)
JS_FILE=$(echo "$NGINX_RESPONSE" | grep -o 'src="/static/js/[^"]*"' | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
echo "   JS файл в ответе: $JS_FILE"

if [ "$JS_FILE" = "static/js/main.b03f4702.js" ]; then
    echo ""
    echo "✅✅✅ УСПЕХ! Nginx теперь отдаёт правильный файл с V5.0! ✅✅✅"
    echo ""
    echo "📋 Теперь в браузере:"
    echo "   1. Закройте ВСЕ вкладки"
    echo "   2. Закройте браузер полностью"
    echo "   3. Откройте режим ИНКОГНИТО (Ctrl+Shift+N)"
    echo "   4. DevTools → Network → 'Disable cache'"
    echo "   5. Откройте сайт"
    echo "   6. Должен загружаться main.b03f4702.js"
else
    echo ""
    echo "❌ ВСЁ ЕЩЁ НЕПРАВИЛЬНО!"
    echo "   Nginx отдаёт: $JS_FILE"
    echo "   Ожидается: static/js/main.b03f4702.js"
    echo ""
    echo "   Выполните диагностику:"
    echo "   sudo bash DEEP_CHECK_AND_FIX.sh"
fi

echo ""
echo "✅ Готово!"

