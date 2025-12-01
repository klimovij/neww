# Скрипт для автоматического обновления сервера
# Выполняет команды через curl (если есть публичный доступ) или показывает инструкции

$serverIP = "35.232.108.72"
$updateScriptUrl = "https://raw.githubusercontent.com/klimovij/neww/main/mesendger/telegram-clone/deploy/update-server.sh"

Write-Host "🚀 Обновление сервера $serverIP" -ForegroundColor Green
Write-Host ""

# Попытка 1: Через gcloud (если установлен)
$gcloudPaths = @(
    "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:USERPROFILE\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
)

$instanceName = "instance-20251117-204836"
$zone = "us-central1-c"

foreach ($gcloudPath in $gcloudPaths) {
    if (Test-Path $gcloudPath) {
        Write-Host "✅ Найден gcloud: $gcloudPath" -ForegroundColor Green
        Write-Host "📤 Выполняю обновление через gcloud..." -ForegroundColor Yellow
        
        $updateCmd = "bash <(curl -s $updateScriptUrl)"
        
        try {
            & $gcloudPath compute ssh $instanceName --zone=$zone --command=$updateCmd
            Write-Host ""
            Write-Host "✅ Обновление завершено!" -ForegroundColor Green
            Write-Host "🌐 Проверьте: http://$serverIP" -ForegroundColor Cyan
            exit 0
        } catch {
            Write-Host "❌ Ошибка при выполнении через gcloud: $_" -ForegroundColor Red
        }
        break
    }
}

Write-Host ""
Write-Host "⚠️  gcloud не найден или не удалось подключиться" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Выполните обновление вручную на сервере:" -ForegroundColor Yellow
Write-Host "1. Подключитесь к серверу через SSH или Google Cloud Console" -ForegroundColor White
Write-Host "2. Выполните команду:" -ForegroundColor White
Write-Host ""
        $cmd = "bash <(curl -s $updateScriptUrl)"
        Write-Host $cmd -ForegroundColor Cyan
Write-Host ""
Write-Host "Или скопируйте и выполните скрипт вручную:" -ForegroundColor White
Write-Host "cd /var/www/mesendger" -ForegroundColor Gray
Write-Host "sudo -u appuser git pull origin main" -ForegroundColor Gray
Write-Host "cd client-react && sudo -u appuser npm run build" -ForegroundColor Gray
Write-Host "sudo cp deploy/nginx.conf /etc/nginx/sites-available/mesendger" -ForegroundColor Gray
Write-Host "sudo nginx -t && sudo systemctl reload nginx" -ForegroundColor Gray
Write-Host "sudo -u appuser pm2 restart all" -ForegroundColor Gray
Write-Host ""

