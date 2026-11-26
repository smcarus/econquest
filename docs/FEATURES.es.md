# Funciones y detalles

[English](./FEATURES.md) · **Español** · [Français](./FEATURES.fr.md) · [Português](./FEATURES.pt.md)

Todo lo que hace EconQuest, en detalle: cada tarea y herramienta, los tamaños y requisitos, los
modelos de IA y sus ajustes, los idiomas, los Retos, las fuentes de datos, cómo comprobar las cifras y
la hoja de ruta. La introducción breve y los pasos de instalación están en el
[README](../README.es.md). Esta es una traducción de la [versión en inglés](./FEATURES.md), que es la
de referencia; las órdenes y las notas para desarrolladores solo están en inglés.

## Contenido

- [Qué puede hacer con él](#qué-puede-hacer-con-él)
- [Requisitos y tamaños](#requisitos-y-tamaños)
- [Modelos de IA: cuál usar, tamaños y ajustes](#modelos-de-ia-cuál-usar-tamaños-y-ajustes)
- [Idiomas](#idiomas)
- [Retos (Quests): soluciones económicas entre muchos](#retos-quests-soluciones-económicas-entre-muchos)
- [De dónde vienen los datos](#de-dónde-vienen-los-datos)
- [Cómo puede comprobarlo](#cómo-puede-comprobarlo)
- [Hoja de ruta](#hoja-de-ruta)

---

## Qué puede hacer con él

| Tarea | Dónde | Qué obtiene |
| --- | --- | --- |
| Hacer una pregunta con palabras sencillas | **Espacio de trabajo** (Chat del consejo) | Agentes especializados responden con las cifras de la aplicación, cada uno con su fuente; sin modelo de IA, primero llega una respuesta breve según las reglas declaradas de la aplicación; con un modelo de IA, un agente de síntesis escribe un breve resumen que solo puede citar sus cifras, y un control numérico señala cualquier cifra que no pueda rastrear |
| Preguntar qué haría un cambio | **Espacio de trabajo** (Chat del consejo) | Pregunte «¿qué pasaría con Turquía si la Fed subiera los tipos 1 punto?». La aplicación le muestra el cambio que entendió (puede editar los tamaños y volver a preguntar), el Scenario Agent pone las cifras de hoy junto a las cifras después del cambio, enumera lo que ocurrió en episodios pasados del mismo tipo y lo que hallaron estudios publicados, y la respuesta llega en ocho partes, cada una marcada con el tipo de evidencia en que se apoya |
| Usar el modelo de país del propio Banco Mundial | **Historia y datos > Previsiones del FMI por edición**, y las preguntas «¿y si...?» del Chat del consejo | Para Bolivia, Croacia, Irak, Nepal, Pakistán y Turquía, con el servicio opcional de modelos activado ([guía de instalación](./INSTALL.md#add-the-world-bank-country-models-optional), en inglés): la trayectoria base guardada en el modelo público MFMod del Banco Mundial y *Pruebe un choque en el modelo* (precios mundiales del petróleo o de los alimentos, compras del gobierno, o la tasa de política monetaria donde el modelo la tiene), mostrado como la diferencia con la trayectoria propia del modelo, porque las copias públicas tienen datos antiguos. El Scenario Agent añade la respuesta del modelo a las preguntas sobre petróleo, alimentos y tasa de política monetaria. Una comprobación escrita antes de la ejecución real verifica que la aplicación reproduce los resultados del propio Banco Mundial |
| Estudiar un país | **Investigación > Un país** | Resumen, Mercados y señales, Historia y datos, y Fuentes. Historia y datos muestra el gráfico de la historia y después un menú de herramientas en ocho grupos que se abren de una en una: gráficos de muchos años, estimaciones del presente y previsiones con rangos, brecha del producto, sostenibilidad de la deuda, suficiencia de reservas, reglas de política, alerta temprana de crisis, curva de rendimientos, factores de la inflación, contabilidad del crecimiento, previsiones del FMI por edición y vistas «a una fecha pasada». Para países de menores ingresos: remesas, ayuda recibida, inclusión financiera, precios de materias primas y términos de intercambio, precios de los alimentos y seguridad alimentaria, y desastres naturales. Clima en la capital desde 1981 y en todo el país desde 1901, precios del arroz, el trigo, el maíz y la soja desde 1960, un diseñador de seguros paramétricos (costo de siniestralidad, precio justo, períodos de retorno, riesgo de base), un modelo de pérdidas por desastres y trayectorias de ciclones tropicales. Cómo se maneja la moneda de hecho, activos del banco central y tensión de financiación en dólares. Para administraciones públicas y políticos: credibilidad del presupuesto (cuánto del presupuesto aprobado se gastó, con las bandas de nota PEFA), un seguimiento de la ejecución del presupuesto con su propio archivo, los proyectos del Banco Mundial y a qué ritmo desembolsan, y cifras regionales. Para economistas y operadores: rangos según errores pasados de las previsiones, curvas de rendimiento completas de EE. UU. y la zona del euro, y sorpresas en los datos con un índice de sorpresas de inflación |
| Comparar países | **Investigación > Comparar países** | Su lista de seguimiento lado a lado (los 19 países miembros del G20 al empezar, o los 15 mayores países de ingreso bajo por región), pistas para investigar y dónde discrepan los precios de mercado y los datos |
| Seguir sus posiciones | **Investigación > Mis posiciones** | Una lista de bonos o posiciones que usted carga, frente a los riesgos y las señales |
| Evaluar una decisión de política | **Revisión de políticas** (su propia página en la cabecera) | Un expediente paso a paso: plantear el problema, diagnosticar, ordenar opciones, revisar la evidencia y los precedentes, redactar un memorando de recomendación y un resumen de una página para no economistas, y después seguir lo que ocurrió. Compare el diagnóstico con hasta seis países pares, reciba un aviso en la página de inicio cuando una cifra vigilada cruce su umbral, y vea qué cambió al revisar de nuevo la misma política. El consejo de políticas sopesa una medida (costos y beneficios a tasas de descuento oficiales, quién gana y quién pierde, lo que sigue, escenarios) o lo que un evento significa para un mercado. **Para las personas** convierte una revisión en un resumen sencillo para la ciudadanía: qué cambia, el costo por persona, quién gana y quién paga, y las regiones más rezagadas |
| Probar un «¿y si?» fiscal | **Historia y datos**, o desde el Chat del consejo | Cambie el gasto público o los impuestos y vea el efecto probable en el crecimiento y la deuda, con multiplicadores y elasticidades publicados y un rango |
| Escribir un informe | **Informes** (pestañas: Escribir una nota, Documentos del consejo, Cuadernos, Docencia) | Notas de país y de emisor, evaluaciones de sostenibilidad, revisiones de cartera e informes del consejo, en Markdown o PDF con fuentes y fechas |
| Escribir un documento de trabajo | Gráficos del **Chat del consejo**, **Informes > Cuadernos** | Fije un gráfico en un cuaderno de investigación con la fecha hasta la que llegan sus cifras y una huella de las cifras; descargue el cuaderno como un solo zip (borrador, datos, scripts de Python, R y Stata, archivo de cita); más tarde, *Comprobar que se mantiene* dice si cada cifra sigue igual, se revisó o ya no está |
| Aprender sobre la marcha | Botones de la cabecera, **Menú > Manual de usuario**, **Menú > Ejemplos resueltos** | Cuatro niveles de ayuda (Ayuda desactivada, Ayuda clave, Ayuda completa, Experto), un glosario en lenguaje sencillo, cinco casos resueltos, episodios didácticos y modo examen |
| Usar sus propios datos y pruebas | **Menú > Sus datos**, **Menú > Modelos y validación** | Cargue sus propias series CSV; registre su propia prueba de señal o modelo con las mismas reglas estrictas que las de la aplicación |
| Usar las cifras en R, Python o Stata | [docs/DATA_API.md](./DATA_API.md) (en inglés) | Las mismas series, paneles y tablas que muestran las pantallas, con fuente y fecha en cada valor |
| Conectar un sistema de cartera | **Menú > Configuración > Tokens de API**, [docs/DATA_API.md](./DATA_API.md) (en inglés) | Otro programa lee resúmenes de país y eventos, envía sus posiciones y ejecuta choques y repeticiones de crisis pasadas sobre su cartera, cada uno con un token limitado a lo que usted marque. Los países y valores de la lista de **Nombres ocultos** no aparecen en ninguna parte |

El **Chat del consejo** es el centro de la aplicación. Los agentes son Banco Central, Fiscal y Deuda,
Política y Acontecimientos, Valor Relativo, Divisas, Contagio Global, Calendario, Momento y Finanzas
Conductuales, más un agente de Documentos que lee los documentos de política que usted sube, un agente de gráficos
para gráficos y pruebas, y el **Scenario Agent** para las preguntas «¿y si...?». Si usted tiene su propio
servidor de herramientas de investigación, la **mesa cuantitativa** puede traer a una respuesta del chat
sus backtests y sus cifras de volatilidad y de opciones, cada una con su enlace y la etiqueta
«hipotético» del servidor; está apagada si usted no la configura. **Ejecutar
el consejo completo** envía un país a nueve agentes especializados en tres mesas (geopolítica, crédito
soberano y economía en general); debaten, y la aplicación espera su aprobación antes de escribir el
informe final. Un modelo de IA más grande actúa como **árbitro** y juzga si cada respuesta se ciñe a las
cifras.

Por ahora los agentes entienden mejor las preguntas en inglés; la aplicación lo indica junto al cuadro
de preguntas.

**Todas las cifras, gráficos y pruebas funcionan sin ningún modelo de IA.** La IA solo hace falta para el
resumen del chat, los debates y las explicaciones en lenguaje sencillo, y cada respuesta que escribe se
marca como escrita por IA.

---

## Requisitos y tamaños

| Parte | Mínimo | Recomendado |
| --- | --- | --- |
| Sistema operativo | macOS (las tres versiones más recientes), Windows 10 u 11 (64 bits, WSL 2 para Docker Desktop) o Linux de 64 bits | Lo mismo; Apple Silicon, Intel y AMD funcionan |
| Memoria | 8 GB (4 GB en modo ligero, un objetivo aún no medido) | 16 GB; 32 GB para ejecutar el árbitro grande en el mismo ordenador |
| Disco libre | 5 GB | 10 GB, más espacio para los modelos de IA |
| Internet | Cualquier conexión | Una sin un límite mensual de datos pequeño |
| Node.js (solo desde el código) | 20.19 o posterior, o 22.12 o posterior | 22 |

### Tamaños de descarga

Cada cifra indica cómo se obtuvo. «Medido» significa medido en la fecha indicada; «estimación» indica
el método. Las mediciones del 13 de noviembre de 2026 son de la rama principal hasta la solicitud #510;
la aplicación compilada y los archivos de idioma se midieron de nuevo el 17 de noviembre de 2026, hasta
la solicitud #598.

| Qué | Tamaño | Cómo se obtuvo |
| --- | --- | --- |
| Código fuente (`git clone`) | 70 MB (29 MB de archivos y 41 MB de historial) | Medido, clon nuevo, 13 de noviembre de 2026 |
| Aplicación lista para usar (imagen Docker) | Unos 170 MB de descarga; 798 MB descomprimida | Medido: imagen construida con el Dockerfile del repositorio el 13 de noviembre de 2026 (798 MB descomprimida, 170 MB comprimida con gzip). La descarga del registro se comprime igual, así que el tamaño será parecido |
| Paquetes instalados, desde el código (`npm install`) | 465 MB | Medido, 13 de noviembre de 2026 |
| Aplicación web compilada | 7,75 MB en total; 481 KB comprimidos al arrancar | Medido con `npm run size:check`, 24 de noviembre de 2026, hasta la pull request #677 (límites 520 KB y 9 MB) |
| Cada idioma adicional | Unos 0,85 MB (unos 270 KB comprimidos), solo si se elige | Medido en la compilación, 17 de noviembre de 2026 |
| Primera descarga completa de datos | Unos 3,6 a 3,8 GB, sobre todo archivos de noticias de GDELT | Estimación: GDELT unos 3,4 GB por 8 semanas (según los tamaños publicados por GDELT), ediciones pasadas del FMI unos 100 MB (medido), el resto como la descarga diaria |
| Primera descarga en modo ligero | Objetivo: bastante menos de 1 GB | Aún no medido; pendiente de una prueba en el Mac del desarrollador antes de la publicación |
| Descarga diaria de datos | Aproximadamente 150 a 200 MB (4,5 a 6 GB al mes) | Estimación a partir de respuestas grabadas y tamaños de archivo. La descarga diaria ya registra lo que baja; la cifra medida tras una semana (`npm run go -- status` en el Mac del desarrollador) sustituirá esta estimación |
| Modelos de IA con Ollama (opcional) | qwen2.5:7b 4,7 GB; qwen2.5:14b 9 GB; qwen2.5:32b 20 GB | Tamaños publicados por Ollama |
| Historia larga de GDELT (opcional) | Unos 25 GB desde 2016 (35 GB desde 1979); unos 5 MB se guardan en disco | Tamaños publicados por GDELT |

### Espacio ocupado en funcionamiento

| Configuración | Disco aproximado | Composición |
| --- | --- | --- |
| Modo ligero, sin IA local | Objetivo 2 GB | Aún no medido |
| Aplicación lista para usar, sin IA local | Alrededor de 1 GB, crece unos 40 MB al año | Imagen 0,8 GB (medido) más la carpeta `data/`, unos 150 MB tras los primeros días (medido en el Mac del desarrollador el 9 de noviembre de 2026, 22 países) |
| Con un árbitro de 14B | Alrededor de 15 GB | Lo anterior más qwen2.5:7b y qwen2.5:14b |
| Con toda la IA local | Alrededor de 26 GB | Lo anterior más qwen2.5:7b y qwen2.5:32b |
| Desde el código en lugar de la imagen | Sume unos 0,5 GB | Código e historial 70 MB, paquetes 465 MB, compilación 7,75 MB (medido) |

Docker Desktop necesita además unos GB (consulte docker.com). Para ver el tamaño real en su ordenador,
ejecute `du -sh data data/*` en la carpeta de EconQuest o abra Menú > Datos sin conexión.

---

## Modelos de IA: cuál usar, tamaños y ajustes

La IA escribe el resumen del consejo, dirige el debate, elige los agentes para una pregunta y explica las
cifras. Nunca aporta una cifra: cada número viene de una fuente, una serie oficial o su archivo. Elija el
proveedor en Menú > Configuración > Modelo de IA.

| Proveedor | Coste | Privacidad | Notas |
| --- | --- | --- | --- |
| **Sin IA** | Gratis | Solo salen las peticiones de cifras públicas | Todo funciona; los agentes responden sin resumen escrito |
| **Ollama** en su ordenador | Gratis | Todo se queda en su ordenador | Necesita la [aplicación Ollama](https://ollama.com/download) y memoria suficiente |
| **Google Gemini** | Gratis hasta los límites diarios de Google; después se factura a su propia clave | Las preguntas y sus cifras van a Google | Necesita una clave de API de Gemini; el modelo por defecto es `gemini-3.8-flash`, se cambia con `GEMINI_MODEL` en `.env` |
| **Ollama y luego Gemini** | Como arriba | Como arriba | Primero Ollama; Gemini responde cuando Ollama no lo hace |
| Servidor local compatible con OpenAI (como LM Studio) | Gratis | Se queda en su ordenador | En Configuración avanzada de IA; usted indica la dirección y el modelo |

### Dos papeles: modelo rápido y árbitro

| Papel | Qué hace | Por defecto | Regla |
| --- | --- | --- | --- |
| **Modelo rápido** | Elige los agentes y escribe las respuestas de las mesas | `qwen2.5:7b` (`OLLAMA_QUICK_MODEL`) | Un modelo de 7 a 8B responde en menos de un minuto en la mayoría de los Mac |
| **Árbitro** | Paso final del consejo completo, resúmenes y explicaciones del chat, debate de agentes, paso de Opciones de la revisión de políticas y textos de apertura de los debates de Retos | `qwen2.5:32b` (`OLLAMA_DEEP_MODEL`) | 30B o más cuenta como árbitro completo. Un modelo de 8B o menos nunca se usa como árbitro. Un árbitro de 14B solo se permite si activa **Permitir un árbitro de 14B** (desactivado por defecto), y cada respuesta que juzga indica «Árbitro pequeño» |

### Qué configuración para qué ordenador

| Su ordenador | Configuración recomendada |
| --- | --- |
| Portátil de 4 GB | Modo ligero con una clave de Google Gemini, o sin IA |
| 8 GB | Google Gemini, o sin IA. Un modelo local deja muy poca memoria para la aplicación, Docker y el navegador |
| 16 GB | Ollama `qwen2.5:7b` para las mesas, con «Ollama y luego Gemini» para que Gemini haga de árbitro; o active un árbitro `qwen2.5:14b`, marcado como «Árbitro pequeño» (necesita la mitad de memoria que el de 32B) |
| 32 GB o más, o una tarjeta gráfica de 24 GB | Todo local: `qwen2.5:7b` y `qwen2.5:32b` |

Descargue los modelos una vez con `ollama pull qwen2.5:7b` y `ollama pull qwen2.5:32b` (o con
`npm run go`). En un ordenador sin memoria suficiente o sin chip gráfico, el modelo grande puede tardar
10 minutos o más por informe completo; use Gemini como árbitro o Ollama en una máquina mayor.

### Ajustes que usa la aplicación

Valores actuales del código; los marcados «modificable» están en Menú > Configuración > Modelo de IA >
Configuración avanzada de IA.

| Ajuste | Valor | Por qué |
| --- | --- | --- |
| Temperatura, resumen y explicaciones del chat | 0, con semilla 42 | Las mismas cifras dan la misma respuesta, exactamente con el mismo modelo Ollama y la misma máquina |
| Temperatura, pasos de la revisión de políticas | 0 | Repetir da un resultado lo más parecido posible |
| Temperatura, textos de apertura de debates de Retos | 0, con semilla 42, en el árbitro | Se escriben una vez y se registran con sus ajustes |
| Temperatura, otros pasos (mesas del consejo completo) | 0,2 (modificable, de 0 a 1,5) | Algo de variedad entre mesas |
| Ventana de contexto (`num_ctx` de Ollama) | 8.192 tokens (modificable, de 1.024 a 65.536) | Suficiente para la pregunta, las cifras y las instrucciones |
| Longitud máxima en pasos largos (`num_predict` de Ollama) | 2.048 tokens; 4.096 para modelos de razonamiento | Detiene un modelo que sigue escribiendo relleno |
| Espera por llamada | 16 segundos por paso de mesa y 25 por paso del consejo completo (modificable, de 5 a 180); al menos 120 segundos en pasos del árbitro | Una dirección caída falla rápido; el árbitro tiene tiempo |
| Modelo cargado (`keep_alive` de Ollama) | 30 minutos en pasos largos | La siguiente pregunta no vuelve a cargar un modelo de 20 GB |
| Formato | JSON comprobado con un esquema; nivel de razonamiento de Gemini bajo | La aplicación lee cada campo y comprueba cada cifra con su fuente |

En `.env`: `DEFAULT_AI_PROVIDER` (`ollama` o `gemini`), `OLLAMA_BASE_URL`, `OLLAMA_QUICK_MODEL`,
`OLLAMA_DEEP_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `LIGHT_MODE`.

---

## Idiomas

| Idioma | Estado | Tratamiento |
| --- | --- | --- |
| Inglés | Completo; idioma de origen | |
| Español | Toda la aplicación | *Usted* |
| Francés | Toda la aplicación | *Vous* |
| Portugués de Brasil | Toda la aplicación | *Você* |
| Árabe, suajili | Previstos, sin empezar | |

Todas las pantallas, menús, textos de ayuda, entradas del glosario y ejemplos resueltos están traducidos;
el resumen de política de una página se imprime en los cuatro idiomas. Cambie con el botón **EN / ES /
FR / PT** de la cabecera; la elección se guarda en su navegador. Un idioma solo se descarga cuando se
elige.

Algunas cosas quedan como se escribieron, y la aplicación lo indica: las cifras, los nombres de fuentes y
de series aparecen como los da la fuente; el Chat del consejo y el consejo escriben sus respuestas en el idioma que usted elija (los agentes
siguen entendiendo mejor las preguntas en inglés); las notas de método citan artículos en inglés; algunas frases que las reglas de la
aplicación escriben sobre un país siguen en inglés. Ninguna traducción ha sido revisada todavía por un
hablante nativo; se agradece la ayuda: los pasos y la lista de archivos están en
[docs/TRANSLATION_REVIEW.md](./TRANSLATION_REVIEW.md) (en inglés).

Este README y la guía están en los cuatro idiomas. Los demás documentos están en inglés.

---

## Retos (Quests): soluciones económicas entre muchos

Los Retos convierten preguntas económicas abiertas en un juego público con puntuación en el que
cualquiera puede participar, para que muchas personas trabajen sobre los problemas de un país, pongan a
prueba sus razonamientos con los datos y construyan un historial de quién prevé bien. **Los Retos están
construidos pero desactivados.** Menú > Retos aparece en gris («Aún no disponible») hasta que se marque
cada punto de la lista de [docs/QUESTS.md](./QUESTS.md) y el proyecto sea público. Para probarlos
en su ordenador, añada `QUESTS_ENABLED=on` a `.env` y reinicie.

![Menú > Retos con QUESTS_ENABLED=on: lista de Retos en borrador con su tipo y fecha de resultado](./images/18-quests.png)

**Qué es un Reto.** Un archivo en `quests/` con una pregunta y una regla escrita sobre cómo se resuelve
con las propias fuentes de la aplicación. Hay cuatro tipos:

| Tipo | Ejemplo | Cómo termina |
| --- | --- | --- |
| **Previsión** | «¿Estará el tipo oficial de Turquía más bajo el 30 de junio de 2027 que al cierre de las entradas?» | Se resuelve con la fuente según su regla; cada entrada recibe puntuación |
| **Debate** | «¿Qué reconstruiría con más seguridad las reservas de divisas de Egipto?» | Nunca se puntúa. Se defiende una postura con las cifras de la aplicación; Claim Check compara cada cifra citada con la de la aplicación; al cierre, un mapa de evidencia muestra los argumentos junto a lo que dijeron las cifras |
| **Replicación** | «Reproduzca la estimación de reacción fiscal de Bohn para Brasil» | Cada entrada da la cifra que produjo un script público propio; la reproduce si está dentro de la tolerancia. Una entrada cuidadosa que encuentra un error en la aplicación resuelve el Reto |
| **Señal** | «¿Vuelve en seis semanas un posicionamiento muy concentrado en futuros?» | Se propone una prueba prerregistrada; cada una se ejecuta una sola vez tras el cierre, cuenta en la corrección de Holm junto con todas las demás y recibe una insignia como las de la aplicación |

**Cómo funciona el juego.**

- **En privado o en público.** Guarde una respuesta en privado en su ordenador, practique con datos
  pasados (puntuación inmediata, no se guarda) o participe en público con una solicitud de cambios que
  la aplicación le prepara. Quien esté en un país que GitHub bloquea puede participar por correo a
  través de un responsable.
- **Puntuación frente a una tasa base.** Las previsiones se puntúan con el índice de Brier frente a la
  frecuencia con que el hecho ocurrió en el pasado, y las previsiones numéricas frente a «nada cambia»,
  de modo que la suerte y la copia sirven de poco.
- **Clasificación.** Habilidad con un rango del 90 %, calibración, nitidez, historial frente a la
  multitud, puntos fuertes por área y región, rachas, temporadas por año natural y una tabla histórica.
  Solo se clasifica a alguien tras 12 previsiones resueltas y con una cuenta de GitHub de al menos 90
  días; nadie se clasifica por el número de Retos en que participa. Debates, replicaciones y pruebas se
  listan en la página de cada participante, sin clasificar.
- **Nada se puede cambiar después.** Los Retos aprobados llevan huella digital; los resultados se
  escriben en un registro encadenado por hash que falla si se altera una línea; las disputas se deciden
  en público.
- **Abierto a quien no tiene la aplicación.** Una página pública estática (`npm run quests:board`)
  muestra las tablas, los resultados y la multitud frente a la tasa base, y cada año se puede depositar
  un conjunto de datos abierto con DOI.
- **Reglas que lo mantienen sólido.** Ninguna cifra escrita en un archivo de Reto; los Retos de
  previsión solo se resuelven con fuentes cuyos términos permiten compartir con atribución; las
  preguntas sobre conflictos, disturbios o víctimas solo se plantean como Debates; sin apuestas ni
  premios. Los Retos no son un mercado de apuestas.
- **En el aula.** Los docentes pueden usar Retos con un código de clase y una tabla de clase privada; se
  prevé un piloto de un trimestre con dos profesores.

Hay catorce Retos en borrador en `quests/drafts/`; ninguno está aprobado todavía. Las reglas completas,
los pasos del responsable y la lista de lanzamiento están en [docs/QUESTS.md](./QUESTS.md) (en
inglés).

---

## De dónde vienen los datos

Todas son gratuitas. Algunas necesitan una clave gratuita, que se añade en Menú > Configuración.

| Área | Fuentes |
| --- | --- |
| Crecimiento, deuda, presupuestos, comercio | Banco Mundial (indicadores y estadísticas de deuda), FMI (Perspectivas de la economía mundial y ediciones pasadas, reservas, balanza de pagos, composición de reservas, gasto público por función), OCDE (indicadores adelantados, precios, PIB trimestral, vía DBnomics), precios al consumo mensuales del FMI, Eurostat, UN Comtrade y WITS |
| Tipos de interés y bonos | Curva diaria de rendimientos a la par del Tesoro de EE. UU. y curva de rendimientos de la deuda pública de la zona del euro del BCE (todos los plazos, cada día), BPI (tipos oficiales, títulos de deuda, tipos de cambio reales, activos totales de los bancos centrales, crédito en dólares a los no bancos), líneas de swap en dólares de la Fed de Nueva York, tipos oficiales mensuales del FMI (Estadísticas Monetarias y Financieras) para los países que el BPI no cubre, FRED (rendimientos oficiales a 10 años; clave gratuita), Fed de Nueva York, Tesoro de EE. UU. (tenedores extranjeros, subastas), Tesoro de Brasil, banco central de Perú (diferenciales EMBIG), y rendimientos a 10 años de la OCDE y tipos de cambio H.10 de la Reserva Federal, mensuales desde 1990 vía FRED, para repetir crisis pasadas |
| Divisas y materias primas | Tipos de cambio al contado (open.er-api.com), tipos de referencia del BCE, tipos de cambio mensuales del FMI para monedas sin tipo oficial diario (por ejemplo el naira, el chelín y el cedi), precios de materias primas del Banco Mundial (Pink Sheet; arroz, trigo, maíz y soja desde 1960), precios del petróleo de la EIA (clave gratuita), la clasificación de regímenes cambiarios de Ilzetzki, Reinhart y Rogoff (un libro que usted guarda; los autores piden una cita y no indican licencia) |
| Encuestas y expectativas | Encuestas de empresas y consumidores de la UE (Comisión Europea, vía Eurostat; sustituto gratuito de los PMI de pago, marcado como tal), encuesta de previsores profesionales del BCE, encuesta Focus de Brasil, índice de presión de la cadena de suministro de la Fed de Nueva York; para las sorpresas en los datos, los precios al consumidor de EE. UU. de la BLS y el mercado de IPC de Kalshi tal como se guardó antes de cada publicación |
| Presupuestos, proyectos y regiones | Ejecución presupuestaria del Banco Mundial a partir de las evaluaciones PEFA (meta 16.6.1 de la ONU), proyectos del Banco Mundial y el estado de créditos de la AIF, producción por persona por región de DOSE (Wenz et al. 2023, CC BY 4.0), cifras de Eurostat para las regiones de la UE y el Índice de Desarrollo Humano subnacional de Global Data Lab (un archivo que usted guarda; términos no comerciales). Su propio archivo de gasto mensual para el seguimiento de la ejecución del presupuesto se queda en su ordenador |
| Bancos centrales y calendario | Banco Central do Brasil, Banco de México (token gratuito), fechas oficiales de decisiones (ahora también Kenia, Ghana, Tanzania e India) y metas de inflación, cada una leída en la página del propio banco, fechas de publicación del IPC y del PIB de los institutos de estadística |
| Instituciones y apertura | Indicadores de gobernanza del Banco Mundial (WGI), índice de apertura de la cuenta de capital de Chinn e Ito (se descarga en su ordenador como máximo una vez al mes, se cita a Chinn e Ito 2006 y nunca se reenvía) |
| Política, conflicto y transporte marítimo | Noticias de GDELT, datos de conflicto de UCDP y ACLED (ACLED se descarga a mano), listas de sanciones de la OFAC y la ONU, índice de riesgo geopolítico, IMF PortWatch |
| Mercados y posicionamiento | Mercados de predicción Kalshi y Polymarket, informe Commitments of Traders de la CFTC |
| Países de menores ingresos | Banco Mundial (remesas y su costo de envío, cuentas de Global Findex, ayuda recibida según la publica de nuevo a partir de la OCDE, seguridad alimentaria, peso de las materias primas en el comercio y términos de intercambio); dos archivos que usted guarda: precios al consumidor de FAOSTAT para la inflación de alimentos, y desastres naturales de EM-DAT, descargados con su propia cuenta gratuita de EM-DAT (sus condiciones no permiten que la aplicación los incluya) |
| Clima y amenazas naturales | NASA POWER (temperatura y lluvia mensuales en cada capital desde 1981), Portal de Conocimiento sobre Cambio Climático del Banco Mundial (promedios por país de CRU TS desde 1901, CC BY 4.0), trayectorias de ciclones tropicales IBTrACS de NOAA desde 1980 (se descargan solo cuando usted pulsa el botón, o se leen de un archivo que usted guarda) |

La lista completa está en [docs/DATA_SOURCES.md](./DATA_SOURCES.md) y lo que permite cada fuente en
[docs/DATA_LICENCES.md](./DATA_LICENCES.md) (en inglés).

---

## Cómo puede comprobarlo

- **Cada cifra lleva su fuente y su fecha**, y Menú > Estado de los datos muestra si cada fuente sigue
  llegando y si alguna cifra se ha revisado desde que se mostró.
- **Las señales y los modelos se prueban antes de confiar en ellos.** Cada prueba se escribe y se firma
  *antes* de ejecutarla (prerregistro), usa solo datos disponibles en su momento, cuenta los costes de
  negociación y se comprueba con remuestreo. Los resultados se corrigen por suerte entre todas las
  pruebas (corrección de Holm). Una prueba fallida queda registrada como fallida y nunca se reajusta.
- **Insignias**: Validada, Provisional, En revisión, Retirada o Revisión pendiente. La mayoría de las
  señales no han superado su prueba, y la aplicación lo dice.
- **Un registro de auditoría** guarda qué se preguntó, qué cifras se usaron y quién aprobó un informe.
- **Herramientas de investigación externas** (opcional, apagado por defecto): si usted tiene su propio
  servidor de herramientas de investigación, puede indicar su dirección y su clave en **Menú > Configuración >
  Herramientas de investigación**. En el chat del Consejo, la **mesa cuantitativa** responde entonces a
  preguntas sobre backtests, previsiones, volatilidad, nowcasts, precios de opciones, caídas máximas o
  ratios de Sharpe, y muestra cada cifra con su enlace, la fecha de sus datos y la etiqueta del servidor
  (resultado hipotético sobre datos pasados, no una recomendación). Cada llamada queda en el registro de
  auditoría, nunca la clave ([docs/RESEARCH_TOOLS.md](./RESEARCH_TOOLS.md), en inglés).

El método completo está en [docs/METHODOLOGY.md](./METHODOLOGY.md) (en inglés).

---

## Hoja de ruta

Situación al 26 de noviembre de 2026 (detalle en [docs/ROADMAP.md](./ROADMAP.md), en inglés):

**Hecho**

1. **Citas, mantenimiento y comentarios**: «Citar» en cada gráfico, tabla y respuesta, una revisión de
   tamaño, un control mensual de las fuentes y el contraste de revisiones de políticas pasadas con lo
   que ocurrió.
2. **Las cifras que necesita un terminal completo**: desigualdad, ingresos tributarios y aranceles,
   deuda de países de bajos ingresos, población, comercio y estructura de la deuda, clima, salarios y
   precios de la vivienda, balances sectoriales, actividad mensual, y cifras de la zona del euro y del
   Reino Unido tal como se publicaron por primera vez (los ingresos por estado son un segundo paso que
   espera un control de cobertura).
3. **Herramientas de análisis y de política**: alerta temprana de crisis, sostenibilidad externa,
   curva de rendimientos, factores de la inflación, contabilidad del crecimiento, una calculadora de
   reestructuración, finanzas conductuales y una revisión de políticas más completa con precedentes,
   reglas fiscales, viabilidad política, un gráfico de compensaciones y un resumen de una página.
4. **Datos para países de menores ingresos** (adelantados el 13 de noviembre): remesas, inclusión
   financiera, precios de materias primas y términos de intercambio, ayuda recibida, precios de los
   alimentos y desastres naturales.
5. **Herramientas para la revisión de políticas** (adelantadas el 13 de noviembre): comparación con
   pares, avisos en la página de inicio y comparación de una revisión con la anterior.
6. **Conexión con otros sistemas** (13 de noviembre): tokens de API, eventos y webhooks, vigilancias de
   indicadores, resúmenes de país, posiciones enviadas desde fuera, nombres ocultos, escenarios y
   repeticiones de crisis, un registro de auditoría sellado, una guía de despliegue e inicio de sesión
   con OpenID Connect.
7. **Idiomas y enseñanza**: toda la aplicación en portugués y cuatro ejemplos resueltos.
8. **Datos de mercados y financiación** (adelantados el 14 de noviembre): cómo se maneja la moneda de
   hecho (régimen cambiario), los balances de los bancos centrales y la tensión de financiación en
   dólares (crédito en dólares del BPI y líneas de swap de la Reserva Federal). Los controles de
   capital ya los cubre el índice de Chinn e Ito.
9. **Consejo de políticas** (14 de noviembre): dentro de una revisión de políticas, sopesar una medida
   con costos y beneficios, quién gana y quién pierde, efectos de segundo orden y escenarios, o sopesar
   lo que un evento significa para la moneda o los bonos del gobierno; el consejo ordena las opciones
   frente a ella y el resumen de una página recoge el resultado.
10. **Clima y seguros** (14 de noviembre): clima en la capital y en todo el país, precios de alimentos
    desde 1960, un diseñador de disparadores de seguros paramétricos con costo de siniestralidad,
    precio justo, períodos de retorno y riesgo de base, un modelo de pérdidas por desastres con EM-DAT
    y trayectorias de ciclones tropicales.
11. **Preguntas desde otro programa y páginas más ordenadas** (15 y 16 de noviembre): otro programa puede
    hacer una pregunta al Chat del consejo con un token `ask:council`; Informes en pestañas, e Historia
    y datos como el gráfico más un menú de herramientas, de una en una.
12. **Preguntas «¿y si...?»** (17 de noviembre): el Chat del consejo lee el cambio que plantea una
    pregunta, el Scenario Agent pone las cifras de hoy junto a las cifras después del cambio con lo que
    muestran la historia y la investigación publicada, la respuesta llega en ocho partes y los tamaños
    se pueden editar para volver a preguntar.
13. **Cinco perfiles de usuario** (17 de noviembre): para administraciones públicas, credibilidad y
    ejecución del presupuesto y proyectos del Banco Mundial; para políticos, cifras regionales y un
    resumen sencillo para la ciudadanía; para investigadores, un paquete de documento de trabajo y una
    comprobación de replicación; para economistas, rangos según errores pasados de las previsiones; para
    operadores, curvas de rendimiento completas, sorpresas en los datos y un índice de sorpresas de
    inflación.
14. **Herramientas de investigación externas** (17 de noviembre): el Chat del consejo puede llamar a un
    servidor de herramientas de investigación que usted ejecuta, a través de la mesa cuantitativa;
    apagado por defecto.
15. **Mejor cobertura de los países de ingreso bajo** (17 de noviembre): los países que usted añade
    (Investigación > Un país > Añadir un país) se guardan en la descarga diaria como los incluidos, con
    historia, vistas "a una fecha" y alertas; una lista de seguimiento **Países de ingreso bajo** con
    los 15 mayores por región (India, Pakistán, Nigeria, Bangladés, Etiopía, Egipto, Filipinas,
    RD del Congo, Vietnam, Tanzania, Kenia, Myanmar, Uganda, Ghana y Bolivia); tipos de cambio y tipos
    oficiales mensuales del FMI donde no hay dato diario ni del BPI, que también usan las previsiones
    inmediatas y previsiones de inflación y la previsión del tipo oficial; y metas de inflación y
    fechas de decisión leídas en las páginas de los propios bancos.
16. **Mejoras rápidas tras la comparación con otras plataformas** (23 de noviembre): las hojas de
    cálculo se actualizan desde la aplicación (un asistente de Power Query para Excel y un script para
    Google Sheets); previsiones oficiales lado a lado (el FMI, el Banco Mundial y la OCDE, con la
    diferencia entre ellas) en Historia y datos; y días de publicación, en los que la aplicación vuelve
    a leer cada hora las fuentes de IPC y de actividad mensual hasta que llega el nuevo mes, en Hoy.

17. **Cerrar las brechas con las plataformas líderes** (23 de noviembre): previsiones escritas antes
    de que existan las cifras y puntuadas cada mes; una búsqueda en todos los catálogos gratuitos
    (Menú > Buscar datos); VAR bayesianos y estructurales en el Agente de gráficos; un modelo pequeño
    de economía abierta estimado y probado antes de mostrarse; cifras en tiempo real para los 38
    miembros de la OCDE; documentos oficiales y discursos de bancos centrales por país; un informe de
    país sin conexión, un laboratorio macro y un ejemplo resuelto sobre materias primas; comentarios
    y enlaces de solo lectura en un servidor doméstico; precios en vivo de su propia cuenta de
    Interactive Brokers, solo en pantalla; respuestas del consejo en español, francés o portugués;
    metas de inflación y fechas de decisión para más países de ingreso bajo; un proceso de revisión
    de las traducciones por hablantes nativos; y cómo se propagan los choques entre economías (un VAR
    global pequeño con ponderaciones comerciales del FMI). El marco de deuda de los países de ingreso
    bajo espera su nota de orientación de 2027.
18. **Métodos de previsión y el historial de aciertos** (19 a 23 de noviembre): volatilidad cambiaria
    GARCH, estimaciones del trimestre en curso con ridge, lasso, bosque aleatorio y factor dinámico,
    ARIMA, bandas de crecimiento por cuantiles, la prueba KPSS, pruebas con las cifras tal como se
    publicaron por primera vez y la prueba del cuadro de riesgo país. Hay 39 pruebas registradas: 11
    superadas, 8 de ellas siguen en pie al contar el número de pruebas. Los veredictos se copian de
    ejecuciones reales con `npm run track-record:import`, nunca a mano.
19. **Un primer uso más fácil** (24 de noviembre): una tarjeta de inicio en tres pasos; una respuesta
    breve arriba en el Chat del consejo cuando ningún modelo de IA la escribe; una lista de Falta más
    corta y más espacio para la respuesta; Revisión de políticas como página propia junto a Informes; y
    el botón de ayuda como una lista de los cuatro niveles.
20. **Se recupera sola** (24 de noviembre): actualizaciones que no se detienen por archivos que escribe
    la propia aplicación; las fuentes lentas u ocupadas se consultan de nuevo antes de darlas por
    fallidas; un segundo intento para las descargas fallidas al final de la descarga diaria y más
    intentos pasadas dos horas; y la última respuesta buena, con sus propias fechas, mientras una fuente
    no responde.
21. **Funciones habituales de una aplicación** (24 de noviembre): una página de privacidad
    ([docs/PRIVACY.md](./PRIVACY.md), en inglés), un aviso cuando sale una versión nueva, Copiar
    los detalles e Informar de un problema, una pregunta antes de borrar una lista de seguimiento,
    seguir el modo claro u oscuro de la computadora, los pasos para quitar la aplicación y atajos de
    teclado.
22. **Revisión para la publicación y los países más pobres** (25 de noviembre): una segunda revisión
    de seguridad y una política de seguridad más estricta para las páginas de la aplicación compilada;
    Añadir un país muestra todos los países, no solo los del mapa del mundo; los 59 países de la lista
    de deuda de bajos ingresos del FMI y del Banco Mundial (Malawi, Sierra Leona, Haití, Nepal, los
    pequeños estados insulares y otros) están en todas las listas de países y la descarga diaria los
    guarda en cuanto están en una lista de seguimiento; y la comprobación automática en Windows pasa.
23. **Los modelos de país del Banco Mundial** (26 de noviembre): los modelos macrofiscales que el Banco
    Mundial publica para Bolivia, Croacia, Irak, Nepal, Pakistán y Turquía se ejecutan en su
    computadora mediante un servicio opcional; su trayectoria base y los cálculos con un choque en
    Historia y datos y en las respuestas «¿y si...?»; y una comprobación prerregistrada de que la
    aplicación reproduce los resultados del propio Banco Mundial, que pasó en la computadora del
    desarrollador el 26 de noviembre.
24. **Compilaciones más seguras y accesibilidad** (26 de noviembre): cada paso de compilación y cada
    imagen base fijados a una versión concreta; análisis del código y una puntuación de buenas
    prácticas cuando el repositorio sea público; listas de componentes, sumas de comprobación y una
    prueba de compilación firmada con cada versión; accesibilidad comprobada con WCAG 2.2 y un repaso
    con el teclado; se respeta el ajuste «reducir movimiento» del ordenador; y una declaración de
    accesibilidad ([docs/ACCESSIBILITY.md](./ACCESSIBILITY.md), en inglés).

**Siguiente**

- **La publicación** en e-conquest/econquest. El modo ligero, las dos revisiones de seguridad y la
  comprobación automática en Windows están hechos; faltan un primer arranque por una persona en un
  ordenador con Windows, una medición del modo ligero y una última exportación pública.
- **El punto de control 1**, unas cuatro semanas después de la publicación, es la única revisión antes
  de planificar más trabajo. El uso real decide lo que viene después; no se añaden funciones nuevas
  antes.

**En espera**

- **Retos en el aula**: el plan está completo (13 cambios pequeños y luego un piloto de un trimestre
  con dos profesores); la construcción empieza cuando el responsable del proyecto lo indique.
- **Árabe y suajili**: previstos, en pausa por decisión del responsable del proyecto.
- **La aplicación para el teléfono**: en pausa hasta después de la publicación.
- **Comprobaciones en el ordenador del responsable**: algunas fuentes (clima, trayectorias de
  tormentas, activos del banco central, financiación en dólares, el archivo de régimen cambiario) están
  construidas y probadas con respuestas guardadas, pero no se pudieron alcanzar desde la máquina de
  compilación; `npm run check:data` en un ordenador que llegue a ellas confirma cada una. Las fuentes de
  los cinco perfiles de usuario respondieron allí el 17 de noviembre. Los tipos de cambio, tipos
  oficiales y tipos del mercado local mensuales del FMI respondieron allí el 18 y el 19 de noviembre.
  Las previsiones oficiales, las ediciones en tiempo real de la OCDE y la búsqueda en catálogos (filas
  `wb_gep`, `oecd_eo`, `oecd_rtd` y `catalogues`) esperan su primera prueba allí. La mesa cuantitativa espera una
  primera prueba con un servidor real de herramientas de investigación, y las sorpresas en los datos
  necesitan unas semanas de descargas diarias para acumularse.
