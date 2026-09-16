# Autos usados: directorio y oportunidades de compra — diseño

Fecha: 2026-09-16. Pedido: "un directorio de autos de la misma forma que para las casas; poder
encontrar oportunidades de compra". Espejo de `/venta-viviendas-uruguay` +
`/oportunidades-inmobiliarias-uruguay` (ver `docs/app/PROPERTY_SALES*.md`,
`docs/app/PROPERTY_OPPORTUNITIES.md`).

## 1. Lo que se midió antes de diseñar (2026-09-16)

**Fuentes.** Relevamiento en vivo de 25 candidatos. Mercado Libre (categoría `MLU1744`) tiene
22.534 avisos: 17.041 usados, 5.493 0 km; 13.824 de concesionarias y 8.710 de dueños. Todo el
resto junto suma ~2.000 (Carper ~425, Car One ~480, Clasiautos 243, Shopping de Autos 169, Julio
136, Fidocar 113, Motorlider 60, Gallito 35…) y las automotoras republican ese stock en ML.
usados.uy tiene 6 autos reales; BuscandoAuto es data de prueba; Facebook Marketplace exige sesión.
**Decisión: v1 lee sólo Mercado Libre**, con `sources/` preparado para sumar Clasiautos/Carper
después.

**Acceso.** El puente `:9656` (pm2 `mercadolibre`, repo trustpilot) ya usado por alquileres y
sillas contesta `category=MLU1744&raw=true` con polycards completas: título, precio+moneda,
`primary_attribute` = `"2017 | 111111 km"`, etiquetas km/caja/combustible, ubicación
`"Barrio, DPTO • Concesionaria"`, `seller_id`, foto, cantidad de fotos, permalink. 20 tarjetas por
pedido; `offset ≥ 4000` vuelve a 0 (hay que verificar `paging.offset`, como `mlPageMatches`).
Facetas con conteo: `BRAND` (118), `MODEL` (901 en usados), `SHORT_VERSION`, `VEHICLE_YEAR`,
`KILOMETERS`, `FUEL_TYPE`, `TRANSMISSION`, `seller_type`, `ITEM_CONDITION`, `state`. Ningún modelo
supera 4.000 avisos → partir **marca → modelo** cubre todo y hace que marca y modelo salgan del
**filtro aplicado**, no de adivinar el título. Muestra de 8 modelos: único = total en los 8
(2.279 avisos). 4 pedidos concurrentes: 1,5–4,8 s cada uno.

El endpoint `/product/:id` del puente devuelve 403 para ítems de clasificados. La **ficha HTML**
(`auto.mercadolibre.com.uy/MLU-…`) responde 200 desde el VPS con UA propia y trae: tabla de
características (Marca, Modelo, Año, **Versión**, Km, Combustible, Transmisión, Motor), JSON-LD
`Vehicle` (carrocería, puertas, color), descripción completa, nombre de la concesionaria,
`item_status`, "Publicado hace N días". El robots.txt de ML (`User-agent: *`) no bloquea fichas; sí
`/*_Desde_` y filtros de vendedor en la web — por eso el listado va por el puente (misma decisión
ya tomada para alquileres y sillas) y la web sólo se lee ficha por ficha.

**Calibración de cohortes sobre la muestra real (2.279 usados):**

| cohorte | "oportunidades" | lectura |
|---|---|---|
| marca+modelo+año+caja | 125 (5,5 %) | casi todas explicadas: más km, 4x2 vs 4x4, 1.0 vs 1.6 |
| + cilindrada + banda de km | 51 (2,2 %) | todavía cuela Onix **Joy** (versión vieja y barata) contra Onix turbo |
| + versión + motor (estricto) | **11 (0,5 %)** | todas sostenibles a ojo: 208 1.5 Allure 2017 US$ 7.900 vs mediana 10.600 (n 12) |

