#Requires -Version 5.1
<#
.SYNOPSIS
    Employee Activity Monitoring Agent - Corporate HR Tool
.DESCRIPTION
    This is a legitimate corporate activity monitoring agent approved by IT/HR department.
    It tracks employee computer activity (applications, websites, screenshots) for HR time tracking.
    This script is safe and authorized by company policy.
    
    Author: IT Department
    Purpose: HR Time Tracking and Productivity Monitoring
    Data Destination: Company Internal Server (35.232.108.72)
    
    If your antivirus blocks this script, please add an exception for:
    - File: pc_activity_agent.ps1
    - Folder: C:\Users\Ronin\web\pc-worktime
.PARAMETER User
    Optional: Username for activity tracking (defaults to current user)
.EXAMPLE
    .\pc_activity_agent.ps1
    .\pc_activity_agent.ps1 -User "Ksendzik_Oleg"
#>

param(
    [string]$User = $env:USERNAME
)

# Set execution policy bypass for this session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force -ErrorAction SilentlyContinue

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ⚙️ НАСТРОЙКА ДЛЯ КОНКРЕТНОГО СОТРУДНИКА
# --------------------------------------
# ВАЖНО: здесь ИСПОЛЬЗУЕМ ТОЛЬКО ЛАТИНИЦУ (без русских букв),
# а красивое ФИО берём из таблицы users на сервере.

# Логин сотрудника (должен совпадать с полем users.username на сервере)
$UserUsername = "Ksendzik_Oleg"     # ← здесь ты для каждого ставишь свой логин: ivan_ivanov, petrov_petr и т.п.

# Адрес сервера и ключ (одинаковые для всех ПК)
$GOOGLE_SERVER_URL       = "http://35.232.108.72"
$REMOTE_WORKTIME_API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="

# --------------------------------------

# Настройки агента
$LogsDir = "C:\pc-worktime\logs"
$ScreenshotsDir = "C:\pc-worktime\screenshots"
$SendIntervalMinutes = 5  # Отправляем данные каждые 5 минут (для продакшена)
$MaxEventsPerBatch = 50   # Максимум событий в одной пачке (для продакшена)
$ScreenshotIntervalMinutes = 15  # Делаем скриншот каждые 15 минут

# Создаём папки для логов и скриншотов, если их нет
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
}
if (-not (Test-Path $ScreenshotsDir)) {
    New-Item -ItemType Directory -Path $ScreenshotsDir -Force | Out-Null
}

$LogFile = Join-Path $LogsDir "activity_$(Get-Date -Format 'yyyy-MM-dd').jsonl"
Write-Host "Writing activity log to: $LogFile"

