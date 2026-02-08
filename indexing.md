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
