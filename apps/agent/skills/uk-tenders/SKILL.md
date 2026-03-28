---
name: "UK Government Tender Intelligence"
description: "Fetch and visualise UK government procurement opportunities from Contracts Finder"
allowed-tools: []
---

# UK Tender Intelligence Skill

When the user asks about UK government tenders, contracts,
procurement opportunities, or related queries:

1. Fetch live data from the OCDS API:
   https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?limit=20&format=json

2. Parse the JSON response. Key fields:
   - release.tender.title — contract title
   - release.buyer.name — contracting authority  
   - release.tender.value.amount — contract value
   - release.tender.tenderPeriod.endDate — deadline
   - release.tag — ["tender"] for open, ["award"] for awarded
   - release.ocid — unique identifier

3. Generate a widgetRenderer visualization showing:
   For a tender feed: cards with title, value, deadline, status badge
   For analysis: Chart.js bar/pie charts of contract values by category
   For intelligence: a dashboard with metrics, timeline, win probability

4. Always use widgetRenderer with self-contained HTML.
   Use CSS variables for theming (var(--color-text-primary) etc.)
   Include Chart.js from cdnjs if needed.

Example prompts to handle:
- "Show me recent UK government tenders"
- "Find NHS contracts over £1M"  
- "What construction contracts close this month?"
- "Analyse this tender: [title]"

When fetching, use the fetch() API inside the agent.
The agent has network access to external APIs.

## Card Design Pattern

```html
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; padding: 16px;">
  <!-- For each tender -->
  <div style="background: var(--color-background-primary); 
              border: 0.5px solid var(--color-border-tertiary); 
              border-radius: var(--border-radius-lg); 
              padding: 1rem 1.25rem;">
    
    <!-- Status badge (open/awarded) -->
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
      <span style="display: inline-block; font-size: 11px; padding: 3px 10px; 
                   border-radius: var(--border-radius-md); 
                   background: var(--color-background-success); 
                   color: var(--color-text-success);">Open</span>
      <span style="font-size: 12px; color: var(--color-text-secondary);">
        Closes: 2026-04-15
      </span>
    </div>
    
    <!-- Title -->
    <h3 style="font-size: 15px; font-weight: 500; margin: 0 0 8px; 
               color: var(--color-text-primary); line-height: 1.4;">
      Digital Transformation Services
    </h3>
    
    <!-- Buyer -->
    <p style="font-size: 13px; color: var(--color-text-secondary); margin: 0 0 12px;">
      NHS England
    </p>
    
    <!-- Value -->
    <div style="font-size: 20px; font-weight: 500; color: var(--color-text-primary); 
                margin-bottom: 12px;">
      £2.5M
    </div>
    
    <!-- Action buttons -->
    <div style="display: flex; gap: 8px;">
      <button onclick="sendPrompt('Analyse tender: Digital Transformation Services')" 
              style="font-size: 12px; padding: 6px 12px; 
                     border: 0.5px solid var(--color-border-tertiary); 
                     background: transparent; 
                     border-radius: var(--border-radius-md); 
                     color: var(--color-text-primary); 
                     cursor: pointer;">
        Analyse ↗
      </button>
      <a href="https://www.contractsfinder.service.gov.uk/notice/[ocid]" 
         target="_blank" 
         style="font-size: 12px; padding: 6px 12px; 
                border: 0.5px solid var(--color-border-tertiary); 
                background: transparent; 
                border-radius: var(--border-radius-md); 
                color: var(--color-text-primary); 
                text-decoration: none; 
                display: inline-block;">
        View on CF →
      </a>
    </div>
  </div>
</div>
```

## Analysis Dashboard Pattern

```html
<!-- Metric cards -->
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); 
            gap: 12px; margin-bottom: 1.5rem;">
  
  <div style="background: var(--color-background-secondary); 
              border-radius: var(--border-radius-md); padding: 1rem;">
    <div style="font-size: 13px; color: var(--color-text-secondary); 
                margin-bottom: 4px;">Total Value</div>
    <div style="font-size: 24px; font-weight: 500;">£45.2M</div>
  </div>
  
  <div style="background: var(--color-background-secondary); 
              border-radius: var(--border-radius-md); padding: 1rem;">
    <div style="font-size: 13px; color: var(--color-text-secondary); 
                margin-bottom: 4px;">Open Tenders</div>
    <div style="font-size: 24px; font-weight: 500;">12</div>
  </div>
  
  <div style="background: var(--color-background-secondary); 
              border-radius: var(--border-radius-md); padding: 1rem;">
    <div style="font-size: 13px; color: var(--color-text-secondary); 
                margin-bottom: 4px;">Avg Competition</div>
    <div style="font-size: 24px; font-weight: 500;">8 bids</div>
  </div>
</div>

<!-- Chart -->
<div style="position: relative; width: 100%; height: 300px;">
  <canvas id="tenderChart"></canvas>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script>
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const textColor = isDark ? '#c2c0b6' : '#3d3d3a';
const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

new Chart(document.getElementById('tenderChart'), {
  type: 'bar',
  data: {
    labels: ['NHS', 'MOD', 'DWP', 'HMRC', 'Home Office'],
    datasets: [{
      label: 'Contract Value (£M)',
      data: [12.5, 8.3, 6.2, 4.8, 3.7],
      backgroundColor: '#534AB7'
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor }
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor }
      }
    }
  }
});
</script>
```

## Key Implementation Notes

1. Always fetch real data from the OCDS API
2. Format currency values with proper formatting (£1.2M, £450K)
3. Calculate days until deadline and show urgency indicators
4. Group tenders by buyer organization for analysis
5. Use status badges to differentiate open/awarded/cancelled
6. Include deep links to Contracts Finder using the OCID
7. Implement filtering by value range, buyer, or category
8. Show win probability based on competition analysis
9. Add "Analyse" buttons that use sendPrompt() for drill-downs
10. Respect dark mode with CSS variables throughout