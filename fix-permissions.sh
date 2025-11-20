#!/bin/bash
# Скрипт для настройки прав доступа раз и навсегда
# Запускать с sudo: sudo bash fix-permissions.sh

set -e

PROJECT_DIR="/var/www/mesendger"
OWNER_USER="appuser"
OWNER_GROUP="appuser"

echo "🔐 Настройка прав доступа для проекта $PROJECT_DIR"
echo "=================================================="

# Проверяем, что директория существует
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Директория $PROJECT_DIR не найдена!"
    exit 1
fi

# Проверяем, что пользователь существует
if ! id "$OWNER_USER" &>/dev/null; then
    echo "❌ Пользователь $OWNER_USER не найден!"
    exit 1
fi

echo ""
echo "1️⃣ Устанавливаю владельца для всех файлов и директорий..."
chown -R $OWNER_USER:$OWNER_GROUP "$PROJECT_DIR"

echo ""
echo "2️⃣ Устанавливаю права доступа для директорий (755)..."
find "$PROJECT_DIR" -type d -exec chmod 755 {} \;

echo ""
echo "3️⃣ Устанавливаю права доступа для файлов (644)..."
find "$PROJECT_DIR" -type f -exec chmod 644 {} \;

echo ""
echo "4️⃣ Устанавливаю права на выполнение для скриптов..."
find "$PROJECT_DIR" -type f -name "*.sh" -exec chmod 755 {} \;
find "$PROJECT_DIR" -type f -name "*.js" -path "*/server/*" -exec chmod 644 {} \;

echo ""
echo "5️⃣ Устанавливаю права на базу данных SQLite (666 для записи)..."
if [ -f "$PROJECT_DIR/messenger.db" ]; then
    chmod 666 "$PROJECT_DIR/messenger.db"
    echo "   ✅ messenger.db"
fi
if [ -f "$PROJECT_DIR/messenger.db-shm" ]; then
    chmod 666 "$PROJECT_DIR/messenger.db-shm"
    echo "   ✅ messenger.db-shm"
fi
if [ -f "$PROJECT_DIR/messenger.db-wal" ]; then
    chmod 666 "$PROJECT_DIR/messenger.db-wal"
    echo "   ✅ messenger.db-wal"
fi

echo ""
echo "6️⃣ Устанавливаю права на директории для записи..."
# Директории, которые должны быть доступны для записи
WRITABLE_DIRS=(
    "$PROJECT_DIR/server/uploads"
    "$PROJECT_DIR/server/uploads/avatars"
    "$PROJECT_DIR/server/uploads/documents"
    "$PROJECT_DIR/client-react/build"
    "$PROJECT_DIR/client-react/node_modules/.cache"
    "$PROJECT_DIR/logs"
    "$PROJECT_DIR/server/logs"
)

for dir in "${WRITABLE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        chmod 775 "$dir"
        chown $OWNER_USER:$OWNER_GROUP "$dir"
        echo "   ✅ $dir"
    else
        # Создаём директорию, если её нет
        mkdir -p "$dir"
        chmod 775 "$dir"
        chown $OWNER_USER:$OWNER_GROUP "$dir"
        echo "   ✅ Создана и настроена: $dir"
    fi
done

echo ""
echo "7️⃣ Устанавливаю права на node_modules (если есть)..."
if [ -d "$PROJECT_DIR/node_modules" ]; then
    chown -R $OWNER_USER:$OWNER_GROUP "$PROJECT_DIR/node_modules"
    find "$PROJECT_DIR/node_modules" -type d -exec chmod 755 {} \;
    find "$PROJECT_DIR/node_modules" -type f -exec chmod 644 {} \;
    echo "   ✅ node_modules"
fi

if [ -d "$PROJECT_DIR/server/node_modules" ]; then
    chown -R $OWNER_USER:$OWNER_GROUP "$PROJECT_DIR/server/node_modules"
    find "$PROJECT_DIR/server/node_modules" -type d -exec chmod 755 {} \;
    find "$PROJECT_DIR/server/node_modules" -type f -exec chmod 644 {} \;
    echo "   ✅ server/node_modules"
fi

if [ -d "$PROJECT_DIR/client-react/node_modules" ]; then
    chown -R $OWNER_USER:$OWNER_GROUP "$PROJECT_DIR/client-react/node_modules"
    find "$PROJECT_DIR/client-react/node_modules" -type d -exec chmod 755 {} \;
    find "$PROJECT_DIR/client-react/node_modules" -type f -exec chmod 644 {} \;
    echo "   ✅ client-react/node_modules"
fi

echo ""
echo "8️⃣ Настраиваю Git (если есть репозиторий)..."
if [ -d "$PROJECT_DIR/.git" ]; then
    chown -R $OWNER_USER:$OWNER_GROUP "$PROJECT_DIR/.git"
    find "$PROJECT_DIR/.git" -type d -exec chmod 755 {} \;
    find "$PROJECT_DIR/.git" -type f -exec chmod 644 {} \;
    echo "   ✅ .git"
    
    # Добавляем директорию в safe.directory для Git
    sudo -u $OWNER_USER git config --global --add safe.directory "$PROJECT_DIR" 2>/dev/null || true
    echo "   ✅ Git safe.directory настроен"
fi

echo ""
echo "9️⃣ Устанавливаю права на все .db файлы в проекте..."
find "$PROJECT_DIR" -type f -name "*.db" -exec chmod 666 {} \;
find "$PROJECT_DIR" -type f -name "*.db-shm" -exec chmod 666 {} \;
find "$PROJECT_DIR" -type f -name "*.db-wal" -exec chmod 666 {} \;
find "$PROJECT_DIR" -type f -name "*.db.bak_*" -exec chmod 644 {} \;

echo ""
echo "🔟 Проверяю права доступа..."
ls -la "$PROJECT_DIR" | head -10
echo ""
ls -la "$PROJECT_DIR/messenger.db" 2>/dev/null || echo "   ⚠️  messenger.db не найден"

echo ""
echo "=================================================="
echo "✅ Права доступа настроены!"
echo ""
echo "📝 Теперь пользователь $OWNER_USER имеет полный доступ к:"
echo "   - Всем файлам и директориям проекта"
echo "   - Базе данных SQLite"
echo "   - Директориям для загрузки файлов"
echo "   - Git репозиторию"
echo ""
echo "💡 Для работы с проектом используйте:"
echo "   sudo -u $OWNER_USER <команда>"
echo "   или"
echo "   su - $OWNER_USER"
echo ""

