#!/bin/bash

# Отдача файла напрямую без try_files

set -e

echo "🔧 Исправление location = / для прямой отдачи файла..."
echo ""

NGINX_CONF="/etc/nginx/sites-available/mesendger"
BUILD_DIR="/var/www/mesendger/mesendger/telegram-clone/client-react/build"

# Создаём конфигурацию с прямой отдачей index.html
sudo tee "$NGINX_CONF" > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;
    access_log /var/log/nginx/mesendger-access.log;
    error_log /var/log/nginx/mesendger-error.log;

    root /var/www/mesendger/mesendger/telegram-clone/client-react/build;
    index index.html;

    # Корень - отдаём index.html напрямую
    location = / {
        rewrite ^ /index.html last;
    }

    # index.html - без кэширования
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Все остальные файлы
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

echo "✅ Конфигурация обновлена"
echo ""

# Проверяем
echo "🔍 Проверка конфигурации..."
if sudo nginx -t; then
    echo "✅ Конфигурация валидна"
else
    echo "❌ Ошибка!"
    exit 1
fi

# Перезапускаем
echo ""
echo "🔄 Перезапуск Nginx..."
sudo systemctl reload nginx
sleep 2

# Проверяем
echo ""
echo "📡 Проверка: Что отдаёт Nginx?"
sleep 1

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
        echo ""
        echo "🎉 ПРОБЛЕМА РЕШЕНА! 🎉"
    fi
else
    echo "❌ Nginx всё ещё возвращает ошибку $HTTP_STATUS"
    echo ""
    echo "Пробуем прямой доступ к index.html:"
    HTTP_STATUS2=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/index.html)
    echo "HTTP статус для /index.html: $HTTP_STATUS2"
    
    if [ "$HTTP_STATUS2" = "200" ]; then
        echo "✅ index.html доступен напрямую, проблема в location = /"
    fi
    
    echo ""
    echo "📋 Последние ошибки:"
    sudo tail -10 /var/log/nginx/error.log
fi

echo ""
echo "✅ Готово!"

