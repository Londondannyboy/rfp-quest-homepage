# CLAUDE.md — rfp-quest-homepage
# Standard: See CLAUDE-STANDARD.md
# Sign-off status: SIGNED OFF 2026-03-28

---

## WHAT THIS PROJECT IS

This is the RFP.quest Generative UI homepage. It uses 
OpenGenerativeUI (CopilotKit v2 + LangChain Deep Agents) 
to render AI-generated HTML, SVG, Three.js, and Chart.js 
visualisations in sandboxed iframes. It fetches live UK 
government procurement data from the Contracts Finder 
OCDS API and visualises it using the widgetRenderer 
component. CopilotKit v2 is mandatory and cannot be 
replaced by any alternative framework or pattern.

## PROJECT STATUS

ACTIVE — Phase 4 and Phase 4c COMPLETE

Agent backend deployed to Railway and fully functional.
Frontend connected and visualizations working in production.
Gate tests 3, 4, and 4c passed. HITL bid decisions working.

## FROZEN SECTIONS

None — this project is actively developed.

The following SEPARATE repo is frozen and must not 
be touched during work on this project:
- github.com/Londondannyboy/langgraph-fastapi-rfp-quest
- Stable commit: 8462ed4
- DO NOT open, modify, or push to that repo

## MANDATORY PATTERNS

Model: claude-opus-4-6
The exact model string. Not claude-3-opus-20240229 
(Opus 3, February 2024, outdated). Not gpt-4o (too weak 
for generative UI). Not any other string. Exactly:
claude-opus-4-6

Frontend hook: useAgent()
Not useCoAgent(). useCoAgent is a CopilotKit v1 pattern.
In v2 the correct hook is useAgent(). Using useCoAgent 
causes AG-UI handshake pings only — the graph never 
executes. See DECISIONS.md.

Visualisation pattern: widgetRenderer via useComponent
The agent generates self-contained HTML strings.
The frontend receives them via useComponent hook.
WidgetRenderer.tsx streams them into a sandboxed iframe 
via postMessage. Idiomorph diffs the DOM as tokens arrive.
This is the only correct pattern for this project.

Agent architecture: create_deep_agent with skills
Skills are SKILL.md files in apps/agent/skills/[name]/
The agent reads them on demand. UK tender skill is at:
apps/agent/skills/uk-tenders/SKILL.md

## EXPLICIT DO NOT LIST

DO NOT use claude-3-opus-20240229 — it is Opus 3 from 
2024, two years old, insufficient for generative UI.
Use claude-opus-4-6.

DO NOT use useCoAgent — it does not trigger graph 
execution in CopilotKit v2. Use useAgent().

DO NOT use useRenderToolCall for the main panel — it 
renders inside the chat window only, not the main panel.
Use useComponent with widgetRenderer.

DO NOT touch langgraph-fastapi-rfp-quest repo — it is 
frozen at commit 8462ed4 and is a separate project.

DO NOT install packages that are not part of the 
current explicitly planned task. If a package seems 
needed, stop and report before installing.

DO NOT create SEO slug pages, Neon DB connections, or 
react-markdown integrations in this repo — those belong 
to a different project and a different phase.

DO NOT deploy to Vercel without first confirming that 
LANGGRAPH_DEPLOYMENT_URL is set to the correct Railway 
URL in Vercel environment variables.

DO NOT mark any phase complete without running all 
gate tests and confirming they pass.

DO NOT attempt to replace CopilotKit if you hit a wall.
The pattern works. The issue is always configuration
or model selection. Stop and report.

DO NOT use max_retries on ChatAnthropic for overload resilience.
It does not catch streaming overloaded_error. Use with_retry wrapper
on the runnable instead. See DECISIONS.md D13.

DO NOT run gate tests during or immediately after diagnostic sessions.
Wait 30 minutes minimum after any heavy API usage. See D15.

DO NOT regenerate pnpm-lock.yaml with any pnpm version other than
pnpm@9. Using pnpm@8 breaks Vercel deployment. See D18.

DO NOT rely on Railway /health as a readiness indicator.
Only a successful end-to-end render confirms readiness. See D17.

DO NOT chain fetch_uk_tenders + analyzeBidDecision in a single prompt.
This causes double-call timeout. Provide full tender details in prompt
until Neon persistence is implemented. See D16.

DO NOT add Redis, Supabase, or Zep to this project before Phase 7.
Use Neon with pgvector only. See D19 and D20.

## WHEN YOU HIT A WALL

Stop. Do not attempt an alternative approach.
Write out exactly:
1. What you were trying to do
2. What you tried
3. What error or failure occurred
4. What you think the cause might be

Do not proceed. Do not install alternative packages.
Do not switch to a different framework or pattern.
Report and wait for instruction.

## GATE TESTS

Phase 4 gate test results:

1. curl http://localhost:8123/health
   Expected: {"status":"ok"}
   Status: ✅ PASSED

