"use client";

interface SectorStats {
  name: string;
  count: number;
  value: number;
}

interface SectorGridProps {
  sectorStats: SectorStats[];
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

function getSectorIcon(sectorName: string): string {
  const icons: Record<string, string> = {
    'Digital & Technology': '💻',
    'Healthcare': '🏥',
    'Construction': '🏗️',
    'Education': '📚',
    'Defence': '🛡️',
    'Facilities Management': '🏢',
    'Transport': '🚗',
    'Social Care': '🤝',
    'Police': '🚔',
    'Environmental': '🌱',
  };
  return icons[sectorName] || '📊';
}

function getSectorSlug(sectorName: string): string {
  return sectorName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function SectorGrid({ sectorStats }: SectorGridProps) {
  const handleSectorClick = (sectorName: string) => {
    const slug = getSectorSlug(sectorName);
    window.location.href = `/sectors/${slug}`;
  };

  const handleSignInClick = () => {
    window.location.href = '/auth';
  };

  return (
    <section id="live-pulse" className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 
            className="text-4xl font-bold mb-4"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Live Market Pulse
          </h2>
          <p 
            className="text-xl"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Explore opportunities by sector • Updated in real-time
          </p>
        </div>

        {/* Sector grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {sectorStats.map((sector) => (
            <button
              key={sector.name}
              onClick={() => handleSectorClick(sector.name)}
              className="p-6 rounded-xl text-left transition-all duration-200 hover:scale-105 hover:shadow-lg group"
              style={{
                background: 'var(--color-container)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div className="text-3xl mb-3">
                {getSectorIcon(sector.name)}
              </div>
              <h3 
                className="font-semibold text-lg mb-2 group-hover:text-mint-dark transition-colors"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {sector.name}
              </h3>
              <div className="space-y-1">
                <div 
                  className="text-2xl font-bold"
                  style={{ color: 'var(--color-mint-dark)' }}
                >
                  {sector.count.toLocaleString()}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  open tenders
                </div>
                <div 
                  className="text-lg font-semibold"
                  style={{ color: 'var(--color-lilac-dark)' }}
                >
                  {formatValue(sector.value)}
                </div>
                <div 
                  className="text-xs"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  total value
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Ultra-modern CTA section */}
        <div 
          className="relative text-center p-12 rounded-3xl overflow-hidden"
          style={{
            background: 'var(--color-glass-dark)',
            border: '1px solid var(--color-border-glass)',
            backdropFilter: 'blur(20px)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {/* Animated background gradient */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: `
                linear-gradient(135deg, var(--color-mint-light) 0%, transparent 30%, var(--color-lilac-light) 70%, transparent 100%)
              `,
              animation: 'pulse 4s ease-in-out infinite alternate',
            }}
          />
          
          <div className="relative">
            {/* Badge */}
            <div 
              className="inline-flex items-center px-4 py-2 rounded-full mb-6 text-sm font-medium"
              style={{
                background: 'var(--color-glass)',
                border: '1px solid var(--color-border-glass)',
                backdropFilter: 'blur(20px)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span className="mr-2">🚀</span>
              Unlock Full Platform
            </div>
            
            <h3 className="text-3xl md:text-4xl font-black mb-6 leading-tight">
              <span 
                className="bg-gradient-to-r bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-lilac-dark) 100%)`,
                }}
              >
                Ready for personalized
              </span>
              <br />
              <span 
                className="bg-gradient-to-r bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(135deg, var(--color-mint-dark) 0%, var(--color-text-primary) 100%)`,
                }}
              >
                opportunities?
              </span>
            </h3>
            
            <p 
              className="text-xl mb-8 max-w-2xl mx-auto leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sign in to unlock AI-powered tender analysis, intelligent match scoring, and strategic bid intelligence
            </p>
            
            <button
              onClick={handleSignInClick}
              className="group relative px-10 py-5 rounded-2xl text-white font-bold text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-lg"
              style={{
                background: `linear-gradient(135deg, var(--color-lilac-dark) 0%, var(--color-lilac) 50%, var(--color-mint) 100%)`,
                boxShadow: '0 10px 40px -10px rgba(186, 164, 238, 0.5)',
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>Sign in with Google</span>
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}