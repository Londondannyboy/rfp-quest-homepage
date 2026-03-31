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
1. "Draw a red circle" → red circle in widgetRenderer iframe ✅
2. "Show me recent UK government tenders" → tender cards render ✅
3. "Analyse tender: BWV Support & Maintenance" (no details needed)
   → agent queries Neon first, HITL card renders ✅
4. Ignoring HITL does not crash agent ✅

### Phase 5c Priority 1 gate tests — ALL PASSING ✅
1. Neon persistence: SELECT COUNT(*) FROM tenders → 18+ rows ✅
2. Single-call analyse: query_neon_tenders fires (not fetch_uk)
   → HITL card renders within 45 seconds ✅

### What is deployed and working
- Neon tenders table with pgvector (project: rfp-quest-production,
  ID: calm-dust-71989092, US East 1)
- pgvector, full-text and ivfflat indexes enabled
- fetch_uk_tenders saves to Neon on every call (psycopg2)
- query_neon_tenders tool: full-text → pgvector fallback
- Agent system prompt: Neon first, live fetch only if empty
- DATABASE_URL set in Railway ✅
- psycopg2-binary in pyproject.toml + uv.lock regenerated ✅
- channel_binding stripped from DATABASE_URL before psycopg2 ✅

## WHAT IS BROKEN / INCOMPLETE

1. FIRST QUERY STILL SLOW IF NEON IS EMPTY
   Only 18 tenders in Neon. First query on fresh session may
   still trigger fetch_uk_tenders (live API, 10-20s).
   Fix: run bulk_load_tenders.py (see NEXT ACTION).

2. WITH_RETRY WRAPPER REMOVED
   create_deep_agent checks model.profile at startup.
   RunnableRetry wrapper does not expose .profile — crashes.
   Reverted to plain ChatAnthropic. No streaming retry on overload.
   Fix: needs different retry approach. See D21.

3. NO LOADING STATES
   User sees nothing while query_neon_tenders or
   analyzeBidDecision runs.
   Fix: Phase 5c Priority 3.

4. NO GRACEFUL ERROR UI
   Silent failure when Opus overloaded and retries exhausted.
   Fix: Phase 5c Priority 3.

5. TAKO NOT YET IMPLEMENTED
   visualise_tender_analytics tool not yet built.
   TAKO_API_KEY not yet set in Railway.
   Fix: Phase 5c Priority 1.6 (after bulk load).

6. DEMO GALLERY STALE
   Still shows OpenGenerativeUI demos.
   Fix: Phase 5a.

7. NO RFP.QUEST BRANDING
   Header still shows "Open Generative UI".
   Fix: Phase 5a.

8. NO SSR TENDER FEED
   Tenders not crawlable by search engines.
   Fix: Phase 5b.

## LAST COMMITS (all authorised)

b5885ca — fix: pass base_model to create_deep_agent
f23be00 — fix: regenerate uv.lock with psycopg2-binary
03882e5 — feat: Phase 5c Priority 1 — Neon + pgvector + query_neon_tenders

## ENVIRONMENT STATE

Railway (rfp-quest-generative-agent):
- ANTHROPIC_API_KEY: SET ✅
- DATABASE_URL: SET ✅ (sslmode=require, channel_binding stripped)
- TAKO_API_KEY: NOT SET ❌ — required for Phase 5c Priority 1.6

Vercel (rfp-quest-homepage):
- LANGGRAPH_DEPLOYMENT_URL: SET ✅

Neon:
- Project: rfp-quest-production (calm-dust-71989092, US East 1)
- Table: tenders (18 rows — bulk load will bring to 10,000+)
- pgvector: enabled ✅

Local dev (apps/agent/.env):
- ANTHROPIC_KEY: must be set
- DATABASE_URL: must be set (same as Railway, channel_binding stripped)
- TAKO_API_KEY: must be set before Priority 1.6 work

## NEXT ACTION — Phase 5c Priority 1.5: Run bulk loader

Step 1: Confirm bulk loader file exists:
  cat apps/agent/src/bulk_load_tenders.py

Step 2: Run bulk historical load:
  cd apps/agent
  uv run python src/bulk_load_tenders.py
  Expected runtime: 30-90 minutes
  Expected output: 10,000+ tenders in Neon

