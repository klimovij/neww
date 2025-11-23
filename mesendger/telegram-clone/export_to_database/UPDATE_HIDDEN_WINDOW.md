# Обновление: Скрытие окна PowerShell при запуске агента

## Проблема
При запуске агента активности через планировщик задач окно PowerShell появляется на экране, что нежелательно для пользователя.

## Решение
Создана VBScript обертка (`run_activity_agent_hidden.vbs`), которая запускает PowerShell скрипт полностью скрыто без мигания окна.

## Как применить обновление

### 1. Убедитесь, что все файлы скопированы:
- `pc_activity_agent.ps1` - обновлен
- `run_activity_agent_hidden.vbs` - новый файл
- `setup_pc_worktime_tasks.ps1` - обновлен

### 2. Пересоздайте задачу в планировщике задач:

Откройте PowerShell **от имени администратора** и выполните:

```powershell
cd C:\Users\Ronin\web\pc-worktime
pwsh.exe -ExecutionPolicy Bypass -File .\setup_pc_worktime_tasks.ps1
```

Или если используете Windows PowerShell:

```powershell
cd C:\Users\Ronin\web\pc-worktime
powershell.exe -ExecutionPolicy Bypass -File .\setup_pc_worktime_tasks.ps1
```

### 3. Проверьте, что задача использует VBScript обертку:

1. Откройте "Планировщик задач" (Task Scheduler)
2. Найдите задачу "PC_Activity_Agent"
3. Откройте свойства задачи
4. Вкладка "Действия" (Actions)
5. Проверьте, что команда запуска: `wscript.exe`
6. И аргументы: `"C:\Users\Ronin\web\pc-worktime\run_activity_agent_hidden.vbs"`

### 4. Протестируйте:

1. Остановите текущий процесс агента (если запущен)
2. Запустите задачу вручную из планировщика задач
3. Проверьте, что окно PowerShell **не появляется**
4. Проверьте логи в `C:\pc-worktime\logs\agent_startup.log` - агент должен работать

### 5. Перезагрузите ПК для полной проверки:

После перезагрузки окно PowerShell не должно появляться при запуске агента.

## Альтернативный способ (если VBScript не работает):

Если по какой-то причине VBScript обертка не работает, задача автоматически использует прямое выполнение PowerShell с параметром `-WindowStyle Hidden`. Однако VBScript метод более надежен и полностью скрывает окно с самого начала.

## Файлы

- `run_activity_agent_hidden.vbs` - VBScript обертка для скрытого запуска
- `pc_activity_agent.ps1` - основной скрипт агента (улучшенное скрытие окна)
- `setup_pc_worktime_tasks.ps1` - скрипт настройки планировщика задач