Otros hechos de la muestra: 99,5 % en USD (0,5 % en pesos); cilindrada en el título 91,7 %; caja
94,5 %; combustible 95,6 %; dispersión intercuartil de cohortes año+modelo **8–22 %** (mucho menor
que inmuebles); mediana de concesionaria ≈ mediana de dueño (±5 %), así que el tipo de vendedor
**no** es clave de cohorte (se muestra la composición); 47 de 2.279 con km de relleno (1, 111,
1.111, 111.111); vendedor más grande 36 avisos en 8 modelos. La versión por título contra el
vocabulario `SHORT_VERSION` del modelo coincidió con la faceta oficial en **494 de 498** Onix;
cobertura 80–95 % según modelo ("Comfort" ⊂ "Comfort Plus": gana la coincidencia más larga).

**Precedente SEO** (`docs/seo/2026-09-16-directorios-de-producto-plan.md`): el directorio-hub por
término cabeza no rankea; lo que rankea es la ficha de entidad. "Valor de auto usado" ya tiene
tasadores (autovalor.uy). Por eso lo indexable acá es la **página de mercado por modelo**, no la
ficha de un aviso que vence en semanas, y el producto no se presenta como tasador.

## 2. Alcance v1

- Sólo **usados** (`ITEM_CONDITION=2230581`) de Mercado Libre. 0 km queda fuera: precio de lista,
  otra pregunta.
- Tres superficies públicas:
  1. `/autos-usados-uruguay` — directorio filtrable. Ficha `/autos-usados-uruguay/ml-<id>`
     (`noindex`: vence rápido).
  2. `/autos-usados-uruguay/precios/<marca>-<modelo>` — mercado del modelo: mediana/P25/P75/n por
     año × versión × caja, km mediano, y los avisos vigentes. Indexable con ≥ 30 avisos vigentes.
  3. `/oportunidades-autos-usados-uruguay` — anuncios por debajo de su cohorte, con comparables.
- Fuera de v1 (anotado como siguiente): alertas por mail/Telegram, Clasiautos/Carper/Car One,
  0 km, motos, Marketplace.

## 3. Backend (`classes/autos/`, entrypoint `sync_autos.ts`)

### 3.1 Cosecha (`sources/mercadolibre.ts`)

- Pedido: `GET ${AUTOS_ML_API}/search?country=UY&q=autos&category=MLU1744&q.category=MLU1744&ITEM_CONDITION=2230581&raw=true&limit=20&offset=N[&BRAND=][&MODEL=][&since=today]`.
  `AUTOS_ML_API` default igual a alquileres. Concurrencia 4 (`AUTOS_ML_CONCURRENCY`), 2 intentos,
  timeout 45 s, presupuesto de tiempo y de pedidos por modo.
- Plan: página 0 sin marca → facetas `BRAND`; por marca, página 0 → facetas `MODEL`; por modelo,
  todas las páginas. Si un modelo supera 3.980 (no pasa hoy), se parte por `VEHICLE_YEAR`.
  Remanente sin modelo (suma de facetas < total de la marca) se registra como hueco de cobertura,
  no se inventa.
- Cada página se acepta sólo si `paging.offset` coincide y `BRAND`/`MODEL` figuran en `filters[]`
  aplicados (reuso del criterio de `mlPageMatches`). Si no, la página cuenta como fallida.
- Del primer pedido de cada modelo se guarda el vocabulario `SHORT_VERSION` (nombres).
- Modo `--fast` (horario): mismo plan con `since=today`; sólo agrega/actualiza, **nunca** retira.
- Tarjeta → `RawCarListing` (función pura `toRawCar`): `id`, `brandId/brand`, `modelId/model`
  (del filtro aplicado), `title`, `year`, `km`, `price`, `currency` (USD|UYU; otra → descarta),
  `transmission` (`manual|automatica`, con secuencial/CVT/DHT → automática), `fuel`
  (`nafta|diesel|electrico|hibrido|gnc`), `neighborhood`, `department` (sigla ML → nombre),
  `sellerType` (`dealer|private` por "Concesionaria" en la ubicación), `sellerId`, `picture`
  (host `http2.mlstatic.com` únicamente), `pictureCount`, `permalink` (host
  `auto.mercadolibre.com.uy`), `observedAt`. Tarjetas sin `url_params` (formato tienda oficial) se
  descartan con conteo.

### 3.2 Normalización (`normalize.ts`, pura)

- `engineOf(title)`: `\d\.\d` + turbo (`t`, `turbo`, `tsi`, `tfsi`, `thp`) → `"1.0T"`; eléctricos
  `0.0` → `"EV"`; si no hay → `null`.
