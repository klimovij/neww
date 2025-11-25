# 🔍 Отладка вкладки "Приложения"

## Что добавлено

Добавлено подробное логирование для отладки проблемы с вкладкой "Приложения".

## Шаги для диагностики

### 1. Обновите код на сервере

```bash
cd /var/www/mesendger
sudo -u appuser git pull origin main
cd client-react
sudo rm -rf build
sudo -u appuser npm run build
sudo -u appuser pm2 restart mesendger-server
```

### 2. Очистите кэш браузера

- Нажмите `Ctrl+Shift+Del`
- Выберите "Кэшированные изображения и файлы"
- Нажмите "Очистить данные"
- Обновите страницу (`F5`)

### 3. Откройте консоль браузера

- Нажмите `F12` (или `Ctrl+Shift+I`)
- Перейдите на вкладку "Console"

### 4. Откройте детали пользователя

1. Откройте отчет по рабочему времени
2. Нажмите "Детали" для любого пользователя
3. Смотрите логи в консоли

## Что искать в логах

Ищите следующие сообщения в консоли:

1. **`🔍 [UserWorkTimeDetailsMobile] Props applications:`**
   - Показывает, сколько applications передано в props
   - Если `0` или `undefined` - проблема в передаче данных из `WorkTimeMobile`

2. **`🔄 [UserWorkTimeDetailsMobile] Обновление локального состояния:`**
   - Показывает, какие данные приходят в компонент
   - Должен показывать `applicationsCount`

3. **`✅ [UserWorkTimeDetailsMobile] Данные получены от API:`**
   - Показывает, что вернул API
   - Должен показывать `applicationsCount` и массив `applications`

4. **`📑 [UserWorkTimeDetailsMobile] Рендер секции табов:`**
   - Показывает, рендерятся ли табы
   - Должен показывать `localApplications count`

5. **`🖱️ [UserWorkTimeDetailsMobile] Клик по вкладке Приложения:`**
   - Показывается при клике на вкладку
   - Должен показывать количество `localApplications`

6. **`📱 [UserWorkTimeDetailsMobile] Рендер вкладки Приложения:`**
   - Показывается при рендере содержимого вкладки
   - Должен показывать `activeTab` и количество `localApplications`

## Возможные проблемы

### Если `applicationsCount: 0` в логах:

1. **Проверьте API ответ:**
   ```bash
   curl "http://localhost:3000/api/activity-details?username=Ksendzik_Oleg&start=2024-01-01&end=2024-12-31" | jq '.applications | length'
   ```

2. **Проверьте базу данных:**
   - Убедитесь, что есть записи в `activity_logs` с `proc_name`, но без `browser_url`
   - Исключены браузеры (chrome, msedge, firefox, opera)

### Если вкладка не отображается:

1. **Проверьте CSS z-index:**
   - Вкладка должна иметь `zIndex: 10`
   - Проверьте, не перекрывается ли она другими элементами

2. **Проверьте рендеринг:**
   - Вкладка должна быть в DOM
   - Используйте DevTools → Elements для проверки

## Скопируйте логи из консоли

После выполнения всех шагов, скопируйте все логи, которые содержат:
- `UserWorkTimeDetailsMobile`
- `WorkTimeMobile`
- `applications`

И отправьте их для дальнейшей диагностики.

