# Comparador de transporte diario — diseño

**Fecha:** 2026-09-22
**Ruta:** `/conviene-auto-moto-o-omnibus-uruguay`
**Sub-proyecto hermano:** `2026-09-22-motos-usadas-directorio-design.md` (el directorio de motos, que
esta página consume como una fuente más). Se construyen en paralelo; el comparador declara el modo
`moto` desde el día uno y muestra "sin datos relevados" hasta que el otro llegue.

## La pregunta

Una persona que hoy va al trabajo en ómnibus quiere saber si le conviene comprar un monopatín
eléctrico, una bicicleta eléctrica, una moto o un auto usado. La respuesta depende de su trayecto, de
cuántos días por semana lo hace, de si lo financia, y de cuánto vale su tiempo. Ninguna página
uruguaya junta las dos mitades: el precio real de cada vehículo hoy, y el costo de TENERLO (seguro,
patente, mantenimiento, energía, depreciación) contra lo que sale el boleto.

El sitio ya tiene la mitad cara de esa respuesta —los catálogos vivos de precios— y no la está usando
para contestar nada.

## Qué NO es

- **No es una tasación** ni una recomendación de compra. Compara costos declarados y tiempos medidos.
- **No le pone precio a la vida.** La siniestralidad por modo se publica como eje propio con su
  número y su fuente; no se convierte a pesos para que "cierre" la cuenta de ningún modo.
- **No elige por el visitante.** Un modo puede ser más caro Y más rápido; la página publica las dos
  cosas y el precio de la hora ganada.

## Arquitectura

```
classes/transporte/            job backend (pm2 currency-transporte)
  sources/stm.ts               datos abiertos IM: paradas, recorridos, horarios por parada
  sources/mtop.ts              GTFS metropolitano/interdepartamental (interior)
  transit.ts                   índice de tránsito: parada→líneas, tiempo entre paradas, frecuencia
  routing.ts                   cliente Valhalla (local primero, público con presupuesto de respaldo)
  matrix.ts                    matriz zona×zona × modo, incremental y persistida
  prices.ts                    precios vivos de los catálogos + nafta + kWh + boleto + TEA
  snapshot.ts                  arma el documento
  store.ts                     escribe APP DB `transportsnapshots`, guarda de corrida flaca
  types.ts
sync_transporte.ts             entrypoint (--dry-run, --matrix, --prices-only)

app/utils/transportModel.ts        EL MODELO PURO — entra snapshot + escenario, sale desglose
app/utils/transportAssumptions.ts  tabla curada y fechada (seguro, patente, mantenimiento, lluvia…)
app/utils/transportScenario.ts     tipos del escenario + presets + serialización a query string
app/server/api/transporte/comparador.get.ts   sirve el snapshot (cacheado, fallback horneado)
app/server/api/transporte/ruta.get.ts         ruteo vivo por dirección (geocode + Valhalla)
app/pages/conviene-auto-moto-o-omnibus-uruguay.vue
```

**Por qué el modelo vive en `app/utils` y no en el backend:** el visitante mueve controles (días por
semana, financiación, horizonte, sueldo) y espera que los números cambien al instante. Mandar cada
cambio al servidor sería un round-trip por cada tecla. El job publica INSUMOS (precios, distancias,
tiempos, supuestos); la aritmética corre en el navegador y también en SSR, desde el mismo módulo puro,
que es el que llevan los tests.

**Regla del repo que esto respeta:** lo que procesa la base se calcula en un job y se guarda
(`analisis-periodico-no-en-el-pedido`). Ninguna página consulta un portal, un ruteador ni una API
externa por visitante — con UNA excepción acotada y declarada: cuando el visitante escribe una
dirección exacta, `/api/transporte/ruta` geocodifica y rutea esa consulta, cacheada por par de
coordenadas redondeadas a ~100 m y con límite por IP. El camino por defecto (elegir barrio, o escribir
los km) no llama a nadie.

## El modelo económico

### Entradas del escenario