- `trimOf(title, vocab)`: tokens normalizados sin tildes; coincidencia de palabra completa; la más
  larga gana si contiene a las demás; si dos coincidencias no se contienen → `null`.
- `kmQuality(km, year)`: `placeholder` si km < 1.000 en usado, o todos los dígitos iguales
  (1, 11, 111, 1.111, 11.111, 111.111, 1.111.111), o km > 1.000.000 → no entra en estadísticas.
- `textFlags(title)` (y luego descripción): `financing_only` (entrega/anticipo/cuotas/"retira con"
  con número), `damaged` (chocado, a reparar, motor fundido/a reparar, para repuestos, por partes,
  siniestro, no arranca), `recovered` (recuperado), `paperwork` (sin papeles/título, deuda,
  embargado, remate, leasing), `foreign_plate` (chapa/placa/matrícula argentina/brasileña/
  paraguaya/extranjera). Todas plural/género-tolerantes (lección de sillas: `rueda\b` no matchea
  "Ruedas").
- `priceUsd`: USD tal cual; UYU con la referencia única del ciclo (`fetchUsdUyuRate`, la misma de
  inmuebles) marcado `converted: true`. **Las estadísticas usan sólo avisos originalmente en USD.**
- Precio plausible: `1.000 ≤ USD ≤ 500.000`; fuera → excluido con motivo.

### 3.3 Almacenamiento (APP DB, vía `classes/appdb.ts`)

| colección | visibilidad | contenido |
|---|---|---|
| `carlistings` | privada | un doc por `ml-<id>`: `listing` (último `RawCarListing`), `firstSeen`, `lastSeen`, `priceHistory[{price,currency,observedAt}]` (sólo cambios, tope 20), `retiredAt`, `detail` (§3.5) |
| `carharvestmetas` | privada | `uy-cars` última corrida y `uy-cars-last-full`: pedidos, páginas fallidas, conteo por marca, huecos, duración, `lastOkAt`, `failingSince` |
| `carcatalog` | pública (proyección explícita) | un doc por aviso vigente |
| `carcatalogmetas` | pública | `uy-cars`: conteos, `freshDays`, `sourceCoverage: "partial"`, fecha, índice de modelos (slug, marca, modelo, n) |
| `carmarketsnapshots` | pública | un doc por modelo (`<marca>-<modelo>` slug) |
| `caropportunitysnapshots` | pública | un doc `used` |

- Retiro: sólo si la ficha declara el aviso inactivo/finalizado, o si un **barrido completo
  exitoso** (sin páginas fallidas en esa marca) no lo vio 2 días seguidos. `--fast` nunca retira.
- Guarda de colapso (igual que inmuebles): si el universo nuevo < 40 % del anterior (con anterior
  > 100) se conserva el catálogo/snapshot previo y se anota el motivo en la meta.
- Ventana pública: `lastSeen` ≤ 4 días (tolera dos corridas diarias caídas); oportunidades ≤ 2 días.

### 3.4 Motor de oportunidades (`analyze.ts`, puro y determinista)

Entrada: listados privados vigentes (≤ 2 días), USD original, km no-relleno, sin `textFlags` de
exclusión, con caja conocida.

**Cohorte** (se fija antes de mirar precios): misma marca+modelo (ids), mismo **año**, misma
**versión** (`trim`), mismo **motor** (`engine`), misma caja, mismo combustible cuando ambos lo
declaran; km del comparable dentro de `max(20.000, 30 % del km del sujeto)`. Sujeto sin versión o
sin motor → no se analiza (queda en el directorio). Máximo 2 comparables por `sellerId`,
ordenados por cercanía de km; hasta 24. Copias posibles (mismo vendedor + mismo año/km/precio, o
mismo id) se retiran de la evidencia.

**Nivel estricto** (`CAR_OPPORTUNITY_POLICY`):
- ≥ 8 comparables, ≥ 4 vendedores distintos;
- dispersión `(P75 − P25) / mediana ≤ 0,30`;
- precio ≤ mediana × 0,85 **y** ≤ P25 × 0,95;
- diferencia ≤ 45 % (más → "revisar", nunca se anuncia);
- km del sujeto ≤ P75 del km de la cohorte ("más barato sin tener más km que la muestra");
- retirando cada vendedor, la diferencia sigue ≥ 10 %.

