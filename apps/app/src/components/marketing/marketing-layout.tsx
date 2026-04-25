"use client";

import { HeroSection } from './hero-section';
import { SectorGrid } from './sector-grid';
import { ValuePropositions } from './value-propositions';
import { MarketPulse } from '../market-pulse';
import type { MarketPulseData } from '@/app/api/market-pulse/route';

interface SectorStats {
  name: string;
  count: number;
  value: number;
}

interface MarketingLayoutProps {
  marketPulseData: MarketPulseData;
  sectorStats: SectorStats[];
}

export function MarketingLayout({ marketPulseData, sectorStats }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav 
        className="sticky top-0 z-50 px-6 py-4"
        style={{
          background: 'var(--color-glass-dark)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--color-border-glass)',
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-2xl">🎯</div>
            <span 
              className="text-xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              RFP.quest
            </span>
            <span 
              className="px-2 py-1 text-xs rounded-full"
              style={{ 
                background: 'var(--color-mint-light)', 
                color: 'var(--color-mint-dark)',
              }}
            >
              Beta
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <a 
              href="/sectors" 
              className="text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sectors
            </a>
            <a 
              href="/suppliers" 
              className="text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Suppliers
            </a>
            <a
              href="/auth"
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105"
              style={{
                background: 'var(--color-mint-dark)',
                color: 'white',
              }}
            >
              Sign In
            </a>
          </div>
        </div>
      </nav>

      {/* Market Pulse Banner - Compact version */}
      <div className="px-6">
        <div className="max-w-6xl mx-auto">
          <MarketPulse initialData={marketPulseData} compact />
        </div>
      </div>

      {/* Hero Section */}
      <HeroSection marketPulseData={marketPulseData} />

      {/* Sector Grid */}
      <SectorGrid sectorStats={sectorStats} />

      {/* Value Propositions */}
      <ValuePropositions />

      {/* Footer */}
      <footer 
        className="py-12 px-6 mt-16"
        style={{
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="text-2xl">🎯</div>
                <span 
                  className="text-xl font-bold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  RFP.quest
                </span>
              </div>
              <p 
                className="text-sm leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                AI-powered UK government procurement intelligence platform. 
                Find opportunities, analyze requirements, win more bids.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 
                className="font-semibold mb-4"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Platform
              </h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/sectors" className="hover:opacity-70" style={{ color: 'var(--color-text-secondary)' }}>Browse Sectors</a></li>
                <li><a href="/suppliers" className="hover:opacity-70" style={{ color: 'var(--color-text-secondary)' }}>Top Suppliers</a></li>
                <li><a href="/auth" className="hover:opacity-70" style={{ color: 'var(--color-text-secondary)' }}>Sign Up</a></li>
              </ul>
            </div>

            {/* Data */}
            <div>
              <h4 
                className="font-semibold mb-4"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Data Sources
              </h4>
              <ul className="space-y-2 text-sm">
                <li><span style={{ color: 'var(--color-text-secondary)' }}>Contracts Finder</span></li>
                <li><span style={{ color: 'var(--color-text-secondary)' }}>Find a Tender</span></li>
                <li><span style={{ color: 'var(--color-text-secondary)' }}>707K+ tenders</span></li>
                <li><span style={{ color: 'var(--color-text-secondary)' }}>2000-2026 coverage</span></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 
                className="font-semibold mb-4"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Legal
              </h4>
              <ul className="space-y-2 text-sm">
                <li><span style={{ color: 'var(--color-text-secondary)' }}>Privacy Policy</span></li>
                <li><span style={{ color: 'var(--color-text-secondary)' }}>Terms of Service</span></li>
                <li><span style={{ color: 'var(--color-text-secondary)' }}>Open Government Licence</span></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t pt-8 mt-8" style={{ borderColor: 'var(--color-border)' }}>
            <p 
              className="text-center text-sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              © 2026 RFP.quest. Built with data from UK Government Digital Service.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}