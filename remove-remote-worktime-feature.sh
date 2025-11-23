#!/bin/bash
# Скрипт для удаления функционала "Отчет Удаленка" на сервере

set -e

APP_DIR="/var/www/mesendger"
GIT_REPO="https://github.com/klimovij/neww.git"

echo "🗑️ Удаление функционала 'Отчет Удаленка'..."

# Проверка наличия кнопки в текущем файле
echo "🔍 Проверка текущего состояния..."
if grep -q "Отчет Удаленка" "$APP_DIR/mesendger/telegram-clone/client-react/src/components/WorkTimeMobile.jsx" 2>/dev/null; then
    echo "⚠️ Кнопка 'Отчет Удаленка' найдена в файле на сервере"
else
    echo "✅ Кнопка уже удалена из файла на сервере"
fi

# Обновление кода из Git
echo "📥 Обновление кода из Git..."
cd /tmp
if [ -d "mesendger-god" ]; then
    sudo rm -rf mesendger-god
fi
sudo git clone "$GIT_REPO" mesendger-god

# Проверка, что в репозитории кнопка удалена
if grep -q "Отчет Удаленка" "mesendger-god/mesendger/telegram-clone/client-react/src/components/WorkTimeMobile.jsx" 2>/dev/null; then
    echo "❌ ОШИБКА: Кнопка все еще есть в репозитории Git!"
    echo "Проверьте локальный код и убедитесь, что изменения закоммичены и запушены"
    exit 1
else
    echo "✅ В репозитории кнопка удалена"
fi

# Копирование обновленных файлов
echo "📦 Копирование обновленных файлов..."
sudo rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'build' --exclude '*.log' --exclude '*.db*' mesendger-god/mesendger/telegram-clone/ "$APP_DIR/"

# Удаление старого файла RemoteWorktimeReportMobile.jsx, если он существует
if [ -f "$APP_DIR/mesendger/telegram-clone/client-react/src/components/RemoteWorktimeReportMobile.jsx" ]; then
    echo "🗑️ Удаление файла RemoteWorktimeReportMobile.jsx..."
    sudo rm -f "$APP_DIR/mesendger/telegram-clone/client-react/src/components/RemoteWorktimeReportMobile.jsx"
fi

# Установка прав
echo "👤 Установка прав..."
sudo chown -R appuser:appuser "$APP_DIR"

# Проверка, что кнопка удалена после копирования
if grep -q "Отчет Удаленка" "$APP_DIR/mesendger/telegram-clone/client-react/src/components/WorkTimeMobile.jsx" 2>/dev/null; then
    echo "❌ ОШИБКА: Кнопка все еще есть после копирования файлов!"
    echo "Проверьте вручную файл: $APP_DIR/mesendger/telegram-clone/client-react/src/components/WorkTimeMobile.jsx"
    exit 1
else
    echo "✅ Кнопка удалена из файла на сервере"
fi

# Обновление зависимостей сервера (если нужно)
echo "📦 Проверка зависимостей сервера..."
cd "$APP_DIR/server"
sudo -u appuser npm install --production || true

# Удаление старой сборки
echo "🗑️ Удаление старой сборки React..."
cd "$APP_DIR/client-react"
sudo rm -rf build

# Сборка React приложения
echo "🏗️ Сборка React приложения..."
sudo -u appuser npm install || true
sudo -u appuser CI=false npm run build

# Проверка результата сборки
if [ ! -d "$APP_DIR/client-react/build" ]; then
    echo "❌ ОШИБКА: Сборка не удалась!"
    exit 1
else
    echo "✅ Сборка React приложения завершена успешно"
fi

# Перезапуск приложения через PM2
echo "🔄 Перезапуск приложения..."
sudo -u appuser pm2 restart all

echo ""
echo "✅ Удаление функционала завершено!"
echo ""
echo "📊 Статус приложения:"
sudo -u appuser pm2 status

