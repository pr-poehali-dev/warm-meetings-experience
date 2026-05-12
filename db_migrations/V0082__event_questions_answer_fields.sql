ALTER TABLE t_p99966623_warm_meetings_experi.event_questions
    ADD COLUMN IF NOT EXISTS answer_text TEXT,
    ADD COLUMN IF NOT EXISTS answer_channel VARCHAR(20),
    ADD COLUMN IF NOT EXISTS answer_sent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS answer_user_read_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_event_questions_guest_user_unread
    ON t_p99966623_warm_meetings_experi.event_questions(guest_user_id)
    WHERE guest_user_id IS NOT NULL AND answer_text IS NOT NULL AND answer_user_read_at IS NULL;
