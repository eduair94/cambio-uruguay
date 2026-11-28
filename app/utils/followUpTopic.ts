// Qué invitación va al final de la página en el brazo `b` del experimento A/B `seguimiento`
// (utils/abTests.ts): un aviso del tema de la página en vez del newsletter del dólar. PURO.
import { normalizeAdPath } from './ads'
import { AUMJUB_2027, aumJubEstado, type AumJub2027 } from './aumentoJubilaciones'

export type FollowUpTopic = 'aumento-jubilaciones-2027'

/** Las páginas de jubilaciones y del BPS donde "avisame del aumento" es la pregunta siguiente. */
const JUBILACIONES_PAGES = new Set([
  '/guias/aumento-de-jubilaciones-uruguay',
  '/cuando-me-puedo-jubilar-uruguay',
  '/fecha-de-cobro-bps-uruguay',
  '/suplemento-solidario-bps',
  '/guias/usuario-personal-bps-uruguay',
])

/**
 * El tema de la página, si tiene uno con aviso pendiente. Con la cifra definitiva publicada no hay
 * nada que avisar: `null` y la invitación de siempre.
 */
export function followUpTopicForPath(
  path: string,
  state: AumJub2027 = AUMJUB_2027
): FollowUpTopic | null {
  const clean = normalizeAdPath(path)
  if (JUBILACIONES_PAGES.has(clean) || /^\/guias\/[^/]*jubil/.test(clean))
    return aumJubEstado(state) === 'definitivo' ? null : 'aumento-jubilaciones-2027'
  return null
}
