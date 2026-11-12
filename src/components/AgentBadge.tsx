import React from 'react';
import {
  Activity,
  Banknote,
  Bot,
  Building2,
  CalendarDays,
  ChartLine,
  Database,
  FileText,
  Gavel,
  Globe,
  HandCoins,
  Hourglass,
  Landmark,
  NotebookPen,
  Route,
  Scale,
  Search,
  SearchCheck,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
  Vote,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import { agentBadge, type AgentIconKey } from '../utils/agentBadges';
import type { AgentStatus } from './AgentNetwork';

const ICONS: Record<AgentIconKey, LucideIcon> = {
  bank: Landmark,
  coins: HandCoins,
  vote: Vote,
  scale: Scale,
  banknote: Banknote,
  globe: Globe,
  calendar: CalendarDays,
  hourglass: Hourglass,
  file: FileText,
  chart: ChartLine,
  trend: TrendingUp,
  check: SearchCheck,
  route: Route,
  pen: NotebookPen,
  database: Database,
  shield: ShieldAlert,
  building: Building2,
  pulse: Activity,
  search: Search,
  cascade: Waypoints,
  user: UserCheck,
  gavel: Gavel,
  crowd: Users,
  agent: Bot,
};

/** The ring around the badge shows the agent's live status (same colours as before). */
const RING: Record<AgentStatus, string> = {
  waiting: 'ring-slate-300 dark:ring-slate-600',
  running: 'ring-blue-500 animate-pulse',
  done: 'ring-emerald-500',
  fallback: 'ring-amber-500',
  skipped: 'ring-slate-300 dark:ring-slate-600',
  failed: 'ring-rose-500',
};

/**
 * A round icon badge for one council agent, chosen by its specialty (src/utils/agentBadges.ts).
 * Decorative by default: the agent's name is always written beside it, and the plain-words
 * explanation is on the surrounding element's hover text.
 */
export const AgentBadge: React.FC<{ id: string; status?: AgentStatus; size?: 'sm' | 'md'; className?: string }> = ({ id, status, size = 'md', className = '' }) => {
  const Icon = ICONS[agentBadge(id).icon];
  const box = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  const glyph = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 ${box} ${
        status ? `ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 ${RING[status]}` : ''
      } ${className}`}
      data-agent-badge={id}
      aria-hidden="true"
    >
      <Icon className={glyph} strokeWidth={1.75} />
    </span>
  );
};
