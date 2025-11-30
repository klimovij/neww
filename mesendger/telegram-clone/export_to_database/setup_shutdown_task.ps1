# Скрипт автоматической установки задачи выключения ПК в планировщике задач Windows
# Требует прав администратора
# Использование: .\setup_shutdown_task.ps1 [username]
# Если username не указан, будет использован из конфига или запрошен

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ОШИБКА: Скрипт требует прав администратора!" -ForegroundColor Red
    Write-Host "Запустите PowerShell от имени администратора." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

$targetDir = "C:\pc-worktime"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CONFIG_FILE = "$env:APPDATA\mesendger\agent_config.json"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Установка задачи выключения ПК" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Проверяем наличие скрипта выключения
$shutdownScript = Join-Path $scriptDir "send_pc_shutdown_with_fallback.ps1"
if (-not (Test-Path $shutdownScript)) {
    Write-Host "❌ Файл не найден: $shutdownScript" -ForegroundColor Red
    Write-Host "Убедитесь, что файл send_pc_shutdown_with_fallback.ps1 находится в той же папке" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Копируем скрипт в целевую папку
Write-Host "Копирование скрипта выключения..." -ForegroundColor Yellow
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    Write-Host "✅ Папка создана: $targetDir" -ForegroundColor Green
}

Copy-Item $shutdownScript -Destination "$targetDir\send_pc_shutdown_with_fallback.ps1" -Force
Write-Host "✅ Скрипт скопирован: $targetDir\send_pc_shutdown_with_fallback.ps1" -ForegroundColor Green

# Получаем username
$username = $null
if ($args -and $args.Count -gt 0 -and $args[0]) {
    $username = $args[0].Trim()
    Write-Host "✅ Username получен из аргументов: $username" -ForegroundColor Green
} elseif (Test-Path $CONFIG_FILE) {
    try {
        $config = Get-Content $CONFIG_FILE -Raw | ConvertFrom-Json
        if ($config.username -and $config.username.Trim()) {
            $username = $config.username.Trim()
            Write-Host "✅ Username получен из конфига: $username" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ Ошибка чтения конфига: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

if (-not $username) {
    Write-Host "`nВведите username сотрудника (например: Ksendzik_Oleg):" -ForegroundColor Yellow
    Write-Host "Этот username должен соответствовать username в базе данных Mesendger" -ForegroundColor Gray
    $username = Read-Host
    
    if ([string]::IsNullOrWhiteSpace($username)) {
        Write-Host "❌ Username не может быть пустым!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    $username = $username.Trim()
}

# Получаем SID текущего пользователя
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$userSid = $currentUser.User.Value
Write-Host "User SID: $userSid" -ForegroundColor Gray

# Создаем XML для задачи планировщика
# Задача будет запускаться при событии выключения системы (Event ID 1074)
$taskName = "Mesendger_PC_Shutdown_With_Fallback"
$taskDescription = "Отправка данных о выключении ПК в Mesendger с резервным сохранением"

# Создаем XML для задачи
$xmlContent = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Date>$(Get-Date -Format "yyyy-MM-ddTHH:mm:ss")</Date>
    <Author>Mesendger PC Monitoring</Author>
    <Description>$taskDescription</Description>
  </RegistrationInfo>
  <Triggers>
    <EventTrigger>
      <Enabled>true</Enabled>
      <Subscription>&lt;QueryList&gt;&lt;Query Id="0" Path="System"&gt;&lt;Select Path="System"&gt;*[System[Provider[@Name='Microsoft-Windows-Kernel-General'] and (EventID=1074 or EventID=1076 or EventID=6008)]]&lt;/Select&gt;&lt;/Query&gt;&lt;/QueryList&gt;</Subscription>
    </EventTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>$userSid</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT5M</ExecutionTimeLimit>
    <Priority>6</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-ExecutionPolicy Bypass -WindowStyle Hidden -File "$targetDir\send_pc_shutdown_with_fallback.ps1" "$username"</Arguments>
    </Exec>
  </Actions>
</Task>
"@

# Сохраняем XML во временный файл
$xmlFile = "$targetDir\${taskName}.xml"
$xmlContent | Out-File -FilePath $xmlFile -Encoding Unicode -Force
Write-Host "✅ XML файл создан: $xmlFile" -ForegroundColor Green

# Удаляем существующую задачу (если есть)
Write-Host "`nУдаление существующей задачи (если есть)..." -ForegroundColor Yellow
$taskCheck = schtasks /Query /TN $taskName /FO CSV 2>&1
if ($LASTEXITCODE -eq 0) {
    schtasks /Delete /TN $taskName /F 2>&1 | Out-Null
    Write-Host "✅ Старая задача удалена" -ForegroundColor Green
} else {
    Write-Host "Старой задачи не найдено" -ForegroundColor Gray
}

# Импортируем задачу
Write-Host "`nИмпорт задачи в планировщик..." -ForegroundColor Yellow
$result = schtasks /Create /TN $taskName /XML $xmlFile /F 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Задача '$taskName' успешно создана в планировщике задач!" -ForegroundColor Green
    Write-Host "`nЗадача будет запускаться при выключении ПК" -ForegroundColor Cyan
    Write-Host "Если отправка не удастся, данные будут сохранены и отправлены при следующем запуске ПК" -ForegroundColor Cyan
} else {
    Write-Host "❌ Ошибка создания задачи: $result" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Проверяем задачу
Write-Host "`nПроверка задачи..." -ForegroundColor Yellow
$taskInfo = schtasks /Query /TN $taskName /FO LIST 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Задача успешно установлена и активна" -ForegroundColor Green
    Write-Host "`nИнформация о задаче:" -ForegroundColor Cyan
    $taskInfo | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
} else {
    Write-Host "⚠️ Не удалось проверить задачу: $taskInfo" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Установка завершена!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nДля тестирования можно запустить скрипт вручную:" -ForegroundColor Yellow
Write-Host "  .\send_pc_shutdown_with_fallback.ps1 `"$username`"" -ForegroundColor Gray
Write-Host "`nИли проверить задачу в планировщике:" -ForegroundColor Yellow
Write-Host "  schtasks /Query /TN $taskName" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"

