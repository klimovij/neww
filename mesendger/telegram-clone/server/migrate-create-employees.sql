-- Таблица сотрудников
CREATE TABLE employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_day INTEGER NOT NULL,
    birth_month INTEGER NOT NULL,
    birth_year INTEGER NOT NULL
);

-- Таблица поздравлений
CREATE TABLE congratulations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    congrat_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    scheduled_at DATETIME,
    likes INTEGER DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Таблица комментариев к поздравлениям
CREATE TABLE congrat_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    congrat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (congrat_id) REFERENCES congratulations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
