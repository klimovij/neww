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
using System.Collections.Generic;

public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);
    
    // Для скриншотов
    [DllImport("user32.dll")]
    public static extern IntPtr GetDesktopWindow();
    [DllImport("user32.dll")]
    public static extern IntPtr GetWindowDC(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern IntPtr ReleaseDC(IntPtr hWnd, IntPtr hDC);
    [DllImport("gdi32.dll")]
    public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);
    [DllImport("gdi32.dll")]
    public static extern IntPtr CreateCompatibleDC(IntPtr hdc);
    [DllImport("gdi32.dll")]
    public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);
    [DllImport("gdi32.dll")]
    public static extern bool DeleteObject(IntPtr hObject);
    [DllImport("gdi32.dll")]
    public static extern bool BitBlt(IntPtr hObject, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hObjSource, int nXSrc, int nYSrc, int dwRop);
    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);
    
    public const int SRCCOPY = 0x00CC0020;
    public const int SM_CXSCREEN = 0;
    public const int SM_CYSCREEN = 1;
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
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
    
    # Получаем username (аналогично Get-Username в других скриптах)
    # 1. Проверяем аргументы командной строки (высший приоритет)
    if ($username) {
        Write-Log "Username получен из аргументов командной строки: $username"
        # Сохраняем в конфиг для будущих запусков
        try {
            if (-not $config) { $config = @{} }
            $config.username = $username
            $configToSave = $config | ConvertTo-Json
            $configToSave | Out-File -FilePath $CONFIG_FILE -Encoding UTF8 -Force
            Write-Log "Username сохранён в конфигурационный файл: $username"
        } catch {
            Write-Log "Error saving config file: $($_.Exception.Message)"
        }
    }
    # 2. Проверяем конфигурационный файл (для автоматического запуска)
    elseif ($config.username -and $config.username.Trim()) {
        $username = $config.username.Trim()
        Write-Log "Username получен из конфигурационного файла: $username"
    }
    # 3. Запрашиваем у пользователя (только при интерактивном запуске)
    else {
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
        } else {
            # Автоматический запуск (через планировщик задач) - используем имя пользователя Windows
            Write-Log "Автоматический запуск: username не найден в конфиге, используем имя текущего пользователя Windows: $env:USERNAME"
            Write-Log "⚠️ ВНИМАНИЕ: Убедитесь, что username '$env:USERNAME' существует в базе данных Mesendger!"
            Write-Log "   Для правильной идентификации запустите скрипт вручную один раз и введите правильный username"
            $username = $env:USERNAME
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

# Функция получения всех процессов с окнами
function Get-AllProcessesWithWindows {
    try {
        $processesWithWindows = @{}
        
        # Получаем все процессы текущего пользователя, у которых есть окна
        # Изменено: собираем ВСЕ процессы с MainWindowHandle, даже если заголовок пустой
        $allProcesses = Get-Process | Where-Object {
            $null -ne $_.MainWindowHandle -and
            $_.MainWindowHandle -ne [IntPtr]::Zero
        }
        
        foreach ($proc in $allProcesses) {
            try {
                $procName = $proc.ProcessName
                
                # Пропускаем системные процессы
                if ($procName -match "^(dwm|csrss|winlogon|services|lsass|svchost|explorer|SearchUI|RuntimeBroker)$") {
                    continue
                }
                
                if (-not $processesWithWindows.ContainsKey($procName)) {
                    $processesWithWindows[$procName] = @{
                        processName = $procName
                        windowTitles = @()
                    }
                }
                
                # Добавляем заголовок окна, если он есть, иначе используем имя процесса
                if ($proc.MainWindowTitle -and $proc.MainWindowTitle.Length -gt 0) {
                    $windowTitle = $proc.MainWindowTitle.Trim()
                    if ($windowTitle -and -not ($processesWithWindows[$procName].windowTitles -contains $windowTitle)) {
                        $processesWithWindows[$procName].windowTitles += $windowTitle
                    }
                } else {
                    # Если заголовок пустой, используем имя процесса
                    $processDisplayName = $procName
                    if (-not ($processesWithWindows[$procName].windowTitles -contains $processDisplayName)) {
                        $processesWithWindows[$procName].windowTitles += $processDisplayName
                    }
                }
            } catch {
                # Игнорируем ошибки доступа к процессу, но логируем для отладки
                Write-Log "Warning: Could not access process $($proc.ProcessName): $($_.Exception.Message)"
                continue
            }
        }
        
        return $processesWithWindows
    } catch {
        Write-Log "Error getting processes with windows: $($_.Exception.Message)"
        return @{}
    }
}

# Функция сбора данных активности (улучшена для работы в фоновом режиме)
function Collect-Activity {
    param([string]$Username)
    
    try {
        if (-not $Username) {
            $Username = $env:USERNAME
        }
        $now = Get-Date
        $timestamp = $now.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        
        # Пытаемся получить активное окно (работает только в интерактивном сеансе)
        $activeWindow = "Unknown"
        $activeHwnd = [IntPtr]::Zero
        $processName = "Unknown"
        $browserUrl = ""
        
        try {
            $activeHwnd = [Win32]::GetForegroundWindow()
            if ($activeHwnd -ne [IntPtr]::Zero) {
                $activeWindow = Get-ActiveWindow
                
                # Получаем информацию об активном процессе
                $procId = 0
                [Win32]::GetWindowThreadProcessId($activeHwnd, [ref]$procId) | Out-Null
                if ($procId -ne 0) {
                    try {
                        $proc = Get-Process -Id $procId -ErrorAction Stop
                        if ($proc) {
                            $processName = $proc.ProcessName
                            
                            # Проверяем, является ли процесс браузером
                            $procNameLower = $processName.ToLower()
                            if ($procNameLower -match "chrome|msedge|firefox|opera") {
                                # Пытаемся извлечь URL из заголовка окна
                                if ($activeWindow -match "http[s]?://[^\s]+") {
                                    $browserUrl = $Matches[0]
                                } elseif ($activeWindow -match "http") {
                                    $browserUrl = $activeWindow
                                } else {
                                    # Используем заголовок окна как URL, если он содержит домен
                                    if ($activeWindow -match "[-a-zA-Z0-9]+\.[a-zA-Z]{2,}") {
                                        $browserUrl = "https://$($Matches[0])"
                                    } else {
                                        $browserUrl = "${procNameLower}://active-tab"
                                    }
                                }
                            }
                        }
                    } catch {
                        $processName = "Unknown"
                    }
                }
            }
        } catch {
            # GetForegroundWindow не работает в фоновом режиме - это нормально
            Write-Log "GetForegroundWindow не доступен (фоновый режим), используем альтернативный метод"
        }
        
        # Если не удалось получить активное окно, используем альтернативный метод
        # Получаем процесс с самым большим временем работы процессора (вероятно, активный)
        if ($processName -eq "Unknown" -or $activeHwnd -eq [IntPtr]::Zero) {
            try {
                # Получаем все процессы с окнами текущего пользователя
                $allProcesses = Get-Process | Where-Object {
                    $null -ne $_.MainWindowHandle -and
                    $_.MainWindowHandle -ne [IntPtr]::Zero -and
                    $_.MainWindowTitle -and $_.MainWindowTitle.Length -gt 0
                } | Sort-Object -Property CPU -Descending | Select-Object -First 1
                
                if ($allProcesses) {
                    $proc = $allProcesses
                    $processName = $proc.ProcessName
                    $activeWindow = $proc.MainWindowTitle
                    
                    # Проверяем, является ли процесс браузером
                    $procNameLower = $processName.ToLower()
                    if ($procNameLower -match "chrome|msedge|firefox|opera") {
                        # Пытаемся извлечь URL из заголовка окна
                        if ($activeWindow -match "http[s]?://[^\s]+") {
                            $browserUrl = $Matches[0]
                        } elseif ($activeWindow -match "http") {
                            $browserUrl = $activeWindow
                        } else {
                            # Используем заголовок окна как URL, если он содержит домен
                            if ($activeWindow -match "[-a-zA-Z0-9]+\.[a-zA-Z]{2,}") {
                                $browserUrl = "https://$($Matches[0])"
                            } else {
                                $browserUrl = "${procNameLower}://active-tab"
                            }
                        }
                    }
                }
            } catch {
                Write-Log "Error getting alternative process info: $($_.Exception.Message)"
            }
        }
        
        # Создаем основную запись для активного окна
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

# Функция создания скриншота (улучшена для работы в фоновом режиме)
function Take-Screenshot {
    try {
        Write-Log "Attempting to create screenshot..."
        
        # Метод 1: Пытаемся использовать .NET Screen API (работает в интерактивном режиме)
        $screenshotPath = $null
        try {
            $screen = [System.Windows.Forms.Screen]::PrimaryScreen
            if ($screen) {
                $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
                Write-Log "Screenshot: Screen bounds: $($bounds.Width)x$($bounds.Height)"
                
                $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
                $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
                
                try {
                    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
                    Write-Log "Screenshot: CopyFromScreen succeeded (method 1)"
                    
                    # Сохраняем скриншот
                    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
                    $screenshotPath = Join-Path $SCREENSHOTS_DIR "screenshot_$timestamp.jpg"
                    
                    if (-not (Test-Path $SCREENSHOTS_DIR)) {
                        New-Item -ItemType Directory -Path $SCREENSHOTS_DIR -Force | Out-Null
                    }
                    
                    $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
                    if ($jpegCodec) {
                        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
                        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 80)
                        $bitmap.Save($screenshotPath, $jpegCodec, $encoderParams)
                        
                        if (Test-Path $screenshotPath) {
                            $fileSize = (Get-Item $screenshotPath).Length
                            Write-Log "Screenshot created successfully (method 1): $screenshotPath ($fileSize bytes)"
                            $graphics.Dispose()
                            $bitmap.Dispose()
                            return $screenshotPath
                        }
                    }
                    
                    $graphics.Dispose()
                    $bitmap.Dispose()
                } catch {
                    Write-Log "Screenshot: CopyFromScreen failed (method 1): $($_.Exception.Message)"
                    $graphics.Dispose()
                    $bitmap.Dispose()
                }
            }
        } catch {
            Write-Log "Screenshot: Screen API not available (method 1): $($_.Exception.Message)"
        }
        
        # Метод 2: Используем Windows API напрямую (может работать в фоновом режиме)
        Write-Log "Screenshot: Trying method 2 (Windows API)..."
        try {
            $width = [Win32]::GetSystemMetrics([Win32]::SM_CXSCREEN)
            $height = [Win32]::GetSystemMetrics([Win32]::SM_CYSCREEN)
            
            if ($width -gt 0 -and $height -gt 0) {
                Write-Log "Screenshot: Screen size via API: ${width}x${height}"
                
                $desktopHwnd = [Win32]::GetDesktopWindow()
                $desktopDC = [Win32]::GetWindowDC($desktopHwnd)
                
                if ($desktopDC -ne [IntPtr]::Zero) {
                    $memoryDC = [Win32]::CreateCompatibleDC($desktopDC)
                    if ($memoryDC -ne [IntPtr]::Zero) {
                        $bitmap = [Win32]::CreateCompatibleBitmap($desktopDC, $width, $height)
                        if ($bitmap -ne [IntPtr]::Zero) {
                            $oldBitmap = [Win32]::SelectObject($memoryDC, $bitmap)
                            $result = [Win32]::BitBlt($memoryDC, 0, 0, $width, $height, $desktopDC, 0, 0, [Win32]::SRCCOPY)
                            
                            if ($result) {
                                # Конвертируем в .NET Bitmap
                                $netBitmap = [System.Drawing.Image]::FromHbitmap($bitmap)
                                
                                # Сохраняем скриншот
                                $timestamp = Get-Date -Format "yyyyMMddHHmmss"
                                $screenshotPath = Join-Path $SCREENSHOTS_DIR "screenshot_$timestamp.jpg"
                                
                                if (-not (Test-Path $SCREENSHOTS_DIR)) {
                                    New-Item -ItemType Directory -Path $SCREENSHOTS_DIR -Force | Out-Null
                                }
                                
                                $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
                                if ($jpegCodec) {
                                    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
                                    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 80)
                                    $netBitmap.Save($screenshotPath, $jpegCodec, $encoderParams)
                                    
                                    if (Test-Path $screenshotPath) {
                                        $fileSize = (Get-Item $screenshotPath).Length
                                        Write-Log "Screenshot created successfully (method 2): $screenshotPath ($fileSize bytes)"
                                    }
                                }
                                
                                $netBitmap.Dispose()
                                [Win32]::SelectObject($memoryDC, $oldBitmap) | Out-Null
                            }
                            
                            [Win32]::DeleteObject($bitmap) | Out-Null
                        }
                        [Win32]::DeleteObject($memoryDC) | Out-Null
                    }
                    [Win32]::ReleaseDC($desktopHwnd, $desktopDC) | Out-Null
                }
                
                if ($screenshotPath -and (Test-Path $screenshotPath)) {
                    return $screenshotPath
                }
            }
        } catch {
            Write-Log "Screenshot: Windows API method failed (method 2): $($_.Exception.Message)"
        }
        
        Write-Log "Screenshot: All methods failed, screenshot cannot be created"
        return $null
    } catch {
        Write-Log "Error creating screenshot: $($_.Exception.Message)"
        Write-Log "Stack trace: $($_.ScriptStackTrace)"
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
        
        # Формируем multipart/form-data вручную (исправлено для правильной работы)
        $boundary = [System.Guid]::NewGuid().ToString()
        $fileBytes = [System.IO.File]::ReadAllBytes($ScreenshotPath)
        $newline = "`r`n"
        
        # Создаём multipart body
        $bodyParts = New-Object System.Collections.ArrayList
        
        # Username
        $usernamePart = "--$boundary$newline"
        $usernamePart += "Content-Disposition: form-data; name=`"username`"$newline"
        $usernamePart += "$newline"
        $usernamePart += "$Username$newline"
        [void]$bodyParts.Add([System.Text.Encoding]::UTF8.GetBytes($usernamePart))
        
        # Timestamp
        $timestampPart = "--$boundary$newline"
        $timestampPart += "Content-Disposition: form-data; name=`"timestamp`"$newline"
        $timestampPart += "$newline"
        $timestampPart += "$Timestamp$newline"
        [void]$bodyParts.Add([System.Text.Encoding]::UTF8.GetBytes($timestampPart))
        
        # File
        $filePart = "--$boundary$newline"
        $filePart += "Content-Disposition: form-data; name=`"screenshot`"; filename=`"$fileName`"$newline"
        $filePart += "Content-Type: image/jpeg$newline"
        $filePart += "$newline"
        [void]$bodyParts.Add([System.Text.Encoding]::UTF8.GetBytes($filePart))
        [void]$bodyParts.Add($fileBytes)
        
        # End boundary
        $endPart = "$newline--$boundary--$newline"
        [void]$bodyParts.Add([System.Text.Encoding]::UTF8.GetBytes($endPart))
        
        # Объединяем все части
        $totalLength = ($bodyParts | Measure-Object -Property Length -Sum).Sum
        $fullBody = New-Object byte[] $totalLength
        $offset = 0
        foreach ($part in $bodyParts) {
            [System.Buffer]::BlockCopy($part, 0, $fullBody, $offset, $part.Length)
            $offset += $part.Length
        }
        
        Write-Log "Multipart body size: $totalLength bytes"
        Write-Log "File size: $($fileBytes.Length) bytes"
        
        # Отправляем запрос
        $headers = @{
            "X-API-Key" = $API_KEY
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        }
        
        try {
            Write-Log "Sending screenshot to: $url"
            Write-Log "File size: $($fileBytes.Length) bytes"
            Write-Log "Boundary: $boundary"
            
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
                Write-Log "Response: $($response.Content)"
                return $false
            }
        } catch {
            $errorMsg = $_.Exception.Message
            Write-Log "❌ Error sending screenshot: $errorMsg"
            
            if ($_.Exception.Response) {
                try {
                    $stream = $_.Exception.Response.GetResponseStream()
                    $reader = New-Object System.IO.StreamReader($stream)
                    $responseBody = $reader.ReadToEnd()
                    Write-Log "Response body: $responseBody"
                    $reader.Close()
                    $stream.Close()
                } catch {
                    Write-Log "Could not read error response: $($_.Exception.Message)"
                }
            }
            
            # Не удаляем файл при ошибке, чтобы можно было повторить отправку
            Write-Log "Screenshot file kept for retry: $ScreenshotPath"
            
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
            
            # Собираем данные активности (активное окно)
            $activity = Collect-Activity -Username $username
            
            if ($activity) {
                $activityBuffer += $activity
                Write-Log "Collected activity: $($activity.procName) - $($activity.windowTitle)"
                
                # Собираем все открытые программы каждый раз (но с умной дедупликацией)
                # Это гарантирует, что все открытые программы попадут в активность
                try {
                    $allProcesses = Get-AllProcessesWithWindows
                    $collectedCount = 0
                    $activeProcName = $activity.procName  # Запоминаем активный процесс
                    
                    foreach ($procName in $allProcesses.Keys) {
                        # Пропускаем активный процесс - он уже добавлен выше с правильным URL
                        if ($procName -eq $activeProcName) {
                            continue
                        }
                        
                        $procInfo = $allProcesses[$procName]
                        # Теперь собираем даже если windowTitles пустой (будет использовано имя процесса)
                        if ($procInfo.windowTitles -and $procInfo.windowTitles.Count -gt 0) {
                            $windowTitle = $procInfo.windowTitles[0]
                        } else {
                            $windowTitle = $procName  # Используем имя процесса, если заголовка нет
                        }
                        
                        # Проверяем, нет ли уже такой записи в буфере за последние 30 секунд (сократили время)
                        $exists = $null
                        foreach ($bufItem in $activityBuffer) {
                            if ($bufItem.procName -eq $procName) {
                                try {
                                    $timeDiff = (New-TimeSpan -Start (Get-Date $bufItem.timestamp) -End $now).TotalSeconds
                                    if ($timeDiff -lt 30) {  # Уменьшили с 120 до 30 секунд для более частого обновления
                                        $exists = $bufItem
                                        break
                                    }
                                } catch {
                                    # Игнорируем ошибки парсинга времени
                                }
                            }
                        }
                        
                        if (-not $exists) {
                            $procTimestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                            
                            # Для браузеров стараемся сохранить URL, если есть в windowTitle
                            $browserUrl = ""
                            $procNameLower = $procName.ToLower()
                            if ($procNameLower -match "chrome|msedge|firefox|opera") {
                                # Пытаемся извлечь URL из заголовка окна
                                if ($windowTitle -match "http[s]?://[^\s]+") {
                                    $browserUrl = $Matches[0]
                                } elseif ($windowTitle -match "http") {
                                    $browserUrl = $windowTitle
                                } else {
                                    # Используем заголовок окна как URL, если он содержит домен
                                    if ($windowTitle -match "[-a-zA-Z0-9]+\.[a-zA-Z]{2,}") {
                                        $browserUrl = "https://$($Matches[0])"
                                    } else {
                                        $browserUrl = "${procNameLower}://active-tab"
                                    }
                                }
                            }
                            
                            $procActivity = @{
                                username = $username
                                timestamp = $procTimestamp
                                idleMinutes = 0
                                procName = $procName
                                windowTitle = $windowTitle
                                browserUrl = $browserUrl
                            }
                            $activityBuffer += $procActivity
                            $collectedCount++
                            Write-Log "Added process to buffer: $procName - $windowTitle"
                        }
                    }
                    
                    if ($collectedCount -gt 0) {
                        Write-Log "Collected $collectedCount additional open programs"
                    }
                } catch {
                    Write-Log "Error collecting all programs: $($_.Exception.Message)"
                }
                
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
                    Write-Log "Time to take screenshot (interval: $screenshotIntervalSeconds seconds, elapsed: $timeSinceLastScreenshot seconds)"
                    $screenshotPath = Take-Screenshot
                    if ($screenshotPath) {
                        Write-Log "Screenshot created, attempting to send: $screenshotPath"
                        $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                        if (Send-Screenshot -ScreenshotPath $screenshotPath -Username $username -Timestamp $timestamp) {
                            $lastScreenshotTime = $now
                            Write-Log "✅ Screenshot sent successfully"
                        } else {
                            Write-Log "❌ Failed to send screenshot"
                        }
                    } else {
                        Write-Log "⚠️ Screenshot creation returned null (may be in background mode or no GUI access)"
                    }
                } catch {
                    Write-Log "❌ Error in screenshot process: $($_.Exception.Message)"
                    Write-Log "Stack trace: $($_.ScriptStackTrace)"
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

