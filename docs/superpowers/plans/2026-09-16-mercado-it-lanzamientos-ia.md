# Plan — lanzamientos de IA en el termómetro de r/CharruaDevs

Spec: `docs/superpowers/specs/2026-09-16-mercado-it-lanzamientos-ia-design.md`
Rama: `main` (sesiones concurrentes: stagear rutas explícitas, nunca `git add -A`).

## Tarea 1 — `app/utils/aiReleases.ts` + su test

Archivo puro (imports relativos, sin Vue ni Nuxt), estilo `utils/*.ts` del repo.

```ts
export type AiReleaseKind = 'chat' | 'coding' | 'model'

export interface AiRelease {
  /** Fecha del anuncio público, YYYY-MM-DD. */
  date: string
  /** Como lo escribe el fabricante. */
  label: string
  vendor: string
  kind: AiReleaseKind
  /** Anuncio oficial, en el dominio del fabricante. */
  url: string
  /** Por qué lo notó quien programa para vivir (adopción, no benchmark). */
  why: string
}

export const AI_RELEASES: AiRelease[]            // orden cronológico ascendente
export const AI_RELEASES_VERIFIED_AT = '2026-09-16'

export const releaseMonth = (r: AiRelease) => r.date.slice(0, 7)
export function releasesByMonth(releases?: AiRelease[]): Map<string, AiRelease[]>
export function releasesInMonth(month: string, releases?: AiRelease[]): AiRelease[]

/** Estilo por índice para chart.js: radio y color por mes marcado. */
export interface ReleaseMarkerStyle {
  pointRadius: number[]
  pointBackgroundColor: string[]
}
export function markReleaseMonths(
  months: string[],
  color: string,
  defaultColor: string,
  radius?: number
): ReleaseMarkerStyle

/** Promedio de los `w` meses previos y de los `w` siguientes a `index`. */
export interface BeforeAfter { before: number | null; after: number | null }
export function beforeAfter(values: Array<number | null>, index: number, w?: number): BeforeAfter

/**
 * La línea de base del spec: qué proporción de meses "subió" entre los que tienen
 * lanzamiento y entre los que no. Devuelve nulls si no hay muestra.
 */
export interface RiseSplit {
  withRelease: { n: number; rose: number; share: number | null }
  without: { n: number; rose: number; share: number | null }
}
export function riseSplit(
  months: string[],
  values: Array<number | null>,
  releaseMonths: Set<string>,
  w?: number
): RiseSplit
```

Reglas de implementación:

- `beforeAfter` exige las dos ventanas **completas** (`w` valores no nulos de cada lado); si
  falta uno, ese lado es `null`. Nunca promedia sobre menos meses y lo llama igual.
- `riseSplit` descarta todo mes sin `before` y `after`. `share` es `null` con `n === 0`
  (nunca `0/0 = NaN`: el repo tiene un test que busca `"NaN"` serializado).
- `markReleaseMonths` devuelve arrays de la misma longitud que `months`, `0` de radio donde no
  hay lanzamiento (hoy todas las series van con `pointRadius: 0`).
- Nada de fechas inventadas: la lista sale del dossier verificado que va en el brief. Si un
  ítem no tiene URL oficial, no entra.

Test `app/tests/unit/aiReleases.test.ts`:

- lista no vacía, orden cronológico estricto, sin dos entradas iguales,
  `date` con forma `YYYY-MM-DD` y parseable,
- toda `url` empieza con `https://` y su host es el del fabricante (tabla explícita
  vendor → dominio permitido, escrita en el test),
- `kind` dentro del union, `why` con más de 30 caracteres,
- ningún lanzamiento posterior a `AI_RELEASES_VERIFIED_AT`,
- `markReleaseMonths` marca sólo los meses presentes y respeta longitudes,
- `beforeAfter` devuelve `null` con ventana incompleta y el promedio correcto con ventana
  completa,
- `riseSplit` cuenta bien un caso armado a mano y devuelve `share: null` sin muestra.

