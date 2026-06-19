# Courier gap-fill + reputation research — for `courierShipping.ts` / `couriers-uruguay.vue`

Access date: 2026-06-19. Per-kg rates are the representative small-parcel tier (US$/kg), verified
from each courier's published tariff page. Plausibility band US$5–60. Every rate/rating traces to a
source URL; unverifiable → `null` ("Consultar" / no stars).

## Part A — gap fills (the three current `null`-rate couriers)

| id | perKgUsd | baseUsd | source | htmlScrapable | decision |
|----|----------|---------|--------|---------------|----------|
| urubox | **19.90** | **5** | https://www.urubox.com.uy/tarifas-envios.html | **YES** | FILL |
| miami-box | null | null | https://www.miami-box.com/precios | NO (JS SPA, empty HTML) | keep null |
| exur | null | null | https://www.exurenvios.com/Calculadora.aspx | NO (JS calculator) | keep null |

- **urubox** — transit "3–5 días". note: "1–4,99 kg US$19,90/kg; 5–9,99 kg US$17,90; 10–19,99 kg US$16,50; <1 kg por tramos (desde US$10,90); libros US$11,90/kg; +10% TSPU; manejo US$5". source: https://www.urubox.com.uy/tarifas-envios.html
- **miami-box** — current site is a blank JS SPA; legacy site only ever listed a handling fee, never a per-kg freight rate. Keep `perKgUsd`/`baseUsd` null + existing "Consultá la tarifa por peso en su sitio" note.
- **exur** — pricing only behind a JS calculator; a 2019 third-party per-pound figure exists but is dated/incompatible. Keep null.

## Part B — new couriers to ADD (verified rate + HTML source)

| id | name | perKgUsd | baseUsd | transit | website | source |
|----|------|----------|---------|---------|---------|--------|
| starbox | StarBox Uruguay | 21 | 5 | — | https://www.starboxuruguay.com | https://www.starboxuruguay.com/ |
| buybox | BuyBox | 18.90 | 5 | — | https://www.buybox.com.uy | https://www.buybox.com.uy/tarifas.html |
| grinbox | Grinbox | 22 | null | ~7 días | https://www.grinbox.uy | https://www.grinbox.uy/servicios/comprar-en-usa-desde-uruguay |
| glic | Glic | 22.99 | null | 3–10 días hábiles | https://glicglobal.com/uy/ | https://glicglobal.com/uy/calculadora.html |

Notes (use as `note`):
- **starbox**: "0–500 g US$17 fijo; 501–999 g US$21; 1–4,99 kg US$21/kg; 5–10 kg US$20/kg; +10% TSPU; manejo US$5+IVA; interior +US$10". modality "Casillero en Miami".
- **buybox**: "1,01–3 kg US$18,90/kg; 0,5–1 kg US$21; 3–5 kg US$16,90; 5–10 kg US$15,90; 10–20 kg US$13,90; libros US$9,99/kg; +10% TSPU; manejo US$5". modality "Casillero en Miami, Europa y Argentina".
- **grinbox**: "US$2,20/100 g (=US$22/kg); libros/CD/DVD US$1,20/100 g (=US$12/kg); +10% TSPU; vuelo semanal Miami→MVD; sin cargo de afiliación". modality "Casillero en Miami".
- **glic**: "US$22,99/kg; consolidación gratis; 60 días de depósito gratis; vuelos semanales". modality "Casillero en Miami".

Not added (unverifiable — 404 / 403 / search-snippet only, no live source): MeLoTRAIGO, eShopMiami,
Netbox World, StarBox-vs others duplicates. Document in Task 8 commit if asked.

## Part C — reputation for the full courier set (existing + new)

Ratings are Google-Maps / aggregator stars where verifiable; `null` when no reliable independent
reviews were found (forum praise without a numeric score → null with context sources).

