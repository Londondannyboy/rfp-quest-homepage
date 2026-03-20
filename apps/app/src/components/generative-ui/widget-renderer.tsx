"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { z } from "zod";

// ─── Zod Schema (CopilotKit parameter contract) ─────────────────────
export const WidgetRendererProps = z.object({
  title: z
    .string()
    .describe("Short title for the visualization, e.g. 'Binary Search' or 'Load Balancer Architecture'"),
  description: z
    .string()
    .describe("One-sentence explanation of what this visualization demonstrates"),
  html: z
    .string()
    .describe(
      "Self-contained HTML fragment with inline <style> and <script>. " +
        "Use CSS variables (var(--color-text-primary), etc.) for theming. " +
        "No external dependencies unless from allowed CDNs (cdnjs, esm.sh, jsdelivr, unpkg). " +
        "Include interactive controls where appropriate."
    ),
});

type WidgetRendererProps = z.infer<typeof WidgetRendererProps>;

// ─── Injected CSS: Theme Variables (Layer 3) ─────────────────────────
const THEME_CSS = `
:root {
  --color-background-primary: #ffffff;
  --color-background-secondary: #f7f6f3;
  --color-background-tertiary: #efeee9;
  --color-background-info: #E6F1FB;
  --color-background-danger: #FCEBEB;
  --color-background-success: #EAF3DE;
  --color-background-warning: #FAEEDA;

  --color-text-primary: #1a1a1a;
  --color-text-secondary: #73726c;
  --color-text-tertiary: #9c9a92;
  --color-text-info: #185FA5;
  --color-text-danger: #A32D2D;
  --color-text-success: #3B6D11;
  --color-text-warning: #854F0B;

  --color-border-primary: rgba(0, 0, 0, 0.4);
  --color-border-secondary: rgba(0, 0, 0, 0.3);
  --color-border-tertiary: rgba(0, 0, 0, 0.15);
  --color-border-info: #185FA5;
  --color-border-danger: #A32D2D;
  --color-border-success: #3B6D11;
  --color-border-warning: #854F0B;

  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-serif: Georgia, "Times New Roman", serif;
  --font-mono: "SF Mono", "Fira Code", "Fira Mono", monospace;

  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --border-radius-xl: 16px;

  --p: var(--color-text-primary);
  --s: var(--color-text-secondary);
  --t: var(--color-text-tertiary);
  --bg2: var(--color-background-secondary);
  --b: var(--color-border-tertiary);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background-primary: #1a1a18;
    --color-background-secondary: #2c2c2a;
    --color-background-tertiary: #222220;
    --color-background-info: #0C447C;
    --color-background-danger: #501313;
    --color-background-success: #173404;
    --color-background-warning: #412402;

    --color-text-primary: #e8e6de;
    --color-text-secondary: #9c9a92;
    --color-text-tertiary: #73726c;
    --color-text-info: #85B7EB;
    --color-text-danger: #F09595;
    --color-text-success: #97C459;
    --color-text-warning: #EF9F27;

    --color-border-primary: rgba(255, 255, 255, 0.4);
    --color-border-secondary: rgba(255, 255, 255, 0.3);
    --color-border-tertiary: rgba(255, 255, 255, 0.15);
    --color-border-info: #85B7EB;
    --color-border-danger: #F09595;
    --color-border-success: #97C459;
    --color-border-warning: #EF9F27;
  }
}
`;

