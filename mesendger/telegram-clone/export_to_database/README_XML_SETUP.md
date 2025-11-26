# Инструкция по настройке задач через XML файлы

## Быстрая настройка для каждого пользователя

### Шаг 1: Откройте XML файлы в блокноте

1. Откройте файл `Mesendger_PC_Startup_Monitor.xml` в блокноте
2. Откройте файл `Mesendger_PC_Shutdown_Monitor.xml` в блокноте

### Шаг 2: Замените USERNAME на правильный username

В обоих файлах найдите строку с `USERNAME` и замените на правильный username из базы данных Mesendger.

**Пример:**
- Было: `send_pc_startup.ps1' USERNAME"`
- Стало: `send_pc_startup.ps1' Ksendzik_Oleg"`

**Важно:** 
- Username должен точно соответствовать username в таблице `users` базы данных Mesendger
- Это нужно для правильного отображения ФИО пользователя в модалке

### Шаг 3: Проверьте путь к скриптам

Убедитесь, что путь к скриптам правильный:
- `C:\Users\Ronin\web\pc-worktime\send_pc_startup.ps1`
- `C:\Users\Ronin\web\pc-worktime\send_pc_shutdown.ps1`

Если скрипты находятся в другом месте, замените путь в обоих XML файлах.

### Шаг 4: Импортируйте задачи в планировщик

**Вариант А: Через планировщик задач (GUI)**
1. Откройте планировщик задач (`taskschd.msc`)
2. В правой панели нажмите "Импортировать задачу..."
3. Выберите файл `Mesendger_PC_Startup_Monitor.xml`
4. Нажмите "Открыть"
5. Повторите для `Mesendger_PC_Shutdown_Monitor.xml`

**Вариант Б: Через командную строку**
```powershell
# Откройте PowerShell от имени администратора
cd C:\Users\Ronin\web\pc-worktime

# Удалите существующие задачи (если есть)
schtasks /Delete /TN Mesendger_PC_Startup_Monitor /F
schtasks /Delete /TN Mesendger_PC_Shutdown_Monitor /F

# Импортируйте задачи
schtasks /Create /TN Mesendger_PC_Startup_Monitor /XML "Mesendger_PC_Startup_Monitor.xml" /F
schtasks /Create /TN Mesendger_PC_Shutdown_Monitor /XML "Mesendger_PC_Shutdown_Monitor.xml" /F
```

### Шаг 5: Проверьте настройки задач

1. Откройте планировщик задач (`taskschd.msc`)
2. Найдите задачи:
   - `Mesendger_PC_Startup_Monitor`
   - `Mesendger_PC_Shutdown_Monitor`
3. Проверьте триггеры:
   - **Startup**: При запуске системы
   - **Shutdown**: При событии (System, User32, 1074)
4. Проверьте действие:
   - Должен быть правильный путь к скрипту
   - Должен быть правильный username в аргументах

## Пример замены USERNAME

**В файле Mesendger_PC_Startup_Monitor.xml:**
```xml
<Arguments>-ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -Command "&amp; 'C:\Users\Ronin\web\pc-worktime\send_pc_startup.ps1' Ksendzik_Oleg"</Arguments>
```

**В файле Mesendger_PC_Shutdown_Monitor.xml:**
```xml
<Arguments>-ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -Command "&amp; 'C:\Users\Ronin\web\pc-worktime\send_pc_shutdown.ps1' Ksendzik_Oleg"</Arguments>
```

## Важные замечания

1. **Username должен быть одинаковым** в обоих XML файлах для одного пользователя
2. **Путь к скриптам** должен быть правильным на каждом ПК
3. **После замены username** обязательно сохраните файлы перед импортом
4. **Перед импортом** удалите существующие задачи (если они есть)

## Проверка работы

После импорта задач:
1. Перезагрузите ПК (для проверки задачи включения)
2. Выключите ПК (для проверки задачи выключения)
3. Проверьте логи: `%APPDATA%\mesendger\pc_startup.log` и `pc_shutdown.log`
4. Проверьте данные в модалке "Отчет активности локальных ПК"