2. curl https://rfp-quest-generative-agent-production.up.railway.app/health  
   Expected: {"status":"ok"}
   Status: ✅ PASSED

3. Open https://rfp-quest-homepage.vercel.app
   Type: "Draw a red circle"
   Expected: A red circle appears in a sandboxed iframe
   Status: ✅ PASSED

4. Type: "Show me recent UK government tenders"
   Expected: Tender cards appear with OCDS data
   Status: ✅ PASSED

Phase 4c (CONFIRMED ON PRODUCTION 2026-03-31):
Prerequisites: fresh browser tab, no API calls in prior 30 minutes.

1. "Draw a red circle"
   Expected: red circle renders in widgetRenderer iframe ✅

2. "Show me recent UK government tenders"
   Expected: 20 tender cards render in widgetRenderer ✅

3. "Analyse tender: BWV Support & Maintenance by Cambridgeshire
   Constabulary, value £128K, deadline 31 Mar 2026"
   Expected: HITL bid decision card renders ✅
   Expected: Ignoring HITL does not crash agent ✅

CRITICAL NOTE: Gate test 3 requires full tender details in prompt.
Do not ask agent to find tender first — double-call timeout.
Do not run any gate test during active development sessions.

## ENVIRONMENT

Frontend production: https://rfp-quest-homepage.vercel.app
Frontend local: http://localhost:3002
Agent local: http://localhost:8123
Agent production: https://rfp-quest-generative-agent-production.up.railway.app
  Railway project: c65f3508-7e52-4cde-a6f3-9cec50115b4c

Vercel team: team_nBAZLJTbCMBi2wrIMVlsmGjZ
Vercel project: prj_tJzSjC5nfXvUisD1CmEjlXQ19KPt
GitHub: github.com/Londondannyboy/rfp-quest-homepage

Required environment variables:
- ANTHROPIC_API_KEY (Railway — SET ✅)
- LLM_MODEL=claude-opus-4-6 (Railway — SET ✅)
- LANGGRAPH_DEPLOYMENT_URL (Vercel — SET ✅)

OCDS API (no auth required):
https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search

## PHASE ROADMAP

**Phase 5a** — REBUILD: RFP.quest rebrand
Update page-client.tsx header to "RFP.quest" with Beta badge.
Update layout.tsx title to "RFP.quest — UK Procurement Intelligence".
Update demo-data.ts with RFP-focused example prompts replacing
original OpenGenerativeUI prompts (binary search, solar system etc).
Gate: page header shows "RFP.quest" with Beta badge.

**Phase 5b** — REBUILD: SSR tender feed
Server-side render tender titles into page HTML for crawler indexing.
Required before rfp.quest domain switch — domain currently ranks
page 1 for "RFP platform UK" and must not lose SEO authority.
Gate: curl production URL must contain tender title in raw HTML.
Gate: CopilotKit chat still renders generative UI correctly.

**Phase 5c** — Neon persistence + pgvector + loading states
Priority 1: Neon tenders table with pgvector
  - tenders table: ocid, title, buyer, value, deadline, status,
    cpv_codes, raw_json, embedding vector(1536), source, fetched_at
  - Enable pgvector extension on Neon instance
  - fetch_uk_tenders saves to Neon on every call
  - query_neon_tenders tool: exact title lookup + similarity search
  - analyzeBidDecision queries Neon first, skips fetch entirely
  - Add DATABASE_URL to Railway environment variables

Priority 2: Instant tender card while AI analyses
  - Emit tender data immediately on identify via CopilotKit state
  - Frontend renders static card while Opus streams analysis

Priority 3: Loading states and graceful errors
  - "Searching tenders..." shown when query_neon_tenders fires
  - "Analysing opportunity..." shown when analyzeBidDecision fires
  - Graceful message if retries exhausted: try again prompt

Priority 4: Rate limiting
  - 5 free queries per session via localStorage
  - SSR feed loads do not count
  - "Create account to continue" overlay after limit

Priority 5: Neon Auth
  - JWT-based, native Neon Auth, Next.js SDK
  - No third-party providers

**Phase 6** — Company profile + bid tracker
Registration captures: company name, Companies House number,
sectors (SIC codes), CPV codes, certifications (ISO 27001, ISO 9001,
Cyber Essentials, BS 7858), framework memberships (G-Cloud 14,
DOS 6, Crown Commercial lots, NHS frameworks).
Bid tracker Neon table: one row per tender flagged as interested.
Fields: tender_id, ocid, title, buyer, value, deadline,
status (interested/bidding/submitted/won/lost), notes.

**Phase 7** — Matched and intelligent feed + Redis cache
Agent filters live OCDS stream against company CPV codes.
Only relevant tenders shown by default for logged-in users.
Zep graph database for relationship mapping between tenders,
buyers, and bid outcomes. Redis cache layer if Neon latency
becomes noticeable at scale.
Multi-source ingestion: Find a Tender, Proactis, Delta eSourcing.
source column in tenders table tracks provenance.