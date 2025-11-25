#!/bin/bash

# Тест запроса за 26 число

set -e

echo "🔍 Тест запроса за 26 число..."
echo ""

echo "📡 Тест 1: Запрос за 26 число (без расширения):"
echo "=============================================="
echo "Запрос: /api/quick-db-report?start=2025-11-26&end=2025-11-26"
curl -s "http://localhost/api/quick-db-report?start=2025-11-26&end=2025-11-26" 2>&1 | head -100
echo ""
echo ""

echo "📡 Тест 2: Запрос с расширенным диапазоном (25-27):"
echo "=============================================="
echo "Запрос: /api/quick-db-report?start=2025-11-25&end=2025-11-27"
curl -s "http://localhost/api/quick-db-report?start=2025-11-25&end=2025-11-27" | python3 -c "import sys, json; data = json.load(sys.stdin); print('Success:', data.get('success')); print('Report count:', len(data.get('report', []))); print('Users:', [r.get('username') for r in data.get('report', [])])" 2>/dev/null || echo "Ошибка"
echo ""

echo "📋 Проверка логов PM2 (последние 20 строк с quick-db-report):"
echo "=============================================="
sudo -u appuser pm2 logs --lines 100 --nostream 2>&1 | grep -i "quick-db-report\|Расширение" | tail -5 || echo "Логи не найдены"
echo ""

echo "✅ Готово!"

