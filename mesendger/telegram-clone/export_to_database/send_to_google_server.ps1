# PowerShell скрипт для отправки данных мониторинга времени на Google сервер
# Автоматически собирает данные из журнала Windows и отправляет на удаленный сервер

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

param(
    [string]$ServerUrl = "https://your-google-server.com/api",  # URL вашего Google сервера
    [string]$ApiKey = "",  # API ключ для аутентификации (получите у администратора)
    [string]$StartDate = "",  # Начальная дата в формате YYYY-MM-DD (если не указана, берется вчерашний день)
    [string]$EndDate = "",  # Конечная дата в формате YYYY-MM-DD (если не указана, берется вчерашний день)
    [int]$DaysBack = 1,  # Количество дней назад для импорта (по умолчанию 1 - вчерашний день)
    [switch]$Auto  # Автоматический режим (без запросов пользователя)
)

# Настройки
$ErrorActionPreference = "Continue"

# Функция для логирования
function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

# Проверка параметров
if (-not $ServerUrl -or $ServerUrl -eq "https://your-google-server.com/api") {
    Write-Log "❌ Ошибка: Не указан URL сервера!" "Red"
    Write-Log "Используйте параметр -ServerUrl 'https://your-server.com/api'" "Yellow"
    if (-not $Auto) { Read-Host "Нажмите Enter для выхода" }
    exit 1
}

if (-not $ApiKey) {
    Write-Log "❌ Ошибка: Не указан API ключ!" "Red"
    Write-Log "Используйте параметр -ApiKey 'your-api-key' или установите переменную окружения REMOTE_WORKTIME_API_KEY" "Yellow"
    if (-not $Auto) { Read-Host "Нажмите Enter для выхода" }
    exit 1
}

# Определяем диапазон дат
$targetDate = if ($StartDate) { Get-Date $StartDate } else { (Get-Date).AddDays(-$DaysBack) }
$startDate = if ($StartDate) { $targetDate } else { $targetDate.Date.AddHours(0).AddMinutes(0).AddSeconds(0) }
$endDate = if ($EndDate) { Get-Date $EndDate } else { $targetDate.Date.AddHours(23).AddMinutes(59).AddSeconds(59) }

Write-Log "🚀 Начинаем экспорт данных мониторинга времени" "Cyan"
Write-Log "📅 Период: $($startDate.ToString('yyyy-MM-dd HH:mm:ss')) - $($endDate.ToString('yyyy-MM-dd HH:mm:ss'))" "Gray"
Write-Log "🌐 Сервер: $ServerUrl" "Gray"

# Список исключаемых технических аккаунтов
$excludeUsers = @(
    'СИСТЕМА', 'SYSTEM', 'Система', 'System',
    'LOCAL SERVICE', 'NETWORK SERVICE',
    'ANONYMOUS LOGON', 'DEFAULTACCOUNT', 'WDAGUTILITYACCOUNT',
    'UMFD', 'DWM'
)

# Функция для нормализации имени пользователя
function Normalize-Username {
    param([string]$RawUsername)
    if (-not $RawUsername) { return "" }
    $username = $RawUsername.Trim()
    # Убираем кавычки
    $username = $username -replace '^"|"$', ''
    # Убираем домен (DOMAIN\user -> user)
    if ($username -like '*\*') {
        $username = $username.Split('\')[-1]
    }
    return $username
}

# Функция для проверки технического аккаунта
function Is-TechnicalAccount {
    param([string]$Username)
    if (-not $Username) { return $true }
    $normalized = Normalize-Username $Username
    $lower = $normalized.ToLower()
    if ($excludeUsers | Where-Object { $_.ToLower() -eq $lower }) { return $true }
    if ($normalized -match '^DWM-\d+$') { return $true }
    if ($normalized -match '^UMFD-\d+$') { return $true }
    if ($normalized -like '*$') { return $true }  # Машинные аккаунты
    return $false
}

# Функция для проверки доступности сервера
function Test-ServerConnection {
    try {
        $headers = @{
            'X-API-Key' = $ApiKey
            'Content-Type' = 'application/json'
        }
        $response = Invoke-RestMethod -Uri "$ServerUrl/remote-worktime-health" -Method GET -Headers $headers -TimeoutSec 10
        return $true
    } catch {
        return $false
    }
}

# Проверяем подключение к серверу
Write-Log "🔌 Проверяем подключение к серверу..." "Yellow"
if (-not (Test-ServerConnection)) {
    Write-Log "❌ Сервер недоступен! Проверьте URL и доступность сервера" "Red"
    if (-not $Auto) { Read-Host "Нажмите Enter для выхода" }
    exit 1
}
Write-Log "✅ Сервер доступен" "Green"

# Получаем события из журнала Windows
Write-Log "📖 Читаем журнал Windows (Security, события 4624 и 4634)..." "Yellow"

try {
    $events = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        ID = 4624, 4634
        StartTime = $startDate
        EndTime = $endDate
    } -ErrorAction Stop | ForEach-Object {
        $eventXml = [xml]$_.ToXml()
        $userData = $eventXml.Event.EventData.Data
        
        $targetUserName = ($userData | Where-Object { $_.Name -eq 'TargetUserName' }).InnerText
        $subjectUserName = ($userData | Where-Object { $_.Name -eq 'SubjectUserName' }).InnerText
        $accountName = if ($targetUserName) { $targetUserName } elseif ($subjectUserName) { $subjectUserName } else { $null }
        
        if ($accountName -and -not (Is-TechnicalAccount $accountName)) {
            $normalizedUsername = Normalize-Username $accountName
            
            [PSCustomObject]@{
                Username = $normalizedUsername
                EventID = $_.Id
                EventType = if ($_.Id -eq 4624) { 'login' } else { 'logout' }
                EventTime = $_.TimeCreated.ToString('dd.MM.yyyy HH:mm:ss')
            }
        }
    }
    
    Write-Log "📊 Найдено событий: $($events.Count)" "Green"
    
} catch {
    Write-Log "❌ Ошибка при чтении журнала Windows: $($_.Exception.Message)" "Red"
    if (-not $Auto) { Read-Host "Нажмите Enter для выхода" }
    exit 1
}

