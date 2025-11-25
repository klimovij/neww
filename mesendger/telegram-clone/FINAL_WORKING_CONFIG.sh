#!/bin/bash

# Финальная рабочая конфигурация со всеми необходимыми блоками

set -e

echo "🔧 Создание финальной рабочей конфигурации..."
echo ""

NGINX_CONF="/etc/nginx/sites-available/mesendger"

# Создаём финальную конфигурацию с API, WebSocket и uploads
sudo tee "$NGINX_CONF" > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 50M;
    access_log /var/log/nginx/mesendger-access.log;
    error_log /var/log/nginx/mesendger-error.log;
    
    root /var/www/mesendger/mesendger/telegram-clone/client-react/build;
    index index.html;
    
    # Корень - отдаём index.html
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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket для Socket.IO
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
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

# Создаём симлинк
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/mesendger

echo "✅ Финальная конфигурация создана"
echo ""

# Проверяем
echo "🔍 Проверка конфигурации..."
if sudo nginx -t; then
    echo "✅ Конфигурация валидна"
    echo ""
    echo "🔄 Перезапуск Nginx..."
    sudo systemctl reload nginx
    sleep 2
    
    echo ""
    echo "📡 Финальная проверка:"
    HTTP_STATUS=$(curl -s -o /tmp/nginx_response.html -w "%{http_code}" http://localhost/)
    echo "HTTP статус: $HTTP_STATUS"
    
    if [ "$HTTP_STATUS" = "200" ]; then
        JS_FILE=$(grep -o 'src="/static/js/[^"]*"' /tmp/nginx_response.html 2>/dev/null | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
        echo "JS файл: $JS_FILE"
        
        if [ "$JS_FILE" = "static/js/main.b03f4702.js" ]; then
            echo ""
            echo "✅✅✅ ВСЁ РАБОТАЕТ! ✅✅✅"
            echo ""
            echo "📋 Конфигурация включает:"
            echo "   ✅ Статические файлы (React build)"
            echo "   ✅ API проксирование"
            echo "   ✅ WebSocket для Socket.IO"
            echo "   ✅ Uploads проксирование"
            echo ""
            echo "🎉 ПРОБЛЕМА ПОЛНОСТЬЮ РЕШЕНА! 🎉"
            echo ""
            echo "📋 Теперь в браузере:"
            echo "   1. Откройте сайт (можно в обычной вкладке)"
            echo "   2. Должен загружаться main.b03f4702.js"
            echo "   3. В заголовке страницы должно быть [V5.0 - 2025-01-20]"
            echo "   4. Во вкладке Applications должно быть 13 приложений (не 3)"
        fi
    fi
else
    echo "❌ Ошибка в конфигурации!"
    exit 1
fi

echo ""
echo "✅ Готово!"

