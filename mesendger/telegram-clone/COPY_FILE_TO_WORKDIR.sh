#!/bin/bash
# Скрипт для копирования файла из git-директории в рабочую директорию

cd /var/www/mesendger

echo "=========================================="
echo "Копирование файла в рабочую директорию"
echo "=========================================="

# Копируем файл
sudo -u appuser cp mesendger/telegram-clone/client-react/src/components/UserWorkTimeDetailsMobile.jsx client-react/src/components/UserWorkTimeDetailsMobile.jsx

if [ $? -eq 0 ]; then
    echo "✅ Файл успешно скопирован!"
else
    echo "❌ ОШИБКА при копировании файла!"
    exit 1
fi

echo ""
echo "Проверка: сколько onError в файле (должен быть 1):"
grep -c "onError=" client-react/src/components/UserWorkTimeDetailsMobile.jsx

echo ""
echo "Проверка: строки с onError:"
grep -n "onError=" client-react/src/components/UserWorkTimeDetailsMobile.jsx

echo ""
echo "=========================================="
echo "Готово! Теперь пересоберите frontend:"
echo "cd client-react"
echo "sudo rm -rf build"
echo "sudo -u appuser npm run build"
echo "=========================================="

