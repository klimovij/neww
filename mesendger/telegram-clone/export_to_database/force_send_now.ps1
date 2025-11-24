# Скрипт для принудительной отправки данных активности прямо сейчас
# Не ждёт накопления 5 записей, отправляет сразу

$SERVER_URL = "http://35.232.108.72"
$API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="
$CONFIG_FILE = "$env:APPDATA\mesendger\agent_config.json"

Write-Host "`n=== ПРИНУДИТЕЛЬНАЯ ОТПРАВКА ДАННЫХ АКТИВНОСТИ ===" -ForegroundColor Cyan
Write-Host ""

# Получаем username
$username = $env:USERNAME
if (Test-Path $CONFIG_FILE) {
    try {
        $config = Get-Content $CONFIG_FILE -Raw | ConvertFrom-Json
        if ($config.username) {
            $username = $config.username.Trim()
        }
    } catch {}
}

Write-Host "Username: $username" -ForegroundColor Yellow
Write-Host ""

# Импортируем функцию Collect-Activity из send_activity.ps1
$scriptPath = Join-Path $PSScriptRoot "send_activity.ps1"
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Файл send_activity.ps1 не найден: $scriptPath" -ForegroundColor Red
    exit 1
}

# Загружаем функции из send_activity.ps1
. $scriptPath

Write-Host "1. Сбор данных активности..." -ForegroundColor Cyan

# Собираем данные несколько раз подряд
$activities = @()
for ($i = 0; $i -lt 5; $i++) {
    $activity = Collect-Activity -Username $username
    if ($activity) {
        $activities += $activity
        Write-Host "   ✅ Собрано: $($activity.procName) - $($activity.windowTitle)" -ForegroundColor Green
    }
    Start-Sleep -Milliseconds 500
}

if ($activities.Count -eq 0) {
    Write-Host "   ❌ Не удалось собрать данные активности" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Отправка $($activities.Count) записей на сервер..." -ForegroundColor Cyan

# Формируем JSON
$jsonItems = @()
foreach ($item in $activities) {
    $itemJson = $item | ConvertTo-Json -Depth 10 -Compress
    $jsonItems += $itemJson
}
$jsonData = "[$($jsonItems -join ',')]"

$url = "$SERVER_URL/api/activity-log-batch"
$headers = @{
    "X-API-Key" = $API_KEY
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $jsonData -TimeoutSec 10 -ErrorAction Stop
    
    Write-Host "   ✅ Данные отправлены успешно!" -ForegroundColor Green
    Write-Host "     Imported: $($response.imported)" -ForegroundColor Gray
    Write-Host "     Total: $($response.total)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Ошибка отправки: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3. Проверка обновления в API..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

$today = (Get-Date).ToString("yyyy-MM-dd")
try {
    $url = "$SERVER_URL/api/activity-summary?start=$today&end=$today"
    $apiResponse = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 10 -ErrorAction Stop
    
    $userActivity = $apiResponse.summary | Where-Object { $_.username -eq $username }
    
    if ($userActivity) {
        Write-Host "   ✅ Данные обновились в API!" -ForegroundColor Green
        Write-Host "     Active: $($userActivity.totalActiveMinutes) мин" -ForegroundColor Gray
        Write-Host "     Idle: $($userActivity.totalIdleMinutes) мин" -ForegroundColor Gray
        Write-Host "`n   ✅ Обновите страницу в браузере и проверьте модалку!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Данные не найдены в API" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️ Ошибка проверки API: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== ОТПРАВКА ЗАВЕРШЕНА ===" -ForegroundColor Cyan

