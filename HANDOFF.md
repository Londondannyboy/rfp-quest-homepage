# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-04-03 (evening)
# Sign-off status: SIGNED OFF 2026-04-03

## CURRENT STATE (verified 2026-04-03)

Frontend: https://rfp-quest-homepage.vercel.app
Agent: https://rfp-quest-generative-agent-production.up.railway.app
GitHub: github.com/Londondannyboy/rfp-quest-homepage
Branch: main
Latest commit: 3e8ab32

### Gate tests — ALL PASSING ON PRODUCTION ✅
1. "Draw a red circle" → red circle renders ✅
2. "Show me recent UK government tenders" → 20 tender cards render ✅
3. "Analyse tender: Service Wing Demolition (RAAC)"
   → Neon lookup, HITL card renders ✅
4. "Show me NHS contract spend by year" → Tako chart renders ✅
   Two-panel layout: chart left, chat right ✅
   Second chart replaces first in same session ✅

All 4 gates tested in a SINGLE browser tab session.

### What works (verified on production 2026-04-03)
- All 4 gate tests passing in single session ✅
- Two-panel layout: chart left, chat right on desktop ✅
- Chart panel shows latest chart only (replaces on new query) ✅
- TAKO_CHART: marker text hidden via MutationObserver ✅
- RFP.quest Beta branding: header, title, explainer cards ✅
- Demo gallery: 9 real tender queries ✅
- Suggestion pills: "Recent tenders", "NHS spend", "Analyse" ✅
- Explainer cards: Find, Match, Win ✅
- Category insights: 9 categories, spend in millions GBP ✅
- query_neon_tenders: full-text → word ILIKE → browse fallback, LIMIT 20 ✅
- Cache-first for "by year" queries (<24h), live Tako for others ✅
- 101,788 Neon rows (69K FAT + 31K CF v2) ✅
- LangSmith tracing enabled (production)

### Known issues (carry forward)
- Multi-query CopilotKit bug (D42)
  ag_ui_langgraph "Message ID not found in history"
  on some second queries. Not 100% repro.
  Second Tako chart replacement works despite this.
- Tako renders table instead of bar chart for some queries
  Not controllable — Tako API chooses visualization type.
- Tako cron: 2/9 categories intermittently fail
  Previous cached embeds remain valid.
- Railway cron: 2 additional crons not configured

### Neon row counts (as of 2026-04-03)
- find-a-tender: 69,678
- contracts-finder-v2: 31,830
- ocds-cron: 187
- contracts-finder: 75 (legacy)
- ocds: 18 (legacy)
- Total: ~101,788

## WHAT IS BROKEN / INCOMPLETE

1. MULTI-QUERY BUG — D42
   ag_ui_langgraph "Message ID not found in history".
   Not 100% repro. Second Tako chart replacement works.
   Fix in Phase 5c Priority 3.

2. PRE-2024 DATA NOT LOADED
   Both loaders currently covering 2024→now only.

3. SECOND + THIRD RAILWAY CRONS NOT CONFIGURED
   - rfp-quest-find-a-tender-cron: 0 7 * * *
   - rfp-quest-cf-v2-cron: 0 8 * * *

4. WITH_RETRY WRAPPER REMOVED — D21
5. NO LOADING STATES — Phase 5c Priority 3
6. NO GRACEFUL ERROR UI — Phase 5c Priority 3
7. NO SSR TENDER FEED — Phase 5b

## NEXT ACTION — PHASE 6

Phase 5a COMPLETE ✅ (rebrand done)
Phase 5c Priority 1.7 COMPLETE ✅
Next: Phase 6 — Company profile + personalised matching

Phase 6 Part 1 — Schema:
  company_profiles: name, Companies House number, region,
    sectors, min/max contract value, is_sme, certifications.
  company_users: email, company_id FK, role. Multi-user
    from day one.
  buyer_taxonomy: maps raw buyer_name → parent_org, org_type,
    region, normalised_name. Top 200 buyers classified.

Phase 6 Part 2 — Conversational onboarding (CopilotKit HITL):
  NOT a form. Agent asks 6 questions conversationally.
  First thing a new user sees.

Phase 6 Part 3 — Personalised query:
  query_neon_tenders accepts optional company_id.
  Filters by sector, value range, SME suitability.
  Highlights local buyer matches differently.

Phase 6 Part 4 — Neon Auth:
  JWT-based, native Neon Auth, Next.js SDK.

Gate tests:
  1. Fresh session → onboarding HITL fires automatically
  2. After onboarding → personalised results filtered
  3. Local buyer highlighted differently in card
  4. Second team member accesses same company profile

## LAST COMMITS (this session — all authorised)

3e8ab32 — feat: rebrand explainer cards — Find, Match, Win
e064453 — fix: replace CopilotKit suggestion pills with real tender queries
2737a5e — feat: rebrand to RFP.quest Beta — real demo queries
4018737 — fix: hide TAKO_CHART marker text via MutationObserver
2bd03f5 — feat: two-panel layout — chart left, chat right
013a90a — docs: second Tako chart replacement verified
fac17c5 — docs: multi-query bug D42 noted
6b7a7af — docs: Phase 5c P1.7 complete
88930b9 — fix: Tako charts — spend-only CSV in millions GBP
857b9fb — fix: Tako category questions — bar chart format
b63c49f — fix: chart panel UX — latest only, spend, hide marker
53aedc1 — docs: D42 — multi-query bug is product blocker
443c735 — fix: query_neon_tenders — word ILIKE + browse + LIMIT 20

## ENVIRONMENT STATE

Railway (rfp-quest-generative-agent):
- ANTHROPIC_API_KEY: SET ✅
- DATABASE_URL: SET ✅
- TAKO_API_KEY: SET ✅
- LANGSMITH_API_KEY: SET ✅

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
**Phase 5c Priority 1.7** — COMPLETE ✅ (category insights, all gates passing)
**Phase 5a** — COMPLETE ✅ (RFP.quest Beta rebrand, two-panel layout)
**Phase 5c Priority 2** — DEFERRED (instant tender card)
**Phase 5c Priority 3** — DEFERRED (loading states + multi-query fix D42)
**Phase 5b** — DEFERRED (SSR tender feed)
**Phase 6** — NEXT: Company profile + personalised matching
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

SIGNED OFF — 2026-04-03
Phase 5a COMPLETE — RFP.quest Beta rebrand deployed.
Phase 5c Priority 1.7 COMPLETE — all 4 gate tests passing.
Two-panel layout deployed. Second chart replacement verified.
Next: Phase 6 — Company profile + personalised matching.
