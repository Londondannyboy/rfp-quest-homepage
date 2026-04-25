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
  // Force recompile - ultra-modern styling active
  const handleSignInClick = () => {
    window.location.href = '/auth';
  };

  return (
    <section className="relative py-24 px-6 text-center overflow-hidden min-h-[90vh] flex items-center">
      {/* Sophisticated background with multiple gradients */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            background: `
              radial-gradient(circle at 20% 20%, var(--color-mint-light) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, var(--color-lilac-light) 0%, transparent 50%),
              linear-gradient(135deg, var(--color-surface-light) 0%, var(--color-surface) 100%)
            `,
          }}
        />
        {/* Animated gradient overlay */}
        <div 
          className="absolute inset-0 opacity-20 animate-pulse"
          style={{
            background: `linear-gradient(45deg, transparent 30%, var(--color-mint-light) 50%, transparent 70%)`,
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />
      </div>
      
      <div className="relative max-w-7xl mx-auto">
        {/* Badge */}
        <div 
          className="inline-flex items-center px-4 py-2 rounded-full mb-8 text-sm font-medium"
          style={{
            background: 'var(--color-glass)',
            border: '1px solid var(--color-border-glass)',
            backdropFilter: 'blur(20px)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span className="mr-2">⚡</span>
          Live UK Government Procurement Intelligence
        </div>

        {/* Main headline with modern typography */}
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-8 leading-[0.9] tracking-tight">
          <span 
            className="block bg-gradient-to-r bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-mint-dark) 100%)`,
            }}
          >
            Find Every
          </span>
          <span 
            className="block bg-gradient-to-r bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(135deg, var(--color-lilac-dark) 0%, var(--color-text-primary) 100%)`,
            }}
          >
            UK Tender
          </span>
        </h1>
        
        {/* Enhanced subheadline */}
        <div className="max-w-4xl mx-auto mb-12">
          <p 
            className="text-2xl md:text-3xl mb-4 font-semibold leading-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {marketPulseData.open_count.toLocaleString()}+ live opportunities
          </p>
          <p 
            className="text-xl md:text-2xl font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Worth {formatValue(marketPulseData.total_value)} • {marketPulseData.closing_this_week} closing this week
          </p>
          <p 
            className="text-lg mt-2"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Top sector: {marketPulseData.top_sector}
          </p>
        </div>

        {/* Modern CTAs */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
          <button
            onClick={handleSignInClick}
            className="group relative px-10 py-5 rounded-2xl text-white font-bold text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-lg"
            style={{
              background: `linear-gradient(135deg, var(--color-mint-dark) 0%, var(--color-mint) 50%, var(--color-mint-light) 100%)`,
              boxShadow: '0 10px 40px -10px rgba(133, 224, 206, 0.5)',
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              <span>Start Free Analysis</span>
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
          
          <a 
            href="#live-pulse"
            className="group px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex items-center gap-2"
            style={{
              background: 'var(--color-glass-dark)',
              color: 'var(--color-text-primary)',
              border: '2px solid var(--color-border-glass)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <span>Explore Live Data</span>
            <svg className="w-5 h-5 transition-transform group-hover:translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>

        {/* Sophisticated stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            { 
              value: marketPulseData.open_count.toLocaleString(), 
              label: 'Live Opportunities', 
              color: 'var(--color-mint-dark)',
              gradient: 'linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-mint) 100%)'
            },
            { 
              value: formatValue(marketPulseData.total_value), 
              label: 'Combined Value', 
              color: 'var(--color-lilac-dark)',
              gradient: 'linear-gradient(135deg, var(--color-lilac-light) 0%, var(--color-lilac) 100%)'
            },
            { 
              value: marketPulseData.closing_this_week.toString(), 
              label: 'Closing This Week', 
              color: 'var(--color-mint-dark)',
              gradient: 'linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-mint) 100%)'
            },
            { 
              value: marketPulseData.top_sector.split(' ')[0], 
              label: 'Leading Sector', 
              color: 'var(--color-lilac-dark)',
              gradient: 'linear-gradient(135deg, var(--color-lilac-light) 0%, var(--color-lilac) 100%)'
            }
          ].map((stat, index) => (
            <div 
              key={index}
              className="relative group p-8 rounded-3xl text-center transition-all duration-500 hover:scale-105 hover:-translate-y-2"
              style={{
                background: 'var(--color-glass-dark)',
                border: '1px solid var(--color-border-glass)',
                backdropFilter: 'blur(20px)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {/* Gradient accent */}
              <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full"
                style={{ background: stat.gradient }}
              />
              
              <div 
                className="text-4xl lg:text-5xl font-black mb-3 bg-gradient-to-br bg-clip-text text-transparent"
                style={{ backgroundImage: stat.gradient }}
              >
                {stat.value}
              </div>
              <div 
                className="text-sm font-semibold tracking-wide uppercase"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {stat.label}
              </div>
              
              {/* Hover glow effect */}
              <div 
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
                style={{ background: stat.gradient, filter: 'blur(20px)' }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}