Based on OpenGenerativeUI by CopilotKit (MIT License)

# RFP.quest Beta - UK Government Procurement Intelligence

RFP.quest Beta is an AI-powered UK government procurement intelligence platform. Ask natural language questions about 705K+ tenders with 479K award records including winner data from Contracts Finder and Find a Tender (2000–2026), get instant analytics charts, and use AI bid/no-bid analysis with human-in-the-loop confirmation. Built on CopilotKit v2, LangGraph, and Claude Opus 4.6.

## Live Demo

- **Production Frontend**: https://rfp-quest-homepage.vercel.app
- **Production Agent**: https://rfp-quest-generative-agent-production.up.railway.app
- **Local Frontend**: http://localhost:3002
- **Local Agent Backend**: http://localhost:8123

## Features

- **UK Government Tender Intelligence**: 705K+ tenders with 479K award records from Contracts Finder and Find a Tender (2000–2026), stored in Neon for instant querying
- **Competitive Intelligence**: Award records cross-referenced by winner, buyer, region, value, and SME status. Validated against Tussell 2025 Strategic Suppliers report
- **Generative UI**: AI-powered dynamic visualizations using CopilotKit v2 widgetRenderer
- **Interactive Analytics**: Tako-powered charts with pre-computed category insights (NHS, Construction, IT, Education, Defence, Facilities, Transport, Social Care, Police)
- **Bid Decision Analysis**: Human-in-the-loop tender evaluation with match scoring
- **Claude Opus 4.6**: Powered by Anthropic's flagship model for superior visualization generation
- **3D Skills Graph**: Interactive React Force Graph 3D showing professional networks with real Zep data
- **Bid Outcome Tracking**: Win/loss HITL cards with confirmation flows
- **Authenticated Dashboard**: Company context header renders immediately on page load  
- **3D & Chart Visualizations**: Three.js, Chart.js, D3.js, GSAP via ES module import maps

## Architecture

```
apps/
├── app/                    # Next.js 16 frontend with CopilotKit v2
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components (WidgetRenderer, StableIframe)
│   │   └── hooks/         # Custom hooks (useAgent)
├── agent/                  # LangGraph Python agent
│   ├── skills/            # Agent skills (SKILL.md files)
│   │   └── uk-tenders/    # UK tender visualization skill
│   ├── src/               # Agent tools and state
│   │   ├── query_tenders.py          # Neon full-text + ILIKE search
│   │   ├── tako_analytics.py         # Tako charts with category cache
│   │   ├── cron_category_insights.py # Nightly Tako chart pre-computation
│   │   ├── cron_ingest_tenders.py    # Daily OCDS tender ingest
│   │   ├── find_a_tender_ingest.py   # Find a Tender bulk loader
│   │   └── contracts_finder_v2_ingest.py  # CF REST v2 bulk loader
│   └── main.py            # Agent entry point
└── mcp/                    # MCP server integration
```

## Prerequisites

- Node.js 18+ and pnpm 9
- Python 3.12+ with uv
- Anthropic API key (for Claude Opus 4.6)
- Neon database (DATABASE_URL)
- Tako API key (for analytics charts)

## Installation

1. **Clone this repository**:
```bash
git clone https://github.com/Londondannyboy/rfp-quest-homepage.git
cd rfp-quest-homepage
```

2. **Install dependencies**:
```bash
make setup
```

3. **Configure environment variables**:

Create/update `apps/agent/.env`:
```env
ANTHROPIC_API_KEY=your-anthropic-key-here
LLM_MODEL=claude-opus-4-6
DATABASE_URL=your-neon-connection-string
TAKO_API_KEY=your-tako-key-here
LANGSMITH_API_KEY=your-langsmith-key-here  # optional, enables tracing
```

## Running Locally

Start all services:
```bash
make dev
```

This starts:
- Frontend on http://localhost:3002
- Agent backend on http://localhost:8123
- MCP server on port 3100

## Usage Examples

### Basic Visualization Test
```
Draw a red circle
```

### UK Tender Intelligence
```
Show me recent UK government tenders
```

### Tender Analytics (pre-computed, <3s)
```
Show me NHS contract spend by year
Show me construction contract spend by year
```

### Bid Decision Analysis
```
Analyse tender: Service Wing Demolition (RAAC)
```

### Advanced Queries
```
Find NHS contracts over £1M
What construction contracts close this month?
Which buyers publish the most tenders?
```

## Data Sources

All tender data is stored in Neon and queried locally. No live API calls at query time.

**Contracts Finder REST v2** (primary for CF data):
- Endpoint: `POST /api/rest/2/search_notices/json`
- No auth required. Coverage: 2024-now (expanding).
- Script: `apps/agent/src/contracts_finder_v2_ingest.py`

**Find a Tender OCDS** (primary for FaT data):
- Endpoint: `find-tender.service.gov.uk/api/1.0/ocdsReleasePackages`
- No auth required. Coverage: 2021-now (expanding).
- Script: `apps/agent/src/find_a_tender_ingest.py`

