# TikTok como fuente del directorio de alquileres — diseño (2026-09-23)

## Qué se pide

Agregar a `/alquileres-uruguay` los alquileres que las inmobiliarias y particulares publican en
TikTok, como el ejemplo `https://vt.tiktok.com/ZSbJ6eN9S/` (→ `@inmobiliariaalquilar`, video
`7688511584326454549`): un video de 25 s cuya **leyenda** trae precio, gastos comunes,
dormitorios, baño, esquina, barrio, garantías y teléfono. Con un scraper open source; proxies si
hacen falta.

## Lo medido antes de diseñar (2026-09-23)

| prueba | resultado |
|---|---|
| `yt-dlp -J <video>` (local) | funciona: `description`, `uploader`, `channel_id` (secUid), `timestamp`, `thumbnail`. |
| `yt-dlp` listado de cuenta / hashtag | **no**: la API firmada devuelve vacío; `tiktok:tag` está marcado `_WORKING = False`. |
| `GET /@user/video/<id>` con UA de navegador, HTTP plano, desde el VPS | 200, 450 KB, con `__UNIVERSAL_DATA_FOR_REHYDRATION__` → `webapp.video-detail.itemInfo.itemStruct` (desc, author, createTime, cover, textExtra, `locationCreated: "UY"`). **No hace falta yt-dlp para un video.** |
| `GET /@user` HTTP plano | 1,4 KB: desafío del WAF (`Please wait...`). Necesita navegador. |
| `GET /tag/<tag>` HTTP plano | 400 KB pero sin videos: la lista la trae el cliente por `/api/challenge/item_list/`. |
| Chrome headless local, `/@user` | con `--disable-blink-features=AutomationControlled` y UA sin `HeadlessChrome`: `/api/post/item_list/` devuelve los 20 videos en 2 páginas. Sin la bandera: cuerpo vacío. |
| Chrome headless local, `/tag/<tag>` | vacío en frío; **con cookies calentadas en una página de video antes**: 5 páginas × 30 videos, `hasMore`. 25 cuentas distintas en 50 videos. |
| VPS (IP de datacenter), Chrome 117 del sistema, headless o el Chrome del perfil de Facebook (CDP :9224) | `item_list` con cuerpo **vacío** en ambos. |
| VPS, mismo Chrome 117, `--proxy-server=<proxy.txt>` | **lista completa** (30/página, `hasMore`). El bloqueo es por IP, no por navegador. |
| Chrome 131/148 de puppeteer en el VPS | no arrancan: `GLIBC_2.25 not found`. Sólo corre el 117 del sistema. |
| `robots.txt` de tiktok.com | `User-agent: *` **permite `/tag`**; **prohíbe `/search?`**, `/api/recommend/embed_videos`, `/embed/@`. `/@user` y `/@user/video/<id>` no están listados (permitidos). |
| `oembed` | el `thumbnail_url` es la misma URL firmada del cover (`x-expires` ≈ 36–48 h). No hay miniatura durable. |

Conclusión: el "scraper open source" es **el propio puppeteer del repo**, con el patrón que ya usa
El País (`elpais_browser.ts`): un Chrome real, un solo lanzamiento por corrida, presupuesto de
tiempo, cierre en `finally`. Sin login, sin firmar peticiones a mano, sin `/search`. La única
pieza nueva de infraestructura es **el proxy**: TikTok no lista nada desde la IP del VPS y sí
desde el proxy que el repo ya tiene en `proxy.txt` (el de Prex).

## Alcance

**Entra**
- Fuente nueva `tiktok` (`RentalSource`), etiqueta "TikTok", `listingId = tiktok:<videoId>`,
  `url = https://www.tiktok.com/@<uniqueId>/video/<id>`.
- Descubrimiento por **hashtags** (`/tag/...`, permitido por robots) y **cuentas** (`/@user`):
  toda cuenta que produjo un aviso publicado queda registrada y se relee en cada corrida completa.
- **Importación manual** de videos sueltos (`RENTALS_TIKTOK_VIDEOS`, admite `vt.tiktok.com/...`):
  resuelve la redirección y lee la página del video por HTTP plano (no necesita proxy). Es la
  vía del ejemplo del pedido.
- Parser puro de leyendas con **precisión sobre recall**: precio, moneda, gastos comunes,
  dormitorios/baños/m² (`parseAttributes`), tipo (`inferPropertyType`), barrio y departamento
  (`neighborhoodFromText` + hashtags), esquina/dirección (`addressCandidates`) geocodificada con la
  regla de aceptación de Facebook (`acceptGeocode`), garantías (`guaranteesFromText`), fecha de
  publicación real (`createTime`), descripción saneada (`rentalDescription`: sin teléfonos).
