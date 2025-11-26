# Диагностика проблемы с Applications

## Шаг 1: Проверить, что API возвращает applications

На сервере выполните:

```bash
# Проверить логи сервера на наличие applications
cd /var/www/mesendger
sudo -u appuser pm2 logs mesendger-server --lines 100 | grep "Приложений для пользователя"
```

Должно быть: `📊 [activity-details] Приложений для пользователя Ksendzik_Oleg: 6099`

## Шаг 2: Проверить API напрямую (curl)

```bash
# Получить данные напрямую от API
curl -s "http://localhost:5000/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-25" | jq '.applications | length'
```

Если команда `jq` не установлена:
```bash
curl -s "http://localhost:5000/api/activity-details?username=Ksendzik_Oleg&start=2025-11-25&end=2025-11-25" | python3 -m json.tool | grep -A 5 '"applications"'
```

## Шаг 3: Проверить код сервера - что возвращается

```bash
cd /var/www/mesendger
grep -A 5 "applications:" server/routes/activity.js | head -10
```

Должна быть строка: `applications: applications,`

## Шаг 4: Проверить, передаются ли applications в WorkTimeMobile

```bash
cd /var/www/mesendger
grep -n "applications:" client-react/src/components/WorkTimeMobile.jsx | head -5
```

## Шаг 5: Проверить компонент UserWorkTimeDetailsMobile - есть ли вкладка

```bash
cd /var/www/mesendger
grep -n "Приложения\|applications" client-react/src/components/UserWorkTimeDetailsMobile.jsx | head -10
```

## Шаг 6: Проверить, что передается в props (в браузере)

Откройте консоль браузера и выполните:

```javascript
// Найти компонент в DOM
const modal = document.querySelector('[style*="z-index: 99999"]');
console.log('Modal:', modal);

// Проверить props через React DevTools (если установлен)
```

## Шаг 7: Проверить сетевой запрос в браузере

1. Откройте DevTools (F12)
2. Перейдите на вкладку Network
3. Откройте детали пользователя
4. Найдите запрос `/api/activity-details`
5. Откройте Response
6. Проверьте, есть ли поле `applications` и сколько в нем элементов

## Шаг 8: Проверить код рендеринга вкладки

Проверить, что вкладка не скрыта CSS или условием:

```bash
cd /var/www/mesendger
grep -A 10 "activeTab === 'applications'" client-react/src/components/UserWorkTimeDetailsMobile.jsx
```

## Шаг 9: Проверить, правильно ли устанавливается localApplications

Проверить useEffect, который устанавливает localApplications:

```bash
cd /var/www/mesendger
grep -B 5 -A 10 "setLocalApplications" client-react/src/components/UserWorkTimeDetailsMobile.jsx
```

## Шаг 10: Проверить условие отображения вкладки

Вкладка может не отображаться, если:
- localApplications пустой массив
- Есть условие, которое скрывает вкладку при пустом массиве

Проверить:

```bash
cd /var/www/mesendger
grep -B 5 -A 15 "Приложения" client-react/src/components/UserWorkTimeDetailsMobile.jsx | grep -E "if|length|>|<|==="
```

