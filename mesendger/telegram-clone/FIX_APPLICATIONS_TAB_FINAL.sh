#!/bin/bash
# ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: Копирование файла с правильными правами и проверка

cd /var/www/mesendger

echo "=========================================="
echo "ШАГ 1: Проверяем текущий файл на сервере"
echo "=========================================="
echo ""
echo "Проверка 1: Есть ли FiMonitor в импортах?"
grep -n "FiMonitor" client-react/src/components/UserWorkTimeDetailsMobile.jsx || echo "❌ FiMonitor НЕ НАЙДЕН!"

echo ""
echo "Проверка 2: Есть ли вкладка 'Приложения'?"
grep -n "Приложения.*localApplications\|FiMonitor.*Приложения" client-react/src/components/UserWorkTimeDetailsMobile.jsx || echo "❌ Вкладка 'Приложения' НЕ НАЙДЕНА!"

echo ""
echo "Проверка 3: Есть ли лог 'НАЧАЛО КОМПОНЕНТА V2.0'?"
grep -n "НАЧАЛО КОМПОНЕНТА V2.0" client-react/src/components/UserWorkTimeDetailsMobile.jsx || echo "❌ Лог V2.0 НЕ НАЙДЕН!"

echo ""
echo "=========================================="
echo "ШАГ 2: Копируем правильный файл из git"
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
echo "ШАГ 3: Проверяем, что файл обновился"
echo "=========================================="
echo ""
echo "Проверка 1: Есть ли FiMonitor в импортах?"
grep -n "FiMonitor" client-react/src/components/UserWorkTimeDetailsMobile.jsx && echo "✅ FiMonitor найден!" || echo "❌ FiMonitor НЕ НАЙДЕН!"

echo ""
echo "Проверка 2: Есть ли вкладка 'Приложения'?"
grep -n "Приложения.*localApplications\|FiMonitor.*Приложения" client-react/src/components/UserWorkTimeDetailsMobile.jsx && echo "✅ Вкладка найдена!" || echo "❌ Вкладка НЕ НАЙДЕНА!"

echo ""
echo "Проверка 3: Есть ли лог 'НАЧАЛО КОМПОНЕНТА V2.0'?"
grep -n "НАЧАЛО КОМПОНЕНТА V2.0" client-react/src/components/UserWorkTimeDetailsMobile.jsx && echo "✅ Лог V2.0 найден!" || echo "❌ Лог V2.0 НЕ НАЙДЕН!"

echo ""
echo "=========================================="
echo "ШАГ 4: Пересобираем frontend"
echo "=========================================="
cd client-react
sudo rm -rf build
sudo -u appuser npm run build

if [ $? -eq 0 ]; then
    echo "✅ Сборка успешна!"
else
    echo "❌ ОШИБКА при сборке!"
    exit 1
fi

echo ""
echo "=========================================="
echo "ШАГ 5: Проверяем, что вкладка есть в build"
echo "=========================================="
grep -o "Приложения" build/static/js/main.*.js | head -1 && echo "✅ Вкладка 'Приложения' найдена в build!" || echo "⚠️  Вкладка не найдена в build (возможно, минифицирована)"

echo ""
echo "=========================================="
echo "ШАГ 6: Перезапускаем PM2"
echo "=========================================="
cd ..
sudo -u appuser pm2 restart mesendger-server

echo ""
echo "=========================================="
echo "✅ ГОТОВО! Теперь:"
echo "1. Очистите кэш браузера (Ctrl+Shift+Del)"
echo "2. Сделайте жесткую перезагрузку (Ctrl+Shift+R)"
echo "3. Откройте детали пользователя"
echo "4. Проверьте, есть ли вкладка 'Приложения'"
echo "=========================================="

