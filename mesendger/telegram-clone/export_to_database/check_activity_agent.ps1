# Скрипт для проверки статуса агента активности
# Проверяет: установлен ли агент, запущены ли процессы, работают ли задачи планировщика

Write-Host "🔍 Проверка статуса агента активности..." -ForegroundColor Cyan
Write-Host ""

# 1. Проверка пути к скрипту агента
Write-Host "📁 Поиск скрипта агента..." -ForegroundColor Yellow
$possiblePaths = @(
    "C:\Users\$env:USERNAME\web\pc-worktime\pc_activity_agent.ps1",
    "$env:USERPROFILE\web\pc-worktime\pc_activity_agent.ps1",
    "C:\pc-worktime\pc_activity_agent.ps1"
)

$scriptPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $scriptPath = (Resolve-Path $path).Path
        Write-Host "   ✅ Скрипт найден: $scriptPath" -ForegroundColor Green
        break
    }
}

if (-not $scriptPath) {
    Write-Host "   ❌ Скрипт не найден по путям:" -ForegroundColor Red
    foreach ($path in $possiblePaths) {
        Write-Host "      - $path" -ForegroundColor Gray
    }
}

# 2. Проверка задачи в планировщике
Write-Host "`n📋 Проверка задачи в планировщике..." -ForegroundColor Yellow
try {
    $task = Get-ScheduledTask -TaskName "PC_Activity_Agent" -ErrorAction Stop
    Write-Host "   ✅ Задача найдена: PC_Activity_Agent" -ForegroundColor Green
    
    Write-Host "   📊 Статус задачи: $($task.State)" -ForegroundColor $(if ($task.State -eq "Ready") { "Green" } else { "Yellow" })
    
    $taskInfo = Get-ScheduledTaskInfo -TaskName "PC_Activity_Agent"
    Write-Host "   📊 Последний запуск: $($taskInfo.LastRunTime)" -ForegroundColor Gray
    Write-Host "   📊 Следующий запуск: $($taskInfo.NextRunTime)" -ForegroundColor Gray
    Write-Host "   📊 Количество выполнений: $($taskInfo.NumberOfMissedRuns)" -ForegroundColor Gray
    Write-Host "   📊 Код результата последнего запуска: $($taskInfo.LastTaskResult)" -ForegroundColor $(if ($taskInfo.LastTaskResult -eq 0) { "Green" } else { "Red" })
    
    # Расшифровка кода ошибки
    if ($taskInfo.LastTaskResult -ne 0) {
        $errorCodes = @{
            267009 = "Задача не может быть запущена (проблема с триггером или конфигурацией)"
            2147942405 = "Отказано в доступе"
            2147942673 = "Указанный пользователь не существует"
            2147942674 = "Пароль пользователя неверен"
            2147942675 = "Учетная запись пользователя отключена"
            2147942676 = "Учетная запись пользователя истекла"
            2147942677 = "Пароль пользователя истек"
            2147942678 = "Учетная запись пользователя заблокирована"
            2147942679 = "Учетная запись пользователя не может использоваться"
            2147942680 = "Учетная запись пользователя не может использоваться в это время"
            2147942681 = "Учетная запись пользователя не может использоваться с этого компьютера"
            2147942682 = "Учетная запись пользователя не может использоваться для этого типа входа"
            2147942683 = "Учетная запись пользователя не может использоваться для этого типа входа"
            2147942684 = "Учетная запись пользователя не может использоваться для этого типа входа"
            2147942685 = "Учетная запись пользователя не может использоваться для этого типа входа"
            2147942686 = "Учетная запись пользователя не может использоваться для этого типа входа"
            2147942687 = "Учетная запись пользователя не может использоваться для этого типа входа"
            2147942688 = "Учетная запись пользователя не может использоваться для этого типа входа"
            2147942689 = "Учетная запись пользователя не может использоваться для этого типа входа"
            2147942690 = "Учетная запись пользователя не может использоваться для этого типа входа"
        }
        $errorMsg = if ($errorCodes.ContainsKey($taskInfo.LastTaskResult)) { 
            $errorCodes[$taskInfo.LastTaskResult] 
        } else { 
            "Неизвестная ошибка (код: $($taskInfo.LastTaskResult))" 
        }
        Write-Host "   ⚠️  Ошибка: $errorMsg" -ForegroundColor Red
    }
    
    $taskActions = $task.Actions
    Write-Host "   📊 Команда запуска:" -ForegroundColor Gray
    Write-Host "      $($taskActions.Execute) $($taskActions.Arguments)" -ForegroundColor Gray
    
    $taskTriggers = $task.Triggers
    Write-Host "   📊 Триггеры:" -ForegroundColor Gray
    foreach ($trigger in $taskTriggers) {
        Write-Host "      - $($trigger.CimClass.CimClassName): $($trigger.StartBoundary)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Задача не найдена в планировщике" -ForegroundColor Red
    Write-Host "      Создайте задачу с помощью setup_pc_worktime_tasks.ps1" -ForegroundColor Yellow
}

# 3. Проверка запущенных процессов
Write-Host "`n🔌 Проверка запущенных процессов..." -ForegroundColor Yellow
$processes = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*pc_activity_agent.ps1*" -or
    $_.CommandLine -like "*activity_agent*"
}

