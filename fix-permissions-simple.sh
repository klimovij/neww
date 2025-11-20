#!/bin/bash
# Простой скрипт для настройки прав доступа
# Выполнить: sudo bash fix-permissions-simple.sh

echo "🔐 Начинаю настройку прав доступа..."
echo ""

cd /var/www/mesendger || exit 1

echo "1. Устанавливаю владельца appuser:appuser..."
chown -R appuser:appuser /var/www/mesendger
echo "   ✅ Готово"

echo ""
echo "2. Устанавливаю права 755 на директории..."
find /var/www/mesendger -type d -exec chmod 755 {} \;
echo "   ✅ Готово"

echo ""
echo "3. Устанавливаю права 644 на файлы..."
find /var/www/mesendger -type f -exec chmod 644 {} \;
echo "   ✅ Готово"

echo ""
echo "4. Устанавливаю права 755 на скрипты..."
find /var/www/mesendger -type f -name "*.sh" -exec chmod 755 {} \;
echo "   ✅ Готово"

echo ""
echo "5. Устанавливаю права 666 на базу данных..."
chmod 666 /var/www/mesendger/messenger.db 2>/dev/null && echo "   ✅ messenger.db" || echo "   ⚠️  messenger.db не найден"
chmod 666 /var/www/mesendger/messenger.db-shm 2>/dev/null && echo "   ✅ messenger.db-shm" || echo "   ⚠️  messenger.db-shm не найден"
chmod 666 /var/www/mesendger/messenger.db-wal 2>/dev/null && echo "   ✅ messenger.db-wal" || echo "   ⚠️  messenger.db-wal не найден"
find /var/www/mesendger -type f -name "*.db" -exec chmod 666 {} \;
find /var/www/mesendger -type f -name "*.db-shm" -exec chmod 666 {} \;
find /var/www/mesendger -type f -name "*.db-wal" -exec chmod 666 {} \;
echo "   ✅ Готово"

echo ""
echo "6. Создаю и настраиваю директории для записи..."
mkdir -p /var/www/mesendger/server/uploads/avatars
mkdir -p /var/www/mesendger/server/uploads/documents
mkdir -p /var/www/mesendger/client-react/build
mkdir -p /var/www/mesendger/logs
chmod 775 /var/www/mesendger/server/uploads
chmod 775 /var/www/mesendger/server/uploads/avatars
chmod 775 /var/www/mesendger/server/uploads/documents
chmod 775 /var/www/mesendger/client-react/build
chmod 775 /var/www/mesendger/logs
chown -R appuser:appuser /var/www/mesendger/server/uploads
chown -R appuser:appuser /var/www/mesendger/client-react/build
chown -R appuser:appuser /var/www/mesendger/logs
echo "   ✅ Готово"

echo ""
echo "7. Настраиваю Git..."
sudo -u appuser git config --global --add safe.directory /var/www/mesendger 2>/dev/null || true
echo "   ✅ Готово"

echo ""
echo "=================================================="
echo "✅ ВСЕ ПРАВА НАСТРОЕНЫ!"
echo ""
echo "Теперь можно работать от пользователя appuser:"
echo "  sudo -u appuser <команда>"
echo ""

