/**
 * Spanish, French and Brazilian Portuguese text for the Quests the generator drafts
 * (src/utils/questGenerator.ts), so a class taught in those languages reads every generated Quest
 * in its own language from the first day (classroom pilot). Each translation is written beside the
 * draft as quests/translations/<id>.<lang>.json and passes the same checks as a hand-made one: same
 * fields, same number of known limits, and no number that is not in the English text.
 *
 * Spanish uses usted, French vous, Portuguese você. Browser-safe, pure.
 */
import type { ForecastQuest } from './quests';
import type { QuestTranslation, QuestTranslationLang } from './questTranslations';
import { WEEKLY_FX, MONTHLY_POLICY } from './questGenerator';

const LOCALE: Record<QuestTranslationLang, string> = { es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR' };
const date = (d: string, lang: QuestTranslationLang) => new Date(`${d}T00:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Country and currency names, as each language writes them after "of" / "de". */
const PLACES: Record<string, Record<QuestTranslationLang, { of: string; currency?: string; in?: string }>> = {
  USA: { es: { of: 'Estados Unidos' }, fr: { of: 'des États-Unis' }, pt: { of: 'dos Estados Unidos' } },
  BRA: { es: { of: 'Brasil', currency: 'el real brasileño', in: 'Brasil' }, fr: { of: 'du Brésil', currency: 'le real brésilien', in: 'au Brésil' }, pt: { of: 'do Brasil', currency: 'o real', in: 'no Brasil' } },
  MEX: { es: { of: 'México', currency: 'el peso mexicano', in: 'México' }, fr: { of: 'du Mexique', currency: 'le peso mexicain', in: 'au Mexique' }, pt: { of: 'do México', currency: 'o peso mexicano', in: 'no México' } },
  CHL: { es: { of: 'Chile' }, fr: { of: 'du Chili' }, pt: { of: 'do Chile' } },
  COL: { es: { of: 'Colombia' }, fr: { of: 'de Colombie' }, pt: { of: 'da Colômbia' } },
  ZAF: { es: { of: 'Sudáfrica', currency: 'el rand sudafricano', in: 'Sudáfrica' }, fr: { of: "d'Afrique du Sud", currency: 'le rand sud-africain', in: 'en Afrique du Sud' }, pt: { of: 'da África do Sul', currency: 'o rand sul-africano', in: 'na África do Sul' } },
  TUR: { es: { of: 'Turquía', currency: 'la lira turca', in: 'Turquía' }, fr: { of: 'de Turquie', currency: 'la livre turque', in: 'en Turquie' }, pt: { of: 'da Turquia', currency: 'a lira turca', in: 'na Turquia' } },
  POL: { es: { of: 'Polonia' }, fr: { of: 'de Pologne' }, pt: { of: 'da Polônia' } },
  HUN: { es: { of: 'Hungría' }, fr: { of: 'de Hongrie' }, pt: { of: 'da Hungria' } },
  IND: { es: { of: 'India', currency: 'la rupia india', in: 'India' }, fr: { of: "de l'Inde", currency: 'la roupie indienne', in: 'en Inde' }, pt: { of: 'da Índia', currency: 'a rupia indiana', in: 'na Índia' } },
  IDN: { es: { of: 'Indonesia', currency: 'la rupia indonesia', in: 'Indonesia' }, fr: { of: "d'Indonésie", currency: 'la roupie indonésienne', in: 'en Indonésie' }, pt: { of: 'da Indonésia', currency: 'a rupia indonésia', in: 'na Indonésia' } },
  JPN: { es: { of: 'Japón', currency: 'el yen japonés', in: 'Japón' }, fr: { of: 'du Japon', currency: 'le yen japonais', in: 'au Japon' }, pt: { of: 'do Japão', currency: 'o iene japonês', in: 'no Japão' } },
};

type Text = Pick<QuestTranslation, 'title' | 'summary' | 'knownLimits'>;

function brentWeek(close: string, to: string, l: QuestTranslationLang): Text {
  const c = date(close, l);
  const t = date(to, l);
  if (l === 'es')
    return {
      title: `¿Estará el Brent más alto el ${t} que el ${c}?`,
      summary: `Indique la probabilidad de que el precio del petróleo Brent (la principal referencia mundial, precio spot diario de la EIA de EE. UU.) el primer día publicado a partir del ${t} sea mayor que el día en que cierran las respuestas, el ${c}. Un reto corto: verá su puntuación en unas dos semanas.`,
      knownLimits: ['La EIA publica los precios spot diarios con unos días de retraso; el reto se resuelve cuando sale el valor de la fecha.', 'En una sola semana, el petróleo se mueve sobre todo por noticias que nadie puede conocer de antemano; la tasa base está cerca del 50%.'],
    };
  if (l === 'fr')
    return {
      title: `Le Brent sera-t-il plus haut le ${t} que le ${c} ?`,
      summary: `Donnez la probabilité que le prix du pétrole Brent (la principale référence mondiale, prix spot quotidien de l'EIA américaine) le premier jour publié à partir du ${t} soit plus élevé que le jour de clôture des réponses, le ${c}. Une quête courte : vous verrez votre note dans environ deux semaines.`,
      knownLimits: ["L'EIA publie les prix spot quotidiens avec quelques jours de retard ; la quête se résout quand la valeur de la date est publiée.", "Sur une seule semaine, le pétrole bouge surtout sur des nouvelles que personne ne peut connaître à l'avance ; le taux de base est proche de 50%."],
    };
  return {
    title: `O Brent estará mais alto em ${t} do que em ${c}?`,
    summary: `Indique a probabilidade de que o preço do petróleo Brent (a principal referência mundial, preço spot diário da EIA dos EUA) no primeiro dia publicado a partir de ${t} seja maior do que no dia em que as respostas fecham, ${c}. Uma Quest curta: você verá sua nota em cerca de duas semanas.`,
    knownLimits: ['A EIA publica os preços spot diários com alguns dias de atraso; a Quest é resolvida quando sai o valor da data.', 'Em uma única semana, o petróleo se move sobretudo por notícias que ninguém pode conhecer com antecedência; a taxa base fica perto de 50%.'],
  };
}

function brentLong(close: string, far: string, weeks: number, l: QuestTranslationLang): Text {
  const c = date(close, l);
  const f = date(far, l);
  if (l === 'es')
    return {
      title: `¿Estará el Brent más alto el ${f} que el ${c}?`,
      summary: `Indique la probabilidad de que el precio del petróleo Brent (precio spot diario de la EIA de EE. UU.) el primer día publicado a partir del ${f} sea mayor que el día en que cierran las respuestas, el ${c}. Un reto para todo el periodo: el resultado llega ${weeks} semanas después del cierre, así que una clase puede seguirlo y comentar qué movió el precio.`,
      knownLimits: ['La EIA publica los precios spot diarios con unos días de retraso; el reto se resuelve cuando sale el valor de la fecha.', `En ${weeks} semanas, las decisiones de oferta, la economía mundial y el dólar mueven el petróleo; nadie conoce de antemano la mayor parte de esas noticias.`],
    };
  if (l === 'fr')
    return {
      title: `Le Brent sera-t-il plus haut le ${f} que le ${c} ?`,
      summary: `Donnez la probabilité que le prix du pétrole Brent (prix spot quotidien de l'EIA américaine) le premier jour publié à partir du ${f} soit plus élevé que le jour de clôture des réponses, le ${c}. Une quête sur le semestre : le résultat arrive ${weeks} semaines après la clôture, si bien qu'une classe peut la suivre et discuter de ce qui a fait bouger le prix.`,
      knownLimits: ["L'EIA publie les prix spot quotidiens avec quelques jours de retard ; la quête se résout quand la valeur de la date est publiée.", `Sur ${weeks} semaines, les décisions de production, l'économie mondiale et le dollar font bouger le pétrole ; personne ne connaît à l'avance l'essentiel de ces nouvelles.`],
    };
  return {
    title: `O Brent estará mais alto em ${f} do que em ${c}?`,
    summary: `Indique a probabilidade de que o preço do petróleo Brent (preço spot diário da EIA dos EUA) no primeiro dia publicado a partir de ${f} seja maior do que no dia em que as respostas fecham, ${c}. Uma Quest para o período todo: o resultado chega ${weeks} semanas depois do fechamento, então uma turma pode acompanhá-la e discutir o que moveu o preço.`,
    knownLimits: ['A EIA publica os preços spot diários com alguns dias de atraso; a Quest é resolvida quando sai o valor da data.', `Em ${weeks} semanas, decisões de oferta, a economia mundial e o dólar movem o petróleo; ninguém conhece com antecedência a maior parte dessas notícias.`],
  };
}

function fxWeek(iso3: string, close: string, to: string, l: QuestTranslationLang): Text | null {
  const p = PLACES[iso3]?.[l];
  if (!p?.currency || !p.in) return null;
  const c = date(close, l);
  const t = date(to, l);
  const cur = p.currency;
  const bare = cur.replace(/^(el|la|le|o|a) /, '');
  if (l === 'es')
    return {
      title: `¿Estará ${cur} más débil frente al dólar el ${t} que el ${c}?`,
      summary: `Indique la probabilidad de que haga falta más ${bare} para comprar un dólar estadounidense (tipo de referencia del BCE, cruzado con el dólar) en la primera fijación a partir del ${t} que el día en que cierran las respuestas, el ${c}. Más unidades por dólar significa una moneda más débil, lo que encarece las importaciones en ${p.in}.`,
      knownLimits: ['El BCE no fija tipos en los festivos de TARGET; se usa la primera fijación a partir de cada fecha.', 'El tipo se cruza a través del euro, así que puede diferir un poco de los tipos cotizados directamente frente al dólar.'],
    };
  if (l === 'fr')
    return {
      title: `${cur[0]!.toUpperCase()}${cur.slice(1)} sera-t-${cur.startsWith('la') ? 'elle' : 'il'} plus faible face au dollar le ${t} que le ${c} ?`,
      summary: `Donnez la probabilité qu'il faille plus d'unités de ${bare} pour acheter un dollar américain (cours de référence de la BCE, croisé avec le dollar) lors du premier fixing à partir du ${t} que le jour de clôture des réponses, le ${c}. Plus d'unités par dollar signifie une monnaie plus faible, ce qui renchérit les importations ${p.in}.`,
      knownLimits: ['La BCE ne publie pas de cours les jours fériés TARGET ; le premier fixing à partir de chaque date est utilisé.', "Le cours est croisé via l'euro, il peut donc différer légèrement des cours cotés directement contre le dollar."],
    };
  return {
    title: `${cur[0]!.toUpperCase()}${cur.slice(1)} estará mais ${cur.startsWith('a ') ? 'fraca' : 'fraco'} frente ao dólar em ${t} do que em ${c}?`,
    summary: `Indique a probabilidade de que sejam necessárias mais unidades de ${bare} para comprar um dólar americano (taxa de referência do BCE, cruzada com o dólar) na primeira cotação a partir de ${t} do que no dia em que as respostas fecham, ${c}. Mais unidades por dólar significa uma moeda mais fraca, o que encarece as importações ${p.in}.`,
    knownLimits: ['O BCE não publica taxas nos feriados do TARGET; usa-se a primeira cotação a partir de cada data.', 'A taxa é cruzada pelo euro, então pode diferir um pouco das taxas cotadas diretamente contra o dólar.'],
  };
}

function policyCut(iso3: string, close: string, to: string, l: QuestTranslationLang): Text | null {
  const p = PLACES[iso3]?.[l];
  if (!p) return null;
  const c = date(close, l);
  const t = date(to, l);
  if (l === 'es')
    return {
      title: `¿Habrá recortado el banco central de ${p.of} su tasa de política al ${t}?`,
      summary: `Indique la probabilidad de que la tasa de política del banco central de ${p.of} (serie diaria del BIS) el ${t} sea menor que el día en que cierran las respuestas, el ${c}. La tasa de política es el tipo de interés que fija el banco central; un recorte abarata el crédito y suele llegar cuando la inflación baja o la economía está débil.`,
      knownLimits: ['Los datos diarios del BIS pueden ir unos días por detrás de una decisión.', 'Importa si cae una reunión dentro del plazo; consulte el calendario del propio banco central antes de responder.'],
    };
  if (l === 'fr')
    return {
      title: `La banque centrale ${p.of} aura-t-elle baissé son taux directeur d'ici le ${t} ?`,
      summary: `Donnez la probabilité que le taux directeur de la banque centrale ${p.of} (série quotidienne de la BRI) le ${t} soit plus bas que le jour de clôture des réponses, le ${c}. Le taux directeur est le taux d'intérêt fixé par la banque centrale ; une baisse rend le crédit moins cher et intervient en général quand l'inflation recule ou que l'économie est faible.`,
      knownLimits: ["Les données quotidiennes de la BRI peuvent avoir quelques jours de retard sur une décision.", "Il importe qu'une réunion tombe dans la période ; consultez le calendrier de la banque centrale elle-même avant de répondre."],
    };
  return {
    title: `O banco central ${p.of} terá cortado sua taxa básica até ${t}?`,
    summary: `Indique a probabilidade de que a taxa básica do banco central ${p.of} (série diária do BIS) em ${t} seja menor do que no dia em que as respostas fecham, ${c}. A taxa básica é a taxa de juros que o banco central define; um corte barateia o crédito e costuma vir quando a inflação está caindo ou a economia está fraca.`,
    knownLimits: ['Os dados diários do BIS podem atrasar alguns dias em relação a uma decisão.', 'Importa se uma reunião cai dentro do prazo; consulte o calendário do próprio banco central antes de responder.'],
  };
}

/** Translations for one generated Quest, or none when its kind is not one the generator makes. */
export function generatedTranslations(q: ForecastQuest, translator: string): QuestTranslation[] {
  const to = q.rule.kind === 'direction' && typeof q.rule.to === 'object' && 'on' in q.rule.to ? q.rule.to.on : null;
  if (!to) return [];
  const out: QuestTranslation[] = [];
  for (const lang of ['es', 'fr', 'pt'] as const) {
    let t: Text | null = null;
    let m: RegExpExecArray | null;
    if (q.id.startsWith('brent-week-')) t = brentWeek(q.closesOn, to, lang);
    else if ((m = /^brent-(\d+)w-/.exec(q.id))) t = brentLong(q.closesOn, to, Number(m[1]), lang);
    else if ((m = /^([a-z]{3})-fx-week-/.exec(q.id)) && WEEKLY_FX.some((c) => c.iso3 === m![1]!.toUpperCase())) t = fxWeek(m[1]!.toUpperCase(), q.closesOn, to, lang);
    else if ((m = /^([a-z]{3})-policy-cut-/.exec(q.id)) && MONTHLY_POLICY.some((c) => c.iso3 === m![1]!.toUpperCase())) t = policyCut(m[1]!.toUpperCase(), q.closesOn, to, lang);
    if (t) out.push({ quest: q.id, version: q.version, lang, translator, ...t });
  }
  return out;
}
