ALTER TABLE t_p99966623_warm_meetings_experi.masters
  ADD COLUMN IF NOT EXISTS user_id integer;

CREATE UNIQUE INDEX IF NOT EXISTS masters_user_id_unique
  ON t_p99966623_warm_meetings_experi.masters(user_id)
  WHERE user_id IS NOT NULL;
