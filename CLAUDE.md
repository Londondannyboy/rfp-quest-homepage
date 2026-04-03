# CLAUDE.md — rfp-quest-homepage
# Standard: See CLAUDE-STANDARD.md
# Sign-off status: SIGNED OFF 2026-04-03

---

## WHAT THIS PROJECT IS

This is the RFP.quest Generative UI homepage. It uses 
OpenGenerativeUI (CopilotKit v2 + LangChain Deep Agents) 
to render AI-generated HTML, SVG, Three.js, and Chart.js 
visualisations in sandboxed iframes. It fetches UK 
government procurement data from two sources: Contracts 
Finder REST v2 API and Find a Tender OCDS API, stored 
in Neon for fast querying. CopilotKit v2 is mandatory 
and cannot be replaced by any alternative framework or 
pattern.

## PROJECT STATUS

ACTIVE — Phase 4c COMPLETE, Phase 5c IN PROGRESS

Session 2026-04-01:
- Rich tenders schema (37+ columns, 9 indexes, D31)
- 5,604 Find a Tender rows migrated from old DB
- contracts_finder_v2_ingest.py — REST v2 API (D33)
- find_a_tender_ingest.py — cursor pagination, chunked
- LangSmith tracing enabled in Railway

Session 2026-04-02:
- All 4 gate tests passing on production ✅
- Tako integration confirmed working (D35)
- Dead code cleanup: uk_tenders.py, bulk_load_tenders.py deleted
- Unused imports removed (ChatOpenAI, asyncio, APIStatusError)
- Both loaders running: 58,030 rows (46.7K FAT + 11.1K CF v2)
- fetch_uk_tenders fully removed from codebase
- notice_type backfilled for all FAT rows from stage column
- CF v2 raw_ocds set to None — all fields parsed (D37)
- Neon Pro plan activated, all 47 projects at 0.25 CU
  with scale-to-zero (D38)
- Data quality audit: gaps identified, backfill planned

Session 2026-04-03:
- Phase 5c Priority 1.7 COMPLETE — pre-computed Tako insights
- category_insights table: 9 categories, all populated
- cron_category_insights.py chained into existing Railway cron
- visualise_tender_analytics: cache-first (<24h), live fallback
- Cached path 1.3s vs live 7.3s (gate: <3s ✅)
- Extension roadmap added to DECISIONS.md (pg_trgm, pg_search, pg_ivm)

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

Tako chart rendering pattern (WORKING 2026-04-03):
  1. visualise_tender_analytics queries Neon → CSV
  2. POSTs to Tako Visualize API → gets embed_url
  3. Returns embed_url as plain string to agent
  4. Agent includes 'TAKO_CHART: [url]' on its own line
  5. Frontend detects marker via regex → renders StableIframe
  DO NOT use widgetRenderer for Tako.
  DO NOT use takoVisualize useComponent.
  Reference: TAKO_CHART marker pattern (D41)

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

DO NOT chain multiple tool calls in a single prompt when each
takes 10+ seconds. This causes timeout. See D16.

DO NOT add Redis, Supabase, or Zep to this project before Phase 7.
Use Neon with pgvector only. See D19 and D20.

DO NOT call fetch_uk_tenders — it has been removed from the
agent tools list. All tender data is in Neon. See D24.

DO NOT use bulk_load_tenders.py for Contracts Finder
historical extraction. OCDS endpoint ignores pagination.
Use contracts_finder_v2_ingest.py instead. See D33.

DO NOT hardcode LANGSMITH_API_KEY.
Use os.getenv("LANGSMITH_API_KEY") only.

DO NOT null raw_ocds for any source — contains unextracted
fields needed for future features. Pro plan handles storage. See D37.

DO NOT pass the full Neon DATABASE_URL to psycopg2 without
stripping channel_binding=require first. See D22.

DO NOT change pyproject.toml without running uv lock and
committing uv.lock in the same commit. See D23.

DO NOT hardcode TAKO_API_KEY. Always os.getenv("TAKO_API_KEY"). See D28.
DO NOT upload tenders to Tako as static files.
  Query Neon → convert to CSV string → pass inline. See D27.
