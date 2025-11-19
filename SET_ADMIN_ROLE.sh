#!/bin/bash

# Установка роли админа для пользователя

cd /var/www/mesendger

echo "=== Установка роли админа ==="
echo ""

# 1. Проверка текущей роли
echo "1. Текущая роль пользователя 'Олег Ксендзик':"
sudo -u appuser sqlite3 messenger.db "SELECT id, username, role FROM users WHERE username = 'Олег Ксендзик';"

# 2. Установка роли admin
echo ""
echo "2. Установка роли 'admin'..."
sudo -u appuser sqlite3 messenger.db "UPDATE users SET role = 'admin' WHERE username = 'Олег Ксендзик';"

# 3. Проверка результата
echo ""
echo "3. Проверка обновленной роли:"
sudo -u appuser sqlite3 messenger.db "SELECT id, username, role FROM users WHERE username = 'Олег Ксендзик';"

# 4. Список всех пользователей с ролями
echo ""
echo "4. Все пользователи и их роли:"
sudo -u appuser sqlite3 messenger.db "SELECT id, username, role FROM users;"

echo ""
echo "=== Готово ==="

