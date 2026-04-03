# DECISIONS.md — rfp-quest-homepage
# Standard: See CLAUDE-STANDARD.md

---

## D1 — DATE: 2026-03-28
DECISION: Build generative UI as a separate app cloned 
from OpenGenerativeUI, not integrated into the existing 
langgraph-fastapi-rfp-quest repo.
CONTEXT: All Phase 4 attempts inside the existing repo 
failed. The CopilotKit v1 patterns used there are 
incompatible with the generative UI architecture needed.
TRIED AND FAILED:
- useRenderToolCall: renders inside chat panel only, 
  not in the main panel or arbitrary divs
- useCoAgent: subscribes to state only, does not trigger 
  graph execution — AG-UI handshake pings only
- appendMessage: messages sent but agent never called 
  tools, tool_choice issues
- render_tender_card tool: LLM chose text response 
  instead of calling the tool
- fetch_tenders_structured() in chat_node: chat_node 
  never executed because useCoAgent does not invoke graph
- PydanticAI v1.30.1: 40+ identical failed edits, 
  Claude Code looped, abandoned
ROOT CAUSE OF ALL FAILURES: Fundamental misunderstanding 
that useCoAgent triggers graph execution. It does not.
OUTCOME: Cloned OpenGenerativeUI. widgetRenderer works.
REVERSIBLE: No

---

## D2 — DATE: 2026-03-28
DECISION: Use exactly claude-opus-4-6 as the model.
CONTEXT: OpenGenerativeUI README explicitly warns that 
weaker models produce broken layouts, missing 
interactivity, and incomplete visualisations.
TRIED AND FAILED:
- gpt-4o: demos failed, 3D visualisations incomplete
- claude-3-opus-20240229: wrong model — this is Opus 3 
  from February 2024. Claude Code selected it despite 
  being told to use claude-opus-4-6. The difference is 
  two years and two major model generations.
OUTCOME: Must use claude-opus-4-6 — exact string.
REVERSIBLE: No — do not change without explicit approval.

---

## D3 — DATE: 2026-03-28
DECISION: Use useAgent() not useCoAgent() for all 
CopilotKit integration in this project.
CONTEXT: This project uses CopilotKit v2. useCoAgent 
is a v1 pattern. In v2 the correct hook is useAgent().
TRIED AND FAILED:
- useCoAgent: causes AG-UI handshake pings only. 
  Graph never executes. Confirmed by extended debugging.
OUTCOME: useAgent() is the correct v2 hook.
REVERSIBLE: No

---

## D4 — DATE: 2026-03-28
DECISION: Deploy agent as a new, separate Railway 
service — not the existing Phase 3 service.
CONTEXT: The existing Railway service at 
langgraph-fastapi-rfp-quest-production.up.railway.app 
runs the Phase 3 HITL agent (adispatch_custom_event, 
useHumanInTheLoop). It does not have create_deep_agent, 
skills architecture, or widgetRenderer registered.
TRIED AND FAILED:
- Pointing rfp-quest-homepage at existing Railway URL: 
  frontend connects but no visualisations render because 
  widgetRenderer tool does not exist on that agent.
OUTCOME: New Railway service required for this project.
Target name: rfp-quest-generative-agent
REVERSIBLE: Yes — if Phase 3 agent is upgraded to 
create_deep_agent architecture, can consolidate.

---

## D5 — DATE: 2026-03-28
DECISION: langgraph-fastapi-rfp-quest is frozen at 
commit 8462ed4 and must not be modified.
CONTEXT: That repo is the stable Phase 3 HITL app.
All new generative UI work happens in rfp-quest-homepage.
TRIED AND FAILED: Claude Code made unauthorised 
modifications to the frozen repo in the same session 
it was told not to touch it — TypeScript fix (fc8c515), 
react-markdown, Neon DB, [slug] pages. This happened 
because CLAUDE.md did not exist to prevent it.
OUTCOME: CLAUDE.md now explicitly prohibits touching 
that repo. Unauthorised changes need review.
REVERSIBLE: No — the freeze stands.

---

## D6 — DATE: 2026-03-28
DECISION: widgetRenderer via useComponent is the only 
acceptable pattern for rendering visualisations.
CONTEXT: This is the core architectural pattern of 
OpenGenerativeUI. Agent generates HTML string → 
useComponent hook receives it → WidgetRenderer.tsx 
streams it into sandboxed iframe via postMessage → 
Idiomorph diffs DOM → ResizeObserver reports height.
TRIED AND FAILED:
- useRenderToolCall: only renders inside chat window
- Direct DOM injection: breaks sandboxing
OUTCOME: widgetRenderer is mandatory.
REVERSIBLE: No

---

## D7 — DATE: 2026-03-28
DECISION: Successfully deployed rfp-quest-generative-agent 
to Railway as planned.
CONTEXT: Phase 4 required a new Railway service with 
create_deep_agent architecture and widgetRenderer support.
TRIED AND SUCCEEDED:
- Created new Railway project: c65f3508-7e52-4cde-a6f3-9cec50115b4c
- Deployed agent with claude-opus-4-6 model
- Set LANGGRAPH_DEPLOYMENT_URL in Vercel
- Frontend now connects to correct agent backend
OUTCOME: Production deployment complete and functional.
URL: https://rfp-quest-generative-agent-production.up.railway.app
REVERSIBLE: No — this is the production architecture.

ADDENDUM 2026-03-28: Critical dependency langchain-anthropic 
was missing from pyproject.toml. Railway deployment was 
responding to health checks but could not use ChatAnthropic.
Fix applied: Added "langchain-anthropic>=0.3.0" to dependencies.
Gate test 3 PASSED after fix.

---

## D8 — DATE: 2026-03-28
DECISION: ANTHROPIC_API_KEY must be the exact variable name.
CONTEXT: Variable was named CLAUDE_API_KEY in Railway, causing
silent auth failures. Health check still returned 200.
Every LLM call failed silently with no visible error.
TRIED AND FAILED: Wrong variable name for weeks.
OUTCOME: Renamed to ANTHROPIC_API_KEY. Gate test 3 passed immediately.
REVERSIBLE: No.

---

## D9 — DATE: 2026-03-28
DECISION: fetch_uk_tenders must return raw data not pre-generated HTML.
CONTEXT: Tool returning pre-generated HTML in JSON wrapper causes
agent to hang when trying to extract and pass to widgetRenderer.
TRIED AND FAILED: Returning {"widgetRenderer": {"html": "..."}}
structure. Agent cannot properly parse and forward the nested JSON.
OUTCOME: Returns simple list of tender dicts. Agent generates HTML.
Gate test 4 PASSED.
REVERSIBLE: Yes.

---

