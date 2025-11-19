#!/bin/bash
# Исправление развертывания - копирование файлов

echo "📦 Копирование файлов проекта..."
sudo rsync -av --exclude 'node_modules' \
              --exclude '.git' \
              --exclude 'build' \
              --exclude '*.log' \
              --exclude '*.db' \
              --exclude '*.db-shm' \
              --exclude '*.db-wal' \
              --exclude '*.db.bak_*' \
              /tmp/mesendger-god/mesendger/telegram-clone/ /var/www/mesendger/

echo "🔐 Настройка прав доступа..."
sudo chown -R appuser:appuser /var/www/mesendger

echo "✅ Файлы скопированы!"

