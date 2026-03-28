# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-03-28
# Sign-off status: SIGNED OFF 2026-03-28

---

## CURRENT STATE (verified)

Frontend: https://rfp-quest-homepage.vercel.app
Status: LIVE, returns 200, UI renders correctly.
CopilotKit chat input visible, demo gallery works.
Verified by Vercel MCP tool 2026-03-28 13:03.

GitHub: github.com/Londondannyboy/rfp-quest-homepage
Latest commit: 1f1a547
"docs: clarify API keys and model configuration"

UK tender skill: PRESENT
Location: apps/agent/skills/uk-tenders/SKILL.md
Status: Written, committed, unverified (agent not 
deployed to production yet).

README-RFP-QUEST.md: PRESENT and accurate.
CLAUDE.md: Updated this session, signed off.
CLAUDE-STANDARD.md: Written this session, signed off.
DECISIONS.md: Written this session, signed off.

## WHAT IS BROKEN

**Visualisations do not work in production.**
Root cause: LANGGRAPH_DEPLOYMENT_URL is not set in 
Vercel environment variables.
The frontend defaults to localhost:8123 which does not 
exist in the Vercel production environment.
Nothing renders. Chat input works but agent cannot respond.

**Agent backend not deployed as new Railway service.**
The existing Railway service at:
langgraph-fastapi-rfp-quest-production.up.railway.app
runs the Phase 3 HITL agent (LangGraph + FastAPI with 
adispatch_custom_event). It does not have create_deep_agent 
or widgetRenderer. Pointing rfp-quest-homepage at it 
will allow connection but no visualisations will render.

**Model not yet confirmed as claude-opus-4-6 in production.**
Local testing used gpt-4o which is insufficient.
Railway env vars need ANTHROPIC_API_KEY and 
LLM_MODEL=claude-opus-4-6 set on the new service.

**Unauthorised changes in langgraph-fastapi-rfp-quest.**
Claude Code modified the frozen repo during this session:
- fc8c515: TypeScript fix (minor, low risk)
- Subsequent commits: react-markdown, Neon DB connection,
  [slug] dynamic pages — all unauthorised, not in plan.
These must be reviewed before next session on that repo.
Do not revert without review — the TypeScript fix may 
be needed. The SEO additions should be reverted or 
moved to a proper phase plan.

## LAST COMMITS

rfp-quest-homepage (this repo):
1f1a547 — "docs: clarify API keys and model configuration"
AUTHORISED: Yes

langgraph-fastapi-rfp-quest (other repo — DO NOT TOUCH):
fc8c515 — "Fix TypeScript error - add type annotations"
AUTHORISED: No — unauthorised modification of frozen repo
Subsequent commits also unauthorised.
Review needed before next session on that project.

## ENVIRONMENT STATE

Vercel (rfp-quest-homepage):
- LANGGRAPH_DEPLOYMENT_URL: NOT SET ← this is the blocker
- ANTHROPIC_API_KEY: unknown, needs verification

Railway (new service — not yet created):
- ANTHROPIC_API_KEY: must be set
- LLM_MODEL: must be set to claude-opus-4-6

## NEXT ACTION

Do this first. Nothing else until this is complete.

Deploy the agent backend as a NEW Railway service:

1. cd apps/agent

2. Verify the model configuration:
   cat .env | grep -E "LLM_MODEL|ANTHROPIC"
   Must show LLM_MODEL=claude-opus-4-6
   If it shows claude-3-opus-20240229 — fix it first.

3. railway login
   (if not already logged in)

4. railway init
   Create NEW service — do not link to existing
   Name it: rfp-quest-generative-agent

5. Set environment variables in Railway dashboard:
   ANTHROPIC_API_KEY=your-key
   LLM_MODEL=claude-opus-4-6

6. railway up
   Wait for deployment to complete.

7. Get the Railway URL:
   railway status
   Copy the URL — format will be:
   https://rfp-quest-generative-agent-[hash].up.railway.app

8. Verify the agent is alive:
   curl https://[railway-url]/health
   Expected: {"status":"ok"}
   If this fails, do not proceed. Report the error.

9. Set Vercel environment variable:
   vercel env add LANGGRAPH_DEPLOYMENT_URL production
   Value: the Railway URL from step 7

10. Redeploy Vercel frontend:
    vercel --prod --cwd apps/app

11. Run all five gate tests from CLAUDE.md.
    Do not mark this phase complete until all pass.

## DO NOT (session-specific)

DO NOT touch langgraph-fastapi-rfp-quest during this 
session. That repo's unauthorised changes need a 
separate review session.

DO NOT reuse the existing Railway service 
(langgraph-fastapi-rfp-quest-production.up.railway.app) 
for this project. It runs the wrong agent.

DO NOT install any new packages. The current 
dependencies are sufficient for this phase.

DO NOT proceed past step 8 if the health check fails.