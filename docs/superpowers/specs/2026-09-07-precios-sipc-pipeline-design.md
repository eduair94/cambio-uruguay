# Pipeline de precios SIPC (subproyecto A)

Fecha: 2026-09-07
Estado: aprobado (orden permanente de auto-aprobación)

Este es el **primero de tres** specs. El pedido original —"plan de vida según
ingresos"— son tres subsistemas y un solo documento sería inservible:

| | subproyecto | depende de |
|---|---|---|
| **A** | pipeline SIPC: ingesta, guardas, canasta medida, API y páginas | — |
| **B** | motor de canasta dentro del presupuesto: reemplaza la línea de comida hardcodeada de `app/utils/costOfLiving.ts` por precio medido | A |
| **C** | generador de plan de vida: ingreso → asignación → escalera de inversión | A, B |

Este documento cubre **sólo A**. B y C reciben su propio ciclo spec → plan.

---

## 1. La fuente, medida

`precios.gub.uy` responde 301 a `www.precios.uy`: **precios.uy es el sitio
oficial** del SIPC (Sistema de Información de Precios al Consumidor,
MEF / Área Defensa del Consumidor). Su `robots.txt` sólo excluye `/wp-admin/`.

Detrás de la SPA Vue de `/preciosgub/` hay una API pública sin clave ni
Cloudflare, en `https://www.precios.uy/sipc2Web/recursos/sipc/`. Medido el
2026-09-07:

| endpoint | método | devuelve | medición |
|---|---|---|---|
| `obtenerArticulos` | GET | catálogo | **215** artículos, 26 KB, 0,3 s |
| `obtenerEstablecimientos` | GET | locales | **749** con lat/lon/dirección/teléfono, 19 departamentos, 172 KB, 0,6 s |
| `compararArticulo` | POST | precio por local de UN artículo, con fecha | 187 KB, 1,1 s (bbox nacional) |
| `compararCanasta` | POST | matriz canasta × locales | 12 MB, 65 s con los 215 artículos |
| `compararPrecios` | POST | matriz por lista de locales | — |
| `obtenerDeclarantes` | — | 405 | muerto |
| `obtenerPpdms` | — | 501 tras 60 s | muerto |

`v1..v4` del cuerpo POST son **West/South/East/North** del mapa (salen de
`map.getBounds()` en el bundle). El bbox nacional
`v1=-58.5, v2=-35.2, v3=-53.0, v4=-30.0` trae todo el país en una llamada.

### Volumen y frescura, medidos sobre 12 artículos

- **352 filas por artículo** en promedio → **~75.600 filas/día** crudas
  (27,6 M/año si se guardara todo).
- 94 % de las filas tienen fecha de hoy o ayer. Pero hay cola real: 174 filas
  con fecha 27/08, y filas de 12–15/08. **La antigüedad viene en el dato**
  (`fecha` por fila), que es justo lo que las pizarras de cambio no dan.
- El spread del **mismo** artículo va de **1,58× a 4,86×**. "Cinta leuco Ready
  Plast 1cm": mínimo $18,5 contra mediana $64.

Esas dos últimas juntas son el problema de la pizarra congelada otra vez: si la
página ordena por "más barato", **el titular se lo gana la fila con el error de
carga o la de hace tres semanas**.

### `compararCanasta` está prohibido, y por qué

Tienta: una sola llamada, 65 s, y trae el total de la canasta por local
calculado por el propio Estado. **Imputa.** Medido para "Nalga vacuna con
hueso" (id 114):

- `compararArticulo` devuelve **28** observaciones reales.
- La matriz de `compararCanasta` muestra precio en **722 de 722** locales, y en
  todos **el mismo `$509.32 (*)`**.
- **694 de 722 celdas tienen precio y no tienen fecha.**

El Estado rellena cada hueco con un promedio nacional y lo marca con `(*)`. Por
eso los totales por local se aplastan a 1,18× (43.487 → 51.456) mientras los
artículos sueltos se abren hasta 4,86×: quien rankee supermercados con ese
total **está ordenando promedios imputados, no góndolas**. Además la matriz
tiene **6 claves de columna duplicadas** (`"Ta - Ta  | Cerro "`,
`"Super XXI | Super XXI"`…), así que no se puede unir a locales de forma fiable.

