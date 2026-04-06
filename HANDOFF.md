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
3. Company header renders within 2 seconds on page load ✅
4. Personalised results with match_score/tag ✅
5. Team invitation flow ✅
6. Duplicate domain rejection ✅
7. getUserContext returns full company context ✅

## WHAT IS BROKEN / INCOMPLETE

1. PERSON_PROFILES USER_ID GAP - RESOLVED 2026-04-06
   Fixed via getUserContext frontend tool that returns
   full user and company context from client-side auth.
   No more unreliable [SYSTEM CONTEXT] message parsing.
   getUserContext returns email, user_id, company_id,
   company_name, sectors, is_sme directly to agent.
   get_user_company no longer needed for session init.

2. HITL CARD BUTTON VISIBILITY
   Buttons at bottom of cards can be hidden below
   scroll. Sticky positioning added but needs testing.

3. MULTI-QUERY BUG — D42
   ag_ui_langgraph "Message ID not found in history"
   on some second queries. Not 100% repro.

4. RAILWAY CRONS NOT CONFIGURED
   - rfp-quest-find-a-tender-cron: 0 7 * * *
   - rfp-quest-cf-v2-cron: 0 8 * * *

## NEXT ACTION — PHASE 6b: INDIVIDUAL SKILLS GRAPH

Read DECISIONS.md D49, D50, D57, D58, D60
before writing any code.

OBJECTIVE:
Each person who joins RFP.quest sees their
own 3D force graph — skills, certifications,
past wins, and CPV categories as interactive
nodes. This is the headline product feature.

PREREQUISITES (resolve before Phase 6b starts):
1. Resolve user_id gap (D60) via Option B:
   In /api/copilotkit route.ts, read Neon Auth
   session server-side and inject user_id into
   agent context before conversation starts.
   Verify person_profiles row is created on
   onboarding save before proceeding.

STACK:
- React Force Graph 3D (vasturiano/react-force-graph)
  Install: pnpm add react-force-graph-3d
  three.js already in project — compatible
- Zep Cloud for graph entity storage
  Install: pnpm add @getzep/zep-cloud (agent)
  ZEP_API_KEY needed in Railway env vars
- Neon for person_profiles source data
  (already exists — extend, don't replace)
- Claude Haiku for background classification (D58)
  Add ANTHROPIC_HAIKU_MODEL=claude-haiku-4-5
  to Railway env vars

PHASE 6b PARTS:

PART 1 — Zep entity schema:
For each person, create Zep entities:
  Person node: user_id, name, email, company
  Skill nodes: each DOS capability selected
  Certification nodes: each cert entered
  Expertise nodes: layer2 free text parsed
  CPV nodes: inferred from sectors + expertise
Edges: person→has→skill, person→holds→cert,
  skill→maps_to→CPV
Tool: sync_person_to_zep(user_id) — called
  after save_company_profile completes.

PART 2 — Career win/loss HITL onboarding (D50):
New HITL tool: addBidOutcome
Agent asks conversationally: "Tell me about a
bid you remember — win or loss, big or small."
Extracts: contract name, buyer, value, year,
  outcome (win/loss), role, contribution.
Maps CPV automatically from description.
HITL card confirms details before saving.
Each outcome becomes a node in Zep:
  Win node (solid) or Loss node (hollow)
  Edges: person→won/lost→contract,
  contract→in→CPV, contract→for→buyer
Repeat: "Tell me another?" until user stops.
Even 2 entries create a visible graph.

PART 3 — React Force Graph 3D component:
New page: /graph/[user_id]
Component: PersonGraph.tsx
Data: fetch from Zep via API route
  /api/graph/[user_id] → returns nodes + edges
Node types with distinct colours:
  Person (blue, large, centre)
  Skill (purple, medium)
  Certification (gold, medium)
  Win (green, solid, sized by value)
  Loss (red, hollow, sized by value)
  CPV (grey, small)
  Buyer (teal, small)
Edge types with distinct styles:
  has (thin, grey)
  holds (thin, gold)
  won (thick, green)
  lost (thick, red, dashed)
  maps_to (thin, grey, dashed)
Interactive: click node for details panel,
  hover for label, zoom/rotate/pan.
Render in the left panel (same position as
  Tako charts — reuse two-panel layout).

PART 4 — Graph in chat flow:
When user completes onboarding or adds a bid
  outcome, show their graph automatically.
Agent: "Here's your skills graph — it shows
  how your capabilities connect."
Graph renders in the left panel.
Tool: show_person_graph(user_id) — triggers
  the left panel to load /graph/[user_id].

PART 5 — Two-layer skills display (D57):
Each skill node has two layers:
  Layer 1 (outer ring): formal taxonomy
    (DOS category, CPV code, certification)
  Layer 2 (inner glow): real-world expertise
    (free text parsed into keywords)
Node tooltip shows both layers on hover.
Layer 2 nodes connect to Layer 1 parents
  via "specialises" edges.

GATE TESTS FOR PHASE 6b:
1. Complete onboarding → graph appears with
   skills, certs, sectors as nodes ✅
2. Add a win → green node appears in graph ✅
3. Add a loss → red hollow node appears ✅
4. Click a node → details panel shows info ✅
5. Two-layer display: hover shows formal +
   real-world labels ✅
6. Graph persists across sessions (Zep) ✅

DO NOT build team graph in Phase 6b.
DO NOT build bid intelligence overlay in 6b.
DO NOT build competitor graph in 6b.
Those are Phase 6c, 6d, and Phase 7.

REPORT after each PART. Do not proceed to
next PART without confirming previous working.

WHEN PHASE 6b IS COMPLETE:
Update HANDOFF.md NEXT ACTION for Phase 6c.
Phase 6c is the team graph:
- Merge individual graphs when people join
  a company or bid team
- Coverage, gaps, strength visualised
- Suggested connections to fill gaps
Do not start 6c until 6b gate tests pass.

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
