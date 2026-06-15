# Chronicle Vault

Chronicle Vault is a full-stack vintage watch registry built with React, Vite, Node.js, Express, and MySQL. It now supports multi-tenant organizations, stronger API security, and role-aware dashboards for platform operators, organization admins, and members.

## Features

- Public landing page and serial-number lookup
- Database-backed JWT authentication with bcrypt password hashing
- Multi-tenant Organizations model
- `SuperAdmin`, `OrgAdmin`, and `User` roles
- Organization-scoped CRUD permissions enforced in SQL-backed API handlers
- Revocable sessions, account disabling, soft archival, and immutable audit events
- Auth-aware frontend navigation with protected and role-based routes
- Rate-limited login endpoint, `helmet`, input validation, and centralized error handling
- `production_year` used consistently across backend, frontend, and schema

Report generation is intentionally not included.

## Permissions

- **SuperAdmin:** Can view and manage all organizations and all registry data.
- **OrgAdmin:** Can manage users, brands, movements, watches, parts, auctions, and checks inside their own organization only.
- **User:** Cannot see the Users page, can manage only their own watches, and can only view parts, auctions, and checks tied to those watches.
- **Public:** Can look up an exact serial number and view safe authentication fields only. Ownership and private notes are never exposed.

The backend never trusts `user_id` or `organization_id` from the frontend. Those values are derived from the authenticated session and validated against organization scope.

## Database

For a new local database, run the development bootstrap schema:

```powershell
Get-Content -Raw database\schema.sql | & "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" -u root -p
Get-Content -Raw database\seeds\demo.sql | & "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" -u root -p
```

The bootstrap schema recreates the database, and the separate demo seed adds
sample records. Do not run either against an existing production database.
Default demo accounts:

| Role | Username | Password |
| --- | --- | --- |
| SuperAdmin | `superadmin` | `Vintage123!` |
| OrgAdmin | `admin` | `Vintage123!` |
| User | `viewer` | `Vintage123!` |
| OrgAdmin (2nd org) | `dealer` | `Vintage123!` |
| User (2nd org) | `collector` | `Vintage123!` |

Sample public serial: `CV-OMEGA-1969-001`

## Configuration

Create `backend/.env` from `backend/.env.example`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=vintage_watch_auth
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=30m
JWT_ISSUER=chronicle-vault
JWT_AUDIENCE=chronicle-vault-web
CLIENT_URL=http://localhost:5173,http://127.0.0.1:5173
```

The frontend defaults to `http://localhost:5000/api`. Override it in `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Run

Install dependencies:

```powershell
npm run install:all
```

Start the backend and frontend in separate terminals:

```powershell
npm run dev:backend
npm run dev:frontend
```

Open `http://127.0.0.1:5173`.

For an existing database, apply versioned, non-destructive migrations before
starting the API:

```powershell
npm run migrate
```

## Deployment

GitHub stores the source code and runs the CI workflow, but GitHub Pages cannot
run the Express API or MySQL database.

A practical production setup is:

- GitHub: source control and CI
- Vercel or Netlify: `frontend`
- Render, Railway, or Fly.io: `backend`
- Railway, Aiven, PlanetScale-compatible MySQL, or another managed MySQL host:
  database

Configure the backend host with all values from `backend/.env.example`. Set
`CLIENT_URL` to the deployed frontend URL. Configure the frontend host with:

```env
VITE_API_URL=https://your-api-host.example/api
```

Run `npm run migrate` against the production database before starting the
backend. Never upload `backend/.env`, database passwords, or JWT secrets to
GitHub.

## Security Notes

- Passwords are hashed with `bcryptjs`
- JWTs are required for all private API routes
- Every request reloads current role, organization, status, and token version
- Password, role, and status changes revoke existing sessions
- CRUD deletions archive records and write an audit event
- `helmet` sets secure HTTP headers
- Login is rate-limited with `express-rate-limit`
- Inputs are validated with `express-validator`
- SQL access uses prepared statements via `mysql2/promise`
- Centralized error handling returns safe `401`, `403`, `404`, and validation responses

## API

Public:

```text
GET /api/health
GET /api/public/lookup/:serial
POST /api/auth/login
POST /api/auth/logout
```

Authenticated:

```text
GET /api/auth/me
GET /api/auth/me/dashboard
GET /api/dashboard/summary
GET /api/:resource
GET /api/:resource/:id
POST /api/:resource
PUT /api/:resource/:id
DELETE /api/:resource/:id
```

Available resources:

```text
organizations
users
brands
movements
watches
parts
auctions
checks
```
