# Скрипт установки задачи планировщика для экспорта данных рабочего времени
# Запускается каждое утро в 7:00 и отправляет данные за вчерашний день

#Requires -RunAsAdministrator

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  УСТАНОВКА ЗАДАЧИ ЭКСПОРТА ДАННЫХ РАБОЧЕГО ВРЕМЕНИ" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

Write-Host "📂 Script location: $scriptRoot" -ForegroundColor White
Write-Host "👤 Current user: $currentUser" -ForegroundColor White
Write-Host ""

# Проверка наличия основного скрипта
$mainScript = Join-Path $scriptRoot "export_remote_worktime.ps1"
if (-not (Test-Path $mainScript)) {
    Write-Host "❌ Скрипт не найден: $mainScript" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Найден скрипт: export_remote_worktime.ps1" -ForegroundColor Green

# Проверка Node.js
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "❌ Node.js не установлен!" -ForegroundColor Red
    Write-Host "Скачайте и установите Node.js: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Node.js найден: $($nodePath.Source)" -ForegroundColor Green

# Проверка базы данных
$dbPath = Join-Path $scriptRoot "..\server\messenger.db"
if (-not (Test-Path $dbPath)) {
    $dbPath = Join-Path $scriptRoot "..\..\server\messenger.db"
}
if (-not (Test-Path $dbPath)) {
    Write-Host "⚠️ База данных не найдена (это нормально при первой установке)" -ForegroundColor Yellow
    Write-Host "Ожидаемый путь: $dbPath" -ForegroundColor Gray
} else {
    Write-Host "✅ База данных найдена: $dbPath" -ForegroundColor Green
}

# Проверка sqlite3 модуля
$serverDir = Join-Path $scriptRoot "..\server"
if (-not (Test-Path $serverDir)) {
    $serverDir = Join-Path $scriptRoot "..\..\server"
}
$sqlite3Path = Join-Path $serverDir "node_modules\sqlite3"
if (-not (Test-Path $sqlite3Path)) {
    Write-Host "⚠️ sqlite3 модуль не установлен" -ForegroundColor Yellow
    Write-Host "Устанавливаю sqlite3 модуль..." -ForegroundColor Cyan
    Push-Location $serverDir
    try {
        npm install sqlite3
        Write-Host "✅ sqlite3 модуль установлен" -ForegroundColor Green
    } catch {
        Write-Host "❌ Ошибка установки sqlite3: $_" -ForegroundColor Red
    }
    Pop-Location
} else {
    Write-Host "✅ sqlite3 модуль найден" -ForegroundColor Green
}

Write-Host ""
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "  НАСТРОЙКА ЗАДАЧИ ПЛАНИРОВЩИКА" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

# Имя задачи
$taskName = "Mesendger_Remote_Worktime_Export"

# Удаляем старую задачу если существует
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "🗑️ Удаляю старую задачу: $taskName" -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "✅ Старая задача удалена" -ForegroundColor Green
}

# Обновляем XML файл с правильными путями
$xmlPath = Join-Path $scriptRoot "Mesendger_Remote_Worktime_Export.xml"
$xmlContent = Get-Content $xmlPath -Raw -Encoding UTF8

# Заменяем плейсхолдеры
$xmlContent = $xmlContent -replace 'PLACEHOLDER_USERNAME', $currentUser
$xmlContent = $xmlContent -replace 'PLACEHOLDER_SCRIPT_PATH', $scriptRoot

# Сохраняем обновленный XML во временный файл
$tempXmlPath = [System.IO.Path]::GetTempFileName() + ".xml"
$xmlContent | Out-File -FilePath $tempXmlPath -Encoding UTF8

# Создаем задачу из XML
Write-Host "📝 Создаю задачу: $taskName" -ForegroundColor Cyan
try {
    Register-ScheduledTask -Xml (Get-Content $tempXmlPath -Raw) -TaskName $taskName -Force | Out-Null
    Write-Host "✅ Задача создана успешно!" -ForegroundColor Green
    
    # Проверяем созданную задачу
    $task = Get-ScheduledTask -TaskName $taskName
    $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
    
    Write-Host ""
    Write-Host "📋 Информация о задаче:" -ForegroundColor Cyan
    Write-Host "  Имя: $($task.TaskName)" -ForegroundColor White
    Write-Host "  Состояние: $($task.State)" -ForegroundColor White
    Write-Host "  Расписание: Каждый день в 7:00" -ForegroundColor White
    Write-Host "  Последний запуск: $($taskInfo.LastRunTime)" -ForegroundColor White
    Write-Host "  Следующий запуск: $($taskInfo.NextRunTime)" -ForegroundColor White
    Write-Host "  Скрипт: $mainScript" -ForegroundColor White
} catch {
    Write-Host "❌ Ошибка создания задачи: $_" -ForegroundColor Red
    Remove-Item $tempXmlPath -ErrorAction SilentlyContinue
    Read-Host "Press Enter to exit"
    exit 1
}

# Удаляем временный XML
Remove-Item $tempXmlPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ УСТАНОВКА ЗАВЕРШЕНА!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📅 Задача будет запускаться каждое утро в 7:00" -ForegroundColor Cyan
Write-Host "📊 Отправляет данные за вчерашний день" -ForegroundColor Cyan
Write-Host ""
Write-Host "🧪 ТЕСТИРОВАНИЕ:" -ForegroundColor Yellow
Write-Host "Для проверки работы скрипта вручную выполните:" -ForegroundColor White
Write-Host "  cd `"$scriptRoot`"" -ForegroundColor Gray
Write-Host "  .\export_remote_worktime.ps1 -Date 2025-12-01" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 УПРАВЛЕНИЕ ЗАДАЧЕЙ:" -ForegroundColor Yellow
Write-Host "  Открыть планировщик: taskschd.msc" -ForegroundColor Gray
Write-Host "  Найти задачу: $taskName" -ForegroundColor Gray
Write-Host "  Запустить вручную: правая кнопка → Выполнить" -ForegroundColor Gray
Write-Host ""

Read-Host "Нажмите Enter для завершения"

