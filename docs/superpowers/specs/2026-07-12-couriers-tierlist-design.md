# Tierlist de couriers en /couriers-uruguay — diseño

Fecha: 2026-07-12
Estado: aprobado (pendiente de review del spec escrito)

## Problema

`/couriers-uruguay` hoy es una tabla: 15 couriers, una tarifa "de referencia" por kg, un cargo fijo, y
una columna de reputación cuyo rating está vacío (`null`) para 9 de los 15. El lector que quiere
importar sigue sin poder responder la única pregunta que tiene: **¿con cuál me conviene traer ESTE
paquete, y a quién le va a doler menos cuando algo salga mal?**

Tres huecos concretos:

1. **La tarifa de vidriera no es el precio.** El costo real es escala-de-peso correcta + cargo de
   manejo + TSPU 10% + despacho aduanero + impuestos si se pasa la franquicia. La página muestra el
   primer sumando y esconde el resto en un string de `note`.
2. **Las opiniones no están.** Reddit y los foros uruguayos (gameover.uy, mtb.uy) tienen el material
   que la gente busca — demoras reales, cargos sorpresa, qué pasó cuando se perdió un paquete — y la
   página no lo usa.
3. **No hay veredicto.** Una tabla ordenada alfabéticamente no ayuda a elegir.

## Objetivo

Convertir la página en un **tierlist S–F computado**, donde:

- el lector define **su** paquete (peso, valor, origen, destino) y el board se re-ordena para su caso;
- el lector elige **qué dimensiones le importan** y el board se re-tierea en vivo;
- la reputación sale de **datos reales** (rating de Google Maps por `place_id` fijado + sentimiento y
  citas de Reddit), no de adjetivos nuestros;
- todo el sync vive en el **backend root** (Express + pm2), no en tareas Nitro.

No-objetivos: cotizar contra las APIs privadas de cada courier; afiliación/comisiones; reemplazar la
calculadora de impuestos (se enlaza, no se duplica).

## Rubro (transparente, pesos suman 100)

El tier es **computado, nunca escrito a mano** — mismo principio que `app/utils/bankTierlist.ts`.

| Dim | id | Peso | Qué mide | De dónde sale el puntaje |
|---|---|---|---|---|
| Precio real | `precio` | 26 | Costo total puerta a puerta del paquete del lector | **Computado** de `quoteUsd()` sobre tarifas scrapeadas: normalizado contra el más barato del roster |
| Cumplimiento | `cumplimiento` | 20 | Demora prometida vs. demora real reportada; frecuencia de vuelos; consolidaciones | Puntaje editorial anclado a evidencia (tránsito publicado + reportes de usuarios), citado |
| Atención | `atencion` | 16 | Soporte y, sobre todo, resolución cuando el paquete se pierde/daña/se traba en aduana | Editorial anclado a reseñas + hilos, citado |
| Reputación verificada | `reputacion` | 15 | Rating real y volumen de reseñas + sentimiento neto en Reddit/foros | **Computado** de la data viva (Google + Reddit) |
| Transparencia | `transparencia` | 13 | Cargos sorpresa; si la calculadora del sitio coincide con lo que terminás pagando | Editorial: se penaliza cada cargo no publicado que aparece en reportes |
| Cobertura y extras | `cobertura` | 10 | Casilleros (EE.UU./Europa/China/Argentina), interior, seguro, días de depósito, tarifa libros, descuento de IVA | Determinístico desde los flags del catálogo |

**Re-peso interactivo:** `scoreFor(entity, dimsActivas, pkg)` re-normaliza los pesos sobre el subconjunto
que el lector dejó activo. "El mejor courier" pasa a ser función de lo que el lector valora, no un
veredicto nuestro.

**Política de dato faltante (crítica):** si una entidad no tiene muestra de reseñas suficiente
(umbral: < 15 reseñas de Google **y** < 3 menciones de Reddit), la dimensión `reputacion` queda
**ausente** para esa entidad: se re-normalizan los pesos sobre las dimensiones restantes y la card
declara "sin muestra suficiente". **Nunca** se imputa un 50 ni se castiga por falta de datos — eso
convertiría "operador chico" en "operador malo", que es exactamente la mentira que la página tiene
que evitar.

Tiers: S ≥ 85 · A ≥ 75 · B ≥ 65 · C ≥ 55 · D ≥ 45 · F < 45. Cada fila del board lleva un blurb honesto.

## Roster (filtrable por tipo)

- `courier` — los 15 de casillero actuales (Gripper, Aerobox, Urubox, USX, Punto Mío, BuyBox, …).
- `marketplace` — Tiendamia (impuestos incluidos; la alternativa que Reddit compara todo el tiempo).
- `postal` — Correo Uruguayo.
- `express` — DHL / UPS / FedEx (cotización, no tarifa plana).

