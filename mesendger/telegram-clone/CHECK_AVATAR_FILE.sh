#!/bin/bash

echo "🔍 Проверка файла аватара..."
echo "=========================================="

AVATAR_FILENAME="avatar-1763602245961-429194913.jpg"
AVATARS_DIR="/var/www/mesendger/mesendger/telegram-clone/server/uploads/avatars"

echo ""
echo "1️⃣ Проверяем, существует ли файл..."
echo "----------------------------------------"

# Проверяем точное имя
if [ -f "$AVATARS_DIR/$AVATAR_FILENAME" ]; then
    echo "✅ Файл найден: $AVATARS_DIR/$AVATAR_FILENAME"
    ls -lh "$AVATARS_DIR/$AVATAR_FILENAME"
else
    echo "❌ Файл НЕ найден: $AVATARS_DIR/$AVATAR_FILENAME"
fi

echo ""
echo "2️⃣ Ищем похожие файлы..."
echo "----------------------------------------"

# Ищем файлы, которые содержат похожие номера
echo "Файлы с похожим именем (содержат '1763602245961' или '429194913'):"
find "$AVATARS_DIR" -type f -name "*1763602245961*" -o -name "*429194913*" 2>/dev/null

echo ""
echo "3️⃣ Все файлы в директории аватаров..."
echo "----------------------------------------"
ls -lh "$AVATARS_DIR" | head -10

echo ""
echo "4️⃣ Проверяем доступ через Nginx..."
echo "----------------------------------------"
echo "Тестируем: http://localhost/uploads/avatars/$AVATAR_FILENAME"
curl -I "http://localhost/uploads/avatars/$AVATAR_FILENAME" 2>&1 | head -10

echo ""
echo "5️⃣ Проверяем базу данных..."
echo "----------------------------------------"

# Пробуем найти пользователя с этим аватаром в базе
DB_PATH="/var/www/mesendger/messenger.db"
if [ -f "$DB_PATH" ]; then
    echo "Ищем в базе данных пользователей с аватаром, содержащим '$AVATAR_FILENAME'..."
    sqlite3 "$DB_PATH" "SELECT id, username, avatar FROM users WHERE avatar LIKE '%$AVATAR_FILENAME%' LIMIT 5;" 2>/dev/null || echo "Ошибка доступа к базе данных"
    
    echo ""
    echo "Ищем пользователей с аватаром, содержащим '1763602245961'..."
    sqlite3 "$DB_PATH" "SELECT id, username, avatar FROM users WHERE avatar LIKE '%1763602245961%' LIMIT 5;" 2>/dev/null || echo "Ошибка доступа к базе данных"
else
    echo "⚠️  База данных не найдена: $DB_PATH"
fi

echo ""
echo "✅ Проверка завершена!"

