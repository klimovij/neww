#!/bin/bash

# Финальное исправление - удаление резервной конфигурации и проверка ошибок

set -e

echo "🔧 Финальное исправление..."
echo ""

# 1. Удаляем резервную конфигурацию из sites-enabled
echo "🗑️  Удаление резервной конфигурации..."
sudo rm -f /etc/nginx/sites-enabled/*.backup.*
echo "✅ Резервные конфигурации удалены"
echo ""

# 2. Проверяем активные конфигурации
echo "📋 Активные конфигурации:"
ls -la /etc/nginx/sites-enabled/
echo ""

# 3. Проверяем реальные ошибки после удаления
echo "🔍 Проверка ошибок после удаления резервной конфигурации..."
sudo tail -5 /var/log/nginx/error.log | grep -v "alert" | grep -v "open socket" || echo "Нет новых ошибок"
echo ""

# 4. Перезапускаем Nginx
echo "🔄 Перезапуск Nginx..."
sudo systemctl reload nginx
sleep 2

# 5. Проверяем статус
echo "📡 Проверка: Что отдаёт Nginx?"
sleep 2
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
echo "HTTP статус: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    echo ""
    echo "✅✅✅ УСПЕХ! Nginx возвращает 200! ✅✅✅"
    echo ""
    NGINX_RESPONSE=$(curl -s http://localhost/ 2>/dev/null)
    JS_FILE=$(echo "$NGINX_RESPONSE" | grep -o 'src="/static/js/[^"]*"' | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
    echo "JS файл в ответе: $JS_FILE"
    
    if [ "$JS_FILE" = "static/js/main.b03f4702.js" ]; then
        echo ""
        echo "✅✅✅ ПРАВИЛЬНЫЙ ФАЙЛ! main.b03f4702.js с V5.0! ✅✅✅"
    fi
else
    echo "❌ Nginx всё ещё возвращает ошибку $HTTP_STATUS"
    echo ""
    echo "📋 Последние ошибки:"
    sudo tail -10 /var/log/nginx/error.log | tail -5
    echo ""
    echo "Проверяем, можем ли мы прочитать index.html как www-data:"
    BUILD_DIR="/var/www/mesendger/mesendger/telegram-clone/client-react/build"
    sudo -u www-data cat "$BUILD_DIR/index.html" > /dev/null 2>&1 && echo "✅ www-data может читать index.html" || echo "❌ www-data НЕ может читать index.html"
fi

echo ""
echo "✅ Готово!"

