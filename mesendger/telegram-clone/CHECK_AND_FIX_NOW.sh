#!/bin/bash

# Проверка и исправление проблемы

set -e

echo "🔍 Проверка текущего состояния..."
echo ""

# 1. Проверяем, что отдаёт Nginx
echo "📡 Проверка 1: Ответ Nginx на запрос к /"
echo "=============================================="
NGINX_RESPONSE=$(curl -v http://localhost/ 2>&1)
echo "$NGINX_RESPONSE" | head -50
echo ""

# Проверяем статус код
HTTP_STATUS=$(echo "$NGINX_RESPONSE" | grep -i "< HTTP" | head -1)
echo "HTTP статус: $HTTP_STATUS"
echo ""

# Ищем JS файл в ответе
JS_FILE=$(echo "$NGINX_RESPONSE" | grep -o 'src="/static/js/[^"]*"' | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
echo "JS файл в ответе: $JS_FILE"
echo ""

# 2. Проверяем, существует ли правильный index.html
echo "📁 Проверка 2: Существование index.html"
echo "=============================================="
CORRECT_BUILD="/var/www/mesendger/mesendger/telegram-clone/client-react/build"
if [ -f "$CORRECT_BUILD/index.html" ]; then
    echo "✅ index.html существует: $CORRECT_BUILD/index.html"
    echo "   Дата: $(ls -l "$CORRECT_BUILD/index.html" | awk '{print $6, $7, $8}')"
    JS_FILE_IN_HTML=$(grep -o 'src="/static/js/[^"]*"' "$CORRECT_BUILD/index.html" | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
    echo "   JS файл в index.html: $JS_FILE_IN_HTML"
    if [ -f "$CORRECT_BUILD/$JS_FILE_IN_HTML" ]; then
        echo "   ✅ JS файл существует"
    else
        echo "   ❌ JS файл НЕ существует"
    fi
else
    echo "❌ index.html НЕ существует: $CORRECT_BUILD/index.html"
fi
echo ""

# 3. Проверяем конфигурацию Nginx
echo "📋 Проверка 3: Конфигурация Nginx"
echo "=============================================="
NGINX_CONF="/etc/nginx/sites-enabled/mesendger"
if [ -f "$NGINX_CONF" ]; then
    echo "Конфигурация: $NGINX_CONF"
    echo ""
    echo "Содержимое location блоков:"
    echo "---"
    grep -A 5 "location" "$NGINX_CONF" | head -30
    echo "---"
else
    echo "❌ Конфигурация не найдена"
fi
echo ""

# 4. Проверяем, что Nginx может читать файлы
echo "🔐 Проверка 4: Права доступа"
echo "=============================================="
if [ -r "$CORRECT_BUILD/index.html" ]; then
    echo "✅ Nginx может читать index.html"
else
    echo "❌ Nginx НЕ может читать index.html"
    echo "   Исправляем права..."
    sudo chmod -R 755 "$CORRECT_BUILD"
    sudo chown -R appuser:appuser "$CORRECT_BUILD"
fi
echo ""

# 5. Проверяем логи Nginx
echo "📋 Проверка 5: Последние ошибки Nginx"
echo "=============================================="
sudo tail -20 /var/log/nginx/error.log 2>/dev/null | tail -5 || echo "Нет логов ошибок"
echo ""

# 6. Попробуем напрямую прочитать файл через Nginx путь
echo "📄 Проверка 6: Прямое чтение через правильный путь"
echo "=============================================="
if [ -f "$CORRECT_BUILD/index.html" ]; then
    echo "Первые 5 строк index.html:"
    head -5 "$CORRECT_BUILD/index.html"
    echo ""
fi

echo "=============================================="
echo "📊 РЕЗЮМЕ:"
echo "=============================================="
if [ ! -z "$JS_FILE" ]; then
    echo "Nginx отдаёт JS файл: $JS_FILE"
    if [ "$JS_FILE" = "static/js/main.b03f4702.js" ]; then
        echo "✅ ПРАВИЛЬНО!"
    else
        echo "❌ НЕПРАВИЛЬНО! Ожидается: static/js/main.b03f4702.js"
    fi
else
    echo "❌ JS файл не найден в ответе Nginx"
    echo "   Возможно, Nginx не может отдать index.html"
fi