Las entidades sin tarifa plana publicada (`express`, algunos couriers) no reciben quote y por lo tanto
tampoco puntaje de `precio`: misma política de dato faltante que arriba, con el motivo en la card.

## Motor de precio

Hoy `Courier.perKgUsd` es un número y toda la letra chica es prosa en `note`. Se estructura:

```ts
interface TariffTier { maxKg: number | null; perKg?: number; flat?: number }
interface CourierTariff {
  tiers: TariffTier[]          // ordenadas por maxKg; la última con maxKg: null
  handlingUsd: number | null   // cargo de manejo por envío
  tspuPct: number              // recargo postal/URSEC (10% donde aplica, 0 donde no)
  clearanceUsd: number | null  // despacho aduanero cuando el courier lo cobra aparte
  interiorUsd: number | null   // adicional de envío al interior
  booksPerKg: number | null    // tarifa de libros/CD/DVD
  originPerKg: Partial<Record<'us' | 'eu' | 'cn' | 'ar', number>>  // sobreescribe por origen
}
```

`quoteUsd(entity, pkg)` → `{ freight, handling, tspu, clearance, taxes, total, breakdown[] }`, donde
`taxes` reusa `app/utils/importTax.ts` (franquicia, IVA sobre mercadería, flete no gravado) — sin
duplicar reglas de importación. El desglose se muestra en la card: el lector ve **por qué** un courier
barato por kg termina caro.

Nota de exactitud: el régimen correcto está en `app/utils/importRules.ts` (2 regímenes excluyentes,
mínimo US$ 20, umbral sobre el total de la factura). La página consume esas reglas; no las re-implementa.

## Arquitectura

### Backend root (Express + pm2) — dueño de TODO el sync

- `classes/couriers/rateScraper.ts` — **porte** de `app/server/utils/courierScraper.ts` (parsers puros
  + guard de plausibilidad) al backend, con sus tests migrados a vitest del root.
- `classes/couriers/googleReviews.ts` — lee el proxy de Google Places (`servers/google-maps-server.ts`,
  puerto 2221) **por `place_id` pineado y verificado a mano**, nunca por búsqueda de texto — mismo guard
  que `/casas-de-cambio` (`shouldAcceptReview`: un fetch implausible no pisa data buena).
- `classes/reddit.ts` — cliente Reddit mínimo (auth `installed_client`, cola serializada, User-Agent
  descriptivo). Port del que ya funciona en Nitro.
- `classes/couriers/opinions.ts` — minado por entidad (alias: "Punto Mío"/"puntomio"/"punto mio"),
  scoring de sentimiento a nivel **oración** (no post: un hilo puede elogiar a uno y despedazar a otro)
  y extracción de hasta 3 citas con permalink.

  **Clasificación híbrida (corrección post-research, 2026-07-12).** El corpus real (1.513 posts +
  7.862 comentarios minados de r/uruguay, r/Burises, r/UruguayFinanzas, r/Montevideo, r/AskUruguay)
  demostró que un léxico de keywords **no alcanza** y publica mentiras:

  - Para Tiendamia el léxico dio net **−5**; leyendo las oraciones, el neto real es **−70** (27 de 28
    opiniones negativas).
  - Contó como elogio a Tiendamia la frase *"Yo recomiendo PuntoMio antes que estos chorros"* — que es
    exactamente lo contrario. Las frases **comparativas** ("mejor X que Y") invierten el sujeto.
  - Leyó como positivas frases **sarcásticas** ("actuó más rápido que la velocidad de la luz",
    "sospechosamente rápido").

  Por lo tanto: cada oración nueva se **clasifica con el proveedor de AI del backend**
  (`AI_BASE_URL`/`AI_API_KEY`, ya configurado) devolviendo `{ subject, isOpinion, polarity, theme }`,
  y el resultado se **cachea en Mongo por hash de la oración** — así el costo es una vez por oración,
  el corpus viejo no se re-clasifica, y dos corridas dan el mismo número. **La agregación
  (decay temporal, peso logarítmico de upvotes, neto, `MIN_SAMPLE`) sigue siendo determinística y
  auditable**: la AI etiqueta, no calcula. Si la AI no responde, la oración queda sin clasificar y no
  entra al neto — degrada a "menos muestra", nunca a "número inventado".

  Umbral de publicación (medido contra el corpus real): < 8 opiniones genuinas → se muestra con la
  leyenda "muestra fina"; < 3 → "sin muestra suficiente" y la dimensión queda ausente. Con el corpus
  de hoy eso deja **sin muestra** a UruguayCargo (3 menciones), StarBox (3), SoyCourier (3), Grinbox
  (14 menciones pero 0 opiniones), Logistika (0) y UPS.
- `sync_couriers.ts` — job único. Tarifas + Reddit todos los días; Google solo si el snapshot tiene
  más de 7 días (los promedios de reseñas se mueven lento y el proxy es caro).
