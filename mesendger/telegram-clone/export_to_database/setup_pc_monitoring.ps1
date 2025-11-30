# Скрипт автоматической установки мониторинга ПК для Mesendger
# Требует прав администратора
# Использование: .\setup_pc_monitoring.ps1

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

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Установка мониторинга ПК для Mesendger" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Создаем целевую папку
Write-Host "Создание папки: $targetDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
Write-Host "✅ Папка создана" -ForegroundColor Green

# Копируем скрипты
Write-Host "`nКопирование скриптов..." -ForegroundColor Yellow
$startupScript = Join-Path $scriptDir "send_pc_startup.ps1"
$shutdownScript = Join-Path $scriptDir "send_pc_shutdown.ps1"
$shutdownScriptWithFallback = Join-Path $scriptDir "send_pc_shutdown_with_fallback.ps1"
$activityScript = Join-Path $scriptDir "send_activity.ps1"

if (Test-Path $startupScript) {
    Copy-Item $startupScript -Destination "$targetDir\send_pc_startup.ps1" -Force
    Write-Host "✅ send_pc_startup.ps1 скопирован" -ForegroundColor Green
} else {
    Write-Host "❌ Файл не найден: $startupScript" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Копируем старый скрипт выключения (для совместимости)
if (Test-Path $shutdownScript) {
    Copy-Item $shutdownScript -Destination "$targetDir\send_pc_shutdown.ps1" -Force
    Write-Host "✅ send_pc_shutdown.ps1 скопирован (старая версия, для совместимости)" -ForegroundColor Green
}

# Копируем новый скрипт выключения с резервным сохранением (основной)
if (Test-Path $shutdownScriptWithFallback) {
    Copy-Item $shutdownScriptWithFallback -Destination "$targetDir\send_pc_shutdown_with_fallback.ps1" -Force
    Write-Host "✅ send_pc_shutdown_with_fallback.ps1 скопирован (новая версия с резервным сохранением)" -ForegroundColor Green
} else {
    Write-Host "⚠️ Файл не найден: $shutdownScriptWithFallback" -ForegroundColor Yellow
    Write-Host "   Будет использоваться старая версия send_pc_shutdown.ps1" -ForegroundColor Yellow
}

if (Test-Path $activityScript) {
    Copy-Item $activityScript -Destination "$targetDir\send_activity.ps1" -Force
    Write-Host "✅ send_activity.ps1 скопирован" -ForegroundColor Green
} else {
    Write-Host "⚠️ Файл не найден: $activityScript" -ForegroundColor Yellow
    Write-Host "   Скрипт активности не будет установлен" -ForegroundColor Yellow
}

# Копируем скрипт мониторинга выключения
$shutdownMonitorScript = Join-Path $scriptDir "monitor_shutdown.ps1"
if (Test-Path $shutdownMonitorScript) {
    Copy-Item $shutdownMonitorScript -Destination "$targetDir\monitor_shutdown.ps1" -Force
    Write-Host "✅ monitor_shutdown.ps1 скопирован" -ForegroundColor Green
} else {
    Write-Host "⚠️ Файл не найден: $shutdownMonitorScript" -ForegroundColor Yellow
    Write-Host "   Мониторинг выключения не будет установлен" -ForegroundColor Yellow
}

# Запрашиваем username
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Настройка username" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Введите username сотрудника (например: Ksendzik_Oleg):" -ForegroundColor Yellow
Write-Host "Этот username должен соответствовать username в базе данных Mesendger" -ForegroundColor Gray
Write-Host "После ввода username будет использоваться для всех автоматических запусков" -ForegroundColor Gray
$username = Read-Host

if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "❌ Username не может быть пустым!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$username = $username.Trim()
Write-Host "✅ Username установлен: $username" -ForegroundColor Green

# Запрашиваем интервалы для агента активности
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Настройка интервалов агента активности" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Интервал отправки скриншотов
Write-Host "`nВведите интервал отправки скриншотов в минутах (по умолчанию 5):" -ForegroundColor Yellow
Write-Host "Например: 5 (скриншот будет отправляться каждые 5 минут)" -ForegroundColor Gray
$screenshotIntervalInput = Read-Host
$screenshotIntervalMinutes = 5
if (-not [string]::IsNullOrWhiteSpace($screenshotIntervalInput)) {
    try {
        $screenshotIntervalMinutes = [int][Math]::Round([double]$screenshotIntervalInput)
        if ($screenshotIntervalMinutes -le 0) {
            $screenshotIntervalMinutes = 5
        }
    } catch {
        $screenshotIntervalMinutes = 5
    }
}
Write-Host "✅ Интервал отправки скриншотов: $screenshotIntervalMinutes минут" -ForegroundColor Green

# Интервал отправки сайтов (браузеров)
Write-Host "`nВведите интервал отправки данных о сайтах (браузерах) в минутах (по умолчанию 5):" -ForegroundColor Yellow
Write-Host "Например: 5 (данные о посещенных сайтах будут отправляться каждые 5 минут)" -ForegroundColor Gray
$sitesIntervalInput = Read-Host
$sitesIntervalMinutes = 5
if (-not [string]::IsNullOrWhiteSpace($sitesIntervalInput)) {
    try {
        $sitesIntervalMinutes = [int][Math]::Round([double]$sitesIntervalInput)
        if ($sitesIntervalMinutes -le 0) {
            $sitesIntervalMinutes = 5
        }
    } catch {
        $sitesIntervalMinutes = 5
    }
}
Write-Host "✅ Интервал отправки данных о сайтах: $sitesIntervalMinutes минут" -ForegroundColor Green

# Интервал отправки приложений
Write-Host "`nВведите интервал отправки данных о приложениях в минутах (по умолчанию 5):" -ForegroundColor Yellow
Write-Host "Например: 5 (данные об открытых приложениях будут отправляться каждые 5 минут)" -ForegroundColor Gray
$appsIntervalInput = Read-Host
$appsIntervalMinutes = 5
if (-not [string]::IsNullOrWhiteSpace($appsIntervalInput)) {
    try {
        $appsIntervalMinutes = [int][Math]::Round([double]$appsIntervalInput)
        if ($appsIntervalMinutes -le 0) {
            $appsIntervalMinutes = 5
        }
    } catch {
        $appsIntervalMinutes = 5
    }
}
Write-Host "✅ Интервал отправки данных о приложениях: $appsIntervalMinutes минут" -ForegroundColor Green

# Используем минимальный интервал для отправки данных активности (сайты и приложения отправляются вместе)
$activityIntervalMinutes = [Math]::Min($sitesIntervalMinutes, $appsIntervalMinutes)
Write-Host "`n💡 Примечание: Сайты и приложения отправляются вместе, используется минимальный интервал: $activityIntervalMinutes минут" -ForegroundColor Cyan

# Создаем конфигурационный файл для агента активности
$configDir = "$env:APPDATA\mesendger"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

$configFile = Join-Path $configDir "agent_config.json"
$configData = @{
    username = $username
    intervalMinutes = $activityIntervalMinutes
    screenshotIntervalMinutes = $screenshotIntervalMinutes
    sitesIntervalMinutes = $sitesIntervalMinutes
    appsIntervalMinutes = $appsIntervalMinutes
} | ConvertTo-Json

$configData | Out-File -FilePath $configFile -Encoding UTF8 -Force
Write-Host "`n✅ Конфигурация агента активности сохранена в: $configFile" -ForegroundColor Green
Write-Host "   - Username: $username" -ForegroundColor Gray
Write-Host "   - Интервал отправки скриншотов: $screenshotIntervalMinutes минут" -ForegroundColor Gray
Write-Host "   - Интервал отправки данных о сайтах: $sitesIntervalMinutes минут" -ForegroundColor Gray
Write-Host "   - Интервал отправки данных о приложениях: $appsIntervalMinutes минут" -ForegroundColor Gray
Write-Host "   - Используемый интервал для отправки: $activityIntervalMinutes минут (минимум)" -ForegroundColor Gray

# Получаем SID текущего пользователя (используется для всех задач)
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$userSid = $currentUser.User.Value
Write-Host "`n   SID текущего пользователя: $userSid" -ForegroundColor Gray

# Обновляем XML файлы с username
Write-Host "`nОбновление XML файлов..." -ForegroundColor Yellow

# Startup XML
$startupXmlPath = Join-Path $scriptDir "Mesendger_PC_Startup_Monitor.xml"
if (Test-Path $startupXmlPath) {
    $startupXml = Get-Content $startupXmlPath -Raw -Encoding UTF8
    # Заменяем USERNAME, путь и SID (экранируем путь для регулярного выражения)
    $startupXml = $startupXml -replace 'USERNAME', $username
    $startupXml = $startupXml -replace 'USERSID', $userSid
    $escapedScriptDir = [regex]::Escape($scriptDir)
    $startupXml = $startupXml -replace $escapedScriptDir, $targetDir
    $startupXml | Out-File -FilePath "$targetDir\Mesendger_PC_Startup_Monitor.xml" -Encoding Unicode -Force
    Write-Host "✅ Mesendger_PC_Startup_Monitor.xml обновлен" -ForegroundColor Green
} else {
    Write-Host "⚠️ XML файл не найден: $startupXmlPath" -ForegroundColor Yellow
    Write-Host "   Создайте XML файл вручную" -ForegroundColor Yellow
}

# Shutdown XML
$shutdownXmlPath = Join-Path $scriptDir "Mesendger_PC_Shutdown_Monitor.xml"
if (Test-Path $shutdownXmlPath) {
    $shutdownXml = Get-Content $shutdownXmlPath -Raw -Encoding UTF8
    # Заменяем USERNAME, путь и SID (экранируем путь для регулярного выражения)
    $shutdownXml = $shutdownXml -replace 'USERNAME', $username
    $shutdownXml = $shutdownXml -replace 'USERSID', $userSid
    $escapedScriptDir = [regex]::Escape($scriptDir)
    $shutdownXml = $shutdownXml -replace $escapedScriptDir, $targetDir
    $shutdownXml | Out-File -FilePath "$targetDir\Mesendger_PC_Shutdown_Monitor.xml" -Encoding Unicode -Force
    Write-Host "✅ Mesendger_PC_Shutdown_Monitor.xml обновлен" -ForegroundColor Green
} else {
    Write-Host "⚠️ XML файл не найден: $shutdownXmlPath" -ForegroundColor Yellow
    Write-Host "   Создайте XML файл вручную" -ForegroundColor Yellow
}

# Shutdown Monitor Background XML (новый фоновый монитор)
$shutdownMonitorXmlPath = Join-Path $scriptDir "Mesendger_PC_Shutdown_Monitor_Background.xml"
if (Test-Path $shutdownMonitorXmlPath) {
    $shutdownMonitorXml = Get-Content $shutdownMonitorXmlPath -Raw -Encoding UTF8
    # Заменяем USERNAME, путь и SID (экранируем путь для регулярного выражения)
    $shutdownMonitorXml = $shutdownMonitorXml -replace 'USERNAME', $username
    $shutdownMonitorXml = $shutdownMonitorXml -replace 'USERSID', $userSid
    $escapedScriptDir = [regex]::Escape($scriptDir)
    $shutdownMonitorXml = $shutdownMonitorXml -replace $escapedScriptDir, $targetDir
    $shutdownMonitorXml | Out-File -FilePath "$targetDir\Mesendger_PC_Shutdown_Monitor_Background.xml" -Encoding Unicode -Force
    Write-Host "✅ Mesendger_PC_Shutdown_Monitor_Background.xml обновлен" -ForegroundColor Green
} else {
    Write-Host "⚠️ XML файл не найден: $shutdownMonitorXmlPath" -ForegroundColor Yellow
    Write-Host "   Фоновый мониторинг выключения не будет установлен" -ForegroundColor Yellow
}

# Activity XML
$activityXmlPath = Join-Path $scriptDir "Mesendger_PC_Activity_Monitor.xml"
if (Test-Path $activityXmlPath) {
    $activityXml = Get-Content $activityXmlPath -Raw -Encoding UTF8
    # Заменяем USERNAME, путь и SID (экранируем путь для регулярного выражения)
    $activityXml = $activityXml -replace 'USERNAME', $username
    $activityXml = $activityXml -replace 'USERSID', $userSid
    $escapedScriptDir = [regex]::Escape($scriptDir)
    $activityXml = $activityXml -replace $escapedScriptDir, $targetDir
    $activityXml | Out-File -FilePath "$targetDir\Mesendger_PC_Activity_Monitor.xml" -Encoding Unicode -Force
    Write-Host "✅ Mesendger_PC_Activity_Monitor.xml обновлен" -ForegroundColor Green
} else {
    Write-Host "⚠️ XML файл не найден: $activityXmlPath" -ForegroundColor Yellow
    Write-Host "   Создайте XML файл вручную" -ForegroundColor Yellow
}

# Удаляем существующие задачи
Write-Host "`nУдаление существующих задач (если есть)..." -ForegroundColor Yellow
$startupCheck = schtasks /Query /TN Mesendger_PC_Startup_Monitor /FO CSV 2>&1
if ($LASTEXITCODE -eq 0) {
    schtasks /Delete /TN Mesendger_PC_Startup_Monitor /F 2>&1 | Out-Null
    Write-Host "✅ Старая задача включения удалена" -ForegroundColor Green
}

$shutdownCheck = schtasks /Query /TN Mesendger_PC_Shutdown_Monitor /FO CSV 2>&1
if ($LASTEXITCODE -eq 0) {
    schtasks /Delete /TN Mesendger_PC_Shutdown_Monitor /F 2>&1 | Out-Null
    Write-Host "✅ Старая задача выключения удалена" -ForegroundColor Green
}

$activityCheck = schtasks /Query /TN Mesendger_PC_Activity_Monitor /FO CSV 2>&1
if ($LASTEXITCODE -eq 0) {
    schtasks /Delete /TN Mesendger_PC_Activity_Monitor /F 2>&1 | Out-Null
    Write-Host "✅ Старая задача активности удалена" -ForegroundColor Green
}

$shutdownMonitorCheck = schtasks /Query /TN Mesendger_PC_Shutdown_Monitor_Background /FO CSV 2>&1
if ($LASTEXITCODE -eq 0) {
    schtasks /Delete /TN Mesendger_PC_Shutdown_Monitor_Background /F 2>&1 | Out-Null
    Write-Host "✅ Старая задача фонового мониторинга выключения удалена" -ForegroundColor Green
}

# Импортируем задачи
Write-Host "`nИмпорт задач в планировщик..." -ForegroundColor Yellow

if (Test-Path "$targetDir\Mesendger_PC_Startup_Monitor.xml") {
    $result = schtasks /Create /TN Mesendger_PC_Startup_Monitor /XML "$targetDir\Mesendger_PC_Startup_Monitor.xml" /F 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Задача включения ПК создана" -ForegroundColor Green
    } else {
        Write-Host "❌ Ошибка создания задачи включения: $result" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ XML файл для включения не найден" -ForegroundColor Yellow
}

if (Test-Path "$targetDir\Mesendger_PC_Shutdown_Monitor.xml") {
    $result = schtasks /Create /TN Mesendger_PC_Shutdown_Monitor /XML "$targetDir\Mesendger_PC_Shutdown_Monitor.xml" /F 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Задача выключения ПК создана" -ForegroundColor Green
    } else {
        Write-Host "❌ Ошибка создания задачи выключения: $result" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ XML файл для выключения не найден" -ForegroundColor Yellow
}

if (Test-Path "$targetDir\Mesendger_PC_Activity_Monitor.xml") {
    $result = schtasks /Create /TN Mesendger_PC_Activity_Monitor /XML "$targetDir\Mesendger_PC_Activity_Monitor.xml" /F 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Задача мониторинга активности создана" -ForegroundColor Green
    } else {
        Write-Host "❌ Ошибка создания задачи активности: $result" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ XML файл для активности не найден" -ForegroundColor Yellow
}

if (Test-Path "$targetDir\Mesendger_PC_Shutdown_Monitor_Background.xml") {
    $result = schtasks /Create /TN Mesendger_PC_Shutdown_Monitor_Background /XML "$targetDir\Mesendger_PC_Shutdown_Monitor_Background.xml" /F 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Задача фонового мониторинга выключения создана" -ForegroundColor Green
    } else {
        Write-Host "❌ Ошибка создания задачи фонового мониторинга выключения: $result" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ XML файл для фонового мониторинга выключения не найден" -ForegroundColor Yellow
}

# Устанавливаем скрипт выключения через реестр (более надежный способ)
Write-Host "`nНастройка скрипта выключения через реестр..." -ForegroundColor Yellow
try {
    # Создаем скрипт, который будет выполняться при выключении
    $shutdownScriptContent = @"
# Скрипт выключения через реестр
`$SERVER_URL = "http://35.232.108.72"
`$CONFIG_FILE = "`$env:APPDATA\mesendger\agent_config.json"

# Получаем username из конфига
`$username = `$env:USERNAME
if (Test-Path `$CONFIG_FILE) {
    try {
        `$config = Get-Content `$CONFIG_FILE -Raw | ConvertFrom-Json
        if (`$config.username) {
            `$username = `$config.username.Trim()
        }
    } catch {}
}

