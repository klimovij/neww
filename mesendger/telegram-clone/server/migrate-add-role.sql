-- Добавить поле role в таблицу users, если оно отсутствует
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';

-- Присвоить роль супер-админа Олегу Ксендзик (IT - отдел)
UPDATE users SET role = 'admin' WHERE username = 'Олег Ксендзик (IT - отдел)';

-- Присвоить роль HR Елене Попович
UPDATE users SET role = 'hr' WHERE username = 'Елена Попович';