if ($events.Count -eq 0) {
    Write-Log "⚠️  События не найдены за указанный период" "Yellow"
    if (-not $Auto) { Read-Host "Нажмите Enter для выхода" }
    exit 0
}

# Формируем данные для отправки
Write-Log "📦 Формируем данные для отправки..." "Yellow"
$eventsToSend = $events | ForEach-Object {
    @{
        username = $_.Username
        event_type = $_.EventType
        event_time = $_.EventTime
        event_id = $_.EventID
    }
}

# Отправляем данные на сервер
Write-Log "📤 Отправляем данные на сервер..." "Yellow"

try {
    $headers = @{
        'X-API-Key' = $ApiKey
        'Content-Type' = 'application/json; charset=utf-8'
    }
    
    $body = $eventsToSend | ConvertTo-Json -Depth 3 -Compress
    
    # Для больших объемов данных можно разбить на пакеты
    $batchSize = 100
    $batches = @()
    for ($i = 0; $i -lt $eventsToSend.Count; $i += $batchSize) {
        $batches += , ($eventsToSend[$i..([Math]::Min($i + $batchSize - 1, $eventsToSend.Count - 1))])
    }
    
    $totalImported = 0
    $totalSkipped = 0
    $totalErrors = 0
    
    foreach ($batch in $batches) {
        try {
            $batchBody = $batch | ConvertTo-Json -Depth 3 -Compress
            $response = Invoke-RestMethod -Uri "$ServerUrl/remote-worktime-batch" -Method POST -Headers $headers -Body $batchBody -TimeoutSec 60
            
            if ($response.success) {
                $totalImported += $response.imported
                $totalSkipped += $response.skipped
                $totalErrors += $response.errors
                Write-Log "✅ Отправлен пакет: импортировано $($response.imported), пропущено $($response.skipped), ошибок $($response.errors)" "Green"
            } else {
                Write-Log "❌ Ошибка отправки пакета: $($response.error)" "Red"
                $totalErrors += $batch.Count
            }
        } catch {
            Write-Log "❌ Ошибка при отправке пакета: $($_.Exception.Message)" "Red"
            $totalErrors += $batch.Count
        }
    }
    
    Write-Log "`n📊 ИТОГОВАЯ СТАТИСТИКА:" "Cyan"
    Write-Log "   ✅ Импортировано: $totalImported" "Green"
    Write-Log "   ⏭️  Пропущено: $totalSkipped" "Yellow"
    Write-Log "   ❌ Ошибок: $totalErrors" $(if ($totalErrors -gt 0) { "Red" } else { "Green" })
    Write-Log "   📦 Всего событий: $($eventsToSend.Count)" "White"
    
    Write-Log "`n🎉 Экспорт завершен успешно!" "Green"
    
} catch {
    Write-Log "❌ Ошибка при отправке данных: $($_.Exception.Message)" "Red"
    if ($_.ErrorDetails.Message) {
        Write-Log "   Детали: $($_.ErrorDetails.Message)" "Gray"
    }
    if (-not $Auto) { Read-Host "Нажмите Enter для выхода" }
    exit 1
}

if (-not $Auto) { Read-Host "`nНажмите Enter для выхода" }

