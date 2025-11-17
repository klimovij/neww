-- Скрипт для SQLite: преобразует все event_time в ISO-формат YYYY-MM-DD HH:MM:SS
-- Работает только для строк, где дата в формате DD.MM.YYYY HH:MM:SS

UPDATE work_time_logs
SET event_time =
  substr(event_time, 7, 4) || '-' || substr(event_time, 4, 2) || '-' || substr(event_time, 1, 2) ||
  substr(event_time, 11)
WHERE length(event_time) >= 19
  AND substr(event_time, 3, 1) = '.'
  AND substr(event_time, 6, 1) = '.';

-- После выполнения этого скрипта все даты будут в ISO-формате, фильтрация будет работать корректно.
