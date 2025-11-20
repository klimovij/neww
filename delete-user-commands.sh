#!/bin/bash
# Команды для удаления пользователя из таблицы users

echo "📋 Список пользователей в таблице users:"
echo ""
sudo -u appuser sqlite3 /var/www/mesendger/messenger.db "SELECT id, username, role, employee_id FROM users;"

echo ""
echo ""
echo "🗑️  Для удаления пользователя выполните:"
echo "   sudo -u appuser sqlite3 /var/www/mesendger/messenger.db \"DELETE FROM users WHERE id = <ID>;\""
echo ""
echo "   Например, для удаления пользователя с ID=2:"
echo "   sudo -u appuser sqlite3 /var/www/mesendger/messenger.db \"DELETE FROM users WHERE id = 2;\""
echo ""
echo "⚠️  Внимание: Удаление пользователя также удалит:"
echo "   - Сообщения пользователя"
echo "   - Участие в чатах"
echo "   - Лайки и комментарии"
echo "   - Заявки на отпуска"
echo "   - Задачи, связанные с пользователем"
echo ""
echo "   Если нужна безопасная очистка, используйте API или метод deleteUserCascade из database.js"

