import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from '../../i18n/locales/json/en.json'
import es from '../../i18n/locales/json/es.json'
import pt from '../../i18n/locales/json/pt.json'

/**
 * El "|" de un mensaje no es un separador visual: es el separador de PLURALES de
 * vue-i18n. Un `t('seo.homeTitle')` sin `count` devuelve SÓLO la primera rama, así
 * que todo lo que venga después del "|" se pierde en silencio, sin error, sin warning
 * y sin que la suite se entere.
 *
 * Vivió desde febrero: el `<title>` de la home decía "Cotización del Dólar en Uruguay
 * Hoy | Cambio Uruguay" cuando el archivo decía "... Hoy | Compara +40 Casas de Cambio
 * en Tiempo Real". Nadie lo vio porque el `titleTemplate` de app.vue agrega
 * " | Cambio Uruguay", y 16 de los 19 mensajes con "|" terminaban justamente en
 * "Cambio Uruguay": la plantilla volvía a pegar un título byte a byte idéntico. La
 * corrupción era invisible por coincidencia, no por diseño.
 *
 * POR QUÉ LA REGLA ES TOTAL Y NO SÓLO PARA TÍTULOS. Lo tentador es filtrar por nombre
 * de clave (/title/i) porque los 19 casos son títulos. Sería la regla equivocada por
 * dos motivos: (1) el mecanismo no distingue títulos — cualquier `t()` sin `count`
 * queda cortado, y las claves de este repo se consumen tanto como `<title>` como como
 * `<h2>` o texto de párrafo, así que "alcanzable como título" no es una propiedad del
 * nombre de la clave; (2) hoy no hay ni un solo mensaje pluralizado a propósito en los
 * tres locales, así que la regla total no cuesta nada y cubre al que mañana meta un
 * "|" en un subtítulo. Si algún día hace falta un plural real, la excepción se declara
 * acá con su motivo, no se afloja la regla.
 *
 * La primera prueba es la que manda: compara lo que dice el archivo contra lo que
 * DEVUELVE vue-i18n. No simula el compilador, lo ejecuta, así que además del "|" caza
 * cualquier otra sintaxis que se coma texto. La segunda existe sólo para que el
 * fallo más probable se lea de una.
 */

const LOCALES = [
  ['es', es],
  ['en', en],
  ['pt', pt],
] as const

type Tree = Record<string, unknown>

function flatten(node: Tree, prefix = ''): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const key of Object.keys(node)) {
    const value = node[key]
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.push([path, value])
    else if (value && typeof value === 'object') out.push(...flatten(value as Tree, path))
  }
  return out
}

/**
 * Lo que vue-i18n devuelve cuando no se le pasa ningún parámetro: la interpolación
 * literal (`{'@'}`, que el placeholder del newsletter usa para no escribir la arroba
 * en el JSON) se resuelve a su contenido y el named vacío desaparece. Todo lo demás
 * tiene que salir tal cual entró.
 */
function withoutParams(raw: string): string {
  return raw.replace(/\{\s*(['"])([\s\S]*?)\1\s*\}/g, '$2').replace(/\{[^{}]*\}/g, '')
}

describe('los mensajes de i18n sobreviven a t()', () => {
  for (const [code, messages] of LOCALES) {
    it(`${code}: ningún mensaje pierde texto al pasar por vue-i18n`, () => {
      const i18n = createI18n({
        legacy: false,
        locale: code,
        messages: { [code]: messages },
        missingWarn: false,
        fallbackWarn: false,
      })
      const t = i18n.global.t as (key: string) => string

      const lost: string[] = []
      for (const [path, raw] of flatten(messages as unknown as Tree)) {
        const rendered = t(path)
        const expected = withoutParams(raw)
        if (rendered !== expected) lost.push(`${path}\n  archivo: ${raw}\n  t():     ${rendered}`)
      }

      expect(lost, `mensajes que t() devuelve recortados:\n${lost.join('\n')}`).toEqual([])
    })
  }
})

describe('ningún mensaje trae un "|" crudo', () => {
  for (const [code, messages] of LOCALES) {
    it(`${code}: sin separador de plurales accidental`, () => {
      const piped = flatten(messages as unknown as Tree)
        .filter(([, raw]) => raw.includes('|'))
        .map(([path, raw]) => `${path}: ${raw}`)

      expect(
        piped,
        'un "|" en un mensaje lo parte en ramas de plural y t() sin count devuelve ' +
          'sólo la primera. La marca la agrega el titleTemplate de app.vue: no va en el ' +
          `mensaje.\n${piped.join('\n')}`
      ).toEqual([])
    })
  }
})
