#!/bin/bash
# Скрипт для исправления проблемы с вкладкой "Приложения"

set -e

echo "=== 🔧 ИСПРАВЛЕНИЕ ВКЛАДКИ 'ПРИЛОЖЕНИЯ' ==="
echo ""

cd /var/www/mesendger || exit 1

# 1. Обновление кода
echo "📥 1. Обновление кода из Git..."
sudo -u appuser git pull origin main || {
    echo "❌ Ошибка при git pull. Проверьте права доступа."
    exit 1
}
echo "✅ Код обновлен"

# 2. Проверка исходного файла
echo ""
echo "🔍 2. Проверка исходного файла..."
SOURCE_FILE="mesendger/telegram-clone/client-react/src/components/UserWorkTimeDetailsMobile.jsx"
if grep -q "Приложения.*localApplications" "$SOURCE_FILE" 2>/dev/null; then
    echo "✅ Вкладка 'Приложения' найдена в исходном файле"
else
    echo "❌ Вкладка 'Приложения' НЕ найдена в исходном файле!"
    exit 1
fi

# 3. Проверка API
echo ""
echo "🔍 3. Проверка API..."
API_FILE="server/routes/activity.js"
if grep -q "applications:" "$API_FILE"; then
    echo "✅ API возвращает applications"
else
    echo "❌ API НЕ возвращает applications!"
    exit 1
fi

# 4. Удаление старого build
echo ""
echo "🗑️  4. Удаление старого build..."
cd client-react
sudo rm -rf build
echo "✅ Старый build удален"

# 5. Пересборка фронтенда
echo ""
echo "🏗️  5. Пересборка фронтенда..."
sudo -u appuser npm run build || {
    echo "❌ Ошибка при сборке!"
    exit 1
}
echo "✅ Фронтенд пересобран"

# 6. Проверка нового build
echo ""
echo "🔍 6. Проверка нового build..."
MAIN_JS=$(ls -t build/static/js/main.*.js | head -1)
if grep -q "Приложения" "$MAIN_JS"; then
    echo "✅ Вкладка 'Приложения' найдена в build файле"
    echo "   Файл: $MAIN_JS"
else
    echo "❌ Вкладка 'Приложения' НЕ найдена в build файле!"
    exit 1
fi

# 7. Перезапуск сервера
echo ""
echo "🔄 7. Перезапуск сервера..."
sudo -u appuser pm2 restart mesendger-server
echo "✅ Сервер перезапущен"

# 8. Проверка статуса
echo ""
echo "📊 8. Статус сервера..."
sudo -u appuser pm2 status

echo ""
echo "=== ✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО ==="
echo ""
echo "📝 Дальнейшие шаги:"
echo "   1. Очистите кэш браузера (Ctrl+Shift+Del или Ctrl+F5)"
echo "   2. Обновите страницу в браузере"
echo "   3. Откройте отчет по рабочему времени"
echo "   4. Откройте детали пользователя"
echo "   5. Проверьте вкладку 'Приложения'"
echo ""


