# YOLIDAY Experiences API

A minimal TypeScript + Express backend for an "Experiences" marketplace (Users / Hosts / Admins).

## Features
- JWT auth (bcrypt + jsonwebtoken)
- RBAC: `user`, `host`, `admin`
- Experiences: create (host/admin), publish (owner/admin), block (admin)
- Public listing of published experiences (filters, pagination, sort)
- Bookings with duplicate-confirmed-booking prevention
- Structured JSON error responses: `{ error: { code, message, details[] } }`

## Setup

1. Install dependencies

```bash
npm install
```

2. Environment variables

Create a `.env` file (or export) with at least:

- `DATABASE_URL` — Postgres connection string (required)
- `JWT_SECRET` — secret used to sign JWTs (required)
- `PORT` — optional (default 3000)
- `ADMIN_EMAIL` — optional: email address that will be bootstrapped as `admin` on first run (email-only bootstrap)

Example `.env`:

```
DATABASE_URL=postgres://user:pass@localhost:5432/yoliday
JWT_SECRET=supersecret
PORT=3000
ADMIN_EMAIL=admin@example.com
```

3. Database schema / migrations

This project includes a simple SQL migration at `db/create_tables.sql` which creates `users`, `experiences`, and `bookings` plus helpful indexes.

Apply it with `psql` or your preferred client. Example:

```bash
# using psql and DATABASE_URL
psql "$DATABASE_URL" -f db/001_create_tables.sql
```


4. Run the app

```bash
# development (requires a dev script like nodemon / ts-node configured)
npm run dev

# production (build + run) — if you have build scripts
npm run build
node ./dist/server.js
```

## API Examples (curl)

Replace `http://localhost:3000` with your host. `:id` placeholders mean numeric IDs.

1) Signup

```bash
curl -s -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"s3cret"}'
```

Response: created `user` (signup does NOT return a token).

2) Login

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"s3cret"}'
```

Response body includes `{ token, user }`. Save the token for Authorization: `Bearer <token>`.

3) Create experience (host or admin)

```bash
curl -s -X POST http://localhost:3000/experiences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Kayak Trip","description":"A fun trip","location":"River","price":50,"start_time":"2026-03-01T10:00:00Z"}'
```

Response: `201` with created `experience` (status defaults to `draft`).

4) Publish an experience (owner host or admin)

```bash
curl -s -X PATCH http://localhost:3000/experiences/123/publish \
  -H "Authorization: Bearer $OWNER_OR_ADMIN_TOKEN"
```

Response: updated `experience` with status `published`.

5) Block an experience (admin only)

```bash
curl -s -X PATCH http://localhost:3000/experiences/123/block \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Response: updated `experience` with status `blocked`.

6) List published experiences (public)

```bash
curl -s "http://localhost:3000/experiences?page=1&limit=10&sort=asc&location=River&from=2026-03-01T00:00:00Z&to=2026-04-01T00:00:00Z"
```

Response: `{ data: [ ... ], meta: { total, page, limit } }`.

7) Book an experience (authenticated user/host/admin; owners cannot book their own)

```bash
curl -s -X POST http://localhost:3000/experiences/123/book \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"seats":2}'
```

Response: `201` with created `booking`. If a confirmed booking by same user exists, `409 ALREADY_BOOKED` is returned.

## Error shapes & status codes

- Missing/invalid token: `401` with `{ error: { code: 'UNAUTHENTICATED', ... } }`
- Forbidden: `403` with code `FORBIDDEN`
- Not found: `404`
- Validation: `400` with `VALIDATION_ERROR` and `details` array
- Conflict (duplicate booking): `409` with `ALREADY_BOOKED`

## RBAC Rules Implemented

- `user`: can login, list published experiences, and create bookings (cannot book their own experiences if owner)
- `host`: can create experiences (created items default to `draft`), can publish their own experiences, cannot book their own experiences
- `admin`: can do everything a host can do, plus block any experience and perform admin-only actions

## Notes & Next Steps

- The code enforces duplicate-confirmed-booking prevention at the application level; adding the DB partial unique index shown above is recommended for production to prevent race conditions.
- Logging is JSON-formatted via `morgan` in `server.ts`.
- Health check endpoint: `GET /health` — returns DB connectivity status.

