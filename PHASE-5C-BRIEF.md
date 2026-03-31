# PHASE-5C-BRIEF.md — RFP.quest Phase 5c Implementation Brief
# Created: 2026-03-31
# Status: Priority 1 COMPLETE — Priority 1.5 is NEXT ACTION

## OBJECTIVE

Eliminate the double-call timeout that prevents reliable tender
analysis on production. Make "Analyse tender: X" work every time
regardless of whether the tender is in the current live OCDS feed.

## THE PROBLEM

Current flow (broken):
1. User: "Analyse tender: BWV Support & Maintenance"
2. Agent calls fetch_uk_tenders (Opus call 1, ~20-30s)
3. Agent calls analyzeBidDecision (Opus call 2, ~20-30s)
4. Total: 40-60+ seconds → Vercel times out → silent failure

Target flow (fixed):
1. User: "Analyse tender: BWV Support & Maintenance"
2. Agent calls query_neon_tenders (Neon query, <100ms)
3. Agent calls analyzeBidDecision (Opus call 1, ~20-30s)
4. Total: ~20-30 seconds → completes within maxDuration

## DATABASE SCHEMA

Neon Postgres — tenders table:

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS tenders (
    ocid TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    buyer TEXT,
    value NUMERIC,
    currency TEXT DEFAULT 'GBP',
    deadline TIMESTAMPTZ,
    status TEXT DEFAULT 'Open',
    cpv_codes TEXT[],
    raw_json JSONB,
    embedding vector(1536),
    source TEXT DEFAULT 'ocds',
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenders_title
    ON tenders USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_tenders_buyer
    ON tenders(buyer);
CREATE INDEX IF NOT EXISTS idx_tenders_deadline
    ON tenders(deadline);
CREATE INDEX IF NOT EXISTS idx_tenders_embedding
    ON tenders USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

## AGENT CHANGES

### File: apps/agent/src/uk_tenders.py

Add after existing fetch logic:
- Import asyncpg or psycopg2 for Neon connection
- After fetching OCDS releases, save each to tenders table
- Generate embedding using langchain OpenAIEmbeddings
- Upsert on conflict (ocid is primary key)
- Return same data structure as before (no frontend changes)

### File: apps/agent/main.py

Add new tool: query_neon_tenders
- Input: query string (tender title, buyer name, or description)
- Step 1: full-text search on title using pg_tsvector index
- Step 2: if no exact match, run pgvector similarity search
- Step 3: return top 5 matches with all tender fields
- Step 4: also return 3 related tenders via similarity search

Update agent system prompt:
- When user asks to analyse a tender: call query_neon_tenders FIRST
- Only call fetch_uk_tenders if query_neon_tenders returns nothing
- After getting tender data, call analyzeBidDecision immediately

### Environment variable required:
DATABASE_URL=postgresql://[user]:[password]@[host]/[dbname]
Add to Railway service environment variables.
Add to local apps/agent/.env for development.

## FRONTEND CHANGES

### Loading states (apps/app/src/hooks/use-generative-ui-examples.tsx)

The useRenderTool hook for plan_visualization already shows a
loading card. Apply the same pattern to:
- query_neon_tenders: show "Searching tender database..."
- fetch_uk_tenders: show "Fetching live tenders..."
- analyzeBidDecision: show "Analysing opportunity..."
  with static tender data card while Opus runs

### Graceful error (apps/app/src/app/api/copilotkit/route.ts)

If Railway returns an error after retries exhausted, catch it and
return a readable message to the frontend instead of silent failure.

## GATE TESTS FOR PHASE 5C

1. Tender saved to Neon:
   After "Show me recent UK government tenders", query Neon directly:
   SELECT COUNT(*) FROM tenders;
   Expected: 20+ rows

2. Analyse without full details:
   Fresh session, type: "Analyse tender: BWV Support & Maintenance"
   (no buyer, value, or deadline provided)
   Expected: HITL card appears within 45 seconds
   Expected: Only ONE fetch in Railway logs (query_neon, not fetch_uk)

3. Related tenders:
   After analysing an NHS contract, agent should surface related
   NHS contracts or similar sector contracts automatically.

4. All Phase 4c gate tests still pass.

## ENVIRONMENT CHECKLIST

Before starting Phase 5c:
[ ] DATABASE_URL added to Railway environment variables
[ ] DATABASE_URL added to apps/agent/.env for local development
[ ] Neon instance confirmed accessible from Railway
[ ] pgvector extension enabled on Neon instance
[ ] All Phase 4c gate tests pass in fresh browser session

## IMPLEMENTATION ORDER (strict)

1. Enable pgvector on Neon, create tenders table
2. Add DATABASE_URL to Railway and local .env
3. Update fetch_uk_tenders to save to Neon
4. Test: fetch tenders, confirm rows appear in Neon
5. Add query_neon_tenders tool to agent
6. Update system prompt to use query_neon first
7. Test: analyse tender without full details — confirm single call
8. Add loading state render hooks to frontend
9. Add graceful error catch to route.ts
10. Test all Phase 5c gate tests
11. Update HANDOFF.md and DECISIONS.md
12. Push and confirm production gate tests pass

## PRIORITY 1.5 — BULK INGESTION PIPELINE

### Why this matters
Currently Neon has 18 tenders — only those fetched by users
in the 2026-03-31 session. The first user query on any new
session still triggers fetch_uk_tenders (live API, 10-20 seconds).
Until Neon has comprehensive historical data and a cron keeping
it current, the agent cannot rely on Neon alone.

### File created: apps/agent/src/bulk_load_tenders.py
One-time historical loader. Pages OCDS API backwards in 7-day
windows from today to 2024-01-01. Upserts to Neon in batches of 50.
Resumable — skips existing ocids. See file for full implementation.

Run locally:
    cd apps/agent
    uv run python src/bulk_load_tenders.py

### File created: apps/agent/src/cron_ingest_tenders.py
Daily cron ingestion. Fetches last 25 hours of OCDS publications.
Upserts new tenders to Neon. Designed for Railway cron.

Run locally:
    cd apps/agent
    uv run python src/cron_ingest_tenders.py

Railway cron config: 0 6 * * * (6am UTC daily)

### After bulk load completes
Update agent system prompt to remove fetch_uk_tenders fallback.
Agent should never call live API — Neon only.

### Gate tests for Priority 1.5
1. SELECT COUNT(*) FROM tenders; → expect 10,000+ rows
2. Fresh browser query renders from Neon in under 5 seconds
3. Railway logs show query_neon_tenders only, no fetch_uk_tenders

## PRIORITY 1.6 — TAKO LIVE ANALYTICS INTEGRATION

### Why this matters
Neon handles individual tender lookup (fast, precise).
Tako handles analytical questions over the full dataset
(trends, comparisons, sector breakdowns, buyer analysis).
Together they make RFP.quest a complete procurement
intelligence platform — not just a tender finder.

### Example queries Tako enables
- "Show me UK government IT contract spend by year"
- "Which buyers award the most contracts over £1M?"
- "Compare NHS vs MOD procurement volumes"
- "What sectors have the most contracts closing this month?"
- "Show me contract value distribution by region"
- "Which CPV codes have grown most in the last 2 years?"

These cannot be answered by individual tender lookup.
They require aggregation over the full dataset — which
Neon + Tako handles perfectly.

### New tool: visualise_tender_analytics

Add to apps/agent/main.py alongside query_neon_tenders:
```python
@tool
def visualise_tender_analytics(query: str, sql: str = "") -> str:
    """
    Answer analytical questions about UK government procurement
    by querying the Neon tenders database and visualising the
    results as an interactive Tako chart.

    Use for: trends over time, comparisons between buyers/sectors,
    spend breakdowns, volume analysis, contract value distributions.

    Do NOT use for: finding a specific tender (use query_neon_tenders).

    Args:
        query: Natural language description of what to visualise
               e.g. "NHS contract spend by year as a bar chart"
        sql: Optional pre-built SQL query. If empty, agent builds one.

    Returns:
        Tako embed_url string for the chart iframe
    """
    import os
    import io
    import csv as csv_module
    import httpx
    import psycopg2

    DATABASE_URL = os.getenv("DATABASE_URL", "").replace(
        "channel_binding=require&", ""
    ).replace("&channel_binding=require", "").replace(
        "channel_binding=require", ""
    )
    TAKO_API_KEY = os.getenv("TAKO_API_KEY", "")

    # If no SQL provided, use a sensible default based on query
    if not sql:
        sql = """
            SELECT
                title, buyer, value, status,
                EXTRACT(year FROM deadline)::int as year,
                source
            FROM tenders
            WHERE deadline IS NOT NULL
            ORDER BY fetched_at DESC
            LIMIT 500
        """

    # Query Neon
    try:
        conn = psycopg2.connect(DATABASE_URL)
        with conn.cursor() as cur:
            cur.execute(sql)
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        conn.close()
    except Exception as e:
        return f"Database error: {str(e)}"

    if not rows:
        return "No data found for this query."

    # Convert to CSV string
    buf = io.StringIO()
    writer = csv_module.DictWriter(buf, fieldnames=columns)
    writer.writeheader()
    writer.writerows(rows)
    csv_string = buf.getvalue()

    # Call Tako Visualize API
    try:
        response = httpx.post(
            "https://tako.com/api/v1/beta/visualize",
            headers={
                "X-API-Key": TAKO_API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "csv": [csv_string],
                "query": query,
                "model": "o4-mini",
                "output_settings": {
                    "knowledge_card_settings": {
                        "image_dark_mode": True
                    }
                }
            },
            timeout=60.0
        )
        data = response.json()
        cards = data.get("outputs", {}).get("knowledge_cards", [])
        if cards:
            return cards[0].get("embed_url", "No embed URL returned")
        return "Tako returned no chart for this query."
    except Exception as e:
        return f"Tako API error: {str(e)}"
```

### Register in create_deep_agent tools list:

tools=[
    query_data,
    plan_visualization,
    *todo_tools,
    generate_form,
    fetch_uk_tenders,
    query_neon_tenders,
    visualise_tender_analytics,  # NEW
]

### Update system prompt in main.py:

Add this section to the system prompt:

## Tender Analytics with Tako

When users ask analytical questions about procurement trends,
sector comparisons, buyer analysis, or spend over time — use
the visualise_tender_analytics tool.

This tool queries the Neon database and generates a live
interactive chart via Tako. The embed_url it returns should
be passed to widgetRenderer as the html parameter, wrapped
in an iframe:

<iframe src="[embed_url]" width="100%" height="600px"
frameborder="0" scrolling="no"></iframe>

Decision guide:
- "Find me a tender" → query_neon_tenders
- "Analyse this tender" → query_neon_tenders + analyzeBidDecision
- "Show me trends/comparisons/breakdowns" → visualise_tender_analytics
- "Show me all tenders" → fetch_uk_tenders (as last resort)

### Environment variables required:

Railway: add TAKO_API_KEY=1e6246140d6f0142eb3a6bbadbd6143cc30df5b8
Local: add to apps/agent/.env

### Gate tests for Priority 1.6

1. "Show me UK government contract spend by year"
   → agent calls visualise_tender_analytics
   → Tako returns embed_url
   → interactive chart iframe renders in widgetRenderer

2. "Which buyers award the most contracts?"
   → agent calls visualise_tender_analytics
   → bar chart of top buyers renders

3. query_neon_tenders still works for individual lookup ✅
4. analyzeBidDecision HITL still works ✅
