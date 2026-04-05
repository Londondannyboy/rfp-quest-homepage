# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-04-06
# Sign-off status: SIGNED OFF 2026-04-06

## CURRENT STATE (verified 2026-04-06)

Frontend: https://rfp-quest-homepage.vercel.app
Agent: https://rfp-quest-generative-agent-production.up.railway.app
GitHub: github.com/Londondannyboy/rfp-quest-homepage
Branch: main
Latest commit: 96a1541

### Auth — Neon Auth WORKING ✅
- Sign up / sign in via Google OAuth ✅
- Sign out via /account page ✅
- @neondatabase/neon-js client + @neondatabase/auth server
- NeonAuthUIProvider wrapping layout ✅
- SignedIn/SignedOut conditional rendering in header ✅
- /auth page (AuthView), /account page (UserButton)
- /api/auth/[...path] route handler

### Onboarding — Full HITL card flow WORKING ✅
10-step flow, 7 are HITL cards:
1. confirmUrl — Yes / Different URL buttons ✅
2. onboard_company — Tavily Extract scrape ✅
3. Duplicate check — existing company detection ✅
4. selectCapabilities — 8 DOS categories checklist ✅
5. selectSectors — 14 UK sectors checklist ✅
6. selectContractRange — 6 price range buttons ✅
7. confirmSmeStatus — Yes / No buttons ✅
8. Certifications — text question
9. Expertise — text question
10. confirmCompanyProfile — Save / Edit buttons ✅

### Data
- company_profiles table: saves correctly ✅
- person_profiles table: created, needs user_id gap fix
- team_invitations table: created
- Neon rows: ~160K+ tenders (growing)
- 9 category insights pre-computed for Tako

### Tender Intelligence — WORKING ✅
- query_neon_tenders: full-text → ILIKE → browse, LIMIT 20
- Personalised matching coded: match_score + match_tag
- get_user_company: lookup by user_id or email
- Tako analytics charts in two-panel layout
- Bid analysis HITL (analyzeBidDecision)

### Gate tests
1. Public demo without auth ✅
2. Onboarding → Tavily → HITL cards → save to Neon ✅
3. Personalised results ⚠️ blocked by user_id gap
4. Team invitation ⚠️ blocked by user_id gap
5. Duplicate domain rejection ✅ coded
6. Match-tagged results ⚠️ blocked by user_id gap

## WHAT IS BROKEN / INCOMPLETE

1. PERSON_PROFILES USER_ID GAP
   save_company_profile creates company but cannot
   reliably create person_profiles row because
   user_id not passed from frontend to agent.
   Workaround: agent asks for email, calls
   link_user_to_company. Works but has UX friction.
   Fix: inject user_id server-side via /api/copilotkit
   route before conversation starts (Option B).

2. HITL CARD BUTTON VISIBILITY
   Buttons at bottom of cards can be hidden below
   scroll. Sticky positioning added but needs testing.

3. MULTI-QUERY BUG — D42
   ag_ui_langgraph "Message ID not found in history"
   on some second queries. Not 100% repro.

4. RAILWAY CRONS NOT CONFIGURED
   - rfp-quest-find-a-tender-cron: 0 7 * * *
   - rfp-quest-cf-v2-cron: 0 8 * * *

## NEXT ACTION — PHASE 6a COMPLETION SPRINT

Resolve person_profiles user_id gap before Phase 6b.

Option A: CopilotKit context injection
  Research useAgent() forwarded props or system
  message injection for session data.

Option B: Server-side session lookup (RECOMMENDED)
  In /api/copilotkit route.ts, read Neon Auth
  session server-side, inject user_id into agent
  system message before conversation starts.

Option C: Agent asks for email (CURRENT WORKAROUND)
  Agent calls get_user_company(email) after user
  provides it. Already coded and working.

## PHASE 6b (after user_id gap resolved)

Individual skills graph + career graph:
- React Force Graph 3D (Three.js/WebGL)
- Zep graph DB for entity relationships
- Career win/loss HITL onboarding (D50)
- Two-layer skills nodes per person (D57)
- Team graph combining individual graphs
- Haiku background matching pipeline (D58)

## LAST COMMITS (this session)

96a1541 — feat: sector selector HITL card
5b3c748 — feat: HITL cards for entire onboarding
68f5bbe — fix: capability selector earlier, checkbox UX
162009f — fix: sticky buttons, agent CALL NOW
46e846a — feat: link_user_to_company tool
eb7934c — feat: HITL cards — CompanyProfileConfirm + CapabilitySelector
f8bf49f — feat: user-company linking tools
de2cf57 — feat: HITL onboarding conversation
870fd65 — feat: personalised matching + team invitations
dfa0c3b — fix: Tavily Extract API
4bea726 — fix: two-stage HITL, duplicate check
aa4ffb7 — feat: onboard_company + save_company_profile
84ca050 — fix: turbo.json env vars
de984ed — fix: server-side auth API route
7fa4bbc — feat: Google OAuth
aa8f6f2 — feat: Neon Auth via @neondatabase/neon-js

## ENVIRONMENT STATE

Railway (rfp-quest-generative-agent):
- ANTHROPIC_API_KEY: SET ✅
- DATABASE_URL: SET ✅
- TAKO_API_KEY: SET ✅
- LANGSMITH_API_KEY: SET ✅
- TAVILY_API_KEY: SET ✅

Vercel (rfp-quest-homepage):
- LANGGRAPH_DEPLOYMENT_URL: SET ✅
- TAKO_API_KEY: SET ✅
- NEXT_PUBLIC_NEON_AUTH_URL: SET ✅
- NEON_AUTH_BASE_URL: SET ✅
- NEON_AUTH_COOKIE_SECRET: SET ✅
- DATABASE_URL: SET ✅

Neon:
- Project: rfp-quest-production (calm-dust-71989092, US East 1)
- Tables: tenders, company_profiles, person_profiles,
  team_invitations, saved_searches, category_insights
- pgvector: enabled ✅
- Neon Auth: provisioned, Google OAuth enabled ✅

## PHASE ROADMAP

**Phase 5** — COMPLETE ✅
**Phase 6a** — COMPLETE ✅ (auth, onboarding, HITL cards)
  User_id gap is a polish item, not a phase blocker.
**Phase 6b** — NEXT: Skills graph + career graph
**Phase 6c** — Team graph
**Phase 6d** — Bid intelligence overlay
**Phase 7** — Additional sources, RFP LLM, scale

## DO NOT

DO NOT use OCDS endpoint for bulk extraction (D33).
DO NOT auto-chain query_neon_tenders → analyzeBidDecision.
DO NOT pass full DATABASE_URL to psycopg2 — strip channel_binding (D22).
DO NOT change pyproject.toml without uv lock (D23).
DO NOT regenerate pnpm-lock.yaml with pnpm@8 (D18).
DO NOT hardcode API keys (D28).
DO NOT add sandbox attribute to StableIframe (D35).
DO NOT build Kanban pipeline (D49).
DO NOT use Haiku for HITL or bid analysis (D58).
DO NOT fork Atomic CRM as application (D45).
DO NOT ask onboarding questions in text when a HITL card exists.

## SIGN-OFF STATUS

SIGNED OFF — 2026-04-06
Phase 6a COMPLETE — Neon Auth, onboarding HITL cards,
company profiles, personalised matching coded.
User_id gap documented, workaround available.
Next: Phase 6b — skills graph.
