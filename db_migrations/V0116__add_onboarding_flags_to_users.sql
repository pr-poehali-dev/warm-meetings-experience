-- Онбординг-тур: отметки прохождения для личного и банного кабинетов
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_account_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_workspace_at TIMESTAMP NULL;