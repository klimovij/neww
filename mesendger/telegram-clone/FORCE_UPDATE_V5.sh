#!/bin/bash

# АГРЕССИВНОЕ ОБНОВЛЕНИЕ - Очистка всех кэшей и перезапуск

set -e

echo "🔴 [1/8] Останавливаем сервисы..."
sudo systemctl stop nginx 2>/dev/null || true
sudo -u appuser pm2 stop mesendger-server 2>/dev/null || true

echo "🔄 [2/8] Обновление кода из Git..."
cd /var/www/mesendger
sudo -u appuser git pull origin main

echo "🔄 [3/8] Проверка версии в исходниках..."
cd /var/www/mesendger/mesendger/telegram-clone/client-react/src
if grep -q "V5.0 - BUILD 2025-01-20" components/UserWorkTimeDetailsMobile.jsx; then
  echo "✅ V5.0 найдена в исходниках"
else
  echo "❌ ВНИМАНИЕ: V5.0 НЕ найдена в исходниках!"
  exit 1
fi

echo "🔄 [4/8] Переход в директорию client-react..."
cd /var/www/mesendger/mesendger/telegram-clone/client-react

echo "🔄 [5/8] Удаление старой сборки..."
sudo rm -rf build
sudo rm -rf node_modules/.cache 2>/dev/null || true

echo "🔄 [6/8] Сборка frontend..."
sudo -u appuser npm run build

echo "🔄 [7/8] Проверка версии в сборке..."
if grep -q "V5.0 - BUILD 2025-01-20" build/static/js/main.*.js 2>/dev/null; then
  echo "✅ V5.0 найдена в сборке!"
else
  echo "❌ ВНИМАНИЕ: V5.0 НЕ найдена в сборке!"
  echo "   Проверьте файлы в build/static/js/"
  ls -la build/static/js/ 2>/dev/null || echo "Директория не найдена!"
fi

echo "🔄 [8/8] Очистка кэша Nginx и перезапуск..."
# Находим конфигурацию Nginx
NGINX_CONF="/etc/nginx/sites-enabled/mesendger"
if [ ! -f "$NGINX_CONF" ]; then
  NGINX_CONF="/etc/nginx/sites-enabled/default"
fi

echo "   Используем конфигурацию: $NGINX_CONF"

# Очищаем кэш Nginx если он есть
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
sudo rm -rf /var/lib/nginx/cache/* 2>/dev/null || true

# Тестируем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl start nginx
sudo systemctl reload nginx

# Перезапускаем PM2
sudo -u appuser pm2 restart mesendger-server

echo ""
echo "✅ Обновление завершено!"
echo ""
echo "📋 Проверка версии:"
echo "   1. Откройте сайт в браузере"
echo "   2. Проверьте заголовок вкладки - должно быть '[V5.0 - 2025-01-20]'"
echo "   3. Откройте DevTools (F12) → Console"
echo "   4. Должны быть красные логи с V5.0"
echo ""
echo "🔍 Если версия все еще старая:"
echo "   1. Проверьте путь к build в Nginx:"
echo "      sudo cat $NGINX_CONF | grep root"
echo "   2. Проверьте, какой файл загружается:"
echo "      ls -lah /var/www/mesendger/mesendger/telegram-clone/client-react/build/static/js/main.*.js"
echo "   3. Очистите кэш браузера полностью (Ctrl+Shift+Delete)"
echo ""

