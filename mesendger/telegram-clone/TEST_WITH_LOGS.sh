#!/bin/bash

# Тест запроса с проверкой логов

set -e

echo "🔍 Тест запроса за 26 число с проверкой логов..."
echo ""

echo "1. Очищаем старые логи PM2..."
sudo -u appuser pm2 flush

echo ""
echo "2. Делаем тестовый запрос за 26 число:"
curl -s "http://localhost/api/quick-db-report?start=2025-11-26&end=2025-11-26" | python3 -c "import sys, json; data = json.load(sys.stdin); print('Success:', data.get('success')); print('Report count:', len(data.get('report', [])))" 2>/dev/null || echo "Ошибка"

echo ""
echo "3. Ждём 2 секунды..."
sleep 2

echo ""
echo "4. Проверяем логи PM2:"
echo "=============================================="
sudo -u appuser pm2 logs --lines 100 --nostream 2>&1 | tail -50
echo ""

echo "✅ Готово!"

