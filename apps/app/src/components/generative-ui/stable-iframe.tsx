"use client";

import { memo, useEffect, useRef, useState, useCallback } from "react";

/**
 * Global iframe registry — once an embed_url is registered with an ID,
 * it never changes. This prevents React re-renders from flickering iframes.
 */
const iframeRegistry = new Map<string, string>();

function getStableId(src: string): string {
  const existing = Array.from(iframeRegistry.entries()).find(
    ([, url]) => url === src
  );
  if (existing) return existing[0];

  // Generate deterministic ID from URL
  let hash = 0;
  for (let i = 0; i < src.length; i++) {
    hash = ((hash << 5) - hash + src.charCodeAt(i)) | 0;
  }
  const id = `tako-${Math.abs(hash).toString(36)}`;
  iframeRegistry.set(id, src);
  return id;
}

interface StableIframeProps {
  embed_url: string;
  title: string;
}

/**
 * StableIframe — React.memo wrapper for Tako chart embeds.
 * Rendered as a sibling OUTSIDE ReactMarkdown/CopilotChat markdown tree.
 * Uses iframeRegistry for stable IDs to prevent flickering on re-render.
 * Handles tako::resize postMessage for dynamic height adjustment.
 */
export const StableIframe = memo(function StableIframe({
  embed_url,
  title,
}: StableIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(400);
  const stableId = getStableId(embed_url);

  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (
        e.data?.type === "tako::resize" &&
        typeof e.data.height === "number"
      ) {
        // Only handle messages from our iframe
        if (iframeRef.current?.contentWindow === e.source) {
          setHeight(Math.min(Math.max(e.data.height, 200), 2000));
        }
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  if (!embed_url) {
    return (
      <div
        className="rounded-xl border p-4 text-sm"
        style={{
          color: "var(--color-text-secondary, #666)",
          borderColor: "var(--color-border-tertiary, #e5e7eb)",
          background: "var(--color-background-secondary, #f9fafb)",
        }}
      >
        Chart unavailable — no embed URL provided.
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{
        borderColor: "var(--color-border-tertiary, #e5e7eb)",
        background: "var(--color-background-primary, #fff)",
      }}
    >
      {title && (
        <div
          className="px-4 py-2.5 text-sm font-medium border-b"
          style={{
            color: "var(--color-text-primary, #111)",
            borderColor: "var(--color-border-tertiary, #e5e7eb)",
            background: "var(--color-background-secondary, #f9fafb)",
          }}
        >
          {title}
        </div>
      )}
      <iframe
        ref={iframeRef}
        id={stableId}
        src={embed_url}
        title={title || "Tako Analytics Chart"}
        width="100%"
        height={height}
        sandbox="allow-scripts allow-same-origin"
        style={{
          border: "none",
          display: "block",
          transition: "height 0.2s ease",
        }}
      />
    </div>
  );
});
