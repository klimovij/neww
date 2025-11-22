# Обёртка для планировщика задач - отправка события выключения ПК
# Этот скрипт не требует параметров, его можно вызвать напрямую из планировщика

$ScriptPath = Join-Path $PSScriptRoot "pc_worktime_client.ps1"

if (-not (Test-Path $ScriptPath)) {
    Write-Host "❌ Скрипт $ScriptPath не найден!" -ForegroundColor Red
    exit 1
}

# Вызываем основной скрипт с параметром pc_off
& $ScriptPath -EventType "pc_off"