**Nivel exploratorio**: ≥ 5 comparables, ≥ 3 vendedores, diferencia ≥ 12 %, ≤ P25, retirada de
vendedor ≥ 8 %, resto igual. Siempre rotulado "comparación exploratoria".

**Verificación por ficha** (`detail.ts`), sólo para candidatos de ambos niveles: se lee la ficha
propia (reuso si la lectura tiene < 72 h y el precio no cambió; tope 400 fichas/corrida, 1 pedido
cada 1,5 s). Se exige: `item_status` activo; Marca/Modelo/Año de la tabla coinciden con la
tarjeta; km de la tabla ±1 % del de la tarjeta; precio y moneda del JSON-LD iguales a la tarjeta.
`textFlags` sobre la descripción: cualquier flag de exclusión retira al candidato con motivo. La
"Versión" de la tabla, si no contiene el `trim` asignado, lo retira (`trim_mismatch`). Sin lectura
válida → no se publica como oportunidad. La descripción queda **privada**; al público llega sólo el
nombre de la concesionaria (si la ficha lo muestra) y los flags como motivos de exclusión agregados.

**Salida**: `CarOpportunityItem` con sujeto (proyección pública), `tier`, `gap`, `conservativeGap`,
`sellerSensitivityGap`, mediana/P25/P75 de precio y km, `n`, `sellers`, composición
dueño/concesionaria, comparables (id, título, año, km, precio, vendedor-tipo, permalink,
lastSeen) y `detailReadAt`. Además `stats` (entrada, analizados, excluidos por motivo, candidatos,
verificados, retirados por ficha) y `coverage`. Tope 2.000 ítems / 7 MiB.

**Mercado por modelo** (`market.ts`): para cada modelo, filas año × versión × motor × caja con ≥ 5
avisos (mismos filtros de calidad): n, vendedores, P25/mediana/P75 USD, km mediano. Sólo
descriptivo; no es tasación.

### 3.5 Ejecución

- `sync_autos.ts`: `--fast` (since=today), `--analyze-only` (sin cosechar), `--dry-run`
  (no escribe), `--report=<archivo>`, `--harvest-snapshot=<archivo>` (reprocesa una captura).
  Rehúsa sin `APP_MONGO_URI`.
- `scripts/run-autos.sh`: `flock -n` sobre `/tmp/cambio-uruguay-autos.lock`.
- pm2: `currency-autos` `43 7 * * *` (completo + análisis + publicación; después de la ventana de
  alquileres que también usa el puente); `currency-autos-hourly` `29 * * * *` con `--fast`.
  Ambos `autorestart:false`, en `OTHER_APPS`, wrapper agregado al filtro backend de `deploy.yml`.
- Env: `AUTOS_ML_API`, `AUTOS_ML_CONCURRENCY`, `AUTOS_ML_ENABLED=0` (kill switch),
  `AUTOS_DETAIL_MAX`.

## 4. Frontend (`app/`)

- Server models `app/server/models/CarCatalog.ts` (catalog + metas), `CarMarketSnapshot.ts`,
  `CarOpportunitySnapshot.ts`, con paridad de esquema contra los `appModel` del backend.
- APIs (proyección explícita, 503 si no hay meta/snapshot, 200 vacío honesto, `s-maxage=120`):
  - `GET /api/cars` — filtros `q, brand, model, yearMin, yearMax, kmMax, priceMin, priceMax (USD),
    fuel, transmission, department, seller (dealer|private), sort (recent|price_asc|price_desc|
    km_asc|year_desc)`, `page`, `perPage ≤ 48`; facetas marca/modelo/departamento/combustible/caja.
  - `GET /api/cars/ficha/:key` — aviso + fila de mercado de su cohorte + otros avisos del modelo.
  - `GET /api/cars/market/:slug` — snapshot de modelo + avisos vigentes (máx. 48).
  - `GET /api/car-opportunities` — snapshot con filtros en memoria (tier, marca, presupuesto USD,
    departamento, vendedor) y paginado; caché en memoria 180 s.