DO NOT render Tako chart iframes inside ReactMarkdown.
  Use StableIframe pattern (stable ID registry, React.memo,
  rendered as siblings outside ReactMarkdown tree).
  Reference: takodata/tako-copilotkit MarkdownRenderer.tsx

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

## KNOWN ISSUES

Second query on same thread crashes frontend:
  CopilotKit @next (1.54.0-next.6) throws
  "Cannot read properties of undefined (reading 'length')"
  on second tool-calling query in same browser tab.
  Backend is clean (200 OK, LangSmith traces all ✅).
  Bug is in CopilotKit React canary, not our code.
  Workaround: gate tests use fresh tabs per query.
  Phase 5c Priority 3 should add error boundary.

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

3. "Analyse tender: Service Wing Demolition (RAAC)"
   Expected: Agent calls query_neon_tenders, finds tender
   by North West Anglia NHS Foundation Trust (£10.6M)
   Expected: HITL bid decision card renders ✅
   Expected: Ignoring HITL does not crash agent ✅

CRITICAL NOTE: Full tender details no longer needed in prompt —
Neon lookup finds the tender by title. Do not run any gate test
during active development sessions.

Phase 5c Priority 1 (CONFIRMED ON PRODUCTION 2026-03-31):
Prerequisites: 18+ rows in Neon tenders table.

1. "Show me recent UK government tenders"
   → Tender cards render ✅
   → SELECT COUNT(*) FROM tenders returns 18+ rows ✅

2. "Analyse tender: Service Wing Demolition (RAAC)"
   → Agent calls query_neon_tenders ✅
   → Finds North West Anglia NHS Foundation Trust, £10.6M
   → HITL bid decision card renders within 45 seconds ✅

## ENVIRONMENT

Frontend production: https://rfp-quest-homepage.vercel.app
Frontend local: http://localhost:3002
Agent local: http://localhost:8123
Agent production: https://rfp-quest-generative-agent-production.up.railway.app
  Railway project: c65f3508-7e52-4cde-a6f3-9cec50115b4c

Debugging tools (use instead of asking user to paste logs):
- Railway CLI: linked to rfp-quest-generative-agent production
  railway logs — check production agent logs
  railway variables — check env vars
- LangSmith SDK: query traces programmatically
  LANGCHAIN_API_KEY=$(railway variables --json | python3 -c "import sys,json; print(json.load(sys.stdin).get('LANGSMITH_API_KEY',''))") python3 -c "
  from langsmith import Client; client = Client()
  runs = list(client.list_runs(project_name='rfp-quest', limit=5, is_root=True))
  for r in runs: print(r.start_time, r.status, r.error)"
- Python 3.12 PINNED via apps/agent/.python-version
  copilotkit requires <3.13. DO NOT upgrade.

Vercel team: team_nBAZLJTbCMBi2wrIMVlsmGjZ
Vercel project: prj_tJzSjC5nfXvUisD1CmEjlXQ19KPt
GitHub: github.com/Londondannyboy/rfp-quest-homepage

Required environment variables:
- ANTHROPIC_API_KEY (Railway — SET ✅)
- LLM_MODEL=claude-opus-4-6 (Railway — SET ✅)
- LANGGRAPH_DEPLOYMENT_URL (Vercel — SET ✅)
- DATABASE_URL (Railway — SET ✅)
- TAKO_API_KEY (Railway + Vercel — SET ✅)
- LANGSMITH_API_KEY (Railway — SET ✅)
- LANGCHAIN_TRACING_V2=true (set at startup if LANGSMITH_API_KEY present)
- LANGCHAIN_PROJECT=rfp-quest (set at startup)

Data sources:

Contracts Finder REST v2 (primary for Contracts Finder data):
- Endpoint: POST /api/rest/2/search_notices/json
- No auth required
- Returns SME flags, procedure type, awarded supplier
- Coverage: 2000→now (bulk load in progress)
- Script: apps/agent/src/contracts_finder_v2_ingest.py

Find a Tender OCDS (primary for FaT data):
- Endpoint: find-tender.service.gov.uk/api/1.0/ocdsReleasePackages
- No auth required
- Coverage: 2021→now (bulk load in progress)
- Script: apps/agent/src/find_a_tender_ingest.py

Old DB (decommission when ready):
- rfp.quest (square-waterfall-95675895, EU West 2)
- 5,604 rows migrated to production

