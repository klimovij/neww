param(
    [Parameter(Mandatory = $true)]
    [string]$StartDate,  # format: YYYY-MM-DD or DD.MM.YYYY
    
    [Parameter(Mandatory = $true)]
    [string]$EndDate,    # format: YYYY-MM-DD or DD.MM.YYYY
    
    [Parameter(Mandatory = $false)]
    [int]$DelaySeconds = 2  # Задержка между запросами (чтобы не перегружать сервер)
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ЭКСПОРТ ДАННЫХ РАБОЧЕГО ВРЕМЕНИ ЗА ПЕРИОД" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Функция для конвертации строки даты в DateTime
function ConvertTo-DateTime {
    param([string]$DateStr)
    
    # Пробуем формат DD.MM.YYYY
    if ($DateStr -match '^(\d{1,2})\.(\d{1,2})\.(\d{4})$') {
        $day = [int]$matches[1]
        $month = [int]$matches[2]
        $year = [int]$matches[3]
        return Get-Date -Year $year -Month $month -Day $day
    }
    
    # Пробуем формат YYYY-MM-DD
    if ($DateStr -match '^(\d{4})-(\d{1,2})-(\d{1,2})$') {
        $year = [int]$matches[1]
        $month = [int]$matches[2]
        $day = [int]$matches[3]
        return Get-Date -Year $year -Month $month -Day $day
    }
    
    # Пробуем стандартный парсинг
    try {
        return [DateTime]::Parse($DateStr)
    } catch {
        Write-Host "❌ Неверный формат даты: $DateStr" -ForegroundColor Red
        Write-Host "Используйте формат: YYYY-MM-DD или DD.MM.YYYY" -ForegroundColor Yellow
        exit 1
    }
}

# Конвертируем даты
try {
    $start = ConvertTo-DateTime $StartDate
    $end = ConvertTo-DateTime $EndDate
} catch {
    Write-Host "❌ Ошибка конвертации дат: $_" -ForegroundColor Red
    exit 1
}

# Проверяем порядок дат
if ($start -gt $end) {
    Write-Host "❌ Начальная дата ($StartDate) позже конечной даты ($EndDate)" -ForegroundColor Red
    Write-Host "Поменяйте даты местами." -ForegroundColor Yellow
    exit 1
}

# Вычисляем количество дней
$days = ($end - $start).Days + 1

Write-Host "📅 Период: $($start.ToString('dd.MM.yyyy')) - $($end.ToString('dd.MM.yyyy'))" -ForegroundColor Cyan
Write-Host "📊 Количество дней: $days" -ForegroundColor Cyan
Write-Host "⏱️ Задержка между запросами: $DelaySeconds сек" -ForegroundColor Cyan
Write-Host ""

# Проверяем наличие основного скрипта
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$mainScript = Join-Path $scriptRoot "export_remote_worktime.ps1"

if (-not (Test-Path $mainScript)) {
    Write-Host "❌ Скрипт не найден: $mainScript" -ForegroundColor Red
    Write-Host "Убедитесь, что файл export_remote_worktime.ps1 находится в той же папке." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Найден скрипт экспорта: export_remote_worktime.ps1" -ForegroundColor Green
Write-Host ""

# Запрашиваем подтверждение
Write-Host "⚠️ ВНИМАНИЕ:" -ForegroundColor Yellow
Write-Host "Будет выполнено $days запросов к серверу." -ForegroundColor White
Write-Host "Это займет примерно $([math]::Round($days * $DelaySeconds / 60, 1)) минут." -ForegroundColor White
Write-Host ""
$confirmation = Read-Host "Продолжить? (Y/N)"

if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
    Write-Host "❌ Отменено пользователем." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🚀 Начинаю экспорт..." -ForegroundColor Green
Write-Host ""

# Счетчики
$successCount = 0
$failCount = 0
$emptyCount = 0
$totalEvents = 0

# Массив для сохранения результатов
$results = @()

# Цикл по датам
$currentDate = $start
$counter = 1

while ($currentDate -le $end) {
    $dateStr = $currentDate.ToString("yyyy-MM-dd")
    $progress = [math]::Round(($counter / $days) * 100, 1)
    
    Write-Host "[$counter/$days] ($progress%) Обработка: $dateStr" -ForegroundColor Cyan
    
    try {
        # Запускаем основной скрипт
        $output = & $mainScript -Date $dateStr 2>&1 | Out-String
        
        # Анализируем вывод
        $success = $false
        $eventsCount = 0
        $error = $null
        
        if ($output -match "Successfully imported (\d+) events") {
            $success = $true
            $eventsCount = [int]$matches[1]
            $successCount++
            $totalEvents += $eventsCount
            Write-Host "  ✅ Успешно: $eventsCount событий" -ForegroundColor Green
        }
        elseif ($output -match "No events found" -or $output -match "No events for this date") {
            $emptyCount++
            Write-Host "  ⚠️ Нет данных за эту дату" -ForegroundColor Yellow
        }
        else {
            $failCount++
            # Пытаемся найти ошибку в выводе
            if ($output -match "Error:? (.+)") {
                $error = $matches[1]
            } else {
                $error = "Unknown error"
            }
            Write-Host "  ❌ Ошибка: $error" -ForegroundColor Red
        }
        
        # Сохраняем результат
        $results += [PSCustomObject]@{
            Date = $dateStr
            Success = $success
            Events = $eventsCount
            Error = $error
        }
        
    } catch {
        $failCount++
        Write-Host "  ❌ Исключение: $($_.Exception.Message)" -ForegroundColor Red
        
        $results += [PSCustomObject]@{
            Date = $dateStr
            Success = $false
            Events = 0
            Error = $_.Exception.Message
        }
    }
    
    # Задержка между запросами (кроме последнего)
    if ($currentDate -lt $end -and $DelaySeconds -gt 0) {
        Start-Sleep -Seconds $DelaySeconds
    }
    
    $currentDate = $currentDate.AddDays(1)
    $counter++
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ ЭКСПОРТ ЗАВЕРШЕН!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# Статистика
Write-Host "📊 СТАТИСТИКА:" -ForegroundColor Cyan
Write-Host "  Обработано дней: $days" -ForegroundColor White
Write-Host "  ✅ Успешно: $successCount" -ForegroundColor Green
Write-Host "  ⚠️ Нет данных: $emptyCount" -ForegroundColor Yellow
Write-Host "  ❌ Ошибки: $failCount" -ForegroundColor Red
Write-Host "  📈 Всего событий: $totalEvents" -ForegroundColor Cyan
Write-Host ""

# Таблица результатов
if ($failCount -gt 0) {
    Write-Host "❌ ДНИ С ОШИБКАМИ:" -ForegroundColor Red
    $results | Where-Object { -not $_.Success -and $_.Error } | Format-Table Date, Error -AutoSize
    Write-Host ""
}

if ($emptyCount -gt 0) {
    Write-Host "⚠️ ДНИ БЕЗ ДАННЫХ:" -ForegroundColor Yellow
    $results | Where-Object { -not $_.Success -and -not $_.Error } | ForEach-Object { Write-Host "  - $($_.Date)" -ForegroundColor Gray }
    Write-Host ""
}

if ($successCount -gt 0) {
    Write-Host "✅ УСПЕШНЫЕ ОТПРАВКИ:" -ForegroundColor Green
    $results | Where-Object { $_.Success } | Format-Table Date, Events -AutoSize
}

Write-Host ""
Write-Host "💡 СОВЕТ:" -ForegroundColor Yellow
Write-Host "Проверьте результаты на сайте:" -ForegroundColor White
Write-Host "  http://35.232.108.72" -ForegroundColor Cyan
Write-Host "  Меню → Мониторинг времени → Отчет Удаленка" -ForegroundColor Gray
Write-Host ""

# Сохраняем отчет в файл
$reportPath = Join-Path $scriptRoot "export_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
$reportContent = @"
ОТЧЕТ ОБ ЭКСПОРТЕ ДАННЫХ РАБОЧЕГО ВРЕМЕНИ
Дата создания: $(Get-Date -Format 'dd.MM.yyyy HH:mm:ss')
Период: $($start.ToString('dd.MM.yyyy')) - $($end.ToString('dd.MM.yyyy'))
Количество дней: $days

СТАТИСТИКА:
- Обработано дней: $days
- Успешно: $successCount
- Нет данных: $emptyCount
- Ошибки: $failCount
- Всего событий: $totalEvents

ДЕТАЛИ:
$($results | ForEach-Object { 
    $status = if ($_.Success) { "✅ OK" } elseif (-not $_.Error) { "⚠️ NO DATA" } else { "❌ ERROR" }
    "$($_.Date) | $status | Events: $($_.Events) $(if ($_.Error) { "| Error: $($_.Error)" })"
} | Out-String)
"@

$reportContent | Out-File -FilePath $reportPath -Encoding UTF8
Write-Host "📄 Отчет сохранен: $reportPath" -ForegroundColor Cyan
Write-Host ""

Read-Host "Нажмите Enter для завершения"

