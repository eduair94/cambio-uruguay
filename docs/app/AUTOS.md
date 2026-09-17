# Autos usados: directorio y oportunidades

Páginas: `/autos-usados-uruguay` (directorio), `/autos-usados-uruguay/ml-<id>` (ficha, `noindex`),
`/autos-usados-uruguay/precios/<marca>-<modelo>` (mercado del modelo, indexable con ≥ 30 avisos) y
`/oportunidades-autos-usados-uruguay`. Diseño y mediciones:
`docs/superpowers/specs/2026-09-16-autos-usados-directorio-y-oportunidades-design.md`.

## Fuente

Sólo Mercado Libre (categoría `MLU1744`, usados): ~95 % del volumen uruguayo medido el 2026-09-16.
Se lee por el puente `:9656` (pm2 `mercadolibre`, repo trustpilot) partiendo marca → modelo: un
`offset` ≥ 4000 vuelve a la página 0, y marca y modelo salen del filtro aplicado. La ficha propia
(`auto.mercadolibre.com.uy/MLU-…`) se lee sólo para candidatas a oportunidad.

**El barrido es secuencial, con 1,5 s entre pedidos, y eso lo hace durar unas dos horas.** Medido el
2026-09-17: con 4 pedidos en paralelo, a los 6 minutos Mercado Libre le contestó 429 al puente, y el
puente (`trustpilot/dist/classes/MercadoLibre.js`, `mobileGet`) pasa entonces **10 minutos** buscando
por su proxy residencial —para todos los jobs que lo usan: alquileres, sillas, equipar— con hasta 12
intentos por pedido; el proxy devolvió 502 y se perdieron 700 de 1.517 páginas. Por eso el cosechador
no reintenta dentro de `fetchJson`, y cuando el puente falla 3 veces seguidas espera 11 minutos una
sola vez y relee lo perdido (`CAR_HARVEST_RETRY`, hasta 3 intentos por página). `AUTOS_ML_GAP_MS` y
`AUTOS_ML_CONCURRENCY` ajustan el ritmo.

## Jobs

- `currency-autos` (07:43 UTC): barrido completo, análisis y publicación.
- `currency-autos-hourly` (:29): sólo `since=today`; nunca retira por ausencia (sí retira un
  aviso si su ficha propia da 404/410, igual que el barrido completo).
- Ambos por `scripts/run-autos.sh` (flock propio). `AUTOS_ML_ENABLED=0` publica sin cosechar.

## Colecciones (APP DB)

Privadas: `carlistings` (observación, historial de precio, ficha con descripción) y
`carharvestmetas` (`uy-cars`, `uy-cars-last-full`, `uy-cars-last-fast`, `uy-cars-vocabulary`,
`uy-cars-publish`).
Públicas: `carcatalog`, `carcatalogmetas` (`uy-cars`), `carmarketsnapshots`, `caropportunitysnapshots` (`used`).

Un aviso se retira sólo si su ficha da 404/410 o si dos barridos completos de su marca, sin páginas
fallidas, no lo vieron. Una caída del universo mayor a 60 % conserva lo publicado.

## Diagnosticar

Leer `carharvestmetas` `uy-cars-last-full`: `ok`, `note`, `failedPages`, `gaps`, `lastOkAt`,
`failingSince`. El rechazo de la última publicación (si lo hubo) vive aparte, en
`carharvestmetas` `uy-cars-publish`. Reprocesar sin cosechar (lee fichas y la cotización):
`node dist/sync_autos.js --dry-run --harvest-snapshot=<archivo> --report=<salida>` (`--harvest-snapshot`
exige `--dry-run`: nunca escribe una cosecha vieja sobre la base en producción).
Guardar una captura: `--save-harvest=<archivo>`.

## Método de oportunidades

Cohorte fijada antes de mirar precios: misma marca+modelo, año, versión (vocabulario `SHORT_VERSION`
de ML contra el título), motor y caja; km dentro de `max(20.000, 30 %)`. Umbrales en
`classes/autos/analyze.ts` (`CAR_OPPORTUNITY_POLICY`), publicados dentro del snapshot. Toda
oportunidad publicada pasó por su ficha: activa, mismo precio/año/km, sin menciones de choque,
recupero, deuda/leasing o chapa extranjera. No es tasación.
