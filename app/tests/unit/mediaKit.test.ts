// El media kit de /publicidad: sin cifras, con las reglas de independencia escritas, y cada
// formato etiquetado y con rel="sponsored".
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MEDIA_KIT_AUDIENCE,
  MEDIA_KIT_CONTACT_EMAIL,
  MEDIA_KIT_FORMATS,
  MEDIA_KIT_LAST_REVIEWED,
  MEDIA_KIT_NOT_SOLD,
  MEDIA_KIT_RULES,
  SPONSORED_LABEL_KEY,
  mediaKitFormat,
  mediaKitTexts,
} from '../../utils/mediaKit'

const PAGES_DIR = resolve(__dirname, '../../pages')

function routeExists(route: string): boolean {
  if (route === '/') return existsSync(resolve(PAGES_DIR, 'index.vue'))
  const asFile = resolve(PAGES_DIR, `${route.slice(1)}.vue`)
  const asIndex = resolve(PAGES_DIR, route.slice(1), 'index.vue')
  return existsSync(asFile) || existsSync(asIndex)
}

describe('media kit', () => {
  it('publishes NO traffic or revenue figure: the repo is public', () => {
    // Una cifra de tráfico o de ingreso en un archivo versionado es lo que la raíz prohíbe. La
    // audiencia se describe por lo que la gente viene a hacer; el número se manda por mail.
    const forbidden = [
      /\d[\d.,]*\s*(?:k\b|mil\b|millones|%)/i,
      /\b(?:US\$|USD|U\$S|\$U|UYU)\b|\$\s*\d/,
      /\d[\d.,]*\s*(?:visitas|usuarios|sesiones|impresiones|clics|lectores|páginas vistas|suscriptores)/i,
      /\b(?:rpm|cpm|cpc|ecpm)\b/i,
      /\b(?:visitas|usuarios|sesiones|impresiones|lectores|suscriptores)\b[^.]+\d/i,
    ]
    for (const text of mediaKitTexts()) {
      for (const pattern of forbidden) {
        expect(text, `cifra en el media kit: "${text}"`).not.toMatch(pattern)
      }
    }
  })

  it('has unique ids and non-empty copy everywhere', () => {
    for (const list of [MEDIA_KIT_AUDIENCE, MEDIA_KIT_FORMATS, MEDIA_KIT_RULES]) {
      const ids = list.map(x => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
    for (const text of mediaKitTexts()) expect(text.trim().length).toBeGreaterThan(10)
    expect(MEDIA_KIT_NOT_SOLD.length).toBeGreaterThanOrEqual(3)
  })

  it('sells exactly the three agreed formats, each labelled and rel=sponsored', () => {
    expect(MEDIA_KIT_FORMATS.map(f => f.id)).toEqual([
      'fila-patrocinada-home',
      'tarjeta-patrocinada-directorio',
      'newsletter',
    ])
    for (const f of MEDIA_KIT_FORMATS) {
      expect(f.rel).toBe('sponsored')
      expect(f.what, f.id).toContain('"Publicidad"')
    }
    expect(SPONSORED_LABEL_KEY).toBe('ads.label')
    expect(mediaKitFormat('newsletter')?.route).toBe('/newsletter')
    expect(mediaKitFormat('nope')).toBeUndefined()
  })

  it('states the independence rule in the same words as /acerca', () => {
    // "el orden lo determina siempre el precio" es la frase que /acerca publica desde 2026-06.
    // Si alguien la reescribe en uno de los dos lados, el sitio pasa a prometer dos cosas.
    const rule = MEDIA_KIT_RULES.find(r => r.id === 'orden')!
    expect(rule.text).toMatch(/el orden lo determina siempre el precio/i)
    expect(MEDIA_KIT_NOT_SOLD.join(' ')).toMatch(/ranking/i)
    expect(MEDIA_KIT_RULES.map(r => r.id)).toContain('rel-sponsored')
    expect(MEDIA_KIT_RULES.map(r => r.id)).toContain('afiliados')
  })

  it('only points at routes that exist and gives a contact that is the site address', () => {
    for (const a of MEDIA_KIT_AUDIENCE) {
      for (const route of a.routes) expect(routeExists(route), `${a.id}: ${route}`).toBe(true)
    }
    for (const f of MEDIA_KIT_FORMATS) {
      if (f.route) expect(routeExists(f.route), `${f.id}: ${f.route}`).toBe(true)
    }
    expect(MEDIA_KIT_CONTACT_EMAIL).toBe('admin@cambio-uruguay.com')
    expect(MEDIA_KIT_LAST_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
