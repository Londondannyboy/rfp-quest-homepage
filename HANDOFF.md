# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-03-31
# Sign-off status: DRAFT — pending Claude.ai review

## CURRENT STATE (verified on production 2026-03-31)

Frontend: https://rfp-quest-homepage.vercel.app
Agent: https://rfp-quest-generative-agent-production.up.railway.app
GitHub: github.com/Londondannyboy/rfp-quest-homepage
Branch: main
Latest commit: b5885ca

### Phase 4c gate tests — ALL PASSING ✅
1. "Draw a red circle" → red circle renders in widgetRenderer iframe ✅
2. "Show me recent UK government tenders" → tender cards render ✅
3. "Analyse tender: BWV Support & Maintenance" (no details needed)
   → agent queries Neon first, HITL card renders ✅
4. Ignoring HITL does not crash agent ✅

### Phase 5c Priority 1 gate tests — ALL PASSING ✅
1. Neon persistence: after "Show me recent UK tenders",
   SELECT COUNT(*) FROM tenders returns 18+ rows ✅
2. Single-call analyse: "Analyse tender: BWV Support & Maintenance"
   → agent calls query_neon_tenders (not fetch_uk_tenders)
   → HITL card renders within 45 seconds ✅
3. Railway logs confirm single Opus call, not double ✅

### What is deployed and working
- Neon tenders table with pgvector (rfp-quest-production project,
  US East 1, Neon project ID: calm-dust-71989092)
- pgvector extension enabled
- Full-text search index on title
- fetch_uk_tenders saves to Neon on every call via psycopg2
- query_neon_tenders tool deployed — searches Neon by title,
  falls back to pgvector similarity search
- Agent system prompt updated: query Neon first, only fetch live
  feed if Neon returns nothing
- DATABASE_URL set in Railway environment ✅
- psycopg2-binary added to pyproject.toml and uv.lock regenerated ✅
- channel_binding=require stripped from DATABASE_URL before
  psycopg2 connection (psycopg2 incompatibility)

## WHAT IS BROKEN / INCOMPLETE

1. FIRST QUERY IS STILL SLOW
   On first session load, if Neon has no recent tenders cached,
   agent still calls fetch_uk_tenders (live OCDS feed, ~10-20s).
   Root cause: no background ingestion pipeline.
   Every tender should already be in Neon before any user asks.
   Fix: Phase 5c Priority 1.5 — bulk loader + cron ingestion job.

2. NEON ONLY HAS ~18 TENDERS
   Only tenders fetched by users in this session are in Neon.
   Historical data going back years is not loaded.
   Fix: bulk historical loader (see NEXT ACTION below).

3. WITH_RETRY WRAPPER REMOVED
   create_deep_agent inspects model.profile at startup.
   RunnableRetry wrapper does not expose .profile.
   Reverted to plain ChatAnthropic — no streaming retry on overload.
   Fix: needs different retry approach (tool-level or deepagents config).
   See DECISIONS.md D21.

4. NO LOADING STATES
   User sees nothing while query_neon_tenders or analyzeBidDecision
   runs. Silent wait, no feedback.
   Fix: Phase 5c Priority 3 — useRenderTool loading cards.

5. NO GRACEFUL ERROR UI
   If Opus is overloaded and all retries fail, user sees silence.
   Fix: Phase 5c Priority 3 — catch in route.ts.

6. DEMO GALLERY STALE
   Still shows OpenGenerativeUI demos (binary search, solar system).
   Fix: Phase 5a — update demo-data.ts.

7. NO RFP.QUEST BRANDING
   Header still shows "Open Generative UI".
   Fix: Phase 5a — update layout.tsx and page-client.tsx.

8. NO SSR TENDER FEED
   Tenders not in page HTML — not crawlable by search engines.
   Fix: Phase 5b — server-side render tender titles.

## LAST COMMITS (authorised)

b5885ca — fix: pass base_model to create_deep_agent — RunnableRetry lacks .profile
f23be00 — fix: regenerate uv.lock with psycopg2-binary dependency
03882e5 — feat: Phase 5c Priority 1 — Neon persistence + pgvector + query_neon_tenders

## ENVIRONMENT STATE

Railway (rfp-quest-generative-agent):
- ANTHROPIC_API_KEY: SET ✅
- LLM_MODEL: claude-opus-4-6 (hardcoded in main.py) ✅
- DATABASE_URL: SET ✅ (rfp-quest-production Neon, US East 1)
  Connection string uses sslmode=require only (channel_binding stripped)

Vercel (rfp-quest-homepage):
- LANGGRAPH_DEPLOYMENT_URL: SET ✅
  Value: https://rfp-quest-generative-agent-production.up.railway.app

