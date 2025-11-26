#!/bin/bash

echo "🔄 Синхронизация всех аватаров из старой директории в новую..."
echo "=========================================="

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с sudo"
    exit 1
fi

SOURCE_DIR="/var/www/mesendger/server/uploads/avatars"
TARGET_DIR="/var/www/mesendger/mesendger/telegram-clone/server/uploads/avatars"

echo ""
echo "1️⃣ Проверяем исходную директорию..."
echo "----------------------------------------"

if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Исходная директория не найдена: $SOURCE_DIR"
    exit 1
fi

SOURCE_COUNT=$(find "$SOURCE_DIR" -type f | wc -l)
echo "✅ Исходная директория найдена"
echo "   Файлов в исходной директории: $SOURCE_COUNT"
ls -lh "$SOURCE_DIR" | head -15

echo ""
echo "2️⃣ Создаём целевую директорию..."
echo "----------------------------------------"
mkdir -p "$TARGET_DIR"
chown -R appuser:appuser "$TARGET_DIR"
chmod -R 755 "$TARGET_DIR"
echo "✅ Целевая директория готова"

echo ""
echo "3️⃣ Копируем все файлы..."
echo "----------------------------------------"

COPIED=0
SKIPPED=0

for file in "$SOURCE_DIR"/*; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        target_file="$TARGET_DIR/$filename"
        
        if [ -f "$target_file" ]; then
            echo "⏭️  Пропускаем (уже существует): $filename"
            SKIPPED=$((SKIPPED + 1))
        else
            cp "$file" "$target_file"
            chown appuser:appuser "$target_file"
            chmod 644 "$target_file"
            echo "✅ Скопировано: $filename"
            COPIED=$((COPIED + 1))
        fi
    fi
done

echo ""
echo "4️⃣ Статистика..."
echo "----------------------------------------"
echo "   Скопировано новых файлов: $COPIED"
echo "   Пропущено (уже существовали): $SKIPPED"

TARGET_COUNT=$(find "$TARGET_DIR" -type f | wc -l)
echo "   Всего файлов в целевой директории: $TARGET_COUNT"

echo ""
echo "5️⃣ Проверяем конкретный файл аватара..."
echo "----------------------------------------"
AVATAR_FILE="avatar-1763602245961-429194913.jpg"
if [ -f "$TARGET_DIR/$AVATAR_FILE" ]; then
    echo "✅ Файл найден: $TARGET_DIR/$AVATAR_FILE"
    ls -lh "$TARGET_DIR/$AVATAR_FILE"
    
    echo ""
    echo "6️⃣ Тестируем доступ через Nginx..."
    echo "----------------------------------------"
    curl -I "http://localhost/uploads/avatars/$AVATAR_FILE" 2>&1 | head -10
else
    echo "❌ Файл не найден: $TARGET_DIR/$AVATAR_FILE"
fi

echo ""
echo "✅ Синхронизация завершена!"