| id | rating | reviewsNote (es) |
|----|--------|------------------|
| gripper | 4.9 | "El mejor calificado del segmento: rápido (3–7 días), buena atención telefónica; alguna crítica por precio algo alto." |
| usxcargo | 4.7 | "Muy recomendado en foros por precio competitivo y atención personalizada; quejas por coordinación con entregadores tercerizados." |
| aerobox | 4.2 | "Buena atención por WhatsApp y dos vuelos semanales; algunas críticas por precio y cobertura fuera de Montevideo." |
| urubox | 4.0 | "Opiniones polarizadas: leales destacan profesionalismo sin cargo de consolidación; críticos reportan demoras y cargos extra en Tres Cruces." |
| exur | 4.0 | "Courier establecido valorado por seriedad y manejo aduanero; algunos reportan trato seco en el local y respuestas lentas por email." |
| miami-box | 3.8 | "Servicio en declive según usuarios recientes: demoras en notificaciones y envíos sin aprobación del cliente; varios lo desaconsejan." |
| casillamia | 1.9 | "Reputación muy negativa: demoras extremas y mala comunicación pese a ser de los más baratos. El peor calificado del grupo." |
| soycourier | null | "Solo testimonios en su propio sitio; sin reseñas independientes verificables (operador nuevo)." |
| uruguaycargo | null | "Sin reseñas de usuarios localizables en plataformas públicas." |
| enviamicompra | null | "Experiencias mayormente positivas en foros (confiable, fotos de paquetes); quejas por precio y soporte de chat. Sin rating numérico verificable." |
| puntomio | null | "Muy valorado por precio (de los más baratos) y descuento de IVA Amazon; quejas por consolidaciones lentas. Sin rating numérico verificable." |
| starbox | null | "Operador menor; sin reseñas independientes verificables a la fecha." |
| buybox | null | "Sin rating numérico independiente verificable." |
| grinbox | null | "Sin rating numérico independiente verificable." |
| glic | null | "Sin rating numérico independiente verificable." |

### reviewSources per rated courier (use these {label,url})

- **gripper**: [{label:"baratoenchina.com — comparativo couriers (4,9★ Google)", url:"https://baratoenchina.com/mejores-couriers-uruguay/"}, {label:"La Onda Digital — mejores couriers", url:"https://www.laondadigital.uy/mejores-couriers-en-uruguay-para-comprar-en-china/"}]
- **usxcargo**: [{label:"Nicelocal — USX Cargo (4,7★)", url:"https://nicelocal.uy/montevideo/utility_service/usx_cargo/"}, {label:"mtb.uy — experiencia con USX Cargo", url:"https://mtb.uy/temas/experiencia-con-usx-cargo-uruguay.15299/"}]
- **aerobox**: [{label:"baratoenchina.com (4,2★, 426 reseñas)", url:"https://baratoenchina.com/mejores-couriers-uruguay/"}, {label:"La Onda Digital — comparativo", url:"https://www.laondadigital.uy/mejores-couriers-en-uruguay-para-comprar-en-china/"}]
- **urubox**: [{label:"RentechDigital — Google Maps MVD (4,0★, 492 reseñas)", url:"https://rentechdigital.com/smartscraper/business-report-details/uruguay/list-of-courier-services-in-montevideo-department"}, {label:"gameover.uy — hilo couriers", url:"https://www.gameover.uy/showthread.php?15640-Courier-que-recomienden&p=301939"}]
- **exur**: [{label:"Cybo — EXUR Envíos (4,0★)", url:"https://es.cybo.com/UY-biz/exur-env%C3%ADos"}, {label:"gameover.uy — hilo couriers", url:"https://www.gameover.uy/showthread.php?15640-Courier-que-recomienden&p=301939"}]
- **miami-box**: [{label:"baratoenchina.com (3,8★, 633 reseñas)", url:"https://baratoenchina.com/mejores-couriers-uruguay/"}, {label:"gameover.uy — desaconsejado por usuarios", url:"https://www.gameover.uy/showthread.php?15640-Courier-que-recomienden&p=301939"}]
- **casillamia**: [{label:"baratoenchina.com (1,9★ — el peor)", url:"https://baratoenchina.com/mejores-couriers-uruguay/"}, {label:"mtb.uy — mala experiencia con Casilla Mía", url:"https://mtb.uy/temas/mala-experiencia-con-casilla-mia.7294/"}]

For the `null`-rated couriers (soycourier, uruguaycargo, enviamicompra, puntomio, starbox, buybox,
grinbox, glic): leave `rating` absent/null and `reviewSources` `[]` (or, for enviamicompra/puntomio
which have forum context, optionally a single forum link). Do not assign a numeric rating.

## Part D — Task 9 (scraper parsers) guidance

HTML-scrapable rate pages confirmed (raw text contains the per-kg figure):
- **urubox** — https://www.urubox.com.uy/tarifas-envios.html — representative 1–4,99 kg tier = first US$ value in the 18–22 band (=19,90).
- **starbox** — homepage — first value in 20–22 band (=21).
- **buybox** — https://www.buybox.com.uy/tarifas.html — 1,01–3 kg tier, value in 18–20 band (=18,90).
- **glic** — https://glicglobal.com/uy/calculadora.html — "US$ 22,99 … kg" single rate.
- **grinbox** — per-100 g pattern (US$2,20/100 g → ×10); anchor on "2,20" then ×10, OR skip (per-100 g
  format differs from the existing `usdValues` model — lower priority).

At minimum add a **urubox** parser (the headline gap fill). Add starbox/buybox/glic if the anchor is
clean. JS-only couriers (miami-box, exur, puntomio, usxcargo) are NOT scrapable — seed values stand.
