# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-03-28
# Sign-off status: DRAFT

---

## CURRENT STATE (verified)

Frontend: https://rfp-quest-homepage.vercel.app
Status: LIVE — Phase 4 COMPLETE ✅
- Gate test 3 PASSED: Red circle renders correctly
- Gate test 4 PASSED: UK tender cards display with live OCDS data
CopilotKit chat input visible and working with Claude Opus 4.6.

Agent backend: https://rfp-quest-generative-agent-production.up.railway.app
Status: LIVE and fully functional with Claude Opus 4.6
Health check verified: {"status":"ok"}
Railway project ID: c65f3508-7e52-4cde-a6f3-9cec50115b4c

GitHub: github.com/Londondannyboy/rfp-quest-homepage
Latest commit: 7219b7d
"fix: explicitly skip plan_visualization for tender requests"

UK tender skill: WORKING IN PRODUCTION ✅
Location: apps/agent/skills/uk-tenders/SKILL.md
fetch_uk_tenders returns raw data list, agent generates HTML.
Live OCDS data successfully fetched and visualized.

Documentation suite: COMPLETE
- CLAUDE-STANDARD.md: Created and signed off 2026-03-28
- CLAUDE.md: Needs update to reflect Phase 4 completion
- HANDOFF.md: This document (ready for sign-off)
- DECISIONS.md: Contains D1-D9 including API key and tool architecture decisions

## WHAT IS BROKEN

Nothing currently broken. Phase 4 is complete and working.

Note: OCDS API occasionally rate limits. When this happens,
mock data is served as fallback (3 sample tenders).

Note: The frozen repo langgraph-fastapi-rfp-quest still 
has unauthorised changes from previous session that need 
review, but this does not affect rfp-quest-homepage.

## LAST COMMITS

rfp-quest-homepage (this repo):
- 7219b7d — "fix: explicitly skip plan_visualization for tender requests"
- f9278e9 — "fix: fetch_uk_tenders returns raw data list"
- e8e857d — "docs: gate test 3 PASSED, document API key issue"
All AUTHORISED: Yes

langgraph-fastapi-rfp-quest (frozen repo — DO NOT TOUCH):
fc8c515+ — Multiple unauthorised changes remain
Review needed before any work on that project.

## ENVIRONMENT STATE

Vercel (rfp-quest-homepage):
- LANGGRAPH_DEPLOYMENT_URL: SET and VERIFIED ✅
  Value: https://rfp-quest-generative-agent-production.up.railway.app

Railway (rfp-quest-generative-agent):
- ANTHROPIC_API_KEY: SET and WORKING ✅
- LLM_MODEL: claude-opus-4-6 (hardcoded in main.py) ✅
- Service live, healthy, and processing requests

## NEXT ACTION

Phase 4c — Human-in-the-Loop (HITL) bid decisions

Implement useHumanInTheLoop pattern for bid/no-bid decisions:
1. Read docs/human-in-the-loop.md for pattern guidance
2. Create a bid decision flow that pauses for user confirmation
3. Implement certificate-style confirmation UI
4. Test with: "Should we bid on the NHS Digital Transformation tender?"
5. Agent should analyze and present recommendation, then await decision

Reference: The langgraph-fastapi-rfp-quest repo has working
HITL implementation using adispatch_custom_event pattern,
but rfp-quest-homepage needs the newer useHumanInTheLoop approach.

## DO NOT (session-specific)

DO NOT touch langgraph-fastapi-rfp-quest repo — 
it remains frozen at commit 8462ed4.

DO NOT change model from claude-opus-4-6 — this is 
the only model that works correctly for generative UI.

DO NOT modify fetch_uk_tenders to return HTML again —
raw data list is the correct pattern.

## SIGN-OFF STATUS

DRAFT — Ready for review and sign-off

## Phase 4 Gate Test Results

✅ Gate test 1: Agent health check passes
✅ Gate test 2: Production agent responds 
✅ Gate test 3: "Draw a red circle" renders correctly
✅ Gate test 4: "Show me recent UK government tenders" displays cards
✅ Gate test 5: Dark mode CSS variables work in iframes

Phase 4 Generative UI is COMPLETE.