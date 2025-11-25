#!/bin/bash

# Проверка ошибок и простое исправление

set -e

echo "🔍 Проверка ошибок Nginx..."
echo ""

# Проверяем последние ошибки
echo "📋 Последние ошибки Nginx:"
echo "=============================================="
sudo tail -30 /var/log/nginx/error.log | tail -20
echo ""

# Проверяем, что директория существует и доступна
echo "📁 Проверка директории build:"
BUILD_DIR="/var/www/mesendger/mesendger/telegram-clone/client-react/build"
if [ -d "$BUILD_DIR" ]; then
    echo "✅ Директория существует"
    echo "   Права: $(ls -ld "$BUILD_DIR" | awk '{print $1, $3, $4}')"
    if [ -f "$BUILD_DIR/index.html" ]; then
        echo "✅ index.html существует"
        echo "   Права: $(ls -l "$BUILD_DIR/index.html" | awk '{print $1, $3, $4}')"
        echo "   Может читать nginx? $([ -r "$BUILD_DIR/index.html" ] && echo "Да" || echo "Нет")"
    fi
else
    echo "❌ Директория не существует!"
fi
echo ""

# Создаём простую конфигурацию без вложенных location
echo "🔧 Создание простой конфигурации..."
NGINX_CONF="/etc/nginx/sites-available/mesendger"

# Получаем server_name
OLD_SERVER_NAME=$(grep "server_name" "$NGINX_CONF" 2>/dev/null | grep -v "#" | head -1 | awk '{print $2}' | tr -d ';' || echo "")
if [ -z "$OLD_SERVER_NAME" ] || [ "$OLD_SERVER_NAME" = "YOUR_SERVER_IP_OR_DOMAIN;" ]; then
    OLD_SERVER_NAME=$(curl -s http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/ip -H "Metadata-Flavor: Google" 2>/dev/null || echo "localhost")
fi

echo "🔄 Используем server_name: $OLD_SERVER_NAME"
echo ""

# Создаём простую конфигурацию
sudo tee "$NGINX_CONF" > /dev/null <<EOF
server {
    listen 80;
    server_name $OLD_SERVER_NAME;

    client_max_body_size 50M;
    access_log /var/log/nginx/mesendger-access.log;
    error_log /var/log/nginx/mesendger-error.log;

    root /var/www/mesendger/mesendger/telegram-clone/client-react/build;
    index index.html;

    # Корень и index.html - без кэширования
    location = / {
        try_files /index.html =404;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # JS и CSS - без кэширования
    location ~* \.(js|css)$ {
        add_header Cache-Control "no-cache, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Остальные статические файлы
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo "✅ Конфигурация создана"
echo ""

# Проверяем конфигурацию
echo "🔍 Проверка конфигурации..."
if sudo nginx -t; then
    echo "✅ Конфигурация валидна"
else
    echo "❌ Ошибка в конфигурации!"
    exit 1
fi

# Перезапускаем Nginx
echo ""
echo "🔄 Перезапуск Nginx..."
sudo systemctl stop nginx
sleep 2
sudo systemctl start nginx
sleep 2

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
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
echo "HTTP статус: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    NGINX_RESPONSE=$(curl -s http://localhost/ 2>/dev/null)
    JS_FILE=$(echo "$NGINX_RESPONSE" | grep -o 'src="/static/js/[^"]*"' | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
    echo "JS файл в ответе: $JS_FILE"
    
    if [ "$JS_FILE" = "static/js/main.b03f4702.js" ]; then
        echo ""
        echo "✅✅✅ УСПЕХ! Nginx работает! ✅✅✅"
    fi
else
    echo "❌ Nginx всё ещё возвращает ошибку $HTTP_STATUS"
    echo ""
    echo "📋 Последние ошибки:"
    sudo tail -10 /var/log/nginx/error.log
fi

echo ""
echo "✅ Готово!"

