/**
 * Keyboard shortcuts (standard features check, 24 November 2026). Kept few on purpose:
 *   /            ask the council (jumps to the question box on Workspace)
 *   Cmd/Ctrl+K   search the tools (opens Tools with its search box)
 *   Cmd/Ctrl+,   Settings (since #372)
 *   ?            this list
 *   Esc          close a window or menu
 * The single keys never fire while typing in a box. Browser-safe.
 */
export type ShortcutAction = 'ask' | 'tools' | 'settings' | 'help';

export interface KeyLike {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  /** The element the key went to. */
  target?: { tagName?: string; isContentEditable?: boolean; type?: string } | null;
}

function typing(t: KeyLike['target']): boolean {
  if (!t) return false;
  if (t.isContentEditable) return true;
  const tag = (t.tagName ?? '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes((t.type ?? 'text').toLowerCase());
  return false;
}

export function shortcutFor(e: KeyLike): ShortcutAction | null {
  const mod = Boolean(e.metaKey || e.ctrlKey);
  if (mod && !e.altKey) {
    if (e.key === ',') return 'settings';
    if (e.key.toLowerCase() === 'k') return 'tools';
    return null;
  }
  if (mod || e.altKey || typing(e.target)) return null;
  if (e.key === '/') return 'ask';
  if (e.key === '?') return 'help';
  return null;
}

/** "⌘" on a Mac, "Ctrl+" elsewhere, for showing the shortcuts. */
export function modLabel(platform: string): string {
  return platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl+';
}
