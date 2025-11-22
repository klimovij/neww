# Скрипт для ручной отправки накопившихся данных активности на сервер
# Используется для тестирования и отправки данных, которые агент не смог отправить автоматически

$GOOGLE_SERVER_URL = "http://35.232.108.72"
$REMOTE_WORKTIME_API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="
$LogsDir = "C:\pc-worktime\logs"
$LogFile = Join-Path $LogsDir "activity_$(Get-Date -Format 'yyyy-MM-dd').jsonl"

Write-Host "🔍 Поиск ненаправленных данных активности..." -ForegroundColor Cyan

if (-not (Test-Path $LogFile)) {
    Write-Host "❌ Файл лога не найден: $LogFile" -ForegroundColor Red
    exit 1
}

# Читаем все события из файла
$allEvents = @()
try {
    $lines = Get-Content $LogFile -Encoding UTF8 -ErrorAction Stop
    foreach ($line in $lines) {
        if ($line.Trim()) {
            try {
                $event = $line | ConvertFrom-Json -ErrorAction Stop
                if ($event.sent -eq $false -or -not $event.sent) {
                    $allEvents += $event
                }
            } catch {
                Write-Host "⚠️  Ошибка парсинга строки: $($line.Substring(0, [Math]::Min(100, $line.Length)))" -ForegroundColor Yellow
            }
        }
    }
} catch {
    Write-Host "❌ Ошибка чтения файла лога: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "📊 Найдено ненаправленных событий: $($allEvents.Count)" -ForegroundColor $(if ($allEvents.Count -gt 0) { "Yellow" } else { "Green" })

if ($allEvents.Count -eq 0) {
    Write-Host "✅ Все события уже отправлены!" -ForegroundColor Green
    exit 0
}

# Отправляем на сервер
$apiUrl = "$GOOGLE_SERVER_URL/api/activity-log-batch"
$headers = @{
    "X-API-Key" = $REMOTE_WORKTIME_API_KEY
    "Content-Type" = "application/json; charset=utf-8"
}

# Преобразуем события в формат для отправки
$eventsToSend = @()
foreach ($event in $allEvents) {
    $cleanEvent = @{
        username = [string]$event.username
        timestamp = [string]$event.timestamp
        idleMinutes = [int]$event.idleMinutes
        procName = [string]$event.procName
        windowTitle = [string]$event.windowTitle
    }
    
    if ($event.browserUrl) {
        $cleanEvent.browserUrl = [string]$event.browserUrl
    }
    
    $eventsToSend += $cleanEvent
}

$body = $eventsToSend | ConvertTo-Json -Depth 10 -Compress

Write-Host "`n📤 Отправка $($eventsToSend.Count) событий на сервер..." -ForegroundColor Cyan
Write-Host "   URL: $apiUrl" -ForegroundColor Gray

try {
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $bodyBytes -ContentType "application/json; charset=utf-8" -TimeoutSec 30
    
    Write-Host "✅ Успешно отправлено!" -ForegroundColor Green
    Write-Host "   Импортировано: $($response.imported)" -ForegroundColor Green
    Write-Host "   Всего: $($response.total)" -ForegroundColor Green
    
    # Помечаем события как отправленные
    Write-Host "`n💾 Помечаем события как отправленные..." -ForegroundColor Cyan
    
    $lines = Get-Content $LogFile -Encoding UTF8 -Raw
    foreach ($event in $allEvents) {
        $eventJson = $event | ConvertTo-Json -Compress
        $eventJsonSent = $eventJson -replace '"sent"\s*:\s*false', '"sent":true' -replace '"sent"\s*:\s*$null', '"sent":true' -replace '"sent"\s*:\s*""', '"sent":true'
        
        if ($eventJsonSent -ne $eventJson) {
            $lines = $lines.Replace($eventJson, $eventJsonSent)
        }
    }
    
    $lines | Set-Content $LogFile -Encoding UTF8 -NoNewline
    Write-Host "✅ События помечены как отправленные!" -ForegroundColor Green
    
} catch {
    $errorMsg = $_.Exception.Message
    $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "N/A" }
    
    Write-Host "❌ Ошибка отправки:" -ForegroundColor Red
    Write-Host "   Status: $statusCode" -ForegroundColor Red
    Write-Host "   Error: $errorMsg" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    
    exit 1
}