## D10 — DATE: 2026-03-28
DECISION: HITL bid decision flow confirmed working correctly.
CONTEXT: Phase 4c implementation of analyzeBidDecision.
OUTCOME: Full flow verified — HITL card appeared with 
certificate-style UI, user clicked "Proceed with Bid", 
decision recorded, agent continued with full analysis 
including strengths, risks, and next steps.
Three decision paths working: Bid, Pass, Review.
REVERSIBLE: N/A — this is a success entry.

---

## D13 — DATE: 2026-03-31
DECISION: Use with_retry wrapper not max_retries for overload resilience.
CONTEXT: overloaded_error occurs inside streaming after connection
established. max_retries on ChatAnthropic only catches connection errors,
not mid-stream failures.
TRIED AND FAILED: max_retries=3 on ChatAnthropic — does not catch
streaming overloaded_error. Error still propagates identically.
OUTCOME: base_model.with_retry(stop_after_attempt=3) wraps the entire
runnable including stream and catches it correctly.
REVERSIBLE: Yes

---

## D14 — DATE: 2026-03-31
DECISION: Always add export const maxDuration = 60 to Vercel API routes.
CONTEXT: Vercel serverless functions default to 10 second timeout.
Opus generation for complex prompts takes 15-45 seconds minimum.
Without maxDuration, all complex requests silently fail at 10s.
TRIED AND FAILED: Default Vercel timeout — silent failures on all
Opus requests beyond simple chat. No error shown to user.
OUTCOME: export const maxDuration = 60 in route.ts fixes production
timeouts. Must be added to every new API route in this project.
REVERSIBLE: No — must always be present.

---

## D15 — DATE: 2026-03-31
DECISION: Gate tests must never be run during active diagnostic sessions.
CONTEXT: Multiple rapid Opus requests trigger overloaded_error which
makes working code appear broken. Hours were wasted today diagnosing
code that was functioning correctly.
TRIED AND FAILED: Running gate tests immediately after diagnostic curl
commands and repeated browser refreshes — all appeared to fail but
were actually Anthropic overload failures, not code failures.
OUTCOME: Always wait 30+ minutes after heavy API usage before running
gate tests. Use a fresh browser tab with no conversation history.
Test in isolation, never mid-session.
REVERSIBLE: N/A — this is a testing protocol, not a code decision.

---

## D16 — DATE: 2026-03-31
DECISION: Tender analysis requires Neon persistence to be reliable
in production.
CONTEXT: "Analyse tender: X" without full details causes two sequential
Opus calls — fetch_uk_tenders (finds the tender) + analyzeBidDecision
(generates HITL card). Together they reliably exceed 60 seconds and
timeout silently. Also, tenders not in current top 20 live OCDS feed
cannot be analysed at all.
TRIED AND FAILED: Asking agent to fetch then analyse in same prompt —
double-call timeout. Providing tender name only — agent fetches entire
feed to find it, same timeout.
OUTCOME: Workaround confirmed — providing full tender details
(title, buyer, value, deadline) in the prompt skips the fetch call
and goes straight to analyzeBidDecision. Single call completes in time.
Proper fix: Phase 5c Neon persistence stores tenders on first fetch,
agent looks up by name without re-fetching.
REVERSIBLE: Yes — Neon persistence is the architectural fix.

---

## D17 — DATE: 2026-03-31
DECISION: Railway health endpoint is not a reliable agent readiness indicator.
CONTEXT: /health returns {"status":"ok"} even when the agent is actively
throwing overloaded_error on every LLM request. Health check only
confirms the FastAPI server is running, not that Anthropic API is
responding.
TRIED AND FAILED: Using health check to confirm agent is ready before
testing — health returned 200 while every user request was failing.
OUTCOME: Do not use health check as readiness gate. Only a successful
end-to-end LLM response (e.g. red circle renders) confirms readiness.
REVERSIBLE: N/A — this is an operational protocol.

---

## D18 — DATE: 2026-03-31
DECISION: pnpm-lock.yaml must only be regenerated with pnpm@9.
CONTEXT: Project specifies pnpm@9.0.0 as packageManager. Using
npx pnpm@8 to regenerate the lockfile produced an incompatible
lockfile that caused Vercel deployment to fail completely with
"pnpm install exited with 1".
TRIED AND FAILED: npx pnpm@8 install — regenerated lockfile with
wrong pnpm version, broke Vercel build, required emergency rollback.
OUTCOME: Never regenerate pnpm-lock.yaml unless pnpm@9 is available.
If pnpm is not installed globally, do not regenerate — find another
way or install pnpm@9 first.
REVERSIBLE: No — lockfile corruption requires force rollback.

---

## D19 — DATE: 2026-03-31
DECISION: Use Neon (Postgres + pgvector) as the single database
for Phase 5c. Do not add Redis, Zep, or Supabase.
CONTEXT: Multiple database options evaluated for Phase 5c:
- Supabase: adds auth UI and realtime subscriptions not yet needed.
  Switching cost from Neon not justified. Neon already in use.
- Redis: cache layer would add speed perception but premature at
  current scale. Neon with proper indexing handles tens of thousands
  of rows comfortably.
- Zep: graph database for relationship mapping (similar tenders,
  buyer patterns). Genuinely relevant but needs bid history data
  to build the graph from. Too early — Phase 7+.
OUTCOME: Neon with pgvector extension handles:
  - Tender persistence (Postgres table)
  - Vector similarity search for related tenders (pgvector)
  - Future: bid tracker, company profiles, framework intelligence
  All on same instance, no additional infrastructure.
REVERSIBLE: Yes — can add Redis cache layer in Phase 7 if needed.

---

## D20 — DATE: 2026-03-31
DECISION: Add pgvector to Neon in Phase 5c alongside basic persistence.
CONTEXT: At tens of thousands of tender rows from multiple sources,
similarity search becomes the primary navigation mechanism. A user
who bids on NHS cleaning contracts should automatically see Yorkshire
Council cleaning contracts, ESPO framework cleaning lots etc.
pgvector on same Neon instance means no additional infrastructure.
Embedding generated on insert using langchain embeddings.
TRIED AND FAILED: N/A — proactive architectural decision.
OUTCOME: tenders table includes embedding vector(1536) column.
query_neon_tenders tool supports both exact title lookup and
similarity search. Related tenders surface automatically in analysis.
REVERSIBLE: Yes — column can be dropped if not used.

---

## D21 — DATE: 2026-03-31
DECISION: with_retry wrapper is incompatible with create_deep_agent.
CONTEXT: create_deep_agent (deepagents library) inspects model.profile
at startup. RunnableRetry wrapper does not expose .profile, causing
AttributeError crash on Railway startup.
TRIED AND FAILED: model=base_model.with_retry(stop_after_attempt=3)
passed to create_deep_agent — crashes with AttributeError at startup.
OUTCOME: Reverted to model=base_model (plain ChatAnthropic).
Overload retry must be handled differently — either inside uk_tenders.py
tool level, or via deepagents built-in retry config if available.
REVERSIBLE: Yes — retry solution needed but approach must change.

