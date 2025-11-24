# Скрипт отправки данных о выключении ПК (выход пользователя)
# Совместим с PowerShell 5.1 и ниже
# Использование: .\send_pc_shutdown.ps1 [username]
# Если username не указан, будет прочитан из конфига или запрошен

# Конфигурация
$SERVER_URL = "http://35.232.108.72"
$API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="
$LOG_FILE = "$env:APPDATA\mesendger\pc_shutdown.log"
$CONFIG_FILE = "$env:APPDATA\mesendger\agent_config.json"

# Создаём директории
$logDir = Split-Path -Parent $LOG_FILE
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Функция логирования (определяем первой, т.к. используется в других функциях)
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "$timestamp - $Message"
    Write-Host $logMessage
    $logMessage | Out-File -FilePath $LOG_FILE -Append -Encoding UTF8
}

# Функция получения username сотрудника
function Get-Username {
    param([array]$ScriptArgs)
    
    # Проверяем аргументы командной строки
    if ($ScriptArgs -and $ScriptArgs.Count -gt 0 -and $ScriptArgs[0]) {
        $username = $ScriptArgs[0].Trim()
        if ($username) {
            return $username
        }
    }
    
    # Проверяем конфигурационный файл
    if (Test-Path $CONFIG_FILE) {
        try {
            $config = Get-Content $CONFIG_FILE -Raw | ConvertFrom-Json
            if ($config.username) {
                return $config.username.Trim()
            }
        } catch {
            Write-Log "Error reading config file: $($_.Exception.Message)"
        }
    }
    
    # Запрашиваем у пользователя
    Write-Host ""
    Write-Host "Введите username сотрудника (например: Ksendzik_Oleg):" -ForegroundColor Yellow
    $username = Read-Host
    
    if ([string]::IsNullOrWhiteSpace($username)) {
        Write-Log "Username не указан, используем имя текущего пользователя: $env:USERNAME"
        $username = $env:USERNAME
    }
    
    # Сохраняем в конфигурационный файл
    try {
        $config = @{ username = $username.Trim() } | ConvertTo-Json
        $config | Out-File -FilePath $CONFIG_FILE -Encoding UTF8 -Force
        Write-Log "Username сохранён в конфигурационный файл: $username"
    } catch {
        Write-Log "Error saving config file: $($_.Exception.Message)"
    }
    
    return $username.Trim()
}

# Функция логирования
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "$timestamp - $Message"
    Write-Host $logMessage
    $logMessage | Out-File -FilePath $LOG_FILE -Append -Encoding UTF8
}

try {
    Write-Log "=== PC SHUTDOWN SCRIPT STARTED ==="
    Write-Log "PowerShell version: $($PSVersionTable.PSVersion)"
    
    # Получаем username сотрудника (из параметров, конфига или запроса)
    $username = Get-Username $args
    Write-Log "Username: $username (будет отображаться ФИО из базы на сервере)"
    
    # Получаем текущее время в UTC
    $now = Get-Date
    $eventTime = $now.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    Write-Log "Event time: $eventTime"
    
    # Формируем данные для отправки (сервер ожидает массив событий или { events: [...] })
    $eventData = @{
        username = $username
        event_type = "logout"
        event_time = $eventTime
    }
    
    # Обертываем в массив, так как сервер ожидает массив событий
    # В PowerShell 5.1 нужно явно создать массив и использовать правильный синтаксис
    $eventsArray = New-Object System.Collections.ArrayList
    [void]$eventsArray.Add($eventData)
    
    Write-Log "Events array count: $($eventsArray.Count)"
    
    # Преобразуем в JSON с явным указанием, что это массив
    $jsonData = $eventsArray | ConvertTo-Json -Depth 10
    Write-Log "JSON data: $jsonData"
    
    # Проверяем, что JSON начинается с '['
    $trimmedJson = $jsonData.TrimStart()
    if ($trimmedJson.StartsWith('[')) {
        Write-Log "✅ JSON is array format (correct)"
    } else {
        Write-Log "❌ WARNING: JSON is NOT array format, wrapping manually..."
        # Если всё равно не массив, обернём вручную
        $jsonData = "[$jsonData]"
        Write-Log "JSON data (after manual wrap): $jsonData"
    }
    
    # Подготавливаем заголовки
    $headers = @{
        "X-API-Key" = $API_KEY
        "Content-Type" = "application/json"
    }
    
    # URL для отправки
    $url = "$SERVER_URL/api/remote-worktime-batch"
    Write-Log "Sending to: $url"
    
    # Отправляем данные (с меньшим таймаутом для shutdown)
    try {
        $response = Invoke-RestMethod -Uri $url `
            -Method POST `
            -Headers $headers `
            -Body $jsonData `
            -TimeoutSec 5 `
            -ErrorAction Stop
        
        if ($response) {
            $responseJson = $response | ConvertTo-Json -Compress
            Write-Log "✅ SUCCESS: $responseJson"
        } else {
            Write-Log "✅ SUCCESS: Empty response (but OK)"
        }
        Write-Log "=== PC SHUTDOWN SCRIPT COMPLETED SUCCESSFULLY ==="
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Log "❌ ERROR: $errorMsg"
        
        # Пытаемся получить детали ошибки
        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Log "Response body: $responseBody"
                $reader.Close()
            } catch {
                Write-Log "Could not read error response"
            }
        }
        
        Write-Log "=== PC SHUTDOWN SCRIPT FAILED ==="
        exit 1
    }
    
} catch {
    Write-Log "❌ FATAL ERROR: $($_.Exception.Message)"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    Write-Log "=== PC SHUTDOWN SCRIPT FAILED ==="
    exit 1
}

