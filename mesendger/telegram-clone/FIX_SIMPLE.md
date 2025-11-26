# Простые команды для исправления ошибки React Hooks

Выполните эти команды на сервере последовательно:

```bash
cd /var/www/mesendger

# 1. Обновить из git
sudo -u appuser git pull origin main

# 2. Скопировать файл из git-директории в рабочую директорию
sudo -u appuser cp mesendger/telegram-clone/client-react/src/components/UserWorkTimeDetailsMobile.jsx client-react/src/components/UserWorkTimeDetailsMobile.jsx

# 3. Проверить, что useMemo перед return null (должно показать: useMemo на строке X, if (!open) на строке Y, где X < Y)
echo "Проверка порядка хуков:"
grep -n "const sortedLogs = useMemo\|if (!open)" client-react/src/components/UserWorkTimeDetailsMobile.jsx | head -2

# 4. Очистить ВСЕ кэши
cd client-react
sudo rm -rf build
sudo rm -rf node_modules/.cache
sudo rm -rf .eslintcache

# 5. Пересобрать
sudo -u appuser npm run build

# 6. Перезапустить сервер
cd ..
sudo -u appuser pm2 restart mesendger-server
```

## Альтернатива: использовать готовый скрипт

```bash
cd /var/www/mesendger
chmod +x mesendger/telegram-clone/FIX_HOOKS_ERROR.sh
bash mesendger/telegram-clone/FIX_HOOKS_ERROR.sh
```

