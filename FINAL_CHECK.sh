#!/bin/bash

# Финальная проверка аватарок

echo "=== Финальная проверка ==="
cd /var/www/mesendger

# 1. Проверка полного HTTP ответа для аватарок
echo "1. Проверка доступности аватарок через HTTP:"
echo "PNG файл:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nContent-Type: %{content_type}\nSize: %{size_download} bytes\n" http://localhost/uploads/avatars/1760984942433-378417123.png

echo ""
echo "JPG файл:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nContent-Type: %{content_type}\nSize: %{size_download} bytes\n" http://localhost/uploads/avatars/1760984959900-378051061.jpg

# 2. Проверка через внешний IP
echo ""
echo "2. Проверка через внешний IP (35.232.108.72):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://35.232.108.72/uploads/avatars/1760984942433-378417123.png

# 3. Проверка данных в базе
echo ""
echo "3. Данные пользователей:"
sudo -u appuser sqlite3 messenger.db "SELECT id, username, avatar FROM users;"

echo ""
echo "=== Готово ==="

