#!/bin/bash

echo "🔍 Проверка API /api/activity-details для Ksendzik_Oleg"
echo "=========================================="

# Делаем запрос и сохраняем в файл
echo "📡 Делаем запрос к API..."
curl -s "http://localhost:5000/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-27" > /tmp/activity_details_response.json

# Проверяем количество приложений
echo ""
echo "📊 Анализ ответа:"
echo "-------------------"
APPLICATIONS_COUNT=$(python3 -c "import json; data = json.load(open('/tmp/activity_details_response.json')); print(len(data.get('applications', [])))")
URLS_COUNT=$(python3 -c "import json; data = json.load(open('/tmp/activity_details_response.json')); print(len(data.get('urls', [])))")
SCREENSHOTS_COUNT=$(python3 -c "import json; data = json.load(open('/tmp/activity_details_response.json')); print(len(data.get('screenshots', [])))")

echo "  - URLs: $URLS_COUNT"
echo "  - Applications: $APPLICATIONS_COUNT"
echo "  - Screenshots: $SCREENSHOTS_COUNT"

if [ "$APPLICATIONS_COUNT" -gt 0 ]; then
  echo ""
  echo "📋 Первые 10 приложений:"
  python3 -c "import json; data = json.load(open('/tmp/activity_details_response.json')); apps = data.get('applications', []); [print(f\"  {i+1}. {app.get('procName', 'N/A')}\") for i, app in enumerate(apps[:10])]"
fi

echo ""
echo "📝 Полные логи из PM2 (последние 150 строк):"
echo "=========================================="
sudo -u appuser pm2 logs mesendger-server --lines 150 --nostream 2>&1 | tail -150 | grep -A 5 -B 5 "activity-details\|приложений\|Applications\|allApplications\|Уникальных\|ДИАГНОСТИКА"

echo ""
echo "✅ Проверка завершена!"

