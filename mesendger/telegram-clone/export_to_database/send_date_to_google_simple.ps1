param(
    [Parameter(Mandatory = $true)]
    [string]$Date  # format: YYYY-MM-DD
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ---------- Paths ----------
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$dbPath = Join-Path $scriptRoot "..\server\messenger.db"

if (-not (Test-Path $dbPath)) {
    $dbPath = Join-Path $scriptRoot "..\..\server\messenger.db"
}
if (-not (Test-Path $dbPath)) {
    Write-Host "Database file not found: $dbPath" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

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

Write-Host "DB: $dbPath" -ForegroundColor Cyan
Write-Host "Server: $GOOGLE_SERVER_URL" -ForegroundColor Cyan
Write-Host "Date: $Date" -ForegroundColor Cyan

# ---------- Check Node ----------
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "Node.js not found. Please install Node.js." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

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

console.log('Target date:', targetDate);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('DB open error:', err.message);
        process.exit(1);
    }
});

const query =
"SELECT username, event_type, event_time, event_id " +
"FROM work_time_logs " +
"WHERE (" +
" (length(event_time) >= 10 AND substr(event_time,5,1)='-' AND substr(event_time,8,1)='-' " +
"  AND substr(event_time,1,10) = ?) " +
" OR " +
" (length(event_time) >= 10 AND substr(event_time,3,1)='.' AND substr(event_time,6,1)='.' " +
"  AND (substr(event_time,7,4)||'-'||substr(event_time,4,2)||'-'||substr(event_time,1,2)) = ?)" +
") " +
"ORDER BY username, event_time";

const parts = targetDate.split('-');
const ddmmyyyy = parts[2] + '.' + parts[1] + '.' + parts[0];

db.all(query, [targetDate, ddmmyyyy], (err, rows) => {
    if (err) {
        console.error('Query error:', err.message);
        db.close();
        process.exit(1);
    }

    console.log('Rows found:', rows ? rows.length : 0);

    if (!rows || rows.length === 0) {
        fs.writeFileSync(outputFile, '[]', 'utf8');
        db.close();
        process.exit(0);
    }

    const events = rows.map(row => {
        let t = row.event_time;

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
            event_id: row.event_id
        };
    });

    fs.writeFileSync(outputFile, JSON.stringify(events, null, 2), 'utf8');
    console.log('JSON saved to:', outputFile);
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

    # Temporarily set NODE_PATH so Node can find sqlite3 from server/node_modules
    $oldNodePath = $env:NODE_PATH
    $env:NODE_PATH = Join-Path $serverDir "node_modules"

    Push-Location $serverDir
    $output = & node $tempScript 2>&1
    Pop-Location

    # Restore previous NODE_PATH
    $env:NODE_PATH = $oldNodePath

    $output | ForEach-Object { Write-Host $_ }

    if (-not (Test-Path $tempJson)) {
        Write-Host "No JSON file created, probably no data for this date." -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 0
    }

    $jsonText = Get-Content $tempJson -Raw -Encoding UTF8
    $events = $jsonText | ConvertFrom-Json

    if (-not $events -or $events.Count -eq 0) {
        Write-Host "No events for this date." -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 0
    }

    Write-Host "Events to send: $($events.Count)" -ForegroundColor Green

    $apiUrl = "$GOOGLE_SERVER_URL/api/remote-worktime-batch"
    $headers = @{
        "X-API-Key"   = $REMOTE_WORKTIME_API_KEY
        "Content-Type" = "application/json"
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

    $body = @{ events = $eventsArray } | ConvertTo-Json -Depth 10

    Write-Host "Sending to $apiUrl ..." -ForegroundColor Yellow
    $resp = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $body -TimeoutSec 30

    Write-Host "Server response:" -ForegroundColor Cyan
    $resp | ConvertTo-Json -Depth 5 | Write-Host
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    }
}
finally {
    Remove-Item $tempScript -ErrorAction SilentlyContinue
    Remove-Item $tempJson   -ErrorAction SilentlyContinue
}

Read-Host "Press Enter to exit"