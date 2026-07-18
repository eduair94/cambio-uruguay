// Shared colour language for /mapa-de-temas: a momentum diverging ramp (cooling → steady → rising)
// and the coverage-status hues. These are DATA colours — kept constant across light and dark so a
// topic reads the same in both themes; only the chart chrome (axes, labels, tooltip) follows the
// theme. Pure module: imported by the page and both ECharts components.

/** Momentum ramp stops: cooling (teal) → steady (slate) → rising (amber) → surging (coral). */
const RAMP: Array<{ t: number; c: [number, number, number] }> = [
  { t: 0.0, c: [79, 209, 197] }, // #4fd1c5
  { t: 0.5, c: [127, 147, 179] }, // #7f93b3
  { t: 0.78, c: [255, 180, 84] }, // #ffb454
  { t: 1.0, c: [255, 122, 69] }, // #ff7a45
]

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)
const toHex = (rgb: [number, number, number]) =>
  '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')

/** Momentum score (0 = cooling, 1 = surging) → hex colour along the ramp. */
export function momentumColor(mo: number): string {
  const m = clamp01(mo)
  for (let i = 1; i < RAMP.length; i++) {
    if (m <= RAMP[i].t) {
      const a = RAMP[i - 1]
      const b = RAMP[i]
      const k = (m - a.t) / (b.t - a.t)
      return toHex([
        a.c[0] + (b.c[0] - a.c[0]) * k,
        a.c[1] + (b.c[1] - a.c[1]) * k,
        a.c[2] + (b.c[2] - a.c[2]) * k,
      ])
    }
  }
  return toHex(RAMP[RAMP.length - 1].c)
}

export type CoverageStatus = 'cubierto' | 'oportunidad' | 'gap'

export const STATUS_COLOR: Record<CoverageStatus, string> = {
  cubierto: '#34d399',
  oportunidad: '#f5a524',
  gap: '#ff5d6c',
}

export const STATUS_LABEL: Record<CoverageStatus, string> = {
  cubierto: 'Cubierto',
  oportunidad: 'Oportunidad',
  gap: 'Gap',
}

export const TREND_META: Record<'up' | 'down' | 'stable', { arrow: string; label: string }> = {
  up: { arrow: '▲', label: 'en alza' },
  down: { arrow: '▼', label: 'se enfría' },
  stable: { arrow: '▬', label: 'estable' },
}
