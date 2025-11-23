# Script for automatic daily sending of yesterday worktime data
# Task runs every day at 01:00 AM

param(
    [string]$ScriptPath = $PSScriptRoot
)

# Check administrator rights
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin -eq $false) {
    Write-Host "Error: This script requires administrator rights!" -ForegroundColor Red
    Write-Host "   Run PowerShell as administrator" -ForegroundColor Yellow
    exit 1
}

Write-Host "Setting up daily worktime data sending task..." -ForegroundColor Cyan

# Path to sending script
$sendScript = Join-Path $ScriptPath "send_yesterday_to_google.ps1"

# Check if script exists
if ((Test-Path $sendScript) -eq $false) {
    Write-Host "Error: Script not found: $sendScript" -ForegroundColor Red
    exit 1
}

Write-Host "Script found: $sendScript" -ForegroundColor Green

# Task name
$taskName = "PC_Send_Worktime_Yesterday"

# Remove old task if exists
Write-Host ""
Write-Host "Checking existing tasks..." -ForegroundColor Yellow
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask -ne $null) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "   Old task removed: $taskName" -ForegroundColor Green
}

# Find PowerShell path
$pwshCmd = Get-Command pwsh -ErrorAction SilentlyContinue
if ($pwshCmd -ne $null) {
    $pwshPath = $pwshCmd.Source
} else {
    $psCmd = Get-Command powershell -ErrorAction SilentlyContinue
    if ($psCmd -ne $null) {
        $pwshPath = $psCmd.Source
    } else {
        Write-Host "Error: PowerShell not found!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Creating scheduled task..." -ForegroundColor Cyan

# Get current user name
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

# Create task action
$actionArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$sendScript`""
$action = New-ScheduledTaskAction -Execute $pwshPath -Argument $actionArgs -WorkingDirectory $ScriptPath

# Create trigger: daily at 01:00
$trigger = New-ScheduledTaskTrigger -Daily -At 1:00AM

# Task settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable -DontStopOnIdleEnd -MultipleInstances IgnoreNew

# Principal (Limited to not require password)
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited

# Register task
$desc = "Automatic sending of login/logout data for previous day to server"
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $desc -ErrorAction Stop

Write-Host ""
Write-Host "Task created successfully!" -ForegroundColor Green
Write-Host "   Task name: $taskName" -ForegroundColor Cyan
Write-Host "   Run time: every day at 01:00" -ForegroundColor Cyan
Write-Host "   Script: $sendScript" -ForegroundColor Cyan

# Show task information
$task = Get-ScheduledTask -TaskName $taskName
Write-Host ""
Write-Host "Task information:" -ForegroundColor Yellow
Write-Host "   Status: $($task.State)" -ForegroundColor White
$taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
Write-Host "   Next run: $($taskInfo.NextRunTime)" -ForegroundColor White

Write-Host ""
Write-Host "Setup completed!" -ForegroundColor Green
Write-Host "   Task will automatically run every day at 01:00" -ForegroundColor Gray
Write-Host "   and send previous day data to server." -ForegroundColor Gray
