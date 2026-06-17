# Trade Khata PK — QR Inventory Management

Full-stack inventory management system with QR scanning, sales/purchases, stock operations, alerts, role-based access control, and an **AI Inventory Assistant** powered by LLM tool calling and conversation memory.

---

## Highlights

| Area | Features |
|------|----------|
| **Inventory** | Items, categories, batches, warehouses, low-stock & expiry alerts |
| **Commerce** | Sales, purchases, parties (customers/suppliers), invoices |
| **QR** | Generate/print QR & barcodes, camera scanner, scan history |
| **Reports** | Low stock, movers, profit/loss, CSV/Excel export |
| **Security** | JWT auth, RBAC permissions, audit trail |
| **AI Copilot** | Natural-language inventory Q&A, tool calling, chat history, Qwen Cloud / OpenAI / Ollama |

---

## AI Inventory Assistant (New)

The **AI Assistant** is a side-panel copilot available to users with the `ai.chat` permission (Admin & Manager by default).

### What it can do

- Answer questions about stock, low-stock items, expiring items, sales/purchase summaries
- Call **permission-gated inventory tools** (read-only) to fetch live data from the database
- Remember **conversation context** within a chat session (follow-ups like *"summarize these items"*)
- Persist **chat history** — reopen past conversations with full message restore
- Show structured **result blocks** (tables, metrics) and **RAG citations** when applicable
- Fall back to **rule-based answers** when no LLM API key is configured

### AI architecture (Phase 1)

```
User → Frontend AI Panel → POST /ai/chat
  → Auth + RBAC (ai.chat)
  → Short-term memory (AiConversation, AiMessage, AiSessionMemory)
  → LLM tool-calling loop (Qwen Cloud / OpenAI-compatible / Ollama)
  → Inventory read tools (getLowStockItems, getExpiringItems, …)
  → AiTrace audit log (tokens, latency, tools used)
```

### Supported LLM providers

| Provider | `LLM_PROVIDER` | Notes |
|----------|----------------|-------|
| **Qwen Cloud** (recommended) | `qwen` | DashScope OpenAI-compatible API |
| OpenAI | `openai` | `https://api.openai.com/v1` |
| Ollama (local) | `ollama` | No API key required |
| Rule-based only | `rule-based` | Default; no external LLM |

### AI API endpoints

| Method | Path | Permission |
|--------|------|------------|
| `POST` | `/ai/chat` | `ai.chat` |
| `GET` | `/ai/conversations` | `ai.chat` |
| `POST` | `/ai/conversations` | `ai.chat` |
| `GET` | `/ai/conversations/:id/messages` | `ai.chat` |
| `GET` | `/ai/history` | `ai.chat` |
| `GET` | `/ai/analytics` | `reports.read` |
| `GET` | `/ai/rag/sources` | `settings.read` |
| `POST` | `/ai/rag/documents` | `settings.read` |

### AI inventory tools (read-only)

`getInventorySummary`, `getLowStockItems`, `getExpiringItems`, `searchItemBySkuOrName`, `getItemDetails`, `getStockMovementHistory`, `getFastMovingItems`, `getSlowMovingItems`, `getReorderSuggestions`, `getSalesSummary`, `getPurchaseSummary`

---

# Frontend

React + TypeScript + Vite web application.

## Tech Stack

| Category | Library / Tool |
|----------|----------------|
| Language | TypeScript |
| Framework | React 19 + Vite |
| Routing | React Router v7 |
| API client | Axios |
| State | Zustand |
| Forms | react-hook-form + zod |
| QR | `@yudiel/react-qr-scanner`, `qrcode` |
| Charts | recharts |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |

## Key pages

| Page | Description |
|------|-------------|
| Dashboard | Overview stats and charts |
| Inventory | Item list, add/edit, import |
| Sales / Purchases | Commerce transactions |
| Parties | Customers & suppliers |
| Stock Operations | IN/OUT/transfer/adjustment |
| QR Scanner | Camera scan + item lookup |
| Reports | Analytics and exports |
| Alerts | Low stock, expiry, overstock |
| Users / Roles | User management & RBAC |
| **AI Assistant** | Side panel copilot (not a separate route) |

## AI Assistant UI

- Open via header button **AI Assistant**
- Chat with quick prompts and structured tool results
- **History** panel — browse and restore past conversations
- **New chat** — start a fresh conversation thread
- Conversation memory persists across page reloads (server-side)

## Frontend environment

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:4000` |

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App runs at **`http://localhost:5173`**

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

---

# Backend

Node.js + Express + TypeScript REST API with Prisma ORM.

## Tech Stack

