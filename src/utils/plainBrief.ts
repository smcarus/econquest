/**
 * One-page policy brief (G39): a saved Policy review turned into one page for readers who are not
 * economists. It holds the question, the option the principal chose, the figures that option rests on
 * with their sources (a published low and high end shown as one range), and what to watch and when to
 * look again. Built only from the saved steps and the memo choices, with no AI: the same review gives
 * the same brief. The fixed wording is in English, Spanish, French or Portuguese; text written in the
 * review (the problem, the option) is shown as it was saved.
 *
 * Browser-safe; the PDF is drawn by plainBriefPdf.ts.
 */
import type { PolicyReview, ReviewFrame } from './policyReview';
import type { Diagnosis, DiagnosisFigure } from './reviewDiagnosis';
import type { OptionsStep } from './reviewOptions';
import type { EvidenceStep } from './reviewEvidence';
import type { MemoInputs } from './reviewMemo';
import { EXPORT_NOTICE } from './disclaimer';
import { chainTally, costBenefitResults, councilPartsFor, currentCouncilInputs, marketScenarioResults, scenarioResults, type CouncilPart } from './policyCouncil';

export const BRIEF_LANGS = ['en', 'es', 'fr', 'pt'] as const;
export type BriefLang = (typeof BRIEF_LANGS)[number];

