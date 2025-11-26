# Инструкция по массовому развертыванию на 40 ПК

## Подготовка файлов

### 1. Создайте папку на сервере/флешке с файлами:

```
C:\deploy-pc-monitoring\
├── send_pc_startup.ps1
├── send_pc_shutdown.ps1
├── send_activity.ps1
├── Mesendger_PC_Startup_Monitor.xml
├── Mesendger_PC_Shutdown_Monitor.xml
├── Mesendger_PC_Activity_Monitor.xml
└── setup_pc_monitoring.ps1 (скрипт установки)
```

### 2. Структура на каждом ПК (после установки):

```
C:\pc-worktime\
├── send_pc_startup.ps1
├── send_pc_shutdown.ps1
├── send_activity.ps1
├── Mesendger_PC_Startup_Monitor.xml
├── Mesendger_PC_Shutdown_Monitor.xml
├── Mesendger_PC_Activity_Monitor.xml
└── agent_config.json (создается автоматически)
```

## Процесс установки на каждом ПК

### Вариант 1: Автоматическая установка (рекомендуется)

1. **Скопируйте файлы на ПК:**
   - Скопируйте папку `C:\deploy-pc-monitoring\` на каждый ПК
   - Или используйте сетевую папку/флешку

2. **Запустите скрипт установки:**
   ```powershell
   # Откройте PowerShell от имени администратора
   cd C:\deploy-pc-monitoring
   .\setup_pc_monitoring.ps1
   ```

3. **Скрипт автоматически:**
   - Создаст папку `C:\pc-worktime`
   - Скопирует скрипты
   - Запросит username пользователя
   - Обновит XML файлы с username
   - Импортирует задачи в планировщик

### Вариант 2: Ручная установка

1. **Создайте папку на ПК:**
   ```powershell
   New-Item -ItemType Directory -Path "C:\pc-worktime" -Force
   ```

2. **Скопируйте скрипты:**
   ```powershell
   Copy-Item "send_pc_startup.ps1" -Destination "C:\pc-worktime\"
   Copy-Item "send_pc_shutdown.ps1" -Destination "C:\pc-worktime\"
   Copy-Item "send_activity.ps1" -Destination "C:\pc-worktime\"
   ```

3. **Откройте XML файлы в блокноте и замените:**
   - `USERNAME` → правильный username (например: `Ksendzik_Oleg`)
   - Проверьте путь: `C:\pc-worktime\send_pc_startup.ps1`
   - Проверьте путь: `C:\pc-worktime\send_pc_shutdown.ps1`
   - Проверьте путь: `C:\pc-worktime\send_activity.ps1`

4. **Импортируйте задачи:**
   ```powershell
   # Откройте PowerShell от имени администратора
   cd C:\pc-worktime
   
   # Удалите существующие задачи (если есть)
   schtasks /Delete /TN Mesendger_PC_Startup_Monitor /F
   schtasks /Delete /TN Mesendger_PC_Shutdown_Monitor /F
   
   # Импортируйте задачи
   schtasks /Create /TN Mesendger_PC_Startup_Monitor /XML "Mesendger_PC_Startup_Monitor.xml" /F
   schtasks /Create /TN Mesendger_PC_Shutdown_Monitor /XML "Mesendger_PC_Shutdown_Monitor.xml" /F
   schtasks /Create /TN Mesendger_PC_Activity_Monitor /XML "Mesendger_PC_Activity_Monitor.xml" /F
   ```

## Автоматический скрипт установки

Создайте файл `setup_pc_monitoring.ps1`:

```powershell
# Скрипт автоматической установки мониторинга ПК
# Требует прав администратора

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ОШИБКА: Скрипт требует прав администратора!" -ForegroundColor Red
    Write-Host "Запустите PowerShell от имени администратора." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

$targetDir = "C:\pc-worktime"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Установка мониторинга ПК для Mesendger" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Создаем целевую папку
Write-Host "Создание папки: $targetDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

# Копируем скрипты
Write-Host "`nКопирование скриптов..." -ForegroundColor Yellow
Copy-Item "$scriptDir\send_pc_startup.ps1" -Destination "$targetDir\" -Force
Copy-Item "$scriptDir\send_pc_shutdown.ps1" -Destination "$targetDir\" -Force
Write-Host "✅ Скрипты скопированы" -ForegroundColor Green

# Запрашиваем username
Write-Host "`nВведите username сотрудника (например: Ksendzik_Oleg):" -ForegroundColor Cyan
Write-Host "Этот username должен соответствовать username в базе данных Mesendger" -ForegroundColor Gray
$username = Read-Host

