# Reto de replicación de Bohn (1998)

**Idiomas:** [English](README.md) · Español · [Français](README.fr.md) · [Português](README.pt.md)

Esta carpeta acompaña al reto **"Reproduzca la estimación de reacción fiscal de Bohn para Brasil"** (`bra-bohn-replication`). Usted reconstruye un número que muestra la aplicación, con su propio código, a partir de los mismos datos públicos. Si mucha gente obtiene el mismo número, los lectores pueden confiar en la aplicación. Si un script cuidadoso obtiene otro número, puede que la aplicación se equivoque, y eso también resuelve el reto.

## La idea en palabras sencillas

En 1998 Henning Bohn se hizo una pregunta sencilla sobre Estados Unidos: cuando la deuda pública es alta, ¿tiene el gobierno superávits presupuestarios mayores (antes de intereses) al año siguiente? Si es así, la deuda tiende a bajar con el tiempo. Una respuesta positiva indica que, en los años estudiados, la deuda se mantuvo en una senda sostenible. No encontrar respuesta no demuestra que la deuda sea insostenible; solo significa que el historial no da esa garantía.

La aplicación hace la misma pregunta para cualquier país con suficiente historia del FMI. En este reto el país es Brasil.

La ecuación es:

    saldo primario(t) = a + rho × deuda(t−1) + gamma × brecha del producto(t) + error

- **saldo primario**: el saldo presupuestario del gobierno antes del pago de intereses, en % del PIB (Monitor Fiscal del FMI).
- **deuda(t−1)**: la deuda pública al final del año anterior, en % del PIB (Perspectivas de la Economía Mundial del FMI).
- **brecha del producto**: cuánto está la economía por encima o por debajo de su nivel normal, según la estimación propia de la aplicación. Descuenta el efecto de los años buenos y malos. Cuando la brecha no cubre suficientes años, la aplicación la deja fuera y lo indica.
- **rho** es el número que usted reproduce: cuánto sube el saldo primario, en puntos del PIB, por cada punto adicional de deuda.

## Pasos

1. **Obtenga los datos.** En la aplicación, abra **Investigación**, elija Brasil, luego **Historia y datos** y después el panel **Reacción fiscal**. Pulse **Descargar estas filas (CSV)**. El archivo `bohn-bra.csv` contiene cada año que usó la aplicación, las tres columnas de arriba y el método que declara la aplicación (fuentes, años de la muestra, ajustes). Con la aplicación en marcha también puede leerlo directamente en `http://localhost:3000/api/bohn/BRA.csv`.
2. **Abra un script de inicio.** Elija `bohn_starter.R`, `bohn_starter.py` o `bohn_starter.do`. Cada uno carga el archivo, muestra las filas e indica si se incluye la brecha del producto. Ninguno ejecuta la regresión: esa parte le corresponde a usted.
3. **Escriba la estimación.** Mínimos cuadrados ordinarios con constante, saldo primario sobre la deuda del año anterior (y la brecha del producto cuando se incluya), usando todas las filas del archivo. Indique el coeficiente de la deuda con tres decimales.
4. **Opcional: errores estándar.** La aplicación usa errores estándar de Newey-West con retardo floor(4 × (n/100)^(2/9)), como mínimo 1. No cambian rho, solo cuánta seguridad tenemos sobre él.
5. **Publique su script** donde cualquiera pueda leerlo (un repositorio o gist de GitHub; el enlace empieza por https://).
6. **Participe** en Menú > Retos: abra el reto y elija Registrar en privado (solo en este ordenador) o Preparar respuesta pública (un pull request en GitHub). Indique su cifra, el enlace a su script y, si quiere, una nota: qué edición de los datos usó y cualquier diferencia que encontró.

## Cómo se resuelve

Tras el cierre de las respuestas, el responsable abre el mismo panel con los ajustes que indica el reto y registra la cifra que muestra la aplicación. Una respuesta dentro de la tolerancia del reto la reproduce. Una respuesta distinta no es "errónea": si sus notas muestran que la aplicación se equivocó, el responsable lo registra, prepara una corrección y esa respuesta resuelve el reto. Las replicaciones aparecen en las páginas de participantes y nunca se clasifican.

## A tener en cuenta

- El FMI revisa su historia en cada edición del WEO. Use el archivo que le da la aplicación e indique qué edición es (la columna del método la nombra).
- Se dejan fuera los años que el FMI marca como proyecciones; solo se usan datos observados.
- El artículo de Bohn usó datos de Estados Unidos de 1916 a 1995 y controles adicionales para el gasto en tiempos de guerra. Este reto reproduce la versión de la prueba de la aplicación con los datos del FMI para Brasil, no la tabla del artículo.

## Lecturas

- Bohn, H. (1998), "The Behavior of U.S. Public Debt and Deficits", *Quarterly Journal of Economics* 113(3), 949-963.
- Mendoza, E. G. y Ostry, J. D. (2008), "International evidence on fiscal solvency: Is fiscal policy 'responsible'?", *Journal of Monetary Economics* 55(6), 1081-1093.
- Newey, W. K. y West, K. D. (1987), "A Simple, Positive Semi-Definite, Heteroskedasticity and Autocorrelation Consistent Covariance Matrix", *Econometrica* 55(3), 703-708.

Esta guía y los scripts de inicio tienen licencia CC BY 4.0, como el resto de `quests/`.
