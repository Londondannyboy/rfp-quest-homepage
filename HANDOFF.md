# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-04-03
# Sign-off status: DRAFT

## CURRENT STATE (verified 2026-04-03)

Frontend: https://rfp-quest-homepage.vercel.app
Agent: https://rfp-quest-generative-agent-production.up.railway.app
GitHub: github.com/Londondannyboy/rfp-quest-homepage
Branch: main
Latest commit: d2832b2

### Gate tests
1. "Draw a red circle" → red circle renders ✅
2. "Show me recent UK government tenders" → cards render ✅
3. "Analyse tender: Service Wing Demolition (RAAC)"
   → Neon lookup, HITL card renders ✅
4. "Show me NHS contract spend by year" → BLOCKED ❌
   Tako embed_url returned correctly, state updated,
   Tako chart RENDERING LOCALLY via TAKO_CHART marker ✅
   Pipeline: Neon → CSV → Tako API → embed URL → StableIframe
   Not yet deployed to production.

### What works (verified locally 2026-04-03)
- Tako chart rendering: TAKO_CHART marker → StableIframe ✅
- No sandbox blocking, no orphaned tool_use ✅
- Real Neon data → Tako bar chart visible ✅
- Always-mounted container prevents CopilotChat remount ✅
- Agent calls ONLY visualise_tender_analytics (no widgetRenderer) ✅
- Cache-first for "by year" queries, live Tako for others ✅
- Rich tenders schema (37+ columns, 9 indexes, D31)
- query_neon_tenders: full-text → ILIKE fallback, prefers valued tenders
- category_insights: 9 categories pre-computed, 2-column CSV
- sendPrompt bridge: Analyse button → chat message
- Agent: Neon only, no auto-chaining query → analyse
- LangSmith tracing enabled at startup (production)
- Python 3.12 pinned via .python-version (copilotkit requires <3.13)
- Railway CLI linked, LangSmith SDK available for debugging

### Known issues (next session)
- Chart panel shows ALL charts not just latest
  Fix: replace globalTakoUrls on new query, not append
- Intermittent AbortError on fast repeated queries
  Root cause: ag_ui_langgraph race condition
  Workaround: wait 3s between queries
- Chart shows tender count not spend value
  Fix: improve SQL in cron_category_insights.py
- .env.local points to localhost — revert before production test
- Railway cron rfp-quest-cron-job: 0 6 * * * ✅
- Dead code removed: uk_tenders.py, bulk_load_tenders.py
- Unused imports removed: ChatOpenAI, asyncio, APIStatusError

### Background jobs running
- Find a Tender: PID 24315, /tmp/fat_2024.log
  Resuming from 2024-11-26
- Contracts Finder v2: running, /tmp/cf_v2_full.log
  Window ~2024-01-24

### Neon row counts (as of 2026-04-02)
- find-a-tender: 40,516
- contracts-finder-v2: 6,945
- ocds-cron: 92
- contracts-finder: 75 (legacy)
- ocds: 18 (legacy)
- Total: ~47,646

## WHAT IS BROKEN / INCOMPLETE

1. PRE-2024 DATA NOT LOADED
   Both loaders currently covering 2024→now only.
   After completion, run pre-2024 loads separately.

2. LANGSMITH_API_KEY — REGENERATED ✅ (production tracing working)

3. TAKO CHART UX POLISH NEEDED (working locally)
   Pipeline proven: Neon→CSV→Tako→TAKO_CHART marker→StableIframe
   UX issues for next session:
   a) Chart panel accumulates — should show latest only
   b) Chart shows tender count not spend value
   c) TAKO_CHART: text visible in chat — hide with CSS

4. SECOND + THIRD RAILWAY CRONS NOT CONFIGURED
   - rfp-quest-find-a-tender-cron: 0 7 * * *
   - rfp-quest-cf-v2-cron: 0 8 * * *

4. WITH_RETRY WRAPPER REMOVED — D21
5. NO LOADING STATES — Phase 5c Priority 3
6. NO GRACEFUL ERROR UI — Phase 5c Priority 3
7. DEMO GALLERY STALE — Phase 5a
8. NO RFP.QUEST BRANDING — Phase 5a
9. NO SSR TENDER FEED — Phase 5b

10. TAKO CHART PLACEMENT WRONG
    Current: chart appears above chat in panel (not natural)
    Target: two-panel layout — charts/content left, chat right
    Reference: takodata/tako-copilotkit
      src/components/ResearchCanvas.tsx
      src/app/Main.tsx (react-split layout)
    Category gate tests blocked until layout correct.

## NEXT ACTION

Step 1: Deploy to production
  Revert apps/app/.env.local to production URL:
    LANGGRAPH_DEPLOYMENT_URL=https://rfp-quest-generative-agent-production.up.railway.app
  git push already done — Railway + Vercel will auto-deploy.
  Wait for Railway deploy, then test production gate tests.

Step 2: Fix chart panel UX
  - Replace chart on new query (clear globalTakoUrls, show latest only)
  - Improve SQL: show spend value not just tender count
  - Regenerate all 9 category insights with better data

