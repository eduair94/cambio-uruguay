// Lo que comparten los tests de los feeds sociales (`linkedinPosts.test.ts`, `xPosts.test.ts`).
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { guideSlugs } from '../../../utils/guides'

const PAGES = join(__dirname, '..', '..', '..', 'pages')
const GUIDES = new Set(guideSlugs())

/** Si una ruta del sitio existe: `/`, una guía del catálogo o una página de `pages/`. */
export function routeExists(path: string): boolean {
  if (path === '/') return true
  const guide = path.match(/^\/guias\/([^/]+)$/)
  if (guide) return GUIDES.has(guide[1]!)
  const rel = path.slice(1)
  return existsSync(join(PAGES, `${rel}.vue`)) || existsSync(join(PAGES, rel, 'index.vue'))
}

// Las marcas que delatan a un texto generado o a un posteo de agencia. El pedido fue "que no suene
// a IA": si un post nuevo trae una de estas, que lo reescriba una persona.
export const AI_TELLS: Array<[string, RegExp]> = [
  ['raya (—/–)', /[—–]/],
  ['signo de exclamación', /[¡!]/],
  ['hashtag', /#\w/],
  ['emoji', /\p{Extended_Pictographic}/u],
  ['"sabías que"', /sab[ií]as que/i],
  ['"no es solo/no solo"', /\bno (es )?s[oó]lo\b/i],
  ['"hoy en día"', /hoy en d[ií]a/i],
  ['"en el mundo actual"', /mundo actual/i],
  ['"descubrí/descubre"', /descubr/i],
  ['"te cuento"', /te cuento/i],
  // "clave" como adjetivo ("es clave", "punto clave"); "la clave es gratis" (de una API) no cuenta.
  [
    '"clave" adjetivo',
    /\b(es|son|resulta|punto|factor|papel|aspecto) clave\b|\bclave (para|en)\b/i,
  ],
  ['"fundamental/crucial"', /\b(fundamental|crucial|imprescindible)\b/i],
  ['"potenciar"', /potenci/i],
  ['"sin duda"', /sin duda/i],
  ['"en resumen/en conclusión"', /en (resumen|conclusi[oó]n)/i],
  ['"aquí" (acá se dice acá)', /\baqu[ií]\b/i],
]

/** Las etiquetas de `AI_TELLS` que aparecen en `text`. */
export function aiTellsIn(text: string): string[] {
  return AI_TELLS.filter(([, re]) => re.test(text)).map(([label]) => label)
}
