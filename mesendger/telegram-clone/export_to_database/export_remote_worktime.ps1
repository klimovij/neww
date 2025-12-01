param(
    [Parameter(Mandatory = $false)]
    [string]$Date  # format: YYYY-MM-DD or DD.MM.YYYY (если не указан - берет вчерашний день)
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Определяем дату
if (-not $Date) {
    # Если дата не указана - берем вчерашний день
    $yesterday = (Get-Date).AddDays(-1)
    $Date = $yesterday.ToString("yyyy-MM-dd")
    Write-Host "Дата не указана, используем вчерашний день: $Date" -ForegroundColor Yellow
}

# Нормализуем формат даты (DD.MM.YYYY -> YYYY-MM-DD)
if ($Date -match '^(\d{1,2})\.(\d{1,2})\.(\d{4})$') {
    $day = $matches[1].PadLeft(2, '0')
    $month = $matches[2].PadLeft(2, '0')
    $year = $matches[3]
    $Date = "$year-$month-$day"
    Write-Host "Converted date format to: $Date" -ForegroundColor Cyan
}

# ---------- Paths ----------
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$dbPath = Join-Path $scriptRoot "..\server\messenger.db"

if (-not (Test-Path $dbPath)) {
    $dbPath = Join-Path $scriptRoot "..\..\server\messenger.db"
}
if (-not (Test-Path $dbPath)) {
    Write-Host "Database file not found: $dbPath" -ForegroundColor Red
    Write-Host "Expected paths:" -ForegroundColor Yellow
    Write-Host "  1. $(Join-Path $scriptRoot '..\server\messenger.db')" -ForegroundColor Gray
    Write-Host "  2. $(Join-Path $scriptRoot '..\..\server\messenger.db')" -ForegroundColor Gray
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Found database: $dbPath" -ForegroundColor Green

# ---------- Read .env ----------
$envPath = Join-Path $scriptRoot "..\server\.env"
if (-not (Test-Path $envPath)) {
    $envPath = Join-Path $scriptRoot "..\..\server\.env"
}

$GOOGLE_SERVER_URL = ""
$REMOTE_WORKTIME_API_KEY = ""

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
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

if (-not $GOOGLE_SERVER_URL) {
    $GOOGLE_SERVER_URL = "http://35.232.108.72"
}
if (-not $REMOTE_WORKTIME_API_KEY) {
    $REMOTE_WORKTIME_API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="
}

Write-Host "Server URL: $GOOGLE_SERVER_URL" -ForegroundColor Cyan
Write-Host "Target Date: $Date" -ForegroundColor Cyan

# ---------- Check Node ----------
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "Node.js not found. Please install Node.js." -ForegroundColor Red
    Write-Host "Download: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Node.js found: $($nodePath.Source)" -ForegroundColor Green

# ---------- Temp files ----------
$tempScript = [System.IO.Path]::GetTempFileName() + ".js"
$tempJson   = [System.IO.Path]::GetTempFileName() + ".json"

$dbPathEscaped   = $dbPath.Replace('\', '\\')
$tempJsonEscaped = $tempJson.Replace('\', '\\')
$dateEscaped     = $Date.Replace("'", "''")

# ---------- JS script ----------
$nodeScript = @"
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbPath = '$dbPathEscaped';
const outputFile = '$tempJsonEscaped';
const targetDate = '$dateEscaped';

console.log('📅 Target date:', targetDate);
console.log('💾 Database:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('❌ DB open error:', err.message);
        process.exit(1);
    }
    console.log('✅ Database opened successfully');
});

// Запрос для поиска записей за указанную дату в разных форматах
// Поддерживаем форматы: YYYY-MM-DD, DD.MM.YYYY HH:MM:SS, и другие варианты
const query = 
"SELECT username, event_type, event_time, event_id " +
"FROM work_time_logs " +
"WHERE (" +
" (length(event_time) >= 10 AND substr(event_time,5,1)='-' AND substr(event_time,8,1)='-' " +
"  AND substr(event_time,1,10) = ?) " +
" OR " +
" (length(event_time) >= 10 AND substr(event_time,3,1)='.' AND substr(event_time,6,1)='.' " +
"  AND (substr(event_time,7,4)||'-'||substr(event_time,4,2)||'-'||substr(event_time,1,2)) = ?)" +
" OR " +
" (length(event_time) >= 10 AND date(event_time) = ?)" +
") " +
"ORDER BY username, event_time";

const parts = targetDate.split('-');
const ddmmyyyy = parts.length === 3 ? (parts[2] + '.' + parts[1] + '.' + parts[0]) : '';

console.log('🔍 Searching for date:', targetDate);
if (ddmmyyyy) {
    console.log('🔍 Searching for date (DD.MM.YYYY format):', ddmmyyyy);
}

db.all(query, [targetDate, targetDate, targetDate], (err, rows) => {
    if (err) {
        console.error('❌ Query error:', err.message);
        db.close();
        process.exit(1);
    }

    console.log('📊 Rows found:', rows ? rows.length : 0);

    if (!rows || rows.length === 0) {
        console.log('⚠️ No rows found. Checking database structure...');
        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%work_time%'", [], (err, tables) => {
            if (err) {
                console.error('❌ Error checking tables:', err.message);
                fs.writeFileSync(outputFile, '[]', 'utf8');
                db.close();
                process.exit(0);
                return;
            }
            
            if (tables && tables.length > 0) {
                console.log('📋 Tables found:', tables.map(t => t.name).join(', '));
                // Показываем примеры дат из таблицы
                db.all("SELECT DISTINCT substr(event_time, 1, 10) as date_sample FROM work_time_logs ORDER BY date_sample DESC LIMIT 10", [], (err, samples) => {
                    if (err) {
                        console.error('❌ Error getting samples:', err.message);
                    } else if (samples && samples.length > 0) {
                        console.log('📅 Sample dates in database:');
                        samples.forEach(s => console.log('  -', s.date_sample || '(null)'));
                    } else {
                        console.log('⚠️ No data in work_time_logs table');
                    }
                    
                    // Также проверим remote_work_time_logs
                    db.all("SELECT COUNT(*) as cnt FROM remote_work_time_logs WHERE date(event_time) = ?", [targetDate], (err, remoteCnt) => {
                        if (!err && remoteCnt && remoteCnt[0]) {
                            console.log('📊 Remote work_time_logs for this date:', remoteCnt[0].cnt);
                        }
                        fs.writeFileSync(outputFile, '[]', 'utf8');
                        db.close();
                        process.exit(0);
                    });
                });
            } else {
                console.log('❌ No work_time_logs table found!');
                fs.writeFileSync(outputFile, '[]', 'utf8');
                db.close();
                process.exit(0);
            }
        });
        return;
    }

    const events = rows.map(row => {
        let t = row.event_time;

        // Конвертируем DD.MM.YYYY в ISO формат
        if (/^\d{2}\.\d{2}\.\d{4}/.test(t)) {
            const m = t.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(.+)$/);
            if (m) {
                t = m[3] + '-' + m[2] + '-' + m[1] + 'T' + m[4];
                if (!/[Z+\-]\d{2}:?\d{2}$/.test(t)) {
                    t += '+00:00';
                }
            }
        } else if (t.indexOf('T') === -1) {
            t = t.replace(' ', 'T');
            if (!/[Z+\-]\d{2}:?\d{2}$/.test(t)) {
                t += '+00:00';
            }
        }

        return {
            username: row.username,
            event_type: row.event_type,
            event_time: t,
            event_id: row.event_id || (row.event_type === 'logout' ? 4634 : 4624)
        };
    });

    console.log('✅ Events processed:', events.length);
    console.log('👥 Unique users:', [...new Set(events.map(e => e.username))].join(', '));

    fs.writeFileSync(outputFile, JSON.stringify(events, null, 2), 'utf8');
    console.log('💾 JSON saved to:', outputFile);
    db.close();
});
"@

