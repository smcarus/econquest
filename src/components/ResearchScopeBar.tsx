import React from 'react';
import { Briefcase, Globe2, Layers } from 'lucide-react';

/**
 * Research: one page that looks at the same questions at three zoom levels (Sam, 2026-11-05).
 * One country, the watchlist side by side, or your own holdings. The scope is the only switch;
 * each scope then uses the same section names.
 */
export type ResearchScope = 'country' | 'compare' | 'portfolio';

export const RESEARCH_SCOPES: ResearchScope[] = ['country', 'compare', 'portfolio'];

export function isResearchScope(area: string): area is ResearchScope {
  return (RESEARCH_SCOPES as string[]).includes(area);
}

export function scopeLabel(scope: ResearchScope, countryName: string, holdingsCount: number): string {
  if (scope === 'country') return `One country: ${countryName}`;
  if (scope === 'compare') return 'Compare countries';
  return holdingsCount ? `My holdings (${holdingsCount})` : 'My holdings';
}

const ICON: Record<ResearchScope, React.ComponentType<{ className?: string }>> = {
  country: Globe2,
  compare: Layers,
  portfolio: Briefcase,
};

export const ResearchScopeBar: React.FC<{
  scope: ResearchScope;
  countryName: string;
  holdingsCount: number;
  onChange: (scope: ResearchScope) => void;
}> = ({ scope, countryName, holdingsCount, onChange }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-2" data-research-scope={scope}>
    <h1 className="ui-section-title text-base mr-1">Research</h1>
    <div role="group" aria-label="What to look at" className="flex flex-wrap gap-1.5">
      {RESEARCH_SCOPES.map((s) => {
        const Icon = ICON[s];
        return (
          <button
            key={s}
            type="button"
            data-scope={s}
            aria-pressed={scope === s}
            onClick={() => onChange(s)}
            className="ui-pill inline-flex items-center gap-1.5 whitespace-nowrap pointer-coarse:min-h-10"
          >
            <Icon className="w-3.5 h-3.5" />
            {scopeLabel(s, countryName, holdingsCount)}
          </button>
        );
      })}
    </div>
  </div>
);
