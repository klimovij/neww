param(
    [string]$Date
)

Start-Transcript -Path "C:\Users\Ksendz\web\Logs\script_log.txt"

# Список пользователей (пример, замените на актуальный)
$usernames = @(
    "Олег Ксендзик", "Ирина Катасонова", "Алина Сивоконь",
    "Андрей Исмаилов","Анна Данько", "Анна Марченко", "Артем Богопольский",
    "Валентина Булгакова2", "Виола Пешко", "Виолетта Рябчук", "Виталий Марков",
    "Владислав Левковский", "Криворучко Екатерина", "Елена Мураткова",
    "Елена Плахутенко", "Елена Попович",  "Иван Порчак", "Ирина Чумак", "Кассир3",
    "Константин Денисенко", "Любовь Козловская", "Наталья Балтажи", "Наталья Турбанова",
    "Николай Боднар", "Олег Пахолюк", "Павел Еремеев", "Светлана Недомовная",
    "Светлана Костыркина", "Сергей Сорокопуд","Снежана Накемпий", "Татьяна Карпов",
    "Татьяна Линенко", "Татьяна Рябенко", "Ирина Плюхина", "Юлия Суханова",
    "Юлия Суханова2", "Анастасия Носова", "Марина Мамроцкая", "Анна Караулова", "Ольга Гайдай"
)

if ($Date) {
    $startDate = [datetime]::ParseExact($Date, 'dd.MM.yyyy', $null)
} else {
    $startDate = (Get-Date -Hour 0 -Minute 0 -Second 0).AddDays(-1)
}
$endDate = $startDate.AddDays(1)

$csvDir = "C:\Users\Ksendz\web\mesendger(самый удачный)\mesendger\telegram-clone"
if (-not (Test-Path $csvDir)) {
    New-Item -Path $csvDir -ItemType Directory | Out-Null
}
$csvFilePath = Join-Path $csvDir "UserLogs_$($startDate.ToString('yyyyMMdd')).csv"

try {
    $events = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        StartTime = $startDate
        EndTime = $endDate
        ID = 4624,4634
    } -ErrorAction Stop | ForEach-Object {
        if ($_.Id -eq 4624) {
            $username = $_.Properties[5].Value.Trim()
        } else {
            $username = $_.Properties[1].Value.Trim()
        }
        $username = $username.Split('\')[-1]
        if ($usernames -contains $username) {
            $eventType = if ($_.Id -eq 4624) { 'login' } else { 'logout' }
            [PSCustomObject]@{
                TimeCreated = $_.TimeCreated
                Username    = $username
                EventID     = $_.Id
                EventType   = $eventType
            }
        }
    } | Sort-Object TimeCreated

    $loginCount = ($events | Where-Object { $_.EventType -eq 'login' }).Count
    $logoutCount = ($events | Where-Object { $_.EventType -eq 'logout' }).Count
    Write-Host "Количество логинов: $loginCount, количество логаутов: $logoutCount"

    if ($loginCount -eq 0) {
        Write-Host "Внимание: нет событий входа (4624) за указанный период. Вывод всех событий входа:"
        $allLogins = Get-WinEvent -FilterHashtable @{
            LogName = 'Security'
            StartTime = $startDate
            EndTime = $endDate
            ID = 4624
        } -ErrorAction Stop | ForEach-Object {
            $username = $_.Properties[5].Value.Trim()
            $username = $username.Split('\')[-1]
            [PSCustomObject]@{
                TimeCreated = $_.TimeCreated
                Username    = $username
                EventID     = $_.Id
            }
        } | Sort-Object TimeCreated
        $allLogins | Format-Table -AutoSize
    }

    $events | Export-Csv -Path $csvFilePath -NoTypeInformation -Encoding UTF8
    $events | Format-Table -AutoSize

    Write-Host "Результаты за $($startDate.ToString('dd.MM.yyyy')) сохранены в файл: $csvFilePath"
    Write-Host "Файл CSV сохранен по пути: $csvFilePath"
}
catch {
    Write-Error "Ошибка при получении событий: $_"
}

Stop-Transcript