# Автоматическая установка и настройка скрытых агентов
# Устанавливает агенты активности и login/logout в Task Scheduler

param(
    [string]$InstallPath = "$env:USERPROFILE\AppData\Local\mesendger-agents"
)

Write-Host "=== АВТОМАТИЧЕСКАЯ УСТАНОВКА АГЕНТОВ ===" -ForegroundColor Cyan
Write-Host ""

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️ Требуются права администратора!" -ForegroundColor Yellow
    Write-Host "Перезапустите скрипт от имени администратора." -ForegroundColor Yellow
    pause
    exit 1
}

# Создаём директорию для агентов
Write-Host "📁 Создание директории для агентов..." -ForegroundColor Yellow
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Write-Host "   ✅ Директория создана: $InstallPath" -ForegroundColor Green
} else {
    Write-Host "   ✅ Директория уже существует" -ForegroundColor Green
}

# Копируем файлы агентов
Write-Host ""
Write-Host "📋 Копирование файлов агентов..." -ForegroundColor Yellow

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$filesToCopy = @(
    "remote_login_logout_agent.ps1",
    "activity_agent.ps1",
    "run_login_logout_hidden.vbs",
    "run_activity_hidden.vbs"
)

foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $scriptDir $file
    $destPath = Join-Path $InstallPath $file
    
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "   ✅ Скопирован: $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Не найден: $file" -ForegroundColor Red
    }
}

# Создаём задачи в Task Scheduler
Write-Host ""
Write-Host "⏰ Настройка Task Scheduler..." -ForegroundColor Yellow

$currentUser = $env:USERNAME

# 1. Задача: Login при входе пользователя
Write-Host "   Настройка задачи 'Mesendger Login Agent'..." -ForegroundColor Gray
try {
    $actionLogin = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$InstallPath\run_login_logout_hidden.vbs`" login"
    $triggerLogin = New-ScheduledTaskTrigger -AtLogOn
    $principalLogin = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$currentUser" -LogonType Interactive -RunLevel Limited
    $settingsLogin = New-ScheduledTaskSettingsSet -Hidden -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    Register-ScheduledTask -TaskName "Mesendger Login Agent" `
        -Action $actionLogin `
        -Trigger $triggerLogin `
        -Principal $principalLogin `
        -Settings $settingsLogin `
        -Description "Скрытый агент для отправки данных о входе пользователя" `
        -Force | Out-Null
    
    Write-Host "   ✅ Задача 'Mesendger Login Agent' создана" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Ошибка создания задачи Login: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Задача: Logout при выходе пользователя (Event Trigger: User32, EventID 1074)
Write-Host "   Настройка задачи 'Mesendger Logout Agent'..." -ForegroundColor Gray
try {
    # Создаём XML для задачи с Event Trigger (User32, EventID 1074 - выключение системы)
    # Событие 1074 записывается в System log с источником User32
    # Используем правильное экранирование для XML
    $taskXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Скрытый агент для отправки данных о выходе пользователя при выключении системы</Description>
  </RegistrationInfo>
  <Triggers>
    <EventTrigger>
      <Enabled>true</Enabled>
      <Subscription>&lt;QueryList&gt;&lt;Query Id="0" Path="System"&gt;&lt;Select Path="System"&gt;*[System[Provider[@Name='User32'] and EventID=1074]]&lt;/Select&gt;&lt;/Query&gt;&lt;/QueryList&gt;</Subscription>
    </EventTrigger>
  </Triggers>
  <Actions Context="Author">
    <Exec>
      <Command>wscript.exe</Command>
      <Arguments>"$InstallPath\run_login_logout_hidden.vbs" logout</Arguments>
    </Exec>
  </Actions>
  <Principals>
    <Principal id="Author">
      <UserId>$env:USERDOMAIN\$currentUser</UserId>
      <LogonType>Interactive</LogonType>
      <RunLevel>Limited</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <Hidden>true</Hidden>
    <AllowStartIfOnBatteries>true</AllowStartIfOnBatteries>
    <DontStopIfGoingOnBatteries>true</DontStopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
  </Settings>
</Task>
"@
    
    # Сохраняем XML во временный файл с правильной кодировкой
    $xmlFile = "$env:TEMP\MesendgerLogoutAgent_$(Get-Date -Format 'yyyyMMddHHmmss').xml"
    [System.IO.File]::WriteAllText($xmlFile, $taskXml, [System.Text.Encoding]::Unicode)
    
    # Регистрируем задачу через schtasks.exe
    $result = & schtasks.exe /Create /TN "Mesendger Logout Agent" /XML $xmlFile /F 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Remove-Item $xmlFile -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ Задача 'Mesendger Logout Agent' создана с Event Trigger (User32, EventID 1074)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Ошибка создания через XML: $result" -ForegroundColor Yellow
        
        # Альтернативный способ - создаём через PowerShell с другим триггером
        Write-Host "   Попытка создания через PowerShell cmdlets..." -ForegroundColor Yellow
        $actionLogout = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$InstallPath\run_login_logout_hidden.vbs`" logout"
        $triggerLogout = New-ScheduledTaskTrigger -AtStartup
        $principalLogout = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$currentUser" -LogonType Interactive -RunLevel Limited
        $settingsLogout = New-ScheduledTaskSettingsSet -Hidden -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        
        Register-ScheduledTask -TaskName "Mesendger Logout Agent" `
            -Action $actionLogout `
            -Trigger $triggerLogout `
            -Principal $principalLogout `
            -Settings $settingsLogout `
            -Description "Скрытый агент для отправки данных о выходе пользователя" `
            -Force | Out-Null
        
        Write-Host "   ⚠️ Задача создана с временным триггером. Настройте Event Trigger вручную:" -ForegroundColor Yellow
        Write-Host "      System → User32 → EventID 1074" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Ошибка создания задачи Logout: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 Создайте задачу вручную через Task Scheduler с Event Trigger (User32, EventID 1074)" -ForegroundColor Yellow
}

