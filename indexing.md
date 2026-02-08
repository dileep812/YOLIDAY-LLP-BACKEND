# Indexes

This document collects index recommendations 

## Recommended indexes

1. `idx_experiences_created_by_start_time` — table: `experiences` (columns: `created_by`, `start_time`)
   - Purpose: speeds up queries used by hosts to list/manage their upcoming experiences, e.g.
     `SELECT * FROM experiences WHERE created_by=$1 AND start_time >= $2 ORDER BY start_time`.

2. `idx_bookings_experience_status` — table: `bookings` (columns: `experience_id`, `status`)
   - Purpose: accelerates lookups, counts and aggregates of bookings for a specific experience filtered by
     `status` (confirmed vs cancelled), which is useful for availability checks and host dashboards.

3. `idx_experiences_published_start_time` — table: `experiences` (column: `start_time`, partial: `WHERE status='published'`)
   - Purpose: partial index that speeds up queries which only return published experiences in a time window,
     avoiding indexing drafts/blocked rows and reducing index size / write overhead.

4. `idx_bookings_user_id` — table: `bookings` (column: `user_id`)
   - Purpose: speeds up retrieval of a user's booking history and counts used in user-facing dashboards.

5. `idx_experiences_location` — table: `experiences` (column: `location`)
   - Purpose: supports equality/prefix queries on `location` for simple location-based filtering/search.

## Partial unique index for bookings

To prevent duplicate confirmed bookings at the database level (recommended for production), add a partial unique index:

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_experience_user_confirmed
  ON bookings (experience_id, user_id)
  WHERE status = 'confirmed';
```

This prevents race conditions where two concurrent requests could create two confirmed bookings for the same user/experience.

## Index management — how to add/update indexes quickly

- Create a new migration file in `migrations/` with a sequential prefix, e.g. `002_add_index_experiences_status_start_time.sql`.
- At the top of the migration include a short comment explaining *why* the index is needed (what query pattern it accelerates).
- Apply the migration with your normal migration tooling or `psql`:

```bash
psql "%DATABASE_URL%" -f migrations/002_add_index_experiences_status_start_time.sql
```

### Examples

- `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_experiences_status_start_time ON experiences (status, start_time);`
  - Rationale: speeds up queries that list published experiences for a given time window (e.g. `WHERE status='published' AND start_time >= $1`).
- `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_id ON bookings (user_id);`
  - Rationale: speeds up loading a user's booking history and counts for dashboards.

### Best practices

- Use `CONCURRENTLY` for creating/dropping indexes in production to avoid long table locks: `CREATE INDEX CONCURRENTLY ...` and `DROP INDEX CONCURRENTLY ...`.
- Always include a plain-English comment at the top of the migration describing the query pattern, expected benefit, and any rollback steps.
- Test the index with `EXPLAIN (ANALYZE, BUFFERS)` on representative queries before and after applying the index.
- If an index isn't useful (low usage or high write overhead), drop it with `DROP INDEX CONCURRENTLY idx_name;` and record that action in a follow-up migration.

### Naming convention

Suggested naming: `idx_<table>_<col1>[_<col2>...]` — keeps names predictable and searchable.

If you'd like I can add a sample migration file under `migrations/` for one of the above indexes.
