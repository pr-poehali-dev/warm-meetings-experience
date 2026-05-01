CREATE TABLE user_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('bath', 'master', 'event')),
    item_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_type, item_id)
);
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);

CREATE TABLE wallet_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bonus', 'cashback', 'fee', 'refund')),
    amount INTEGER NOT NULL,
    description TEXT,
    ref_type VARCHAR(30),
    ref_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_wallet_user ON wallet_transactions(user_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_balance INTEGER DEFAULT 0;

CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER NOT NULL REFERENCES users(id),
    referred_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bonus_paid BOOLEAN DEFAULT false,
    UNIQUE(referred_id)
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16) UNIQUE;
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
