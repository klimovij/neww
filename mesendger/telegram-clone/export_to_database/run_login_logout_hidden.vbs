Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Путь к PowerShell скрипту
scriptPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
psScript = scriptPath & "\remote_login_logout_agent.ps1"

' Определяем тип события
eventType = "login"
If WScript.Arguments.Count > 0 Then
    eventType = WScript.Arguments(0)
End If

' Запускаем PowerShell скрипт скрыто
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & psScript & """ " & eventType, 0, False

Set WshShell = Nothing
Set fso = Nothing

