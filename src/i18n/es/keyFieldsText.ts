/**
 * Spanish for the keys and settings listed in Menu > Settings (src/data/apiKeyFields.ts), swapped at
 * display time by translateText. Product names, menus of other sites and example values stay as
 * they are, because the reader has to find them in English on those sites.
 */
export const KEY_FIELDS_ES: Record<string, string> = {
  'FRED API key': 'Clave de API de FRED',
  '10-year government bond yields for the US, Mexico, South Africa, Japan, the UK, Poland and Chile, through the official FRED API.':
    'Rendimientos de los bonos del Estado a 10 años de EE. UU., México, Sudáfrica, Japón, el Reino Unido, Polonia y Chile, mediante la API oficial de FRED.',
  'Without a key the app reads the same yields from the FRED download, which needs no key but is less steady.':
    'Sin clave, la app lee los mismos rendimientos de la descarga de FRED, que no necesita clave pero es menos estable.',
  'Free. Sign in at fred.stlouisfed.org, then My Account > API Keys > Request API Key.':
    'Gratis. Inicie sesión en fred.stlouisfed.org y luego vaya a My Account > API Keys > Request API Key.',
  'US EIA API key': 'Clave de API de la EIA de EE. UU.',
  'Daily Brent and WTI spot oil prices, used in the commodity and Hormuz spillover lines.':
    'Precios diarios al contado del petróleo Brent y WTI, usados en las líneas de materias primas y de contagio de Ormuz.',
  'Without a key oil prices come monthly from the World Bank Pink Sheet.':
    'Sin clave, los precios del petróleo llegan cada mes desde el Pink Sheet del Banco Mundial.',
  'Free. Register at eia.gov/opendata with your email; the key arrives by email.':
    'Gratis. Regístrese en eia.gov/opendata con su correo; la clave llega por correo electrónico.',
  'UN Comtrade subscription key': 'Clave de suscripción de UN Comtrade',
  'Trade partner shares (China, Taiwan, Russia, Gulf) and export mix, used on the Country tab and in the spillover scenarios.':
    'Cuotas de socios comerciales (China, Taiwán, Rusia, el Golfo) y composición de las exportaciones, usadas en la pestaña País y en los escenarios de contagio.',
  'Without a key the app uses the public preview, which answers but allows few requests.':
    'Sin clave, la app usa la vista previa pública, que responde pero permite pocas consultas.',
  'Free. Sign in at comtradeplus.un.org, then My Comtrade > My API portal, subscribe to "comtrade - v1" and copy the primary key.':
    'Gratis. Inicie sesión en comtradeplus.un.org, luego vaya a My Comtrade > My API portal, suscríbase a "comtrade - v1" y copie la clave principal.',
  'Turkey central bank (EVDS) API key': 'Clave de API del banco central de Turquía (EVDS)',
  "Turkey's monthly inflation from the central bank (months fresher than the OECD mirror), and Turkey's 10-year government bond yield once the 10Y series code below is set too.":
    'La inflación mensual de Turquía del banco central (meses más reciente que la copia de la OCDE) y el rendimiento del bono del Estado turco a 10 años cuando también se indique abajo el código de la serie a 10 años.',
  "Without it Turkey's 10Y yield reads Missing and Turkey's inflation stays on the OECD series.":
    'Sin ella, el rendimiento a 10 años de Turquía aparece como Falta y la inflación de Turquía sigue con la serie de la OCDE.',
  'Free. Register at evds3.tcmb.gov.tr, sign in, then open your profile and copy the API key.':
    'Gratis. Regístrese en evds3.tcmb.gov.tr, inicie sesión, abra su perfil y copie la clave de API.',
  'Turkey 10Y series code (EVDS)': 'Código de la serie a 10 años de Turquía (EVDS)',
  'Which EVDS series holds the 10-year bond yield. Not secret, shown in full.':
    'Qué serie de EVDS contiene el rendimiento del bono a 10 años. No es secreto, se muestra completo.',
  "Without it Turkey's 10Y yield reads Missing, even with a key.":
    'Sin él, el rendimiento a 10 años de Turquía aparece como Falta, incluso con clave.',
  'Signed in to EVDS, find the 10-year government bond yield series and copy its code (it starts with "TP.").':
    'Con la sesión iniciada en EVDS, busque la serie del rendimiento del bono del Estado a 10 años y copie su código (empieza por "TP.").',
  'Turkey CPI index series code (EVDS, optional)': 'Código de la serie del índice de precios de Turquía (EVDS, opcional)',
  'Which EVDS series holds the monthly consumer price index (an index, not a % change). Leave empty to use TP.FG.J0. Not secret, shown in full.':
    'Qué serie de EVDS contiene el índice de precios al consumo mensual (un índice, no una variación en %). Déjelo vacío para usar TP.FG.J0. No es secreto, se muestra completo.',
  'Empty: the app reads TP.FG.J0. If that series has stopped, Turkey keeps the OECD inflation series.':
    'Vacío: la app lee TP.FG.J0. Si esa serie se ha interrumpido, Turquía sigue con la serie de inflación de la OCDE.',
  'Only if TP.FG.J0 has stopped: signed in to EVDS, find the consumer price index (general) series and copy its code (it starts with "TP.").':
    'Solo si TP.FG.J0 se ha interrumpido: con la sesión iniciada en EVDS, busque la serie del índice de precios al consumo (general) y copie su código (empieza por "TP.").',
  'TP.FG.J0 (used when empty)': 'TP.FG.J0 (se usa si está vacío)',
  'Banco de México (Banxico) token': 'Token del Banco de México (Banxico)',
  "Mexico's monthly inflation (INPC over 12 months) straight from the central bank, months fresher than the OECD mirror.":
    'La inflación mensual de México (INPC a 12 meses) directamente del banco central, meses más reciente que la copia de la OCDE.',
  'Without a token Mexico keeps the OECD inflation series, which lags five to six months.':
    'Sin token, México sigue con la serie de inflación de la OCDE, que llega con cinco o seis meses de retraso.',
  'Free. Open the token page, accept the terms, solve the check and copy the token it shows (64 letters and digits).':
    'Gratis. Abra la página del token, acepte las condiciones, resuelva la comprobación y copie el token que aparece (64 letras y cifras).',
  'ACLED account email': 'Correo de la cuenta de ACLED',
  'Conflict events (battles, violence against civilians, explosions, riots, protests) for each country over twelve months, for the Politics & Events Agent and the Sources tab. Needs the ACLED password below as well. Not secret, shown in full.':
    'Eventos de conflicto (batallas, violencia contra civiles, explosiones, disturbios, protestas) de cada país en doce meses, para el Agente de Política y Eventos y la pestaña Fuentes. También necesita la contraseña de ACLED de abajo. No es secreto, se muestra completo.',
  'Without an ACLED account the conflict figures read Missing.': 'Sin una cuenta de ACLED, las cifras de conflicto aparecen como Falta.',
  "Free for non-commercial use. Register a myACLED account. API access needs the Research level: a public email (gmail.com and similar) gets the Open level, which has no API; ask ACLED's access team to move your account.":
    'Gratis para uso no comercial. Registre una cuenta myACLED. El acceso a la API necesita el nivel Research: un correo público (gmail.com y similares) recibe el nivel Open, que no tiene API; pida al equipo de acceso de ACLED que cambie su cuenta.',
  'ACLED account password': 'Contraseña de la cuenta de ACLED',
  'Used only to ask ACLED for a 24-hour access token. Never written to backups, the audit log, logs or exports.':
    'Solo se usa para pedir a ACLED un token de acceso de 24 horas. Nunca se escribe en copias de seguridad, el registro de auditoría, los registros ni las exportaciones.',
  'Without it the conflict figures read Missing, even with the email set.':
    'Sin ella, las cifras de conflicto aparecen como Falta, incluso con el correo indicado.',
  'The password of your myACLED account.': 'La contraseña de su cuenta myACLED.',
  'Your 5Y CDS source': 'Su fuente de CDS a 5 años',
  '5-year sovereign CDS on the watchlist, MarketEdge and the Country tab. No free source of CDS exists, so the app shows only quotes from your own file or your own LSEG account, labelled with whose data they are.':
    'CDS soberanos a 5 años en la lista de seguimiento, MarketEdge y la pestaña País. No existe una fuente gratuita de CDS, así que la app solo muestra cotizaciones de su propio archivo o de su propia cuenta de LSEG, indicando de quién son los datos.',
  'Off: CDS reads Missing.': 'Desactivado: los CDS aparecen como Falta.',
  'Pick a file you export yourself (Bloomberg, LSEG, S&P) or your LSEG Data Platform account, then fill in the settings for it below.':
    'Elija un archivo que exporte usted mismo (Bloomberg, LSEG, S&P) o su cuenta de LSEG Data Platform y luego complete abajo sus ajustes.',
  'Off': 'Desactivado',
  'My CSV file': 'Mi archivo CSV',
  'My LSEG account': 'Mi cuenta de LSEG',
  'CDS file path (for "My CSV file")': 'Ruta del archivo de CDS (para "Mi archivo CSV")',
  'Full path to your CSV with columns iso3,date,cds5y_bps,source. The latest date per country is used.':
    'Ruta completa de su CSV con las columnas iso3,date,cds5y_bps,source. Se usa la fecha más reciente de cada país.',
  'Needed when the CDS source is My CSV file.': 'Necesaria cuando la fuente de CDS es Mi archivo CSV.',
  "Under Docker the app sees the project folder's data/local as /app/data/local, so put the file there and enter /app/data/local/cds.csv.":
    'Con Docker, la app ve la carpeta data/local del proyecto como /app/data/local, así que ponga el archivo ahí e introduzca /app/data/local/cds.csv.',
  'LSEG app key (for "My LSEG account")': 'Clave de aplicación de LSEG (para "Mi cuenta de LSEG")',
  'Used with your LSEG user name and password to price the CDS RICs below.':
    'Se usa con su usuario y contraseña de LSEG para valorar los RIC de CDS de abajo.',
  'Needed when the CDS source is My LSEG account.': 'Necesaria cuando la fuente de CDS es Mi cuenta de LSEG.',
  'In LSEG Workspace, open the App Key Generator and create a key for your machine account.':
    'En LSEG Workspace, abra App Key Generator y cree una clave para su cuenta de máquina.',
  'LSEG user name': 'Usuario de LSEG',
  'Your LSEG machine ID or user name.': 'Su ID de máquina o usuario de LSEG.',
  'The machine ID or user name LSEG gave you for API access.': 'El ID de máquina o usuario que LSEG le dio para acceder a la API.',
  'Machine ID or user name': 'ID de máquina o usuario',
  'LSEG password': 'Contraseña de LSEG',
  'Sent only to LSEG to sign in. Never shown, logged or put in the connection check.':
    'Solo se envía a LSEG para iniciar sesión. Nunca se muestra, se registra ni se incluye en la comprobación de conexión.',
  'The password for the user name above.': 'La contraseña del usuario de arriba.',
  'Your LSEG password': 'Su contraseña de LSEG',
  'LSEG CDS RICs': 'RIC de CDS de LSEG',
  'Which RIC holds the 5Y CDS for each country, as BRA=<ric>,TUR=<ric>. They depend on your entitlement, so none are built in.':
    'Qué RIC contiene el CDS a 5 años de cada país, en la forma BRA=<ric>,TUR=<ric>. Dependen de su suscripción, así que no viene ninguno incluido.',
  "Find each country's 5Y sovereign CDS RIC in Workspace and list them separated by commas.":
    'Busque en Workspace el RIC del CDS soberano a 5 años de cada país y escríbalos separados por comas.',
  'Google Gemini API key': 'Clave de API de Google Gemini',
  'The council summary, agent debate replies and agent choice when the AI model is Gemini or hybrid. The key goes only to Google.':
    'El resumen del consejo, las respuestas del debate de agentes y la elección de agentes cuando el modelo de IA es Gemini o híbrido. La clave solo se envía a Google.',
  "Without it use Ollama or a local server under AI model; the app's figures do not need an AI model.":
    'Sin ella, use Ollama o un servidor local en Modelo de IA; las cifras de la app no necesitan un modelo de IA.',
  'Open the Gemini API key page, sign in with a Google account, then create an API key.':
    'Abra la página de claves de API de Gemini, inicie sesión con una cuenta de Google y cree una clave de API.',
  'Webhook address': 'Dirección del webhook',
  'Where the server posts a short message when the nightly data check finds a source that broke, a scheduled job fails, or a backtest that passed fails.':
    'Donde el servidor publica un mensaje breve cuando la comprobación nocturna de datos encuentra una fuente que dejó de funcionar, falla una tarea programada o falla un backtest que había pasado.',
  'Without it (and without email below) no alert is sent; Menu > Data health still shows everything.':
    'Sin ella (y sin el correo de abajo) no se envía ninguna alerta; Menú > Estado de los datos sigue mostrándolo todo.',
  'In Slack: create an app, turn on Incoming Webhooks and copy the address. In Discord: Channel settings > Integrations > Webhooks. The address works like a password, so it is kept masked.':
    'En Slack: cree una app, active Incoming Webhooks y copie la dirección. En Discord: Channel settings > Integrations > Webhooks. La dirección funciona como una contraseña, así que se mantiene oculta.',
  'Mail server for alert emails': 'Servidor de correo para las alertas',
  'The mail server that sends alert emails, as smtps://user:password@host:465 (or smtp://…:587). It holds a password, so it is kept masked.':
    'El servidor de correo que envía las alertas, en la forma smtps://user:password@host:465 (o smtp://…:587). Contiene una contraseña, así que se mantiene oculto.',
  'Without it no alert email is sent.': 'Sin él no se envía ningún correo de alerta.',
  'Gmail: turn on 2-step verification, make an app password, then use smtps://you%40gmail.com:APP-PASSWORD@smtp.gmail.com:465 (write @ in the user name as %40).':
    'Gmail: active la verificación en dos pasos, cree una contraseña de aplicación y use smtps://you%40gmail.com:APP-PASSWORD@smtp.gmail.com:465 (escriba la @ del usuario como %40).',
  'Send alert emails to': 'Enviar los correos de alerta a',
  'Who gets alert emails: one address, or several separated by commas.': 'Quién recibe los correos de alerta: una dirección o varias separadas por comas.',
  'Any address you read.': 'Cualquier dirección que usted lea.',
  'Alert emails come from': 'Remitente de los correos de alerta',
  'The sender address on alert emails. Optional: without it the user name in the mail server address is used when it is an email address.':
    'La dirección del remitente de los correos de alerta. Opcional: sin ella se usa el usuario de la dirección del servidor de correo cuando es una dirección de correo.',
  'Many mail servers only accept their own account as the sender.': 'Muchos servidores de correo solo aceptan su propia cuenta como remitente.',
  'Usually the same account as the mail server.': 'Normalmente la misma cuenta que el servidor de correo.',
  // Morning brief: when it runs next (utils/morningBrief.ts nextRunText)
  'Tomorrow at {time} ({zone})': 'Mañana a las {time} ({zone})',
  'Today at {time} ({zone})': 'Hoy a las {time} ({zone})',
  'Due now, then daily at {time} ({zone})': 'Pendiente ahora, luego cada día a las {time} ({zone})',
  // Backup files (utils/backup.ts parseBackup)
  'That file is not a backup from this app (it is not JSON).': 'Ese archivo no es una copia de seguridad de esta app (no es JSON).',
  'That file is not a backup from this app.': 'Ese archivo no es una copia de seguridad de esta app.',
  'That backup was made by a newer version of the app. Update the app, then restore it.': 'Esa copia la hizo una versión más reciente de la app. Actualice la app y luego restáurela.',
};
