#!/bin/bash

echo "🔧 Исправление конфигурации Nginx для отображения аватаров..."
echo "=========================================="

# Проверяем права
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с sudo"
    exit 1
fi

NGINX_CONFIG="/etc/nginx/sites-available/mesendger"
SERVER_UPLOADS_PATH="/var/www/mesendger/mesendger/telegram-clone/server/uploads"

echo ""
echo "1️⃣ Проверяем текущую конфигурацию Nginx..."
echo "----------------------------------------"

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Файл конфигурации не найден: $NGINX_CONFIG"
    exit 1
fi

# Проверяем, существует ли location /uploads
if grep -q "location /uploads" "$NGINX_CONFIG"; then
    echo "✅ Найден location /uploads в конфигурации"
else
    echo "⚠️  location /uploads не найден, добавляем..."
fi

echo ""
echo "2️⃣ Проверяем путь к файлам на сервере..."
echo "----------------------------------------"

if [ -d "$SERVER_UPLOADS_PATH/avatars" ]; then
    echo "✅ Директория найдена: $SERVER_UPLOADS_PATH/avatars"
    AVATAR_COUNT=$(find "$SERVER_UPLOADS_PATH/avatars" -type f 2>/dev/null | wc -l)
    echo "   Количество файлов: $AVATAR_COUNT"
    if [ "$AVATAR_COUNT" -gt 0 ]; then
        echo "   Пример файла:"
        ls -lh "$SERVER_UPLOADS_PATH/avatars" | head -3
    fi
else
    echo "⚠️  Директория не найдена: $SERVER_UPLOADS_PATH/avatars"
    echo "   Создаём директорию..."
    mkdir -p "$SERVER_UPLOADS_PATH/avatars"
    chown -R appuser:appuser "$SERVER_UPLOADS_PATH"
    chmod -R 755 "$SERVER_UPLOADS_PATH"
fi

echo ""
echo "3️⃣ Обновляем конфигурацию Nginx..."
echo "----------------------------------------"

# Создаём резервную копию
cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Создана резервная копия конфигурации"

# Проверяем, есть ли уже location /uploads, который отдаёт файлы напрямую
if grep -q "location /uploads {" "$NGINX_CONFIG" && grep -A 5 "location /uploads" "$NGINX_CONFIG" | grep -q "root.*server/uploads"; then
    echo "✅ Конфигурация для /uploads уже настроена правильно"
else
    echo "⚠️  Нужно обновить конфигурацию..."
    
    # Удаляем старый location /uploads, если он есть (простой proxy_pass)
    if grep -q "location /uploads" "$NGINX_CONFIG"; then
        echo "   Удаляем старый location /uploads..."
        # Создаём временный файл без старого location /uploads
        sed '/^[[:space:]]*location \/uploads {/,/^[[:space:]]*}/d' "$NGINX_CONFIG" > /tmp/nginx_config_temp
        mv /tmp/nginx_config_temp "$NGINX_CONFIG"
    fi
    
    # Добавляем новый location /uploads ПЕРЕД location /api
    echo "   Добавляем новый location /uploads..."
    
    # Ищем строку "location /api" и добавляем перед ней location /uploads
    python3 << 'PYTHON_SCRIPT'
import re

config_path = "/etc/nginx/sites-available/mesendger"
uploads_location = """    # Статические файлы uploads (аватары, скриншоты и т.д.)
    location /uploads {
        alias /var/www/mesendger/mesendger/telegram-clone/server/uploads;
        
        # Кэширование для изображений
        location ~* \.(jpg|jpeg|png|gif|ico|svg)$ {
            expires 30d;
            add_header Cache-Control "public";
        }
        
        # Безопасность
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
    }

"""

try:
    with open(config_path, 'r') as f:
        content = f.read()
    
    # Если location /uploads уже есть с правильной настройкой - не трогаем
    if 'alias /var/www/mesendger/mesendger/telegram-clone/server/uploads' in content:
        print("✅ Конфигурация /uploads уже правильная")
    else:
        # Ищем место для вставки (перед location /api)
        if 'location /api' in content:
            content = content.replace('    # API и WebSocket для бэкенда\n    location /api', 
                                     uploads_location + '    # API и WebSocket для бэкенда\n    location /api')
            
            with open(config_path, 'w') as f:
                f.write(content)
            print("✅ Конфигурация обновлена")
        else:
            print("⚠️  Не найдено location /api для вставки")
except Exception as e:
    print(f"❌ Ошибка: {e}")
PYTHON_SCRIPT
fi

echo ""
echo "4️⃣ Проверяем синтаксис Nginx..."
echo "----------------------------------------"

if nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Синтаксис конфигурации правильный"
    echo ""
    echo "5️⃣ Перезагружаем Nginx..."
    echo "----------------------------------------"
    systemctl reload nginx
    echo "✅ Nginx перезагружен"
else
    echo "❌ Ошибка в конфигурации Nginx!"
    nginx -t
    echo ""
    echo "⚠️  Восстанавливаем резервную копию..."
    cp "$NGINX_CONFIG.backup."* "$NGINX_CONFIG" 2>/dev/null || true
    exit 1
fi

echo ""
echo "6️⃣ Проверяем права доступа..."
echo "----------------------------------------"
chown -R appuser:appuser "$SERVER_UPLOADS_PATH"
chmod -R 755 "$SERVER_UPLOADS_PATH"
echo "✅ Права обновлены"

echo ""
echo "✅ Исправление завершено!"
echo ""
echo "📝 Проверьте отображение аватаров в браузере"
echo "   Если проблема сохраняется, выполните:"
echo "   sudo bash FIX_AVATARS.sh"

