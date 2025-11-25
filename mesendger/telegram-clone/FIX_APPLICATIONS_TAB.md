# 🔧 Исправление проблемы с вкладкой "Приложения"

## Проблема
Вкладка "Приложения" не отображается в UI, хотя код присутствует.

## Решение

### Шаг 1: Подключитесь к серверу
```bash
ssh albertronin5@instance-20251117-204836
```

### Шаг 2: Выполните команды по порядку

```bash
# Переходим в директорию проекта
cd /var/www/mesendger

# Обновляем код из Git
sudo -u appuser git pull origin main

# Проверяем, что вкладка есть в исходном коде
grep -n "Приложения.*localApplications" mesendger/telegram-clone/client-react/src/components/UserWorkTimeDetailsMobile.jsx

# Проверяем, что API возвращает applications
grep -n "applications:" server/routes/activity.js

# Переходим в директорию фронтенда
cd client-react

# Удаляем старый build
sudo rm -rf build

# Пересобираем фронтенд
sudo -u appuser npm run build

# Проверяем, что вкладка есть в собранном файле
grep -c "Приложения" build/static/js/main.*.js

# Перезапускаем сервер
sudo -u appuser pm2 restart mesendger-server

# Проверяем статус
sudo -u appuser pm2 status
```

### Шаг 3: Очистите кэш браузера
1. Нажмите `Ctrl+Shift+Del` (или `Ctrl+F5`)
2. Выберите "Кэшированные изображения и файлы"
3. Нажмите "Очистить данные"
4. Обновите страницу (`F5`)

### Шаг 4: Проверьте в браузере
1. Откройте отчет по рабочему времени
2. Нажмите "Детали" для любого пользователя
3. Проверьте наличие вкладки "Приложения" (с иконкой монитора)

## Диагностика

Если проблема сохраняется, выполните:

```bash
# Проверка логов сервера
sudo -u appuser pm2 logs mesendger-server --lines 50

# Проверка API вручную (замените USERNAME, START, END)
curl "http://localhost:3000/api/activity-details?username=USERNAME&start=2024-01-01&end=2024-01-31" | jq '.applications | length'

# Проверка прав доступа к файлам
ls -la /var/www/mesendger/client-react/build/static/js/main.*.js
```

## Ожидаемый результат

После выполнения всех шагов:
- ✅ Вкладка "Приложения" отображается в UI
- ✅ Счетчик показывает количество приложений: `Приложения (N)`
- ✅ При клике на вкладку отображается список приложений
- ✅ API возвращает массив `applications` в ответе

