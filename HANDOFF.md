# HANDOFF.md — rfp-quest-homepage
# Session date: 2026-04-03 (evening)
# Sign-off status: SIGNED OFF 2026-04-03

## CURRENT STATE (verified 2026-04-03)

Frontend: https://rfp-quest-homepage.vercel.app
Agent: https://rfp-quest-generative-agent-production.up.railway.app
GitHub: github.com/Londondannyboy/rfp-quest-homepage
Branch: main
Latest commit: 3e8ab32

### Gate tests — ALL PASSING ON PRODUCTION ✅
1. "Draw a red circle" → red circle renders ✅
2. "Show me recent UK government tenders" → 20 tender cards render ✅
3. "Analyse tender: Service Wing Demolition (RAAC)"
   → Neon lookup, HITL card renders ✅
4. "Show me NHS contract spend by year" → Tako chart renders ✅
   Two-panel layout: chart left, chat right ✅
   Second chart replaces first in same session ✅

All 4 gates tested in a SINGLE browser tab session.

### What works (verified on production 2026-04-03)
- All 4 gate tests passing in single session ✅
- Two-panel layout: chart left, chat right on desktop ✅
- Chart panel shows latest chart only (replaces on new query) ✅
- TAKO_CHART: marker text hidden via MutationObserver ✅
- RFP.quest Beta branding: header, title, explainer cards ✅
- Demo gallery: 9 real tender queries ✅
- Suggestion pills: "Recent tenders", "NHS spend", "Analyse" ✅
- Explainer cards: Find, Match, Win ✅
- Category insights: 9 categories, spend in millions GBP ✅
- query_neon_tenders: full-text → word ILIKE → browse fallback, LIMIT 20 ✅
- Cache-first for "by year" queries (<24h), live Tako for others ✅
- 101,788 Neon rows (69K FAT + 31K CF v2) ✅
- LangSmith tracing enabled (production)

### Known issues (carry forward)
- Multi-query CopilotKit bug (D42)
  ag_ui_langgraph "Message ID not found in history"
  on some second queries. Not 100% repro.
  Second Tako chart replacement works despite this.
- Tako renders table instead of bar chart for some queries
  Not controllable — Tako API chooses visualization type.
- Tako cron: 2/9 categories intermittently fail
  Previous cached embeds remain valid.
- Railway cron: 2 additional crons not configured

### Neon row counts (as of 2026-04-03)
- find-a-tender: 69,678
- contracts-finder-v2: 31,830
- ocds-cron: 187
- contracts-finder: 75 (legacy)
- ocds: 18 (legacy)
- Total: ~101,788

## WHAT IS BROKEN / INCOMPLETE

1. MULTI-QUERY BUG — D42
   ag_ui_langgraph "Message ID not found in history".
   Not 100% repro. Second Tako chart replacement works.
   Fix in Phase 5c Priority 3.

2. PRE-2024 DATA NOT LOADED
   Both loaders currently covering 2024→now only.

3. SECOND + THIRD RAILWAY CRONS NOT CONFIGURED
   - rfp-quest-find-a-tender-cron: 0 7 * * *
   - rfp-quest-cf-v2-cron: 0 8 * * *

4. WITH_RETRY WRAPPER REMOVED — D21
5. NO LOADING STATES — Phase 5c Priority 3
6. NO GRACEFUL ERROR UI — Phase 5c Priority 3
7. NO SSR TENDER FEED — Phase 5b

## NEXT ACTION — PHASE 6a

Read DECISIONS.md D44 through D58 before writing
any code. The full product vision is documented
there. Phase 6a delivers foundation only.

OBJECTIVE:
A real user can sign up, claim their company,
get an auto-populated profile from Companies House
and Tavily, confirm via HITL, and immediately see
personalised tender results filtered to their profile.

DO NOT BUILD IN PHASE 6a:
- Skills graph (Phase 6b)
- Haiku matching pipeline (Phase 6b)
- Bid pipeline (Phase 6b/6c)
- Career win/loss graph (Phase 6b)
- Kanban (dropped — see D49)

