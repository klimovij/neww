#!/bin/bash
# Команды для обновления кода на сервере

echo "🔄 Обновление кода на сервере..."

cd /var/www/mesendger

echo "📥 Получение изменений из Git..."
sudo -u appuser git pull origin main

echo "🔨 Сборка React приложения..."
cd mesendger/telegram-clone/client-react
sudo -u appuser npm run build

echo "🔄 Перезапуск сервера..."
sudo -u appuser pm2 restart mesendger-server

echo "✅ Обновление завершено!"
echo ""
echo "📊 Статус PM2:"
pm2 status

echo ""
echo "📝 Последние логи:"
pm2 logs mesendger-server --lines 20 --nostream

