import React from 'react';

interface EconQuestLogoProps {
  className?: string;
  size?: number;
}

/**
 * Institutional Crest & Global Meridian Compass Emblem for
 * Sovereign Council Orchestrator of EconQuest
 */
export const EconQuestLogo: React.FC<EconQuestLogoProps> = ({
  className = '',
  size = 38,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      role="img"
      aria-label="Sovereign Council Orchestrator of EconQuest Crest"
    >
      <defs>
        <linearGradient
          id="eqCrestShield"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="55%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>
        <linearGradient
          id="eqCrestGold"
          x1="8"
          y1="6"
          x2="56"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>

      {/* Outer Institutional Sovereign Octagonal Shield */}
      <polygon
        points="32,3 55,12 60,35 48,55 32,61 16,55 4,35 9,12"
        fill="url(#eqCrestShield)"
        stroke="url(#eqCrestGold)"
        strokeWidth="2.5"
      />

      {/* Inner Global Meridian Ring */}
      <circle
        cx="32"
        cy="32"
        r="19.5"
        stroke="#3b82f6"
        strokeWidth="1.2"
        strokeOpacity="0.65"
      />

      {/* Global Latitude & Longitude Meridian Arcs */}
      <ellipse
        cx="32"
        cy="32"
        rx="10"
        ry="19.5"
        stroke="#60a5fa"
        strokeWidth="1.1"
        strokeOpacity="0.55"
      />
      <line
        x1="12.5"
        y1="32"
        x2="51.5"
        y2="32"
        stroke="#60a5fa"
        strokeWidth="1.1"
        strokeOpacity="0.55"
      />
      <line
        x1="32"
        y1="12.5"
        x2="32"
        y2="51.5"
        stroke="#60a5fa"
        strokeWidth="1.1"
        strokeOpacity="0.55"
      />

      {/* Quantitative Yield / Alpha Trajectory Vector */}
      <polyline
        points="16,40 25,34 33,36 45,21"
        fill="none"
        stroke="url(#eqCrestGold)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon points="48,18 41,20 46,25" fill="url(#eqCrestGold)" />

      {/* 3-Desk Council Nodes (Geopolitical, Sovereign Credit, Macroeconomic) */}
      <circle cx="32" cy="12.5" r="2.8" fill="#f59e0b" stroke="#0f172a" strokeWidth="1" />
      <circle cx="15.5" cy="41.5" r="2.8" fill="#38bdf8" stroke="#0f172a" strokeWidth="1" />
      <circle cx="48.5" cy="41.5" r="2.8" fill="#10b981" stroke="#0f172a" strokeWidth="1" />

      {/* Central Supreme Council Compass Star */}
      <polygon
        points="32,24.5 34.2,29.8 39.5,32 34.2,34.2 32,39.5 29.8,34.2 24.5,32 29.8,29.8"
        fill="url(#eqCrestGold)"
      />
    </svg>
  );
};
