# HANDOFF.md
Session Date: 2026-04-17

## CURRENT STATE

### Deployment URLs
- **Frontend**: https://rfp-quest-homepage.vercel.app
- **Agent**: https://rfp-quest-generative-agent-production.up.railway.app  
- **GitHub**: https://github.com/Londondannyboy/rfp-quest-homepage
- **Branch**: main
- **Latest commits**: 2fc730b, c6cade9, 75bcffb (value fix deployed)

### Phase 6b COMPLETE ✅
All three parts verified in production:

1. **getUserContext frontend tool** ✅
   - Returns `{ authenticated, email, user_id, company_id, company_name, sectors, is_sme }`
   - Uses client-side `authClient.getSession()` + `/api/company-context` Neon query
   - Agent never asks for email when authenticated
   - No more [SYSTEM CONTEXT] message parsing

2. **Company dashboard header** ✅
   - Renders immediately on page load from React state
   - Shows company name, SME status, sectors
   - No agent interaction required

3. **Skills graph visualization** ✅
   - React Force Graph 3D at `/graph/[user_id]`
   - Live in production: `/graph/c161a50e-b713-4abc-8d43-d652e8be1b96`
   - Works for all authenticated users via Railway agent /graph/{user_id} endpoint
   - Calls zep.graph.search() for real Zep data, no hardcoded branches
   - Dark theme, interactive 3D, click to focus
   - Node types: person (blue), company (teal), sector (purple), wins (green)

### Working Features
- **Zep integration**: `sync_person_to_zep` and `add_bid_outcome` tools ✅
- **Bid outcome HITL card**: Green/red styling, confirm/cancel buttons ✅
- **Zep graph**: `rfp-quest-skills` populated with real data ✅
- **Tako analytics**: Charts render in left panel ✅
- **Neon Auth**: Google OAuth sign-in/out ✅
- **Company onboarding**: Full HITL flow with 7 cards ✅
- **Tender search**: Query with match scoring ✅

### Environment Variables

**Vercel** (confirmed set):
- `LANGGRAPH_DEPLOYMENT_URL`
- `TAKO_API_KEY`
- `NEXT_PUBLIC_NEON_AUTH_URL`
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `DATABASE_URL` (Neon PostgreSQL)

**Railway** (agent service):
- `ANTHROPIC_API_KEY`
- `DATABASE_URL`
- `TAKO_API_KEY`
- `LANGSMITH_API_KEY`
- `TAVILY_API_KEY`
- `ZEP_API_KEY`
- `ZEP_GRAPH=rfp-quest-skills`

## WHAT IS BROKEN / INCOMPLETE

1. **Graph not embedded in main chat**
   - Currently only accessible at `/graph/[user_id]` directly
   - Should render in left panel like Tako charts

2. **Agent graph navigation**
   - Agent tells user to visit URL manually
   - Should auto-navigate or embed after sync

3. **Haiku tags not yet run** — Level 4 taxonomy (micro-niche tags) needs LLM pass (~$18)
4. **"Other" sector at 22.8%** — needs Haiku tags or keyword refinement to drop below 10%
5. **tender_scores and tender_embeddings tables empty** — schema exists, populate in future session

## Phase 6c — COMPLETE ✅ (2026-04-17)

**SEO Sector Pages Implemented & Fixed** (12 pages live):

Six enrichment tables live:
- supplier_lookup: 1,000 raw → 762 canonical, 117 strategic suppliers, group_name rollup
- buyer_lookup: 2,000 raw → classified by parent_org, buyer_type, region
- buyer_intelligence: 1,757 records with total_contracts, sme_award_rate, top_suppliers
- tender_categories: 707K sector-classified, 664K with CPV vertical, 166K with niche
- tender_scores: schema ready (pending)
- tender_embeddings: schema ready (pending)
- Weekly cron deployed on Railway (Sunday 4am UTC)
- query_tenders.py updated with enrichment LEFT JOINs
- Raw tenders table untouched: 707,251 rows

**SEO Pages Deployed**:
- 12 sector pages at `/sectors/[slug]` (digital-technology, healthcare, construction, etc.)
- Direct PostgreSQL integration for fast SSR
- generateStaticParams for all sectors
- Comprehensive metadata and OpenGraph tags

**Critical Value Fix (86% reduction)**: 
- **Problem**: Digital & Technology was showing £3.1T, Healthcare £2.0T (inflated by framework ceilings)
- **Solution**: Capped at £1B, filtered out £999B placeholders, focused on contract/award stages
- **Result**: Digital & Technology £3.1T → £427.8B, Healthcare £2.0T → £307.7B
- **Impact**: Now showing realistic procurement values suitable for public display

## NEXT ACTION — SEO Pages Step 2 (Supplier Pages)

Sector pages are live and value fix is deployed. Proceed to supplier pages.
Read seo-pages-spec.md Step 2 before writing any code.
Run mandatory diagnosis: SELECT COUNT(*) FROM tenders; — confirm still 707,251.
Build supplier pages only. Do not start buyer pages in same session.

## Key Files Modified

```
apps/app/src/app/
├── page.tsx                              # getUserContext, company header
├── api/
│   ├── company-context/route.ts         # New - fetches company profile
│   ├── graph/[user_id]/route.ts         # New - returns Zep graph data
│   └── user-context/route.ts            # Deprecated - not needed
├── graph/[user_id]/page.tsx             # New - React Force Graph 3D
└── hooks/
    └── use-generative-ui-examples.tsx   # getUserContext frontend tool

apps/agent/
├── main.py                               # System prompt updated for getUserContext
└── src/
    ├── zep_graph.py                      # sync_person_to_zep, add_bid_outcome
    └── onboard_company.py                # Company profile management
```

## Testing URLs
- Main app: https://rfp-quest-homepage.vercel.app
- Dan's graph: https://rfp-quest-homepage.vercel.app/graph/c161a50e-b713-4abc-8d43-d652e8be1b96
- Auth: https://rfp-quest-homepage.vercel.app/auth
- Account: https://rfp-quest-homepage.vercel.app/account

## Session Notes
- getUserContext pattern is mandatory - no message injection
- Always use `pnpm add`, never `npm install` in apps/app
- DATABASE_URL must be set in Vercel for graph API to work
- React Force Graph 3D requires dynamic import with `ssr: false`
- Zep data structure: edges with source/target UUIDs + fact labels

SIGN-OFF STATUS: DRAFT (pending Claude.ai review)

## Session 2026-04-17 Summary

**Critical Issue Resolved**: Fixed massively inflated sector values that undermined credibility
- Digital & Technology: £3.1T → £427.8B (86% reduction)  
- Healthcare: £2T → £307.7B (realistic for UK gov procurement)
- Root cause: Framework ceilings & placeholder values included in calculations
- Solution: £1B cap + stage filtering + placeholder exclusion

**Phase 6c Now Fully Complete**: 12 SEO sector pages live with realistic, credible values
- All sector pages functional with proper SSR and metadata
- Cross-linking between sectors working
- Ready for public visibility

**Investigation Scripts**: Created comprehensive analysis tools for future value issues
- investigate_values.py: Problem diagnosis
- test_1b_cap.py: Solution validation  
- check_value_fields.py: Schema analysis

**Next Session Priority**: Validate deployment completion or proceed to Phase 6d team graphs.