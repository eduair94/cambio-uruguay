# Comparador de transporte diario (`/conviene-auto-moto-o-omnibus-uruguay`)

Una persona que hoy va al trabajo en ómnibus quiere saber si le conviene comprar un monopatín
eléctrico, una bicicleta eléctrica, una moto o un auto usado. La respuesta depende de su trayecto,
de cuántos días por semana lo hace, de si lo financia y de cuánto vale su tiempo. Ninguna página
uruguaya junta las dos mitades: **el precio real de cada vehículo hoy** y **el costo de TENERLO**
(seguro, patente, mantenimiento, energía, depreciación) contra lo que sale el boleto.

El sitio ya tenía la mitad cara de esa respuesta —los catálogos vivos de precios— y no la estaba
usando para contestar nada.

Diseño: `docs/superpowers/specs/2026-09-22-comparador-transporte-design.md`.
Sub-proyecto hermano: el directorio de motos usadas, que esta página consume como una fuente más
(`motocatalog`); hasta que llegue, el modo `moto` se declara y dice "sin datos relevados".

## Lo que este job NO hace

- **No es una tasación** ni una recomendación de compra. Compara costos declarados y tiempos medidos.
- **No le pone precio a la vida.** La siniestralidad por modo va como eje propio con su número y su
  fuente; no se convierte a pesos para que "cierre" la cuenta de ningún modo.
- **No hace la aritmética.** El job publica INSUMOS (precios, distancias, tiempos, frecuencias). La
  comparación corre en `app/utils/transportModel.ts`, en el navegador y en SSR, porque el visitante
  mueve controles y espera que los números cambien en el acto. Agregar un campo acá no alcanza para
  que la página lo use; sacar uno rompe una página publicada.

## Arquitectura

```
classes/transporte/
  sources/utm.ts      UTM 21S → WGS84 (sin dependencias) + distancia haversine
  sources/dbf.ts      lector dBASE III: la tabla de atributos del shapefile de paradas
  sources/zip.ts      entradas de un ZIP POR NOMBRE (no la primera)
  sources/stm.ts      los tres archivos abiertos de la IM → índice de paradas/recorridos/horarios
  transit.ts          viaje en ómnibus zona→zona: caminar + esperar + viajar (+1 trasbordo)
  routing.ts          cliente de ruteo (Valhalla propio primero, OSRM de FOSSGIS después)
  matrix.ts           matriz zona×zona×modo, aplanada
  prices.ts           precios vivos de los catálogos + nafta + kWh + boleto + TEA
  energy.ts           el kWh residencial, espejo del pliego que publica el app
  zones.ts            las 68 zonas y sus centroides
  store.ts            APP DB `transportsnapshots`, guarda de corrida flaca
  types.ts
sync_transporte.ts    entrypoint (--dry-run, --matrix, --prices-only)

app/utils/transportModel.ts        EL MODELO PURO: entra snapshot + escenario, sale desglose
app/utils/transportAssumptions.ts  tabla curada y fechada (seguro, patente, lluvia, robo…)
app/utils/transportScenario.ts     tipos del escenario + presets + query string
app/server/models/TransportSnapshot.ts  espejo del modelo de Mongo
```

## De dónde sale cada dato

### Ómnibus: tres archivos abiertos de la Intendencia

| archivo | URL | qué aporta |
|---|---|---|
| `v_uptu_paradas` (shapefile, 0,7 MB) | `http://intgis.montevideo.gub.uy/sit/tmp/v_uptu_paradas.zip` | una fila por (parada, variante): código, línea, ordinal y posición en **UTM 21S**. 42.839 filas, 245 bytes por registro, diez campos (medido 22/9/2026) |
| `uptu_pasada_variante` (10,6 MB comprimido, 61 MB de CSV) | `https://datos-abiertos.montevideo.gub.uy/uptu_pasada_variante.zip` | una fila por (tipo de día, variante, frecuencia, parada): a qué hora pasa esa salida por esa parada. ~1,7 millones de filas |
| `HORARIOS_OMNIBUS datos` | `https://datos-abiertos.montevideo.gub.uy/HORARIOS_OMNIBUS%20datos.zip` | el NOMBRE público de cada variante ("174", "D11", "CA1") |

