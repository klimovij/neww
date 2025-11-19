#!/bin/bash

# Исправление прав доступа для сервера

cd /var/www/mesendger

echo "=== Исправление прав доступа ==="
echo ""

# 1. Установка правильного владельца для всех файлов
echo "1. Установка владельца appuser:appuser..."
sudo chown -R appuser:appuser /var/www/mesendger/server/
sudo chown -R appuser:appuser /var/www/mesendger/

# 2. Установка прав на директории
echo "2. Установка прав на директории..."
sudo chmod -R 755 /var/www/mesendger/server/
sudo chmod -R 755 /var/www/mesendger/uploads/ 2>/dev/null || echo "Директория uploads не существует"

# 3. Создание необходимых директорий с правильными правами
echo "3. Создание директорий..."
sudo -u appuser mkdir -p /var/www/mesendger/server/uploads/avatars
sudo -u appuser mkdir -p /var/www/mesendger/server/uploads/emojis
sudo -u appuser mkdir -p /var/www/mesendger/server/uploads/documents

# 4. Копирование файлов аватарок, если они есть в другом месте
echo "4. Копирование файлов аватарок..."
if [ -d "/var/www/mesendger/uploads/avatars" ]; then
    sudo -u appuser cp -r /var/www/mesendger/uploads/avatars/* /var/www/mesendger/server/uploads/avatars/ 2>/dev/null || echo "Файлы уже скопированы или не найдены"
fi

# 5. Проверка прав
echo "5. Проверка прав:"
ls -ld /var/www/mesendger/server/uploads/
ls -ld /var/www/mesendger/server/uploads/avatars/
ls -la /var/www/mesendger/server/uploads/avatars/ | head -5

echo ""
echo "=== Готово ==="

