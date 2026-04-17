# PLATFORM ARCHITECTURE BRIEF
**For Claude Desktop Review & Team Alignment**

Date: 2026-04-17  
Project: rfp-quest-homepage → RFP.quest Full Platform  
Status: CRITICAL CLARIFICATION REQUIRED

---

## EXECUTIVE SUMMARY

**rfp-quest-homepage is NOT a marketing homepage** - it is the **complete RFP.quest platform replacement** that will supersede the legacy codebase and take over the rfp.quest domain.

## ARCHITECTURE COMPARISON

### Legacy Platform (`/Users/dankeegan/rfp.quest`)
- **Lines of Code**: ~87,816 (excluding dependencies)
- **Architecture**: Next.js 15 + CopilotKit v1 + FastAPI
- **Status**: Legacy code to be retired
- **Current Domain**: rfp.quest (temporary)
- **Features**: Basic tender analysis, outdated patterns

### New Platform (`/Users/dankeegan/rfp-quest-homepage`)  
- **Lines of Code**: ~15,000+ (growing rapidly)
- **Architecture**: Next.js 15 + CopilotKit v2 + LangGraph Deep Agents
- **Status**: Full platform replacement in active development
- **Target Domain**: rfp.quest (will take over)
- **Features**: Advanced platform with modern capabilities

## PLATFORM CAPABILITIES COMPARISON

| Feature | Legacy rfp.quest | New Platform (rfp-quest-homepage) |
|---------|------------------|-----------------------------------|
| **Database** | Neon PostgreSQL | Same Neon database + enrichment tables |
| **Tender Analysis** | Basic CopilotKit v1 | Advanced CopilotKit v2 + LangGraph |
| **User Management** | Basic auth | Neon Auth + Google OAuth |
| **Company Profiles** | Limited | Full HITL onboarding + Companies House API |
| **Skills Tracking** | None | 3D force graphs + Zep graph database |
| **SEO** | Basic | 12 sector pages + comprehensive metadata |
| **Data Quality** | Basic values | Fixed inflated calculations (86% reduction) |
| **Visualizations** | Limited | Tako charts + Chart.js + Three.js |
| **Team Features** | None | Team graphs, bid intelligence, collaboration |
| **AI Pipeline** | Simple | LangGraph multi-agent with state management |

## DATA ACCESS

**CRITICAL**: Both platforms access the same Neon database:
- **Database URL**: `postgresql://neondb_owner:npg_0d2XCUrcNjJF@ep-late-moon-am8dor93-pooler.c-5.us-east-1.aws.neon.tech/neondb`
- **Tables**: 707,251 tenders + 6 enrichment tables
- **Content**: UK government procurement data (2000-2026)

The new platform has **enhanced data processing** with enrichment tables that the legacy platform lacks.

## DEVELOPMENT STRATEGY

### Phase Sequence (Current: Phase 6c Complete)
1. **Phase 6c** ✅: SEO sector pages + value calculation fixes
2. **Phase 6d** (NEXT): Team skills graphs + 3D visualization  
3. **Phase 6e**: Advanced bid intelligence + competitor analysis
4. **Phase 7**: Domain cutover (rfp.quest → new platform)

### Migration Approach
- **NOT a gradual migration** - complete platform replacement
- **Same database access** - no data migration required
- **Domain takeover** - rfp.quest will point to new platform
- **Legacy retirement** - old codebase deprecated entirely

## CRITICAL CLARIFICATIONS

### ❌ INCORRECT ASSUMPTIONS
- "rfp-quest-homepage is just a marketing site"
- "This is a separate project from the main platform"  
- "The original rfp.quest will remain the main platform"

### ✅ CORRECT UNDERSTANDING  
- **rfp-quest-homepage IS the main platform**
- **Complete replacement architecture with modern tech stack**
- **Same functionality + significantly enhanced capabilities**
- **Will take over rfp.quest domain when ready**

## TECHNICAL ADVANTAGES

### Why Replace vs. Upgrade?
1. **CopilotKit v2**: Requires architecture changes incompatible with v1
2. **LangGraph Deep Agents**: Modern state management vs. simple chains  
3. **Modern Next.js**: App Router + React 19 vs. legacy patterns
4. **Performance**: Optimized for scale with professional UI/UX
5. **Maintainability**: Clean codebase vs. 87K lines of legacy code

### Enhanced Capabilities
- **3D Skills Visualization**: React Force Graph + Zep integration
- **Advanced Analytics**: Tako charts + professional dashboards  
- **Team Collaboration**: Multi-user workflows + permissions
- **Enterprise Features**: Company profiles + buyer intelligence
- **SEO Architecture**: Comprehensive sector pages for organic growth

## CURRENT STATUS (2026-04-17)

### ✅ COMPLETED
- Phase 6c: 12 SEO sector pages with realistic values
- Value calculation fix (£3.1T → £427.8B, 86% reduction)  
- Neon Auth + Google OAuth integration
- 3D team skills graphs (React Force Graph 3D)
- Company onboarding with HITL cards
- Tako analytics integration

### 🚧 IN PROGRESS  
- Supplier pages (Step 2 of SEO implementation)
- Advanced team collaboration features
- Bid intelligence enhancements

### 📋 PENDING
- Domain cutover (rfp.quest)
- Legacy platform retirement
- Performance optimizations for scale

## RECOMMENDATIONS

### For Development Teams
1. **Treat this as the main platform** - not a side project
2. **Focus all feature development here** - legacy platform is deprecated  
3. **Plan for domain cutover** - this will become rfp.quest
4. **Resource allocation** - prioritize new platform over legacy fixes

### For Stakeholders
1. **Budget for complete migration** - this replaces, not supplements
2. **Marketing alignment** - promote new platform capabilities
3. **User communication** - prepare for platform upgrade benefits
4. **Timeline planning** - domain cutover dependent on feature completion

---

**CONCLUSION**: rfp-quest-homepage is the strategic future of RFP.quest, not a marketing add-on. All development effort should prioritize this modern architecture over maintaining the legacy platform.

**Next Action**: Review and align team understanding before proceeding with Phase 6d development.