export const BRIEF_TEXT = {
  en: {
    title: 'Policy brief',
    sub: 'One page for readers who are not economists',
    question: 'The question',
    goal: 'Goal',
    for: 'For',
    asOf: 'Figures as they stood on',
    proposed: 'What is proposed',
    ranked: 'ranked {rank} of {n} options',
    yours: 'your own option',
    how: 'How it works',
    effect: 'What it should do',
    time: 'How long it takes',
    whoBears: 'Who bears the cost',
    risks: 'Main risks',
    why: "Why this option (the principal's own words)",
    figures: 'The figures behind it',
    noFigures: 'The option cites no figures.',
    missing: 'Missing',
    to: 'to',
    watch: 'What to watch',
    lookAgain: 'Look again on {date}.',
    dir: { lower: 'lower', higher: 'higher', stable: 'kept stable' },
    target: 'target {t}',
    by: 'by {d}',
    research: 'Research, not validated advice: the signals behind these options have not all passed a pre-registered test.',
    validated: 'Every signal these options lean on passed its pre-registered test; the choice is still a judgement, not a forecast.',
    savedText: 'Text written in the review is shown as it was saved.',
    cut: 'Cut to fit one page; the full memo has the rest.',
    notice: EXPORT_NOTICE,
    footer: 'EconQuest policy brief - memo saved {when} UTC - hash {hash}',
    councilPolicy: "The measure weighed (policy council)",
    councilMarket: "The event weighed (market council)",
    cbAt: "At {rate}: costs {c}, benefits {b}, net {n} ({unit}); {pay}",
    paysBack: "pays back from {y}",
    neverPays: "does not pay back within the table",
    flip: "The net turns the other way at a flat discount rate of {r}%.",
    groups: "Who gains: {g}. Who loses: {l}. Both: {m}.",
    noneTxt: "none",
    chain: "What follows: {n} links, {f} resting on a figure, {s} on a source, {a} on an assumption.",
    caseNet: "Case {name}: net {v}{odds}",
    caseMove: "Case {name}: change in value {v}%{odds}",
    oddsTxt: ", odds {p}%",
    expected: "Odds-weighted net {v}; chance of a negative net {p}%.",
    moveExpected: "Odds-weighted change in value {v}%; chance of a loss {p}%.",
    readings: "Market readings as of {d}: {list}.",
    readingsMissing: "Missing: {list}.",
    notEntered: "Not entered or out of date: {list}.",
    parts: { costBenefit: "costs and benefits", groups: "who gains and who loses", chain: "what follows", scenarios: "scenarios", market: "market readings", marketScenarios: "scenarios" },
    units: { pct_gdp: "% of GDP", lcu_bn: "billion, local currency", usd_bn: "US$ billion" },
  },
  es: {
    title: 'Nota de política',
    sub: 'Una página para lectores que no son economistas',
    question: 'La pregunta',
    goal: 'Objetivo',
    for: 'Para',
    asOf: 'Cifras tal como estaban el',
    proposed: 'Qué se propone',
    ranked: 'puesto {rank} de {n} opciones',
    yours: 'opción propia',
    how: 'Cómo funciona',
    effect: 'Qué debería lograr',
    time: 'Cuánto tarda',
    whoBears: 'Quién asume el costo',
    risks: 'Riesgos principales',
    why: 'Por qué esta opción (en palabras del responsable)',
    figures: 'Las cifras en que se apoya',
    noFigures: 'La opción no cita cifras.',
    missing: 'Falta',
    to: 'a',
    watch: 'Qué vigilar',
    lookAgain: 'Volver a revisar el {date}.',
    dir: { lower: 'más bajo', higher: 'más alto', stable: 'estable' },
    target: 'meta {t}',
    by: 'para {d}',
    research: 'Investigación, no asesoramiento validado: no todas las señales detrás de estas opciones han superado una prueba registrada de antemano.',
    validated: 'Todas las señales en que se apoyan estas opciones superaron su prueba registrada de antemano; la elección sigue siendo un juicio, no un pronóstico.',
    savedText: 'El texto escrito en la revisión se muestra tal como se guardó.',
    cut: 'Recortado para caber en una página; el memorando completo tiene el resto.',
    notice:
      'Investigación, no asesoramiento validado. Las cifras provienen solo de fuentes públicas, series oficiales o sus propios archivos, cada una con su fuente y fecha; ningún modelo de la aplicación ha sido validado de forma independiente. No es asesoramiento de inversión. Los términos de uso de cada fuente de datos siguen aplicándose (docs/DATA_LICENCES.md).',
    footer: 'Nota de política de EconQuest - memorando guardado {when} UTC - hash {hash}',
    councilPolicy: "La medida ponderada (consejo de políticas)",
    councilMarket: "El evento ponderado (consejo de mercado)",
    cbAt: "A {rate}: costos {c}, beneficios {b}, neto {n} ({unit}); {pay}",
    paysBack: "se recupera desde {y}",
    neverPays: "no se recupera dentro de la tabla",
    flip: "El neto cambia de signo a una tasa de descuento fija de {r}%.",
    groups: "Ganan: {g}. Pierden: {l}. Ambos: {m}.",
    noneTxt: "ninguno",
    chain: "Qué sigue: {n} vínculos, {f} basados en una cifra, {s} en una fuente, {a} en un supuesto.",
    caseNet: "Caso {name}: neto {v}{odds}",
    caseMove: "Caso {name}: cambio de valor {v}%{odds}",
    oddsTxt: ", probabilidad {p}%",
    expected: "Neto ponderado por probabilidades {v}; probabilidad de un neto negativo {p}%.",
    moveExpected: "Cambio de valor ponderado por probabilidades {v}%; probabilidad de pérdida {p}%.",
    readings: "Lecturas de mercado al {d}: {list}.",
    readingsMissing: "Faltan: {list}.",
    notEntered: "Sin ingresar o desactualizado: {list}.",
    parts: { costBenefit: "costos y beneficios", groups: "quién gana y quién pierde", chain: "qué sigue", scenarios: "escenarios", market: "lecturas de mercado", marketScenarios: "escenarios" },
    units: { pct_gdp: "% del PIB", lcu_bn: "miles de millones, moneda local", usd_bn: "miles de millones de US$" },
  },
  fr: {
    title: 'Note de politique',
    sub: 'Une page pour les lecteurs qui ne sont pas économistes',
    question: 'La question',
    goal: 'Objectif',
    for: 'Pour',
    asOf: 'Chiffres tels qu’ils étaient le',
    proposed: 'Ce qui est proposé',
    ranked: 'classée {rank} sur {n} options',
    yours: 'votre propre option',
    how: 'Comment cela fonctionne',
    effect: 'Ce que cela devrait produire',
    time: 'Combien de temps cela prend',
    whoBears: 'Qui en supporte le coût',
    risks: 'Principaux risques',
    why: 'Pourquoi cette option (avec les mots du responsable)',
    figures: 'Les chiffres sur lesquels elle repose',
    noFigures: 'L’option ne cite aucun chiffre.',
    missing: 'Manquant',
    to: 'à',
    watch: 'Ce qu’il faut surveiller',
    lookAgain: 'Réexaminer le {date}.',
    dir: { lower: 'plus bas', higher: 'plus haut', stable: 'stable' },
    target: 'cible {t}',
    by: 'd’ici {d}',
    research: 'Recherche, pas un conseil validé : les signaux derrière ces options n’ont pas tous réussi un test enregistré à l’avance.',
    validated: 'Chaque signal sur lequel reposent ces options a réussi son test enregistré à l’avance ; le choix reste un jugement, pas une prévision.',
    savedText: 'Le texte écrit dans la revue est affiché tel qu’il a été enregistré.',
    cut: 'Coupé pour tenir sur une page ; le mémo complet contient le reste.',
    notice:
      'Recherche, pas un conseil validé. Les chiffres proviennent uniquement de sources publiques, de séries officielles ou de vos propres fichiers, chacun avec sa source et sa date ; aucun modèle de l’application n’a été validé de façon indépendante. Ce n’est pas un conseil en investissement. Les conditions d’utilisation de chaque source de données continuent de s’appliquer (docs/DATA_LICENCES.md).',
    footer: 'Note de politique EconQuest - mémo enregistré {when} UTC - hash {hash}',
    councilPolicy: "La mesure évaluée (conseil des politiques)",
    councilMarket: "L’événement évalué (conseil de marché)",
    cbAt: "À {rate} : coûts {c}, avantages {b}, net {n} ({unit}) ; {pay}",
    paysBack: "rentable à partir de {y}",
    neverPays: "pas rentable dans le tableau",
    flip: "Le solde net change de signe à un taux d’actualisation fixe de {r} %.",
    groups: "Gagnants : {g}. Perdants : {l}. Les deux : {m}.",
    noneTxt: "aucun",
    chain: "Ce qui suit : {n} liens, {f} reposant sur un chiffre, {s} sur une source, {a} sur une hypothèse.",
    caseNet: "Cas {name} : net {v}{odds}",
    caseMove: "Cas {name} : variation de valeur {v} %{odds}",
    oddsTxt: ", probabilité {p} %",
    expected: "Net pondéré par les probabilités {v} ; probabilité d’un net négatif {p} %.",
    moveExpected: "Variation de valeur pondérée par les probabilités {v} % ; probabilité de perte {p} %.",
    readings: "Relevés de marché au {d} : {list}.",
    readingsMissing: "Manquants : {list}.",
    notEntered: "Non saisi ou périmé : {list}.",
    parts: { costBenefit: "coûts et avantages", groups: "qui gagne et qui perd", chain: "ce qui suit", scenarios: "scénarios", market: "relevés de marché", marketScenarios: "scénarios" },
    units: { pct_gdp: "% du PIB", lcu_bn: "milliards, monnaie locale", usd_bn: "milliards de dollars US" },
  },
  pt: {
    title: 'Nota de política',
    sub: 'Uma página para leitores que não são economistas',
    question: 'A pergunta',
    goal: 'Objetivo',
    for: 'Para',
    asOf: 'Números como estavam em',
    proposed: 'O que se propõe',
    ranked: '{rank}ª de {n} opções',
    yours: 'sua própria opção',
    how: 'Como funciona',
    effect: 'O que deve alcançar',
    time: 'Quanto tempo leva',
    whoBears: 'Quem arca com o custo',
    risks: 'Principais riscos',
    why: 'Por que esta opção (nas palavras do responsável)',
    figures: 'Os números por trás dela',
    noFigures: 'A opção não cita números.',
    missing: 'Ausente',
    to: 'a',
    watch: 'O que acompanhar',
    lookAgain: 'Revisar novamente em {date}.',
    dir: { lower: 'mais baixo', higher: 'mais alto', stable: 'estável' },
    target: 'meta {t}',
    by: 'até {d}',
    research: 'Pesquisa, não aconselhamento validado: nem todos os sinais por trás destas opções passaram em um teste registrado previamente.',
    validated: 'Todos os sinais em que estas opções se apoiam passaram no teste registrado previamente; a escolha continua sendo um julgamento, não uma previsão.',
    savedText: 'O texto escrito na revisão aparece como foi salvo.',
    cut: 'Cortado para caber em uma página; o memorando completo tem o resto.',
    notice:
      'Pesquisa, não aconselhamento validado. Os números vêm apenas de fontes públicas, séries oficiais ou seus próprios arquivos, cada um com sua fonte e data; nenhum modelo do aplicativo foi validado de forma independente. Não é aconselhamento de investimento. Os termos de uso de cada fonte de dados continuam valendo (docs/DATA_LICENCES.md).',
    footer: 'Nota de política EconQuest - memorando salvo {when} UTC - hash {hash}',
    councilPolicy: "A medida avaliada (conselho de políticas)",
    councilMarket: "O evento avaliado (conselho de mercado)",
    cbAt: "A {rate}: custos {c}, benefícios {b}, líquido {n} ({unit}); {pay}",
    paysBack: "se paga a partir de {y}",
    neverPays: "não se paga dentro da tabela",
    flip: "O líquido muda de sinal a uma taxa de desconto fixa de {r}%.",
    groups: "Ganham: {g}. Perdem: {l}. Ambos: {m}.",
    noneTxt: "nenhum",
    chain: "O que vem depois: {n} ligações, {f} apoiadas em um número, {s} em uma fonte, {a} em uma suposição.",
    caseNet: "Caso {name}: líquido {v}{odds}",
    caseMove: "Caso {name}: variação de valor {v}%{odds}",
    oddsTxt: ", probabilidade {p}%",
    expected: "Líquido ponderado pelas probabilidades {v}; chance de líquido negativo {p}%.",
    moveExpected: "Variação de valor ponderada pelas probabilidades {v}%; chance de perda {p}%.",
    readings: "Leituras de mercado em {d}: {list}.",
    readingsMissing: "Ausentes: {list}.",
    notEntered: "Não informado ou desatualizado: {list}.",
    parts: { costBenefit: "custos e benefícios", groups: "quem ganha e quem perde", chain: "o que vem depois", scenarios: "cenários", market: "leituras de mercado", marketScenarios: "cenários" },
    units: { pct_gdp: "% do PIB", lcu_bn: "bilhões, moeda local", usd_bn: "bilhões de US$" },
  },
} as const;

