# Check real agent logs to see if data is being sent successfully
Write-Host "Checking real agent sending status..." -ForegroundColor Cyan
Write-Host ""

$logsDir = "C:\pc-worktime\logs"
$today = Get-Date -Format "yyyy-MM-dd"
$logFile = Join-Path $logsDir "activity_$today.jsonl"
$agentLogFile = Join-Path $logsDir "agent_startup.log"

if (-not (Test-Path $logFile)) {
    Write-Host "Log file not found: $logFile" -ForegroundColor Red
    exit 1
}

# Check agent startup log for sending status
if (Test-Path $agentLogFile) {
    Write-Host "Checking agent startup log..." -ForegroundColor Yellow
    $agentLogs = Get-Content $agentLogFile -Tail 30
    
    $sentCount = 0
    $errorCount = 0
    
    foreach ($line in $agentLogs) {
        if ($line -match "SUCCESS|imported|✅") {
            $sentCount++
            Write-Host "  Found success: $($line.Substring(0, [Math]::Min(100, $line.Length)))" -ForegroundColor Green
        }
        if ($line -match "ERROR|❌|failed|400|500") {
            $errorCount++
            Write-Host "  Found error: $($line.Substring(0, [Math]::Min(100, $line.Length)))" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Recent agent activity:" -ForegroundColor Yellow
    Write-Host "  Success messages: $sentCount" -ForegroundColor $(if ($sentCount -gt 0) { "Green" } else { "Yellow" })
    Write-Host "  Error messages: $errorCount" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Red" })
}

# Check activity log file size - if it's growing, agent is collecting data
Write-Host ""
Write-Host "Checking activity log file..." -ForegroundColor Yellow
$fileInfo = Get-Item $logFile
$fileSize = [Math]::Round($fileInfo.Length / 1KB, 2)
Write-Host "  File: $($fileInfo.Name)" -ForegroundColor Gray
Write-Host "  Size: $fileSize KB" -ForegroundColor Gray
Write-Host "  Last modified: $($fileInfo.LastWriteTime)" -ForegroundColor Gray

# Count events in log
$lines = Get-Content $logFile
$eventCount = $lines.Count
Write-Host "  Total events: $eventCount" -ForegroundColor Gray

if ($eventCount -gt 0) {
    # Check last event
    $lastEvent = $lines[-1] | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($lastEvent) {
        Write-Host ""
        Write-Host "Last event in log:" -ForegroundColor Yellow
        Write-Host "  Timestamp: $($lastEvent.timestamp)" -ForegroundColor Gray
        Write-Host "  Process: $($lastEvent.procName)" -ForegroundColor Gray
        Write-Host "  Window: $($lastEvent.windowTitle.Substring(0, [Math]::Min(50, $lastEvent.windowTitle.Length)))" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Agent status:" -ForegroundColor Cyan
Write-Host "  1. If log file is growing and recent - agent is collecting data" -ForegroundColor Gray
Write-Host "  2. If you see success messages - data is being sent to server" -ForegroundColor Gray
Write-Host "  3. Check modal in web interface to see if data appears" -ForegroundColor Gray

