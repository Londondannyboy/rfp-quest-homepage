# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-04-02
# Sign-off status: DRAFT — gate tests passing, loaders running, pre-2024 pending.

## CURRENT STATE (verified 2026-04-02)

Frontend: https://rfp-quest-homepage.vercel.app
Agent: https://rfp-quest-generative-agent-production.up.railway.app
GitHub: github.com/Londondannyboy/rfp-quest-homepage
Branch: main
Latest commit: 3844346

### Gate tests — ALL PASSING ✅
1. "Draw a red circle" → red circle renders ✅
2. "Show me recent UK government tenders" → cards render ✅
3. "Analyse tender: Service Wing Demolition (RAAC)"
   → Neon lookup finds it, HITL card renders ✅
4. "Show me NHS contract spend by year" → Tako chart renders ✅
   Fixed: outputs.knowledge_cards path (D35), sandbox removed

### What is deployed and working
- Rich tenders schema live on production Neon (D31)
  37+ columns incl. winner, is_sme_suitable, is_vcse_suitable,
  notice_type, procedure_type, parent_id, awarded_to_sme/vcse
- Neon tenders table with pgvector
  (project: rfp-quest-production, ID: calm-dust-71989092, US East 1)
- pgvector, full-text GIN and ivfflat indexes enabled
- tender_sync_log table for tracking ingestion operations
- query_neon_tenders tool: full-text search → ILIKE fallback
  Prefers tenders with values in sort order
- Agent system prompt: Neon only, no live API, no auto-chaining
- fetch_uk_tenders removed from agent tools list
- visualise_tender_analytics tool deployed + working (D35)
- StableIframe frontend component (no sandbox, allow=fullscreen)
- sendPrompt bridge wired: Analyse button → chat message
- TAKO_API_KEY set in Railway ✅ and Vercel ✅
- LangSmith tracing enabled at agent startup
- Railway cron service rfp-quest-cron-job: 0 6 * * * daily
- Three ingestion scripts:
  - find_a_tender_ingest.py (chunked 30-day windows, cursor pagination)
  - contracts_finder_v2_ingest.py (REST v2 API, adaptive date narrowing, D33)
  - bulk_load_tenders.py (OCDS — retired, D33)

### Background jobs
- Contracts Finder v2: RUNNING
  /tmp/cf_v2_full.log — window 2024-01-20, 7,425 inserted
  Coverage: 2024-01-01 to now
- Find a Tender 2024+: DIED (httpx.ReadTimeout)
  Needs restart from 2024-11-26

### Neon row counts (as of 2026-04-02)
- find-a-tender: 40,516
- contracts-finder-v2: 5,637
- ocds-cron: 92 (Railway daily cron working ✅)
- contracts-finder: 75 (legacy OCDS)
- ocds: 18 (legacy)
- Total: ~46,338

## WHAT IS BROKEN / INCOMPLETE

1. FIND A TENDER LOADER DIED — NEEDS RESTART
   Died with httpx.ReadTimeout on chunk ~2024-11-26.
   Restart:
   cd apps/agent
   nohup uv run python src/find_a_tender_ingest.py \
     --from-date=2024-11-26 > /tmp/fat_2024.log 2>&1 &

2. FIND A TENDER PRE-2024 NOT LOADED
   2021-2023 data not yet loaded. Run after 2024+ completes:
   nohup uv run python src/find_a_tender_ingest.py \
     --from-date=2021-01-01 > /tmp/fat_2021.log 2>&1 &

3. CONTRACTS FINDER PRE-2024 NOT LOADED
   2000-2023 data not yet loaded. Run after 2024+ completes:
   nohup uv run python src/contracts_finder_v2_ingest.py \
     --from-date=2000-01-01 > /tmp/cf_v2_historical.log 2>&1 &

4. LANGSMITH_API_KEY COMPROMISED — NEEDS REGENERATING
   Regenerate at smith.langchain.com → Settings → API Keys.
   Update in Railway environment variables.

5. SECOND RAILWAY CRON NOT CONFIGURED
   find_a_tender_ingest.py daily cron not yet in Railway.
   Service name: rfp-quest-find-a-tender-cron
   Root: apps/agent
   Command: uv run python src/find_a_tender_ingest.py
   Schedule: 0 7 * * * (7am UTC, 1hr after OCDS cron)
   Needs DATABASE_URL env var.

6. THIRD RAILWAY CRON NOT CONFIGURED
   contracts_finder_v2_ingest.py daily cron not yet in Railway.
   Service name: rfp-quest-cf-v2-cron
   Root: apps/agent
   Command: uv run python src/contracts_finder_v2_ingest.py --days=2
   Schedule: 0 8 * * * (8am UTC)
   Needs DATABASE_URL env var.

