CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  actor_type TEXT NOT NULL DEFAULT 'admin',
  actor_id INTEGER,
  actor_name TEXT,
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON admin_audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);