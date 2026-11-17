/**
 * Finds "Menu > Settings > Your own paid data", "Menu > Settings > AI model" and the like in help text, so
 * the app can show them as links that open that page of Settings (components/SettingsText.tsx).
 * Browser-safe, no React.
 */
export type SettingsPage = 'ai' | 'keys' | 'paid' | 'tools';

export type SettingsTextPart = string | { text: string; page: SettingsPage };

const PAGE_NAMES: Array<[RegExp, SettingsPage]> = [
  [/^(?:AI model(?: key| and data connections)?|Modelo de IA)/, 'ai'],
  [/^(?:Seus próprios dados pagos)/, 'paid'],
  [/^(?:Chaves de API de dados|Chaves de dados gratuitos)/, 'keys'],
  [/^(?:Ferramentas)/, 'tools'],
  [/^(?:Your own paid data|Sus datos de pago)/, 'paid'],
  [/^(?:Data API keys|API keys|Free data keys|Claves de API de datos|Claves de datos gratuitos)/, 'keys'],
  [/^(?:Tools|Herramientas)/, 'tools'],
];

// "Menu > Settings > X", "Menu > Settings", "Settings > X", "Menu > Settings > AI model ...", the Spanish "Menú > Configuración > X"
// and the Portuguese "Menu > Configurações > X".
const LINK = /(?:Menu\s*>\s*)?Settings(?:\s*>\s*(AI model(?: key| and data connections)?|Your own paid data|Data API keys|API keys|Free data keys|Tools))?|Menu\s*>\s*(AI model(?: and data connections)?)|Menú\s*>\s*Configuración(?:\s*>\s*(Modelo de IA|Sus datos de pago|Claves de API de datos|Claves de datos gratuitos|Herramientas))?|Menu\s*>\s*Configurações(?:\s*>\s*(Modelo de IA|Seus próprios dados pagos|Chaves de API de dados|Chaves de dados gratuitos|Ferramentas))?/g;

export function splitSettingsLinks(text: string): SettingsTextPart[] {
  const out: SettingsTextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const whole = m[0];
    const at = m.index ?? 0;
    // A bare "Settings" with no "Menu >" in front is an ordinary word, not a link.
    if (!m[1] && !m[2] && !m[3] && !m[4] && !whole.startsWith('Menu') && !whole.startsWith('Menú')) continue;
    const name = m[1] || m[2] || m[3] || m[4] || '';
    const page = PAGE_NAMES.find(([re]) => re.test(name))?.[1] ?? 'keys';
    if (at > last) out.push(text.slice(last, at));
    out.push({ text: whole, page });
    last = at + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
