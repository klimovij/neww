#!/bin/bash
# Скрипт для поиска и проверки файла activity.js

cd /var/www/mesendger

echo "=========================================="
echo "Поиск файла activity.js на сервере"
echo "=========================================="
echo ""

# Ищем файл в разных местах
echo "1. Ищем файл activity.js:"
find . -name "activity.js" -type f 2>/dev/null | head -5

echo ""
echo "2. Проверяем server/routes/activity.js:"
if [ -f "server/routes/activity.js" ]; then
    echo "✅ Файл найден: server/routes/activity.js"
    echo "   Размер: $(wc -l < server/routes/activity.js) строк"
    echo "   Проверка диагностики:"
    if grep -q "ДИАГНОСТИКА ФИЛЬТРАЦИИ" server/routes/activity.js; then
        echo "   ✅ Диагностика найдена (строка $(grep -n 'ДИАГНОСТИКА ФИЛЬТРАЦИИ' server/routes/activity.js | cut -d: -f1))"
    else
        echo "   ❌ Диагностика НЕ найдена"
    fi
else
    echo "❌ Файл server/routes/activity.js НЕ найден"
fi

echo ""
echo "3. Проверяем mesendger/telegram-clone/server/routes/activity.js:"
if [ -f "mesendger/telegram-clone/server/routes/activity.js" ]; then
    echo "✅ Файл найден: mesendger/telegram-clone/server/routes/activity.js"
    echo "   Размер: $(wc -l < mesendger/telegram-clone/server/routes/activity.js) строк"
    echo "   Проверка диагностики:"
    if grep -q "ДИАГНОСТИКА ФИЛЬТРАЦИИ" mesendger/telegram-clone/server/routes/activity.js; then
        echo "   ✅ Диагностика найдена (строка $(grep -n 'ДИАГНОСТИКА ФИЛЬТРАЦИИ' mesendger/telegram-clone/server/routes/activity.js | cut -d: -f1))"
        echo ""
        echo "   ⚠️  Файл в git-директории имеет диагностику, но в рабочей - нет!"
        echo "   Копируем файл..."
        sudo -u appuser cp mesendger/telegram-clone/server/routes/activity.js server/routes/activity.js
        echo "   ✅ Файл скопирован"
    else
        echo "   ❌ Диагностика НЕ найдена и в git-директории"
    fi
else
    echo "❌ Файл mesendger/telegram-clone/server/routes/activity.js НЕ найден"
fi

echo ""
echo "=========================================="
echo "4. Итоговая проверка:"
echo "=========================================="
if [ -f "server/routes/activity.js" ]; then
    if grep -q "ДИАГНОСТИКА ФИЛЬТРАЦИИ" server/routes/activity.js; then
        echo "✅ Диагностика присутствует в рабочем файле"
        echo ""
        echo "Перезапускаем сервер..."
        sudo -u appuser pm2 restart mesendger-server
        echo ""
        echo "✅ Сервер перезапущен"
    else
        echo "❌ Диагностика все еще отсутствует"
    fi
fi

echo ""
echo "=========================================="
echo "Теперь откройте детали пользователя в браузере"
echo "и выполните:"
echo "pm2 logs mesendger-server --lines 100 | grep -A 30 'ДИАГНОСТИКА'"
echo "=========================================="

