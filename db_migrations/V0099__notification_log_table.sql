CREATE TABLE IF NOT EXISTS notification_log (
    id           BIGSERIAL PRIMARY KEY,
    channel      VARCHAR(20)  NOT NULL,
    event_type   VARCHAR(50)  NOT NULL,
    recipient    VARCHAR(255),
    subject      VARCHAR(255),
    status       VARCHAR(20)  NOT NULL,
    error_code   VARCHAR(50),
    error_text   TEXT,
    provider_resp TEXT,
    payload      JSONB,
    user_id      INTEGER,
    related_id   INTEGER,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_log_created  ON notification_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_log_status   ON notification_log (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_log_channel  ON notification_log (channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_log_event    ON notification_log (event_type, created_at DESC);
