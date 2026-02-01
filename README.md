# Outline Seller Admin

Admin console for issuing Outline VPN keys, tracking renewals, and revoking access.

## Features

- Password-protected dashboard with httpOnly cookie session.
- Prisma + Postgres persistence for customers and audit logs.
- Server-only Outline API integration with certificate fingerprint validation.
- Renewal, revocation, and expiration automation.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables (example):

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
ADMIN_PASSWORD="change-me"
SESSION_SECRET="long-random-string"
OUTLINE_API_URL="https://YOUR-OUTLINE-SERVER:PORT/"
OUTLINE_CERT_SHA256="AA:BB:CC:DD:..."
CRON_SECRET="cron-secret"
```

Notes:
- `OUTLINE_CERT_SHA256` must match the SHA-256 fingerprint of the Outline server certificate.
- `OUTLINE_API_URL` should include a trailing slash.

3. Generate Prisma client and migrate:

```bash
npx prisma generate
npx prisma migrate dev
```

4. Run the app:

```bash
npm run dev
```

Open `http://localhost:3000/login`.

## Cron expiration job

Send a POST request to revoke expired customers:

```bash
curl -X POST http://localhost:3000/api/cron/expire \
  -H "x-cron-secret: CRON_SECRET"
```

## Security notes

- `OUTLINE_API_URL` and `OUTLINE_CERT_SHA256` are used only on the server.
- All `/api` routes and `/dashboard` require a valid admin session.
