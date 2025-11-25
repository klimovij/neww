#!/bin/bash

# Тест полного рабочего процесса

set -e

echo "🔍 Тест полного рабочего процесса..."
echo ""

# 1. Проверяем финальную конфигурацию
echo "📋 Проверка финальной конфигурации:"
echo "=============================================="
NGINX_CONF="/etc/nginx/sites-available/mesendger"
if grep -q "location /api" "$NGINX_CONF"; then
    echo "✅ Location /api существует"
else
    echo "❌ Location /api не найден - применяем FINAL_WORKING_CONFIG..."
    cd /var/www/mesendger/mesendger/telegram-clone
    sudo bash FINAL_WORKING_CONFIG.sh
fi
echo ""

# 2. Проверяем, работает ли API напрямую
echo "📡 Тест API напрямую:"
echo "=============================================="
echo "Тест /api/users (должен требовать авторизацию, но отвечать):"
curl -s -o /dev/null -w "Статус: %{http_code}\n" http://localhost:5000/api/users || echo "Ошибка"
echo ""

# 3. Проверяем, работает ли API через Nginx
echo "📡 Тест API через Nginx:"
echo "=============================================="
echo "Тест /api/users через Nginx:"
curl -s -o /dev/null -w "Статус: %{http_code}\n" http://localhost/api/users || echo "Ошибка"
echo ""

# 4. Проверяем, что PM2 работает и перезапускаем на всякий случай
echo "🔄 Проверка PM2:"
echo "=============================================="
sudo -u appuser pm2 restart all
sleep 3
sudo -u appuser pm2 list
echo ""

# 5. Проверяем логи PM2 на ошибки
echo "📋 Последние логи PM2 (первые 10 строк):"
echo "=============================================="
sudo -u appuser pm2 logs --lines 10 --nostream || echo "Нет логов"
echo ""

# 6. Проверяем, что Nginx правильно настроен
echo "📋 Проверка Nginx:"
echo "=============================================="
sudo nginx -t
sudo systemctl reload nginx
sleep 2
echo "✅ Nginx перезагружен"
echo ""

# 7. Финальная проверка
echo "📡 Финальная проверка:"
echo "=============================================="
echo "1. Frontend (/) - должен возвращать 200:"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
echo "   Статус: $FRONTEND_STATUS"
echo ""

echo "2. API (/api/users) - должен возвращать 401 или 200 (не 500):"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/users)
echo "   Статус: $API_STATUS"
echo ""

if [ "$FRONTEND_STATUS" = "200" ] && [ "$API_STATUS" != "500" ] && [ "$API_STATUS" != "000" ]; then
    echo "✅✅✅ ВСЁ РАБОТАЕТ! ✅✅✅"
    echo ""
    echo "📋 Теперь в браузере:"
    echo "   1. Обновите страницу (Ctrl+Shift+R или F5)"
    echo "   2. Откройте DevTools → Network"
    echo "   3. Попробуйте загрузить данные в модалке"
    echo "   4. Проверьте запросы к /api/activity-details"
    echo "   5. Проверьте, что статус ответов 200 или 401, но не 500"
else
    echo "⚠️  Возможны проблемы:"
    echo "   Frontend: $FRONTEND_STATUS"
    echo "   API: $API_STATUS"
fi

echo ""
echo "✅ Готово!"

