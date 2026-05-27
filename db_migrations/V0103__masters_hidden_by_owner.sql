-- Возможность мастеру самому скрыть профиль из публичного каталога,
-- не теряя статус верификации и не пересекаясь с админским is_active.
-- hidden_by_owner=TRUE  → профиль не показывается в каталоге /masters
-- hidden_by_owner=FALSE → видимость определяется обычными правилами (is_active, is_verified)
ALTER TABLE masters ADD COLUMN IF NOT EXISTS hidden_by_owner BOOLEAN NOT NULL DEFAULT FALSE;
