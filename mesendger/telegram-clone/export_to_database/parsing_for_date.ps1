# ==============================
# Сбор логов входа/выхода пользователей по дате
# ==============================

# Запрос даты у пользователя
$inputDate = Read-Host "Введите дату (в формате ДД.ММ.ГГГГ) или нажмите Enter для вчерашнего дня"

if ([string]::IsNullOrWhiteSpace($inputDate)) {
    $startDate = (Get-Date -Hour 0 -Minute 0 -Second 0).AddDays(-1)
    Write-Host "Выбрана дата по умолчанию: $($startDate.ToString('dd.MM.yyyy'))"
} else {
    try {
        $startDate = [datetime]::ParseExact($inputDate, 'dd.MM.yyyy', $null)
        Write-Host "Выбрана дата: $($startDate.ToString('dd.MM.yyyy'))"
    }
    catch {
        Write-Host "⚠ Ошибка: неправильный формат даты. Используй ДД.ММ.ГГГГ (например 19.10.2025)." -ForegroundColor Red
        exit
    }
}

$endDate = $startDate.AddDays(1)

# Путь для логов и CSV
$logDir = "C:\Users\Ksendz\web\Logs"
if (-not (Test-Path $logDir)) {
    New-Item -Path $logDir -ItemType Directory | Out-Null
}

$logPath = Join-Path $logDir "script_log.txt"
$csvFilePath = Join-Path $logDir "UserLogs_$($startDate.ToString('yyyyMMdd')).csv"

Start-Transcript -Path $logPath -Append

# Список пользователей (при необходимости дополни)
$usernames = @(
    "Олег Ксендзик", "Ирина Катасонова", "Алина Сивоконь",
    "Андрей Исмаилов", "Анна Данько", "Анна Марченко", "Артем Богопольский",
    "Валентина Булгакова2", "Виола Пешко", "Виолетта Рябчук", "Виталий Марков",
    "Владислав Левковский", "Криворучко Екатерина", "Елена Мураткова",
    "Елена Плахутенко", "Елена Попович", "Иван Порчак", "Ирина Чумак", "Кассир3",
    "Константин Денисенко", "Любовь Козловская", "Наталья Балтажи", "Наталья Турбанова",
    "Николай Боднар", "Олег Пахолюк", "Павел Еремеев", "Светлана Недомовная",
    "Светлана Костыркина", "Сергей Сорокопуд", "Снежана Накемпий", "Татьяна Карпов",
    "Татьяна Линенко", "Татьяна Рябенко", "Ирина Плюхина", "Юлия Суханова",
    "Юлия Суханова2", "Анастасия Носова", "Марина Мамроцкая", "Анна Караулова", "Ольга Гайдай"
)

try {
    # Получаем события входа/выхода из журнала безопасности
    $events = Get-WinEvent -FilterHashtable @{
        LogName   = 'Security'
        StartTime = $startDate
        EndTime   = $endDate
        ID        = 4624,4634
    } -ErrorAction Stop | ForEach-Object {
        if ($_.Id -eq 4624) {
            $username = $_.Properties[5].Value.Trim()
        } else {
            $username = $_.Properties[1].Value.Trim()
        }

        $username = $username.Split('\')[-1]

        if ($usernames -contains $username) {
            [PSCustomObject]@{
                TimeCreated = $_.TimeCreated
                Username    = $username
                EventID     = $_.Id
                EventType   = if ($_.Id -eq 4624) { 'login' } else { 'logout' }
            }
        }
    } | Sort-Object TimeCreated

    $loginCount  = ($events | Where-Object { $_.EventType -eq 'login' }).Count
    $logoutCount = ($events | Where-Object { $_.EventType -eq 'logout' }).Count

    Write-Host "Количество входов: $loginCount, выходов: $logoutCount"

    if ($loginCount -eq 0) {
        Write-Host "⚠ Нет событий входа (4624) за указанный день. Вывод всех событий входа:"
        $allLogins = Get-WinEvent -FilterHashtable @{
            LogName   = 'Security'
            StartTime = $startDate
            EndTime   = $endDate
            ID        = 4624
        } | ForEach-Object {
            $username = $_.Properties[5].Value.Trim().Split('\')[-1]
            [PSCustomObject]@{
                TimeCreated = $_.TimeCreated
                Username    = $username
                EventID     = $_.Id
            }
        } | Sort-Object TimeCreated
        $allLogins | Format-Table -AutoSize
    }

    # Сохраняем результаты
    $events | Export-Csv -Path $csvFilePath -NoTypeInformation -Encoding UTF8
    Write-Host "✅ Результаты за $($startDate.ToString('dd.MM.yyyy')) сохранены:"
    Write-Host $csvFilePath
}
catch {
    Write-Error "❌ Ошибка при получении событий: $_"
}

Stop-Transcript
