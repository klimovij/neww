#!/bin/bash

echo "=== ШАГ 1: Проверка API endpoint ==="
echo "Запрос к API для проверки applications..."
curl -s "http://localhost:5000/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-25" | jq -r '.applications | length' 2>/dev/null || \
curl -s "http://localhost:5000/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-25" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('applications', [])))" 2>/dev/null

echo ""
echo "=== ШАГ 2: Проверка структуры ответа API ==="
curl -s "http://localhost:5000/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-25" | python3 -c "import sys, json; data=json.load(sys.stdin); print('success:', data.get('success')); print('has applications:', 'applications' in data); print('applications count:', len(data.get('applications', []))); print('urls count:', len(data.get('urls', []))); print('screenshots count:', len(data.get('screenshots', [])))" 2>/dev/null

echo ""
echo "=== ШАГ 3: Пример первого application ==="
curl -s "http://localhost:5000/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-25" | python3 -c "import sys, json; data=json.load(sys.stdin); apps=data.get('applications', []); print(json.dumps(apps[0] if apps else {}, indent=2))" 2>/dev/null

