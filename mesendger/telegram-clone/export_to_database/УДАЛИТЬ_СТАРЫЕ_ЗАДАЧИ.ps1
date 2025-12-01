# Скрипт полного удаления старых задач и файлов мониторинга ПК
# Использовать ПЕРЕД установкой новой версии
# Требует прав администратора

Write-Host "`n========================================" -ForegroundColor Red
Write-Host "Удаление старых задач мониторинга ПК" -ForegroundColor Red
Write-Host "========================================`n" -ForegroundColor Red

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ОШИБКА: Скрипт требует прав администратора!" -ForegroundColor Red
    Write-Host "Запустите PowerShell от имени администратора." -ForegroundColor Yellow
    Read-Host "`nPress Enter to exit"
    exit 1
}

Write-Host "✅ Права администратора подтверждены`n" -ForegroundColor Green

# Список задач для удаления
$tasks = @(
    "Mesendger_PC_Startup_Monitor",
    "Mesendger_PC_Shutdown_Monitor",
    "Mesendger_PC_Activity_Monitor",
    "Mesendger_PC_Logoff_Monitor",
    "Mesendger_PC_Shutdown_Monitor_Background"
)

Write-Host "Удаление задач из планировщика...`n" -ForegroundColor Yellow

$deletedCount = 0
$notFoundCount = 0

foreach ($taskName in $tasks) {
    Write-Host "Проверка задачи: $taskName" -ForegroundColor Cyan
    
    # Проверяем существование задачи
    $taskExists = schtasks /Query /TN $taskName 2>&1 | Select-String -Pattern $taskName -Quiet
    
    if ($taskExists) {
        # Задача существует, удаляем
        $result = schtasks /Delete /TN $taskName /F 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Удалена: $taskName" -ForegroundColor Green
            $deletedCount++
        } else {
            Write-Host "  ⚠️ Ошибка удаления: $taskName" -ForegroundColor Yellow
            Write-Host "     $result" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⏭️ Не найдена (пропускаем): $taskName" -ForegroundColor Gray
        $notFoundCount++
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Удалено задач: $deletedCount" -ForegroundColor $(if ($deletedCount -gt 0) { "Green" } else { "Gray" })
Write-Host "Не найдено: $notFoundCount" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Cyan

# Спрашиваем про удаление файлов
Write-Host "Удалить файлы из C:\pc-worktime\ ?" -ForegroundColor Yellow
Write-Host "  [Y] Да - удалить все файлы (рекомендуется)" -ForegroundColor White
Write-Host "  [N] Нет - оставить файлы (будут перезаписаны при новой установке)" -ForegroundColor Gray
Write-Host ""
$deleteFiles = Read-Host "Ваш выбор (Y/N)"

if ($deleteFiles -eq "Y" -or $deleteFiles -eq "y" -or $deleteFiles -eq "Д" -or $deleteFiles -eq "д") {
    Write-Host "`nУдаление файлов из C:\pc-worktime\..." -ForegroundColor Yellow
    
    if (Test-Path "C:\pc-worktime") {
        try {
            Remove-Item -Path "C:\pc-worktime" -Recurse -Force -ErrorAction Stop
            Write-Host "✅ Папка C:\pc-worktime\ удалена" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ Ошибка удаления папки: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "   Возможно, некоторые файлы используются. Попробуйте перезагрузить ПК." -ForegroundColor Gray
        }
    } else {
        Write-Host "⏭️ Папка C:\pc-worktime\ не найдена" -ForegroundColor Gray
    }
} else {
    Write-Host "`n⏭️ Файлы в C:\pc-worktime\ оставлены без изменений" -ForegroundColor Gray
}

# Спрашиваем про удаление конфигов и логов
Write-Host "`nУдалить настройки и логи из %APPDATA%\mesendger\ ?" -ForegroundColor Yellow
Write-Host "  [Y] Да - удалить все (username придется вводить заново)" -ForegroundColor White
Write-Host "  [N] Нет - сохранить настройки (рекомендуется)" -ForegroundColor Green
Write-Host ""
$deleteConfig = Read-Host "Ваш выбор (Y/N)"

if ($deleteConfig -eq "Y" -or $deleteConfig -eq "y" -or $deleteConfig -eq "Д" -or $deleteConfig -eq "д") {
    Write-Host "`nУдаление настроек и логов..." -ForegroundColor Yellow
    
    $appdataPath = "$env:APPDATA\mesendger"
    if (Test-Path $appdataPath) {
        try {
            Remove-Item -Path $appdataPath -Recurse -Force -ErrorAction Stop
            Write-Host "✅ Папка $appdataPath удалена" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ Ошибка удаления папки: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⏭️ Папка $appdataPath не найдена" -ForegroundColor Gray
    }
} else {
    Write-Host "`n✅ Настройки и логи сохранены (username не придется вводить заново)" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Удаление завершено!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

if ($deletedCount -gt 0) {
    Write-Host "✅ Старые задачи успешно удалены" -ForegroundColor Green
    Write-Host "   Теперь можно запустить установку новой версии:" -ForegroundColor White
    Write-Host "   .\setup_pc_monitoring.ps1" -ForegroundColor Cyan
} else {
    Write-Host "ℹ️ Задачи не были найдены (возможно, уже удалены)" -ForegroundColor Yellow
    Write-Host "   Можно сразу запустить установку:" -ForegroundColor White
    Write-Host "   .\setup_pc_monitoring.ps1" -ForegroundColor Cyan
}

Write-Host ""
Read-Host "Press Enter to exit"

