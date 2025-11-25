#!/bin/bash

# Проверка и исправление конфигурации Nginx

echo "🔍 Проверка конфигурации Nginx..."

# Находим конфигурацию Nginx
NGINX_CONF="/etc/nginx/sites-enabled/mesendger"
if [ ! -f "$NGINX_CONF" ]; then
  NGINX_CONF="/etc/nginx/sites-enabled/default"
  echo "   Используем конфигурацию: $NGINX_CONF"
fi

if [ ! -f "$NGINX_CONF" ]; then
  echo "❌ Конфигурация Nginx не найдена!"
  echo "   Проверьте: ls -la /etc/nginx/sites-enabled/"
  exit 1
fi

echo "📄 Текущая конфигурация Nginx:"
echo "----------------------------------------"
sudo cat "$NGINX_CONF" | grep -A 5 "root"
echo "----------------------------------------"

# Проверяем путь к build
CORRECT_PATH="/var/www/mesendger/mesendger/telegram-clone/client-react/build"
WRONG_PATH="/var/www/mesendger/client-react/build"

echo ""
echo "🔍 Проверка существования директорий:"
if [ -d "$CORRECT_PATH" ]; then
  echo "✅ ПРАВИЛЬНЫЙ путь существует: $CORRECT_PATH"
  echo "   Файлы в директории:"
  ls -lah "$CORRECT_PATH/static/js/main.*.js" 2>/dev/null | head -3 || echo "   JS файлы не найдены"
elif [ -d "$WRONG_PATH" ]; then
  echo "⚠️  Найден СТАРЫЙ путь: $WRONG_PATH"
  echo "   Файлы в директории:"
  ls -lah "$WRONG_PATH/static/js/main.*.js" 2>/dev/null | head -3 || echo "   JS файлы не найдены"
else
  echo "❌ Оба пути не существуют!"
  echo "   Проверьте структуру:"
  find /var/www/mesendger -name "main.*.js" -type f 2>/dev/null | head -5
fi

echo ""
echo "🔍 Проверка версии в файлах:"
echo "----------------------------------------"
if [ -d "$CORRECT_PATH/static/js" ]; then
  echo "В файлах правильного пути:"
  grep -h "V5.0" "$CORRECT_PATH/static/js/main."*.js 2>/dev/null | head -1 || echo "   V5.0 не найдена"
fi
if [ -d "$WRONG_PATH/static/js" ]; then
  echo "В файлах старого пути:"
  grep -h "V5.0\|V2.0\|V3.0\|V4.0" "$WRONG_PATH/static/js/main."*.js 2>/dev/null | head -1 || echo "   Версия не найдена"
fi
echo "----------------------------------------"

echo ""
echo "📋 Рекомендации:"
echo "   1. Если путь неправильный - исправьте конфигурацию Nginx"
echo "   2. После исправления выполните: sudo nginx -t && sudo systemctl reload nginx"
echo "   3. Очистите кэш Nginx: sudo rm -rf /var/cache/nginx/*"

