#!/bin/bash

# Проверка новой сборки

set -e

echo "🔍 Проверка новой сборки..."
echo ""

# 1. Проверяем, какой JS файл в index.html
echo "📋 Проверка index.html:"
echo "=============================================="
BUILD_DIR="/var/www/mesendger/mesendger/telegram-clone/client-react/build"
if [ -f "$BUILD_DIR/index.html" ]; then
    JS_FILE=$(grep -o 'src="/static/js/[^"]*"' "$BUILD_DIR/index.html" | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
    echo "JS файл в index.html: $JS_FILE"
    
    if [ -f "$BUILD_DIR/$JS_FILE" ]; then
        echo "✅ JS файл существует"
        if grep -q "V5.0" "$BUILD_DIR/$JS_FILE" 2>/dev/null; then
            echo "✅ V5.0 найдена в JS файле"
        else
            echo "⚠️ V5.0 не найдена в JS файле"
        fi
    else
        echo "❌ JS файл не найден"
    fi
else
    echo "❌ index.html не найден"
fi
echo ""

# 2. Проверяем версию в новом файле
echo "📋 Проверка версии в новом файле:"
echo "=============================================="
NEW_JS="$BUILD_DIR/static/js/main.28f8f690.js"
if [ -f "$NEW_JS" ]; then
    echo "✅ Новый JS файл найден: main.28f8f690.js"
    if grep -q "V5.0" "$NEW_JS" 2>/dev/null; then
        echo "✅ V5.0 найдена в новом файле"
    else
        echo "⚠️ V5.0 не найдена в новом файле"
    fi
else
    echo "⚠️ Новый JS файл не найден"
fi
echo ""

# 3. Проверяем, что Nginx отдаёт правильный файл
echo "📋 Проверка ответа Nginx:"
echo "=============================================="
HTTP_STATUS=$(curl -s -o /tmp/nginx_response.html -w "%{http_code}" http://localhost/)
echo "HTTP статус: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    RESPONSE_JS=$(grep -o 'src="/static/js/[^"]*"' /tmp/nginx_response.html 2>/dev/null | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
    echo "JS файл в ответе Nginx: $RESPONSE_JS"
    
    if [ "$RESPONSE_JS" = "static/js/main.28f8f690.js" ]; then
        echo "✅✅✅ ВСЁ ПРАВИЛЬНО! ✅✅✅"
        echo "   Nginx отдаёт новую сборку!"
    else
        echo "⚠️ Nginx отдаёт другой файл: $RESPONSE_JS"
        echo "   Ожидается: static/js/main.28f8f690.js"
    fi
fi
echo ""

echo "✅ Готово!"
echo ""
echo "📋 Теперь в браузере:"
echo "   1. Откройте сайт в новой вкладке (или инкогнито)"
echo "   2. DevTools → Network → 'Disable cache'"
echo "   3. Обновите страницу (Ctrl+Shift+R)"
echo "   4. Проверьте, что загружается main.28f8f690.js"
echo "   5. Откройте модалку 'Мониторинг времени'"
echo "   6. Проверьте вкладку 'Приложения'"

