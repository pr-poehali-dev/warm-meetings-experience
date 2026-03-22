CREATE TABLE t_p99966623_warm_meetings_experi.blog_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'rituals',
    image_url TEXT,
    author_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    read_time INTEGER DEFAULT 5,
    popular BOOLEAN DEFAULT FALSE,
    reject_reason TEXT,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blog_articles_status ON t_p99966623_warm_meetings_experi.blog_articles(status);
CREATE INDEX idx_blog_articles_category ON t_p99966623_warm_meetings_experi.blog_articles(category);
CREATE INDEX idx_blog_articles_author ON t_p99966623_warm_meetings_experi.blog_articles(author_id);
