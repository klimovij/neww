[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

param(
    [string]$StartDate,
    [string]$EndDate,
    [string]$SingleDate
)

$logsDir = "C:\Users\Ksendz\web\Logs"
$serverUrl = "http://localhost:5000/api"

Write-Host "📅 Импорт CSV файлов по дате" -ForegroundColor Cyan
Write-Host "📁 Папка с логами: $logsDir" -ForegroundColor Gray
Write-Host "🌐 Сервер: $serverUrl" -ForegroundColor Gray

# Проверяем существование папки
if (-not (Test-Path $logsDir)) {
    Write-Host "❌ Папка не найдена: $logsDir" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit
}

# Функция для проверки доступности сервера
function Test-ServerConnection {
    try {
        $response = Invoke-RestMethod -Uri "$serverUrl/debug-worktime-users" -Method GET -TimeoutSec 5
        return $true
    } catch {
        return $false
    }
}

# Проверяем подключение к серверу
Write-Host "`n🔌 Проверяем подключение к серверу..." -ForegroundColor Yellow
if (-not (Test-ServerConnection)) {
    Write-Host "❌ Сервер недоступен! Убедитесь, что сервер запущен на порту 5000" -ForegroundColor Red
    Write-Host "   Запустите сервер командой: npm run dev" -ForegroundColor Gray
    Read-Host "Нажмите Enter для выхода"
    exit
}
Write-Host "✅ Сервер доступен" -ForegroundColor Green

# Получаем все доступные CSV файлы
$allCsvFiles = Get-ChildItem -Path $logsDir -Filter "UserLogs_*.csv" | Sort-Object Name

if ($allCsvFiles.Count -eq 0) {
    Write-Host "❌ Не найдено CSV файлов в папке $logsDir" -ForegroundColor Red
    Write-Host "   Ожидаемый формат имени файла: UserLogs_YYYYMMDD.csv" -ForegroundColor Gray
    Read-Host "Нажмите Enter для выхода"
    exit
}

Write-Host "`n📋 Доступные файлы ($($allCsvFiles.Count)):" -ForegroundColor Yellow
foreach ($file in $allCsvFiles) {
    if ($file.BaseName -match "UserLogs_(\d{8})") {
        $dateStr = $matches[1]
        $displayDate = $dateStr.Substring(0,4) + "-" + $dateStr.Substring(4,2) + "-" + $dateStr.Substring(6,2)
        $fileSize = [math]::Round($file.Length / 1KB, 2)
        Write-Host "  📄 $($file.Name) (дата: $displayDate, размер: $fileSize KB)" -ForegroundColor White
    } else {
        Write-Host "  📄 $($file.Name) (неизвестный формат даты)" -ForegroundColor Gray
    }
}

# Если параметры не переданы, запрашиваем у пользователя
if (-not $SingleDate -and -not $StartDate -and -not $EndDate) {
    Write-Host "`n🔢 Выберите режим импорта:" -ForegroundColor Cyan
    Write-Host "  1️⃣  Одна дата" -ForegroundColor White
    Write-Host "  2️⃣  Диапазон дат" -ForegroundColor White
    Write-Host "  3️⃣  Все файлы" -ForegroundColor White
    Write-Host "  4️⃣  Очистить базу данных" -ForegroundColor Red
    
    $mode = Read-Host "`nВведите номер режима (1-4)"
    
    switch ($mode) {
        "1" {
            Write-Host "`n📅 Импорт одной даты" -ForegroundColor Cyan
            $SingleDate = Read-Host "Введите дату (YYYY-MM-DD, например 2025-01-15)"
        }
        "2" {
            Write-Host "`n📅 Импорт диапазона дат" -ForegroundColor Cyan
            $StartDate = Read-Host "Введите начальную дату (YYYY-MM-DD)"
            $EndDate = Read-Host "Введите конечную дату (YYYY-MM-DD)"
        }
        "3" {
            Write-Host "`n🚀 Импорт всех файлов..." -ForegroundColor Cyan
            $confirm = Read-Host "⚠️  Это может занять много времени. Продолжить? (y/n)"
            if ($confirm.ToLower() -ne "y" -and $confirm.ToLower() -ne "yes") {
                Write-Host "❌ Импорт отменен" -ForegroundColor Yellow
                Read-Host "Нажмите Enter для выхода"
                exit
            }
            
            try {
                $body = @{ dirPath = "C:/Users/Ksendz/web/Logs" } | ConvertTo-Json
                $response = Invoke-RestMethod -Uri "$serverUrl/import-all-userlogs" -Method POST -Body $body -ContentType "application/json; charset=utf-8"
                
                if ($response.success) {
                    Write-Host "✅ УСПЕШНО! Импортировано записей: $($response.imported) из $($response.files) файлов" -ForegroundColor Green
                } else {
                    Write-Host "❌ Ошибка: $($response.error)" -ForegroundColor Red
                }
            } catch {
                Write-Host "❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host "   Детали: $($_.ErrorDetails.Message)" -ForegroundColor Gray
            }
            Read-Host "`nНажмите Enter для выхода"
            exit
        }
        "4" {
            Write-Host "`n🗑️  Очистка базы данных..." -ForegroundColor Red
            $confirm = Read-Host "⚠️  ВНИМАНИЕ! Это удалит ВСЕ записи рабочего времени. Продолжить? (y/n)"
            if ($confirm.ToLower() -ne "y" -and $confirm.ToLower() -ne "yes") {
                Write-Host "❌ Очистка отменена" -ForegroundColor Yellow
                Read-Host "Нажмите Enter для выхода"
                exit
            }
            
            try {
                $response = Invoke-RestMethod -Uri "$serverUrl/clear-worktime-logs" -Method POST -ContentType "application/json; charset=utf-8"
                
                if ($response.success) {
                    Write-Host "✅ База данных очищена! Удалено записей: $($response.deleted)" -ForegroundColor Green
                } else {
                    Write-Host "❌ Ошибка очистки: $($response.error)" -ForegroundColor Red
                }
            } catch {
                Write-Host "❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
            }
            Read-Host "`nНажмите Enter для выхода"
            exit
        }
        default {
            Write-Host "❌ Неверный выбор" -ForegroundColor Red
            Read-Host "Нажмите Enter для выхода"
            exit
        }
    }
}

# Фильтруем файлы по дате
$selectedFiles = @()

if ($SingleDate) {
    # Одна дата
    try {
        $targetDate = Get-Date $SingleDate
        $dateStr = $targetDate.ToString("yyyyMMdd")
        $selectedFiles = $allCsvFiles | Where-Object { $_.BaseName -eq "UserLogs_$dateStr" }
        
        if ($selectedFiles.Count -eq 0) {
            Write-Host "❌ Файл для даты $SingleDate не найден" -ForegroundColor Red
            Write-Host "   Ожидаемое имя файла: UserLogs_$dateStr.csv" -ForegroundColor Gray
            
            # Показываем ближайшие доступные даты
            $availableDates = $allCsvFiles | ForEach-Object {
                if ($_.BaseName -match "UserLogs_(\d{8})") {
                    try {
                        [DateTime]::ParseExact($matches[1], "yyyyMMdd", $null)
                    } catch { }
                }
            } | Where-Object { $_ } | Sort-Object
            
            if ($availableDates.Count -gt 0) {
                Write-Host "`n📅 Доступные даты:" -ForegroundColor Yellow
                $availableDates | ForEach-Object { Write-Host "   - $($_.ToString('yyyy-MM-dd'))" -ForegroundColor White }
            }
            
            Read-Host "Нажмите Enter для выхода"
            exit
        }
        
        Write-Host "`n📅 Выбрана дата: $($targetDate.ToString('yyyy-MM-dd'))" -ForegroundColor Green
    } catch {
        Write-Host "❌ Неверный формат даты: $SingleDate" -ForegroundColor Red
        Write-Host "   Используйте формат: YYYY-MM-DD (например: 2025-01-15)" -ForegroundColor Gray
        Read-Host "Нажмите Enter для выхода"
        exit
    }
} elseif ($StartDate -and $EndDate) {
    # Диапазон дат
    try {
        $startDateTime = Get-Date $StartDate
        $endDateTime = Get-Date $EndDate
        
        if ($startDateTime -gt $endDateTime) {
            Write-Host "❌ Начальная дата не может быть больше конечной" -ForegroundColor Red
            Read-Host "Нажмите Enter для выхода"
            exit
        }
        
        $selectedFiles = $allCsvFiles | Where-Object {
            if ($_.BaseName -match "UserLogs_(\d{8})") {
                $fileDateStr = $matches[1]
                try {
                    $fileDate = [DateTime]::ParseExact($fileDateStr, "yyyyMMdd", $null)
                    return $fileDate -ge $startDateTime.Date -and $fileDate -le $endDateTime.Date
                } catch {
                    return $false
                }
            }
            return $false
        }
        
        if ($selectedFiles.Count -eq 0) {
            Write-Host "❌ Не найдено файлов за период с $StartDate по $EndDate" -ForegroundColor Red
            Read-Host "Нажмите Enter для выхода"
            exit
        }
        
        Write-Host "`n📅 Выбран период: $($startDateTime.ToString('yyyy-MM-dd')) - $($endDateTime.ToString('yyyy-MM-dd'))" -ForegroundColor Green
        
        # Показываем количество дней
        $daysDiff = ($endDateTime - $startDateTime).Days + 1
                Write-Host "   📊 Период: $daysDiff дней" -ForegroundColor Gray
        Write-Host "   📁 Найдено файлов: $($selectedFiles.Count)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Неверный формат даты" -ForegroundColor Red
        Write-Host "   Используйте формат: YYYY-MM-DD (например: 2025-01-15)" -ForegroundColor Gray
        Read-Host "Нажмите Enter для выхода"
        exit
    }
}

# Показываем выбранные файлы
Write-Host "`n📋 Файлы для импорта ($($selectedFiles.Count)):" -ForegroundColor Yellow
foreach ($file in $selectedFiles) {
    if ($file.BaseName -match "UserLogs_(\d{8})") {
        $dateStr = $matches[1]
        $displayDate = $dateStr.Substring(0,4) + "-" + $dateStr.Substring(4,2) + "-" + $dateStr.Substring(6,2)
        $fileSize = [math]::Round($file.Length / 1KB, 2)
        Write-Host "  📄 $($file.Name) (дата: $displayDate, размер: $fileSize KB)" -ForegroundColor White
    }
}

# Подтверждение импорта
if ($selectedFiles.Count -gt 1) {
    $confirm = Read-Host "`n⚠️  Импортировать $($selectedFiles.Count) файлов? (y/n)"
    if ($confirm.ToLower() -ne "y" -and $confirm.ToLower() -ne "yes") {
        Write-Host "❌ Импорт отменен" -ForegroundColor Yellow
        Read-Host "Нажмите Enter для выхода"
        exit
    }
}

# Импортируем файлы
Write-Host "`n🚀 Начинаем импорт..." -ForegroundColor Cyan
$totalImported = 0
$totalErrors = 0
$processedFiles = 0

foreach ($file in $selectedFiles) {
    $processedFiles++
    Write-Host "`n[$processedFiles/$($selectedFiles.Count)] Обрабатываем: $($file.Name)" -ForegroundColor Yellow
    
    try {
        $body = @{ filePath = $file.FullName } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$serverUrl/import-worktime-csv" -Method POST -Body $body -ContentType "application/json; charset=utf-8"
        
        if ($response.success) {
            $imported = $response.imported
            $totalImported += $imported
            Write-Host "   ✅ Импортировано записей: $imported" -ForegroundColor Green
        } else {
            $totalErrors++
            Write-Host "   ❌ Ошибка: $($response.error)" -ForegroundColor Red
        }
    } catch {
        $totalErrors++
        Write-Host "   ❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "      Детали: $($_.ErrorDetails.Message)" -ForegroundColor Gray
        }
    }
    
    # Показываем прогресс
    $progress = [math]::Round(($processedFiles / $selectedFiles.Count) * 100, 1)
    Write-Host "   📊 Прогресс: $progress% ($processedFiles из $($selectedFiles.Count))" -ForegroundColor Gray
}

