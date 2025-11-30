# Скрипт отправки данных о выключении ПК с резервным сохранением
# Если не удается отправить сразу, данные сохраняются в файл для отправки при следующем запуске
# Совместим с PowerShell 5.1 и ниже
# Использование: .\send_pc_shutdown_with_fallback.ps1 [username]

# Конфигурация
$SERVER_URL = "http://35.232.108.72"
$LOG_FILE = "$env:APPDATA\mesendger\pc_shutdown.log"
$CONFIG_FILE = "$env:APPDATA\mesendger\agent_config.json"
$PENDING_SHUTDOWN_FILE = "$env:APPDATA\mesendger\pending_shutdown.json"

# Создаём директории
$logDir = Split-Path -Parent $LOG_FILE
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Функция логирования
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
    
    # 1. Проверяем аргументы командной строки (высший приоритет)
    if ($ScriptArgs -and $ScriptArgs.Count -gt 0 -and $ScriptArgs[0]) {
        $username = $ScriptArgs[0].Trim()
        if ($username) {
            Write-Log "Username получен из аргументов командной строки: $username"
            return $username
        }
    }
    
    # 2. Проверяем конфигурационный файл (для автоматического запуска)
    if (Test-Path $CONFIG_FILE) {
        try {
            $config = Get-Content $CONFIG_FILE -Raw | ConvertFrom-Json
            if ($config.username -and $config.username.Trim()) {
                $username = $config.username.Trim()
                Write-Log "Username получен из конфигурационного файла: $username"
                return $username
            }
        } catch {
            Write-Log "Error reading config file: $($_.Exception.Message)"
        }
    }
    
    # 3. Используем имя текущего пользователя Windows
    Write-Log "Username не найден в конфиге, используем имя текущего пользователя Windows: $env:USERNAME"
    return $env:USERNAME
}

# Функция сохранения данных о выключении в файл для последующей отправки
function Save-PendingShutdown {
    param(
        [string]$username,
        [string]$eventTime
    )
    
    try {
    $pendingData = @{
        username = $username
        event_type = "shutdown"  # Отдельный тип события для выключения ПК
        event_time = $eventTime
        event_id = 1074  # Windows Event ID для выключения системы
        saved_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
        
        $jsonData = $pendingData | ConvertTo-Json -Depth 10
        $jsonData | Out-File -FilePath $PENDING_SHUTDOWN_FILE -Encoding UTF8 -Force
        Write-Log "✅ Данные о выключении сохранены в файл для последующей отправки: $PENDING_SHUTDOWN_FILE"
        return $true
    } catch {
        Write-Log "❌ Ошибка сохранения данных о выключении: $($_.Exception.Message)"
        return $false
    }
}

# Функция отправки данных о выключении
function Send-ShutdownEvent {
    param(
        [string]$username,
        [string]$eventTime
    )
    
    $eventData = @{
        username = $username
        event_type = "shutdown"  # Отдельный тип события для выключения ПК
        event_time = $eventTime
        event_id = 1074  # Windows Event ID для выключения системы
    }
    
    $jsonData = $eventData | ConvertTo-Json -Depth 10
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $url = "$SERVER_URL/api/worktime"
    Write-Log "Sending to: $url (local PC endpoint)"
    
    try {
        # Используем короткий таймаут, т.к. система может выключаться
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
        
        # Удаляем файл с отложенными данными, если он существует (на случай, если был сохранен ранее)
        if (Test-Path $PENDING_SHUTDOWN_FILE) {
            Remove-Item -Path $PENDING_SHUTDOWN_FILE -Force -ErrorAction SilentlyContinue
            Write-Log "Удален файл с отложенными данными (успешно отправлено)"
        }
        
        return $true
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Log "❌ ERROR отправки данных: $errorMsg"
        
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
        
        # Сохраняем данные в файл для последующей отправки
        Write-Log "Попытка сохранить данные о выключении для последующей отправки..."
        $saved = Save-PendingShutdown -username $username -eventTime $eventTime
        
        if ($saved) {
            Write-Log "✅ Данные сохранены. Будет отправлено при следующем запуске ПК"
        } else {
            Write-Log "❌ Не удалось сохранить данные о выключении"
        }
        
        return $false
    }
}

try {
    Write-Log "=== PC SHUTDOWN SCRIPT WITH FALLBACK STARTED ==="
    Write-Log "PowerShell version: $($PSVersionTable.PSVersion)"
    
    # Получаем username сотрудника
    $username = Get-Username $args
    Write-Log "Username: $username (будет отображаться ФИО из базы на сервере)"
    
    # Получаем текущее локальное время
    $now = Get-Date
    $eventTime = $now.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Log "Event time (local): $eventTime"
    
    # Пытаемся отправить данные
    $success = Send-ShutdownEvent -username $username -eventTime $eventTime
    
    if ($success) {
        Write-Log "=== PC SHUTDOWN SCRIPT COMPLETED SUCCESSFULLY ==="
    } else {
        Write-Log "=== PC SHUTDOWN SCRIPT COMPLETED WITH FALLBACK (saved to file) ==="
    }
    
} catch {
    Write-Log "❌ FATAL ERROR: $($_.Exception.Message)"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    
    # В случае критической ошибки все равно пытаемся сохранить данные
    try {
        $now = Get-Date
        $eventTime = $now.ToString("yyyy-MM-dd HH:mm:ss")
        $username = Get-Username $args
        Save-PendingShutdown -username $username -eventTime $eventTime
    } catch {
        Write-Log "❌ Не удалось сохранить данные даже в файл: $($_.Exception.Message)"
    }
    
    Write-Log "=== PC SHUTDOWN SCRIPT FAILED ==="
    exit 1
}

