# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-03-28
# Sign-off status: DRAFT

---

## CURRENT STATE (verified)

Frontend: https://rfp-quest-homepage.vercel.app
Status: LIVE — visualisations UNVERIFIED
CopilotKit chat input visible.
Vercel redeployed 2026-03-28 after environment variable update.

Agent backend: https://rfp-quest-generative-agent-production.up.railway.app
Status: LIVE and responding correctly
Health check verified: {"status":"ok"}
Railway project ID: c65f3508-7e52-4cde-a6f3-9cec50115b4c

GitHub: github.com/Londondannyboy/rfp-quest-homepage
Latest commit: 24a0974
"docs: add constitutional documentation suite — signed off 2026-03-28"

UK tender skill: PRESENT and DEPLOYED
Location: apps/agent/skills/uk-tenders/SKILL.md
Status: Deployed to production, ready for testing.

Documentation suite: COMPLETE and SIGNED OFF
- CLAUDE-STANDARD.md: Created and signed off 2026-03-28
- CLAUDE.md: Updated and signed off 2026-03-28
- HANDOFF.md: This document (needs final sign-off)
- DECISIONS.md: Created and signed off 2026-03-28

## WHAT IS BROKEN

**langchain-anthropic dependency was missing.**
Added to pyproject.toml but Railway not yet redeployed.
Gate tests 3-5 not yet run.
Visualisations cannot work until Railway redeploys with 
langchain-anthropic package installed.

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

Run the five gate tests to verify Phase 4 completion:

1. Test agent health locally:
   curl http://localhost:8123/health
   (Run local agent first with: cd apps/agent && uv run main.py)

2. Test production agent health:
   curl https://rfp-quest-generative-agent-production.up.railway.app/health
   Expected: {"status":"ok"}

3. Open https://rfp-quest-homepage.vercel.app
   Type: "Draw a red circle"
   Verify: Red circle appears in sandboxed iframe

4. Type: "Show me recent UK government tenders"
   Verify: Tender cards appear with real OCDS data

5. Toggle dark mode
   Verify: Iframe content adapts with CSS variables

If all tests pass, Phase 4 is complete.

## DO NOT (session-specific)

DO NOT touch langgraph-fastapi-rfp-quest repo — 
it remains frozen at commit 8462ed4.

DO NOT modify the Railway deployment — it is stable 
and correctly configured.

DO NOT change model from claude-opus-4-6 — this is 
the only model that works correctly for generative UI.

## SIGN-OFF STATUS

DRAFT — Ready for review and sign-off