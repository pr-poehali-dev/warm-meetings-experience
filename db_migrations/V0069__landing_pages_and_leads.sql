CREATE TABLE IF NOT EXISTS landing_pages (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    slug            VARCHAR(30) NOT NULL UNIQUE,
    enabled         BOOLEAN NOT NULL DEFAULT true,
    theme           VARCHAR(40) NOT NULL DEFAULT 'terracotta',
    custom_data     JSONB NOT NULL DEFAULT '{}'::jsonb,
    visits          INTEGER NOT NULL DEFAULT 0,
    cta_clicks      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_slug    ON landing_pages (slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_user_id ON landing_pages (user_id);

CREATE TABLE IF NOT EXISTS landing_leads (
    id          SERIAL PRIMARY KEY,
    landing_id  INTEGER NOT NULL REFERENCES landing_pages(id),
    name        VARCHAR(200) NOT NULL,
    contact     VARCHAR(200) NOT NULL,
    message     TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_leads_landing_id ON landing_leads (landing_id);
