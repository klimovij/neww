#!/bin/bash

# Проверка API и исправление конфигурации

set -e

echo "🔍 Проверка API и конфигурации..."
echo ""

# 1. Проверяем, работает ли PM2
echo "📊 Проверка PM2:"
echo "=============================================="
sudo -u appuser pm2 list
echo ""

# 2. Проверяем, отвечает ли API на порту 5000
echo "📡 Проверка API на порту 5000:"
echo "=============================================="
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ API отвечает на /api/health"
elif curl -s http://localhost:5000/ > /dev/null 2>&1; then
    echo "✅ API отвечает на корневой путь"
else
    echo "⚠️  API может не отвечать напрямую"
fi

# Проверяем, что сервер запущен
if sudo netstat -tlnp 2>/dev/null | grep -q ":5000" || sudo ss -tlnp 2>/dev/null | grep -q ":5000"; then
    echo "✅ Процесс слушает на порту 5000"
else
    echo "❌ Процесс НЕ слушает на порту 5000!"
    echo "   Перезапускаем PM2..."
    cd /var/www/mesendger/mesendger/telegram-clone
    sudo -u appuser pm2 restart all || sudo -u appuser pm2 start deploy/ecosystem.config.js
fi
echo ""

# 3. Проверяем конфигурацию Nginx для API
echo "📋 Проверка конфигурации Nginx для API:"
echo "=============================================="
NGINX_CONF="/etc/nginx/sites-available/mesendger"
if grep -q "location /api" "$NGINX_CONF"; then
    echo "✅ Location /api существует"
    grep -A 10 "location /api" "$NGINX_CONF" | head -12
else
    echo "❌ Location /api НЕ найден!"
fi
echo ""

# 4. Проверяем, работает ли проксирование через Nginx
echo "📡 Проверка проксирования через Nginx:"
echo "=============================================="
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "000")
echo "HTTP статус для /api/health через Nginx: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "404" ] || [ "$HTTP_STATUS" = "401" ]; then
    echo "✅ API доступен через Nginx (статус $HTTP_STATUS)"
else
    echo "❌ API НЕ доступен через Nginx!"
fi
echo ""

# 5. Проверяем, правильно ли настроен финальный конфиг
echo "🔧 Проверка и обновление финальной конфигурации:"
echo "=============================================="
if [ ! -f "$NGINX_CONF" ] || ! grep -q "location /api" "$NGINX_CONF"; then
    echo "Конфигурация неполная, обновляем..."
    
    sudo tee "$NGINX_CONF" > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 50M;
    access_log /var/log/nginx/mesendger-access.log;
    error_log /var/log/nginx/mesendger-error.log;
    
    root /var/www/mesendger/mesendger/telegram-clone/client-react/build;
    index index.html;
    
    # Статические файлы
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
    
    sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/mesendger
    
    if sudo nginx -t; then
        echo "✅ Конфигурация обновлена и валидна"
        sudo systemctl reload nginx
    else
        echo "❌ Ошибка в конфигурации!"
        exit 1
    fi
else
    echo "✅ Конфигурация уже правильная"
fi
echo ""

# 6. Проверяем снова после обновления
echo "📡 Финальная проверка:"
echo "=============================================="
sleep 2
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "000")
echo "HTTP статус для /api/health: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "404" ] || [ "$HTTP_STATUS" = "401" ]; then
    echo "✅ API работает!"
else
    echo "⚠️  API может не отвечать, проверьте логи PM2:"
    echo "   sudo -u appuser pm2 logs"
fi

echo ""
echo "✅ Готово!"
echo ""
echo "📋 Проверьте в браузере:"
echo "   1. Откройте DevTools → Network"
echo "   2. Попробуйте загрузить данные"
echo "   3. Проверьте, есть ли запросы к /api/activity-details"
echo "   4. Проверьте статус ответов (должны быть 200, 401 или 404, но не 500)"