Los tres se bajan con caché de 20 h a `.sdd-transporte-source/` (gitignored, dentro del worktree por
construcción: `cacheDir()` se niega a escribir fuera). Tope de 80 MB por archivo — si la IM publica
algo mucho más grande, cambió algo y hay que mirarlo antes de procesarlo.

**Lo que se guarda de esos 61 MB, y por qué no todo:** no hace falta saber a qué hora exacta pasa
cada ómnibus por cada parada; hace falta saber **cuánto tarda** desde que sale hasta cada parada y
**cada cuánto sale**. Las dos cosas se calculan en una sola pasada acumulando promedios, así que el
índice final son decenas de miles de números en vez de millones de filas — y un índice que entra en
memoria es lo que permite resolver los 4.556 pares de zonas sin volver a tocar el disco.

### El resto de los precios (`prices.ts`)

Nada se releva acá: cada número ya lo publica un job del sitio y este módulo LEE lo que dejaron.

| dato | fuente | job que lo escribe |
|---|---|---|
| boleto STM | `figures.boletoStm` | `currency-figures` |
| nafta súper 95 y gasoil | `combustibles_history` | `currency-combustibles` |
| kWh residencial | `classes/transporte/energy.ts` (pliego UTE) | — (curado, con fecha) |
| TEA de cuotas | mediana de lo relevado, no la más barata ni la más cara | `currency-loans` |
| dólar | `carcatalogmetas.usdUyu` | `currency-autos` |
| precio auto usado + consumo L/100 km + caída anual | `carcatalog` | `currency-autos` |
| precio moto | `motocatalog` (si la colección existe) | directorio de motos (pendiente) |
| precio monopatín y bici eléctrica | `movilidaditems` | `currency-movilidad` |

Si una fuente falta, falta **ese** modo y el resto sigue: el snapshot lista lo que faltó en
`coverage.notes` y la página lo dice, en vez de no mostrar nada.

**La decisión que más cambia el resultado** es qué precio de auto usar: la mediana del catálogo de
usados no es "lo que sale un auto para ir a trabajar" (el catálogo incluye camionetas de US$ 40.000 y
quien evalúa dejar el ómnibus no está mirando esas). Por eso se publica la BANDA p25/mediana/p75 y la
página arranca en el p25, con el control para moverse. Un solo número acá decidiría la respuesta sin
que el visitante lo sepa.

**La ventana de trasbordo son 60 minutos y es la regla del STM, no un supuesto**: dentro de la
ventana el segundo ómnibus no se paga, que es lo que hace que un viaje con trasbordo cueste un boleto
y no dos.

## Las trampas medidas (22/9/2026)

Ninguna de estas se descubre leyendo documentación; todas costaron una corrida.

- **El generador de ZIP de la IM devuelve HTML, no el archivo.**
  `generar_zip2.php?nom_tab=v_uptu_paradas` contesta una página que *dispara* la descarga de
  `/sit/tmp/v_uptu_paradas.zip`. Se lo llama igual para que regenere, se ignora su respuesta y se
  baja el archivo de verdad; si el generador falla, se intenta el archivo igual, porque suele estar
  ahí de la corrida anterior y una foto de paradas de ayer es infinitamente mejor que ninguna.
  `tests/transporte/zip.test.ts` fija que un HTML donde debería haber un ZIP **rompe ruidosamente**
  en vez de convertirse en "cero paradas".
- **El shapefile no trae todos los recorridos.** Tiene el nombre de la línea pero sólo **723 de las
  1.088 variantes**; el CSV de horarios trae las 1.088 con su parada y su ordinal. Por eso el
  shapefile manda para el NOMBRE y el CSV manda para el RECORRIDO: perder el nombre de una línea es
  cosmético, perder su recorrido es perder la mitad de la red.
- **`router.project-osrm.org` devuelve resultados de AUTO en todos los perfiles.** Acepta `/bike/` y
  `/foot/` en la URL, contesta 200 y devuelve la ruta del auto en los seis. Un "a pie" que da
  41,9 km/h no se nota en un test, se nota en producción. **No se usa nunca**; el ruteador público es
  el de FOSSGIS (`routing.openstreetmap.de`) y hay un test que lo fija.
