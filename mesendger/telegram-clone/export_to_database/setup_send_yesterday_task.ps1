# Скрипт для настройки автоматической отправки данных за предыдущий день
# Задача запускается каждый день в 01:00 ночи

param(
    [string]$ScriptPath = $PSScriptRoot
)

# Проверяем права администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Этот скрипт требует прав администратора!" -ForegroundColor Red
    Write-Host "   Запустите PowerShell от имени администратора" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔧 Настройка задачи для ежедневной отправки данных..." -ForegroundColor Cyan

# Путь к скрипту отправки
$sendScript = Join-Path $ScriptPath "send_yesterday_to_google.ps1"

# Проверяем наличие скрипта
if (-not (Test-Path $sendScript)) {
    Write-Host "❌ Скрипт не найден: $sendScript" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Скрипт найден: $sendScript" -ForegroundColor Green

# Имя задачи
$taskName = "PC_Send_Worktime_Yesterday"

# Удаляем старую задачу, если существует
Write-Host ""
Write-Host "🗑️  Проверка существующих задач..." -ForegroundColor Yellow
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "   ✓ Старая задача удалена: $taskName" -ForegroundColor Green
}

# Путь к PowerShell
$pwshCmd = Get-Command pwsh -ErrorAction SilentlyContinue
if ($pwshCmd) {
    $pwshPath = $pwshCmd.Source
} else {
    $psCmd = Get-Command powershell -ErrorAction SilentlyContinue
    if ($psCmd) {
        $pwshPath = $psCmd.Source
    } else {
        Write-Host "❌ PowerShell не найден!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📋 Создание задачи в планировщике..." -ForegroundColor Cyan

# Получаем имя текущего пользователя
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

# Создаем действие для задачи
$actionArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$sendScript`""
$action = New-ScheduledTaskAction -Execute $pwshPath -Argument $actionArgs -WorkingDirectory $ScriptPath

# Создаем триггер: каждый день в 01:00
$trigger = New-ScheduledTaskTrigger -Daily -At 1:00AM

# Настройки задачи
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable -DontStopOnIdleEnd -MultipleInstances IgnoreNew

# Принцип выполнения (Limited, чтобы не требовать пароль)
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited

# Регистрируем задачу
try {
    $desc = "Автоматическая отправка данных о входах/выходах за предыдущий день на сервер"
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $desc -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✅ Задача успешно создана!" -ForegroundColor Green
    Write-Host "   📋 Имя задачи: $taskName" -ForegroundColor Cyan
    Write-Host "   ⏰ Время запуска: каждый день в 01:00" -ForegroundColor Cyan
    Write-Host "   📁 Скрипт: $sendScript" -ForegroundColor Cyan
    
    # Показываем информацию о задаче
    $task = Get-ScheduledTask -TaskName $taskName
    Write-Host ""
    Write-Host "📊 Информация о задаче:" -ForegroundColor Yellow
    Write-Host "   Статус: $($task.State)" -ForegroundColor White
    $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
    Write-Host "   Следующий запуск: $($taskInfo.NextRunTime)" -ForegroundColor White
    
    Write-Host ""
    Write-Host "✅ Настройка завершена!" -ForegroundColor Green
    Write-Host "   Задача будет автоматически запускаться каждый день в 01:00" -ForegroundColor Gray
    Write-Host "   и отправлять данные за предыдущий день на сервер." -ForegroundColor Gray
} catch {
    Write-Host ""
    Write-Host "❌ Ошибка при создании задачи:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
