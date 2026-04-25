ALTER TABLE t_p99966623_warm_meetings_experi.organizer_profiles
  ADD COLUMN IF NOT EXISTS notify_email    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_vk       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_telegram boolean NOT NULL DEFAULT true;