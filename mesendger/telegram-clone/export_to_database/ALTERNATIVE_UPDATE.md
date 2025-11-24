# Альтернативные способы обновления сервера

Если не можете подключиться через SSH или Google Cloud Console, попробуйте:

## Вариант 1: Через веб-интерфейс (если есть админ-панель)

Проверьте, есть ли в вашем приложении админ-панель для обновления кода:
- Откройте http://35.232.108.72
- Войдите как администратор
- Поищите раздел "Обновление" или "Deploy"

## Вариант 2: Попросите кого-то с доступом

Если у вас нет доступа к серверу, попросите человека с правами администратора:
1. Подключиться к серверу через SSH
2. Выполнить команду обновления

## Вариант 3: Временное решение - изменить код прямо на сервере

Если у вас есть доступ к файлам сервера (через FTP/SFTP или другой способ):

1. Подключитесь к серверу (FTP/SFTP/файловый менеджер)
2. Найдите файл: `/var/www/mesendger/server/routes/quickCsvReport.js`
3. Откройте функцию `getDbShortReport`
4. Измените строки 30-34 на:

```javascript
async function getDbShortReport({ start, end, username }) {
  // Получаем логи из обеих таблиц: work_time_logs (старые данные) и remote_work_time_logs (новые данные от агентов)
  const periodLogs = await db.getWorkTimeLogs({ start, end, username });
  const remoteLogs = await db.getRemoteWorkTimeLogs({ start, end, username });
  
  // Объединяем логи из обеих таблиц
  const allLogs = [...periodLogs, ...remoteLogs];
```

5. Перезапустите сервер: `sudo -u appuser pm2 restart all`

## Вариант 4: Проверьте, может быть уже обновлено

Запустите проверку:

```powershell
cd C:\Users\Ronin\web\pc-worktime
powershell -ExecutionPolicy Bypass -File ..\..\Desktop\mesendger-god\mesendger\telegram-clone\export_to_database\verify_server_update.ps1
```

Если показывает "Server appears to be UPDATED" - значит всё уже работает!

## Вариант 5: Обратитесь к администратору сервера

Если у вас нет доступа:
1. Найдите администратора Google Cloud или сервера
2. Попросите его выполнить обновление
3. Покажите ему файл `SERVER_UPDATE_READY.txt` с инструкциями