La guarda que generaliza el hallazgo, y que es la regla central del pipeline:

> **Se rechaza toda fila cuyo precio contenga `(*)` o que no traiga `fecha`.**

Con tripwire en tests para que nadie reintroduzca `compararCanasta` por ser
"más eficiente".

### Unibilidad

El `id` de las filas de precio (p. ej. 217451) **no** es el id del
establecimiento (1..749): es la clave de la declaración. Medido sobre las 670
filas del artículo 1:

- match por **coordenada exacta**: 670/670 (100 %)
- match por **nombre + dirección**: 670/670 (100 %)
- huérfanas: 0
- 667 locales distintos en 670 filas → 3 coordenadas duplicadas

Se une por coordenada exacta con respaldo nombre+dirección. Los 3 duplicados se
colapsan por (nombre, dirección). Los **18 locales sin coordenada** existen en
el catálogo pero **no entran en las consultas por radio**.

### Cobertura desigual, que hay que decir en la página

423 de 749 locales son de Montevideo. Canelones 89, Maldonado 73, Colonia 20,
San José 18, Soriano 16, Salto 13, Rocha 12, Durazno 10, Paysandú 10,
Tacuarembó 10, Cerro Largo 9, Florida 9, Río Negro 9, Flores 7, Lavalleja 7,
Rivera 7, Treinta y Tres 5, **Artigas 2**. Con 2 y 5 locales no hay ranking
departamental honesto: se dice "muestra insuficiente".

---

## 2. Aporte propio frente a la app oficial

El SIPC ya tiene mapa, comparador y canasta. Copiar eso no aporta nada. Lo que
sí falta y se decidió construir:

1. **Histórico.** La API devuelve sólo el precio de hoy con su fecha; no hay
   endpoint de serie. Nadie publica la evolución. Guardamos todos los días.
2. **Ranking de cadenas** por costo de canasta, con cobertura y frescura a la
   vista.
3. **Cruce con lo que ya existe acá**: costo de vida, alquileres, descuentos con
   tarjeta (Bankos), sueldo líquido.
4. **Índice propio de góndola**, contrastable contra el IPC del INE, con las
   guardas de composición que hacen que no se publique mal.

## 3. Arquitectura

Job pm2 `currency-precios`, entrypoint `sync_precios.ts` en la raíz, cron
`12 3 * * *` UTC (hueco libre; corridas cortas, ~3–5 min). Escribe en la Mongo
del **root** (`cambio-uy`), no en la del app: la colección de estado es la más
grande del proyecto y el patrón de `regional` (snapshot + diario + ledger,
servido por la API del root y consumido por la página Nuxt) ya está probado.

No necesita `isPrimaryInstance()`: es una app pm2 de instancia única, no vive en
el proceso de la API.

### `classes/precios/`

| archivo | responsabilidad |
|---|---|
| `types.ts` | interfaces del dominio |
| `net.ts` | HTTP: UA propia `CambioUruguayBot/1.0 (+https://cambio-uruguay.com)`, timeout, reintentos. Acá no hay Cloudflare, así que identificarse no nos hace invisibles |
| `catalog.ts` | `obtenerArticulos` + `obtenerEstablecimientos`; parsea `unidad` (`" 900.0 Mililitros"` → `{qty:900, unit:'ml'}`) para habilitar precio por unidad; deriva grupo de artículo (`"Aceite de girasol - Óptimo"` → grupo `Aceite de girasol`, 198 grupos) y cadena/sucursal (`"Ta - Ta - Suc. Cerro"`) |
| `sweep.ts` | 215 × `compararArticulo` con bbox nacional, secuencial con pausa, reintento por artículo; une filas a locales |
| `parse.ts` | `"$92.0"` → 92, `"06/09/26"` → Date; **rechaza `(*)` y falta de fecha** |
| `plausibility.ts` | guarda por fila, al escribir |
| `staleness.ts` | clasifica frescura por `fecha` del origen |
| `audit.ts` | guarda de cierre, con todo escrito |
| `basket.ts` | canasta fija versionada, costo por local con regla de cobertura, índice |
| `store.ts` | upserts, ledger, agregados |
| `refresh.ts` | orquesta la corrida |

