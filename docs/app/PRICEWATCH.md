# Historial de precio por oferta (`classes/pricewatch/`)

Un punto de precio por día, por aviso individual (`listingId`), escrito por los jobs que ya leen un
mercado — hoy `currency-equipar` y `currency-chairs` (diaria y horaria de ambos) — y guardado en la
APP DB, colección `pricewatchoffers`. No tiene página propia ni endpoint público todavía: es materia
prima para un trabajo futuro (Plan D), documentado acá porque empieza a grabarse ahora, antes de que
haga falta.

## Por qué por OFERTA y no por producto

`/equipar-casa-uruguay` y `/mercado-de-sillas-uruguay` publican una banda (mediana/p25/p75) o un
producto agrupado por catálogo — ninguno de los dos es un precio que un vendedor concreto haya
puesto y pueda bajar o subir. Un descuento real de temporada (CyberLunes, Black Friday) es una
propiedad de un **aviso**: el mismo vendedor, el mismo `listingId`, publicando hoy menos que lo que
él mismo publicaba hace dos semanas. Una banda que baja puede ser eso, o puede ser que un vendedor
más barato entró a la muestra o que uno caro salió — la banda sola no distingue las dos cosas.
`pricewatchoffers` guarda la serie que sí las distingue: un documento por `listingId`, no por
producto ni por categoría.

## Qué guarda

Un documento por `listingId` (índice único), con:

- `vertical` ("equipar" | "sillas"), `category` (el `CATEGORY_SPEC` del aviso, o `null`),
  `productKey` (`ml:<catalogId>` si el aviso tiene uno, si no `null`).
- `source`, `sellerKey`, `sellerName`, `title`, `url`, `currency` — identidad del aviso, tal como la
  vio la corrida más reciente que lo escribió.
- `firstSeen` / `lastSeen` (fechas `YYYY-MM-DD`, UTC): `firstSeen` sólo se fija al insertar y nunca
  se vuelve a tocar (`$ifNull` contra el campo existente); `lastSeen` se pisa en cada corrida.
- `history`: arreglo de hasta **120** puntos `{ d, p, lp }` — fecha, precio y precio de lista
  (tachado) ese día, en la moneda del aviso. Un resync dentro del mismo día UTC reemplaza el punto de
  ese día, nunca lo duplica; al superar 120 puntos se descarta el más viejo.

No hay modelo espejo en `app/`: la colección es sólo del backend, así que
`tests/appdb/schema_parity.test.ts` no la incluye a propósito — ese test sólo recorre modelos que
`app/` también declara.

## Quién escribe, y sobre qué avisos

- `sync_equipar.ts` llama `recordPricewatch(guarded.listings, "equipar")` **después** de guardar el
  catálogo del día, en su propio `try/catch`: un fallo acá nunca debe costar el catálogo que ya se
  guardó. Escribe sobre `guarded.listings` — los avisos que la guarda de unidad de ESTA corrida dejó
  pasar, antes de que la corrida horaria les sume la foto de tienda del día anterior
  (`storeSnapshot.ts`). Un aviso que sólo está en el catálogo publicado porque vino de la foto de
  ayer no se ve HOY, así que no recibe un punto de precio hoy.
- `sync_chairs.ts` llama `recordPricewatch(harvest.listings, "sillas")` de la misma forma, sobre lo
  que el propio relevamiento de sillas trajo (sillas no tiene una guarda de unidad propia — reusa el
  mismo adaptador de retail que equipar, así que un aviso de TYT en dólares llega aquí también en
  dólares).
- Corre en **las dos** frecuencias de cada job (diaria y horaria/`--fast`), no sólo en la diaria: más
  observaciones por día, y un resync dentro del mismo día UTC no duplica el punto (ver `history`
  arriba). No hay una decisión de restringirlo a una sola corrida diaria; si Plan D necesita
  distinguir volatilidad intradía de un cambio real de precio, ese es el primer lugar para revisar.
