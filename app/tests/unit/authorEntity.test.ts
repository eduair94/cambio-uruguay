// Una sola entidad Person para el autor, referenciada por @id desde todo el sitio.
//
// Hasta el 2026-09-22 había cuatro Person homónimas sin @id ni sameAs (dos en /acerca, una en
// useLongformSeo y una en la página de guías). Este test fija que el nodo completo se emite UNA
// vez, en /acerca, y que el layout, el composable y la página de guías apuntan al mismo @id.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AUTHOR_ID,
  AUTHOR_NAME,
  AUTHOR_SAME_AS,
  ORGANIZATION_ID,
  authorPersonNode,
  authorReference,
} from '../../utils/authorEntity'

const APP = join(__dirname, '..', '..')
const read = (file: string) => readFileSync(join(APP, file), 'utf8')

describe('la entidad del autor', () => {
  it('tiene un @id en /acerca, que es la página que habla de él', () => {
    expect(AUTHOR_ID).toBe('https://cambio-uruguay.com/acerca#eduardo-airaudo')
    expect(ORGANIZATION_ID).toBe('https://cambio-uruguay.com/#identity')
  })

  it('la referencia lleva @id, nombre y URL: vale sola en una guía y se fusiona en /acerca', () => {
    const ref = authorReference()
    expect(ref).toEqual({
      '@type': 'Person',
      '@id': AUTHOR_ID,
      name: AUTHOR_NAME,
      url: 'https://cambio-uruguay.com/acerca',
    })
  })

  it('el nodo completo cuelga de la Organization y lista sólo perfiles del autor, en https', () => {
    const node = authorPersonNode()
    expect(node['@id']).toBe(AUTHOR_ID)
    expect(node.worksFor).toEqual({ '@id': ORGANIZATION_ID })
    expect(node.sameAs).toEqual([...AUTHOR_SAME_AS])
    expect(AUTHOR_SAME_AS.length).toBeGreaterThan(0)
    for (const url of AUTHOR_SAME_AS) {
      expect(url.startsWith('https://'), url).toBe(true)
      // Perfiles del proyecto (cambio_uruguay, linkedin/company, el repo) NO van acá: son de la
      // Organization. Acá va la persona.
      expect(url, url).not.toMatch(/cambio[-_]uruguay/i)
    }
  })
})

describe('todo el sitio apunta al mismo autor', () => {
  it('/acerca emite el nodo completo una sola vez', () => {
    const acerca = read('pages/acerca.vue')
    expect(acerca).toContain('authorPersonNode()')
    expect(acerca).toContain("'@id': ORGANIZATION_ID")
    // La Organization vieja de /acerca llevaba un `author` inline: no es una propiedad válida de
    // Organization y era la cuarta copia de la persona.
    expect(acerca).not.toMatch(/author:\s*\{\s*'@type':\s*'Person'/)
  })

  it('el layout, el composable de long-form y la página de guías referencian por @id', () => {
    for (const file of [
      'layouts/default.vue',
      'composables/useLongformSeo.ts',
      'pages/guias/[slug].vue',
    ]) {
      const source = read(file)
      expect(source, file).toContain('authorReference()')
      expect(source, file).not.toMatch(/'@type': 'Person',\n\s*name: 'Eduardo Airaudo'/)
    }
  })
})
