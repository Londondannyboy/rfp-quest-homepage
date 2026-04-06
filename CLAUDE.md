# CLAUDE.md — rfp-quest-homepage
# Standard: See CLAUDE-STANDARD.md
# Sign-off status: SIGNED OFF 2026-04-06

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

ACTIVE — Phase 6b COMPLETE, Phase 6c NEXT

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

Session 2026-04-03 (morning):
- Phase 5c Priority 1.7 COMPLETE — pre-computed Tako insights
- category_insights table: 9 categories, all populated
- cron_category_insights.py chained into existing Railway cron
- visualise_tender_analytics: cache-first (<24h), live fallback
- Cached path 1.3s vs live 7.3s (gate: <3s ✅)
- Extension roadmap added to DECISIONS.md (pg_trgm, pg_search, pg_ivm)

Session 2026-04-03 (evening):
- ALL 4 GATE TESTS PASSING ON PRODUCTION ✅
- query_neon_tenders fixed: word ILIKE fallback + browse mode, LIMIT 20
- Chart panel: shows latest chart only (globalTakoUrls replaced)
- Category insights: spend in millions GBP, tender_count removed from CSV
- TAKO_CHART marker hidden via MutationObserver
- Two-panel layout: chart left, chat right on desktop
- Second Tako chart replacement verified working
- Multi-query CopilotKit bug documented as product blocker (D42)
- RFP.quest Beta rebrand: header, title, explainer cards, demos, suggestions
- Explainer cards: Find Every Opportunity, Match to Your Strengths, Win More Bids
- Demo gallery: 9 real tender queries replacing generic demos
- 101,788 Neon rows (69K FAT + 31K CF v2)
- Phase 5a COMPLETE, Phase 5c Priority 1.7 COMPLETE
- SIGNED OFF — ready for Phase 6

Session 2026-04-03 (strategy):
- D44-D58 documented — full product vision
- Two-tier LLM strategy: Opus + Haiku (D58)
- Team skills graph as core product (D49)
- Career win/loss graph specified (D50)
- Phase 6 restructured: graph-first, no Kanban

Session 2026-04-05/06 (Phase 6a):
- Neon Auth: sign up/in/out via Google OAuth ✅
- @neondatabase/neon-js client + @neondatabase/auth server
- Full HITL onboarding flow: 7 cards + 2 text questions
  confirmUrl → selectCapabilities → selectSectors →
  selectContractRange → confirmSmeStatus →
  certifications (text) → expertise (text) →
  confirmCompanyProfile
- company_profiles saving to Neon ✅
- Tavily Extract for company website scraping ✅
- Duplicate domain detection ✅
- Personalised tender matching coded (match_score/tag)
- get_user_company + link_user_to_company tools
- invite_team_member tool + /join/[token] flow
- D59-D60 documented
- Phase 6a SIGNED OFF

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

User identity: getUserContext frontend tool
Never use [SYSTEM CONTEXT] message injection.
Call getUserContext() frontend tool for user authentication.
Returns { authenticated, email, user_id, company_id, company_name, sectors, is_sme }.
Required for query_neon_tenders match scoring and personalization.

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

Onboarding HITL tools (WORKING 2026-04-06):
  confirmUrl — URL confirmation with buttons
  selectCapabilities — DOS categories checklist
  selectSectors — UK procurement sectors checklist
  selectContractRange — contract value range buttons
  confirmSmeStatus — SME Yes/No buttons
  confirmCompanyProfile — full profile Save/Edit card
  All registered via useHumanInTheLoop in
  apps/app/src/hooks/use-generative-ui-examples.tsx
  Agent MUST call these tools directly (CALL NOW).
  DO NOT ask onboarding questions in text when
  a HITL card exists for that question.

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