Neon:
- Project: rfp-quest-production (US East 1)
- Project ID: calm-dust-71989092
- Table: tenders (~58,030 rows as of 2026-04-02, growing)
- Rich schema: 37+ columns, 9 indexes, tender_sync_log table
- pgvector: enabled
- Neon Pro plan — 10 GB storage, 0.25 CU, scale-to-zero
- DATABASE_URL: SET in Railway ✅
- Note: strip channel_binding=require before psycopg2 connection

Tako:
- TAKO_API_KEY: SET in Railway ✅
- Visualize endpoint: https://tako.com/api/v1/beta/visualize
- Method: POST inline CSV — no file upload needed
- Returns: embed_url → render in widgetRenderer as iframe
- Key: os.getenv("TAKO_API_KEY") only, never hardcode

## PHASE ROADMAP

**Phase 5c Priority 1** — COMPLETE ✅
Neon tenders table, pgvector, query_neon_tenders tool,
agent queries Neon only (no live API calls).

**Phase 5c Priority 1.5** — IN PROGRESS
Rich schema deployed (D31). Both loaders running:
- FAT: 40,500+ rows, 2024→now
- CF v2: 6,900+ rows, 2024→now (47,600+ total)
Pre-2024 loads pending. Railway OCDS cron configured.
Gate: 50,000+ rows, first query under 3 seconds.

**Phase 5c Priority 1.6** — COMPLETE ✅
visualise_tender_analytics + StableIframe deployed.
Tako chart confirmed rendering in production 2026-04-02.
Gate test: "Show me NHS contract spend by year" PASSING.

**Phase 5c Priority 1.7** — COMPLETE ✅
category_insights table in Neon (9 categories, all populated).
cron_category_insights.py chained into rfp-quest-cron-job (0 6 * * *).
visualise_tender_analytics checks cache (<24h) before live Tako call.
Tested: cached 1.3s vs live 7.3s. Gate: NHS spend chart <3s ✅

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

**Phase 5a** — NEXT: RFP.quest rebrand (cosmetic, ~30 min)
Header → "RFP.quest", title, Beta badge, demo prompts
replaced with real tender queries.

**Phase 5b** — SSR tender feed (SEO, ~30 min)
Server-side render tender titles into page HTML.
Required before rfp.quest domain switch.

**Phase 6** — Company profile + personalised matching
The session that turns RFP.quest from generic search into
a product worth paying £300/month for.

Part 1 — Schema:
  company_profiles: name, Companies House number, region,
    sectors, min/max contract value, is_sme, certifications.
  company_users: email, company_id FK, role. Multi-user
    from day one — profile belongs to company, not individual.
  buyer_taxonomy: maps raw buyer_name → parent_org, org_type,
    region, normalised_name. Top 200 buyers classified.

Part 2 — Conversational onboarding (CopilotKit HITL):
  NOT a form. Agent asks 6 questions conversationally:
  company name, sector, region, contract size range,
  SME status, certifications. HITL confirmation card.
  First thing a new user sees — "Welcome to RFP.quest.
  Let me set up your company profile."

Part 3 — Personalised query:
  query_neon_tenders accepts optional company_id.
  Filters by sector, value range, SME suitability.
  Sorts local buyers first (buyer_taxonomy.region match).
  Highlights LOCAL matches differently in tender cards.
  NHS procurement regionalism surfaced automatically:
  "3 of last 5 cleaning contracts at Yorkshire NHS trusts
  went to Leeds-based companies."

Part 4 — Neon Auth:
  JWT-based, native Neon Auth, Next.js SDK.
  Company profile tied to org ID, team invites via email.
  No Auth0, no Supabase — all within Neon.

Gate:
  1. Fresh session → onboarding HITL fires automatically
  2. After onboarding → personalised results filtered
  3. Local buyer highlighted differently in card
  4. Second team member accesses same company profile

**Phase 7** — Intelligent matched feed + additional sources
Redis cache if Neon latency becomes noticeable at scale.
Add Proactis, Delta eSourcing as additional sources.
source column in tenders table tracks provenance.
Bid tracker table in Neon.
Evaluate Zep for entity relationship graph on top of
Neon data — buyer/CPV/tender relationships from existing
data without needing bid outcomes.