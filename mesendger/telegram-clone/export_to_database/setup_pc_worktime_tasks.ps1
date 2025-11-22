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
Write-Host "`n🔍 Поиск скрипта агента активности..." -ForegroundColor Yellow

# Проверяем стандартные пути к скрипту
# Сначала проверяем в текущей рабочей директории (где пользователь запускает скрипт)
$currentDir = Get-Location
$possiblePaths = @(
    (Join-Path $currentDir "pc_activity_agent.ps1"),
    (Join-Path $PSScriptRoot "pc_activity_agent.ps1"),
    $activityScript,
    "C:\Users\$env:USERNAME\web\pc-worktime\pc_activity_agent.ps1",
    "$env:USERPROFILE\web\pc-worktime\pc_activity_agent.ps1",
    "C:\pc-worktime\pc_activity_agent.ps1"
)

Write-Host "   Проверяем пути:" -ForegroundColor Gray
$actualScriptPath = $null
foreach ($path in $possiblePaths) {
    if ($path) {
        $resolvedPath = try { (Resolve-Path $path -ErrorAction SilentlyContinue).Path } catch { $null }
        if ($resolvedPath) {
            Write-Host "      ✅ $resolvedPath" -ForegroundColor Green
            $actualScriptPath = $resolvedPath
            break
        } else {
            Write-Host "      ❌ $path" -ForegroundColor DarkGray
        }
    }
}

if ($actualScriptPath) {
    Write-Host "`n📝 Создание задачи для агента активности..." -ForegroundColor Yellow
    
    # Получаем имя пользователя для параметра -User
    $userParam = $env:USERNAME

    # Используем pwsh.exe (PowerShell 7) если доступен, иначе powershell.exe (Windows PowerShell 5.1)
    $psExecutable = if (Get-Command pwsh.exe -ErrorAction SilentlyContinue) { "pwsh.exe" } else { "powershell.exe" }
    
    $actionActivity = New-ScheduledTaskAction -Execute $psExecutable `
        -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$actualScriptPath`" -User $userParam" `
        -WorkingDirectory (Split-Path $actualScriptPath -Parent)

    # Запуск при входе пользователя с задержкой 30 секунд
    # Не указываем UserId явно в триггере - он будет использовать пользователя из Principal
    $triggerActivity = New-ScheduledTaskTrigger -AtLogOn
    $triggerActivity.Enabled = $true
    # Задержка 30 секунд после входа (PT30S = 30 секунд)
    # Используем TimeSpan вместо строки для совместимости
    $triggerActivity.Delay = (New-TimeSpan -Seconds 30)

    # Principal должен совпадать с пользователем, который входит в систему
    $principalActivity = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

    $settingsActivity = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartCount 5 `
        -RestartInterval (New-TimeSpan -Minutes 2) `
        -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
        -MultipleInstances IgnoreNew `
        -DontStopOnIdleEnd

    try {
        Register-ScheduledTask -TaskName $taskNameActivity `
            -Action $actionActivity `
            -Trigger $triggerActivity `
            -Principal $principalActivity `
            -Settings $settingsActivity `
            -Description "Отслеживание активности пользователя на ПК. Запускается при входе в систему с задержкой 30 секунд." `
            -Force -ErrorAction Stop
        
        Write-Host "   ✅ Создана/обновлена задача: $taskNameActivity" -ForegroundColor Green
        
        Write-Host "   📋 Параметры задачи:" -ForegroundColor Cyan
        Write-Host "      - Путь к скрипту: $actualScriptPath" -ForegroundColor Gray
        Write-Host "      - PowerShell: $psExecutable" -ForegroundColor Gray
        Write-Host "      - Пользователь: $userParam" -ForegroundColor Gray
        Write-Host "      - Запуск: При входе в систему (с задержкой 30 сек)" -ForegroundColor Gray
        Write-Host "      - Перезапуск при сбое: до 5 раз каждые 2 минуты" -ForegroundColor Gray
        
        # Проверяем состояние задачи
        Start-Sleep -Seconds 2  # Даем время задаче обновиться
        $task = Get-ScheduledTask -TaskName $taskNameActivity -ErrorAction SilentlyContinue
        if ($task) {
            if ($task.State -eq "Ready") {
                Write-Host "   ✅ Задача включена и готова к запуску" -ForegroundColor Green
                
                # Проверяем триггеры
                $triggers = $task.Triggers
                if ($triggers.Count -gt 0) {
                    Write-Host "   ✅ Настроено триггеров: $($triggers.Count)" -ForegroundColor Green
                    foreach ($trigger in $triggers) {
                        if ($trigger.CimClass.CimClassName -eq "MSFT_TaskLogonTrigger") {
                            Write-Host "      ✓ Триггер: При входе в систему (At log on)" -ForegroundColor Gray
                            if ($trigger.Delay) {
                                Write-Host "      ✓ Задержка: $($trigger.Delay)" -ForegroundColor Gray
                            }
                        }
                    }
                } else {
                    Write-Host "   ⚠️  Триггеры не настроены!" -ForegroundColor Yellow
                }
                
                # Проверяем следующее время запуска (может быть пустым до следующего входа)
                $taskInfo = Get-ScheduledTaskInfo -TaskName $taskNameActivity
                if ($taskInfo.NextRunTime) {
                    Write-Host "   ✅ Следующий запуск: $($taskInfo.NextRunTime)" -ForegroundColor Green
                } else {
                    Write-Host "   ℹ️  Следующий запуск: При следующем входе в систему" -ForegroundColor Gray
                }
            } else {
                Write-Host "   ⚠️  Задача существует, но состояние: $($task.State)" -ForegroundColor Yellow
                Write-Host "      Включите задачу в планировщике задач Windows" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "   ❌ Ошибка при создании задачи: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "      Детали: $($_.Exception | ConvertTo-Json -Compress)" -ForegroundColor Red
        Write-Host "      Попробуйте создать задачу вручную в планировщике задач Windows" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n⚠️  Скрипт агента активности не найден по путям:" -ForegroundColor Yellow
    foreach ($path in $possiblePaths) {
        Write-Host "      - $path" -ForegroundColor Gray
    }
    Write-Host "   Задача для агента активности не будет создана" -ForegroundColor Yellow
    Write-Host "   Создайте задачу вручную в планировщике задач Windows" -ForegroundColor Yellow
}

Write-Host "`n✅ Настройка задач завершена!" -ForegroundColor Green
Write-Host "`n📋 Созданные задачи:" -ForegroundColor Cyan
Get-ScheduledTask -TaskName "$taskNameOn*", "$taskNameOff*", "$taskNameActivity*" | Format-Table TaskName, State, @{Label="Путь";Expression={$_.Actions.Execute}}

Write-Host "`n💡 Следующие шаги:" -ForegroundColor Cyan
Write-Host "   1. Откройте планировщик задач Windows" -ForegroundColor White
Write-Host "   2. Найдите задачу '$taskNameOff' и настройте триггер для выключения (Event ID 1074)" -ForegroundColor White
Write-Host "   3. Проверьте, что все задачи включены (State = Ready)" -ForegroundColor White

