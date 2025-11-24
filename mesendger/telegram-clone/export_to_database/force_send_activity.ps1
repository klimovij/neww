# Force send activity data to server manually
# This script reads unsent events from log file and sends them immediately

Write-Host "Force sending activity data to server..." -ForegroundColor Cyan
Write-Host ""

$GOOGLE_SERVER_URL = "http://35.232.108.72"
$REMOTE_WORKTIME_API_KEY = "BsKFpZmdp6ocPKUD6g6YxTgMSTZEaPZXkbddxsifERA="
$UserUsername = "Ksendzik_Oleg"
$LogFile = "C:\pc-worktime\logs\activity_$(Get-Date -Format 'yyyy-MM-dd').jsonl"

if (-not (Test-Path $LogFile)) {
    Write-Host "Log file not found: $LogFile" -ForegroundColor Red
    exit 1
}

Write-Host "Reading events from: $LogFile" -ForegroundColor Yellow

# Read all events from log file
$events = @()
$lines = Get-Content $LogFile

foreach ($line in $lines) {
    try {
        $event = $line | ConvertFrom-Json -ErrorAction Stop
        # Include all events (even if marked as sent)
        $events += $event
    } catch {
        # Skip invalid lines
    }
}

Write-Host "Found $($events.Count) events in log file" -ForegroundColor Gray

if ($events.Count -eq 0) {
    Write-Host "No events to send" -ForegroundColor Yellow
    exit 0
}

# Take last 50 events for testing
$eventsToSend = $events | Select-Object -Last 50

Write-Host "Preparing to send $($eventsToSend.Count) events..." -ForegroundColor Yellow

# Format events for server
$formattedEvents = @()
foreach ($event in $eventsToSend) {
    $formattedEvent = @{
        username = $UserUsername
        timestamp = $event.timestamp
        idleMinutes = if ($event.idleMinutes) { [int]$event.idleMinutes } else { 0 }
        procName = if ($event.procName) { $event.procName.ToString().Substring(0, [Math]::Min(128, $event.procName.Length)) } else { "" }
        windowTitle = if ($event.windowTitle) { $event.windowTitle.ToString().Substring(0, [Math]::Min(512, $event.windowTitle.Length)) } else { "" }
    }
    
    if ($event.browserUrl) {
        $formattedEvent.browserUrl = $event.browserUrl.ToString().Substring(0, [Math]::Min(512, $event.browserUrl.Length))
    }
    
    $formattedEvents += $formattedEvent
}

# Convert to JSON
$body = $formattedEvents | ConvertTo-Json -Depth 10 -Compress
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

$apiUrl = "$GOOGLE_SERVER_URL/api/activity-log-batch"
$headers = @{
    "X-API-Key" = $REMOTE_WORKTIME_API_KEY
    "Content-Type" = "application/json; charset=utf-8"
}

Write-Host ""
Write-Host "Sending to: $apiUrl" -ForegroundColor Yellow
Write-Host "Events count: $($formattedEvents.Count)" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $bodyBytes -TimeoutSec 15
    
    if ($response.success) {
        Write-Host ""
        Write-Host "SUCCESS!" -ForegroundColor Green
        Write-Host "  Imported: $($response.imported)" -ForegroundColor Green
        Write-Host "  Total: $($response.total)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Data sent successfully! Check modal in web interface." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Error: $($response.error)" -ForegroundColor Red
    }
} catch {
    $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 'unknown' }
    $errorMsg = $_.Exception.Message
    
    Write-Host ""
    Write-Host "ERROR ($statusCode): $errorMsg" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