# 3. Задача: Activity Agent - запуск при входе и каждые 5 минут
Write-Host "   Настройка задачи 'Mesendger Activity Agent'..." -ForegroundColor Gray
try {
    # Действие
    $actionActivity = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$InstallPath\run_activity_hidden.vbs`""
    
    # Триггер 1: При входе пользователя
    $trigger1 = New-ScheduledTaskTrigger -AtLogOn
    
    # Триггер 2: Повтор каждые 5 минут (но это не совсем правильно, лучше запускать один раз)
    # Вместо этого запускаем при входе, и скрипт сам работает в цикле
    
    $principalActivity = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$currentUser" -LogonType Interactive -RunLevel Limited
    $settingsActivity = New-ScheduledTaskSettingsSet -Hidden -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
    Register-ScheduledTask -TaskName "Mesendger Activity Agent" `
        -Action $actionActivity `
        -Trigger $trigger1 `
        -Principal $principalActivity `
        -Settings $settingsActivity `
        -Description "Скрытый агент для сбора и отправки активности пользователя" `
        -Force | Out-Null
    
    Write-Host "   ✅ Задача 'Mesendger Activity Agent' создана" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Ошибка создания задачи Activity: $($_.Exception.Message)" -ForegroundColor Red
}

# Проверяем созданные задачи
Write-Host ""
Write-Host "🔍 Проверка созданных задач..." -ForegroundColor Yellow
$tasks = @("Mesendger Login Agent", "Mesendger Logout Agent", "Mesendger Activity Agent")
foreach ($taskName in $tasks) {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($task) {
        Write-Host "   ✅ $taskName - $($task.State)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $taskName - не найдена" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== УСТАНОВКА ЗАВЕРШЕНА ===" -ForegroundColor Green
Write-Host ""
Write-Host "Установленные агенты:" -ForegroundColor Cyan
Write-Host "1. Login Agent - отправляет данные о входе (при включении ПК)" -ForegroundColor Gray
Write-Host "2. Logout Agent - отправляет данные о выходе (при выключении ПК)" -ForegroundColor Gray
Write-Host "3. Activity Agent - собирает и отправляет активность (запускается при входе)" -ForegroundColor Gray
Write-Host ""
Write-Host "Все агенты работают СКРЫТО (без окон)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Логи находятся в:" -ForegroundColor Cyan
Write-Host "  - Login/Logout: $env:APPDATA\mesendger\remote_worktime.log" -ForegroundColor Gray
Write-Host "  - Activity: $env:APPDATA\mesendger\activity_agent.log" -ForegroundColor Gray
Write-Host ""
Write-Host "Проверка работы:" -ForegroundColor Cyan
Write-Host "  1. Перезагрузите компьютер" -ForegroundColor Gray
Write-Host "  2. Войдите в систему" -ForegroundColor Gray
Write-Host "  3. Проверьте логи в указанных выше папках" -ForegroundColor Gray
Write-Host "  4. Проверьте данные в веб-интерфейсе: http://35.232.108.72" -ForegroundColor Gray
Write-Host ""
pause

