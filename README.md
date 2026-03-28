Based on OpenGenerativeUI by CopilotKit (MIT License)

# RFP.quest Homepage - Generative UI with UK Tender Intelligence

A powerful OpenGenerativeUI application that visualizes UK government procurement opportunities using AI-powered generative interfaces. Built with CopilotKit, LangGraph, and Claude Opus 4.6.

## 🚀 Live Demo

- **Production Frontend**: https://rfp-quest-homepage.vercel.app
- **Production Agent**: https://rfp-quest-generative-agent-production.up.railway.app
- **Local Frontend**: http://localhost:3002
- **Local Agent Backend**: http://localhost:8123

## 🎯 Features

- **UK Government Tender Intelligence**: Real-time fetching and visualization of UK procurement opportunities from Contracts Finder OCDS API
- **Generative UI**: AI-powered dynamic visualizations using widgetRenderer
- **Interactive Visualizations**: 3D graphics, charts, and data dashboards
- **Claude Opus 4.6**: Powered by Anthropic's flagship model for superior visualization generation
- **Real-time Data**: Live integration with UK government procurement data

## 🏗️ Architecture

```
apps/
├── app/                    # Next.js 16 frontend with CopilotKit
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   └── hooks/         # Custom hooks
├── agent/                  # LangGraph Python agent
│   ├── skills/            # Agent skills
│   │   └── uk-tenders/    # UK tender visualization skill
│   ├── src/               # Agent tools and state
│   └── main.py            # Agent entry point
└── mcp/                    # MCP server integration
```

## 📋 Prerequisites

- Node.js 18+ and pnpm
- Python 3.12+
- OpenAI API key (for fallback)
- Anthropic API key (for Claude Opus 4.6)

## 🛠️ Installation

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
OPENAI_API_KEY=your-openai-key-here
LLM_MODEL=claude-opus-4-6
ANTHROPIC_API_KEY=your-anthropic-key-here
```

## 🚀 Running Locally

Start all services:
```bash
make dev
```

This starts:
- Frontend on http://localhost:3002
- Agent backend on http://localhost:8123
- MCP server on port 3100

## 💡 Usage Examples

### Basic Visualization Test
```
Draw a red circle
```

### UK Tender Intelligence
```
Show me recent UK government tenders
```

### Advanced Queries
```
Find NHS contracts over £1M
What construction contracts close this month?
Analyse tender opportunities in digital transformation
```

## 🎨 UK Tender Skill

The UK Tender Intelligence skill (`apps/agent/skills/uk-tenders/`) enables:

- **Live Data Fetching**: Real-time data from Contracts Finder OCDS API
- **Smart Visualization**: Automatic card layouts for tender opportunities
- **Analysis Dashboards**: Value breakdowns, buyer analysis, timeline views
- **Interactive Elements**: Deep links to Contracts Finder, analysis buttons
- **Dark Mode Support**: Automatic theming with CSS variables

### OCDS API Integration

Data source: `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search`

Key fields mapped:
- `release.tender.title` → Contract title
- `release.buyer.name` → Contracting authority
- `release.tender.value.amount` → Contract value
- `release.tender.tenderPeriod.endDate` → Deadline
- `release.tag` → Status (tender/award)

## 🔧 Technical Stack

### Frontend
- **Next.js 16.1.6** with Turbopack
- **React 19.2.4**
- **TailwindCSS 4**
- **CopilotKit v1.50** for AI integration
- **TypeScript** for type safety

### Backend
- **LangGraph** for agent workflows
- **FastAPI** for API endpoints
- **Claude Opus 4.6** (Anthropic) for AI generation
- **Python 3.12** with uv package manager

### Visualization Libraries
- **Three.js** for 3D graphics
- **Chart.js** for data visualization
- **D3.js** for advanced visualizations
- **GSAP** for animations

## 📁 Project Structure

```
.
├── apps/
│   ├── app/                    # Next.js frontend
│   ├── agent/                  # Python agent backend
│   └── mcp/                    # MCP server
├── docs/                       # Documentation
├── Makefile                    # Build commands
├── pnpm-workspace.yaml        # Monorepo config
└── turbo.json                 # Turborepo config
```

## 🚢 Deployment

### Vercel Deployment

1. **Prerequisites**:
   - GitHub repository: https://github.com/Londondannyboy/rfp-quest-homepage
   - Vercel account with team: team_nBAZLJTbCMBi2wrIMVlsmGjZ

2. **Deploy Frontend**:
```bash
vercel --cwd apps/app
```

3. **Environment Variables** (in Vercel):
```
LANGGRAPH_DEPLOYMENT_URL=https://rfp-quest-generative-agent-production.up.railway.app
```

### Railway Deployment (Agent)

The agent backend is already deployed on Railway at:
**https://rfp-quest-generative-agent-production.up.railway.app**

To update the Railway deployment:
1. Push changes to the connected GitHub repo
2. Railway will auto-deploy from the main branch

Environment variables configured in Railway:
- `ANTHROPIC_API_KEY` - Claude API key
- `LLM_MODEL` - claude-opus-4-6

## 🐛 Troubleshooting

### Common Issues

1. **Visualization not rendering**:
   - Ensure claude-opus-4-6 is configured
   - Check API keys are valid
   - Refresh page to clear request queue

2. **Hydration mismatch error**:
   - Normal SSR warning, doesn't affect functionality
   - Can be ignored or suppressed in production

3. **Agent not responding**:
   - Check agent is running: `curl http://localhost:8123/health`
   - Verify .env configuration
   - Check logs for errors

### Model Configuration

**Critical**: Must use `claude-opus-4-6` for proper visualization generation.

Incorrect models will produce broken or incomplete visualizations:
- ❌ gpt-4o (too weak)
- ❌ claude-3-opus-20240229 (outdated)
- ✅ claude-opus-4-6 (current flagship)

## 📚 Documentation

- [CopilotKit Docs](https://docs.copilotkit.ai)
- [LangGraph Docs](https://python.langchain.com/docs/langgraph)
- [Contracts Finder API](https://www.contractsfinder.service.gov.uk/apidocumentation)
- [OpenGenerativeUI](https://github.com/CopilotKit/OpenGenerativeUI)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- CopilotKit team for OpenGenerativeUI template
- Anthropic for Claude Opus 4.6
- UK Government Digital Service for OCDS API
- Open Contracting Partnership for OCDS standard

## 📧 Contact

- GitHub: [@Londondannyboy](https://github.com/Londondannyboy)
- Project: [rfp-quest-homepage](https://github.com/Londondannyboy/rfp-quest-homepage)

---

Built with ❤️ for the UK public procurement ecosystem