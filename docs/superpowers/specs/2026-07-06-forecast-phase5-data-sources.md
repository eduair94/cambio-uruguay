# Fase 5 (Forecast) — Data-source research notes

**Fecha:** 2026-07-06. Fuente: research agent, todas las URLs testeadas en vivo.
**Decisiones ya tomadas con el usuario:** método = bandas de escenario + ancla citable (no línea de punto); horizonte = selector 3m/6m/12m/24m/36m; justificación = drivers de Fase 1.

## Conclusión de método
El **ancla citable ideal (encuesta de expectativas BCU) NO es machine-readable** para tipo de cambio (solo PDF). Por lo tanto el método **load-bearing** es:

1. **Línea central = forward sintético por paridad de tasas cubierta (CIP):**
   `F ≈ S × (1 + i_UYU·t) / (1 + i_USD·t)`
   con `S` = spot USD/UYU (serie BCU ya en la app), `i_UYU` = TPM Uruguay, `i_USD` = SOFR/T-bill (FRED). Da una trayectoria de depreciación implícita defendible (UYU tiene tasa alta → forward implica suba del dólar).
2. **Banda = cono de volatilidad:** `σ_h = σ_daily × √(días_hábiles_horizonte)`, banda `F ± z·σ_h` (z≈1.645 → 90%). `σ_daily` = stdev de log-returns diarios de la serie USD/UYU (reusa util Fase 1). i.i.d./random-walk estándar.
3. **Overlay opcional (no dependencia dura):** mediana de la encuesta BCU (scrapeada de PDF) y/o REM Argentina como sanity-check cualitativo. Disclaimers fuertes: FX ≈ random-walk, no es asesoría financiera.

## Fuentes verificadas (key-free salvo nota)

| Uso | Fuente | Formato | Key | Frecuencia | Veredicto |
|---|---|---|---|---|---|
| i_USD (tasa corta US) | FRED `fredgraph.csv?id=SOFR` / `id=DTB3` / `id=DFF` | CSV | **NO** | diaria | USABLE |
| i_UYU (TPM Uruguay) | `bcu.gub.uy/.../Tasas-de-Politica-Monetaria/tasascp.xls` | XLS | no | ~bimestral (COPOM) | USABLE |
| Spot USD/UYU | serie BCU ya en la app (backend `/evolution/bcu/USD`) | — | — | diaria | ya disponible |
| Vol realizada | cómputo sobre la serie USD/UYU | — | — | — | sin fuente nueva |
| ARS expectativas (REM) | `bcra-rem-api.facujallia.workers.dev/api/tipo_cambio` (JSON, no oficial, 1 req/min) | JSON | no | mensual | USABLE (fallback = XLSX oficial BCRA) |
| ARS REM oficial | `bcra.gob.ar/.../tablas-relevamiento-expectativas-mercado-{mmm-es}-{yyyy}.xlsx` | XLSX | no | mensual | USABLE (URL por mes → scrape índice) |
| EUR/USD consenso | ECB SPF SDMX `data-api.ecb.europa.eu/service/data/SPF/Q.U2.ASSU.USD.{P3M..LT}.Q.AVG` (Accept: text/csv) | CSV/SDMX | no | trimestral | USABLE (EUR/UYU = EUR/USD × USD/UYU sintético) |
| EUR/USD spot ancla | `ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml` | XML | no | diaria | USABLE |
| Forward/NDF USD/UYU real | — | — | — | — | **NOT FOUND key-free** → usar CIP sintético |
| Encuesta BCU FX esperado | PDFs mensuales (`iees06i0625.pdf`, etc.) | PDF | — | mensual | HTML/PDF-only, scraping (overlay opcional) |

**Trampa anotada:** `IEES05I2.csv` en la página de expectativas BCU es SOLO inflación (`infla_*`/`ipcx_*`), sin columnas de tipo de cambio. No reutilizar para FX.

## Impacto cruzado en Fase 1 (stooq)
El research volvió a chocar con el **bot-gate de stooq** (JS proof-of-work en `/q/d/l/`), confirmando que es domain-wide y actual — no solo el IP del sandbox. Riesgo alto de que la ingesta de drivers stooq (DXY, US10Y, soja, BRL) falle también en el VPS prod.

**Recomendación (follow-up Fase 1, decidir con usuario):** reemplazar la fuente de esos drivers por **FRED `fredgraph.csv` (key-free)** donde exista serie equivalente:
- DXY → FRED `DTWEXBGS` (broad dollar index, es índice distinto pero sirve como proxy) o `DTWEXAFEGS`.
- US10Y → FRED `DGS10`.
- EUR/USD → FRED `DEXUSEU` o ECB daily.
- BRL/USD → FRED `DEXBZUS`.
- Soja → FRED no tiene diaria buena; evaluar dejar vacío o alt.
Es un swap de fuente localizado (nuevo `fetchFred.ts` + cambiar `source`/`symbol` en `config.ts`), la tubería ya degrada con series vacías. La correlación macro pierde fuerza sin estos drivers, así que conviene hacerlo.
