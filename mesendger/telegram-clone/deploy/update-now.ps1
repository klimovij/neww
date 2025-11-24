# Quick server update script
$serverIP = "35.232.108.72"
$instanceName = "instance-20251117-204836"
$zone = "us-central1-c"

$updateCmd = "cd /tmp && sudo rm -rf mesendger-god && sudo git clone https://github.com/klimovij/neww.git mesendger-god && sudo rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'build' --exclude '*.log' --exclude '*.db*' mesendger-god/mesendger/telegram-clone/ /var/www/mesendger/ && sudo chown -R appuser:appuser /var/www/mesendger && cd /var/www/mesendger/server && sudo -u appuser npm install --production && cd /var/www/mesendger/client-react && sudo -u appuser npm install && sudo -u appuser CI=false npm run build && sudo -u appuser pm2 restart all && sudo -u appuser pm2 status"

Write-Host "Updating server..." -ForegroundColor Green

# Try gcloud first
$gcloudPaths = @(
    "${env:ProgramFiles}\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "${env:LOCALAPPDATA}\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
)

$updated = $false
foreach ($gcloudPath in $gcloudPaths) {
    if (Test-Path $gcloudPath) {
        Write-Host "Found gcloud, executing update..." -ForegroundColor Yellow
        & $gcloudPath compute ssh $instanceName --zone=$zone --command=$updateCmd
        $updated = $true
        break
    }
}

if (-not $updated) {
    Write-Host ""
    Write-Host "Please run this command on the server:" -ForegroundColor Yellow
    Write-Host $updateCmd -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or use:" -ForegroundColor Yellow
    Write-Host "bash <(curl -s https://raw.githubusercontent.com/klimovij/neww/main/mesendger/telegram-clone/deploy/update-server.sh)" -ForegroundColor Cyan
}