export interface BriefFigure {
  refs: number[];
  label: string;
  /** "4.4%", "0.2 to 0.5 ratio", or Missing with the reason. */
  value: string;
  /** Source and period, empty when Missing. */
  source: string;
  missing: boolean;
}

export interface PlainBrief {
  lang: BriefLang;
  title: string;
  question: string;
  goal: string;
  audience?: string;
  asOf: string;
  option: { title: string; rankLine: string; how: string; effect: string; time: string; whoBears: string; risks: string; why: string };
  figures: BriefFigure[];
  watch: string[];
  reviewDate: string;
  researchOnly: boolean;
  /** PK8: the policy or market council parts that are up to date with the frame. */
  council?: { heading: string; lines: string[] };
  /** R7: what this means for people (src/utils/peopleSummary.ts), when it was worked out. */
  people?: { heading: string; lines: string[] };
}

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

const LOW = /, low end$/;
const HIGH = /, high end$/;

function valueText(x: DiagnosisFigure): string {
  const unit = x.unit === '%' ? '%' : x.unit ? ` ${x.unit}` : '';
  return `${x.value}${unit}`;
}

/** Figures by reference; a cited low or high end brings its partner, and the pair reads as one range. */
export function briefFigures(d: Diagnosis, refs: number[], lang: BriefLang): BriefFigure[] {
  const L = BRIEF_TEXT[lang];
  const byRef = new Map(d.figures.map((f) => [f.ref, f]));
  const want = new Set(refs.filter((r) => byRef.has(r)));
  for (const r of [...want]) {
    const f = byRef.get(r)!;
    const partnerLabel = LOW.test(f.label) ? f.label.replace(LOW, ', high end') : HIGH.test(f.label) ? f.label.replace(HIGH, ', low end') : '';
    const p = partnerLabel && d.figures.find((x) => x.label === partnerLabel);
    if (p) want.add(p.ref);
  }
  const out: BriefFigure[] = [];
  const done = new Set<number>();
  for (const r of [...want].sort((a, b) => a - b)) {
    if (done.has(r)) continue;
    const f = byRef.get(r)!;
    const hi = LOW.test(f.label) ? d.figures.find((x) => x.label === f.label.replace(LOW, ', high end') && want.has(x.ref)) : undefined;
    const src = (x: DiagnosisFigure) => `${x.source}${x.period ? `, ${x.period}` : ''}`;
    if (hi && f.value !== null && hi.value !== null) {
      done.add(hi.ref);
      const unit = f.unit === '%' ? '%' : f.unit ? ` ${f.unit}` : '';
      out.push({ refs: [f.ref, hi.ref], label: f.label.replace(LOW, ''), value: f.value === hi.value ? `${f.value}${unit}` : `${f.value} ${L.to} ${hi.value}${unit}`, source: src(f), missing: false });
    } else if (f.value === null) {
      out.push({ refs: [f.ref], label: f.label, value: `${L.missing}: ${f.reason}`, source: '', missing: true });
    } else {
      out.push({ refs: [f.ref], label: f.label, value: valueText(f), source: src(f), missing: false });
    }
    done.add(r);
  }
  return out;
}

