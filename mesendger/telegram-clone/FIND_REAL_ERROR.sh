#!/bin/bash

# Поиск реальной ошибки 500

set -e

echo "🔍 Поиск реальной ошибки 500..."
echo ""

# 1. Проверяем все конфигурации Nginx
echo "📋 Все конфигурации Nginx:"
echo "=============================================="
echo "Активные конфигурации:"
ls -la /etc/nginx/sites-enabled/
echo ""

# 2. Проверяем, нет ли конфликтующих server блоков
echo "🔍 Проверка конфликтующих server блоков:"
echo "=============================================="
for conf in /etc/nginx/sites-enabled/*; do
    if [ -f "$conf" ]; then
        echo ""
        echo "Файл: $conf"
        echo "Server blocks:"
        grep -n "server {" "$conf" | head -5
        echo "Server names:"
        grep -n "server_name" "$conf" | grep -v "#"
    fi
done
echo ""

# 3. Проверяем реальные ошибки в логе (не только alerts)
echo "📋 Реальные ошибки (не alerts):"
echo "=============================================="
sudo tail -50 /var/log/nginx/error.log | grep -v "alert" | grep -v "open socket" | tail -20
echo ""

# 4. Проверяем, можем ли мы прочитать файл напрямую
echo "📄 Попытка чтения файла через Nginx путь:"
echo "=============================================="
BUILD_DIR="/var/www/mesendger/mesendger/telegram-clone/client-react/build"
if [ -f "$BUILD_DIR/index.html" ]; then
    echo "Пробуем прочитать файл как nginx user:"
    sudo -u www-data cat "$BUILD_DIR/index.html" > /dev/null 2>&1 && echo "✅ www-data может читать" || echo "❌ www-data НЕ может читать"
    sudo -u nginx cat "$BUILD_DIR/index.html" > /dev/null 2>&1 && echo "✅ nginx может читать" || echo "❌ nginx НЕ может читать"
fi
echo ""

# 5. Проверяем процесс nginx
echo "🔍 Процесс Nginx:"
echo "=============================================="
ps aux | grep nginx | grep -v grep | head -3
echo ""

# 6. Проверяем, на каком порту слушает Nginx
echo "🔍 Порт Nginx:"
echo "=============================================="
sudo netstat -tlnp | grep nginx || sudo ss -tlnp | grep nginx
echo ""

# 7. Делаем тестовый запрос и смотрим детальные логи
echo "📡 Тестовый запрос с детальным логированием:"
echo "=============================================="
# Включаем debug режим временно
sudo tail -f /var/log/nginx/error.log &
TAIL_PID=$!
sleep 1
curl -v http://localhost/ 2>&1 | head -30
sleep 2
kill $TAIL_PID 2>/dev/null || true
echo ""

# 8. Проверяем, может ли Nginx вообще читать директорию
echo "🔐 Проверка прав на директорию:"
echo "=============================================="
ls -ld "$BUILD_DIR"
ls -ld "$BUILD_DIR/.."
ls -ld "$BUILD_DIR/../.."
echo ""
echo "Проверка прав для nginx user:"
sudo -u www-data ls "$BUILD_DIR" > /dev/null 2>&1 && echo "✅ www-data может читать директорию" || echo "❌ www-data НЕ может читать директорию"
sudo -u nginx ls "$BUILD_DIR" > /dev/null 2>&1 && echo "✅ nginx может читать директорию" || echo "❌ nginx НЕ может читать директорию"

echo ""
echo "=============================================="
echo "📊 РЕЗЮМЕ:"
echo "=============================================="
echo "Проверьте вывод выше, чтобы найти проблему"

