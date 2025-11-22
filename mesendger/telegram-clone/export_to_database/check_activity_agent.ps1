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

