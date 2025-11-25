#!/bin/bash

# Проверка системных блокировок (SELinux, AppArmor)

set -e

echo "🔍 Проверка системных блокировок..."
echo ""

BUILD_DIR="/var/www/mesendger/mesendger/telegram-clone/client-react/build"

# 1. Проверяем SELinux
echo "📋 Проверка SELinux:"
echo "=============================================="
if command -v getenforce >/dev/null 2>&1; then
    SELINUX_STATUS=$(getenforce 2>/dev/null || echo "Not installed")
    echo "SELinux статус: $SELINUX_STATUS"
    if [ "$SELINUX_STATUS" = "Enforcing" ]; then
        echo "⚠️  SELinux включен и может блокировать доступ!"
        echo "Проверяем контекст файлов:"
        ls -Z "$BUILD_DIR/index.html" 2>/dev/null || echo "Команда ls -Z не работает"
    fi
else
    echo "✅ SELinux не установлен"
fi
echo ""

# 2. Проверяем AppArmor
echo "📋 Проверка AppArmor:"
echo "=============================================="
if command -v aa-status >/dev/null 2>&1; then
    AA_STATUS=$(sudo aa-status 2>/dev/null | head -1 || echo "Not installed")
    echo "AppArmor статус: $AA_STATUS"
    if [ ! -z "$AA_STATUS" ] && echo "$AA_STATUS" | grep -q "profiles are loaded"; then
        echo "⚠️  AppArmor активен!"
        echo "Проверяем профиль nginx:"
        sudo aa-status 2>/dev/null | grep nginx || echo "Профиль nginx не найден"
    fi
else
    echo "✅ AppArmor не установлен или не активен"
fi
echo ""

# 3. Проверяем права на весь путь
echo "📋 Проверка прав на весь путь:"
echo "=============================================="
PATH_PARTS="/var /var/www /var/www/mesendger /var/www/mesendger/mesendger /var/www/mesendger/mesendger/telegram-clone /var/www/mesendger/mesendger/telegram-clone/client-react /var/www/mesendger/mesendger/telegram-clone/client-react/build"
for path_part in $PATH_PARTS; do
    if [ -d "$path_part" ]; then
        perms=$(stat -c "%a %U:%G" "$path_part" 2>/dev/null || echo "unknown")
        echo "  $path_part: $perms"
        # Проверяем, может ли www-data читать
        sudo -u www-data ls "$path_part" > /dev/null 2>&1 && echo "    ✅ www-data может читать" || echo "    ❌ www-data НЕ может читать"
    fi
done
echo ""

# 4. Попробуем простой Python сервер для теста
echo "📋 Тест простого HTTP сервера:"
echo "=============================================="
cd "$BUILD_DIR"
timeout 3 python3 -m http.server 8080 > /tmp/python_server.log 2>&1 &
PYTHON_PID=$!
sleep 2
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/index.html 2>/dev/null || echo "000")
kill $PYTHON_PID 2>/dev/null || true
wait $PYTHON_PID 2>/dev/null || true

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Python сервер может отдать файл - проблема в Nginx конфигурации!"
else
    echo "❌ Даже Python сервер не может отдать файл - проблема системная!"
fi
echo ""

# 5. Проверяем, нет ли ошибок в основном конфиге Nginx
echo "📋 Проверка основного конфига Nginx:"
echo "=============================================="
MAIN_CONF="/etc/nginx/nginx.conf"
if [ -f "$MAIN_CONF" ]; then
    echo "Проверяем include директивы:"
    grep -n "include" "$MAIN_CONF" | head -5
    echo ""
    echo "Проверяем user:"
    grep -n "user" "$MAIN_CONF" | head -2
fi
echo ""

# 6. Проверяем реальные ошибки с максимальным логированием
echo "📋 Настройка максимального логирования:"
echo "=============================================="
NGINX_CONF="/etc/nginx/sites-available/mesendger"
if grep -q "error_log" "$NGINX_CONF"; then
    echo "error_log уже настроен"
else
    echo "Добавляем error_log с debug уровнем..."
    sudo sed -i '/server {/a\    error_log /var/log/nginx/mesendger-error.log debug;' "$NGINX_CONF"
    sudo systemctl reload nginx
    sleep 1
fi

echo ""
echo "Делаем тестовый запрос и смотрим детальные логи:"
sudo truncate -s 0 /var/log/nginx/error.log
sleep 1
curl -s -o /dev/null http://localhost/ 2>&1 || true
sleep 1
echo ""
echo "📋 Детальные ошибки:"
sudo tail -30 /var/log/nginx/error.log | head -20

echo ""
echo "=============================================="
echo "📊 РЕЗЮМЕ:"
echo "=============================================="
echo "Проверьте вывод выше для диагностики"