Step 3: Verify:
  Connect to Neon and run:
  SELECT COUNT(*) FROM tenders;
  SELECT source, COUNT(*) FROM tenders GROUP BY source;
  Expected: 10,000+ rows, source = 'ocds-bulk'

Step 4: Configure Railway cron service:
  New Railway service → same repo → root: apps/agent
  Start command: uv run python src/cron_ingest_tenders.py
  Cron schedule: 0 6 * * * (6am UTC daily)

Step 5: Update agent system prompt in apps/agent/main.py:
  Remove the fetch_uk_tenders fallback from system prompt.
  Agent should never call live API — Neon only.
  Commit and push.

Step 6: Phase 5c Priority 1.6 — Tako integration:
  Add TAKO_API_KEY to Railway environment variables.
  Add visualise_tender_analytics tool to apps/agent/main.py.
  See DECISIONS.md D27 for full architecture.
  Tool queries Neon → CSV string → Tako visualize API → embed_url.

Step 7: Gate test after bulk load + Tako:
  a. "Show me recent UK government tenders"
     → Neon only, under 3 seconds
  b. "Analyse tender: [any 2024 tender title]"
     → Neon lookup works, HITL renders
  c. "Show me NHS contract spend by year"
     → Tako chart iframe renders in widgetRenderer

## PHASE ROADMAP

**Phase 5c Priority 1** — COMPLETE ✅
Neon tenders table, pgvector, query_neon_tenders,
fetch saves to Neon, agent queries Neon first.

**Phase 5c Priority 1.5** — NEXT: Run bulk ingestion
  - Run bulk_load_tenders.py (one-time, 10,000+ rows)
  - Configure Railway cron (cron_ingest_tenders.py, daily 6am)
  - Remove fetch_uk_tenders fallback from system prompt
  - Gate: SELECT COUNT(*) FROM tenders → 10,000+ rows
  - Gate: first query renders from Neon in under 3 seconds

**Phase 5c Priority 1.6** — Tako live analytics
  - Add TAKO_API_KEY to Railway
  - Add visualise_tender_analytics tool (Neon SQL → CSV → Tako)
  - Uses POST /v1/beta/visualize with inline csv parameter
  - Returns embed_url → rendered in widgetRenderer
  - Gate: "Show me NHS contract spend by year" → Tako chart renders

**Phase 5c Priority 2** — Instant tender card while AI analyses
  Emit tender data immediately via CopilotKit state on identify.
  Frontend renders static card while Opus streams analysis.

**Phase 5c Priority 3** — Loading states + graceful errors
  useRenderTool loading cards for query_neon_tenders and
  analyzeBidDecision. Graceful error message if Opus overloaded.

**Phase 5c Priority 4** — Rate limiting
  5 free queries per session via localStorage.
  "Create account to continue" overlay after limit.

**Phase 5c Priority 5** — Neon Auth
  JWT-based, native Neon Auth, Next.js SDK.

**Phase 5a** — RFP.quest rebrand (~30 min, cosmetic)
  Header, title, Beta badge, demo-data.ts RFP prompts.

**Phase 5b** — SSR tender feed (~30 min, SEO)
  Server-side render tender titles. Required before domain switch.

**Phase 6** — Company profile + bid tracker + Zep evaluation
  Registration: company name, Companies House, CPV codes,
  certifications, framework memberships.
  Bid tracker table in Neon.
  Evaluate Zep for buyer/CPV/tender relationship graph.

**Phase 7** — Intelligent matched feed + multi-source ingestion
  CPV-filtered feed for logged-in users. Redis if needed.
  Find a Tender, Proactis, Delta eSourcing as sources.

## DO NOT

DO NOT call fetch_uk_tenders once bulk load has run.
DO NOT pass full Neon DATABASE_URL to psycopg2 — strip
  channel_binding first. See D22.
DO NOT change pyproject.toml without running uv lock. See D23.
DO NOT regenerate pnpm-lock.yaml with pnpm@8. See D18.
DO NOT run gate tests during heavy API sessions. See D15.
DO NOT use with_retry wrapper on model passed to
  create_deep_agent — crashes with AttributeError. See D21.
DO NOT hardcode TAKO_API_KEY. Use os.getenv only. See D28.
DO NOT upload tenders to Tako as static files.
  Use inline CSV method. See D27.

## SIGN-OFF STATUS

DRAFT — must be reviewed and approved by Claude.ai
