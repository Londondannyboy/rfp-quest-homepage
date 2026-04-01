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