// ─── Injected CSS: SVG Pre-Built Classes (Layer 4) ───────────────────
const SVG_CLASSES_CSS = `
svg text.t   { font: 400 14px var(--font-sans); fill: var(--p); }
svg text.ts  { font: 400 12px var(--font-sans); fill: var(--s); }
svg text.th  { font: 500 14px var(--font-sans); fill: var(--p); }

svg .box > rect, svg .box > circle, svg .box > ellipse { fill: var(--bg2); stroke: var(--b); }
svg .node { cursor: pointer; }
svg .node:hover { opacity: 0.8; }
svg .arr { stroke: var(--s); stroke-width: 1.5; fill: none; }
svg .leader { stroke: var(--t); stroke-width: 0.5; stroke-dasharray: 4 4; fill: none; }

/* Purple */
svg .c-purple > rect, svg .c-purple > circle, svg .c-purple > ellipse,
svg rect.c-purple, svg circle.c-purple, svg ellipse.c-purple { fill: #EEEDFE; stroke: #534AB7; }
svg .c-purple text.th, svg .c-purple text.t { fill: #3C3489; }
svg .c-purple text.ts { fill: #534AB7; }

/* Teal */
svg .c-teal > rect, svg .c-teal > circle, svg .c-teal > ellipse,
svg rect.c-teal, svg circle.c-teal, svg ellipse.c-teal { fill: #E1F5EE; stroke: #0F6E56; }
svg .c-teal text.th, svg .c-teal text.t { fill: #085041; }
svg .c-teal text.ts { fill: #0F6E56; }

/* Coral */
svg .c-coral > rect, svg .c-coral > circle, svg .c-coral > ellipse,
svg rect.c-coral, svg circle.c-coral, svg ellipse.c-coral { fill: #FAECE7; stroke: #993C1D; }
svg .c-coral text.th, svg .c-coral text.t { fill: #712B13; }
svg .c-coral text.ts { fill: #993C1D; }

/* Pink */
svg .c-pink > rect, svg .c-pink > circle, svg .c-pink > ellipse,
svg rect.c-pink, svg circle.c-pink, svg ellipse.c-pink { fill: #FBEAF0; stroke: #993556; }
svg .c-pink text.th, svg .c-pink text.t { fill: #72243E; }
svg .c-pink text.ts { fill: #993556; }

/* Gray */
svg .c-gray > rect, svg .c-gray > circle, svg .c-gray > ellipse,
svg rect.c-gray, svg circle.c-gray, svg ellipse.c-gray { fill: #F1EFE8; stroke: #5F5E5A; }
svg .c-gray text.th, svg .c-gray text.t { fill: #444441; }
svg .c-gray text.ts { fill: #5F5E5A; }

/* Blue */
svg .c-blue > rect, svg .c-blue > circle, svg .c-blue > ellipse,
svg rect.c-blue, svg circle.c-blue, svg ellipse.c-blue { fill: #E6F1FB; stroke: #185FA5; }
svg .c-blue text.th, svg .c-blue text.t { fill: #0C447C; }
svg .c-blue text.ts { fill: #185FA5; }

/* Green */
svg .c-green > rect, svg .c-green > circle, svg .c-green > ellipse,
svg rect.c-green, svg circle.c-green, svg ellipse.c-green { fill: #EAF3DE; stroke: #3B6D11; }
svg .c-green text.th, svg .c-green text.t { fill: #27500A; }
svg .c-green text.ts { fill: #3B6D11; }

/* Amber */
svg .c-amber > rect, svg .c-amber > circle, svg .c-amber > ellipse,
svg rect.c-amber, svg circle.c-amber, svg ellipse.c-amber { fill: #FAEEDA; stroke: #854F0B; }
svg .c-amber text.th, svg .c-amber text.t { fill: #633806; }
svg .c-amber text.ts { fill: #854F0B; }

/* Red */
svg .c-red > rect, svg .c-red > circle, svg .c-red > ellipse,
svg rect.c-red, svg circle.c-red, svg ellipse.c-red { fill: #FCEBEB; stroke: #A32D2D; }
svg .c-red text.th, svg .c-red text.t { fill: #791F1F; }
svg .c-red text.ts { fill: #A32D2D; }

/* Dark mode overrides */
@media (prefers-color-scheme: dark) {
  svg text.t   { fill: #e8e6de; }
  svg text.ts  { fill: #9c9a92; }
  svg text.th  { fill: #e8e6de; }

  svg .c-purple > rect, svg .c-purple > circle, svg .c-purple > ellipse,
  svg rect.c-purple, svg circle.c-purple, svg ellipse.c-purple { fill: #3C3489; stroke: #AFA9EC; }
  svg .c-purple text.th, svg .c-purple text.t { fill: #CECBF6; }
  svg .c-purple text.ts { fill: #AFA9EC; }

  svg .c-teal > rect, svg .c-teal > circle, svg .c-teal > ellipse,
  svg rect.c-teal, svg circle.c-teal, svg ellipse.c-teal { fill: #085041; stroke: #5DCAA5; }
  svg .c-teal text.th, svg .c-teal text.t { fill: #9FE1CB; }
  svg .c-teal text.ts { fill: #5DCAA5; }

  svg .c-coral > rect, svg .c-coral > circle, svg .c-coral > ellipse,
  svg rect.c-coral, svg circle.c-coral, svg ellipse.c-coral { fill: #712B13; stroke: #F0997B; }
  svg .c-coral text.th, svg .c-coral text.t { fill: #F5C4B3; }
  svg .c-coral text.ts { fill: #F0997B; }

  svg .c-pink > rect, svg .c-pink > circle, svg .c-pink > ellipse,
  svg rect.c-pink, svg circle.c-pink, svg ellipse.c-pink { fill: #72243E; stroke: #ED93B1; }
  svg .c-pink text.th, svg .c-pink text.t { fill: #F4C0D1; }
  svg .c-pink text.ts { fill: #ED93B1; }

  svg .c-gray > rect, svg .c-gray > circle, svg .c-gray > ellipse,
  svg rect.c-gray, svg circle.c-gray, svg ellipse.c-gray { fill: #444441; stroke: #B4B2A9; }
  svg .c-gray text.th, svg .c-gray text.t { fill: #D3D1C7; }
  svg .c-gray text.ts { fill: #B4B2A9; }

  svg .c-blue > rect, svg .c-blue > circle, svg .c-blue > ellipse,
  svg rect.c-blue, svg circle.c-blue, svg ellipse.c-blue { fill: #0C447C; stroke: #85B7EB; }
  svg .c-blue text.th, svg .c-blue text.t { fill: #B5D4F4; }
  svg .c-blue text.ts { fill: #85B7EB; }

  svg .c-green > rect, svg .c-green > circle, svg .c-green > ellipse,
  svg rect.c-green, svg circle.c-green, svg ellipse.c-green { fill: #27500A; stroke: #97C459; }
  svg .c-green text.th, svg .c-green text.t { fill: #C0DD97; }
  svg .c-green text.ts { fill: #97C459; }

  svg .c-amber > rect, svg .c-amber > circle, svg .c-amber > ellipse,
  svg rect.c-amber, svg circle.c-amber, svg ellipse.c-amber { fill: #633806; stroke: #EF9F27; }
  svg .c-amber text.th, svg .c-amber text.t { fill: #FAC775; }
  svg .c-amber text.ts { fill: #EF9F27; }

  svg .c-red > rect, svg .c-red > circle, svg .c-red > ellipse,
  svg rect.c-red, svg circle.c-red, svg ellipse.c-red { fill: #791F1F; stroke: #F09595; }
  svg .c-red text.th, svg .c-red text.t { fill: #F7C1C1; }
  svg .c-red text.ts { fill: #F09595; }
}
`;