- **El Valhalla público bloquea la IP.** `valhalla1.openstreetmap.de` cortó a nivel TCP a mitad del
  relevamiento, sin un solo 429 y sin `Retry-After`. Además su `/sources_to_targets` limita a 100
  PARES por llamada, no 100 puntos: la matriz serían ~250 llamadas por corrida. Descartado por
  medición, no por prudencia.
- **El proxy propio de Google sólo tiene Geocoding habilitado.** `/directions` y `/distancematrix`
  devuelven 403. Sirve para geocodificar una dirección, que es lo único que hace bien, y no para
  rutear.
- **La hora viene como entero `hmm` y la frecuencia como `hmm0`.** `12` son las 00:12 y `1245` las
  12:45; la `frecuencia` es la hora de salida del recorrido multiplicada por diez. Esa relación es la
  que permite calcular el desplazamiento desde la salida sin cruzar dos archivos. Una salida de las
  23:40 que pasa por la última parada a las 00:15 tarda 35 minutos, **no −1.405**.
- **El `.dbf` es latin-1.** "CORUÑA" viene como el byte `0xD1`; leído como UTF-8 es basura y la
  parada queda sin nombre.
- **El archivo de nombres de línea tiene DOS filas de encabezado** (la segunda con "Línea"
  doble-codificado en UTF-8: los bytes `C3 83 C2 AD` donde va la í) y sus saltos son **CRLF**, no LF
  como el de horarios. Saltear una sola fila mete la segunda como si fuera un dato.

## Cobertura medida (22/9/2026)

| número | qué es |
|---|---|
| **68 zonas** | los 62 barrios INE de Montevideo + 6 localidades del área metropolitana |
| **63 con parada caminable** | las otras 5 quedan fuera del índice de ómnibus y se declaran en `coverage.notes` |
| **3.826 de 4.556 pares** | resueltos con viaje en ómnibus (directo o con UN trasbordo) |
| **18.224 rutas en 4 llamadas** | la matriz completa: una llamada a OSRM por modo |

Los barrios salen del **mismo** `classes/propertyzones/sources/ine2011.json` que usa
`/alquileres-uruguay`. Usar otra lista habría dado dos vocabularios de barrio en el mismo sitio, y el
visitante que filtra alquileres por "La Blanqueada" tiene que poder elegir "La Blanqueada" acá y que
sea la misma.

**El centroide como punto de la zona, y su límite:** un barrio no es un punto, así que la comparación
es entre centros y no entre direcciones. Eso alcanza para decidir si comprar un vehículo (la
respuesta no cambia porque el origen esté tres cuadras más al norte) y **no** alcanza para planificar
un viaje — por eso la página ofrece además escribir la dirección exacta, que es el único camino que
consulta un servicio externo en el momento.

## Las tres partes de un viaje en ómnibus, y por qué las tres tienen que estar

- **Caminar** hasta la parada y desde la parada. Ignorarlo sería regalarle al ómnibus los 6 a 16
  minutos que un vehículo propio no tiene, que es justo donde se define la comparación en trayectos
  cortos. 5 km/h (83 m/min), radio de 700 m para un barrio.
- **Esperar**: media frecuencia, **con tope de 15 minutos**. Si un ómnibus pasa cada cuarenta
  minutos nadie espera veinte parado — mira el horario y sale a la hora. Estimar media frecuencia ahí
  sería inventarle tiempo muerto al ómnibus y decidir la comparación con eso. Una variante sin
  salidas medidas en la hora pico también cae al tope: cero salidas medidas no es "pasa siempre", es
  "no sabemos".
- **Viajar**: el desplazamiento medio desde la salida hasta cada ordinal, restado entre la parada de
  subida y la de bajada.

**UN trasbordo, no más.** Con dos, la estimación depende de coordinaciones que los horarios teóricos
no garantizan, y el error crece más rápido que la cobertura que agrega. **Un par sin recorrido
directo ni de un trasbordo se declara "sin recorrido relevado", no se estima.**

**El radio de la localidad (2.500 m) no es "caminar dos kilómetros":** es reconocer que el centroide
de Ciudad de la Costa —20 km de largo— no es la casa de nadie. Y cuando una zona no tiene NINGUNA
parada en su radio se toma la más cercana hasta 3 km y se cobra la caminata real: es el caso de
Bañados de Carrasco y de Manga/Toledo Chico, barrios enormes y poco densos donde el centro geométrico
cae lejos de la calle por donde pasa el ómnibus. Decir "sin recorrido" ahí sería falso —el barrio
tiene ómnibus— y poner una parada a 700 m que no existe sería peor.

