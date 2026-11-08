/**
 * Spanish for the text the brief panels build from the data (src/utils/countryNotes.ts,
 * bankerNote.ts, officialNote.ts, marketsMacro.ts): panel titles, figure names, the short source
 * or reason under a figure, the reasons behind "Why missing?", the "What it means" lines and a
 * few whole sentences. The English stays at the source, because notes and the council read it;
 * the screen swaps in the Spanish (translateText in ../lang.ts).
 *
 * A key with {name} in it is a pattern: {name} stands for whatever the app put there (a country,
 * a number, a source) and is copied into the Spanish unchanged. Source names, calendar event
 * titles and the observations with figures in them stay English for now.
 * tests/i18n.test.ts checks every title, figure name, reason and meaning the panels give is here.
 * Not yet checked by a native speaker.
 */
export const BRIEF_TEXT_ES: Record<string, string> = {
  // Panel titles.
  'Growth and inflation': 'Crecimiento e inflación',
  'Monetary policy': 'Política monetaria',
  'Fiscal and debt': 'Finanzas públicas y deuda',
  'External position': 'Posición externa',
  'Market access': 'Acceso al mercado',
  'Financing need': 'Necesidad de financiación',
  'Execution window, next 60 days': 'Ventana de emisión, próximos 60 días',
  'Peers by 10Y yield': 'Pares por rendimiento a 10 años',
  'Debt path': 'Trayectoria de la deuda',
  'Projection to 2031, % of GDP': 'Proyección hasta 2031, % del PIB',
  'External sustainability': 'Sostenibilidad externa',
  'Macro now': 'Macro ahora',
  'Policy rate and inflation target': 'Tasa de política y meta de inflación',
  'Reserves and balance of payments (IMF)': 'Reservas y balanza de pagos (FMI)',
  'World reserve currencies (IMF COFER, quarterly)': 'Monedas de reserva mundiales (COFER del FMI, trimestral)',
  'Market pricing': 'Precios de mercado',
  'Central Bank Watcher Agent': 'Agente observador del banco central',
  'Relative Value Agent': 'Agente de valor relativo',
  'OECD inflation (monthly)': 'Inflación de la OCDE (mensual)',
  'OECD leading indicator (monthly)': 'Indicador adelantado de la OCDE (mensual)',
  'Cycle clock': 'Reloj del ciclo',
  'Shock early warning': 'Alerta temprana de choques',
  'Signal track record': 'Historial de las señales',
  'Futures positioning (CFTC, weekly)': 'Posicionamiento en futuros (CFTC, semanal)',
  'US Treasury holdings (TIC, monthly)': 'Tenencias de bonos del Tesoro de EE. UU. (TIC, mensual)',
  'Trade partners (UN Comtrade, annual)': 'Socios comerciales (UN Comtrade, anual)',
  'FX Valuation Agent': 'Agente de valoración cambiaria',
  'Global Spillover Agent': 'Agente de contagio global',

  // Figure names.
  'Real GDP growth': 'Crecimiento real del PIB',
  'CPI inflation': 'Inflación del IPC',
  'Unemployment rate': 'Tasa de desempleo',
  'Policy rate': 'Tasa de política',
  'Real policy rate': 'Tasa de política real',
  'Next rate decision': 'Próxima decisión de tipos',
  'Next CPI release': 'Próxima publicación del IPC',
  'Debt / GDP': 'Deuda / PIB',
  'Debt / GDP, 2027 forecast': 'Deuda / PIB, previsión para 2027',
  'Primary balance': 'Saldo primario',
  'Overall balance': 'Saldo total',
  'Net interest paid': 'Intereses netos pagados',
  Revenue: 'Ingresos',
  Expenditure: 'Gasto',
  'Balance that keeps debt stable': 'Saldo que mantiene estable la deuda',
  '10Y government yield': 'Rendimiento del bono del gobierno a 10 años',
  'Current account': 'Cuenta corriente',
  'Current account, US dollars': 'Cuenta corriente, en dólares de EE. UU.',
  'FX reserves': 'Reservas de divisas',
  'External debt': 'Deuda externa',
  '5Y CDS': 'CDS a 5 años',
  '2s10s curve slope': 'Pendiente de la curva 2 a 10 años',
  'Credit rating': 'Calificación crediticia',
  'Government external debt due, next 12 months': 'Deuda externa del gobierno que vence en los próximos 12 meses',
  'Full maturity profile, incl. domestic debt': 'Perfil completo de vencimientos, incluida la deuda interna',
  Peers: 'Pares',
  'Real interest rate, r minus g, stabilising balance': 'Tipo de interés real, r menos g, saldo estabilizador',
  'Projection and stress tests': 'Proyección y pruebas de estrés',
  'Reserves / short-term external debt': 'Reservas / deuda externa a corto plazo',
  'Inflation target': 'Meta de inflación',
  'Official reserves': 'Reservas oficiales',
  'Reserves in months of imports': 'Reservas en meses de importaciones',
  'Currency shares of world FX reserves': 'Peso de cada moneda en las reservas mundiales de divisas',
  'US 10Y Treasury': 'Bono del Tesoro de EE. UU. a 10 años',
  'Spot FX ({currency} per USD)': 'Tipo de cambio al contado ({currency} por USD)',
  'Real exchange rate vs 10-year average': 'Tipo de cambio real frente a su media de 10 años',
  'FX volatility against USD, 3 months': 'Volatilidad cambiaria frente al USD, 3 meses',
  'Inflation against target': 'Inflación frente a la meta',
  'Real 10Y yield': 'Rendimiento real a 10 años',
  'Reserve cover': 'Cobertura de reservas',
  'Carry over US per unit of FX volatility': 'Diferencial de tipos sobre EE. UU. por unidad de volatilidad cambiaria',
  'CPI inflation, y/y (latest month)': 'Inflación del IPC, interanual (último mes)',
  'Leading indicator (100 = long-term average)': 'Indicador adelantado (100 = media de largo plazo)',
  'Policy cycle': 'Ciclo de política monetaria',
  'Business cycle (leading indicator)': 'Ciclo económico (indicador adelantado)',
  'Policy rate against a Taylor rule': 'Tasa de política frente a una regla de Taylor',
  'Leading-indicator turn, then a policy move': 'Giro del indicador adelantado y luego un movimiento de tipos',
  'Crowded positioning, then an unwind': 'Posicionamiento saturado y luego un deshacer de posiciones',
  'Leveraged funds net, share of open interest': 'Posición neta de fondos apalancados, parte del interés abierto',
  'Asset managers net, share of open interest': 'Posición neta de gestoras de activos, parte del interés abierto',
  'Holdings of US Treasuries': 'Tenencias de bonos del Tesoro de EE. UU.',
  'Exports to China, Taiwan, Russia, the Gulf': 'Exportaciones a China, Taiwán, Rusia y el Golfo',
  'Leveraged funds against their last 3 years': 'Fondos apalancados frente a sus últimos 3 años',
  'US Treasury holdings trend': 'Tendencia de las tenencias de bonos del Tesoro de EE. UU.',
  'Growth cycle phase': 'Fase del ciclo de crecimiento',
  'Strait of Hormuz closed': 'Estrecho de Ormuz cerrado',
  'Taiwan Strait crisis': 'Crisis en el estrecho de Taiwán',
  'Russia escalation': 'Escalada de Rusia',
  'Commodity prices, last 12 months': 'Precios de materias primas, últimos 12 meses',
  'Official events': 'Eventos oficiales',

  // Values that are words.
  Missing: 'Falta',
  'not on file': 'no registrado',
  'none on file': 'ninguno registrado',

  // Short source or reason under a figure (source names stay as they are).
  'Needs a policy rate': 'Necesita una tasa de política',
  'Needs a live primary balance': 'Necesita un saldo primario en vivo',
  'Needs a live overall balance': 'Necesita un saldo total en vivo',
  'Needs live debt/GDP': 'Necesita deuda/PIB en vivo',
  'Needs live inputs': 'Necesita datos en vivo',
  'Needs live inflation': 'Necesita inflación en vivo',
  'Needs IMF monthly reserves and four quarters of IMF BOP imports': 'Necesita las reservas mensuales del FMI y cuatro trimestres de importaciones de la balanza de pagos del FMI',
  'Needs the BIS policy-rate history': 'Necesita la serie de tasas de política del BPI',
  'Needs the OECD leading indicator': 'Necesita el indicador adelantado de la OCDE',
  'Needs the live watchlist row': 'Necesita la fila en vivo de la lista de seguimiento',
  'Needs a year or more of CFTC reports': 'Necesita un año o más de informes de la CFTC',
  'Needs two months of the OECD leading indicator': 'Necesita dos meses del indicador adelantado de la OCDE',
  'Needs FX volatility and fed funds': 'Necesita la volatilidad cambiaria y la tasa de fondos federales',
  'Needs a CFTC-reported currency future': 'Necesita un futuro de divisa que publique la CFTC',
  'Needs an inflation target': 'Necesita una meta de inflación',
  'Needs an official 10Y yield': 'Necesita un rendimiento oficial a 10 años',
  'Needs live official 10Y yield': 'Necesita el rendimiento oficial a 10 años en vivo',
  'Needs 13 months of TIC holdings for this country': 'Necesita 13 meses de tenencias TIC de este país',
  'QEDS did not answer': 'QEDS no respondió',
  'IMF COFER did not answer': 'COFER del FMI no respondió',
  'FRED did not answer': 'FRED no respondió',
  'FX feed did not answer': 'La fuente cambiaria no respondió',
  'CFTC did not answer': 'La CFTC no respondió',
  'Comtrade did not answer': 'Comtrade no respondió',
  'GDELT did not answer': 'GDELT no respondió',
  'Trade figures did not answer': 'Las cifras de comercio no respondieron',
  'No ECB rate': 'Sin tipo del BCE',
  'Not in IMF data': 'No está en los datos del FMI',
  'live feed': 'fuente en vivo',
  'live FX feed': 'fuente cambiaria en vivo',
  'model, from figures above': 'modelo, a partir de las cifras de arriba',
  'official calendar': 'calendario oficial',
  'no official schedule loaded': 'no hay calendario oficial cargado',
  'official calendar: {source}': 'calendario oficial: {source}',
  '{source} stated target': 'meta declarada por {source}',
  '{source} published target, not re-checked': 'meta publicada por {source}, sin volver a comprobar',

  // Why a figure is missing ("Why missing?").
  'Needs the average interest rate on government debt, which no connected source provides yet.':
    'Necesita el tipo de interés medio de la deuda del gobierno, que todavía no da ninguna fuente conectada.',
  'Needs official 2-year and 10-year yields, which are not connected yet.': 'Necesita los rendimientos oficiales a 2 y 10 años, que todavía no están conectados.',
  'Needs a ratings feed (licensed); AI estimates are not used.': 'Necesita una fuente de calificaciones (con licencia); no se usan estimaciones de IA.',
  'The free World Bank QEDS feed did not answer, or does not cover this country. Press Refresh now under Research > One country.':
    'La fuente gratuita QEDS del Banco Mundial no respondió o no cubre este país. Pulse Actualizar ahora en Investigación > Un país.',
  'Needs a debt management office feed or your own file; not connected yet.':
    'Necesita una fuente de la oficina de gestión de la deuda o su propio archivo; todavía no está conectada.',
  'No watchlist country has an official 10Y yield yet.': 'Ningún país de la lista de seguimiento tiene todavía un rendimiento oficial a 10 años.',
  'Needs short-term external debt, which no connected source provides yet.': 'Necesita la deuda externa a corto plazo, que todavía no da ninguna fuente conectada.',
  'The free IMF data API (api.imf.org) did not answer, or the pull has not run yet. Press Refresh now under Research > One country, or run npm run check:data.':
    'La API gratuita de datos del FMI (api.imf.org) no respondió, o la descarga todavía no se ha hecho. Pulse Actualizar ahora en Investigación > Un país, o ejecute npm run check:data.',
  'The free IMF data API (api.imf.org) did not answer, or COFER could not be read. Run npm run check:data for the reason.':
    'La API gratuita de datos del FMI (api.imf.org) no respondió, o no se pudo leer COFER. Ejecute npm run check:data para ver el motivo.',
  'The free FRED feed did not answer. Press Refresh now under Research > One country, or add a free FRED key under Menu > Settings.':
    'La fuente gratuita FRED no respondió. Pulse Actualizar ahora en Investigación > Un país, o añada una clave gratuita de FRED en Menú > Configuración.',
  'The exchange rate comes from a free daily exchange-rate service, which did not answer this time. This is usually temporary. Press Refresh now under Research > One country to try again.':
    'El tipo de cambio viene de un servicio diario gratuito de tipos de cambio, que esta vez no respondió. Suele ser algo pasajero. Pulse Actualizar ahora en Investigación > Un país para volver a intentarlo.',
  'The free BIS feed did not answer, or does not cover this currency. Press Refresh now under Research > One country.':
    'La fuente gratuita del BPI no respondió o no cubre esta moneda. Pulse Actualizar ahora en Investigación > Un país.',
  'The ECB publishes no reference rate for this currency, or the feed did not answer.': 'El BCE no publica un tipo de referencia para esta moneda, o la fuente no respondió.',
  'Worked out from live inflation, which is missing.': 'Se calcula a partir de la inflación en vivo, que falta.',
  'Worked out from a policy rate, which is missing.': 'Se calcula a partir de una tasa de política, que falta.',
  'Worked out from an official 10Y yield, which is missing.': 'Se calcula a partir de un rendimiento oficial a 10 años, que falta.',
  'Worked out from IMF monthly reserves and four quarters of IMF BOP imports, which is missing.':
    'Se calcula a partir de las reservas mensuales del FMI y cuatro trimestres de importaciones de la balanza de pagos del FMI, que faltan.',
  'Worked out from the BIS monthly policy-rate series, which is missing for this country.': 'Se calcula a partir de la serie mensual de tasas de política del BPI, que falta para este país.',
  'Worked out from the OECD composite leading indicator, which is missing for this country.': 'Se calcula a partir del indicador compuesto adelantado de la OCDE, que falta para este país.',
  "The rule needs the BIS policy rate, live inflation and the central bank's own target; missing: the live watchlist row.":
    'La regla necesita la tasa de política del BPI, la inflación en vivo y la meta del propio banco central; falta: la fila en vivo de la lista de seguimiento.',
  "The checks read the live figures on this country's watchlist row.": 'Las comprobaciones leen las cifras en vivo de la fila de este país en la lista de seguimiento.',
  'Needs an OECD leading-indicator turn with 6 months of BIS policy-rate history after it.':
    'Necesita un giro del indicador adelantado de la OCDE con 6 meses de tasas de política del BPI después.',
  'Needs a CFTC currency future with a year or more of weekly reports and at least one crowded episode.':
    'Necesita un futuro de divisa de la CFTC con un año o más de informes semanales y al menos un episodio de posicionamiento saturado.',
  'The free CFTC feed did not answer, or has no recent report for this future. Positions come out on Friday for the Tuesday before.':
    'La fuente gratuita de la CFTC no respondió o no tiene un informe reciente de este futuro. Las posiciones se publican el viernes con datos del martes anterior.',
  'Treasury names only its largest foreign holders (about 20); this country is in "All Other", or the TIC file did not answer.':
    'El Tesoro solo nombra a sus mayores tenedores extranjeros (unos 20); este país está en «All Other» (todos los demás), o el archivo TIC no respondió.',
  'Treasury names only its largest foreign holders (about 20); this country is in "All Other".':
    'El Tesoro solo nombra a sus mayores tenedores extranjeros (unos 20); este país está en «All Other» (todos los demás).',
  'The free Comtrade preview did not answer (it allows few requests), or this country has not reported the last two years. A free key (Menu > Settings, or COMTRADE_API_KEY) gives higher limits.':
    'La vista previa gratuita de Comtrade no respondió (permite pocas consultas), o este país no ha informado de los dos últimos años. Una clave gratuita (Menú > Configuración, o COMTRADE_API_KEY) da límites más altos.',
  'Worked out from a year or more of CFTC reports, which is missing.': 'Se calcula a partir de un año o más de informes de la CFTC, que faltan.',
  'Worked out from 13 months of TIC holdings for this country, which is missing.': 'Se calcula a partir de 13 meses de tenencias TIC de este país, que faltan.',
  'Worked out from two months of the OECD leading indicator, which is missing.': 'Se calcula a partir de dos meses del indicador adelantado de la OCDE, que faltan.',
  'Worked out from FX volatility and fed funds, which is missing.': 'Se calcula a partir de la volatilidad cambiaria y la tasa de fondos federales, que faltan.',
  'A needed figure did not load: World Bank or WITS trade shares, or for commodity prices the UN Comtrade export mix and the World Bank Pink Sheet. Press Refresh now under Research > One country.':
    'No se cargó una cifra necesaria: las cuotas de comercio del Banco Mundial o de WITS, o, para los precios de materias primas, la composición de exportaciones de UN Comtrade y el Pink Sheet del Banco Mundial. Pulse Actualizar ahora en Investigación > Un país.',
  'The International Monetary Fund answered, but has not published this figure for this country. This happens for some small economies, for countries in crisis or conflict, and for figures the IMF stopped estimating. The app leaves it Missing rather than fill the gap.':
    'El Fondo Monetario Internacional respondió, pero no ha publicado esta cifra para este país. Pasa con algunas economías pequeñas, con países en crisis o en conflicto y con cifras que el FMI dejó de estimar. La aplicación la deja como Falta en lugar de rellenar el hueco.',
  'The CFTC reports no futures market for this currency, so there is no free weekly positioning figure.':
    'La CFTC no informa de ningún mercado de futuros para esta moneda, así que no hay una cifra semanal gratuita de posicionamiento.',
  'Worked out from a CFTC-reported currency future, which is missing.': 'Se calcula a partir de un futuro de divisa que publica la CFTC, que falta.',
  'No official inflation target on file for this country.': 'No hay ninguna meta oficial de inflación registrada para este país.',
  'No rate decision date on file in the official calendar for this country.': 'No hay ninguna fecha de decisión de tipos registrada en el calendario oficial de este país.',
  'Worked out from an inflation target, which is missing.': 'Se calcula a partir de una meta de inflación, que falta.',

  // "What it means" lines.
  'Fast growth usually brings more jobs and tax revenue.': 'Un crecimiento rápido suele traer más empleo y más recaudación.',
  'That is a steady pace: enough to add jobs and income, but not a boom.': 'Es un ritmo constante: basta para sumar empleo e ingresos, pero no es un auge.',
  'Slow growth adds few jobs and little tax revenue, so living standards and the budget improve slowly.':
    'Un crecimiento lento suma poco empleo y poca recaudación, así que el nivel de vida y el presupuesto mejoran despacio.',
  'The economy is shrinking, which usually means job losses and falling tax revenue.': 'La economía se está contrayendo, lo que suele significar pérdida de empleo y menos recaudación.',
  'Borrowing is expensive once rising prices are allowed for, which slows lending and spending, usually brings inflation down and tends to support the currency.':
    'Pedir prestado sale caro una vez descontada la subida de precios, lo que frena el crédito y el gasto, suele bajar la inflación y tiende a sostener la moneda.',
  'Borrowing costs a little more than prices rise, a gentle brake on spending.': 'Pedir prestado cuesta algo más de lo que suben los precios, un freno suave al gasto.',
  'Borrowing costs less than prices rise, which supports spending but leaves savers losing ground and can let inflation persist.':
    'Pedir prestado cuesta menos de lo que suben los precios, lo que apoya el gasto pero hace perder terreno a los ahorradores y puede dejar que la inflación persista.',
  "That is above the 70% level at which the IMF looks more closely at emerging economies' debt; who holds the debt and at what interest rate matters as much as the level.":
    'Está por encima del 70 %, el nivel a partir del cual el FMI mira con más atención la deuda de las economías emergentes; quién tiene la deuda y a qué tipo de interés importa tanto como el nivel.',
  "That is below the 70% level at which the IMF looks more closely at emerging economies' debt; who holds the debt and at what interest rate matters as much as the level.":
    'Está por debajo del 70 %, el nivel a partir del cual el FMI mira con más atención la deuda de las economías emergentes; quién tiene la deuda y a qué tipo de interés importa tanto como el nivel.',
  'The government borrows even before paying interest on its debt, which adds to the debt each year.':
    'El gobierno pide prestado incluso antes de pagar los intereses de su deuda, lo que aumenta la deuda cada año.',
  'Taxes and other revenue cover spending before interest, so the government is not adding to its debt except to pay interest.':
    'Los impuestos y otros ingresos cubren el gasto antes de intereses, así que el gobierno no aumenta su deuda salvo para pagar intereses.',

  // Whole sentences.
  '{n} of {total} figures for {country} are missing, because their source is not connected or did not answer. They read Missing, and no built-in or estimated value is shown in their place. Tap "Why missing?" on any of them for the reason and what would fill it.':
    'Faltan {n} de {total} cifras de {country}, porque su fuente no está conectada o no respondió. Figuran como Falta, y en su lugar no se muestra ningún valor incorporado ni estimado. Pulse «¿Por qué falta?» en cualquiera de ellas para ver el motivo y qué la completaría.',
  '{country}: no live economic figures yet.': '{country}: todavía no hay cifras económicas en vivo.',
  '{country}: not enough live figures for an issuer reading yet.': '{country}: todavía no hay suficientes cifras en vivo para una lectura del emisor.',
  '{country}: no sustainability reading until the missing figures are live.': '{country}: no hay lectura de sostenibilidad hasta que las cifras que faltan estén en vivo.',
  '{country}: no live market or macro figures yet.': '{country}: todavía no hay cifras de mercado ni macroeconómicas en vivo.',
  '{country}: debt is {debt} of GDP; no sustainability reading until the missing figures are live.':
    '{country}: la deuda es el {debt} del PIB; no hay lectura de sostenibilidad hasta que las cifras que faltan estén en vivo.',
  '{country}: inflation {cpi}.': '{country}: inflación del {cpi}.',
  '{country}: inflation {cpi} against a {target} target.': '{country}: inflación del {cpi} frente a una meta del {target}.',
  "Recent US Treasury auctions": "Subastas recientes del Tesoro de EE. UU.",
  "Treasury auctions": "Subastas del Tesoro",
  "US Treasury Fiscal Data not saved yet": "Fiscal Data del Tesoro de EE. UU. aún no guardado",
  "The auctions come from the free US Treasury Fiscal Data API and are saved by the daily download (Menu > Offline data > Download all country data, or npm run go -- daily). Nothing is shown until that copy exists.": "Las subastas proceden de la API gratuita Fiscal Data del Tesoro de EE. UU. y se guardan con la descarga diaria (Menú > Datos sin conexión > Descargar los datos de todos los países, o npm run go -- daily). No se muestra nada hasta que exista esa copia.",
  "13-week bill": "letra a 13 semanas",
  "26-week bill": "letra a 26 semanas",
  "2-year note": "nota a 2 años",
  "5-year note": "nota a 5 años",
  "10-year note": "nota a 10 años",
  "30-year bond": "bono a 30 años",
  "{tenor} auction, {date}": "subasta de {tenor}, {date}",
  "{tenor} auction (reopening), {date}": "subasta de {tenor} (reapertura), {date}",
  "bid-to-cover {btc}": "cobertura {btc}",
  "bid-to-cover {btc}, high yield {y}": "cobertura {btc}, rendimiento máximo {y}",
  "bid-to-cover {btc}, indirect {ind}": "cobertura {btc}, indirectos {ind}",
  "bid-to-cover {btc}, high yield {y}, indirect {ind}": "cobertura {btc}, rendimiento máximo {y}, indirectos {ind}",
  "demand in line with recent auctions": "demanda en línea con las subastas recientes",
  "demand stronger than recent auctions": "demanda más fuerte que en las subastas recientes",
  "demand weaker than recent auctions": "demanda más débil que en las subastas recientes",
  "Treasury auction bid-to-cover, {tenor}": "Cobertura en subastas del Tesoro, {tenor}",
  "Treasury auction high yield, {tenor}": "Rendimiento máximo en subastas del Tesoro, {tenor}",
  "US Treasury Fiscal Data has not answered yet": "Fiscal Data del Tesoro de EE. UU. aún no ha respondido",
  "No held auction of this term in the reply": "No hay ninguna subasta celebrada de este plazo en la respuesta",
  "No high yield published for this term": "No se publica rendimiento máximo para este plazo",
  "One point per auction, reopenings included: dollars bid for each dollar sold. Higher means more demand.": "Un punto por subasta, reaperturas incluidas: dólares ofrecidos por cada dólar vendido. Más alto significa más demanda.",
  "One point per auction: the high investment rate (bond-equivalent yield) the bill sold at.": "Un punto por subasta: la tasa de inversión máxima (rendimiento equivalente a bono) a la que se vendió la letra.",
  "One point per auction, reopenings included: the highest yield accepted, which every winning bidder receives.": "Un punto por subasta, reaperturas incluidas: el rendimiento más alto aceptado, que recibe cada postor ganador.",
};
