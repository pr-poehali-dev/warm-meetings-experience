
-- Активируем Организатора обратно
UPDATE roles SET is_active = true WHERE slug = 'organizer';

-- Активируем требования для Организатора
UPDATE role_requirements SET is_active = true WHERE role_id = (SELECT id FROM roles WHERE slug = 'organizer');
