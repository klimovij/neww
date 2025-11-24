Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Путь к PowerShell скрипту
scriptPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
psScript = scriptPath & "\activity_agent.ps1"

' Запускаем PowerShell скрипт скрыто
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & psScript & """", 0, False

Set WshShell = Nothing
Set fso = Nothing

