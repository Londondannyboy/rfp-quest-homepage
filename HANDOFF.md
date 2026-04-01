# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-04-01
# Sign-off status: DRAFT — loaders running overnight, gate tests not run.

## CURRENT STATE (verified 2026-04-01 21:30)

Frontend: https://rfp-quest-homepage.vercel.app
Agent: https://rfp-quest-generative-agent-production.up.railway.app
GitHub: github.com/Londondannyboy/rfp-quest-homepage
Branch: main
Latest commit: 9850fc8

### What is deployed and working
- Rich tenders schema live on production Neon (D31)
  33+ columns incl. winner, is_sme_suitable, is_vcse_suitable,
  notice_type, procedure_type, parent_id, awarded_to_sme/vcse
- Neon tenders table with pgvector
  (project: rfp-quest-production, ID: calm-dust-71989092, US East 1)
- pgvector, full-text GIN and ivfflat indexes enabled
- tender_sync_log table for tracking ingestion operations
- query_neon_tenders tool: full-text search → ILIKE fallback
- Agent system prompt: Neon only, no live API calls
- fetch_uk_tenders removed from agent tools list
- visualise_tender_analytics tool deployed (Tako integration)
- StableIframe frontend component deployed
- TAKO_API_KEY set in Railway ✅ and Vercel ✅
- LangSmith tracing enabled at agent startup
- Railway cron service rfp-quest-cron-job: 0 6 * * * daily
- Three ingestion scripts:
  - find_a_tender_ingest.py (chunked 30-day windows, cursor pagination)
  - contracts_finder_v2_ingest.py (REST v2 API, adaptive date narrowing, D33)
  - bulk_load_tenders.py (OCDS — retired for historical load, D33)

### Background jobs running (do not kill)
- Find a Tender 2024+ PID 15967
  /tmp/fat_2024.log
  Coverage: 2024-01-01 to now
- Contracts Finder v2 PID 21205
  /tmp/cf_v2_full.log (7-day windows)
  Coverage: 2024-01-01 to now

### Neon row counts (as of 2026-04-01 22:00)
- find-a-tender: 36,172
- contracts-finder-v2: 2,744
- contracts-finder: 75 (legacy OCDS, superseded by v2)
- ocds: 18 (legacy, superseded by v2)
- Total: ~39,009 (growing)

### Gate tests — NOT YET RUN
Must re-run after loaders complete and Railway redeploys.

## WHAT IS BROKEN / INCOMPLETE

1. FIND A TENDER PRE-2024 NOT LOADED
   2021-2023 data not yet loaded. Run after 2024+ completes:
   cd apps/agent
   nohup uv run python src/find_a_tender_ingest.py \
     --from-date=2021-01-01 > /tmp/fat_2021.log 2>&1 &

2. CONTRACTS FINDER PRE-2024 NOT LOADED
   2000-2023 data not yet loaded. Run after 2024+ completes:
   cd apps/agent
   nohup uv run python src/contracts_finder_v2_ingest.py \
     --from-date=2000-01-01 > /tmp/cf_v2_historical.log 2>&1 &

3. GATE TESTS NOT RUN POST-SCHEMA MIGRATION
   Column renames and new fields not yet verified on
   production agent. Railway must redeploy first.

4. SECOND RAILWAY CRON NOT CONFIGURED
   find_a_tender_ingest.py daily cron not yet in Railway.
   Service name: rfp-quest-find-a-tender-cron
   Root: apps/agent
   Command: uv run python src/find_a_tender_ingest.py
   Schedule: 0 7 * * * (7am UTC, 1hr after OCDS cron)
   Needs DATABASE_URL env var.

5. THIRD RAILWAY CRON NOT CONFIGURED
   contracts_finder_v2_ingest.py daily cron not yet in Railway.
   Service name: rfp-quest-cf-v2-cron
   Root: apps/agent
   Command: uv run python src/contracts_finder_v2_ingest.py --days=2
   Schedule: 0 8 * * * (8am UTC)
   Needs DATABASE_URL env var.

6. WITH_RETRY WRAPPER REMOVED — see D21
7. NO LOADING STATES — Phase 5c Priority 3
8. NO GRACEFUL ERROR UI — Phase 5c Priority 3
9. DEMO GALLERY STALE — Phase 5a
10. NO RFP.QUEST BRANDING — Phase 5a
11. NO SSR TENDER FEED — Phase 5b

