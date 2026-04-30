CREATE TABLE t_p99966623_warm_meetings_experi.master_reviews (
  id SERIAL PRIMARY KEY,
  master_id INTEGER NOT NULL,
  booking_id INTEGER NULL,
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50) NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_master_reviews_master_id ON t_p99966623_warm_meetings_experi.master_reviews(master_id);
CREATE INDEX idx_master_reviews_published ON t_p99966623_warm_meetings_experi.master_reviews(master_id, is_published);