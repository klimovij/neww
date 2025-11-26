#!/bin/bash

echo "🔍 Поиск файла аватара по всей системе..."
echo "=========================================="

AVATAR_FILENAME="avatar-1763602245961-429194913.jpg"
TIMESTAMP="1763602245961"
RANDOM_NUM="429194913"

echo ""
echo "1️⃣ Поиск файла по точному имени..."
echo "----------------------------------------"
find /var/www/mesendger -name "$AVATAR_FILENAME" -type f 2>/dev/null

echo ""
echo "2️⃣ Поиск файлов с похожими именами (по timestamp)..."
echo "----------------------------------------"
find /var/www/mesendger -name "*$TIMESTAMP*" -type f 2>/dev/null

echo ""
echo "3️⃣ Поиск файлов с похожими именами (по random)..."
echo "----------------------------------------"
find /var/www/mesendger -name "*$RANDOM_NUM*" -type f 2>/dev/null

echo ""
echo "4️⃣ Все файлы в директориях uploads..."
echo "----------------------------------------"
echo "В /var/www/mesendger/mesendger/telegram-clone/server/uploads/avatars:"
ls -lh /var/www/mesendger/mesendger/telegram-clone/server/uploads/avatars/ 2>/dev/null

echo ""
echo "В /var/www/mesendger/server/uploads/avatars (если существует):"
ls -lh /var/www/mesendger/server/uploads/avatars/ 2>/dev/null

echo ""
echo "5️⃣ Проверяем базу данных для пользователя Антон Шпак..."
echo "----------------------------------------"
DB_PATH="/var/www/mesendger/messenger.db"
if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" "SELECT id, username, avatar FROM users WHERE username LIKE '%Шпак%' OR username LIKE '%Шпак%';" 2>/dev/null
    echo ""
    echo "Все пользователи с их аватарами:"
    sqlite3 "$DB_PATH" "SELECT id, username, avatar FROM users;" 2>/dev/null
fi

echo ""
echo "6️⃣ Проверяем резервные копии или бэкапы..."
echo "----------------------------------------"
find /var/www/mesendger -name "*.backup" -o -name "*backup*" -type d 2>/dev/null | head -5

echo ""
echo "✅ Поиск завершён!"
echo ""
echo "📝 Если файл не найден, его можно загрузить заново через интерфейс приложения."

