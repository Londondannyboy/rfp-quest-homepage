"use client";

import { useEffect, useState } from "react";
import { ExampleLayout } from "@/components/example-layout";
import { useGenerativeUIExamples, useExampleSuggestions } from "@/hooks";
import { ExplainerCardsPortal } from "@/components/explainer-cards";
import { DemoGallery, type DemoItem } from "@/components/demo-gallery";
import { GridIcon } from "@/components/demo-gallery/grid-icon";
import { DesktopTipModal } from "@/components/desktop-tip-modal";
import { StableIframe } from "@/components/generative-ui/stable-iframe";
import { CopilotChat, useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import { SignedIn, SignedOut } from "@neondatabase/neon-js/auth/react/ui";
import Link from "next/link";
import { authClient } from "@/lib/auth";


export default function HomePage() {
  useGenerativeUIExamples();
  useExampleSuggestions();

  const [demoDrawerOpen, setDemoDrawerOpen] = useState(false);
  const [contextSent, setContextSent] = useState(false);
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();

  // Inject user email from Neon Auth session on mount
  useEffect(() => {
    if (!contextSent) {
      authClient.getSession().then((data) => {
        if (data?.user?.email) {
          // Inject email as system context message
          const contextMessage = `[SYSTEM CONTEXT] User email: ${data.user.email}`;
          agent.addMessage({ 
            id: crypto.randomUUID(), 
            content: contextMessage, 
            role: "user" 
          });
          setContextSent(true);
        }
      }).catch(() => {
        // User not signed in, no context to inject
      });
    }
  }, [contextSent, agent]);

  // Detect Tako chart URLs in agent messages — show latest chart only
  const [latestTakoUrl, setLatestTakoUrl] = useState<string | null>(null);
  useEffect(() => {
    const messages = agent.state?.messages;
    if (!messages) return;
    const msgArray = Array.isArray(messages) ? messages : (messages as any)?.value || [];
    let newest: string | null = null;
    for (const msg of msgArray) {
      let text = "";
      if (typeof msg?.content === "string") {
        text = msg.content;
      } else if (Array.isArray(msg?.content)) {
        text = msg.content
          .filter((b: any) => b?.type === "text")
          .map((b: any) => b?.text || "")
          .join(" ");
      }
      const regex = /TAKO_CHART:\s*(https:\/\/tako\.com\/embed\/[^\s]+)/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        newest = match[1];
      }
    }
    if (newest && newest !== latestTakoUrl) setLatestTakoUrl(newest);
  }, [agent.state?.messages]);

  const handleTryDemo = (demo: DemoItem) => {
    setDemoDrawerOpen(false);
    agent.addMessage({ id: crypto.randomUUID(), content: demo.prompt, role: "user" });
    copilotkit.runAgent({ agent });
  };

  // Hide TAKO_CHART: marker and [SYSTEM CONTEXT] messages from chat
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Hide TAKO_CHART markers
      document.querySelectorAll('[data-testid="copilot-assistant-message"] p').forEach((p) => {
        if (p.textContent?.includes("TAKO_CHART:")) {
          (p as HTMLElement).style.display = "none";
        }
      });
      // Hide [SYSTEM CONTEXT] messages completely
      document.querySelectorAll('[data-testid="copilot-user-message"]').forEach((msg) => {
        if (msg.textContent?.includes("[SYSTEM CONTEXT]")) {
          (msg as HTMLElement).style.display = "none";
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Widget bridge: handle messages from widget iframes
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "open-link" && typeof e.data.url === "string") {
        window.open(e.data.url, "_blank", "noopener,noreferrer");
      }
      // sendPrompt from widget iframe → submit as chat message
      if (e.data?.type === "send-prompt" && typeof e.data.text === "string") {
        agent.addMessage({ id: crypto.randomUUID(), content: e.data.text, role: "user" });
        copilotkit.runAgent({ agent });
      }
      // Tako iframe resize events are handled by StableIframe component directly
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [agent, copilotkit]);


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
            <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div
                  className="flex items-center justify-center shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg"
                  style={{
                    background: "linear-gradient(135deg, rgba(190,194,255,0.15), rgba(133,224,206,0.12))",
                  }}
                >
                  <span className="text-lg sm:text-xl leading-none" role="img" aria-label="CopilotKit">🪁</span>
                </div>
                <p className="text-sm sm:text-base font-semibold m-0 leading-snug" style={{ color: "var(--text-primary)" }}>
                  RFP.quest
                  <span className="hidden sm:inline font-normal" style={{ color: "var(--text-secondary)" }}> Beta</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setDemoDrawerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium no-underline whitespace-nowrap transition-all duration-150 hover:-translate-y-px cursor-pointer"
                  style={{
                    color: "var(--text-secondary)",
                    border: "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
                    background: "var(--surface-primary, rgba(255,255,255,0.6))",
                    fontFamily: "var(--font-family)",
                  }}
                  title="Open Demo Gallery"
                >
                  <GridIcon size={15} />
                  <span className="hidden sm:inline">Demos</span>
                </button>
                <SignedOut>
                  <Link href="/auth"
                    className="inline-flex items-center px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-white no-underline whitespace-nowrap transition-all duration-150 hover:-translate-y-px"
                    style={{ background: "linear-gradient(135deg, var(--color-lilac-dark), var(--color-mint-dark))", boxShadow: "0 1px 4px rgba(149,153,204,0.3)" }}>
                    Sign in
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link href="/account"
                    className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium no-underline whitespace-nowrap transition-all duration-150 hover:-translate-y-px"
                    style={{ color: "var(--text-secondary)", border: "1px solid var(--color-border-glass, rgba(0,0,0,0.1))", background: "var(--surface-primary, rgba(255,255,255,0.6))" }}>
                    Account
                  </Link>
                </SignedIn>
              </div>
            </div>
          </div>

          {/* Two-panel layout: chart left, chat right (stacks on mobile) */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            {/* Left panel — Tako chart + content */}
            <div
              className="lg:flex-1 min-h-0 overflow-auto border-b lg:border-b-0 lg:border-r"
              style={{
                borderColor: "var(--color-border-tertiary, #e5e7eb)",
                display: latestTakoUrl ? "flex" : "none",
                flexDirection: "column",
              }}
            >
              <div className="m-3 rounded-xl border overflow-hidden flex-1 min-h-0"
                style={{
                  borderColor: "var(--color-border-tertiary, #e5e7eb)",
                  background: "var(--color-background-primary, #fff)",
                }}>
                {latestTakoUrl && (
                  <StableIframe key={latestTakoUrl} embed_url={latestTakoUrl} title="" />
                )}
              </div>
            </div>

            {/* Right panel — Chat */}
            <div className={latestTakoUrl ? "lg:w-[480px] lg:shrink-0" : "flex-1"}>
              <ExampleLayout chatContent={
                <CopilotChat
                  labels={{
                    welcomeMessageText: "Welcome to RFP.quest Beta. Ask me about UK government tenders, or try a demo from the gallery.",
                    chatDisclaimerText: "Visualizations are AI-generated. You can retry the same prompt or ask the AI to refine the result.",
                  }}
                />
              } />
            </div>
          </div>
          <ExplainerCardsPortal />
        </div>
      </div>

      <DemoGallery
        open={demoDrawerOpen}
        onClose={() => setDemoDrawerOpen(false)}
        onTryDemo={handleTryDemo}
      />

      <DesktopTipModal />
    </>
  );
}
