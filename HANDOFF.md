# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-04-03 (evening)
# Sign-off status: PENDING REVIEW

## CURRENT STATE (verified 2026-04-03)

Frontend: https://rfp-quest-homepage.vercel.app
Agent: https://rfp-quest-generative-agent-production.up.railway.app
GitHub: github.com/Londondannyboy/rfp-quest-homepage
Branch: main
Latest commit: 88930b9

### Gate tests — ALL PASSING ON PRODUCTION ✅
1. "Draw a red circle" → red circle renders ✅
2. "Show me recent UK government tenders" → 20 tender cards render ✅
3. "Analyse tender: Service Wing Demolition (RAAC)"
   → Neon lookup, HITL card renders ✅
4. "Show me NHS contract spend by year" → Tako chart renders ✅
   Pipeline: Neon → CSV (spend in millions GBP) → Tako API → embed URL
   → TAKO_CHART marker → StableIframe
   Tako renders as table (not bar chart) — Tako's choice, not controllable.
   Spend data correct. Chart type toggle available in Tako embed UI.

All 4 gates tested in a SINGLE browser tab session (not fresh tabs).

### What works (verified on production 2026-04-03)
- All 4 gate tests passing in single session ✅
- Tako chart rendering: TAKO_CHART marker → StableIframe ✅
- Chart panel shows latest chart only (not accumulating) ✅
- TAKO_CHART: marker text hidden in chat via CSS ✅
- Category insights: 9 categories, spend in millions GBP ✅
- query_neon_tenders: full-text → word ILIKE → browse fallback, LIMIT 20 ✅
- Cache-first for "by year" queries (<24h), live Tako for others ✅
- 101,788 Neon rows (69K FAT + 31K CF v2) ✅
- Rich tenders schema (37+ columns, 9 indexes, D31)
- sendPrompt bridge: Analyse button → chat message
- Agent: Neon only, no auto-chaining query → analyse
- LangSmith tracing enabled (production)
- Python 3.12 pinned via .python-version

### Known issues (next session)
- Tako renders table instead of bar chart for some queries
  Not controllable — Tako API chooses visualization type.
  Users can toggle chart type via Tako embed UI icons.
- Multi-query CopilotKit bug (D42) — PRODUCT BLOCKER
  ag_ui_langgraph raises "Message ID not found in history"
  on some second queries. Not 100% repro but real.
  Must fix in Phase 5c Priority 3, not mask with fresh tabs.
- Intermittent AbortError on fast repeated queries
  Root cause: ag_ui_langgraph race condition
- Tako cron: 2/9 categories intermittently fail
  (Tako returns empty knowledge_cards). Previous cached
  embeds remain valid. Retry on next cron run.
- .env.local already pointing to production ✅
- Railway cron rfp-quest-cron-job: 0 6 * * * ✅

### Neon row counts (as of 2026-04-03)
- find-a-tender: 69,678
- contracts-finder-v2: 31,830
- ocds-cron: 187
- contracts-finder: 75 (legacy)
- ocds: 18 (legacy)
- Total: ~101,788

## WHAT IS BROKEN / INCOMPLETE

1. MULTI-QUERY BUG — D42 (PRODUCT BLOCKER)
   ag_ui_langgraph "Message ID not found in history".
   Phase 5c Priority 3.

2. PRE-2024 DATA NOT LOADED
   Both loaders currently covering 2024→now only.

3. SECOND + THIRD RAILWAY CRONS NOT CONFIGURED
   - rfp-quest-find-a-tender-cron: 0 7 * * *
   - rfp-quest-cf-v2-cron: 0 8 * * *

4. TAKO CHART PLACEMENT
   Current: chart appears above chat in panel
   Target: two-panel layout — charts/content left, chat right
   Reference: takodata/tako-copilotkit ResearchCanvas.tsx

5. WITH_RETRY WRAPPER REMOVED — D21
6. NO LOADING STATES — Phase 5c Priority 3
7. NO GRACEFUL ERROR UI — Phase 5c Priority 3
8. DEMO GALLERY STALE — Phase 5a
9. NO RFP.QUEST BRANDING — Phase 5a
10. NO SSR TENDER FEED — Phase 5b

## NEXT ACTION

Step 1: Fix multi-query bug (Phase 5c Priority 3)
  Options per D42:
  a) Upgrade ag_ui_langgraph
  b) Catch ValueError in prepare_regenerate_stream
  c) Generate new thread_id per query on failure

Step 2: Two-panel layout
  Charts/content left, chat right (react-split)
  Reference: takodata/tako-copilotkit

Step 3: Configure remaining Railway crons
  - rfp-quest-find-a-tender-cron: 0 7 * * *
  - rfp-quest-cf-v2-cron: 0 8 * * *

Step 4: Phase 5a — RFP.quest rebrand

Step 5: Phase 6 — Company profile + matching
  See CLAUDE.md and conversation 2026-04-02 for full spec.

## LAST COMMITS (this session)

88930b9 — fix: Tako charts — send spend-only CSV in millions GBP
857b9fb — fix: Tako category questions — request bar chart format explicitly
473fe12 — docs: fix layout to two-panel (other session)
b63c49f — fix: chart panel UX — latest only, spend, hide marker CSS
53aedc1 — docs: D42 — multi-query bug is product blocker
443c735 — fix: query_neon_tenders — word ILIKE + browse mode, LIMIT 20

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
- Table: tenders (~101,788 rows, growing)
- pgvector: enabled ✅

Railway cron services:
- rfp-quest-cron-job: 0 6 * * * ✅
- rfp-quest-find-a-tender-cron: NOT CONFIGURED ❌
- rfp-quest-cf-v2-cron: NOT CONFIGURED ❌

## PHASE ROADMAP

**Phase 5c Priority 1** — COMPLETE ✅
**Phase 5c Priority 1.5** — COMPLETE ✅ (101K rows)
**Phase 5c Priority 1.6** — COMPLETE ✅ (Tako working)
**Phase 5c Priority 1.7** — COMPLETE ✅ (category insights, spend data, all gates passing)
**Phase 5c Priority 2** — Instant tender card
**Phase 5c Priority 3** — NEXT: Loading states + errors + multi-query fix (D42)
**Phase 5a** — RFP.quest rebrand
**Phase 5b** — SSR tender feed
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
DO NOT use fresh-tabs-per-query as a workaround for multi-query bug (D42).

## SIGN-OFF STATUS

PENDING REVIEW — 2026-04-03
Phase 5c Priority 1.7 COMPLETE — all 4 gate tests passing on production.
Query fix deployed: word ILIKE + browse fallback, LIMIT 20.
Chart UX: latest only, spend in millions GBP, marker hidden.
Multi-query bug documented as product blocker (D42).
