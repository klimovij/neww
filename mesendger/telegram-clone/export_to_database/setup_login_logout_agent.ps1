# Установщик агента отслеживания входа/выхода пользователя
# Устанавливает remote_login_logout_agent.ps1 в планировщике задач Windows
# Создает две задачи: Login (при входе) и Logout (при выходе)

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Для установки требуются права администратора!" -ForegroundColor Yellow
    Write-Host "Запустите PowerShell от имени администратора и повторите установку." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Нажмите любую клавишу для выхода..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  УСТАНОВКА АГЕНТА ВХОДА/ВЫХОДА" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Пути
$AGENT_DIR = "$env:APPDATA\mesendger"
$SCRIPT_NAME = "remote_login_logout_agent.ps1"
$TARGET_SCRIPT = Join-Path $AGENT_DIR $SCRIPT_NAME
$LOGIN_TASK_NAME = "MesendgerLoginAgent"
$LOGOUT_TASK_NAME = "MesendgerLogoutAgent"
$CURRENT_SCRIPT = $MyInvocation.MyCommand.Path
$CURRENT_DIR = Split-Path -Parent $CURRENT_SCRIPT
$SOURCE_SCRIPT = Join-Path $CURRENT_DIR $SCRIPT_NAME

# Проверяем существование исходного скрипта
if (-not (Test-Path $SOURCE_SCRIPT)) {
    Write-Host "❌ Ошибка: Не найден файл $SOURCE_SCRIPT" -ForegroundColor Red
    Write-Host "Убедитесь, что скрипт remote_login_logout_agent.ps1 находится в той же папке, что и установщик." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Нажмите любую клавишу для выхода..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Проверяем, что username указан в скрипте (не USERNAME_HERE)
Write-Host "🔍 Проверка конфигурации скрипта..." -ForegroundColor Cyan
$scriptContent = Get-Content $SOURCE_SCRIPT -Raw -Encoding UTF8

if ($scriptContent -match '\$script:USERNAME\s*=\s*"USERNAME_HERE"') {
    Write-Host ""
    Write-Host "❌ ОШИБКА: Username не указан в скрипте!" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  ВАЖНО: Перед установкой необходимо указать username в файле remote_login_logout_agent.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Инструкция:" -ForegroundColor Cyan
    Write-Host "  1. Откройте файл remote_login_logout_agent.ps1 в редакторе" -ForegroundColor Gray
    Write-Host "  2. Найдите строку: `$script:USERNAME = `"USERNAME_HERE`"" -ForegroundColor Gray
    Write-Host "  3. Замените USERNAME_HERE на реальный username, например: `$script:USERNAME = `"Ksendzik_Oleg`"" -ForegroundColor Gray
    Write-Host "  4. Сохраните файл и запустите установщик снова" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Нажмите любую клавишу для выхода..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "✅ Username указан в скрипте" -ForegroundColor Green

Write-Host ""
Write-Host "📁 Создание директории для агента..." -ForegroundColor Cyan
if (-not (Test-Path $AGENT_DIR)) {
    New-Item -ItemType Directory -Path $AGENT_DIR -Force | Out-Null
    Write-Host "✅ Директория создана: $AGENT_DIR" -ForegroundColor Green
} else {
    Write-Host "✅ Директория уже существует: $AGENT_DIR" -ForegroundColor Green
}

Write-Host ""
Write-Host "📄 Копирование скрипта агента..." -ForegroundColor Cyan

# Сохраняем в UTF-8 с BOM (спецификация)
$utf8WithBom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($TARGET_SCRIPT, $scriptContent, $utf8WithBom)

Write-Host "✅ Скрипт скопирован и сохранен в UTF-8 с BOM: $TARGET_SCRIPT" -ForegroundColor Green

Write-Host ""
Write-Host "🔧 Настройка планировщика задач..." -ForegroundColor Cyan

# Удаляем существующие задачи, если есть
foreach ($taskName in @($LOGIN_TASK_NAME, $LOGOUT_TASK_NAME)) {
    try {
        $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($existingTask) {
            Write-Host "⚠️  Найдена существующая задача '$taskName'. Удаляем..." -ForegroundColor Yellow
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    } catch {
        # Игнорируем ошибки при удалении
    }
}

# ============================================
# ЗАДАЧА 1: LOGIN (при входе в систему)
# ============================================
Write-Host ""
Write-Host "📝 Создание задачи Login (при входе в систему)..." -ForegroundColor Cyan

$loginAction = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$TARGET_SCRIPT`" login" `
    -WorkingDirectory $AGENT_DIR

$loginTrigger = New-ScheduledTaskTrigger -AtLogOn

$loginSettings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -DontStopOnIdleEnd `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -MultipleInstances IgnoreNew

$loginPrincipal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Highest

$loginDescription = "Автоматическая отправка события входа пользователя в систему Mesendger."

try {
    Register-ScheduledTask `
        -TaskName $LOGIN_TASK_NAME `
        -Action $loginAction `
        -Trigger $loginTrigger `
        -Settings $loginSettings `
        -Principal $loginPrincipal `
        -Description $loginDescription `
        -Force | Out-Null

    Write-Host "✅ Задача Login создана: $LOGIN_TASK_NAME" -ForegroundColor Green
} catch {
    Write-Host "❌ Ошибка при создании задачи Login: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Нажмите любую клавишу для выхода..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# ============================================
# ЗАДАЧА 2: LOGOUT (при выходе из системы)
# ============================================
Write-Host ""
Write-Host "📝 Создание задачи Logout (при выходе из системы)..." -ForegroundColor Cyan

# Для logout используем XML, так как прямого триггера AtLogOff нет в New-ScheduledTaskTrigger
$logoutTaskXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Автоматическая отправка события выхода пользователя из системы Mesendger.</Description>
  </RegistrationInfo>
  <Triggers>
    <EventTrigger>
      <Enabled>true</Enabled>
      <Subscription>&lt;QueryList&gt;&lt;Query Id="0" Path="System"&gt;&lt;Select Path="System"&gt;*[System[Provider[@Name='Microsoft-Windows-User Profiles Service'] and EventID=1531]]&lt;/Select&gt;&lt;/Query&gt;&lt;/QueryList&gt;</Subscription>
      <Delay>PT30S</Delay>
    </EventTrigger>
  </Triggers>
  <Actions Context="Author">
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$TARGET_SCRIPT" logout</Arguments>
      <WorkingDirectory>$AGENT_DIR</WorkingDirectory>
    </Exec>
  </Actions>
  <Principals>
    <Principal id="Author">
      <UserId>$env:USERDOMAIN\$env:USERNAME</UserId>
      <LogonType>Interactive</LogonType>
      <RunLevel>Highest</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <Hidden>true</Hidden>
    <AllowStartIfOnBatteries>true</AllowStartIfOnBatteries>
    <DontStopIfGoingOnBatteries>true</DontStopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable>
    <DontStopOnIdleEnd>true</DontStopOnIdleEnd>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>3</Count>
    </RestartOnFailure>
  </Settings>
</Task>
"@

# Сохраняем XML во временный файл
$xmlFile = "$env:TEMP\MesendgerLogoutAgent.xml"
[System.IO.File]::WriteAllText($xmlFile, $logoutTaskXml, [System.Text.Encoding]::Unicode)

try {
    # Регистрируем задачу через schtasks.exe (так как XML-задачи лучше регистрировать так)
    $result = & schtasks.exe /Create /TN $LOGOUT_TASK_NAME /XML $xmlFile /F 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Задача Logout создана: $LOGOUT_TASK_NAME" -ForegroundColor Green
        Remove-Item $xmlFile -Force -ErrorAction SilentlyContinue
    } else {
        throw "Не удалось создать задачу через schtasks.exe: $result"
    }
} catch {
    Write-Host "❌ Ошибка при создании задачи Logout: $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path $xmlFile) {
        Remove-Item $xmlFile -Force -ErrorAction SilentlyContinue
    }
    Write-Host ""
    Write-Host "Нажмите любую клавишу для выхода..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "🚀 Тестирование задач..." -ForegroundColor Cyan

# Запускаем Login задачу для проверки
try {
    Start-ScheduledTask -TaskName $LOGIN_TASK_NAME -ErrorAction Stop
    Write-Host "✅ Задача Login запущена для проверки" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Не удалось запустить задачу Login автоматически: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   Задача будет запущена автоматически при следующем входе в систему." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ УСТАНОВКА ЗАВЕРШЕНА УСПЕШНО!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Что было сделано:" -ForegroundColor Cyan
Write-Host "  ✅ Скрипт агента скопирован в: $TARGET_SCRIPT" -ForegroundColor Gray
Write-Host "  ✅ Задача Login создана: $LOGIN_TASK_NAME (при входе в систему)" -ForegroundColor Gray
Write-Host "  ✅ Задача Logout создана: $LOGOUT_TASK_NAME (при выходе из системы)" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Логи агента: $env:APPDATA\mesendger\remote_worktime.log" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔧 Управление задачами:" -ForegroundColor Cyan
Write-Host "  • Просмотр: Запустите Планировщик задач Windows → Задачи" -ForegroundColor Gray
Write-Host "  • Остановка Login: Disable-ScheduledTask -TaskName `"$LOGIN_TASK_NAME`"" -ForegroundColor Gray
Write-Host "  • Остановка Logout: Disable-ScheduledTask -TaskName `"$LOGOUT_TASK_NAME`"" -ForegroundColor Gray
Write-Host "  • Удаление Login: Unregister-ScheduledTask -TaskName `"$LOGIN_TASK_NAME`" -Confirm:`$false" -ForegroundColor Gray
Write-Host "  • Удаление Logout: Unregister-ScheduledTask -TaskName `"$LOGOUT_TASK_NAME`" -Confirm:`$false" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Примечание: Задача Logout использует событие системы для отслеживания выхода." -ForegroundColor Yellow
Write-Host "   Это более надежный способ, чем стандартный триггер выхода." -ForegroundColor Yellow
Write-Host ""
Write-Host "Нажмите любую клавишу для выхода..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

