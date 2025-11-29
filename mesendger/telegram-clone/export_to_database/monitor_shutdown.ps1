# Скрипт мониторинга выключения ПК через WMI событие
# Запускается при входе пользователя и работает в фоне
# Использование: .\monitor_shutdown.ps1 [username]

$SERVER_URL = "http://35.232.108.72"
$LOG_FILE = "$env:APPDATA\mesendger\shutdown_monitor.log"
$CONFIG_FILE = "$env:APPDATA\mesendger\agent_config.json"

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
    $logMessage | Out-File -FilePath $LOG_FILE -Append -Encoding UTF8
}

# Функция получения username
function Get-Username {
    param([array]$ScriptArgs)
    
    if ($ScriptArgs -and $ScriptArgs.Count -gt 0 -and $ScriptArgs[0]) {
        $username = $ScriptArgs[0].Trim()
        if ($username) {
            Write-Log "Username получен из аргументов: $username"
            return $username
        }
    }
    
    if (Test-Path $CONFIG_FILE) {
        try {
            $config = Get-Content $CONFIG_FILE -Raw | ConvertFrom-Json
            if ($config.username -and $config.username.Trim()) {
                $username = $config.username.Trim()
                Write-Log "Username получен из конфига: $username"
                return $username
            }
        } catch {
            Write-Log "Error reading config: $($_.Exception.Message)"
        }
    }
    
    Write-Log "Username не найден, используем: $env:USERNAME"
    return $env:USERNAME
}

# Функция отправки данных о выключении
function Send-ShutdownEvent {
    param([string]$username)
    
    $now = Get-Date
    $eventTime = $now.ToString("yyyy-MM-dd HH:mm:ss")
    
    $eventData = @{
        username = $username
        event_type = "logout"
        event_time = $eventTime
        event_id = 4634
    }
    
    $jsonData = $eventData | ConvertTo-Json -Depth 10
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $url = "$SERVER_URL/api/worktime"
    
    try {
        # Используем короткий таймаут и не ждем ответа
        $job = Start-Job -ScriptBlock {
            param($url, $headers, $jsonData)
            try {
                Invoke-RestMethod -Uri $url `
                    -Method POST `
                    -Headers $headers `
                    -Body $jsonData `
                    -TimeoutSec 3 `
                    -ErrorAction Stop | Out-Null
            } catch {
                # Игнорируем ошибки, т.к. система может уже выключаться
            }
        } -ArgumentList $url, $headers, $jsonData
        
        # Ждем максимум 2 секунды
        Wait-Job -Job $job -Timeout 2 | Out-Null
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
        
        Write-Log "✅ Выключение отправлено: $eventTime"
        return $true
    } catch {
        Write-Log "❌ Ошибка отправки: $($_.Exception.Message)"
        return $false
    }
}

try {
    Write-Log "=== SHUTDOWN MONITOR STARTED ==="
    
    $script:monitorUsername = Get-Username $args
    Write-Log "Username: $script:monitorUsername"
    
    # Регистрируемся на событие выключения через WMI
    $query = "SELECT * FROM Win32_ComputerShutdownEvent"
    
    # Создаем WMI подписку
    try {
        $wmiEvent = Register-WmiEvent -Query $query -Action {
            param($event)
            Write-Log "Событие выключения обнаружено через WMI!"
            Send-ShutdownEvent -username $script:monitorUsername
        } -ErrorAction Stop
        
        Write-Log "WMI подписка на событие выключения создана"
    } catch {
        Write-Log "❌ Ошибка создания WMI подписки: $($_.Exception.Message)"
        Write-Log "Попытка альтернативного метода..."
    }
    
    # Также отслеживаем системные события выключения через EventLog
    try {
        $eventWatcher = Register-ObjectEvent -InputObject (Get-WinEvent -ListLog System) `
            -EventName "EventRecordWritten" `
            -Action {
                param($sender, $e)
                $event = $e.EventRecord
                if ($event.Id -eq 1074 -or $event.Id -eq 1076 -or $event.Id -eq 6008) {
                    Write-Log "Событие выключения обнаружено через EventLog: EventID=$($event.Id)"
                    Send-ShutdownEvent -username $script:monitorUsername
                }
            } -ErrorAction SilentlyContinue
        
        Write-Log "EventLog подписка создана"
    } catch {
        Write-Log "⚠️ EventLog подписка не создана: $($_.Exception.Message)"
    }
    
    # Ждем бесконечно, проверяя каждую минуту
    Write-Log "Монитор выключения работает. Ожидание события выключения..."
    while ($true) {
        Start-Sleep -Seconds 60
        
        # Проверяем, что WMI подписка еще активна
        if ($wmiEvent -and -not $wmiEvent.IsCompleted) {
            # Подписка активна
        } else {
            Write-Log "⚠️ WMI подписка потеряна, перезапуск..."
            try {
                $wmiEvent = Register-WmiEvent -Query $query -Action {
                    param($event)
                    Write-Log "Событие выключения обнаружено через WMI!"
                    Send-ShutdownEvent -username $script:monitorUsername
                } -ErrorAction Stop
                Write-Log "WMI подписка восстановлена"
            } catch {
                Write-Log "❌ Не удалось восстановить WMI подписку: $($_.Exception.Message)"
            }
        }
    }
    
} catch {
    Write-Log "❌ FATAL ERROR: $($_.Exception.Message)"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    exit 1
}

