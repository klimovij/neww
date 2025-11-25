#!/bin/bash

# Сверхпростая конфигурация без вложенных location

set -e

echo "🔧 Создание сверхпростой конфигурации Nginx..."
echo ""

cd /var/www/mesendger/mesendger/telegram-clone

# Получаем server_name
OLD_SERVER_NAME=$(curl -s http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/ip -H "Metadata-Flavor: Google" 2>/dev/null || echo "localhost")

NGINX_CONF="/etc/nginx/sites-available/mesendger"

# Создаём САМУЮ ПРОСТУЮ конфигурацию БЕЗ вложенных location
sudo tee "$NGINX_CONF" > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;
    access_log /var/log/nginx/mesendger-access.log;
    error_log /var/log/nginx/mesendger-error.log debug;

    root /var/www/mesendger/mesendger/telegram-clone/client-react/build;
    index index.html;

    # Корень
    location = / {
        try_files /index.html =404;
    }

    # index.html - без кэширования
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Статические файлы - все остальные
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "✅ Сверхпростая конфигурация создана"
echo ""

# Проверяем
echo "🔍 Проверка конфигурации..."
if sudo nginx -t 2>&1 | tee /tmp/nginx_test.log; then
    echo "✅ Конфигурация валидна"
else
    echo "❌ Ошибка в конфигурации!"
    cat /tmp/nginx_test.log
    exit 1
fi

# Перезапускаем
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
    sudo systemctl status nginx
    exit 1
fi

# Проверяем
echo ""
echo "📡 Проверка: Что отдаёт Nginx?"
sleep 2

# Очищаем старые логи
sudo truncate -s 0 /var/log/nginx/error.log

# Делаем запрос
HTTP_STATUS=$(curl -s -o /tmp/nginx_response.html -w "%{http_code}" http://localhost/)
echo "HTTP статус: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    echo ""
    echo "✅✅✅ УСПЕХ! Nginx возвращает 200! ✅✅✅"
    echo ""
    JS_FILE=$(grep -o 'src="/static/js/[^"]*"' /tmp/nginx_response.html | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
    echo "JS файл в ответе: $JS_FILE"
    
    if [ "$JS_FILE" = "static/js/main.b03f4702.js" ]; then
        echo ""
        echo "✅✅✅ ПРАВИЛЬНЫЙ ФАЙЛ! main.b03f4702.js с V5.0! ✅✅✅"
    fi
else
    echo "❌ Nginx всё ещё возвращает ошибку $HTTP_STATUS"
    echo ""
    echo "📋 Ошибки в логе (после запроса):"
    sudo tail -20 /var/log/nginx/error.log | tail -10
    echo ""
    echo "📄 Содержимое ответа:"
    head -20 /tmp/nginx_response.html
fi

echo ""
echo "✅ Готово!"

