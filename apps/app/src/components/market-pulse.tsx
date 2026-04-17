"use client";

import { useEffect, useState } from "react";
import type { MarketPulseData } from "@/app/api/market-pulse/route";

interface MarketPulseProps {
  initialData?: MarketPulseData;
}

export function MarketPulse({ initialData }: MarketPulseProps) {
  const [data, setData] = useState<MarketPulseData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) return; // Use server-side data if available
    
    const fetchData = async () => {
      try {
        const response = await fetch('/api/market-pulse');
        if (!response.ok) throw new Error('Failed to fetch');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialData]);

  const formatValue = (value: number) => {
    if (value >= 1000000000) return `£${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `£${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`;
    return `£${value.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div 
        className="shrink-0 border-b border-white/30 dark:border-white/8 px-3 sm:px-5 py-3"
        style={{
          background: "var(--color-glass, rgba(255,255,255,0.7))",
          backdropFilter: "blur(20px)",
          borderColor: "var(--color-border-glass, rgba(255,255,255,0.3))",
        }}
      >
        <div className="animate-pulse flex items-center gap-4">
          <div className="h-4 bg-white/20 rounded w-32"></div>
          <div className="flex gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-6 bg-white/20 rounded w-16"></div>
                <div className="h-3 bg-white/20 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null; // Fail silently to not break the page
  }

  return (
    <div 
      className="shrink-0 border-b border-white/30 dark:border-white/8 px-3 sm:px-5 py-3"
      style={{
        background: "var(--color-glass, rgba(255,255,255,0.7))",
        backdropFilter: "blur(20px)",
        borderColor: "var(--color-border-glass, rgba(255,255,255,0.3))",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
            ⚡ Live Market Pulse
          </span>
        </div>
        
        <div className="flex items-center gap-6 overflow-x-auto">
          <div className="flex flex-col items-center gap-0.5 min-w-0">
            <div className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
              {data.open_count.toLocaleString()}
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Open Tenders
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5 min-w-0">
            <div className="text-lg font-bold" style={{ color: "var(--color-mint-dark)" }}>
              {formatValue(data.total_value)}
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Est. Value
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5 min-w-0">
            <div className="text-lg font-bold" style={{ color: "var(--color-lilac-dark)" }}>
              {data.closing_this_week}
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Closing This Week
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5 min-w-0">
            <div className="text-lg font-bold truncate max-w-20" style={{ color: "var(--color-text-primary)" }}>
              {data.top_sector}
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Top Sector
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}