$nodeScript | Out-File -FilePath $tempScript -Encoding UTF8

try {
    # run node from server dir so sqlite3 module is available
    $serverDir = Join-Path $scriptRoot "..\server"
    if (-not (Test-Path $serverDir)) {
        $serverDir = Join-Path $scriptRoot "..\..\server"
    }

    Write-Host "`n📂 Server directory: $serverDir" -ForegroundColor Cyan

    # Check if sqlite3 module exists
    $sqlite3Path = Join-Path $serverDir "node_modules\sqlite3"
    if (-not (Test-Path $sqlite3Path)) {
        Write-Host "❌ sqlite3 module not found in $sqlite3Path" -ForegroundColor Red
        Write-Host "Run: cd $serverDir && npm install sqlite3" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }

    Write-Host "✅ sqlite3 module found" -ForegroundColor Green

    # Temporarily set NODE_PATH so Node can find sqlite3 from server/node_modules
    $oldNodePath = $env:NODE_PATH
    $env:NODE_PATH = Join-Path $serverDir "node_modules"

    Write-Host "`n🔄 Running Node.js script..." -ForegroundColor Yellow
    Push-Location $serverDir
    $output = & node $tempScript 2>&1
    Pop-Location

    # Restore previous NODE_PATH
    $env:NODE_PATH = $oldNodePath

    $output | ForEach-Object { Write-Host $_ }

    if (-not (Test-Path $tempJson)) {
        Write-Host "`n⚠️ No JSON file created, probably no data for this date." -ForegroundColor Yellow
        Write-Host "Date searched: $Date" -ForegroundColor Gray
        Read-Host "Press Enter to exit"
        exit 0
    }

    $jsonText = Get-Content $tempJson -Raw -Encoding UTF8
    $events = $jsonText | ConvertFrom-Json

    if (-not $events -or $events.Count -eq 0) {
        Write-Host "`n⚠️ No events found for date: $Date" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 0
    }

    Write-Host "`n📊 Events to send: $($events.Count)" -ForegroundColor Green
    Write-Host "👥 Users: $([string]::Join(', ', ($events | Select-Object -ExpandProperty username -Unique)))" -ForegroundColor Cyan

    # Отправка на сервер
    $apiUrl = "$GOOGLE_SERVER_URL/api/remote-worktime-batch"
    $headers = @{
        "X-API-Key"   = $REMOTE_WORKTIME_API_KEY
        "Content-Type" = "application/json; charset=utf-8"
    }

    $eventsArray = @()
    foreach ($e in $events) {
        $eventsArray += @{
            username   = $e.username
            event_type = $e.event_type
            event_time = $e.event_time
            event_id   = $e.event_id
        }
    }

    # Явно кодируем тело запроса в UTF-8, чтобы русские имена не превращались в вопросительные знаки
    $bodyObject = @{ events = $eventsArray }
    $bodyJson   = $bodyObject | ConvertTo-Json -Depth 10
    $bodyBytes  = [System.Text.Encoding]::UTF8.GetBytes($bodyJson)

    Write-Host "`n🚀 Sending to $apiUrl ..." -ForegroundColor Yellow
    
    try {
        $resp = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $bodyBytes -TimeoutSec 30

        Write-Host "`n✅ Server response:" -ForegroundColor Green
        $resp | ConvertTo-Json -Depth 5 | Write-Host
        
        if ($resp.success -and $resp.imported) {
            Write-Host "`n🎉 Successfully imported $($resp.imported) events!" -ForegroundColor Green
            if ($resp.skipped -and $resp.skipped -gt 0) {
                Write-Host "⚠️ Skipped $($resp.skipped) events (duplicates or technical accounts)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "`n⚠️ Warning: Response indicates possible issues" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "`n❌ Error sending data to server:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray
        }
        Read-Host "Press Enter to exit"
        exit 1
    }
}
catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    }
    Read-Host "Press Enter to exit"
    exit 1
}
finally {
    Remove-Item $tempScript -ErrorAction SilentlyContinue
    Remove-Item $tempJson   -ErrorAction SilentlyContinue
}

Write-Host "`n✅ Done!" -ForegroundColor Green
Read-Host "Press Enter to exit"