Step 3: Production gate tests (fresh tabs)
  1. "Draw a red circle" → renders ✅
  2. "Show me recent UK government tenders" → cards render
  3. "Analyse tender: Service Wing Demolition (RAAC)" → HITL
  4. "Show me NHS contract spend by year" → Tako chart visible

Step 4: Configure Railway cron services
  - rfp-quest-find-a-tender-cron: 0 7 * * *
  - rfp-quest-cf-v2-cron: 0 8 * * *

Step 3: Phase 6 foundation — company profile + matching
  See conversation with Claude.ai 2026-04-02 for full spec:
  - company_profiles + company_users tables
  - buyer_taxonomy table (top 200 buyers classified)
  - Onboarding tool via HITL (conversational, not a form)
  - Personalised query_neon_tenders with local buyer highlight

## LAST COMMITS (all authorised)

74aac8d — wip: state-based Tako rendering via analytics_embed_url
6b9f41a — fix: render Tako via widgetRenderer not takoVisualize (D40)
a84f702 — docs: add debugging tools + known CopilotKit second-query bug
7915dbe — fix: pin Python 3.12 — copilotkit requires <3.13
16e0c70 — docs: rewrite README — CopilotKit v2, Neon-only data, Tako analytics
8660417 — docs: update HANDOFF + CLAUDE for Phase 5c P1.7 deployed state
4b3b593 — fix: add LangSmith startup diagnostics to Railway logs
4c3a233 — docs: extension roadmap — pg_search, pg_ivm, in-db RAG
f7c0346 — feat: Phase 5c Priority 1.7 — pre-computed Tako category insights
c4db4a2 — refactor: delete dead code — uk_tenders.py, bulk_load_tenders.py, unused imports
980e744 — docs: phase close — gate tests all passing, Tako working
3844346 — fix: Tako iframe — remove sandbox, bump height, relax resize handler
92f6291 — fix: Tako response nested under outputs.knowledge_cards (D35)
a50e009 — fix: prefer tenders with values, handle empty value/deadline
ea18ac6 — fix: Analyse button postMessage + tiered response pattern
d552735 — fix: reconnect DB per chunk in both loaders (D34)
27d9353 — feat: enrich tenders schema + migrate 5604 rows (D31)
993117f — feat: Phase 5c Priority 1.5+1.6 — Neon-only + Tako analytics

## ENVIRONMENT STATE

Railway (rfp-quest-generative-agent):
- ANTHROPIC_API_KEY: SET ✅
- DATABASE_URL: SET ✅
- TAKO_API_KEY: SET ✅
- LANGSMITH_API_KEY: SET ✅ (regenerated 2026-04-03)

Vercel (rfp-quest-homepage):
- LANGGRAPH_DEPLOYMENT_URL: SET ✅
- TAKO_API_KEY: SET ✅

Neon:
- Project: rfp-quest-production (calm-dust-71989092, US East 1)
- Table: tenders (~47,646 rows, growing)
- pgvector: enabled ✅

Railway cron services:
- rfp-quest-cron-job: 0 6 * * * ✅
  Start command: uv run python src/cron_category_insights.py && uv run python src/cron_ingest_tenders.py
  Runs category insights first (~90s), then OCDS ingest.
- rfp-quest-find-a-tender-cron: NOT CONFIGURED ❌
- rfp-quest-cf-v2-cron: NOT CONFIGURED ❌

## PHASE ROADMAP

**Phase 5c Priority 1** — COMPLETE ✅
**Phase 5c Priority 1.5** — IN PROGRESS (47K rows, loaders running)
**Phase 5c Priority 1.6** — COMPLETE ✅ (Tako working)
**Phase 5c Priority 1.7** — WORKING LOCALLY: Tako chart renders via TAKO_CHART marker (D36, D41)
**Phase 5a** — NEXT: RFP.quest rebrand
**Phase 5b** — SSR tender feed
**Phase 5c Priority 2** — Instant tender card
**Phase 5c Priority 3** — Loading states + errors
**Phase 6** — Company profile + bid tracker
**Phase 7** — Intelligent matched feed + additional sources

## DO NOT

DO NOT use OCDS endpoint for bulk extraction — use REST v2 (D33).
DO NOT auto-chain query_neon_tenders → analyzeBidDecision.
DO NOT pass full DATABASE_URL to psycopg2 — strip channel_binding (D22).
DO NOT change pyproject.toml without uv lock (D23).
DO NOT use with_retry on model in create_deep_agent (D21).
DO NOT regenerate pnpm-lock.yaml with pnpm@8 (D18).
DO NOT hardcode TAKO_API_KEY or LANGSMITH_API_KEY (D28).
DO NOT add sandbox attribute to StableIframe (D35).

## SIGN-OFF STATUS

DRAFT — 2026-04-03
Phase 5c Priority 1.7 WORKING LOCALLY — Tako chart renders.
Production deploy pending. Chart UX polish needed (show latest only).
Gate test 4 confirmed locally with real Neon data.
