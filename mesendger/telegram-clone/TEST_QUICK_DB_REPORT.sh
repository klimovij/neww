#!/bin/bash

# Тест quick-db-report после исправления

set -e

echo "🔍 Тест quick-db-report после исправления..."
echo ""

TODAY=$(date +%Y-%m-%d)

echo "📡 Тест API quick-db-report за сегодня ($TODAY):"
echo "=============================================="
curl -s "http://localhost/api/quick-db-report?start=$TODAY&end=$TODAY" | python3 -m json.tool 2>/dev/null | head -100 || curl -s "http://localhost/api/quick-db-report?start=$TODAY&end=$TODAY" | head -1000
echo ""
echo ""

echo "📊 Проверка количества пользователей в ответе:"
echo "=============================================="
curl -s "http://localhost/api/quick-db-report?start=$TODAY&end=$TODAY" | python3 -c "import sys, json; data = json.load(sys.stdin); print('Success:', data.get('success')); print('Report count:', len(data.get('report', []))); print('Users:', [r.get('username') for r in data.get('report', [])])" 2>/dev/null || echo "Ошибка"
echo ""

echo "✅ Готово!"
echo ""
echo "📋 Теперь в браузере:"
echo "   1. Обновите страницу (Ctrl+Shift+R)"
echo "   2. Откройте модалку 'Мониторинг времени'"
echo "   3. Должны появиться пользователи из activity_logs"
echo "   4. Нажмите 'Детали' для пользователя"
echo "   5. Проверьте, что данные (приложения, сайты) отображаются"

