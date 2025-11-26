#!/bin/bash

echo "🔧 Простое исправление конфигурации Nginx для аватаров..."
echo "=========================================="

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с sudo"
    exit 1
fi

NGINX_CONFIG="/etc/nginx/sites-available/mesendger"

echo ""
echo "1️⃣ Создаём резервную копию..."
echo "----------------------------------------"
cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Резервная копия создана"

echo ""
echo "2️⃣ Удаляем старый location /uploads (если есть)..."
echo "----------------------------------------"
# Создаём временный файл без location /uploads
awk '
/^[[:space:]]*location \/uploads {/ {
    skip = 1
    next
}
/^[[:space:]]*}$/ && skip {
    skip = 0
    next
}
!skip { print }
' "$NGINX_CONFIG" > /tmp/nginx_config_no_uploads

mv /tmp/nginx_config_no_uploads "$NGINX_CONFIG"
echo "✅ Старый location /uploads удален"

echo ""
echo "3️⃣ Добавляем правильный location /uploads..."
echo "----------------------------------------"

# Находим строку с "location /api" и вставляем перед ней
sed -i '/^[[:space:]]*# API и WebSocket для бэкенда$/,/^[[:space:]]*location \/api {/ {
    /^[[:space:]]*location \/api {/ i\
    # Статические файлы uploads (аватары, скриншоты и т.д.)\
    location /uploads {\
        alias /var/www/mesendger/mesendger/telegram-clone/server/uploads;\
        \
        # Кэширование для изображений\
        location ~* \\.(jpg|jpeg|png|gif|ico|svg)$ {\
            expires 30d;\
            add_header Cache-Control "public";\
        }\
        \
        # Безопасность\
        add_header X-Content-Type-Options nosniff;\
        add_header X-Frame-Options DENY;\
    }
}' "$NGINX_CONFIG"

echo "✅ Новый location /uploads добавлен"

echo ""
echo "4️⃣ Проверяем синтаксис..."
echo "----------------------------------------"
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Синтаксис правильный"
    
    echo ""
    echo "5️⃣ Показываем обновлённую конфигурацию..."
    echo "----------------------------------------"
    grep -A 12 "location /uploads" "$NGINX_CONFIG"
    
    echo ""
    echo "6️⃣ Перезагружаем Nginx..."
    echo "----------------------------------------"
    systemctl reload nginx
    echo "✅ Nginx перезагружен"
    
    echo ""
    echo "7️⃣ Тестируем..."
    echo "----------------------------------------"
    sleep 1
    curl -I "http://localhost/uploads/avatars/1760984959900-378051061.jpg" 2>&1 | head -10
else
    echo "❌ Ошибка в синтаксисе!"
    nginx -t
    exit 1
fi

echo ""
echo "✅ Готово!"

