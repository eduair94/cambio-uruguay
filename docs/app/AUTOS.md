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

## Jobs

- `currency-autos` (07:43 UTC): barrido completo, análisis y publicación.
- `currency-autos-hourly` (:29): sólo `since=today`; nunca retira avisos.
- Ambos por `scripts/run-autos.sh` (flock propio). `AUTOS_ML_ENABLED=0` publica sin cosechar.

## Colecciones (APP DB)

Privadas: `carlistings` (observación, historial de precio, ficha con descripción) y
`carharvestmetas` (`uy-cars`, `uy-cars-last-full`, `uy-cars-last-fast`, `uy-cars-vocabulary`).
Públicas: `carcatalog`, `carcatalogmetas` (`uy-cars`), `carmarketsnapshots`, `caropportunitysnapshots` (`used`).

Un aviso se retira sólo si su ficha da 404/410 o si dos barridos completos de su marca, sin páginas
fallidas, no lo vieron. Una caída del universo mayor a 60 % conserva lo publicado.

## Diagnosticar

Leer `carharvestmetas` `uy-cars-last-full`: `ok`, `note`, `failedPages`, `gaps`, `lastOkAt`,
`failingSince`. Reprocesar sin red: `node dist/sync_autos.js --dry-run --harvest-snapshot=<archivo> --report=<salida>`.
Guardar una captura: `--save-harvest=<archivo>`.

## Método de oportunidades

Cohorte fijada antes de mirar precios: misma marca+modelo, año, versión (vocabulario `SHORT_VERSION`
de ML contra el título), motor y caja; km dentro de `max(20.000, 30 %)`. Umbrales en
`classes/autos/analyze.ts` (`CAR_OPPORTUNITY_POLICY`), publicados dentro del snapshot. Toda
oportunidad publicada pasó por su ficha: activa, mismo precio/año/km, sin menciones de choque,
recupero, deuda/leasing o chapa extranjera. No es tasación.
