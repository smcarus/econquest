/**
 * What this means for people (R7): a short plain summary of a saved Policy review for readers who
 * are not economists, such as a politician's constituents. Five fixed sentences filled with figures
 * the app already holds, and Missing with the reason where a figure is absent:
 * - what changes: the chosen option and what it should do, as saved;
 * - what it costs per person: the policy council's cost table divided by the population (and GDP
 *   for a table in % of GDP), as they stood before the review's As of year;
 * - who gains and who pays: the policy council's winners and losers (PK3), as entered;
 * - which regions are furthest behind: Regional figures (R6);
 * - what countries in a similar position saw next: the precedent finder (G34).
 * No AI wording, so no council recording is needed. English, Spanish, French and Portuguese; text
 * typed in the review (option, group names) is shown as it was saved.
 *
 * Browser-safe; the server hands in the population, GDP, regions and precedents (route
 * /api/reviews/:id/people).
 */
import type { PolicyReview, ReviewFrame } from './policyReview';
import type { OptionsStep } from './reviewOptions';
import type { MemoInputs } from './reviewMemo';
import { costBenefitResults, currentCouncilInputs } from './policyCouncil';
import { DEFAULT_PRECEDENT_FEATURES, findPrecedents, type HistoryInput } from './precedentFinder';
import type { RegionalProfile } from './regional';

export type PeopleLang = 'en' | 'es' | 'fr' | 'pt';

export interface PeopleExtras {
  /** Million people, latest year before the As of year. */
  population?: { value: number; year: number };
  /** US$ billion at current prices, latest year before the As of year. */
  gdpUsd?: { value: number; year: number };
  regions?: { rows: { name: string; gapPct: number }[]; year: number; source: 'DOSE' | 'Eurostat' } | { missing: string };
  peers?: { rows: { name: string; year: number; growthAvg: number | null; debtChange: number | null }[] } | { missing: string };
}

