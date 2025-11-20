# Пример конфигурационного файла для send_to_google_server.ps1
# Скопируйте этот файл как config.ps1 и заполните реальными данными

# URL вашего Google сервера (без завершающего слеша)
$global:ServerUrl = "https://your-google-server.com/api"

# API ключ для аутентификации (получите у администратора сервера)
$global:ApiKey = "your-secret-api-key-here"

# Количество дней назад для импорта по умолчанию (1 = вчерашний день)
$global:DaysBack = 1

# Путь к скрипту отправки данных
$global:ScriptPath = "C:\Scripts\send_to_google_server.ps1"

# Время автоматического запуска (24-часовой формат)
$global:ScheduledTime = "00:30"

# Сохранять ли логи в файл
$global:SaveLogs = $true

# Путь для сохранения логов
$global:LogPath = "C:\Logs\worktime_sync"

