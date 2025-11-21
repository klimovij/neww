param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("pc_on", "pc_off")]
    [string]$EventType
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ⚙️ НАСТРОЙКА ДЛЯ КОНКРЕТНОГО СОТРУДНИКА
# --------------------------------------
# ВАЖНО: здесь ИСПОЛЬЗУЕМ ТОЛЬКО ЛАТИНИЦУ (без русских букв),
# а красивое ФИО берём из таблицы users на сервере.

# Логин сотрудника (должен совпадать с полем users.username на сервере)
$UserUsername = "Ksendzik_Oleg"     # ← здесь ты для каждого ставишь свой логин: ivan_ivanov, petrov_petr и т.п.

# Необязательный внутренний код
$UserCode = "user-001"

# Адрес сервера и ключ (одинаковые для всех ПК)
$GOOGLE_SERVER_URL       = "http://35.232.108.72"
$REMOTE_WORKTIME_API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="

# --------------------------------------

if (-not $GOOGLE_SERVER_URL -or -not $REMOTE_WORKTIME_API_KEY) {
    Write-Host "❌ Не настроены GOOGLE_SERVER_URL или REMOTE_WORKTIME_API_KEY" -ForegroundColor Red
    exit 1
}

# Время события в ISO 8601
$eventTime = (Get-Date).ToString("o")  # пример: 2025-11-21T09:15:30.1234567+03:00

# Маппим технический тип на тип для отчёта
if ($EventType -eq 'pc_on') {
    $workEventType = 'login'
} else {
    $workEventType = 'logout'
}

# Один лог‑событие
$event = @{
    username   = $UserUsername       # в work_time_logs пойдёт ЛОГИН (ASCII)
    event_type = $workEventType      # login / logout
    event_time = $eventTime
    event_id   = $null               # даём серверу самому проставить 4624/4634
}

# Используем уже рабочий batch‑эндпоинт
$apiUrl = "$GOOGLE_SERVER_URL/api/remote-worktime-batch"

$headers = @{
    "X-API-Key"   = $REMOTE_WORKTIME_API_KEY
    "Content-Type" = "application/json; charset=utf-8"
}

# Логи — чтобы можно было потом посмотреть, что отправлялось
$logFile = Join-Path $PSScriptRoot "pc_worktime_log.txt"

try {
    $body = @{ events = @($event) } | ConvertTo-Json -Depth 5
    "[$((Get-Date).ToString("u"))] Sending $EventType ($workEventType) for $($event.username) : $body" | Out-File -FilePath $logFile -Append -Encoding UTF8

    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $body -TimeoutSec 15

    "[$((Get-Date).ToString("u"))] RESPONSE: $($response | ConvertTo-Json -Depth 5)" | Out-File -FilePath $logFile -Append -Encoding UTF8
}
catch {
    "[$((Get-Date).ToString("u"))] ERROR: $($_.Exception.Message)" | Out-File -FilePath $logFile -Append -Encoding UTF8
}

