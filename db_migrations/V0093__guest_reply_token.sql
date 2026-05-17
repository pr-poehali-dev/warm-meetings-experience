ALTER TABLE event_signups ADD COLUMN IF NOT EXISTS reply_token VARCHAR(40);
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_signups_reply_token ON event_signups(reply_token);
UPDATE event_signups SET reply_token = md5(random()::text || id::text || clock_timestamp()::text) WHERE reply_token IS NULL;