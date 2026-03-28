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

ACTIVE — Phase 4 COMPLETE

Agent backend deployed to Railway and fully functional.
Frontend connected and visualizations working in production.
Gate tests 3 and 4 passed. Phase 4 complete.

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

5. Toggle dark mode
   Expected: iframe content adapts (CSS variables work)
   Status: ⏭️ SKIPPED (non-critical, cosmetic only)

## ENVIRONMENT

Frontend production: https://rfp-quest-homepage.vercel.app
Frontend local: http://localhost:3002
Agent local: http://localhost:8123
Agent production: https://rfp-quest-generative-agent-production.up.railway.app
  Railway project: c65f3508-7e52-4cde-a6f3-9cec50115b4c

Vercel team: team_nBAZLJTbCMBi2wrIMVlsmGjZ
Vercel project: prj_tJzSjC5nfXvUisD1CmEjlXQ19KPt
GitHub: github.com/Londondannyboy/rfp-quest-homepage

Required environment variables (SET-UNVERIFIED):
- ANTHROPIC_API_KEY (Railway — SET-UNVERIFIED)
- LLM_MODEL=claude-opus-4-6 (Railway — SET-UNVERIFIED)
- LANGGRAPH_DEPLOYMENT_URL (Vercel — SET-UNVERIFIED)

OCDS API (no auth required):
https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search