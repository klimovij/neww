#!/bin/bash

# Минимальная конфигурация Nginx

set -e

echo "🔧 Создание МИНИМАЛЬНОЙ конфигурации Nginx..."
echo ""

NGINX_CONF="/etc/nginx/sites-available/mesendger"

# Создаём АБСОЛЮТНО МИНИМАЛЬНУЮ конфигурацию
sudo tee "$NGINX_CONF" > /dev/null <<'EOF'
server {
    listen 80 default_server;
    server_name _;
    
    root /var/www/mesendger/mesendger/telegram-clone/client-react/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF

echo "✅ Минимальная конфигурация создана"
echo ""

# Удаляем все другие конфигурации
echo "🗑️  Удаление других конфигураций..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/*.backup.*
echo "✅ Очистка завершена"
echo ""

# Проверяем
echo "🔍 Проверка конфигурации..."
if sudo nginx -t 2>&1; then
    echo "✅ Конфигурация валидна"
else
    echo "❌ Ошибка в конфигурации!"
    exit 1
fi

# Полностью перезапускаем
echo ""
echo "🔄 Полный перезапуск Nginx..."
sudo systemctl stop nginx
sleep 2
sudo systemctl start nginx
sleep 3

if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx запущен"
else
    echo "❌ Nginx не запустился!"
    sudo systemctl status nginx --no-pager
    exit 1
fi

# Проверяем
echo ""
echo "📡 Проверка: Что отдаёт Nginx?"
sleep 2

# Очищаем логи
sudo truncate -s 0 /var/log/nginx/error.log

HTTP_STATUS=$(curl -s -o /tmp/nginx_response.html -w "%{http_code}" http://localhost/)
echo "HTTP статус для /: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    echo ""
    echo "✅✅✅ УСПЕХ! Nginx возвращает 200! ✅✅✅"
    echo ""
    JS_FILE=$(grep -o 'src="/static/js/[^"]*"' /tmp/nginx_response.html 2>/dev/null | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
    if [ ! -z "$JS_FILE" ]; then
        echo "JS файл в ответе: $JS_FILE"
        if [ "$JS_FILE" = "static/js/main.b03f4702.js" ]; then
            echo ""
            echo "✅✅✅ ПРАВИЛЬНЫЙ ФАЙЛ! main.b03f4702.js с V5.0! ✅✅✅"
            echo ""
            echo "🎉🎉🎉 ПРОБЛЕМА РЕШЕНА! 🎉🎉🎉"
        fi
    else
        echo "📄 Содержимое ответа (первые 500 символов):"
        head -c 500 /tmp/nginx_response.html
    fi
else
    echo "❌ Nginx всё ещё возвращает ошибку $HTTP_STATUS"
    echo ""
    echo "📋 Ошибки в логе (после запроса):"
    sleep 1
    sudo tail -20 /var/log/nginx/error.log
    echo ""
    echo "📄 Содержимое ответа:"
    cat /tmp/nginx_response.html
fi

echo ""
echo "✅ Готово!"

