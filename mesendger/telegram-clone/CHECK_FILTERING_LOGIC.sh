#!/bin/bash

# Проверка логики фильтрации и логов

set -e

echo "🔍 Проверка логики фильтрации..."
echo ""

# 1. Смотрим последние логи PM2 для activity-details с детальной информацией
echo "📋 Последние детальные логи activity-details:"
echo "=============================================="
sudo -u appuser pm2 logs --lines 200 --nostream | grep -A 5 -B 5 "activity-details" | tail -80
echo ""

# 2. Проверяем код фильтрации браузеров
echo "📋 Проверка списка браузеров в коде:"
echo "=============================================="
ACTIVITY_FILE="/var/www/mesendger/mesendger/telegram-clone/server/routes/activity.js"
if [ -f "$ACTIVITY_FILE" ]; then
    echo "Ищем список browserProcessNames:"
    grep -A 20 "browserProcessNames" "$ACTIVITY_FILE" | head -25
fi
echo ""

echo "✅ Готово!"
echo ""
echo "📋 Следующие шаги:"
echo "   Попробуйте сделать запрос из браузера к /api/activity-details"
echo "   и сразу проверьте логи: sudo -u appuser pm2 logs --lines 50"

