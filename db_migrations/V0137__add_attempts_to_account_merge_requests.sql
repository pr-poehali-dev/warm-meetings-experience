ALTER TABLE t_p99966623_warm_meetings_experi.account_merge_requests
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;