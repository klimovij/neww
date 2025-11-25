#!/bin/bash

# Отладка пустой модалки

set -e

echo "🔍 Отладка пустой модалки..."
echo ""

MAIN_DB="/var/www/mesendger/messenger.db"

echo "📊 Проверка данных в базе:"
echo "=============================================="
echo "Последние 5 записей для Ksendzik_Oleg:"
sudo sqlite3 "$MAIN_DB" "SELECT datetime(timestamp) as dt, date(timestamp) as d, proc_name FROM activity_logs WHERE username = 'Ksendzik_Oleg' ORDER BY timestamp DESC LIMIT 5;" 2>/dev/null || echo "Ошибка"
echo ""

echo "📡 Тест API запроса за 25-26 ноября:"
echo "=============================================="
echo "Тест 1: Запрос за 25-26 ноября:"
curl -s "http://localhost/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-26" | python3 -m json.tool 2>/dev/null | head -50 || curl -s "http://localhost/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-26" | head -1000
echo ""
echo ""

echo "Тест 2: Запрос только за 25 ноября:"
curl -s "http://localhost/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-25" | python3 -m json.tool 2>/dev/null | head -50 || curl -s "http://localhost/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-25" | head -1000
echo ""
echo ""

echo "Тест 3: Проверка количества приложений:"
curl -s "http://localhost/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-26" | python3 -c "import sys, json; data = json.load(sys.stdin); print('Success:', data.get('success')); print('Applications count:', len(data.get('applications', []))); print('URLs count:', len(data.get('urls', []))); print('Screenshots count:', len(data.get('screenshots', [])))" 2>/dev/null || echo "Ошибка парсинга"
echo ""

echo "✅ Готово!"
echo ""
echo "📋 Проверьте в браузере:"
echo "   1. DevTools → Network → запрос к /api/activity-details"
echo "   2. Какие параметры отправляются (start, end, username)"
echo "   3. Что в Response (есть ли applications, urls, screenshots)"
echo "   4. Console - есть ли ошибки?"

