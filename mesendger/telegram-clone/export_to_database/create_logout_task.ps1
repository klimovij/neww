# Скрипт для создания задачи Logout Agent вручную
# Используется если auto_install_agents.ps1 не смог создать задачу

$InstallPath = "$env:USERPROFILE\AppData\Local\mesendger-agents"
$currentUser = $env:USERNAME

Write-Host "=== СОЗДАНИЕ ЗАДАЧИ LOGOUT AGENT ===" -ForegroundColor Cyan

# Создаём XML для задачи с правильным триггером AtLogOff
$taskXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Скрытый агент для отправки данных о выходе пользователя</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>false</Enabled>
    </LogonTrigger>
    <EventTrigger>
      <Enabled>true</Enabled>
      <Subscription>&lt;QueryList&gt;&lt;Query Id="0" Path="System"&gt;&lt;Select Path="System"&gt;*[System[Provider[@Name='Microsoft-Windows-User Profiles Service'] and EventID=1531]]&lt;/Select&gt;&lt;/Query&gt;&lt;/QueryList&gt;</Subscription>
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
  </Settings>
</Task>
"@

# Сохраняем XML
$xmlFile = "$env:TEMP\MesendgerLogoutAgent.xml"
[System.IO.File]::WriteAllText($xmlFile, $taskXml, [System.Text.Encoding]::Unicode)

Write-Host "Создание задачи через schtasks.exe..." -ForegroundColor Yellow
$result = & schtasks.exe /Create /TN "Mesendger Logout Agent" /XML $xmlFile /F 2>&1

if ($LASTEXITCODE -eq 0) {
    Remove-Item $xmlFile -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Задача 'Mesendger Logout Agent' создана!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️ ВАЖНО: Откройте Task Scheduler и настройте триггер вручную:" -ForegroundColor Yellow
    Write-Host "1. Откройте Task Scheduler" -ForegroundColor Gray
    Write-Host "2. Найдите задачу 'Mesendger Logout Agent'" -ForegroundColor Gray
    Write-Host "3. Правой кнопкой → Properties → Triggers" -ForegroundColor Gray
    Write-Host "4. Удалите существующие триггеры" -ForegroundColor Gray
    Write-Host "5. Добавьте новый триггер: 'At startup' или 'On event'" -ForegroundColor Gray
    Write-Host "6. Или используйте групповую политику для запуска при выходе" -ForegroundColor Gray
} else {
    Write-Host "❌ Ошибка: $result" -ForegroundColor Red
}


