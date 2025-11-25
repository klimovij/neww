#!/bin/bash

# Удаление старых/лишних баз данных (кроме основной)

set -e

echo "🗑️  Удаление старых баз данных..."
echo ""

MAIN_DB="/var/www/mesendger/messenger.db"
OLD_DB="/var/www/mesendger/server/messenger.db"

echo "📋 Базы данных:"
echo "=============================================="
echo "Основная (будет сохранена): $MAIN_DB"
if [ -f "$MAIN_DB" ]; then
    echo "   ✅ Существует"
    echo "   Размер: $(ls -lh "$MAIN_DB" | awk '{print $5}')"
    echo "   Записей в activity_logs: $(sudo sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM activity_logs;" 2>/dev/null || echo "0")"
else
    echo "   ❌ Не найдена!"
fi

echo ""
echo "Старая (будет удалена): $OLD_DB"
if [ -f "$OLD_DB" ]; then
    echo "   ✅ Существует"
    echo "   Размер: $(ls -lh "$OLD_DB" | awk '{print $5}')"
    echo "   Записей в activity_logs: $(sudo sqlite3 "$OLD_DB" "SELECT COUNT(*) FROM activity_logs;" 2>/dev/null || echo "0")"
else
    echo "   ❌ Не найдена (уже удалена или не существует)"
fi

echo ""
echo "⚠️  ВНИМАНИЕ: Будет удалена старая база данных: $OLD_DB"
echo "Основная база ($MAIN_DB) останется нетронутой!"
echo ""
echo "Нажмите Ctrl+C для отмены, или Enter для продолжения..."
read -t 5 -p "Продолжить? (Enter)" || echo "Продолжаем через 5 секунд..."

echo ""
if [ -f "$OLD_DB" ]; then
    echo "🗑️  Удаление старой базы: $OLD_DB"
    sudo rm -f "$OLD_DB"
    
    if [ ! -f "$OLD_DB" ]; then
        echo "✅ Старая база успешно удалена!"
    else
        echo "❌ Ошибка при удалении"
    fi
else
    echo "ℹ️  Старая база не найдена, удалять нечего"
fi

echo ""
echo "📋 Оставшиеся базы данных:"
find /var/www -name "messenger.db" -type f 2>/dev/null | while read db_file; do
    echo "   ✅ $db_file ($(ls -lh "$db_file" | awk '{print $5}'))"
done

echo ""
echo "✅ Готово!"

