# Simple server update script
$gcloudPath = "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$instanceName = "instance-20251117-204836"
$zone = "us-central1-c"
$updateScriptUrl = "https://raw.githubusercontent.com/klimovij/neww/main/mesendger/telegram-clone/deploy/update-server.sh"

if (Test-Path $gcloudPath) {
    Write-Host "Found gcloud, updating server..." -ForegroundColor Green
    $cmd = "bash -c `"bash <(curl -s $updateScriptUrl)`""
    & $gcloudPath compute ssh $instanceName --zone=$zone --command=$cmd
    Write-Host "Done!" -ForegroundColor Green
} else {
    Write-Host "gcloud not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run on server:" -ForegroundColor Cyan
    Write-Host "bash <(curl -s $updateScriptUrl)" -ForegroundColor White
}
