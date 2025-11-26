#!/bin/bash

echo "🔍 Проверка и исправление проблемы с аватарами..."
echo "=========================================="

# Определяем путь к серверу
SERVER_DIR="/var/www/mesendger/mesendger/telegram-clone/server"

echo ""
echo "1️⃣ Проверяем, где находятся аватары..."
echo "----------------------------------------"

# Проверяем несколько возможных путей
PATHS=(
  "/var/www/mesendger/mesendger/telegram-clone/server/uploads/avatars"
  "/var/www/mesendger/server/uploads/avatars"
  "/var/www/mesendger/mesendger/telegram-clone/server/../server/uploads/avatars"
)

FOUND_PATH=""
for CHECK_PATH in "${PATHS[@]}"; do
  if [ -d "$CHECK_PATH" ]; then
    echo "✅ Найдена директория: $CHECK_PATH"
    FILE_COUNT=$(find "$CHECK_PATH" -type f 2>/dev/null | wc -l)
    echo "   Файлов в директории: $FILE_COUNT"
    if [ "$FILE_COUNT" -gt 0 ]; then
      echo "   Пример файла:"
      ls -lh "$CHECK_PATH" | head -3
      FOUND_PATH="$CHECK_PATH"
      break
    fi
  else
    echo "❌ Директория не найдена: $CHECK_PATH"
  fi
done

if [ -z "$FOUND_PATH" ]; then
  echo ""
  echo "⚠️  Директория с аватарами не найдена. Создаём..."
  mkdir -p "$SERVER_DIR/uploads/avatars"
  chown -R appuser:appuser "$SERVER_DIR/uploads"
  chmod -R 755 "$SERVER_DIR/uploads"
  FOUND_PATH="$SERVER_DIR/uploads/avatars"
  echo "✅ Создана директория: $FOUND_PATH"
fi

echo ""
echo "2️⃣ Проверяем конфигурацию Express..."
echo "----------------------------------------"

# Проверяем, правильно ли настроен путь в server.js
if grep -q "app.use('/uploads/avatars'" "$SERVER_DIR/server.js"; then
  echo "✅ Express настроен для раздачи /uploads/avatars"
else
  echo "⚠️  В server.js не найден route для /uploads/avatars"
fi

echo ""
echo "3️⃣ Проверяем конфигурацию Nginx..."
echo "----------------------------------------"

NGINX_CONFIG="/etc/nginx/sites-available/mesendger"
if [ -f "$NGINX_CONFIG" ]; then
  if grep -q "location /uploads" "$NGINX_CONFIG"; then
    echo "✅ Nginx настроен для проксирования /uploads"
  else
    echo "⚠️  В Nginx не найден location /uploads"
  fi
else
  echo "⚠️  Файл конфигурации Nginx не найден: $NGINX_CONFIG"
fi

echo ""
echo "4️⃣ Проверяем доступ к файлу аватара..."
echo "----------------------------------------"

# Пробуем найти пример файла аватара
EXAMPLE_AVATAR=$(find "$FOUND_PATH" -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" 2>/dev/null | head -1)
if [ -n "$EXAMPLE_AVATAR" ]; then
  echo "✅ Найден пример аватара: $EXAMPLE_AVATAR"
  echo "   Размер: $(ls -lh "$EXAMPLE_AVATAR" | awk '{print $5}')"
  echo "   Права: $(ls -l "$EXAMPLE_AVATAR" | awk '{print $1}')"
  echo "   Владелец: $(ls -l "$EXAMPLE_AVATAR" | awk '{print $3":"$4}')"
  
  # Проверяем доступность через Node.js
  echo ""
  echo "5️⃣ Проверяем доступность через Express..."
  echo "----------------------------------------"
  AVATAR_FILENAME=$(basename "$EXAMPLE_AVATAR")
  echo "Тестируем доступ к: /uploads/avatars/$AVATAR_FILENAME"
  curl -I "http://localhost:5000/uploads/avatars/$AVATAR_FILENAME" 2>&1 | head -5
else
  echo "⚠️  Не найдено ни одного файла аватара для проверки"
fi

echo ""
echo "6️⃣ Проверяем права доступа..."
echo "----------------------------------------"
chown -R appuser:appuser "$SERVER_DIR/uploads" 2>/dev/null || true
chmod -R 755 "$SERVER_DIR/uploads" 2>/dev/null || true
echo "✅ Права обновлены"

echo ""
echo "✅ Проверка завершена!"
echo ""
echo "📝 Если проблема сохраняется, проверьте:"
echo "   1. Что Express слушает на порту 5000: sudo -u appuser pm2 logs | grep 'Server running'"
echo "   2. Что Nginx проксирует /uploads: curl -I http://YOUR_IP/uploads/avatars/FILENAME"
echo "   3. Логи Nginx: sudo tail -f /var/log/nginx/error.log"