if ($processes) {
    Write-Host "   ✅ Найдено процессов агента: $($processes.Count)" -ForegroundColor Green
    foreach ($proc in $processes) {
        Write-Host "      - PID: $($proc.Id), Запущен: $($proc.StartTime)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  Процесс агента не запущен" -ForegroundColor Yellow
    Write-Host "      Агент должен запускаться автоматически при входе в систему" -ForegroundColor Gray
}

# 4. Проверка папок логов
Write-Host "`n📂 Проверка папок логов..." -ForegroundColor Yellow
$logsDir = "C:\pc-worktime\logs"
$screenshotsDir = "C:\pc-worktime\screenshots"

if (Test-Path $logsDir) {
    $logFiles = Get-ChildItem -Path $logsDir -File | Sort-Object LastWriteTime -Descending | Select-Object -First 5
    Write-Host "   ✅ Папка логов существует: $logsDir" -ForegroundColor Green
    Write-Host "   📊 Последние 5 файлов логов:" -ForegroundColor Gray
    foreach ($file in $logFiles) {
        $size = [math]::Round($file.Length / 1KB, 2)
        Write-Host "      - $($file.Name) ($size KB, изменен: $($file.LastWriteTime))" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  Папка логов не найдена: $logsDir" -ForegroundColor Yellow
    Write-Host "      Папка будет создана автоматически при первом запуске агента" -ForegroundColor Gray
}

if (Test-Path $screenshotsDir) {
    $screenshotFiles = Get-ChildItem -Path $screenshotsDir -File | Measure-Object
    Write-Host "   ✅ Папка скриншотов существует: $screenshotsDir" -ForegroundColor Green
    Write-Host "   📊 Количество скриншотов: $($screenshotFiles.Count)" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Папка скриншотов не найдена: $screenshotsDir" -ForegroundColor Yellow
}

# 5. Проверка подключения к серверу
Write-Host "`n🌐 Проверка подключения к серверу..." -ForegroundColor Yellow
$serverUrl = "http://35.232.108.72"
try {
    $response = Invoke-WebRequest -Uri "$serverUrl/api/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Сервер доступен: $serverUrl" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Не удалось подключиться к серверу: $serverUrl" -ForegroundColor Yellow
    Write-Host "      Ошибка: $($_.Exception.Message)" -ForegroundColor Gray
}

# 6. Проверка настроек в скрипте агента
if ($scriptPath) {
    Write-Host "`n⚙️  Проверка настроек в скрипте агента..." -ForegroundColor Yellow
    $scriptContent = Get-Content -Path $scriptPath -Raw
    if ($scriptContent -match '\$UserUsername\s*=\s*"([^"]+)"') {
        $username = $matches[1]
        Write-Host "   ✅ Найден логин пользователя: $username" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Не найден параметр `$UserUsername в скрипте" -ForegroundColor Yellow
    }
}

# Итоговая рекомендация
Write-Host "`n📋 Итоговая рекомендация:" -ForegroundColor Cyan
if (-not $scriptPath) {
    Write-Host "   ❌ Скрипт агента не найден. Скопируйте файлы на ПК." -ForegroundColor Red
} elseif (-not $task) {
    Write-Host "   ❌ Задача не создана. Запустите setup_pc_worktime_tasks.ps1 от имени администратора." -ForegroundColor Red
} elseif ($task.State -ne "Ready") {
    Write-Host "   ⚠️  Задача существует, но не включена. Включите задачу в планировщике задач." -ForegroundColor Yellow
} elseif (-not $processes) {
    Write-Host "   ⚠️  Задача создана, но процесс не запущен. Попробуйте:" -ForegroundColor Yellow
    Write-Host "      1. Перезагрузить ПК" -ForegroundColor Gray
    Write-Host "      2. Или запустить задачу вручную в планировщике задач" -ForegroundColor Gray
} else {
    Write-Host "   ✅ Все проверки пройдены! Агент работает корректно." -ForegroundColor Green
}

Write-Host "`nДля более подробной диагностики проверьте логи в папке: $logsDir" -ForegroundColor Gray