## Tarea 2 — la página `app/pages/mercado-it-uruguay.vue`

Depende de la tarea 1. **Un solo agente toca este archivo.**

### 2.1 Marcadores en los tres gráficos mensuales

- `line()` acepta un 5º parámetro opcional `marks?: ReleaseMarkerStyle`; con marcas usa
  `pointRadius: marks.pointRadius`, `pointBackgroundColor: marks.pointBackgroundColor`,
  `pointHoverRadius: marks.pointRadius.map(r => r + 2)`. Sin marcas, el objeto queda **igual
  que hoy** (`pointRadius: 0`, sin `pointBackgroundColor`).
- Color del marcador: constante `REL` (violeta), distinta de NEG/POS/NEU, definida con el
  resto de los colores arriba. Los gráficos ya remontan por `:key` al cambiar de tema.
- Marcar: `curveData` (los dos datasets), `aiMentionsData`, `alarmData`. Nada más.
- `baseLineOptions(tick, yMax?, tooltip?)`: el tercer parámetro se mergea en
  `plugins.tooltip.callbacks`. `pctLineOptions` pasa el tooltip de `curveMonths`; nuevo
  `lexOptions` (per-mille + tooltip de `lexRows`) para menciones y alarma; `perMilleOptions`
  queda sin tooltip para el gráfico trimestral de relatos.
- El `afterBody` devuelve `['', 'Ese mes salió:', '· <label> (<vendor>)', ...]` y `[]` si el
  mes no tiene lanzamiento.
- Cada uno de los tres `.fig-sub` suma una frase corta: los puntos marcan lanzamientos de IA.

### 2.2 Sección nueva, después de la sección `ia` y antes de `quien`

```
<section class="block" aria-labelledby="lanzamientos">
  <div class="kicker">Los lanzamientos</div>
  <h2 id="lanzamientos" class="text-h5 font-weight-bold mb-2">{{ releasesTitle }}</h2>
  <p class="lead">{{ releasesText }}</p>
  … tabla … <p class="small">caveat</p>
</section>
```

- `releasesTitle` / `releasesText` salen de los datos, como el resto de la página.
  `releasesText` dice, con las cifras de `riseSplit` sobre las menciones de IA y sobre
  `neg3`: cuántos meses con lanzamiento subieron, cuántos sin lanzamiento subieron, y que la
  diferencia es lo único que se puede leer acá.
- Tabla `VTable density="comfortable" class="cu-mobile-cards"`, `<th scope="col">`, cada
  `<td data-label="…">`. Columnas: **Fecha · Qué salió · Quién · Menciones de IA, antes → después**.
  «Qué salió» es un `<a :href target="_blank" rel="noopener">` al anuncio oficial.
  Sin ventana completa: `—`.
- Párrafo `.small` final, explícito: los lanzamientos vienen en racimo, la serie sube sola,
  los trimestrales no se marcan porque un trimestre tapa dos o tres lanzamientos, y esto no
  prueba causa. Mencionar que el índice de Indeed que ya está más abajo se mueve con la ola de
  despidos de 2022-2023, que no es un lanzamiento.
- Una entrada nueva en `faq`: `id: 'mercado-it-lanzamientos'`, pregunta
  «¿El pesimismo del sub arranca con ChatGPT?», respuesta con las mismas cifras computadas.
  No agregar un segundo emisor de FAQPage: la `<FaqSection … expanded />` existente ya es el
  único.
- Estilos nuevos, si hacen falta, dentro del `<style scoped>` de la página, radios 4/8/12/16.

## Tarea 3 — verificación

- `cd app && npx vitest run tests/unit/aiReleases.test.ts tests/unit/charruadevs.test.ts tests/unit/seoContract.test.ts`
- `cd app && npm run lint` (`npm run typecheck` está roto)
- suite completa de `app/` antes de commitear.

## Dossier de fechas

La lista verificada (fecha, producto, fabricante, URL oficial) se adjunta en el brief de la
tarea 1. **El implementador no busca fechas ni agrega ítems por su cuenta.**
