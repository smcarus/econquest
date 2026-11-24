/**
 * The Menu's groups (Sam's choice, 18 November 2026): Tools on its own at the top, then Set up,
 * Check the data and Learn. An item not listed here falls into Set up.
 */
export type MenuGroup = 'top' | 'setup' | 'check' | 'learn';

export const MENU_GROUP_ORDER: MenuGroup[] = ['top', 'setup', 'check', 'learn'];

export const MENU_GROUP_LABEL = { setup: 'menuSetUp', check: 'menuCheck', learn: 'menuLearn' } as const;

const GROUP: Record<string, MenuGroup> = {
  tools: 'top',
  settings: 'setup',
  account: 'setup',
  users: 'setup',
  offline: 'setup',
  'own-data': 'setup',
  share: 'setup',
  exam: 'setup',
  health: 'check',
  register: 'check',
  audit: 'check',
  ideas: 'check',
  manual: 'learn',
  worked: 'learn',
  about: 'learn',
  report: 'learn',
  quests: 'learn',
};

export function menuGroupOf(key: string): MenuGroup {
  return GROUP[key] ?? 'setup';
}

/** Sort order: by group, then as listed above. */
export function menuRank(key: string): number {
  const keys = Object.keys(GROUP);
  const at = keys.indexOf(key);
  return MENU_GROUP_ORDER.indexOf(menuGroupOf(key)) * 100 + (at < 0 ? 99 : at);
}
