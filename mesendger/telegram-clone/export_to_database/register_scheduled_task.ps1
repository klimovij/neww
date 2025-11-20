# Скрипт для регистрации задачи в планировщике Windows
# Автоматически запускает отправку данных мониторинга времени

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Загружаем конфигурацию
$configPath = Join-Path $PSScriptRoot "config.ps1"
if (Test-Path $configPath) {
    . $configPath
} else {
    Write-Host "⚠️  Файл конфигурации config.ps1 не найден!" -ForegroundColor Yellow
    Write-Host "Создайте файл config.ps1 на основе config.example.ps1" -ForegroundColor Yellow
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Проверка параметров
if (-not $global:ServerUrl -or $global:ServerUrl -eq "https://your-google-server.com/api") {
    Write-Host "❌ Ошибка: Не настроен ServerUrl в config.ps1" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

if (-not $global:ApiKey -or $global:ApiKey -eq "your-secret-api-key-here") {
    Write-Host "❌ Ошибка: Не настроен ApiKey в config.ps1" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

$scriptPath = $global:ScriptPath
if (-not $scriptPath) {
    $scriptPath = Join-Path $PSScriptRoot "send_to_google_server.ps1"
}

if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Ошибка: Скрипт не найден: $scriptPath" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

$taskName = "WorktimeMonitorSync"
$scheduledTime = if ($global:ScheduledTime) { $global:ScheduledTime } else { "00:30" }

Write-Host "📋 Регистрация задачи в планировщике Windows" -ForegroundColor Cyan
Write-Host "Имя задачи: $taskName" -ForegroundColor White
Write-Host "Время запуска: $scheduledTime (ежедневно)" -ForegroundColor White
Write-Host "Скрипт: $scriptPath" -ForegroundColor White
Write-Host ""

# Проверяем, существует ли уже задача
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "⚠️  Задача '$taskName' уже существует!" -ForegroundColor Yellow
    $response = Read-Host "Перезаписать? (y/n)"
    if ($response.ToLower() -ne "y" -and $response.ToLower() -ne "yes") {
        Write-Host "❌ Отменено" -ForegroundColor Red
        Read-Host "Нажмите Enter для выхода"
        exit 0
    }
    
    # Удаляем существующую задачу
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "✅ Старая задача удалена" -ForegroundColor Green
}

# Формируем команду PowerShell
$arguments = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$scriptPath`"",
    "-ServerUrl", "`"$global:ServerUrl`"",
    "-ApiKey", "`"$global:ApiKey`"",
    "-DaysBack", $global:DaysBack,
    "-Auto"
)

# Если нужно сохранять логи
if ($global:SaveLogs -and $global:LogPath) {
    $logDir = $global:LogPath
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    $logFile = Join-Path $logDir "worktime_sync_$(Get-Date -Format 'yyyyMMdd').log"
    $arguments += "*>", "`"$logFile`""
}

$command = "powershell.exe"
$argString = $arguments -join " "

Write-Host "🔧 Создание задачи..." -ForegroundColor Yellow

try {
    # Создаем действие
    $action = New-ScheduledTaskAction -Execute $command -Argument $argString
    
    # Создаем триггер (ежедневно в указанное время)
    $trigger = New-ScheduledTaskTrigger -Daily -At $scheduledTime
    
    # Настройки задачи
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
    
    # Принцип выполнения (от имени SYSTEM или текущего пользователя)
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest
    
    # Регистрируем задачу
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Автоматическая отправка данных мониторинга времени на Google сервер"
    
    Write-Host "✅ Задача успешно зарегистрирована!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Информация о задаче:" -ForegroundColor Cyan
    
    # Показываем информацию о задаче
    $task = Get-ScheduledTask -TaskName $taskName
    $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
    
    Write-Host "   Имя: $($task.TaskName)" -ForegroundColor White
    Write-Host "   Статус: $($task.State)" -ForegroundColor White
    Write-Host "   Следующий запуск: $($taskInfo.NextRunTime)" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Для проверки задачи используйте:" -ForegroundColor Yellow
    Write-Host "   Get-ScheduledTask -TaskName $taskName" -ForegroundColor Gray
    Write-Host "   Get-ScheduledTaskInfo -TaskName $taskName" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Для удаления задачи используйте:" -ForegroundColor Yellow
    Write-Host "   Unregister-ScheduledTask -TaskName $taskName -Confirm:`$false" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Ошибка при создании задачи: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

Write-Host ""
Read-Host "Нажмите Enter для выхода"

