import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/json/en.json'
import es from '../../i18n/locales/json/es.json'
import pt from '../../i18n/locales/json/pt.json'
import { familiaNavParaRuta } from '../../utils/familiaNav'

// Las tres guías que contestan lo que frena un alquiler tienen que estar ARRIBA, no enlazadas y ya.
//
// Estaban enlazadas desde el directorio desde hacía meses. Medido en producción el 2026-09-20 a
// 390 px: el primer enlace a una guía aparecía a y=13.000 de una página de 22.717 px — quince
// pantallas de scroll. Se subieron al encabezado de la página, al lado de un bloque de "Otras
// búsquedas de vivienda" y debajo de la barra de la sección: tres bloques de enlaces seguidos, con
// tres enlaces repetidos entre ellos. El usuario lo llamó "extremadamente confuso" (2026-09-21) y
// las dos listas de la página pasaron a ser grupos de la barra "En esta sección".
//
// Así que este test cuida las dos mitades: que las guías sigan arriba (en la barra, que va antes
// que todo el contenido) y que la página no vuelva a tener su propia lista al lado.
const source = readFileSync(resolve(__dirname, '../../pages/alquileres-uruguay.vue'), 'utf8')
const messages = { es, en, pt } as const

const GUIDES = [
  '/alquilar-en-uruguay',
  '/alquilar-sin-recibo-de-sueldo',
  '/alquilar-estando-en-clearing',
]

function message(locale: keyof typeof messages, key: string): unknown {
  let node: unknown = messages[locale]
  for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part]
  return node
}

describe('guías de antes de alquilar, en la barra de la sección', () => {
  const nav = familiaNavParaRuta('/alquileres-uruguay')!
  const grupoItems = nav.grupos.flatMap(grupo => grupo.items)

  it('las tres guías están en un grupo de la barra del directorio', () => {
    for (const route of GUIDES) expect(grupoItems.map(item => item.to)).toContain(route)
  })

  it('la etiqueta es la pregunta del lector, no el título de la guía', () => {
    // Si alguien reemplaza las preguntas por los títulos, el grupo se vuelve una segunda copia
    // del bloque del pie y pierde el motivo por el que se subió.
    for (const route of GUIDES) {
      const item = grupoItems.find(candidate => candidate.to === route)!
      expect(item.labelKey, route).toMatch(/^familiaNav\.preguntas\./)
      for (const locale of ['es', 'en', 'pt'] as const) {
        const label = message(locale, item.labelKey!)
        expect(typeof label, `${locale} ${item.labelKey}`).toBe('string')
        expect(String(label)).toMatch(/\?$/)
      }
    }
  })

  it('la página no vuelve a tener su propia lista de enlaces arriba', () => {
    const header = source.slice(
      source.indexOf('<header class="rentals-head">'),
      source.indexOf('</header>')
    )
    expect(header.length).toBeGreaterThan(0)
    expect(header).not.toMatch(/<nav\b/)
    for (const route of GUIDES) expect(header).not.toContain(route)
  })

  it('el bloque del pie sigue estando: el lector que terminó de mirar avisos también las ve', () => {
    const footer = source.indexOf('v-for="link in relatedLinks"')
    expect(footer).toBeGreaterThan(source.indexOf('</header>'))
  })
})
