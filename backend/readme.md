# QR Inventory Management — Backend

Node.js + Express + TypeScript REST API for the QR Inventory Management system.  
Handles authentication, inventory items, categories, QR code generation, scanning history, and reporting.

---

## Tech Stack

| Category | Library / Tool |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express 5 |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JSON Web Tokens (`jsonwebtoken`) + `bcrypt` |
| Validation | `zod` |
| Security | `helmet`, `cors` |
| Logging | `morgan` |
| Utilities | `uuid`, `csv-stringify`, `dotenv` |
| Dev tooling | `tsx` (watch mode), TypeScript compiler |

---

## Project Structure

```
backend/
├── prisma/                  # Prisma schema and migration files
├── prisma.config.ts         # Prisma configuration
├── src/
│   ├── server.ts            # Entry point — starts the HTTP server
│   ├── app.ts               # Express app setup (middleware, routes)
│   ├── config/              # App-wide configuration (env, constants)
│   ├── controllers/         # Request handlers (thin layer over services)
│   ├── services/            # Business logic and database operations
│   ├── routes/              # Express route definitions
│   │   ├── auth.routes.ts
│   │   ├── category.routes.ts
│   │   ├── item.routes.ts
│   │   ├── qr.routes.ts
│   │   ├── report.routes.ts
│   │   ├── scan.routes.ts
│   │   └── index.ts
│   ├── middleware/          # Auth, error handling, and request middleware
│   ├── types/               # Shared TypeScript types/interfaces
│   ├── utils/               # Helper functions
│   └── scripts/
│       └── seed-admin.ts    # Seeds the default admin user
└── package.json
```

---

## Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/qr_inventory?schema=public` |
| `JWT_SECRET` | Secret key used to sign JWTs | `replace-with-strong-secret` |
| `JWT_EXPIRES_IN` | JWT expiry duration | `1d` |
| `PORT` | Port the API server listens on | `4000` |
| `ADMIN_NAME` | Display name for the seeded admin | `System Admin` |
| `ADMIN_EMAIL` | Email for the seeded admin account | `admin@inventory.local` |
| `ADMIN_PASSWORD` | Password for the seeded admin account | `ChangeMe123!` |

> **Note:** `ADMIN_*` variables are only used by `npm run admin:seed`.

---

## Setup & Run

From the `backend/` directory:

```bash
# 1. Install dependencies
npm install

# 2. Generate the Prisma client
npm run prisma:generate

# 3. Run database migrations
npm run prisma:migrate

# 4. Start the development server (watch mode)
npm run dev
```

The API will be available at: **`http://localhost:4000`**

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload via `tsx watch` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled server from `dist/server.js` |
| `npm run prisma:generate` | Regenerate the Prisma client after schema changes |
| `npm run prisma:migrate` | Apply pending migrations to the database |
| `npm run prisma:studio` | Open Prisma Studio (visual DB browser) |
| `npm run admin:seed` | Seed the default admin user defined in `.env` |

---

## Database (Prisma + PostgreSQL)

1. Create database: `createdb qr_inventory` (or via pgAdmin).
2. Set `DATABASE_URL` in `.env` (see `.env.example`).
3. Make sure PostgreSQL is running on port `5432`.
2. Apply migrations:
   ```bash
   npm run prisma:migrate
   ```
3. Regenerate the client whenever `prisma/schema.prisma` changes:
   ```bash
   npm run prisma:generate
   ```
4. Browse data visually:
   ```bash
   npm run prisma:studio
   ```

---

## Implementations — What Exists in the Repo

### Authentication (`auth.routes.ts`)
- User login and JWT token issuance
- Password hashing with `bcrypt`
- Token verification middleware protecting all private routes

### Inventory Items (`item.routes.ts`)
- Create, read, update, and delete inventory items
- Each item stores details such as name, description, quantity, and category

### Categories (`category.routes.ts`)
- Manage item categories (create, list, update, delete)
- Items are linked to categories for organised browsing

### QR Codes (`qr.routes.ts`)
- Generate QR codes for individual inventory items
- QR data encodes item identifiers for quick lookup

### Scanning (`scan.routes.ts`)
- Record scan events when a QR code is read
- Maintains a scan history log per item

### Reports (`report.routes.ts`)
- Generate inventory and scan activity reports
- Supports CSV export via `csv-stringify`

### Admin Seed Script (`src/scripts/seed-admin.ts`)
- One-time script to insert the initial admin user into the database
- Credentials are sourced from the `.env` file (`ADMIN_*` variables)
