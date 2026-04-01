# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-04-01
# Sign-off status: DRAFT — bulk loaders running, gate tests not run, schema backfill pending.

## CURRENT STATE (verified 2026-04-01)

Frontend: https://rfp-quest-homepage.vercel.app
Agent: https://rfp-quest-generative-agent-production.up.railway.app
GitHub: github.com/Londondannyboy/rfp-quest-homepage
Branch: main
Latest commit: 964b140

### What is deployed and working
- Rich tenders schema live on production Neon
  (21 new columns, 5 renames, cpv_codes as JSONB — see D31)
- Neon tenders table with pgvector
  (project: rfp-quest-production, ID: calm-dust-71989092, US East 1)
- pgvector, full-text GIN and ivfflat indexes enabled
- 9 additional indexes: stage, published_date, value_amount,
  cpv_codes GIN, tender_end_date, buyer_name
- tender_sync_log table for tracking ingestion operations
- query_neon_tenders tool: full-text search → ILIKE fallback
- Agent system prompt: Neon only, no live API calls
- fetch_uk_tenders removed from agent tools list
- visualise_tender_analytics tool deployed (Tako integration)
- StableIframe frontend component deployed
- TAKO_API_KEY set in Railway ✅ and Vercel ✅
- DATABASE_URL set in Railway ✅
- Railway cron service rfp-quest-cron-job: 0 6 * * * daily
- Both bulk loaders rewritten with stream-insert per page,
  Infinity/NaN sanitization, savepoint error recovery

### Background jobs running (do not kill)
- Contracts Finder bulk loader PID 13833
  /tmp/ocds_bulk.log — writing ~100 rows/sec
  Coverage: 2024-01-01 to now
- Find a Tender 2024+ PID 15595
  /tmp/fat_2024.log
  Coverage: 2024-01-01 to now

### Neon row counts (as of 2026-04-01 13:00)
- contracts-finder: 75 (rising — bulk load in progress)
- find-a-tender: 13,018 (rising — 2024+ sync in progress)
- ocds: 18 (legacy rows from Phase 5c P1)
- Total: ~13,111 (growing)

### Phase 4c gate tests — NOT YET RE-VERIFIED
Last passed 2026-03-31 (pre-schema migration).
Must re-run after loaders complete.

### Phase 5c Priority 1 gate tests — NOT YET RE-VERIFIED
Last passed 2026-03-31 (pre-schema migration).
Must re-run after loaders complete.

## WHAT IS BROKEN / INCOMPLETE

1. FIND A TENDER PRE-2024 HISTORY NOT LOADED
   2021-2023 data not yet loaded. Run separately
   once 2024+ completes:
   cd apps/agent
   uv run python src/find_a_tender_ingest.py \
     --from-date=2021-01-01

2. SCHEMA BACKFILL PENDING
   After full load completes, additional fields
   extractable from raw_ocds JSONB:
   notice_type, is_sme_suitable, is_vcse_suitable,
   commercial_tool_type, engagement_url, closing_date

3. GATE TESTS NOT RUN POST-SCHEMA MIGRATION
   Column renames (deadline → tender_end_date,
   value → value_amount, buyer → buyer_name) have
   been updated in query_tenders.py but not yet
   tested against production agent.

4. SECOND RAILWAY CRON NOT CONFIGURED
   find_a_tender_ingest.py cron service not yet
   created in Railway dashboard.
   Service name: rfp-quest-find-a-tender-cron
   Root: apps/agent
   Command: uv run python src/find_a_tender_ingest.py
   Schedule: 0 7 * * * (7am UTC, 1hr after OCDS cron)
   Needs DATABASE_URL env var.

5. WITH_RETRY WRAPPER REMOVED
   create_deep_agent inspects model.profile at startup.
   RunnableRetry crashes on startup. No streaming retry
   on overload. Fix: needs different retry approach. See D21.

6. NO LOADING STATES
   User sees nothing while query_neon_tenders or
   analyzeBidDecision runs. Fix: Phase 5c Priority 3.

7. NO GRACEFUL ERROR UI
   Silent failure when Opus overloaded.
   Fix: Phase 5c Priority 3.

8. DEMO GALLERY STALE
   Still shows OpenGenerativeUI demos.
   Fix: Phase 5a.

