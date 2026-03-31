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

ACTIVE — Phase 4c COMPLETE, Phase 5c Priority 1 COMPLETE

Phase 5c Priority 1 confirmed working on production 2026-03-31:
- Neon tenders table live with pgvector
- fetch_uk_tenders saves to Neon on fetch
- query_neon_tenders tool deployed
- Agent queries Neon first, falls back to live fetch only if empty
- Single-call analyse confirmed working: Neon lookup → HITL

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

Tako integration pattern (when implemented):
  1. Run targeted Neon SQL query for the analytical question
  2. Convert to CSV: import io, csv; buf = io.StringIO();
     writer = csv.DictWriter(buf, fieldnames=rows[0].keys());
     writer.writeheader(); writer.writerows(rows);
     csv_string = buf.getvalue()
  3. POST to Tako with csv=[csv_string] and query=user_question
  4. Extract embed_url from response knowledge_cards[0]
  5. Return embed_url to agent for widgetRenderer rendering

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

DO NOT call fetch_uk_tenders as the primary data source once
Neon bulk loader has run. All tender data should be in Neon.
Only use fetch_uk_tenders as a fallback when Neon is empty.
See D24.

DO NOT pass the full Neon DATABASE_URL to psycopg2 without
stripping channel_binding=require first. See D22.

DO NOT change pyproject.toml without running uv lock and
committing uv.lock in the same commit. See D23.

DO NOT upload tenders to Tako as static files.
Use inline CSV method — query Neon, convert to CSV string,
pass in request body. Charts are live Neon data. See D27.

DO NOT hardcode TAKO_API_KEY. Always os.getenv. See D28.

DO NOT pass full DATABASE_URL to psycopg2.
Strip channel_binding first. See D22.

DO NOT change pyproject.toml without running uv lock
and committing both files together. See D23.

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

Phase 5c Priority 1 (CONFIRMED ON PRODUCTION 2026-03-31):
Prerequisites: 18+ rows in Neon tenders table.

1. "Show me recent UK government tenders"
   → Tender cards render ✅
   → SELECT COUNT(*) FROM tenders returns 18+ rows ✅

2. "Analyse tender: BWV Support & Maintenance"
   (no buyer/value/deadline provided)
   → Agent calls query_neon_tenders (not fetch_uk_tenders) ✅
   → HITL bid decision card renders within 45 seconds ✅

CRITICAL NOTE: Gate test 2 now works WITHOUT full tender details
because Neon lookup replaces the live feed fetch.
The old workaround (providing full details) is no longer needed.

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

Neon:
- Project: rfp-quest-production (US East 1)
- Project ID: calm-dust-71989092
- Table: tenders (18 rows as of 2026-03-31, growing)
- pgvector: enabled
- DATABASE_URL: SET in Railway ✅
- Note: strip channel_binding=require before psycopg2 connection

Tako:
- TAKO_API_KEY: NOT SET in Railway ❌ — required for Priority 1.6
  Add to Railway before implementing visualise_tender_analytics
- Visualize endpoint: https://tako.com/api/v1/beta/visualize
- Method: POST inline CSV strings — no file upload needed
- Returns: embed_url → render in widgetRenderer as iframe
- API key: load from os.getenv("TAKO_API_KEY") only

## PHASE ROADMAP

**Phase 5c Priority 1** — COMPLETE ✅
Neon tenders table, pgvector, query_neon_tenders tool,
fetch saves to Neon, agent queries Neon first.

**Phase 5c Priority 1.5** — NEXT: Bulk ingestion pipeline
Create apps/agent/src/bulk_load_tenders.py:
  - Pages OCDS API backwards in 7-day windows from today to 2024-01-01
  - Upserts to Neon in batches of 50
  - Generates embeddings for each tender on insert
  - Resumable (skips existing ocids)
  - One-time historical load

Create apps/agent/src/cron_ingest_tenders.py:
  - Fetches last 25 hours of OCDS publications
  - Upserts new tenders to Neon
  - Railway cron: 0 6 * * * (daily 6am UTC)

Update system prompt after bulk load:
  - Remove fetch_uk_tenders fallback entirely
  - Agent never calls live API — Neon only
  - First user query becomes instant

Gate: SELECT COUNT(*) FROM tenders returns 10,000+ rows
Gate: First query renders from Neon in under 5 seconds

**Phase 5c Priority 1.6** — Tako live analytics integration
New tool: visualise_tender_analytics
  - Queries Neon tenders table with targeted SQL
  - Converts result to inline CSV string
  - Calls Tako /v1/beta/visualize with csv + natural language query
  - Returns embed_url → rendered in widgetRenderer as iframe
  - Zero file upload, zero sync delay — fully live Neon data

Environment: TAKO_API_KEY required in Railway + local .env

Gate: "Show me NHS contract spend by year"
      → Tako chart iframe renders in conversation

**Phase 5c Priority 2** — Instant tender card while AI analyses
Emit tender data immediately on identify via CopilotKit state.
Frontend renders static card while Opus streams analysis.

**Phase 5c Priority 3** — Loading states and graceful errors
useRenderTool loading cards for query_neon_tenders and
analyzeBidDecision. Graceful error message if Opus overloaded.

**Phase 5c Priority 4** — Rate limiting
5 free queries per session via localStorage.
"Create account to continue" overlay after limit.

**Phase 5c Priority 5** — Neon Auth
JWT-based, native Neon Auth, Next.js SDK.

**Phase 5a** — RFP.quest rebrand (cosmetic, ~30 min)
Header, title, Beta badge, demo-data.ts prompts.

**Phase 5b** — SSR tender feed (SEO, ~30 min)
Server-side render tender titles into page HTML.
Required before rfp.quest domain switch.

**Phase 6** — Company profile + bid tracker + Zep evaluation
Company registration: name, Companies House number, CPV codes,
certifications, framework memberships.
Bid tracker table in Neon.
Evaluate Zep for entity relationship graph on top of Neon data.
Zep can build buyer/CPV/tender relationships from existing data
without needing bid outcomes. Cheaper than Neo4j.

**Phase 7** — Intelligent matched feed + multi-source ingestion
Agent filters Neon by company CPV codes for logged-in users.
Redis cache if Neon latency becomes noticeable at scale.
Add Find a Tender, Proactis, Delta eSourcing as sources.
source column in tenders table tracks provenance.