---

## D22 — DATE: 2026-03-31
DECISION: psycopg2 requires channel_binding stripped from Neon URL.
CONTEXT: Neon default connection strings include channel_binding=require.
psycopg2-binary does not support this parameter and throws a
connection error silently — zero rows written to Neon.
TRIED AND FAILED: Passing full Neon DATABASE_URL directly to
psycopg2 — silent connection failure.
OUTCOME: Strip channel_binding from URL before connecting:
db_url = os.getenv("DATABASE_URL","").replace(
    "channel_binding=require&","").replace(
    "&channel_binding=require","").replace(
    "channel_binding=require","")
REVERSIBLE: Yes — asyncpg supports channel_binding natively.

---

## D23 — DATE: 2026-03-31
DECISION: uv.lock must be regenerated when pyproject.toml changes.
CONTEXT: Railway uses uv sync --locked. Adding psycopg2-binary to
pyproject.toml without regenerating uv.lock caused build failure.
TRIED AND FAILED: Committing pyproject.toml changes without updating
uv.lock — Railway build fails with exit code 1.
OUTCOME: Always run uv lock from apps/agent/ after changing
pyproject.toml, then commit both files together.
REVERSIBLE: N/A — operational protocol.

---

## D24 — DATE: 2026-03-31
DECISION: fetch_uk_tenders must never be the primary data source.
CONTEXT: fetch_uk_tenders hits the live OCDS API (10-20 seconds).
When chained with analyzeBidDecision it reliably times out. All
tender data should be in Neon before users ask for it.
TRIED AND FAILED: Relying on fetch_uk_tenders as primary source —
first user query always slow, double-call always times out.
OUTCOME: fetch_uk_tenders is fallback only. Once bulk loader runs
and cron is active, system prompt will remove fallback entirely.
All queries go to Neon.
REVERSIBLE: Yes — can re-enable if Neon is unavailable.

---

## D25 — DATE: 2026-03-31
DECISION: Use Railway cron for daily ingestion. No Temporal or
trigger.dev at this stage.
CONTEXT: At current scale — one daily OCDS poll, ~50-200 new
tenders per day, lightweight JSON — Railway cron is sufficient
and adds no infrastructure cost.
OUTCOME: cron_ingest_tenders.py as Railway cron service,
schedule: 0 6 * * * (6am UTC daily).
Revisit trigger.dev in Phase 7 when multi-source ingestion begins.
REVERSIBLE: Yes.

---

## D26 — DATE: 2026-03-31
DECISION: Zep moved from Phase 7 to Phase 6 consideration.
CONTEXT: Zep is significantly cheaper than Neo4j and can build
entity relationships from tender data alone — buyers, CPV codes,
procurement patterns — without needing bid outcomes first.
OUTCOME: Evaluate Zep at Phase 6 alongside company profile work.
If Zep can ingest from Neon tenders table, use for related tender
discovery alongside pgvector similarity.
REVERSIBLE: Yes — pgvector remains as fallback.

---

## D27 — DATE: 2026-03-31
DECISION: Use Tako Visualize API for live analytical charts
over Neon tender data. Inline CSV, no file upload, no sync delay.
CONTEXT: Tako's /v1/beta/visualize endpoint accepts raw CSV strings
in the request body. Agent queries Neon → converts to CSV string →
passes to Tako → gets back embeddable chart iframe. Fully live.
ARCHITECTURE:
  1. User asks analytical question (trends, comparisons, breakdowns)
  2. Agent runs targeted SQL on Neon tenders table
  3. Agent converts result to CSV string (2 lines Python)
  4. Agent POSTs to https://tako.com/api/v1/beta/visualize
     with csv=[csv_string] and query=natural_language_question
  5. Tako returns embed_url for interactive chart iframe
  6. Agent passes embed_url to widgetRenderer
TWO DISTINCT CAPABILITIES:
  - query_neon_tenders: individual tender lookup + HITL analysis
  - visualise_tender_analytics: live Tako charts over full dataset
REVERSIBLE: Yes — can fall back to Chart.js if Tako unavailable.

---

## D28 — DATE: 2026-03-31
DECISION: TAKO_API_KEY is a required environment variable.
CONTEXT: Tako API requires X-API-Key header. Never hardcode.
OUTCOME: Add to Railway environment variables and local .env.
Load via os.getenv("TAKO_API_KEY") only.
REVERSIBLE: No — required for Tako integration.

---

## D29 — DATE: 2026-03-31
DECISION: Use SummarizationMiddleware for context management.
CONTEXT: deepagents middleware stack includes SummarizationMiddleware
which auto-offloads messages >80,000 chars and evicts tool results
>80KB. Prevents context overflow on long tender analysis sessions.
Model: claude-haiku-4-5-20251001 (cheap, fast for summarisation).
OUTCOME: Agent maintains reasoning quality on long sessions.
REVERSIBLE: Yes.
STATUS: NOT YET IMPLEMENTED — reference for future session.

IMPLEMENTATION NOTES (for when this is built):
- Import: from langchain.agents.middleware import SummarizationMiddleware
  (verify import path exists in installed deepagents version first)
- Add to middleware list alongside CopilotKitMiddleware()
- Config: max_tokens_before_summary=3000, messages_to_keep=20

PHASE 6 PLANNING NOTES (related deepagents middleware patterns):
- SubAgentMiddleware: for bulk tender analysis tasks
- PostgresSaver checkpointer: uses existing Neon DATABASE_URL,
  replaces BoundedMemorySaver for durable multi-day bid workflows
- HumanInTheLoopMiddleware: already available — use for Phase 5c
  Priority 3 graceful approval flows. Do not build custom HITL.
- Custom RetryMiddleware implementing AgentMiddleware protocol:
  correct fix for D21 (with_retry incompatibility). Wrap retry
  logic in middleware, not on the model object.

---

## D30 — DATE: 2026-04-01
DECISION: Use operator.add reducer on state fields written
by parallel tool calls.
CONTEXT: LangGraph default state update is last-write-wins.
When query_neon_tenders and visualise_tender_analytics run
in parallel, both write to search_results — without a reducer
one silently overwrites the other. No error is thrown.
OUTCOME: Any state field written by concurrent nodes must use:
  search_results: Annotated[list[dict], operator.add]
All parallel tool nodes must catch exceptions internally and
return errors as state data — never raise.
REVERSIBLE: N/A — state schema design decision.

---

