// Experimentos A/B del sitio: QUIÉN ve qué brazo, sin servidor y sin cambiar la página después de
// pintarla. Ver docs/analytics/AB_TESTS.md.
//
// El borde guarda UNA copia del HTML por URL, así que el servidor no puede repartir brazos. Lo
// reparte `PREPAINT_AB_SCRIPT` (nuxt.config.ts), un script del <head> que corre antes de pintar:
// lee o crea un id aleatorio del navegador (`cu_ab` en localStorage) y marca `<html
// data-ab-<id>="a|b">` para cada experimento vigente. Las variantes se muestran u ocultan por CSS
// con ese atributo: ningún salto, ningún desajuste de hidratación.
//
// El brazo sale de un hash del id del navegador CON el id del experimento, así que estar en `b` de
// un experimento no dice nada del otro (sin eso, dos experimentos en la misma página se medirían
// juntos). Un navegador controlado por un programa (`navigator.webdriver`: los e2e, los bots que lo
// declaran) no recibe marca y ve el control.
//
// PURO (sin Vue ni Nuxt): el test corre el script del <head> y exige que asigne lo mismo que esto.

export type AbArm = 'a' | 'b'

export interface AbTest {
  /** Va en el atributo `data-ab-<id>` y en la sal del hash. */
  readonly id: 'jubilaciones' | 'seguimiento' | 'alquiler-tarjeta'
  /** Propiedad de usuario de GA4 y etiqueta de Clarity. */
  readonly param: string
  /** Primer y último día (UTC, inclusive) en que se reparte. Fuera de la ventana: control. */
  readonly startsOn: string
  readonly endsOn: string
  /** Qué se compara, para la lectura (`npm run ab_report`). */
  readonly what: string
}

export type AbTestId = AbTest['id']

export const AB_STORAGE_KEY = 'cu_ab'

export const AB_TESTS: readonly AbTest[] = Object.freeze([
  {
    id: 'jubilaciones',
    param: 'ab_jubilaciones',
    startsOn: '2026-11-28',
    endsOn: '2027-02-15',
    what: 'b = calculadora «tu jubilación en 2027» + aviso por correo arriba de la guía de aumento de jubilaciones',
  },
  {
    id: 'seguimiento',
    param: 'ab_seguimiento',
    startsOn: '2026-11-28',
    endsOn: '2027-01-31',
    what: 'b = invitación del final según el tema (alerta de avisos, aviso de jubilaciones) en vez del newsletter del dólar',
  },
  {
    id: 'alquiler-tarjeta',
    param: 'ab_alquiler_tarjeta',
    startsOn: '2026-11-28',
    endsOn: '2027-01-15',
    what: 'b = tarjeta compacta del directorio de alquileres en el celular (sin comparación de barrios ni pie)',
  },
] as const satisfies readonly AbTest[])

/** FNV-1a de 32 bits: el mismo cálculo que hace el script del <head>. */
export function abHash(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash
}

/**
 * La mezcla final de Murmur3 (fmix32). El bit bajo de FNV-1a es sólo la paridad de los caracteres
 * (multiplicar por un primo impar no la cambia), así que sin esto `jubilaciones` y `seguimiento`
 * salían perfectamente correlacionados para el mismo navegador.
 */
export function abMix(hash: number): number {
  let h = hash >>> 0
  h ^= h >>> 16
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  h = Math.imul(h, 3266489909)
  h ^= h >>> 16
  return h >>> 0
}

export function abArm(visitor: string, id: AbTestId): AbArm {
  return abMix(abHash(`${visitor}:${id}`)) & 1 ? 'b' : 'a'
}

export function abActive(test: Pick<AbTest, 'startsOn' | 'endsOn'>, todayIso: string): boolean {
  return todayIso >= test.startsOn && todayIso <= test.endsOn
}

export function abAttribute(id: AbTestId): string {
  return `data-ab-${id}`
}

/** Lo que el script del <head> dejó marcado (vacío en el servidor y para los programas). */
export function abAssignments(root?: {
  getAttribute(name: string): string | null
}): Partial<Record<AbTestId, AbArm>> {
  const el = root ?? (typeof document === 'undefined' ? null : document.documentElement)
  const out: Partial<Record<AbTestId, AbArm>> = {}
  if (!el) return out
  for (const test of AB_TESTS) {
    const value = el.getAttribute(abAttribute(test.id))
    if (value === 'a' || value === 'b') out[test.id] = value
  }
  return out
}

/** `{ ab_jubilaciones: 'b', … }` para GA4 y Clarity. */
export function abProperties(assignments: Partial<Record<AbTestId, AbArm>>): Record<string, AbArm> {
  const out: Record<string, AbArm> = {}
  for (const test of AB_TESTS) {
    const arm = assignments[test.id]
    if (arm) out[test.param] = arm
  }
  return out
}
