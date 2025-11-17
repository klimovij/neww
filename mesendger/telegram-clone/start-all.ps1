# Запуск серверной и клиентской частей через PowerShell, с повышением прав администратора
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Определяем путь скрипта
$ScriptDir = Split-Path -Parent $PSCommandPath

# Проверка прав администратора и авто-повышение
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
  Write-Host 'Запрашиваю права администратора...'
  Start-Process -FilePath 'powershell.exe' -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs | Out-Null
  exit
}

function Start-PSWindow {
  param(
    [Parameter(Mandatory)] [string] $Title,
    [Parameter(Mandatory)] [string] $WorkingDir,
    [Parameter(Mandatory)] [string] $Command
  )
  $pwshCmd = Get-Command pwsh -ErrorAction SilentlyContinue
  if ($pwshCmd) {
    $hostExe = $pwshCmd.Source
  } else {
    $hostExe = 'powershell.exe'
  }
  $args = "-NoExit -NoProfile -ExecutionPolicy Bypass -Command `"Set-Location -LiteralPath '$WorkingDir'; $Command`""
  Start-Process -FilePath $hostExe -ArgumentList $args -WorkingDirectory $WorkingDir -WindowStyle Normal -Wait:$false -PassThru | Out-Null
}

# 1) Сервер (Node.js backend) на порту 5000
$serverDir = Join-Path $ScriptDir 'server'
Write-Host "Старт сервера в: $serverDir"
Start-PSWindow -Title 'server' -WorkingDir $serverDir -Command "npm install; $env:PORT='5000'; npm run start"

# 2) Клиент (React frontend)
$clientDir = Join-Path $ScriptDir 'client-react'
Write-Host "Старт клиента в: $clientDir (PORT=3001)"
Start-PSWindow -Title 'client-react' -WorkingDir $clientDir -Command "npm install; $env:PORT='3001'; $env:BROWSER=''; npm start"

# 3) Опционально открыть в браузере (раскомментируйте, если нужно)
# Start-Process 'http://localhost:5000'
# Start-Process 'http://localhost:3000'

Write-Host 'Все процессы запущены в отдельных окнах PowerShell. Это окно можно закрыть.'

