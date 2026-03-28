# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-03-28
# Sign-off status: DRAFT

---

## CURRENT STATE (verified)

Frontend: https://rfp-quest-homepage.vercel.app
Status: LIVE — Gate test 3 PASSED (red circle renders)
Gate test 4 PARTIAL — fetch_uk_tenders runs but agent hangs on widgetRenderer.
CopilotKit chat input visible and working.

Agent backend: https://rfp-quest-generative-agent-production.up.railway.app
Status: LIVE and responding correctly with Claude Opus 4.6
Health check verified: {"status":"ok"}
Railway project ID: c65f3508-7e52-4cde-a6f3-9cec50115b4c

GitHub: github.com/Londondannyboy/rfp-quest-homepage
Latest commit: a1bcb6a
"fix: sync fetch_uk_tenders and fix widgetRenderer instructions"

UK tender skill: PRESENT and DEPLOYED
Location: apps/agent/skills/uk-tenders/SKILL.md
Status: Deployed to production, ready for testing.

Documentation suite: COMPLETE and SIGNED OFF
- CLAUDE-STANDARD.md: Created and signed off 2026-03-28
- CLAUDE.md: Updated and signed off 2026-03-28
- HANDOFF.md: This document (needs final sign-off)
- DECISIONS.md: Created and signed off 2026-03-28

## WHAT IS BROKEN

**fetch_uk_tenders tool architecture issue.**
Tool returns pre-generated HTML wrapped in JSON structure.
Agent hangs trying to extract and re-pass the HTML to widgetRenderer.
Root cause: Tool does too much (fetch + generate HTML + format JSON).
Fix needed: Return raw tender data only, let agent generate widgetRenderer HTML.

Note: The frozen repo langgraph-fastapi-rfp-quest still 
has unauthorised changes from previous session that need 
review, but this does not affect rfp-quest-homepage.

## LAST COMMITS

rfp-quest-homepage (this repo):
24a0974 — "docs: add constitutional documentation suite — signed off 2026-03-28"
AUTHORISED: Yes

langgraph-fastapi-rfp-quest (frozen repo — DO NOT TOUCH):
fc8c515+ — Multiple unauthorised changes remain
Review needed before any work on that project.

## ENVIRONMENT STATE

Vercel (rfp-quest-homepage):
- LANGGRAPH_DEPLOYMENT_URL: SET ✅
  Value: https://rfp-quest-generative-agent-production.up.railway.app
- Frontend redeployed with new environment variable

Railway (rfp-quest-generative-agent):
- ANTHROPIC_API_KEY: SET ✅
- LLM_MODEL: claude-opus-4-6 ✅
- Service live and healthy

## NEXT ACTION

Redesign fetch_uk_tenders in apps/agent/src/uk_tenders.py
to return a plain Python list of tender dicts instead of
pre-generated HTML. The agent will generate the widgetRenderer
HTML from that data using the UK tenders SKILL.md as guidance.

Steps:
1. Modify fetch_uk_tenders to return raw tender data as list
2. Remove generate_tender_html function entirely
3. Update system prompt to instruct agent to generate HTML
4. Test gate test 4 again with new architecture

## DO NOT (session-specific)

DO NOT touch langgraph-fastapi-rfp-quest repo — 
it remains frozen at commit 8462ed4.

DO NOT modify the Railway deployment — it is stable 
and correctly configured.

DO NOT change model from claude-opus-4-6 — this is 
the only model that works correctly for generative UI.

## SIGN-OFF STATUS

DRAFT — Ready for review and sign-off