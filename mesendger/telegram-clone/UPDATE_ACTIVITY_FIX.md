# Инструкция по обновлению сервера для исправления отображения активности

## Проблема
Данные активности сохраняются в базу, но не отображаются в модалке, потому что в `report` из `/api/quick-db-report` отсутствовало поле `username`.

## Исправления

1. **server/routes/quickCsvReport.js** (строка 106)
   - Добавлено поле `username: user` в объект `report`
   - Это позволяет модалке сопоставить данные из `quick-db-report` с данными из `activity-summary`

2. **client-react/src/components/Modals/WorkTimeReportModal.jsx** (строки 384-410)
   - Добавлено расширенное логирование для отладки
   - Улучшено сопоставление username с данными активности

## Обновление сервера

### Автоматическое обновление (рекомендуется)

1. Сначала закоммитьте изменения в Git на локальной машине:
   ```bash
   git add .
   git commit -m "Fix: Add username field to quick-db-report for activity data matching"
   git push origin main
   ```

2. На сервере выполните:
   ```bash
   cd /var/www/mesendger
   chmod +x update_server_activity_fix.sh
   ./update_server_activity_fix.sh
   ```

### Ручное обновление

Если автоматический скрипт не работает, выполните на сервере вручную:

```bash
# 1. Перейти в директорию проекта
cd /var/www/mesendger

# 2. Обновить код из Git
sudo -u appuser git pull origin main

# 3. Проверить, что исправление присутствует
grep "username: user" server/routes/quickCsvReport.js

# 4. Пересобрать frontend
cd client-react
sudo -u appuser npm install
sudo -u appuser CI=false npm run build
cd ..

# 5. Перезапустить сервер
sudo -u appuser pm2 restart all

# 6. Проверить статус
sudo -u appuser pm2 status
sudo -u appuser pm2 logs mesendger-server --lines 50
```

## Проверка работы

После обновления проверьте:

1. Откройте веб-интерфейс и войдите в систему
2. Откройте модалку "Work Time Report"
3. Выберите сегодняшнюю дату
4. Нажмите "Показать отчет"
5. Нажмите "Детали" для любого пользователя
6. В консоли браузера (F12) должны появиться логи:
   - `🔍 [WorkTimeReportModal] Row data: {username: "Ksendzik_Oleg", fio: "Олег Ксендзик"}`
   - `✅ [WorkTimeReportModal] Найденный activityStats: {...}`
7. В модалке должны отображаться данные активности:
   - Активных минут
   - Минут простоя
   - Топ приложений

## Диагностика

Если данные всё ещё не отображаются:

1. Проверьте логи сервера:
   ```bash
   sudo -u appuser pm2 logs mesendger-server --lines 100 | grep activity
   ```

2. Проверьте API напрямую:
   ```bash
   curl 'http://localhost/api/quick-db-report?start=2025-11-24&end=2025-11-24' | jq '.report[0] | {username, fio}'
   curl 'http://localhost/api/activity-summary?start=2025-11-24&end=2025-11-24' | jq '.summary[] | select(.username=="Ksendzik_Oleg")'
   ```

3. Проверьте консоль браузера (F12) - должны быть логи с префиксом `🔍 [WorkTimeReportModal]`

## Возможные проблемы

- **Сервер не обновлён**: Убедитесь, что `git pull` выполнен и frontend пересобран
- **Браузер кэширует старую версию**: Обновите страницу с очисткой кэша (Ctrl+F5)
- **username не совпадает**: Проверьте, что username в базе данных совпадает с username в activity_logs

