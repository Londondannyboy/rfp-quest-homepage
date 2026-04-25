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
import { MarketPulse } from "@/components/market-pulse";
import type { MarketPulseData } from "@/app/api/market-pulse/route";

export function AppLayout() {
  const [demoDrawerOpen, setDemoDrawerOpen] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);
  const [marketPulseData, setMarketPulseData] = useState<MarketPulseData | null>(null);
  const [queryCount, setQueryCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  useGenerativeUIExamples(userContext);
  useExampleSuggestions();
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();

  // Get user context directly from client-side auth and fetch company profile
  useEffect(() => {
    const getUserContext = async () => {
      try {
        const { data: session } = await authClient.getSession();
        
        if (session?.user?.email) {
          // First set basic auth context
          const basicContext = {
            authenticated: true,
            email: session.user.email,
            user_id: session.user.id,
          };
          setUserContext(basicContext);

          // Then try to fetch company profile
          try {
            const companyResponse = await fetch('/api/company-context', {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (companyResponse.ok) {
              const companyData = await companyResponse.json();
              
              // Merge company data with basic context
              setUserContext({
                ...basicContext,
                company_id: companyData.company_id,
                company_name: companyData.company_name,
                sectors: companyData.sectors,
                is_sme: companyData.is_sme
              });
            } else {
              // Company context failed, but user is still authenticated
              console.log('No company profile found, user may need onboarding');
            }
          } catch (companyError) {
            console.error('Failed to fetch company context:', companyError);
            // Keep basic auth context even if company fetch fails
          }
        } else {
          setUserContext({ authenticated: false });
        }
      } catch (error) {
        console.error('Failed to get user context:', error);
        setUserContext({ authenticated: false });
      }
    };

    const fetchMarketPulse = async () => {
      try {
        const response = await fetch('/api/market-pulse');
        if (response.ok) {
          const data = await response.json();
          setMarketPulseData(data);
        }
      } catch (error) {
        console.error('Failed to fetch market pulse:', error);
      }
    };

    getUserContext();
    fetchMarketPulse();
  }, []);

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
          .filter((item: any) => item?.type === "text" && typeof item?.text === "string")
          .map((item: any) => item.text)
          .join(" ");
      }
      
      const match = text.match(/TAKO_CHART:\s*(https?:\/\/[^\s]+)/);
      if (match?.[1]) newest = match[1];
    }
    
    setLatestTakoUrl(newest);
  }, [agent.state?.messages]);


  // Rate limiting for demo gallery
  const handleDemoClick = (text: string) => {
    if (!userContext?.authenticated) {
      if (queryCount >= 3) {
        setIsRateLimited(true);
        return;
      }
      setQueryCount(prev => prev + 1);
    }
    
    // Submit as user message
    agent.addMessage({ 
      id: crypto.randomUUID(), 
      content: text, 
      role: "user" 
    });
    copilotkit.runAgent({ agent });
    setDemoDrawerOpen(false);
  };

  // Hide TAKO_CHART markers in agent messages
  useEffect(() => {
    const observer = new MutationObserver(() => {
      document.querySelectorAll('[data-message-content]').forEach(el => {
        const textContent = el.textContent || '';
        if (textContent.includes('TAKO_CHART:')) {
          const cleaned = textContent.replace(/TAKO_CHART:\s*https?:\/\/[^\s]+/g, '').trim();
          if (cleaned !== textContent && el.firstChild?.nodeType === Node.TEXT_NODE) {
            el.firstChild.textContent = cleaned;
          }
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
                  <GridIcon />
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

          {/* Company Dashboard Header - shows when user has a company profile */}
          {userContext?.company_name && (
            <div
              className="shrink-0 border-b border-white/30 dark:border-white/8 px-3 sm:px-5 py-2.5 sm:py-3"
              style={{
                background: "var(--color-glass-subtle, rgba(255,255,255,0.5))",
                backdropFilter: "blur(10px)",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {userContext.company_name}
                    </span>
                    {userContext.is_sme && (
                      <span 
                        className="px-2 py-0.5 text-xs rounded-full"
                        style={{ 
                          background: "var(--color-mint-light)", 
                          color: "var(--color-mint-dark)",
                        }}
                      >
                        SME
                      </span>
                    )}
                  </div>
                  {userContext.sectors && userContext.sectors.length > 0 && (
                    <div className="flex items-center gap-1">
                      {userContext.sectors.slice(0, 2).map((sector: string, index: number) => (
                        <span 
                          key={index}
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{ 
                            background: "var(--color-lilac-light)", 
                            color: "var(--color-lilac-dark)",
                          }}
                        >
                          {sector}
                        </span>
                      ))}
                      {userContext.sectors.length > 2 && (
                        <span 
                          className="text-xs"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          +{userContext.sectors.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Market Pulse Banner */}
          <MarketPulse initialData={marketPulseData || undefined} />

          {/* Rate limiting overlay for non-authenticated users */}
          {!userContext?.authenticated && isRateLimited && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ 
                background: "rgba(0, 0, 0, 0.5)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div 
                className="max-w-md mx-4 p-8 rounded-xl text-center"
                style={{
                  background: "var(--color-container)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                <h3 
                  className="text-xl font-bold mb-4"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Sign in to continue — it's free
                </h3>
                <p 
                  className="text-sm mb-6"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  You've reached your 3 query limit. Sign in with Google to unlock unlimited AI-powered tender analysis.
                </p>
                <div className="space-y-3">
                  <Link
                    href="/auth"
                    className="block px-6 py-3 rounded-lg text-white font-semibold transition-all duration-200 hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, var(--color-mint-dark) 0%, var(--color-mint) 100%)`,
                      boxShadow: 'var(--shadow-glow-mint)',
                    }}
                  >
                    Sign in with Google
                  </Link>
                  <button
                    onClick={() => setIsRateLimited(false)}
                    className="block w-full px-4 py-2 text-sm"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Go back
                  </button>
                </div>
              </div>
            </div>
          )}

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
                style={{ borderColor: "var(--color-border, #e5e7eb)" }}>
                {latestTakoUrl && (
                  <StableIframe 
                    embed_url={latestTakoUrl}
                    title="Tako Chart Visualization"
                  />
                )}
              </div>
            </div>

            {/* Right panel — Chat */}
            <div className="flex-1 min-h-0 flex flex-col">
              <ExampleLayout 
                chatContent={
                  <CopilotChat
                    className="h-full flex flex-col"
                  />
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Demo Gallery */}
      <DemoGallery 
        open={demoDrawerOpen}
        onClose={() => setDemoDrawerOpen(false)}
        onTryDemo={(demo) => handleDemoClick(demo.prompt)}
      />

      {/* Explainer Cards Portal */}
      <ExplainerCardsPortal />
      
      {/* Desktop Tip Modal */}
      <DesktopTipModal />
    </>
  );
}