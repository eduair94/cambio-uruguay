# Diseño Fase 3: marcadores inline en historico + EUR/ARS

**Fecha:** 2026-07-08
**Estado:** Aprobado (arquitectura). Tercera fase del feature de correlación noticias + drivers macro. Fase 1 (fundación) + swap FRED + Fase 2 (página `/por-que-sube-el-dolar`) están en producción.

## Objetivo

Extender el análisis de correlación (hoy solo USD, solo visible en `/por-que-sube-el-dolar`) a EUR y ARS, y hacerlo visible directamente en el chart de `/historico/[origin]/[currency]/[[type]]` (cualquier casa), sin construir páginas dedicadas nuevas.

## Decisiones (cerradas con el usuario)

- **Alcance de páginas:** marcadores/tooltip en **cualquier** `/historico/<casa>/<currency>` (no solo la casa ancla). Aproximado — los drivers explican la tendencia macro de la moneda, no el día exacto de esa casa puntual.
- **Ancla EUR:** BROU (`origin:'brou', code:'EUR', type:''`). Verificado en vivo: 1252 puntos, 2021-07-08→2026-07-08, sin huecos visibles.
- **Ancla ARS:** BCU (`origin:'bcu', code:'ARS', type:'BILLETE'`) — mismo patrón que USD, ya tiene tooling de backfill/gap-detection de BCU.
- **Integración UI:** retocar el chart.js existente de la página historico (2057 líneas, en producción) con marcadores, en vez de agregar un panel nuevo aparte. Riesgo mayor, mitigado con: util puro aislado + fetch condicional que nunca rompe el render existente si falla.
- **Sin páginas nuevas** (`/por-que-sube-el-euro`, `/por-que-sube-el-ars`) — decisión de scope: solo tooltip enriquecido en el chart existente, sin dependencia de navegación. `/por-que-sube-el-dolar` sigue siendo la única página dedicada (USD).

## Arquitectura

### Backend (2 archivos existentes, sin romper nada)

- **`app/server/utils/analysis.ts`** — `CANONICAL` map gana:
  ```ts
  EUR: { origin: 'brou', code: 'EUR', type: '' },
  ARS: { origin: 'bcu', code: 'ARS', type: 'BILLETE' },
  ```
  **Fix de bug:** el URL builder actual siempre agrega `/${anchor.type}`; con `type=''` esto produce `/evolution/brou/EUR/` (trailing slash). Debe omitir el segmento cuando `type` es vacío, igual que el patrón ya usado en `useApiService.ts` (cliente).
- **`app/server/api/analysis/[currency].get.ts`** — `SUPPORTED = new Set(['USD', 'EUR', 'ARS'])`.
- `driversFor(currency)` ya tiene EUR (`dxy`, `eurusd`) y ARS (`arBlue`, `arOfficial`) declarados desde Fase 1 — sin cambios.
- `/api/drivers` ya es currency-agnóstico (devuelve todos los drivers) — sin cambios.

### Frontend — util puro nuevo (TDD, unit-tested)

- **`app/utils/chartMoveMarkers.ts`**:
  - `markPoints(dates: string[], moves: {date:string; direction:'up'|'down'|'flat'}[]): { pointRadius: number[]; pointBackgroundColor: string[] }` — por cada fecha del chart (comparando por día, `slice(0,10)` como ya se hizo en Fase 1 para el join de correlación), si coincide con un `move`, radio resaltado + color por dirección; si no, radio/color base (recibidos como default, para no hardcodear los valores que ya usa la página).
  - Framework-agnóstico, sin auto-imports Nuxt, reutiliza el patrón exacto de `alignByDate`'s day-key.

### Frontend — página historico (cambio acotado)

En `app/pages/historico/[origin]/[currency]/[[type]].vue`:
1. **Fetch condicional** — solo si `route.params.currency` (uppercased) ∈ `{USD, EUR, ARS}`:
   - `useFetch('/api/analysis/' + currency)` → `moves`, `correlations`.
   - `useFetch('/api/drivers')` → `series`, `labels` (para atribución en tooltip).
   - Si la moneda no está soportada, o cualquiera de los dos fetches falla/devuelve vacío: el chart se comporta **exactamente igual que hoy** (sin marcadores, sin líneas nuevas de tooltip, sin errores visibles).
2. **`chartData`** — ambos datasets (compra/venta) pasan por `markPoints(...)` para sus arrays `pointRadius`/`pointBackgroundColor` (reemplaza los valores literales `3`/`3` actuales por arrays, con el mismo default cuando no hay match).
3. **Tooltip** — el callback `title`/`label` existente gana una línea adicional cuando la fecha hovereada es un salto: `attributeMove(date, driverSeriesArr).slice(0,3)` (util ya existente y testeado de Fase 2) formateado como "Ese día se movieron: Real BRL/USD +0.9%, ...".

### Fuera de alcance (explícito)

- Páginas dedicadas EUR/ARS (`/por-que-sube-el-euro`, etc.) — no se construyen.
- Backfill de noticias / narrativa IA — Fase 4.
- Gráfico predictivo — Fase 5.
- Ampliar el set de drivers de ARS/EUR más allá de lo ya declarado en Fase 1 — YAGNI, se puede extender después si se justifica.

## Testing

- Unit (vitest): `chartMoveMarkers.test.ts` — coincidencia por día, fechas sin match (default), array vacío de moves, dirección up/down → color correcto.
- Verificación manual/E2E: cargar `/historico/brou/EUR`, `/historico/bcu/ARS/BILLETE`, `/historico/<cualquier-casa>/USD` y confirmar: (a) marcadores aparecen en días de salto reales, (b) tooltip agrega la línea de atribución, (c) una moneda no soportada (BRL, XAU, etc.) renderiza sin cambios ni errores.

## Riesgos / mitigaciones

- **Romper el chart en producción:** todo lo nuevo es aditivo y gateado por fetch condicional con fallback silencioso; el util de marcadores es puro y testeado antes de tocar la página.
- **Desalineación de fechas** entre la serie de la casa mostrada y la serie canónica del análisis: se matchea por día (`slice(0,10)`), tolera que no todos los días coincidan (huecos = sin marcador, no error).
- **Bug de trailing-slash EUR** ya identificado — se corrige como parte de este mismo cambio, no queda pendiente.
