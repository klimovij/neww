#!/bin/bash

# Проверка, почему модалка пустая

set -e

echo "🔍 Проверка, почему модалка пустая..."
echo ""

MAIN_DB="/var/www/mesendger/messenger.db"

echo "📊 Проблема:"
echo "=============================================="
echo "1. На сервере сегодня: $(date +%Y-%m-%d)"
echo "2. Данные в базе есть за 2025-11-25:"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs WHERE username = 'Ksendzik_Oleg' AND date(timestamp) = '2025-11-25';" 2>/dev/null || echo "0"
echo ""

echo "3. Тест запроса API за 2025-11-25:"
echo "=============================================="
curl -s "http://localhost/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-25" | python3 -m json.tool 2>/dev/null | head -40 || curl -s "http://localhost/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-25" | head -500
echo ""

echo "4. Тест запроса API за 2025-11-26 (может быть пустым):"
echo "=============================================="
curl -s "http://localhost/api/activity-details?username=Ksendzik_Oleg&start=2025-11-26&end=2025-11-26" | python3 -m json.tool 2>/dev/null | head -40 || curl -s "http://localhost/api/activity-details?username=Ksendzik_Oleg&start=2025-11-26&end=2025-11-26" | head -500
echo ""

echo "✅ Готово!"
echo ""
echo "📋 ВАЖНО:"
echo "   - На сервере сейчас: $(date +%Y-%m-%d)"
echo "   - Данные есть за 2025-11-25 (11176 записей)"
echo "   - Если вы выбираете 26 число в модалке, данных может не быть,"
echo "     так как на сервере еще 25 число"
echo "   - Попробуйте выбрать диапазон: 25-26 ноября"
echo "   - Или только 25 ноября"