# Отправляем событие выключения
`$eventData = @{
    username = `$username
    event_type = "logout"
    event_time = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    event_id = 4634
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "`$SERVER_URL/api/worktime" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body `$eventData `
        -TimeoutSec 2 `
        -ErrorAction Stop | Out-Null
} catch {
    # Игнорируем ошибки при выключении
}
"@
    
    $shutdownScriptPath = "$targetDir\shutdown_via_registry.ps1"
    $shutdownScriptContent | Out-File -FilePath $shutdownScriptPath -Encoding UTF8 -Force
    Write-Host "✅ Скрипт выключения создан: $shutdownScriptPath" -ForegroundColor Green
    
    # Добавляем в реестр для выполнения при выключении
    $regPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown"
    $regPath0 = "$regPath\0"
    
    # Создаем ключи реестра
    if (-not (Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    if (-not (Test-Path $regPath0)) {
        New-Item -Path $regPath0 -Force | Out-Null
    }
    
    # Устанавливаем скрипт
    Set-ItemProperty -Path $regPath0 -Name "GPO-ID" -Value "LocalGPO" -Type String -Force
    Set-ItemProperty -Path $regPath0 -Name "SOM-ID" -Value "Local" -Type String -Force
    Set-ItemProperty -Path $regPath0 -Name "FileSysPath" -Value "C:\\Windows\\System32\\GroupPolicy\\Machine" -Type String -Force
    Set-ItemProperty -Path $regPath0 -Name "DisplayName" -Value "Local Group Policy" -Type String -Force
    Set-ItemProperty -Path $regPath0 -Name "GPOName" -Value "Local Group Policy" -Type String -Force
    
    # Создаем Scripts папку и копируем скрипт
    $scriptsPath = "C:\Windows\System32\GroupPolicy\Machine\Scripts\Shutdown"
    if (-not (Test-Path $scriptsPath)) {
        New-Item -ItemType Directory -Path $scriptsPath -Force | Out-Null
    }
    Copy-Item $shutdownScriptPath -Destination "$scriptsPath\shutdown_via_registry.ps1" -Force
    
    # Создаем scripts.ini
    $scriptsIni = @"
[Shutdown]
0CmdLine=shutdown_via_registry.ps1
0Parameters=
"@
    $scriptsIni | Out-File -FilePath "$scriptsPath\scripts.ini" -Encoding ASCII -Force
    
    Write-Host "✅ Скрипт выключения установлен через реестр" -ForegroundColor Green
    Write-Host "   Скрипт будет выполняться при выключении ПК" -ForegroundColor Gray
} catch {
    Write-Host "⚠️ Не удалось установить скрипт выключения через реестр: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   Используется только фоновый мониторинг" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Установка завершена!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Проверка задач:" -ForegroundColor Yellow
Write-Host "  schtasks /Query /TN Mesendger_PC_Startup_Monitor" -ForegroundColor Gray
Write-Host "  schtasks /Query /TN Mesendger_PC_Shutdown_Monitor" -ForegroundColor Gray

Write-Host "`n💡 Проверьте задачи в планировщике задач (taskschd.msc):" -ForegroundColor Yellow
Write-Host "   - Mesendger_PC_Startup_Monitor - триггер: При входе пользователя (с задержкой 30 сек)" -ForegroundColor Gray
Write-Host "     * Отправляет данные о включении ПК" -ForegroundColor DarkGray
Write-Host "     * Автоматически отправляет сохраненные данные о выключении (если были)" -ForegroundColor DarkGray
Write-Host "   - Mesendger_PC_Shutdown_Monitor - триггер: При событии выключения (System, EventID 1074/1076/6008)" -ForegroundColor Gray
Write-Host "     * Использует новый скрипт send_pc_shutdown_with_fallback.ps1" -ForegroundColor DarkGray
Write-Host "     * Сохраняет данные в файл при ошибке отправки" -ForegroundColor DarkGray
Write-Host "   - Mesendger_PC_Shutdown_Monitor_Background - триггер: При входе пользователя (фоновый монитор)" -ForegroundColor Gray
Write-Host "   - Mesendger_PC_Activity_Monitor - триггер: При входе пользователя" -ForegroundColor Gray

