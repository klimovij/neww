# Скрипт для загрузки проекта на GitHub
# Запустите этот скрипт в PowerShell

Write-Host "🚀 Загрузка проекта на GitHub..." -ForegroundColor Green

# Проверка установки Git
try {
    $gitVersion = git --version
    Write-Host "✅ Git установлен: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git не установлен!" -ForegroundColor Red
    Write-Host "Скачайте Git с https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "Или установите через: winget install Git.Git" -ForegroundColor Yellow
    exit 1
}

# Переход в директорию проекта
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "📂 Текущая директория: $scriptPath" -ForegroundColor Cyan

# Проверка, инициализирован ли Git
if (-not (Test-Path .git)) {
    Write-Host "📦 Инициализация Git репозитория..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Репозиторий инициализирован" -ForegroundColor Green
} else {
    Write-Host "✅ Git репозиторий уже инициализирован" -ForegroundColor Green
}

# Проверка настроек Git
$userName = git config user.name
$userEmail = git config user.email

if (-not $userName -or -not $userEmail) {
    Write-Host "⚠️  Git не настроен. Настройте имя и email:" -ForegroundColor Yellow
    $name = Read-Host "Введите ваше имя для Git"
    $email = Read-Host "Введите ваш email для Git"
    
    if ($name -and $email) {
        git config --global user.name $name
        git config --global user.email $email
        Write-Host "✅ Git настроен" -ForegroundColor Green
    }
}

# Добавление всех файлов
Write-Host "📝 Добавление файлов..." -ForegroundColor Yellow
git add .

# Проверка статуса
$status = git status --short
if ($status) {
    Write-Host "📋 Изменения для коммита:" -ForegroundColor Cyan
    Write-Host $status
    
    # Создание коммита
    $commitMessage = Read-Host "Введите сообщение для коммита (или нажмите Enter для 'Initial commit')"
    if (-not $commitMessage) {
        $commitMessage = "Initial commit: мессенджер готов к развертыванию"
    }
    
    git commit -m $commitMessage
    Write-Host "✅ Коммит создан" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Нет изменений для коммита" -ForegroundColor Cyan
}

# Проверка remote
$remote = git remote get-url origin 2>$null
if ($remote) {
    Write-Host "✅ Удаленный репозиторий: $remote" -ForegroundColor Green
} else {
    Write-Host "🔗 Добавление удаленного репозитория..." -ForegroundColor Yellow
    git remote add origin https://github.com/klimovij/Klim.git
    Write-Host "✅ Удаленный репозиторий добавлен" -ForegroundColor Green
}

# Переименование ветки в main (если нужно)
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host "🔄 Переименование ветки в main..." -ForegroundColor Yellow
    git branch -M main
    Write-Host "✅ Ветка переименована в main" -ForegroundColor Green
}

# Загрузка на GitHub
Write-Host "📤 Загрузка на GitHub..." -ForegroundColor Yellow
Write-Host "⚠️  Если это первый раз, может потребоваться авторизация" -ForegroundColor Yellow

try {
    git push -u origin main
    Write-Host "✅ Код успешно загружен на GitHub!" -ForegroundColor Green
    Write-Host "🌐 Репозиторий: https://github.com/klimovij/Klim" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Ошибка при загрузке. Возможные причины:" -ForegroundColor Red
    Write-Host "   1. Репозиторий не пустой - используйте --force (осторожно!)" -ForegroundColor Yellow
    Write-Host "   2. Нужна авторизация - настройте SSH ключи или Personal Access Token" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Попробуйте выполнить вручную:" -ForegroundColor Yellow
    Write-Host "   git push -u origin main" -ForegroundColor White
    Write-Host "   или" -ForegroundColor White
    Write-Host "   git push -u origin main --force" -ForegroundColor White
}

Write-Host ""
Write-Host "📚 Следующие шаги:" -ForegroundColor Cyan
Write-Host "   1. Проверьте репозиторий: https://github.com/klimovij/Klim" -ForegroundColor White
Write-Host "   2. Следуйте инструкции в deploy/DEPLOY_FROM_GIT.md для развертывания на сервере" -ForegroundColor White

