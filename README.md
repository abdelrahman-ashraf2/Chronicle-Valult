# Chronicle Vault

Chronicle Vault is a multi-tenant vintage watch authentication and provenance
platform built with React, Vite, Node.js, Express, and MySQL.

## Features

- Premium public landing page, serial lookup, and token verification pages
- Secure HttpOnly-cookie JWT sessions with bcrypt password hashing
- `SuperAdmin`, `OrgAdmin`, and `User` permissions
- Tenant-scoped watch dossiers, provenance, evidence, parts, auctions, and checks
- Authentication cases with comments, evidence requests, transitions, and outcomes
- Public QR verification controlled by organization administrators
- Ownership transfers, invitations, team members, and in-app notifications
- Plans with enforced watch, user, evidence, API, webhook, and white-label limits
- API keys, signed webhooks, CSV import, and CSV export
- Paginated APIs, responsive dashboards, dialogs, empty states, and confirmations
- Soft archival, audit events, rate limiting, Helmet, CORS, CSRF origin checks, and centralized errors
- `production_year` used consistently throughout the application

Report generation is intentionally not included.

## Permissions

- **SuperAdmin:** Views and manages all organizations and registry data.
- **OrgAdmin:** Manages members and data only inside their organization.
- **User:** Manages only their own watches and sees related records only.
- **Public:** Sees safe verification fields only. Owner data and private notes are never exposed.

The backend derives `user_id` and `organization_id` from the authenticated
session. It never trusts those values from a normal-user form.

## Local Setup

Install dependencies:

```powershell
npm run install:all
```

Create `backend/.env` from `backend/.env.example` and set it to match your
local MySQL credentials.

Create and seed a development database:

```powershell
Get-Content -Raw database\schema.sql | & "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" -u root -p
Get-Content -Raw database\seeds\demo.sql | & "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" -u root -p
npm run migrate
```

The bootstrap schema recreates the database. Do not run it or the demo seed
against a production database. For an existing database, run only:

```powershell
npm run migrate
```

Start the app in separate terminals:

```powershell
npm run dev:backend
npm run dev:frontend
```

Open `http://localhost:5173`.

## Demo Accounts

| Role | Username | Password |
| --- | --- | --- |
| SuperAdmin | `superadmin` | `Vintage123!` |
| OrgAdmin | `admin` | `Vintage123!` |
| User | `viewer` | `Vintage123!` |
| OrgAdmin, second tenant | `dealer` | `Vintage123!` |
| User, second tenant | `collector` | `Vintage123!` |

Sample public serial: `CV-OMEGA-1969-001`

## Environment

Backend:

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
AUTH_COOKIE_NAME=chronicle_session
UPLOAD_DIR=uploads
MAX_UPLOAD_MB=10
CLIENT_URL=http://localhost:5173,http://127.0.0.1:5173
```

Frontend:

```env
VITE_API_URL=http://localhost:5000/api
```

## Security

- Passwords are hashed with `bcryptjs`
- JWTs use `HttpOnly`, `SameSite` cookies
- Current role, tenant, status, and token version are reloaded on every request
- Account changes and logout revoke existing sessions
- State-changing cookie requests require an approved `Origin`
- SQL uses prepared statements
- Uploads are type-checked, size-limited, private, and access-controlled
- Subscription capacity is enforced server-side
- Login is rate-limited and all inputs pass validation
- Password fields are never included in API responses

## API Highlights

Public:

```text
GET  /api/health
GET  /api/public/lookup/:serial
GET  /api/public/verify/:token
GET  /api/v1/plans
POST /api/auth/login
```

Authenticated:

```text
GET  /api/auth/me
POST /api/auth/logout
GET  /api/auth/me/dashboard
GET  /api/v1/watches
GET  /api/v1/watches/:id
GET|POST /api/v1/cases
GET|PATCH /api/v1/cases/:id
POST /api/v1/evidence
GET|POST /api/v1/transfers
GET  /api/v1/notifications
GET|POST /api/v1/api-keys
GET|POST /api/v1/webhooks
POST /api/v1/imports/watches.csv
GET  /api/v1/exports/:resource.csv
```

Legacy CRUD endpoints remain at `/api/:resource` for organizations, users,
brands, movements, watches, parts, auctions, and checks.

Partner API:

```text
GET /api/partner/v1/watches
x-api-key: cv_live_...
```

Webhook deliveries include `X-Chronicle-Event` and
`X-Chronicle-Signature`. The signature is HMAC-SHA256 over the raw JSON body
using the signing secret shown once when the webhook is created.

## CSV Import

OrgAdmins can import up to 500 watches per CSV. Required columns:

```text
brand_name,model_name,serial_number
```

Optional columns:

```text
movement_name,owner_username,reference_number,production_year,case_material,watch_condition
```

References must already exist in the same organization. An invalid row rolls
back the entire import.

## Tests

Run unit tests and the production frontend build:

```powershell
npm run check
```

Run the opt-in MySQL integration suite against the demo database:

```powershell
$env:RUN_DB_TESTS="1"
$env:NODE_ENV="test"
npm test --prefix backend
```

## Deployment

GitHub stores source code and runs CI; GitHub Pages cannot run Express or MySQL.
A practical production layout is:

- Vercel or Netlify for `frontend`
- Render, Railway, or Fly.io for `backend`
- A managed MySQL provider for the database

Set `CLIENT_URL` to the deployed frontend origin, set `VITE_API_URL` to the
deployed API `/api` URL, use a long random `JWT_SECRET`, configure a persistent
private volume for `UPLOAD_DIR`, and run `npm run migrate` before starting the
production backend.

Never commit `.env`, database passwords, JWT secrets, uploaded evidence, API
keys, or webhook secrets.
