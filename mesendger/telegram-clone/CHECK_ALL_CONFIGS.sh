#!/bin/bash

# Проверка всех конфигураций Nginx

set -e

echo "🔍 Проверка ВСЕХ конфигураций Nginx..."
echo ""

# 1. Проверяем все файлы в sites-enabled
echo "📋 Все файлы в sites-enabled:"
echo "=============================================="
ls -la /etc/nginx/sites-enabled/
echo ""

# 2. Проверяем все server блоки во всех конфигурациях
echo "📋 Все server блоки:"
echo "=============================================="
for conf in /etc/nginx/sites-enabled/*; do
    if [ -f "$conf" ]; then
        echo ""
        echo "Файл: $conf"
        echo "---"
        # Показываем все server блоки
        grep -n "^server" "$conf" | head -10
        echo "---"
        # Показываем listen директивы
        echo "Listen порты:"
        grep -n "listen" "$conf" | grep -v "#"
        echo "---"
        # Показываем root директивы
        echo "Root пути:"
        grep -n "root" "$conf" | grep -v "#"
    fi
done
echo ""

# 3. Проверяем конфигурации в conf.d
echo "📋 Конфигурации в conf.d:"
echo "=============================================="
ls -la /etc/nginx/conf.d/ 2>/dev/null || echo "Директория conf.d пуста или не существует"
if [ -d "/etc/nginx/conf.d" ] && [ "$(ls -A /etc/nginx/conf.d)" ]; then
    for conf in /etc/nginx/conf.d/*; do
        if [ -f "$conf" ]; then
            echo ""
            echo "Файл: $conf"
            grep -n "server" "$conf" | head -5
        fi
    done
fi
echo ""

# 4. Проверяем, какие конфигурации реально загружены
echo "📋 Тест конфигурации с выводом всех server блоков:"
echo "=============================================="
sudo nginx -T 2>/dev/null | grep -A 20 "^server {" | head -50
echo ""

# 5. Создаём абсолютно чистую конфигурацию
echo "🔧 Создание АБСОЛЮТНО чистой конфигурации:"
echo "=============================================="
NGINX_CONF="/etc/nginx/sites-available/mesendger"

# Удаляем все другие конфигурации
sudo rm -f /etc/nginx/sites-enabled/*
echo "✅ Удалены все конфигурации из sites-enabled"

# Создаём самую простую возможную конфигурацию
sudo tee "$NGINX_CONF" > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;
    
    root /var/www/mesendger/mesendger/telegram-clone/client-react/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Создаём симлинк
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/mesendger
echo "✅ Создана абсолютно чистая конфигурация"
echo ""

# 6. Проверяем и перезапускаем
echo "🔍 Проверка новой конфигурации:"
if sudo nginx -t; then
    echo "✅ Конфигурация валидна"
    echo ""
    echo "🔄 Перезапуск Nginx..."
    sudo systemctl stop nginx
    sleep 2
    sudo systemctl start nginx
    sleep 3
    
    if sudo systemctl is-active --quiet nginx; then
        echo "✅ Nginx запущен"
        echo ""
        echo "📡 Проверка:"
        sleep 2
        HTTP_STATUS=$(curl -s -o /tmp/nginx_response.html -w "%{http_code}" http://localhost/)
        echo "HTTP статус: $HTTP_STATUS"
        
        if [ "$HTTP_STATUS" = "200" ]; then
            echo ""
            echo "✅✅✅ УСПЕХ! Чистая конфигурация работает! ✅✅✅"
            echo ""
            JS_FILE=$(grep -o 'src="/static/js/[^"]*"' /tmp/nginx_response.html 2>/dev/null | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
            echo "JS файл: $JS_FILE"
            if [ "$JS_FILE" = "static/js/main.b03f4702.js" ]; then
                echo ""
                echo "✅✅✅ ПРАВИЛЬНЫЙ ФАЙЛ! V5.0! ✅✅✅"
            fi
        else
            echo "❌ Всё ещё ошибка $HTTP_STATUS"
            echo ""
            echo "📋 Ошибки:"
            sudo tail -10 /var/log/nginx/error.log
        fi
    else
        echo "❌ Nginx не запустился"
        sudo systemctl status nginx --no-pager
    fi
else
    echo "❌ Ошибка в конфигурации!"
    exit 1
fi

echo ""
echo "✅ Готово!"

