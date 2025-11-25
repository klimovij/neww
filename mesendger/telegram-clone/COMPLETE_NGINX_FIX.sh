#!/bin/bash

# Полное исправление конфигурации Nginx

set -e

echo "🔧 Полное исправление конфигурации Nginx..."
echo ""

cd /var/www/mesendger/mesendger/telegram-clone

# Обновляем код
sudo -u appuser git pull origin main

# Получаем IP или домен из старой конфигурации
NGINX_CONF="/etc/nginx/sites-available/mesendger"
OLD_SERVER_NAME=$(grep "server_name" "$NGINX_CONF" 2>/dev/null | grep -v "#" | head -1 | awk '{print $2}' | tr -d ';' || echo "")
if [ -z "$OLD_SERVER_NAME" ] || [ "$OLD_SERVER_NAME" = "YOUR_SERVER_IP_OR_DOMAIN;" ]; then
    # Пытаемся найти IP из другого места
    OLD_SERVER_NAME=$(curl -s http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/ip -H "Metadata-Flavor: Google" 2>/dev/null || echo "")
fi

if [ -z "$OLD_SERVER_NAME" ]; then
    echo "⚠️  Не удалось определить server_name, оставляем YOUR_SERVER_IP_OR_DOMAIN"
    OLD_SERVER_NAME="YOUR_SERVER_IP_OR_DOMAIN"
fi

echo "🔄 Используем server_name: $OLD_SERVER_NAME"
echo ""

# Полностью перезаписываем конфигурацию
echo "📋 Полная перезапись конфигурации Nginx..."
sudo tee "$NGINX_CONF" > /dev/null <<EOF
# Конфигурация nginx для мессенджера

server {
    listen 80;
    server_name $OLD_SERVER_NAME;

    # Увеличение размера загружаемых файлов
    client_max_body_size 50M;

    # Логи
    access_log /var/log/nginx/mesendger-access.log;
    error_log /var/log/nginx/mesendger-error.log;

    # Запрещаем кэширование index.html и корня - ВСЕГДА отдаём свежий
    location = / {
        root /var/www/mesendger/mesendger/telegram-clone/client-react/build;
        try_files /index.html =404;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    location = /index.html {
        root /var/www/mesendger/mesendger/telegram-clone/client-react/build;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # Статические файлы React приложения
    location / {
        root /var/www/mesendger/mesendger/telegram-clone/client-react/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Кэширование статических ресурсов (без JS/CSS)
        location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public";
        }
        
        # JS и CSS - без кэширования
        location ~* \.(js|css)$ {
            add_header Cache-Control "no-cache, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }

    # API и WebSocket для бэкенда
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
        
        # Таймауты для долгих запросов
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket для Socket.IO
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Таймауты для WebSocket
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Все uploads - проксируем через Express
    location /uploads {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Кэширование для изображений
        expires 30d;
        add_header Cache-Control "public";
    }
}
EOF

echo "✅ Конфигурация перезаписана"
echo ""

# Проверяем конфигурацию
echo "🔍 Проверка конфигурации..."
if sudo nginx -t; then
    echo "✅ Конфигурация валидна"
else
    echo "❌ Ошибка в конфигурации!"
    exit 1
fi

# Очищаем кэш
echo ""
echo "🧹 Очистка кэша..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true

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

# Проверяем, что теперь работает
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
        echo "✅✅✅ УСПЕХ! Nginx работает и отдаёт правильный файл! ✅✅✅"
    else
        echo ""
        echo "⚠️  Nginx работает, но отдаёт: $JS_FILE"
    fi
else
    echo "❌ Nginx всё ещё возвращает ошибку $HTTP_STATUS"
    echo "Проверьте логи: sudo tail -20 /var/log/nginx/error.log"
fi

echo ""
echo "✅ Готово!"

