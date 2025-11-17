-- Миграция: добавить поля для опросов в таблицу news
ALTER TABLE news ADD COLUMN type TEXT DEFAULT 'news';
ALTER TABLE news ADD COLUMN question TEXT;
ALTER TABLE news ADD COLUMN options TEXT;
