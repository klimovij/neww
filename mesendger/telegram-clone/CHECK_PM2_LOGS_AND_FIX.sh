#!/bin/bash

# Проверка логов PM2 и тест запроса

set -e

echo "🔍 Проверка логов PM2 и тест запроса..."
echo ""

# 1. Очищаем логи и делаем тестовый запрос
echo "📋 Очистка логов и тестовый запрос:"
echo "=============================================="
sudo -u appuser pm2 flush
echo "✅ Логи очищены"
echo ""

# 2. Делаем тестовый запрос с правильными параметрами
echo "📡 Тестовый запрос к API:"
echo "=============================================="
TODAY=$(date +%Y-%m-%d)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d 2>/dev/null || date -d "1 day ago" +%Y-%m-%d 2>/dev/null || echo "")

if [ -z "$YESTERDAY" ]; then
    YESTERDAY=$(date -d "1 day ago" +%Y-%m-%d 2>/dev/null || echo "")
fi

echo "Тестируем запрос с параметрами:"
echo "  username: Ksendzik_Oleg"
echo "  start: $YESTERDAY"
echo "  end: $TODAY"
echo ""

curl -s "http://localhost/api/activity-details?username=Ksendzik_Oleg&start=$YESTERDAY&end=$TODAY" | python3 -m json.tool 2>/dev/null | head -30 || curl -s "http://localhost/api/activity-details?username=Ksendzik_Oleg&start=$YESTERDAY&end=$TODAY" | head -500
echo ""

# 3. Ждём немного и смотрим логи
echo "📋 Логи PM2 после запроса:"
echo "=============================================="
sleep 2
sudo -u appuser pm2 logs --lines 100 --nostream | grep -i "activity-details\|ДИАГНОСТИКА\|приложений\|applications" | tail -50
echo ""

echo "✅ Готово!"
echo ""
echo "📋 Проверьте логи выше - там должна быть детальная диагностика фильтрации"

