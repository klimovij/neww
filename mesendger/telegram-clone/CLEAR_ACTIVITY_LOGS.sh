#!/bin/bash

# Удаление всех данных из таблицы activity_logs

set -e

echo "🗑️  Удаление всех данных из activity_logs..."
echo ""

MAIN_DB="/var/www/mesendger/messenger.db"

if [ ! -f "$MAIN_DB" ]; then
    echo "❌ База данных не найдена: $MAIN_DB"
    exit 1
fi

echo "📊 Текущее количество записей в activity_logs:"
sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs;" 2>/dev/null || echo "Ошибка"
echo ""

echo "⚠️  ВНИМАНИЕ: Будет удалено ВСЁ из таблицы activity_logs!"
echo "Нажмите Ctrl+C для отмены, или Enter для продолжения..."
read -t 5 -p "Продолжить? (Enter)" || echo "Продолжаем через 5 секунд..."

echo ""
echo "🗑️  Удаление всех записей..."
sudo sqlite3 "$MAIN_DB" "DELETE FROM activity_logs;" 2>/dev/null || echo "Ошибка при удалении"

echo ""
echo "📊 Проверка после удаления:"
RECORDS_LEFT=$(sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs;" 2>/dev/null || echo "0")
echo "Записей осталось: $RECORDS_LEFT"

if [ "$RECORDS_LEFT" = "0" ]; then
    echo "✅ Все данные успешно удалены!"
else
    echo "⚠️  Осталось $RECORDS_LEFT записей"
fi

echo ""
echo "✅ Готово!"