| campo | por defecto | qué cambia |
|---|---|---|
| `distanceKm` | 7 | km de ida. Sale de la matriz (barrio→barrio), de la ruta viva (direcciones) o a mano |
| `daysPerWeek` | 5 | días que se hace el trayecto |
| `tripsPerDay` | 2 | ida y vuelta; 4 si vuelve a almorzar |
| `horizonMonths` | 36 | el horizonte de la comparación |
| `financing` | cuotas 24 | contado \| cuotas(n, TEA); la TEA sale de `/api/prestamos` |
| `alreadyOwned` | false | si ya tiene el vehículo, la inversión es hundida y la comparación pasa a ser marginal |
| `parkingPaid` | false | si el destino cae en zona tarifada de la IM |
| `condition` | usado | nuevo \| usado, por modo |
| `wageHourly` | null | opcional; sólo para traducir horas a plata, apagado por defecto |
| `rainFallback` | por modo | qué fracción de los días de lluvia se resuelve en ómnibus |
| `includeDepreciation` | true | se puede apagar: sólo es costo si pensás vender |
| `includeTheftRisk` | true | se puede apagar |

### Salidas por modo

```
upfront        = precio del vehículo + equipamiento obligatorio + trámites
monthlyFixed   = cuota (si financia) + seguro/12 + patente/12 + depreciación/12 + guardado
monthlyVar     = energía + mantenimiento por km + estacionamiento + boleto de los días de lluvia
                 + costo esperado de robo
monthlyTotal   = monthlyFixed + monthlyVar
perTrip        = monthlyTotal / viajes del mes
perKm          = monthlyTotal / km del mes
doorToDoorMin  = ruta + penalizaciones del modo (estacionar, candado, casco, espera)
hoursPerYear   = (doorToDoorMin(modo) - doorToDoorMin(ómnibus)) × viajes al año / 60
```

### El veredicto tiene dos ramas

1. **El modo sale menos por mes que el ómnibus** → hay punto de equilibrio:
   `breakevenMonths = upfront / (costoMensualÓmnibus - monthlyTotal)`. Se publica en meses y se
   compara contra el horizonte elegido.
2. **El modo sale más** (el caso del auto, casi siempre) → **no hay equilibrio nunca**, y la
   respuesta correcta no es "no conviene" sino **cuánto sale la hora que ganás**:
   `pricePerHourSaved = (sobrecosto anual) / (horas ahorradas al año)`. El visitante compara esa
   cifra contra su propio sueldo por hora. Es la única forma honesta de comparar un modo más caro y
   más rápido contra uno más barato y más lento.

Si un modo es más caro **y** más lento, la página lo dice sin rodeos y no calcula ninguna de las dos.

### De dónde sale cada número

| componente | fuente | vivo/curado |
|---|---|---|
| precio monopatín / bici eléctrica | `movilidaditems` (bandas p25/mediana/p75, nuevo y usado) | vivo |
| precio moto | `motocatalog` (sub-proyecto hermano) | vivo |
| precio auto usado | `carcatalog` por segmento y modelo | vivo |
| depreciación auto | `annualDropOf`/`depreciationOf` de `classes/autos/report.ts` | vivo |
| depreciación moto | misma función sobre `motocatalog` | vivo |
| depreciación bici/monopatín | curada | curado |
| nafta / gasoil | `/combustibles` | vivo |
| kWh | `UTE_TARIFFS`, escalón 101–600 con IVA | vivo (tabla del pliego) |
| boleto STM y trasbordo | `/cost-of-living` + reglas del STM | vivo + curado |
| TEA de cuotas | `/prestamos`, `/financing-rates`, tope de usura `/debt-relief` | vivo |
| consumo del auto | el propio `carcatalog` ya trae L/100 km estimado | vivo |
| consumo moto por cilindrada | curado | curado |
| kWh/100 km de monopatín y e-bike | curado | curado |
| SOA, patente SUCIVE, empadronamiento, libreta | curado con fecha y URL oficial | curado |
| mantenimiento por km y por año | curado | curado |
| batería de reemplazo y su vida útil | curado | curado |
| estacionamiento tarifado | curado (pliego IM) | curado |
| días de lluvia | curado (INUMET) | curado |
| robo de vehículos | curado (Ministerio del Interior) | curado |
| siniestralidad por modo | curado (UNASEV) — **no se monetiza** | curado |

Cada cifra curada viaja con `{ value, asOf, source, sourceUrl }` y la página las imprime al lado del
número. El patrón ya existe en el repo (`UTE_TARIFFS`, `mercadoPagoPromos`).

### Tiempo puerta a puerta

