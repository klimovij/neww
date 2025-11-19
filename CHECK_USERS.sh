#!/bin/bash
# Скрипт для проверки пользователей в базе данных

echo "🔍 Поиск базы данных messenger.db..."
echo ""

# Ищем базу данных в проекте
find /var/www/mesendger -name "*.db" -type f 2>/dev/null

echo ""
echo "📂 Проверяем текущую директорию..."
ls -la /var/www/mesendger/server/ 2>/dev/null || echo "Директория server не найдена"

echo ""
echo "📂 Проверяем корневую директорию проекта..."
ls -la /var/www/mesendger/ | grep -E "\.db|server"

echo ""
echo "🔍 Поиск файлов .db в домашней директории пользователя..."
find ~ -name "*.db" -type f 2>/dev/null | head -5

