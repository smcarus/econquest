# Enseñar con EconQuest

**Versión 1.0, 28 de noviembre de 2026.** Con licencia [CC BY 4.0](../LICENSE-docs.md).

Una guía para docentes que quieren usar los retos de EconQuest con una clase: pronósticos y debates
sobre datos económicos reales, que se califican cuando llegan los datos. Cubre un periodo completo,
desde la instalación hasta el final de la clase. Nada de esto exige programar. Cada paso nombra el
botón que debe pulsar.

También en [English](./TEACHING.md) y [Français](./TEACHING.fr.md). Para el personal de informática
del centro hay un resumen de una página: [SCHOOL_IT.md](./SCHOOL_IT.md) (en inglés). La descripción
completa de cada función de clase está en [QUESTS.md](./QUESTS.md#classes-quests-in-the-classroom)
(en inglés).

## Qué obtiene una clase

- **Preguntas sobre datos reales.** Un reto de pronóstico pregunta, por ejemplo: «¿Estará el Brent
  más alto el 29 de enero que al cerrar las respuestas?». Los estudiantes responden con una
  probabilidad (70 %) o con un número. Al llegar la fecha, la aplicación lee la respuesta en la serie
  oficial y la califica. Nadie, tampoco el docente, puede cambiar el resultado.
- **Debates.** Un reto de debate tiene de dos a cuatro posiciones. Cada estudiante elige una y la
  argumenta. Los debates se argumentan; no se califican con números.
- **Un historial que enseña calibración.** Cada estudiante ve con qué frecuencia se cumplieron sus
  respuestas de 70 % y si superó la tasa base. Quien dice 70 % debería acertar unas 7 veces de 10.
- **Ninguna cifra inventada.** Cada cifra viene de una fuente pública. Si una fuente no responde, la
  aplicación dice «Falta» y explica por qué; nunca rellena el hueco.
- **Califica el docente.** La aplicación da cifras (participación, exactitud, calibración). Nunca
  pone una nota por sí sola.

Un buen pronóstico puede resultar errado y uno descuidado puede acertar. Las pantallas lo recuerdan
donde aparecen resultados. Califique el razonamiento además del resultado.

## Antes del periodo

### 1. Elija dónde funciona la aplicación

EconQuest funciona en un solo computador: su portátil o un servidor del centro. Los estudiantes la
abren en un navegador corriente en la misma red; no se instala nada en sus equipos. Un portátil
modesto atiende a una clase de 40: en la prueba de carga (`npm run class:load`) cada paso para 40
estudiantes respondió en alrededor de un segundo, con la aplicación limitada a dos núcleos. Mantenga
el computador encendido y despierto durante la clase.

Envíe [SCHOOL_IT.md](./SCHOOL_IT.md) al personal de informática. Indica el puerto que usan los
estudiantes (3000), que no hay que abrir nada hacia internet y qué se guarda.

### 2. Prepárela para la clase

Después de instalar la aplicación ([INSTALL.md](./INSTALL.md)), ejecute una vez, en su carpeta:

```
npm run class:setup -- --until 2027-05-07 --admin sunombre
```

Ponga el último día del periodo después de `--until`. Esto:

- activa las clases y abre la aplicación a la red del centro;
- crea su cuenta de administrador (la contraseña se muestra una vez; cámbiela en Menú > Cuenta);
- mantiene esta versión hasta el último día del periodo, para que nada cambie durante el curso;
- muestra la dirección que abren los estudiantes, por ejemplo `http://192.168.1.20:3000`.

Después inicie la aplicación como siempre (`npm run go` en un Mac, `npm run dev` en cualquier
computador). Añada `--local` para probarla primero solo en su computador.

¿Prefiere no usar la línea de órdenes? En el computador donde se ejecuta la aplicación, cree su
cuenta de administrador en **Menú > Cuenta** (una contraseña de al menos 12 caracteres que no contenga
su nombre de usuario) y luego elija *Activado* para las clases en **Menú > Configuración > Retos y
clases**. Ambos cambios son inmediatos. Los estudiantes en otros equipos solo pueden llegar a la
aplicación cuando está abierta a la red del centro (`HOST="0.0.0.0"` en `.env`, vea
[HOME_SERVER.md](./HOME_SERVER.md)), algo que `npm run class:setup` hace por usted.

### 3. Cree la clase

Inicie sesión, abra **Menú > Retos** y elija la pestaña **Clases**.

1. En *Crear una clase*, indique un nombre («Macro 101»), la zona horaria de la clase, el nombre del
   periodo y su primer y último día. Pulse *Crear la clase*.
2. La tarjeta de la clase muestra un **código de acceso** de ocho caracteres, como `K7QM-P3XD`.
3. Añada estudiantes de una de dos maneras:
   - **Cuentas de estudiante:** pegue una lista de apodos (uno por línea) en *Crear cuentas de
     estudiante* y pulse *Crear las cuentas*. Cada contraseña se muestra una vez: repártalas, y cada
     estudiante cambia la suya en Menú > Cuenta. Los apodos evitan guardar nombres reales si lo
     prefiere.
   - **Código de acceso:** quien ya tiene cuenta inicia sesión y escribe el código en su pestaña
     Clases.
4. Para compartir la corrección, añada la cuenta de un colega como **corrector** (*Añadir a alguien
   que ya tiene cuenta*). Los correctores ven todas las respuestas y escriben comentarios; no
   cambian la clase.

Los estudiantes ven la clase, el periodo y quién la enseña. Nunca ven los nombres de sus compañeros
en la lista de miembros ni el código de acceso.

### 4. Prepare las primeras semanas con repeticiones

Los retos de pronóstico reales tardan semanas en resolverse. Para practicar desde el primer día, use
la pestaña **Repeticiones**: cuatro paquetes de cuatro semanas (petróleo y monedas para empezar,
después tasas de política, tipos de cambio y posicionamiento). Cada intento elige una fecha pasada,
muestra lo que se sabía entonces y califica la respuesta al instante. El estudiante ve con qué
frecuencia superó la tasa base.

Para las semanas siguientes hay retos de previsión cortos para un periodo de enero a mayo: un reto
semanal sobre el Brent que cierra cada viernes (se puntúa unas dos semanas después), un reto de
cuatro semanas sobre el Brent cada semana y retos mensuales sobre la tasa de política de once bancos
centrales, en inglés, español, francés y portugués. Si asigna un reto semanal y uno de cuatro semanas
desde la semana 3, cada estudiante tendrá hacia la semana 10 las 10 respuestas resueltas que necesita
el gráfico de calibración.

## Durante el periodo

### Asigne un reto a la clase

En la tarjeta de la clase pulse *Asignar un reto a esta clase*:

- **Reto:** cualquier reto aprobado, o un **reto de la clase** que usted escribe solo para esta clase
  (pulse *Escribir un reto de la clase*: un pronóstico sobre una de las series que un reto puede
  leer, o un debate de dos a cuatro posiciones, con un nivel: inicial, intermedio o avanzado). La
  aplicación revisa un reto de la clase con las mismas reglas que cualquier otro.
- **Fecha y hora de entrega,** en la zona horaria de la clase. Cada persona la ve también en su
  propia hora. Cada estudiante puede descargar un archivo de calendario con sus fechas.
- **La regla sobre herramientas de IA:** permitidas; permitidas con una nota que diga cómo se
  usaron; o no permitidas, y el estudiante confirma que no las usó.
- **Instrucciones,** si las hay.
- **Revisión entre pares** (retos de debate) y **tema delicado** (vea más abajo), si lo desea.

Los estudiantes entregan antes de su hora límite; una respuesta nueva antes de esa hora reemplaza la
anterior. Puede dar más tiempo a un estudiante (los demás no lo ven). Los estudiantes ven las
respuestas de sus compañeros solo después de la última hora límite, o cuando usted pulsa *Mostrar ya
las respuestas a los estudiantes*.

Para reutilizar el trabajo del periodo anterior, use *Copiar tareas de otra clase suya*: las fechas
se mueven según la distancia entre los periodos.

### Comentarios y notas

Pulse *Respuestas* en una tarea. Bajo cada respuesta, escriba un comentario y, si quiere, una nota
breve («B+», «7/10», «85 %»). Un comentario nuevo suyo reemplaza el anterior. El estudiante lo lee
en *Comentarios* dentro de su tarea, con el nombre de quien lo escribió.

### Revisión entre pares en los debates

En un reto de debate, pulse *Activar la revisión entre pares* (o márquelo al asignar el reto). Cuando
vence el plazo de todos, cada estudiante que defendió una posición recibe los argumentos de dos
compañeros, llamados Compañero A y B, y escribe qué es sólido en cada uno y qué lo haría más
sólido. Nadie revisa su propio argumento; cada argumento recibe dos revisiones; los autores leen las
revisiones sin el nombre de quien las escribió. Usted ve quién escribió qué.

### Temas delicados

Para una pregunta que los estudiantes puedan sentir como personal, pulse **Marcar como tema
delicado** (o márquelo al asignar el reto). Los nombres quedan ocultos para estudiantes y
correctores (usted los sigue viendo), y esas respuestas nunca salen de este computador: no están en
el libro de calificaciones, en ninguna descarga ni en ninguna copia de seguridad. Una vez que hay
respuestas, la opción no se puede desactivar, porque los estudiantes respondieron con esa promesa.

### La tabla de la clase, los equipos y los informes

- **Tabla de la clase:** califica las respuestas ya resueltas. Elija qué ven los estudiantes: solo
  su propia fila, a sus compañeros por apodo o a sus compañeros como números.
- **Equipos:** forme equipos de 3 a 5 que comparten una fila en la tabla.
- **Informe:** una página imprimible para un estudiante con sus respuestas, resultados, comentarios
  recibidos y, tras 10 probabilidades resueltas, un gráfico de calibración con una nota breve sobre
  dónde estuvo demasiado seguro o no lo bastante. Cada estudiante abre el suyo con *Mi informe*.

### Estudiantes que trabajan en su propia copia

Un estudiante que no puede llegar al computador de la clase (en casa o en otra red) puede entregar
por archivo:

1. En la tarea, pulse **Descargar hoja de entrega** y envíe el archivo al estudiante.
2. En su propia copia de EconQuest, el estudiante abre **Menú > Retos > Entregar**, abre la hoja,
   escribe su respuesta, pulsa **Sellar y guardar el archivo** y le devuelve el archivo.
3. Pulse **Cargar archivos sellados** y elija los archivos (puede elegir varios a la vez).

Solo la copia de su clase puede abrir un archivo sellado, y cualquier cambio en él se detecta. Cada
archivo se carga una vez. La hora que lleva dentro viene del computador del estudiante y se muestra
como tal; un archivo sellado después de la hora límite se carga y se marca como tardío. Usted y el
estudiante ven la misma huella corta, así ambos saben que es el mismo archivo.

## Final del periodo

### El libro de calificaciones

Abra **Libro de calificaciones** en la tarjeta de la clase. Cada estudiante tiene cuatro partes
sobre 100:

| Parte | Qué mide |
| --- | --- |
| Participación | La proporción de tareas entregadas |
| Exactitud | 100 × (1 − puntuación de Brier media). Decir siempre 50 % da 75 |
| Calibración | Cuánto se acercó a que sus respuestas de 70 % se cumplieran el 70 % de las veces (tras 10 respuestas resueltas) |
| Notas | Las notas que usted y sus correctores pusieron y que se leen como número, fracción o letra |

Fije sus propios pesos (suman 100; 25, 25, 20 y 30 hasta que los cambie). Una parte sin cifra
todavía reparte su peso entre las demás. Pulse *Descargar el libro de calificaciones (CSV)* para
obtener un archivo que se abre en una hoja de cálculo. Los retos retirados o que no pudieron
resolverse no cuentan. Cada estudiante puede descargar su propio registro con *Descargar mi registro
(CSV)*.

### Archivo y eliminación

Una clase se archiva 30 días después del último día del periodo. Una clase archivada es de solo
lectura: el libro de calificaciones y los informes se pueden seguir leyendo y descargando. Usted
elige cuánto tiempo se conserva, de 30 días a 10 años (un año hasta que lo cambie). Cada miembro ve
el día en que se eliminará, con un aviso en sus últimos 30 días. Ese día la clase se elimina con sus
respuestas, comentarios, revisiones y retos de la clase. Restaurar una clase archivada cancela su
eliminación.

## Privacidad, en breve

- Todo queda en el computador donde funciona la aplicación. No hay un servicio de EconQuest en la
  nube.
- Los archivos de la clase solo los puede leer el usuario de la aplicación en ese computador.
- Los estudiantes ven las respuestas de sus compañeros solo después de la hora límite, y nunca en un
  tema delicado.
- Cada cambio en una clase se anota en el registro de auditoría.
- La lista completa de lo que se guarda está en [PRIVACY.md](./PRIVACY.md) (en inglés).

## Accesibilidad

Las pantallas de clase están pensadas primero para el ancho de un teléfono y se revisan en cada
cambio según los niveles A y AA de WCAG 2.2: nombres para cada botón y campo, contraste, un foco de
teclado visible y nada que obligue a desplazarse de lado a 320 píxeles de ancho. Vea
[ACCESSIBILITY.md](./ACCESSIBILITY.md) (en inglés).

## Un periodo de ejemplo (12 semanas)

| Semana | En clase | En EconQuest |
| --- | --- | --- |
| 1 | Qué es un pronóstico; probabilidades y tasas base | Repeticiones: petróleo y monedas, semanas 1 y 2 |
| 2 | Reglas de puntuación: por qué la puntuación de Brier premia dar la probabilidad en la que de verdad se cree | Repeticiones: semanas 3 y 4; primer vistazo a *Mi informe* |
| 3 | Precios de materias primas y términos de intercambio | Primer reto de pronóstico (se resuelve en unas 6 semanas) |
| 4 | Bancos centrales y tasas de política | Repeticiones: tasas de política; segundo reto de pronóstico |
| 5 | Tipos de cambio | Repeticiones: tipos de cambio |
| 6 | Argumentar una posición de política | Reto de debate con revisión entre pares |
| 7 | Leer las revisiones entre pares | Comentarios sobre el debate |
| 8 | Inflación | Reto de pronóstico sobre inflación o un reto de la clase |
| 9 | Primeros resultados: suerte y habilidad | Tabla de la clase y gráficos de calibración |
| 10 | Política fiscal y deuda | Reto de debate |
| 11 | Revisar pronósticos | Último reto de pronóstico |
| 12 | Repaso | Informes impresos; libro de calificaciones descargado |

## Si algo sale mal

| Lo que ve | Qué hacer |
| --- | --- |
| No aparece la pestaña Clases, o Menú > Retos está en gris | Las clases están desactivadas. Un administrador elige *Activado* para las clases en Menú > Configuración > Retos y clases; no hace falta reiniciar. Las clases también necesitan inicio de sesión: cree la primera cuenta de administrador en Menú > Cuenta. |
| Los estudiantes no pueden abrir la dirección | Compruebe que la aplicación está en marcha y que el computador y los estudiantes están en la misma red. Si la red wifi del centro aísla los equipos, pida a informática que permita el puerto 3000 hacia este computador (vea SCHOOL_IT.md). |
| Una cifra dice «Falta» | La fuente no respondió o aún no publicó. Se muestra el motivo. El reto se resuelve cuando llega la cifra. |
| Un estudiante olvidó su contraseña | Un administrador la restablece en Menú > Usuarios; la nueva contraseña se muestra una vez. |
| «Too many class requests» (el mensaje aparece en inglés) | Alguien pulsó muy rápido; espere unos segundos. |
| Se rechaza un archivo sellado | El mensaje dice por qué: se modificó, se hizo para otra clase o tarea, ya se cargó, o el nombre de usuario no es de un estudiante de esta clase. |
| La clase es de solo lectura | El periodo terminó hace más de 30 días y la clase se archivó. Restáurela en su tarjeta si necesita cambiar algo. |

Preguntas y problemas: abra un *issue* en la página de GitHub del proyecto, o escriba a la dirección
de [SECURITY.md](./SECURITY.md) para cualquier asunto de seguridad.
