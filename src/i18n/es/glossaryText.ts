/**
 * Spanish for the help the app gives at Key help and Full help: the "How to read this chart"
 * guides (src/data/chartGuides.ts), the plain-words panel introductions and the glossary
 * (src/data/glossary.ts), swapped at display time by translateText. docs/GLOSSARY.md stays English.
 */
export const GLOSSARY_ES: Record<string, string> = {
  // Chart guides
  'Time runs left to right; the line is the figure you picked, one point per published value, drawn exactly as it came out, with no gaps filled in. A break in the line means no figure was published for that period.':
    'El tiempo avanza de izquierda a derecha; la línea es la cifra que eligió, un punto por cada valor publicado, dibujada tal como salió, sin rellenar huecos. Un corte en la línea significa que no se publicó ninguna cifra para ese periodo.',
  "A long view shows whether today's level is unusual for this country. A figure far from its own past usually signals a change people feel, such as dearer loans, faster price rises or a weaker currency.":
    'Una visión larga muestra si el nivel de hoy es inusual para este país. Una cifra muy alejada de su propio pasado suele señalar un cambio que la gente nota, como préstamos más caros, precios que suben más rápido o una moneda más débil.',
  "The solid line is what has been published. Past the last published point, the middle line is the app's estimate, and the shaded bands show how uncertain it is: the narrow band should hold the outcome about half the time, the widest about nine times in ten. Where the IMF publishes its own projection it is drawn beside it.":
    'La línea continua es lo publicado. Después del último punto publicado, la línea central es la estimación de la app y las bandas sombreadas muestran su incertidumbre: la banda estrecha debería contener el resultado aproximadamente la mitad de las veces, y la más ancha unas nueve de cada diez. Donde el FMI publica su propia proyección, se dibuja al lado.',
  "Wide bands mean the outlook is genuinely unclear. Plans that depend on growth or inflation (wages, budgets, loan payments) should allow for the whole band, not just the middle line. These are the app's estimates, not advice.":
    'Unas bandas anchas significan que las perspectivas son realmente inciertas. Los planes que dependen del crecimiento o de la inflación (salarios, presupuestos, cuotas de préstamos) deberían contemplar toda la banda, no solo la línea central. Son estimaciones de la app, no consejos.',
  'Each dot is a country. Further right means the economy is picking up (its OECD leading indicator, an early-warning gauge of activity, has risen over six months); further up means inflation has been rising over three months. The four corners are four different situations.':
    'Cada punto es un país. Más a la derecha significa que la economía se está acelerando (su indicador adelantado de la OCDE, un aviso temprano de la actividad, ha subido en seis meses); más arriba significa que la inflación ha ido subiendo en tres meses. Las cuatro esquinas son cuatro situaciones distintas.',
  'Top right (picking up, prices rising): central banks tend to keep rates high or raise them, so loans stay dear. Bottom left (slowing, prices easing): rate cuts become more likely. Top left (slowing but prices rising) is the hardest case for policy and for households, whose incomes are squeezed.':
    'Arriba a la derecha (aceleración, precios al alza): los bancos centrales tienden a mantener altos los tipos o a subirlos, así que los préstamos siguen caros. Abajo a la izquierda (frenazo, precios que se moderan): las bajadas de tipos se vuelven más probables. Arriba a la izquierda (frenazo pero precios al alza) es el caso más difícil para la política y para los hogares, cuyos ingresos se ven presionados.',
  "Each line is government debt as a share of the economy, year by year: the IMF's own path, a baseline built on today's figures, and stated shocks (lower growth, higher interest rates, a weaker budget, all together). Lines that climb show debt growing faster than the economy.":
    'Cada línea es la deuda pública como proporción de la economía, año a año: la trayectoria del propio FMI, un escenario base construido con las cifras de hoy y choques declarados (menor crecimiento, tipos de interés más altos, un presupuesto más débil, todos juntos). Las líneas que suben muestran una deuda que crece más rápido que la economía.',
  'Debt that keeps rising means more of each year\'s taxes go on interest instead of schools, health or investment, and the government has less room in a crisis. A big gap between the baseline and the shocks means the path is fragile. This is a "what if" exercise, not a forecast.':
    'Una deuda que no deja de subir significa que una parte mayor de los impuestos de cada año se va en intereses en lugar de escuelas, sanidad o inversión, y que el gobierno tiene menos margen en una crisis. Una gran distancia entre el escenario base y los choques significa que la trayectoria es frágil. Es un ejercicio de "qué pasaría si", no un pronóstico.',
  'Above the zero line, the economy is producing more than its trend (running hot); below it, less (spare capacity). The line is the middle of three standard estimates and the band shows their spread. Dashed years are based on IMF projections, not outturns.':
    'Por encima de la línea del cero, la economía produce más que su tendencia (está recalentada); por debajo, menos (capacidad ociosa). La línea es la central de tres estimaciones estándar y la banda muestra su dispersión. Los años discontinuos se basan en proyecciones del FMI, no en datos observados.',
  'When the economy runs hot, jobs are easier to find but prices tend to rise faster and the central bank may raise rates. When there is spare capacity, unemployment tends to be higher and inflation lower, which leaves room for rate cuts. The gap cannot be measured directly, so treat it as a rough guide.':
    'Cuando la economía está recalentada, es más fácil encontrar empleo, pero los precios tienden a subir más rápido y el banco central puede subir los tipos. Cuando hay capacidad ociosa, el desempleo tiende a ser mayor y la inflación menor, lo que deja margen para bajar los tipos. La brecha no se puede medir directamente, así que tómela como una guía aproximada.',
  "The line shows how inflation has moved, on average, in the months after the policy rate went up by one percentage point, in this country's own history; the shaded band is where the true average could lie (90% band). Month zero is the rate change.":
    'La línea muestra cómo se ha movido la inflación, en promedio, en los meses posteriores a una subida de un punto porcentual del tipo de política, en la propia historia de este país; la banda sombreada es donde podría estar el promedio real (banda del 90%). El mes cero es el cambio de tipo.',
  'It gives a sense of how long it has taken here for higher interest rates to coincide with slower price rises in shops. It shows what tended to happen alongside rate changes, not proof that the rate change caused it.':
    'Da una idea de cuánto ha tardado aquí en coincidir una subida de los tipos de interés con subidas de precios más lentas en las tiendas. Muestra lo que tendía a ocurrir junto a los cambios de tipos, no prueba que el cambio de tipo lo causara.',
  "One line is the currency's real value against its trading partners (after allowing for inflation); the other is the level its economic fundamentals (terms of trade, productivity, foreign assets) have usually gone with. When the first is above the second the currency looks dear; below, cheap.":
    'Una línea es el valor real de la moneda frente a sus socios comerciales (descontada la inflación); la otra es el nivel con el que suelen ir sus fundamentos económicos (términos de intercambio, productividad, activos exteriores). Cuando la primera está por encima de la segunda, la moneda parece cara; por debajo, barata.',
  'A dear currency makes imports and foreign holidays cheaper but makes it harder for local firms to sell abroad. A cheap one helps exporters but raises the price of imported food, fuel and goods. A currency can stay far from this yardstick for years.':
    'Una moneda cara abarata las importaciones y las vacaciones en el extranjero, pero dificulta que las empresas locales vendan fuera. Una barata ayuda a los exportadores, pero encarece los alimentos, el combustible y los bienes importados. Una moneda puede mantenerse lejos de esta referencia durante años.',
  "The line shows the currency's average move against the US dollar over the days around rate changes, with day zero the decision. Up means the local currency got weaker. One line is the average after rate rises, the other after cuts; the buttons above switch between this country's central bank and the US Federal Reserve.":
    'La línea muestra el movimiento medio de la moneda frente al dólar de EE. UU. en los días en torno a los cambios de tipos, con el día cero como la decisión. Arriba significa que la moneda local se debilitó. Una línea es el promedio tras las subidas de tipos y la otra tras las bajadas; los botones de arriba cambian entre el banco central de este país y la Reserva Federal de EE. UU.',
  'A weaker currency raises the local price of imports within weeks, from fuel to phones. If the currency has often fallen after US rate rises, households and firms with dollar debts or dollar costs are exposed to Fed decisions. Many decisions were expected, so moves can be small.':
    'Una moneda más débil encarece en pocas semanas el precio local de las importaciones, del combustible a los teléfonos. Si la moneda ha caído a menudo tras las subidas de tipos en EE. UU., los hogares y las empresas con deudas o costes en dólares están expuestos a las decisiones de la Reserva Federal. Muchas decisiones eran esperadas, así que los movimientos pueden ser pequeños.',
  "Time runs left to right, one point a month. The two lines show protests and violence as a share of all events reported about the country in the news that month, so changes in how much news there is overall do not move it. Months listed as spikes stand well above the country's own last two years.":
    'El tiempo avanza de izquierda a derecha, un punto por mes. Las dos líneas muestran las protestas y la violencia como proporción de todos los eventos sobre el país recogidos en las noticias ese mes, así que los cambios en la cantidad total de noticias no la mueven. Los meses señalados como picos están muy por encima de los dos últimos años del propio país.',
  'A rising share of unrest can come before strikes, disruption to business, policy U-turns or, rarely, wider conflict. It counts news reports, not verified events, so read it alongside other figures.':
    'Una proporción creciente de disturbios puede preceder a huelgas, trastornos para las empresas, giros de política o, rara vez, a un conflicto más amplio. Cuenta noticias, no eventos verificados, así que léala junto a otras cifras.',
  'The lines are the figures your question named, each from its source and dated. The tests listed under the chart say, in words, whether the lines have moved together or one has tended to lead the other, and how sure that reading is.':
    'Las líneas son las cifras que nombró su pregunta, cada una con su fuente y su fecha. Las pruebas que aparecen bajo el gráfico dicen, con palabras, si las líneas se han movido juntas o si una ha tendido a adelantarse a la otra, y qué grado de seguridad tiene esa lectura.',
  'Two lines moving together does not mean one causes the other. Use the chart to see the pattern, and the tests to see whether it is more than chance.':
    'Que dos líneas se muevan juntas no significa que una cause la otra. Use el gráfico para ver el patrón y las pruebas para ver si es algo más que casualidad.',

  // Panel introductions
  'How fast the economy is growing, how fast prices are rising, and how many people are out of work. Together they show whether ordinary living standards are improving and whether the central bank is likely to act.':
    'A qué ritmo crece la economía, a qué ritmo suben los precios y cuánta gente está sin trabajo. Juntas, estas cifras muestran si mejora el nivel de vida de la gente y si es probable que el banco central actúe.',
  'What the central bank is doing with interest rates, how that compares with inflation, and when it next decides. A rate well above inflation holds the economy back to cool prices; a rate below inflation gives it a push.':
    'Qué hace el banco central con los tipos de interés, cómo se compara con la inflación y cuándo decide de nuevo. Un tipo muy por encima de la inflación frena la economía para enfriar los precios; un tipo por debajo de la inflación le da un impulso.',
  "The government's budget and how much it owes. A deficit adds to debt; interest payments take money away from other spending. The question is whether the debt can keep being paid without a crisis.":
    'El presupuesto del gobierno y cuánto debe. Un déficit aumenta la deuda; los pagos de intereses restan dinero a otros gastos. La cuestión es si la deuda puede seguir pagándose sin una crisis.',
  'How the country pays its way with the rest of the world: whether it earns more abroad than it spends, how much foreign currency the central bank holds for emergencies, and how much the country owes abroad.':
    'Cómo se financia el país frente al resto del mundo: si gana en el exterior más de lo que gasta, cuántas divisas guarda el banco central para emergencias y cuánto debe el país al exterior.',
  'Whether the country can keep paying what it owes to the rest of the world: what it earns abroad, its savings in foreign currency, and its debts to foreigners.':
    'Si el país puede seguir pagando lo que debe al resto del mundo: lo que gana en el exterior, sus ahorros en divisas y sus deudas con extranjeros.',
  'Whether the government can borrow from investors at a price it can bear, judged from what markets charge it now.':
    'Si el gobierno puede pedir prestado a los inversores a un precio que pueda soportar, a juzgar por lo que le cobran ahora los mercados.',
  'How much debt owed to foreigners falls due soon and must be repaid or borrowed again. Large amounts falling due when markets are nervous are a classic route into a debt crisis.':
    'Cuánta deuda con extranjeros vence pronto y debe devolverse o refinanciarse. Grandes vencimientos cuando los mercados están nerviosos son una vía clásica hacia una crisis de deuda.',
  'Official dates in the next 60 days that could move markets, such as rate decisions and inflation releases. Governments selling bonds usually avoid the days around them.':
    'Fechas oficiales de los próximos 60 días que podrían mover los mercados, como decisiones de tipos y datos de inflación. Los gobiernos que venden bonos suelen evitar los días cercanos.',
  'What similar governments pay to borrow for ten years. A country paying much more than its peers is seen by markets as riskier, or has higher inflation.':
    'Lo que pagan gobiernos similares por endeudarse a diez años. Un país que paga mucho más que sus pares es visto por los mercados como más arriesgado, o tiene una inflación más alta.',
  "Where government debt stands, what drives it up or down, and the budget balance that would hold it steady at today's interest rates and growth.":
    'Dónde está la deuda pública, qué la hace subir o bajar y el saldo presupuestario que la mantendría estable con los tipos de interés y el crecimiento actuales.',
  'A five-year "what if" for government debt: first with today\'s figures held still, then with standard shocks. It shows how fragile the path is, not what will happen.':
    'Un "qué pasaría si" a cinco años para la deuda pública: primero con las cifras de hoy fijas y luego con choques estándar. Muestra lo frágil que es la trayectoria, no lo que va a pasar.',
  "Figures from the International Monetary Fund's World Economic Outlook and Fiscal Monitor, published about twice a year. Recent years may be IMF estimates or forecasts.":
    'Cifras de las Perspectivas de la Economía Mundial y del Monitor Fiscal del Fondo Monetario Internacional, publicadas unas dos veces al año. Los años recientes pueden ser estimaciones o pronósticos del FMI.',
  "Figures from the World Bank's development indicators and debt statistics, usually yearly and published with a lag.":
    'Cifras de los indicadores de desarrollo y las estadísticas de deuda del Banco Mundial, normalmente anuales y publicadas con retraso.',
  'Prices set in financial markets every day: what the government pays to borrow, the central bank rate and the exchange rate.':
    'Precios que fijan cada día los mercados financieros: lo que paga el gobierno por endeudarse, el tipo del banco central y el tipo de cambio.',
  'A reading of the mood of worldwide news coverage about the country.': 'Una lectura del tono de la cobertura informativa mundial sobre el país.',
  'Recorded organised violence and deaths, from the files you have downloaded from the Uppsala Conflict Data Program.':
    'Violencia organizada y muertes registradas, según los archivos que descargó del Programa de Datos sobre Conflictos de Uppsala.',
  // Glossary page headings (Menu > User manual > Glossary)
  Glossary: 'Glosario',
  'Plain-language explanations of the terms and figures EconQuest shows. Each entry says what the thing is, why it matters, and how to read it. The same text appears in the app under "What is this?" next to each figure, and in Menu > User manual > Glossary.':
    'Explicaciones en lenguaje sencillo de los términos y cifras que muestra EconQuest. Cada entrada dice qué es, por qué importa y cómo leerlo. El mismo texto aparece en la app bajo "¿Qué es esto?" junto a cada cifra, y en Menú > Manual de usuario > Glosario.',
  'Nothing here is a figure for any country. Where the app has no live or official value it shows "Missing" with the reason, never a number from this page.':
    'Nada de lo que aparece aquí es una cifra de ningún país. Cuando la app no tiene un valor en vivo u oficial, muestra "Falta" con el motivo, nunca un número de esta página.',
  '_Written from src/data/glossary.ts by `npm run docs:glossary`. Edit that file, not this one._':
    '_Traducción mostrada por la app del glosario en inglés (src/data/glossary.ts). La versión de referencia es la inglesa._',
  'Why it matters.': 'Por qué importa.',
  'How to read it.': 'Cómo leerlo.',
  'Limits.': 'Límites.',
  // Glossary groups and entries
  "Growth and jobs":
    "Crecimiento y empleo",
  "Prices and inflation":
    "Precios e inflación",
  "Central banks and interest rates":
    "Bancos centrales y tipos de interés",
  "Government budget and debt":
    "Presupuesto y deuda públicos",
  "Trade, the currency and money from abroad":
    "Comercio, la moneda y el dinero del exterior",
  "Financial markets":
    "Mercados financieros",
  "Politics, conflict and news":
    "Política, conflictos y noticias",
  "How the app tests and labels things":
    "Cómo prueba y etiqueta las cosas la app",
  "GDP (gross domestic product)":
    "PIB (producto interior bruto)",
  "The value of everything a country produces in a year: goods, services and buildings, added up in money terms.":
    "El valor de todo lo que produce un país en un año: bienes, servicios y edificios, sumado en dinero.",
  "It is the standard measure of the size of an economy. Many other figures (debt, the budget, the current account) are shown as a share of GDP so countries of different sizes can be compared.":
    "Es la medida estándar del tamaño de una economía. Muchas otras cifras (deuda, presupuesto, cuenta corriente) se muestran como proporción del PIB para poder comparar países de distinto tamaño.",
  "GDP measures output, not well-being. It says nothing about how income is shared, and it is revised for years after first release.":
    "El PIB mide la producción, no el bienestar. No dice nada de cómo se reparte la renta y se revisa durante años después de su primera publicación.",
  "Real GDP growth":
    "Crecimiento del PIB real",
  "How much more (or less) the economy produced this year than last year, after removing the effect of rising prices.":
    "Cuánto más (o menos) produjo la economía este año que el anterior, descontado el efecto de la subida de precios.",
  "Growth drives jobs, wages and tax revenue. When growth is strong a government can carry more debt; when it falls, unemployment usually rises and budgets weaken.":
    "El crecimiento impulsa el empleo, los salarios y la recaudación. Cuando el crecimiento es fuerte, un gobierno puede soportar más deuda; cuando cae, el desempleo suele subir y los presupuestos se debilitan.",
  "Above zero means the economy grew; below zero means it shrank. Two quarters of shrinking in a row are often called a recession. For fast-growing emerging economies, 4 to 6% a year is common; for rich economies, 1 to 2% is normal.":
    "Por encima de cero significa que la economía creció; por debajo, que se contrajo. Dos trimestres seguidos de contracción suelen llamarse recesión. En economías emergentes de crecimiento rápido es habitual un 4 a 6% anual; en economías ricas, lo normal es un 1 a 2%.",
  "The app shows the IMF World Economic Outlook figure, which is a yearly number published twice a year and partly a forecast for the current year.":
    "La app muestra la cifra de las Perspectivas de la Economía Mundial del FMI, un dato anual que se publica dos veces al año y que en parte es un pronóstico para el año en curso.",
  "Unemployment rate":
    "Tasa de desempleo",
  "The share of people who want a job and are looking for one but do not have one.":
    "La proporción de personas que quieren un empleo y lo buscan, pero no lo tienen.",
  "It is the most direct sign of hardship in the economy. Rising unemployment cuts spending, lowers tax revenue and often raises political pressure on the government.":
    "Es la señal más directa de dificultades en la economía. Un desempleo creciente recorta el gasto, reduce la recaudación y a menudo aumenta la presión política sobre el gobierno.",
  "Higher is worse. What counts as normal differs a lot by country, so compare a country with its own past rather than with others.":
    "Más alto es peor. Lo que se considera normal varía mucho según el país, así que compare un país con su propio pasado más que con otros.",
  "People who have given up looking, or work informally, are not counted, so in many emerging economies the rate understates how many people lack decent work.":
    "No se cuenta a quienes han dejado de buscar ni a quienes trabajan en la economía informal, así que en muchas economías emergentes la tasa subestima cuánta gente carece de un trabajo digno.",
  "Output gap":
    "Brecha del producto",
  "The difference between what the economy is producing and what it could produce over time without pushing up inflation, as a share of that potential.":
    "La diferencia entre lo que produce la economía y lo que podría producir de forma sostenida sin presionar al alza la inflación, como proporción de ese potencial.",
  "A positive gap means the economy is running hot (firms and workers are stretched, prices tend to rise faster). A negative gap means spare capacity (idle workers and machines, inflation tends to ease).":
    "Una brecha positiva significa que la economía está recalentada (empresas y trabajadores al límite, los precios tienden a subir más rápido). Una brecha negativa significa capacidad ociosa (trabajadores y máquinas parados, la inflación tiende a moderarse).",
  "Above zero: running above its sustainable pace. Below zero: slack. It feeds the policy rule check (Taylor rule).":
    "Por encima de cero: por encima de su ritmo sostenible. Por debajo de cero: holgura. Alimenta la comprobación de la regla de política (regla de Taylor).",
  "Potential output cannot be observed, only estimated, so the gap is uncertain and is often revised a lot. The app uses the IMF estimate and says so.":
    "El producto potencial no se puede observar, solo estimar, así que la brecha es incierta y a menudo se revisa mucho. La app usa la estimación del FMI y lo indica.",
  "Nowcast":
    "Estimación en tiempo real (nowcast)",
  "An estimate of growth for the current quarter, made from monthly figures that come out before the official GDP number.":
    "Una estimación del crecimiento del trimestre en curso, hecha con cifras mensuales que salen antes que el dato oficial del PIB.",
  "Official GDP arrives weeks or months after the quarter ends. A nowcast gives an early read.":
    "El PIB oficial llega semanas o meses después de que acabe el trimestre. Un nowcast da una lectura temprana.",
  "It is a model estimate, labelled \"model\" in the app, and its track record is shown under Menu > Models & validation.":
    "Es una estimación de modelo, marcada como \"modelo\" en la app, y su historial se muestra en Menú > Modelos y validación.",
  "CPI inflation":
    "Inflación del IPC",
  "How fast the prices people pay for a typical basket of goods and services (food, rent, fuel, transport and so on) are rising, compared with a year earlier.":
    "A qué ritmo suben los precios que paga la gente por una cesta típica de bienes y servicios (alimentos, alquiler, combustible, transporte, etc.), frente a un año antes.",
  "Inflation eats into wages and savings. It hits poorer households hardest because more of their income goes on food and energy. Central banks raise interest rates to bring it down.":
    "La inflación merma los salarios y los ahorros. Golpea más a los hogares pobres, porque destinan una mayor parte de sus ingresos a alimentos y energía. Los bancos centrales suben los tipos de interés para bajarla.",
  "Higher means prices are rising faster. Most central banks aim for about 2 to 4% a year. Below zero (deflation) is also a warning sign, because it can mean weak demand.":
    "Más alta significa que los precios suben más rápido. La mayoría de los bancos centrales apuntan a un 2 a 4% anual. Por debajo de cero (deflación) también es una señal de alarma, porque puede indicar una demanda débil.",
  "The headline figure includes volatile food and energy prices, so a single month can jump for reasons that fade.":
    "La cifra general incluye precios volátiles de alimentos y energía, así que un solo mes puede saltar por razones que luego se desvanecen.",
  "Inflation target":
    "Meta de inflación",
  "The inflation rate a central bank has publicly promised to aim for, for example 3% with a band of 1 point either side.":
    "La tasa de inflación que un banco central se ha comprometido públicamente a buscar, por ejemplo un 3% con una banda de 1 punto arriba o abajo.",
  "It is the yardstick for judging whether inflation is a problem and whether interest rates are likely to go up or down.":
    "Es la referencia para juzgar si la inflación es un problema y si es probable que los tipos de interés suban o bajen.",
  "Inflation expectations":
    "Expectativas de inflación",
  "What households, firms, forecasters or markets think inflation will be in the future, from surveys or from bond prices.":
    "Lo que hogares, empresas, analistas o mercados creen que será la inflación en el futuro, según encuestas o precios de bonos.",
  "If people expect high inflation they ask for higher wages and set higher prices, which can make inflation stick. Central banks watch expectations closely.":
    "Si la gente espera una inflación alta, pide salarios más altos y fija precios más altos, lo que puede hacer que la inflación se enquiste. Los bancos centrales vigilan de cerca las expectativas.",
  "Expectations close to the target mean people trust the central bank. Expectations drifting above the target are a warning sign.":
    "Unas expectativas cercanas a la meta significan que la gente confía en el banco central. Unas expectativas que se alejan por encima de la meta son una señal de alarma.",
  "CPI release":
    "Publicación del IPC",
  "The day the national statistics office publishes the latest inflation figure.":
    "El día en que la oficina nacional de estadística publica la última cifra de inflación.",
  "A surprise in either direction can move interest-rate expectations, the currency and bond prices on the day.":
    "Una sorpresa en cualquier sentido puede mover ese día las expectativas de tipos, la moneda y los precios de los bonos.",
  "Policy rate":
    "Tipo de política monetaria",
  "The interest rate the central bank sets. It is the anchor for what banks charge each other overnight, and through that for loans, mortgages and savings rates across the economy.":
    "El tipo de interés que fija el banco central. Es el ancla de lo que se cobran los bancos entre sí a un día y, a través de ello, de los préstamos, las hipotecas y los tipos de ahorro en toda la economía.",
  "Raising it makes borrowing dearer, which slows spending and inflation and tends to support the currency. Cutting it does the opposite.":
    "Subirlo encarece el crédito, lo que frena el gasto y la inflación y tiende a sostener la moneda. Bajarlo hace lo contrario.",
  "Compare it with inflation: a rate well above inflation is tight (holding the economy back), a rate below inflation is loose (supporting it).":
    "Compárelo con la inflación: un tipo muy por encima de la inflación es restrictivo (frena la economía); un tipo por debajo de la inflación es laxo (la sostiene).",
  "Real interest rate":
    "Tipo de interés real",
  "An interest rate minus inflation. It shows what borrowing really costs, or what saving really earns, once rising prices are taken into account.":
    "Un tipo de interés menos la inflación. Muestra lo que cuesta realmente endeudarse, o lo que rinde realmente ahorrar, una vez tenida en cuenta la subida de precios.",
  "It is a better guide to how tight policy is than the headline rate. A 10% rate with 12% inflation is still cheap money; a 5% rate with 1% inflation is expensive.":
    "Es mejor guía del grado de restricción de la política que el tipo nominal. Un tipo del 10% con una inflación del 12% sigue siendo dinero barato; un tipo del 5% con una inflación del 1% es caro.",
  "Positive and high: tight, borrowing is costly, the currency tends to be supported. Negative: loose, savers lose money in real terms.":
    "Positivo y alto: restrictivo, endeudarse es caro, la moneda tiende a sostenerse. Negativo: laxo, los ahorradores pierden dinero en términos reales.",
  "The app subtracts the latest inflation figure, which looks backwards; markets care about expected inflation, which is not always available. The row is labelled \"model\" because it is calculated here.":
    "La app resta la última cifra de inflación, que mira hacia atrás; a los mercados les importa la inflación esperada, que no siempre está disponible. La fila está marcada como \"modelo\" porque se calcula aquí.",
  "Taylor rule (policy rule check)":
    "Regla de Taylor (comprobación de la regla de política)",
  "A simple formula, proposed by the economist John Taylor in 1993, for where a central bank's interest rate \"should\" be given inflation, the inflation target and the output gap.":
    "Una fórmula sencilla, propuesta por el economista John Taylor en 1993, de dónde \"debería\" estar el tipo de interés de un banco central según la inflación, la meta de inflación y la brecha del producto.",
  "Comparing the actual rate with the formula gives a quick, transparent reading of whether policy looks tight, neutral or loose.":
    "Comparar el tipo real con la fórmula da una lectura rápida y transparente de si la política parece restrictiva, neutral o laxa.",
  "Actual rate well above the rule: tight. Well below: loose. Within the band: neutral.":
    "Tipo real muy por encima de la regla: restrictivo. Muy por debajo: laxo. Dentro de la banda: neutral.",
  "It is a rule of thumb, not a forecast of what the central bank will do. Central banks weigh many things the formula leaves out, such as the currency or financial stability. The app labels it \"not validated\".":
    "Es una regla práctica, no un pronóstico de lo que hará el banco central. Los bancos centrales sopesan muchas cosas que la fórmula deja fuera, como la moneda o la estabilidad financiera. La app la marca como \"no validada\".",
  "Rate decision":
    "Decisión de tipos",
  "A scheduled meeting where the central bank announces whether it is raising, cutting or holding its policy rate.":
    "Una reunión programada en la que el banco central anuncia si sube, baja o mantiene su tipo de política.",
  "Markets often move sharply on the day, especially when the decision differs from what was expected.":
    "Los mercados suelen moverse con fuerza ese día, sobre todo cuando la decisión difiere de lo esperado.",
  "Bond yield (10-year government yield)":
    "Rendimiento de los bonos (rendimiento del bono del Estado a 10 años)",
  "The yearly return an investor gets from lending to the government for ten years at today's market price. It is the market interest rate on government debt.":
    "La rentabilidad anual que obtiene un inversor al prestar al gobierno a diez años al precio de mercado de hoy. Es el tipo de interés de mercado de la deuda pública.",
  "It is what new borrowing costs the government, and it sets the floor for many loan and mortgage rates in the country. When investors worry about a country, they demand a higher yield.":
    "Es lo que le cuesta al gobierno endeudarse de nuevo y marca el suelo de muchos tipos de préstamos e hipotecas del país. Cuando los inversores se preocupan por un país, exigen un rendimiento más alto.",
  "Higher means borrowing is dearer and, often, that investors see more risk or expect more inflation. Compare it with the country's own history and with similar countries.":
    "Más alto significa que endeudarse es más caro y, a menudo, que los inversores ven más riesgo o esperan más inflación. Compárelo con la propia historia del país y con países similares.",
  "A local-currency yield mixes three things: expected inflation, expected policy rates, and a premium for risk. A high yield is not by itself a sign of trouble in a high-inflation country.":
    "Un rendimiento en moneda local mezcla tres cosas: la inflación esperada, los tipos de política esperados y una prima de riesgo. Un rendimiento alto no es por sí solo señal de problemas en un país con inflación alta.",
  "Yield curve and 2s10s slope":
    "Curva de rendimientos y pendiente 2s10s",
  "The line joining interest rates on government bonds of different lengths. The \"2s10s\" slope is the 10-year yield minus the 2-year yield.":
    "La línea que une los tipos de interés de bonos del Estado de distintos plazos. La pendiente \"2s10s\" es el rendimiento a 10 años menos el rendimiento a 2 años.",
  "Normally longer loans pay more, so the curve slopes up. When short rates rise above long rates (an \"inverted\" curve), it has often come before a slowdown, because markets expect rates to be cut later.":
    "Normalmente los préstamos más largos pagan más, así que la curva tiene pendiente positiva. Cuando los tipos cortos superan a los largos (curva \"invertida\"), a menudo ha precedido a un frenazo, porque los mercados esperan bajadas de tipos más adelante.",
  "Positive: normal. Near zero: flat. Negative: inverted.":
    "Positiva: normal. Cerca de cero: plana. Negativa: invertida.",
  "Basis point (bp, bps)":
    "Punto básico (pb)",
  "One hundredth of a percentage point. 100 basis points = 1 percentage point.":
    "Una centésima de punto porcentual. 100 puntos básicos = 1 punto porcentual.",
  "Spreads and small rate changes are quoted in basis points to avoid long decimals: \"the spread rose 25 bps\" means it rose by 0.25 percentage points.":
    "Los diferenciales y los pequeños cambios de tipos se expresan en puntos básicos para evitar decimales largos: \"el diferencial subió 25 pb\" significa que subió 0,25 puntos porcentuales.",
  "Percentage point (pt, pts)":
    "Punto porcentual (pt, pts)",
  "The plain difference between two percentages. Going from 4% to 6% is a rise of 2 percentage points (and a 50% rise in relative terms).":
    "La diferencia simple entre dos porcentajes. Pasar del 4% al 6% es una subida de 2 puntos porcentuales (y una subida del 50% en términos relativos).",
  "The app writes \"pts\" for differences so they are not confused with percentage changes.":
    "La app escribe \"pts\" para las diferencias, para que no se confundan con variaciones porcentuales.",
  "Fed balance sheet and net liquidity":
    "Balance de la Reserva Federal y liquidez neta",
  "Everything the US Federal Reserve owns (mainly government bonds) and owes (mainly bank reserves and the US Treasury's cash account). \"Net liquidity\" is total assets minus the Treasury's account and the money parked at the Fed overnight (reverse repos).":
    "Todo lo que posee la Reserva Federal de EE. UU. (sobre todo bonos del Estado) y lo que debe (sobre todo reservas bancarias y la cuenta de efectivo del Tesoro de EE. UU.). La \"liquidez neta\" son los activos totales menos la cuenta del Tesoro y el dinero depositado en la Reserva Federal a un día (repos inversas).",
  "When the Fed buys bonds it adds money to the financial system; when it shrinks its holdings it drains money. Because the dollar is the world's main currency, these changes can affect borrowing conditions everywhere, including emerging markets.":
    "Cuando la Reserva Federal compra bonos, añade dinero al sistema financiero; cuando reduce sus tenencias, lo retira. Como el dólar es la principal moneda del mundo, estos cambios pueden afectar a las condiciones de crédito en todas partes, también en los mercados emergentes.",
  "Rising net liquidity: more money in the system. Falling: less.":
    "Liquidez neta al alza: más dinero en el sistema. A la baja: menos.",
  "Net liquidity is a popular market shorthand, not an official Fed measure. The app shows it only when all its parts are for the same Wednesday.":
    "La liquidez neta es una abreviatura popular del mercado, no una medida oficial de la Reserva Federal. La app solo la muestra cuando todas sus partes son del mismo miércoles.",
  "Government debt to GDP":
    "Deuda pública sobre el PIB",
  "Everything the government owes, divided by the size of the economy in a year.":
    "Todo lo que debe el gobierno, dividido por el tamaño de la economía en un año.",
  "It shows how heavy the debt is compared with the income the country can tax to repay it. A higher ratio leaves less room to respond to a crisis and can make lenders nervous.":
    "Muestra lo pesada que es la deuda frente a la renta que el país puede gravar para devolverla. Un ratio más alto deja menos margen para responder a una crisis y puede inquietar a los prestamistas.",
  "Higher is a heavier burden. The IMF looks more closely at emerging economies above about 70% of GDP, but many rich countries carry more than 100% without trouble, because who lends, in which currency and at what rate matters as much as the level.":
    "Más alto es una carga más pesada. El FMI mira con más atención a las economías emergentes por encima de un 70% del PIB, pero muchos países ricos soportan más del 100% sin problemas, porque quién presta, en qué moneda y a qué tipo importa tanto como el nivel.",
  "The IMF figure is general government gross debt: it does not subtract the government's own savings, and it may not include debts of state companies.":
    "La cifra del FMI es la deuda bruta de las administraciones públicas: no resta los ahorros propios del gobierno y puede no incluir las deudas de las empresas públicas.",
  "Primary balance":
    "Saldo primario",
  "The government's budget result before interest payments on its debt: revenue minus spending, leaving interest out.":
    "El resultado presupuestario del gobierno antes de los pagos de intereses de su deuda: ingresos menos gastos, sin contar los intereses.",
  "It shows whether the government's day-to-day policies (taxes and spending) are adding to the debt or paying it down, separate from the cost of past borrowing.":
    "Muestra si las políticas cotidianas del gobierno (impuestos y gasto) aumentan la deuda o la reducen, al margen del coste del endeudamiento pasado.",
  "A surplus (positive) means taxes cover spending other than interest. A deficit (negative) means the government borrows even before paying interest.":
    "Un superávit (positivo) significa que los impuestos cubren el gasto distinto de los intereses. Un déficit (negativo) significa que el gobierno se endeuda incluso antes de pagar intereses.",
  "Overall budget balance":
    "Saldo presupuestario total",
  "The government's full budget result in a year: all revenue minus all spending, interest included.":
    "El resultado presupuestario completo del gobierno en un año: todos los ingresos menos todos los gastos, intereses incluidos.",
  "A deficit has to be borrowed, so it adds to the debt. A surplus can pay debt down.":
    "Un déficit hay que financiarlo con deuda, así que aumenta la deuda. Un superávit puede reducirla.",
  "Negative is a deficit. Deficits of a few percent of GDP are common; persistent large deficits push debt up quickly.":
    "Negativo es un déficit. Los déficits de unos pocos puntos del PIB son habituales; los déficits grandes y persistentes hacen subir la deuda rápidamente.",
  "Revenue and expenditure":
    "Ingresos y gastos",
  "Revenue is what the government takes in (taxes, fees, grants, income from state assets). Expenditure is what it spends (wages, pensions, investment, subsidies, interest).":
    "Los ingresos son lo que recauda el gobierno (impuestos, tasas, donaciones, rentas de activos públicos). Los gastos son lo que gasta (salarios, pensiones, inversión, subsidios, intereses).",
  "Shown as a share of GDP, they reveal the size of the state and where a budget gap comes from.":
    "Expresados como proporción del PIB, revelan el tamaño del Estado y de dónde viene un desfase presupuestario.",
  "Net interest paid":
    "Intereses netos pagados",
  "How much of the economy's yearly output goes on interest on government debt, after interest the government earns. The app works it out as the primary balance minus the overall balance for the same year.":
    "Qué parte de la producción anual de la economía se va en intereses de la deuda pública, descontados los intereses que cobra el gobierno. La app la calcula como el saldo primario menos el saldo total del mismo año.",
  "Interest is money that cannot go on schools, hospitals or investment. When it climbs, budgets get squeezed and debt can start to feed on itself.":
    "Los intereses son dinero que no puede ir a escuelas, hospitales ni inversión. Cuando suben, los presupuestos se estrechan y la deuda puede empezar a alimentarse a sí misma.",
  "Higher is a heavier burden: a bigger slice of what the economy produces goes to lenders each year.":
    "Más alto es una carga más pesada: una porción mayor de lo que produce la economía va a los prestamistas cada año.",
  "Calculated here (labelled \"model\") and only shown when both IMF balances are for the same year.":
    "Se calcula aquí (marcado como \"modelo\") y solo se muestra cuando los dos saldos del FMI son del mismo año.",
  "Interest rate minus growth (r minus g)":
    "Tipo de interés menos crecimiento (r menos g)",
  "The real interest rate the government pays on its debt minus the real growth rate of the economy.":
    "El tipo de interés real que paga el gobierno por su deuda menos la tasa de crecimiento real de la economía.",
  "It decides whether debt grows on its own. If the interest rate is below growth, the debt ratio tends to fall even with a small deficit; if interest is above growth, the government must run a surplus just to stop the ratio rising.":
    "Decide si la deuda crece por sí sola. Si el tipo de interés está por debajo del crecimiento, el ratio de deuda tiende a bajar incluso con un pequeño déficit; si el interés está por encima del crecimiento, el gobierno necesita un superávit solo para que el ratio no suba.",
  "Negative helps; positive hurts, and the bigger the debt, the more it hurts.":
    "Negativo ayuda; positivo perjudica, y cuanto mayor es la deuda, más perjudica.",
  "The app approximates the interest rate from the 10-year yield and inflation, because the average rate actually paid on all government debt is not in a free feed.":
    "La app aproxima el tipo de interés con el rendimiento a 10 años y la inflación, porque el tipo medio que se paga realmente por toda la deuda pública no está en ninguna fuente gratuita.",
  "Balance that keeps debt stable":
    "Saldo que mantiene estable la deuda",
  "The primary balance (budget before interest) the government would need each year to keep debt from rising as a share of GDP, given today's interest rate, growth and debt level.":
    "El saldo primario (presupuesto antes de intereses) que el gobierno necesitaría cada año para que la deuda no suba como proporción del PIB, dados el tipo de interés, el crecimiento y el nivel de deuda actuales.",
  "Comparing it with the actual primary balance shows how much the budget would have to change for debt to stop growing: the size of the adjustment.":
    "Compararlo con el saldo primario real muestra cuánto tendría que cambiar el presupuesto para que la deuda deje de crecer: el tamaño del ajuste.",
  "If the actual balance is below this figure, debt is on a rising path at today's rates.":
    "Si el saldo real está por debajo de esta cifra, la deuda va en una trayectoria ascendente con los tipos actuales.",
  "A simple textbook calculation (labelled \"model\"), not an IMF or World Bank assessment.":
    "Un cálculo sencillo de manual (marcado como \"modelo\"), no una evaluación del FMI ni del Banco Mundial.",
  "Debt sustainability and stress tests":
    "Sostenibilidad de la deuda y pruebas de estrés",
  "A check of whether the government can keep paying its debts without a crisis. The app projects debt five years ahead with today's figures held still, then again with standard shocks: lower growth, higher interest rates, a weaker budget, and all three together.":
    "Una comprobación de si el gobierno puede seguir pagando sus deudas sin una crisis. La app proyecta la deuda a cinco años con las cifras de hoy fijas y luego otra vez con choques estándar: menor crecimiento, tipos de interés más altos, un presupuesto más débil y los tres juntos.",
  "It shows how fragile the debt path is. If one plausible shock sends debt sharply higher, the country has little room for bad luck.":
    "Muestra lo frágil que es la trayectoria de la deuda. Si un choque plausible dispara la deuda, el país tiene poco margen para la mala suerte.",
  "Compare the shocked paths with the baseline. A wide spread means the debt is sensitive to things the government does not control.":
    "Compare las trayectorias con choque con el escenario base. Una gran dispersión significa que la deuda es sensible a cosas que el gobierno no controla.",
  "The projection holds today's figures fixed, so it is a \"what if\" exercise, not a forecast. The shock sizes are fixed and stated. It is much simpler than an IMF debt sustainability analysis and is not one.":
    "La proyección mantiene fijas las cifras de hoy, así que es un ejercicio de \"qué pasaría si\", no un pronóstico. El tamaño de los choques es fijo y está indicado. Es mucho más sencillo que un análisis de sostenibilidad de la deuda del FMI y no lo es.",
  "Gross financing need":
    "Necesidad bruta de financiamiento",
  "How much the government must raise in a year: the budget deficit plus all debt that falls due and has to be repaid or rolled over.":
    "Cuánto debe captar el gobierno en un año: el déficit presupuestario más toda la deuda que vence y hay que devolver o refinanciar.",
  "Even a country with moderate debt can get into trouble if a lot falls due at once and lenders are nervous. The IMF treats above about 15% of GDP a year as a warning level for emerging economies.":
    "Incluso un país con una deuda moderada puede tener problemas si vence mucho de golpe y los prestamistas están nerviosos. El FMI trata más de un 15% del PIB al año como nivel de alerta para las economías emergentes.",
  "Higher means more dependence on lenders being willing to lend again each year.":
    "Más alto significa más dependencia de que los prestamistas quieran volver a prestar cada año.",
  "Debt falling due":
    "Deuda que vence",
  "Loans and bonds that must be repaid within a period, usually the next 12 months, by the government or the whole country.":
    "Préstamos y bonos que deben devolverse en un periodo, normalmente los próximos 12 meses, por el gobierno o por todo el país.",
  "These repayments must be paid from savings or new borrowing. A large amount falling due when markets are closed is a classic path to a debt crisis.":
    "Estos pagos deben salir de los ahorros o de nueva deuda. Un gran vencimiento cuando los mercados están cerrados es una vía clásica hacia una crisis de deuda.",
  "Compare with FX reserves: if reserves cover the debt falling due, the country can pay even if lenders stop lending for a while.":
    "Compárelo con las reservas de divisas: si las reservas cubren la deuda que vence, el país puede pagar aunque los prestamistas dejen de prestar durante un tiempo.",
  "QEDS (World Bank and IMF quarterly external debt statistics) and IDS (World Bank international debt statistics) cover debt owed to foreigners. Debt owed to local lenders in local currency is mostly not in a free feed.":
    "QEDS (estadísticas trimestrales de deuda externa del Banco Mundial y el FMI) e IDS (estadísticas de deuda internacional del Banco Mundial) cubren la deuda con extranjeros. La deuda con prestamistas locales en moneda local casi nunca está en una fuente gratuita.",
  "Government debt securities":
    "Valores de deuda pública",
  "Bonds and bills the government has sold to investors and not yet repaid. \"International markets\" means bonds sold abroad, usually in dollars or euros; \"all markets\" adds bonds sold at home.":
    "Bonos y letras que el gobierno ha vendido a inversores y aún no ha devuelto. \"Mercados internacionales\" significa bonos vendidos en el exterior, normalmente en dólares o euros; \"todos los mercados\" añade los bonos vendidos en el propio país.",
  "Foreign-currency bonds are riskier for the borrower: if the local currency falls, the debt gets bigger in local money.":
    "Los bonos en moneda extranjera son más arriesgados para quien se endeuda: si la moneda local cae, la deuda crece en dinero local.",
  "From the Bank for International Settlements (BIS), quarterly.":
    "Del Banco de Pagos Internacionales (BPI), trimestral.",
  "Credit rating":
    "Calificación crediticia",
  "A grade (such as AAA, BBB or B) that agencies like S&P, Moody's and Fitch give to a borrower for how likely it is to repay.":
    "Una nota (como AAA, BBB o B) que agencias como S&P, Moody's y Fitch dan a un prestatario según la probabilidad de que devuelva lo que debe.",
  "Many investors may only buy bonds rated BBB- or higher (\"investment grade\"), so a downgrade below that line can force selling and raise borrowing costs.":
    "Muchos inversores solo pueden comprar bonos con calificación BBB- o superior (\"grado de inversión\"), así que una rebaja por debajo de esa línea puede forzar ventas y encarecer el crédito.",
  "Ratings are licensed data. The app shows them as Missing rather than guessing, because no free feed provides them.":
    "Las calificaciones son datos con licencia. La app las muestra como Falta en lugar de adivinarlas, porque ninguna fuente gratuita las ofrece.",
  "Current account":
    "Cuenta corriente",
  "The country's balance with the rest of the world: what it earns from exports, income from abroad and money sent home by workers, minus what it pays for imports and to foreign investors.":
    "El saldo del país con el resto del mundo: lo que gana con las exportaciones, las rentas del exterior y el dinero que envían los trabajadores a casa, menos lo que paga por las importaciones y a los inversores extranjeros.",
  "A deficit has to be paid for by borrowing from or selling assets to foreigners. A large deficit makes a country depend on foreign money continuing to arrive, which can stop suddenly.":
    "Un déficit hay que pagarlo endeudándose con extranjeros o vendiéndoles activos. Un déficit grande hace que un país dependa de que siga llegando dinero del exterior, algo que puede detenerse de golpe.",
  "Positive (surplus): the country earns more than it spends abroad. Negative (deficit): it relies on money from abroad. A deficit above about 4 to 5% of GDP is often seen as a vulnerability.":
    "Positiva (superávit): el país gana más de lo que gasta en el exterior. Negativa (déficit): depende del dinero del exterior. Un déficit por encima de un 4 a 5% del PIB se suele ver como una vulnerabilidad.",
  "FX reserves (foreign exchange reserves)":
    "Reservas de divisas",
  "Foreign currency and gold held by the central bank, mostly in dollars.":
    "Moneda extranjera y oro que guarda el banco central, sobre todo en dólares.",
  "Reserves are the country's savings for a rainy day. They pay for imports and debt if foreign money stops arriving, and let the central bank steady the currency.":
    "Las reservas son los ahorros del país para los malos tiempos. Pagan importaciones y deuda si deja de llegar dinero del exterior y permiten al banco central estabilizar la moneda.",
  "\"Months of imports\" says how long reserves could pay for imports with no other income. Three months is the traditional minimum; more is safer.":
    "\"Meses de importaciones\" indica cuánto tiempo podrían pagar las reservas las importaciones sin ningún otro ingreso. Tres meses es el mínimo tradicional; más es más seguro.",
  "Months of imports ignores debt falling due and money that could leave the country; the reserve adequacy panel looks at those too where data allow.":
    "Los meses de importaciones no tienen en cuenta la deuda que vence ni el dinero que podría salir del país; el panel de adecuación de reservas también los mira cuando hay datos.",
  "External debt":
    "Deuda externa",
  "Everything the country (government, banks and companies together) owes to lenders abroad.":
    "Todo lo que el país (gobierno, bancos y empresas en conjunto) debe a prestamistas del exterior.",
  "Most external debt is in foreign currency, so a fall in the local currency makes it heavier, and it has to be repaid with export earnings or reserves.":
    "La mayor parte de la deuda externa está en moneda extranjera, así que una caída de la moneda local la hace más pesada, y hay que devolverla con ingresos por exportaciones o con reservas.",
  "Shown as a share of GNI (gross national income, which is GDP plus net income from abroad). Higher is a heavier burden.":
    "Se muestra como proporción del INB (ingreso nacional bruto, que es el PIB más las rentas netas del exterior). Más alto es una carga más pesada.",
  "Exchange rate (spot FX)":
    "Tipo de cambio (al contado)",
  "How many units of the local currency one US dollar buys today.":
    "Cuántas unidades de la moneda local compra hoy un dólar de EE. UU.",
  "A weaker currency makes imports (fuel, food, machines) dearer, which pushes up inflation, and makes foreign-currency debt heavier. It also makes exports cheaper for foreign buyers.":
    "Una moneda más débil encarece las importaciones (combustible, alimentos, maquinaria), lo que empuja al alza la inflación, y hace más pesada la deuda en moneda extranjera. También abarata las exportaciones para los compradores extranjeros.",
  "In the app it is local currency per US dollar, so a higher number means the local currency is weaker.":
    "En la app es moneda local por dólar de EE. UU., así que un número más alto significa que la moneda local está más débil.",
  "Real exchange rate (real FX)":
    "Tipo de cambio real",
  "The exchange rate adjusted for differences in inflation between the country and its trading partners, averaged across those partners. It shows whether the country's goods are getting dearer or cheaper for foreigners.":
    "El tipo de cambio ajustado por las diferencias de inflación entre el país y sus socios comerciales, promediado entre esos socios. Muestra si los bienes del país se encarecen o se abaratan para los extranjeros.",
  "A currency that is strong in real terms makes exports harder to sell and imports cheaper, which can widen the current account deficit. A weak one does the opposite.":
    "Una moneda fuerte en términos reales dificulta vender exportaciones y abarata las importaciones, lo que puede ampliar el déficit por cuenta corriente. Una débil hace lo contrario.",
  "The app compares it with its own long-run average: well above average means strong (possibly overvalued), well below means weak (possibly undervalued).":
    "La app lo compara con su propia media de largo plazo: muy por encima de la media significa fuerte (quizá sobrevalorada), muy por debajo significa débil (quizá infravalorada).",
  "From the BIS. Being far from average is not proof that a currency will move back; the related signal is labelled with its test result.":
    "Del BPI. Estar lejos de la media no prueba que una moneda vaya a volver; la señal relacionada lleva indicado el resultado de su prueba.",
  "Capital flows":
    "Flujos de capital",
  "Money moving into or out of the country to buy or sell shares, bonds, companies and loans.":
    "Dinero que entra o sale del país para comprar o vender acciones, bonos, empresas y préstamos.",
  "Inflows can fund growth; sudden outflows can force the currency down and rates up. \"Hot money\" in bonds and shares can leave faster than direct investment in factories.":
    "Las entradas pueden financiar el crecimiento; las salidas repentinas pueden hundir la moneda y subir los tipos. El \"dinero caliente\" en bonos y acciones puede irse más rápido que la inversión directa en fábricas.",
  "Carry (FX carry)":
    "Carry (carry de divisas)",
  "Borrowing in a currency with low interest rates and lending in one with high interest rates, to earn the difference.":
    "Endeudarse en una moneda con tipos de interés bajos y prestar en otra con tipos altos, para ganar la diferencia.",
  "Carry trades bring money into high-rate emerging markets, but they can unwind fast when fear rises, pushing those currencies down together.":
    "Las operaciones de carry llevan dinero a los mercados emergentes de tipos altos, pero pueden deshacerse rápido cuando aumenta el miedo, hundiendo esas monedas a la vez.",
  "The app tests a carry signal against its standard; its result (including that it does not survive the multiple-testing correction) is under Menu > Models & validation.":
    "La app prueba una señal de carry según su estándar; su resultado (incluido que no supera la corrección por pruebas múltiples) está en Menú > Modelos y validación.",
  "Spread":
    "Diferencial",
  "The extra interest a borrower pays over a safer benchmark. For a country's dollar bonds, it is the yield above US Treasury bonds of similar length.":
    "El interés extra que paga un prestatario sobre una referencia más segura. Para los bonos en dólares de un país, es el rendimiento por encima de los bonos del Tesoro de EE. UU. de plazo similar.",
  "It is the price markets put on the risk of not being repaid. Spreads widen when investors worry and narrow when they relax.":
    "Es el precio que ponen los mercados al riesgo de no cobrar. Los diferenciales se amplían cuando los inversores se preocupan y se estrechan cuando se calman.",
  "Higher means investors see more risk. Under about 200 basis points is typical of strong borrowers; above 1,000 usually means markets fear a default.":
    "Más alto significa que los inversores ven más riesgo. Por debajo de unos 200 puntos básicos es típico de prestatarios sólidos; por encima de 1.000 suele significar que los mercados temen un impago.",
  "CDS (credit default swap)":
    "CDS (permuta de incumplimiento crediticio)",
  "A contract that works like insurance against a government not paying its debts. Its price, in basis points a year, is what it costs to insure 10,000 units of debt for five years.":
    "Un contrato que funciona como un seguro contra el impago de un gobierno. Su precio, en puntos básicos al año, es lo que cuesta asegurar 10.000 unidades de deuda durante cinco años.",
  "It is a direct market price of default risk.":
    "Es un precio de mercado directo del riesgo de impago.",
  "Higher means markets see more risk. The bands the app uses to describe market access: under 200 bps strong, 200 to 400 high-yield, 400 to 1,000 stressed, above 1,000 distressed.":
    "Más alto significa que los mercados ven más riesgo. Los tramos que usa la app para describir el acceso al mercado: menos de 200 pb, sólido; de 200 a 400, alto rendimiento; de 400 a 1.000, tensionado; más de 1.000, en dificultades.",
  "CDS prices are licensed data. The app hides CDS unless you load your own file, and never uses estimates.":
    "Los precios de los CDS son datos con licencia. La app oculta los CDS salvo que cargue su propio archivo y nunca usa estimaciones.",
  "Market access":
    "Acceso al mercado",
  "Whether a government can sell new bonds to investors at a price it can bear.":
    "Si un gobierno puede vender bonos nuevos a los inversores a un precio que pueda soportar.",
  "A government that loses market access must cut spending, use reserves, or turn to the IMF or other official lenders.":
    "Un gobierno que pierde el acceso al mercado debe recortar el gasto, usar reservas o recurrir al FMI u otros prestamistas oficiales.",
  "Execution window":
    "Ventana de emisión",
  "The coming weeks in which a government could sell bonds, with the official dates (rate decisions, inflation releases) that might move the market.":
    "Las próximas semanas en las que un gobierno podría vender bonos, con las fechas oficiales (decisiones de tipos, datos de inflación) que podrían mover el mercado.",
  "Issuers usually avoid selling bonds right before a big announcement, when prices can swing.":
    "Los emisores suelen evitar vender bonos justo antes de un anuncio importante, cuando los precios pueden oscilar.",
  "Positioning (CFTC)":
    "Posicionamiento (CFTC)",
  "How many bets on a currency rising versus falling are held by speculators on US futures exchanges, published weekly by the US Commodity Futures Trading Commission.":
    "Cuántas apuestas a que una moneda suba frente a que baje tienen los especuladores en los mercados de futuros de EE. UU., según publica cada semana la Comisión de Comercio de Futuros de Materias Primas de EE. UU.",
  "When almost everyone is on the same side (\"crowded\"), a surprise can make many people rush out at once, causing a sharp move the other way.":
    "Cuando casi todos están del mismo lado (\"posición saturada\"), una sorpresa puede hacer que muchos salgan a la vez, provocando un movimiento brusco en sentido contrario.",
  "Prediction markets (Kalshi, Polymarket)":
    "Mercados de predicción (Kalshi, Polymarket)",
  "Exchanges where people bet money on whether an event will happen, such as an election result or a rate decision. The price reads as the crowd's probability.":
    "Plataformas donde la gente apuesta dinero a si ocurrirá un evento, como el resultado de unas elecciones o una decisión de tipos. El precio se lee como la probabilidad que le da la multitud.",
  "They give a quick, market-based reading of how likely an event is seen to be, and how that changes day to day.":
    "Dan una lectura rápida, basada en el mercado, de lo probable que se considera un evento y de cómo cambia día a día.",
  "Crowds can be wrong, thin markets can be moved by a few bets, and the odds are not a forecast by the app.":
    "Las multitudes pueden equivocarse, los mercados con poco volumen pueden moverse con unas pocas apuestas y las probabilidades no son un pronóstico de la app.",
  "Financial stress indices (STLFSI, NFCI, GSCPI)":
    "Índices de estrés financiero (STLFSI, NFCI, GSCPI)",
  "Single numbers that combine many market prices to show how strained the financial system is: the St. Louis Fed Financial Stress Index (STLFSI), the Chicago Fed National Financial Conditions Index (NFCI), and the New York Fed Global Supply Chain Pressure Index (GSCPI).":
    "Números únicos que combinan muchos precios de mercado para mostrar lo tensionado que está el sistema financiero: el Índice de Estrés Financiero de la Fed de San Luis (STLFSI), el Índice Nacional de Condiciones Financieras de la Fed de Chicago (NFCI) y el Índice Global de Presión en las Cadenas de Suministro de la Fed de Nueva York (GSCPI).",
  "Stress in US markets tends to spill over into emerging markets as investors pull back from risk.":
    "El estrés en los mercados de EE. UU. tiende a contagiarse a los mercados emergentes cuando los inversores reducen su exposición al riesgo.",
  "Zero is about average. Above zero means more stress or tighter conditions than usual; below zero means calmer than usual.":
    "Cero es más o menos la media. Por encima de cero significa más estrés o condiciones más restrictivas de lo habitual; por debajo de cero, más calma de lo habitual.",
  "Commodity prices":
    "Precios de las materias primas",
  "World prices of raw materials such as oil, gas, copper, wheat and gold, from the World Bank Pink Sheet.":
    "Precios mundiales de materias primas como el petróleo, el gas, el cobre, el trigo y el oro, según el Pink Sheet del Banco Mundial.",
  "For a country that exports a commodity, a higher price means more export income and tax revenue; for one that imports it, a higher price raises inflation and the import bill.":
    "Para un país que exporta una materia prima, un precio más alto significa más ingresos por exportaciones y más recaudación; para uno que la importa, un precio más alto eleva la inflación y la factura de importaciones.",
  "Political stability (WGI)":
    "Estabilidad política (WGI)",
  "The World Bank's Worldwide Governance Indicators score for how likely it is that the government is destabilised by unrest, violence or terrorism, ranked against all countries.":
    "La puntuación de los Indicadores Mundiales de Gobernanza del Banco Mundial sobre la probabilidad de que el gobierno se vea desestabilizado por disturbios, violencia o terrorismo, comparada con todos los países.",
  "Instability can disrupt policy, scare off investors and make debt harder to repay.":
    "La inestabilidad puede trastocar la política económica, ahuyentar a los inversores y dificultar el pago de la deuda.",
  "A percentile: 80th means more stable than 80% of countries. Higher is more stable.":
    "Un percentil: el 80 significa más estable que el 80% de los países. Más alto es más estable.",
  "Built from surveys and expert opinions, published yearly with a lag of about a year, so it moves slowly.":
    "Se construye con encuestas y opiniones de expertos, se publica una vez al año con un retraso de alrededor de un año, así que cambia despacio.",
  "News tone (GDELT)":
    "Tono de las noticias (GDELT)",
  "The average mood of news articles about the country, scored by the GDELT project from the words used, across many news sites worldwide.":
    "El ánimo medio de las noticias sobre el país, puntuado por el proyecto GDELT a partir de las palabras empleadas, en muchos sitios de noticias de todo el mundo.",
  "A sharp turn negative can be an early sign of unrest, a crisis or a policy shock, before it shows up in official figures.":
    "Un giro brusco hacia lo negativo puede ser una señal temprana de disturbios, una crisis o un choque de política, antes de que aparezca en las cifras oficiales.",
  "Below zero means the coverage is more negative than positive. Most countries sit a little below zero, so look at changes over time rather than the level.":
    "Por debajo de cero significa que la cobertura es más negativa que positiva. La mayoría de los países se sitúan un poco por debajo de cero, así que fíjese en los cambios a lo largo del tiempo más que en el nivel.",
  "It measures words, not facts, and is noisy. Big stories in a few outlets can move it.":
    "Mide palabras, no hechos, y tiene mucho ruido. Grandes noticias en unos pocos medios pueden moverlo.",
  "Armed conflict (UCDP)":
    "Conflicto armado (UCDP)",
  "Counts of organised violence and deaths from the Uppsala Conflict Data Program (UCDP) at Uppsala University, which records conflicts worldwide from news and other sources.":
    "Recuentos de violencia organizada y de muertes del Programa de Datos sobre Conflictos de Uppsala (UCDP), de la Universidad de Uppsala, que registra conflictos en todo el mundo a partir de noticias y otras fuentes.",
  "Conflict destroys output, drives people from their homes, strains budgets and scares off investment.":
    "Los conflictos destruyen producción, expulsan a la gente de sus hogares, tensan los presupuestos y ahuyentan la inversión.",
  "The app uses UCDP files you download, with the date they cover. \"Candidate\" data is preliminary and can change.":
    "La app usa archivos del UCDP que usted descarga, con la fecha que cubren. Los datos \"candidatos\" son preliminares y pueden cambiar.",
  "Geopolitical risk index (GPR)":
    "Índice de riesgo geopolítico (GPR)",
  "An index by economists Dario Caldara and Matteo Iacoviello that counts how often major newspapers write about wars, terrorism and military tensions.":
    "Un índice de los economistas Dario Caldara y Matteo Iacoviello que cuenta con qué frecuencia los grandes periódicos escriben sobre guerras, terrorismo y tensiones militares.",
  "Higher readings have tended to come with lower investment and more market stress.":
    "Las lecturas más altas han tendido a coincidir con menos inversión y más tensión en los mercados.",
  "Higher means more press coverage of geopolitical threats than usual.":
    "Más alto significa más cobertura en prensa de amenazas geopolíticas de lo habitual.",
  "Sanctions":
    "Sanciones",
  "Restrictions a government (such as the US, EU or UK) or the UN places on dealing with named countries, companies or people.":
    "Restricciones que un gobierno (como Estados Unidos, la UE o el Reino Unido) o la ONU impone a las operaciones con determinados países, empresas o personas.",
  "Sanctions can cut a country off from markets, trade and payments, and dealing with a listed party can be illegal.":
    "Las sanciones pueden aislar a un país de los mercados, el comercio y los pagos, y operar con una parte sancionada puede ser ilegal.",
  "The app reads the official lists you download; it does not decide whether a particular deal is allowed.":
    "La app lee las listas oficiales que usted descarga; no decide si una operación concreta está permitida.",
  "Missing":
    "Falta",
  "No live feed, official series or file of yours provided this figure, so the app shows nothing rather than a guess.":
    "Ninguna fuente en vivo, serie oficial ni archivo suyo ha aportado esta cifra, así que la app no muestra nada en lugar de una suposición.",
  "A made-up or sample number can look just as convincing as a real one. Showing \"Missing\" with the reason keeps every figure on screen traceable to a real source.":
    "Un número inventado o de ejemplo puede parecer tan convincente como uno real. Mostrar \"Falta\" con el motivo hace que cada cifra en pantalla se pueda rastrear hasta una fuente real.",
  "Hover or tap a Missing figure to see why it is missing and what would fill it.":
    "Pase el ratón por encima o toque una cifra que falta para ver por qué falta y qué la completaría.",
  "\"model\" figure":
    "Cifra de \"modelo\"",
  "A number the app calculated from other live figures (for example the real policy rate, which is the policy rate minus inflation), rather than one read directly from a source.":
    "Un número que la app calcula a partir de otras cifras en vivo (por ejemplo, el tipo oficial real, que es el tipo oficial menos la inflación), en lugar de leerlo directamente de una fuente.",
  "It tells you the figure is only as good as its inputs and the formula, which is named next to it.":
    "Le indica que la cifra es tan buena como sus datos de partida y la fórmula, que se nombra a su lado.",
  "Source label":
    "Etiqueta de fuente",
  "The small line under each figure that names where it came from (IMF, World Bank, BIS, a central bank, your file) and, where known, the date.":
    "La línea pequeña bajo cada cifra que indica de dónde procede (FMI, Banco Mundial, BPI, un banco central, su archivo) y, cuando se conoce, la fecha.",
  "It lets you check any number against the original.":
    "Le permite comprobar cualquier número con el original.",
  "Real-time data and publication lags":
    "Datos en tiempo real y retrasos de publicación",
  "Using only the figures that had actually been published on a given past date. Official figures come out weeks or months after the period they describe, and are often revised later.":
    "Usar solo las cifras que realmente se habían publicado en una fecha pasada determinada. Las cifras oficiales salen semanas o meses después del periodo que describen, y a menudo se revisan más tarde.",
  "Testing a signal with today's revised figures, or with figures that were not yet published at the time, makes it look better than it could really have been. The app applies the delay before a figure could be used.":
    "Probar una señal con las cifras revisadas de hoy, o con cifras que aún no se habían publicado en ese momento, la hace parecer mejor de lo que realmente pudo ser. La app aplica el retraso antes de que una cifra pudiera usarse.",
  "Backtest":
    "Prueba con datos históricos (backtest)",
  "Checking how a rule or signal would have done in the past, using the data that was available at the time.":
    "Comprobar cómo le habría ido a una regla o señal en el pasado, usando los datos disponibles en aquel momento.",
  "It is the first test of whether a signal has any value. A signal that did not work in the past is unlikely to work in future.":
    "Es la primera prueba de si una señal tiene algún valor. Una señal que no funcionó en el pasado difícilmente funcionará en el futuro.",
  "Passing a backtest does not guarantee future results. Testing many ideas and keeping the best ones produces false winners, which is why the app pre-registers tests and corrects for multiple testing.":
    "Superar una prueba histórica no garantiza resultados futuros. Probar muchas ideas y quedarse con las mejores produce falsos ganadores, por eso la app registra las pruebas de antemano y corrige por pruebas múltiples.",
  "Pre-registration":
    "Registro previo",
  "Writing down a test's rules, data, and pass mark before running it, and recording a fingerprint (hash) of that plan so it cannot be changed afterwards without it showing.":
    "Dejar por escrito las reglas, los datos y el umbral de aprobación de una prueba antes de ejecutarla, y guardar una huella (hash) de ese plan para que no pueda cambiarse después sin que se note.",
  "It stops the rules being adjusted after seeing the results until something \"works\".":
    "Impide que las reglas se ajusten después de ver los resultados hasta que algo \"funcione\".",
  "Naive benchmark":
    "Referencia ingenua",
  "The simplest possible forecast to beat, such as \"next year will be the same as this year\".":
    "La previsión más sencilla posible que hay que superar, como \"el año que viene será igual que este\".",
  "A model is only useful if it does better than this. Many sophisticated forecasts do not.":
    "Un modelo solo es útil si lo hace mejor que esto. Muchas previsiones sofisticadas no lo consiguen.",
  "p-value":
    "Valor p",
  "The chance of seeing a result at least this good by pure luck if the signal actually had no value.":
    "La probabilidad de obtener un resultado al menos así de bueno por pura suerte si la señal en realidad no tuviera valor.",
  "A small p-value (the app's usual pass mark is 0.05, a 5% chance) suggests the result is not just luck.":
    "Un valor p pequeño (el umbral habitual de la app es 0,05, una probabilidad del 5%) sugiere que el resultado no es solo suerte.",
  "If you test 20 ideas, one will usually pass at 0.05 by luck alone. That is why the app also applies the Holm correction.":
    "Si prueba 20 ideas, normalmente una aprobará con 0,05 solo por suerte. Por eso la app aplica también la corrección de Holm.",
  "Holm correction (multiple testing)":
    "Corrección de Holm (pruebas múltiples)",
  "A standard way to raise the bar when many tests are run at once, so that lucky passes are weeded out. The smallest p-value must clear a stricter mark, the next a slightly less strict one, and so on.":
    "Una forma estándar de subir el listón cuando se hacen muchas pruebas a la vez, para descartar los aprobados por suerte. El valor p más pequeño debe superar un umbral más estricto, el siguiente uno algo menos estricto, y así sucesivamente.",
  "Without it, running many tests guarantees some false passes. The track record shows which passes survive it across every test on record.":
    "Sin ella, hacer muchas pruebas garantiza algunos falsos aprobados. El historial muestra qué aprobados la superan entre todas las pruebas registradas.",
  "Bootstrap":
    "Remuestreo (bootstrap)",
  "Re-running a calculation thousands of times on random re-samples of the data to see how much the answer could vary by chance.":
    "Repetir un cálculo miles de veces sobre remuestras aleatorias de los datos para ver cuánto podría variar la respuesta por azar.",
  "It gives an honest range for a result when the usual textbook formulas do not apply.":
    "Da un rango honesto para un resultado cuando las fórmulas habituales de los manuales no son aplicables.",
  "RMSE and relative RMSE":
    "RMSE y RMSE relativo",
  "Root mean squared error: the typical size of a forecast's miss. Relative RMSE divides a model's RMSE by the naive benchmark's.":
    "Raíz del error cuadrático medio: el tamaño típico del error de una previsión. El RMSE relativo divide el RMSE de un modelo entre el de la referencia ingenua.",
  "It is how forecasts are scored.":
    "Es la forma de puntuar las previsiones.",
  "Relative RMSE below 1 means the model missed by less than the naive forecast; above 1 means it did worse.":
    "Un RMSE relativo por debajo de 1 significa que el modelo falló por menos que la previsión ingenua; por encima de 1, que lo hizo peor.",
  "Credit-to-GDP gap":
    "Brecha crédito/PIB",
  "How far lending to households and companies, as a share of GDP, sits above or below its long-run trend. Published by the BIS.":
    "Cuánto se sitúa el crédito a hogares y empresas, como porcentaje del PIB, por encima o por debajo de su tendencia a largo plazo. Lo publica el BPI.",
  "Credit growing much faster than the economy has often come before banking crises. Bank regulators use the gap to decide whether banks should hold extra capital.":
    "Un crédito que crece mucho más deprisa que la economía ha precedido a menudo a crisis bancarias. Los supervisores bancarios usan la brecha para decidir si los bancos deben mantener capital adicional.",
  "Above zero: credit is running ahead of its trend. International bank rules (Basel III) start to consider extra capital for banks above about 2 points and call for the full extra buffer at about 10 points. Below zero: credit is weak relative to trend.":
    "Por encima de cero: el crédito va por delante de su tendencia. Las normas bancarias internacionales (Basilea III) empiezan a considerar capital adicional para los bancos por encima de unos 2 puntos y exigen el colchón adicional completo hacia los 10 puntos. Por debajo de cero: el crédito está débil respecto a su tendencia.",
  "z-score (standard deviations from average)":
    "Puntuación z (desviaciones típicas respecto a la media)",
  "How unusual a value is compared with its own history, measured in standard deviations (the typical distance from the average).":
    "Lo inusual que es un valor comparado con su propia historia, medido en desviaciones típicas (la distancia habitual respecto a la media).",
  "It puts very different figures on one scale, so a jump in a yield and a jump in news tone can be compared by how rare each is.":
    "Pone cifras muy distintas en una misma escala, de modo que un salto en un rendimiento y un salto en el tono de las noticias se pueden comparar por lo raro que es cada uno.",
  "Zero is average. Plus or minus 1 is common; beyond plus or minus 2 is unusual and happens only about 5% of the time.":
    "Cero es la media. Más o menos 1 es frecuente; más allá de más o menos 2 es inusual y ocurre solo alrededor del 5% de las veces.",
  "Test labels and evidence grades":
    "Etiquetas de prueba y grados de evidencia",
  "Labels on each model and signal saying how far it has been tested. Not validated: never tested against a pre-registered standard. Backtest passed or failed: the result of its one pre-registered test on past data. Too few cases to test: not enough history to tell. A test that passed also gets a grade. Validated: it still holds after the correction for testing many rules, or a long enough live record has confirmed it. Provisional pass: it passed on its own but not after that correction. Under review: since the test, its live calls are doing worse than chance would suggest. Withdrawn: its live calls have done clearly worse, so it is no longer relied on until a new version passes. Review due: its test last ran more than a year ago.":
    "Etiquetas en cada modelo y señal que indican hasta dónde se han probado. No validado: nunca se ha probado frente a un estándar registrado de antemano. Prueba histórica superada o fallida: el resultado de su única prueba registrada de antemano con datos del pasado. Muy pocos casos para probar: no hay historia suficiente para saberlo. Una prueba superada recibe además un grado. Validado: sigue en pie tras la corrección por probar muchas reglas, o un historial en vivo suficientemente largo lo ha confirmado. Aprobado provisional: aprobó por sí solo, pero no tras esa corrección. En revisión: desde la prueba, sus señales en vivo lo están haciendo peor de lo que cabría esperar por azar. Retirado: sus señales en vivo lo han hecho claramente peor, así que deja de usarse hasta que una nueva versión apruebe. Revisión pendiente: su prueba se ejecutó por última vez hace más de un año.",
  "They tell you how much weight a reading can bear. A recorded verdict is never changed after the fact. \"Validated\" is a research label with this defined meaning, not an independent or regulatory sign-off.":
    "Le indican cuánto peso puede soportar una lectura. Un veredicto registrado nunca se cambia a posteriori. \"Validado\" es una etiqueta de investigación con este significado definido, no una aprobación independiente ni regulatoria.",
  "Council of agents":
    "Consejo de agentes",
  "A set of specialist AI agents, each covering one area (for example the central bank, the budget, politics), that read the live figures for a country and write findings. A synthesis agent then writes the answer, and may quote only figures the agents had.":
    "Un conjunto de agentes de IA especializados, cada uno a cargo de un área (por ejemplo, el banco central, el presupuesto, la política), que leen las cifras en vivo de un país y redactan conclusiones. Después, un agente de síntesis redacta la respuesta y solo puede citar cifras que tenían los agentes.",
  "Splitting the work keeps each answer tied to named figures and sources, and makes it clear which agent said what.":
    "Repartir el trabajo mantiene cada respuesta ligada a cifras y fuentes concretas, y deja claro qué agente dijo qué.",
  "Answers are written by an AI model and are labelled so. They are interpretation of the figures shown, not advice, and the app checks that every number they quote appears in the source figures.":
    "Las respuestas las redacta un modelo de IA y están etiquetadas como tales. Son una interpretación de las cifras mostradas, no un consejo, y la app comprueba que cada número que citan aparece en las cifras de origen.",
  "Treasury auction and bid-to-cover": "Subasta del Tesoro y cobertura (bid-to-cover)",
  "The US government sells its bills, notes and bonds at regular auctions. Bid-to-cover is the amount investors bid divided by the amount sold; the high yield is the highest yield accepted, which every winning bidder receives.": "El Gobierno de EE. UU. vende sus letras, notas y bonos en subastas periódicas. La cobertura (bid-to-cover) es el importe que ofrecen los inversores dividido por el importe vendido; el rendimiento máximo es el rendimiento más alto aceptado, que recibe cada postor ganador.",
  "They show how keen investors are to lend to the US government. Weak demand can push up the yield the government pays, and with it borrowing costs across the world, because US Treasuries are the benchmark for most other bonds.": "Muestran cuánto interés tienen los inversores en prestar al Gobierno de EE. UU. Una demanda débil puede elevar el rendimiento que paga el Gobierno y, con él, el coste de endeudamiento en todo el mundo, porque los bonos del Tesoro de EE. UU. son la referencia de la mayoría de los demás bonos.",
  "A bid-to-cover of 2.5 means $2.50 was bid for every $1 sold; higher means more demand. Compare an auction with earlier auctions of the same term, not with other terms. Indirect bidders are mostly foreign central banks and investment funds bidding through dealers.": "Una cobertura de 2,5 significa que se ofrecieron 2,50 dólares por cada dólar vendido; más alto significa más demanda. Compare una subasta con subastas anteriores del mismo plazo, no con otros plazos. Los postores indirectos son sobre todo bancos centrales extranjeros y fondos de inversión que pujan a través de intermediarios.",
  "One auction can be weak for passing reasons (a holiday week, a big supply of other bonds). Only the United States has a free auction feed the app can read; other countries' auctions are not shown.": "Una subasta puede ser débil por motivos pasajeros (una semana festiva, mucha oferta de otros bonos). Solo Estados Unidos tiene un flujo gratuito de subastas que la app puede leer; las subastas de otros países no se muestran.",
};
