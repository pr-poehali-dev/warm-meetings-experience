ALTER TABLE event_signups
  ALTER COLUMN reply_token SET DEFAULT md5(random()::text || clock_timestamp()::text);