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
        {/* Ultra-modern section header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
            <span 
              className="bg-gradient-to-r bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-mint-dark) 100%)`,
              }}
            >
              Market
            </span>
            <br />
            <span 
              className="bg-gradient-to-r bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, var(--color-lilac-dark) 0%, var(--color-text-primary) 100%)`,
              }}
            >
              Pulse
            </span>
          </h2>
          <p 
            className="text-xl md:text-2xl font-medium max-w-3xl mx-auto leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Explore live opportunities by sector • Updated in real-time from government sources
          </p>
        </div>

        {/* Ultra-modern sector grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {sectorStats.map((sector, index) => (
            <button
              key={sector.name}
              onClick={() => handleSectorClick(sector.name)}
              className="relative group p-8 rounded-3xl text-left transition-all duration-500 hover:scale-105 hover:-translate-y-3 overflow-hidden"
              style={{
                background: 'var(--color-glass-dark)',
                border: '1px solid var(--color-border-glass)',
                backdropFilter: 'blur(20px)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {/* Gradient accent at the top */}
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-full"
                style={{ 
                  background: index % 2 === 0 
                    ? 'linear-gradient(90deg, var(--color-mint-light) 0%, var(--color-mint-dark) 100%)' 
                    : 'linear-gradient(90deg, var(--color-lilac-light) 0%, var(--color-lilac-dark) 100%)'
                }}
              />
              
              {/* Animated background glow */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none rounded-3xl"
                style={{ 
                  background: index % 2 === 0 
                    ? 'linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-mint-dark) 100%)' 
                    : 'linear-gradient(135deg, var(--color-lilac-light) 0%, var(--color-lilac-dark) 100%)',
                  filter: 'blur(20px)'
                }}
              />
              
              <div className="relative z-10">
                {/* Enhanced icon */}
                <div className="text-4xl mb-4 transform transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
                  {getSectorIcon(sector.name)}
                </div>
                
                {/* Sector name with gradient on hover */}
                <h3 className="font-bold text-xl mb-4 leading-tight transition-all duration-300">
                  <span 
                    className="group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300"
                    style={{ 
                      color: 'var(--color-text-primary)',
                      backgroundImage: index % 2 === 0 
                        ? `linear-gradient(135deg, var(--color-mint-dark) 0%, var(--color-mint) 100%)` 
                        : `linear-gradient(135deg, var(--color-lilac-dark) 0%, var(--color-lilac) 100%)`
                    }}
                  >
                    {sector.name}
                  </span>
                </h3>
                
                {/* Modern stats layout */}
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <div 
                      className="text-3xl font-black bg-gradient-to-br bg-clip-text text-transparent"
                      style={{ 
                        backgroundImage: index % 2 === 0 
                          ? 'linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-mint-dark) 100%)' 
                          : 'linear-gradient(135deg, var(--color-lilac-light) 0%, var(--color-lilac-dark) 100%)'
                      }}
                    >
                      {sector.count.toLocaleString()}
                    </div>
                    <div 
                      className="text-sm font-medium uppercase tracking-wide"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Tenders
                    </div>
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <div 
                      className="text-xl font-bold bg-gradient-to-br bg-clip-text text-transparent"
                      style={{ 
                        backgroundImage: index % 2 === 0 
                          ? 'linear-gradient(135deg, var(--color-lilac-light) 0%, var(--color-lilac-dark) 100%)' 
                          : 'linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-mint-dark) 100%)'
                      }}
                    >
                      {formatValue(sector.value)}
                    </div>
                    <div 
                      className="text-xs font-medium uppercase tracking-wide"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Total Value
                    </div>
                  </div>
                </div>
                
                {/* Hover arrow indicator */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-secondary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
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