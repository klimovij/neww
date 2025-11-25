#!/bin/bash

# Тест доступа к файлам

set -e

echo "🔍 Тест доступа к файлам..."
echo ""

BUILD_DIR="/var/www/mesendger/mesendger/telegram-clone/client-react/build"

# 1. Проверяем права
echo "📁 Проверка прав на директорию и файлы:"
echo "=============================================="
ls -la "$BUILD_DIR" | head -10
echo ""
ls -la "$BUILD_DIR/index.html"
echo ""

# 2. Проверяем, может ли www-data читать
echo "🔐 Проверка доступа www-data:"
echo "=============================================="
sudo -u www-data ls "$BUILD_DIR" > /dev/null 2>&1 && echo "✅ www-data может читать директорию" || echo "❌ www-data НЕ может читать директорию"
sudo -u www-data cat "$BUILD_DIR/index.html" > /dev/null 2>&1 && echo "✅ www-data может читать index.html" || echo "❌ www-data НЕ может читать index.html"
echo ""

# 3. Создаём простой тестовый index.html
echo "📝 Создание тестового index.html:"
echo "=============================================="
sudo tee "$BUILD_DIR/index_test.html" > /dev/null <<'EOF'
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><h1>Test Works!</h1></body>
</html>
EOF
echo "✅ Тестовый файл создан"
sudo chmod 644 "$BUILD_DIR/index_test.html"
echo ""

# 4. Проверяем доступ к тестовому файлу
echo "🔍 Проверка доступа к тестовому файлу:"
sudo -u www-data cat "$BUILD_DIR/index_test.html" > /dev/null 2>&1 && echo "✅ www-data может читать тестовый файл" || echo "❌ www-data НЕ может читать тестовый файл"
echo ""

# 5. Меняем конфигурацию, чтобы отдавать тестовый файл
echo "🔧 Обновление конфигурации для тестового файла:"
NGINX_CONF="/etc/nginx/sites-available/mesendger"

sudo tee "$NGINX_CONF" > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;
    access_log /var/log/nginx/mesendger-access.log;
    error_log /var/log/nginx/mesendger-error.log;

    root /var/www/mesendger/mesendger/telegram-clone/client-react/build;
    index index_test.html;

    location = / {
        return 301 /index_test.html;
    }

    location / {
        try_files $uri $uri/ =404;
    }

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

echo "✅ Конфигурация обновлена для тестового файла"
echo ""

# 6. Проверяем и перезапускаем
if sudo nginx -t; then
    echo "✅ Конфигурация валидна"
    sudo systemctl reload nginx
    sleep 2
    
    echo ""
    echo "📡 Тест доступа к тестовому файлу:"
    HTTP_STATUS=$(curl -s -o /tmp/test_response.html -w "%{http_code}" http://localhost/index_test.html)
    echo "HTTP статус для /index_test.html: $HTTP_STATUS"
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✅✅✅ ТЕСТОВЫЙ ФАЙЛ РАБОТАЕТ! Проблема в index.html! ✅✅✅"
        echo ""
        echo "📄 Содержимое ответа:"
        cat /tmp/test_response.html
    else
        echo "❌ Даже тестовый файл не работает - проблема глубже"
        echo ""
        echo "📋 Ошибки:"
        sudo tail -10 /var/log/nginx/error.log
    fi
else
    echo "❌ Ошибка в конфигурации!"
    exit 1
fi

echo ""
echo "✅ Готово!"

