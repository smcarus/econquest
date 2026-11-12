/**
 * Menu > Exemples guidés (W1, src/utils/workedExamples.ts) : le texte anglais des études de cas,
 * remplacé à l'affichage par translateText. Les chiffres, sources et années ne sont jamais traduits.
 */
export const WORKED_TEXT_FR: Record<string, string> = {
  'Memos and notes': 'Notes et mémos',
  // Debt sustainability
  'Debt sustainability': 'Soutenabilité de la dette',
  'Is government debt on a path the country can keep up?': "La dette publique suit-elle une trajectoire que le pays peut tenir ?",
  'How debt, growth, inflation and interest rates fit together, and what budget balance holds debt steady.':
    "Comment la dette, la croissance, l'inflation et les taux d'intérêt s'articulent, et quel solde budgétaire stabilise la dette.",
  'Government debt': 'Dette publique',
  '% of GDP': '% du PIB',
  'Government debt, IMF projection': 'Dette publique, projection du FMI',
  'Primary balance (before interest)': 'Solde primaire (avant intérêts)',
  'Real GDP growth': 'Croissance du PIB réel',
  '%': '%',
  Inflation: 'Inflation',
  '10-year government bond yield': "Rendement de l'obligation d'État à 10 ans",
  'Interest paid': 'Intérêts payés',
  '% of revenue': '% des recettes',
  'Read the starting figures': 'Lisez les chiffres de départ',
  'Look at the figures above. Debt alone says little: a country with fast growth and low interest rates can carry more debt than one with slow growth and high rates. Note the year beside each figure; the IMF projection is for a later year than the debt figure.':
    "Regardez les chiffres ci-dessus. La dette seule dit peu de chose : un pays à croissance rapide et à taux d'intérêt bas peut porter plus de dette qu'un pays à croissance lente et à taux élevés. Notez l'année à côté de chaque chiffre ; la projection du FMI porte sur une année postérieure à celle du chiffre de dette.",
  'Is debt rising or falling between the latest year and the IMF projection?': 'La dette monte-t-elle ou baisse-t-elle entre la dernière année et la projection du FMI ?',
  'Open the debt path': 'Ouvrez la trajectoire de la dette',
  'The Debt sustainability panel projects debt over five years from the same figures, and shows what happens with lower growth, higher interest rates or a weaker budget. It runs only when every input is live.':
    "Le panneau Soutenabilité de la dette projette la dette sur cinq ans à partir des mêmes chiffres et montre ce qui se passe avec une croissance plus faible, des taux d'intérêt plus élevés ou un budget plus faible. Il ne s'exécute que lorsque toutes les données d'entrée sont en direct.",
  'Research > History & data > Debt sustainability': 'Recherche > Historique et données > Soutenabilité de la dette',
  'Which shock moves debt the most?': 'Quel choc fait le plus bouger la dette ?',
  'Work out the budget that holds debt steady': 'Calculez le budget qui stabilise la dette',
  'Debt as a share of GDP stays flat when the primary balance equals debt × (interest rate − nominal growth) ÷ (1 + nominal growth). Nominal growth is real growth plus inflation. The 10-year yield stands in for the interest rate on new borrowing; the average rate on all debt is usually lower, so this is a cautious reading. The working is shown below when every figure is live.':
    "La dette en pourcentage du PIB reste stable lorsque le solde primaire est égal à dette × (taux d'intérêt − croissance nominale) ÷ (1 + croissance nominale). La croissance nominale est la croissance réelle plus l'inflation. Le rendement à 10 ans tient lieu de taux des nouveaux emprunts ; le taux moyen de toute la dette est en général plus bas, c'est donc une lecture prudente. Le calcul s'affiche ci-dessous lorsque tous les chiffres sont en direct.",
  'How far is the actual primary balance from the one that holds debt steady?': 'Quel écart sépare le solde primaire actuel de celui qui stabilise la dette ?',
  'Ask the council (optional)': 'Interrogez le conseil (facultatif)',
  'In Council chat, ask: "Is government debt sustainable, and what would change the answer?" The answer is written by the AI model and names its figures; check them against the ones above.':
    "Dans le Chat du conseil, demandez : « La dette publique est-elle soutenable, et qu'est-ce qui changerait la réponse ? » La réponse est rédigée par le modèle d'IA et cite ses chiffres ; comparez-les à ceux ci-dessus.",
  'Workspace > Council chat': 'Espace de travail > Chat du conseil',
  'Write the memo': 'Rédigez la note',
  'The draft below holds the question, the figures with their sources and years, the working, and space for your own answers. Copy or download it, then write your conclusion in your own words.':
    'Le brouillon ci-dessous contient la question, les chiffres avec leurs sources et leurs années, le calcul et de la place pour vos propres réponses. Copiez-le ou téléchargez-le, puis rédigez votre conclusion avec vos propres mots.',
  // Inflation
  'Inflation and interest rates': "Inflation et taux d'intérêt",
  "Is the central bank's policy tight or loose?": 'La politique de la banque centrale est-elle restrictive ou accommodante ?',
  'What a real interest rate is, and how inflation, the output gap and unemployment point to tighter or looser policy.':
    "Ce qu'est un taux d'intérêt réel, et comment l'inflation, l'écart de production et le chômage plaident pour une politique plus restrictive ou plus accommodante.",
  'Central bank policy rate': 'Taux directeur de la banque centrale',
  'Output gap': 'Écart de production',
  '% of potential GDP': '% du PIB potentiel',
  'Unemployment rate': 'Taux de chômage',
  'The policy rate is the interest rate the central bank sets. What matters for borrowers and savers is the rate after inflation, called the real rate. The IMF inflation figure is for the year shown beside it; the latest monthly figure is in History & data.':
    "Le taux directeur est le taux d'intérêt fixé par la banque centrale. Ce qui compte pour les emprunteurs et les épargnants, c'est le taux après inflation, appelé taux réel. Le chiffre d'inflation du FMI porte sur l'année indiquée à côté ; le dernier chiffre mensuel se trouve dans Historique et données.",
  'Is inflation above or below the central bank target you know of?': "L'inflation est-elle au-dessus ou en dessous de la cible de la banque centrale que vous connaissez ?",
  'Work out the real policy rate': 'Calculez le taux directeur réel',
  'Real policy rate = policy rate − inflation. A clearly positive real rate usually holds spending and prices back (tight); a negative one pushes them up (loose). The working is shown below when both figures are live.':
    "Taux directeur réel = taux directeur − inflation. Un taux réel nettement positif freine en général la dépense et les prix (restrictif) ; un taux négatif les pousse à la hausse (accommodant). Le calcul s'affiche ci-dessous lorsque les deux chiffres sont en direct.",
  'Is the real rate positive or negative, and by how much?': 'Le taux réel est-il positif ou négatif, et de combien ?',
  'Check how busy the economy is': "Vérifiez le niveau d'activité de l'économie",
  'The output gap is how far the economy runs above (positive) or below (negative) what it can produce without pushing up prices. A positive gap with high inflation argues for tighter policy; a negative gap with low inflation argues for looser policy. The IMF publishes an output gap mostly for advanced economies; elsewhere it reads Missing and the Output gap panel estimates one from the data.':
    "L'écart de production mesure de combien l'économie tourne au-dessus (positif) ou en dessous (négatif) de ce qu'elle peut produire sans faire monter les prix. Un écart positif avec une inflation élevée plaide pour une politique plus restrictive ; un écart négatif avec une inflation basse, pour une politique plus accommodante. Le FMI publie un écart de production surtout pour les économies avancées ; ailleurs il s'affiche Manquant et le panneau Écart de production en estime un à partir des données.",
  'Research > History & data > Output gap': 'Recherche > Historique et données > Écart de production',
  'Do the output gap and unemployment point the same way as the real rate?': "L'écart de production et le chômage vont-ils dans le même sens que le taux réel ?",
  'Compare with other countries': "Comparez avec d'autres pays",
  'Markets & signals shows whether interest rates are tight or loose against the country’s peers.':
    "Marchés et signaux montre si les taux d'intérêt sont restrictifs ou accommodants par rapport aux pays comparables.",
  'Research > Markets & signals': 'Recherche > Marchés et signaux',
  // Currency
  'The currency': 'La monnaie',
  'How exposed is the currency if foreign money stops coming in?': "Quelle est l'exposition de la monnaie si l'argent étranger cesse d'arriver ?",
  'How reserves, the current account and external debt show a country’s cushion against a sudden stop.':
    "Comment les réserves, le compte courant et la dette extérieure montrent le matelas d'un pays face à un arrêt brutal des entrées de capitaux.",
  'Exchange rate': 'Taux de change',
  'per US dollar': 'par dollar américain',
  'Change since 1 January': 'Variation depuis le 1er janvier',
  Reserves: 'Réserves',
  'months of imports': "mois d'importations",
  'Current account balance': 'Solde du compte courant',
  'External debt': 'Dette extérieure',
  '% of GNI': '% du RNB',
  'A current account deficit means the country spends more abroad than it earns and must borrow or attract investment to pay for it. Reserves are the foreign money the central bank holds to pay bills or support the currency if that money stops.':
    "Un déficit du compte courant signifie que le pays dépense à l'étranger plus qu'il n'y gagne et doit emprunter ou attirer des investissements pour le payer. Les réserves sont l'argent étranger que détient la banque centrale pour payer les factures ou soutenir la monnaie si cet argent cesse d'arriver.",
  'Does the country earn more abroad than it spends (surplus), or less (deficit)?': "Le pays gagne-t-il à l'étranger plus qu'il ne dépense (excédent), ou moins (déficit) ?",
  'Check the cushion': 'Vérifiez le matelas',
  'A common rule of thumb treats reserves worth three months of imports as the minimum. The working below compares the figure with that line when it is live. The Reserve adequacy panel uses the IMF’s fuller measure, which also counts debt falling due and money that could leave.':
    "Une règle empirique courante fixe le minimum à des réserves équivalant à trois mois d'importations. Le calcul ci-dessous compare le chiffre à ce seuil lorsqu'il est en direct. Le panneau Adéquation des réserves utilise la mesure plus complète du FMI, qui compte aussi la dette arrivant à échéance et l'argent qui pourrait sortir.",
  'Research > History & data > Reserve adequacy': 'Recherche > Historique et données > Adéquation des réserves',
  'Would the reserves last long if foreign money stopped?': "Les réserves dureraient-elles longtemps si l'argent étranger cessait d'arriver ?",
  'Look at the market': 'Regardez le marché',
  'Markets & signals shows whether the currency looks strong or weak against its peers, and how much extra interest it pays for the swings it brings.':
    "Marchés et signaux montre si la monnaie paraît forte ou faible par rapport à celles des pays comparables, et combien d'intérêt supplémentaire elle rapporte pour les variations qu'elle entraîne.",
  'Has the currency already fallen this year, and does that fit the figures above?': 'La monnaie a-t-elle déjà baissé cette année, et cela concorde-t-il avec les chiffres ci-dessus ?',
  // Policy review
  'A policy review': 'Une revue de politique',
  'Can the government afford to spend 1% of GDP more each year?': "L'État peut-il se permettre de dépenser 1 % du PIB de plus chaque année ?",
  'How a spending plan changes the budget and debt, who pays for it, and how to set out options in a policy review.':
    'Comment un plan de dépenses modifie le budget et la dette, qui le paie, et comment présenter des options dans une revue de politique.',
  'Government revenue': 'Recettes publiques',
  'Government spending': 'Dépenses publiques',
  'Overall budget balance': 'Solde budgétaire global',
  'Tax revenue, central government': 'Recettes fiscales, administration centrale',
  'Income inequality (Gini)': 'Inégalité des revenus (Gini)',
  '0 to 100': '0 à 100',
  'The overall balance is revenue minus spending, including interest. Spending 1% of GDP more without new revenue makes the balance 1 point worse and, other things equal, adds about 1 point of GDP to debt each year. The working below shows the new balance when the figures are live.':
    "Le solde global correspond aux recettes moins les dépenses, intérêts compris. Dépenser 1 % du PIB de plus sans nouvelles recettes dégrade le solde d'un point et, toutes choses égales par ailleurs, ajoute environ un point de PIB à la dette chaque année. Le calcul ci-dessous montre le nouveau solde lorsque les chiffres sont en direct.",
  'Would the plan be paid for by borrowing, higher taxes or cuts elsewhere?': "Le plan serait-il financé par l'emprunt, par des impôts plus élevés ou par des économies ailleurs ?",
  'Start a policy review': 'Lancez une revue de politique',
  'In Policy reviews, choose the country and write the goal, for example "spend 1% of GDP more on schools without raising debt above its current level". The review sets out options, what each would cost, who would pay, and how each could fail, and checks the result after 12 and 24 months.':
    "Dans Revues de politique, choisissez le pays et écrivez l'objectif, par exemple « dépenser 1 % du PIB de plus pour les écoles sans porter la dette au-dessus de son niveau actuel ». La revue présente des options, ce que chacune coûterait, qui paierait et comment chacune pourrait échouer, et vérifie le résultat après 12 et 24 mois.",
  'Reports > Memos and notes > Policy reviews': 'Rapports > Notes et mémos > Revues de politique',
  'Which option would you choose, and who bears its cost?': 'Quelle option choisiriez-vous, et qui en supporte le coût ?',
  'Weigh who pays': 'Évaluez qui paie',
  'Tax revenue and inequality show how much room there is to raise taxes and who would feel it. Interest already paid shows how much of today’s revenue is spoken for.':
    "Les recettes fiscales et les inégalités montrent quelle marge existe pour augmenter les impôts et qui le ressentirait. Les intérêts déjà payés montrent quelle part des recettes actuelles est déjà engagée.",
  'Is there room to raise revenue, or would the plan need borrowing?': "Y a-t-il de la marge pour augmenter les recettes, ou le plan exigerait-il d'emprunter ?",
  'The draft below holds the question, the figures with their sources and years, the working, and space for your own answers. Copy or download it, then write your conclusion in your own words. Policy reviews can also write a memo from the review itself.':
    'Le brouillon ci-dessous contient la question, les chiffres avec leurs sources et leurs années, le calcul et de la place pour vos propres réponses. Copiez-le ou téléchargez-le, puis rédigez votre conclusion avec vos propres mots. Revues de politique peut aussi rédiger une note à partir de la revue elle-même.',
  // Working and memo
  'Missing: no live figure is saved for this country yet (Menu > Data health shows why).':
    "Manquant : aucun chiffre en direct n'est encore enregistré pour ce pays (Menu > État des données en donne la raison).",
  'Not worked out: it needs {list}, which read Missing.': "Non calculé : il faut {list}, qui s'affichent Manquant.",
  'Nominal growth': 'Croissance nominale',
  'Primary balance that holds debt steady': 'Solde primaire qui stabilise la dette',
  'Gap to the actual primary balance': 'Écart avec le solde primaire actuel',
  'Real policy rate': 'Taux directeur réel',
  'Reserves against the three-month line': 'Réserves par rapport au seuil de trois mois',
  'Overall balance with the plan': 'Solde global avec le plan',
  'Debt after one year, if borrowed': "Dette au bout d'un an, si le plan est financé par l'emprunt",
  'points of GDP': 'points de PIB',
  months: 'mois',
  'Positive means the budget would need to improve by this much to hold debt steady.':
    "Une valeur positive indique de combien le budget devrait s'améliorer pour stabiliser la dette.",
  'The inflation figure is for its IMF year, so the real rate today may differ.':
    "Le chiffre d'inflation porte sur son année FMI ; le taux réel actuel peut donc être différent.",
  'Above the rule-of-thumb minimum.': 'Au-dessus du minimum de la règle empirique.',
  'Below the rule-of-thumb minimum.': 'En dessous du minimum de la règle empirique.',
  'Before the effect of growth and inflation.': "Avant l'effet de la croissance et de l'inflation.",
  Question: 'Question',
  Figures: 'Chiffres',
  Working: 'Calcul',
  'Your answers': 'Vos réponses',
  'Your answer:': 'Votre réponse :',
  'Conclusion (in your own words):': 'Conclusion (avec vos propres mots) :',
  'Figures as saved on this computer on {date}. Every figure names its source and year; none is built in.':
    "Chiffres tels qu'enregistrés sur cet ordinateur le {date}. Chaque chiffre indique sa source et son année ; aucun n'est intégré.",
};
