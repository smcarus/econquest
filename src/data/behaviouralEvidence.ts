/**
 * Behavioural policy check (roadmap G33): the fixed list of published studies and official reviews
 * that the check in Policy review may cite, and the behaviour channels it looks for.
 *
 * Rules (Sam): no AI-written evidence and no built-in effect sizes. Each study is described in words
 * only (what it looked at and the direction of what it found); no numbers from any study are stored
 * here. An effect size appears in a review only when the user enters it with its source
 * (src/utils/behaviouralCheck.ts). Every DOI was checked against Crossref on 12 November 2026,
 * except Thaler and Benartzi (2004), which is cited by journal, volume and pages without a DOI.
 *
 * The check is a description, not a tested signal: it says where an option depends on how people
 * behave and which published work describes that behaviour. It does not say the option will work.
 */

export interface BehaviourStudy {
  id: string;
  /** Full citation, as it would appear in a reference list. */
  citation: string;
  /** A link to the work (doi.org or the publisher). */
  link: string;
  /** What the work looked at and which way the finding went, in words. No figures. */
  about: string;
}

export const BEHAVIOUR_STUDIES: BehaviourStudy[] = [
  {
    id: 'wdr2015',
    citation: 'World Bank (2015). World Development Report 2015: Mind, Society, and Behavior. Washington, DC: World Bank.',
    link: 'https://doi.org/10.1596/978-1-4648-0342-0',
    about: 'An official review of how people think automatically, socially and through mental models, with examples from poverty, early childhood, household finance, productivity, health and climate change policy in many countries.',
  },
  {
    id: 'oecd2017',
    citation: 'OECD (2017). Behavioural Insights and Public Policy: Lessons from Around the World. Paris: OECD Publishing.',
    link: 'https://doi.org/10.1787/9789264270480-en',
    about: 'An official collection of case studies in which governments tested behavioural changes to policy, including taxes, consumer protection, energy, finance, health, labour markets and public services.',
  },
  {
    id: 'madrian_shea2001',
    citation: 'Madrian, B. C. and Shea, D. F. (2001). The Power of Suggestion: Inertia in 401(k) Participation and Savings Behavior. Quarterly Journal of Economics, 116(4), 1149-1187.',
    link: 'https://doi.org/10.1162/003355301753265543',
    about: 'Studied a US employer that switched its retirement savings plan to automatic enrolment. Participation rose a great deal, and many new members stayed at the default contribution rate and fund.',
  },
  {
    id: 'thaler_benartzi2004',
    citation: 'Thaler, R. H. and Benartzi, S. (2004). Save More Tomorrow: Using Behavioral Economics to Increase Employee Saving. Journal of Political Economy, 112(S1), S164-S187.',
    link: 'https://www.journals.uchicago.edu/toc/jpe/2004/112/S1',
    about: 'Tested a plan in which employees committed in advance to save part of future pay rises. Saving rates rose over several years, a way around putting off saving until later.',
  },
  {
    id: 'laibson1997',
    citation: 'Laibson, D. (1997). Golden Eggs and Hyperbolic Discounting. Quarterly Journal of Economics, 112(2), 443-478.',
    link: 'https://doi.org/10.1162/003355397555253',
    about: 'A model of present bias: people weigh the present much more than any later date, so they save less than they plan to and value ways to commit themselves in advance.',
  },
  {
    id: 'currie2004',
    citation: 'Currie, J. (2004). The Take Up of Social Benefits. NBER Working Paper 10488. Published in Auerbach, A., Card, D. and Quigley, J. (eds), Russell Sage Foundation, 2006, pp. 80-148.',
    link: 'https://doi.org/10.3386/w10488',
    about: 'A review of why many people who qualify for social benefits do not claim them: the cost and difficulty of applying, lack of information and stigma.',
  },
  {
    id: 'bhargava_manoli2015',
    citation: 'Bhargava, S. and Manoli, D. (2015). Psychological Frictions and the Incomplete Take-Up of Social Benefits: Evidence from an IRS Field Experiment. American Economic Review, 105(11), 3489-3529.',
    link: 'https://doi.org/10.1257/aer.20121493',
    about: 'A field experiment with the US tax authority: simpler, clearer reminder letters raised claims of a tax credit by people who qualified but had not claimed it.',
  },
  {
    id: 'chetty2009',
    citation: 'Chetty, R., Looney, A. and Kroft, K. (2009). Salience and Taxation: Theory and Evidence. American Economic Review, 99(4), 1145-1177.',
    link: 'https://doi.org/10.1257/aer.99.4.1145',
    about: 'Showed that people react less to taxes they do not see: showing tax-inclusive prices on shelves lowered purchases, while the same tax added at the till had a smaller effect.',
  },
  {
    id: 'hallsworth2017',
    citation: 'Hallsworth, M., List, J. A., Metcalfe, R. D. and Vlaev, I. (2017). The behavioralist as tax collector: Using natural field experiments to enhance tax compliance. Journal of Public Economics, 148, 14-31.',
    link: 'https://doi.org/10.1016/j.jpubeco.2017.02.003',
    about: 'Field experiments with the UK tax authority: reminder letters that told people most others pay on time raised payments of overdue tax.',
  },
  {
    id: 'coibion2018',
    citation: 'Coibion, O., Gorodnichenko, Y. and Kumar, S. (2018). How Do Firms Form Their Expectations? New Survey Evidence. American Economic Review, 108(9), 2671-2713.',
    link: 'https://doi.org/10.1257/aer.20151299',
    about: 'Surveys of firms in New Zealand, an early inflation-targeting country: many managers did not know the target and expected inflation well away from it; giving them information changed their expectations.',
  },
  {
    id: 'blinder2008',
    citation: 'Blinder, A. S., Ehrmann, M., Fratzscher, M., De Haan, J. and Jansen, D.-J. (2008). Central Bank Communication and Monetary Policy: A Survey of Theory and Evidence. Journal of Economic Literature, 46(4), 910-945.',
    link: 'https://doi.org/10.1257/jel.46.4.910',
    about: 'A survey of research on how what central banks say moves markets and expectations, and when communication helps or does not.',
  },
  {
    id: 'tk1974',
    citation: 'Tversky, A. and Kahneman, D. (1974). Judgment under Uncertainty: Heuristics and Biases. Science, 185(4157), 1124-1131.',
    link: 'https://doi.org/10.1126/science.185.4157.1124',
    about: 'Described rules of thumb people use to judge uncertain things, including anchoring: estimates lean towards a starting number, even an unrelated one.',
  },
  {
    id: 'kt1979',
    citation: 'Kahneman, D. and Tversky, A. (1979). Prospect Theory: An Analysis of Decision under Risk. Econometrica, 47(2), 263-291.',
    link: 'https://doi.org/10.2307/1914185',
    about: 'Showed in choice experiments that people judge outcomes as gains or losses from where they stand, and that losses weigh more than gains of the same size.',
  },
  {
    id: 'tk1981',
    citation: 'Tversky, A. and Kahneman, D. (1981). The Framing of Decisions and the Psychology of Choice. Science, 211(4481), 453-458.',
    link: 'https://doi.org/10.1126/science.7455683',
    about: 'Showed that describing the same choice as lives saved or lives lost changes which option people pick.',
  },
];

