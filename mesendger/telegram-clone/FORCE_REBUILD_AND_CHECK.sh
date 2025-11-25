#!/bin/bash

# Скрипт для принудительной пересборки и проверки

set -e

echo "🔄 Принудительная пересборка frontend..."
echo ""

cd /var/www/mesendger/mesendger/telegram-clone

# Останавливаем PM2
echo "⏸️  Останавливаем PM2..."
sudo -u appuser pm2 stop all || true

# Обновляем код
echo "📥 Обновляем код..."
sudo -u appuser git pull origin main

# Удаляем старый build ПОЛНОСТЬЮ
echo "🗑️  Удаляем старый build..."
rm -rf /var/www/mesendger/mesendger/telegram-clone/client-react/build
rm -rf /var/www/mesendger/mesendger/telegram-clone/client-react/.cache

# Очищаем node_modules/.cache если есть
if [ -d "/var/www/mesendger/mesendger/telegram-clone/client-react/node_modules/.cache" ]; then
    echo "🗑️  Очищаем кэш node_modules..."
    rm -rf /var/www/mesendger/mesendger/telegram-clone/client-react/node_modules/.cache
fi

# Пересобираем
echo "🔨 Пересобираем frontend..."
cd /var/www/mesendger/mesendger/telegram-clone/client-react
sudo -u appuser npm run build

# Проверяем результат
BUILD_DIR="/var/www/mesendger/mesendger/telegram-clone/client-react/build"
if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ ОШИБКА: build не создан!"
    exit 1
fi

echo ""
echo "✅ Build создан"
echo ""

# Проверяем index.html
echo "📄 Проверка index.html:"
if [ -f "$BUILD_DIR/index.html" ]; then
    echo "   Ссылки на JS файлы:"
    grep -o 'src="/static/js/[^"]*"' "$BUILD_DIR/index.html" | sed 's/^/   /'
    echo ""
    
    # Показываем, какой файл ссылается
    JS_FILE=$(grep -o 'src="/static/js/[^"]*"' "$BUILD_DIR/index.html" | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/||')
    echo "   Основной JS файл: $JS_FILE"
    echo ""
    
    if [ -f "$BUILD_DIR/$JS_FILE" ]; then
        echo "   ✅ Файл существует"
        echo "   Размер: $(ls -lh "$BUILD_DIR/$JS_FILE" | awk '{print $5}')"
        echo "   Дата: $(ls -l "$BUILD_DIR/$JS_FILE" | awk '{print $6, $7, $8}')"
        echo ""
        
        # Проверяем версию
        echo "   Проверка версии в файле:"
        if grep -q "V5.0.*BUILD 2025-01-20" "$BUILD_DIR/$JS_FILE" 2>/dev/null; then
            echo "   ✅ V5.0 НАЙДЕНА!"
            grep -o "V5.0.*BUILD 2025-01-20" "$BUILD_DIR/$JS_FILE" | head -1 | sed 's/^/      /'
        elif grep -q "V5.0" "$BUILD_DIR/$JS_FILE" 2>/dev/null; then
            echo "   ✅ V5.0 найдена (без BUILD)"
            grep -o "V5.0[^\"' ]*" "$BUILD_DIR/$JS_FILE" | head -1 | sed 's/^/      /'
        else
            echo "   ❌ V5.0 НЕ НАЙДЕНА!"
            echo "   Поиск других версий:"
            grep -o "V[0-9]\.[0-9][^\"' ]*" "$BUILD_DIR/$JS_FILE" | head -3 | sed 's/^/      /' || echo "      Версии не найдены"
        fi
    else
        echo "   ❌ Файл НЕ существует: $JS_FILE"
    fi
else
    echo "   ❌ index.html не найден!"
    exit 1
fi

# Показываем содержимое index.html (первые 30 строк)
echo ""
echo "📋 Первые 30 строк index.html:"
head -30 "$BUILD_DIR/index.html" | sed 's/^/   /'

# Очищаем кэш Nginx
echo ""
echo "🧹 Очистка кэша Nginx..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
sudo find /var/cache/nginx -type f -delete 2>/dev/null || true

# Перезапускаем Nginx
echo ""
echo "🔄 Перезапуск Nginx..."
sudo systemctl reload nginx || sudo systemctl restart nginx

# Запускаем PM2
echo ""
echo "▶️  Запускаем PM2..."
cd /var/www/mesendger/mesendger/telegram-clone
sudo -u appuser pm2 restart all || sudo -u appuser pm2 start deploy/ecosystem.config.js

echo ""
echo "✅ Готово!"
echo ""
echo "📋 Теперь проверьте:"
echo "   1. Откройте сайт в новой вкладке (или инкогнито)"
echo "   2. DevTools → Network → 'Disable cache'"
echo "   3. Обновите страницу (Ctrl+Shift+R)"
echo "   4. Проверьте, что загружается файл: $JS_FILE"