STACK CONSTRAINTS:
- Neon Auth for JWT — no Auth0, no Clerk, no Supabase
- Neon database (calm-dust-71989092) for all data
- Next.js 16 existing frontend — add pages, not repos
- CopilotKit v2 HITL for onboarding conversation
- Claude Opus 4.6 for the onboarding agent
- Claude Haiku for background classification (D58)
- Tavily MCP already connected — use for Tavily calls
- Companies House API — free, no auth required
  Base: https://api.company-information.service.gov.uk
  Search: GET /search/companies?q={query}
  Company: GET /company/{company_number}
  Officers: GET /company/{company_number}/officers
- DO NOT fork or install Atomic CRM as application
  Use its schema patterns as reference only (D45)

PART 1 — DATABASE SCHEMA:
Run via Neon MCP on project calm-dust-71989092.

CREATE TABLE company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  companies_house_number text,
  name text NOT NULL,
  region text,
  registered_address jsonb,
  sic_codes jsonb DEFAULT '[]',
  cpv_codes jsonb DEFAULT '[]',
  sectors jsonb DEFAULT '[]',
  min_contract_value integer,
  max_contract_value integer,
  is_sme boolean DEFAULT false,
  certifications jsonb DEFAULT '[]',
  frameworks jsonb DEFAULT '[]',
  layer1_capabilities jsonb DEFAULT '[]',
  layer2_expertise text,
  description text,
  logo_url text,
  website text,
  linkedin_url text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE person_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  company_id uuid REFERENCES company_profiles(id),
  role text DEFAULT 'member',
  display_name text NOT NULL,
  job_title text,
  email text,
  linkedin_url text,
  bio text,
  layer1_capabilities jsonb DEFAULT '[]',
  layer2_expertise text,
  specialisms jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES company_profiles(id),
  invited_by uuid REFERENCES person_profiles(id),
  email text NOT NULL,
  role text DEFAULT 'member',
  token text UNIQUE NOT NULL,
  accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days'
);

Verify all three tables created before Part 2.

PART 2 — NEON AUTH:
Follow https://neon.tech/docs/guides/neon-auth
Install: cd apps/app && pnpm add @neondatabase/auth
- Unauthenticated users → public demo (existing UI)
- First login → /onboarding
- Subsequent logins → /dashboard
- JWT contains: user_id, company_id, role
Verify sign up creates person_profiles row.

PART 3 — ONBOARDING TOOL:
New file: apps/agent/src/onboard_company.py
Tool: onboard_company(domain: str) -> dict
Steps:
1. Search Companies House API by domain/name
2. Fetch company details, SIC codes, address
3. Map SIC codes to CPV codes (static lookup,
   query Neon first for top 50 SIC codes in data)
4. Tavily scrape of domain for description/services
5. Merge and return pre-populated profile dict
Add to agent tools list in main.py.
Test: onboard_company("nhs.uk") returns dict.

PART 4 — HITL ONBOARDING CONVERSATION:
Add to agent system prompt in main.py.
Six conversational questions after HITL confirmation:
Q1: Contract types / sectors
Q2: Contract size range
Q3: SME status
Q4: Certifications and frameworks
Q5: DOS Layer 1 capabilities (HITL checklist)
Q6: Layer 2 free-text expertise
Final HITL card → confirm → save_company_profile
tool writes to Neon → redirect to /dashboard.

PART 5 — PERSONALISED TENDER RESULTS:
Update query_neon_tenders in query_tenders.py.
Accept optional company_id parameter.
If provided: filter by CPV/sector/value/SME,
score 0-100 match strength, tag results:
Strong match (green), Possible match (amber),
Outside profile (grey, shown below matches).

PART 6 — TEAM INVITATION:
Tool: invite_team_member(email, company_id,
invited_by_user_id, role) -> dict
Page: /join/[token] in Next.js
Validates token, creates person_profiles row,
links to company, redirects to /dashboard.

GATE TESTS (all must pass on production):
1. Public demo visible without auth ✅
2. Sign up → onboarding → Companies House + Tavily
   populate → HITL confirm → profile in Neon ✅
3. Dashboard shows filtered tagged tender results ✅
4. Team invitation → second user joins company ✅
5. Duplicate domain rejected with clear error ✅
6. "Show me recent tenders" returns match-tagged
   results based on company profile ✅