const r2 = (v: number) => String(Math.round(v * 100) / 100);

/** PK8: the council parts, in a few lines each, from the parts that are up to date with the frame. */
export function councilBrief(review: Pick<PolicyReview, 'steps' | 'councilParts'>, lang: BriefLang): PlainBrief['council'] {
  const frame = review.steps.frame?.content as ReviewFrame | undefined;
  if (!frame?.council) return undefined;
  const L = BRIEF_TEXT[lang];
  const { inputs } = currentCouncilInputs(review as PolicyReview);
  const lines: string[] = [];
  const market = frame.council.kind === 'market';
  if (inputs.market) {
    const have = inputs.market.readings.filter((r) => r.value !== null);
    const miss = inputs.market.readings.filter((r) => r.value === null);
    if (have.length) lines.push(fill(L.readings, { d: inputs.market.asOf, list: have.map((r) => `${r.label} ${r2(r.value!)}${r.unit === '%' ? '%' : r.unit ? ` ${r.unit}` : ''} (${r.date})`).join('; ') }));
    if (miss.length) lines.push(fill(L.readingsMissing, { list: miss.map((r) => r.label).join(', ') }));
  }
  const cb = inputs.costBenefit;
  if (cb && !market) {
    const { results, flip } = costBenefitResults(cb);
    for (const x of results) lines.push(fill(L.cbAt, { rate: x.id === 'own' ? x.rateText : x.label, c: r2(x.pvCosts), b: r2(x.pvBenefits), n: r2(x.npv), unit: L.units[cb.unit], pay: x.breakEvenYear ? fill(L.paysBack, { y: x.breakEvenYear }) : L.neverPays }));
    if (flip !== null) lines.push(fill(L.flip, { r: r2(flip) }));
  }
  if (inputs.groups) {
    const names = (e: string) => inputs.groups!.rows.filter((r) => r.effect === e).map((r) => r.group).join(', ') || L.noneTxt;
    lines.push(fill(L.groups, { g: names('gains'), l: names('loses'), m: names('mixed') }));
  }
  if (inputs.chain) {
    const t = chainTally(inputs.chain);
    lines.push(fill(L.chain, { n: inputs.chain.links.length, f: t.figure, s: t.source, a: t.assumption }));
  }
  if (inputs.scenarios && cb && !market) {
    const out = scenarioResults(cb, inputs.scenarios);
    out.results.forEach((x) => lines.push(fill(L.caseNet, { name: x.name, v: r2(x.npv), odds: x.odds !== undefined ? fill(L.oddsTxt, { p: r2(x.odds) }) : '' })));
    if (out.expected !== null) lines.push(fill(L.expected, { v: r2(out.expected), p: r2(out.chanceNegative ?? 0) }));
  }
  if (inputs.marketScenarios && market) {
    inputs.marketScenarios.scenarios.forEach((x) => lines.push(fill(L.caseMove, { name: x.name, v: r2(x.move), odds: x.odds !== undefined ? fill(L.oddsTxt, { p: r2(x.odds) }) : '' })));
    const out = marketScenarioResults(inputs.marketScenarios);
    if (out.expected !== null) lines.push(fill(L.moveExpected, { v: r2(out.expected), p: r2(out.chanceLoss ?? 0) }));
  }
  const missing = councilPartsFor(frame).filter((p: CouncilPart) => !(inputs as Record<string, unknown>)[p] || (p === 'scenarios' && !cb));
  if (missing.length) lines.push(fill(L.notEntered, { list: missing.map((p) => L.parts[p]).join(', ') }));
  return { heading: market ? L.councilMarket : L.councilPolicy, lines };
}

