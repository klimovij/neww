# PowerShell скрипт для отправки данных за выбранную дату из локальной базы на Google сервер
# Использование: .\send_any_date_to_google.ps1 [-Date "2025-11-19"]

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

param(
    [Parameter(HelpMessage="Дата в формате YYYY-MM-DD (например: 2025-11-19). Если не указана, будет показан список доступных дат.")]
    [string]$Date = ""
)

# Параметры из .env файла
$envPath = Join-Path $PSScriptRoot "..\server\.env"
if (-not (Test-Path $envPath)) {
    $envPath = Join-Path $PSScriptRoot "..\..\server\.env"
}

# Чтение переменных из .env
$envContent = if (Test-Path $envPath) { Get-Content $envPath -Raw } else { "" }
$GOOGLE_SERVER_URL = ""
$REMOTE_WORKTIME_API_KEY = ""

# Парсим .env файл
if ($envContent) {
    foreach ($line in ($envContent -split "`n")) {
        $line = $line.Trim()
        if ($line -match "^GOOGLE_SERVER_URL=(.+)$") {
            $GOOGLE_SERVER_URL = $matches[1].Trim()
        }
        if ($line -match "^REMOTE_WORKTIME_API_KEY=(.+)$") {
            $REMOTE_WORKTIME_API_KEY = $matches[1].Trim()
        }
    }
}

# Если не найдено в .env, используем значения по умолчанию
if (-not $GOOGLE_SERVER_URL) {
    $GOOGLE_SERVER_URL = "http://35.232.108.72"
}
if (-not $REMOTE_WORKTIME_API_KEY) {
    $REMOTE_WORKTIME_API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="
}

# Путь к базе данных
$dbPath = Join-Path $PSScriptRoot "..\server\messenger.db"
if (-not (Test-Path $dbPath)) {
    $dbPath = Join-Path $PSScriptRoot "..\..\server\messenger.db"
}

if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Файл базы данных не найден: $dbPath" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

Write-Host "📊 База данных: $dbPath" -ForegroundColor Cyan
Write-Host "🌐 Сервер: $GOOGLE_SERVER_URL" -ForegroundColor Cyan

# Проверка наличия Node.js
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "❌ Node.js не найден! Установите Node.js для работы скрипта." -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Создаем временные файлы
$tempScript = [System.IO.Path]::GetTempFileName() + ".js"
$tempJsonFile = [System.IO.Path]::GetTempFileName() + ".json"
$tempDatesFile = [System.IO.Path]::GetTempFileName() + ".json"

# Экранируем пути для Node.js скрипта
$dbPathEscaped = $dbPath.Replace('\', '\\')
$tempJsonFileEscaped = $tempJsonFile.Replace('\', '\\')
$tempDatesFileEscaped = $tempDatesFile.Replace('\', '\\')

# Создаем временный Node.js скрипт для получения списка доступных дат
$nodeScriptDates = @"
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbPath = '$dbPathEscaped';
const outputFile = '$tempDatesFileEscaped';

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('❌ Ошибка открытия базы:', err.message);
        process.exit(1);
    }
});

// Получаем список всех уникальных дат - упрощенный запрос
const query = \`
    SELECT DISTINCT event_time
    FROM work_time_logs
    ORDER BY event_time DESC
    LIMIT 100
\`;

db.all(query, [], (err, rows) => {
    if (err) {
        console.error('❌ Ошибка запроса:', err.message);
        db.close();
        process.exit(1);
    }
    
    if (!rows || rows.length === 0) {
        fs.writeFileSync(outputFile, JSON.stringify([], null, 2), 'utf8');
        console.log('Найдено дат: 0');
        db.close();
        process.exit(0);
    }
    
    // Извлекаем уникальные даты из всех записей
    const datesSet = new Set();
    rows.forEach(row => {
        let dateStr = '';
        const eventTime = row.event_time || '';
        
        // Проверяем формат YYYY-MM-DD
        if (eventTime.length >= 10 && eventTime.charAt(4) === '-') {
            dateStr = eventTime.substring(0, 10);
        }
        // Проверяем формат DD.MM.YYYY
        else if (eventTime.length >= 10 && eventTime.charAt(2) === '.') {
            const parts = eventTime.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
            if (parts) {
                dateStr = \`\${parts[3]}-\${parts[2]}-\${parts[1]}\`;
            }
        }
        
        if (dateStr) {
            datesSet.add(dateStr);
        }
    });
    
    const dates = Array.from(datesSet).sort().reverse();
    fs.writeFileSync(outputFile, JSON.stringify(dates, null, 2), 'utf8');
    console.log('Найдено дат:', dates.length);
    db.close();
});
"@

# Сохраняем скрипт для получения дат
$nodeScriptDates | Out-File -FilePath $tempScript -Encoding UTF8

# Получаем список доступных дат
Write-Host "`n🔍 Получаем список доступных дат в базе..." -ForegroundColor Yellow
$output = & node $tempScript 2>&1
foreach ($line in $output) {
    if ($line -match 'Найдено дат:') {
        Write-Host $line
    }
}

