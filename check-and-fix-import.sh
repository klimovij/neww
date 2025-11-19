#!/bin/bash

# Скрипт для проверки и исправления проблемы с импортом api

echo "🔍 Проверка структуры проекта..."
cd /var/www/mesendger/telegram-clone/client-react

echo ""
echo "1️⃣ Проверка существования файла api.js:"
if [ -f "src/services/api.js" ]; then
    echo "✅ Файл src/services/api.js существует"
    ls -lh src/services/api.js
else
    echo "❌ Файл src/services/api.js НЕ найден!"
fi

echo ""
echo "2️⃣ Проверка структуры директорий:"
echo "Текущая директория: $(pwd)"
echo "Структура src/:"
ls -la src/ | head -20

echo ""
echo "3️⃣ Проверка файла SidebarMobile.jsx:"
if [ -f "src/components/Sidebar/SidebarMobile.jsx" ]; then
    echo "✅ Файл SidebarMobile.jsx существует"
    echo "Строка с импортом api:"
    grep -n "import api from" src/components/Sidebar/SidebarMobile.jsx | head -1
else
    echo "❌ Файл SidebarMobile.jsx НЕ найден!"
fi

echo ""
echo "4️⃣ Проверка импортов в других файлах для сравнения:"
echo "AppTitleSettingsMobile.jsx:"
grep -n "import api from" src/components/AppTitleSettingsMobile.jsx | head -1

echo ""
echo "5️⃣ Очистка кеша и build директории..."
rm -rf node_modules/.cache
rm -rf build
echo "✅ Кеш очищен"

echo ""
echo "6️⃣ Проверка git статуса:"
git status --short | head -10

echo ""
echo "7️⃣ Проверка последних коммитов:"
git log --oneline -5

echo ""
echo "✅ Проверка завершена!"
echo ""
echo "📝 Для пересборки проекта выполните:"
echo "   npm run build"

