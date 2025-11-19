#!/bin/bash

# Скрипт для исправления проблемы с импортом на сервере

echo "🔍 Проверка структуры проекта на сервере..."
cd /var/www/mesendger

echo ""
echo "1️⃣ Проверка структуры client-react:"
if [ -d "client-react" ]; then
    echo "✅ Директория client-react существует"
    ls -la client-react/ | head -10
else
    echo "❌ Директория client-react не найдена"
    exit 1
fi

echo ""
echo "2️⃣ Проверка файла api.js:"
if [ -f "client-react/src/services/api.js" ]; then
    echo "✅ Файл api.js найден"
    ls -lh client-react/src/services/api.js
else
    echo "❌ Файл api.js не найден"
    echo "Проверяю структуру services:"
    ls -la client-react/src/services/ 2>/dev/null || echo "Директория services не существует"
fi

echo ""
echo "3️⃣ Проверка файла SidebarMobile.jsx:"
if [ -f "client-react/src/components/Sidebar/SidebarMobile.jsx" ]; then
    echo "✅ Файл SidebarMobile.jsx найден"
    echo "Проверка импорта api:"
    grep -n "import api from" client-react/src/components/Sidebar/SidebarMobile.jsx | head -1
else
    echo "❌ Файл SidebarMobile.jsx не найден"
    echo "Проверяю структуру components/Sidebar:"
    ls -la client-react/src/components/Sidebar/ 2>/dev/null || echo "Директория Sidebar не существует"
fi

echo ""
echo "4️⃣ Очистка кеша и build:"
cd client-react
rm -rf node_modules/.cache 2>/dev/null && echo "✅ Кеш удален" || echo "⚠️ Кеш не найден"
rm -rf build 2>/dev/null && echo "✅ Build удален" || echo "⚠️ Build не найден"

echo ""
echo "5️⃣ Проверка готовности к сборке:"
if [ -f "package.json" ]; then
    echo "✅ package.json найден"
    echo "Для пересборки выполните: npm run build"
else
    echo "❌ package.json не найден"
fi

echo ""
echo "✅ Проверка завершена!"

