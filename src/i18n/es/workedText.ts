/**
 * Menu > Ejemplos resueltos (W1, src/utils/workedExamples.ts): the case studies' English text,
 * swapped at display time by translateText. Figures, sources and years are never translated.
 */
export const WORKED_TEXT_ES: Record<string, string> = {
  'Memos and notes': 'Memorandos y notas',
  // Debt sustainability
  'Debt sustainability': 'Sostenibilidad de la deuda',
  'Is government debt on a path the country can keep up?': '¿Sigue la deuda pública una trayectoria que el país puede sostener?',
  'How debt, growth, inflation and interest rates fit together, and what budget balance holds debt steady.':
    'Cómo se relacionan la deuda, el crecimiento, la inflación y los tipos de interés, y qué saldo presupuestario mantiene estable la deuda.',
  'Government debt': 'Deuda pública',
  '% of GDP': '% del PIB',
  'Government debt, IMF projection': 'Deuda pública, proyección del FMI',
  'Primary balance (before interest)': 'Saldo primario (antes de intereses)',
  'Real GDP growth': 'Crecimiento del PIB real',
  '%': '%',
  Inflation: 'Inflación',
  '10-year government bond yield': 'Rendimiento del bono público a 10 años',
  'Interest paid': 'Intereses pagados',
  '% of revenue': '% de los ingresos',
  'Read the starting figures': 'Lea las cifras de partida',
  'Look at the figures above. Debt alone says little: a country with fast growth and low interest rates can carry more debt than one with slow growth and high rates. Note the year beside each figure; the IMF projection is for a later year than the debt figure.':
    'Mire las cifras de arriba. La deuda por sí sola dice poco: un país con crecimiento rápido y tipos de interés bajos puede soportar más deuda que uno con crecimiento lento y tipos altos. Fíjese en el año junto a cada cifra; la proyección del FMI corresponde a un año posterior al de la cifra de deuda.',
  'Is debt rising or falling between the latest year and the IMF projection?': '¿Sube o baja la deuda entre el último año y la proyección del FMI?',
  'Open the debt path': 'Abra la trayectoria de la deuda',
  'The Debt sustainability panel projects debt over five years from the same figures, and shows what happens with lower growth, higher interest rates or a weaker budget. It runs only when every input is live.':
    'El panel Sostenibilidad de la deuda proyecta la deuda a cinco años con las mismas cifras y muestra qué ocurre con menos crecimiento, tipos de interés más altos o un presupuesto más débil. Solo se ejecuta cuando todos los datos de entrada están en vivo.',
  'Research > History & data > Debt sustainability': 'Investigación > Historia y datos > Sostenibilidad de la deuda',
  'Which shock moves debt the most?': '¿Qué perturbación mueve más la deuda?',
  'Work out the budget that holds debt steady': 'Calcule el presupuesto que mantiene estable la deuda',
  'Debt as a share of GDP stays flat when the primary balance equals debt × (interest rate − nominal growth) ÷ (1 + nominal growth). Nominal growth is real growth plus inflation. The 10-year yield stands in for the interest rate on new borrowing; the average rate on all debt is usually lower, so this is a cautious reading. The working is shown below when every figure is live.':
    'La deuda en porcentaje del PIB se mantiene estable cuando el saldo primario es igual a deuda × (tipo de interés − crecimiento nominal) ÷ (1 + crecimiento nominal). El crecimiento nominal es el crecimiento real más la inflación. El rendimiento a 10 años sustituye al tipo de interés de la nueva deuda; el tipo medio de toda la deuda suele ser más bajo, así que es una lectura prudente. El cálculo aparece abajo cuando todas las cifras están en vivo.',
  'How far is the actual primary balance from the one that holds debt steady?': '¿Cuánto se aleja el saldo primario actual del que mantiene estable la deuda?',
  'Ask the council (optional)': 'Pregunte al consejo (opcional)',
  'In Council chat, ask: "Is government debt sustainable, and what would change the answer?" The answer is written by the AI model and names its figures; check them against the ones above.':
    'En el Chat del consejo, pregunte: "¿Es sostenible la deuda pública y qué cambiaría la respuesta?" La respuesta la escribe el modelo de IA y nombra sus cifras; compárelas con las de arriba.',
  'Workspace > Council chat': 'Espacio de trabajo > Chat del consejo',
  'Write the memo': 'Redacte el memorando',
  'The draft below holds the question, the figures with their sources and years, the working, and space for your own answers. Copy or download it, then write your conclusion in your own words.':
    'El borrador de abajo contiene la pregunta, las cifras con sus fuentes y años, el cálculo y espacio para sus propias respuestas. Cópielo o descárguelo y escriba su conclusión con sus propias palabras.',
  // Inflation
  'Inflation and interest rates': 'Inflación y tipos de interés',
  "Is the central bank's policy tight or loose?": '¿Es restrictiva o expansiva la política del banco central?',
  'What a real interest rate is, and how inflation, the output gap and unemployment point to tighter or looser policy.':
    'Qué es un tipo de interés real y cómo la inflación, la brecha del producto y el desempleo apuntan a una política más restrictiva o más expansiva.',
  'Central bank policy rate': 'Tipo de interés oficial del banco central',
  'Output gap': 'Brecha del producto',
  '% of potential GDP': '% del PIB potencial',
  'Unemployment rate': 'Tasa de desempleo',
  'The policy rate is the interest rate the central bank sets. What matters for borrowers and savers is the rate after inflation, called the real rate. The IMF inflation figure is for the year shown beside it; the latest monthly figure is in History & data.':
    'El tipo de interés oficial es el que fija el banco central. Lo que importa a prestatarios y ahorradores es el tipo descontada la inflación, llamado tipo real. La cifra de inflación del FMI corresponde al año indicado a su lado; la última cifra mensual está en Historia y datos.',
  'Is inflation above or below the central bank target you know of?': '¿Está la inflación por encima o por debajo del objetivo del banco central que usted conoce?',
  'Work out the real policy rate': 'Calcule el tipo de interés oficial real',
  'Real policy rate = policy rate − inflation. A clearly positive real rate usually holds spending and prices back (tight); a negative one pushes them up (loose). The working is shown below when both figures are live.':
    'Tipo de interés oficial real = tipo de interés oficial − inflación. Un tipo real claramente positivo suele frenar el gasto y los precios (restrictivo); uno negativo los empuja al alza (expansivo). El cálculo aparece abajo cuando ambas cifras están en vivo.',
  'Is the real rate positive or negative, and by how much?': '¿Es el tipo real positivo o negativo, y en cuánto?',
  'Check how busy the economy is': 'Compruebe el grado de actividad de la economía',
  'The output gap is how far the economy runs above (positive) or below (negative) what it can produce without pushing up prices. A positive gap with high inflation argues for tighter policy; a negative gap with low inflation argues for looser policy. The IMF publishes an output gap mostly for advanced economies; elsewhere it reads Missing and the Output gap panel estimates one from the data.':
    'La brecha del producto mide cuánto produce la economía por encima (positiva) o por debajo (negativa) de lo que puede producir sin presionar los precios. Una brecha positiva con inflación alta aboga por una política más restrictiva; una brecha negativa con inflación baja, por una más expansiva. El FMI publica la brecha del producto sobre todo para economías avanzadas; en las demás figura como Falta y el panel Brecha del producto la estima a partir de los datos.',
  'Research > History & data > Output gap': 'Investigación > Historia y datos > Brecha del producto',
  'Do the output gap and unemployment point the same way as the real rate?': '¿Apuntan la brecha del producto y el desempleo en la misma dirección que el tipo real?',
  'Compare with other countries': 'Compare con otros países',
  'Markets & signals shows whether interest rates are tight or loose against the country’s peers.':
    'Mercados y señales muestra si los tipos de interés son restrictivos o expansivos frente a los de países comparables.',
  'Research > Markets & signals': 'Investigación > Mercados y señales',
  // Currency
  'The currency': 'La moneda',
  'How exposed is the currency if foreign money stops coming in?': '¿Cuán expuesta está la moneda si deja de entrar dinero del exterior?',
  'How reserves, the current account and external debt show a country’s cushion against a sudden stop.':
    'Cómo las reservas, la cuenta corriente y la deuda externa muestran el colchón de un país ante una interrupción repentina.',
  'Exchange rate': 'Tipo de cambio',
  'per US dollar': 'por dólar estadounidense',
  'Change since 1 January': 'Variación desde el 1 de enero',
  Reserves: 'Reservas',
  'months of imports': 'meses de importaciones',
  'Current account balance': 'Saldo de la cuenta corriente',
  'External debt': 'Deuda externa',
  '% of GNI': '% del INB',
  'A current account deficit means the country spends more abroad than it earns and must borrow or attract investment to pay for it. Reserves are the foreign money the central bank holds to pay bills or support the currency if that money stops.':
    'Un déficit por cuenta corriente significa que el país gasta en el exterior más de lo que ingresa y debe endeudarse o atraer inversión para pagarlo. Las reservas son el dinero extranjero que guarda el banco central para pagar facturas o sostener la moneda si ese dinero deja de llegar.',
  'Does the country earn more abroad than it spends (surplus), or less (deficit)?': '¿Ingresa el país en el exterior más de lo que gasta (superávit) o menos (déficit)?',
  'Check the cushion': 'Compruebe el colchón',
  'A common rule of thumb treats reserves worth three months of imports as the minimum. The working below compares the figure with that line when it is live. The Reserve adequacy panel uses the IMF’s fuller measure, which also counts debt falling due and money that could leave.':
    'Una regla práctica habitual considera mínimo unas reservas equivalentes a tres meses de importaciones. El cálculo de abajo compara la cifra con ese umbral cuando está en vivo. El panel Suficiencia de reservas usa la medida más completa del FMI, que también cuenta la deuda que vence y el dinero que podría salir.',
  'Research > History & data > Reserve adequacy': 'Investigación > Historia y datos > Suficiencia de reservas',
  'Would the reserves last long if foreign money stopped?': '¿Durarían mucho las reservas si dejara de llegar dinero del exterior?',
  'Look at the market': 'Mire el mercado',
  'Markets & signals shows whether the currency looks strong or weak against its peers, and how much extra interest it pays for the swings it brings.':
    'Mercados y señales muestra si la moneda parece fuerte o débil frente a las de países comparables y cuánto interés adicional paga por las oscilaciones que conlleva.',
  'Has the currency already fallen this year, and does that fit the figures above?': '¿Ha caído ya la moneda este año, y encaja eso con las cifras de arriba?',
  // Policy review
  'A policy review': 'Una revisión de políticas',
  'Can the government afford to spend 1% of GDP more each year?': '¿Puede el gobierno permitirse gastar un 1% del PIB más cada año?',
  'How a spending plan changes the budget and debt, who pays for it, and how to set out options in a policy review.':
    'Cómo un plan de gasto cambia el presupuesto y la deuda, quién lo paga y cómo plantear opciones en una revisión de políticas.',
  'Government revenue': 'Ingresos públicos',
  'Government spending': 'Gasto público',
  'Tax revenue, central government': 'Ingresos tributarios, gobierno central',
  'Income inequality (Gini)': 'Desigualdad de ingresos (Gini)',
  '0 to 100': '0 a 100',
  'The overall balance is revenue minus spending, including interest. Spending 1% of GDP more without new revenue makes the balance 1 point worse and, other things equal, adds about 1 point of GDP to debt each year. The working below shows the new balance when the figures are live.':
    'El saldo global es ingresos menos gastos, intereses incluidos. Gastar un 1% del PIB más sin nuevos ingresos empeora el saldo en 1 punto y, con lo demás igual, añade cerca de 1 punto del PIB a la deuda cada año. El cálculo de abajo muestra el nuevo saldo cuando las cifras están en vivo.',
  'Would the plan be paid for by borrowing, higher taxes or cuts elsewhere?': '¿Se pagaría el plan con deuda, con más impuestos o con recortes en otras partidas?',
  'Start a policy review': 'Inicie una revisión de políticas',
  'In Policy reviews, choose the country and write the goal, for example "spend 1% of GDP more on schools without raising debt above its current level". The review sets out options, what each would cost, who would pay, and how each could fail, and checks the result after 12 and 24 months.':
    'En Revisiones de políticas, elija el país y escriba el objetivo, por ejemplo "gastar un 1% del PIB más en escuelas sin elevar la deuda por encima de su nivel actual". La revisión plantea opciones, lo que costaría cada una, quién pagaría y cómo podría fallar cada una, y comprueba el resultado a los 12 y 24 meses.',
  'Reports > Memos and notes > Policy reviews': 'Informes > Memorandos y notas > Revisiones de políticas',
  'Which option would you choose, and who bears its cost?': '¿Qué opción elegiría y quién soporta su coste?',
  'Weigh who pays': 'Valore quién paga',
  'Tax revenue and inequality show how much room there is to raise taxes and who would feel it. Interest already paid shows how much of today’s revenue is spoken for.':
    'Los ingresos tributarios y la desigualdad muestran cuánto margen hay para subir impuestos y a quién afectaría. Los intereses que ya se pagan muestran qué parte de los ingresos actuales está comprometida.',
  'Is there room to raise revenue, or would the plan need borrowing?': '¿Hay margen para aumentar los ingresos, o el plan necesitaría deuda?',
  'The draft below holds the question, the figures with their sources and years, the working, and space for your own answers. Copy or download it, then write your conclusion in your own words. Policy reviews can also write a memo from the review itself.':
    'El borrador de abajo contiene la pregunta, las cifras con sus fuentes y años, el cálculo y espacio para sus propias respuestas. Cópielo o descárguelo y escriba su conclusión con sus propias palabras. Revisiones de políticas también puede redactar un memorando a partir de la propia revisión.',
  // Working and memo
  'Missing: no live figure is saved for this country yet (Menu > Data health shows why).':
    'Falta: todavía no hay ninguna cifra en vivo guardada para este país (Menú > Estado de los datos muestra el motivo).',
  'Not worked out: it needs {list}, which read Missing.': 'No calculado: necesita {list}, que figuran como Falta.',
  'Nominal growth': 'Crecimiento nominal',
  'Primary balance that holds debt steady': 'Saldo primario que mantiene estable la deuda',
  'Gap to the actual primary balance': 'Diferencia con el saldo primario actual',
  'Reserves against the three-month line': 'Reservas frente al umbral de tres meses',
  'Overall balance with the plan': 'Saldo global con el plan',
  'Debt after one year, if borrowed': 'Deuda al cabo de un año, si se financia con deuda',
  'points of GDP': 'puntos del PIB',
  months: 'meses',
  'Positive means the budget would need to improve by this much to hold debt steady.':
    'Un valor positivo indica cuánto tendría que mejorar el presupuesto para mantener estable la deuda.',
  'The inflation figure is for its IMF year, so the real rate today may differ.':
    'La cifra de inflación corresponde a su año del FMI, así que el tipo real actual puede ser distinto.',
  'Above the rule-of-thumb minimum.': 'Por encima del mínimo de la regla práctica.',
  'Below the rule-of-thumb minimum.': 'Por debajo del mínimo de la regla práctica.',
  'Before the effect of growth and inflation.': 'Antes del efecto del crecimiento y la inflación.',
  Question: 'Pregunta',
  Figures: 'Cifras',
  Working: 'Cálculo',
  'Your answers': 'Sus respuestas',
  'Your answer:': 'Su respuesta:',
  'Conclusion (in your own words):': 'Conclusión (con sus propias palabras):',
  'Figures as saved on this computer on {date}. Every figure names its source and year; none is built in.':
    'Cifras tal como estaban guardadas en este ordenador el {date}. Cada cifra indica su fuente y su año; ninguna viene incorporada.',
};
