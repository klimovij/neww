# Инструкция по подключению локального ПК к Google серверу для мониторинга времени

## 📋 Обзор системы

Система мониторинга времени собирает данные о входе/выходе пользователей из журнала Windows (события 4624 - вход, 4634 - выход) и отправляет их на Google сервер в базу данных.

### Структура базы данных

**Таблица:** `work_time_logs`

Поля:
- `id` - уникальный идентификатор
- `username` - имя пользователя Windows
- `event_type` - тип события: `login` или `logout`
- `event_time` - время события в формате `YYYY-MM-DD HH:mm:ss`
- `event_id` - ID события Windows: `4624` (вход) или `4634` (выход)
- `created_at` - время создания записи в базе

## 🔧 Настройка на сервере (Google Cloud)

### 1. Установка API ключа

API ключ для аутентификации удаленных запросов настраивается через переменную окружения:

```bash
export REMOTE_WORKTIME_API_KEY="your-secret-api-key-here"
```

Или в файле `.env`:
```
REMOTE_WORKTIME_API_KEY=your-secret-api-key-here
```

### 2. Проверка подключения маршрута

Маршрут `/api/remote-worktime` уже подключен в `server.js`. Проверьте, что он загружается без ошибок при старте сервера.

### 3. Доступные API endpoints

- **POST** `/api/remote-worktime` - прием одного события (требует API ключ в заголовке `X-API-Key`)
- **POST** `/api/remote-worktime-batch` - прием массива событий (для массовой отправки)
- **GET** `/api/remote-worktime-health` - проверка доступности API

## 💻 Настройка на локальном ПК

### 1. Установка PowerShell скрипта

Скопируйте файл `send_to_google_server.ps1` на локальный ПК в папку, например:
```
C:\Scripts\send_to_google_server.ps1
```

### 2. Настройка параметров

Откройте скрипт и измените параметры по умолчанию:

```powershell
param(
    [string]$ServerUrl = "https://your-google-server.com/api",  # URL вашего Google сервера
    [string]$ApiKey = "",  # API ключ (можно оставить пустым и передавать при запуске)
    ...
)
```

Или создайте файл конфигурации `config.ps1`:

```powershell
$global:ServerUrl = "https://your-google-server.com/api"
$global:ApiKey = "your-api-key-here"
```

И импортируйте его в скрипт:

```powershell
. .\config.ps1
```

### 3. Права доступа

Убедитесь, что PowerShell скрипт имеет права на чтение журнала Windows Security:

```powershell
# Запустите PowerShell от имени администратора и выполните:
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 4. Ручной запуск

Для проверки работы запустите скрипт вручную:

```powershell
# Импорт за вчерашний день
.\send_to_google_server.ps1 -ServerUrl "https://your-server.com/api" -ApiKey "your-api-key" -DaysBack 1

# Импорт за конкретную дату
.\send_to_google_server.ps1 -ServerUrl "https://your-server.com/api" -ApiKey "your-api-key" -StartDate "2025-01-15" -EndDate "2025-01-15"

# Автоматический режим (без запросов)
.\send_to_google_server.ps1 -ServerUrl "https://your-server.com/api" -ApiKey "your-api-key" -DaysBack 1 -Auto
```

## ⏰ Автоматический запуск по расписанию

### Вариант 1: Планировщик задач Windows

1. Откройте "Планировщик задач" (Task Scheduler)
2. Создайте новую задачу:
   - **Имя:** "Мониторинг времени - отправка на сервер"
   - **Триггер:** Ежедневно в 00:30 (или другое время)
   - **Действие:** Запустить программу
     - **Программа:** `powershell.exe`
     - **Аргументы:** 
       ```
       -NoProfile -ExecutionPolicy Bypass -File "C:\Scripts\send_to_google_server.ps1" -ServerUrl "https://your-server.com/api" -ApiKey "your-api-key" -DaysBack 1 -Auto
       ```
   - **Условия:** Запускать только при питании от сети
   - **Параметры:** Запускать задачу независимо от регистрации пользователя

### Вариант 2: PowerShell Scheduled Job

Создайте скрипт для регистрации задачи:

```powershell
# register_scheduled_job.ps1
$action = {
    $scriptPath = "C:\Scripts\send_to_google_server.ps1"
    $serverUrl = "https://your-server.com/api"
    $apiKey = "your-api-key"
    
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath -ServerUrl $serverUrl -ApiKey $apiKey -DaysBack 1 -Auto
}

