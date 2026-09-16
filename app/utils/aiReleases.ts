// app/utils/aiReleases.ts
// Los lanzamientos de IA que le cambiaron el día a quien programa, para poder marcarlos sobre
// las series mensuales del termómetro de r/CharruaDevs.
//
// QUÉ ES CADA FECHA. Es la del ANUNCIO PÚBLICO, leída el 2026-09-16 en la página del propio
// fabricante que va enlazada en `url`. No sale de una nota de un tercero ni de una lista de
// terceros: lo que no se pudo confirmar contra el dominio del fabricante, no entra. Por eso el
// test exige que el host de cada `url` sea el del fabricante de esa fila.
//
// POR QUÉ LA LISTA ES CORTA, Y NO ES UN DESCUIDO. El criterio de entrada no es el benchmark: es
// si cambió cómo trabaja quien programa (adopción). Marcar 40 fechas sobre los 46 meses de la
// serie deja medio calendario marcado, y un marcador que aparece en la mitad de los puntos deja
// de significar algo: el lector ve puntos, no lanzamientos. Cada fila tiene que poder contestar
// "esto cambió el trabajo de alguien", no "esto subió dos puntos en una tabla".
//
// UNA ACLARACIÓN DE FECHA. Claude Code salió como research preview el 2025-02-24; la fila de
// esta lista marca su DISPONIBILIDAD GENERAL, que es el día en que lo pudo abrir cualquiera.
//
// MÓDULO PURO (sin Vue ni Nuxt) para que la página y su test unitario lean la misma lista.

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

/** Fecha en que se leyó cada fila contra la página oficial del fabricante. */
export const AI_RELEASES_VERIFIED_AT = '2026-09-16'

/** Orden cronológico ascendente, y el test lo exige estricto. */
export const AI_RELEASES: AiRelease[] = [
  {
    date: '2022-06-21',
    label: 'GitHub Copilot',
    vendor: 'GitHub',
    kind: 'coding',
    url: 'https://github.blog/news-insights/product-news/github-copilot-is-generally-available-to-all-developers/',
    why: 'El día que cualquiera pudo comprar un autocompletado con IA: 10 dólares por mes, sin lista de espera.',
  },
  {
    date: '2022-11-30',
    label: 'ChatGPT',
    vendor: 'OpenAI',
    kind: 'chat',
    url: 'https://openai.com/index/chatgpt/',
    why: 'La interfaz gratuita que puso a opinar sobre programación a todo el resto de la oficina.',
  },
  {
    date: '2023-03-14',
    label: 'GPT-4',
    vendor: 'OpenAI',
    kind: 'model',
    url: 'https://openai.com/index/gpt-4-research/',
    why: 'El primer modelo lo bastante bueno como para que meterle IA a un producto dejara de ser una apuesta.',
  },
  {
    date: '2024-03-12',
    label: 'Devin',
    vendor: 'Cognition',
    kind: 'coding',
    url: 'https://cognition.com/blog/introducing-devin',
    why: 'Lo presentaron como el primer ingeniero de software con IA. Ahí arrancó en serio la discusión sobre el primer empleo.',
  },
  {
    date: '2024-06-21',
    label: 'Claude 3.5 Sonnet',
    vendor: 'Anthropic',
    kind: 'model',
    url: 'https://www.anthropic.com/news/claude-3-5-sonnet',
    why: 'El mismo anuncio trajo Artifacts: el código generado se renderizaba y corría al lado del chat.',
  },
  {
    date: '2024-12-18',
    label: 'GitHub Copilot Free',
    vendor: 'GitHub',
    kind: 'coding',
    url: 'https://github.blog/changelog/2024-12-18-announcing-github-copilot-free/',
    why: '2.000 completados por mes sin tarjeta: el precio dejó de ser la excusa para no usarlo.',
  },
  {
    date: '2025-01-20',
    label: 'DeepSeek-R1',
    vendor: 'DeepSeek',
    kind: 'model',
    url: 'https://api-docs.deepseek.com/news/news250120/',
    why: 'Razonamiento de primera línea a una fracción del precio; el piso de costo se cayó de golpe.',
  },
  {
    date: '2025-04-04',
    label: 'Modo agente de GitHub Copilot',
    vendor: 'GitHub',
    kind: 'coding',
    url: 'https://github.blog/news-insights/product-news/github-copilot-agent-mode-activated/',
    why: 'El modo agente y MCP llegaron a todos los que ya tenían VS Code abierto.',
  },
  {
    date: '2025-05-22',
    label: 'Claude Code',
    vendor: 'Anthropic',
    kind: 'coding',
    url: 'https://www.anthropic.com/news/claude-4',
    why: 'Disponible para todos, después de tres meses como research preview: delegarle trabajo desde la terminal.',
  },
  {
    date: '2025-06-04',
    label: 'Cursor 1.0',
    vendor: 'Cursor',
    kind: 'coding',
    url: 'https://cursor.com/changelog/1-0',
    why: 'El 1.0 es lo que lo hizo pasar, en muchos equipos, de contrabando a herramienta aprobada.',
  },
  {
    date: '2025-08-07',
    label: 'GPT-5',
    vendor: 'OpenAI',
    kind: 'model',
    url: 'https://openai.com/index/introducing-gpt-5/',
    why: 'Un solo endpoint por defecto en lugar de elegir modelo para cada cosa.',
  },
  {
    date: '2025-11-18',
    label: 'Gemini 3',
    vendor: 'Google',
    kind: 'model',
    url: 'https://blog.google/products-and-platforms/products/gemini/gemini-3/',
    why: 'Google volvió a la conversación de frontera para programar, y el mismo día salió Antigravity.',
  },
  {
    date: '2026-06-30',
    label: 'Claude Sonnet 5',
    vendor: 'Anthropic',
    kind: 'model',
    url: 'https://www.anthropic.com/news/claude-sonnet-5',
    why: '2 y 10 dólares por millón de tokens: el precio al que cierra tener un agente prendido todo el día.',
  },
  {
    date: '2026-07-24',
    label: 'Claude Opus 5',
    vendor: 'Anthropic',
    kind: 'model',
    url: 'https://www.anthropic.com/news/claude-opus-5',
    why: 'El tope de gama a la mitad del precio del anterior.',
  },
]

