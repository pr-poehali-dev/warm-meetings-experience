-- Удаление дубликатных индексов на events.
-- На таблице 11 индексов, среди них есть полные дубли:
--   idx_events_slug (btree) дублирует events_slug_key (UNIQUE btree) — оба по slug;
--   idx_events_short_code (UNIQUE btree) дублирует events_short_code_key (UNIQUE btree,
--   backing UNIQUE constraint) — оба по short_code.
-- UNIQUE-индекс уже работает как btree для поиска, второй экземпляр только
-- тратит место и замедляет INSERT/UPDATE.
-- Дополнительно убираем idx_events_visible: индекс по boolean с двумя значениями
-- имеет селективность <50%, планировщик его всё равно почти не использует.

DROP INDEX IF EXISTS idx_events_slug;
DROP INDEX IF EXISTS idx_events_short_code;
DROP INDEX IF EXISTS idx_events_visible;