## El ruteador, y el perfil de cada modo

Dos motores, en este orden: **Valhalla propio** (`TRANSPORT_VALHALLA_URL`, si está levantado: es el
único que cubre los cinco modos en un solo lugar) y **OSRM de FOSSGIS**, que es el que corre hoy. Su
`/table` acepta 100 coordenadas, así que la matriz entera de 68 zonas entra en **una llamada por
perfil**. Eso sí cabe en la política de un servicio donado; pedir 4.556 pares de a uno no.

| modo | perfil OSRM | por qué |
|---|---|---|
| `auto` | `routed-car` | |
| `moto` | `routed-car` | **A propósito, y hay que decirlo en la página en vez de disimularlo**: ningún ruteador público modela lo que de verdad hace a una moto más rápida en ciudad (pasar entre filas, usar el hueco del semáforo), y Valhalla, que sí tiene costing `motorcycle`, devuelve prácticamente la misma ruta. Publicar la ruta del auto y aclararlo es honesto; inventarle un descuento de tiempo sería decidir el resultado con un número inventado |
| `bici` | `routed-bike` | |
| `pie` | `routed-foot` | |

El **monopatín** no se rutea: usa la ruta de la BICICLETA con su propia velocidad de crucero, que es
la red por la que de verdad puede circular. La diferencia no es menor — en el par Pocitos–Centro
medido, la ruta de bici son 5,13 km y la de auto 5,50.

**Por qué un ruteador y no la línea recta:** en ese mismo par la recta da 4,0 km y la calle 5,50 en
auto. Un factor fijo sobre la recta no arregla eso, porque el factor cambia con la trama y porque el
TIEMPO —que es la mitad de esta página— no sale de la distancia: a pie ese par son 4,85 km y
65 minutos, o sea 4,5 km/h.

## El documento que se publica

APP DB `transportsnapshots`, **un** documento `slug: "current"` (0,35 MB medidos con 68 zonas y
cuatro modos). No hay historial: es una foto y todo lo que tiene se puede recalcular mañana.

```ts
{
  slug: 'current', builtAt: Date,
  prices: { usdUyu, busFareUyu, busTransferWindowMin, nafta…, kwhUyu, vehiclePriceUyu, financingTea, sources },
  zones:  [{ slug, name, department, lat, lon, kind }],
  routes: number[][],            // [origen, destino, modo, metros, segundos]
  transit:[{ from, to, walkMinutes, waitMinutes, inVehicleMinutes, transfers, lines[], meters }],
  coverage:{ zones, routedPairs, transitPairs, matrixBuiltAt, router, transitAgeDays, notes[] },
}
```

La matriz viaja **aplanada y por índice de zona**, no por nombre. No es microoptimización: con
nombres de campo y slugs el mismo contenido pesa unas seis veces más, y este documento se sirve
entero en cada carga. **Consecuencia:** el orden de `zones` y el orden de `TRANSPORT_ROUTABLE_MODES`
son parte del contrato — si cambian entre corridas, el app rehidrata pares de otras zonas.

`transit[].meters` es **siempre 0**: el dato de origen da tiempos, no distancias del recorrido, y
estimarlos con la línea recta sería inventar.

## Guardas

- **Corrida flaca (`THIN_RUN_FLOOR = 0,6`)**: una corrida con menos del 60 % de lo guardado **en las
  dos mitades** no escribe y sale con 1.
- **Las dos mitades se miden por separado, a propósito**: la matriz de rutas viene de un ruteador y
  los viajes en ómnibus de los datos abiertos de la IM, y se caen por separado. Que una esté floja no
  dice nada de la otra, así que una corrida con rutas nuevas y ómnibus viejo **es una corrida buena y
  se publica**: se conserva la mitad vieja **con su fecha** (`coverage.matrixBuiltAt` no se pisa) y
  se agrega la nota que lo dice.
