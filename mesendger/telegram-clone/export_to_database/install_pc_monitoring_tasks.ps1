# Скрипт установки задач в планировщике Windows для автоматического мониторинга включения/выключения ПК
# Запуск: .\install_pc_monitoring_tasks.ps1
# Требует прав администратора

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ОШИБКА: Скрипт требует прав администратора!" -ForegroundColor Red
    Write-Host "Запустите PowerShell от имени администратора и повторите попытку." -ForegroundColor Yellow
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Получаем путь к директории со скриптами
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$startupScript = Join-Path $scriptDir "send_pc_startup.ps1"
$shutdownScript = Join-Path $scriptDir "send_pc_shutdown.ps1"

# Проверяем существование скриптов
if (-not (Test-Path $startupScript)) {
    Write-Host "❌ ОШИБКА: Скрипт не найден: $startupScript" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

if (-not (Test-Path $shutdownScript)) {
    Write-Host "❌ ОШИБКА: Скрипт не найден: $shutdownScript" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Установка задач мониторинга ПК" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Имена задач
$startupTaskName = "Mesendger_PC_Startup_Monitor"
$shutdownTaskName = "Mesendger_PC_Shutdown_Monitor"

# Удаляем существующие задачи, если они есть
Write-Host "Проверка существующих задач..." -ForegroundColor Yellow
try {
    $existingStartup = schtasks /Query /TN $startupTaskName /FO CSV 2>$null
    if ($existingStartup) {
        Write-Host "Удаление существующей задачи: $startupTaskName" -ForegroundColor Yellow
        schtasks /Delete /TN $startupTaskName /F | Out-Null
    }
} catch {
    # Задача не существует, это нормально
}

try {
    $existingShutdown = schtasks /Query /TN $shutdownTaskName /FO CSV 2>$null
    if ($existingShutdown) {
        Write-Host "Удаление существующей задачи: $shutdownTaskName" -ForegroundColor Yellow
        schtasks /Delete /TN $shutdownTaskName /F | Out-Null
    }
} catch {
    # Задача не существует, это нормально
}

Write-Host "`nСоздание задач..." -ForegroundColor Green

# Команда PowerShell для запуска скрипта в скрытом режиме
# Используем -WindowStyle Hidden для скрытого окна
$powerShellPath = (Get-Command powershell.exe).Source

# Создаем задачу для запуска при включении ПК (Startup)
Write-Host "Создание задачи для мониторинга включения ПК..." -ForegroundColor Cyan
$startupAction = "& '$startupScript'"
$startupCommand = "$powerShellPath -ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -Command $startupAction"

try {
    # Создаем задачу с триггером "При запуске системы"
    # Используем текущего пользователя вместо SYSTEM для видимости в планировщике
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    
    Write-Host "   Создание задачи для пользователя: $currentUser" -ForegroundColor Gray
    
    $result = schtasks /Create `
        /TN $startupTaskName `
        /TR $startupCommand `
        /SC ONSTART `
        /RU $currentUser `
        /RL HIGHEST `
        /F 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Задача '$startupTaskName' успешно создана!" -ForegroundColor Green
        
        # Проверяем, что задача действительно создана
        $checkResult = schtasks /Query /TN $startupTaskName /FO CSV 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Задача найдена в планировщике" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Задача создана, но не найдена при проверке" -ForegroundColor Yellow
        }
    } else {
        throw "Ошибка создания задачи: $result"
    }
} catch {
    Write-Host "❌ Ошибка при создании задачи '$startupTaskName': $_" -ForegroundColor Red
    Write-Host "   Попробуйте запустить планировщик задач вручную и создать задачу через GUI" -ForegroundColor Yellow
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Создаем задачу для запуска при выключении ПК (Shutdown)
# Используем PowerShell cmdlets для создания задачи с триггером события
Write-Host "`nСоздание задачи для мониторинга выключения ПК..." -ForegroundColor Cyan

$shutdownAction = "& '$shutdownScript'"
$shutdownCommand = "$powerShellPath -ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -Command $shutdownAction"

try {
    # Используем PowerShell cmdlets для создания задачи с правильным триггером события
    Write-Host "   Создание задачи с триггером события (Event ID 1074, источник User32, журнал System)..." -ForegroundColor Gray
    
    # Создаем действие
    $action = New-ScheduledTaskAction -Execute $powerShellPath -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -Command $shutdownAction"
    
    # Создаем триггер на событие выключения
    # Журнал: System, Источник: User32, Event ID: 1074
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    
    # Удаляем стандартный триггер и создаем триггер события вручную через XML
    # Это единственный надежный способ создать триггер события с правильными параметрами
    
    # Создаем правильный XML для задачи с триггером события
    $currentUserSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $currentUserName = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    
    # Создаем правильный XML для задачи с триггером события
    # Subscription должен содержать правильно экранированный XML запрос
    $subscriptionQuery = '&lt;QueryList&gt;&lt;Query Id="0" Path="System"&gt;&lt;Select Path="System"&gt;*[System[Provider[@Name=''User32''] and EventID=1074]]&lt;/Select&gt;&lt;/Query&gt;&lt;/QueryList&gt;'
    
    # Создаем XML строку
    $xmlContent = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Date>$(Get-Date -Format "yyyy-MM-ddTHH:mm:ss")</Date>
    <Description>Мониторинг выключения ПК для Mesendger. Запускается при событии выключения системы (Event ID 1074, источник User32, журнал System).</Description>
    <Author>$currentUserName</Author>
  </RegistrationInfo>
  <Triggers>
    <EventTrigger>
      <Enabled>true</Enabled>
      <Subscription>$subscriptionQuery</Subscription>
    </EventTrigger>
  </Triggers>
  <Actions Context="Author">
    <Exec>
      <Command>$powerShellPath</Command>
      <Arguments>-ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -Command "$shutdownAction"</Arguments>
    </Exec>
  </Actions>
  <Principals>
    <Principal id="Author">
      <UserId>$currentUserSid</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT5M</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
</Task>
"@

    # Сохраняем XML во временный файл с правильной кодировкой UTF-16
    $xmlFile = Join-Path $env:TEMP "mesendger_shutdown_task_$(Get-Date -Format 'yyyyMMddHHmmss').xml"
    
    # Важно: используем UTF-16 (Unicode) для XML задач Windows
    $utf16Encoding = New-Object System.Text.UnicodeEncoding $false, $false
    [System.IO.File]::WriteAllText($xmlFile, $xmlContent, $utf16Encoding)
    
    Write-Host "   XML файл создан: $xmlFile" -ForegroundColor Gray
    Write-Host "   Проверка Subscription в XML:" -ForegroundColor Gray
    $xmlCheck = [xml](Get-Content $xmlFile -Raw)
    Write-Host "      Subscription найден: $($xmlCheck.Task.Triggers.EventTrigger.Subscription -ne $null)" -ForegroundColor DarkGray
    
    # Создаем задачу из XML
    $result = schtasks /Create /TN $shutdownTaskName /XML $xmlFile /F 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Задача '$shutdownTaskName' успешно создана!" -ForegroundColor Green
        
        # Проверяем, что задача действительно создана
        $checkResult = schtasks /Query /TN $shutdownTaskName /FO CSV 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Задача найдена в планировщике" -ForegroundColor Green
            
            # Пытаемся проверить триггер через PowerShell
            try {
                $task = Get-ScheduledTask -TaskName $shutdownTaskName -ErrorAction SilentlyContinue
                if ($task) {
                    $triggers = $task.Triggers
                    Write-Host "   ✅ Триггеры задачи:" -ForegroundColor Green
                    foreach ($tr in $triggers) {
                        Write-Host "      Тип: $($tr.CimClass.CimClassName)" -ForegroundColor Gray
                    }
                }
            } catch {
                Write-Host "   ⚠️ Не удалось проверить триггеры через PowerShell" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   ⚠️ Задача создана, но не найдена при проверке" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Ошибка создания задачи: $result" -ForegroundColor Red
        throw "Ошибка создания задачи: $result"
    }
    
    # Удаляем временный файл
    Remove-Item $xmlFile -Force -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "❌ Ошибка при создании задачи '$shutdownTaskName': $_" -ForegroundColor Red
    Write-Host "`n💡 АЛЬТЕРНАТИВНОЕ РЕШЕНИЕ:" -ForegroundColor Yellow
    Write-Host "   Запустите скрипт create_shutdown_task_xml.ps1 для создания XML файла" -ForegroundColor Yellow
    Write-Host "   Затем импортируйте XML файл в планировщик задач вручную" -ForegroundColor Yellow
    Write-Host "`n   Или создайте задачу вручную через планировщик задач Windows:" -ForegroundColor Yellow
    Write-Host "   1. Откройте планировщик задач (taskschd.msc)" -ForegroundColor Gray
    Write-Host "   2. Создайте задачу: $shutdownTaskName" -ForegroundColor Gray
    Write-Host "   3. Триггер: При событии" -ForegroundColor Gray
    Write-Host "      - Журнал: System" -ForegroundColor Gray
    Write-Host "      - Источник: User32" -ForegroundColor Gray
    Write-Host "      - Код события: 1074" -ForegroundColor Gray
    Write-Host "   4. Действие: Запуск программы" -ForegroundColor Gray
    Write-Host "      - Программа: $powerShellPath" -ForegroundColor Gray
    Write-Host "      - Аргументы: -ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -Command `"$shutdownAction`"" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Установка завершена!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Созданные задачи:" -ForegroundColor Yellow
Write-Host "  1. $startupTaskName - запускается при включении ПК" -ForegroundColor White
Write-Host "  2. $shutdownTaskName - запускается при выключении ПК" -ForegroundColor White

Write-Host "`nПроверка задач:" -ForegroundColor Yellow
Write-Host "  schtasks /Query /TN $startupTaskName" -ForegroundColor Gray
Write-Host "  schtasks /Query /TN $shutdownTaskName" -ForegroundColor Gray

# Автоматическая проверка созданных задач
Write-Host "`nАвтоматическая проверка созданных задач..." -ForegroundColor Cyan
$startupCheck = schtasks /Query /TN $startupTaskName /FO CSV 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ $startupTaskName - найдена" -ForegroundColor Green
} else {
    Write-Host "  ❌ $startupTaskName - НЕ найдена" -ForegroundColor Red
}

$shutdownCheck = schtasks /Query /TN $shutdownTaskName /FO CSV 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ $shutdownTaskName - найдена" -ForegroundColor Green
} else {
    Write-Host "  ❌ $shutdownTaskName - НЕ найдена" -ForegroundColor Red
}

Write-Host "`n💡 Совет: Откройте планировщик задач (taskschd.msc) и проверьте задачи вручную" -ForegroundColor Yellow
Write-Host "   Если задачи не видны, попробуйте:" -ForegroundColor Yellow
Write-Host "   1. Обновить список задач (F5)" -ForegroundColor Gray
Write-Host "   2. Проверить фильтр 'Скрытые задачи' (View → Show Hidden Tasks)" -ForegroundColor Gray
Write-Host "   3. Проверить раздел 'Библиотека планировщика заданий' → 'Mesendger_*'" -ForegroundColor Gray

Write-Host "`nУдаление задач (если нужно):" -ForegroundColor Yellow
Write-Host "  schtasks /Delete /TN $startupTaskName /F" -ForegroundColor Gray
Write-Host "  schtasks /Delete /TN $shutdownTaskName /F" -ForegroundColor Gray

Write-Host "`n✅ Готово! Задачи будут автоматически запускаться при включении и выключении ПК." -ForegroundColor Green
Write-Host "Скрипты будут выполняться в скрытом режиме (без отображения окон).`n" -ForegroundColor Green

Read-Host "Нажмите Enter для выхода"

