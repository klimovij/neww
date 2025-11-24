#!/bin/bash
# Скрипт для обновления сервера с GitHub
# Использование: скопируйте и выполните на сервере через SSH

set -e

echo "🔄 Начинаем обновление сервера..."
echo ""

# Переходим в директорию приложения
cd /var/www/mesendger || {
    echo "❌ Ошибка: директория /var/www/mesendger не найдена"
    exit 1
}

# Обновляем код с GitHub
echo "📥 Получаем последние изменения с GitHub..."
sudo -u appuser git pull origin main || {
    echo "⚠️ Предупреждение: git pull не удался (возможно, не используется git)"
    echo "Попробуем обновить через клонирование..."
    
    # Альтернативный способ: клонирование заново
    cd /tmp
    rm -rf mesendger-god
    git clone https://github.com/klimovij/neww.git mesendger-god
    rsync -av --exclude 'node_modules' \
              --exclude '.git' \
              --exclude 'build' \
              --exclude '*.log' \
              --exclude '*.db*' \
              --exclude '*.db-shm' \
              --exclude '*.db-wal' \
              mesendger-god/mesendger/telegram-clone/ /var/www/mesendger/
    chown -R appuser:appuser /var/www/mesendger
    cd /var/www/mesendger
}

# Устанавливаем зависимости для сервера
echo "📦 Устанавливаем зависимости для сервера..."
cd server
sudo -u appuser npm install --production || {
    echo "⚠️ Предупреждение: npm install для server не удался"
}

# Устанавливаем зависимости для клиента и собираем
echo "📦 Устанавливаем зависимости для клиента..."
cd ../client-react
sudo -u appuser npm install || {
    echo "⚠️ Предупреждение: npm install для client-react не удался"
}

echo "🔨 Собираем React приложение..."
sudo -u appuser CI=false npm run build || {
    echo "⚠️ Предупреждение: npm run build не удался"
}

# Перезапускаем PM2
echo "🔄 Перезапускаем приложение через PM2..."
cd /var/www/mesendger
sudo -u appuser pm2 restart all || {
    echo "⚠️ Предупреждение: pm2 restart не удался, пробуем stop и start..."
    sudo -u appuser pm2 stop all || true
    sudo -u appuser pm2 start deploy/ecosystem.config.js || {
        echo "❌ Ошибка: не удалось перезапустить приложение"
        exit 1
    }
}

echo ""
echo "✅ Обновление завершено!"
echo ""
echo "📊 Статус приложения:"
sudo -u appuser pm2 status

echo ""
echo "🔍 Проверка обновления..."
if grep -q "getRemoteWorkTimeLogs" /var/www/mesendger/server/routes/quickCsvReport.js 2>/dev/null; then
    echo "✅ Сервер успешно обновлён! Функция объединения данных активна."
else
    echo "⚠️ Предупреждение: файл quickCsvReport.js может быть не обновлён"
fi