$trigger = New-JobTrigger -Daily -At "00:30"
$options = New-ScheduledJobOption -RunElevated

Register-ScheduledJob -Name "WorktimeMonitorSync" -ScriptBlock $action -Trigger $trigger -ScheduledJobOption $options
```

## 🔍 Проверка работы

### 1. Проверка подключения к серверу

```powershell
$headers = @{ 'X-API-Key' = 'your-api-key' }
$response = Invoke-RestMethod -Uri "https://your-server.com/api/remote-worktime-health" -Method GET -Headers $headers
Write-Host $response.message
```

### 2. Проверка данных в базе

В модалке "Мониторинг времени" в приложении:
1. Откройте модалку "Мониторинг времени"
2. Выберите период (например, вчерашний день)
3. Нажмите "Показать отчет"
4. Проверьте, что данные отображаются корректно

## 📊 Структура данных

Каждое событие отправляется в формате:

```json
{
  "username": "Иван Иванов",
  "event_type": "login",
  "event_time": "20.01.2025 08:30:15",
  "event_id": 4624
}
```

При массовой отправке:

```json
[
  {
    "username": "Иван Иванов",
    "event_type": "login",
    "event_time": "20.01.2025 08:30:15",
    "event_id": 4624
  },
  {
    "username": "Иван Иванов",
    "event_type": "logout",
    "event_time": "20.01.2025 17:45:30",
    "event_id": 4634
  }
]
```

## ⚠️ Важные замечания

1. **API ключ** - храните в безопасном месте, не коммитьте в репозиторий
2. **Безопасность** - используйте HTTPS для передачи данных
3. **Фильтрация** - технические аккаунты (SYSTEM, DWM-*, UMFD-*) автоматически исключаются
4. **Дубликаты** - система автоматически предотвращает дублирование записей (уникальный индекс на `username`, `event_time`, `event_type`)
5. **Ошибки** - при ошибках отправки скрипт продолжит работу и покажет итоговую статистику

## 🐛 Устранение проблем

### Ошибка: "Сервер недоступен"
- Проверьте URL сервера
- Проверьте доступность сервера из сети (ping, curl)
- Проверьте файрвол и настройки безопасности

### Ошибка: "Invalid API key"
- Проверьте правильность API ключа
- Убедитесь, что API ключ совпадает на сервере и в скрипте

### Ошибка: "Access denied" при чтении журнала Windows
- Запустите PowerShell от имени администратора
- Проверьте права на чтение журнала Security

### Данные не появляются в модалке
- Проверьте, что данные действительно были отправлены (логи скрипта)
- Проверьте, что данные сохранились в базу (можно проверить через `/api/debug-worktime-users`)
- Проверьте формат дат в запросе отчета

## 📝 Логи и мониторинг

Скрипт выводит подробные логи с цветовой индикацией:
- 🟢 Зеленый - успешные операции
- 🟡 Желтый - предупреждения
- 🔴 Красный - ошибки
- ⚪ Белый - информационные сообщения

Для сохранения логов в файл:

```powershell
.\send_to_google_server.ps1 -ServerUrl "..." -ApiKey "..." -DaysBack 1 -Auto *> "C:\Logs\worktime_sync_$(Get-Date -Format 'yyyyMMdd').log"
```

## 🔄 Обновление скрипта

При обновлении скрипта:
1. Остановите задачу в планировщике (если используется)
2. Замените файл скрипта
3. Протестируйте запуск вручную
4. Перезапустите задачу в планировщике

