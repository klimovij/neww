# Скрипт переустановки: удаление старых задач + установка новых
# Использовать для обновления на уже настроенных ПК
# Требует прав администратора

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Переустановка мониторинга ПК" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ОШИБКА: Скрипт требует прав администратора!" -ForegroundColor Red
    Write-Host "Запустите PowerShell от имени администратора." -ForegroundColor Yellow
    Read-Host "`nPress Enter to exit"
    exit 1
}

Write-Host "✅ Права администратора подтверждены`n" -ForegroundColor Green

# =============================================
# ШАГ 1: УДАЛЕНИЕ СТАРЫХ ЗАДАЧ
# =============================================

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "ШАГ 1/2: Удаление старых задач" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Yellow

$tasks = @(
    "Mesendger_PC_Startup_Monitor",
    "Mesendger_PC_Activity_Monitor",
    # Старые задачи выключения (удаляем, т.к. больше не нужны)
    "Mesendger_PC_Shutdown_Monitor",
    "Mesendger_PC_Logoff_Monitor",
    "Mesendger_PC_Shutdown_Monitor_Background"
)

$deletedCount = 0

foreach ($taskName in $tasks) {
    $taskExists = schtasks /Query /TN $taskName 2>&1 | Select-String -Pattern $taskName -Quiet
    
    if ($taskExists) {
        Write-Host "Удаление: $taskName..." -ForegroundColor Cyan
        $result = schtasks /Delete /TN $taskName /F 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Удалена" -ForegroundColor Green
            $deletedCount++
        } else {
            Write-Host "  ⚠️ Ошибка удаления" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n✅ Удалено старых задач: $deletedCount" -ForegroundColor Green

# Проверяем существование конфига (чтобы не запрашивать username заново)
$configFile = "$env:APPDATA\mesendger\agent_config.json"
$hasConfig = Test-Path $configFile
$savedUsername = $null

if ($hasConfig) {
    try {
        $config = Get-Content $configFile -Raw | ConvertFrom-Json
        if ($config.username) {
            $savedUsername = $config.username
            Write-Host "✅ Найден сохраненный username: $savedUsername" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ Не удалось прочитать сохраненный username" -ForegroundColor Yellow
    }
}

# =============================================
# ШАГ 2: УСТАНОВКА НОВОЙ ВЕРСИИ
# =============================================

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "ШАГ 2/2: Установка новой версии" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Yellow

Write-Host "Запуск установки...`n" -ForegroundColor Cyan

# Получаем путь к текущей папке со скриптами
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Проверяем наличие setup_pc_monitoring.ps1
$setupScript = Join-Path $scriptDir "setup_pc_monitoring.ps1"

if (Test-Path $setupScript) {
    # Если есть сохраненный username, передаем его как параметр
    if ($savedUsername) {
        Write-Host "Используется сохраненный username: $savedUsername" -ForegroundColor Green
        Write-Host "Если нужно изменить username, прервите установку (Ctrl+C) и запустите setup_pc_monitoring.ps1 вручную`n" -ForegroundColor Gray
        
        # Пауза 3 секунды для возможности прервать
        Start-Sleep -Seconds 3
    }
    
    # Запускаем установку
    & $setupScript
    
    if ($LASTEXITCODE -eq 0 -or -not $LASTEXITCODE) {
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "Переустановка завершена успешно!" -ForegroundColor Green
        Write-Host "========================================`n" -ForegroundColor Green
    } else {
        Write-Host "`n========================================" -ForegroundColor Red
        Write-Host "Ошибка при установке!" -ForegroundColor Red
        Write-Host "========================================`n" -ForegroundColor Red
    }
} else {
    Write-Host "❌ ОШИБКА: Файл setup_pc_monitoring.ps1 не найден!" -ForegroundColor Red
    Write-Host "   Ожидается в папке: $scriptDir" -ForegroundColor Yellow
    Write-Host "`nУбедитесь, что вы запускаете скрипт из папки export_to_database" -ForegroundColor Yellow
    Read-Host "`nPress Enter to exit"
    exit 1
}

