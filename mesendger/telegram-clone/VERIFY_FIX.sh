#!/bin/bash

echo "=== ПРОВЕРКА ИСПРАВЛЕНИЯ ==="
echo ""
echo "1. Проверяем, что исправление применено в UserWorkTimeDetailsMobile.jsx:"
grep -A 10 "ИСПРАВЛЕНИЕ:" /var/www/mesendger/client-react/src/components/UserWorkTimeDetailsMobile.jsx | head -5

echo ""
echo "2. Проверяем, что нет второго useEffect, который перезаписывает applications:"
grep -B 2 -A 10 "activityStats.topApps" /var/www/mesendger/client-react/src/components/UserWorkTimeDetailsMobile.jsx | head -15

echo ""
echo "3. Проверяем логику установки localApplications:"
grep -B 3 -A 10 "setLocalApplications" /var/www/mesendger/client-react/src/components/UserWorkTimeDetailsMobile.jsx | head -20

echo ""
echo "4. Проверяем, что API возвращает applications:"
curl -s "http://localhost:5000/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-25" | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅ API возвращает applications:', len(data.get('applications', [])), 'шт.')" 2>/dev/null || echo "❌ Ошибка проверки API"

