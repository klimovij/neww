#!/bin/bash

# Скрипт для проверки структуры проекта на сервере

echo "🔍 Проверка структуры проекта на сервере..."
echo ""

echo "1️⃣ Текущая директория:"
pwd
echo ""

echo "2️⃣ Содержимое /var/www/mesendger:"
ls -la /var/www/mesendger/ | head -20
echo ""

echo "3️⃣ Поиск .git директории:"
find /var/www/mesendger -name ".git" -type d 2>/dev/null | head -5
echo ""

echo "4️⃣ Проверка структуры telegram-clone:"
if [ -d "/var/www/mesendger/telegram-clone" ]; then
    echo "✅ Директория telegram-clone существует"
    ls -la /var/www/mesendger/telegram-clone/ | head -10
else
    echo "❌ Директория telegram-clone не найдена"
fi
echo ""

echo "5️⃣ Проверка файла api.js:"
if [ -f "/var/www/mesendger/telegram-clone/client-react/src/services/api.js" ]; then
    echo "✅ Файл api.js найден"
    ls -lh /var/www/mesendger/telegram-clone/client-react/src/services/api.js
else
    echo "❌ Файл api.js не найден"
fi
echo ""

echo "6️⃣ Проверка импорта в SidebarMobile.jsx:"
if [ -f "/var/www/mesendger/telegram-clone/client-react/src/components/Sidebar/SidebarMobile.jsx" ]; then
    echo "✅ Файл SidebarMobile.jsx найден"
    echo "Строка с импортом:"
    grep -n "import api from" /var/www/mesendger/telegram-clone/client-react/src/components/Sidebar/SidebarMobile.jsx | head -1
else
    echo "❌ Файл SidebarMobile.jsx не найден"
fi
echo ""

echo "✅ Проверка завершена!"