# Функция для получения активности
function Get-ActivityData {
    $timestamp = (Get-Date).ToString("o")
    $idleMinutes = 0
    $procName = "unknown"
    $windowTitle = ""
    
    try {
        # Получаем время простоя системы (idle time)
        $lastInput = [System.Windows.Forms.Cursor]::Position
        Add-Type -AssemblyName System.Windows.Forms
        $idleTime = [System.Windows.Forms.SystemInformation]::IdleTime
        $idleMinutes = [Math]::Floor($idleTime / 1000 / 60)  # Конвертируем миллисекунды в минуты
    } catch {
        # Если не удалось получить idle time, пробуем через Win32 API
        try {
            Add-Type -TypeDefinition @"
                using System;
                using System.Runtime.InteropServices;
                public class IdleTime {
                    [DllImport("user32.dll")]
                    static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
                    [StructLayout(LayoutKind.Sequential)]
                    struct LASTINPUTINFO {
                        public uint cbSize;
                        public uint dwTime;
                    }
                    public static TimeSpan GetIdleTime() {
                        LASTINPUTINFO lii = new LASTINPUTINFO();
                        lii.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO));
                        GetLastInputInfo(ref lii);
                        return TimeSpan.FromMilliseconds(Environment.TickCount - lii.dwTime);
                    }
                }
"@
            $idleSpan = [IdleTime]::GetIdleTime()
            $idleMinutes = [Math]::Floor($idleSpan.TotalMinutes)
        } catch {
            $idleMinutes = 0
        }
    }
    
    # Получаем активное окно и процесс
    try {
        Add-Type -TypeDefinition @"
            using System;
            using System.Runtime.InteropServices;
            using System.Text;
            public class WindowInfo {
                [DllImport("user32.dll")]
                static extern IntPtr GetForegroundWindow();
                [DllImport("user32.dll")]
                static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
                [DllImport("user32.dll", SetLastError = true)]
                static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
                public static string GetActiveWindowTitle() {
                    IntPtr hWnd = GetForegroundWindow();
                    StringBuilder title = new StringBuilder(256);
                    GetWindowText(hWnd, title, title.Capacity);
                    return title.ToString();
                }
                public static uint GetActiveProcessId() {
                    IntPtr hWnd = GetForegroundWindow();
                    uint processId = 0;
                    GetWindowThreadProcessId(hWnd, out processId);
                    return processId;
                }
            }
"@
        $windowTitle = [WindowInfo]::GetActiveWindowTitle()
        $processId = [WindowInfo]::GetActiveProcessId()
        
        if ($processId -gt 0) {
            try {
                $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($proc) {
                    $procName = $proc.ProcessName
                }
            } catch {
                $procName = "unknown"
            }
        }
    } catch {
        $procName = "unknown"
        $windowTitle = ""
    }
    
    # Извлекаем URL из заголовка окна браузера
    $browserUrl = ""
    if ($procName -match "^(chrome|msedge|firefox|opera|brave)$") {
        # Пытаемся извлечь URL из заголовка окна
        # Формат может быть разным: "Title - Browser" или "URL - Browser" или просто URL
        # Используем простой паттерн без проблемных символов
        if ($windowTitle -match "^(.+?)\s*[-\u2013\u2014]\s*(chrome|msedge|firefox|opera|brave)") {
            $potentialUrl = $matches[1].Trim()
            # Проверяем, похоже ли на URL (начинается с http/https/www или содержит точку и доменное расширение)
            if ($potentialUrl -match "^(https?://|www\.|[a-zA-Z0-9\-]+\.[a-zA-Z]{2,})") {
                $browserUrl = $potentialUrl
                # Если не начинается с http:// или https://, добавляем https://
                if ($browserUrl -notmatch "^https?://") {
                    $browserUrl = "https://" + $browserUrl
                }
            }
        } elseif ($windowTitle -match "^https?://") {
            # Если весь заголовок - это URL
            $browserUrl = $windowTitle
        }
    }
    
    return @{
        username = $UserUsername
        timestamp = $timestamp
        idleMinutes = $idleMinutes
        procName = $procName
        windowTitle = $windowTitle
        browserUrl = $browserUrl
    }
}

