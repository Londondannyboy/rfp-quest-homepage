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

## WHAT IS BROKEN / INCOMPLETE

1. FIRST QUERY SLOW IF NEON EMPTY
   Only 18 tenders in Neon. First query on fresh session may
   trigger fetch_uk_tenders (live API, 10-20s).
   Fix: run bulk_load_tenders.py — see NEXT ACTION.

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
- Table: tenders (18 rows — bulk load will bring to 10,000+)
- pgvector: enabled ✅

Local (apps/agent/.env):
- ANTHROPIC_API_KEY: must be set
- DATABASE_URL: must be set (channel_binding stripped)
- TAKO_API_KEY: must be set before Priority 1.6 work

## NEXT ACTION — Phase 5c Priority 1.5

Step 1: Confirm bulk loader exists:
  ls apps/agent/src/bulk_load_tenders.py
  ls apps/agent/src/cron_ingest_tenders.py

Step 2: Run bulk historical load locally:
  cd apps/agent
  uv run python src/bulk_load_tenders.py
  Expected: 30-90 minutes, 10,000+ tenders in Neon

Step 3: Verify:
  SELECT COUNT(*) FROM tenders;
  SELECT source, COUNT(*) FROM tenders GROUP BY source;

Step 4: Configure Railway cron service:
  New Railway service → same repo → root: apps/agent
  Start command: uv run python src/cron_ingest_tenders.py
  Schedule: 0 6 * * * (6am UTC daily)

Step 5: Update system prompt — remove fetch_uk_tenders fallback.
  Agent should never call live API. Neon only. Commit and push.

Step 6: Phase 5c Priority 1.6 — Tako integration:
  Add TAKO_API_KEY to Railway environment.
  Add visualise_tender_analytics tool to apps/agent/main.py.
  Implement StableIframe pattern from Tako research canvas repo
  (src/components/MarkdownRenderer.tsx) for chart iframe stability.
  See DECISIONS.md D27 for full architecture.

Step 7: Gate tests after bulk load + Tako:
  a. "Show me recent UK tenders" → Neon only, under 3 seconds
  b. "Analyse tender: [any 2024 tender]" → Neon lookup, HITL renders
  c. "Show me NHS contract spend by year" → Tako chart renders

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

DRAFT — pending Claude.ai review
