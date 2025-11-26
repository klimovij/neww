# Скрипт отправки данных о запуске ПК (вход пользователя)
# Совместим с PowerShell 5.1 и ниже
# Использование: .\send_pc_startup.ps1 [username]
# Если username не указан, будет запрошен при запуске

# Конфигурация
$SERVER_URL = "http://35.232.108.72"
$API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="
$LOG_FILE = "$env:APPDATA\mesendger\pc_startup.log"
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

try {
    Write-Log "=== PC STARTUP SCRIPT STARTED ==="
    Write-Log "PowerShell version: $($PSVersionTable.PSVersion)"
    
    # Получаем username сотрудника (из параметров, конфига или запроса)
    $username = Get-Username $args
    Write-Log "Username: $username (будет отображаться ФИО из базы на сервере)"
    
    # Получаем текущее время в UTC и конвертируем в формат YYYY-MM-DD HH:mm:ss
    $now = Get-Date
    $utcTime = $now.ToUniversalTime()
    # Формат для локальных ПК: YYYY-MM-DD HH:mm:ss
    $eventTime = $utcTime.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Log "Event time: $eventTime"
    
    # Формируем данные для отправки на локальный endpoint
    # event_id: 4624 = login (вход), 4634 = logout (выход)
    $eventData = @{
        username = $username
        event_type = "login"
        event_time = $eventTime
        event_id = 4624  # Windows Event ID для успешного входа
    }
    
    Write-Log "Event data: username=$username, event_type=login, event_time=$eventTime, event_id=4624"
    
    # Преобразуем в JSON
    $jsonData = $eventData | ConvertTo-Json -Depth 10
    Write-Log "JSON data: $jsonData"
    
    # Подготавливаем заголовки (для локальных ПК API ключ не требуется)
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    # URL для отправки на локальный endpoint
    $url = "$SERVER_URL/api/worktime"
    Write-Log "Sending to: $url (local PC endpoint)"
    
    # Отправляем данные
    try {
        $response = Invoke-RestMethod -Uri $url `
            -Method POST `
            -Headers $headers `
            -Body $jsonData `
            -TimeoutSec 10 `
            -ErrorAction Stop
        
        if ($response) {
            $responseJson = $response | ConvertTo-Json -Compress
            Write-Log "✅ SUCCESS: $responseJson"
        } else {
            Write-Log "✅ SUCCESS: Empty response (but OK)"
        }
        Write-Log "=== PC STARTUP SCRIPT COMPLETED SUCCESSFULLY ==="
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
        
        Write-Log "=== PC STARTUP SCRIPT FAILED ==="
        exit 1
    }
    
} catch {
    Write-Log "❌ FATAL ERROR: $($_.Exception.Message)"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    Write-Log "=== PC STARTUP SCRIPT FAILED ==="
    exit 1
}

