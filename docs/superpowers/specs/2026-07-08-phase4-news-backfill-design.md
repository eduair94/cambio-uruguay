# Diseño Fase 4: backfill de noticias + narrativa IA

**Fecha:** 2026-07-08
**Estado:** Aprobado (arquitectura). Cuarta fase del feature de correlación noticias + drivers macro. Fase 1 (fundación) + swap FRED + Fase 2 (página USD) + Fase 3 (marcadores inline + EUR/ARS) están en producción.

## Objetivo

Los saltos notables (`moves`) ya se detectan y atribuyen numéricamente (Fase 1-3), pero no tienen noticias reales asociadas — el archivo de noticias (`PriceNews`) es forward-only desde Fase 1, así que todo salto pasado muestra "sin noticias archivadas". Esta fase llena el pasado (backfill con research real, citado) y cierra el loop hacia adelante (el task diario archiva la explicación del día automáticamente).

## Decisiones (cerradas con el usuario)

- **Alcance de monedas:** USD + EUR + ARS (las 3 que ya tienen ancla canónica y marcadores en historico desde Fase 3).
- **Backfill:** top ~15 saltos por moneda (45 total), **ventana de últimos 24 meses** (no los 60 meses completos — noticias viejas son difíciles de encontrar/indexar bien vía búsqueda; una ventana reciente da mejor calidad de citas).
- **Research:** WebSearch real por salto, corrido por subagentes de research (despachados por el controller, en paralelo por tandas) — nunca se inventa una noticia; si no hay nada claro, se guarda sin noticias (honesto).
- **Forward:** el task diario (`drivers:daily`) crea automáticamente la explicación del día cuando hay un salto notable, usando las noticias YA archivadas de `PriceNews` (sin WebSearch — son noticias reales del RSS del día). De acá en más, nunca más hace falta backfill manual.
- **Narrativa IA:** opcional, 2-3 frases, reusa el proveedor existente (wormgpt vía `app/server/utils/ai.ts`). Degrada a `null` (sin narrativa, solo atribución numérica + noticias) si el proveedor falla o no tiene créditos — nunca bloquea ni rompe la feature.

## Arquitectura

### Decisión clave: sin endpoint nuevo, sin cambios de UI

En vez de agregar una ruta API nueva y tocar los componentes de Fase 2/3, se extiende el tipo `Move` (ya producido por `buildAnalysis` / `/api/analysis/:currency`, ya consumido por `MovesTimeline` en `/por-que-sube-el-dolar` **y** por el tooltip inline de `historico` desde Fase 3) con campos opcionales:

```ts
interface Move {
  date: string
  pctChange: number
  direction: 'up' | 'down'
  headlines?: { title: string; source: string; link: string }[]
  narrative?: string | null
}
```

`buildAnalysis` los rellena haciendo un join a la nueva colección `MoveExplanation` por `(currency, date)`. Ambos consumidores (la timeline de la página dedicada y el tooltip de historico) ya tienen el placeholder "sin noticias archivadas" / "Sin noticias archivadas para esta fecha todavía" — con datos reales presentes, se renderiza solo, sin tocar los componentes.

### Modelo Mongo nuevo

**`MoveExplanation`** (`app/server/models/MoveExplanation.ts`):
```ts
interface MoveExplanationDoc {
  currency: string
  date: string // YYYY-MM-DD
  pctChange: number
  direction: 'up' | 'down'
  drivers: { key: string; r: number; dayMovePct: number }[] // snapshot de atribución al momento del backfill/forward
  narrative: string | null
  headlines: { title: string; source: string; link: string }[]
}
```
Índice único `(currency, date)`.

### `buildAnalysis` — join de explicaciones

En `app/server/utils/analysis.ts`, después de `detectMoves(base, 1)`:
```ts
const explanations = await MoveExplanationModel.find({ currency, date: { $in: moves.map(m => m.date) } }).lean()
const byDate = new Map(explanations.map(e => [e.date, e]))
const movesWithNews = moves.map(m => ({ ...m, headlines: byDate.get(m.date)?.headlines ?? [], narrative: byDate.get(m.date)?.narrative ?? null }))
```

### Forward automático (`drivers:daily`)

Después de `ingestDrivers` + `archiveTodayNews` (ya existentes), el task:
1. Recalcula `detectMoves` sobre la base actualizada; si hoy (`asOf`) es un salto notable:
2. Atribución numérica (reusa `attributeMove`, ya existe).
3. Noticias: las de `PriceNews` de hoy (ya archivadas por `archiveTodayNews`, sin WebSearch).
4. Narrativa IA opcional (best-effort, reusa `app/server/utils/ai.ts`, degrada a `null`).
5. Upsert en `MoveExplanation` (idempotente por `(currency, date)`).
- Corre para USD, EUR, ARS (mismo patrón que `ingestDrivers(['USD','EUR','ARS'])` ya soporta multi-moneda desde Fase 1).

### Backfill (one-time, research real)

1. Para cada moneda (USD/EUR/ARS): tomar los `moves` de `/api/analysis/:currency`, filtrar a los últimos 24 meses, ordenar por `|pctChange|` desc, top 15.
2. Por cada salto: despachar un subagente de research (WebSearch real, grounded a fecha+moneda+contexto de mercado) → 1-3 fuentes citadas (`title,source,link`) o "sin noticia clara encontrada" (nunca fabricar).
3. El controller siembra `MoveExplanation` con: atribución numérica (ya computable localmente vía `attributeMove` + drivers de esa fecha) + las noticias devueltas por el research + narrativa IA opcional.
4. 45 saltos → subagentes despachados en tandas paralelas (no vía Workflow — no fue pedido explícitamente; despacho directo de Agent en paralelo, como el resto de la sesión).

## Testing

- Unit: el join en `buildAnalysis` es glue de red/DB (sin test unitario, por convención del repo) — se verifica con datos reales sembrados.
- El nuevo modelo `MoveExplanation` sigue el patrón de `PriceNews`/`DriverSnapshot` (test de `validateSync()`).
- Verificación E2E: tras seedear al menos un salto de backfill, `/api/analysis/USD` debe devolver ese `move` con `headlines` no vacío; la página `/por-que-sube-el-dolar` y el tooltip de historico deben mostrar la noticia real en vez del placeholder.

## Riesgos / mitigaciones

- **Calidad del research:** WebSearch puede no encontrar nada claro para saltos viejos o de mercados menos cubiertos (EUR/ARS) — se guarda `headlines:[]` honestamente, no se inventa.
- **IA sin créditos:** ya resuelto por diseño (degradación a `narrative:null`, no bloquea).
- **Escala del backfill:** 45 research tasks — se despachan en tandas paralelas, no secuencial.
- **Idempotencia:** tanto backfill como forward usan upsert por `(currency,date)` — correr de nuevo no duplica ni rompe nada.
