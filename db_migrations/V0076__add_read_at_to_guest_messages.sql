ALTER TABLE t_p99966623_warm_meetings_experi.guest_messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_guest_messages_signup_unread
  ON t_p99966623_warm_meetings_experi.guest_messages (signup_id, direction, read_at)
  WHERE direction = 'out' AND read_at IS NULL;