// ─── Injected CSS: Form Element Styles (Layer 5) ─────────────────────
const FORM_STYLES_CSS = `
* { box-sizing: border-box; margin: 0; }

html { background: transparent; }

body {
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.7;
  color: var(--color-text-primary);
  background: transparent;
  -webkit-font-smoothing: antialiased;
}

button {
  font-family: inherit;
  font-size: 14px;
  padding: 6px 16px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
button:hover { background: var(--color-background-secondary); }
button:active { transform: scale(0.98); }

input[type="text"],
input[type="number"],
input[type="email"],
input[type="search"],
textarea,
select {
  font-family: inherit;
  font-size: 14px;
  padding: 6px 12px;
  height: 36px;
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  transition: border-color 0.15s;
}
input:hover, textarea:hover, select:hover { border-color: var(--color-border-secondary); }
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--color-border-primary);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
}
textarea { height: auto; min-height: 80px; resize: vertical; }
input::placeholder, textarea::placeholder { color: var(--color-text-tertiary); }

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: var(--color-border-tertiary);
  border-radius: 2px;
  border: none;
  outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-secondary);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
input[type="range"]::-moz-range-thumb {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-secondary);
  cursor: pointer;
}

input[type="checkbox"], input[type="radio"] {
  width: 16px; height: 16px;
  accent-color: var(--color-text-info);
}

a { color: var(--color-text-info); text-decoration: none; }
a:hover { text-decoration: underline; }

/* Progressive reveal for content children */
#content > * {
  animation: fadeSlideIn 0.4s ease-out both;
}
#content > *:nth-child(1) { animation-delay: 0s; }
#content > *:nth-child(2) { animation-delay: 0.06s; }
#content > *:nth-child(3) { animation-delay: 0.12s; }
#content > *:nth-child(4) { animation-delay: 0.18s; }
#content > *:nth-child(5) { animation-delay: 0.24s; }
#content > *:nth-child(n+6) { animation-delay: 0.3s; }

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`;