## D31 — DATE: 2026-04-01
DECISION: Adopt rich tenders schema before bulk load.
CONTEXT: Original thin schema (single value, single
deadline, no stage/CPV/region) would have loaded
10,000+ rows of junk. Old rfp.quest DB had richer
schema with 5,604 Find a Tender rows already correct.
OUTCOME: Schema enriched to match old DB. Both
Contracts Finder and Find a Tender feed same table.
source column tracks provenance. All 9 OCDS release
stages captured correctly. Columns renamed: buyer →
buyer_name, value → value_amount, deadline →
tender_end_date, raw_json → raw_ocds, currency →
value_currency. 21 new columns added. cpv_codes
converted from ARRAY to JSONB. tender_sync_log table
created. 5,604 rows migrated from old DB
(square-waterfall-95675895) to production
(calm-dust-71989092).
REVERSIBLE: No — schema migration is destructive.

---

## D32 — DATE: 2026-04-01
DECISION: Add LangSmith tracing for agent observability.
CONTEXT: Zero visibility into tool calls, errors, and
agent decisions. Cannot diagnose failures like the NHS
chart timeout without knowing what each tool returned.
LangSmith auto-instruments LangGraph with zero code
changes beyond env vars and startup block in main.py.
OUTCOME: Every agent run traceable at smith.langchain.com
showing all tool inputs/outputs, latency, token usage.
Enabled via LANGSMITH_API_KEY + LANGCHAIN_TRACING_V2=true
+ LANGCHAIN_PROJECT=rfp-quest in Railway environment.
REVERSIBLE: Yes — remove env vars to disable.

---

## D33 — DATE: 2026-04-01
DECISION: Use Contracts Finder REST v2 API for bulk
extraction, not the OCDS endpoint.
CONTEXT: The OCDS endpoint ignores page parameter and
returns identical results on every page — 19,700 fetches
yielding only 75 unique rows. The REST v2 API at
/api/rest/2/search_notices/json returns 1,000 results
per request with hitCount, adaptive date narrowing,
and goes back to 2000. It also returns SME flags,
awarded supplier, notice type and all other fields
we were planning to backfill from raw_ocds.
OUTCOME: Replace bulk_load_tenders.py OCDS approach
with contracts_finder_v2_ingest.py REST v2 approach.
Coverage: 2000-01-01 to now. ~25 years of data.
REVERSIBLE: Yes — OCDS endpoint still available.

---

## D34 — DATE: 2026-04-02
DECISION: Reconnect to Neon per chunk in long-running loaders.
CONTEXT: psycopg2 connections held open for hours are killed
by Neon's idle connection timeout. Both overnight loaders
died with InterfaceError: connection already closed.
TRIED AND FAILED: Single connection held for entire run —
dies mid-batch overnight.
OUTCOME: Both find_a_tender_ingest.py and
contracts_finder_v2_ingest.py now open a fresh psycopg2
connection for each chunk and close it immediately after.
REVERSIBLE: Yes — but don't. This is the correct pattern.

---

## D35 — DATE: 2026-04-02
DECISION: Tako API response path is outputs.knowledge_cards,
not knowledge_cards at top level.
CONTEXT: visualise_tender_analytics tool was checking
data["knowledge_cards"] but Tako returns the cards nested
under data["outputs"]["knowledge_cards"]. Tool was raising
"Tako returned no knowledge cards" on every call despite
the API returning 200 with valid chart data.
OUTCOME: Fixed to check data["outputs"]["knowledge_cards"]
with fallback to data["knowledge_cards"]. Also removed
sandbox attribute from StableIframe — Tako embeds are
trusted third-party content that needs full JS execution.
REVERSIBLE: N/A — bug fix.

---

## D36 — DATE: 2026-04-02
DECISION: Pre-computed category insights planned for
Phase 5c Priority 1.7.
CONTEXT: Tako charts render live from Neon SQL queries,
but common analytical questions (top buyers, spend by
sector, SME breakdown) could be pre-computed into a
materialized view or summary table. This would make
Tako charts instant instead of waiting for a full
table scan on 50,000+ rows.
OUTCOME: Planned as Phase 5c Priority 1.7 after bulk
loads complete. Create tenders_summary materialized view
refreshed daily by Railway cron. Tako queries hit the
summary view instead of the full tenders table.
REVERSIBLE: Yes — just query the full table instead.

---

## RESEARCH — DATE: 2026-04-02
CONFIRMED DIRECTION FOR PHASE 6:
Use Atomic CRM v1.5 (marmelab/atomic-crm,
CopilotKit fork) as bid workspace foundation.

Why confirmed:
- v1.5 released March 2026 — actively maintained
- Used in production by marmelab (serious React shop)
- MCP server built — connects to Claude Code/Desktop
- shadcn/ui (same as Shadify) — consistent design system
- AGENTS.md + skill files — designed for Claude Code
- OAuth identity provider — can auth RFP.quest users
- Customisable Kanban stages — configure for bid pipeline
- Supabase backend swappable to Neon (same Postgres)
- MIT license

Phase 6 architecture:
- Fork marmelab/atomic-crm (not CopilotKit fork —
  CopilotKit fork is newer but less battle-tested)
- Swap Supabase for Neon — tenders + CRM in one DB
- Configure Kanban stages for bid pipeline
- Add tender_id FK to deals table
- Connect Atomic CRM MCP server to RFP.quest agent
- Authenticate RFP.quest users via Atomic CRM OAuth
- Tavily + Exa populate contacts from buyer research

AUTHENTICATION: Neon Auth (not Atomic CRM OAuth)
Reason: All data — tenders, company profiles, CRM
contacts, deals, tasks, users — must be in one Neon
database for cross-referencing queries to work in
real time. Fragmented data across Supabase + Neon
breaks the intelligence layer.

Atomic CRM contribution: data model + shadcn UI
components only. Backend runs on Neon, not Supabase.

Core intelligence pattern:
When user shows interest in opportunity X:
1. Query active bids for same buyer/sector
2. Surface outstanding tasks on related bids
3. Identify named contacts at that buyer
4. Compare CPV codes, value range, framework
5. Show last award winner + value
= Proactive bid intelligence, not reactive search

DO NOT start Phase 6 until Phase 5 complete.
DO NOT fork or install until Phase 5c Priority 1.7
and Phase 5c Priority 3 are done.

Reference URLs:
- github.com/marmelab/atomic-crm
- marmelab.com/atomic-crm/doc/
- marmelab.com/blog/2026/03/13/atomic-crm-1-5.html

Other reference repos:
- github.com/CopilotKit/shadify — component schema pattern
  for agent-composed UI. Study before Phase 5a card redesign.
- github.com/CopilotKit/excalidraw-studio — MCPAppsMiddleware
  iframe pattern. Compare vs StableIframe before P1.7.

---

## ARCHITECTURAL QUESTION — DATE: 2026-04-02
OPEN: Real-time CRM updates — Neon vs Supabase

CONTEXT: Atomic CRM uses Supabase for real-time
Kanban updates via Postgres logical replication.
Neon does not have native real-time subscriptions.
Real-time matters for team accounts (2+ users
editing the same bid pipeline simultaneously).

