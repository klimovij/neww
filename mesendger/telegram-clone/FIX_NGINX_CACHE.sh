#!/bin/bash

# Исправление кэширования Nginx для JS файлов

echo "🔍 Проверка конфигурации Nginx..."

NGINX_CONF="/etc/nginx/sites-enabled/mesendger"
if [ ! -f "$NGINX_CONF" ]; then
  NGINX_CONF="/etc/nginx/sites-enabled/default"
fi

echo "📄 Текущая конфигурация:"
echo "----------------------------------------"
sudo cat "$NGINX_CONF" | grep -A 10 "location /"
echo "----------------------------------------"

# Проверяем путь к build
CORRECT_PATH="/var/www/mesendger/mesendger/telegram-clone/client-react/build"
echo ""
echo "🔍 Проверка пути к build:"
if [ -d "$CORRECT_PATH" ]; then
  echo "✅ Путь существует: $CORRECT_PATH"
  echo "   Файлы в директории:"
  ls -lah "$CORRECT_PATH/static/js/main."*.js 2>/dev/null | head -3
  echo ""
  echo "   index.html:"
  ls -lah "$CORRECT_PATH/index.html" 2>/dev/null
  if [ -f "$CORRECT_PATH/index.html" ]; then
    echo ""
    echo "   Содержимое index.html (ссылки на JS):"
    grep -o 'src="/static/js/[^"]*"' "$CORRECT_PATH/index.html" | head -3
  fi
else
  echo "❌ Путь не существует: $CORRECT_PATH"
fi

echo ""
echo "🔧 ВРЕМЕННОЕ ОТКЛЮЧЕНИЕ КЭШИРОВАНИЯ для JS/CSS..."
echo "   Это заставит браузеры всегда запрашивать новые версии"

# Создаем резервную копию
sudo cp "$NGINX_CONF" "$NGINX_CONF.backup.$(date +%Y%m%d_%H%M%S)"

# Временно отключаем кэширование для JS/CSS
sudo sed -i 's/expires 1y;/expires -1;/g' "$NGINX_CONF"
sudo sed -i 's/add_header Cache-Control "public, immutable";/add_header Cache-Control "no-cache, no-store, must-revalidate";/g' "$NGINX_CONF"

echo ""
echo "📄 Обновленная конфигурация:"
echo "----------------------------------------"
sudo cat "$NGINX_CONF" | grep -A 10 "location /"
echo "----------------------------------------"

echo ""
echo "🔄 Тестирование конфигурации..."
if sudo nginx -t; then
  echo "✅ Конфигурация валидна!"
  echo "🔄 Перезапуск Nginx..."
  sudo systemctl reload nginx
  echo "✅ Nginx перезапущен!"
  echo ""
  echo "📋 Теперь:"
  echo "   1. Очистите кэш браузера (Ctrl+Shift+Delete)"
  echo "   2. Или используйте режим инкогнито"
  echo "   3. Проверьте версию в заголовке вкладки"
else
  echo "❌ Ошибка в конфигурации! Восстанавливаем резервную копию..."
  sudo cp "$NGINX_CONF.backup."* "$NGINX_CONF"
  sudo nginx -t
fi

