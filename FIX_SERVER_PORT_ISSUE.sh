#!/bin/bash
# Скрипт для исправления проблемы с портом 5000 и неправильным путем

echo "🔍 Проверка процессов на порту 5000..."
sudo lsof -i :5000 || echo "Порт 5000 свободен"

echo ""
echo "🛑 Остановка всех процессов PM2..."
sudo -u appuser pm2 stop all
sudo -u appuser pm2 delete all

echo ""
echo "🔍 Поиск процессов Node.js на порту 5000..."
sudo fuser -k 5000/tcp || echo "Нет процессов на порту 5000"

echo ""
echo "⏳ Ожидание 2 секунды..."
sleep 2

echo ""
echo "🔍 Проверка пути к серверу..."
if [ -f "/var/www/mesendger/mesendger/telegram-clone/server/server.js" ]; then
    echo "❌ Обнаружен неправильный путь с двойным mesendger"
    echo "📁 Проверяю правильную структуру..."
    
    # Проверяем правильный путь
    if [ -f "/var/www/mesendger/server/server.js" ]; then
        echo "✅ Правильный путь существует: /var/www/mesendger/server/server.js"
        echo "🔧 Нужно обновить ecosystem.config.js"
    else
        echo "❌ Правильный путь не найден. Нужно исправить структуру каталогов."
    fi
else
    echo "✅ Путь правильный"
fi

echo ""
echo "📋 Проверка ecosystem.config.js..."
if [ -f "/var/www/mesendger/deploy/ecosystem.config.js" ]; then
    echo "🔍 Содержимое ecosystem.config.js:"
    cat /var/www/mesendger/deploy/ecosystem.config.js | grep -A 5 "script"
fi

echo ""
echo "✅ Готово к перезапуску"