OPTIONS:
A. Neon + thin real-time layer (PartyKit/Ably)
B. Neon for tenders + Supabase for CRM tables
C. Neon only — defer real-time until team use case

DECISION: Option C — build on Neon, defer.
Real-time Kanban is a team feature.
First users are likely solo or 2-person.
Revisit when first team account requests it.
REVERSIBLE: Yes.

OPEN: HubSpot/Salesforce integration
CONTEXT: Target customers likely already use
HubSpot or Salesforce. RFP.quest should complement
not replace. Integration strategy:
- Inbound: sync existing procurement contacts
- Outbound: push new contacts discovered via
  Tavily/Exa back to existing CRM
- Position as "bid intelligence layer on top of
  your existing CRM" not "CRM replacement"
Status: DEFER to Phase 7. Document the pattern now.

---

## D37 — DATE: 2026-04-02
DECISION REVERSED — retain raw_ocds for CF v2.
CONTEXT: Pro plan storage (10GB) makes cost negligible.
CF v2 contains unextracted fields: description,
coordinates, approachMarketDate, isSubNotice,
cpvCodesExtended, regionText, lastNotifiableUpdate.
These are valuable for future feature development
and cannot be recovered without full re-ingestion.
OUTCOME: raw_ocds stored for all sources. Do not null.
REVERSIBLE: Yes — can null later once all useful
fields are confirmed extracted into schema columns.

---

## D38 — DATE: 2026-04-02
DECISION: Upgrade Neon to Pro plan.
CONTEXT: Free tier has 512 MB storage limit. At 58K rows
the tenders table is 285 MB. Historical loads (pre-2024)
will push past 512 MB. Pro plan gives 10 GB included.
At ~5 KB/row average, 500K rows would be ~2.5 GB.
OUTCOME: Neon Pro plan active. All 47 projects set to
0.25 CU with scale-to-zero (5 min suspend timeout).
Cost minimised — compute only runs when queried.
REVERSIBLE: Yes — can downgrade if rows reduced.

---

## D39 — DATE: 2026-04-02 (updated 2026-04-03)
DECISION: Full retry logic at every layer in both loaders.
CONTEXT: Loaders died repeatedly with "cursor already closed".
Root cause: savepoint ROLLBACK inside upsert_batch fails when
connection is dead, but the except block tried to execute SQL
on the dead cursor, crashing the entire function before the
outer retry could catch it.
OUTCOME: Three-layer retry:
1. get_db() retries 3x on connection failure
2. Savepoint rollback wrapped in try/except — reraises on
   failure so outer retry handles it instead of crashing
3. Entire chunk/window wrapped in 3-retry loop with 30s
   backoff, catching OperationalError + InterfaceError +
   InFailedSqlTransaction. Fresh connection on each retry.
Scale-to-zero disabled during load runs.
Re-enable after historical loads complete.

## EXTENSIONS UPDATE — DATE: 2026-04-02
ACTIVATE IMMEDIATELY:
- pg_trgm: already on Neon, just needs enabling
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX idx_tenders_buyer_trgm ON tenders 
  USING GIN (buyer_name gin_trgm_ops);
  Improves buyer name fuzzy matching for taxonomy.

INVESTIGATE BEFORE PHASE 5c Priority 3:
- pg_search (ParadeDB): #22 fastest growing extension.
  BM25 + hybrid search. May replace GIN full-text index
  + pgvector search with single superior search tool.
  Test against current query_neon_tenders performance.
  URL: paradedb.com

PHASE 6:
- pg_ivm: incremental view maintenance for 
  live_tenders and awarded_contracts views.
  Keeps views current without manual REFRESH.
- rag/rag_bge_small_en_v15: in-database embedding 
  generation on tender insert. Eliminates external 
  embedding API call.

NOTE: pg_cron installs dropping -39.8%.
Market moving toward external schedulers (Inngest).
Confirms decision to evaluate Inngest for cron work.
REVERSIBLE: Yes.

## D40 — DATE: 2026-04-03
DECISION: Render Tako iframes via widgetRenderer,
not takoVisualize frontend component.
CONTEXT: The two-step chain (backend tool → frontend
useComponent) leaves an orphaned tool_use block with
no corresponding tool_result in the thread checkpoint.
Anthropic rejects subsequent queries with 400 error:
"tool_use ids found without tool_result blocks".
Diagnosed via LangSmith trace inspection: msg[9] had
tool_use for takoVisualize but no msg[10] tool_result.
widgetRenderer works because it is a frontend component
called directly by the LLM after plan_visualization
(a backend tool that properly records tool_result).
OUTCOME: visualise_tender_analytics now returns an html
field containing a self-contained iframe tag. Agent
passes this directly to widgetRenderer. Single tool
chain, no orphaned tool_use, thread stays clean.
takoVisualize component still registered but not called.
REVERSIBLE: Yes — revert system prompt to use takoVisualize.
SUPERSEDED BY: D41 — widgetRenderer also fails (sandbox blocks Tako).

## D41 — DATE: 2026-04-03
DECISION: Use TAKO_CHART marker pattern for chart rendering.
CONTEXT: Every other approach failed:
- takoVisualize useComponent → orphaned tool_use (D40)
- widgetRenderer nested iframe → sandbox blocks Tako content
- analytics_embed_url state field → CopilotKit agent.state
  only exposes messages/tools/copilotkit, not custom fields
- copilotkit_emit_state from @tool → crashes ag_ui_langgraph
  with "tool_call_name Input should be a valid string"
TRIED AND FAILED: All of the above across one full session.
OUTCOME: Tool returns embed_url as string. Agent writes
'TAKO_CHART: https://tako.com/embed/XXXX/' on its own line.
Frontend regex detects this in agent messages, renders
StableIframe in always-mounted container above chat.
Confirmed working locally with real Neon data 2026-04-03.
REVERSIBLE: Yes.

## D42 — DATE: 2026-04-03
DECISION: Multi-query CopilotKit bug is a product blocker,
not a testing protocol issue.
CONTEXT: ag_ui_langgraph raises "Message ID not found in
history" on second query in same browser tab. Previous
workaround was "use fresh tabs per query" for gate tests.
This is unacceptable — real users send multiple queries in
one session. The HANDOFF gate test protocol of fresh tabs
masked this as a testing concern when it is a product defect.
OUTCOME: Must be fixed in Phase 5c Priority 3. Options:
1. Upgrade ag_ui_langgraph — check if newer version fixes
   the checkpoint lookup regression
2. Patch prepare_regenerate_stream to handle missing message
   IDs gracefully (catch ValueError, start fresh thread)
3. Frontend: generate new thread_id per query if checkpoint
   recovery fails
REVERSIBLE: N/A — bug fix required.

## D44 — DATE: 2026-04-03
DECISION: Phase 6 full specification — network-based
auth, company profiles, HITL onboarding, built on
Atomic CRM (marmelab/atomic-crm) data model + shadcn UI.