# Читаем список дат
if (Test-Path $tempDatesFile) {
    $datesJson = Get-Content $tempDatesFile -Raw -Encoding UTF8
    $availableDates = $datesJson | ConvertFrom-Json
    
    if ($availableDates -and $availableDates.Count -gt 0) {
        Write-Host "`n📅 Доступные даты в базе:" -ForegroundColor Cyan
        for ($i = 0; $i -lt $availableDates.Count; $i++) {
            Write-Host "  $($i + 1). $($availableDates[$i])" -ForegroundColor White
        }
        
        # Если дата не указана, используем последнюю доступную
        if (-not $Date) {
            $Date = $availableDates[0]
            Write-Host "`n📌 Дата не указана. Используется последняя доступная дата: $Date" -ForegroundColor Yellow
        } elseif ($Date -notin $availableDates) {
            Write-Host "`n⚠️ Внимание: Дата $Date не найдена в базе!" -ForegroundColor Yellow
            Write-Host "Используется последняя доступная дата: $($availableDates[0])" -ForegroundColor Yellow
            $Date = $availableDates[0]
        }
    } else {
        Write-Host "`n❌ Данных в базе нет!" -ForegroundColor Red
        Remove-Item $tempScript -ErrorAction SilentlyContinue
        Remove-Item $tempDatesFile -ErrorAction SilentlyContinue
        Read-Host "Нажмите Enter для выхода"
        exit 0
    }
} else {
    Write-Host "`n❌ Не удалось получить список дат из базы!" -ForegroundColor Red
    Remove-Item $tempScript -ErrorAction SilentlyContinue
    Remove-Item $tempDatesFile -ErrorAction SilentlyContinue
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Теперь создаем скрипт для получения данных за выбранную дату
$nodeScript = @"
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbPath = '$dbPathEscaped';
const targetDate = '$Date';
const outputFile = '$tempJsonFileEscaped';

console.log('📅 Получаем данные за:', targetDate);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('❌ Ошибка открытия базы:', err.message);
        process.exit(1);
    }
});

