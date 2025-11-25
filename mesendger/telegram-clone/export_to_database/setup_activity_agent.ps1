# Установщик агента отслеживания активности
# Устанавливает send_activity.ps1 в планировщике задач Windows для автозапуска при входе в систему

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Для установки требуются права администратора!" -ForegroundColor Yellow
    Write-Host "Запустите PowerShell от имени администратора и повторите установку." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Нажмите любую клавишу для выхода..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  УСТАНОВКА АГЕНТА ОТСЛЕЖИВАНИЯ АКТИВНОСТИ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Пути
$AGENT_DIR = "$env:APPDATA\mesendger"
$SCRIPT_NAME = "send_activity.ps1"
$TARGET_SCRIPT = Join-Path $AGENT_DIR $SCRIPT_NAME
$TASK_NAME = "MesendgerActivityAgent"
$CURRENT_SCRIPT = $MyInvocation.MyCommand.Path
$CURRENT_DIR = Split-Path -Parent $CURRENT_SCRIPT
$SOURCE_SCRIPT = Join-Path $CURRENT_DIR $SCRIPT_NAME

# Проверяем существование исходного скрипта
if (-not (Test-Path $SOURCE_SCRIPT)) {
    Write-Host "❌ Ошибка: Не найден файл $SOURCE_SCRIPT" -ForegroundColor Red
    Write-Host "Убедитесь, что скрипт send_activity.ps1 находится в той же папке, что и установщик." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Нажмите любую клавишу для выхода..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "📁 Создание директории для агента..." -ForegroundColor Cyan
if (-not (Test-Path $AGENT_DIR)) {
    New-Item -ItemType Directory -Path $AGENT_DIR -Force | Out-Null
    Write-Host "✅ Директория создана: $AGENT_DIR" -ForegroundColor Green
} else {
    Write-Host "✅ Директория уже существует: $AGENT_DIR" -ForegroundColor Green
}

Write-Host ""
Write-Host "📄 Копирование скрипта агента..." -ForegroundColor Cyan

# Читаем исходный скрипт
$scriptContent = Get-Content $SOURCE_SCRIPT -Raw -Encoding UTF8

# Сохраняем в UTF-8 с BOM (спецификацией)
$utf8WithBom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($TARGET_SCRIPT, $scriptContent, $utf8WithBom)

Write-Host "✅ Скрипт скопирован и сохранен в UTF-8 с BOM: $TARGET_SCRIPT" -ForegroundColor Green

Write-Host ""
Write-Host "🔧 Настройка планировщика задач..." -ForegroundColor Cyan

# Удаляем существующую задачу, если есть
try {
    $existingTask = Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "⚠️  Найдена существующая задача. Удаляем..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
} catch {
    # Игнорируем ошибки при удалении
}

# Создаём действие задачи (запуск PowerShell скрипта скрыто)
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$TARGET_SCRIPT`" loop" `
    -WorkingDirectory $AGENT_DIR

# Триггер: при входе в систему
$trigger = New-ScheduledTaskTrigger -AtLogOn

# Настройки задачи
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -DontStopOnIdleEnd `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -MultipleInstances IgnoreNew

# Принцип запуска: от имени текущего пользователя (высокий приоритет для скрытого запуска)
$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Highest

# Описание задачи
$description = "Автоматический запуск агента отслеживания активности Mesendger при входе в систему. Отслеживает активность пользователя и отправляет данные на сервер."

# Регистрируем задачу
try {
    Register-ScheduledTask `
        -TaskName $TASK_NAME `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description $description `
        -Force | Out-Null

    Write-Host "✅ Задача создана в планировщике задач Windows" -ForegroundColor Green
    Write-Host "   Имя задачи: $TASK_NAME" -ForegroundColor Gray
} catch {
    Write-Host "❌ Ошибка при создании задачи: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Нажмите любую клавишу для выхода..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "🚀 Запуск агента для проверки..." -ForegroundColor Cyan

# Запускаем задачу сразу для проверки (но скрыто)
try {
    Start-ScheduledTask -TaskName $TASK_NAME -ErrorAction Stop
    Write-Host "✅ Агент запущен в фоновом режиме" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Не удалось запустить задачу автоматически: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   Агент запустится автоматически при следующем входе в систему." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ УСТАНОВКА ЗАВЕРШЕНА УСПЕШНО!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Что было сделано:" -ForegroundColor Cyan
Write-Host "  ✅ Скрипт агента скопирован в: $TARGET_SCRIPT" -ForegroundColor Gray
Write-Host "  ✅ Задача создана в планировщике задач: $TASK_NAME" -ForegroundColor Gray
Write-Host "  ✅ Агент будет запускаться автоматически при входе в систему" -ForegroundColor Gray
Write-Host "  ✅ Агент работает в скрытом режиме (без окон)" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Логи агента: $env:APPDATA\mesendger\activity.log" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔧 Управление задачей:" -ForegroundColor Cyan
Write-Host "  • Просмотр: Запустите Планировщик задач Windows → Задачи → $TASK_NAME" -ForegroundColor Gray
Write-Host "  • Остановка: Disable-ScheduledTask -TaskName `"$TASK_NAME`"" -ForegroundColor Gray
Write-Host "  • Удаление: Unregister-ScheduledTask -TaskName `"$TASK_NAME`" -Confirm:`$false" -ForegroundColor Gray
Write-Host ""
Write-Host "Нажмите любую клавишу для выхода..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