| Category | Library / Tool |
|----------|----------------|
| Runtime | Node.js |
| Framework | Express 5 |
| ORM | Prisma 6 |
| Database | **PostgreSQL** |
| Auth | JWT + bcrypt |
| Validation | Zod |
| Security | helmet, cors |

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Includes AI models (Phase 1)
│   └── migrations/
├── src/
│   ├── server.ts
│   ├── app.ts
│   ├── config/                # env, permissions
│   ├── controllers/           # incl. ai.controller.ts
│   ├── routes/                # incl. ai.routes.ts
│   ├── services/
│   │   ├── ai/                # Copilot orchestration
│   │   │   ├── llm/           # LLM service (tool calling, retries)
│   │   │   ├── memory/        # Conversations & session memory
│   │   │   ├── tools/         # Tool registry & executor
│   │   │   └── trace/         # Audit logging
│   │   ├── ai-observability/
│   │   └── rag/               # Lexical RAG (document knowledge)
│   └── scripts/               # Seed scripts
├── .env.example
└── package.json
```

## Environment variables

Copy and configure:

```bash
cp .env.example .env
```

### Core

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `1d`) |
| `PORT` | API port (default `4000`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin seed credentials |

### AI / LLM (backend only — never expose in frontend)

| Variable | Description | Example |
|----------|-------------|---------|
| `LLM_PROVIDER` | `qwen`, `openai`, `ollama`, or `rule-based` | `qwen` |
| `LLM_API_KEY` | API key (Qwen Cloud / OpenAI) | `sk-ws-...` |
| `LLM_BASE_URL` | OpenAI-compatible base URL | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| `LLM_MODEL` | Model name | `qwen-plus` |
| `LLM_TEMPERATURE` | 0–1 | `0.2` |
| `LLM_MAX_TOKENS` | Max response tokens | `800` |
| `LLM_TIMEOUT_MS` | Request timeout | `30000` |
| `LLM_MAX_RETRIES` | Retry count on 429/5xx | `2` |
| `AI_MAX_CONTEXT_MESSAGES` | Messages sent to LLM per turn | `20` |
| `AI_CONVERSATION_SUMMARY_THRESHOLD` | When to summarize long chats | `30` |

### Qwen Cloud example

```env
LLM_PROVIDER=qwen
LLM_API_KEY=sk-ws-your-key-from-qwencloud.com
LLM_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-plus
```

## Backend setup

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate    # or: npx prisma migrate deploy
npm run db:seed           # optional demo data
npm run dev
```

API runs at **`http://localhost:4000`**

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server (tsx watch) |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run compiled server |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Apply migrations (dev) |
| `npm run prisma:studio` | Visual DB browser |
| `npm run db:check` | Test PostgreSQL connection |
| `npm run db:seed` | **Full seed** (admin, catalog, commerce, AI demo) |
| `npm run admin:seed` | Admin user only |
| `npm run inventory:seed` | Grocery catalog + demo quantities |
| `npm run stock:seed` | Stock movement demo |
| `npm run commerce:seed` | Parties, purchases, sales |
| `npm run ai:seed` | AI demo conversation |

## Database (Prisma + PostgreSQL)

### Core models

Users, Items, Categories, StockMovements, Sales, Purchases, Parties, Alerts, Warehouses, AuditTrail, …

### AI models (Phase 1)

| Model | Purpose |
|-------|---------|
| `AiConversation` | Chat sessions per user |
| `AiMessage` | User/assistant messages |
| `AiSessionMemory` | Session context & summaries |
| `AiTrace` | Request audit (tokens, latency, tools) |
| `AiToolCall` | Individual tool execution log |

Apply the AI migration:

```bash
npx prisma migrate deploy
# migration: 20260616120000_ai_copilot_phase1
```

## Seed data

After migration, populate demo data:

```bash
npm run db:seed
```

Creates:
- Admin + Manager users
- 40+ grocery catalog items (with low-stock & expiring demos)
- Stock movements, parties, purchases, sales
- Sample AI conversation for copilot testing

**Default logins** (from `.env`):

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@inventory.local` | `ChangeMe123!` |
| Manager | `manager@inventory.local` | `ChangeMe123!` |

---

## Running full stack

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

1. Open `http://localhost:5173`
2. Login as admin or manager
3. Click **AI Assistant** in the header
4. Ask: *"Show low stock items"* or *"Get inventory summary"*

---

## Security notes

- Never commit `backend/.env` (contains API keys and DB credentials)
- LLM API keys are **backend-only** — not sent to the browser
- AI tools enforce RBAC per user role and permissions
- Sensitive write actions via AI require future approval workflow (Phase 2+)

---

## Roadmap (planned)

- Long-term memory across sessions (embeddings, user preferences)
- Vector RAG with pgvector for company documents
- Human approval for AI write actions
- QR scan AI assistant & anomaly detection
- Admin AI analytics dashboard

---

## Screenshot



https://github.com/user-attachments/assets/f7156a5d-37c8-461b-a199-a78842f4ce19


<img width="1905" height="853" alt="image" src="https://github.com/user-attachments/assets/770830fe-4ed1-4bda-b945-fb362232da8a" />
<img width="1901" height="857" alt="image" src="https://github.com/user-attachments/assets/7807d01a-4ffc-4187-a167-813b1837421a" />
<img width="1907" height="844" alt="image" src="https://github.com/user-attachments/assets/ad0b5ed1-3173-4630-a98a-a362c5a1b894" />


