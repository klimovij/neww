#!/bin/bash

echo "🔧 Копирование файла аватара в правильную директорию..."
echo "=========================================="

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с sudo"
    exit 1
fi

SOURCE_FILE="/var/www/mesendger/server/uploads/avatars/avatar-1763602245961-429194913.jpg"
TARGET_DIR="/var/www/mesendger/mesendger/telegram-clone/server/uploads/avatars"
TARGET_FILE="$TARGET_DIR/avatar-1763602245961-429194913.jpg"

echo ""
echo "1️⃣ Проверяем исходный файл..."
echo "----------------------------------------"

if [ -f "$SOURCE_FILE" ]; then
    echo "✅ Файл найден: $SOURCE_FILE"
    ls -lh "$SOURCE_FILE"
    FILE_SIZE=$(stat -f%z "$SOURCE_FILE" 2>/dev/null || stat -c%s "$SOURCE_FILE" 2>/dev/null)
    echo "   Размер: $FILE_SIZE байт"
else
    echo "❌ Исходный файл не найден: $SOURCE_FILE"
    exit 1
fi

echo ""
echo "2️⃣ Создаём целевую директорию (если нужно)..."
echo "----------------------------------------"
mkdir -p "$TARGET_DIR"
chown -R appuser:appuser "$TARGET_DIR"
chmod -R 755 "$TARGET_DIR"
echo "✅ Директория готова"

echo ""
echo "3️⃣ Копируем файл..."
echo "----------------------------------------"
cp "$SOURCE_FILE" "$TARGET_FILE"
chown appuser:appuser "$TARGET_FILE"
chmod 644 "$TARGET_FILE"

if [ -f "$TARGET_FILE" ]; then
    echo "✅ Файл успешно скопирован"
    ls -lh "$TARGET_FILE"
    
    # Проверяем размер
    TARGET_SIZE=$(stat -f%z "$TARGET_FILE" 2>/dev/null || stat -c%s "$TARGET_FILE" 2>/dev/null)
    if [ "$FILE_SIZE" = "$TARGET_SIZE" ]; then
        echo "✅ Размер файла совпадает: $TARGET_SIZE байт"
    else
        echo "⚠️  Размеры не совпадают: исходный $FILE_SIZE, скопированный $TARGET_SIZE"
    fi
else
    echo "❌ Ошибка при копировании"
    exit 1
fi

echo ""
echo "4️⃣ Проверяем доступ через Nginx..."
echo "----------------------------------------"
sleep 1
curl -I "http://localhost/uploads/avatars/avatar-1763602245961-429194913.jpg" 2>&1 | head -10

echo ""
echo "✅ Копирование завершено!"
echo ""
echo "📝 Теперь аватар должен отображаться в интерфейсе."