// Получаем данные за выбранную дату
// Поддерживаем оба формата дат: YYYY-MM-DD и DD.MM.YYYY
const query = \`
    SELECT username, event_type, event_time, event_id
    FROM work_time_logs
    WHERE (
        (length(event_time) >= 10 AND substr(event_time, 5, 1) = '-' AND substr(event_time, 8, 1) = '-'
         AND substr(event_time, 1, 10) = ?)
        OR
        (length(event_time) >= 10 AND substr(event_time, 3, 1) = '.' AND substr(event_time, 6, 1) = '.'
         AND (
             substr(event_time, 7, 4) || '-' || 
             substr(event_time, 4, 2) || '-' || 
             substr(event_time, 1, 2)
         ) = ?)
    )
    ORDER BY username, event_time
\`;

// Конвертируем YYYY-MM-DD в DD.MM.YYYY для поиска
const parts = targetDate.split('-');
const ddmmyyyy = \`\${parts[2]}.\${parts[1]}.\${parts[0]}\`;

db.all(query, [targetDate, targetDate, ddmmyyyy, targetDate], (err, rows) => {
    if (err) {
        console.error('❌ Ошибка запроса:', err.message);
        db.close();
        process.exit(1);
    }
    
    console.log('✅ Найдено записей:', rows ? rows.length : 0);
    
    if (!rows || rows.length === 0) {
        console.log('ℹ️ Данных за указанную дату нет');
        db.close();
        process.exit(0);
    }
    
    // Преобразуем данные для отправки
    const events = rows.map(row => {
        let eventTime = row.event_time;
        // Конвертируем DD.MM.YYYY HH:mm:ss в ISO8601
        if (eventTime.match(/^\d{2}\.\d{2}\.\d{4}/)) {
            const parts = eventTime.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(.+)$/);
            if (parts) {
                eventTime = \`\${parts[3]}-\${parts[2]}-\${parts[1]}T\${parts[4]}\`;
                if (!eventTime.includes('Z') && !eventTime.match(/[+-]\d{2}:\d{2}$/)) {
                    eventTime += '+00:00';
                }
            }
        } else if (!eventTime.includes('T')) {
            // Если формат YYYY-MM-DD HH:mm:ss
            eventTime = eventTime.replace(' ', 'T');
            if (!eventTime.includes('Z') && !eventTime.match(/[+-]\d{2}:\d{2}$/)) {
                eventTime += '+00:00';
            }
        }
        
        return {
            username: row.username,
            event_type: row.event_type,
            event_time: eventTime,
            event_id: row.event_id
        };
    });
    
    // Сохраняем JSON в файл для PowerShell
    fs.writeFileSync(outputFile, JSON.stringify(events, null, 2), 'utf8');
    console.log('JSON saved to:', outputFile);
    
    db.close();
});
"@

# Сохраняем скрипт для получения данных
$nodeScript | Out-File -FilePath $tempScript -Encoding UTF8

try {
    # Выполняем Node.js скрипт для получения данных
    Write-Host "`n🔍 Получаем данные из базы за дату: $Date..." -ForegroundColor Yellow
    $output = & node $tempScript 2>&1
    
    # Выводим логи Node.js
    foreach ($line in $output) {
        if ($line -match '^📅|^✅|^ℹ️|^❌') {
            Write-Host $line
        }
    }
    
    # Проверяем наличие JSON файла
    if (-not (Test-Path $tempJsonFile)) {
        Write-Host "`nℹ️ Данных за указанную дату нет в базе" -ForegroundColor Yellow
        Remove-Item $tempScript -ErrorAction SilentlyContinue
        Remove-Item $tempJsonFile -ErrorAction SilentlyContinue
        Remove-Item $tempDatesFile -ErrorAction SilentlyContinue
        Read-Host "Нажмите Enter для выхода"
        exit 0
    }
    
    # Читаем JSON из файла
    $jsonText = Get-Content $tempJsonFile -Raw -Encoding UTF8
    $events = $jsonText | ConvertFrom-Json
    
    if (-not $events -or $events.Count -eq 0) {
        Write-Host "`nℹ️ Данных за указанную дату нет в базе" -ForegroundColor Yellow
        Remove-Item $tempScript -ErrorAction SilentlyContinue
        Remove-Item $tempJsonFile -ErrorAction SilentlyContinue
        Remove-Item $tempDatesFile -ErrorAction SilentlyContinue
        Read-Host "Нажмите Enter для выхода"
        exit 0
    }
    
    Write-Host "✅ Найдено событий: $($events.Count)" -ForegroundColor Green
    
    # Отправляем данные на сервер
    $apiUrl = "$GOOGLE_SERVER_URL/api/remote-worktime-batch"
    $headers = @{
        "X-API-Key" = $REMOTE_WORKTIME_API_KEY
        "Content-Type" = "application/json"
    }
    
    # Преобразуем события в массив объектов для отправки
    $eventsArray = @()
    foreach ($event in $events) {
        $eventsArray += @{
            username = $event.username
            event_type = $event.event_type
            event_time = $event.event_time
            event_id = $event.event_id
        }
    }
    
    $body = @{
        events = $eventsArray
    } | ConvertTo-Json -Depth 10
    
    Write-Host "`n🚀 Отправляем данные на сервер..." -ForegroundColor Yellow
    Write-Host "📤 URL: $apiUrl" -ForegroundColor Gray
    Write-Host "📦 Событий: $($eventsArray.Count)" -ForegroundColor Gray
    Write-Host "📅 Дата: $Date" -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $body -TimeoutSec 30
        
        Write-Host "`n✅ Данные успешно отправлены!" -ForegroundColor Green
        Write-Host "📊 Ответ сервера:" -ForegroundColor Cyan
        $response | ConvertTo-Json -Depth 5 | Write-Host
        
        if ($response.success) {
            Write-Host "`n✅ Успешно отправлено событий: $($response.processed)" -ForegroundColor Green
            Write-Host "📊 Создано новых: $($response.created)" -ForegroundColor Green
            Write-Host "🔄 Пропущено дубликатов: $($response.skipped)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "`n❌ Ошибка отправки данных:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host $_.ErrorDetails.Message -ForegroundColor Red
        }
    }
    
} finally {
    # Удаляем временные файлы
    Remove-Item $tempScript -ErrorAction SilentlyContinue
    Remove-Item $tempJsonFile -ErrorAction SilentlyContinue
    Remove-Item $tempDatesFile -ErrorAction SilentlyContinue
}

Write-Host "`n✅ Готово!" -ForegroundColor Green
Read-Host "Нажмите Enter для выхода"

