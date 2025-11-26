#!/bin/bash

echo "🔧 Финальное исправление конфигурации Nginx для аватаров..."
echo "=========================================="

# Проверяем права
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с sudo"
    exit 1
fi

NGINX_CONFIG="/etc/nginx/sites-available/mesendger"
SERVER_UPLOADS_PATH="/var/www/mesendger/mesendger/telegram-clone/server/uploads"

echo ""
echo "1️⃣ Просматриваем текущую конфигурацию..."
echo "----------------------------------------"
grep -A 15 "location /uploads" "$NGINX_CONFIG" || echo "location /uploads не найден"

echo ""
echo "2️⃣ Создаём резервную копию..."
echo "----------------------------------------"
cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.final.$(date +%Y%m%d_%H%M%S)"
echo "✅ Резервная копия создана"

echo ""
echo "3️⃣ Исправляем конфигурацию..."
echo "----------------------------------------"

# Используем sed для точной замены
cat > /tmp/nginx_fix.py << 'PYEOF'
import sys

config_path = "/etc/nginx/sites-available/mesendger"

uploads_block = """    # Статические файлы uploads (аватары, скриншоты и т.д.)
    location /uploads {
        alias /var/www/mesendger/mesendger/telegram-clone/server/uploads;
        
        # Кэширование для изображений
        location ~* \\.(jpg|jpeg|png|gif|ico|svg)$ {
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
        lines = f.readlines()
    
    result = []
    skip_until_close = False
    found_api_location = False
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Пропускаем старый location /uploads
        if 'location /uploads' in line and not found_api_location:
            skip_until_close = True
            result.append(uploads_block)
            # Пропускаем до закрывающей скобки
            while i < len(lines):
                if lines[i].strip() == '}' and skip_until_close:
                    skip_until_close = False
                    i += 1
                    break
                i += 1
            continue
        
        # Ищем location /api для вставки перед ним, если location /uploads не найден
        if 'location /api' in line and not any('location /uploads' in l for l in result):
            result.append(uploads_block)
            found_api_location = True
        
        if not skip_until_close:
            result.append(line)
        
        i += 1
    
    # Проверяем, что блок был добавлен
    content = ''.join(result)
    if 'alias /var/www/mesendger/mesendger/telegram-clone/server/uploads' not in content:
        print("⚠️  Блок /uploads не был добавлен, добавляем вручную")
        # Находим место перед location /api
        if 'location /api' in content:
            content = content.replace('    # API и WebSocket для бэкенда\n    location /api',
                                     uploads_block + '    # API и WebSocket для бэкенда\n    location /api')
        else:
            # Добавляем перед последней закрывающей скобкой
            content = content.rsplit('}', 1)[0] + uploads_block + '\n}\n'
    
    with open(config_path, 'w') as f:
        f.write(content)
    
    print("✅ Конфигурация обновлена")
    
except Exception as e:
    print(f"❌ Ошибка: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
PYEOF

python3 /tmp/nginx_fix.py

echo ""
echo "4️⃣ Проверяем синтаксис Nginx..."
echo "----------------------------------------"
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Синтаксис правильный"
    
    echo ""
    echo "5️⃣ Просматриваем обновлённую конфигурацию..."
    echo "----------------------------------------"
    grep -A 10 "location /uploads" "$NGINX_CONFIG"
    
    echo ""
    echo "6️⃣ Перезагружаем Nginx..."
    echo "----------------------------------------"
    systemctl reload nginx
    echo "✅ Nginx перезагружен"
    
    echo ""
    echo "7️⃣ Тестируем доступ к файлу..."
    echo "----------------------------------------"
    AVATAR_FILE="/var/www/mesendger/mesendger/telegram-clone/server/uploads/avatars/1760984959900-378051061.jpg"
    if [ -f "$AVATAR_FILE" ]; then
        echo "Тестируем: http://localhost/uploads/avatars/1760984959900-378051061.jpg"
        curl -I "http://localhost/uploads/avatars/1760984959900-378051061.jpg" 2>&1 | head -10
    fi
else
    echo "❌ Ошибка в синтаксисе!"
    nginx -t
    echo ""
    echo "⚠️  Восстанавливаем резервную копию..."
    cp "$NGINX_CONFIG.backup.final."* "$NGINX_CONFIG" 2>/dev/null || true
    exit 1
fi

echo ""
echo "✅ Исправление завершено!"

