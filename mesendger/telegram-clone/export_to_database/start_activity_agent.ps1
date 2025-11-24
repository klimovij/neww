# Script to start activity agent manually
$scriptPath = "C:\Users\Ronin\web\pc-worktime\pc_activity_agent.ps1"

if (-not (Test-Path $scriptPath)) {
    $scriptPath = "C:\Users\$env:USERNAME\web\pc-worktime\pc_activity_agent.ps1"
}

if (-not (Test-Path $scriptPath)) {
    Write-Host "Script not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Starting agent: $scriptPath" -ForegroundColor Green

# Start in hidden window
$psArgs = "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$scriptPath`""
Start-Process powershell.exe -ArgumentList $psArgs -WindowStyle Hidden

Write-Host "Agent started! Check in 30 seconds with check_activity_agent.ps1" -ForegroundColor Green