Neon:
- Project: rfp-quest-production (calm-dust-71989092, US East 1)
- Table: tenders (18 rows as of session end)
- pgvector: enabled ✅
- Indexes: title GIN full-text, buyer, deadline, embedding ivfflat ✅

Tako:
- TAKO_API_KEY: NOT SET — required for Priority 1.6
  Add to Railway environment variables before implementing
  visualise_tender_analytics tool
- API endpoint: https://tako.com/api/v1/beta/visualize
- Method: inline CSV in request body (no file upload)
- API key: load from env only, never hardcode

Local dev:
- apps/agent/.env requires DATABASE_URL for local Neon access
- Frontend: http://localhost:3002
- Agent: http://localhost:8123

## NEXT ACTION — Phase 5c Priority 1.5: Bulk Ingestion Pipeline

The goal: every tender ever published should be in Neon BEFORE
any user asks for it. The first query should hit Neon only —
never the live feed. Feed fetching should become a background
job, not a user-triggered action.

### Step 1: Historical bulk loader

Create: apps/agent/src/bulk_load_tenders.py

This is a standalone Python script (not a tool, not part of the
agent) that:

1. Pages through the OCDS API backwards from today
   URL pattern:
   https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?limit=100&format=json&publishedFrom=YYYY-MM-DD&publishedTo=YYYY-MM-DD

2. Fetches in 7-day windows, walking backwards from today
   Target: go back at least 2 years (2024-01-01)
   Expected volume: tens of thousands of tenders, lightweight JSON

3. For each release, upserts to Neon tenders table:
   - ocid (primary key — skip if already exists)
   - title, buyer, value, deadline, status, cpv_codes
   - raw_json (full release JSON)
   - source = 'ocds-bulk'
   - fetched_at = NOW()
   - embedding: generate using langchain OpenAIEmbeddings
     on title + buyer concatenated string

4. Batch inserts: 50 tenders per DB transaction for efficiency

5. Progress logging: print count every 100 tenders

6. Resumable: skips ocids already in DB (upsert ON CONFLICT DO NOTHING)

Run locally:
cd apps/agent
uv run python src/bulk_load_tenders.py

This is a one-time job. Run it once to populate Neon historically.
It will take time but costs almost nothing — OCDS API is free,
no auth required.

### Step 2: Daily cron ingestion service

Create: apps/agent/src/cron_ingest_tenders.py

A lightweight script that:
1. Fetches tenders published in the last 25 hours (overlap buffer)
2. Upserts to Neon (same schema as bulk loader)
3. Logs how many new tenders were added
4. Exits cleanly

This script is designed to be run as a Railway cron job daily.
Do NOT add Redis, Temporal, or trigger.dev — Railway cron is sufficient.

### Step 3: Update agent system prompt

Once bulk loader has run and Neon has comprehensive data,
update the system prompt in apps/agent/main.py:

REMOVE this logic:
"Only call fetch_uk_tenders if query_neon_tenders returns nothing"

REPLACE with:
"Never call fetch_uk_tenders directly. Always use query_neon_tenders.
The Neon database is kept current by a background ingestion job.
If query_neon_tenders returns no results, inform the user that
no matching tenders were found — do not fall back to live fetch."

This ensures the first user query is always fast (Neon lookup)
and never triggers a slow live API call.

### Step 4: Railway cron configuration

In Railway dashboard, add a new cron service pointing at the same
repo, root directory apps/agent, with command:
uv run python src/cron_ingest_tenders.py

Schedule: 0 6 * * * (daily at 6am UTC)
This keeps Neon current with overnight UK government publications.

### Step 5: Gate tests for Phase 5c Priority 1.5

After bulk loader runs:
1. SELECT COUNT(*) FROM tenders; → expect 10,000+ rows
2. Fresh browser, "Show me recent UK government tenders"
   → Railway logs show query_neon_tenders only, no fetch_uk_tenders
   → Cards render in under 5 seconds (Neon lookup, no live API)
3. "Analyse tender: [any tender title from 2024]"
   → HITL card renders from Neon lookup, no live fetch needed

## DO NOT

DO NOT start Phase 5 without confirming all gate tests pass first.
DO NOT regenerate pnpm-lock.yaml — use existing file.
DO NOT change CopilotKit package versions from 1.54.0-next.6.
DO NOT change Railway agent model from claude-opus-4-6.
DO NOT run gate tests during heavy API usage sessions.
DO NOT use max_retries on ChatAnthropic — use with_retry wrapper.
DO NOT add Redis, Zep, or Supabase — use Neon only.
DO NOT chain fetch_uk_tenders + analyzeBidDecision in same prompt.
DO NOT push to main without checking git log first.
DO NOT pass RunnableRetry to create_deep_agent — use base_model.

## SIGN-OFF STATUS

DRAFT — must be reviewed and approved by Claude.ai before
Phase 5c Priority 1.5 work begins.
