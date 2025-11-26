#!/bin/bash

echo "🔧 Исправление отсутствующих аватаров в базе данных..."
echo "=========================================="

DB_PATH="/var/www/mesendger/messenger.db"
AVATARS_DIR="/var/www/mesendger/mesendger/telegram-clone/server/uploads/avatars"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ База данных не найдена: $DB_PATH"
    exit 1
fi

echo ""
echo "1️⃣ Проверяем пользователей с отсутствующими аватарами..."
echo "----------------------------------------"

# Получаем список всех пользователей с аватарами
sqlite3 "$DB_PATH" "SELECT id, username, avatar FROM users WHERE avatar IS NOT NULL AND avatar != '';" 2>/dev/null | while IFS='|' read -r user_id username avatar_path; do
    # Извлекаем имя файла из пути
    filename=$(basename "$avatar_path")
    
    # Проверяем, существует ли файл
    if [ ! -f "$AVATARS_DIR/$filename" ]; then
        echo "❌ Пользователь ID $user_id ($username): файл не найден: $filename"
        echo "   Текущий путь в БД: $avatar_path"
        
        # Устанавливаем дефолтный аватар
        echo "   → Устанавливаем дефолтный аватар"
        sqlite3 "$DB_PATH" "UPDATE users SET avatar = '/api/avatars/default.png' WHERE id = $user_id;" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "   ✅ Обновлено"
        else
            echo "   ⚠️  Ошибка при обновлении"
        fi
    else
        echo "✅ Пользователь ID $user_id ($username): файл найден: $filename"
    fi
done

echo ""
echo "2️⃣ Проверяем конкретного пользователя..."
echo "----------------------------------------"

# Проверяем пользователя с проблемным аватаром
PROBLEM_USER=$(sqlite3 "$DB_PATH" "SELECT id, username, avatar FROM users WHERE avatar LIKE '%avatar-1763602245961-429194913.jpg%';" 2>/dev/null)

if [ -n "$PROBLEM_USER" ]; then
    echo "Найден пользователь с проблемным аватаром:"
    echo "$PROBLEM_USER"
    echo ""
    
    USER_ID=$(echo "$PROBLEM_USER" | cut -d'|' -f1)
    USERNAME=$(echo "$PROBLEM_USER" | cut -d'|' -f2)
    
    echo "Обновляем аватар для пользователя ID $USER_ID ($USERNAME)..."
    sqlite3 "$DB_PATH" "UPDATE users SET avatar = '/api/avatars/default.png' WHERE id = $USER_ID;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Аватар обновлён на дефолтный"
        
        # Проверяем результат
        NEW_AVATAR=$(sqlite3 "$DB_PATH" "SELECT avatar FROM users WHERE id = $USER_ID;" 2>/dev/null)
        echo "   Новый путь: $NEW_AVATAR"
    else
        echo "❌ Ошибка при обновлении"
    fi
else
    echo "Пользователь с проблемным аватаром не найден"
fi

echo ""
echo "3️⃣ Статистика аватаров..."
echo "----------------------------------------"

TOTAL_USERS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users;" 2>/dev/null)
USERS_WITH_AVATAR=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users WHERE avatar IS NOT NULL AND avatar != '';" 2>/dev/null)
USERS_WITH_DEFAULT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users WHERE avatar = '/api/avatars/default.png';" 2>/dev/null)

echo "Всего пользователей: $TOTAL_USERS"
echo "С аватарами: $USERS_WITH_AVATAR"
echo "С дефолтным аватаром: $USERS_WITH_DEFAULT"

echo ""
echo "✅ Исправление завершено!"
echo ""
echo "📝 Теперь пользователь 'Антон Шпак' будет использовать дефолтный аватар."
echo "   Чтобы установить новый аватар, загрузите его через интерфейс приложения."