export const BEHAVIOUR_CHANNELS = ['take_up', 'tax_response', 'expectations', 'defaults', 'loss_aversion', 'present_bias'] as const;
export type BehaviourChannel = (typeof BEHAVIOUR_CHANNELS)[number];

export interface ChannelRule {
  label: string;
  /** The question the principal should ask of the option. */
  question: string;
  /** Glossary entry that explains the idea (src/data/glossary.ts), if any. */
  glossary?: string;
  /** Words in the option's text that make the check raise this flag (whole words, any case). */
  words: RegExp;
  /** Studies from BEHAVIOUR_STUDIES, most relevant first. */
  studies: string[];
}

export const CHANNEL_RULES: Record<BehaviourChannel, ChannelRule> = {
  take_up: {
    label: 'Take-up of a benefit or programme',
    question: 'Will the people it is meant for apply for it? Claims are often well below the number who qualify, because applying is hard, information is missing or claiming carries stigma.',
    words: /\b(take-?up|benefits?|transfers?|cash transfers?|allowances?|grants?|social assistance|safety nets?|pensions? for|subsid(y|ies) to households|vouchers?|eligib\w*|apply|applications?|claim\w*|enrol\w*|registration|sign up)\b/i,
    studies: ['currie2004', 'bhargava_manoli2015', 'wdr2015', 'oecd2017'],
  },
  tax_response: {
    label: 'Response to a tax change and tax compliance',
    question: 'Will people and firms notice the change, and will they pay? Taxes people do not see change behaviour less, and compliance depends on reminders, social norms and trust as well as penalties.',
    words: /\b(tax(es|ation)?|VAT|excise|levy|levies|duty|duties|tariffs?|compliance|evasion|revenue measures?|surcharge)\b/i,
    studies: ['chetty2009', 'hallsworth2017', 'oecd2017'],
  },
  expectations: {
    label: 'Trust in an inflation target or announced path',
    question: 'Will households and firms believe the announcement? A target anchors prices and wages only while people know it and trust it.',
    glossary: 'anchoring',
    words: /\b(inflation target\w*|inflation-targeting|expectations?|credib\w*|forward guidance|guidance|communicat\w*|announce\w*|anchor\w*|trust|commitment)\b/i,
    studies: ['coibion2018', 'blinder2008', 'tk1974'],
  },
  defaults: {
    label: 'Defaults and automatic enrolment',
    question: 'What happens to people who do nothing? Many stay with whatever is set for them, so the default choice decides much of the result.',
    glossary: 'defaults',
    words: /\b(default (option|setting|choice|contribution|rate)s?|by default|automatic(ally)? enrol\w*|auto-?enrol\w*|opt[- ]?(in|out))\b/i,
    studies: ['madrian_shea2001', 'thaler_benartzi2004', 'oecd2017'],
  },
  loss_aversion: {
    label: 'Losses and framing (removing something people have)',
    question: 'Does it take away something people already receive? Losses are felt more strongly than gains, and how the change is described shapes the reaction.',
    glossary: 'loss_aversion',
    words: /\b(remov\w*|phase[- ]?out|phasing out|(spending|benefit|subsidy|wage|pension) cuts?|cutting (spending|benefits|subsidies)|withdraw\w*|scrap\w*|abolish\w*|eliminat\w*|end(ing)? (the )?subsid\w*|subsid(y|ies) reform|reform of subsid\w*|fuel subsid\w*|price controls?|austerity|consolidation)\b/i,
    studies: ['kt1979', 'tk1981', 'wdr2015'],
  },
  present_bias: {
    label: 'Acting now for a gain later',
    question: 'Does it ask people to pay a cost now for a gain later (saving, training, paying early)? People tend to put such things off.',
    glossary: 'present_bias',
    words: /\b(household sav(ing|ings)|saving for|savings (scheme|plan|account)s?|retirement sav\w*|pension savings?|invest(ment)? in (skills|education|training)|training|schooling|commitment devices?)\b/i,
    studies: ['laibson1997', 'thaler_benartzi2004', 'wdr2015'],
  },
};

export const studyById = (id: string): BehaviourStudy | undefined => BEHAVIOUR_STUDIES.find((s) => s.id === id);
