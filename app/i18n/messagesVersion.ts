import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Un hash corto de TODO lo que termina en un mensaje de vue-i18n. Va en la ruta que el navegador
 * pide para hidratar (`/_i18n/<versión>/<hash>/<idioma>/messages.json`, `serverRoutePrefix` en
 * nuxt.config), así que cambiar una coma de `es.json` cambia la URL y la respuesta se puede guardar
 * para siempre.
 *
 * POR QUÉ NO ALCANZA EL HASH DEL MÓDULO: @nuxtjs/i18n calcula el suyo sobre el archivo CARGADOR
 * (`locales/es.ts`) y no sobre lo que ese archivo importa. `es.ts` no cambia cuando cambia
 * `json/es.json`, así que su hash es el mismo deploy tras deploy: guardar esa URL un año serviría
 * los mensajes de un build viejo a un bundle nuevo, y una clave que el build viejo no conocía se
 * pinta cruda (`consent.reject`). Medido el 16/11/2026: el JSON salía `max-age=-1` y
 * `cf-cache-status: DYNAMIC`, 57.000 pedidos de 127 KB al origen por semana, y cuando uno fallaba
 * (522) el aviso de cookies decía CONSENT.REJECT.
 *
 * Sólo en build: lo llama nuxt.config. El orden es fijo (nombres ordenados) para que dos builds del
 * mismo árbol den la misma versión.
 */
export function i18nMessagesVersion(root: string, entries: readonly string[]): string {
  const hash = createHash('sha1')
  const visit = (relative: string): void => {
    const absolute = join(root, relative)
    if (statSync(absolute).isDirectory()) {
      for (const name of readdirSync(absolute).sort()) visit(`${relative}/${name}`)
      return
    }
    hash.update(relative).update('\0').update(readFileSync(absolute)).update('\0')
  }
  for (const entry of [...entries].sort()) visit(entry)
  return hash.digest('hex').slice(0, 12)
}

/** Lo que alimenta los mensajes, relativo a `app/i18n`. Los 3 idiomas propios, los 35 traducidos y la config. */
export const I18N_MESSAGE_SOURCES = ['locales', 'extra', 'i18n.config.ts'] as const