- Nunca corre sobre Facebook Marketplace ni sobre avisos usados, de ninguna fuente
  (`pricewatchEligible`, `classes/pricewatch/record.ts`): Marketplace no tiene precio de lista contra
  el cual medir un descuento (cada aviso es una oferta única de un particular) y un precio de
  segunda mano es lo que ese vendedor decidió hoy, no una rebaja sobre un precio de estantería. Un
  aviso con precio $0 o sin `url` tampoco se graba (no hay nada que reabrir después).
- Cuando el mismo `listingId` aparece dos veces en una sola corrida (el mismo aviso salió de dos
  búsquedas distintas), se guarda el precio más barato de las dos apariciones: el punto es el precio
  de ese día para esa identidad, no un registro de cada vez que se vio.

## La trampa del `$literal`

La escritura no es un `updateOne` con `$set` plano: es un **pipeline** de update (un arreglo, no un
documento), porque dos campos dependen del documento que ya existe en Mongo —`firstSeen` tiene que
sobrevivir entre corridas y `history` se recalcula a partir del arreglo existente. En un pipeline de
update, `$set` interpreta cualquier string que empiece con `"$"` como una ruta de campo, no como un
valor literal — y los títulos reales de estos avisos empiezan con signo de pesos ("$ 4.500 Colchón 2
plazas"). Sin envolver cada valor en `{ $literal: ... }`, esa fila escribiría `undefined` en
silencio, sin error. `pricewatchOperation` (`classes/pricewatch/record.ts`) envuelve **todo** literal
—`listingId`, `title`, `price`, `listPrice`, etc.— con el helper `lit()`, y el test
`tests/pricewatch/record.test.ts` fija un título con "$" al frente como caso explícito.

## Los 120 días

El tope de puntos por documento (`maxPoints = 120`, en `applyHistory` y en el pipeline de Mongo) da
margen para comparar un precio de hoy contra su propio pasado de unos cuatro meses — más que
suficiente para ver una campaña estacional (CyberLunes, Navidad, rebajas de invierno) contra el resto
del año sin que el documento crezca sin límite. Un aviso que lleva más de 120 días observándose sigue
existiendo (`firstSeen`/`lastSeen` no se recortan), sólo pierde los puntos de precio más viejos.

**Poda a 180 días.** Lo que sí se borra es el documento entero de una oferta que nadie volvió a ver:
al final de cada `recordPricewatch`, **después** de escribir (así una oferta vista hoy ya movió su
`lastSeen` y nunca cae en su propia poda), un `deleteMany` sobre
`{ vertical, lastSeen: { $lt: hoy − 180 días } }` (`pricewatchPruneFilter`), que usa el índice
`{ vertical, lastSeen }` y sólo toca la vertical del job que llama. Una oferta sin verse hace medio
año no alimenta ninguna comparación de 60 días, y sin poda la colección crecía para siempre con cada
aviso que alguna vez pasó por un buscador. La corrida lo registra en el log ("N vencidas borradas").

## Quién lo va a leer

Nadie todavía. `pricewatchoffers` no tiene endpoint público ni página: es la materia prima para un
job futuro (Plan D) que compare el precio de una oferta contra su propia serie para separar un
descuento real de un precio de lista inflado antes de "rebajarlo". Ese trabajo necesita la serie ya
escrita desde ANTES de la temporada que quiere explicar — por eso esto empieza a grabar ahora, sin
esperar a que Plan D exista.

## Tests

- `tests/pricewatch/record.test.ts` — 21 casos, sin base de datos (el modelo va simulado): `pricewatchEligible` (Facebook y
  usado excluidos, precio y `url` requeridos), `pricewatchOperation` (forma del pipeline, la trampa
  del `$literal` con un título que empieza con "$"), `applyHistory` (reemplaza el punto del mismo
  día, no lo duplica; recorta a `maxPoints`), `pricewatchPruneFilter` (180 días, por vertical) y
  el orden de `recordPricewatch` (escribe y recién después poda).