- Colección privada `rentaltiktokposts` (un doc por video leído: leyenda, parseo, geocodificación,
  estado) y `rentaltiktokaccounts` (registro de cuentas: cuándo se leyó, cuántos avisos dio).
- Sólo en la **corrida completa** (04:52 UTC). La horaria devuelve `ok: true, listings: []` con
  nota "sólo en la corrida completa": un Chrome por hora en el VPS es un riesgo que ya costó una
  caída, y las leyendas no cambian de hora en hora.

**No entra (v1)**
- Contactos: el teléfono está en la LEYENDA y la política de `PROPERTY_ADVERTISERS.md` excluye
  contactos tomados de descripciones. `rentalDescription` los borra. La bio de la cuenta tampoco
  se copia. `agency`/`publicContact` quedan `undefined` (no inspeccionados).
- `sellerType`: sólo lo que el TEXTO propio declara (`advertiserClassification` sobre la
  leyenda). El nombre de la cuenta ("Inmobiliaria X") no convierte a nadie en inmobiliaria.
- Unificación con otros portales: sin dirección exacta con número la fila queda separada, como
  Facebook. Una esquina no es una dirección.
- Búsqueda de TikTok (`/search?`): prohibida por robots. No se usa.
- Lectura horaria y una app de pm2 nueva.

## Arquitectura

```
classes/rentals/sources/tiktok/
  caption.ts    parser puro: leyenda → hechos (precio, GC, tipo, barrio, esquina, rechazos)
  item.ts       TiktokPost (forma normalizada de itemStruct) → RawRental | null
  page.ts       lectura HTTP plana de /@user/video/<id> (itemStruct del JSON embebido) + resolución de vt.tiktok.com
  browser.ts    puppeteer: lanza Chrome (proxy), calienta cookies, lee /tag/<tag> y /@user capturando item_list
  store.ts      rentaltiktokposts / rentaltiktokaccounts (APP DB)
  index.ts      harvestTiktok(mode, usdUyu, deps)
classes/models/RentalTiktokPost.ts, RentalTiktokAccount.ts
tests/rentals/tiktok.test.ts (+ fixtures/tiktok-captions.json con leyendas reales)
```

`harvestTiktok` se registra en `classes/rentals/sources/index.ts` junto a las otras cinco y
devuelve el mismo `RentalSourceResult`.

### Corrida completa, paso a paso

1. `RENTALS_TIKTOK_ENABLED=0` → `{ ok: true, complete: false, listings: [], note: "deshabilitado" }`.
2. Proxy: `RENTALS_TIKTOK_PROXY` (URL o `host:port`), si no la primera línea de `proxy.txt`, si no
   ninguno (la nota lo dice; la corrida sigue y casi seguro lista cero).
3. Videos manuales (`RENTALS_TIKTOK_VIDEOS`): HTTP plano, sin navegador. Sus autores entran al
   registro de cuentas.
4. Navegador (presupuesto total `RENTALS_TIKTOK_BROWSER_BUDGET_MS`, 15 min; pausa
   `RENTALS_TIKTOK_GAP_MS` 2 s entre cargas):
   a. calienta cookies en una página de video;
   b. hashtags (`RENTALS_TIKTOK_TAGS`, por defecto `alquilermontevideo,alquileruruguay,
      alquileresmontevideo,alquilermvd,alquileresuruguay`), hasta `RENTALS_TIKTOK_TAG_PAGES` (3)
      páginas de 30 cada uno;
   c. cuentas: las del registro más las semilla (`RENTALS_TIKTOK_ACCOUNTS`, por defecto
      `inmobiliariaalquilar`) más las descubiertas en este paso (autores de videos que el parser
      aceptó), ordenadas por `lastReadAt` ascendente, hasta `RENTALS_TIKTOK_MAX_ACCOUNTS` (60) y
      `RENTALS_TIKTOK_ACCOUNT_PAGES` (3) páginas cada una; se corta al llegar a videos más viejos
      que la ventana.
5. Cada video pasa por el parser; los aceptados se vuelven `RawRental` y los otros se guardan en
   `rentaltiktokposts` con su motivo (`alquilado`, `sin precio`, `precio ambiguo`, `venta`, …),
   para medir el parser contra lo real sin volver a pedir nada.
6. Geocodificación sólo de videos **nuevos** con candidato de esquina/dirección, presupuesto
   `RENTALS_TIKTOK_GEOCODE_MAX` (60), `acceptGeocode` + `pointContradictsBarrio` como en
   `sync_rentals_detail.ts`; el resultado se guarda en el post y se reutiliza.
7. `complete: true` **sólo** si se leyeron TODAS las cuentas del registro hasta el fin de la
   ventana o `hasMore: false`: recién entonces la ausencia de un video (borrado o editado a
   "ALQUILADO") es evidencia y la oferta caduca por `staleOfferDays`. Si el presupuesto cortó,
   `complete: false` y nada caduca.

