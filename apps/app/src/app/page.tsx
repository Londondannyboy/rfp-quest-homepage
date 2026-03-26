"use client";

import { useEffect, useState } from "react";
import { ExampleLayout } from "@/components/example-layout";
import { useGenerativeUIExamples, useExampleSuggestions } from "@/hooks";
import { ExplainerCardsPortal } from "@/components/explainer-cards";
import { DemoGallery, type DemoItem } from "@/components/demo-gallery";

import { CopilotChat } from "@copilotkit/react-core/v2";
import { useCopilotChat } from "@copilotkit/react-core";

export default function HomePage() {
  useGenerativeUIExamples();
  useExampleSuggestions();

  const [demoDrawerOpen, setDemoDrawerOpen] = useState(false);
  const { appendMessage } = useCopilotChat();

  const handleTryDemo = (demo: DemoItem) => {
    setDemoDrawerOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appendMessage({ content: demo.prompt, role: "user" } as any);
  };

  // Widget bridge: handle messages from widget iframes
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "open-link" && typeof e.data.url === "string") {
        window.open(e.data.url, "_blank", "noopener,noreferrer");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);


  return (
    <>
      {/* Animated background */}
      <div className="abstract-bg">
        <div className="blob-3" />
      </div>

      {/* App shell */}
      <div className="brand-shell" style={{ position: "relative", zIndex: 1 }}>
        <div className="brand-glass-container">
          {/* CTA Banner */}
          <div
            className="shrink-0 border-b border-white/30 dark:border-white/8"
            style={{
              background: "linear-gradient(135deg, rgba(190,194,255,0.08) 0%, rgba(133,224,206,0.06) 100%)",
            }}
          >
            <div className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="flex items-center justify-center shrink-0 w-9 h-9 rounded-lg"
                  style={{
                    background: "linear-gradient(135deg, rgba(190,194,255,0.15), rgba(133,224,206,0.12))",
                  }}
                >
                  <span className="text-xl leading-none" role="img" aria-label="CopilotKit">🪁</span>
                </div>
                <p className="text-base font-semibold m-0 leading-snug" style={{ color: "var(--text-primary)" }}>
                  Open Generative UI
                  <span className="font-normal" style={{ color: "var(--text-secondary)" }}> — powered by CopilotKit</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDemoDrawerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium no-underline whitespace-nowrap transition-all duration-150 hover:-translate-y-px cursor-pointer"
                  style={{
                    color: "var(--text-secondary)",
                    border: "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
                    background: "var(--surface-primary, rgba(255,255,255,0.6))",
                    fontFamily: "var(--font-family)",
                  }}
                  title="Open Demo Gallery"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="7" x="3" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                  Demos
                </button>
                <a
                  href="https://github.com/CopilotKit/OpenGenerativeUI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-5 py-2 rounded-full text-sm font-semibold text-white no-underline whitespace-nowrap transition-all duration-150 hover:-translate-y-px"
                  style={{
                    background: "linear-gradient(135deg, var(--color-lilac-dark), var(--color-mint-dark))",
                    boxShadow: "0 1px 4px rgba(149,153,204,0.3)",
                    fontFamily: "var(--font-family)",
                  }}
                >
                  Get started
                </a>
              </div>
            </div>
          </div>

          <ExampleLayout chatContent={
            <CopilotChat
              labels={{
                welcomeMessageText: "What do you want to visualize today?",
              }}
            />
          } />
          <ExplainerCardsPortal />
        </div>
      </div>

      <DemoGallery
        open={demoDrawerOpen}
        onClose={() => setDemoDrawerOpen(false)}
        onTryDemo={handleTryDemo}
      />
    </>
  );
}
