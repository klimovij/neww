# Скрипт отправки данных активности пользователя
# Совместим с PowerShell 5.1 и ниже
# Использование: .\send_activity.ps1 [username] [loop] [interval_minutes]
# Если username не указан, будет прочитан из конфига или запрошен
# Если указан параметр "loop", скрипт будет работать в цикле
# interval_minutes - интервал отправки данных в минутах (по умолчанию 5)

# Конфигурация
$SERVER_URL = "http://35.232.108.72"
$API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="
$LOG_FILE = "$env:APPDATA\mesendger\activity.log"
$CONFIG_FILE = "$env:APPDATA\mesendger\agent_config.json"
$DEFAULT_INTERVAL_MINUTES = 5  # По умолчанию 5 минут
$DEFAULT_SCREENSHOT_INTERVAL_MINUTES = 5  # По умолчанию 5 минут для скриншотов
$SCREENSHOTS_DIR = "$env:APPDATA\mesendger\screenshots"  # Локальная папка для скриншотов

# Создаём директории
$logDir = Split-Path -Parent $LOG_FILE
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
if (-not (Test-Path $SCREENSHOTS_DIR)) {
    New-Item -ItemType Directory -Path $SCREENSHOTS_DIR -Force | Out-Null
}

# Добавляем .NET классы для работы со скриншотами (совместимо с PS 5.1)
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

# Добавляем Win32 API функции (совместимо с PS 5.1)
# Должно быть в начале скрипта, до всех функций
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@ -ErrorAction SilentlyContinue

# Функция логирования (определяем первой, т.к. используется во всех других функциях)
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "$timestamp - $Message"
    Write-Host $logMessage
    $logMessage | Out-File -FilePath $LOG_FILE -Append -Encoding UTF8
}