// ─── Injected JS: Bridge Functions + Auto-Resize (Layers 1 & 6) ─────
const BRIDGE_JS = `
// Bridge: sendPrompt
window.sendPrompt = function(text) {
  window.parent.postMessage({ type: 'send-prompt', text: text }, '*');
};

// Bridge: openLink
window.openLink = function(url) {
  window.parent.postMessage({ type: 'open-link', url: url }, '*');
};

// Intercept <a> clicks
document.addEventListener('click', function(e) {
  var a = e.target.closest('a[href]');
  if (a && a.href.startsWith('http')) {
    e.preventDefault();
    window.parent.postMessage({ type: 'open-link', url: a.href }, '*');
  }
});

// Listen for streaming content updates from parent
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'update-content') {
    var content = document.getElementById('content');
    if (content) {
      content.innerHTML = e.data.html;
      // Re-run any inline scripts (new ones added by streaming)
      var scripts = content.querySelectorAll('script');
      scripts.forEach(function(oldScript) {
        var newScript = document.createElement('script');
        if (oldScript.src) {
          newScript.src = oldScript.src;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });
      reportHeight();
    }
  }
});

// Auto-resize: report content height to host
function reportHeight() {
  var content = document.getElementById('content');
  var h = content ? content.offsetHeight : document.documentElement.scrollHeight;
  window.parent.postMessage({ type: 'widget-resize', height: h }, '*');
}
var ro = new ResizeObserver(reportHeight);
ro.observe(document.getElementById('content') || document.body);
window.addEventListener('load', reportHeight);
// Periodic reports during initial load
var _resizeInterval = setInterval(reportHeight, 200);
setTimeout(function() { clearInterval(_resizeInterval); }, 15000);
`;

// ─── Document Assembly ───────────────────────────────────────────────
/** Full document with content — used for final/complete renders */
function assembleDocument(html: string): string {
  return assembleShell(html);
}

/** Empty shell or shell with initial content — iframe loads once, content streamed via postMessage */
function assembleShell(initialHtml: string = ""): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'unsafe-inline' 'unsafe-eval'
      https://cdnjs.cloudflare.com
      https://esm.sh
      https://cdn.jsdelivr.net
      https://unpkg.com;
    style-src 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self' data:;
    connect-src 'self';
  ">
  <style>
    ${THEME_CSS}
    ${SVG_CLASSES_CSS}
    ${FORM_STYLES_CSS}
  </style>
</head>
<body>
  <div id="content">
    ${initialHtml}
  </div>
  <script>
    ${BRIDGE_JS}
  </script>
