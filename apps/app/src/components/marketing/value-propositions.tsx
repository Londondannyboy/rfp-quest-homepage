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
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 
            className="text-4xl font-bold mb-4"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Everything you need to win government contracts
          </h2>
          <p 
            className="text-xl max-w-3xl mx-auto"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            From discovering opportunities to submitting winning bids, RFP.quest provides the complete toolkit for UK government procurement
          </p>
        </div>

        {/* Value proposition cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {valueProps.map((prop, index) => (
            <div
              key={index}
              className="p-8 rounded-xl text-center transition-all duration-300 hover:scale-105 group"
              style={{
                background: 'var(--color-container)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {/* Icon */}
              <div className="text-4xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
                {prop.icon}
              </div>
              
              {/* Title */}
              <h3 
                className="text-2xl font-bold mb-4"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {prop.title}
              </h3>
              
              {/* Description */}
              <p 
                className="text-lg mb-6 leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {prop.description}
              </p>
              
              {/* Features list */}
              <ul className="space-y-2 text-left">
                {prop.features.map((feature, featureIndex) => (
                  <li 
                    key={featureIndex}
                    className="flex items-center space-x-3"
                  >
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ 
                        background: index === 0 
                          ? 'var(--color-mint-dark)' 
                          : index === 1 
                          ? 'var(--color-lilac-dark)' 
                          : 'var(--color-mint-dark)' 
                      }}
                    />
                    <span 
                      className="text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p 
            className="text-lg mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Join hundreds of UK suppliers already using RFP.quest
          </p>
          <a
            href="/auth"
            className="inline-flex items-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: 'var(--color-glass)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              backdropFilter: 'blur(10px)',
            }}
          >
            Get started free
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}