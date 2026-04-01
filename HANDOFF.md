# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-03-31
# Sign-off status: DRAFT — schema migration complete and verified. Query field names unverified. Gate tests not run.

## CURRENT STATE (verified on production 2026-03-31)

Frontend: https://rfp-quest-homepage.vercel.app
Agent: https://rfp-quest-generative-agent-production.up.railway.app
GitHub: github.com/Londondannyboy/rfp-quest-homepage
Branch: main
Latest commit: 27d9353

### Phase 4c gate tests — ALL PASSING ✅
1. "Draw a red circle" → red circle in widgetRenderer iframe ✅
2. "Show me recent UK government tenders" → tender cards render ✅
3. "Analyse tender: BWV Support & Maintenance" (no details needed)
   → agent queries Neon first, HITL card renders ✅
4. Ignoring HITL does not crash agent ✅

### Phase 5c Priority 1 gate tests — ALL PASSING ✅
1. SELECT COUNT(*) FROM tenders → 18+ rows ✅
2. "Analyse tender: BWV Support & Maintenance" without full details
   → query_neon_tenders fires (not fetch_uk_tenders)
   → HITL card renders within 45 seconds ✅

### What is deployed and working
- Neon tenders table with pgvector
  (project: rfp-quest-production, ID: calm-dust-71989092, US East 1)
- pgvector, full-text GIN and ivfflat indexes enabled
- fetch_uk_tenders saves to Neon on every call (psycopg2)
- query_neon_tenders tool: full-text search → pgvector fallback
- Agent system prompt: Neon first, live fetch only if empty
- DATABASE_URL set in Railway ✅
- psycopg2-binary in pyproject.toml + uv.lock regenerated ✅
- channel_binding stripped from DATABASE_URL before psycopg2 ✅
- with_retry wrapper REMOVED (incompatible with create_deep_agent)
  plain ChatAnthropic in use — see D21
- Rich tenders schema live on production Neon
  (21 new columns, 5 renames, cpv_codes as JSONB)
- 5,604 Find a Tender rows migrated from old DB
  (square-waterfall-95675895 → calm-dust-71989092)
- Production DB: 5,622 tenders (5,604 find-a-tender + 18 ocds)
- tender_sync_log table created
- bulk_load_tenders.py rewritten with proper OCDS parsing
- find_a_tender_ingest.py created (Python port of old TS sync)

## WHAT IS BROKEN / INCOMPLETE

1. BULK LOAD NOT YET RUN
   bulk_load_tenders.py has been fixed with proper OCDS
   parsing but has not been run against production.
   Contracts Finder historical data (target 10,000+ rows)
   not yet loaded. Run manually when ready.

1b. FIND A TENDER CATCH-UP NOT RUN
   find_a_tender_ingest.py --full not yet run.
   Old DB data only goes to Mar 17 2026. Gap since then
   not yet filled.

1c. QUERY_NEON_TENDERS FIELD NAMES NOT VERIFIED
   Schema column renames (deadline → tender_end_date,
   value → value_amount, buyer → buyer_name) may have
   broken query_neon_tenders SQL in main.py and
   query_tenders.py. Not yet tested against production.

1d. GATE TESTS NOT RUN
   No gate tests have been run since schema migration.
   Phase 4c and Phase 5c gate tests must be re-verified
   before this phase is marked complete.

1e. SECOND RAILWAY CRON NOT CONFIGURED
   find_a_tender_ingest.py cron service not yet created
   in Railway dashboard.
   Service name: rfp-quest-find-a-tender-cron
   Root: apps/agent
   Command: uv run python src/find_a_tender_ingest.py
   Schedule: 0 7 * * * (7am UTC, 1 hour after OCDS cron)
   Needs DATABASE_URL env var.

2. WITH_RETRY WRAPPER REMOVED
   create_deep_agent inspects model.profile at startup.
   RunnableRetry crashes on startup. No streaming retry on overload.
   Fix: needs different retry approach. See D21.

3. NO LOADING STATES
   User sees nothing while query_neon_tenders or analyzeBidDecision runs.
   Fix: Phase 5c Priority 3.

4. NO GRACEFUL ERROR UI
   Silent failure when Opus overloaded.
   Fix: Phase 5c Priority 3.

5. TAKO NOT YET IMPLEMENTED
   visualise_tender_analytics tool not built.
   TAKO_API_KEY not set in Railway.
   StableIframe pattern from Tako research canvas not implemented.
   Fix: Phase 5c Priority 1.6.

6. DEMO GALLERY STALE
   Still shows OpenGenerativeUI demos (binary search, solar system).
   Fix: Phase 5a.

7. NO RFP.QUEST BRANDING
   Header still shows "Open Generative UI".
   Fix: Phase 5a.

8. NO SSR TENDER FEED
   Tenders not crawlable by search engines.
   Fix: Phase 5b.

## LAST COMMITS (all authorised)

