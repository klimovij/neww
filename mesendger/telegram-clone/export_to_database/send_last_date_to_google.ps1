# PowerShell скрипт для отправки данных за последнюю доступную дату из локальной базы на Google сервер
# Использование: .\send_last_date_to_google.ps1

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

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
$tempDateFile = [System.IO.Path]::GetTempFileName() + ".txt"

# Экранируем пути для Node.js скрипта
$dbPathEscaped = $dbPath.Replace('\', '\\')
$tempJsonFileEscaped = $tempJsonFile.Replace('\', '\\')
$tempDateFileEscaped = $tempDateFile.Replace('\', '\\')

# Создаем временный Node.js скрипт для получения последней доступной даты и данных
$nodeScript = @"
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbPath = '$dbPathEscaped';
const outputFile = '$tempJsonFileEscaped';
const dateFile = '$tempDateFileEscaped';

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('❌ Ошибка открытия базы:', err.message);
        process.exit(1);
    }
});

// Сначала находим последнюю доступную дату
const findLastDateQuery = \`
    SELECT event_time
    FROM work_time_logs
    ORDER BY 
        CASE 
            WHEN substr(event_time, 5, 1) = '-' THEN substr(event_time, 1, 10)
            WHEN substr(event_time, 3, 1) = '.' THEN 
                substr(event_time, 7, 4) || '-' || 
                substr(event_time, 4, 2) || '-' || 
                substr(event_time, 1, 2)
            ELSE NULL
        END DESC
    LIMIT 1
\`;

db.get(findLastDateQuery, [], (err, row) => {
    if (err) {
        console.error('❌ Ошибка поиска последней даты:', err.message);
        db.close();
        process.exit(1);
    }
    
    if (!row || !row.event_time) {
        console.log('ℹ️ Данных в базе нет');
        fs.writeFileSync(dateFile, '', 'utf8');
        db.close();
        process.exit(0);
    }
    
    let targetDate = '';
    const eventTime = row.event_time;
    
    // Определяем формат и извлекаем дату
    if (eventTime.length >= 10 && eventTime.charAt(4) === '-') {
        targetDate = eventTime.substring(0, 10);
    } else if (eventTime.length >= 10 && eventTime.charAt(2) === '.') {
        const parts = eventTime.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
        if (parts) {
            targetDate = \`\${parts[3]}-\${parts[2]}-\${parts[1]}\`;
        }
    }
    
    if (!targetDate) {
        console.log('ℹ️ Не удалось определить дату');
        fs.writeFileSync(dateFile, '', 'utf8');
        db.close();
        process.exit(0);
    }
    
    console.log('📅 Последняя доступная дата:', targetDate);
    fs.writeFileSync(dateFile, targetDate, 'utf8');
    
    // Теперь получаем данные за эту дату
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
            console.log('ℹ️ Данных за эту дату нет');
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
});
"@

# Сохраняем временный скрипт
$nodeScript | Out-File -FilePath $tempScript -Encoding UTF8

try {
    # Выполняем Node.js скрипт для получения данных
    Write-Host "`n🔍 Ищем последнюю доступную дату в базе..." -ForegroundColor Yellow

    # ВАЖНО: запускаем node из папки server, чтобы работал require('sqlite3')
    $serverDir = Join-Path $PSScriptRoot "..\server"
    if (-not (Test-Path $serverDir)) {
        $serverDir = Join-Path $PSScriptRoot "..\..\server"
    }

    if (-not (Test-Path $serverDir)) {
        Write-Host "❌ Не найдена директория server для подключения модуля sqlite3" -ForegroundColor Red
        Read-Host "Нажмите Enter для выхода"
        exit 1
    }

    Push-Location $serverDir
    $output = & node $tempScript 2>&1
    Pop-Location
    
    # Выводим все логи Node.js (чтобы видеть реальные ошибки)
    foreach ($line in $output) {
        Write-Host $line
    }
    
    # Проверяем наличие файла с датой
    if (-not (Test-Path $tempDateFile)) {
        Write-Host "`n❌ Не удалось найти дату в базе!" -ForegroundColor Red
        Remove-Item $tempScript -ErrorAction SilentlyContinue
        Remove-Item $tempDateFile -ErrorAction SilentlyContinue
        Remove-Item $tempJsonFile -ErrorAction SilentlyContinue
        Read-Host "Нажмите Enter для выхода"
        exit 1
    }
    
    # Читаем найденную дату
    $targetDate = Get-Content $tempDateFile -Raw -Encoding UTF8
    $targetDate = $targetDate.Trim()
    
    if ([string]::IsNullOrEmpty($targetDate)) {
        Write-Host "`nℹ️ Данных в базе нет!" -ForegroundColor Yellow
        Remove-Item $tempScript -ErrorAction SilentlyContinue
        Remove-Item $tempDateFile -ErrorAction SilentlyContinue
        Remove-Item $tempJsonFile -ErrorAction SilentlyContinue
        Read-Host "Нажмите Enter для выхода"
        exit 0
    }
    
    Write-Host "`n📅 Выбрана дата: $targetDate" -ForegroundColor Cyan
    
    # Проверяем наличие JSON файла
    if (-not (Test-Path $tempJsonFile)) {
        Write-Host "`nℹ️ Данных за эту дату нет в базе" -ForegroundColor Yellow
        Remove-Item $tempScript -ErrorAction SilentlyContinue
        Remove-Item $tempDateFile -ErrorAction SilentlyContinue
        Remove-Item $tempJsonFile -ErrorAction SilentlyContinue
        Read-Host "Нажмите Enter для выхода"
        exit 0
    }
    
    # Читаем JSON из файла
    $jsonText = Get-Content $tempJsonFile -Raw -Encoding UTF8
    $events = $jsonText | ConvertFrom-Json
    
    if (-not $events -or $events.Count -eq 0) {
        Write-Host "`nℹ️ Данных за эту дату нет в базе" -ForegroundColor Yellow
        Remove-Item $tempScript -ErrorAction SilentlyContinue
        Remove-Item $tempDateFile -ErrorAction SilentlyContinue
        Remove-Item $tempJsonFile -ErrorAction SilentlyContinue
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
    Write-Host "📅 Дата: $targetDate" -ForegroundColor Gray
    
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
    Remove-Item $tempDateFile -ErrorAction SilentlyContinue
}

Write-Host "`n✅ Готово!" -ForegroundColor Green
Read-Host "Нажмите Enter для выхода"

