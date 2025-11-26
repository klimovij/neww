# Команды для исправления вкладки "Приложения"

## Выполните эти команды на сервере последовательно:

```bash
# 1. Копируем правильный файл с правами appuser
cd /var/www/mesendger
sudo -u appuser cp mesendger/telegram-clone/client-react/src/components/UserWorkTimeDetailsMobile.jsx client-react/src/components/UserWorkTimeDetailsMobile.jsx

# 2. Проверяем, что файл обновился (должны увидеть строки с FiMonitor и "Приложения")
grep -n "FiMonitor\|Приложения.*localApplications" client-react/src/components/UserWorkTimeDetailsMobile.jsx | head -5

# 3. Пересобираем frontend
cd client-react
sudo rm -rf build
sudo -u appuser npm run build

# 4. Перезапускаем сервер
cd ..
sudo -u appuser pm2 restart mesendger-server

# 5. Проверяем, что вкладка есть в собранном файле
grep -o "Приложения" client-react/build/static/js/main.*.js | head -1
```

## ИЛИ выполните готовый скрипт:

```bash
cd /var/www/mesendger
chmod +x mesendger/telegram-clone/FIX_APPLICATIONS_TAB_FINAL.sh
bash mesendger/telegram-clone/FIX_APPLICATIONS_TAB_FINAL.sh
```

## После выполнения:

1. Очистите кэш браузера (Ctrl+Shift+Del)
2. Сделайте жесткую перезагрузку (Ctrl+Shift+R)
3. Откройте детали пользователя
4. Проверьте, есть ли вкладка "Приложения"

