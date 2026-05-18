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
