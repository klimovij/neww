#!/bin/bash
# Скрипт для исправления путей в nginx конфигурации

echo "🔧 Исправление путей в nginx конфигурации..."

# Резервная копия
sudo cp /etc/nginx/sites-available/mesendger /etc/nginx/sites-available/mesendger.backup

# Исправление путей
sudo sed -i 's|/var/www/mesendger/mesendger/telegram-clone/client-react/build|/var/www/mesendger/client-react/build|g' /etc/nginx/sites-available/mesendger

# Проверка изменений
echo "📋 Проверка изменений:"
grep "client-react/build" /etc/nginx/sites-available/mesendger

# Проверка конфигурации
echo "✅ Проверка конфигурации nginx:"
sudo nginx -t

# Перезапуск nginx
if [ $? -eq 0 ]; then
    echo "🔄 Перезапуск nginx..."
    sudo systemctl restart nginx
    echo "✅ Nginx перезапущен"
else
    echo "❌ Ошибка в конфигурации nginx"
    exit 1
fi

# Проверка статуса
echo "📊 Статус nginx:"
sudo systemctl status nginx --no-pager | head -5