export const PEOPLE_TEXT = {
  en: {
    heading: 'What this means for people',
    changes: 'What changes: {title}.',
    effect: 'What it should do: {effect}',
    costFirst: 'Cost: about {first} per person in the first year ({year}), and {pv} per person over the whole period counted at {rate}.',
    costNone: 'Cost per person: Missing ({reason}).',
    noTable: 'the review has no cost table (policy council, costs and benefits)',
    noCosts: 'the cost table has no costs',
    noPop: 'no population figure is saved for this country',
    noGdp: 'no GDP figure is saved for this country, so % of GDP cannot be turned into money',
    popNote: 'Population {pop} million ({year}).',
    gains: 'Who gains: {list}.',
    pays: 'Who pays: {list}.',
    mixed: 'Gains and pays: {list}.',
    groupsNone: 'Who gains and who pays: Missing (no groups entered in the policy council).',
    regions: 'Regions furthest behind ({year}, {source}): {list}.',
    regionGap: '{name}, {gap}% against the national figure',
    regionsNone: 'Regions furthest behind: Missing ({reason}).',
    peers: 'Countries in a similar position before: {list}. This is what happened there, not what will happen here.',
    peer: '{name} in {year}: growth then averaged {g}% a year, government debt moved {d} points of GDP',
    peerG: '{name} in {year}: growth then averaged {g}% a year',
    peerNone: '{name} in {year}',
    peersNone: 'Countries in a similar position before: Missing ({reason}).',
    currency: { usd_bn: 'US${v}', lcu_bn: '{v} in local currency', pct_gdp: 'US${v}' },
  },
  es: {
    heading: 'Qué significa para las personas',
    changes: 'Qué cambia: {title}.',
    effect: 'Qué debería lograr: {effect}',
    costFirst: 'Costo: unos {first} por persona el primer año ({year}), y {pv} por persona en todo el período, contado a {rate}.',
    costNone: 'Costo por persona: Falta ({reason}).',
    noTable: 'la revisión no tiene tabla de costos (consejo de políticas, costos y beneficios)',
    noCosts: 'la tabla de costos no tiene costos',
    noPop: 'no hay una cifra de población guardada para este país',
    noGdp: 'no hay una cifra de PIB guardada para este país, así que el % del PIB no se puede pasar a dinero',
    popNote: 'Población {pop} millones ({year}).',
    gains: 'Ganan: {list}.',
    pays: 'Pagan: {list}.',
    mixed: 'Ganan y pagan: {list}.',
    groupsNone: 'Quién gana y quién paga: Falta (no hay grupos en el consejo de políticas).',
    regions: 'Regiones más rezagadas ({year}, {source}): {list}.',
    regionGap: '{name}, {gap}% frente a la cifra nacional',
    regionsNone: 'Regiones más rezagadas: Falta ({reason}).',
    peers: 'Países en una situación parecida antes: {list}. Es lo que pasó allí, no lo que pasará aquí.',
    peer: '{name} en {year}: después el crecimiento promedió {g}% al año y la deuda pública se movió {d} puntos del PIB',
    peerG: '{name} en {year}: después el crecimiento promedió {g}% al año',
    peerNone: '{name} en {year}',
    peersNone: 'Países en una situación parecida antes: Falta ({reason}).',
    currency: { usd_bn: 'US${v}', lcu_bn: '{v} en moneda local', pct_gdp: 'US${v}' },
  },
  fr: {
    heading: 'Ce que cela signifie pour les gens',
    changes: 'Ce qui change : {title}.',
    effect: 'Ce que cela devrait produire : {effect}',
    costFirst: 'Coût : environ {first} par habitant la première année ({year}), et {pv} par habitant sur toute la période, compté à {rate}.',
    costNone: 'Coût par habitant : Manquant ({reason}).',
    noTable: 'la revue n’a pas de tableau des coûts (conseil des politiques, coûts et avantages)',
    noCosts: 'le tableau des coûts ne contient aucun coût',
    noPop: 'aucun chiffre de population n’est enregistré pour ce pays',
    noGdp: 'aucun chiffre de PIB n’est enregistré pour ce pays, donc le % du PIB ne peut pas être converti en argent',
    popNote: 'Population {pop} millions ({year}).',
    gains: 'Qui gagne : {list}.',
    pays: 'Qui paie : {list}.',
    mixed: 'Gagne et paie : {list}.',
    groupsNone: 'Qui gagne et qui paie : Manquant (aucun groupe saisi dans le conseil des politiques).',
    regions: 'Régions les plus en retard ({year}, {source}) : {list}.',
    regionGap: '{name}, {gap} % face au chiffre national',
    regionsNone: 'Régions les plus en retard : Manquant ({reason}).',
    peers: 'Pays dans une situation semblable auparavant : {list}. C’est ce qui s’est passé là-bas, pas ce qui se passera ici.',
    peer: '{name} en {year} : la croissance a ensuite été en moyenne de {g} % par an, la dette publique a bougé de {d} points de PIB',
    peerG: '{name} en {year} : la croissance a ensuite été en moyenne de {g} % par an',
    peerNone: '{name} en {year}',
    peersNone: 'Pays dans une situation semblable auparavant : Manquant ({reason}).',
    currency: { usd_bn: '{v} US$', lcu_bn: '{v} en monnaie locale', pct_gdp: '{v} US$' },
  },
  pt: {
    heading: 'O que isto significa para as pessoas',
    changes: 'O que muda: {title}.',
    effect: 'O que deve alcançar: {effect}',
    costFirst: 'Custo: cerca de {first} por pessoa no primeiro ano ({year}), e {pv} por pessoa em todo o período, contado a {rate}.',
    costNone: 'Custo por pessoa: Ausente ({reason}).',
    noTable: 'a revisão não tem tabela de custos (conselho de políticas, custos e benefícios)',
    noCosts: 'a tabela de custos não tem custos',
    noPop: 'não há número de população salvo para este país',
    noGdp: 'não há número de PIB salvo para este país, então o % do PIB não pode ser convertido em dinheiro',
    popNote: 'População {pop} milhões ({year}).',
    gains: 'Quem ganha: {list}.',
    pays: 'Quem paga: {list}.',
    mixed: 'Ganha e paga: {list}.',
    groupsNone: 'Quem ganha e quem paga: Ausente (nenhum grupo informado no conselho de políticas).',
    regions: 'Regiões mais atrasadas ({year}, {source}): {list}.',
    regionGap: '{name}, {gap}% frente ao número nacional',
    regionsNone: 'Regiões mais atrasadas: Ausente ({reason}).',
    peers: 'Países em situação parecida antes: {list}. Isto foi o que aconteceu lá, não o que vai acontecer aqui.',
    peer: '{name} em {year}: depois o crescimento foi em média {g}% ao ano e a dívida pública mudou {d} pontos do PIB',
    peerG: '{name} em {year}: depois o crescimento foi em média {g}% ao ano',
    peerNone: '{name} em {year}',
    peersNone: 'Países em situação parecida antes: Ausente ({reason}).',
    currency: { usd_bn: 'US${v}', lcu_bn: '{v} em moeda local', pct_gdp: 'US${v}' },
  },
} as const;

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const money = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en') : v.toLocaleString('en', { maximumFractionDigits: 1 }));
const signed = (v: number) => `${v > 0 ? '+' : ''}${(Math.round(v * 10) / 10).toFixed(1)}`;

