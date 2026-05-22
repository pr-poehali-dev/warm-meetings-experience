CREATE TABLE IF NOT EXISTS club_donations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  guest_name VARCHAR(120),
  guest_email VARCHAR(255),
  guest_contact VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(8) DEFAULT 'RUB',
  is_anonymous BOOLEAN DEFAULT false,
  share_stats BOOLEAN DEFAULT true,
  source VARCHAR(60),
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_provider VARCHAR(40),
  payment_id VARCHAR(100),
  robokassa_inv_id BIGINT UNIQUE,
  payment_url TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_donations_user ON club_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_club_donations_status ON club_donations(status);
CREATE INDEX IF NOT EXISTS idx_club_donations_created ON club_donations(created_at DESC);