### Las tres guardas

Son tres porque **miran ejes distintos**, igual que en cotizaciones:

1. **`plausibility.ts` — por fila, al escribir.** Las 352 filas de un artículo
   llegan en una sola respuesta, así que la distribución del artículo se conoce
   **antes** de escribir. Rechaza: precio con `(*)`, fila sin `fecha`, no
   numérico, ≤ 0, y fuera de **p10/3 – p90×3** de la distribución del propio
   artículo ese día. La banda es por percentiles del propio artículo y no un
   factor fijo, porque el spread real medido va de 1,58× a 4,86×: un factor
   fijo o borra artículos con competencia real o deja pasar cualquier cosa.

   Y una segunda etiqueta que **no borra**: una fila bajo **p10/2** se marca
   `suspect`. El `$18,5` contra mediana `$64` de la cinta leuco sobrevive a la
   banda —p10/3 lo deja pasar— y sin embargo es el que gana el ranking. No se
   borra porque podría ser un precio real; pero **`suspect`, igual que `stale`,
   no puede ganar un ranking de "más barato"**. Se muestra, dice por qué está
   marcado, y no encabeza.

2. **`staleness.ts` — contra el pasado, que el origen nos regala.** `fresh` ≤ 2
   días, `aging` 3–14, `stale` > 14. **Una fila `stale` nunca gana un ranking de
   "más barato"**, ni en el hub, ni en la página del artículo, ni en la
   respuesta de la API. No se borra: una góndola quieta puede ser un precio
   real. Se publica el estado.

3. **`audit.ts` — al cierre, con todo el país escrito.** Banda por percentiles
   nacional por artículo (elimina fuera de p10/30–p90×30, avisa fuera de
   p10/3–p90×3), y un eje que la guarda por fila **no puede ver**: el **local
   cuya góndola entera** está sistemáticamente ~3× arriba o abajo de la mediana
   nacional es un error de unidad o de carga, no un súper caro. Registro
   diario; `notifyAdmin` no manda nada desde el VPS (`TELEGRAM_ADMIN_CHAT_ID`
   vacío), así que el veredicto va al log y a la API de estado, no a Telegram.

### Canasta e índice

`basket.ts` define una canasta **fija y versionada** (`basketVersion`): la marca
más barata dentro de cada grupo relevante, con cantidades explícitas
(Laspeyres). Reglas que no son opcionales:

- El costo de canasta de un local se calcula **sólo con observaciones reales**.
- **Cobertura ≥ 70 %** de los artículos de la canasta para que un local se
  rankee. Bajo eso **no se rankea**: se muestra como "muestra insuficiente".
  Ese es exactamente el error que comete el comparador oficial, y es la razón
  por la que existe esta regla.
- Agregados por departamento y por cadena: **≥ 5 locales calificados**; si no,
  "muestra insuficiente". Con esto Artigas (2 locales) y Treinta y Tres (5, y
  sólo si todos califican) quedan honestamente sin ranking.
- El **índice** encadena el costo mediano nacional de la canasta fija, y se
  **niega a publicar una variación** si cambió `basketVersion` o si el número de
  locales calificados cayó más de 20 % respecto del día anterior. La página dice
  que no es el IPC.

### Colecciones (Mongo del root)

| colección | forma | tamaño |
|---|---|---|
| `precios_articles` | catálogo: id, nombre, grupo, marca, unidad parseada, imagen | 215, upsert |
| `precios_stores` | locales: id, nombre, cadena, sucursal, dirección, lat/lon, departamento, teléfono, web | 749, upsert |
| `precios_current` | estado por (articleId, storeId): precio, fecha del origen, frescura, visto por última vez | ~75 k, upsert |
| `precios_changes` | **una fila por cada cambio de precio, sin umbral**: de, a, %, día | permanente, crece sólo con lo que se mueve |
| `precios_daily` | agregados por (día, articleId, scope) con scope = nacional / `dept:<x>` / `chain:<y>`: n, min, p10, p50, p90, max | permanente |
| `precios_basket_daily` | por (día, scope): costo de canasta, cobertura, `basketVersion`, índice; y por local | permanente |