### Ventana de vigencia

Un video no se "baja" cuando el apartamento se alquila: a lo sumo la inmobiliaria edita la
leyenda ("ALQUILADO"). Por eso hay ventana: `RENTALS_TIKTOK_MAX_AGE_DAYS` (45) desde
`createTime`; un video más viejo no se publica. Una leyenda con `alquilad[oa]`, `traspaso`,
`venta` sin `alquil`, `busco`, o evidencia de temporal (`rentalPeriodEvidence`) se rechaza.

### Reglas del parser (precisión sobre recall)

- Tiene que parecer un aviso de alquiler (`looksLikeRentalAdvert` + verbo de alquiler presente).
- **Precio**: montos con marca de moneda (`$`, `$U`, `U$S`, `USD`, `US$`, `pesos`, `dólares`).
  Un monto con etiqueta de gastos comunes (`gastos comunes`, `gc`, `g.c.`, `expensas`) es GC;
  con etiqueta de depósito/garantía/seña/comisión/honorarios se ignora; con etiqueta de
  `precio`/`alquiler`/`mes`/`mensual` es el precio. Sin etiqueta: es el precio sólo si es el
  ÚNICO monto sin etiqueta; con dos distintos, **abstención** (sin precio no hay aviso).
  `$` solo = UYU. Después, `isPlausibleRent` con la tasa de la corrida como en todas las fuentes.
- **Título**: la primera línea de la leyenda sin emojis ni hashtags (≤ 120), o el texto hasta el
  primer separador; nunca vacío.
- **Departamento**: nombre de departamento en el texto o en un hashtag compuesto
  (`#alquilermontevideo`, `#montevideo`); dos departamentos distintos → vacío. **Barrio**:
  `neighborhoodFromText(texto + hashtags, departamento)`; un barrio de Montevideo único sin
  departamento nombra Montevideo (regla existente de localidad única).
- **Coordenada**: sólo de esquina/dirección del propio texto geocodificada y aceptada; nunca
  del `locationCreated` (es el país) ni de un centroide.
- **Imagen**: el `cover` firmado del video (caduca en ~36–48 h). Se refresca cada vez que la
  cuenta se relee; con 60 cuentas por corrida y lectura diaria, cada cuenta se relee todos los
  días. Se documenta que una cuenta fuera de presupuesto queda con imagen vencida hasta su
  próxima lectura.

### Buenos modales

Un Chrome por corrida, 2 s entre cargas, sin login, sin `/search`, sólo rutas que robots permite
o no lista; cabecera `x-cambio-uruguay-bot` en las peticiones que salen de Node (la página del
video y la resolución de `vt.tiktok.com`). El proxy cambia la RED, no la identidad, igual que en
`classes/autos/sources/proxy.ts`. Los términos de TikTok restringen el acceso automatizado: la
decisión de leer igual la toma el dueño del sitio (pedido del 2026-09-23) y `RENTALS_TIKTOK_ENABLED=0`
apaga la fuente sin desplegar.

## Cambios fuera del harvester

- `classes/rentals/types.ts`: `RentalSource` + `RENTAL_SOURCES` + `RENTAL_SOURCE_LABEL`.
- Espejos que enumeran las fuentes: `app/utils/rentals.ts`, `app/utils/rentalAvailability.ts`,
  `app/utils/propertyOpportunities.ts`, `classes/pricehistory/marketLog.ts`,
  `classes/propertyzones/project.ts`, `classes/propertyopportunities/{types,analyze}.ts`,
  `mcp/src/rentals/types.ts`. Tests que los fijan: `app/tests/unit/rentalsCoverage.test.ts`,
  `app/tests/e2e/rentals.spec.ts` (tabla de cobertura).
- `sync_rentals.ts`: sin cambios (la fuente entra por `harvestRentalMarket`).
- Docs: `docs/app/RENTALS.md` (fila en "Fuentes" + sección fechada), `AGENTS.md` (celda de
  `currency-rentals`), memoria.
- VPS: nada nuevo en pm2. `proxy.txt` ya existe; `RENTALS_TIKTOK_PROXY` es opcional.

## Pruebas

- `tests/rentals/tiktok.test.ts`: parser contra ~15 leyendas reales (fixture), rechazos, mapeo a
  `RawRental`, departamento por hashtag, `complete` según presupuesto, deshabilitado, sin proxy,
  navegador que no arranca (nunca lanza), videos manuales por HTTP con `fetchText` mockeado.
- App: paridad de fuentes y cobertura (unit), e2e de la tabla de cobertura.
- Medición en producción: primera corrida completa → nota de la fuente en `rentalmetas`,
  `rentaltiktokposts` con motivos de rechazo, y la ficha del video del ejemplo publicada.