27d9353 — feat: enrich tenders schema + migrate 5604 rows + fix OCDS parsing + add find-a-tender ingest
993117f — feat: Phase 5c Priority 1.5+1.6 — Neon-only + Tako analytics
b5885ca — fix: pass base_model to create_deep_agent — RunnableRetry lacks .profile
f23be00 — fix: regenerate uv.lock with psycopg2-binary dependency
03882e5 — feat: Phase 5c Priority 1 — Neon persistence + pgvector + query_neon_tenders

## ENVIRONMENT STATE

Railway (rfp-quest-generative-agent):
- ANTHROPIC_API_KEY: SET ✅
- DATABASE_URL: SET ✅ (sslmode=require, channel_binding stripped)
- TAKO_API_KEY: NOT SET ❌ — required for Phase 5c Priority 1.6

Vercel (rfp-quest-homepage):
- LANGGRAPH_DEPLOYMENT_URL: SET ✅

Neon:
- Project: rfp-quest-production (calm-dust-71989092, US East 1)
- Table: tenders (5,622 rows — 5,604 find-a-tender + 18 ocds)
- Rich schema: 33 columns, 9 indexes, tender_sync_log table
- pgvector: enabled ✅

Local (apps/agent/.env):
- ANTHROPIC_API_KEY: must be set
- DATABASE_URL: must be set (channel_binding stripped)
- TAKO_API_KEY: must be set before Priority 1.6 work

## NEXT ACTION — Post-schema-migration verification

Step 1: Fix query_neon_tenders SQL field names
  Search apps/agent/main.py and apps/agent/src/query_tenders.py
  for any references to old column names:
  - deadline → tender_end_date
  - value → value_amount
  - buyer → buyer_name
  - raw_json → raw_ocds
  Update all SQL queries. Commit.

Step 2: Run find_a_tender_ingest.py catch-up:
  cd apps/agent
  uv run python src/find_a_tender_ingest.py --days=30

Step 3: Run bulk_load_tenders.py:
  cd apps/agent
  uv run python src/bulk_load_tenders.py

Step 4: Verify counts:
  SELECT source, COUNT(*) FROM tenders GROUP BY source;
  SELECT stage, COUNT(*) FROM tenders GROUP BY stage;
  SELECT COUNT(*) FROM tenders WHERE cpv_codes != '[]';

Step 5: Run all Phase 4c and 5c gate tests.

## PHASE ROADMAP

**Phase 5c Priority 1** — COMPLETE ✅
Neon tenders table, pgvector, query_neon_tenders,
fetch saves to Neon, agent queries Neon first.

**Phase 5c Priority 1.5** — NEXT: Bulk ingestion pipeline
Run bulk_load_tenders.py (10,000+ rows, one-time).
Configure Railway cron (cron_ingest_tenders.py, daily 6am).
Remove fetch_uk_tenders fallback from system prompt.
Gate: COUNT(*) > 10,000 and first query under 3 seconds.

**Phase 5c Priority 1.6** — Tako live analytics
Add TAKO_API_KEY to Railway.
Add visualise_tender_analytics tool: Neon SQL → CSV → Tako API.
Implement StableIframe pattern for chart iframe stability.
Uses POST /v1/beta/visualize with inline csv parameter.
Returns embed_url → rendered in widgetRenderer.
Gate: "Show me NHS contract spend by year" → Tako chart renders.

Key implementation detail from Tako research canvas repo:
  iframes must be rendered as siblings OUTSIDE ReactMarkdown
  using React.memo with stable ID registry to prevent flickering.
  See takodata/tako-copilotkit: src/components/MarkdownRenderer.tsx

**Phase 5c Priority 2** — Instant tender card while AI analyses
**Phase 5c Priority 3** — Loading states + graceful errors
**Phase 5c Priority 4** — Rate limiting (5 free queries)
**Phase 5c Priority 5** — Neon Auth (JWT, Next.js SDK)
**Phase 5a** — RFP.quest rebrand (~30 min)
**Phase 5b** — SSR tender feed (~30 min)
**Phase 6** — Company profile + bid tracker + Zep evaluation
**Phase 7** — Intelligent matched feed + multi-source ingestion

## DO NOT

DO NOT call fetch_uk_tenders once bulk load has run.
DO NOT pass full Neon DATABASE_URL to psycopg2 — strip
  channel_binding first. See D22.
DO NOT change pyproject.toml without running uv lock. See D23.
DO NOT use with_retry wrapper on model in create_deep_agent. See D21.
DO NOT regenerate pnpm-lock.yaml with pnpm@8. See D18.
DO NOT run gate tests during heavy API sessions. See D15.
DO NOT hardcode TAKO_API_KEY. Use os.getenv only. See D28.
DO NOT upload tenders to Tako as static files.
  Use inline CSV method. See D27.
DO NOT render Tako chart iframes inside ReactMarkdown.
  Use StableIframe pattern as siblings. See D27.

## SIGN-OFF STATUS

DRAFT — schema migration complete and verified.
Query field names unverified. Gate tests not run.