| modo | composición |
|---|---|
| ómnibus | caminata a la parada + espera (frecuencia/2, tope 15 min) + en vehículo (horarios STM) + trasbordo si hace falta + caminata final |
| auto | ruta en auto + buscar estacionamiento + caminata final |
| moto | ruta en moto + casco + estacionar |
| bici / monopatín | ruta en bicicleta (el monopatín con velocidad de crucero propia) + candado/guardado |
| a pie | ruta peatonal (aparece sólo si el trayecto es corto) |

Las penalizaciones son parámetros curados, visibles y editables por el visitante. La carga de la
batería no es tiempo de viaje (ya está pagada en el kWh) pero sí es una advertencia si no hay dónde
enchufar.

### Las fricciones, cuantificadas

- **Lluvia**: días de precipitación al año (INUMET) × la fracción que cada modo no resuelve →
  esos viajes se cobran como boleto y su tiempo pasa a ser el del ómnibus.
- **Robo**: `probabilidad anual × (valor − recupero)` como costo esperado mensual, con el supuesto
  impreso al lado y un interruptor para apagarlo.
- **Riesgo vial**: se publica la tasa de UNASEV por modo como eje propio. **No se convierte a
  pesos.** Es la única fricción que se cuantifica y no se suma, y la página explica por qué.

## Contrato de datos

El job escribe UN documento en APP DB `transportsnapshots`:

```ts
{
  slug: 'current',
  builtAt: Date,
  usdUyu: number,
  modes: {                         // insumos por modo, no resultados
    omnibus:  { fare, transferWindowMin, passSources… },
    monopatin:{ priceBands: {nuevo, usado}, offers, asOf },
    bici:     { … },
    moto:     { … , byDisplacement: {…} },   // null hasta que exista el directorio de motos
    auto:     { … , bySegment: {…}, consumptionL100, annualDrop },
  },
  energy:  { naftaSuper95, gasoil, kwh },
  finance: { teaByLender[], usuryCap },
  zones: [{ slug, name, lat, lon, department }],
  matrix: {                        // comprimida: índices de zona, no nombres
    modes: ['auto','moto','bici','pie'],
    pairs: Int32Array-like,        // [from, to, mode, meters, seconds]
    transit: [{from, to, inVehicleMin, waitMin, walkMin, transfers, lines[]}]
  },
  coverage: { zonesRouted, pairsRouted, transitPairs, staleness },
}
```

La matriz se guarda **por índice de zona** y no por nombre para que el documento entre cómodo; el app
la rehidrata una vez y la consulta en memoria.

## Guardas

- **Corrida flaca**: si la corrida nueva tiene menos del 60 % de los pares ruteados del snapshot
  guardado, no escribe y sale con 1.
- **Sin ruteador**: si Valhalla no contesta, la matriz anterior se conserva con su fecha; los precios
  sí se actualizan. Las dos mitades fallan por separado.
- **Sin APP_MONGO_URI**: se niega a correr, salvo `--dry-run`.
- **Zona sin datos de ómnibus**: el modo ómnibus para ese par dice "sin recorrido relevado" en vez de
  estimar; sin ómnibus no hay comparación, así que la página lo dice y ofrece el modo manual.

## Tests

- `tests/transporte/model.test.ts` — el modelo puro: cada componente, el punto de equilibrio, la rama
  sin equilibrio, el caso "más caro y más lento", horizonte, financiación, `alreadyOwned`.
- `tests/transporte/transit.test.ts` — tiempo entre paradas y frecuencia contra un horario de juguete.
- `tests/transporte/matrix.test.ts` — presupuesto, incremental, no repetir pares frescos.
- `tests/transporte/store.test.ts` — guarda de corrida flaca, fallo parcial.
- `app/tests/unit/transportModel.test.ts` — el espejo del modelo en el app (misma función, mismos casos).
- `app/tests/unit/transportAssumptions.test.ts` — toda cifra curada tiene `asOf` y `sourceUrl`.

## SEO

- Fila en `docs/seo/experiments.json` en el mismo commit.
- FAQ con schema.org sobre las preguntas que la página contesta.
- Enlaces desde `/monopatines-electricos-uruguay`, `/bicicletas-electricas-uruguay`,
  `/autos-usados-uruguay`, `/motos-usadas-uruguay`, `/precio-de-la-nafta-uruguay` y el hub
  `/directorios-uruguay`.
