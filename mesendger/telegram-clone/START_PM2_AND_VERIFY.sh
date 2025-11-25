#!/bin/bash

# Скрипт для запуска PM2 и проверки, что все работает

set -e

echo "🚀 Запуск PM2 приложения..."
echo ""

cd /var/www/mesendger/mesendger/telegram-clone

# Проверяем, запущен ли PM2
if sudo -u appuser pm2 list | grep -q "mesendger-server"; then
    echo "⚠️  PM2 процесс уже запущен, перезапускаем..."
    sudo -u appuser pm2 restart all
else
    echo "▶️  Запускаем PM2..."
    sudo -u appuser pm2 start deploy/ecosystem.config.js
    sudo -u appuser pm2 save
fi

echo ""
echo "📊 Статус PM2:"
sudo -u appuser pm2 status

echo ""
echo "🌐 Проверка доступности сервера..."
sleep 2

# Проверяем, что сервер отвечает
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health | grep -q "200\|404\|401"; then
    echo "✅ Сервер отвечает на порту 5000"
else
    echo "⚠️  Сервер может не отвечать, проверьте логи: pm2 logs"
fi

echo ""
echo "📄 Проверка, что правильный JS файл в build:"
BUILD_DIR="/var/www/mesendger/mesendger/telegram-clone/client-react/build"
if [ -f "$BUILD_DIR/index.html" ]; then
    JS_FILE=$(grep -o 'src="/static/js/[^"]*"' "$BUILD_DIR/index.html" | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
    if [ -f "$BUILD_DIR/$JS_FILE" ]; then
        echo "   ✅ Файл: $JS_FILE"
        if grep -q "V5.0" "$BUILD_DIR/$JS_FILE" 2>/dev/null; then
            echo "   ✅ V5.0 найдена в файле"
        else
            echo "   ⚠️  V5.0 не найдена в файле"
        fi
    fi
fi

echo ""
echo "✅ Готово!"
echo ""
echo "📋 Следующие шаги:"
echo "   1. Откройте браузер с DevTools (F12) → Network"
echo "   2. Установите галочку 'Disable cache'"
echo "   3. Обновите страницу (Ctrl+Shift+R)"
echo "   4. Проверьте, что загружается main.b03f4702.js"
echo "   5. Проверьте заголовок страницы (должно быть [V5.0 - 2025-01-20])"