## LAST COMMITS (all authorised)

9850fc8 — fix: reduce CF v2 window to 7 days
043c2c1 — feat: contracts_finder_v2_ingest.py — REST v2 API with SME flags
752ab1e — feat: add contracts_finder_v2_ingest.py initial
148743d — fix: remove broken OCDS pagination (D33)
7bc098c — fix: enable LangSmith tracing at agent startup
885931a — fix: add logging to Tako analytics tool
2244b1a — fix: chunk FAT ingestion into 30-day windows
048a024 — fix: stream-insert per page in both bulk loaders
a51be7a — fix: update SQL field names after schema migration
27d9353 — feat: enrich tenders schema + migrate 5604 rows
993117f — feat: Phase 5c Priority 1.5+1.6 — Neon-only + Tako analytics

## ENVIRONMENT STATE

Railway (rfp-quest-generative-agent):
- ANTHROPIC_API_KEY: SET ✅
- DATABASE_URL: SET ✅
- TAKO_API_KEY: SET ✅
- LANGSMITH_API_KEY: NEEDS SETTING ❌

Vercel (rfp-quest-homepage):
- LANGGRAPH_DEPLOYMENT_URL: SET ✅
- TAKO_API_KEY: SET ✅

Neon:
- Project: rfp-quest-production (calm-dust-71989092, US East 1)
- Table: tenders (~39,009 rows, growing)
- Rich schema: 37+ columns, 9 indexes, tender_sync_log table
- pgvector: enabled ✅

Railway cron services:
- rfp-quest-cron-job: 0 6 * * * — cron_ingest_tenders.py (OCDS)
- rfp-quest-find-a-tender-cron: NOT YET CONFIGURED ❌
- rfp-quest-cf-v2-cron: NOT YET CONFIGURED ❌

## NEXT ACTION (morning)

Step 1: Check loaders completed:
  tail -5 /tmp/fat_2024.log
  tail -5 /tmp/cf_v2_full.log
  SELECT source, COUNT(*) FROM tenders GROUP BY source;

Step 2: Start pre-2024 loads if 2024+ complete:
  nohup uv run python src/find_a_tender_ingest.py \
    --from-date=2021-01-01 > /tmp/fat_2021.log 2>&1 &
  nohup uv run python src/contracts_finder_v2_ingest.py \
    --from-date=2000-01-01 > /tmp/cf_v2_historical.log 2>&1 &

Step 3: Run gate tests once Railway redeploys

Step 4: Add LANGSMITH_API_KEY to Railway

Step 5: Configure second + third Railway cron services

Step 6: Run validation queries:
  SELECT stage, COUNT(*) FROM tenders GROUP BY stage;
  SELECT notice_type, COUNT(*) FROM tenders GROUP BY notice_type;
  SELECT COUNT(*) FROM tenders WHERE cpv_codes != '[]'::jsonb;
  SELECT COUNT(*) FROM tenders WHERE is_sme_suitable = true;
  SELECT MIN(published_date), MAX(published_date) FROM tenders;

## PHASE ROADMAP

**Phase 5c Priority 1** — COMPLETE ✅
**Phase 5c Priority 1.5** — IN PROGRESS (loaders running)
**Phase 5c Priority 1.6** — DEPLOYED, NOT GATE-TESTED
**Phase 5c Priority 2** — Instant tender card
**Phase 5c Priority 3** — Loading states + errors
**Phase 5c Priority 4** — Rate limiting
**Phase 5c Priority 5** — Neon Auth
**Phase 5a** — RFP.quest rebrand
**Phase 5b** — SSR tender feed
**Phase 6** — Company profile + bid tracker
**Phase 7** — Intelligent matched feed + multi-source

## DO NOT

DO NOT kill background loader PIDs (15967, 21205).
DO NOT use OCDS endpoint for bulk extraction — use REST v2 (D33).
DO NOT call fetch_uk_tenders — removed from agent tools.
DO NOT pass full DATABASE_URL to psycopg2 — strip channel_binding (D22).
DO NOT change pyproject.toml without uv lock (D23).
DO NOT use with_retry on model in create_deep_agent (D21).
DO NOT regenerate pnpm-lock.yaml with pnpm@8 (D18).
DO NOT hardcode TAKO_API_KEY (D28).
DO NOT render Tako iframes inside ReactMarkdown (D27).

## SIGN-OFF STATUS

DRAFT — loaders running overnight, gate tests not run.
