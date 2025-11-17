-- Показывает все события login/logout по датам и сотрудникам за выбранный день
-- Замените '2025-09-04' на нужную дату
SELECT username, event_type, event_time
FROM work_time_logs
WHERE date(event_time) = '2025-09-04'
ORDER BY username, event_time;

-- Показывает все события login/logout по сотруднику за выбранный день
-- Замените 'Павел Еремеев' и '2025-09-04' на нужные значения
SELECT username, event_type, event_time
FROM work_time_logs
WHERE username = 'Павел Еремеев' AND date(event_time) = '2025-09-04'
ORDER BY event_time;
