# Скрипт создания XML файла для задачи выключения ПК
# Использование: .\create_shutdown_task_xml.ps1
# Затем импортируйте XML файл в планировщик задач вручную

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$shutdownScript = Join-Path $scriptDir "send_pc_shutdown.ps1"

if (-not (Test-Path $shutdownScript)) {
    Write-Host "❌ ОШИБКА: Скрипт не найден: $shutdownScript" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

$powerShellPath = (Get-Command powershell.exe).Source
$shutdownAction = "& '$shutdownScript'"
$currentUserSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$currentUserName = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

# Создаем правильный XML для задачи с триггером события
# Этот XML точно соответствует формату, который использует планировщик задач Windows
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
      <Subscription>&lt;QueryList&gt;&lt;Query Id="0" Path="System"&gt;&lt;Select Path="System"&gt;*[System[Provider[@Name='User32'] and EventID=1074]]&lt;/Select&gt;&lt;/Query&gt;&lt;/QueryList&gt;</Subscription>
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

# Сохраняем XML файл
$xmlFile = Join-Path $scriptDir "Mesendger_PC_Shutdown_Monitor.xml"

# Заменяем пути в XML на абсолютные
$xmlContent = $xmlContent -replace '\$powerShellPath', $powerShellPath
$xmlContent = $xmlContent -replace '\$shutdownAction', $shutdownAction
$xmlContent = $xmlContent -replace '\$currentUserSid', $currentUserSid
$xmlContent = $xmlContent -replace '\$currentUserName', $currentUserName
$xmlContent = $xmlContent -replace '\$\(Get-Date -Format "yyyy-MM-ddTHH:mm:ss"\)', (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")

# Экранируем специальные символы для XML
$shutdownActionEscaped = $shutdownAction -replace '&', '&amp;' -replace '"', '&quot;' -replace "'", '&apos;'
$xmlContent = $xmlContent -replace [regex]::Escape($shutdownAction), $shutdownActionEscaped

$utf16Encoding = New-Object System.Text.UnicodeEncoding $false, $false
[System.IO.File]::WriteAllText($xmlFile, $xmlContent, $utf16Encoding)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "XML файл создан успешно!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Файл: $xmlFile" -ForegroundColor Yellow
Write-Host "`nИнструкция по импорту:" -ForegroundColor Cyan
Write-Host "1. Откройте планировщик задач (taskschd.msc)" -ForegroundColor White
Write-Host "2. В правой панели нажмите 'Импортировать задачу...'" -ForegroundColor White
Write-Host "3. Выберите файл: $xmlFile" -ForegroundColor White
Write-Host "4. Нажмите 'Открыть'" -ForegroundColor White
Write-Host "5. Проверьте настройки задачи:" -ForegroundColor White
Write-Host "   - Триггер должен быть: При событии" -ForegroundColor Gray
Write-Host "   - Журнал: System" -ForegroundColor Gray
Write-Host "   - Источник: User32" -ForegroundColor Gray
Write-Host "   - Код события: 1074" -ForegroundColor Gray
Write-Host "`nИли используйте команду:" -ForegroundColor Cyan
Write-Host "schtasks /Create /TN Mesendger_PC_Shutdown_Monitor /XML `"$xmlFile`" /F" -ForegroundColor Yellow

Write-Host "`n✅ Готово! XML файл создан и готов к импорту.`n" -ForegroundColor Green
Read-Host "Press Enter to exit"

