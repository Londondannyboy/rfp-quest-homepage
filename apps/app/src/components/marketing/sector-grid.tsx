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

        {/* CTA section */}
        <div 
          className="text-center p-8 rounded-xl"
          style={{
            background: `linear-gradient(135deg, var(--color-glass-subtle) 0%, var(--color-glass) 100%)`,
            border: '1px solid var(--color-border-glass)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <h3 
            className="text-2xl font-bold mb-4"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Ready to discover personalized opportunities?
          </h3>
          <p 
            className="text-lg mb-6"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Sign in to unlock AI-powered tender analysis, match scoring, and bid intelligence
          </p>
          <button
            onClick={handleSignInClick}
            className="px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all duration-200 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, var(--color-lilac-dark) 0%, var(--color-lilac) 100())`,
              boxShadow: 'var(--shadow-glow-lilac)',
            }}
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </section>
  );
}