7. WITH_RETRY WRAPPER REMOVED — see D21
8. NO LOADING STATES — Phase 5c Priority 3
9. NO GRACEFUL ERROR UI — Phase 5c Priority 3
10. DEMO GALLERY STALE — Phase 5a
11. NO RFP.QUEST BRANDING — Phase 5a
12. NO SSR TENDER FEED — Phase 5b

## LAST COMMITS (all authorised)

3844346 — fix: Tako iframe — remove sandbox, bump height, relax resize handler
92f6291 — fix: Tako response nested under outputs.knowledge_cards (D35)
a50e009 — fix: prefer tenders with values, handle empty value/deadline
ea18ac6 — fix: Analyse button postMessage + tiered response pattern
e5ab0cc — docs: update gate test 3 — Service Wing Demolition (RAAC)
bdc7803 — docs: D34 — reconnect to Neon per chunk
d552735 — fix: reconnect DB per chunk in both loaders (D34)
9850fc8 — fix: reduce CF v2 window to 7 days
043c2c1 — feat: contracts_finder_v2_ingest.py — REST v2 API with SME flags
27d9353 — feat: enrich tenders schema + migrate 5604 rows
993117f — feat: Phase 5c Priority 1.5+1.6 — Neon-only + Tako analytics

## ENVIRONMENT STATE

Railway (rfp-quest-generative-agent):
- ANTHROPIC_API_KEY: SET ✅
- DATABASE_URL: SET ✅
- TAKO_API_KEY: SET ✅
- LANGSMITH_API_KEY: COMPROMISED — REGENERATE ❌

Vercel (rfp-quest-homepage):
- LANGGRAPH_DEPLOYMENT_URL: SET ✅
- TAKO_API_KEY: SET ✅

Neon:
- Project: rfp-quest-production (calm-dust-71989092, US East 1)
- Table: tenders (~46,338 rows, growing)
- Rich schema: 37+ columns, 9 indexes, tender_sync_log table
- pgvector: enabled ✅

Railway cron services:
- rfp-quest-cron-job: 0 6 * * * — cron_ingest_tenders.py (OCDS) ✅
- rfp-quest-find-a-tender-cron: NOT YET CONFIGURED ❌
- rfp-quest-cf-v2-cron: NOT YET CONFIGURED ❌

## NEXT ACTION

Step 1: Restart FAT loader from where it stopped:
  cd apps/agent
  nohup uv run python src/find_a_tender_ingest.py \
    --from-date=2024-11-26 > /tmp/fat_2024.log 2>&1 &

Step 2: Regenerate LANGSMITH_API_KEY and update in Railway

Step 3: Configure second + third Railway cron services

Step 4: Once 2024+ loads complete, start pre-2024 loads

Step 5: Run validation queries:
  SELECT stage, COUNT(*) FROM tenders GROUP BY stage;
  SELECT notice_type, COUNT(*) FROM tenders GROUP BY notice_type;
  SELECT COUNT(*) FROM tenders WHERE cpv_codes != '[]'::jsonb;
  SELECT COUNT(*) FROM tenders WHERE is_sme_suitable = true;
  SELECT MIN(published_date), MAX(published_date) FROM tenders;

## PHASE ROADMAP

**Phase 5c Priority 1** — COMPLETE ✅
**Phase 5c Priority 1.5** — IN PROGRESS (loaders running, 46K rows)
**Phase 5c Priority 1.6** — COMPLETE ✅ (Tako working, gate test passing)
**Phase 5c Priority 1.7** — PLANNED: Pre-computed category insights (D36)
**Phase 5c Priority 2** — Instant tender card
**Phase 5c Priority 3** — Loading states + errors
**Phase 5c Priority 4** — Rate limiting
**Phase 5c Priority 5** — Neon Auth
**Phase 5a** — RFP.quest rebrand
**Phase 5b** — SSR tender feed
**Phase 6** — Company profile + bid tracker
**Phase 7** — Intelligent matched feed + additional sources

## DO NOT

DO NOT use OCDS endpoint for bulk extraction — use REST v2 (D33).
DO NOT call fetch_uk_tenders — removed from agent tools.
DO NOT auto-chain query_neon_tenders → analyzeBidDecision.
  User must explicitly click Analyse or ask for analysis.
DO NOT pass full DATABASE_URL to psycopg2 — strip channel_binding (D22).
DO NOT change pyproject.toml without uv lock (D23).
DO NOT use with_retry on model in create_deep_agent (D21).
DO NOT regenerate pnpm-lock.yaml with pnpm@8 (D18).
DO NOT hardcode TAKO_API_KEY or LANGSMITH_API_KEY (D28).
DO NOT render Tako iframes inside ReactMarkdown (D27).
DO NOT add sandbox attribute to StableIframe — breaks Tako (D35).

## SIGN-OFF STATUS

DRAFT — gate tests passing, loaders running,
pre-2024 loads and cron config pending.
