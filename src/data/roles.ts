/**
 * Who is using the terminal. The role sets where the app opens, the order of the main
 * navigation, and the matching analysis persona. Saved in this browser only.
 */
import type { UserPersonaId } from '../types/council';

export type UserRoleId = 'PM' | 'ECONOMIST' | 'BANKER' | 'MULTILATERAL' | 'UHNW';
export type WorkflowArea = 'today' | 'country' | 'portfolio' | 'reports' | 'desks';
/** Which report template opens first on Reports > Memos and notes. */
export type ReportTemplate = 'ic' | 'client' | 'economist' | 'banker' | 'official';

export interface UserRole {
  id: UserRoleId;
  label: string;
  /** One line shown in the picker. */
  description: string;
  persona: UserPersonaId;
  home: { area: WorkflowArea; countryTab?: string; portfolioTab?: string; reportsTab?: string };
  report: ReportTemplate;
  nav: WorkflowArea[];
}

export const USER_ROLES: UserRole[] = [
  {
    id: 'PM',
    label: 'Portfolio manager',
    description: 'Start with what changed overnight, then the book and the IC memo.',
    persona: 'INSTITUTIONAL_PM_IC',
    home: { area: 'today', reportsTab: 'ic' },
    report: 'ic',
    nav: ['today', 'country', 'portfolio', 'reports', 'desks'],
  },
  {
    id: 'ECONOMIST',
    label: 'Economist',
    description: 'Start with a country brief: growth, policy, the fiscal path and the external position, then a country note.',
    persona: 'POLICY_RESEARCHER',
    home: { area: 'country', countryTab: 'brief', reportsTab: 'ic' },
    report: 'economist',
    nav: ['country', 'today', 'reports', 'desks', 'portfolio'],
  },
  {
    id: 'BANKER',
    label: 'Investment banker',
    description: 'Start with an issuer brief: market access, financing need, timing and peers, then an issuer note.',
    persona: 'INSTITUTIONAL_PM_IC',
    home: { area: 'country', countryTab: 'brief', reportsTab: 'ic' },
    report: 'banker',
    nav: ['country', 'reports', 'today', 'portfolio', 'desks'],
  },
  {
    id: 'MULTILATERAL',
    label: 'Multilateral or official sector',
    description: 'Start with debt sustainability: the debt path, standard shocks and the adjustment needed, then the written assessment.',
    persona: 'POLICY_RESEARCHER',
    home: { area: 'country', countryTab: 'brief', reportsTab: 'ic' },
    report: 'official',
    nav: ['country', 'reports', 'today', 'desks', 'portfolio'],
  },
  {
    id: 'UHNW',
    label: 'Private wealth adviser',
    description: 'Start with the client’s holdings and what could hurt them, then a client note.',
    persona: 'INSTITUTIONAL_PM_IC',
    home: { area: 'portfolio', portfolioTab: 'book', reportsTab: 'ic' },
    report: 'client',
    nav: ['portfolio', 'today', 'country', 'reports', 'desks'],
  },
];

export const NAV_LABEL: Record<WorkflowArea, string> = {
  today: 'Today',
  country: 'Countries',
  portfolio: 'Portfolio',
  reports: 'Reports',
  desks: 'Tools',
};

const STORAGE_KEY = 'econquest.role.v1';

export function loadRole(): UserRoleId | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return USER_ROLES.some((r) => r.id === v) ? (v as UserRoleId) : null;
  } catch {
    return null;
  }
}

export function saveRole(id: UserRoleId): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage blocked: role lasts for this session */
  }
}

export function getRole(id: UserRoleId | null): UserRole {
  return USER_ROLES.find((r) => r.id === id) || USER_ROLES[0];
}