REPORT after each PART. Do not proceed to next
PART without confirming previous PART working.
Do not mark Phase 6a complete until all 6 gate
tests pass on production.

WHEN PHASE 6a IS COMPLETE:
Update HANDOFF.md NEXT ACTION for Phase 6b.
Phase 6b is the individual skills graph:
- React Force Graph 3D visualisation
- Zep graph DB for entity relationships
- Career win/loss HITL onboarding
- Two-layer skills nodes per person
- Team graph combining individual graphs
Do not start Phase 6b until Phase 6a gate
tests confirmed passing on production.

## LAST COMMITS (this session — all authorised)

3e8ab32 — feat: rebrand explainer cards — Find, Match, Win
e064453 — fix: replace CopilotKit suggestion pills with real tender queries
2737a5e — feat: rebrand to RFP.quest Beta — real demo queries
4018737 — fix: hide TAKO_CHART marker text via MutationObserver
2bd03f5 — feat: two-panel layout — chart left, chat right
013a90a — docs: second Tako chart replacement verified
fac17c5 — docs: multi-query bug D42 noted
6b7a7af — docs: Phase 5c P1.7 complete
88930b9 — fix: Tako charts — spend-only CSV in millions GBP
857b9fb — fix: Tako category questions — bar chart format
b63c49f — fix: chart panel UX — latest only, spend, hide marker
53aedc1 — docs: D42 — multi-query bug is product blocker
443c735 — fix: query_neon_tenders — word ILIKE + browse + LIMIT 20

## ENVIRONMENT STATE

Railway (rfp-quest-generative-agent):
- ANTHROPIC_API_KEY: SET ✅
- DATABASE_URL: SET ✅
- TAKO_API_KEY: SET ✅
- LANGSMITH_API_KEY: SET ✅

Vercel (rfp-quest-homepage):
- LANGGRAPH_DEPLOYMENT_URL: SET ✅
- TAKO_API_KEY: SET ✅

Neon:
- Project: rfp-quest-production (calm-dust-71989092, US East 1)
- Table: tenders (~101,788 rows, growing)
- pgvector: enabled ✅

Railway cron services:
- rfp-quest-cron-job: 0 6 * * * ✅
- rfp-quest-find-a-tender-cron: NOT CONFIGURED ❌
- rfp-quest-cf-v2-cron: NOT CONFIGURED ❌

## PHASE ROADMAP

**Phase 5c Priority 1** — COMPLETE ✅
**Phase 5c Priority 1.5** — COMPLETE ✅ (101K rows)
**Phase 5c Priority 1.6** — COMPLETE ✅ (Tako working)
**Phase 5c Priority 1.7** — COMPLETE ✅ (category insights, all gates passing)
**Phase 5a** — COMPLETE ✅ (RFP.quest Beta rebrand, two-panel layout)
**Phase 5c Priority 2** — DEFERRED (instant tender card)
**Phase 5c Priority 3** — DEFERRED (loading states + multi-query fix D42)
**Phase 5b** — DEFERRED (SSR tender feed)
**Phase 6** — NEXT: Team skills graph + bid intelligence (D49)
**Phase 7** — Additional sources + messaging + scale

## DO NOT

DO NOT use OCDS endpoint for bulk extraction — use REST v2 (D33).
DO NOT auto-chain query_neon_tenders → analyzeBidDecision.
DO NOT pass full DATABASE_URL to psycopg2 — strip channel_binding (D22).
DO NOT change pyproject.toml without uv lock (D23).
DO NOT use with_retry on model in create_deep_agent (D21).
DO NOT regenerate pnpm-lock.yaml with pnpm@8 (D18).
DO NOT hardcode TAKO_API_KEY or LANGSMITH_API_KEY (D28).
DO NOT add sandbox attribute to StableIframe (D35).
DO NOT use fresh-tabs-per-query as a workaround for multi-query bug (D42).

## SIGN-OFF STATUS

SIGNED OFF — 2026-04-03
Phase 5a COMPLETE — RFP.quest Beta rebrand deployed.
Phase 5c Priority 1.7 COMPLETE — all 4 gate tests passing.
Two-panel layout deployed. Second chart replacement verified.
Next: Phase 6 — Company profile + personalised matching.