# Функция получения конфигурации (username и interval)
function Get-Config {
    param([array]$ScriptArgs)
    
    $username = $null
    $intervalMinutes = $null
    $runLoop = $false
    
    # Парсим аргументы командной строки
    if ($ScriptArgs -and $ScriptArgs.Count -gt 0) {
        foreach ($arg in $ScriptArgs) {
            $argLower = $arg.ToString().ToLower().Trim()
            
            if ($argLower -eq "loop") {
                $runLoop = $true
            } elseif ($argLower -match "^\d+$" -or $argLower -match "^\d+\.\d+$") {
                # Это число - интервал в минутах
                $intervalMinutes = [int][Math]::Round([double]$arg)
            } elseif (-not [string]::IsNullOrWhiteSpace($arg) -and $arg -ne "loop") {
                # Это username
                $username = $arg.Trim()
            }
        }
    }
    
    # Загружаем конфигурацию из файла
    $config = @{}
    if (Test-Path $CONFIG_FILE) {
        try {
            $fileContent = Get-Content $CONFIG_FILE -Raw | ConvertFrom-Json
            if ($fileContent) {
                $config = $fileContent
            }
        } catch {
            # Write-Log ещё не определён, используем простой вывод
            Write-Host "Error reading config file: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Проверяем, запущен ли скрипт в автоматическом режиме (через планировщик задач с параметром "loop")
    $isLoopMode = $runLoop -or ($ScriptArgs -contains "loop")
    
    # Получаем username
    if (-not $username) {
        if ($config.username) {
            $username = $config.username.Trim()
        } else {
            # Если автоматический режим - используем имя пользователя по умолчанию без запросов
            if ($isLoopMode) {
                $username = $env:USERNAME
            } else {
                # Запрашиваем у пользователя только в интерактивном режиме
                Write-Host ""
                Write-Host "Введите username сотрудника (например: Ksendzik_Oleg):" -ForegroundColor Yellow
                $username = Read-Host
                
                if ([string]::IsNullOrWhiteSpace($username)) {
                    Write-Host "Username не указан, используем имя текущего пользователя: $env:USERNAME" -ForegroundColor Yellow
                    $username = $env:USERNAME
                }
            }
        }
    }
    
    # Получаем интервал отправки данных активности
    if (-not $intervalMinutes -or $intervalMinutes -le 0) {
        if ($config.intervalMinutes -and $config.intervalMinutes -gt 0) {
            $intervalMinutes = [int]$config.intervalMinutes
        } else {
            # В автоматическом режиме используем значения по умолчанию без запросов
            if ($isLoopMode) {
                $intervalMinutes = $DEFAULT_INTERVAL_MINUTES
            } else {
                # Используем значение по умолчанию или запрашиваем
                Write-Host ""
                Write-Host "Введите интервал отправки данных активности в минутах (по умолчанию $DEFAULT_INTERVAL_MINUTES):" -ForegroundColor Yellow
                $inputMinutes = Read-Host
                
                if ([string]::IsNullOrWhiteSpace($inputMinutes)) {
                    $intervalMinutes = $DEFAULT_INTERVAL_MINUTES
                } else {
                    try {
                        $intervalMinutes = [int][Math]::Round([double]$inputMinutes)
                        if ($intervalMinutes -le 0) {
                            $intervalMinutes = $DEFAULT_INTERVAL_MINUTES
                        }
                    } catch {
                        $intervalMinutes = $DEFAULT_INTERVAL_MINUTES
                    }
                }
            }
        }
    }
    
    # Получаем интервал отправки скриншотов
    $screenshotIntervalMinutes = $null
    if (-not $screenshotIntervalMinutes -or $screenshotIntervalMinutes -le 0) {
        if ($config.screenshotIntervalMinutes -and $config.screenshotIntervalMinutes -gt 0) {
            $screenshotIntervalMinutes = [int]$config.screenshotIntervalMinutes
        } else {
            # В автоматическом режиме используем значения по умолчанию без запросов
            if ($isLoopMode) {
                $screenshotIntervalMinutes = $DEFAULT_SCREENSHOT_INTERVAL_MINUTES
            } else {
                # Используем значение по умолчанию или запрашиваем
                Write-Host ""
                Write-Host "Введите интервал отправки скриншотов в минутах (по умолчанию $DEFAULT_SCREENSHOT_INTERVAL_MINUTES):" -ForegroundColor Yellow
                $inputScreenshotMinutes = Read-Host
                
                if ([string]::IsNullOrWhiteSpace($inputScreenshotMinutes)) {
                    $screenshotIntervalMinutes = $DEFAULT_SCREENSHOT_INTERVAL_MINUTES
                } else {
                    try {
                        $screenshotIntervalMinutes = [int][Math]::Round([double]$inputScreenshotMinutes)
                        if ($screenshotIntervalMinutes -le 0) {
                            $screenshotIntervalMinutes = $DEFAULT_SCREENSHOT_INTERVAL_MINUTES
                        }
                    } catch {
                        $screenshotIntervalMinutes = $DEFAULT_SCREENSHOT_INTERVAL_MINUTES
                    }
                }
            }
        }
    }
    
    # Сохраняем конфигурацию в файл
    try {
        $configToSave = @{
            username = $username.Trim()
            intervalMinutes = $intervalMinutes
            screenshotIntervalMinutes = $screenshotIntervalMinutes
        }
        $jsonConfig = $configToSave | ConvertTo-Json
        $jsonConfig | Out-File -FilePath $CONFIG_FILE -Encoding UTF8 -Force
        Write-Host "Конфигурация сохранена: username=$username, interval=$intervalMinutes минут, screenshotInterval=$screenshotIntervalMinutes минут" -ForegroundColor Green
    } catch {
        Write-Host "Error saving config file: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return @{
        username = $username.Trim()
        intervalMinutes = $intervalMinutes
        intervalSeconds = $intervalMinutes * 60
        screenshotIntervalMinutes = $screenshotIntervalMinutes
        screenshotIntervalSeconds = $screenshotIntervalMinutes * 60
        runLoop = $runLoop
    }
}

# Функция получения активного окна (с правильной обработкой UTF-8)
function Get-ActiveWindow {
    try {
        $hwnd = [Win32]::GetForegroundWindow()
        if ($hwnd -eq [IntPtr]::Zero) {
            return "Unknown"
        }
        
        # Используем больший буфер для длинных названий (Windows API возвращает UTF-16)
        $sb = New-Object System.Text.StringBuilder 1024
        $result = [Win32]::GetWindowText($hwnd, $sb, $sb.Capacity)
        
        if ($result -eq 0) {
            return "Unknown"
        }
        
        # Получаем текст - Windows API возвращает UTF-16, PowerShell автоматически конвертирует в .NET string
        $windowText = $sb.ToString()
        if ([string]::IsNullOrEmpty($windowText)) {
            return "Unknown"
        }
        
        # Возвращаем текст как есть - PowerShell и .NET автоматически обрабатывают UTF-16
        return $windowText
    } catch {
        return "Unknown"
    }
}

# Функция сбора данных активности
function Collect-Activity {
    param([string]$Username)
    
    try {
        if (-not $Username) {
            $Username = $env:USERNAME
        }
        $now = Get-Date
        $timestamp = $now.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        
        # Получаем активное окно
        $activeWindow = Get-ActiveWindow
        
        # Получаем информацию о процессе
        $hwnd = [Win32]::GetForegroundWindow()
        $procId = 0
        $processName = "Unknown"
        $browserUrl = ""
        
        if ($hwnd -ne [IntPtr]::Zero) {
            [Win32]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
            if ($procId -ne 0) {
                try {
                    $proc = Get-Process -Id $procId -ErrorAction Stop
                    if ($proc) {
                        $processName = $proc.ProcessName
                        
                        # Проверяем, является ли процесс браузером
                        $procNameLower = $processName.ToLower()
                        if ($procNameLower -match "chrome|msedge|firefox|opera") {
                            if ($activeWindow -match "http") {
                                $browserUrl = $activeWindow
                            } else {
                                $browserUrl = "${procNameLower}://active-tab"
                            }
                        }
                    }
                } catch {
                    $processName = "Unknown"
                }
            }
        }
        
        $activityData = @{
            username = $Username
            timestamp = $timestamp
            idleMinutes = 0
            procName = $processName
            windowTitle = $activeWindow
            browserUrl = $browserUrl
        }
        
        return $activityData
    } catch {
        Write-Log "Error collecting activity: $($_.Exception.Message)"
        return $null
    }
}

# Функция создания скриншота
function Take-Screenshot {
    try {
        # Создаём скриншот экрана используя .NET (классы уже добавлены в начале скрипта)
        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        
        # Копируем содержимое экрана в bitmap
        $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
        
        # Сохраняем во временный файл (JPEG для меньшего размера)
        $timestamp = Get-Date -Format "yyyyMMddHHmmss"
        $screenshotPath = Join-Path $SCREENSHOTS_DIR "screenshot_$timestamp.jpg"
        
        # Сохраняем в JPEG формате с качеством 80% для уменьшения размера
        $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 80)
        
        $bitmap.Save($screenshotPath, $jpegCodec, $encoderParams)
        
        # Освобождаем ресурсы
        $graphics.Dispose()
        $bitmap.Dispose()
        
        Write-Log "Screenshot created: $screenshotPath"
        return $screenshotPath
    } catch {
        Write-Log "Error creating screenshot: $($_.Exception.Message)"
        return $null
    }
}

# Функция отправки скриншота на сервер (совместимо с PowerShell 5.1)
function Send-Screenshot {
    param(
        [string]$ScreenshotPath,
        [string]$Username,
        [string]$Timestamp
    )
    
    try {
        if (-not $ScreenshotPath -or -not (Test-Path $ScreenshotPath)) {
            Write-Log "Screenshot file not found: $ScreenshotPath"
            return $false
        }
        
        Write-Log "Sending screenshot: $ScreenshotPath"
        
        # Используем Invoke-WebRequest для отправки multipart/form-data (более надёжно в PS 5.1)
        $url = "$SERVER_URL/api/activity-screenshot"
        $fileInfo = Get-Item $ScreenshotPath
        $fileName = $fileInfo.Name
        
        # Формируем multipart/form-data вручную
        $boundary = [System.Guid]::NewGuid().ToString()
        $fileBytes = [System.IO.File]::ReadAllBytes($ScreenshotPath)
        
        # Создаём multipart body
        $bodyParts = New-Object System.Collections.ArrayList
        
        # Username
        $usernamePart = "--$boundary`r`n"
        $usernamePart += "Content-Disposition: form-data; name=`"username`"`r`n"
        $usernamePart += "`r`n"
        $usernamePart += "$Username`r`n"
        [void]$bodyParts.Add([System.Text.Encoding]::UTF8.GetBytes($usernamePart))
        
        # Timestamp
        $timestampPart = "--$boundary`r`n"
        $timestampPart += "Content-Disposition: form-data; name=`"timestamp`"`r`n"
        $timestampPart += "`r`n"
        $timestampPart += "$Timestamp`r`n"
        [void]$bodyParts.Add([System.Text.Encoding]::UTF8.GetBytes($timestampPart))
        
        # File
        $filePart = "--$boundary`r`n"
        $filePart += "Content-Disposition: form-data; name=`"screenshot`"; filename=`"$fileName`"`r`n"
        $filePart += "Content-Type: image/jpeg`r`n"
        $filePart += "`r`n"
        [void]$bodyParts.Add([System.Text.Encoding]::UTF8.GetBytes($filePart))
        [void]$bodyParts.Add($fileBytes)
        
        # End boundary
        $endPart = "`r`n--$boundary--`r`n"
        [void]$bodyParts.Add([System.Text.Encoding]::UTF8.GetBytes($endPart))
        
        # Объединяем все части
        $totalLength = ($bodyParts | Measure-Object -Property Length -Sum).Sum
        $fullBody = New-Object byte[] $totalLength
        $offset = 0
        foreach ($part in $bodyParts) {
            [System.Buffer]::BlockCopy($part, 0, $fullBody, $offset, $part.Length)
            $offset += $part.Length
        }
        
        # Отправляем запрос
        $headers = @{
            "X-API-Key" = $API_KEY
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        }
        
        try {
            $response = Invoke-WebRequest -Uri $url `
                -Method POST `
                -Headers $headers `
                -Body $fullBody `
                -TimeoutSec 30 `
                -ErrorAction Stop
            
            if ($response.StatusCode -eq 200) {
                try {
                    $responseJson = $response.Content | ConvertFrom-Json | ConvertTo-Json -Compress
                    Write-Log "✅ Screenshot sent successfully: $responseJson"
                } catch {
                    Write-Log "✅ Screenshot sent successfully (Status: $($response.StatusCode))"
                }
                
                # Удаляем локальный файл после успешной отправки
                try {
                    Remove-Item $ScreenshotPath -Force -ErrorAction SilentlyContinue
                    Write-Log "Local screenshot deleted: $ScreenshotPath"
                } catch {
                    Write-Log "Warning: Could not delete local screenshot: $($_.Exception.Message)"
                }
                
                return $true
            } else {
                Write-Log "❌ Error sending screenshot: Status code $($response.StatusCode)"
                return $false
            }
        } catch {
            $errorMsg = $_.Exception.Message
            Write-Log "❌ Error sending screenshot: $errorMsg"
            
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
            
            return $false
        }
    } catch {
        Write-Log "❌ FATAL ERROR in Send-Screenshot: $($_.Exception.Message)"
        Write-Log "Stack trace: $($_.ScriptStackTrace)"
        return $false
    }
}

# Функция отправки данных активности
function Send-ActivityData {
    param([array]$ActivityData)
    
    try {
        if (-not $ActivityData -or $ActivityData.Count -eq 0) {
            Write-Log "No activity data to send"
            return $false
        }
        
        # Убеждаемся, что это массив (сервер ожидает массив событий)
        # В PowerShell 5.1 нужно явно создать массив, иначе ConvertTo-Json может вернуть объект
        $eventsArray = @()
        foreach ($item in $ActivityData) {
            $eventsArray += $item
        }
        
        # Если один элемент, всё равно делаем массив явно
        if ($eventsArray.Count -eq 1) {
            $tempArray = @()
            $tempArray += $eventsArray[0]
            $eventsArray = $tempArray
        }
        
        # Преобразуем каждый элемент в JSON отдельно, затем объединяем в массив
        # Это гарантирует, что всегда будет массив
        # Важно: используем UTF-8 для правильной кодировки русских символов
        $jsonItems = @()
        foreach ($item in $eventsArray) {
            # ConvertTo-Json с явным указанием UTF-8 для PowerShell 5.1
            $itemJson = $item | ConvertTo-Json -Depth 10 -Compress
            $jsonItems += $itemJson
        }
        
        # Объединяем в массив JSON
        $jsonData = "[$($jsonItems -join ',')]"
        
        Write-Log "Sending $($ActivityData.Count) activity records"
        Write-Log "JSON is array: $($jsonData.TrimStart().StartsWith('['))"
        Write-Log "JSON data (first 200 chars): $($jsonData.Substring(0, [Math]::Min(200, $jsonData.Length)))"
        
        # Подготавливаем заголовки с явным указанием UTF-8
        $headers = @{
            "X-API-Key" = $API_KEY
            "Content-Type" = "application/json; charset=utf-8"
        }
        
        # URL для отправки
        $url = "$SERVER_URL/api/activity-log-batch"
        Write-Log "Sending to: $url"
        
        # Отправляем данные с явным указанием UTF-8 кодировки
        try {
            # Конвертируем JSON строку в UTF-8 байты для правильной отправки кириллицы
            $utf8Encoding = [System.Text.Encoding]::UTF8
            $bodyBytes = $utf8Encoding.GetBytes($jsonData)
            
            # Используем Invoke-WebRequest для полного контроля над кодировкой UTF-8
            $webResponse = Invoke-WebRequest -Uri $url `
                -Method POST `
                -Headers $headers `
                -Body $bodyBytes `
                -ContentType "application/json; charset=utf-8" `
                -TimeoutSec 10 `
                -ErrorAction Stop
            
            # Преобразуем ответ в объект
            $response = $webResponse.Content | ConvertFrom-Json
            
            if ($response) {
                $responseJson = $response | ConvertTo-Json -Compress
                Write-Log "✅ SUCCESS: $responseJson"
            } else {
                Write-Log "✅ SUCCESS: Empty response (but OK)"
            }
            return $true
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
            return $false
        }
    } catch {
        Write-Log "❌ FATAL ERROR in Send-ActivityData: $($_.Exception.Message)"
        return $false
    }
}

# Главная функция - один раз или в цикле
try {
    Write-Log "=== ACTIVITY SCRIPT STARTED ==="
    Write-Log "PowerShell version: $($PSVersionTable.PSVersion)"
    
    # Получаем конфигурацию (username и interval)
    $config = Get-Config -ScriptArgs $args
    $username = $config.username
    $intervalSeconds = $config.intervalSeconds
    $intervalMinutes = $config.intervalMinutes
    $screenshotIntervalSeconds = $config.screenshotIntervalSeconds
    $screenshotIntervalMinutes = $config.screenshotIntervalMinutes
    $runLoop = $config.runLoop
    
    Write-Log "Username: $username (будет отображаться ФИО из базы на сервере)"
    Write-Log "Интервал отправки данных активности: $intervalMinutes минут ($intervalSeconds секунд)"
    Write-Log "Интервал отправки скриншотов: $screenshotIntervalMinutes минут ($screenshotIntervalSeconds секунд)"
    
    $activityBuffer = @()
    $lastScreenshotTime = Get-Date
    $script:lastActivitySendTime = $null  # Время последней отправки данных активности
    
    if ($runLoop) {
        Write-Log "Running in loop mode"
        Write-Log "  - Activity data: every $intervalMinutes minutes / $intervalSeconds seconds"
        Write-Log "  - Screenshots: every $screenshotIntervalMinutes minutes / $screenshotIntervalSeconds seconds"
        Write-Log "Press Ctrl+C to stop"
        
        while ($true) {
            $now = Get-Date
            
            # Собираем данные активности
            $activity = Collect-Activity -Username $username
            
            if ($activity) {
                $activityBuffer += $activity
                Write-Log "Collected activity: $($activity.procName) - $($activity.windowTitle)"
                
                # Отправляем каждые 3 записей ИЛИ каждые 3 минуты (чтобы данные не задерживались)
                $shouldSend = $false
                if ($activityBuffer.Count -ge 3) {
                    $shouldSend = $true
                    Write-Log "Buffer full (3+ records), sending..."
                } else {
                    # Проверяем время с последней отправки
                    if (-not $script:lastActivitySendTime) {
                        $script:lastActivitySendTime = Get-Date
                    }
                    $timeSinceLastSend = ($now - $script:lastActivitySendTime).TotalSeconds
                    if ($timeSinceLastSend -ge 180) {  # 3 минуты (вместо 5)
                        $shouldSend = $true
                        Write-Log "3 minutes passed since last send, sending buffer ($($activityBuffer.Count) records)..."
                    }
                }
                
                if ($shouldSend -and $activityBuffer.Count -gt 0) {
                    if (Send-ActivityData -ActivityData $activityBuffer) {
                        $activityBuffer = @()
                        $script:lastActivitySendTime = $now
                    }
                }
            }
            
            # Проверяем, нужно ли делать скриншот
            $timeSinceLastScreenshot = ($now - $lastScreenshotTime).TotalSeconds
            if ($timeSinceLastScreenshot -ge $screenshotIntervalSeconds) {
                try {
                    $screenshotPath = Take-Screenshot
                    if ($screenshotPath) {
                        $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                        if (Send-Screenshot -ScreenshotPath $screenshotPath -Username $username -Timestamp $timestamp) {
                            $lastScreenshotTime = $now
                            Write-Log "Screenshot sent successfully"
                        }
                    }
                } catch {
                    Write-Log "Error in screenshot process: $($_.Exception.Message)"
                }
            }
            
            # Собираем данные чаще для более точного отслеживания переключений между сайтами
            # Но отправляем по расписанию выше (каждые 3 записи или 3 минуты)
            Start-Sleep -Seconds 30  # Собираем данные каждые 30 секунд вместо интервала отправки
        }
    } else {
        Write-Log "Running once - collecting and sending single activity"
        
        # Собираем одну запись
        $activity = Collect-Activity -Username $username
        
        if ($activity) {
            Write-Log "Collected activity: $($activity.procName) - $($activity.windowTitle)"
            $activityBuffer += $activity
            
            # Отправляем сразу
            Send-ActivityData -ActivityData $activityBuffer
        } else {
            Write-Log "Could not collect activity data"
        }
        
        Write-Log "=== ACTIVITY SCRIPT COMPLETED ==="
    }
    
} catch {
    Write-Log "❌ FATAL ERROR: $($_.Exception.Message)"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    Write-Log "=== ACTIVITY SCRIPT FAILED ==="
    exit 1
}

