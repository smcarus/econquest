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

export function plainBrief(review: Pick<PolicyReview, 'title' | 'steps'>, inputs: MemoInputs, lang: BriefLang): PlainBrief {
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
