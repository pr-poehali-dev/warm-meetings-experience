CREATE TABLE organizer_requests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    telegram VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    city VARCHAR(255) DEFAULT 'Москва',
    has_own_bath VARCHAR(50) DEFAULT 'no',
    event_format TEXT,
    additional_info TEXT,
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP DEFAULT NOW()
);