- **Primera corrida**: sin snapshot previo siempre guarda. No hay nada que proteger.
- **Sin `APP_MONGO_URI`**: se niega a correr, salvo `--dry-run`.
- **Zona sin datos de ómnibus**: el par dice "sin recorrido relevado" en vez de estimar. Sin ómnibus
  no hay comparación, así que la página lo dice y ofrece el modo manual.
- **La matriz se rehace sólo si está vieja** (`TRANSPORT_MATRIX_MAX_AGE_DAYS`, 7) o si se pide con
  `--matrix`: son cuatro llamadas a un servicio donado y la calle no cambia de un día para el otro.

## Correr el job

```bash
npx ts-node sync_transporte.ts --dry-run       # no conecta a ninguna base ni escribe nada
npx ts-node sync_transporte.ts --prices-only   # saltea STM y ruteador
npx ts-node sync_transporte.ts --matrix        # fuerza rehacer la matriz aunque esté fresca
```

**Ojo con el dry-run local**: como el resto de los jobs de la APP DB, leer contra una Mongo vacía
sale en 0 sin decirlo. La base del app escucha en el localhost del VPS.

| env | por defecto | qué hace |
|---|---|---|
| `TRANSPORT_VALHALLA_URL` | vacío | ruteador propio; sin él, todo va por OSRM |
| `TRANSPORT_OSRM_URL` | `https://routing.openstreetmap.de` | **nunca `router.project-osrm.org`** |
| `TRANSPORT_OSRM_GAP_MS` | 1500 | pausa entre llamadas al servicio donado |
| `TRANSPORT_MATRIX_MAX_AGE_DAYS` | 7 | cada cuánto se rehace la matriz |
| `TRANSPORT_MAX_WALK_METERS` | 700 | radio de parada caminable en un barrio |
| `TRANSPORT_MAX_WALK_METERS_LOCALIDAD` | 2500 | ídem para una localidad del área metro |
| `TRANSPORT_MAX_ACCESS_STOPS` | 60 | paradas de acceso por zona |
| `TRANSPORT_FALLBACK_WALK_METERS` | 3000 | hasta dónde se busca cuando no hay ninguna en el radio |
| `TRANSPORT_USER_AGENT` | `CambioUruguayBot/1.0 (+…)` | se manda a la IM y a FOSSGIS |

## Tests (`tests/transporte/`, 109 casos)

Todo corre **sin red, sin Mongo y sin descargar nada**: los archivos de la IM se arman byte a byte en
memoria (`fixtures.ts`), el ruteador y el modelo de Mongo son de mentira.

| archivo | qué fija |
|---|---|
| `utm.test.ts` | la desproyección contra el punto verificado (Coruña y Roletti), el `null` ante entrada no finita, y `metersBetween` contra una distancia conocida (0,01° de latitud = 1.112 m) |
| `dbf.test.ts` | campos, largos, latin-1 ("CORUÑA" = byte `0xD1`), la marca de borrado `0x2a`, archivo truncado, cabecera imposible |
| `zip.test.ts` | el directorio central entero, la entrada **por nombre** (no la primera), método 0 y método 8, y que un HTML donde debería haber un ZIP rompa |
| `stm.test.ts` | `stmMinutesFromHmm` (12 → 12, 1245 → 765, imposibles → null), el desplazamiento desde la salida, la pasada después de medianoche, la frecuencia contada una vez por salida, sólo `tipo_dia` 1, el recorrido del CSV y los nombres de línea con sus dos encabezados y su CRLF |
| `transit.test.ts` | el viaje directo, el de un trasbordo, el par que **no** se estima, el tope de espera de 15 min y la caída a la parada más cercana |
| `matrix.test.ts` | el aplanado, `findRoute`, el modo que falla sin tumbar la corrida, la diagonal que no se guarda y el índice de modo del contrato |
| `routing.test.ts` | el parseo de OSRM, `code != "Ok"` → null, >100 coordenadas → null **sin pedir**, y el perfil por modo (moto = `routed-car`, bici = `routed-bike`) |
| `store.test.ts` | la guarda de corrida flaca: las dos mitades flacas no guardan, una sola sí y conserva la vieja con su nota, la primera corrida siempre guarda |
| `energy_parity.test.ts` | **paridad con `app/utils/householdBills.ts`**: lee el archivo del app con `fs` y exige que el escalón 101-600 siga siendo 8.452 y el IVA 22 % |
| `zones.test.ts` | 62 INE + 6 metropolitanas, coordenadas finitas dentro de Uruguay, slugs únicos, orden estable y el centroide de Ciudad Vieja dentro de la península |