/** Amount in the table's unit -> money per person, or the reason it cannot be worked out. */
export function perPerson(amount: number, unit: 'pct_gdp' | 'lcu_bn' | 'usd_bn', x: PeopleExtras): number | 'noPop' | 'noGdp' {
  if (!x.population || x.population.value <= 0) return 'noPop';
  const people = x.population.value * 1e6;
  if (unit === 'pct_gdp') {
    if (!x.gdpUsd || x.gdpUsd.value <= 0) return 'noGdp';
    return ((amount / 100) * x.gdpUsd.value * 1e9) / people;
  }
  return (amount * 1e9) / people;
}

export function peopleSummary(
  review: Pick<PolicyReview, 'steps'> & Partial<Pick<PolicyReview, 'councilParts'>>,
  inputs: Pick<MemoInputs, 'recommended'>,
  extras: PeopleExtras,
  lang: PeopleLang,
  /** Translates the server's English Missing reasons (the panels' translateText); none keeps English. */
  tr: (s: string) => string = (s) => s,
): { heading: string; lines: string[] } {
  const L = PEOPLE_TEXT[lang];
  const lines: string[] = [];
  const o = review.steps.options?.content as OptionsStep | undefined;
  const rec = o?.options.find((x) => x.rank === inputs.recommended) ?? o?.options[0];
  if (rec) {
    lines.push(fill(L.changes, { title: rec.title }));
    if (rec.effect) lines.push(fill(L.effect, { effect: rec.effect }));
  }
  // Cost per person
  const frame = review.steps.frame?.content as ReviewFrame | undefined;
  const ci = frame?.council ? currentCouncilInputs(review as PolicyReview).inputs : {};
  const cb = (ci as { costBenefit?: Parameters<typeof costBenefitResults>[0] }).costBenefit;
  if (!cb) lines.push(fill(L.costNone, { reason: L.noTable }));
  else {
    const first = cb.lines.filter((l) => l.kind === 'cost').reduce((s, l) => s + (l.values[0] ?? 0), 0);
    const r0 = costBenefitResults(cb).results[0];
    if (!r0 || r0.pvCosts <= 0) lines.push(fill(L.costNone, { reason: L.noCosts }));
    else {
      const a = perPerson(first, cb.unit, extras);
      const b = perPerson(r0.pvCosts, cb.unit, extras);
      if (typeof a !== 'number' || typeof b !== 'number') lines.push(fill(L.costNone, { reason: L[typeof a === 'string' ? a : (b as 'noPop' | 'noGdp')] }));
      else {
        const cur = (v: number) => fill(L.currency[cb.unit], { v: money(v) });
        lines.push(fill(L.costFirst, { first: cur(a), year: cb.firstYear, pv: cur(b), rate: r0.id === 'own' ? r0.rateText : r0.label }));
        lines.push(fill(L.popNote, { pop: money(extras.population!.value), year: extras.population!.year }));
      }
    }
  }
  // Who gains and who pays
  const groups = (ci as { groups?: { rows: { group: string; effect: string; size?: number; sizeUnit?: string }[] } }).groups;
  if (!groups?.rows.length) lines.push(L.groupsNone);
  else {
    const list = (e: string) =>
      groups.rows
        .filter((r) => r.effect === e)
        .map((r) => (r.size !== undefined ? `${r.group} (${signed(r.size)}${r.sizeUnit ? ` ${r.sizeUnit}` : ''})` : r.group))
        .join(', ');
    if (list('gains')) lines.push(fill(L.gains, { list: list('gains') }));
    if (list('loses')) lines.push(fill(L.pays, { list: list('loses') }));
    if (list('mixed')) lines.push(fill(L.mixed, { list: list('mixed') }));
  }
  // Regions furthest behind
  const rg = extras.regions;
  if (!rg) lines.push(fill(L.regionsNone, { reason: '-' }));
  else if ('missing' in rg) lines.push(fill(L.regionsNone, { reason: tr(rg.missing) }));
  else lines.push(fill(L.regions, { year: rg.year, source: rg.source, list: rg.rows.map((r) => fill(L.regionGap, { name: r.name, gap: signed(r.gapPct) })).join('; ') }));
  // Countries in a similar position
  const pe = extras.peers;
  if (!pe) lines.push(fill(L.peersNone, { reason: '-' }));
  else if ('missing' in pe) lines.push(fill(L.peersNone, { reason: tr(pe.missing) }));
  else
    lines.push(
      fill(L.peers, {
        list: pe.rows
          .map((p) =>
            p.growthAvg !== null && p.debtChange !== null
              ? fill(L.peer, { name: p.name, year: p.year, g: (Math.round(p.growthAvg * 10) / 10).toFixed(1), d: signed(p.debtChange) })
              : p.growthAvg !== null
                ? fill(L.peerG, { name: p.name, year: p.year, g: (Math.round(p.growthAvg * 10) / 10).toFixed(1) })
                : fill(L.peerNone, { name: p.name, year: p.year }),
          )
          .join('; '),
      }),
    );
  return { heading: L.heading, lines };
}

