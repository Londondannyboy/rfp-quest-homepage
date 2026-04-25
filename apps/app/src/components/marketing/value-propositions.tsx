"use client";

interface ValueProp {
  icon: string;
  title: string;
  description: string;
  features: string[];
}

const valueProps: ValueProp[] = [
  {
    icon: "🔍",
    title: "Find Every Opportunity",
    description: "Access 707K+ UK government tenders from Contracts Finder and Find a Tender with real-time updates.",
    features: [
      "Live tender updates",
      "Complete historical data", 
      "Cross-portal search",
      "Smart notifications"
    ]
  },
  {
    icon: "🎯",
    title: "Match to Your Strengths",
    description: "AI-powered matching scores your company profile against tender requirements for personalized results.",
    features: [
      "Company profile matching",
      "Skills gap analysis",
      "CPV sector filtering",
      "Value range targeting"
    ]
  },
  {
    icon: "🏆",
    title: "Win More Bids",
    description: "Get AI analysis of requirements, competitor intelligence, and strategic bid recommendations.",
    features: [
      "AI requirement analysis",
      "Competitor research",
      "Decision maker insights",
      "Bid strategy guidance"
    ]
  }
];

export function ValuePropositions() {
  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Ultra-modern background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `
              radial-gradient(circle at 30% 30%, var(--color-mint-light) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, var(--color-lilac-light) 0%, transparent 50%),
              linear-gradient(45deg, transparent 30%, var(--color-glass-subtle) 50%, transparent 70%)
            `,
          }}
        />
      </div>
      
      <div className="relative max-w-7xl mx-auto">
        {/* Ultra-modern section header */}
        <div className="text-center mb-16">
          <div 
            className="inline-flex items-center px-4 py-2 rounded-full mb-6 text-sm font-medium"
            style={{
              background: 'var(--color-glass)',
              border: '1px solid var(--color-border-glass)',
              backdropFilter: 'blur(20px)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span className="mr-2">⚡</span>
            Complete Procurement Platform
          </div>
          
          <h2 className="text-5xl md:text-6xl font-black mb-6 leading-[0.9]">
            <span 
              className="block bg-gradient-to-r bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-mint-dark) 100%)`,
              }}
            >
              Everything you need
            </span>
            <span 
              className="block bg-gradient-to-r bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, var(--color-lilac-dark) 0%, var(--color-text-primary) 100%)`,
              }}
            >
              to win contracts
            </span>
          </h2>
          
          <p 
            className="text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            From discovering opportunities to submitting winning bids, RFP.quest provides the complete toolkit for UK government procurement
          </p>
        </div>

        {/* Ultra-modern value proposition cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {valueProps.map((prop, index) => {
            const gradients = [
              {
                bg: 'linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-mint) 100%)',
                accent: 'var(--color-mint-dark)',
                glow: 'rgba(133, 224, 206, 0.3)'
              },
              {
                bg: 'linear-gradient(135deg, var(--color-lilac-light) 0%, var(--color-lilac) 100%)',
                accent: 'var(--color-lilac-dark)',
                glow: 'rgba(186, 164, 238, 0.3)'
              },
              {
                bg: 'linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-lilac-light) 100%)',
                accent: 'var(--color-mint-dark)',
                glow: 'rgba(160, 194, 222, 0.3)'
              }
            ];
            const theme = gradients[index];
            
            return (
              <div
                key={index}
                className="group relative p-8 rounded-3xl text-center transition-all duration-500 hover:scale-105 hover:-translate-y-3"
                style={{
                  background: 'var(--color-glass-dark)',
                  border: '1px solid var(--color-border-glass)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {/* Gradient accent border on hover */}
                <div 
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `padding-box ${theme.bg}, border-box ${theme.bg}`,
                    border: '1px solid transparent',
                    backgroundClip: 'padding-box, border-box',
                  }}
                />
                
                {/* Top accent line */}
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full transition-all duration-500 group-hover:w-24"
                  style={{ background: theme.bg }}
                />
                
                {/* Enhanced icon */}
                <div 
                  className="relative text-5xl mb-6 transform transition-all duration-500 group-hover:scale-125 group-hover:rotate-6"
                  style={{
                    filter: `drop-shadow(0 4px 8px ${theme.glow})`,
                  }}
                >
                  {prop.icon}
                </div>
                
                {/* Modern title */}
                <h3 className="text-2xl md:text-3xl font-black mb-4 leading-tight">
                  <span 
                    className="bg-gradient-to-br bg-clip-text text-transparent"
                    style={{ backgroundImage: theme.bg }}
                  >
                    {prop.title}
                  </span>
                </h3>
                
                {/* Enhanced description */}
                <p 
                  className="text-lg mb-8 leading-relaxed"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {prop.description}
                </p>
                
                {/* Modern features list */}
                <ul className="space-y-3 text-left">
                  {prop.features.map((feature, featureIndex) => (
                    <li 
                      key={featureIndex}
                      className="flex items-center space-x-3 group/item"
                    >
                      <div 
                        className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-300 group-hover/item:scale-110"
                        style={{ background: theme.bg }}
                      >
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span 
                        className="font-medium transition-colors duration-300 group-hover/item:text-opacity-100"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                
                {/* Hover glow effect */}
                <div 
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
                  style={{ background: theme.bg, filter: 'blur(20px)' }}
                />
              </div>
            );
          })}
        </div>

        {/* Ultra-modern bottom CTA */}
        <div className="text-center">
          {/* Stats badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {[
              { number: '700K+', label: 'Tenders Tracked' },
              { number: '£340B+', label: 'Contract Value' },
              { number: '1,200+', label: 'Active Suppliers' },
            ].map((stat, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl"
                style={{
                  background: 'var(--color-glass)',
                  border: '1px solid var(--color-border-glass)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div 
                  className="text-xl font-black"
                  style={{ color: 'var(--color-mint-dark)' }}
                >
                  {stat.number}
                </div>
                <div 
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
          
          <p 
            className="text-xl mb-8 max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Join hundreds of UK suppliers already using RFP.quest to discover and win government contracts
          </p>
          
          <a
            href="/auth"
            className="group inline-flex items-center px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-lg"
            style={{
              background: 'var(--color-glass-dark)',
              color: 'var(--color-text-primary)',
              border: '2px solid var(--color-border-glass)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px -8px rgba(0,0,0,0.1)',
            }}
          >
            <span>Get started free</span>
            <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}