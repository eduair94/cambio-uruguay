// El aviso "¿Trabajás en <casa>?" al pie de las dos fichas de marca: lleva al monitor de
// competencia y al media kit, y no sale en un banco ni en el BCU.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BANK_ORIGINS } from '../../utils/branches'
import { casaOwnerCtaMessages } from '../../utils/casaOwnerCtaMessages'

const APP = resolve(__dirname, '../..')
const read = (path: string) => readFileSync(resolve(APP, path), 'utf8')

describe('CasaOwnerCta', () => {
  it('los tres idiomas tienen las mismas claves y el mismo marcador', () => {
    const keys = Object.keys(casaOwnerCtaMessages.es).sort()
    for (const lang of ['en', 'pt'] as const) {
      expect(Object.keys(casaOwnerCtaMessages[lang]).sort()).toEqual(keys)
      expect(casaOwnerCtaMessages[lang].title).toContain('{casa}')
      expect(casaOwnerCtaMessages[lang].text).toContain('{days}')
    }
  })

  it('lleva al monitor (/empresas) y al media kit (/publicidad), medidos por casa', () => {
    const src = read('components/casa/OwnerCta.vue')
    expect(src).toContain("localePath('/empresas')")
    expect(src).toContain("localePath('/publicidad')")
    expect(src).toMatch(/:data-cta="`casa-owner-monitor-\$\{origin\}`"/)
  })

  for (const page of ['pages/casa/[origin]/index.vue', 'pages/historico/[origin]/index.vue']) {
    it(`${page}: una sola vez, con la casa y su origen`, () => {
      const src = read(page)
      expect(src.match(/<CasaOwnerCta\b/g)).toHaveLength(1)
      expect(src).toMatch(/<CasaOwnerCta :casa="[^"]+" :origin="[^"]+" \/>/)
    })
  }

  it('el componente no se dibuja en un banco ni en el BCU', () => {
    const src = read('components/casa/OwnerCta.vue')
    expect(src).toContain('<aside v-if="visible"')
    expect(src).toContain('BANK_ORIGINS.has(origin)')
    expect(src).toContain("origin !== 'bcu'")
  })

  it('los bancos que excluye son los de la lista compartida', () => {
    expect(BANK_ORIGINS.has('brou')).toBe(true)
    expect(BANK_ORIGINS.has('gales')).toBe(false)
  })
})