# Функция для создания скриншота
function Take-Screenshot {
    param([string]$OutputPath)
    
    try {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        
        # Получаем размер экрана
        $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
        $width = $bounds.Width
        $height = $bounds.Height
        $left = $bounds.Left
        $top = $bounds.Top
        
        # Создаём bitmap
        $bitmap = New-Object System.Drawing.Bitmap $width, $height
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        
        # Делаем скриншот
        $graphics.CopyFromScreen($left, $top, 0, 0, $bitmap.Size)
        
        # Сохраняем в файл (JPEG с качеством 80%)
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 80)
        $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
        
        if ($jpegCodec) {
            $bitmap.Save($OutputPath, $jpegCodec, $encoderParams)
        } else {
            # Если кодек не найден, используем стандартный метод
            $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        }
        
        # Освобождаем ресурсы
        $graphics.Dispose()
        $bitmap.Dispose()
        $encoderParams.Dispose()
        
        return $true
    } catch {
        Write-Host "[$(Get-Date -Format 'u')] ERROR taking screenshot: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Функция для отправки скриншота на сервер
function Send-Screenshot {
    param([string]$ScreenshotPath)
    
    if (-not (Test-Path $ScreenshotPath)) {
        Write-Host "[$(Get-Date -Format 'u')] Screenshot file not found: $ScreenshotPath"
        return $false
    }
    
    $apiUrl = "$GOOGLE_SERVER_URL/api/activity-screenshot"
    $headers = @{
        "X-API-Key" = $REMOTE_WORKTIME_API_KEY
    }
    
    try {
        # Читаем файл скриншота
        $fileBytes = [System.IO.File]::ReadAllBytes($ScreenshotPath)
        $fileName = Split-Path $ScreenshotPath -Leaf
        
        # Создаём multipart/form-data
        $boundary = [System.Guid]::NewGuid().ToString()
        $CRLF = "`r`n"
        $bodyLines = @()
        
        # Добавляем username
        $bodyLines += "--$boundary"
        $bodyLines += "Content-Disposition: form-data; name=`"username`""
        $bodyLines += ""
        $bodyLines += $UserUsername
        
        # Добавляем timestamp
        $bodyLines += "--$boundary"
        $bodyLines += "Content-Disposition: form-data; name=`"timestamp`""
        $bodyLines += ""
        $bodyLines += (Get-Date).ToString("o")
        
        # Добавляем файл
        $bodyLines += "--$boundary"
        $bodyLines += "Content-Disposition: form-data; name=`"screenshot`"; filename=`"$fileName`""
        $bodyLines += "Content-Type: image/jpeg"
        $bodyLines += ""
        
        # Конвертируем в байты
        $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($($bodyLines -join $CRLF) + $CRLF)
        $footerBytes = [System.Text.Encoding]::UTF8.GetBytes($CRLF + "--$boundary--" + $CRLF)
        
        $body = $headerBytes + $fileBytes + $footerBytes
        
        $headers["Content-Type"] = "multipart/form-data; boundary=$boundary"
        
        Write-Host "[$(Get-Date -Format 'u')] Sending screenshot to server: $fileName ($($fileBytes.Length) bytes)"
        
        $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $body -TimeoutSec 30
        
        Write-Host "[$(Get-Date -Format 'u')] ✅ Screenshot sent successfully: $($response.success)"
        return $true
    } catch {
        $errorMsg = $_.Exception.Message
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($_.ErrorDetails.Message) {
            $errorMsg += " | Details: $($_.ErrorDetails.Message)"
        }
        Write-Host "[$(Get-Date -Format 'u')] ❌ ERROR sending screenshot (Status: $statusCode): $errorMsg" -ForegroundColor Red
        return $false
    }
}

# Функция для отправки данных на сервер
function Send-ActivityBatch {
    param([array]$Events)
    
    if ($Events.Count -eq 0) {
        Write-Host "[$(Get-Date -Format 'u')] No events to send"
        return $false
    }
    
    $apiUrl = "$GOOGLE_SERVER_URL/api/activity-log-batch"
    $headers = @{
        "X-API-Key" = $REMOTE_WORKTIME_API_KEY
        "Content-Type" = "application/json; charset=utf-8"
    }
    
    # Преобразуем события в формат, который ожидает сервер
    $eventsToSend = @()
    foreach ($event in $Events) {
        # Функция для строгой очистки строк для JSON
        function Clean-StringForJson {
            param([string]$str)
            if (-not $str) { return '' }
            # Удаляем все управляющие символы (кроме разрешенных)
            $cleaned = $str -replace '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]', ''
            # Удаляем BOM и другие проблемные символы
            $cleaned = $cleaned.Trim()
            # Ограничиваем длину
            if ($cleaned.Length -gt 512) {
                $cleaned = $cleaned.Substring(0, 512)
            }
            return $cleaned
        }
        
        $cleanWindowTitle = Clean-StringForJson -str $event.windowTitle
        $cleanProcName = Clean-StringForJson -str $event.procName
        $cleanBrowserUrl = Clean-StringForJson -str $event.browserUrl
        
        $cleanEvent = @{
            username = [string]$event.username
            timestamp = [string]$event.timestamp
            idleMinutes = [int]$event.idleMinutes
            procName = $cleanProcName
            windowTitle = $cleanWindowTitle
        }
        
        # Добавляем browserUrl, если есть
        if ($cleanBrowserUrl) {
            $cleanEvent.browserUrl = $cleanBrowserUrl
        }
        
        $eventsToSend += $cleanEvent
    }
    
    # Используем .NET System.Web.Script.Serialization для более надежной сериализации JSON
    $body = $null
    try {
        Add-Type -AssemblyName System.Web.Extensions -ErrorAction Stop
        $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
        $serializer.MaxJsonLength = [Int32]::MaxValue
        $body = $serializer.Serialize($eventsToSend)
        Write-Host "[$(Get-Date -Format 'u')] Using .NET JavaScriptSerializer for JSON encoding" -ForegroundColor Green
    } catch {
        # Если .NET сериализатор не доступен, используем PowerShell ConvertTo-Json
        Write-Host "[$(Get-Date -Format 'u')] Warning: Using PowerShell ConvertTo-Json fallback" -ForegroundColor Yellow
        $body = $eventsToSend | ConvertTo-Json -Depth 10 -Compress
    }
    
    # Проверяем валидность JSON перед отправкой
    try {
        $testParse = $body | ConvertFrom-Json -ErrorAction Stop
        if (-not $testParse) {
            Write-Host "[$(Get-Date -Format 'u')] Error: JSON parse returned null!" -ForegroundColor Red
            return $false
        }
        Write-Host "[$(Get-Date -Format 'u')] JSON validation passed: $($testParse.Count) events" -ForegroundColor Green
    } catch {
        Write-Host "[$(Get-Date -Format 'u')] Error: Generated JSON is invalid! $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "[$(Get-Date -Format 'u')] JSON preview (first 500 chars): $($body.Substring(0, [Math]::Min(500, $body.Length)))" -ForegroundColor Yellow
        return $false
    }
    
    # Логируем детали отправки
    Write-Host "[$(Get-Date -Format 'u')] Sending batch of $($Events.Count) events to server..."
    Write-Host "[$(Get-Date -Format 'u')] URL: $apiUrl"
    Write-Host "[$(Get-Date -Format 'u')] API Key (first 10 chars): $($REMOTE_WORKTIME_API_KEY.Substring(0, [Math]::Min(10, $REMOTE_WORKTIME_API_KEY.Length)))..."
    Write-Host "[$(Get-Date -Format 'u')] Body preview: $($body.Substring(0, [Math]::Min(200, $body.Length)))..."
    
    try {
        # Отправляем JSON как UTF-8 байты для гарантированной совместимости
        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
        $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $bodyBytes -ContentType "application/json; charset=utf-8" -TimeoutSec 15
        Write-Host "[$(Get-Date -Format 'u')] ✅ Successfully sent batch: imported=$($response.imported), total=$($response.total)" -ForegroundColor Green
        Write-Host "[$(Get-Date -Format 'u')] RESPONSE: $($response | ConvertTo-Json -Depth 5)"
        return $true
    } catch {
        $errorMsg = $_.Exception.Message
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($_.ErrorDetails.Message) {
            $errorMsg += " | Details: $($_.ErrorDetails.Message)"
        }
        Write-Host "[$(Get-Date -Format 'u')] ❌ ERROR sending batch (Status: $statusCode): $errorMsg" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "[$(Get-Date -Format 'u')] Error response: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        return $false
    }
}

# Функция для чтения неотправленных событий из лог-файла
function Read-UnsentEvents {
    if (-not (Test-Path $LogFile)) {
        return @()
    }
    
    $events = @()
    try {
        $lines = Get-Content $LogFile -ErrorAction SilentlyContinue
        foreach ($line in $lines) {
            if ($line -match '"sent":\s*false') {
                try {
                    $event = $line | ConvertFrom-Json
                    $events += $event
                } catch {
                    # Пропускаем некорректные строки
                }
            }
        }
    } catch {
        Write-Host "Error reading log file: $($_.Exception.Message)"
    }
    
    return $events
}

# Функция для пометки событий как отправленных
function Mark-EventsAsSent {
    param([array]$SentEvents)
    
    if (-not (Test-Path $LogFile) -or $SentEvents.Count -eq 0) {
        return
    }
    
    try {
        $lines = Get-Content $LogFile -ErrorAction SilentlyContinue
        $newLines = @()
        
        foreach ($line in $lines) {
            try {
                $event = $line | ConvertFrom-Json
                $eventTimestamp = $event.timestamp
                
                # Проверяем, было ли это событие отправлено
                $wasSent = $false
                foreach ($sentEvent in $SentEvents) {
                    if ($sentEvent.timestamp -eq $eventTimestamp) {
                        $wasSent = $true
                        break
                    }
                }
                
                if ($wasSent) {
                    $event | Add-Member -NotePropertyName "sent" -NotePropertyValue $true -Force
                } else {
                    if (-not $event.sent) {
                        $event | Add-Member -NotePropertyName "sent" -NotePropertyValue $false -Force
                    }
                }
                
                $newLines += ($event | ConvertTo-Json -Compress)
            } catch {
                # Сохраняем исходную строку, если не удалось распарсить
                $newLines += $line
            }
        }
        
        # Перезаписываем файл
        $newLines | Out-File -FilePath $LogFile -Encoding UTF8 -Force
    } catch {
        Write-Host "Error marking events as sent: $($_.Exception.Message)"
    }
}

# Основной цикл агента
Write-Host "[$(Get-Date -Format 'u')] Starting activity agent for user: $UserUsername"

$lastSendTime = Get-Date
$lastScreenshotTime = Get-Date
$localEvents = @()

while ($true) {
    try {
        # Собираем данные активности
        $activityData = Get-ActivityData
        
        # Добавляем флаг отправки
        $activityData | Add-Member -NotePropertyName "sent" -NotePropertyValue $false
        
        # Сохраняем в локальный файл
        $jsonLine = $activityData | ConvertTo-Json -Compress
        $jsonLine | Out-File -FilePath $LogFile -Append -Encoding UTF8
        
        # Добавляем в буфер для отправки
        $localEvents += $activityData
        
        $titlePreview = if ($activityData.windowTitle.Length -gt 30) { $activityData.windowTitle.Substring(0, 30) + "..." } else { $activityData.windowTitle }
        $urlInfo = if ($activityData.browserUrl) { ", URL=$($activityData.browserUrl)" } else { "" }
        Write-Host "[$(Get-Date -Format 'u')] Activity logged: idle=$($activityData.idleMinutes)min, proc=$($activityData.procName), title=$titlePreview$urlInfo"
        
        # Проверяем, нужно ли сделать скриншот
        $timeSinceLastScreenshot = (Get-Date) - $lastScreenshotTime
        if ($timeSinceLastScreenshot.TotalMinutes -ge $ScreenshotIntervalMinutes) {
            $screenshotFileName = "screenshot_$($UserUsername)_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').jpg"
            $screenshotPath = Join-Path $ScreenshotsDir $screenshotFileName
            
            Write-Host "[$(Get-Date -Format 'u')] Taking screenshot: $screenshotFileName"
            $screenshotSuccess = Take-Screenshot -OutputPath $screenshotPath
            
            if ($screenshotSuccess -and (Test-Path $screenshotPath)) {
                Write-Host "[$(Get-Date -Format 'u')] Screenshot saved: $screenshotPath"
                
                # Пытаемся отправить скриншот на сервер
                $sendSuccess = Send-Screenshot -ScreenshotPath $screenshotPath
                
                if ($sendSuccess) {
                    # Если скриншот успешно отправлен, можем его удалить (опционально)
                    # Remove-Item $screenshotPath -Force
                    Write-Host "[$(Get-Date -Format 'u')] Screenshot sent and can be removed"
                } else {
                    # Если не удалось отправить, оставляем файл для следующей попытки
                    Write-Host "[$(Get-Date -Format 'u')] Screenshot kept for later retry"
                }
                
                $lastScreenshotTime = Get-Date
            } else {
                Write-Host "[$(Get-Date -Format 'u')] Failed to create screenshot" -ForegroundColor Red
            }
        }
        
        # Проверяем, нужно ли отправить данные
        $timeSinceLastSend = (Get-Date) - $lastSendTime
        $shouldSend = $timeSinceLastSend.TotalMinutes -ge $SendIntervalMinutes -or $localEvents.Count -ge $MaxEventsPerBatch
        
        Write-Host "[$(Get-Date -Format 'u')] Check send: timeSinceLastSend=$([Math]::Round($timeSinceLastSend.TotalMinutes, 2))min, localEvents=$($localEvents.Count), shouldSend=$shouldSend"
        
        if ($shouldSend) {
            # Объединяем локальные события с неотправленными из файла
            $unsentEvents = Read-UnsentEvents
            Write-Host "[$(Get-Date -Format 'u')] Found $($unsentEvents.Count) unsent events in log file"
            
            $allEventsToSend = $localEvents + $unsentEvents
            
            if ($allEventsToSend.Count -gt 0) {
                Write-Host "[$(Get-Date -Format 'u')] Preparing to send $($allEventsToSend.Count) events..."
                # Отправляем пачку
                $success = Send-ActivityBatch -Events $allEventsToSend
                
                if ($success) {
                    # Помечаем события как отправленные
                    Mark-EventsAsSent -SentEvents $allEventsToSend
                    $localEvents = @()
                    $lastSendTime = Get-Date
                    Write-Host "[$(Get-Date -Format 'u')] ✅ Events marked as sent"
                } else {
                    Write-Host "[$(Get-Date -Format 'u')] ❌ Failed to send events, will retry later"
                }
            } else {
                Write-Host "[$(Get-Date -Format 'u')] No events to send"
            }
        }
        
        # Ждём 1 минуту перед следующим сбором данных
        # Для теста можно уменьшить до 30 секунд
        Start-Sleep -Seconds 60
    } catch {
        Write-Host "[$(Get-Date -Format 'u')] ERROR in main loop: $($_.Exception.Message)" -ForegroundColor Red
        Start-Sleep -Seconds 60
    }
}

