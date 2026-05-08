ALTER TABLE support_reply_templates ADD COLUMN IF NOT EXISTS category VARCHAR(64) DEFAULT 'other';
