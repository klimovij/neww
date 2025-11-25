#!/bin/bash

# Скрипт для обновления frontend на сервере и проверки версии
# Выполняется на сервере от пользователя appuser

set -e  # Остановить при ошибке

echo "🔄 [1/6] Обновление кода из Git..."
cd /var/www/mesendger
sudo -u appuser git pull origin main

echo "🔄 [2/6] Переход в директорию client-react..."
cd /var/www/mesendger/mesendger/telegram-clone/client-react

echo "🔄 [3/6] Удаление старой сборки..."
sudo rm -rf build

echo "🔄 [4/6] Сборка frontend..."
sudo -u appuser npm run build

echo "🔄 [5/6] Проверка версии в собранном файле..."
if grep -q "V5.0 - BUILD 2025-01-20" build/static/js/main.*.js 2>/dev/null; then
  echo "✅ НОВАЯ ВЕРСИЯ V5.0 НАЙДЕНА В СБОРКЕ!"
else
  echo "⚠️ ВНИМАНИЕ: Версия V5.0 НЕ найдена в сборке!"
  echo "   Проверьте файл build/static/js/main.*.js"
fi

echo "🔄 [6/6] Перезапуск PM2 сервера..."
sudo -u appuser pm2 restart mesendger-server

echo ""
echo "✅ Обновление завершено!"
echo ""
echo "📋 Следующие шаги:"
echo "   1. Откройте браузер и очистите кэш (Ctrl+Shift+Delete)"
echo "   2. Или выполните Hard Reload (Ctrl+Shift+R или Ctrl+F5)"
echo "   3. Откройте DevTools (F12) → Console"
echo "   4. Найдите лог: '🚨🚨🚨 НАЧАЛО КОМПОНЕНТА V5.0 - BUILD 2025-01-20'"
echo ""
echo "🔍 Проверьте логи сервера:"
echo "   sudo -u appuser pm2 logs mesendger-server --lines 50"

