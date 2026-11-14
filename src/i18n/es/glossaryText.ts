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
  "Wide bands mean the outlook is unclear. Plans that depend on growth or inflation (wages, budgets, loan payments) should allow for the whole band, not just the middle line. These are the app's estimates, not advice.":
    'Unas bandas anchas significan que las perspectivas son inciertas. Los planes que dependen del crecimiento o de la inflación (salarios, presupuestos, cuotas de préstamos) deberían contemplar toda la banda, no solo la línea central. Son estimaciones de la app, no consejos.',
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
  "How fast the economy is growing, how fast prices are rising, how many people are out of work, whether pay keeps up with prices, and how house prices are moving. Together they show whether ordinary living standards are improving and whether the central bank is likely to act.": "A qué ritmo crece la economía, a qué ritmo suben los precios, cuánta gente está sin trabajo, si los salarios siguen el ritmo de los precios y cómo evolucionan los precios de la vivienda. Juntas, estas cifras muestran si mejora el nivel de vida de la gente y si es probable que el banco central actúe.",
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
  "Capital account openness (Chinn-Ito index)":
    "Apertura de la cuenta de capital (índice de Chinn-Ito)",
  "An index by economists Menzie Chinn and Hiro Ito of how freely money can move in and out of a country under its laws, from 0 (closed) to 1 (open), built from the IMF's yearly report on exchange rules.":
    "Un índice de los economistas Menzie Chinn y Hiro Ito sobre la libertad con que el dinero puede entrar y salir de un país según sus leyes, de 0 (cerrada) a 1 (abierta), elaborado a partir del informe anual del FMI sobre normas cambiarias.",
  "Capital controls decide whether foreign investors can take their money out and whether people and firms can borrow or invest abroad, which matters in a crisis.":
    "Los controles de capital deciden si los inversionistas extranjeros pueden retirar su dinero y si las personas y empresas pueden endeudarse o invertir en el exterior, lo que importa en una crisis.",
  "Higher means fewer legal limits. It measures the rules on paper, not how much money actually moves.":
    "Más alto significa menos límites legales. Mide las normas sobre el papel, no cuánto dinero se mueve realmente.",
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
  "Pre-registered test":
    "Prueba prerregistrada",
  "A test whose rule, data, pass mark and costs were written down and hashed (given a SHA-256 fingerprint) before it was run. The hash shows the rule was not changed after the result was seen.":
    "Una prueba cuya regla, datos, umbral de aprobación y costes se escribieron y se sellaron con un hash (una huella SHA-256) antes de ejecutarla. El hash muestra que la regla no se cambió después de ver el resultado.",
  "It stops a rule being re-tuned until it passes. A changed rule is a new version and counts as a new test.":
    "Impide reajustar una regla hasta que apruebe. Una regla cambiada es una versión nueva y cuenta como una prueba nueva.",
  "Most of the app's tests were written down on the same day they ran, on data that was already public. For those, the hash shows the rule did not change after the run, not that it was fixed before anyone looked at the data, so the track record calls them specified and hashed before the run. Only a test written down before its data exist rules out both. The track record shows the registration and run dates side by side.":
    "La mayoría de las pruebas de la app se escribieron el mismo día en que se ejecutaron, con datos que ya eran públicos. En esas, el hash muestra que la regla no cambió después de la ejecución, no que se fijara antes de que nadie mirara los datos; por eso el historial las describe como especificadas y selladas antes de la ejecución. Solo una prueba escrita antes de que existan sus datos descarta ambas cosas. El historial muestra juntas las fechas de registro y de ejecución.",
  "Bootstrap":
    "Remuestreo (bootstrap)",
  "Re-running a calculation thousands of times on random re-samples of the data to see how much the answer could vary by chance.":
    "Repetir un cálculo miles de veces sobre remuestras aleatorias de los datos para ver cuánto podría variar la respuesta por azar.",
  "It gives a realistic range for a result when the usual textbook formulas do not apply.":
    "Da un rango realista para un resultado cuando las fórmulas habituales de los manuales no son aplicables.",
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
  "Business and consumer surveys (not a PMI)": "Encuestas empresariales y de consumidores (no es un PMI)",
  "Each month the European Commission asks thousands of firms and households in every EU country how things are going and how they expect them to go. The answers are turned into confidence measures for industry, services and consumers, an overall Economic Sentiment Indicator and an Employment Expectations Indicator.": "Cada mes, la Comisión Europea pregunta a miles de empresas y hogares de cada país de la UE cómo van las cosas y cómo esperan que vayan. Las respuestas se convierten en medidas de confianza para la industria, los servicios y los consumidores, un Indicador de Sentimiento Económico general y un Indicador de Expectativas de Empleo.",
  "Surveys arrive weeks before official figures for output and jobs, so they are an early sign of where the economy is heading. They are free, unlike the purchasing managers' indexes (PMIs) that markets watch.": "Las encuestas llegan semanas antes que las cifras oficiales de producción y empleo, por lo que son una señal temprana de hacia dónde va la economía. Son gratuitas, a diferencia de los índices de gestores de compras (PMI) que siguen los mercados.",
  "The sentiment and employment indexes have a long-term average of 100: above 100 means more upbeat than usual. Confidence balances are the share answering \"better\" minus the share answering \"worse\"; watch whether they are rising or falling more than their level.": "Los índices de sentimiento y de empleo tienen una media de largo plazo de 100: por encima de 100 significa más optimismo de lo habitual. Los saldos de confianza son la proporción que responde \"mejor\" menos la que responde \"peor\"; fíjese en si suben o bajan más que en su nivel.",
  "These are not PMIs: different questions, firms and scale (a PMI's dividing line is 50, not 100), so the two cannot be compared number for number. Moods can swing on news without a change in what people actually do. Only EU members are covered.": "No son PMI: preguntas, empresas y escala distintas (la línea divisoria de un PMI es 50, no 100), por lo que no pueden compararse cifra por cifra. El ánimo puede oscilar con las noticias sin que cambie lo que la gente hace realmente. Solo se cubren los miembros de la UE.",
  "GDP release": "Publicación del PIB",
  "The day the statistics office publishes its first estimate of how much the economy grew in the last quarter.": "El día en que la oficina de estadística publica su primera estimación de cuánto creció la economía en el último trimestre.",
  "The first estimate is the one markets and the central bank react to, even though it is often revised later.": "La primera estimación es la que mueve a los mercados y al banco central, aunque a menudo se revisa después.",
  // G16: distribution and taxes
  "How evenly income is shared, how much tax the central government collects and from what, and how high the country's tariffs on imports are. Each figure is yearly and shows its year; the inequality figure comes from household surveys that are not run every year.": "Qué tan repartido está el ingreso, cuántos impuestos recauda el gobierno central y de qué fuentes, y qué tan altos son los aranceles del país sobre las importaciones. Cada cifra es anual y muestra su año; la cifra de desigualdad procede de encuestas de hogares que no se realizan todos los años.",
  "Gini index (inequality)": "Índice de Gini (desigualdad)",
  "One number for how evenly income (or spending) is shared among households, from 0 (everyone has the same) to 100 (one household has everything).": "Un solo número que indica qué tan repartido está el ingreso (o el gasto) entre los hogares, de 0 (todos tienen lo mismo) a 100 (un solo hogar lo tiene todo).",
  "Two countries with the same average income can feel very different to live in. High inequality can weaken support for reforms, and the same policy can help or hurt very different numbers of people.": "Dos países con el mismo ingreso medio pueden ser muy distintos para vivir. Una desigualdad alta puede debilitar el apoyo a las reformas, y la misma política puede ayudar o perjudicar a un número muy distinto de personas.",
  "Higher means more unequal. Most rich European countries are around 25 to 35; parts of Latin America and southern Africa are above 50. The app shows the survey year and whether the survey measured income or consumption.": "Más alto significa más desigual. La mayoría de los países europeos ricos están entre 25 y 35; partes de América Latina y del sur de África superan 50. La aplicación muestra el año de la encuesta y si midió el ingreso o el consumo.",
  "It comes from household surveys that many countries run only every few years, so the latest figure can be old. A consumption Gini usually reads lower than an income Gini, because spending is shared more evenly than income, so do not compare the two directly. Very rich households are often missed by surveys.": "Procede de encuestas de hogares que muchos países realizan solo cada pocos años, por lo que la última cifra puede ser antigua. Un Gini de consumo suele ser más bajo que uno de ingreso, porque el gasto está más repartido que el ingreso, así que no compare los dos directamente. Las encuestas a menudo no captan a los hogares muy ricos.",
  "Tax revenue (central government)": "Ingresos tributarios (gobierno central)",
  "The taxes the central government collects in a year, as a share of GDP.": "Los impuestos que recauda el gobierno central en un año, como porcentaje del PIB.",
  "Taxes pay for public services and debt. A low tax take limits what a government can spend or borrow, and raising it is often the slowest part of a reform.": "Los impuestos pagan los servicios públicos y la deuda. Una recaudación baja limita lo que un gobierno puede gastar o pedir prestado, y elevarla suele ser la parte más lenta de una reforma.",
  "Higher means the state collects more. Many low-income countries collect under 15% of GDP; rich countries often 20 to 30% at central level, more once regions and social security are added.": "Más alto significa que el Estado recauda más. Muchos países de ingreso bajo recaudan menos del 15% del PIB; los países ricos, a menudo entre el 20 y el 30% a nivel central, y más si se suman las regiones y la seguridad social.",
  "This World Bank figure covers the central government only, so it is lower than the IMF revenue figure, which counts all levels of government and social security contributions. It is yearly and arrives a year or two late.": "Esta cifra del Banco Mundial cubre solo al gobierno central, por lo que es menor que la cifra de ingresos del FMI, que cuenta todos los niveles de gobierno y las cotizaciones a la seguridad social. Es anual y llega con uno o dos años de retraso.",
  "Tax split (income, goods and services, trade)": "Reparto de impuestos (renta, bienes y servicios, comercio)",
  "How the central government's revenue is split between taxes on income and profits, taxes on goods and services (VAT, sales and excise taxes), and taxes on trade (mostly import duties).": "Cómo se reparten los ingresos del gobierno central entre impuestos sobre la renta y los beneficios, impuestos sobre bienes y servicios (IVA, impuestos sobre las ventas y especiales) e impuestos sobre el comercio (sobre todo aranceles de importación).",
  "It shows who bears the taxes and how stable they are. Income taxes rise more with income; goods taxes fall on everyone who buys; trade taxes depend on imports and shrink when tariffs are cut.": "Muestra quién soporta los impuestos y qué tan estables son. Los impuestos sobre la renta suben más con el ingreso; los impuestos sobre bienes recaen en todos los que compran; los impuestos sobre el comercio dependen de las importaciones y se reducen cuando se bajan los aranceles.",
  "Each is a share of central government revenue, so they need not add to 100 (fees, grants and social contributions make up the rest). A large trade share is common in poorer countries and is a risk if imports drop.": "Cada uno es un porcentaje de los ingresos del gobierno central, por lo que no tienen por qué sumar 100 (tasas, donaciones y cotizaciones sociales completan el resto). Una parte grande del comercio es habitual en países más pobres y es un riesgo si caen las importaciones.",
  "Applied tariff (weighted and simple mean)": "Arancel aplicado (media ponderada y simple)",
  "The average tax charged on imported goods, from the tariffs the country applies. The weighted mean counts each product by how much of it is imported; the simple mean counts every product line the same.": "El impuesto medio que se cobra sobre los bienes importados, a partir de los aranceles que aplica el país. La media ponderada cuenta cada producto según cuánto se importa; la media simple cuenta igual cada línea de producto.",
  "Tariffs raise prices for buyers and protect local producers. They change what a trade shock or a trade deal does to a country.": "Los aranceles encarecen los precios para los compradores y protegen a los productores locales. Cambian lo que un choque comercial o un acuerdo comercial supone para un país.",
  "Higher means more protection. The weighted mean is usually lower than the simple mean, because very high tariffs keep imports of those goods small, so they count for little in the weights. A big gap between the two means some goods are heavily protected.": "Más alto significa más protección. La media ponderada suele ser menor que la simple, porque los aranceles muy altos mantienen bajas las importaciones de esos bienes, que por eso pesan poco. Una gran diferencia entre las dos indica que algunos bienes están muy protegidos.",
  "Yearly, from the WITS/TRAINS database, so tariff changes made since the latest year shown are not included. It leaves out quotas, bans and other barriers that are not tariffs.": "Anual, de la base de datos WITS/TRAINS, por lo que no incluye los cambios arancelarios posteriores al último año mostrado. Deja fuera cuotas, prohibiciones y otras barreras que no son aranceles.",
  // U1: low-income country debt
  "What matters most for the poorest borrowers: how the IMF and World Bank rate their risk of debt distress, whether they took part in the 2020-21 pause on official debt payments or applied for a debt treatment under the G20 Common Framework, and how much China's government and state banks have lent them. Each row shows its source and date.": "Lo que más importa a los prestatarios más pobres: cómo califican el FMI y el Banco Mundial su riesgo de sobreendeudamiento, si participaron en la pausa de 2020-21 de los pagos de deuda oficial o solicitaron un tratamiento de la deuda en el Marco Común del G20, y cuánto les han prestado el gobierno y los bancos estatales de China. Cada fila muestra su fuente y su fecha.",
  "Risk of debt distress (IMF/World Bank rating)": "Riesgo de sobreendeudamiento (calificación del FMI/Banco Mundial)",
  "A rating the IMF and World Bank give each low-income country after a debt sustainability analysis: low, moderate, high, or already in debt distress.": "Una calificación que el FMI y el Banco Mundial dan a cada país de ingreso bajo tras un análisis de sostenibilidad de la deuda: bajo, moderado, alto o ya en situación de sobreendeudamiento.",
  "It decides how much of their help comes as grants rather than loans, and lenders and governments read it as the official view of whether the debt can be paid.": "Decide qué parte de su ayuda llega como donaciones y no como préstamos, y prestamistas y gobiernos la leen como la opinión oficial sobre si la deuda puede pagarse.",
  "Low is best. \"High\" means a serious chance of trouble paying; \"in debt distress\" means the country is already behind on payments or restructuring. The date shows how old the analysis is.": "Bajo es lo mejor. «Alto» significa una probabilidad seria de problemas para pagar; «en sobreendeudamiento» significa que el país ya está atrasado en los pagos o reestructurando. La fecha muestra la antigüedad del análisis.",
  "It covers only countries that can borrow from the IMF's concessional fund, and each rating is only as recent as the latest analysis, which can be a year or more old.": "Solo cubre a los países que pueden pedir prestado al fondo concesional del FMI, y cada calificación es tan reciente como el último análisis, que puede tener un año o más.",
  "Debt Service Suspension Initiative (DSSI)": "Iniciativa de Suspensión del Servicio de la Deuda (DSSI)",
  "A pause, agreed by the G20 during the pandemic, on debt payments that the poorest countries owed to other governments, from May 2020 to December 2021.": "Una pausa, acordada por el G20 durante la pandemia, de los pagos de deuda que los países más pobres debían a otros gobiernos, de mayo de 2020 a diciembre de 2021.",
  "Taking part freed money for health and support during the crisis. The paused payments were not cancelled; they fall due later, which still weighs on budgets.": "Participar liberó dinero para salud y ayudas durante la crisis. Los pagos suspendidos no se cancelaron; vencen más tarde, lo que todavía pesa en los presupuestos.",
  "Shows whether the country took part. Forty-eight of the 73 eligible countries did.": "Muestra si el país participó. Lo hicieron cuarenta y ocho de los 73 países elegibles.",
  "Private lenders such as bondholders were asked to join but almost none did, so it covered only part of what countries owed.": "Se pidió a los prestamistas privados, como los tenedores de bonos, que se sumaran, pero casi ninguno lo hizo, así que solo cubrió parte de lo que debían los países.",
  "Common Framework (G20 debt treatment)": "Marco Común (tratamiento de la deuda del G20)",
  "The G20's process, set up in 2020, for a low-income country to ask all its government lenders, including China, to restructure its debt together.": "El procedimiento del G20, creado en 2020, para que un país de ingreso bajo pida a todos sus prestamistas oficiales, incluida China, que reestructuren su deuda conjuntamente.",
  "Applying is a sign the country cannot pay as agreed. Talks can take years, and while they go on the country usually cannot borrow from markets.": "Solicitarlo es señal de que el país no puede pagar lo acordado. Las negociaciones pueden durar años, y mientras tanto el país no suele poder endeudarse en los mercados.",
  "Shows whether the country applied. As of 2024 four had: Chad, Zambia, Ethiopia and Ghana.": "Muestra si el país lo solicitó. En 2024 lo habían hecho cuatro: Chad, Zambia, Etiopía y Ghana.",
  "Applying says nothing about how far talks have gone or how much relief was given.": "Solicitarlo no dice nada de cuánto han avanzado las negociaciones ni de cuánto alivio se concedió.",
  "Official lending from China": "Préstamos oficiales de China",
  "Loans that China's government and its state banks (such as China Development Bank and China Eximbank) committed to the country, added up from AidData's project records.": "Préstamos que el gobierno de China y sus bancos estatales (como el China Development Bank y el China Eximbank) comprometieron con el país, sumados a partir de los registros por proyecto de AidData.",
  "China became one of the largest lenders to poorer countries. Its loans are often not in other public debt figures, and they shape how a debt restructuring can go.": "China se convirtió en uno de los mayores prestamistas de los países más pobres. Sus préstamos a menudo no figuran en otras cifras de deuda pública y condicionan cómo puede desarrollarse una reestructuración.",
  "The total since the first year in the file, and the amount in the most recent five years of the file, in US dollars.": "El total desde el primer año del archivo y el importe de los cinco años más recientes del archivo, en dólares estadounidenses.",
  "These are amounts promised when each loan was signed, not money paid out or still owed. AidData builds them from public records, so some loans are missed, and the file stops a few years before today.": "Son importes prometidos al firmar cada préstamo, no dinero desembolsado ni adeudado. AidData los reconstruye a partir de registros públicos, así que faltan algunos préstamos, y el archivo termina unos años antes de hoy.",
  // G17: people and living standards
  "Youth unemployment": "Desempleo juvenil",
  "The share of young people aged 15 to 24 who want a job and are looking for one but do not have one.": "La proporción de jóvenes de 15 a 24 años que quieren un empleo y lo buscan, pero no lo tienen.",
  "Young people are usually the first to lose work and the last to find it. Many young people out of work for a long time has often come before protests and unrest.": "Los jóvenes suelen ser los primeros en perder el empleo y los últimos en encontrarlo. Que muchos jóvenes pasen mucho tiempo sin trabajo ha precedido a menudo a protestas y disturbios.",
  "Higher is worse. It is normally about twice the overall unemployment rate, so compare it with the country's own past.": "Más alto es peor. Normalmente es alrededor del doble de la tasa de desempleo general, así que compárelo con el pasado del propio país.",
  "This is the International Labour Organization's modelled estimate: where a country has not run a labour survey for a year, a model fills the gap. Students not looking for work are not counted as unemployed.": "Es la estimación modelizada de la Organización Internacional del Trabajo: cuando un país no ha realizado una encuesta laboral en un año, un modelo llena el hueco. Los estudiantes que no buscan trabajo no se cuentan como desempleados.",
  "Labour force participation": "Participación en la fuerza laboral",
  "The share of people aged 15 and over who are working or looking for work.": "La proporción de personas de 15 años o más que trabajan o buscan trabajo.",
  "An economy grows faster when more people work. A low or falling rate can mean people have given up looking, or that many women are kept out of paid work.": "Una economía crece más rápido cuando trabaja más gente. Una tasa baja o en descenso puede significar que las personas han dejado de buscar, o que muchas mujeres quedan fuera del trabajo remunerado.",
  "Higher means more people take part in paid work. Most countries are between 50% and 75%. Ageing pulls it down, because retired people are counted.": "Más alto significa que más personas participan en el trabajo remunerado. La mayoría de los países están entre el 50% y el 75%. El envejecimiento la reduce, porque se cuenta a las personas jubiladas.",
  "This is the International Labour Organization's modelled estimate, so years without a survey are filled by a model. Unpaid work at home is not counted.": "Es la estimación modelizada de la Organización Internacional del Trabajo, por lo que los años sin encuesta los llena un modelo. No se cuenta el trabajo no remunerado en el hogar.",
  "Poverty rate (international poverty lines)": "Tasa de pobreza (líneas internacionales de pobreza)",
  "The share of people living on less than a fixed amount a day, the poverty line. The World Bank uses one line for extreme poverty and two higher lines that fit lower-middle-income and upper-middle-income countries. The amounts are in dollars at purchasing power parity, so a dollar buys the same in every country.": "La proporción de personas que viven con menos de una cantidad fija al día, la línea de pobreza. El Banco Mundial usa una línea para la pobreza extrema y dos líneas más altas adecuadas para los países de ingreso mediano bajo y mediano alto. Las cantidades están en dólares a paridad de poder adquisitivo, de modo que un dólar compra lo mismo en todos los países.",
  "It shows how many people a policy change, a price rise or a crisis can push into hardship, which matters most in the poorest countries.": "Muestra cuántas personas puede empujar a la penuria un cambio de política, una subida de precios o una crisis, lo que más importa en los países más pobres.",
  "Higher is worse. The lowest line measures extreme poverty; the higher lines show how many people are still poor by the standards of richer developing countries. The app shows the dollar amount, the survey year and whether the survey measured income or consumption.": "Más alto es peor. La línea más baja mide la pobreza extrema; las líneas más altas muestran cuántas personas siguen siendo pobres según los criterios de los países en desarrollo más ricos. La aplicación muestra la cantidad en dólares, el año de la encuesta y si la encuesta midió el ingreso o el consumo.",
  "It comes from household surveys that many countries run only every few years, so the latest figure can be old. The World Bank moves the lines from time to time when it updates price comparisons, so figures from before and after a change are not directly comparable.": "Procede de encuestas de hogares que muchos países realizan solo cada pocos años, por lo que la cifra más reciente puede ser antigua. El Banco Mundial cambia las líneas de vez en cuando al actualizar las comparaciones de precios, por lo que las cifras de antes y después de un cambio no son directamente comparables.",
  "Remittances received": "Remesas recibidas",
  "Money sent home by people working abroad, as a share of GDP.": "Dinero que envían a casa las personas que trabajan en el extranjero, como proporción del PIB.",
  "For many poorer countries it is one of the largest sources of foreign currency, larger than aid or foreign investment. It helps households pay for food, school and housing, and it supports the currency because the money is changed into local currency.": "Para muchos países más pobres es una de las mayores fuentes de divisas, mayor que la ayuda o la inversión extranjera. Ayuda a los hogares a pagar alimentos, escuela y vivienda, y sostiene la moneda porque el dinero se cambia a moneda local.",
  "Higher means the country leans more on its workers abroad. Above about 10% of GDP it is a main support of the economy. It tends to be steady, and often rises when the home country is in trouble.": "Más alto significa que el país depende más de sus trabajadores en el extranjero. Por encima de alrededor del 10% del PIB es un apoyo principal de la economía. Suele ser estable y a menudo aumenta cuando el país de origen tiene problemas.",
  "Money sent outside banks and money transfer firms, such as cash carried home, is often not counted, so the true amount can be higher. It falls when the countries where the workers live slow down.": "El dinero enviado fuera de los bancos y de las empresas de envío de dinero, como el efectivo llevado a casa, a menudo no se cuenta, por lo que la cantidad real puede ser mayor. Disminuye cuando se frenan los países donde viven los trabajadores.",
  "Age dependency ratio": "Tasa de dependencia por edad",
  "How many children (under 15) and older people (over 64) there are for every 100 people of working age (15 to 64).": "Cuántos niños (menores de 15 años) y personas mayores (de más de 64) hay por cada 100 personas en edad de trabajar (de 15 a 64 años).",
  "Fewer working-age people for each child or retired person means less income to pay for schools, pensions and health care. It changes slowly but shapes budgets for decades.": "Menos personas en edad de trabajar por cada niño o jubilado significa menos ingresos para pagar escuelas, pensiones y salud. Cambia lentamente, pero marca los presupuestos durante décadas.",
  "Higher means more dependants for each working-age person. Young, fast-growing countries are high because of children; ageing rich countries are rising because of older people.": "Más alto significa más personas a cargo por cada persona en edad de trabajar. Los países jóvenes y de rápido crecimiento son altos por los niños; los países ricos que envejecen suben por las personas mayores.",
  "It counts by age only, so it ignores who actually works: many people aged 15 to 24 are students and many over 64 still work.": "Solo cuenta por edad, por lo que no tiene en cuenta quién trabaja realmente: muchas personas de 15 a 24 años son estudiantes y muchas mayores de 64 siguen trabajando.",
  "How many people live in poverty, how much money workers abroad send home, how many people work or look for work, how many young people are out of work, and how many children and older people there are for each person of working age. Each figure is yearly and shows its year; poverty rates come from household surveys that are not run every year.": "Cuántas personas viven en la pobreza, cuánto dinero envían a casa los trabajadores en el extranjero, cuántas personas trabajan o buscan trabajo, cuántos jóvenes no tienen empleo y cuántos niños y personas mayores hay por cada persona en edad de trabajar. Cada cifra es anual y muestra su año; las tasas de pobreza proceden de encuestas de hogares que no se realizan todos los años.",
  // G19: debt structure
  "Interest payments (% of revenue)": "Pagos de intereses (% de los ingresos)",
  "The interest the central government pays on its debt in a year, as a share of the money it takes in.": "Los intereses que el gobierno central paga por su deuda en un año, como proporción del dinero que ingresa.",
  "It shows how much of each unit of revenue is gone before any school, road or salary is paid. When it climbs, governments often have to cut other spending or borrow more.": "Muestra qué parte de cada unidad de ingresos ya se ha ido antes de pagar ninguna escuela, carretera o salario. Cuando sube, los gobiernos a menudo tienen que recortar otros gastos o pedir más prestado.",
  "Higher is worse. Under 10% is usually comfortable; above about 20% leaves little room and often comes before a debt crisis in emerging economies.": "Más alto es peor. Por debajo del 10% suele ser holgado; por encima de alrededor del 20% deja poco margen y a menudo precede a una crisis de deuda en las economías emergentes.",
  "This World Bank figure covers the central government only. It is yearly and arrives a year or two late, so a recent rise in interest rates may not show yet.": "Esta cifra del Banco Mundial cubre solo al gobierno central. Es anual y llega con uno o dos años de retraso, por lo que una subida reciente de los tipos de interés puede no verse todavía.",
  "Public external debt by currency": "Deuda pública externa por moneda",
  "How the government's debt to foreign lenders is split between currencies: US dollars, euros, yen, the IMF's SDR basket and others.": "Cómo se reparte entre monedas la deuda del gobierno con prestamistas extranjeros: dólares estadounidenses, euros, yenes, la canasta DEG del FMI y otras.",
  "Debt owed in a foreign currency gets heavier when the local currency falls, because more local money is needed to pay each dollar. Countries that borrow mostly in dollars are hit hardest when the dollar is strong.": "La deuda en moneda extranjera pesa más cuando cae la moneda local, porque se necesita más dinero local para pagar cada dólar. Los países que piden prestado sobre todo en dólares son los más afectados cuando el dólar está fuerte.",
  "The larger the share in one foreign currency, the more the debt depends on that exchange rate. SDR and multilateral loans are usually cheaper and longer, so a large SDR share often means much of the debt is owed to the IMF and development banks.": "Cuanto mayor es la parte en una sola moneda extranjera, más depende la deuda de ese tipo de cambio. Los préstamos en DEG y multilaterales suelen ser más baratos y más largos, así que una parte grande en DEG suele significar que gran parte de la deuda se debe al FMI y a los bancos de desarrollo.",
  "From the World Bank International Debt Statistics, which cover low- and middle-income countries only and arrive a year or more late. It covers public and publicly guaranteed debt owed abroad, not debt owed at home.": "Procede de las Estadísticas de la Deuda Internacional del Banco Mundial, que solo cubren los países de ingreso bajo y mediano y llegan con un año o más de retraso. Cubre la deuda pública y con garantía pública contraída en el extranjero, no la deuda interna.",
  "Maturity of new public external loans": "Vencimiento de los nuevos préstamos públicos externos",
  "How many years, on average, the loans the government and its guaranteed bodies took from foreign lenders that year run before they are fully repaid.": "Cuántos años, en promedio, duran hasta su pago total los préstamos que el gobierno y sus entidades garantizadas tomaron de prestamistas extranjeros ese año.",
  "Long loans spread repayments out and give time to recover from a bad year. Short loans must be refinanced often, which is risky when markets are nervous.": "Los préstamos largos reparten los pagos y dan tiempo para recuperarse de un mal año. Los préstamos cortos deben refinanciarse a menudo, lo que es arriesgado cuando los mercados están nerviosos.",
  "Longer is safer. Loans from development banks often run 20 years or more; bonds and bank loans are usually shorter.": "Más largo es más seguro. Los préstamos de los bancos de desarrollo suelen durar 20 años o más; los bonos y los préstamos bancarios suelen ser más cortos.",
  "It covers only new loans that year, not all the debt already owed, so one large loan can move it a lot. Low- and middle-income countries only.": "Solo cubre los nuevos préstamos de ese año, no toda la deuda ya contraída, por lo que un solo préstamo grande puede moverla mucho. Solo países de ingreso bajo y mediano.",
  "Who holds government debt": "Quién tiene la deuda pública",
  "The split of government debt by who owns it: foreign investors, local banks, the central bank, pension funds and others.": "El reparto de la deuda pública según quién la posee: inversores extranjeros, bancos locales, el banco central, fondos de pensiones y otros.",
  "Foreign holders can sell quickly and push up borrowing costs; local banks that hold much government debt tie the banks' health to the government's.": "Los tenedores extranjeros pueden vender rápido y encarecer el endeudamiento; los bancos locales que tienen mucha deuda pública atan la salud de los bancos a la del gobierno.",
  "A large foreign share means more exposure to global market moods. A large share held by local banks means a debt problem can become a banking problem.": "Una parte extranjera grande significa más exposición al ánimo de los mercados mundiales. Una parte grande en manos de bancos locales significa que un problema de deuda puede convertirse en un problema bancario.",
  "These are estimates by two IMF economists, built from many sources; the latest year is preliminary and is revised. They cover emerging and developing economies only, as shares of general government debt. The app reads them from the IMF workbook you download into data/local/imf-investor-base/.": "Son estimaciones de dos economistas del FMI, elaboradas a partir de muchas fuentes; el último año es preliminar y se revisa. Solo cubren las economías emergentes y en desarrollo, como proporción de la deuda de las administraciones públicas. La aplicación las lee del libro de trabajo del FMI que usted descarga en data/local/imf-investor-base/.",
  // G18: trade and commodity exposure
  "Goods exports and imports by group": "Exportaciones e importaciones de bienes por grupo",
  "How the goods a country sells abroad, and the goods it buys, split between fuel, ores and metals, food and manufactured goods.": "Cómo se reparten los bienes que un país vende al exterior, y los que compra, entre combustibles, minerales y metales, alimentos y bienes manufacturados.",
  "It shows which world prices move the country's income. A country whose exports are mostly fuel or metals gains when those prices rise and suffers when they fall; one that imports most of its fuel or food pays more when they rise.": "Muestra qué precios mundiales mueven los ingresos del país. Un país cuyas exportaciones son sobre todo combustibles o metales gana cuando esos precios suben y sufre cuando bajan; uno que importa la mayor parte de su combustible o sus alimentos paga más cuando suben.",
  "A large share in one raw-material group means the economy rises and falls with that price. A large manufactures share usually means steadier export earnings.": "Una parte grande en un solo grupo de materias primas significa que la economía sube y baja con ese precio. Una parte grande de manufacturas suele significar ingresos por exportaciones más estables.",
  "World Bank figures built from UN Comtrade, yearly and a year or more late. Goods only, not services such as tourism. The four groups do not add up to 100%: farm raw materials and goods not classified are left out.": "Cifras del Banco Mundial elaboradas a partir de UN Comtrade, anuales y con un año o más de retraso. Solo bienes, no servicios como el turismo. Los cuatro grupos no suman el 100%: quedan fuera las materias primas agrícolas y los bienes sin clasificar.",
  "Net energy imports": "Importaciones netas de energía",
  "How much of the energy a country uses comes from abroad: energy use minus energy produced at home, as a share of use. A negative figure means the country produces more than it uses and sells the rest.": "Qué parte de la energía que consume un país viene del exterior: el consumo de energía menos la energía producida en el país, como proporción del consumo. Una cifra negativa significa que el país produce más de lo que consume y vende el resto.",
  "Countries that import most of their energy are hit when oil and gas prices jump: the import bill rises, the currency weakens and inflation climbs. Net exporters gain from the same jump.": "Los países que importan la mayor parte de su energía sufren cuando suben los precios del petróleo y del gas: la factura de importaciones sube, la moneda se debilita y la inflación aumenta. Los exportadores netos ganan con la misma subida.",
  "Near 100% means almost all energy is imported. Near 0 means the country produces about what it uses. Below 0 means a net exporter; the app turns that into how many times its own use it produces.": "Cerca del 100% significa que casi toda la energía es importada. Cerca de 0 significa que el país produce más o menos lo que consume. Por debajo de 0 significa un exportador neto; la aplicación lo convierte en cuántas veces su propio consumo produce.",
  "From the World Bank's energy balance figures, which are yearly and for some countries stopped years ago. The app shows the year and says when it is old.": "Procede de las cifras de balance energético del Banco Mundial, que son anuales y para algunos países se dejaron de actualizar hace años. La aplicación muestra el año e indica cuando es antiguo.",
  "Export concentration (Herfindahl index)": "Concentración de las exportaciones (índice de Herfindahl)",
  "A single number for how much a country's goods exports rely on a few products. The app works it out from UN Comtrade: the share of each of the 97 product chapters in exports is squared and the squares are added up.": "Un solo número que indica cuánto dependen las exportaciones de bienes de un país de unos pocos productos. La aplicación lo calcula a partir de UN Comtrade: se eleva al cuadrado la proporción de cada uno de los 97 capítulos de productos en las exportaciones y se suman los cuadrados.",
  "A country that sells mostly one thing, such as crude oil or copper, has its income swing with that one price. Spreading exports over many products makes earnings steadier.": "Un país que vende sobre todo una cosa, como petróleo crudo o cobre, ve oscilar sus ingresos con ese único precio. Repartir las exportaciones entre muchos productos hace los ingresos más estables.",
  "From near 0 (spread over many products) to 1 (only one product chapter). Below about 0.1 is spread out; above about 0.4 is highly concentrated. The app also says how many equal-sized product groups would give the same number.": "De casi 0 (repartidas entre muchos productos) a 1 (un solo capítulo de productos). Por debajo de alrededor de 0,1 está repartido; por encima de alrededor de 0,4 está muy concentrado. La aplicación también indica cuántos grupos de productos de igual tamaño darían el mismo número.",
  "The app's own calculation, not an official figure. It uses broad product chapters, so a country selling many kinds of machinery counts as spread out even if one buyer takes most of it. Only worked out when the chapters cover at least 90% of exports.": "Es un cálculo propio de la aplicación, no una cifra oficial. Usa capítulos de productos amplios, así que un país que vende muchos tipos de maquinaria cuenta como repartido aunque un solo comprador se lleve la mayor parte. Solo se calcula cuando los capítulos cubren al menos el 90% de las exportaciones.",
  "Top export markets": "Principales mercados de exportación",
  "The five countries that buy the largest share of a country's goods exports, from UN Comtrade.": "Los cinco países que compran la mayor parte de las exportaciones de bienes de un país, según UN Comtrade.",
  "A slowdown, a sanction or a trade war in a big buyer hits the seller's exports directly. A country selling a third of its goods to one market is exposed to that market's troubles.": "Una desaceleración, una sanción o una guerra comercial en un gran comprador golpea directamente las exportaciones del vendedor. Un país que vende un tercio de sus bienes a un solo mercado está expuesto a los problemas de ese mercado.",
  "One buyer above about 25% is a large single dependency. The scenario screens use the same figures for China, Taiwan, Russia and the Gulf.": "Un comprador por encima de alrededor del 25% es una dependencia grande. Las pantallas de escenarios usan las mismas cifras para China, Taiwán, Rusia y el Golfo.",
  "Yearly, one to two years late, and as reported by the exporting country. Goods sent through a hub such as the Netherlands or Hong Kong are counted for the hub, not the final buyer.": "Anual, con uno o dos años de retraso, y según lo declara el país exportador. Los bienes enviados a través de un centro como los Países Bajos o Hong Kong se cuentan para ese centro, no para el comprador final.",
  "What the country sells abroad and buys, how much of its energy it imports, how much its exports rely on a few products, and who buys them. These figures say which world price moves and which trading partners matter most for the country. Each is yearly and shows its year.": "Lo que el país vende al exterior y lo que compra, qué parte de su energía importa, cuánto dependen sus exportaciones de unos pocos productos y quién las compra. Estas cifras indican qué movimientos de precios mundiales y qué socios comerciales importan más para el país. Cada una es anual y muestra su año.",
  // G20: climate and energy
  "Greenhouse gas emissions per person": "Emisiones de gases de efecto invernadero por persona",
  "All the greenhouse gases a country emits in a year (carbon dioxide, methane, nitrous oxide and others), turned into the amount of carbon dioxide that would warm the planet as much, divided by the number of people.": "Todos los gases de efecto invernadero que un país emite en un año (dióxido de carbono, metano, óxido nitroso y otros), convertidos en la cantidad de dióxido de carbono que calentaría el planeta lo mismo, divididos por el número de habitantes.",
  "It shows how carbon-heavy the economy is. Countries with high emissions per person face larger costs from carbon prices, border carbon taxes such as the EU's, and the move away from coal, oil and gas.": "Muestra cuánto carbono usa la economía. Los países con muchas emisiones por persona afrontan mayores costes por los precios del carbono, los impuestos al carbono en frontera como el de la UE y el abandono del carbón, el petróleo y el gas.",
  "The world average is about 6 to 7 tonnes. Rich, coal-heavy or oil-producing countries are often 10 to 20 tonnes or more; many poorer countries are under 2.": "La media mundial es de unas 6 a 7 toneladas. Los países ricos, los que dependen del carbón o los productores de petróleo suelen tener 10 a 20 toneladas o más; muchos países más pobres están por debajo de 2.",
  "From the EU's EDGAR database via the World Bank, yearly and a year or two late. It leaves out emissions and removals from land use and forests, which matter a lot for countries such as Brazil and Indonesia. It counts where goods are made, not where they are used.": "Procede de la base de datos EDGAR de la UE a través del Banco Mundial, es anual y llega con uno o dos años de retraso. No incluye las emisiones y absorciones del uso del suelo y los bosques, que pesan mucho en países como Brasil e Indonesia. Cuenta dónde se fabrican los bienes, no dónde se consumen.",
  "Renewable share of energy use": "Proporción renovable del consumo de energía",
  "The share of the energy people and businesses finally use (for heat, transport, power and cooking) that comes from renewable sources: hydro, wind, solar, geothermal and wood and other biomass.": "La parte de la energía que personas y empresas usan finalmente (para calor, transporte, electricidad y cocina) que procede de fuentes renovables: hidráulica, eólica, solar, geotérmica y leña y otra biomasa.",
  "Countries that rely on their own renewables import less fuel, so they are less exposed to oil and gas price jumps.": "Los países que dependen de sus propias renovables importan menos combustible, por lo que están menos expuestos a las subidas de precio del petróleo y del gas.",
  "Higher means less reliance on coal, oil and gas. In some poorer countries it is high because many households cook with wood, not because of wind and solar.": "Más alto significa menos dependencia del carbón, el petróleo y el gas. En algunos países más pobres es alta porque muchos hogares cocinan con leña, no por la eólica y la solar.",
  "The UN figure for Sustainable Development Goal 7, via the World Bank, yearly and two or three years late. It includes traditional wood and charcoal.": "Es la cifra de la ONU para el Objetivo de Desarrollo Sostenible 7, a través del Banco Mundial, anual y con dos o tres años de retraso. Incluye la leña y el carbón vegetal tradicionales.",
  "Energy mix": "Combinación energética",
  "How a country's total energy supply splits between coal, oil, gas, nuclear power and renewables.": "Cómo se reparte el suministro total de energía de un país entre carbón, petróleo, gas, energía nuclear y renovables.",
  "It shows which fuel prices move the country's costs and how far it has to go to cut emissions. A country running mostly on imported oil and gas is hit hard when their prices jump.": "Muestra qué precios de combustibles mueven los costes del país y cuánto le queda para reducir emisiones. Un país que funciona sobre todo con petróleo y gas importados sufre mucho cuando sus precios se disparan.",
  "A large oil and gas share means exposure to their prices; a large coal share means high emissions per unit of energy; a large renewables or nuclear share means less exposure to fuel prices.": "Una parte grande de petróleo y gas significa exposición a sus precios; una parte grande de carbón, muchas emisiones por unidad de energía; una parte grande de renovables o nuclear, menos exposición a los precios de los combustibles.",
  "From Our World in Data's energy file, based on the Energy Institute's Statistical Review of World Energy, which lists about 80 countries one by one. The Energy Institute allows private, non-commercial use only, so the app downloads the file on your computer and never ships it. Yearly, with the year shown.": "Procede del archivo de energía de Our World in Data, basado en el Statistical Review of World Energy del Energy Institute, que detalla unos 80 países uno por uno. El Energy Institute solo permite el uso privado y no comercial, por lo que la aplicación descarga el archivo en su ordenador y nunca lo distribuye. Anual, con el año indicado.",
  "Physical climate risk (ND-GAIN)": "Riesgo climático físico (ND-GAIN)",
  "A score from the University of Notre Dame of how exposed a country is to the effects of climate change, such as floods, droughts and heat, and how ready it is to adapt.": "Una puntuación de la Universidad de Notre Dame sobre lo expuesto que está un país a los efectos del cambio climático, como inundaciones, sequías y calor, y lo preparado que está para adaptarse.",
  "Storms, droughts and floods damage farms, roads and homes, cut tax revenue and can force governments to borrow. Investors and rating agencies look at these risks more and more.": "Las tormentas, sequías e inundaciones dañan cultivos, carreteras y viviendas, reducen la recaudación y pueden obligar a los gobiernos a endeudarse. Inversores y agencias de calificación prestan cada vez más atención a estos riesgos.",
  "The app does not show it yet: ND-GAIN states no licence for its scores, so the row reads Missing until ND-GAIN says in writing that the scores may be used.": "La aplicación aún no lo muestra: ND-GAIN no indica ninguna licencia para sus puntuaciones, así que la fila aparece como Falta hasta que ND-GAIN confirme por escrito que pueden usarse.",
  "Not read by the app; see above.": "La aplicación no lo lee; véase arriba.",
  "How much greenhouse gas the country emits per person, how much of its energy comes from renewables, and how its energy splits between coal, oil, gas, nuclear and renewables. These show how exposed it is to fuel prices and to the costs of cutting emissions. Each figure is yearly and shows its year.": "Cuántos gases de efecto invernadero emite el país por persona, qué parte de su energía procede de renovables y cómo se reparte su energía entre carbón, petróleo, gas, nuclear y renovables. Muestran lo expuesto que está a los precios de los combustibles y a los costes de reducir emisiones. Cada cifra es anual y muestra su año.",
  // G22: wages and house prices
  "Wage growth, nominal and real": "Crecimiento salarial, nominal y real",
  "How much average monthly pay of employees changed on the year before. Nominal growth is the change in money terms. Real growth takes out inflation: it is how much more (or less) that pay can buy.": "Cuánto cambió el salario mensual medio de los asalariados respecto al año anterior. El crecimiento nominal es la variación en dinero. El crecimiento real descuenta la inflación: es cuánto más (o menos) puede comprar ese salario.",
  "Real wages tell you whether workers are getting better or worse off. Pay rising faster than prices supports spending; pay falling behind prices squeezes households and can feed strikes and protests. Central banks watch nominal pay because fast pay rises can keep inflation high.": "Los salarios reales indican si los trabajadores están mejor o peor. Un salario que sube más rápido que los precios sostiene el consumo; uno que se queda atrás aprieta a los hogares y puede alimentar huelgas y protestas. Los bancos centrales vigilan los salarios nominales porque subidas rápidas pueden mantener alta la inflación.",
  "Nominal 8% with inflation 6% is real growth of about 2%: people can buy a little more. Nominal 5% with inflation 9% is real growth of about -4%: pay buys less than a year ago, even though the number on the payslip went up.": "Un 8% nominal con una inflación del 6% es un crecimiento real de alrededor del 2%: la gente puede comprar algo más. Un 5% nominal con una inflación del 9% es un crecimiento real de alrededor del -4%: el salario compra menos que hace un año, aunque la cifra de la nómina haya subido.",
  "From ILOSTAT, the International Labour Organization's statistics, yearly. Many countries outside the OECD report earnings only every few years, so the latest year may be old, and some have none. The app works out real growth itself, from nominal growth and the World Bank's consumer price inflation for the same year, and leaves growth Missing when the ILO marks a break in the series.": "Procede de ILOSTAT, las estadísticas de la Organización Internacional del Trabajo, y es anual. Muchos países fuera de la OCDE solo publican ingresos cada pocos años, así que el último año puede ser antiguo, y algunos no tienen ninguno. La aplicación calcula ella misma el crecimiento real, a partir del crecimiento nominal y de la inflación de precios al consumidor del Banco Mundial para el mismo año, y deja el crecimiento como Falta cuando la OIT señala una ruptura en la serie.",
  "House prices, real and nominal": "Precios de la vivienda, reales y nominales",
  "How much residential property prices changed on the same quarter a year earlier, from the BIS (Bank for International Settlements), which collects them from central banks and statistics offices. Nominal is the change in local currency; real takes out consumer price inflation.": "Cuánto cambiaron los precios de los inmuebles residenciales respecto al mismo trimestre del año anterior, según el BIS (Banco de Pagos Internacionales), que los recoge de bancos centrales y oficinas de estadística. El nominal es la variación en moneda local; el real descuenta la inflación de precios al consumidor.",
  "Homes are most households' largest asset and banks' largest group of loans. Fast real rises can signal a credit boom; sharp falls hit household wealth, construction and bank balance sheets. Central banks watch them when setting interest rates.": "La vivienda es el mayor activo de la mayoría de los hogares y el mayor grupo de préstamos de los bancos. Subidas reales rápidas pueden señalar un auge del crédito; caídas fuertes golpean la riqueza de los hogares, la construcción y los balances de los bancos. Los bancos centrales los vigilan al fijar los tipos de interés.",
  "Real rises of more than about 10% a year for several years have often come before banking trouble. Nominal prices can rise while real prices fall when inflation is high.": "Subidas reales de más de alrededor del 10% al año durante varios años han precedido a menudo a problemas bancarios. Los precios nominales pueden subir mientras los reales bajan cuando la inflación es alta.",
  "Quarterly, a quarter or two late, and covering about 60 countries. Each country measures prices its own way (some only big cities, some only new homes), so compare changes over time within a country rather than levels across countries.": "Trimestral, con uno o dos trimestres de retraso, y para unos 60 países. Cada país mide los precios a su manera (algunos solo las grandes ciudades, otros solo viviendas nuevas), así que compare las variaciones a lo largo del tiempo dentro de un país, no los niveles entre países.",
  // G40: sector balances and private debt
  "Sector balances": "Saldos sectoriales",
  "How much each part of the economy saves minus what it spends on investment, as % of GDP: the government, the private sector (households and firms together) and the rest of the world. By accounting they add up: the government balance plus the private balance equals the current account, and the rest of the world lends the country whatever the current account is short.": "Cuánto ahorra cada parte de la economía menos lo que gasta en inversión, en % del PIB: el gobierno, el sector privado (hogares y empresas juntos) y el resto del mundo. Por contabilidad cuadran: el saldo del gobierno más el saldo privado es igual a la cuenta corriente, y el resto del mundo presta al país lo que le falta a la cuenta corriente.",
  "They show who is borrowing. If the government runs a deficit, someone has to lend to it: either the private sector saves more, or foreigners lend. A private sector that borrows heavily for years, as before many housing crashes, or a country that relies on foreign lending, can be a warning sign.": "Muestran quién se endeuda. Si el gobierno tiene déficit, alguien tiene que prestarle: o el sector privado ahorra más, o prestan los extranjeros. Un sector privado que se endeuda mucho durante años, como antes de muchas crisis inmobiliarias, o un país que depende del crédito exterior, puede ser una señal de alarma.",
  "A private balance below zero means households and firms together invest more than they save, so they are borrowing. A foreign balance above zero means the rest of the world is lending to the country (a current account deficit).": "Un saldo privado por debajo de cero significa que hogares y empresas juntos invierten más de lo que ahorran, así que se endeudan. Un saldo con el exterior por encima de cero significa que el resto del mundo presta al país (un déficit de cuenta corriente).",
  "The app reads the government balance (IMF Fiscal Monitor) and the current account (IMF WEO) for the same year and works out the private balance as what is left, so it also takes in measurement errors and differences between the two datasets. It is a rough reading, not a measured figure. Recent years can be IMF estimates or projections.": "La aplicación lee el saldo del gobierno (Monitor Fiscal del FMI) y la cuenta corriente (WEO del FMI) del mismo año y calcula el saldo privado como lo que queda, así que también recoge errores de medición y diferencias entre los dos conjuntos de datos. Es una lectura aproximada, no una cifra medida. Los años recientes pueden ser estimaciones o proyecciones del FMI.",
  "Household and company debt": "Deuda de los hogares y de las empresas",
  "Everything households and non-financial companies owe to all lenders (banks, bond investors, lenders abroad and others), as % of GDP, from the BIS (Bank for International Settlements) total credit statistics.": "Todo lo que deben los hogares y las empresas no financieras a todos los prestamistas (bancos, inversores en bonos, prestamistas del exterior y otros), en % del PIB, según las estadísticas de crédito total del BIS (Banco de Pagos Internacionales).",
  "High or fast-rising private debt makes an economy fragile: when rates rise or incomes fall, borrowers cut spending to keep up payments, and loan losses can hit banks. Many banking crises followed years of fast growth in private debt.": "Una deuda privada alta o que crece rápido vuelve frágil a la economía: cuando suben los tipos o bajan los ingresos, los deudores recortan el gasto para seguir pagando, y las pérdidas por préstamos pueden golpear a los bancos. Muchas crisis bancarias siguieron a años de rápido crecimiento de la deuda privada.",
  "Household debt above about 80% of GDP and company debt above about 90% are often treated as high. A rise of 10 points or more in a few years matters more than the level alone.": "Una deuda de los hogares por encima de alrededor del 80% del PIB y una deuda de las empresas por encima del 90% suelen considerarse altas. Una subida de 10 puntos o más en pocos años importa más que el nivel por sí solo.",
  "Quarterly, a quarter or two late, and for about 40 economies. It includes loans and debt securities at market value, adjusted for breaks in the series; it does not net off what borrowers hold in savings.": "Trimestral, con uno o dos trimestres de retraso, y para unas 40 economías. Incluye préstamos y títulos de deuda a valor de mercado, ajustados por rupturas en la serie; no descuenta lo que los deudores tienen ahorrado.",
  "Who in the economy is borrowing and who is lending: the government, households and firms together, and the rest of the world, each as % of GDP for the same year; and how much households and companies owe. The private balance is worked out as what is left over, so it is labelled as such.": "Quién se endeuda y quién presta en la economía: el gobierno, los hogares y las empresas juntos, y el resto del mundo, cada uno en % del PIB para el mismo año; y cuánto deben los hogares y las empresas. El saldo privado se calcula como lo que queda, así que se indica como tal.",
  // G41: monthly activity
  "Industrial production, retail sales and the monthly unemployment rate": "Producción industrial, ventas minoristas y tasa de desempleo mensual",
  "Three figures published every month. Industrial production measures how much mines, factories and power plants turn out. Retail sales measure how much shops sell. The unemployment rate is the share of people who want a job and are looking for one but do not have one.": "Tres cifras que se publican cada mes. La producción industrial mide cuánto producen las minas, las fábricas y las centrales eléctricas. Las ventas minoristas miden cuánto venden las tiendas. La tasa de desempleo es la proporción de personas que quieren trabajar y buscan empleo pero no lo tienen.",
  "GDP comes out only every three months and late. These monthly figures arrive four to eight weeks after the month, so they show sooner whether the economy is speeding up or slowing down. Central banks and markets react to them.": "El PIB sale solo cada tres meses y con retraso. Estas cifras mensuales llegan entre cuatro y ocho semanas después del mes, así que muestran antes si la economía se acelera o se frena. Los bancos centrales y los mercados reaccionan a ellas.",
  "Industrial production up 2% on a year earlier means factories produced 2% more than in the same month last year. A change on the month of -0.5% is a small fall from the month before; single months jump around, so look at several. An unemployment rate rising from 4.1% to 4.6% in a year usually means the economy is cooling.": "Una producción industrial un 2% más alta que un año antes significa que las fábricas produjeron un 2% más que en el mismo mes del año pasado. Una variación mensual de -0,5% es una pequeña caída respecto al mes anterior; los meses sueltos oscilan mucho, así que conviene mirar varios. Una tasa de desempleo que pasa del 4,1% al 4,6% en un año suele indicar que la economía se enfría.",
  "From Eurostat (EU members and Turkey), the US Federal Reserve, Census Bureau and BLS, the UK Office for National Statistics and Brazil's IBGE; other countries read Missing. US retail sales are in dollars and include price rises; the others are volumes. The UK and Brazil unemployment rates cover three months to the month named. For Brazil the source does not say whether the series are seasonally adjusted, so no change on the month is shown.": "Proceden de Eurostat (miembros de la UE y Turquía), la Reserva Federal, la Oficina del Censo y el BLS de Estados Unidos, la Oficina Nacional de Estadística del Reino Unido y el IBGE de Brasil; los demás países figuran como Falta. Las ventas minoristas de Estados Unidos están en dólares e incluyen las subidas de precios; las demás son volúmenes. Las tasas de desempleo del Reino Unido y de Brasil abarcan los tres meses hasta el mes indicado. En el caso de Brasil la fuente no indica si las series están desestacionalizadas, así que no se muestra la variación mensual.",
  "How the economy did last month: factory output, shop sales and the share of people out of work. These arrive well before the quarterly GDP figure, so they are the first sign of a turn.": "Cómo le fue a la economía el mes pasado: la producción de las fábricas, las ventas de las tiendas y la proporción de personas sin trabajo. Llegan mucho antes que el PIB trimestral, así que son la primera señal de un cambio de rumbo.",
  // G42: levels of government
  "Revenue and spending by level of government": "Ingresos y gasto por nivel de gobierno",
  "How much of the money the state raises and spends goes through each level: central government, state or regional governments, local governments (cities, towns, districts) and social security funds, each as % of GDP.": "Qué parte del dinero que el Estado recauda y gasta pasa por cada nivel: el gobierno central, los gobiernos estatales o regionales, los gobiernos locales (ciudades, municipios, distritos) y los fondos de la seguridad social, cada uno en % del PIB.",
  "In federal countries such as the United States, Germany, Brazil or India, states and cities spend a large part of the budget and can borrow on their own. A national budget cut or a debt problem can look very different once the other levels are counted, and policies such as schools or health are often run locally.": "En los países federales, como Estados Unidos, Alemania, Brasil o la India, los estados y las ciudades gastan una gran parte del presupuesto y pueden endeudarse por su cuenta. Un recorte del presupuesto nacional o un problema de deuda puede verse muy distinto cuando se cuentan los demás niveles, y políticas como la educación o la salud suelen gestionarse a nivel local.",
  "Central 18%, state 10%, local 5% of GDP with \"state and local 30% of the levels' total\" means nearly a third of spending is done below central government. A country with no state or local figures is usually run from the centre, or only reports central government.": "Central 18%, estatal 10%, local 5% del PIB con «estatal y local 30% del total de los niveles» significa que casi un tercio del gasto se realiza por debajo del gobierno central. Un país sin cifras estatales ni locales suele gobernarse desde el centro, o solo comunica las cifras del gobierno central.",
  "From Eurostat (EU members) and the IMF Government Finance Statistics, yearly and usually two or three years behind. Each level is counted before money passed between levels (grants to states, for example) is netted out, so the levels add up to more than general government; the share below central government is worked out from that sum and labelled so. Many countries report only central government to the IMF.": "Proceden de Eurostat (miembros de la UE) y de las Estadísticas de Finanzas Públicas del FMI; son anuales y suelen ir dos o tres años atrasadas. Cada nivel se cuenta antes de descontar el dinero que pasa de un nivel a otro (por ejemplo, las transferencias a los estados), así que los niveles suman más que el gobierno general; la parte por debajo del gobierno central se calcula a partir de esa suma y se indica como tal. Muchos países solo comunican al FMI las cifras del gobierno central.",
  "Figures as first published come from ALFRED for the United States (with your FRED key), the ECB real-time database for the euro area (GDP, HICP inflation, unemployment; revisions as far back as the ECB recorded them) and the ONS revision triangle for UK GDP (since 1992, each publication dated the last day of its month because the file gives only the month). Other countries have only the IMF forecast editions.": "Las cifras tal como se publicaron por primera vez vienen de ALFRED para Estados Unidos (con su clave de FRED), de la base de datos en tiempo real del BCE para la zona del euro (PIB, inflación IAPC, desempleo; revisiones hasta donde el BCE las registró) y del triángulo de revisiones de la ONS para el PIB del Reino Unido (desde 1992; cada publicación se fecha el último día de su mes porque el archivo solo da el mes). Los demás países solo tienen las ediciones de previsiones del FMI.",
  "Households' expected prices (EU consumer survey)": "Precios esperados por los hogares (encuesta de consumidores de la UE)",
  "In the same monthly European Commission survey, households are asked whether they expect prices to rise faster, at the same pace, more slowly, stay the same or fall over the next 12 months. The answer is a balance: the share expecting faster rises minus the share expecting slower rises or falls.": "En la misma encuesta mensual de la Comisión Europea se pregunta a los hogares si esperan que los precios suban más rápido, al mismo ritmo, más despacio, que se mantengan o que bajen en los próximos 12 meses. La respuesta es un saldo: la proporción que espera subidas más rápidas menos la que espera subidas más lentas o bajadas.",
  "If people expect prices to keep rising, they may ask for higher pay and spend sooner, which can keep inflation up. Central banks watch these expectations closely.": "Si la gente espera que los precios sigan subiendo, puede pedir salarios más altos y gastar antes, lo que puede mantener alta la inflación. Los bancos centrales siguen de cerca estas expectativas.",
  "A higher balance means more households expect prices to rise faster. The app places the latest reading against the country's own history (a percentile) and shows the change over 12 months.": "Un saldo más alto significa que más hogares esperan que los precios suban más rápido. La app sitúa la última lectura frente a la propia historia del país (un percentil) y muestra el cambio en 12 meses.",
  "It is a balance of answers, not an inflation rate in percent, so it cannot be compared directly with market-implied inflation. Whether a rise comes before higher inflation is tested by the pre-registered inflation_expectations_lead test; until that test passes the app only describes the figure. Only EU members are covered.": "Es un saldo de respuestas, no una tasa de inflación en porcentaje, por lo que no puede compararse directamente con la inflación implícita en los mercados. Si una subida precede a una inflación más alta se comprueba con la prueba prerregistrada inflation_expectations_lead; hasta que esa prueba se supere, la app solo describe la cifra. Solo cubre a los miembros de la UE.",
  "Core inflation": "Inflación subyacente",
  "Inflation without the prices that jump around the most: food and energy. Statistics offices publish it beside the headline rate, which covers everything people buy.": "La inflación sin los precios que más saltan: alimentos y energía. Los institutos de estadística la publican junto a la tasa general, que cubre todo lo que compra la gente.",
  "Food and energy prices swing with harvests, weather and world oil prices, which a central bank cannot steer. Core inflation shows the slower trend underneath, which is what interest rates can affect.": "Los precios de los alimentos y la energía oscilan con las cosechas, el clima y los precios mundiales del petróleo, que un banco central no puede dirigir. La inflación subyacente muestra la tendencia más lenta de fondo, que es lo que pueden influir los tipos de interés.",
  "If core is close to headline, price rises are broad. If headline is well above core, food or energy are pushing it up and may fall back; if core is above headline, cheaper food or energy are hiding a firmer trend. The app shows both, how core moved over 3 months, and for EU members how many points food and energy add.": "Si la subyacente está cerca de la general, las subidas de precios son amplias. Si la general está muy por encima de la subyacente, los alimentos o la energía la empujan y pueden bajar después; si la subyacente está por encima de la general, unos alimentos o una energía más baratos ocultan una tendencia más firme. La app muestra ambas, cómo se movió la subyacente en 3 meses y, para los miembros de la UE, cuántos puntos aportan los alimentos y la energía.",
  "Definitions differ: Eurostat also leaves out alcohol and tobacco, BLS and the OECD do not. Food and energy still matter to households, so core is not a measure of the cost of living.": "Las definiciones difieren: Eurostat también excluye el alcohol y el tabaco; el BLS y la OCDE no. Los alimentos y la energía siguen importando a los hogares, por lo que la subyacente no mide el coste de la vida.",
  "Herding and market sentiment": "Comportamiento gregario y sentimiento del mercado",
  "Herding is when many investors or households act the same way at the same time, often because others are doing it. Sentiment is the general mood: how confident or worried people are.": "El comportamiento gregario se da cuando muchos inversores u hogares actúan igual al mismo tiempo, a menudo porque otros lo hacen. El sentimiento es el estado de ánimo general: cuánta confianza o preocupación tiene la gente.",
  "When nearly everyone has made the same bet, there are few buyers or sellers left on the other side, so a surprise can make prices move sharply as people rush to change course.": "Cuando casi todos han hecho la misma apuesta, quedan pocos compradores o vendedores al otro lado, así que una sorpresa puede mover los precios con fuerza cuando la gente se apresura a cambiar de rumbo.",
  "The Behavioural Finance Agent describes herding with a few figures: how stretched speculators' currency futures bets are against the last three years, how sure prediction-market traders are about an event, and how far survey confidence is from its own normal range.": "El Agente de Finanzas Conductuales describe el comportamiento gregario con unas pocas cifras: cuán extremas son las apuestas de los especuladores en futuros de divisas frente a los últimos tres años, cuán seguros están los operadores de los mercados de predicción sobre un suceso y cuánto se aleja la confianza de las encuestas de su rango normal.",
  "These are descriptions, not forecasts. Only the crowding-unwind rule for currency futures has its own pre-registered test; the other readings are labelled \"Description, not a tested signal\".": "Son descripciones, no previsiones. Solo la regla de deshacer posiciones concentradas en futuros de divisas tiene su propia prueba prerregistrada; las demás lecturas llevan la etiqueta \"Descripción, no una señal comprobada\".",
  // G33: behavioural economics
  "Behavioural economics": "Economía conductual",
  "Present bias": "Sesgo del presente",
  "The habit of giving much more weight to what happens now than to what happens later, even when the later payoff is larger. People plan to save, diet or apply for something \"next month\", then put it off again when next month comes.": "La costumbre de dar mucho más peso a lo que pasa ahora que a lo que pasa después, aunque la recompensa posterior sea mayor. La gente planea ahorrar, ponerse a dieta o solicitar algo \"el mes que viene\" y lo vuelve a aplazar cuando llega ese mes.",
  "Policies that ask people to act now for a gain later (saving for retirement, signing up for a benefit, paying a tax early) reach fewer people than a simple cost-and-benefit sum would suggest.": "Las políticas que piden actuar ahora para ganar después (ahorrar para la jubilación, inscribirse en una prestación, pagar un impuesto por adelantado) llegan a menos personas de lo que sugeriría una simple suma de costes y beneficios.",
  "In a policy review, an option is flagged for present bias when it relies on people paying a cost now for a gain later. The flag names published studies, such as Laibson (1997) and Thaler and Benartzi (2004), that describe the habit and ways around it.": "En una revisión de políticas, una opción se señala por sesgo del presente cuando depende de que la gente asuma un coste ahora para ganar después. La señal cita estudios publicados, como Laibson (1997) y Thaler y Benartzi (2004), que describen esta costumbre y formas de evitarla.",
  "How strong the habit is differs between people, places and choices. The app holds no built-in size for it; a size appears only if you enter one with its source.": "La fuerza de esta costumbre varía según las personas, los lugares y las decisiones. La app no incluye ningún tamaño para ella; un tamaño aparece solo si usted lo introduce con su fuente.",
  "Defaults": "Opciones por defecto",
  "What happens when a person does nothing: the pension plan they are put in, the box already ticked, the tariff they stay on. Many people stay with the default, even when switching is easy.": "Lo que ocurre cuando una persona no hace nada: el plan de pensiones en el que la inscriben, la casilla ya marcada, la tarifa en la que se queda. Mucha gente se queda con la opción por defecto, aunque cambiar sea fácil.",
  "Changing the default can change what most people end up with, at little cost. Automatic enrolment in workplace pensions is the best-known case.": "Cambiar la opción por defecto puede cambiar lo que acaba teniendo la mayoría, con poco coste. La inscripción automática en los planes de pensiones de empresa es el caso más conocido.",
  "In a policy review, an option is flagged for defaults when it depends on people opting in or opting out. The flag points to studies such as Madrian and Shea (2001) on automatic enrolment.": "En una revisión de políticas, una opción se señala por opciones por defecto cuando depende de que la gente se apunte o se dé de baja. La señal remite a estudios como Madrian y Shea (2001) sobre la inscripción automática.",
  "People who stay with a default have not chosen it, and a default that suits most people can suit some badly. Results from one country or scheme may not carry over to another.": "Quien se queda con la opción por defecto no la ha elegido, y una opción que conviene a la mayoría puede convenir mal a algunos. Los resultados de un país o programa pueden no trasladarse a otro.",
  "Framing": "Encuadre",
  "The way the same choice is described changes what people pick. \"Saves 200 jobs out of 600\" and \"400 of 600 jobs are lost\" describe one outcome, yet people react to them differently.": "La forma de describir una misma elección cambia lo que elige la gente. \"Salva 200 de 600 empleos\" y \"se pierden 400 de 600 empleos\" describen un mismo resultado, pero la gente reacciona de forma distinta.",
  "How a reform is announced (a cut or a reform, a subsidy removed or a cash transfer added) can change how much support it gets and how people respond to it.": "La forma de anunciar una reforma (un recorte o una reforma, un subsidio retirado o una transferencia añadida) puede cambiar el apoyo que recibe y cómo responde la gente.",
  "In a policy review, an option is flagged for framing when its success depends on how the public hears it, such as a subsidy reform or a new tax. The flag points to Tversky and Kahneman (1981).": "En una revisión de políticas, una opción se señala por encuadre cuando su éxito depende de cómo la recibe el público, como una reforma de subsidios o un impuesto nuevo. La señal remite a Tversky y Kahneman (1981).",
  "Framing changes how people react to a choice, not the facts of it. A different description does not make a costly policy cheaper.": "El encuadre cambia cómo reacciona la gente ante una elección, no los hechos. Otra descripción no abarata una política costosa.",
  "Anchoring": "Anclaje",
  "When people guess a number, they lean towards the first number they saw, even when it has nothing to do with the question. Past prices, an announced target or last year's pay rise can all act as anchors.": "Cuando la gente estima un número, se inclina hacia el primer número que vio, aunque no tenga nada que ver con la pregunta. Los precios pasados, una meta anunciada o la subida salarial del año pasado pueden actuar como anclas.",
  "Inflation targets, wage guidelines and announced prices can work partly as anchors for what households and firms expect. If people trust the anchor, they set prices and wages near it.": "Las metas de inflación, las pautas salariales y los precios anunciados pueden funcionar en parte como anclas de lo que esperan hogares y empresas. Si la gente confía en el ancla, fija precios y salarios cerca de ella.",
  "In a policy review, an option is flagged for anchoring and expectations when it depends on people believing an announced target or path. The flag points to Tversky and Kahneman (1974) and to studies of how firms form inflation expectations, such as Coibion, Gorodnichenko and Kumar (2018).": "En una revisión de políticas, una opción se señala por anclaje y expectativas cuando depende de que la gente crea una meta o trayectoria anunciada. La señal remite a Tversky y Kahneman (1974) y a estudios sobre cómo forman las empresas sus expectativas de inflación, como Coibion, Gorodnichenko y Kumar (2018).",
  "An anchor works only while it is believed. After a long run of missed targets, people may anchor on recent inflation instead.": "Un ancla solo funciona mientras se cree en ella. Tras una larga racha de metas incumplidas, la gente puede anclarse en la inflación reciente.",
  "Loss aversion": "Aversión a las pérdidas",
  "A loss feels worse than a gain of the same size feels good. Losing something people already have hurts more than not getting the same thing in the first place.": "Una pérdida se siente peor de lo bien que se siente una ganancia del mismo tamaño. Perder algo que ya se tiene duele más que no haberlo recibido nunca.",
  "Removing a benefit, a subsidy or a tax break tends to meet much stronger resistance than never having given it. This shapes which reforms survive and how they should be phased in.": "Retirar una prestación, un subsidio o una desgravación suele encontrar mucha más resistencia que no haberlo dado nunca. Esto influye en qué reformas sobreviven y en cómo conviene introducirlas por fases.",
  "In a policy review, an option is flagged for loss aversion when it takes away something people already receive. The flag points to Kahneman and Tversky (1979).": "En una revisión de políticas, una opción se señala por aversión a las pérdidas cuando quita algo que la gente ya recibe. La señal remite a Kahneman y Tversky (1979).",
  "Loss aversion explains resistance; it does not say a reform is wrong. How strong it is varies, and the app shows no built-in size for it.": "La aversión a las pérdidas explica la resistencia; no dice que una reforma sea errónea. Su fuerza varía, y la app no muestra ningún tamaño incorporado para ella.",
  "Precedent finder": "Buscador de precedentes",
  "A list of other countries whose figures in some past year looked like this country's figures now, on the ones you pick (such as government debt, inflation, reserves and the current account), with what happened to their figures in the three years after.": "Una lista de otros países cuyas cifras en algún año pasado se parecían a las cifras actuales de este país, en las que usted elija (como la deuda pública, la inflación, las reservas y la cuenta corriente), con lo que pasó con sus cifras en los tres años siguientes.",
  "Seeing how similar situations played out elsewhere gives a sense of the range of outcomes: some countries grew out of high debt, others slid into a crisis. It helps frame what an option might face.": "Ver cómo se resolvieron situaciones parecidas en otros lugares da una idea del abanico de resultados: algunos países salieron de una deuda alta creciendo, otros cayeron en una crisis. Ayuda a enmarcar lo que podría enfrentar una opción.",
  "The closest countries come first; a distance near 0 means the figures were almost the same, about 1 means one standard deviation apart on average. The last row gives the median of what followed. In Policy review, it sits after Diagnose and is worked out on request from the saved yearly figures.": "Los países más cercanos aparecen primero; una distancia cercana a 0 significa que las cifras eran casi iguales, alrededor de 1 significa una desviación estándar de diferencia en promedio. La última fila da la mediana de lo que pasó después. En Revisión de política, está después de Diagnosticar y se calcula a pedido con las cifras anuales guardadas.",
  "It describes what happened, not what will happen here, and it has not been tested as a signal. Countries differ in many ways the chosen figures leave out. IMF programme data and crisis dates read Missing until their terms are confirmed.": "Describe lo que pasó, no lo que pasará aquí, y no se ha probado como señal. Los países difieren en muchas cosas que las cifras elegidas dejan fuera. Los datos de programas del FMI y las fechas de crisis aparecen como Falta hasta que se confirmen sus términos.",
  "Fiscal rule": "Regla fiscal",
  "A lasting limit on the government's budget, written in law or a treaty: for example a ceiling on debt, a floor under the deficit, or a cap on spending growth.": "Un límite duradero al presupuesto del gobierno, escrito en una ley o un tratado: por ejemplo un tope a la deuda, un piso al déficit o un límite al crecimiento del gasto.",
  "Rules are meant to stop debt from creeping up year after year and to make plans believable. Whether a country is near or past its limit shapes what it can do next.": "Las reglas buscan evitar que la deuda suba año tras año y hacer creíbles los planes. Que un país esté cerca de su límite o lo haya superado condiciona lo que puede hacer después.",
  "The Fiscal rules panel under History & data shows the EU, WAEMU and CEMAC treaty limits with the latest IMF figure and the room left (negative means the limit is missed), and the national rules from the IMF Fiscal Rules Dataset you save, with the year each started.": "El panel Reglas fiscales en Historia y datos muestra los límites de tratado de la UE, la UEMOA y la CEMAC con la última cifra del FMI y el margen que queda (negativo significa que no se cumple el límite), y las reglas nacionales del Fiscal Rules Dataset del FMI que usted guarda, con el año en que empezó cada una.",
  "The treaty bodies test their own figures, which can differ a little from the IMF ones. Many rules have escape clauses for recessions or disasters. National numeric limits are not checked, because the IMF describes them only in text.": "Los organismos de los tratados comprueban sus propias cifras, que pueden diferir un poco de las del FMI. Muchas reglas tienen cláusulas de escape para recesiones o desastres. Los límites numéricos nacionales no se comprueban, porque el FMI solo los describe en texto.",
  "Checks and balances": "Pesos y contrapesos",
  "The people and bodies that can block or delay a government decision: for example a legislature controlled by another party, a second chamber, or coalition partners. The Database of Political Institutions counts them as veto players.": "Las personas y los órganos que pueden bloquear o retrasar una decisión del gobierno: por ejemplo un legislativo controlado por otro partido, una segunda cámara o los socios de coalición. La Database of Political Institutions los cuenta como actores con veto.",
  "The more veto players, the harder a reform is to pass, but also the harder it is to reverse once passed. Fractionalisation and polarisation work the same way: a split, polarised legislature makes deals harder.": "Cuantos más actores con veto, más difícil es aprobar una reforma, pero también más difícil revertirla una vez aprobada. El fraccionamiento y la polarización funcionan igual: un legislativo dividido y polarizado dificulta los acuerdos.",
  "In Policy review, Political feasibility (beside the options) shows the count for the latest year before the As of year, with fractionalisation, polarisation and years left in the term, from the DPI file you save. 1 means no veto player beyond the executive; higher means more.": "En Revisión de políticas, Viabilidad política (junto a las opciones) muestra el recuento del último año anterior al año de referencia, con el fraccionamiento, la polarización y los años que quedan del mandato, del archivo DPI que usted guarda. 1 significa ningún actor con veto aparte del ejecutivo; más alto significa más.",
  "The count is a rough guide from one coding team and is published with a delay (the 2020 edition ends in 2020). It leaves out courts, central banks, street protest and informal power.": "El recuento es una guía aproximada de un solo equipo de codificación y se publica con retraso (la edición de 2020 termina en 2020). Deja fuera los tribunales, los bancos centrales, la protesta en la calle y el poder informal.",
};
