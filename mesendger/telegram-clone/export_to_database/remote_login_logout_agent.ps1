# Скрытый агент для отправки данных о входе/выходе
# Запускается скрыто через Task Scheduler

# Конфигурация
$GOOGLE_SERVER_URL = "http://35.232.108.72"
$REMOTE_WORKTIME_API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="
$LOG_FILE = "$env:APPDATA\mesendger\remote_worktime.log"

# Создаём директорию для логов
$logDir = Split-Path -Parent $LOG_FILE
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -FilePath $LOG_FILE -Append -Encoding UTF8
}

function Send-LoginLogout {
    param([string]$EventType)
    
    try {
        $username = $env:USERNAME
        $now = Get-Date
        $eventTime = $now.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        
        $data = @{
            username = $username
            event_type = $EventType
            event_time = $eventTime
        } | ConvertTo-Json
        
        Write-Log "Sending $EventType for user $username"
        
        $headers = @{
            "X-API-Key" = $REMOTE_WORKTIME_API_KEY
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "$GOOGLE_SERVER_URL/api/remote-worktime-batch" `
            -Method POST `
            -Headers $headers `
            -Body $data `
            -TimeoutSec 10 `
            -ErrorAction Stop
        
        if ($response) {
            $responseJson = $response | ConvertTo-Json -Compress
            Write-Log "Success: $responseJson"
        } else {
            Write-Log "Success: Empty response"
        }
        return $true
    } catch {
        $errorMsg = $_.Exception.Message
        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                $errorMsg = "$errorMsg - Response: $responseBody"
            } catch {
                # Игнорируем ошибки чтения ответа
            }
        }
        Write-Log "Error: $errorMsg"
        return $false
    }
}

# Главная функция
try {
    Write-Log "Script started (PowerShell $($PSVersionTable.PSVersion.Major).$($PSVersionTable.PSVersion.Minor))"
    
    # Определяем тип события (login или logout)
    $eventType = "login"
    
    # Проверяем, если скрипт запущен при выходе из системы
    if ($args -and $args.Count -gt 0) {
        foreach ($arg in $args) {
            if ($arg -eq "logout") {
                $eventType = "logout"
                break
            }
        }
    }
    
    Write-Log "Event type: $eventType"
    Send-LoginLogout -EventType $eventType
    
} catch {
    Write-Log "Fatal error: $($_.Exception.Message)"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
}

