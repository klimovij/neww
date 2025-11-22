# Скрипт для автоматической настройки задач в планировщике Windows
# Этот скрипт удаляет старые задачи и создает новые с правильными параметрами

param(
    [string]$ScriptPath = $PSScriptRoot
)

# Проверяем права администратора
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "❌ Этот скрипт требует прав администратора!" -ForegroundColor Red
    Write-Host "   Запустите PowerShell от имени администратора" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔧 Настройка задач в планировщике Windows..." -ForegroundColor Cyan

# Пути к скриптам
$onScript = Join-Path $ScriptPath "pc_worktime_client_On.ps1"
$offScript = Join-Path $ScriptPath "pc_worktime_client_Off.ps1"
$activityScript = Join-Path $ScriptPath "pc_activity_agent.ps1"

# Проверяем наличие скриптов
if (-not (Test-Path $onScript)) {
    Write-Host "❌ Скрипт не найден: $onScript" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $offScript)) {
    Write-Host "❌ Скрипт не найден: $offScript" -ForegroundColor Red
    exit 1
}

# Имена задач
$taskNameOn = "PC_Worktime_On"
$taskNameOff = "PC_Worktime_Off"
$taskNameActivity = "PC_Activity_Agent"

# 1. Удаляем старые задачи (если они существуют)
Write-Host "`n🗑️  Удаление старых задач..." -ForegroundColor Yellow

$tasksToDelete = @($taskNameOn, $taskNameOff, $taskNameActivity, "PC_Worktime", "pc_worktime_client")

foreach ($taskName in $tasksToDelete) {
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
        Write-Host "   ✓ Удалена задача: $taskName" -ForegroundColor Green
    }
}

# 2. Создаем задачу для включения ПК (при входе в систему)
Write-Host "`n📝 Создание задачи для включения ПК..." -ForegroundColor Yellow

$actionOn = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$onScript`""

$triggerOn = New-ScheduledTaskTrigger -AtLogOn

$principalOn = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

$settingsOn = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskNameOn `
    -Action $actionOn `
    -Trigger $triggerOn `
    -Principal $principalOn `
    -Settings $settingsOn `
    -Description "Отправка события включения ПК на сервер" `
    -Force | Out-Null

Write-Host "   ✓ Создана задача: $taskNameOn" -ForegroundColor Green

# 3. Создаем задачу для выключения ПК (при событии выключения)
Write-Host "`n📝 Создание задачи для выключения ПК..." -ForegroundColor Yellow

$actionOff = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$offScript`""

# Триггер по событию: Event ID 1074 (выключение/перезагрузка системы)
$triggerOff = New-ScheduledTaskTrigger -AtStartup
# Для выключения нужно использовать XML триггер (Event ID 1074)
# Пока используем простой триггер, можно настроить вручную в планировщике

$principalOff = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

$settingsOff = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskNameOff `
    -Action $actionOff `
    -Trigger $triggerOff `
    -Principal $principalOff `
    -Settings $settingsOff `
    -Description "Отправка события выключения ПК на сервер (запускается при старте, затем через shutdown hook)" `
    -Force | Out-Null

Write-Host "   ✓ Создана задача: $taskNameOff" -ForegroundColor Green
Write-Host "   ⚠️  ВАЖНО: Для выключения настройте триггер вручную:" -ForegroundColor Yellow
Write-Host "      Откройте планировщик задач → $taskNameOff → Триггеры → Создать" -ForegroundColor Yellow
Write-Host "      Тип: При событии" -ForegroundColor Yellow
Write-Host "      Лог: System, Источник: USER32, ID события: 1074" -ForegroundColor Yellow

# 4. Создаем задачу для агента активности (если скрипт существует)
if (Test-Path $activityScript) {
    Write-Host "`n📝 Создание задачи для агента активности..." -ForegroundColor Yellow

    $actionActivity = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$activityScript`" -User $env:USERNAME"

    # Запуск при входе пользователя
    $triggerActivity = New-ScheduledTaskTrigger -AtLogOn

    # Запуск при разблокировке рабочей станции
    $triggerActivity2 = New-ScheduledTaskTrigger -AtLogOn

    $principalActivity = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

    $settingsActivity = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 1)

    Register-ScheduledTask -TaskName $taskNameActivity `
        -Action $actionActivity `
        -Trigger @($triggerActivity, $triggerActivity2) `
        -Principal $principalActivity `
        -Settings $settingsActivity `
        -Description "Отслеживание активности пользователя на ПК" `
        -Force | Out-Null

    Write-Host "   ✓ Создана задача: $taskNameActivity" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Скрипт агента активности не найден: $activityScript" -ForegroundColor Yellow
    Write-Host "   Задача для агента активности не будет создана" -ForegroundColor Yellow
}

Write-Host "`n✅ Настройка задач завершена!" -ForegroundColor Green
Write-Host "`n📋 Созданные задачи:" -ForegroundColor Cyan
Get-ScheduledTask -TaskName "$taskNameOn*", "$taskNameOff*", "$taskNameActivity*" | Format-Table TaskName, State, @{Label="Путь";Expression={$_.Actions.Execute}}

Write-Host "`n💡 Следующие шаги:" -ForegroundColor Cyan
Write-Host "   1. Откройте планировщик задач Windows" -ForegroundColor White
Write-Host "   2. Найдите задачу '$taskNameOff' и настройте триггер для выключения (Event ID 1074)" -ForegroundColor White
Write-Host "   3. Проверьте, что все задачи включены (State = Ready)" -ForegroundColor White