const PEER_MISSING: Record<string, string> = {
  too_few_features: 'too few figures to compare',
  no_history: 'the yearly history of this country has not been downloaded yet',
  no_target_year: 'this country has no year with every figure the comparison needs',
  no_pool: 'no other country had every figure in a year with three years after it',
};

/** Server side: the figures the summary needs, as they stood before the As of year. */
export function buildPeopleExtras(iso3: string, asOf: string, histories: HistoryInput[], regional: RegionalProfile): PeopleExtras {
  const before = Number(asOf.slice(0, 4));
  const latest = (id: string) => {
    const pts = (histories.find((h) => h.iso3 === iso3)?.series[id]?.points ?? []).filter((p) => Number(p.date.slice(0, 4)) < before && Number.isFinite(p.value));
    const p = pts.sort((a, b) => a.date.localeCompare(b.date)).pop();
    return p ? { value: p.value, year: Number(p.date.slice(0, 4)) } : undefined;
  };
  const out: PeopleExtras = {};
  const pop = latest('population');
  if (pop) out.population = pop;
  const gdp = latest('gdp_usd');
  if (gdp) out.gdpUsd = gdp;
  if (regional.dose) {
    const rows = regional.dose.rows.filter((r) => r.gapPct < 0).sort((a, b) => a.gapPct - b.gapPct).slice(0, 3);
    out.regions = rows.length ? { rows: rows.map((r) => ({ name: r.name, gapPct: r.gapPct })), year: regional.dose.year, source: 'DOSE' } : { missing: 'no region is below the national figure' };
  } else if (regional.euro?.rows.some((r) => r.gdpGapPct !== undefined)) {
    const rows = regional.euro.rows.filter((r) => r.gdpGapPct !== undefined && r.gdpGapPct < 0).sort((a, b) => a.gdpGapPct! - b.gdpGapPct!).slice(0, 3);
    out.regions = rows.length ? { rows: rows.map((r) => ({ name: r.name, gapPct: r.gdpGapPct! })), year: regional.euro.gdpYear ?? 0, source: 'Eurostat' } : { missing: 'no region is below the national figure' };
  } else out.regions = { missing: regional.doseMissing || 'no regional figures' };
  const pr = findPrecedents(iso3, asOf, DEFAULT_PRECEDENT_FEATURES, histories);
  if (pr.missing || !pr.matches.length) out.peers = { missing: PEER_MISSING[pr.missing?.reason ?? 'no_pool'] };
  else out.peers = { rows: pr.matches.slice(0, 3).map((m) => ({ name: m.name, year: m.year, growthAvg: m.outcomes.growth_avg, debtChange: m.outcomes.debt_change })) };
  return out;
}
