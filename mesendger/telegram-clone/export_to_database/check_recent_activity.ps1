# Скрипт для проверки последних отправленных данных активности

$SERVER_URL = "http://35.232.108.72"
$API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="
$CONFIG_FILE = "$env:APPDATA\mesendger\agent_config.json"
$LOG_FILE = "$env:APPDATA\mesendger\activity.log"

Write-Host "`n=== ПРОВЕРКА ПОСЛЕДНИХ ДАННЫХ АКТИВНОСТИ ===" -ForegroundColor Cyan
Write-Host ""

# Получаем username
$username = $env:USERNAME
if (Test-Path $CONFIG_FILE) {
    try {
        $config = Get-Content $CONFIG_FILE -Raw | ConvertFrom-Json
        if ($config.username) {
            $username = $config.username.Trim()
        }
    } catch {
        # Игнорируем ошибки
    }
}

Write-Host "Username: $username" -ForegroundColor Yellow
Write-Host ""

# 1. Проверяем логи агента
Write-Host "1. Проверка логов агента..." -ForegroundColor Cyan
if (Test-Path $LOG_FILE) {
    Write-Host "   Лог-файл: $LOG_FILE" -ForegroundColor Gray
    
    # Получаем последние 20 строк
    $lastLines = Get-Content $LOG_FILE -Tail 20
    Write-Host "   Последние строки лога:" -ForegroundColor Gray
    Write-Host ""
    
    $recentSends = $lastLines | Where-Object { $_ -match "SUCCESS|Sending.*activity|imported" }
    
    if ($recentSends) {
        Write-Host "   Последние успешные отправки:" -ForegroundColor Green
        $recentSends | Select-Object -Last 5 | ForEach-Object {
            Write-Host "     $_" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "   Нет записей об успешной отправке в последних строках" -ForegroundColor Yellow
    }
    
    # Проверяем, когда последний раз была отправка
    $lastSuccess = $lastLines | Where-Object { $_ -match "SUCCESS.*imported" } | Select-Object -Last 1
    if ($lastSuccess) {
        Write-Host ""
        Write-Host "   Последняя успешная отправка:" -ForegroundColor Green
        Write-Host "     $lastSuccess" -ForegroundColor DarkGray
        
        # Извлекаем время
        if ($lastSuccess -match "(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})") {
            $lastTime = [DateTime]::Parse($matches[1])
            $now = Get-Date
            $diff = ($now - $lastTime).TotalMinutes
            Write-Host "     Время: $lastTime" -ForegroundColor DarkGray
            $color = if ($diff -lt 10) { "Green" } else { "Yellow" }
            Write-Host "     Прошло минут: $([Math]::Round($diff, 1))" -ForegroundColor $color
            
            if ($diff -gt 30) {
                Write-Host "     Последняя отправка была более 30 минут назад!" -ForegroundColor Yellow
            }
        }
    }
} else {
    Write-Host "   Лог-файл не найден: $LOG_FILE" -ForegroundColor Yellow
}

Write-Host ""

# 2. Отправляем тестовые данные
Write-Host "2. Отправка тестовых данных сейчас..." -ForegroundColor Cyan
$now = Get-Date
$timestamp = $now.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$testEvent = @{
    username = $username
    timestamp = $timestamp
    idleMinutes = 0
    procName = "powershell"
    windowTitle = "Test Recent Activity $(Get-Date -Format 'HH:mm:ss')"
    browserUrl = ""
}

$eventsArray = @($testEvent)
$jsonItems = @()
foreach ($item in $eventsArray) {
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
    
    Write-Host "   Тестовые данные отправлены успешно!" -ForegroundColor Green
    Write-Host "     Timestamp: $timestamp" -ForegroundColor Gray
    Write-Host "     Imported: $($response.imported)" -ForegroundColor Gray
} catch {
    Write-Host "   Ошибка отправки: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. Проверяем API сразу после отправки
Write-Host "3. Проверка API сразу после отправки..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

$today = (Get-Date).ToString("yyyy-MM-dd")
try {
    $url = "$SERVER_URL/api/activity-summary?start=$today&end=$today"
    $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 10 -ErrorAction Stop
    
    $userActivity = $response.summary | Where-Object { $_.username -eq $username }
    
    if ($userActivity) {
        Write-Host "   Данные найдены в API!" -ForegroundColor Green
        Write-Host "     Active: $($userActivity.totalActiveMinutes) мин" -ForegroundColor Gray
        Write-Host "     Idle: $($userActivity.totalIdleMinutes) мин" -ForegroundColor Gray
        
        # Проверяем, есть ли свежие данные
        if ($userActivity.totalActiveMinutes -gt 1074) {
            Write-Host "     Данные обновились! (было 1074, стало $($userActivity.totalActiveMinutes))" -ForegroundColor Green
        } else {
            Write-Host "     Данные не обновились (всё ещё $($userActivity.totalActiveMinutes))" -ForegroundColor Yellow
            Write-Host "     Возможно, данные ещё не обработаны или агент не отправляет" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   Данные не найдены в API" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Ошибка проверки API: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== ДИАГНОСТИКА ЗАВЕРШЕНА ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Рекомендации:" -ForegroundColor Yellow
Write-Host "1. Если агент не отправляет данные - проверьте, запущен ли он" -ForegroundColor Gray
Write-Host "2. Если данные не обновляются - проверьте логи сервера" -ForegroundColor Gray
Write-Host "3. Проверьте, что агент работает в режиме loop: .\send_activity.ps1 loop" -ForegroundColor Gray
