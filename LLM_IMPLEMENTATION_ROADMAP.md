# LLM Implementation Roadmap (Step-by-Step)

This roadmap is tailored for the current QR Inventory Management project.

## What is already implemented

- Backend AI route: `POST /ai/chat`
- Auth-protected AI endpoint
- Rule-based intent handling for:
  - low stock
  - recent items
  - movement trend
  - movers
  - profit/loss
  - item search
- Optional hosted LLM summarization via environment variables
- Phase 3 RAG backend:
  - `POST /ai/rag/documents` (ingest document chunks)
  - `GET /ai/rag/sources` (list ingested sources)
  - `/ai/chat` now pulls best matching RAG chunks as citations

## Step 1: Configure environment

Add these variables in backend `.env`:

```env
LLM_PROVIDER=rule-based
LLM_API_KEY=
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.2
LLM_MAX_TOKENS=800
```

Notes:
- Keep `LLM_PROVIDER=rule-based` initially for stable testing.
- Set `LLM_API_KEY` and provider value later to enable hosted LLM summarization.

### Ollama configuration

To run local Ollama:

```env
LLM_PROVIDER=ollama
LLM_BASE_URL=http://127.0.0.1:11434
LLM_MODEL=llama3.1:8b
LLM_TEMPERATURE=0.2
LLM_MAX_TOKENS=800
```

Then run:

```bash
ollama pull llama3.1:8b
ollama serve
```

## Step 2: Test backend endpoint

1. Login and obtain JWT from `/auth`.
2. Call `POST /ai/chat` with Bearer token.
3. Sample payload:

```json
{
  "message": "profit loss for last 30 days"
}
```

Expected output:
- `answer`
- `intent`
- `toolCalls`
- `usedProvider`
- `suggestions`

## Step 3: Frontend service integration

Create a frontend service function:

- File: `frontend/src/services/ai.service.ts`
- Method: `chat(message: string)`
- Request: `POST /ai/chat`

Use existing authenticated `http` client.

## Step 4: Add AI Assistant UI

Recommended UI location:
- `frontend/src/components/layout/app-shell.tsx` (global side panel), or
- reports page for first rollout.

UI scope for MVP:
- input box
- send button
- message list (user + assistant)
- loading state
- quick prompts (from `suggestions`)

## Step 5: Permission-safe actions

Current implementation only reads data. Keep this policy in MVP.

If adding write actions later:
- add explicit action tools (`createPurchaseOrder`, `adjustStock`, etc.)
- add confirmation modal before execution
- log every action and actor

## Step 6: Add RAG (documents only)

Use RAG for SOP and policy documents, not for live stock numbers.

Current project implementation uses a local lexical retrieval store (`backend/data/rag-index.json`) as Phase 3 MVP.

MVP RAG flow implemented:
1. ingest docs through API
2. chunk + tokenize
3. persist chunks in local JSON index
4. retrieve top chunks by similarity
5. include citations in chat response

Sample ingest request:

```json
{
  "source": "SOP",
  "title": "Reorder Policy",
  "content": "When stock reaches reorder level, manager must review supplier lead time..."
}
```

## Step 7: Add observability and quality checks

Implemented in Phase 4:

- `GET /ai/history` returns authenticated user's chat history
- `GET /ai/analytics?days=7` returns usage metrics (permission: `reports.read`)
- Chat requests are now logged with:
  - user, intent, tool calls
  - provider
  - citation count
  - latency
  - success/failure and error message

Storage:
- `backend/data/ai-observability.json` (rolling store, keeps latest records)

Create a fixed QA checklist:
- low stock query
- movers query
- profit/loss query
- random unsupported query

## Step 8: Production rollout strategy

1. Enable for ADMIN only.
2. Roll out to MANAGER.
3. Review logs and false answers weekly.
4. Then release to USER role if needed.

## Suggested next code tasks

1. Add `frontend/src/services/ai.service.ts`
2. Add `AiAssistant` component
3. Wire assistant in `app-shell`
4. Add simple conversation history table in backend for audit
