# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-03-31
# Sign-off status: DRAFT — pending Claude.ai review

## CURRENT STATE (verified on production 2026-03-31)

Frontend: https://rfp-quest-homepage.vercel.app
Agent: https://rfp-quest-generative-agent-production.up.railway.app
GitHub: github.com/Londondannyboy/rfp-quest-homepage
Branch: main

Gate tests confirmed passing on production:
- Gate 1 PASSED: "Draw a red circle" → renders in widgetRenderer iframe ✅
- Gate 2 PASSED: "Show me recent UK government tenders" → 20 cards ✅
- Gate 3 PASSED: HITL bid decision card renders correctly ✅
- Gate 3 NOTE: Must provide full tender details in prompt to avoid
  double-call timeout. Example prompt:
  "Analyse tender: BWV Support & Maintenance by Cambridgeshire
  Constabulary, value £128K, deadline 31 Mar 2026"
- Gate 3 NOTE: Agent recovers gracefully when HITL is ignored ✅

Deployed fixes confirmed working:
- export const maxDuration = 60 in apps/app/src/app/api/copilotkit/route.ts
- with_retry wrapper (stop_after_attempt=3) on ChatAnthropic
  in apps/agent/main.py

## WHAT IS BROKEN

1. DOUBLE-CALL TIMEOUT
   "Analyse tender: X" without full details causes two sequential
   Opus calls (fetch_uk_tenders + analyzeBidDecision) that together
   exceed 60 seconds and silently fail.
   Workaround: provide full tender details in the prompt.
   Proper fix: Neon persistence (Phase 5c Priority 1).

2. NO TENDER PERSISTENCE
   Tenders not in current live top 20 OCDS feed cannot be analysed.
   Agent re-fetches entire live feed on every analyse request.
   Fix: Neon DB persistence (Phase 5c).

3. SILENT FAILURES
   When Opus is overloaded and retries exhausted, user sees nothing.
   No error message, no feedback, no graceful degradation.
   Fix: loading states + graceful error UI (Phase 5c).

4. DEMO GALLERY
   Still shows original OpenGenerativeUI prompts (binary search,
   solar system etc). Not updated to RFP-focused prompts.
   Fix: update demo-data.ts in Phase 5a.

5. PHASE 5A/5B NOT REBUILT
   RFP.quest branding and SSR tender feed were completed then rolled
   back during emergency reset on 2026-03-31. Need clean rebuild on
   top of current stable baseline.

## WHAT WAS LEARNED (2026-03-31)

1. OVERLOAD DETECTION
   anthropic.APIStatusError overloaded_error occurs INSIDE the stream
   after connection established. max_retries on ChatAnthropic does NOT
   catch it. with_retry wrapper on the runnable DOES catch it.

2. HEALTH CHECK IS UNRELIABLE
   Railway /health returns 200 even when agent is overloaded.
   Only a successful end-to-end render confirms readiness.

3. VERCEL TIMEOUT
   Default Vercel serverless timeout is 10 seconds. Opus generation
   takes 15-45 seconds. Always add export const maxDuration = 60
   to every API route in this project.

4. GATE TEST PROTOCOL
   Never run gate tests during or immediately after heavy diagnostic
   sessions. Multiple rapid Opus requests trigger overloaded_error
   making working code appear broken when it is not.
   Always wait 30+ minutes. Use fresh browser tab.

5. PNPM VERSION LOCK
   Never regenerate pnpm-lock.yaml with a different pnpm version.
   Using npx pnpm@8 instead of pnpm@9 broke Vercel deployment.

6. FORCE PUSH + VERCEL
   Force pushing to reset main branch does not always trigger Vercel
   webhook. Use empty commit to force redeploy:
   git commit --allow-empty -m "chore: trigger redeploy"
   git push origin main

7. HITL RECOVERY
   HITL component recovers gracefully when ignored by user.
   Agent continues conversation without crash.

8. DOUBLE-CALL TIMEOUT PATTERN
   Two sequential Opus calls in one user prompt reliably exceeds
   60 seconds. Architecture must avoid chaining fetch + analyse.
   Neon persistence eliminates the need for the fetch call entirely.

## LAST COMMITS

e9e38e9 — fix: add retry backoff and timeout to ChatAnthropic
d92aa92 — fix: add maxDuration 60s to prevent Vercel timeout
55dabec — chore: trigger Vercel redeploy to Phase 4c baseline
bc8faf6 — docs: sign-off corrections — Phase 4c complete
All commits authorised.

## ENVIRONMENT STATE

Vercel (rfp-quest-homepage):
- LANGGRAPH_DEPLOYMENT_URL: SET ✅
  Value: https://rfp-quest-generative-agent-production.up.railway.app

Railway (rfp-quest-generative-agent):
- ANTHROPIC_API_KEY: SET ✅
- LLM_MODEL: claude-opus-4-6 (hardcoded in main.py) ✅
- DATABASE_URL: NOT SET — required for Phase 5c Neon persistence

All required variables confirmed working in production.
DATABASE_URL must be added to Railway before Phase 5c agent work.

## NEXT ACTION — Phase 5c Architecture

Do NOT start any code until all three gate tests pass in a fresh
browser session with no recent API activity (30+ min gap).

Phase 5c implementation order (strict — do not reorder):

PRIORITY 1: Neon tender persistence
  a. Create tenders table in Neon with columns:
     ocid (primary key), title, buyer, value, deadline,
     status, cpv_codes, raw_json, embedding (vector),
     source, fetched_at
  b. Add pgvector extension to Neon instance
  c. Update fetch_uk_tenders in apps/agent/src/uk_tenders.py to:
     - Save each tender to Neon on fetch
     - Generate and store text embedding for similarity search
  d. Add query_neon_tenders tool to agent:
     - Look up tender by title (fuzzy match)
     - Return related tenders via pgvector similarity search
  e. Update analyzeBidDecision flow:
     - Query Neon first, skip fetch_uk_tenders entirely
     - Single Opus call instead of two — fixes timeout permanently
  f. Add DATABASE_URL to Railway environment

PRIORITY 2: Instant tender card while AI analyses
  - When agent identifies tender from Neon, immediately emit
    tender data to frontend via copilotkit state
  - Frontend renders static tender card instantly
  - Opus analysis streams in alongside it
  - User sees something in under 2 seconds

PRIORITY 3: Loading states and graceful errors
  - Show "Searching tenders..." when query_neon_tenders fires
  - Show "Analysing opportunity..." when analyzeBidDecision fires
  - If all retries fail, show: "I'm having trouble connecting
    right now. Please try again in a moment."
  - Never show silence to the user

PRIORITY 4: Rate limiting
  - 5 free generative AI queries per session via localStorage
  - SSR tender feed load does NOT count as a query
  - After limit: "Create free account to continue" overlay

PRIORITY 5: Neon Auth
  - JWT-based, native Neon Auth, Next.js SDK
  - No third-party auth providers

Technology decisions for Phase 5c:
  - Database: Neon (Postgres) — already in use across portfolio
  - Vector search: pgvector on same Neon instance
  - Cache: NOT adding Redis — premature at current scale
  - Memory/graph: NOT adding Zep yet — needs bid history first
  - Multi-source ingestion: Phase 7+

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

## SIGN-OFF STATUS

DRAFT — must be reviewed and approved by Claude.ai before
Phase 5c work begins.
