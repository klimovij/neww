#!/bin/bash

echo "🔧 Восстановление оригинального пути аватара пользователя..."
echo "=========================================="

DB_PATH="/var/www/mesendger/messenger.db"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ База данных не найдена: $DB_PATH"
    exit 1
fi

echo ""
echo "1️⃣ Находим пользователя 'Антон Шпак'..."
echo "----------------------------------------"
USER_DATA=$(sqlite3 "$DB_PATH" "SELECT id, username, avatar FROM users WHERE username LIKE '%Шпак%' OR id = 7;" 2>/dev/null | head -1)

if [ -z "$USER_DATA" ]; then
    echo "❌ Пользователь не найден"
    exit 1
fi

echo "Данные пользователя: $USER_DATA"
USER_ID=$(echo "$USER_DATA" | cut -d'|' -f1)
CURRENT_AVATAR=$(echo "$USER_DATA" | cut -d'|' -f3)

echo "   ID: $USER_ID"
echo "   Текущий аватар: $CURRENT_AVATAR"

echo ""
echo "2️⃣ Восстанавливаем оригинальный путь..."
echo "----------------------------------------"
ORIGINAL_AVATAR="/uploads/avatars/avatar-1763602245961-429194913.jpg"

echo "Восстанавливаем путь: $ORIGINAL_AVATAR"
sqlite3 "$DB_PATH" "UPDATE users SET avatar = '$ORIGINAL_AVATAR' WHERE id = $USER_ID;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Путь восстановлен в базе данных"
    
    # Проверяем результат
    NEW_AVATAR=$(sqlite3 "$DB_PATH" "SELECT avatar FROM users WHERE id = $USER_ID;" 2>/dev/null)
    echo "   Новый путь в БД: $NEW_AVATAR"
else
    echo "❌ Ошибка при обновлении"
    exit 1
fi

echo ""
echo "3️⃣ Проверяем, можем ли мы найти файл..."
echo "----------------------------------------"
AVATARS_DIR="/var/www/mesendger/mesendger/telegram-clone/server/uploads/avatars"
FILENAME="avatar-1763602245961-429194913.jpg"

if [ -f "$AVATARS_DIR/$FILENAME" ]; then
    echo "✅ Файл найден: $AVATARS_DIR/$FILENAME"
    ls -lh "$AVATARS_DIR/$FILENAME"
else
    echo "⚠️  Файл всё ещё не найден: $AVATARS_DIR/$FILENAME"
    echo ""
    echo "📝 РЕШЕНИЕ:"
    echo "   Файл был удалён с сервера. Вам нужно:"
    echo "   1. Загрузить аватар заново через интерфейс приложения"
    echo "   2. Или восстановить файл из резервной копии, если она есть"
    echo ""
    echo "   Путь в базе данных восстановлен, но файл отсутствует."
    echo "   После загрузки нового аватара путь обновится автоматически."
fi

echo ""
echo "✅ Восстановление завершено!"

