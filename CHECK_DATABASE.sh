#!/bin/bash
# Скрипт для проверки базы данных на сервере

echo "🔍 Проверка базы данных..."

cd /var/www/mesendger/server

# Проверка структуры таблицы users
echo ""
echo "📋 Структура таблицы users:"
sqlite3 messenger.db ".schema users" 2>/dev/null || echo "База данных не найдена или ошибка доступа"

echo ""
echo "📊 Пользователи в базе данных:"
sqlite3 messenger.db "SELECT id, username, avatar, role, employee_id, department FROM users LIMIT 10;" 2>/dev/null || echo "Ошибка чтения данных"

echo ""
echo "📊 Количество пользователей:"
sqlite3 messenger.db "SELECT COUNT(*) as total FROM users;" 2>/dev/null || echo "Ошибка подсчета"

echo ""
echo "📋 Проверка колонок таблицы users:"
sqlite3 messenger.db "PRAGMA table_info(users);" 2>/dev/null || echo "Ошибка получения информации о таблице"

echo ""
echo "✅ Проверка завершена"

