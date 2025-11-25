#!/bin/bash

# Скрипт для пересборки и исправления index.html

set -e

echo "🔄 Пересборка frontend..."
echo ""

cd /var/www/mesendger/mesendger/telegram-clone/client-react

# Останавливаем PM2 (чтобы не было проблем с доступом к файлам)
echo "⏸️  Останавливаем PM2..."
pm2 stop all || true

# Обновляем код
echo "📥 Обновляем код..."
cd /var/www/mesendger/mesendger/telegram-clone
sudo -u appuser git pull origin main

# Удаляем старый build
echo "🗑️  Удаляем старый build..."
rm -rf /var/www/mesendger/mesendger/telegram-clone/client-react/build

# Пересобираем
echo "🔨 Пересобираем frontend..."
cd /var/www/mesendger/mesendger/telegram-clone/client-react
sudo -u appuser npm run build

# Проверяем, что build создан
if [ ! -d "build" ]; then
  echo "❌ ОШИБКА: build не создан!"
  exit 1
fi

echo ""
echo "✅ Build создан"
echo ""

# Показываем, какой файл в index.html
echo "📄 Проверка index.html:"
if [ -f "build/index.html" ]; then
  echo "   Ссылки на JS файлы:"
  grep -o 'src="/static/js/[^"]*"' build/index.html || echo "   Не найдено"
  echo ""
  
  # Показываем дату изменения
  echo "   Дата изменения index.html:"
  ls -lh build/index.html | awk '{print "   "$6, $7, $8}'
  echo ""
  
  # Показываем дату изменения JS файла
  JS_FILE=$(grep -o 'src="/static/js/[^"]*"' build/index.html | head -1 | sed 's/src="\([^"]*\)"/\1/' | sed 's|^/|build/|')
  if [ -f "$JS_FILE" ]; then
    echo "   JS файл: $(basename "$JS_FILE")"
    echo "   Дата изменения:"
    ls -lh "$JS_FILE" | awk '{print "   "$6, $7, $8}'
  fi
else
  echo "❌ index.html не найден!"
  exit 1
fi

# Очищаем кэш Nginx для index.html
echo ""
echo "🧹 Очищаем кэш Nginx..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
sudo systemctl reload nginx || sudo service nginx reload

# Перезапускаем PM2
echo ""
echo "▶️  Перезапускаем PM2..."
pm2 restart all

echo ""
echo "✅ Готово!"
echo ""
echo "📋 Проверьте в браузере:"
echo "   1. Откройте DevTools → Network"
echo "   2. Обновите страницу (Ctrl+Shift+R)"
echo "   3. Проверьте, какой файл загружается (должен быть main.b03f4702.js)"
echo "   4. Проверьте заголовок страницы (должно быть [V5.0 - 2025-01-20])"