- pm2 en `ecosystem.config.js`:
  ```js
  { name: "currency-couriers", autorestart: false, exec_mode: "fork",
    script: "dist/sync_couriers.js", cron_restart: "15 8 * * *",
    log_date_format: "YYYY-MM-DD HH:mm Z" }
  ```
- Endpoint público en `index.ts`, estilo de la casa (`server.getJson` + `redisCache.getOrSet` + swagger):
  `GET /couriers` → `{ couriers: [{ id, tariff, reviews: {rating, count, url, checkedAt}, reddit: {net, mentions, quotes[]} }], updatedAt }`.
  Queda disponible también para el MCP y los bots.
- Se **retira** la Nitro task `couriers:scrape` y su entrada en `nuxt.config.ts`.

### Nuxt — solo render + la matemática del lector

- `app/utils/courierTierlist.ts` (**puro**, sin Vue/Nitro): rubro, `quoteUsd`, `scoreFor`,
  `tierForScore`, catálogo **seed**. Vive en el front a propósito: el board se re-tierea al instante
  cuando el lector toca el peso o apaga una dimensión — un roundtrip por keystroke sería absurdo.
- `app/server/api/couriers.get.ts` → proxy fino y cacheado a `api.cambio-uruguay.com/couriers`, con
  caída al seed. La página SSRea aunque el backend esté abajo. `courierRatesStore.ts` y
  `app/server/utils/courierScraper.ts` se eliminan una vez que el backend sirve.

## Página

1. Hero + **"Tu paquete"**: peso (kg), valor (US$), origen (EE.UU./Europa/China), destino (MVD/interior).
2. Chips de rubro (qué te importa) + chips de tipo (courier/marketplace/postal/express).
3. **Board S–F.** Cada card: costo total **de tu paquete** con desglose, barras por dimensión,
   estrellas de Google + número de reseñas (link a la ficha), sentimiento de Reddit, y *flags* rojas
   ("cobra retiro en Tres Cruces", "consolidación lenta").
4. Tabla comparativa detallada (la actual, conservada) + letra chica por courier.
5. **Opiniones**: citas textuales de Reddit/foros con link al hilo, agrupadas por tema (demoras,
   cargos sorpresa, aduana, atención). Solo citas de usuarios nombrados/públicos, nunca inventadas.
6. **Metodología**: pesos, cómo se puntúa cada dimensión, y **qué no podemos medir** — el rating de
   Google mide el mostrador, no el vuelo; el volumen de Reddit favorece a los couriers grandes.
7. Schema `ItemList` + `FAQPage`; CTA a la calculadora de impuestos.

## Verificación

- **Unit (root):** parsers de tarifas contra fixtures HTML; guard de plausibilidad; scoring de
  sentimiento por oración (incluye el caso "elogia a A y destroza a B en la misma oración").
- **Unit (app):** escalas de peso de `quoteUsd` (borde exacto de cada tramo), TSPU, despacho,
  franquicia; `scoreFor` con re-peso y con dimensión ausente (los pesos re-normalizados deben sumar
  100); `tierForScore` en los bordes.
- **E2E:** cambiar el paquete re-ordena el board; apagar una dimensión re-tierea; el board hidrata
  (gate por hidratación con `toPass`, como en el carrito de importación).
- **Fact-check adversarial obligatorio antes de shippear:** cada tarifa, cada `place_id` y cada score
  editorial con su cita. Las últimas tres tandas de números de importación shipearon bugs justamente
  por saltear este paso.

## Deploy (no olvidar)

El deploy de `app/` es automático por CI al pushear a main. **El backend root NO**: es manual en el
VPS (`ssh root@104.234.204.107 -p 2223` → git pull → `npm install` → `npm run build` → `pm2 restart`
+ `pm2 start ecosystem.config.js --only currency-couriers`). Un `dist` viejo rompe el scraper en
silencio (fue exactamente lo que pasó con Prex USD). Envs necesarias en el root: `CASAS_REVIEWS_GMAPS_URL`
(reusada), `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`.

Orden de merge: backend primero (endpoint sirviendo), después el front — así el proxy nunca cae al
seed en producción el día del deploy.

## Riesgos

- **Los operadores chicos van a quedar sin muestra** (SoyCourier, StarBox, Grinbox, Glic). La política
  de dato faltante los protege de un tier injustamente bajo, pero la card **tiene que decirlo explícito**.
- **El rating de Google mide la sucursal, no el servicio de courier.** Se declara en Metodología.
- **Los scores editoriales (cumplimiento/atención/transparencia) son juicio nuestro.** Mitigación: cada
  uno lleva su evidencia citada y el lector puede apagar la dimensión.
- **Las tarifas cambian.** El scraper diario cubre a los 9 couriers que publican HTML plano; los que
  cotizan detrás de un JS quedan con valor de catálogo y fecha de verificación visible.
