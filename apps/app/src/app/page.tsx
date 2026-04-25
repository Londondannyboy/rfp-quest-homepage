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
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import type { MarketPulseData } from "@/app/api/market-pulse/route";


export default function HomePage() {
  const [demoDrawerOpen, setDemoDrawerOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);
  const [marketPulseData, setMarketPulseData] = useState<MarketPulseData | null>(null);
  const [sectorStats, setSectorStats] = useState<Array<{name: string; count: number; value: number}>>([]);
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
            company_id: null,
            company_name: null,
            sectors: null,
            is_sme: null,
            description: null
          };
          
          // Fetch company context
          try {
            const companyResponse = await fetch(`/api/company-context?email=${encodeURIComponent(session.user.email)}`);
            const companyData = await companyResponse.json();
            
            if (companyData.found) {
              setUserContext({
                authenticated: true,
                email: companyData.email,
                user_id: companyData.user_id,
                company_id: companyData.company_id,
                company_name: companyData.company_name,
                sectors: companyData.sectors,
                is_sme: companyData.is_sme,
                description: companyData.description,
                domain: companyData.domain,
                role: companyData.role
              });
            } else {
              setUserContext(basicContext);
            }
          } catch (err) {
            console.error('Error fetching company context:', err);
            setUserContext(basicContext);
          }
        } else {
          setUserContext({ authenticated: false });
        }
      } catch (error) {
        console.error('Error getting user context:', error);
        setUserContext({ authenticated: false });
      } finally {
        setAuthReady(true);
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

    const fetchSectorStats = async () => {
      try {
        // For now, create mock data since we need a new API endpoint
        // This should be replaced with a real API call
        const mockSectorStats = [
          { name: 'Digital & Technology', count: 1200, value: 450000000 },
          { name: 'Healthcare', count: 980, value: 320000000 },
          { name: 'Construction', count: 850, value: 680000000 },
          { name: 'Education', count: 720, value: 280000000 },
          { name: 'Defence', count: 650, value: 890000000 },
          { name: 'Facilities Management', count: 600, value: 220000000 },
          { name: 'Transport', count: 550, value: 420000000 },
          { name: 'Social Care', count: 480, value: 180000000 },
        ];
        setSectorStats(mockSectorStats);
      } catch (error) {
        console.error('Failed to fetch sector stats:', error);
      }
    };

    getUserContext();
    fetchMarketPulse();
    fetchSectorStats();
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
    
    // Rate limiting for non-authenticated users
    if (!userContext?.authenticated) {
      if (queryCount >= 3) {
        setIsRateLimited(true);
        return;
      }
      setQueryCount(prev => prev + 1);
    }
    
    agent.addMessage({ id: crypto.randomUUID(), content: demo.prompt, role: "user" });
    copilotkit.runAgent({ agent });
  };

  // Hide TAKO_CHART: marker from chat
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Hide TAKO_CHART markers
      document.querySelectorAll('[data-testid="copilot-assistant-message"] p').forEach((p) => {
        if (p.textContent?.includes("TAKO_CHART:")) {
          (p as HTMLElement).style.display = "none";
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


  // Show marketing layout for non-authenticated users
  if (!userContext?.authenticated && authReady && marketPulseData && sectorStats.length > 0) {
    return <MarketingLayout marketPulseData={marketPulseData} sectorStats={sectorStats} />;
  }

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

          {/* Company Dashboard Header - shows when user has a company profile */}
          {userContext?.company_id && (
            <div
              className="shrink-0 border-b border-white/30 dark:border-white/8 px-3 sm:px-5 py-3"
              style={{
                background: "var(--surface-primary, rgba(255,255,255,0.6))",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <h2 className="text-lg font-semibold m-0" style={{ color: "var(--text-primary)" }}>
                      {userContext.company_name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      {userContext.is_sme && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full"
                          style={{
                            background: "linear-gradient(135deg, rgba(133,224,206,0.2), rgba(133,224,206,0.1))",
                            color: "var(--color-mint-dark, #28a59a)",
                            border: "1px solid rgba(133,224,206,0.3)"
                          }}>
                          SME
                        </span>
                      )}
                      {userContext.sectors && typeof userContext.sectors === 'string' && (
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {userContext.sectors.split(',').slice(0, 2).join(', ')}
                          {userContext.sectors.split(',').length > 2 && ` +${userContext.sectors.split(',').length - 2} more`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {userContext.email}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Market Pulse Banner */}
          <MarketPulse initialData={marketPulseData || undefined} />

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
              {authReady ? (
                <ExampleLayout chatContent={
                  isRateLimited ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-6 max-w-md">
                        <div className="mb-4">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                            style={{ background: "var(--color-glass, rgba(255,255,255,0.7))", border: "1px solid var(--color-border-glass)" }}>
                            <span className="text-2xl">🔒</span>
                          </div>
                          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
                            Sign in to continue — it's free
                          </h3>
                          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                            You've reached the limit for anonymous queries. Sign in to get unlimited access to RFP.quest.
                          </p>
                          <Link 
                            href="/auth" 
                            className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white no-underline transition-all duration-150 hover:-translate-y-px"
                            style={{ background: "linear-gradient(135deg, var(--color-lilac-dark), var(--color-mint-dark))" }}
                          >
                            Sign in for free
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <CopilotChat
                      labels={{
                        welcomeMessageText: userContext?.authenticated ? 
                          "Welcome back to RFP.quest Beta. Ask me about UK government tenders, or try a demo from the gallery." :
                          `Welcome to RFP.quest Beta. Ask me about UK government tenders, or try a demo from the gallery. (${3 - queryCount} free queries remaining)`,
                        chatDisclaimerText: "Visualizations are AI-generated. You can retry the same prompt or ask the AI to refine the result.",
                      }}
                    />
                  )
                } />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
                    <p className="text-sm text-gray-600">Loading...</p>
                  </div>
                </div>
              )}
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
