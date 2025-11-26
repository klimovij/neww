# Быстрое исправление на сервере

Выполните эти команды по порядку:

```bash
# 1. Обновление кода
cd /var/www/mesendger
sudo -u appuser git pull origin main

# 2. Переход в директорию фронтенда
cd client-react

# 3. Удаление старого build
sudo rm -rf build

# 4. Пересборка фронтенда
sudo -u appuser npm run build

# 5. Проверка что вкладка есть в build
grep -c "Приложения" build/static/js/main.*.js

# 6. Перезапуск сервера
sudo -u appuser pm2 restart mesendger-server

# 7. Проверка статуса
sudo -u appuser pm2 status
```

**После выполнения:**
- Очистите кэш браузера (Ctrl+Shift+Del)
- Обновите страницу (F5)

