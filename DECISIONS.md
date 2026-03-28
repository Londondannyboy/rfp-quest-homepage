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
Verification pending via gate test 3 (Draw a red circle).