Write-Host "`n✅ Готово! Мониторинг настроен для пользователя: $username" -ForegroundColor Green
Write-Host "   Файлы находятся в: $targetDir" -ForegroundColor Gray
Write-Host "   Логи будут сохраняться в: %APPDATA%\mesendger\" -ForegroundColor Gray

Write-Host "`n📋 Важно для работы скриншотов:" -ForegroundColor Yellow
Write-Host "   - Задача должна запускаться от имени пользователя (не SYSTEM)" -ForegroundColor Gray
Write-Host "   - LogonType должен быть InteractiveToken" -ForegroundColor Gray
Write-Host "   - Проверьте логи в: %APPDATA%\mesendger\activity.log" -ForegroundColor Gray
Write-Host "   - Если скриншоты не работают, проверьте, что задача запущена с правильными правами" -ForegroundColor Gray

Write-Host "`n🔍 Проверка задач:" -ForegroundColor Cyan
Write-Host "   Откройте планировщик задач (taskschd.msc)" -ForegroundColor Gray
Write-Host "   Найдите задачу Mesendger_PC_Activity_Monitor" -ForegroundColor Gray
Write-Host "   Убедитесь, что 'Run as user' = ваш пользователь" -ForegroundColor Gray
Write-Host "   Убедитесь, что 'Run whether user is logged on or not' = НЕТ" -ForegroundColor Gray

Read-Host "`nPress Enter to exit"