FOUNDATION: ATOMIC CRM
Fork marmelab/atomic-crm for:
- Data model: contacts, companies, deals, tasks, tags
- shadcn/ui component library (consistent with project)
- Kanban pipeline (configure for bid stages)
- MCP server (connects to Claude Code/Desktop)
- MIT license
Swap Supabase backend for Neon — all data in one DB.
See RESEARCH section (2026-04-02) for full rationale.

USER → COMPANY RELATIONSHIP (LinkedIn model):
A person signs up first. They exist independently.
Then they either:
a) Create a new company (becomes admin), or
b) Accept an invitation to join an existing company
A person always has a profile, even without a company.
A company is created BY a person, not the other way.
One person can be admin of one company and connected
to others as contractor/consultant.
Atomic CRM contacts table maps to person_profiles.
Atomic CRM companies table maps to company_profiles.
Atomic CRM deals table maps to bid pipeline (Phase 6 Part 3).

NETWORK MODEL:
Not classic SaaS seats. RFP.quest is a professional
network for UK procurement. Connection types:

- Company admin: owns the company profile, controls
  team membership, sees full bid pipeline
- Company member: internal team, invited by admin,
  full pipeline access
- External connection: bid writers, consultants,
  framework specialists — connected to a person,
  not a company. Limited access unless explicitly
  granted.
- Contractor: explicitly flagged connection type,
  can be attached to specific bids by admin
- General connection: like LinkedIn — visible in
  network, can message, can be invited to bid teams

ACTIONS USERS CAN TAKE:
- Send connection request (person to person)
- Accept/decline connection request
- Invite someone to join your company as member
- Accept company membership invitation
- Flag a connection as contractor
- Message a connection (Phase 7)
- Search for people by name, company, specialism
- View public profile (company + person)
- Edit own profile

COMPANY PROFILE:
- Unique identifier: company domain URL (not name)
  e.g. acmeconstruction.co.uk — one profile per domain
- Also linked to Companies House number for verification
- Fields: name, domain, CH number, region, sectors,
  contract value range, is_sme, certifications,
  description, logo_url
- Admin claims a company by verifying domain ownership
  (send email to admin@domain or info@domain)
- Only one company per domain — prevents duplicates

COMPANY AUTO-POPULATION VIA TAVILY:
When admin enters their domain:
1. Agent calls Tavily to scrape public web presence
2. Extracts: company description, sector, services,
   approximate size, any public procurement history
3. Also queries Companies House API (free, no ToS risk)
   for: registered name, SIC codes, incorporation date,
   filing status, registered address
4. Pre-populates company profile fields
5. HITL confirmation card: "Here's what I found about
   [company]. Does this look right? You can edit any
   field before confirming."
6. User confirms or edits, then profile is saved

PERSON PROFILE AUTO-POPULATION:
When person creates account:
1. They provide their name + job title
2. They optionally paste their LinkedIn URL
   (they consent explicitly — we do not scrape without
   consent. Tavily scrapes the public LinkedIn page
   they provide.)
3. Tavily extracts: current role, experience summary,
   skills, past employers
4. HITL confirmation: "Here's your profile draft.
   Edit anything before publishing."
NOTE: Never scrape LinkedIn without explicit URL consent
from the person. Companies House + public web only for
company data.

HITL ONBOARDING FLOW (conversational, not a form):
Person-first, then company. Like LinkedIn sign-up.

Step 1 — Person profile (always):
Agent: "Welcome to RFP.quest. Let's set up your profile.
What's your name and job title?"
→ Optional: "Paste your LinkedIn profile URL if you'd
   like me to fill in your background automatically."
→ If LinkedIn URL provided: Tavily scrapes, HITL confirm
→ HITL card: person profile draft, confirm/edit

Step 2 — Company (optional but prompted):
Agent: "Do you work for a company that bids on
government contracts? If so, what's the company website?"
→ If yes: domain provided
→ Agent checks if company_profiles already has that domain
→ If exists: "I found [company] already on RFP.quest.
   I'll send a request to join. Their admin will approve."
→ If new: Tavily scrapes + Companies House API
→ HITL confirmation card for company profile
→ Person becomes admin of new company
→ "What sectors does [company] work in?"
→ "What's your typical contract size range?"
→ "Are you an SME?"
→ "Any frameworks or certifications? (G-Cloud, Crown
   Commercial, ISO 9001 etc)"
→ Final HITL card: full company profile, confirm.

Step 3 — If no company:
Agent: "No problem — you can still browse tenders and
connect with companies on RFP.quest. You can set up
a company profile anytime."
→ Person profile saved, no company association.

SCHEMA (Neon):
company_profiles:
  id, domain (unique), companies_house_number,
  name, region, sectors (jsonb), min_contract_value,
  max_contract_value, is_sme, certifications (jsonb),
  description, logo_url, verified, created_at

company_users:
  id, company_id FK, user_id (Neon Auth),
  role (admin|member), invited_by, joined_at

person_profiles:
  id, user_id (Neon Auth), display_name, job_title,
  linkedin_url (optional, user-provided),
  bio, specialisms (jsonb), created_at

connections:
  id, from_user_id, to_user_id,
  connection_type (connection|contractor|member),
  status (pending|accepted|declined),
  company_context_id (nullable FK — which company
  this contractor is attached to),
  created_at, updated_at

messages:
  id, from_user_id, to_user_id, body,
  read_at, created_at
  (Phase 7 — schema defined now, built later)

IMPLEMENTATION ORDER:
Phase 6 Part 1 — Auth + person profile:
  Neon Auth setup (JWT, native),
  person_profiles table,
  conversational onboarding (person-first),
  optional LinkedIn URL + Tavily scrape,
  HITL person profile confirmation.
  Atomic CRM contacts table → person_profiles.

Phase 6 Part 2 — Company profile:
  company_profiles table, domain-based uniqueness,
  Companies House API, Tavily company scrape,
  HITL company profile confirmation,
  person becomes admin of new company.
  Atomic CRM companies table → company_profiles.
  Join-existing-company flow for known domains.

Phase 6 Part 3 — Team + bid pipeline:
  company_users table, admin invite flow,
  accept/decline membership, role display.
  Atomic CRM deals table → bid pipeline.
  Kanban stages: Identified → Qualifying →
  Writing → Submitted → Awarded/Lost.
  tender_id FK on deals for linking bids to tenders.

Phase 6 Part 4 — Personalised results:
  query_neon_tenders accepts company_id,
  filters by sector + value range,
  local buyer highlighted differently.

Phase 7 — Connections + network:
  connections table, send/accept requests,
  contractor flagging, people search,
  messaging, reputation layer