# Итоговая статистика
Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "📊 ИТОГОВАЯ СТАТИСТИКА" -ForegroundColor Cyan
Write-Host "="*50 -ForegroundColor Cyan
Write-Host "📁 Обработано файлов: $processedFiles" -ForegroundColor White
Write-Host "✅ Импортировано записей: $totalImported" -ForegroundColor Green
if ($totalErrors -gt 0) {
    Write-Host "❌ Ошибок: $totalErrors" -ForegroundColor Red
} else {
    Write-Host "❌ Ошибок: 0" -ForegroundColor Green
}

# Показываем статистику из базы данных
try {
    Write-Host "`n🔍 Проверяем данные в базе..." -ForegroundColor Yellow
    $dbStats = Invoke-RestMethod -Uri "$serverUrl/debug-worktime-users" -Method GET
    
    if ($dbStats.success) {
        Write-Host "📊 Всего записей в базе: $($dbStats.count)" -ForegroundColor White
        Write-Host "👥 Уникальных пользователей: $($dbStats.users.Count)" -ForegroundColor White
        Write-Host "📅 Уникальных дат: $($dbStats.dates.Count)" -ForegroundColor White
        
        if ($dbStats.users.Count -gt 0) {
            Write-Host "`n👥 Пользователи в базе:" -ForegroundColor Yellow
            $dbStats.users | Sort-Object | ForEach-Object { 
                Write-Host "   - $_" -ForegroundColor White 
            }
        }
        
        if ($dbStats.dates.Count -gt 0) {
            Write-Host "`n📅 Даты в базе:" -ForegroundColor Yellow
            $dbStats.dates | Sort-Object | ForEach-Object { 
                Write-Host "   - $_" -ForegroundColor White 
            }
        }
    }
} catch {
    Write-Host "⚠️  Не удалось получить статистику из базы: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n" + "="*50 -ForegroundColor Cyan

if ($totalImported -gt 0) {
    Write-Host "🎉 ИМПОРТ ЗАВЕРШЕН УСПЕШНО!" -ForegroundColor Green
} else {
    Write-Host "⚠️  ИМПОРТ ЗАВЕРШЕН БЕЗ НОВЫХ ЗАПИСЕЙ" -ForegroundColor Yellow
}

Read-Host "`nНажмите Enter для выхода"