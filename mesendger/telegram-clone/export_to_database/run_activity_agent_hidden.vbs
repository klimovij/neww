' VBScript обертка для скрытого запуска PowerShell скрипта агента активности
' Этот скрипт запускает PowerShell скрипт без отображения окна консоли

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Получаем путь к VBScript файлу
scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
psScriptPath = scriptDir & "\pc_activity_agent.ps1"
userParam = CreateObject("WScript.Network").UserName

' Проверяем существование PowerShell скрипта
If Not objFSO.FileExists(psScriptPath) Then
    ' Пробуем альтернативные пути
    alternativePaths = Array( _
        "C:\Users\" & userParam & "\web\pc-worktime\pc_activity_agent.ps1", _
        "C:\pc-worktime\pc_activity_agent.ps1" _
    )
    
    For Each altPath In alternativePaths
        If objFSO.FileExists(altPath) Then
            psScriptPath = altPath
            Exit For
        End If
    Next
    
    ' Если всё равно не найден, выходим
    If Not objFSO.FileExists(psScriptPath) Then
        WScript.Quit 1
    End If
End If

' Определяем, какая версия PowerShell доступна
pwshPath = objShell.ExpandEnvironmentStrings("%ProgramFiles%\PowerShell\7\pwsh.exe")
psPath = objShell.ExpandEnvironmentStrings("%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe")

' Используем PowerShell 7 если доступен, иначе Windows PowerShell
If objFSO.FileExists(pwshPath) Then
    psExecutable = pwshPath
Else
    psExecutable = psPath
End If

' Формируем аргументы командной строки
psArguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File """ & psScriptPath & """ -User " & userParam

' Рабочая директория
workingDir = objFSO.GetParentFolderName(psScriptPath)

' Запускаем PowerShell скрипт полностью скрыто (WindowStyle = 0)
objShell.Run """" & psExecutable & """ " & psArguments, 0, False

' Выходим без ошибки
WScript.Quit 0