export function plainBrief(review: Pick<PolicyReview, 'title' | 'steps'> & Partial<Pick<PolicyReview, 'councilParts'>>, inputs: MemoInputs, lang: BriefLang, people?: PlainBrief['people']): PlainBrief {
  const L = BRIEF_TEXT[lang];
  const frame = review.steps.frame!.content as ReviewFrame;
  const d = review.steps.diagnose!.content as Diagnosis;
  const o = review.steps.options!.content as OptionsStep;
  const e = review.steps.evidence!.content as EvidenceStep;
  const rec = o.options.find((x) => x.rank === inputs.recommended) ?? o.options[0];
  const g = frame.goal;
  const goal = [`${g.indicator}: ${L.dir[g.direction] ?? g.direction}`, ...(g.target ? [fill(L.target, { t: g.target })] : []), ...(g.by ? [fill(L.by, { d: g.by })] : [])].join(', ');
  const watchRefs = inputs.watch.flatMap((w) => [...w.indicator.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  const refs = [...new Set([...(rec?.refs ?? []), ...(rec?.failure?.watch.map((w) => w.ref) ?? []), ...watchRefs])];
  return {
    lang,
    title: review.title,
    question: frame.problem,
    goal,
    ...(frame.audience ? { audience: frame.audience } : {}),
    asOf: frame.asOf,
    option: {
      title: rec?.title ?? '',
      rankLine: rec ? (rec.fromUser && !o.model ? L.yours : `${fill(L.ranked, { rank: rec.rank, n: o.options.length })}${rec.fromUser ? `, ${L.yours}` : ''}`) : '',
      how: rec?.how ?? '',
      effect: rec?.effect ?? '',
      time: rec?.timeToEffect ?? '',
      whoBears: rec?.whoBears ?? '',
      risks: rec?.risks ?? '',
      why: inputs.rationale,
    },
    figures: briefFigures(d, refs, lang),
    watch: inputs.watch.map((w) => `${w.indicator}${w.trigger ? `: ${w.trigger}` : ''}`),
    reviewDate: inputs.reviewDate,
    researchOnly: e.researchOnly,
    ...(frame.council ? { council: councilBrief(review, lang) } : {}),
    ...(people ? { people } : {}),
  };
}

export interface BriefLine {
  text: string;
  kind: 'title' | 'sub' | 'banner' | 'heading' | 'body' | 'bullet' | 'small';
}

/** The brief as lines in reading order, for the PDF and for tests. */
export function briefLines(b: PlainBrief): BriefLine[] {
  const L = BRIEF_TEXT[b.lang];
  const out: BriefLine[] = [
    { text: `${L.title}: ${b.title}`, kind: 'title' },
    { text: L.sub, kind: 'sub' },
    { text: b.researchOnly ? L.research : L.validated, kind: 'banner' },
    { text: L.question, kind: 'heading' },
    { text: b.question, kind: 'body' },
    { text: `${L.goal}: ${b.goal}.`, kind: 'body' },
    ...(b.audience ? [{ text: `${L.for}: ${b.audience}.`, kind: 'body' as const }] : []),
    { text: `${L.asOf} ${b.asOf}.`, kind: 'body' },
    { text: L.proposed, kind: 'heading' },
    { text: `${b.option.title} (${b.option.rankLine})`, kind: 'body' },
  ];
  const field = (label: string, v: string) => (v ? [{ text: `${label}: ${v}`, kind: 'bullet' as const }] : []);
  out.push(...field(L.how, b.option.how), ...field(L.effect, b.option.effect), ...field(L.time, b.option.time), ...field(L.whoBears, b.option.whoBears), ...field(L.risks, b.option.risks), ...field(L.why, b.option.why));
  out.push({ text: L.figures, kind: 'heading' });
  if (!b.figures.length) out.push({ text: L.noFigures, kind: 'body' });
  for (const f of b.figures) out.push({ text: `${f.refs.map((r) => `[${r}]`).join('')} ${f.label}: ${f.value}${f.source ? ` (${f.source})` : ''}`, kind: 'bullet' });
  out.push({ text: L.watch, kind: 'heading' });
  for (const w of b.watch) out.push({ text: w, kind: 'bullet' });
  out.push({ text: fill(L.lookAgain, { date: b.reviewDate }), kind: 'body' });
  // R7: what this means for people, before the council parts (a long brief cuts from the end).
  if (b.people) {
    out.push({ text: b.people.heading, kind: 'heading' });
    for (const l of b.people.lines) out.push({ text: l, kind: 'bullet' });
  }
  // PK8: the council parts come last, so a long brief cuts them before the option and what to watch.
  if (b.council) {
    out.push({ text: b.council.heading, kind: 'heading' });
    for (const l of b.council.lines) out.push({ text: l, kind: 'bullet' });
  }
  if (b.lang !== 'en') out.push({ text: L.savedText, kind: 'small' });
  out.push({ text: L.notice, kind: 'small' });
  return out;
}

export function briefFooter(lang: BriefLang, savedAt: string, hash: string): string {
  return fill(BRIEF_TEXT[lang].footer, { when: savedAt.slice(0, 16).replace('T', ' '), hash: hash.slice(0, 12) });
}

export function plainBriefFileName(title: string, lang: BriefLang): string {
  return `policy-brief-${title.replace(/[^A-Za-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80)}-${lang}.pdf`;
}

export const asBriefLang = (lang: string): BriefLang => ((BRIEF_LANGS as readonly string[]).includes(lang) ? (lang as BriefLang) : 'en');
