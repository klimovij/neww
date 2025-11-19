# Скрипт для развертывания проекта на Google Cloud
# Использование: .\deploy-to-gcloud.ps1

$INSTANCE_NAME = "instance-20251117-204836"
$ZONE = "us-central1-c"
$EXTERNAL_IP = "35.232.108.72"
$GIT_REPO = "https://github.com/klimovij/neww.git"

Write-Host "🚀 Начинаем развертывание на Google Cloud..." -ForegroundColor Green
Write-Host "Instance: $INSTANCE_NAME" -ForegroundColor Cyan
Write-Host "Zone: $ZONE" -ForegroundColor Cyan
Write-Host "IP: $EXTERNAL_IP" -ForegroundColor Cyan

# Проверка наличия gcloud
Write-Host "`n📋 Проверка gcloud CLI..." -ForegroundColor Yellow
try {
    $gcloudVersion = gcloud --version 2>&1
    Write-Host "✅ gcloud установлен" -ForegroundColor Green
} catch {
    Write-Host "❌ gcloud не найден. Установите Google Cloud SDK:" -ForegroundColor Red
    Write-Host "https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Подключение к серверу и выполнение команд развертывания
Write-Host "`n🔌 Подключение к серверу и развертывание..." -ForegroundColor Yellow

# Проверка наличия локального скрипта
$deployScriptPath = Join-Path $PSScriptRoot "deploy-server.sh"
if (-not (Test-Path $deployScriptPath)) {
    Write-Host "❌ Файл deploy-server.sh не найден!" -ForegroundColor Red
    exit 1
}

Write-Host "`n📤 Загрузка скрипта на сервер..." -ForegroundColor Yellow
gcloud compute scp $deployScriptPath ${INSTANCE_NAME}:~/deploy.sh --zone=$ZONE

Write-Host "`n▶️ Выполнение скрипта развертывания на сервере..." -ForegroundColor Yellow
$sshCommand = "chmod +x ~/deploy.sh && bash ~/deploy.sh"
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command=$sshCommand

Write-Host "`n✅ Развертывание завершено!" -ForegroundColor Green
Write-Host "`n🌐 Приложение доступно по адресу: http://$EXTERNAL_IP" -ForegroundColor Cyan
Write-Host "`n📝 Полезные команды:" -ForegroundColor Yellow
Write-Host "  Просмотр логов: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='sudo -u appuser pm2 logs'" -ForegroundColor White
Write-Host "  Статус приложения: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='sudo -u appuser pm2 status'" -ForegroundColor White
Write-Host "  Перезапуск: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='sudo -u appuser pm2 restart all'" -ForegroundColor White