Por qué el test de paridad del kWh: el backend **copia** una cifra que el app ya tiene (son dos
paquetes, dos builds y dos tsconfig, y el backend no puede importar de `app/`). Lo que sería un
descuido es que UTE actualice el pliego, alguien lo corrija en el app y el comparador siga cargando
el monopatín al precio del año pasado, sin que falle nada y sin que se note en ninguna pantalla.

```bash
npx vitest run tests/transporte
npx tsc -p tsconfig.production.json --noEmit   # hay UN error preexistente: sync_sheet.ts sin sheet_key.json
```

## Lo que la primera corrida en producción midió (23/9/2026)

| cifra | valor |
|---|---|
| zonas publicadas | 65 (de 68; Ciudad de la Costa, Pando y Canelones quedan afuera porque los horarios de la IM cubren Montevideo) |
| pares con viaje en ómnibus | 3.828 de 4.160 (92 %) |
| rutas | 16.640 en **4 llamadas** a OSRM de FOSSGIS |
| tiempo de la corrida | 41 s la primera; 7,7 s la segunda, reusando la matriz |
| boleto / nafta / kWh | $52 · $75,04 · $10,31 |
| precios por modo | monopatín $12.000 (16 avisos) · bici $27.150 (13) · moto $60.366 (530) · auto $391.463 (18.528) |

Y el veredicto que publica, con 7 km, 5 días y horizonte de 36 meses:

| modo | por mes | puerta a puerta | contra el ómnibus | veredicto |
|---|---|---|---|---|
| Ómnibus | $2.253 | 26 min | referencia | es la referencia |
| A pie | $0 | 1 h 33 | −581 h al año | más barato, pero más lento |
| Monopatín | $1.157 | 24 min | +20 h al año | se paga en 4 meses |
| Bici eléctrica | $1.520 | 22 min | +36 h al año | se paga en 9 meses |
| Moto | $2.953 | 15 min (ruta de auto) | +97 h al año | no se paga nunca; la hora sale $584 |
| Auto usado | $9.056 | 18 min | +72 h al año | no se paga nunca; la hora sale $1.135 |

## Tres defectos que encontró LEER la página publicada, no los tests

Con 10.088 tests del app y 4.670 de la raíz en verde:

1. **«A pie: más caro y más lento»**, cuando caminar sale `$ 0`. El veredicto elegía esa rama mirando
   sólo el tiempo; para los cuatro modos que se compran eso es cierto casi siempre, así que el
   defecto sólo aparece cuando un modo cuesta cero. Ahora la función recibe el costo de la
   referencia y separa «más barato, pero más lento» de «más caro y más lento».
2. **`medianUyu` guardaba el p25.** La pantalla decía la verdad («Precio de referencia»); el
   contrato no. Se llama `referenceUyu`.
3. **La página abría en el camino estimado** (escribir los km) con el medido escondido detrás de un
   clic. Arranca en Pocitos → Centro.

## Qué queda pendiente

- **La moto se rutea como un auto.** Ningún ruteador público modela pasar entre filas ni usar el
  hueco del semáforo. La página lo dice donde muestra el tiempo; descontarle minutos por suposición
  sería decidir la comparación con un número inventado.
- **332 pares de barrios sin viaje en ómnibus** (8 %): son periferia contra periferia, que necesita
  dos trasbordos. Se declaran; no se estiman.
- **El área metropolitana fuera de Montevideo** (Ciudad de la Costa, Pando, Canelones) necesita los
  horarios del MTOP, que este job todavía no lee.
- **El respaldo que lee `medianUyu`** en `app/server/utils/transportSnapshot.ts` se puede sacar: era
  para la ventana entre el deploy del renombrado y la primera corrida del job con el nombre nuevo.
- **Valhalla propio** en el VPS (docker, sobre el mismo extracto de Geofabrik que ya baja
  `currency-property-services`) daría los cinco modos en un motor y un `motor_scooter` real para el
  monopatín. Hoy no hace falta: OSRM resuelve la matriz entera en cuatro llamadas.
