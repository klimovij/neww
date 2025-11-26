# Инструкция по обновлению и пересборке для исправления проблемы с Applications

## Шаг 1: Проверка, что backend файл обновлен

```bash
cd /var/www/mesendger
sudo -u appuser git pull origin main
grep -n "applications:" /var/www/mesendger/server/routes/activity.js | head -5
```

Должна быть строка с `applications: applications,` (примерно строка 510)

## Шаг 2: Копирование файла в правильное место

```bash
sudo cp /var/www/mesendger/mesendger/telegram-clone/server/routes/activity.js /var/www/mesendger/server/routes/activity.js
```

## Шаг 3: Пересборка фронтенда

```bash
cd /var/www/mesendger/client-react
sudo rm -rf build
sudo -u appuser npm run build
```

## Шаг 4: Перезапуск сервера

```bash
cd /var/www/mesendger
sudo -u appuser pm2 restart mesendger-server
```

## Шаг 5: Проверка логов

```bash
sudo -u appuser pm2 logs mesendger-server --lines 0
```

Откройте детали пользователя в браузере. В логах должны появиться строки:
- `🔍 [activity-details] Всего логов для Ksendzik_Oleg`
- `📊 [activity-details] Приложений для пользователя Ksendzik_Oleg: 6099`

## Шаг 6: Проверка в браузере

1. Откройте консоль браузера (F12)
2. Очистите кэш (Ctrl+Shift+Del или Cmd+Shift+Del)
3. Сделайте жесткую перезагрузку (Ctrl+Shift+R или Cmd+Shift+R)
4. Откройте детали пользователя
5. Проверьте консоль браузера на наличие логов:
   - `📡 [WorkTimeMobile] ====== ОТВЕТ ОТ API ======`
   - `📡 [WorkTimeMobile] applications в ответе:`
   - `✅ [WorkTimeMobile] Applications загружены успешно:`

## Шаг 7: Если Applications не отображаются

Проверьте консоль браузера на наличие:
- `🔍 [UserWorkTimeDetailsMobile] Props applications:`
- `📱 [UserWorkTimeDetailsMobile] Рендер вкладки Приложения`

Если этих логов нет - фронтенд не обновился, нужно пересобрать.

