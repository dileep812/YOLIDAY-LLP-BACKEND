-- Migration: create users, experiences, bookings
-- Idempotent: uses IF NOT EXISTS and CHECK constraints

-- Users
CREATE TABLE IF NOT EXISTS users (
	id SERIAL PRIMARY KEY,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','host','user')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Experiences
CREATE TABLE IF NOT EXISTS experiences (
	id SERIAL PRIMARY KEY,
	title TEXT NOT NULL,
	description TEXT NOT NULL,
	location TEXT,
	price INTEGER NOT NULL DEFAULT 0,
	start_time TIMESTAMPTZ,
	created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','blocked')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
	id SERIAL PRIMARY KEY,
	experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	seats INTEGER NOT NULL CHECK (seats >= 1),
	status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
-- 1) Hosts commonly list/manage their upcoming experiences. Indexing (created_by, start_time)
--    speeds up queries like: "SELECT * FROM experiences WHERE created_by=$1 AND start_time >= $2 ORDER BY start_time"
CREATE INDEX IF NOT EXISTS idx_experiences_created_by_start_time ON experiences (created_by, start_time);

-- 2) When loading bookings for an experience and filtering by status (confirmed/cancelled),
--    an index on (experience_id, status) makes counts and lookups fast for dashboards and availability checks.
CREATE INDEX IF NOT EXISTS idx_bookings_experience_status ON bookings (experience_id, status);

-- Additional recommended indexes (create when inserting lots of production data):
-- a) Partial index for published experiences by start_time improves queries that only show
--    published/active events without indexing drafts/blocked rows.
CREATE INDEX IF NOT EXISTS idx_experiences_published_start_time ON experiences (start_time) WHERE status = 'published';

-- b) Per-user booking lookups are common (history, cancellations, counts). This index speeds those queries.
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings (user_id);

-- c) If you run location-based searches, index `location` separately (text equality / prefix searches).
CREATE INDEX IF NOT EXISTS idx_experiences_location ON experiences (location);


