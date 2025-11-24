# Автоматическая установка скрытых агентов

Этот набор скриптов автоматически устанавливает и настраивает скрытые агенты для:
1. **Отправки данных о входе/выходе** (login/logout)
2. **Сбора и отправки активности пользователя**

## 📋 Что делает установка

### Агент Login/Logout
- Отправляет данные о входе пользователя в систему (при включении ПК)
- Отправляет данные о выходе пользователя из системы (при выключении ПК)
- Работает **скрыто** (без окон)

### Агент Активности
- Собирает данные об активности пользователя:
  - Активное окно
  - Название процесса
  - URL в браузере (если открыт)
  - Время простоя
- Отправляет данные на сервер каждые 5 минут
- Работает **скрыто** (без окон)

## 🚀 Быстрая установка

### Вариант 1: Автоматическая установка (РЕКОМЕНДУЕТСЯ)

1. **Правой кнопкой** по файлу `auto_install_agents.ps1`
2. Выберите **"Запуск от имени администратора"**
3. Дождитесь завершения установки
4. Готово! Агенты установлены и настроены

### Вариант 2: Ручная установка через PowerShell

1. Откройте PowerShell **от имени администратора**
2. Перейдите в папку с файлами:
   ```powershell
   cd "C:\Users\Ronin\Desktop\mesendger-god\mesendger\telegram-clone\export_to_database"
   ```
3. Выполните скрипт установки:
   ```powershell
   .\auto_install_agents.ps1
   ```

## 📁 Структура файлов

После установки файлы будут скопированы в:
```
C:\Users\ВАШЕ_ИМЯ\AppData\Local\mesendger-agents\
```

Файлы:
- `remote_login_logout_agent.ps1` - агент для login/logout
- `activity_agent.ps1` - агент активности
- `run_login_logout_hidden.vbs` - скрытый запуск login/logout
- `run_activity_hidden.vbs` - скрытый запуск активности

## 🔧 Настройка

### Изменение сервера или API ключа

Откройте файлы в `C:\Users\ВАШЕ_ИМЯ\AppData\Local\mesendger-agents\`:
- `remote_login_logout_agent.ps1` - для login/logout
- `activity_agent.ps1` - для активности

Измените строки в начале файлов:
```powershell
$GOOGLE_SERVER_URL = "http://35.232.108.72"
$REMOTE_WORKTIME_API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="
```

## 📊 Логи

Логи находятся в:
- **Login/Logout**: `%APPDATA%\mesendger\remote_worktime.log`
- **Activity**: `%APPDATA%\mesendger\activity_agent.log`

Для просмотра логов:
```powershell
notepad "$env:APPDATA\mesendger\remote_worktime.log"
notepad "$env:APPDATA\mesendger\activity_agent.log"
```

## ✅ Проверка работы

### 1. Проверка задач в Task Scheduler

1. Откройте **Task Scheduler** (Планировщик заданий)
2. Найдите задачи:
   - `Mesendger Login Agent`
   - `Mesendger Logout Agent`
   - `Mesendger Activity Agent`

### 2. Проверка логов

Проверьте логи на наличие ошибок:
```powershell
Get-Content "$env:APPDATA\mesendger\remote_worktime.log" | Select-Object -Last 20
Get-Content "$env:APPDATA\mesendger\activity_agent.log" | Select-Object -Last 20
```

### 3. Проверка в веб-интерфейсе

1. Откройте http://35.232.108.72
2. Войдите в систему
3. Откройте модалку "Отчёты по рабочему времени"
4. Выберите сегодняшнюю дату
5. Проверьте, что данные отображаются

## 🗑️ Удаление

Для удаления агентов:

```powershell
# Удалить задачи из Task Scheduler
Unregister-ScheduledTask -TaskName "Mesendger Login Agent" -Confirm:$false
Unregister-ScheduledTask -TaskName "Mesendger Logout Agent" -Confirm:$false
Unregister-ScheduledTask -TaskName "Mesendger Activity Agent" -Confirm:$false

# Удалить файлы
Remove-Item "$env:USERPROFILE\AppData\Local\mesendger-agents" -Recurse -Force

# Удалить логи (опционально)
Remove-Item "$env:APPDATA\mesendger\*.log" -Force
```

## ⚙️ Ручная настройка задач

Если автоматическая установка не сработала, можно создать задачи вручную:

### Задача Login Agent

1. Откройте **Task Scheduler**
2. Создайте новую задачу:
   - **Имя**: `Mesendger Login Agent`
   - **Триггер**: При входе пользователя
   - **Действие**: Запуск программы
     - **Программа**: `wscript.exe`
     - **Аргументы**: `"C:\Users\ВАШЕ_ИМЯ\AppData\Local\mesendger-agents\run_login_logout_hidden.vbs" login`
   - **Настройки**:
     - ✅ Скрыть задачу
     - ✅ Выполнять при питании от батареи
     - ✅ Не останавливать при переходе на батарею

### Задача Logout Agent

Аналогично, но:
- **Имя**: `Mesendger Logout Agent`
- **Триггер**: При выходе пользователя
- **Аргументы**: `"C:\Users\ВАШЕ_ИМЯ\AppData\Local\mesendger-agents\run_login_logout_hidden.vbs" logout`

### Задача Activity Agent

- **Имя**: `Mesendger Activity Agent`
- **Триггер**: При входе пользователя
- **Аргументы**: `"C:\Users\ВАШЕ_ИМЯ\AppData\Local\mesendger-agents\run_activity_hidden.vbs"`

## ❓ Решение проблем

### Агенты не запускаются

1. Проверьте права доступа (нужны права администратора)
2. Проверьте ExecutionPolicy:
   ```powershell
   Get-ExecutionPolicy
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### Данные не отправляются

1. Проверьте подключение к интернету
2. Проверьте логи на наличие ошибок
3. Проверьте правильность URL сервера и API ключа

### Задачи не создаются

1. Запустите PowerShell от имени администратора
2. Проверьте, нет ли уже созданных задач с такими же именами
3. Удалите старые задачи и создайте заново

## 📞 Контакты

Если возникли проблемы, проверьте:
- Логи в `%APPDATA%\mesendger\`
- Задачи в Task Scheduler
- Данные в веб-интерфейсе: http://35.232.108.72

