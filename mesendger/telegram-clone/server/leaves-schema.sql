-- Таблица заявок на отпуска/отгулы/больничные
CREATE TABLE IF NOT EXISTS leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    type TEXT NOT NULL, -- vacation, leave, sick
    startDate TEXT NOT NULL, -- YYYY-MM-DD
    endDate TEXT NOT NULL,   -- YYYY-MM-DD
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Таблица пользователей (добавлено поле role)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' -- user, hr, admin
    -- ... другие поля ...
);

-- Таблица логов рабочего времени
CREATE TABLE IF NOT EXISTS work_time_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    event_type TEXT NOT NULL, -- login, logout
    event_time TEXT NOT NULL, -- ISO8601
    event_id INTEGER NOT NULL, -- 4624, 4634
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Пример добавления HR и админа
INSERT INTO users (username, password, role) VALUES ('hr_manager', 'hashpass', 'hr');
INSERT INTO users (username, password, role) VALUES ('superadmin', 'hashpass', 'admin');
-- Назначение ролей реальным пользователям
INSERT INTO users (username, password, role) VALUES ('Олег Ксендзик (IT - отдел)', 'hashpass', 'admin');
INSERT INTO users (username, password, role) VALUES ('Елена Попович', 'hashpass', 'hr');
