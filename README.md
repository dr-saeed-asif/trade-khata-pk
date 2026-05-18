# QR Inventory Management — Frontend

React + TypeScript + Vite web application for the QR Inventory Management system.  
Provides a dashboard, inventory management, QR scanning/generation, category management, and reporting.

---

## Tech Stack

| Category | Library / Tool |
|---|---|
| Language | TypeScript |
| Framework | React 19 + Vite |
| Routing | `react-router-dom` v7 |
| API client | `axios` |
| State management | `zustand` |
| Forms + validation | `react-hook-form` + `zod` + `@hookform/resolvers` |
| QR scanning | `@yudiel/react-qr-scanner` |
| QR generation | `qrcode` |
| Charts | `recharts` |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| UI utilities | `clsx`, `tailwind-merge`, `tailwindcss-animate`, `class-variance-authority` |
| Icons | `lucide-react` |

---

## Project Structure

```
frontend/
├── public/                  # Static assets
├── src/
│   ├── main.tsx             # App entry point
│   ├── App.tsx              # Root component
│   ├── router/
│   │   └── app-router.tsx   # Route definitions (react-router-dom)
│   ├── pages/               # Full-page route components
│   │   ├── dashboard-page.tsx
│   │   ├── inventory-list-page.tsx
│   │   ├── add-item-page.tsx
│   │   ├── categories-page.tsx
│   │   ├── scanner-page.tsx
│   │   ├── reports-page.tsx
│   │   ├── settings-page.tsx
│   │   └── login-page.tsx
│   ├── components/          # Reusable UI components
│   ├── services/            # Axios API call functions
│   ├── store/               # Zustand state stores
│   ├── hooks/               # Custom React hooks
│   ├── types/               # Shared TypeScript types
│   └── lib/                 # Utility helpers (e.g. clsx/tailwind-merge)
├── index.html
├── vite.config.ts
└── package.json
```

---

## Environment Variables

The app reads environment variables from `frontend/.env`:

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:4000` |

> All Vite environment variables must be prefixed with `VITE_` to be accessible in the browser.

---

## Setup & Run

From the `frontend/` directory:

```bash
# 1. Install dependencies
npm install

# 2. Start the Vite development server
npm run dev
```

The app will be available at: **`http://localhost:5173`** (Vite default)

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally for testing |
| `npm run lint` | Run ESLint across the project |

---

## Running with the Backend

1. Start the backend API on **port 4000** (see `backend/README.md`)
2. Ensure `frontend/.env` contains:
   ```env
   VITE_API_BASE_URL="http://localhost:4000"
   ```
3. Start the frontend dev server:
   ```bash
   npm run dev
   ```

---

## Implementations — What Exists in the Repo

### Authentication (`login-page.tsx`)
- Login form built with `react-hook-form` + `zod` validation
- JWT token stored and managed via a Zustand auth store
- Protected routes redirect unauthenticated users to login

### Dashboard (`dashboard-page.tsx`)
- Overview statistics (total items, categories, recent scans)
- Charts and analytics powered by `recharts`

### Inventory List (`inventory-list-page.tsx`)
- Paginated/searchable table of all inventory items
- Actions to view, edit, or delete items

### Add / Edit Item (`add-item-page.tsx`)
- Validated form (React Hook Form + Zod) to create or update items
- Assigns items to categories

### Categories (`categories-page.tsx`)
- List, create, and manage item categories

### QR Scanner (`scanner-page.tsx`)
- Live camera-based QR code scanning via `@yudiel/react-qr-scanner`
- Decoded item data is looked up and displayed instantly

### Reports (`reports-page.tsx`)
- View inventory and scan-activity reports
- Data visualised with `recharts`; export options available

### Settings (`settings-page.tsx`)
- Application and user account settings (e.g. profile, password change)

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
| Database | MySQL |
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
| `DATABASE_URL` | MySQL connection string | `mysql://root:password@localhost:3306/qr_inventory` |
| `JWT_SECRET` | Secret key used to sign JWTs | `replace-with-strong-secret` |
| `JWT_EXPIRES_IN` | JWT expiry duration | `1d` |
| `PORT` | Port the API server listens on | `4000` |
| `ADMIN_NAME` | Display name for the seeded admin | `` |
| `ADMIN_EMAIL` | Email for the seeded admin account | `` |
| `ADMIN_PASSWORD` | Password for the seeded admin account | `` |

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

## Database (Prisma + MySQL)

1. Make sure MySQL is running and `DATABASE_URL` is set in `.env`.
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

### Image

<img width="1908" height="862" alt="image" src="https://github.com/user-attachments/assets/561b643c-361c-4abe-a863-54f3b003bd78" />