9. NO RFP.QUEST BRANDING
   Header still shows "Open Generative UI".
   Fix: Phase 5a.

10. NO SSR TENDER FEED
    Tenders not crawlable by search engines.
    Fix: Phase 5b.

## LAST COMMITS (all authorised)

964b140 — fix: increase FAT API timeout to 60s
048a024 — fix: stream-insert per page in both bulk loaders
a51be7a — fix: update SQL field names after schema migration
130165a — docs: HANDOFF updated post-schema migration
27d9353 — feat: enrich tenders schema + migrate 5604 rows + fix OCDS parsing + add find-a-tender ingest
993117f — feat: Phase 5c Priority 1.5+1.6 — Neon-only + Tako analytics

## ENVIRONMENT STATE

Railway (rfp-quest-generative-agent):
- ANTHROPIC_API_KEY: SET ✅
- DATABASE_URL: SET ✅ (sslmode=require, channel_binding stripped)
- TAKO_API_KEY: SET ✅

Vercel (rfp-quest-homepage):
- LANGGRAPH_DEPLOYMENT_URL: SET ✅
- TAKO_API_KEY: SET ✅

Neon:
- Project: rfp-quest-production (calm-dust-71989092, US East 1)
- Table: tenders (~13,111 rows, growing — bulk loaders active)
- Rich schema: 33 columns, 9 indexes, tender_sync_log table
- pgvector: enabled ✅
- Old DB: rfp.quest (square-waterfall-95675895, EU West 2)
  5,604 rows migrated to production — can be decommissioned

Railway cron services:
- rfp-quest-cron-job: 0 6 * * * — cron_ingest_tenders.py (OCDS)
- rfp-quest-find-a-tender-cron: NOT YET CONFIGURED ❌

Local (apps/agent/.env):
- ANTHROPIC_API_KEY: set ✅
- DATABASE_URL: set ✅
- TAKO_API_KEY: set ✅

## NEXT ACTION (morning)

Step 1: Check both loaders still running or completed:
  tail -5 /tmp/ocds_bulk.log
  tail -5 /tmp/fat_2024.log
  SELECT source, COUNT(*) FROM tenders GROUP BY source;
  SELECT stage, COUNT(*) FROM tenders GROUP BY stage;

Step 2: If 2024+ load complete, start pre-2024:
  cd apps/agent
  nohup uv run python src/find_a_tender_ingest.py \
    --from-date=2021-01-01 \
    > /tmp/fat_2021.log 2>&1 &

Step 3: Run gate tests in fresh browser once
  total row count > 50,000

Step 4: Run schema backfill queries from raw_ocds

Step 5: Configure second Railway cron service

Step 6: Paste HANDOFF.md here for sign-off

## PHASE ROADMAP

**Phase 5c Priority 1** — COMPLETE ✅
Neon tenders table, pgvector, query_neon_tenders,
agent queries Neon only.

**Phase 5c Priority 1.5** — IN PROGRESS
Rich schema deployed (D31). Both bulk loaders running.
Railway OCDS cron configured (0 6 * * *).
Gate: COUNT(*) > 50,000 and first query under 3 seconds.

**Phase 5c Priority 1.6** — DEPLOYED, NOT GATE-TESTED
visualise_tender_analytics tool + StableIframe component
deployed. TAKO_API_KEY set. Gate test pending:
"Show me NHS contract spend by year" → Tako chart renders.

**Phase 5c Priority 2** — Instant tender card while AI analyses
**Phase 5c Priority 3** — Loading states + graceful errors
**Phase 5c Priority 4** — Rate limiting (5 free queries)
**Phase 5c Priority 5** — Neon Auth (JWT, Next.js SDK)
**Phase 5a** — RFP.quest rebrand (~30 min)
**Phase 5b** — SSR tender feed (~30 min)
**Phase 6** — Company profile + bid tracker + Zep evaluation
**Phase 7** — Intelligent matched feed + multi-source ingestion

## DO NOT

DO NOT kill background loader processes (PIDs 13833, 15595).
DO NOT call fetch_uk_tenders — removed from agent tools.
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
DO NOT load full 2021-2023 Find a Tender history until
  2024+ load completes. Run separately. See D31.

## SIGN-OFF STATUS

DRAFT — bulk loaders running, gate tests not run,
schema backfill pending.