**Neon Database**:
- ~160K+ tenders, rich schema (37+ columns, 9 indexes)
- pgvector enabled for future similarity search
- `category_insights` table: 9 pre-computed Tako charts refreshed nightly

## Technical Stack

### Frontend
- **Next.js 16** with Turbopack
- **React 19**
- **TailwindCSS 4**
- **CopilotKit v2** — useAgent() hook, widgetRenderer, HITL components
- **TypeScript**

### Backend
- **LangGraph** for agent workflows
- **FastAPI** for API endpoints
- **Claude Opus 4.6** (Anthropic) for AI generation
- **Python 3.12** with uv package manager
- **deepagents** — create_deep_agent with skills

### Data
- **Neon** (PostgreSQL) — tenders table, category_insights, pgvector
- **Tako Visualize API** — analytics chart generation
- **LangSmith** — observability and tracing

### Visualization Libraries (ES modules via import map)
- **Three.js** for 3D graphics
- **Chart.js** for data visualization
- **D3.js** for advanced visualizations
- **GSAP** for animations

## Deployment

### Vercel (Frontend)

Environment variables required:
```
LANGGRAPH_DEPLOYMENT_URL=https://rfp-quest-generative-agent-production.up.railway.app
TAKO_API_KEY=your-tako-key
```

### Railway (Agent)

The agent backend auto-deploys from `main` branch.
URL: https://rfp-quest-generative-agent-production.up.railway.app

Environment variables:
- `ANTHROPIC_API_KEY`
- `LLM_MODEL=claude-opus-4-6`
- `DATABASE_URL` (Neon)
- `TAKO_API_KEY`
- `LANGSMITH_API_KEY`

### Railway Cron

Single cron service at `0 6 * * *` (6am UTC daily):
```
uv run python src/cron_category_insights.py && uv run python src/cron_ingest_tenders.py
```
Refreshes 9 category Tako charts, then ingests new OCDS tenders.

## Known Production Behaviours

### Anthropic Opus overload
Claude Opus occasionally returns overloaded_error under high API load.
The with_retry wrapper (3 attempts, exponential backoff) handles
transient overload transparently. Graceful error UI planned for Phase 5c Priority 3.

Do not run gate tests during or immediately after heavy API usage.
Wait 30+ minutes.

### Railway health check
GET /health returns `{"status":"ok"}` even when the agent is overloaded.
Only a successful end-to-end render (red circle appears) confirms readiness.

### Vercel function timeout
All API routes include `export const maxDuration = 60` to prevent
Vercel's default 10-second timeout from cutting off Opus generation.

## Troubleshooting

### Common Issues

1. **Visualization not rendering**:
   - Ensure `claude-opus-4-6` is configured (not gpt-4o, not claude-3-opus)
   - Check API keys are valid
   - Refresh page to clear request queue

2. **Agent not responding**:
   - Check agent is running: `curl http://localhost:8123/health`
   - Verify .env configuration
   - Check Railway logs for errors

3. **Tako chart not loading**:
   - Check TAKO_API_KEY is set
   - Verify category_insights table has rows: `SELECT * FROM category_insights`

### Model Configuration

**Critical**: Must use `claude-opus-4-6`.

- ❌ gpt-4o (too weak for generative UI)
- ❌ claude-3-opus-20240229 (outdated, Feb 2024)
- ✅ claude-opus-4-6 (current flagship)

## Documentation

- [CopilotKit Docs](https://docs.copilotkit.ai)
- [LangGraph Docs](https://python.langchain.com/docs/langgraph)
- [Contracts Finder API](https://www.contractsfinder.service.gov.uk/apidocumentation)
- [Find a Tender API](https://www.find-tender.service.gov.uk/apidocumentation)
- [OpenGenerativeUI](https://github.com/CopilotKit/OpenGenerativeUI)

## Roadmap

**Phase 6a (complete)**: Neon Auth (Google OAuth), company onboarding with HITL cards (7 interactive cards including capabilities, sectors, contract range, SME status), Tavily website scraping, personalised tender matching with match scoring.

**Phase 6b (complete)**: 3D skills graph visualization — React Force Graph 3D at `/graph/[user_id]` shows individual professional networks. Interactive 3D force-directed graph with real-time Zep data (company, sector, won contracts). Dark theme, click to focus, drag to rotate. Built on Zep graph DB and React Force Graph 3D.

**Phase 6c (next)**: Data enrichment pipeline — supplier_lookup and buyer_lookup canonical tables, CPV reclassification, sector tagging, buyer intelligence aggregates, pgvector embeddings. Transforms 705K raw records into queryable competitive intelligence.

**Phase 6d**: Team graph merging — when multiple users join same company via invite flow, their graph nodes combine. Coverage gaps and shared skills automatically surface.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- CopilotKit team for OpenGenerativeUI template
- Anthropic for Claude Opus 4.6
- UK Government Digital Service for Contracts Finder and Find a Tender APIs
- Tako for analytics visualization API

## Contact

- GitHub: [@Londondannyboy](https://github.com/Londondannyboy)
- Project: [rfp-quest-homepage](https://github.com/Londondannyboy/rfp-quest-homepage)
