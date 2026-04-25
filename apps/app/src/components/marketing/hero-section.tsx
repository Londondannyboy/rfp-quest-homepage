"use client";

import type { MarketPulseData } from '@/app/api/market-pulse/route';

interface HeroSectionProps {
  marketPulseData: MarketPulseData;
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) {
    return `£${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `£${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `£${(value / 1_000).toFixed(1)}K`;
  }
  return `£${value.toLocaleString()}`;
}

export function HeroSection({ marketPulseData }: HeroSectionProps) {
  const handleSignInClick = () => {
    window.location.href = '/auth';
  };

  return (
    <section className="relative py-20 px-6 text-center overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-lilac-light) 100%)`,
        }}
      />
      
      <div className="relative max-w-6xl mx-auto">
        {/* Main headline */}
        <h1 
          className="text-5xl md:text-6xl font-bold mb-6 leading-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Find Every UK<br />
          Government Tender
        </h1>
        
        {/* Subheadline with live stats */}
        <p 
          className="text-xl md:text-2xl mb-8 font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {marketPulseData.open_count.toLocaleString()}+ live opportunities worth{' '}
          {formatValue(marketPulseData.total_value)}
          <br />
          <span className="text-lg">
            {marketPulseData.closing_this_week} closing this week • Top sector: {marketPulseData.top_sector}
          </span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button
            onClick={handleSignInClick}
            className="px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all duration-200 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, var(--color-mint-dark) 0%, var(--color-mint) 100%)`,
              boxShadow: 'var(--shadow-glow-mint)',
            }}
          >
            Sign in to unlock AI analysis
          </button>
          
          <a 
            href="#live-pulse"
            className="px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-105"
            style={{
              background: 'var(--color-glass)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-glass)',
              backdropFilter: 'blur(10px)',
            }}
          >
            Explore live data
          </a>
        </div>

        {/* Live stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div 
            className="p-6 rounded-xl text-center"
            style={{
              background: 'var(--color-glass)',
              border: '1px solid var(--color-border-glass)',
              backdropFilter: 'blur(10px)',
              boxShadow: 'var(--shadow-glass)',
            }}
          >
            <div 
              className="text-3xl font-bold mb-2"
              style={{ color: 'var(--color-mint-dark)' }}
            >
              {marketPulseData.open_count.toLocaleString()}
            </div>
            <div 
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Open Tenders
            </div>
          </div>

          <div 
            className="p-6 rounded-xl text-center"
            style={{
              background: 'var(--color-glass)',
              border: '1px solid var(--color-border-glass)',
              backdropFilter: 'blur(10px)',
              boxShadow: 'var(--shadow-glass)',
            }}
          >
            <div 
              className="text-3xl font-bold mb-2"
              style={{ color: 'var(--color-lilac-dark)' }}
            >
              {formatValue(marketPulseData.total_value)}
            </div>
            <div 
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Total Value
            </div>
          </div>

          <div 
            className="p-6 rounded-xl text-center"
            style={{
              background: 'var(--color-glass)',
              border: '1px solid var(--color-border-glass)',
              backdropFilter: 'blur(10px)',
              boxShadow: 'var(--shadow-glass)',
            }}
          >
            <div 
              className="text-3xl font-bold mb-2"
              style={{ color: 'var(--color-mint-dark)' }}
            >
              {marketPulseData.closing_this_week}
            </div>
            <div 
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Closing This Week
            </div>
          </div>

          <div 
            className="p-6 rounded-xl text-center"
            style={{
              background: 'var(--color-glass)',
              border: '1px solid var(--color-border-glass)',
              backdropFilter: 'blur(10px)',
              boxShadow: 'var(--shadow-glass)',
            }}
          >
            <div 
              className="text-2xl font-bold mb-2"
              style={{ color: 'var(--color-lilac-dark)' }}
            >
              {marketPulseData.top_sector}
            </div>
            <div 
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Top Sector
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}