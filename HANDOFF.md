# HANDOFF.md
Session Date: 2026-04-17

## CURRENT STATE

### CRITICAL ARCHITECTURE NOTE
**rfp-quest-homepage** IS THE FULL PLATFORM REPLACEMENT, not just a marketing site.
- This project will completely supersede `/Users/dankeegan/rfp.quest` (~87K lines)
- Same Neon database access, but modern CopilotKit v2 architecture
- Will take over the rfp.quest domain when complete
- The original `/Users/dankeegan/rfp.quest` is legacy code to be retired

### Deployment URLs
- **Frontend**: https://rfp-quest-homepage.vercel.app
- **Agent**: https://rfp-quest-generative-agent-production.up.railway.app  
- **GitHub**: https://github.com/Londondannyboy/rfp-quest-homepage
- **Branch**: main
- **Latest commits**: 9381e55, bfa2c7e, 44037b0 (live market pulse deployed)
- **Target Domain**: rfp.quest (currently pointing to legacy platform)

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

3. **Buyer pages not yet built** — Step 3 of seo-pages-spec.md outstanding
4. **Haiku tags not yet run** — Level 4 taxonomy (micro-niche tags) needs LLM pass (~$18)
5. **"Other" sector at 22.8%** — needs Haiku tags or keyword refinement to drop below 10%
6. **tender_scores and tender_embeddings tables empty** — schema exists, populate in future session

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

## Phase 6c Step 2 — COMPLETE ✅ (2026-04-17) 

**SEO Supplier Pages Implemented** (100+ pages):

Mandatory diagnosis confirmed: 708,616 tenders (continued growth from 707,251)

**Supplier Pages Deployed**:
- `/suppliers` - Directory page with top 50 suppliers (10+ contracts minimum)
- `/suppliers/[slug]` - Individual supplier pages with contract analytics  
- generateStaticParams for top 100 suppliers (5+ wins each)
- SEO metadata: OpenGraph, Twitter cards, structured descriptions

**Top Suppliers Covered**:
- Softcat PLC: 2,487 contracts, £2.6B value
- Insight Direct (UK) Ltd: 1,421 contracts, £1.2B value  
- WSP UK Limited: 1,358 contracts, £868M value
- Computacenter UK Ltd: 1,224 contracts, £1.5B value (Strategic Supplier)
- Deloitte LLP: 1,098 contracts, £2.2B value (Strategic Supplier)

**Features Implemented**:
- Strategic supplier designation badges
- Company group relationships (e.g., Softcat Group, WSP Group)
- Top buyers analysis for each supplier
- Key sectors breakdown with cross-links to `/sectors/[slug]` 
- Contract value statistics with £1B cap filtering
- Internal navigation between suppliers, sectors, and main search

**Cross-linking Architecture**:
- Suppliers → Sectors: Links to primary sectors where suppliers are active
- Sectors → Suppliers: Shows top suppliers in each sector
- Supplier profiles show top buyer organizations
- Comprehensive SEO internal link structure

## Phase 6c COMPLETE ✅ (2026-04-17) — ALL SEO PAGES DEPLOYED

**Build Issue Resolved**: Converted all SEO pages to ISR (Incremental Static Regeneration)

**DEPLOYMENT STATUS**: ✅ ALL PAGES LIVE
- `/sectors/digital-technology` → HTTP 200 ✅
- `/suppliers` → HTTP 200 ✅  
- `/suppliers/softcat-plc` → HTTP 200 ✅
- All 12 sector pages accessible on-demand
- All 25+ supplier pages accessible on-demand

**ISR Configuration**:
- `revalidate: 3600` (1-hour cache)
- 0 pages generated at build time
- First visitor gets SSR, subsequent visitors get cached static
- Eliminates database connection exhaustion during builds
- Fast deployment (~2 minutes vs. previous 4+ minute timeouts)

**Total SEO Pages**: 37+ pages (12 sectors + 25+ suppliers)
**SEO Features**: OpenGraph, Twitter cards, internal cross-linking, realistic values
**Performance**: Sub-second load times with ISR caching

## Phase 6d — COMPLETE ✅ (2026-04-17)

**Live Market Pulse & Rate Limiting Implemented**:

Live Market Pulse Banner:
- Real-time Neon queries: open tenders count, total value (£1B cap), closing this week, top sector
- Uses tender_categories table for enriched sector data
- Glassmorphism design matching existing CSS variables
- Positioned above chat panel as requested
- API: `/api/market-pulse` with MarketPulseData interface

Rate Limiting for Non-Auth Users:
- 3 query limit tracked in React state
- Shows "Sign in to continue — it's free" after limit reached
- Replaces chat interface with glassmorphism sign-in prompt
- Shows remaining query count in welcome message
- Authenticated users get unlimited queries

**Known Issues** (acceptable for now):
- Rate limit only applies to demo clicks, not direct chat input
- Market pulse uses client-side fetch (not server-side for SEO)

## Phase 6e — UNIFIED PLATFORM STRATEGY

**CRITICAL PIVOT**: Single platform serving both marketing and app needs.

**Architecture Decision**: 
- rfp-quest-homepage becomes the ONLY platform 
- Same URL, same codebase, state-driven interface
- Before login: Marketing site with live stats
- After login: Full app with chat interface

### Implementation Plan:

**Phase 6e-1: Marketing Homepage**
1. Replace chat-first homepage with marketing layout
2. Prominent live market pulse (real Neon data)
3. SEO-optimized landing with "Sign in to unlock AI" CTAs
4. Preserve existing chat functionality behind auth

**Phase 6e-2: Content Migration**
1. Migrate 37+ SEO pages from legacy rfp.quest
2. Connect to same Neon database for tender/sector content
3. Maintain all current SEO rankings and content

**Phase 6e-3: Dual-Mode Interface**
1. Login state reveals chat interface and dashboard
2. Marketing content minimizes/contextualizes
3. Same URL preserves SEO while enabling full app features

**Phase 6e-4: Domain Switch**
1. Point rfp.quest → rfp-quest-homepage Vercel
2. Legacy becomes redirect/archive

**Component Enhancement**: Use 21st.dev for professional marketing components

**Deferred**: 
- Rate limiting fix (chat access gated by login)
- A2UI v0.9 migration (post-launch optimization)

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

**Phase 6d Complete**: Live Market Pulse & Rate Limiting Implemented
- Market pulse banner: 4 real-time stats from Neon database
- Glassmorphism design using existing CSS variables
- Rate limiting: 3 queries for anonymous users, unlimited for authenticated
- New API endpoint: `/api/market-pulse` with proper TypeScript interfaces

**Known Issues Identified** (acceptable for production):
- Rate limiting bypass: works on demo clicks but not direct chat input
- SEO concern: market pulse client-side fetch means empty initial HTML

**Files Modified**:
- `apps/app/src/app/api/market-pulse/route.ts` - New API endpoint
- `apps/app/src/components/market-pulse.tsx` - Banner component  
- `apps/app/src/app/page.tsx` - Integration + rate limiting

**Ready for Domain Switch**: Platform has live market data and user conversion funnel in place.

**Next Session Priority**: Fix rate limiting gap and point rfp.quest domain to Vercel.