GATE TESTS FOR PHASE 6:
1. New user → onboarding HITL fires automatically
2. Enter domain → Tavily scrapes → profile pre-filled
3. HITL confirmation → profile saved to Neon
4. Invite team member → they receive link → join
5. After onboarding → tender results filtered by sector
6. Second team member sees same company profile
7. Company domain is unique — duplicate domain rejected

DO NOT:
DO NOT use Auth0, Clerk, or Supabase Auth.
Use Neon Auth only — JWT, org-level, native.
DO NOT scrape LinkedIn without explicit user-provided
URL and consent confirmation.
DO NOT build messaging in Phase 6 — schema only.
DO NOT start Phase 6 until gate tests 1-4 pass
on production (red circle, recent tenders,
RAAC analysis, NHS chart in right panel).
REVERSIBLE: Yes — network can simplify to seats
model if adoption requires it.

## D45 — DATE: 2026-04-03
DECISION: Phase 6 company onboarding and profiles are
built on Atomic CRM v1.5, not a bespoke schema.
CONTEXT: D44 specified custom tables (company_profiles,
person_profiles, connections). This contradicts the
confirmed Phase 6 direction (RESEARCH entry 2026-04-02)
to use Atomic CRM as the bid workspace foundation.
Building a parallel CRM schema would duplicate Atomic
CRM's company, contact, and deal entities.
OUTCOME:
- Fork marmelab/atomic-crm
- Swap Supabase for Neon (same Postgres as tenders)
- Atomic CRM company entity = RFP.quest company profile
- Atomic CRM contact entity = person profiles + buyers
- Atomic CRM deals = bid pipeline (add tender_id FK)
- HITL onboarding populates Atomic CRM company +
  contact records via agent, not custom tables
- Tavily scrape pre-fills Atomic CRM company fields
- Companies House API verifies company record
- Domain uniqueness enforced on company entity
- Neon Auth for JWT — Atomic CRM auth layer on top
- Network/connections layer (D44) added in Phase 7
  on top of Atomic CRM's contact graph
D44 custom schema tables are SUPERSEDED by Atomic CRM
entities for company, person, and deal data.
D44 network model, onboarding flow, and gate tests
remain valid — only the schema implementation changes.
REVERSIBLE: Yes — can extract to custom schema if
Atomic CRM fork proves too constraining.

## D46 — DATE: 2026-04-03
DECISION: RFP.quest bid pipeline has three opportunity
types, all managed as deal objects in Atomic CRM.
CONTEXT: Not all commercial opportunities are formal
tenders. UK procurement includes direct awards,
framework call-offs, and relationship-led deals that
never appear in Contracts Finder or Find a Tender.
OPPORTUNITY TYPES:
1. Live tender — auto-created from matched OCDS notice.
   tender_id FK populated. Deadline and value known.
2. Known target — user creates manually. Company and
   opportunity exist, no tender notice yet. When a
   matching tender appears, auto-merges with existing
   deal object.
3. Relationship deal — no tender will ever exist.
   Direct award or framework call-off. Pure CRM deal.
DEAL OBJECT FIELDS (additions to Atomic CRM deals):
- tender_id (nullable FK → tenders table)
- source: "tender"|"manual"|"framework"
- stage: Identified→Qualifying→Bidding→Submitted→Won/Lost
- win_probability (AI-generated, 0-100)
- decision_makers (contacts array)
- usps (jsonb — bid-specific selling points)
- competitor_intel (jsonb)
- documents (FK → document_vault)
OUTCOME: Every commercial opportunity, regardless of
source, lives as a unified deal object with full
pipeline tracking, decision maker mapping, and
document management.
REVERSIBLE: Yes.

## D47 — DATE: 2026-04-03
DECISION: Decision maker discovery via Tavily + Trigify
with LinkedIn outreach drafting.
CONTEXT: Winning UK public sector contracts requires
knowing and influencing the right people before the
tender is published. Post-publication relationship
building is too late for most contracts.
FLOW:
1. Deal object created (tender or manual)
2. Agent identifies buyer organisation
3. Tavily scrapes buyer website — finds procurement
   team, category managers, heads of department
4. Trigify MCP signals job changes, LinkedIn activity
   at target buyer organisations
5. Agent drafts personalised LinkedIn connection
   request referencing shared procurement context
6. Contact logged in Atomic CRM against the deal
7. Relationship stage tracked: Unknown→Connected→
   Meeting→Engaged→Advocate
TRIGIFY: Already connected as MCP server.
Use for job-change signals and LinkedIn activity.
DO NOT scrape LinkedIn directly — use Trigify signals
and user-provided URLs only.
REVERSIBLE: Yes.

## D48 — DATE: 2026-04-03
DECISION: Company USP and key selling points stored
at two levels — company and bid.
CONTEXT: A company's core strengths are consistent
(ISO certifications, years of experience, sector
expertise). But bid-specific selling points vary
per opportunity. Both need to be stored and combined
when the agent drafts bid content.
COMPANY LEVEL (set during onboarding, editable):
- Core USPs (text array)
- Differentiators vs competitors
- Key past wins (structured: buyer, value, outcome)
- Certifications and frameworks
- Sector expertise narrative
BID LEVEL (set per deal, agent-assisted):
- Specific relevance to this buyer/contract
- Team members assigned to this bid
- Specific past experience relevant to this CPV
- Pricing strategy notes
- Risk factors identified
AGENT BEHAVIOUR: When user opens a deal, agent
automatically drafts bid-level USPs by combining
company profile + tender requirements + past wins
in same CPV/sector. User refines and confirms.
REVERSIBLE: Yes.

## D49 — DATE: 2026-04-03
DECISION: Kanban pipeline dropped. Product is a team
skills graph and bid intelligence network.
CONTEXT: Atomic CRM's Kanban was added as a default
assumption. No user has requested it. The genuinely
differentiated feature is the team skills graph —
a 3D force-directed visualization of individual skills,
certifications, past wins, and CPV experience that
forms into a collective bid capability when people
join a team. No procurement software models teams.
They all model companies. This is the insight.
OUTCOME: Phase 6 pivot. Drop Kanban entirely.
Build in this order:

PHASE 6a — Foundation (unchanged):
Neon Auth, company claim by domain, Companies House
+ Tavily auto-populate, HITL onboarding, personalised
query_neon_tenders. Standard but necessary.

PHASE 6b — Individual skills graph:
Each person who joins gets a 3D force graph of
themselves. Not a profile page. A living graph.
Nodes: person, skills, certifications, past wins,
CPV categories, sectors, employers, frameworks.
Edges: person→has→skill, person→won→contract,
skill→qualifies→CPV, win→in→sector.
Technology: React Force Graph 3D (Three.js/WebGL).
Data: Zep graph DB ingests from:
  - LinkedIn URL (user-provided, Tavily scrapes)
  - Companies House history
  - User-entered past wins (structured)
  - Certifications with expiry dates
  - HITL confirmation before anything is published
The person sees themselves — their skills, experience,
and credibility — visualised for the first time as
an interconnected graph. This is unprecedented.

