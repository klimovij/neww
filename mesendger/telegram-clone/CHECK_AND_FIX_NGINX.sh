#!/bin/bash

echo "🔍 Проверка и исправление конфигурации Nginx..."
echo "=========================================="

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с sudo"
    exit 1
fi

NGINX_CONFIG="/etc/nginx/sites-available/mesendger"

echo ""
echo "1️⃣ Просматриваем текущую конфигурацию..."
echo "----------------------------------------"
echo "Все location блоки:"
grep -n "location" "$NGINX_CONFIG" | head -20

echo ""
echo "2️⃣ Проверяем, есть ли location /uploads..."
echo "----------------------------------------"
if grep -q "location /uploads" "$NGINX_CONFIG"; then
    echo "✅ Найден location /uploads:"
    grep -A 15 "location /uploads" "$NGINX_CONFIG"
else
    echo "❌ location /uploads НЕ НАЙДЕН!"
fi

echo ""
echo "3️⃣ Создаём резервную копию..."
echo "----------------------------------------"
cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.check.$(date +%Y%m%d_%H%M%S)"
echo "✅ Резервная копия создана"

echo ""
echo "4️⃣ Добавляем location /uploads ПЕРЕД location /api..."
echo "----------------------------------------"

# Находим строку с комментарием перед location /api
UPLOADS_BLOCK='    # Статические файлы uploads (аватары, скриншоты и т.д.)
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
'

# Используем Python для точной вставки
python3 << EOF
import sys

config_path = "$NGINX_CONFIG"

try:
    with open(config_path, 'r') as f:
        content = f.read()
    
    # Если location /uploads уже есть с alias - не трогаем
    if 'alias /var/www/mesendger/mesendger/telegram-clone/server/uploads' in content:
        print("✅ location /uploads уже настроен правильно")
        sys.exit(0)
    
    # Удаляем старый location /uploads, если есть (proxy_pass)
    lines = content.split('\n')
    result = []
    skip = False
    skip_count = 0
    
    for i, line in enumerate(lines):
        if 'location /uploads' in line and 'proxy_pass' in content:
            # Начинаем пропускать
            skip = True
            skip_count = 0
            continue
        
        if skip:
            skip_count += 1
            if line.strip() == '}' and skip_count > 1:
                skip = False
                skip_count = 0
            continue
        
        # Вставляем новый блок перед location /api
        if 'location /api' in line and 'uploads' not in '\n'.join(result[-20:]):
            result.append('    # Статические файлы uploads (аватары, скриншоты и т.д.)')
            result.append('    location /uploads {')
            result.append('        alias /var/www/mesendger/mesendger/telegram-clone/server/uploads;')
            result.append('        ')
            result.append('        # Кэширование для изображений')
            result.append('        location ~* \\.(jpg|jpeg|png|gif|ico|svg)$ {')
            result.append('            expires 30d;')
            result.append('            add_header Cache-Control "public";')
            result.append('        }')
            result.append('        ')
            result.append('        # Безопасность')
            result.append('        add_header X-Content-Type-Options nosniff;')
            result.append('        add_header X-Frame-Options DENY;')
            result.append('    }')
            result.append('')
        
        result.append(line)
    
    new_content = '\n'.join(result)
    
    with open(config_path, 'w') as f:
        f.write(new_content)
    
    print("✅ location /uploads добавлен")
    
except Exception as e:
    print(f"❌ Ошибка: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
EOF

echo ""
echo "5️⃣ Проверяем синтаксис..."
echo "----------------------------------------"
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Синтаксис правильный"
    
    echo ""
    echo "6️⃣ Показываем обновлённый location /uploads..."
    echo "----------------------------------------"
    grep -A 15 "location /uploads" "$NGINX_CONFIG" || echo "⚠️  Блок не найден после обновления"
    
    echo ""
    echo "7️⃣ Перезагружаем Nginx..."
    echo "----------------------------------------"
    systemctl reload nginx
    echo "✅ Nginx перезагружен"
    
    echo ""
    echo "8️⃣ Тестируем доступ к файлу..."
    echo "----------------------------------------"
    sleep 1
    echo "Запрос: curl -I http://localhost/uploads/avatars/1760984959900-378051061.jpg"
    RESPONSE=$(curl -I "http://localhost/uploads/avatars/1760984959900-378051061.jpg" 2>&1)
    echo "$RESPONSE" | head -15
    
    if echo "$RESPONSE" | grep -q "Content-Type: image"; then
        echo ""
        echo "✅✅✅ УСПЕХ! Файл отдаётся как изображение!"
    elif echo "$RESPONSE" | grep -q "Content-Type: text/html"; then
        echo ""
        echo "❌ Проблема: файл всё ещё отдаётся как HTML"
        echo "   Проверьте порядок location блоков в конфигурации"
    fi
else
    echo "❌ Ошибка в синтаксисе!"
    nginx -t
    exit 1
fi

echo ""
echo "✅ Проверка завершена!"