- Páginas: `pages/autos-usados-uruguay/index.vue`, `[key].vue` (con key `ml-MLU\d+`; las rutas
  `precios/[slug].vue` van en su carpeta), `pages/oportunidades-autos-usados-uruguay.vue`.
  Componentes en `components/cars/`: `ListingCard`, `Filters` (drawer en móvil), `OpportunityCard`
  (comparables en `<details>` nativo), `MarketTable`.
- SEO: canonical sin parámetros; variantes filtradas `noindex,follow`; ficha `noindex`; página de
  modelo indexable con ≥ 30 avisos y en sitemap; JSON-LD `CollectionPage`/`ItemList`/
  `BreadcrumbList` (ficha: `Vehicle` + `Offer`). Títulos ≤ 60 caracteres con marca.
- Registro: `siteNav.ts` (sección de autos/consumo, `DYNAMIC_ROUTE_KEYS` para `[key]` y
  `precios/[slug]`), `nav.*` en es/en/pt, `relatedPages.ts` (enlaza `/comprar-auto-con-deuda-uruguay`,
  `/guias/transferir-un-auto-uruguay`, `/multas-de-transito-y-patente-uruguay`,
  `/precio-de-la-nafta-uruguay`, `/guias/costos-de-tener-auto-uruguay`), sitemap de modelos,
  `seoContract` (`NOINDEXED` para la ficha), regex de admisión SSR si aplica.
- i18n: mensajes locales es/en/pt en `utils/carsMessages.ts` (patrón de `propertySalesMessages`),
  sin `|` crudo.
- Textos obligatorios en oportunidades: "No es una tasación"; "precio pedido, no de cierre";
  "verificá con el Certificado SUCIVE antes de señar" → `/comprar-auto-con-deuda-uruguay`; método
  con los umbrales reales; fecha de la lectura; n y vendedores de cada comparación.

## 5. Privacidad y honestidad

- No se publica: `sellerId`, descripción, teléfonos, nombres de dueños particulares, `priceHistory`
  crudo (sí "bajó US$ X desde <fecha vista>" cuando lo observamos), URLs fuera de hosts permitidos.
- Nombre de concesionaria: sólo desde la ficha, sólo si `sellerType = dealer`.
- Conteos = avisos observados, nunca "autos en Uruguay". Cobertura siempre `partial`.
- "Visto por primera vez" es nuestra fecha, nunca "publicado".
- La valoración propia de ML ("Precios de referencia") no se lee ni se publica.

## 6. Pruebas

- Backend (vitest, fixtures inline como `mlSweep.test.ts`): `toRawCar` (tarjeta completa, sin
  `url_params`, moneda rara, host extraño); `engineOf`/`trimOf`/`kmQuality`/`textFlags` con casos
  reales de la muestra (Joy vs Joy Plus, Comfort vs Comfort Plus, 1.0t, 111.111 km, "chocado entero
  o por partes", "entrega 10 y cuotas"); plan de cosecha con offset reseteado y filtro no aplicado;
  retiro sólo con barrido completo; guarda de colapso; motor: cohorte fijada antes del precio,
  tope por vendedor, retirada de vendedor, km no mayor, >45 % a revisar, determinismo; verificación
  por ficha (fixture HTML recortado real); proyección pública sin campos privados; tripwires
  (`pm2_registration`, wrapper en filtro de deploy, `schema_parity`).
- App: `carsQuery` (inyección de operadores, round-trip de query), privacidad de proyección, API
  503/404/200 vacío, `seoContract`/`siteNav-coverage`/`pageContainer`/`seoTitleBudget` en verde.
- Verificación real: `sync_autos.ts --dry-run --report` contra el puente real desde local
  (escribe sólo el reporte), revisión a mano de las oportunidades del reporte, y medición en
  producción después del deploy (colecciones pobladas, páginas 200, conteos).

## 7. Riesgos anotados

- Robots/términos de ML: el listado va por el puente como ya hacen alquileres y sillas; si ML
  corta el puente, el kill switch deja el último catálogo y la meta lo dice.
- La versión por título falla en 5–20 % de avisos: esos quedan fuera del análisis, no mal
  comparados.
- Precio publicado ≠ precio de cierre; km declarado no verificado. Se dice en la página.
