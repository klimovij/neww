# Скрипт импорта задач из XML файлов в планировщик задач
# Использование: .\import_tasks_from_xml.ps1
# Требует прав администратора

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ОШИБКА: Скрипт требует прав администратора!" -ForegroundColor Red
    Write-Host "Запустите PowerShell от имени администратора и повторите попытку." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$startupXml = Join-Path $scriptDir "Mesendger_PC_Startup_Monitor.xml"
$shutdownXml = Join-Path $scriptDir "Mesendger_PC_Shutdown_Monitor.xml"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Импорт задач в планировщик задач" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Проверяем существование XML файлов
if (-not (Test-Path $startupXml)) {
    Write-Host "❌ ОШИБКА: XML файл не найден: $startupXml" -ForegroundColor Red
    Write-Host "   Сначала запустите create_startup_task_xml.ps1 для создания XML файла" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path $shutdownXml)) {
    Write-Host "❌ ОШИБКА: XML файл не найден: $shutdownXml" -ForegroundColor Red
    Write-Host "   Сначала запустите create_shutdown_task_xml.ps1 для создания XML файла" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Имена задач
$startupTaskName = "Mesendger_PC_Startup_Monitor"
$shutdownTaskName = "Mesendger_PC_Shutdown_Monitor"

# Удаляем существующие задачи
Write-Host "Удаление существующих задач (если есть)..." -ForegroundColor Yellow

$startupCheck = schtasks /Query /TN $startupTaskName /FO CSV 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Удаление задачи: $startupTaskName" -ForegroundColor Gray
    schtasks /Delete /TN $startupTaskName /F 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Задача $startupTaskName удалена" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Не удалось удалить задачу $startupTaskName" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✅ Задача $startupTaskName не существует" -ForegroundColor Gray
}

$shutdownCheck = schtasks /Query /TN $shutdownTaskName /FO CSV 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Удаление задачи: $shutdownTaskName" -ForegroundColor Gray
    schtasks /Delete /TN $shutdownTaskName /F 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Задача $shutdownTaskName удалена" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Не удалось удалить задачу $shutdownTaskName" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✅ Задача $shutdownTaskName не существует" -ForegroundColor Gray
}

Write-Host "`nИмпорт задач из XML файлов..." -ForegroundColor Cyan

# Импортируем задачу включения
Write-Host "`nИмпорт задачи включения ПК..." -ForegroundColor Yellow
Write-Host "   XML файл: $startupXml" -ForegroundColor Gray
$result = schtasks /Create /TN $startupTaskName /XML $startupXml /F 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Задача '$startupTaskName' успешно импортирована!" -ForegroundColor Green
    
    # Проверяем
    $check = schtasks /Query /TN $startupTaskName /FO CSV 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Задача найдена в планировщике" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Ошибка импорта: $result" -ForegroundColor Red
}

# Импортируем задачу выключения
Write-Host "`nИмпорт задачи выключения ПК..." -ForegroundColor Yellow
Write-Host "   XML файл: $shutdownXml" -ForegroundColor Gray
$result = schtasks /Create /TN $shutdownTaskName /XML $shutdownXml /F 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Задача '$shutdownTaskName' успешно импортирована!" -ForegroundColor Green
    
    # Проверяем
    $check = schtasks /Query /TN $shutdownTaskName /FO CSV 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Задача найдена в планировщике" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Ошибка импорта: $result" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Импорт завершен!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Проверка задач:" -ForegroundColor Yellow
Write-Host "  schtasks /Query /TN $startupTaskName" -ForegroundColor Gray
Write-Host "  schtasks /Query /TN $shutdownTaskName" -ForegroundColor Gray

Write-Host "`n💡 Проверьте задачи в планировщике задач (taskschd.msc):" -ForegroundColor Yellow
Write-Host "   - Mesendger_PC_Startup_Monitor - триггер: При запуске системы" -ForegroundColor Gray
Write-Host "   - Mesendger_PC_Shutdown_Monitor - триггер: При событии (System, User32, 1074)" -ForegroundColor Gray

Write-Host "`n✅ Готово! Задачи импортированы и готовы к работе.`n" -ForegroundColor Green
Read-Host "Press Enter to exit"

