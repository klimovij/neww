#!/bin/bash

# Глубокий анализ и исправление проблемы с кэшированием

set -e

echo "🔍 Глубокий анализ проблемы..."
echo ""

# 1. Проверяем, какой index.html реально отдаёт Nginx
echo "📡 Проверка 1: Что отдаёт Nginx на запрос к /"
echo "=============================================="
NGINX_RESPONSE=$(curl -s http://localhost/ 2>/dev/null)
JS_FILE_IN_RESPONSE=$(echo "$NGINX_RESPONSE" | grep -o 'src="/static/js/[^"]*"' | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
echo "JS файл в ответе Nginx: $JS_FILE_IN_RESPONSE"
echo ""

# 2. Проверяем, какие index.html есть на сервере
echo "📁 Проверка 2: Поиск всех index.html на сервере"
echo "=============================================="
find /var/www/mesendger -name "index.html" -type f 2>/dev/null | while read htmlfile; do
    echo ""
    echo "   Файл: $htmlfile"
    echo "   Дата: $(ls -l "$htmlfile" | awk '{print $6, $7, $8}')"
    JS_FILE=$(grep -o 'src="/static/js/[^"]*"' "$htmlfile" 2>/dev/null | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
    if [ ! -z "$JS_FILE" ]; then
        DIR=$(dirname "$htmlfile")
        JS_FULL_PATH="$DIR/$JS_FILE"
        if [ -f "$JS_FULL_PATH" ]; then
            echo "   JS файл: $JS_FILE (существует)"
            if grep -q "V5.0" "$JS_FULL_PATH" 2>/dev/null; then
                echo "   ✅ V5.0 найдена в JS файле"
            else
                echo "   ⚠️  V5.0 НЕ найдена в JS файле"
            fi
        else
            echo "   JS файл: $JS_FILE (НЕ существует)"
        fi
    fi
done

echo ""
echo ""

# 3. Проверяем конфигурацию Nginx
echo "📋 Проверка 3: Конфигурация Nginx"
echo "=============================================="
NGINX_CONF="/etc/nginx/sites-enabled/mesendger"
if [ -f "$NGINX_CONF" ]; then
    echo "Конфигурация: $NGINX_CONF"
    echo ""
    echo "Путь root для location /:"
    grep -A 10 "location /" "$NGINX_CONF" | grep "root" | head -1 || echo "   Не найден"
    echo ""
    echo "Путь root для location = /:"
    grep -A 5 "location = /" "$NGINX_CONF" | grep "root" | head -1 || echo "   Не найден"
    echo ""
    echo "Путь root для location = /index.html:"
    grep -A 5 "location = /index.html" "$NGINX_CONF" | grep "root" | head -1 || echo "   Не найден"
else
    echo "❌ Конфигурация не найдена: $NGINX_CONF"
fi

echo ""
echo ""

# 4. Проверяем, существует ли старый файл main.faf0ec54.js
echo "🔍 Проверка 4: Поиск файла main.faf0ec54.js"
echo "=============================================="
find /var/www/mesendger -name "main.faf0ec54.js" -type f 2>/dev/null | while read oldfile; do
    echo "   Найден старый файл: $oldfile"
    echo "   Дата: $(ls -l "$oldfile" | awk '{print $6, $7, $8}')"
    echo "   Размер: $(ls -lh "$oldfile" | awk '{print $5}')"
    echo ""
done

# 5. Проверяем правильный файл
echo "🔍 Проверка 5: Поиск файла main.b03f4702.js"
echo "=============================================="
find /var/www/mesendger -name "main.b03f4702.js" -type f 2>/dev/null | while read newfile; do
    echo "   Найден новый файл: $newfile"
    echo "   Дата: $(ls -l "$newfile" | awk '{print $6, $7, $8}')"
    echo "   Размер: $(ls -lh "$newfile" | awk '{print $5}')"
    if grep -q "V5.0" "$newfile" 2>/dev/null; then
        echo "   ✅ V5.0 найдена в файле"
    else
        echo "   ❌ V5.0 НЕ найдена в файле"
    fi
    echo ""
done

echo ""
echo "=============================================="
echo "📊 РЕЗЮМЕ:"
echo "=============================================="
echo "1. Nginx отдаёт JS файл: $JS_FILE_IN_RESPONSE"
echo ""

if [ "$JS_FILE_IN_RESPONSE" = "static/js/main.b03f4702.js" ]; then
    echo "✅ Nginx отдаёт правильный файл!"
    echo "   Проблема в браузере - нужно полностью очистить кэш"
else
    echo "❌ Nginx отдаёт НЕПРАВИЛЬНЫЙ файл!"
    echo "   Нужно исправить конфигурацию или найти, откуда берётся старый index.html"
fi

echo ""
echo "📋 Следующие шаги будут предложены после анализа выше"