DO NOT build Kanban pipeline — dropped (D49).
DO NOT use Haiku for HITL or bid analysis.
DO NOT use Opus for background classification.
DO NOT fork Atomic CRM as application (D45).
DO NOT scrape LinkedIn without user-provided
URL and explicit consent (D44).
DO NOT ask onboarding questions in text when a
HITL card exists for that question. CALL the tool.
DO NOT use npm install in apps/app — use pnpm add (D18, D65).
DO NOT use [SYSTEM CONTEXT] message injection — use getUserContext frontend tool.

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
- Table: tenders (~160K+ rows as of 2026-04-06, growing)
- Rich schema: 37+ columns, 9 indexes, tender_sync_log table
- pgvector: enabled
- Neon Pro plan — 10 GB storage, 0.25 CU, scale-to-zero
- DATABASE_URL: SET in Railway ✅
- Note: strip channel_binding=require before psycopg2 connection

Tako:
- TAKO_API_KEY: SET in Railway ✅
- Visualize endpoint: https://tako.com/api/v1/beta/visualize
- Method: POST inline CSV — no file upload needed
- Returns: embed_url → agent writes TAKO_CHART: marker →
  frontend StableIframe (D41)
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

**Phase 5c Priority 1.6** — WORKING LOCALLY ✅
TAKO_CHART marker pattern confirmed 2026-04-03.
Chart renders above chat. Canvas panel layout pending.
Reference: takodata/tako-copilotkit ResearchCanvas.tsx

**Phase 5c Priority 1.7** — WORKING LOCALLY ✅
category_insights table: 9 categories pre-computed.
Cache-first path: 1.3s locally. Production deploy pending.

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

**Phase 6** — Team skills graph + bid intelligence (NEXT)
Built on Neon Auth + Zep graph DB + React Force Graph 3D.
See D44-D58. Kanban pipeline dropped (D49).
Two-tier LLM: Opus for reasoning, Haiku for matching (D58).

Phase 6a — Foundation (FULL SPEC IN HANDOFF.md):
  Neon Auth JWT. Company claimed by domain (unique).
  Companies House API + Tavily auto-populate profile.
  HITL onboarding: certifications, frameworks, sectors,
  contract value range, SME status, DOS Layer 1
  capabilities, Layer 2 free-text expertise (D57).
  query_neon_tenders personalised by company profile.
  Team invitations with token-based join flow.
  Schema: company_profiles, person_profiles,
  team_invitations tables in Neon.

Phase 6b — Individual skills + career graph:
  Each person gets a 3D force graph of themselves.
  Career win/loss trajectory (D50): intertwined
  threads, role evolution as third dimension.
  Two-layer skills: formal taxonomy (DOS/CPV) +
  real-world expertise (D57).
  Technology: React Force Graph 3D (Three.js/WebGL).
  Zep graph DB for entity relationships.
  Haiku background matching pipeline (D58).

Phase 6c — Team graph:
  Graphs merge when people join a company or bid team.
  Coverage, gaps, and strength visualised in real time.
  Suggested connections: people who fill team gaps.
  pgvector similarity for connection recommendations.

Phase 6d — Bid intelligence overlay:
  Tender requirements overlaid onto team graph.
  Competitor intelligence from awarded contracts (D51).
  Decision maker discovery via Tavily + Trigify (D47).
  Framework membership + timing intelligence (D52).

Gate tests for Phase 6a:
  1. Public demo visible without auth
  2. Sign up → onboarding → CH + Tavily → HITL → Neon
  3. Dashboard shows filtered tagged tender results
  4. Team invitation → second user joins company
  5. Duplicate domain rejected
  6. Personalised match-tagged tender results

**Phase 7** — Additional sources + scale + RFP LLM
Devolved portals: Scotland, Wales, NI (D54 D56).
Four-stage data pipeline: dedup, classify, embed,
fine-tune (D53). Unsloth fine-tuned domain model.
Competitor graph + Clay enrichment (D51).
Framework timing intelligence (D52).
Redis cache if Neon latency becomes noticeable.
Messaging between connections.