</body>
</html>`;
}

// ─── Loading Phrases ─────────────────────────────────────────────────
const LOADING_PHRASES = [
  "Sketching pixels",
  "Wiring up nodes",
  "Painting gradients",
  "Compiling visuals",
  "Arranging atoms",
  "Rendering magic",
  "Polishing edges",
];

function useLoadingPhrase(active: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    setIndex(0);
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_PHRASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [active]);
  return LOADING_PHRASES[index];
}

// ─── React Component ─────────────────────────────────────────────────
type SaveState = "idle" | "input" | "saving" | "saved";

export function WidgetRenderer({ title, description, html }: WidgetRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [templateName, setTemplateName] = useState("");
  // Whether the iframe shell has been initialized
  const shellReadyRef = useRef(false);
  // Track the last html sent to the iframe to avoid redundant updates
  const committedHtmlRef = useRef("");
  // Whether streaming has started (html is arriving but may not be complete)
  const [streaming, setStreaming] = useState(false);
  // Tracks whether html content has settled (stopped changing)
  const [htmlSettled, setHtmlSettled] = useState(false);
  const settledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessage = useCallback((e: MessageEvent) => {
    // Only handle messages from our own iframe
    if (
      iframeRef.current &&
      e.source === iframeRef.current.contentWindow &&
      e.data?.type === "widget-resize" &&
      typeof e.data.height === "number"
    ) {
      setHeight(Math.max(50, Math.min(e.data.height + 8, 4000)));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // Initialize the iframe shell once when html first appears.
  // After that, stream content updates via postMessage — no iframe reload.
  useEffect(() => {
    if (!html || !iframeRef.current) return;

    if (!shellReadyRef.current) {
      // First time: load the full document so the shell (styles, bridge JS) is ready
      shellReadyRef.current = true;
      committedHtmlRef.current = html;
      iframeRef.current.srcdoc = assembleShell(html);
      setStreaming(true);
      return;
    }

    // Subsequent updates: stream content into existing iframe via postMessage
    if (html === committedHtmlRef.current) return;
    committedHtmlRef.current = html;

    const iframe = iframeRef.current;
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { type: "update-content", html },
        "*"
      );
    }
  }, [html]);

  // Detect when html has stopped changing (streaming complete).
  // Resets a debounce timer on every html update — settles after 800ms of no changes.
  useEffect(() => {
    if (!html) {
      setHtmlSettled(false);
      return;
    }
    setHtmlSettled(false);
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    settledTimerRef.current = setTimeout(() => setHtmlSettled(true), 800);
    return () => {
      if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    };
  }, [html]);

  // Fallback: if iframe has html but hasn't reported a height after 4s, force-show
  useEffect(() => {
    if (!html || (loaded && height > 0)) return;
    const timeout = setTimeout(() => {
      setLoaded(true);
      setHeight((h) => (h > 0 ? h : 500));
    }, 4000);
    return () => clearTimeout(timeout);
  }, [html, loaded, height]);

  // Content is "complete" when iframe has loaded and reported a valid height
  const ready = loaded && height > 0;
  // Show the iframe (even partially) as soon as we have content streaming
  const showIframe = !!html && (streaming || ready);
  // Streaming is active until html has stopped changing
  const isStreaming = !!html && !htmlSettled;
  // Save template only available when fully rendered AND streaming is done
  const showSaveTemplate = ready && htmlSettled;
  const loadingPhrase = useLoadingPhrase(isStreaming);

  // Keep the streaming indicator mounted long enough to fade out
  const [showStreamingIndicator, setShowStreamingIndicator] = useState(false);
  useEffect(() => {
    if (isStreaming) {
      setShowStreamingIndicator(true);
    } else if (showStreamingIndicator) {
      // Keep mounted for fade-out, then unmount
      const timeout = setTimeout(() => setShowStreamingIndicator(false), 600);
      return () => clearTimeout(timeout);
    }
  }, [isStreaming, showStreamingIndicator]);

  const handleSaveTemplate = useCallback(() => {
    const name = templateName.trim() || title || "Untitled Template";
    setSaveState("saving");
    window.postMessage(
      { type: "save-as-template", name, title, description, html },
      "*"
    );
    setTemplateName("");
    // Brief "saving" pulse then show "saved" confirmation
    setTimeout(() => {
      setSaveState("saved");
      // Return to idle after the confirmation
      setTimeout(() => setSaveState("idle"), 1800);
    }, 400);
  }, [templateName, title, description, html]);

  return (
    <div className="w-full my-3">
      {/* Loading phrases — sits above the widget, fades out when ready */}
      {showStreamingIndicator && (
        <div
          className="mb-2 transition-all duration-500 ease-out"
          style={{
            opacity: isStreaming ? 1 : 0,
            maxHeight: isStreaming ? 32 : 0,
            overflow: "hidden",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: "2px solid var(--color-border-light, rgba(0,0,0,0.1))",
                borderTopColor: "var(--color-lilac-dark, #6366f1)",
                animation: "spin 0.8s linear infinite",
                flexShrink: 0,
              }}
            />
            <span
              className="text-[12px] font-medium"
              style={{ color: "var(--text-secondary, #666)" }}
            >
              {loadingPhrase}...
            </span>
          </div>
        </div>
      )}

      <div className="relative">
      {/* Save as Template — fades in once widget is fully ready */}
      {html && (
        <div
          className="absolute top-2 right-2 z-10 transition-opacity duration-500"
          style={{
            opacity: showSaveTemplate ? 1 : 0,
            pointerEvents: showSaveTemplate ? "auto" : "none",
          }}
        >
          {/* ── Saved confirmation ── */}
          {saveState === "saved" && (
            <div
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md"
              style={{
                background: "var(--color-background-success, #EAF3DE)",
                color: "var(--color-text-success, #3B6D11)",
                border: "1px solid var(--color-border-success, #3B6D11)",
                animation: "tmpl-pop 0.35s cubic-bezier(.34,1.56,.64,1)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: "tmpl-check 0.4s ease-out 0.1s forwards" }} />
              </svg>
              Saved!
            </div>
          )}

          {/* ── Saving spinner ── */}
          {saveState === "saving" && (
            <div
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-md"
              style={{
                background: "var(--surface-primary, #fff)",
                border: "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
                color: "var(--text-secondary, #666)",
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  border: "2px solid var(--color-border-tertiary, rgba(0,0,0,0.15))",
                  borderTopColor: "var(--color-lilac-dark, #6366f1)",
                  animation: "spin 0.6s linear infinite",
                }}
              />
              Saving...
            </div>
          )}

          {/* ── Name input ── */}
          {saveState === "input" && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 shadow-lg"
              style={{
                background: "var(--surface-primary, #fff)",
                border: "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
                animation: "tmpl-slideIn 0.2s ease-out",
              }}
            >
              <input
                type="text"
                placeholder="Template name..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTemplate();
                  if (e.key === "Escape") {
                    setSaveState("idle");
                    setTemplateName("");
                  }
                }}
                autoFocus
                className="text-xs px-2 py-1 rounded-md outline-none"
                style={{
                  width: 140,
                  background: "var(--color-background-secondary, #f5f5f5)",
                  color: "var(--text-primary, #1a1a1a)",
                  border: "1px solid var(--color-border-tertiary, rgba(0,0,0,0.1))",
                }}
              />
              <button
                onClick={handleSaveTemplate}
                className="text-xs px-2 py-1 rounded-md font-medium text-white"
                style={{
                  background: "linear-gradient(135deg, var(--color-lilac-dark, #6366f1), var(--color-mint-dark, #10b981))",
                }}
              >
                Save
              </button>
              <button
                onClick={() => { setSaveState("idle"); setTemplateName(""); }}
                className="text-xs px-1.5 py-1 rounded-md"
                style={{ color: "var(--text-secondary, #666)" }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* ── Idle bookmark button ── */}
          {saveState === "idle" && (
            <button
              onClick={() => setSaveState("input")}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-md transition-all duration-150 hover:scale-105"
              style={{
                background: "var(--surface-primary, #fff)",
                border: "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
                color: "var(--text-secondary, #666)",
              }}
              title="Save as Template"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
              Save as Template
            </button>
          )}
        </div>
      )}
      {/* Iframe: always mounted so ref is stable; srcdoc set once,
          content streamed via postMessage for progressive rendering. */}
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin"
        className="w-full border-0"
        onLoad={() => setLoaded(true)}
        style={{
          height: showIframe ? (height > 0 ? height : 300) : 0,
          overflow: "hidden",
          background: "transparent",
          opacity: showIframe ? 1 : 0,
          transition: "height 200ms ease-out",
          display: html ? undefined : "none",
        }}
        title={title}
      />
      </div>
    </div>
  );
}
