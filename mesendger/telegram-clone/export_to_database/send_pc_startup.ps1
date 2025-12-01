# Скрипт отправки данных о запуске ПК (вход пользователя)
# Совместим с PowerShell 5.1 и ниже
# Использование: .\send_pc_startup.ps1 [username]
# Если username не указан, будет запрошен при запуске

# Конфигурация
$SERVER_URL = "http://35.232.108.72"
$API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="
$LOG_FILE = "$env:APPDATA\mesendger\pc_startup.log"
$CONFIG_FILE = "$env:APPDATA\mesendger\agent_config.json"
$PENDING_SHUTDOWN_FILE = "$env:APPDATA\mesendger\pending_shutdown.json"

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
    
    # 1. Проверяем аргументы командной строки (высший приоритет)
    if ($ScriptArgs -and $ScriptArgs.Count -gt 0 -and $ScriptArgs[0]) {
        $username = $ScriptArgs[0].Trim()
        if ($username) {
            Write-Log "Username получен из аргументов командной строки: $username"
            # Сохраняем в конфиг для будущих запусков
            try {
                $config = @{ username = $username } | ConvertTo-Json
                $config | Out-File -FilePath $CONFIG_FILE -Encoding UTF8 -Force
                Write-Log "Username сохранён в конфигурационный файл: $username"
            } catch {
                Write-Log "Error saving config file: $($_.Exception.Message)"
            }
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
    
    # 3. Запрашиваем у пользователя (только при интерактивном запуске)
    # Проверяем, запущен ли скрипт интерактивно (не через планировщик задач)
    $isInteractive = [Environment]::UserInteractive -and $Host.Name -eq "ConsoleHost"
    
    if ($isInteractive) {
        Write-Host ""
        Write-Host "⚠️ Username не найден в конфигурации!" -ForegroundColor Yellow
        Write-Host "Введите username сотрудника (например: Ksendzik_Oleg):" -ForegroundColor Yellow
        Write-Host "Этот username должен соответствовать username в базе данных Mesendger" -ForegroundColor Gray
        Write-Host "После ввода username будет сохранён для автоматических запусков" -ForegroundColor Gray
        $username = Read-Host
        
        if ([string]::IsNullOrWhiteSpace($username)) {
            Write-Log "Username не указан, используем имя текущего пользователя Windows: $env:USERNAME"
            Write-Host "⚠️ Используется имя текущего пользователя Windows: $env:USERNAME" -ForegroundColor Yellow
            Write-Host "   Убедитесь, что этот username существует в базе данных Mesendger!" -ForegroundColor Yellow
            $username = $env:USERNAME
        }
        
        # Сохраняем в конфигурационный файл
        try {
            $config = @{ username = $username.Trim() } | ConvertTo-Json
            $config | Out-File -FilePath $CONFIG_FILE -Encoding UTF8 -Force
            Write-Log "Username сохранён в конфигурационный файл: $username"
            Write-Host "✅ Username сохранён для будущих автоматических запусков" -ForegroundColor Green
        } catch {
            Write-Log "Error saving config file: $($_.Exception.Message)"
        }
        
        return $username.Trim()
    } else {
        # Автоматический запуск (через планировщик задач) - используем имя пользователя Windows
        Write-Log "Автоматический запуск: username не найден в конфиге, используем имя текущего пользователя Windows: $env:USERNAME"
        Write-Log "⚠️ ВНИМАНИЕ: Убедитесь, что username '$env:USERNAME' существует в базе данных Mesendger!"
        Write-Log "   Для правильной идентификации запустите скрипт вручную один раз и введите правильный username"
        return $env:USERNAME
    }
}

# Функция получения времени последнего выключения из журнала Windows
function Get-LastShutdownTime {
    try {
        # Ищем последнее событие завершения работы Event Log service (6006)
        # Это ПОСЛЕДНЕЕ событие перед выключением системы - самое точное!
        $shutdownEvent = Get-WinEvent -FilterHashtable @{LogName='System'; ID=6006} -MaxEvents 1 -ErrorAction SilentlyContinue | Select-Object -First 1
        
        if ($shutdownEvent -and $shutdownEvent.TimeCreated) {
            $shutdownTime = $shutdownEvent.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss")
            Write-Log "✅ Найдено время последнего выключения из журнала (EventID 6006): $shutdownTime"
            return $shutdownTime
        }
        
        # Если событие 6006 не найдено, пытаемся найти 1074 (инициирование выключения)
        $shutdownEvent = Get-WinEvent -FilterHashtable @{LogName='System'; ID=1074} -MaxEvents 1 -ErrorAction SilentlyContinue | Select-Object -First 1
        
        if ($shutdownEvent -and $shutdownEvent.TimeCreated) {
            $shutdownTime = $shutdownEvent.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss")
            Write-Log "✅ Найдено время инициирования выключения из журнала (EventID 1074): $shutdownTime"
            return $shutdownTime
        }
        
        Write-Log "⚠️ Не удалось найти событие выключения в журнале"
        return $null
    } catch {
        Write-Log "❌ Ошибка чтения журнала событий: $($_.Exception.Message)"
        return $null
    }
}

# Функция отправки отложенных данных о выключении
function Send-PendingShutdown {
    param([string]$Username)
    
    # СНАЧАЛА пытаемся получить время из журнала Windows (более надежно!)
    $shutdownTime = Get-LastShutdownTime
    
    if ($shutdownTime) {
        # Формируем данные о выключении с временем из журнала
        $shutdownData = @{
            username = $Username
            event_type = "logout"
            event_time = $shutdownTime
            event_id = 4634
        }
        
        Write-Log "Отправка данных о выключении из журнала: username=$Username, event_time=$shutdownTime"
        
        $jsonData = $shutdownData | ConvertTo-Json -Depth 10
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $url = "$SERVER_URL/api/worktime"
        
        try {
            $response = Invoke-RestMethod -Uri $url `
                -Method POST `
                -Headers $headers `
                -Body $jsonData `
                -TimeoutSec 10 `
                -ErrorAction Stop
            
            if ($response) {
                $responseJson = $response | ConvertTo-Json -Compress
                Write-Log "✅ Данные о выключении успешно отправлены: $responseJson"
            } else {
                Write-Log "✅ Данные о выключении успешно отправлены (пустой ответ)"
            }
            
            return $true
        } catch {
            $errorMsg = $_.Exception.Message
            Write-Log "❌ Ошибка отправки данных о выключении: $errorMsg"
            return $false
        }
    }
    
    # Если не удалось получить из журнала, пытаемся прочитать из файла
    if (Test-Path $PENDING_SHUTDOWN_FILE) {
        try {
            Write-Log "Обнаружен файл с отложенными данными о выключении. Чтение..."
            $pendingData = Get-Content $PENDING_SHUTDOWN_FILE -Raw | ConvertFrom-Json
            
            if (-not $pendingData -or -not $pendingData.username -or -not $pendingData.event_time) {
                Write-Log "⚠️ Файл с отложенными данными поврежден или пуст"
                Remove-Item -Path $PENDING_SHUTDOWN_FILE -Force -ErrorAction SilentlyContinue
                return $false
            }
            
            Write-Log "Отправка отложенных данных из файла: username=$($pendingData.username), event_time=$($pendingData.event_time)"
            
            $jsonData = $pendingData | ConvertTo-Json -Depth 10
            $headers = @{
                "Content-Type" = "application/json"
            }
            
            $url = "$SERVER_URL/api/worktime"
            
            try {
                $response = Invoke-RestMethod -Uri $url `
                    -Method POST `
                    -Headers $headers `
                    -Body $jsonData `
                    -TimeoutSec 10 `
                    -ErrorAction Stop
                
                if ($response) {
                    $responseJson = $response | ConvertTo-Json -Compress
                    Write-Log "✅ Отложенные данные о выключении из файла успешно отправлены: $responseJson"
                } else {
                    Write-Log "✅ Отложенные данные о выключении из файла успешно отправлены (пустой ответ)"
                }
                
                # Удаляем файл после успешной отправки
                Remove-Item -Path $PENDING_SHUTDOWN_FILE -Force -ErrorAction SilentlyContinue
                Write-Log "Файл с отложенными данными удален"
                return $true
            } catch {
                $errorMsg = $_.Exception.Message
                Write-Log "❌ Ошибка отправки отложенных данных из файла: $errorMsg"
                return $false
            }
        } catch {
            Write-Log "❌ Ошибка чтения файла с отложенными данными: $($_.Exception.Message)"
            Remove-Item -Path $PENDING_SHUTDOWN_FILE -Force -ErrorAction SilentlyContinue
            return $false
        }
    }
    
    Write-Log "⚠️ Нет данных о выключении (ни в журнале, ни в файле)"
    return $false
}

try {
    Write-Log "=== PC STARTUP SCRIPT STARTED ==="
    Write-Log "PowerShell version: $($PSVersionTable.PSVersion)"
    
    # Получаем username сотрудника СНАЧАЛА (нужен для отправки данных выключения)
    $username = Get-Username $args
    Write-Log "Username: $username (будет отображаться ФИО из базы на сервере)"
    
    # Сначала проверяем и отправляем данные о выключении из журнала Windows
    Write-Log "Проверка данных о последнем выключении..."
    $pendingSent = Send-PendingShutdown -Username $username
    if ($pendingSent) {
        Write-Log "✅ Данные о выключении обработаны и отправлены"
    } else {
        Write-Log "⚠️ Не удалось получить или отправить данные о выключении"
    }
    
    # Получаем текущее локальное время и конвертируем в формат YYYY-MM-DD HH:mm:ss
    # Используем локальное время, чтобы оно правильно отображалось в модалке
    $now = Get-Date
    # Формат для локальных ПК: YYYY-MM-DD HH:mm:ss (локальное время)
    $eventTime = $now.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Log "Event time (local): $eventTime"
    
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