La fila diaria se sobrescribe, así que lo que pasa entre corridas sólo existe en
el ledger — igual que en `regional`.

### API (Express del root, con Redis)

| ruta | devuelve |
|---|---|
| `GET /precios/articles` | catálogo + estadísticas nacionales del día |
| `GET /precios/article/:id` | estadísticas, filas por local (frescas primero), serie |
| `GET /precios/stores?near=lat,lon&r=km` | locales con costo de canasta, cobertura y frescura |
| `GET /precios/basket?scope=` | canasta, serie e índice |
| `GET /precios/changes?day=&articleId=` | ledger |

### Páginas (Nuxt, `app/`)

- **Hub `/precios-de-supermercado-uruguay`**: buscador de artículo, mapa de
  locales (patrón Leaflet/OSM de `/mapa`), canasta propia con la metodología a
  la vista, ranking de cadenas con cobertura y frescura, índice propio contra el
  IPC, y la cobertura departamental dicha sin maquillaje.
- **Familia programática `/precio/<slug>`, 215 páginas**: mínimo, mediana,
  máximo, dónde está más barato **excluyendo `stale` y `suspect`**, spread,
  serie propia, precio por unidad, y los otros artículos del mismo grupo.
  `noindex` con **menos de 30 observaciones frescas** (Nalga vacuna con hueso:
  28 filas en total, así que hoy quedaría fuera del índice — correcto).
- Cruces a `/herramientas/costo-de-vida`, `/descuentos-con-tarjeta-uruguay`,
  `/alquileres-uruguay` y `/herramientas/calculadora-sueldo-liquido`.
- i18n es/en/pt. Cuidado con `|` en títulos: es el separador de plurales de
  vue-i18n.

### Tests

Root (`tests/precios/`):

- `parse.test.ts` — unidades, precios, **rechazo de `(*)` y de fila sin fecha**.
- `guards.test.ts` — banda por percentiles del propio artículo; clases de
  frescura; **una fila `stale` no puede ganar un ranking**.
- `basket.test.ts` — regla de cobertura; local bajo umbral no rankeado; el
  índice se niega a comparar entre `basketVersion` distintas.
- `imputation.test.ts` — **tripwire**: ningún módulo referencia
  `compararCanasta`.
- `audit.test.ts` — el eje "góndola entera desplazada" se detecta.

App (`app/tests/unit/`):

- proyección: la página nunca muestra una fila `stale` como "más barato";
  "muestra insuficiente" se renderiza cuando la cobertura no alcanza.

### Despliegue

`currency-precios` va a `ecosystem.config.js` **y** a `OTHER_APPS` en
`scripts/deploy-backend.sh`, o nunca arranca en el VPS.

## 4. Registro de faltantes (habilita B y C)

`docs/app/PRECIOS.md` documenta el pipeline y además lo que **no** tenemos
medido y hoy está hardcodeado en `app/utils/costOfLiving.ts`, con candidato de
fuente para cada uno:

| falta | hoy | candidato |
|---|---|---|
| tarifas UTE / OSE / Antel | hardcodeado | pliegos tarifarios publicados |
| combustible | hardcodeado | tarifario ANCAP |
| cuota de mutualista / FONASA | hardcodeado | JUNASA / tarifarios de prestadores |
| planes de datos y fibra | hardcodeado | tarifarios de operadores |
| boleto del interior | sólo STM | intendencias |
| educación (matrícula, materiales) | ausente | ANEP / privados |

Nada de esto se inventa: si no hay fuente medida, la línea sigue declarada como
estimación, como ya hace `costOfLiving.ts` separando sus estimaciones de las
cifras citadas del INE.

## 5. Fuera de alcance

- B (canasta dentro del presupuesto) y C (plan de vida, inversiones,
  distribución de ingresos): specs propios.
- Páginas por cadena y por departamento: descartadas por ahora (nombrar empresas
  con un veredicto de precio necesita más metodología expuesta; y con Artigas en
  2 locales varias serían delgadas por honestidad).
- Cualquier consejo financiero personalizado. El sitio informa.
