#!/bin/bash
# Исправление ошибки React Hooks на сервере

cd /var/www/mesendger

echo "=========================================="
echo "ШАГ 1: Проверяем структуру директорий"
echo "=========================================="
echo "Git директория:"
ls -la mesendger/telegram-clone/client-react/src/components/UserWorkTimeDetailsMobile.jsx 2>/dev/null && echo "✅ Файл найден в git" || echo "❌ Файл НЕ найден в git"

echo ""
echo "Рабочая директория:"
ls -la client-react/src/components/UserWorkTimeDetailsMobile.jsx 2>/dev/null && echo "✅ Файл найден в рабочей директории" || echo "❌ Файл НЕ найден в рабочей директории"

echo ""
echo "=========================================="
echo "ШАГ 2: Проверяем содержимое файла в git"
echo "=========================================="
echo "Проверка: useMemo перед return null?"
grep -B 5 -A 10 "useMemo.*sortedLogs" mesendger/telegram-clone/client-react/src/components/UserWorkTimeDetailsMobile.jsx | head -15

echo ""
echo "=========================================="
echo "ШАГ 3: Проверяем содержимое файла в рабочей директории"
echo "=========================================="
echo "Проверка: useMemo перед return null?"
grep -B 5 -A 10 "useMemo.*sortedLogs" client-react/src/components/UserWorkTimeDetailsMobile.jsx 2>/dev/null | head -15 || echo "❌ Не удалось прочитать файл"

echo ""
echo "=========================================="
echo "ШАГ 4: Копируем правильный файл из git в рабочую директорию"
echo "=========================================="
sudo -u appuser cp mesendger/telegram-clone/client-react/src/components/UserWorkTimeDetailsMobile.jsx client-react/src/components/UserWorkTimeDetailsMobile.jsx

if [ $? -eq 0 ]; then
    echo "✅ Файл успешно скопирован!"
else
    echo "❌ ОШИБКА при копировании файла!"
    exit 1
fi

echo ""
echo "=========================================="
echo "ШАГ 5: Проверяем, что файл обновился"
echo "=========================================="
echo "Проверка структуры (useMemo должен быть перед return null):"
grep -n "useMemo\|if (!open)" client-react/src/components/UserWorkTimeDetailsMobile.jsx | head -5

# Проверяем порядок: useMemo должен быть ДО if (!open)
USE_MEMO_LINE=$(grep -n "const sortedLogs = useMemo" client-react/src/components/UserWorkTimeDetailsMobile.jsx | cut -d: -f1)
IF_OPEN_LINE=$(grep -n "if (!open)" client-react/src/components/UserWorkTimeDetailsMobile.jsx | head -1 | cut -d: -f1)

if [ -n "$USE_MEMO_LINE" ] && [ -n "$IF_OPEN_LINE" ]; then
    if [ "$USE_MEMO_LINE" -lt "$IF_OPEN_LINE" ]; then
        echo "✅ Правильно: useMemo (строка $USE_MEMO_LINE) перед if (!open) (строка $IF_OPEN_LINE)"
    else
        echo "❌ ОШИБКА: useMemo (строка $USE_MEMO_LINE) ПОСЛЕ if (!open) (строка $IF_OPEN_LINE)"
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "ШАГ 6: Очищаем кэш и пересобираем"
echo "=========================================="
cd client-react

# Очищаем кэш ESLint и node_modules/.cache
echo "Очищаем кэш..."
sudo rm -rf build
sudo rm -rf node_modules/.cache 2>/dev/null
sudo rm -rf .eslintcache 2>/dev/null

echo ""
echo "Пересобираем frontend..."
sudo -u appuser npm run build

if [ $? -eq 0 ]; then
    echo "✅ Сборка успешна!"
else
    echo "❌ ОШИБКА при сборке!"
    exit 1
fi

echo ""
echo "=========================================="
echo "ШАГ 7: Перезапускаем сервер"
echo "=========================================="
cd ..
sudo -u appuser pm2 restart mesendger-server

echo ""
echo "=========================================="
echo "✅ ГОТОВО!"
echo "=========================================="
echo "Теперь:"
echo "1. Очистите кэш браузера (Ctrl+Shift+Del)"
echo "2. Сделайте жесткую перезагрузку (Ctrl+Shift+R)"
echo "3. Откройте детали пользователя"
echo "4. Проверьте, что вкладка 'Приложения' отображается"
echo "=========================================="

