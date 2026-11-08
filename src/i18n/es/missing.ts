/**
 * Spanish for the reasons a figure shows as Missing (src/utils/liveFigures.ts and the helpers it
 * calls). These stay English at the source, because they also go into notes and the council's
 * prompts; the screen swaps in the Spanish when Spanish is chosen (translateText in ../lang.ts).
 * Keyed by the exact English text: tests/i18n.test.ts checks every reason the app can give is here.
 * Not yet checked by a native speaker.
 */
export const MISSING_ES: Record<string, string> = {
  'Needs setup': 'Por configurar',
  'CDS prices (the market cost of insuring against a government default) are sold by data vendors; no free source publishes them, and the app does not guess. If you have a licence, connect your own CDS under Menu > Settings > Your own paid data (a CSV file or your LSEG account).':
    'Los precios de los CDS (lo que cuesta en el mercado asegurarse contra un impago del gobierno) los venden proveedores de datos; ninguna fuente gratuita los publica y la aplicación no los adivina. Si tienes una licencia, conecta tus propios CDS en Menú > Configuración > Tus datos de pago (un archivo CSV o tu cuenta de LSEG).',
  'BCRP did not answer': 'El BCRP no respondió',
  "This spread (the extra interest the government pays on its US dollar bonds over US government bonds) is republished monthly, free, by the central bank of Peru's data service (BCRPData), which did not answer this time. Press Refresh now, or download it for offline use under Menu > Offline data.":
    'Este diferencial (el interés adicional que paga el gobierno por sus bonos en dólares frente a los bonos del gobierno de EE. UU.) lo republica cada mes, gratis, el servicio de datos del banco central de Perú (BCRPData), que esta vez no respondió. Pulsa Actualizar ahora o descárgalo para usarlo sin conexión en Menú > Datos sin conexión.',
  'No free source': 'Sin fuente gratuita',
  'No free official source publishes this spread for this country. The spread (the extra interest the government pays on its US dollar bonds over US government bonds) is published free only for eight Latin American countries, by the central bank of Peru: Argentina, Brazil, Chile, Colombia, Ecuador, Mexico, Peru and Venezuela. For other countries it is sold by data vendors, so the app shows Missing.':
    'Ninguna fuente oficial gratuita publica este diferencial para este país. El diferencial (el interés adicional que paga el gobierno por sus bonos en dólares frente a los bonos del gobierno de EE. UU.) solo se publica gratis para ocho países de América Latina, a cargo del banco central de Perú: Argentina, Brasil, Chile, Colombia, Ecuador, México, Perú y Venezuela. Para los demás países lo venden proveedores de datos, así que la aplicación muestra Falta.',
  'Feed did not answer': 'La fuente no respondió',
  "The 10-year government bond yield comes from an official source (FRED, the US Federal Reserve's free data service, which republishes OECD figures), and it did not answer this time. This is usually temporary. Press Refresh now under Research > One country to try again. A free FRED key under Menu > Settings gives a steadier connection.":
    'El rendimiento del bono del gobierno a 10 años viene de una fuente oficial (FRED, el servicio de datos gratuito de la Reserva Federal de EE. UU., que republica cifras de la OCDE), y esta vez no respondió. Suele ser algo pasajero. Pulsa Actualizar ahora en Investigación > Un país para volver a intentarlo. Una clave gratuita de FRED en Menú > Configuración da una conexión más estable.',
  'Needs EVDS key': 'Necesita clave de EVDS',
  "Turkey's 10-year government bond yield comes from EVDS, the central bank of Turkey's free data service, which needs a free key. Add the key and the 10Y series code under Menu > Settings > Data API keys, or in .env.":
    'El rendimiento del bono del gobierno de Turquía a 10 años viene de EVDS, el servicio de datos gratuito del banco central de Turquía, que necesita una clave gratuita. Añade la clave y el código de la serie a 10 años en Menú > Configuración > Claves de API de datos, o en .env.',
  'No source yet': 'Todavía sin fuente',
  "No free official source of this country's 10-year government bond yield is connected yet, and the app does not estimate one. If you have the official figures (for example from the central bank or finance ministry website), upload them as a yields file.":
    'Todavía no hay conectada ninguna fuente oficial gratuita del rendimiento del bono a 10 años de este país, y la aplicación no lo estima. Si tienes las cifras oficiales (por ejemplo, de la web del banco central o del ministerio de finanzas), súbelas como archivo de rendimientos.',
  'IMF did not answer': 'El FMI no respondió',
  "This figure comes from the International Monetary Fund's free World Economic Outlook data, which did not answer this time. This is usually temporary. Press Refresh now under Research > One country to try again. If it keeps happening, check the internet connection under Menu > Tools > Data connections.":
    'Esta cifra viene de los datos gratuitos de Perspectivas de la Economía Mundial del Fondo Monetario Internacional, que esta vez no respondieron. Suele ser algo pasajero. Pulsa Actualizar ahora en Investigación > Un país para volver a intentarlo. Si sigue pasando, revisa la conexión a internet en Menú > Herramientas > Conexiones de datos.',
  'World Bank did not answer': 'El Banco Mundial no respondió',
  "This figure comes from the World Bank's free development data, which did not answer this time. This is usually temporary. Press Refresh now under Research > One country to try again. If it keeps happening, check the internet connection under Menu > Tools > Data connections.":
    'Esta cifra viene de los datos de desarrollo gratuitos del Banco Mundial, que esta vez no respondieron. Suele ser algo pasajero. Pulsa Actualizar ahora en Investigación > Un país para volver a intentarlo. Si sigue pasando, revisa la conexión a internet en Menú > Herramientas > Conexiones de datos.',
  "Inflation comes from the International Monetary Fund's free World Economic Outlook data, which did not answer this time. This is usually temporary. Press Refresh now under Research > One country to try again.":
    'La inflación viene de los datos gratuitos de Perspectivas de la Economía Mundial del Fondo Monetario Internacional, que esta vez no respondieron. Suele ser algo pasajero. Pulsa Actualizar ahora en Investigación > Un país para volver a intentarlo.',
  'BIS did not answer': 'El BPI no respondió',
  'Policy rates come from the Bank for International Settlements (BIS) free data service, which did not answer this time. This is usually temporary. Press Refresh now under Research > One country to try again. If it keeps happening, check Menu > Tools > Data connections.':
    'Las tasas de política vienen del servicio de datos gratuito del Banco de Pagos Internacionales (BPI), que esta vez no respondió. Suele ser algo pasajero. Pulsa Actualizar ahora en Investigación > Un país para volver a intentarlo. Si sigue pasando, revisa Menú > Herramientas > Conexiones de datos.',
  'Not in BIS policy rates': 'No está en las tasas del BPI',
  "Policy rates come from the Bank for International Settlements (BIS, the bank that central banks use), which collects them from about 40 central banks. This country is not one of them, so the app has no official figure. You can add the central bank's published rate through a data connector.":
    'Las tasas de política vienen del Banco de Pagos Internacionales (BPI, el banco que usan los bancos centrales), que las reúne de unos 40 bancos centrales. Este país no es uno de ellos, así que la aplicación no tiene una cifra oficial. Puedes añadir la tasa publicada por el banco central mediante un conector de datos.',
  'Not pulled yet': 'Todavía no se descarga',
  "Policy rates come from the Bank for International Settlements (BIS, the bank that central banks use). The BIS does publish this country's central bank rate, but the app does not download it yet: the app's tests of interest-rate signals were set up in advance on a fixed list of countries, and adding countries to that download would change those tests after the fact. You can add the central bank's published rate yourself through a data connector.":
    'Las tasas de política vienen del Banco de Pagos Internacionales (BPI, el banco que usan los bancos centrales). El BPI sí publica la tasa del banco central de este país, pero la aplicación todavía no la descarga: las pruebas de señales de tipos de interés de la aplicación se fijaron de antemano sobre una lista cerrada de países, y añadir países a esa descarga cambiaría esas pruebas a posteriori. Puedes añadir tú mismo la tasa publicada por el banco central mediante un conector de datos.',
  'OECD publishes no CLI': 'La OCDE no publica el indicador',
  'The OECD answered, but publishes no composite leading indicator for this country.':
    'La OCDE respondió, pero no publica un indicador compuesto adelantado para este país.',
  'DBnomics did not answer': 'DBnomics no respondió',
  'DBnomics (the free mirror the app reads OECD data from) did not answer yet; the app asks again within the hour.':
    'DBnomics (la copia gratuita desde la que la aplicación lee los datos de la OCDE) todavía no respondió; la aplicación vuelve a preguntar antes de una hora.',
};
