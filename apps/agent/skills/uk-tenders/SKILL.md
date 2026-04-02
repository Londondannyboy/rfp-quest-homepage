---
name: "UK Government Tender Intelligence"
description: "Search and visualise UK government procurement data from Neon database"
allowed-tools: []
---

# UK Tender Intelligence Skill

When the user asks about UK government tenders, contracts,
procurement opportunities, or related queries:

1. Call query_neon_tenders with the user's search terms.
   All tender data is in Neon — never call a live API.

2. The tool returns a list of dictionaries with:
   - title — contract title
   - buyer — contracting authority name
   - value — contract value in pounds (may be 0 if not published)
   - deadline — submission deadline ISO string (may be empty)
   - status — Open, Awarded, Planning, Cancelled, or Contract
   - stage — OCDS release stage
   - ocid — unique identifier

3. Generate a widgetRenderer visualization showing tender cards.
   Use the Card Design Pattern below.
   Do NOT call plan_visualization for tender requests.
   Do NOT call analyzeBidDecision unless the user explicitly
   asks to analyse a specific tender.

4. Always use widgetRenderer with self-contained HTML.
   Use CSS variables for theming (var(--color-text-primary) etc.)

Example prompts to handle:
- "Show me recent UK government tenders"
- "Find NHS contracts over £1M"
- "What construction contracts close this month?"

## Card Design Pattern

```html
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; padding: 16px;">
  <!-- For each tender -->
  <div style="background: var(--color-background-primary); 
              border: 0.5px solid var(--color-border-tertiary); 
              border-radius: var(--border-radius-lg); 
              padding: 1rem 1.25rem;">
    
    <!-- Status badge -->
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
      <span style="display: inline-block; font-size: 11px; padding: 3px 10px; 
                   border-radius: var(--border-radius-md); 
                   background: var(--color-background-success); 
                   color: var(--color-text-success);">Open</span>
      <span style="font-size: 12px; color: var(--color-text-secondary);">
        Closes: 15 Apr 2026
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
        Analyse
      </button>
      <button onclick="sendPrompt('Show analytics for NHS England tenders')" 
              style="font-size: 12px; padding: 6px 12px; 
                     border: 0.5px solid var(--color-border-tertiary); 
                     background: transparent; 
                     border-radius: var(--border-radius-md); 
                     color: var(--color-text-primary); 
                     cursor: pointer;">
        Analytics
      </button>
    </div>
  </div>
</div>
```

## Key Implementation Notes

1. Data comes from query_neon_tenders — never fetch from external API
2. Format currency: £1.2M for millions, £450K for thousands, £0 if no value
3. Show deadline as human-readable date, or "No deadline" if empty
4. Use status badges: green for Open, amber for Planning, grey for Awarded
5. Analyse button uses sendPrompt() to trigger drill-down in chat
6. Do NOT auto-trigger analyzeBidDecision — user must click Analyse first
7. Respect dark mode with CSS variables throughout
