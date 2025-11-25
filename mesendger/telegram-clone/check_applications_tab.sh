#!/bin/bash
# Скрипт для проверки и исправления проблемы с вкладкой "Приложения"

echo "=== 🔍 ПРОВЕРКА ВКЛАДКИ 'ПРИЛОЖЕНИЯ' ==="
echo ""

cd /var/www/mesendger || exit 1

# 1. Проверка версии файла UserWorkTimeDetailsMobile.jsx в build
echo "📋 1. Проверка версии файла в build..."
BUILD_FILE="/var/www/mesendger/client-react/build/static/js/main.*.js"
if ls $BUILD_FILE 1> /dev/null 2>&1; then
    MAIN_JS=$(ls -t $BUILD_FILE | head -1)
    echo "   Найден main.js: $MAIN_JS"
    if grep -q "Приложения" "$MAIN_JS"; then
        echo "   ✅ Вкладка 'Приложения' найдена в build"
    else
        echo "   ❌ Вкладка 'Приложения' НЕ найдена в build - нужна пересборка!"
    fi
else
    echo "   ⚠️  Build файлы не найдены"
fi

echo ""
echo "📋 2. Проверка исходного файла..."
SOURCE_FILE="/var/www/mesendger/mesendger/telegram-clone/client-react/src/components/UserWorkTimeDetailsMobile.jsx"
if [ -f "$SOURCE_FILE" ]; then
    if grep -q "Приложения.*localApplications" "$SOURCE_FILE"; then
        echo "   ✅ Вкладка 'Приложения' найдена в исходном файле"
        APPLICATIONS_LINE=$(grep -n "Приложения.*localApplications" "$SOURCE_FILE" | head -1 | cut -d: -f1)
        echo "   Строка: $APPLICATIONS_LINE"
    else
        echo "   ❌ Вкладка 'Приложения' НЕ найдена в исходном файле!"
    fi
else
    echo "   ⚠️  Исходный файл не найден: $SOURCE_FILE"
fi

echo ""
echo "📋 3. Проверка API activity-details..."
API_FILE="/var/www/mesendger/server/routes/activity.js"
if [ -f "$API_FILE" ]; then
    if grep -q "applications:" "$API_FILE"; then
        echo "   ✅ API возвращает applications"
        APPLICATIONS_API_LINE=$(grep -n "applications:" "$API_FILE" | head -1 | cut -d: -f1)
        echo "   Строка: $APPLICATIONS_API_LINE"
    else
        echo "   ❌ API НЕ возвращает applications!"
    fi
else
    echo "   ⚠️  API файл не найден: $API_FILE"
fi

echo ""
echo "📋 4. Проверка последнего коммита в Git..."
cd /var/www/mesendger/mesendger/telegram-clone 2>/dev/null || cd /var/www/mesendger
if [ -d ".git" ]; then
    LAST_COMMIT=$(git log -1 --oneline 2>/dev/null)
    echo "   Последний коммит: $LAST_COMMIT"
    if echo "$LAST_COMMIT" | grep -q "applications\|Приложения"; then
        echo "   ✅ Коммит содержит изменения для приложений"
    fi
else
    echo "   ⚠️  Git репозиторий не найден"
fi

echo ""
echo "📋 5. Проверка структуры директорий..."
echo "   client-react/build:"
if [ -d "/var/www/mesendger/client-react/build" ]; then
    ls -la /var/www/mesendger/client-react/build/static/js/main.*.js 2>/dev/null | head -1
else
    echo "   ❌ Директория build не существует!"
fi

echo ""
echo "📋 6. Рекомендации:"
echo "   1. Проверьте версию файла на сервере:"
echo "      cat /var/www/mesendger/mesendger/telegram-clone/client-react/src/components/UserWorkTimeDetailsMobile.jsx | grep -A 5 'Приложения'"
echo ""
echo "   2. Если файл правильный, пересоберите фронтенд:"
echo "      cd /var/www/mesendger/client-react"
echo "      sudo -u appuser npm run build"
echo ""
echo "   3. Проверьте API ответ:"
echo "      curl 'http://localhost:5000/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-25' | jq '.applications | length'"
echo ""
echo "=== ✅ ПРОВЕРКА ЗАВЕРШЕНА ==="

