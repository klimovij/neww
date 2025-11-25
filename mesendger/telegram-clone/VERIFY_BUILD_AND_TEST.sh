#!/bin/bash

# Проверка новой сборки и тест API

set -e

echo "🔍 Проверка новой сборки и тест API..."
echo ""

BUILD_DIR="/var/www/mesendger/mesendger/telegram-clone/client-react/build"

echo "📋 Проверка новой сборки:"
echo "=============================================="
JS_FILE=$(grep -o 'src="/static/js/[^"]*"' "$BUILD_DIR/index.html" 2>/dev/null | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
echo "JS файл в index.html: $JS_FILE"

if [ -f "$BUILD_DIR/$JS_FILE" ]; then
    echo "✅ JS файл существует"
    if grep -q "getTodayLocalDate\|Конвертация времени" "$BUILD_DIR/$JS_FILE" 2>/dev/null; then
        echo "✅ Новые функции найдены в JS файле"
    else
        echo "⚠️ Новые функции не найдены"
    fi
fi
echo ""

echo "📡 Проверка, что Nginx отдаёт правильный файл:"
echo "=============================================="
HTTP_STATUS=$(curl -s -o /tmp/nginx_response.html -w "%{http_code}" http://localhost/)
echo "HTTP статус: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    RESPONSE_JS=$(grep -o 'src="/static/js/[^"]*"' /tmp/nginx_response.html 2>/dev/null | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
    echo "JS файл в ответе Nginx: $RESPONSE_JS"
    
    if echo "$RESPONSE_JS" | grep -q "main.c10f3bc1.js"; then
        echo "✅✅✅ НОВАЯ ВЕРСИЯ ЗАГРУЖАЕТСЯ! ✅✅✅"
    else
        echo "⚠️ Nginx отдаёт другой файл"
    fi
fi
echo ""

echo "📡 Тест API quick-db-report (сегодня):"
echo "=============================================="
TODAY=$(date +%Y-%m-%d)
curl -s "http://localhost/api/quick-db-report?start=$TODAY&end=$TODAY" | python3 -c "import sys, json; data = json.load(sys.stdin); print('Success:', data.get('success')); print('Report count:', len(data.get('report', []))); print('Users:', [r.get('username') for r in data.get('report', [])])" 2>/dev/null || echo "Ошибка"
echo ""

echo "✅ Готово!"

