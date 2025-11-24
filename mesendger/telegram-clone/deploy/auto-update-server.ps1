# Автоматическое обновление сервера
# Пробует разные способы подключения

$serverIP = "35.232.108.72"
$instanceName = "instance-20251117-204836"
$zone = "us-central1-c"
$updateScript = @"
cd /tmp
sudo rm -rf mesendger-god
sudo git clone https://github.com/klimovij/neww.git mesendger-god
sudo rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'build' --exclude '*.log' --exclude '*.db*' mesendger-god/mesendger/telegram-clone/ /var/www/mesendger/
sudo chown -R appuser:appuser /var/www/mesendger
cd /var/www/mesendger/server
sudo -u appuser npm install --production
cd /var/www/mesendger/client-react
sudo -u appuser npm install
sudo -u appuser CI=false npm run build
sudo -u appuser pm2 restart all
sudo -u appuser pm2 status
"@

Write-Host "🚀 Автоматическое обновление сервера..." -ForegroundColor Green
Write-Host ""

# Попытка 1: Через gcloud
Write-Host "🔍 Попытка подключения через gcloud..." -ForegroundColor Yellow
$gcloudPaths = @(
    "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:USERPROFILE\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
)

$gcloudFound = $false
foreach ($path in $gcloudPaths) {
    if (Test-Path $path) {
        Write-Host "✅ gcloud найден: $path" -ForegroundColor Green
        $gcloudCmd = "& `"$path`""
        Write-Host "📤 Выполнение команд на сервере через gcloud..." -ForegroundColor Yellow
        
        $tempScript = Join-Path $env:TEMP "update-server-$(Get-Date -Format 'yyyyMMddHHmmss').sh"
        $updateScript | Out-File -FilePath $tempScript -Encoding utf8 -NoNewline
        
        try {
            # Отправляем скриpt на сервер и выполняем
            $scpCmd = "$gcloudCmd compute scp `"$tempScript`" ${instanceName}:~/update.sh --zone=$zone"
            Invoke-Expression $scpCmd
            
            $sshCmd = "$gcloudCmd compute ssh $instanceName --zone=$zone --command='chmod +x ~/update.sh && bash ~/update.sh'"
            Invoke-Expression $sshCmd
            
            Remove-Item $tempScript -ErrorAction SilentlyContinue
            Write-Host ""
            Write-Host "✅ Обновление завершено!" -ForegroundColor Green
            Write-Host "🌐 Проверьте: http://$serverIP" -ForegroundColor Cyan
            exit 0
        } catch {
            Write-Host "❌ Ошибка при выполнении через gcloud: $_" -ForegroundColor Red
        }
        $gcloudFound = $true
        break
    }
}

if (-not $gcloudFound) {
    Write-Host "⚠️  gcloud не найден" -ForegroundColor Yellow
}

# Попытка 2: Через SSH (если настроены ключи)
Write-Host ""
Write-Host "🔍 Попытка подключения через SSH..." -ForegroundColor Yellow

# Проверяем стандартных пользователей
$users = @("appuser", "admin", "ubuntu", "debian", "user", "root")

foreach ($user in $users) {
    Write-Host "Попытка подключения как $user..." -ForegroundColor Gray
    try {
        $result = ssh -o ConnectTimeout=5 -o BatchMode=yes -o StrictHostKeyChecking=no "${user}@${serverIP}" "echo 'Connected'" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Подключение успешно как $user" -ForegroundColor Green
            Write-Host "📤 Выполнение команд обновления..." -ForegroundColor Yellow
            
            $tempScript = Join-Path $env:TEMP "update-server-$(Get-Date -Format 'yyyyMMddHHmmss').sh"
            $updateScript | Out-File -FilePath $tempScript -Encoding utf8 -NoNewline
            
            # Отправляем скрипт и выполняем
            scp $tempScript "${user}@${serverIP}:/tmp/update.sh"
            ssh "${user}@${serverIP}" "bash /tmp/update.sh"
            
            Remove-Item $tempScript -ErrorAction SilentlyContinue
            Write-Host ""
            Write-Host "✅ Обновление завершено!" -ForegroundColor Green
            exit 0
        }
    } catch {
        # Продолжаем попытки
    }
}

Write-Host ""
Write-Host "❌ Не удалось автоматически подключиться к серверу" -ForegroundColor Red
Write-Host ""
Write-Host "📋 Выполните обновление вручную:" -ForegroundColor Yellow
Write-Host "1. Подключитесь к серверу через SSH или Google Cloud Console" -ForegroundColor White
Write-Host "2. Выполните команду:" -ForegroundColor White
Write-Host ""
$curlCmd = 'bash <(curl -s https://raw.githubusercontent.com/klimovij/neww/main/mesendger/telegram-clone/deploy/update-server.sh)'
Write-Host $curlCmd -ForegroundColor Cyan
Write-Host ""