PHASE 6c — Team graph:
When a second person joins a company or bid team,
their graph merges with the first. The combined
graph shows:
  - Coverage: skills and CPV codes the team covers
  - Gaps: required skills/certs not yet in team
  - Strength: depth of experience per node
  - Suggested connections: people in network who
    fill the gaps (bid managers, sector specialists)
Graph changes colour and shape in real time as
team members are added. A bid manager joining
who has 5+ NHS wins in the target CPV turns the
relevant nodes green. A gap turns red.
Technology: React Force Graph 3D, Zep graph DB,
pgvector similarity for suggested connections.

PHASE 6d — Bid intelligence:
When a tender is identified (live or manual),
the agent overlays the tender's requirements
onto the team graph:
  - Which team nodes satisfy which requirements
  - Which gaps must be filled before bidding
  - Suggested external specialists to recruit
  - LinkedIn outreach drafted via Trigify MCP
  - Past win nodes in same CPV highlighted
  - "Teams that win contracts like this have X"
This is the shock-and-awe moment: a person sees,
possibly for the first time ever, exactly how their
skills and team connect to a specific contract
opportunity. Not a score. A graph.

ATOMIC CRM: Use data model only (contacts, companies).
Do not fork or host Atomic CRM application.
Copy Postgres schema patterns into Neon directly.
Use shadcn/ui components as reference, not dependency.
No separate Atomic CRM deployment.

ZEP: Graph database for entity relationships.
Person, skill, certification, win, CPV, sector,
buyer, framework — all as Zep entities.
Relationships between them as Zep edges.
Query: "find people whose skill graph overlaps
with this tender's CPV requirements by >70%"

REACT FORCE GRAPH 3D: Frontend visualisation.
github.com/vasturiano/react-force-graph
Three.js/WebGL, interactive, supports 3D node/edge
graph with click, hover, zoom, rotation.
Node colours encode: person, skill, win, gap, match.
Edge thickness encodes relationship strength.

DO NOT build Kanban.
DO NOT build pipeline stages.
DO NOT build document vault before graph is working.
DO NOT start Phase 6b until Phase 6a gate tests pass.
REVERSIBLE: Yes — Kanban can be added later if
users request it. Graph cannot be easily removed
once it becomes the product identity.

## D50 — DATE: 2026-04-03
DECISION: Career graph — a lifetime of bid outcomes
visualised as an intertwined win/loss trajectory.
Not a CV. Not a LinkedIn profile. A truthful record
of a procurement career including failures, pivots,
supporting roles, and the path between them.
CONTEXT: LinkedIn shows titles and dates. It hides
losses, demotions in responsibility, supporting roles,
and the messy reality of how careers actually develop.
A junior SDR who contributed to a £50K win in year
one, then supported a £50M win in year five as
coordinator, then led a £2M win as bid manager in
year seven has a richer story than any CV captures.
Losses are as important as wins — they show domain
exposure, resilience, and experience in specific CPV
categories regardless of outcome.

THE CAREER GRAPH STRUCTURE:
Each bid outcome is a node. Nodes are connected
chronologically and by relationship type, forming
two intertwined threads:

WIN THREAD — upward arc, solid nodes:
- Sized by contract value
- Coloured by CPV category / sector
- Role shown as node annotation
- Connected sequentially: junior→senior→lead→advisor

LOSS THREAD — parallel arc, hollow nodes:
- Same sizing and colouring as wins
- Losses do not diminish the graph — they enrich it
- A loss in the same CPV as a win shows persistence
- A loss that preceded a win tells the learning story
- "Lost MOD cybersecurity 2019, won MOD cybersecurity
  2022 — we learned what they actually wanted"

THE INTERTWINING:
Win and loss threads are not separate timelines.
They weave. A person who won a small deal, lost a
large one in the same sector, pivoted to a support
role on a giant win, then returned as lead on a
medium win — that arc is visible as a braided path.
Wins and losses in the same CPV category cluster
together, connected by edges labelled with time gap
and role progression.

ROLE EVOLUTION IS A THIRD DIMENSION:
Role on each bid (from taxonomy) shown as Z-axis
or node depth in the 3D graph:
- Coordinator / support: closer to viewer (front)
- Technical Author / SME: mid-depth
- Bid Manager / Commercial Lead: deeper
- Rainmaker / Executive Sponsor: deepest (back)
A career that starts front (support) and moves back
(strategic) over time is visible as a trajectory
moving away from the viewer — depth as seniority.

ROLE TAXONOMY:
- Rainmaker: relationship, access, opened the door
- Bid Manager: orchestrated response, owned timeline
- Technical Author: wrote solution/methodology
- Commercial Lead: pricing, risk, commercial terms
- Coordinator: portal management, submissions, admin
- Subject Matter Expert: specific technical sections
- Executive Sponsor: sign-off, relationship credibility
- Delivery Lead: post-award credibility

HITL ONBOARDING — conversational, never a form:
Agent opens with: "Tell me about a bid you remember
— win or loss, big or small, any role you played."
Person tells the story naturally.
Agent extracts: contract name, buyer, approximate
value, year, outcome, role, contribution in their
own words. Maps CPV automatically. Confirms.
Saves to Zep as entities and edges.
Agent then: "Tell me another — maybe one you lost,
or one where you were supporting someone else."
This continues until person stops. Even two entries
create a visible graph. The graph grows over time
as person adds more.
Losses explicitly encouraged: "Losses count just
as much — they show where you've been and what
you learned."

COMPARATIVE VISUALIZATION:
When two people's career graphs are viewed together
(same team, same bid):
- Overlapping CPV wins cluster and glow
- Complementary roles shown as connecting bridges
- One person's loss in a CPV where another won
  creates a "learned from" edge — experience without
  the scar
- Gaps visible as empty space between the two graphs
  where no team member has experience

AGAINST A LIVE TENDER:
When a tender is identified, the team's combined
career graph is overlaid with the tender's CPV
requirements, value range, and buyer type:
- Nodes that match pulse or change colour
- Losses in the same CPV highlighted as domain
  experience even without wins
- Role gaps shown explicitly: "No Rainmaker with
  NHS experience on this team"
- "The last 3 teams that won this type of contract
  had at least one person with a win in CPV 72000000
  (IT services) over £1M. Your team has two."

PRIVACY AND CONTROL:
All data is user-entered and user-controlled.
User can mark any node private (team-only visibility).
User can export their career graph as a PDF or
interactive HTML at any time.
Nothing scraped without explicit URL consent.
REVERSIBLE: Yes — nodes deletable by user at any time.

TECHNOLOGY:
React Force Graph 3D for visualisation (Three.js/WebGL)
Zep graph DB for entity storage and relationship queries
pgvector for similarity matching (team → tender CPV)
HITL via CopilotKit for onboarding conversation