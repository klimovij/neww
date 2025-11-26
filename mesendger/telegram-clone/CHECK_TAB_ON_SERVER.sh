#!/bin/bash

echo "=== ПРОВЕРКА НА СЕРВЕРЕ ==="
echo ""
echo "1. Проверяем исходный код - есть ли вкладка Приложения:"
grep -n "Приложения" /var/www/mesendger/client-react/src/components/UserWorkTimeDetailsMobile.jsx | head -5

echo ""
echo "2. Проверяем собранный код - есть ли вкладка Приложения:"
grep -o "Приложения" /var/www/mesendger/client-react/build/static/js/main.*.js | head -1 && echo "✅ Вкладка найдена в build" || echo "❌ Вкладка НЕ найдена в build"

echo ""
echo "3. Проверяем версию компонента в build:"
grep -o "НАЧАЛО КОМПОНЕНТА V[0-9.]*" /var/www/mesendger/client-react/build/static/js/main.*.js | head -1 || echo "Версия не найдена"

echo ""
echo "4. Проверяем, что вкладка Приложения есть в исходниках:"
grep -c "FiMonitor.*Приложения\|Приложения.*FiMonitor" /var/www/mesendger/client-react/src/components/UserWorkTimeDetailsMobile.jsx && echo "✅ Вкладка найдена" || echo "❌ Вкладка НЕ найдена"