/** El mes al que cae un lanzamiento, YYYY-MM: la clave con la que se cruza contra las series. */
export const releaseMonth = (r: AiRelease) => r.date.slice(0, 7)

/**
 * Agrupa por mes porque las series de la página son mensuales y en un mismo mes entran dos
 * lanzamientos (mayo y junio de 2025 casi se tocan). Un Map de arrays deja el tooltip listar
 * todo lo que salió ese mes en vez de quedarse con el último que se escribió.
 */
export function releasesByMonth(releases: AiRelease[] = AI_RELEASES): Map<string, AiRelease[]> {
  const byMonth = new Map<string, AiRelease[]>()
  for (const release of releases) {
    const month = releaseMonth(release)
    const bucket = byMonth.get(month)
    if (bucket) bucket.push(release)
    else byMonth.set(month, [release])
  }
  return byMonth
}

/** Los lanzamientos de un mes YYYY-MM. Un mes sin lanzamientos devuelve `[]`, nunca `undefined`. */
export function releasesInMonth(month: string, releases: AiRelease[] = AI_RELEASES): AiRelease[] {
  return releasesByMonth(releases).get(month) ?? []
}

/** Estilo por índice para chart.js: radio y color por mes marcado. */
export interface ReleaseMarkerStyle {
  pointRadius: number[]
  pointBackgroundColor: string[]
}

/**
 * Estilo punto a punto para chart.js. Los marcadores van en `chartData` y no en `options`
 * porque el componente de gráfico observa los datos y no las opciones.
 *
 * El mes sin lanzamiento queda en radio `0` a propósito: todas las series de esa página se
 * dibujan hoy con `pointRadius: 0`, así que devolver el radio por defecto del dataset llenaría
 * de puntos las tres curvas y el marcador dejaría de destacarse contra nada.
 */
export function markReleaseMonths(
  months: string[],
  color: string,
  defaultColor: string,
  radius = 5
): ReleaseMarkerStyle {
  const byMonth = releasesByMonth()
  const pointRadius: number[] = []
  const pointBackgroundColor: string[] = []
  for (const month of months) {
    const marked = byMonth.has(month)
    pointRadius.push(marked ? radius : 0)
    pointBackgroundColor.push(marked ? color : defaultColor)
  }
  return { pointRadius, pointBackgroundColor }
}

/** Promedio de los `w` meses previos y de los `w` siguientes a `index`. */
export interface BeforeAfter {
  before: number | null
  after: number | null
}

/**
 * Promedio de `count` valores consecutivos desde `from`, o `null` si la ventana no está
 * entera. Exigirla entera es la regla que evita la trampa de fondo: promediar dos meses donde
 * se pedían tres y publicar el resultado con el mismo nombre. Un mes de borde, o uno con un
 * hueco al lado, no tiene "antes de tres meses" — tiene otra cosa, y otra cosa no se compara.
 */
function windowMean(values: Array<number | null>, from: number, count: number): number | null {
  if (count <= 0 || from < 0 || from + count > values.length) return null
  let sum = 0
  for (let i = from; i < from + count; i++) {
    const value = values[i]
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    sum += value
  }
  return sum / count
}

/**
 * El mes de `index` NO entra en ninguna de las dos ventanas: es el mes del lanzamiento, el que
 * se está preguntando si movió algo, y meterlo de un lado inclinaría esa comparación sola.
 */
export function beforeAfter(values: Array<number | null>, index: number, w = 3): BeforeAfter {
  return {
    before: windowMean(values, index - w, w),
    after: windowMean(values, index + 1, w),
  }
}

/**
 * La línea de base del spec: qué proporción de meses "subió" entre los que tienen
 * lanzamiento y entre los que no. Devuelve nulls si no hay muestra.
 */
export interface RiseSplit {
  withRelease: { n: number; rose: number; share: number | null }
  without: { n: number; rose: number; share: number | null }
}

/**
 * El placebo, y es la razón de ser de todo el módulo: sobre una serie que sube casi siempre,
 * cualquier fecha que marques queda "seguida de una suba". Lo único legible es la MISMA cuenta
 * hecha sobre los meses sin lanzamiento, al lado. Por eso se devuelven los dos grupos juntos y
 * nunca uno solo.
 *
 * `share` es `null` con `n === 0` y no `0/0`: un `NaN` se serializa en el payload de la página y
 * el repo tiene un test que lo busca.
 */
export function riseSplit(
  months: string[],
  values: Array<number | null>,
  releaseMonths: Set<string>,
  w = 3
): RiseSplit {
  const withRelease = { n: 0, rose: 0 }
  const without = { n: 0, rose: 0 }
  for (let i = 0; i < months.length; i++) {
    const { before, after } = beforeAfter(values, i, w)
    if (before === null || after === null) continue
    const bucket = releaseMonths.has(months[i] as string) ? withRelease : without
    bucket.n += 1
    if (after > before) bucket.rose += 1
  }
  return {
    withRelease: {
      ...withRelease,
      share: withRelease.n ? withRelease.rose / withRelease.n : null,
    },
    without: {
      ...without,
      share: without.n ? without.rose / without.n : null,
    },
  }
}
