#!/bin/bash

# Скрипт для проверки, какой файл реально загружается браузером

echo "🔍 Проверка того, что находится на сервере..."

BUILD_DIR="/var/www/mesendger/mesendger/telegram-clone/client-react/build"

echo ""
echo "📁 Проверка директории build:"
if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ Директория не существует: $BUILD_DIR"
  exit 1
fi

echo "✅ Директория существует: $BUILD_DIR"
echo ""

echo "📄 Файл index.html:"
if [ -f "$BUILD_DIR/index.html" ]; then
  echo "   Размер: $(ls -lh "$BUILD_DIR/index.html" | awk '{print $5}')"
  echo "   Дата изменения: $(ls -l "$BUILD_DIR/index.html" | awk '{print $6, $7, $8}')"
  echo ""
  echo "   Ссылки на JS файлы в index.html:"
  grep -o 'src="/static/js/[^"]*"' "$BUILD_DIR/index.html" || echo "   Не найдено ссылок на JS"
  echo ""
  echo "   Полное содержимое index.html (первые 50 строк):"
  head -50 "$BUILD_DIR/index.html"
else
  echo "❌ index.html не найден!"
fi

echo ""
echo "📦 JS файлы в build/static/js/:"
if [ -d "$BUILD_DIR/static/js" ]; then
  echo "   Все main.*.js файлы:"
  ls -lh "$BUILD_DIR/static/js/main."*.js 2>/dev/null | while read line; do
    echo "   $line"
  done
  echo ""
  echo "   Версии в JS файлах:"
  for jsfile in "$BUILD_DIR/static/js/main."*.js; do
    if [ -f "$jsfile" ]; then
      filename=$(basename "$jsfile")
      echo ""
      echo "   === $filename ==="
      echo "   Размер: $(ls -lh "$jsfile" | awk '{print $5}')"
      echo "   Дата: $(ls -l "$jsfile" | awk '{print $6, $7, $8}')"
      echo "   Поиск версии V5.0:"
      if grep -q "V5.0.*BUILD 2025-01-20" "$jsfile" 2>/dev/null; then
        echo "   ✅ V5.0 НАЙДЕНА!"
        grep -o "V5.0.*BUILD 2025-01-20" "$jsfile" | head -1
      elif grep -q "V[0-9]\.[0-9]" "$jsfile" 2>/dev/null; then
        echo "   ⚠️  Найдены другие версии:"
        grep -o "V[0-9]\.[0-9][^\"']*" "$jsfile" | head -3 | sed 's/^/      /'
      else
        echo "   ❌ Версия не найдена в файле"
      fi
      echo "   Поиск 'НАЧАЛО КОМПОНЕНТА':"
      grep -o "НАЧАЛО КОМПОНЕНТА[^\"']*" "$jsfile" 2>/dev/null | head -1 | sed 's/^/      /' || echo "      Не найдено"
    fi
  done
else
  echo "❌ Директория static/js не найдена!"
fi

echo ""
echo "🌐 Проверка конфигурации Nginx:"
NGINX_CONF="/etc/nginx/sites-enabled/mesendger"
if [ ! -f "$NGINX_CONF" ]; then
  NGINX_CONF="/etc/nginx/sites-enabled/default"
fi

if [ -f "$NGINX_CONF" ]; then
  echo "   Конфигурация: $NGINX_CONF"
  echo "   Путь root:"
  grep "root " "$NGINX_CONF" | head -1 || echo "      Не найден"
  echo ""
  echo "   Настройки кэширования:"
  grep -A 5 "location ~\* \\.(js\|css)" "$NGINX_CONF" || echo "      Не найдено"
else
  echo "   ❌ Конфигурация Nginx не найдена!"
fi

echo ""
echo "📋 ИНСТРУКЦИЯ ДЛЯ ПРОВЕРКИ В БРАУЗЕРЕ:"
echo "   1. Откройте DevTools (F12)"
echo "   2. Перейдите на вкладку Network"
echo "   3. Установите фильтр 'JS'"
echo "   4. Обновите страницу (F5)"
echo "   5. Найдите файл main.*.js"
echo "   6. Кликните на него → вкладка Headers"
echo "   7. Проверьте поле 'Request URL' - какой файл запрашивается?"
echo "   8. Во вкладке Response найдите 'V5.0' или 'V2.0/V3.0'"
echo ""
echo "   Пришлите мне:"
echo "   - Какой файл загружается (main.XXXXX.js)"
echo "   - Что видно в Response (версию)"

