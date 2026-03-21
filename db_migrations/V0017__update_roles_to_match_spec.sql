
-- 1. Деактивируем роли organizer и editor
UPDATE roles SET is_active = false WHERE slug IN ('organizer', 'editor');

-- 2. Переименовываем master → parmaster
UPDATE roles SET 
  name = 'Пармастер',
  slug = 'parmaster',
  description = 'Заполняет расширенный профиль, управляет расписанием и услугами, видит записи на сеансы',
  icon = '🔥',
  sort_order = 2
WHERE slug = 'master';

-- 3. Обновляем описание Участника
UPDATE roles SET 
  description = 'Записывается на события, оплачивает участие, оставляет отзывы, ведёт профиль'
WHERE slug = 'member';

-- 4. Обновляем описание Партнёра
UPDATE roles SET 
  description = 'Владелец бани — управляет карточкой бани, обновляет условия и расписание',
  icon = '🏠',
  sort_order = 3
WHERE slug = 'partner';

-- 5. Добавляем роль Администратор
INSERT INTO roles (name, slug, description, icon, sort_order, is_active) 
VALUES ('Администратор', 'admin', 'Полный доступ к управлению контентом, пользователями, финансами и модерацией', '⚙️', 4, true);

-- 6. Деактивируем старые требования для бывшего master (id=2)
-- Добавляем колонку is_active если её нет
ALTER TABLE role_requirements ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Деактивируем старые требования для role_id=2 (parmaster) и role_id=3 (partner)
UPDATE role_requirements SET is_active = false WHERE role_id IN (2, 3);

-- Деактивируем требования для organizer (4) и editor (5)
UPDATE role_requirements SET is_active = false WHERE role_id IN (4, 5);

-- 7. Добавляем новые требования для Пармастер (role_id=2)
INSERT INTO role_requirements (role_id, type, value, description, sort_order, is_active) VALUES
(2, 'profile_complete', 1, 'Заполнить расширенный профиль (опыт, сертификаты, фото)', 10, true),
(2, 'min_sessions', 3, 'Провести минимум 3 сеанса как мастер', 11, true),
(2, 'min_reviews_new', 2, 'Получить минимум 2 положительных отзыва', 12, true);

-- 8. Добавляем новые требования для Партнёр (role_id=3)
INSERT INTO role_requirements (role_id, type, value, description, sort_order, is_active) VALUES
(3, 'bath_registered', 1, 'Добавить баню в каталог с описанием и фото', 10, true),
(3, 'ownership_confirmed', 1, 'Подтвердить владение баней', 11, true);
