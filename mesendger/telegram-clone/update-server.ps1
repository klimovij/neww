# Скрипт для быстрого обновления сервера с GitHub
# Использование: .\update-server.ps1

$EXTERNAL_IP = "35.232.108.72"
$APP_DIR = "/var/www/mesendger"
$GIT_REPO = "https://github.com/klimovij/neww.git"

Write-Host "🚀 Обновление сервера..." -ForegroundColor Green
Write-Host "IP: $EXTERNAL_IP" -ForegroundColor Cyan
Write-Host ""

# Команды для выполнения на сервере
$commands = @"
cd /tmp
if [ -d "mesendger-god" ]; then
    sudo rm -rf mesendger-god
fi
sudo git clone $GIT_REPO mesendger-god
sudo rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'build' --exclude '*.log' --exclude '*.db*' mesendger-god/mesendger/telegram-clone/ $APP_DIR/
sudo chown -R appuser:appuser $APP_DIR
cd $APP_DIR/server
sudo -u appuser npm install --production
cd $APP_DIR/client-react
sudo -u appuser npm install
sudo -u appuser CI=false npm run build
sudo -u appuser pm2 restart all
sudo -u appuser pm2 status
"@

Write-Host "📋 Команды для обновления сервера:" -ForegroundColor Yellow
Write-Host $commands -ForegroundColor Gray
Write-Host ""

# Проверка gcloud
Write-Host "🔌 Проверка доступа к серверу..." -ForegroundColor Yellow

$gcloudAvailable = $false
$gcloudCheck = Get-Command gcloud -ErrorAction SilentlyContinue
if ($gcloudCheck) {
    $gcloudAvailable = $true
    Write-Host "✅ gcloud найден" -ForegroundColor Green
}

if ($gcloudAvailable) {
    Write-Host "📤 Отправка команд на сервер через gcloud..." -ForegroundColor Yellow
    
    $INSTANCE_NAME = "instance-20251117-204836"
    $ZONE = "us-central1-c"
    
    # Создаём временный файл с командами
    $tempFile = Join-Path $env:TEMP "update-server-commands.sh"
    $commands | Out-File -FilePath $tempFile -Encoding utf8 -NoNewline
    
    # Отправляем файл на сервер и выполняем
    Write-Host "Выполнение команд на сервере..." -ForegroundColor Yellow
    gcloud compute scp $tempFile ${INSTANCE_NAME}:~/update.sh --zone=$ZONE
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="chmod +x ~/update.sh && bash ~/update.sh"
    
    # Удаляем временный файл
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "✅ Обновление завершено!" -ForegroundColor Green
    Write-Host "🌐 Проверьте приложение: http://$EXTERNAL_IP" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  gcloud не найден" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Выполните эти команды на сервере через SSH:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "ssh username@$EXTERNAL_IP" -ForegroundColor White
    Write-Host ""
    Write-Host "Затем выполните:" -ForegroundColor Yellow
    Write-Host $commands -ForegroundColor White
}
