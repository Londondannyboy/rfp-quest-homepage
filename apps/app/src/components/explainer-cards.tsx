"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const cards = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    title: "Find Every Opportunity",
    description:
      "100,000+ UK government tenders from Contracts Finder and Find a Tender, searchable in seconds.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    title: "Match to Your Strengths",
    description:
      "AI analyses each tender against your sector, region, and contract history to surface the best fits.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    title: "Win More Bids",
    description:
      "Spend analytics, buyer insights, and AI bid recommendations so you focus on contracts you can win.",
  },
];

function ExplainerCards() {
  return (
    <div className="explainer-cards">
      {cards.map((card) => (
        <div key={card.title} className="explainer-card">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="explainer-card-icon">
              {card.icon}
            </div>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {card.title}
            </span>
          </div>
          <p
            style={{
              fontSize: "12px",
              lineHeight: 1.5,
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            {card.description}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Portal that injects ExplainerCards into the CopilotKit welcome screen.
 * Inserts a wrapper div inside the welcome screen's main content area,
 * positioned before the suggestion pills. Auto-removes when the welcome
 * screen disappears (user sends a message).
 */
export function ExplainerCardsPortal() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const WELCOME_SELECTOR = '[data-testid="copilot-welcome-screen"]';
    const PORTAL_ID = "explainer-cards-portal";

    const tryAttach = () => {
      const welcomeScreen = document.querySelector<HTMLElement>(WELCOME_SELECTOR);
      if (!welcomeScreen) {
        setPortalTarget(null);
        return;
      }

      // Reuse existing portal container if present
      let portal = document.getElementById(PORTAL_ID);
      if (portal) {
        setPortalTarget(portal);
        return;
      }

      // Insert portal container inside the welcome screen's main content div,
      // before the suggestions row
      const mainContent = welcomeScreen.children[0] as HTMLElement | undefined;
      if (!mainContent) return;

      portal = document.createElement("div");
      portal.id = PORTAL_ID;
      portal.style.width = "100%";

      // Insert before the last child (suggestions row)
      const suggestionsRow = mainContent.lastElementChild;
      if (suggestionsRow) {
        mainContent.insertBefore(portal, suggestionsRow);
      } else {
        mainContent.appendChild(portal);
      }

      setPortalTarget(portal);
    };

    tryAttach();

    const observer = new MutationObserver(() => {
      const welcomeScreen = document.querySelector<HTMLElement>(WELCOME_SELECTOR);
      if (!welcomeScreen) {
        // Welcome screen removed (chat started) — clean up
        const stale = document.getElementById(PORTAL_ID);
        if (stale) stale.remove();
        setPortalTarget(null);
      } else if (!document.getElementById(PORTAL_ID)) {
        // Welcome screen appeared but no portal yet
        tryAttach();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!portalTarget) return null;

  return createPortal(<ExplainerCards />, portalTarget);
}