if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "❌ Username не может быть пустым!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Обновляем XML файлы с username
Write-Host "`nОбновление XML файлов с username: $username" -ForegroundColor Yellow

# Startup XML
$startupXml = Get-Content "$scriptDir\Mesendger_PC_Startup_Monitor.xml" -Raw -Encoding UTF8
$startupXml = $startupXml -replace 'USERNAME', $username
$startupXml = $startupXml -replace 'C:\\Users\\Ronin\\web\\pc-worktime', 'C:\pc-worktime'
$startupXml | Out-File -FilePath "$targetDir\Mesendger_PC_Startup_Monitor.xml" -Encoding Unicode -Force

# Shutdown XML
$shutdownXml = Get-Content "$scriptDir\Mesendger_PC_Shutdown_Monitor.xml" -Raw -Encoding UTF8
$shutdownXml = $shutdownXml -replace 'USERNAME', $username
$shutdownXml = $shutdownXml -replace 'C:\\Users\\Ronin\\web\\pc-worktime', 'C:\pc-worktime'
$shutdownXml | Out-File -FilePath "$targetDir\Mesendger_PC_Shutdown_Monitor.xml" -Encoding Unicode -Force

Write-Host "✅ XML файлы обновлены" -ForegroundColor Green

# Удаляем существующие задачи
Write-Host "`nУдаление существующих задач (если есть)..." -ForegroundColor Yellow
schtasks /Delete /TN Mesendger_PC_Startup_Monitor /F 2>&1 | Out-Null
schtasks /Delete /TN Mesendger_PC_Shutdown_Monitor /F 2>&1 | Out-Null

# Импортируем задачи
Write-Host "`nИмпорт задач в планировщик..." -ForegroundColor Yellow

$result = schtasks /Create /TN Mesendger_PC_Startup_Monitor /XML "$targetDir\Mesendger_PC_Startup_Monitor.xml" /F 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Задача включения ПК создана" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка создания задачи включения: $result" -ForegroundColor Red
}

$result = schtasks /Create /TN Mesendger_PC_Shutdown_Monitor /XML "$targetDir\Mesendger_PC_Shutdown_Monitor.xml" /F 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Задача выключения ПК создана" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка создания задачи выключения: $result" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Установка завершена!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Проверка задач:" -ForegroundColor Yellow
schtasks /Query /TN Mesendger_PC_Startup_Monitor
schtasks /Query /TN Mesendger_PC_Shutdown_Monitor

Write-Host "`n✅ Готово! Мониторинг настроен для пользователя: $username" -ForegroundColor Green
Read-Host "Press Enter to exit"
```

## Чек-лист для каждого ПК

- [ ] Создана папка `C:\pc-worktime`
- [ ] Скопированы скрипты:
  - [ ] `send_pc_startup.ps1`
  - [ ] `send_pc_shutdown.ps1`
  - [ ] `send_activity.ps1`
- [ ] В XML файлах заменен `USERNAME` на правильный username
- [ ] В XML файлах проверен путь `C:\pc-worktime\`
- [ ] Задачи импортированы в планировщик задач
- [ ] Проверены триггеры задач:
  - [ ] Startup: При запуске системы
  - [ ] Shutdown: При событии (System, User32, 1074)
  - [ ] Activity: При входе пользователя
- [ ] Проверена работа (перезагрузка/выключение ПК)
- [ ] Проверены логи:
  - [ ] `%APPDATA%\mesendger\pc_startup.log`
  - [ ] `%APPDATA%\mesendger\pc_shutdown.log`
  - [ ] `%APPDATA%\mesendger\activity.log`
- [ ] Проверены данные в модалке "Отчет активности локальных ПК"

## Массовое развертывание через сеть

Если у вас есть доступ к ПК по сети, можно использовать:

```powershell
# Для каждого ПК в списке
$computers = @("PC1", "PC2", "PC3", ...) # Список имен ПК

foreach ($computer in $computers) {
    Write-Host "Установка на $computer..." -ForegroundColor Cyan
    
    # Копируем файлы
    Copy-Item "C:\deploy-pc-monitoring\*" -Destination "\\$computer\C$\pc-worktime\" -Recurse -Force
    
    # Запускаем установку (требует настройки)
    # Invoke-Command -ComputerName $computer -ScriptBlock { ... }
}
```

## Важные замечания

1. **Username должен быть уникальным** для каждого ПК и соответствовать username в базе данных
2. **Путь `C:\pc-worktime`** должен быть одинаковым на всех ПК
3. **Права доступа:** Скрипты должны иметь права на запись в `C:\pc-worktime`
4. **Сеть:** Убедитесь, что все ПК имеют доступ к серверу `http://35.232.108.72`

