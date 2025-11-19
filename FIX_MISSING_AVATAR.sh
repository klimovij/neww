#!/bin/bash

# Скрипт для исправления отсутствующей аватарки

cd /var/www/mesendger

echo "=== Поиск отсутствующего файла аватарки ==="
echo ""

# 1. Поиск файла avatar-1763454336240-17736736.jpg
echo "1. Поиск файла avatar-1763454336240-17736736.jpg:"
find /var/www/mesendger -name "avatar-1763454336240-17736736.jpg" 2>/dev/null

echo ""
echo "2. Все файлы аватарок на сервере:"
echo "В /var/www/mesendger/server/uploads/avatars/:"
ls -la /var/www/mesendger/server/uploads/avatars/ 2>/dev/null | grep -E "\.(png|jpg|jpeg)$"

echo ""
echo "В /var/www/mesendger/uploads/avatars/:"
ls -la /var/www/mesendger/uploads/avatars/ 2>/dev/null | grep -E "\.(png|jpg|jpeg)$" | head -10

echo ""
echo "3. Проверка, какой пользователь имеет этот путь в базе:"
sudo -u appuser sqlite3 messenger.db "SELECT id, username, avatar FROM users WHERE avatar LIKE '%avatar-1763454336240%';"

echo ""
echo "4. Поиск последних загруженных файлов аватарок:"
ls -lt /var/www/mesendger/server/uploads/avatars/*.{png,jpg,jpeg} 2>/dev/null | head -5
ls -lt /var/www/mesendger/uploads/avatars/*.{png,jpg,jpeg} 2>/dev/null | head -5

echo ""
echo "=== Готово ==="

