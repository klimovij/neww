#!/bin/bash
# Скрипт для проверки скриншотов на сервере

echo "🔍 Проверка скриншотов на сервере"
echo "=========================================="
echo ""

# Путь к папке со скриншотами
SCREENSHOTS_DIR="/var/www/mesendger/mesendger/telegram-clone/server/uploads/screenshots"

echo "📁 Проверка папки со скриншотами: $SCREENSHOTS_DIR"
echo ""

# Проверяем существование папки
if [ ! -d "$SCREENSHOTS_DIR" ]; then
    echo "❌ Папка не существует: $SCREENSHOTS_DIR"
    echo "   Создаём папку..."
    sudo mkdir -p "$SCREENSHOTS_DIR"
    sudo chown -R appuser:appuser "$SCREENSHOTS_DIR"
    echo "✅ Папка создана"
else
    echo "✅ Папка существует"
fi

echo ""
echo "📊 Статистика скриншотов:"
echo "----------------------------------------"

# Подсчитываем количество файлов
FILE_COUNT=$(find "$SCREENSHOTS_DIR" -type f -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" 2>/dev/null | wc -l)
echo "Всего файлов скриншотов: $FILE_COUNT"

# Размер папки
TOTAL_SIZE=$(du -sh "$SCREENSHOTS_DIR" 2>/dev/null | cut -f1)
echo "Общий размер: $TOTAL_SIZE"

echo ""
echo "📋 Последние 10 скриншотов:"
echo "----------------------------------------"
find "$SCREENSHOTS_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) -printf "%T@ %p\n" 2>/dev/null | sort -rn | head -10 | while read timestamp filepath; do
    filename=$(basename "$filepath")
    filesize=$(stat -c%s "$filepath" 2>/dev/null || echo "0")
    filesize_mb=$(echo "scale=2; $filesize / 1024 / 1024" | bc 2>/dev/null || echo "0")
    filedate=$(stat -c%y "$filepath" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1 || echo "N/A")
    echo "  📸 $filename"
    echo "     Размер: ${filesize_mb} MB"
    echo "     Дата: $filedate"
    echo "     Путь: $filepath"
    echo ""
done

echo ""
echo "🔍 Проверка базы данных:"
echo "----------------------------------------"
cd /var/www/mesendger
SCREENSHOT_COUNT=$(sudo sqlite3 messenger.db "SELECT COUNT(*) FROM activity_screenshots;" 2>/dev/null || echo "0")
echo "Записей в базе данных: $SCREENSHOT_COUNT"

if [ "$SCREENSHOT_COUNT" -gt 0 ]; then
    echo ""
    echo "📋 Последние 10 записей из базы данных:"
    echo "----------------------------------------"
    sudo sqlite3 messenger.db "SELECT id, username, datetime(timestamp) as ts, file_path, file_size FROM activity_screenshots ORDER BY timestamp DESC LIMIT 10;" 2>/dev/null | while IFS='|' read -r id username ts filepath filesize; do
        filename=$(basename "$filepath" 2>/dev/null || echo "$filepath")
        filesize_mb=$(echo "scale=2; $filesize / 1024 / 1024" | bc 2>/dev/null || echo "0")
        echo "  📸 ID: $id | User: $username | Date: $ts"
        echo "     File: $filename"
        echo "     Size: ${filesize_mb} MB"
        echo "     Path: $filepath"
        
        # Проверяем, существует ли файл
        if [ -f "$filepath" ]; then
            echo "     ✅ Файл существует"
        else
            echo "     ❌ Файл НЕ существует!"
            # Пытаемся найти файл по имени
            found_file=$(find "$SCREENSHOTS_DIR" -name "$filename" 2>/dev/null | head -1)
            if [ -n "$found_file" ]; then
                echo "     ⚠️  Найден файл с таким именем: $found_file"
            fi
        fi
        echo ""
    done
fi

echo ""
echo "🌐 Проверка доступности через веб-сервер:"
echo "----------------------------------------"
# Проверяем, доступна ли папка через веб
if [ -d "$SCREENSHOTS_DIR" ] && [ "$FILE_COUNT" -gt 0 ]; then
    # Берем первый файл для проверки
    test_file=$(find "$SCREENSHOTS_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" \) | head -1)
    if [ -n "$test_file" ]; then
        test_filename=$(basename "$test_file")
        test_url="/uploads/screenshots/$test_filename"
        echo "Тестовый файл: $test_filename"
        echo "URL: $test_url"
        echo "Проверьте доступность: curl -I http://localhost$test_url"
    fi
fi

echo ""
echo "✅ Проверка завершена"

