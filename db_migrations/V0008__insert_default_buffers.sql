INSERT INTO buffers_config (id, scope_type, prep_minutes, cleanup_minutes, created_at, updated_at)
SELECT gen_random_uuid(), 'global', 30, 30, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM buffers_config WHERE scope_type = 'global' AND scope_id IS NULL LIMIT 1);