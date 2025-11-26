#!/bin/bash

echo "🔍 Проверка логов удаления данных активности"
echo "=============================================="
echo ""

# Проверяем, запущен ли PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 не установлен или не найден"
    exit 1
fi

# Проверяем, есть ли процесс mesendger-server
if ! pm2 list | grep -q "mesendger-server"; then
    echo "⚠️ Процесс mesendger-server не найден в PM2"
    echo "Доступные процессы:"
    pm2 list
    exit 1
fi

echo "📋 Последние операции удаления (последние 50 строк с фильтром):"
echo "----------------------------------------"
pm2 logs mesendger-server --lines 200 --nostream | grep -E "activity-logs/clear|Deleted|Удалено|🗑️|✅.*Deleted|❌.*delete" | tail -50

echo ""
echo "📊 Детальная информация об удалениях:"
echo "----------------------------------------"

# Ищем все записи об удалении
DELETE_LOGS=$(pm2 logs mesendger-server --lines 500 --nostream | grep -E "🗑️.*activity-logs/clear|✅.*Deleted.*activity|✅.*Deleted.*screenshot" | tail -20)

if [ -z "$DELETE_LOGS" ]; then
    echo "⚠️ Не найдено записей об удалении в последних 500 строках логов"
    echo ""
    echo "Проверяем все логи (может занять время)..."
    DELETE_LOGS=$(pm2 logs mesendger-server --nostream | grep -E "🗑️.*activity-logs/clear|✅.*Deleted.*activity|✅.*Deleted.*screenshot" | tail -20)
fi

if [ -z "$DELETE_LOGS" ]; then
    echo "❌ Не найдено записей об удалении в логах"
else
    echo "$DELETE_LOGS"
fi

echo ""
echo "🔍 Проверка последних запросов к API удаления:"
echo "----------------------------------------"
pm2 logs mesendger-server --lines 300 --nostream | grep -B 2 -A 5 "activity-logs/clear" | tail -30

echo ""
echo "📅 Временная шкала удалений (если доступна):"
echo "----------------------------------------"
pm2 logs mesendger-server --lines 500 --nostream | grep -E "🗑️.*activity-logs/clear" | tail -10 | while read line; do
    echo "$line"
done

echo ""
echo "✅ Проверка завершена!"
echo ""
echo "💡 Совет: Если данных нет, проверьте:"
echo "   1. Когда было последнее удаление (см. логи выше)"
echo "   2. Какой период был удален (period/week/month или start/end)"
echo "   3. Были ли данные до удаления (проверьте бэкапы БД)"

