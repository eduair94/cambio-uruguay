import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PRESS_MENTIONS,
  PRESS_MENTIONS_LAST_REVIEWED,
  getPressMention,
  mentionsFor,
  platformLabel,
} from '../../utils/pressMentions'

const HERE = dirname(fileURLToPath(import.meta.url))
const PAGES_DIR = resolve(HERE, '../../pages')

describe('press mentions catalogue', () => {
  it('has unique ids and complete, non-empty entries', () => {
    const ids = PRESS_MENTIONS.map(m => m.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const m of PRESS_MENTIONS) {
      expect(m.author.trim()).not.toBe('')
      expect(m.authorNote.trim()).not.toBe('')
      expect(m.quote.trim().length).toBeGreaterThan(20)
      expect(m.context.trim().length).toBeGreaterThan(40)
      expect(m.pages.length).toBeGreaterThan(0)
    }
  })

  it('never publishes a mention without a public link to the original', () => {
    // Sin link no hay mención: "nos recomendaron en redes" no es evidencia.
    for (const m of PRESS_MENTIONS) {
      expect(m.url.startsWith('https://'), `${m.id} sin URL https`).toBe(true)
      if (m.threadUrl) expect(m.threadUrl.startsWith('https://')).toBe(true)
      if (m.platform === 'x') {
        expect(/^https:\/\/(?:x\.com|twitter\.com)\//.test(m.url), `${m.id} no apunta a X`).toBe(
          true
        )
      }
    }
  })

  it('answers every mention instead of just showing it off', () => {
    for (const m of PRESS_MENTIONS) {
      expect(m.ourTake.trim().length, `${m.id} sin nuestra respuesta`).toBeGreaterThan(60)
    }
  })

  it('dates everything in ISO so la cita no queda flotando', () => {
    expect(PRESS_MENTIONS_LAST_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (const m of PRESS_MENTIONS) {
      expect(m.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('only targets pages that exist in the repo', () => {
    // Tripwire: si una página se renombra, la mención deja de mostrarse en silencio.
    for (const m of PRESS_MENTIONS) {
      for (const page of m.pages) {
        expect(page.startsWith('/'), `${m.id}: "${page}" no es una ruta`).toBe(true)
        const asFile = resolve(PAGES_DIR, `${page.slice(1)}.vue`)
        const asIndex = resolve(PAGES_DIR, page.slice(1), 'index.vue')
        expect(
          existsSync(asFile) || existsSync(asIndex),
          `${m.id}: no existe la página ${page}`
        ).toBe(true)
      }
    }
  })

  it('filters by page, newest first', () => {
    const found = mentionsFor('/tarjetas-de-credito-uruguay')
    expect(found.length).toBeGreaterThan(0)
    const dates = found.map(m => m.date)
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates)

    expect(mentionsFor('/pagina-que-no-existe')).toEqual([])
  })

  it('resolves by id and labels platforms', () => {
    expect(getPressMention(PRESS_MENTIONS[0]!.id)).toBeDefined()
    expect(getPressMention('nope')).toBeUndefined()
    expect(platformLabel('x')).toBe('X (Twitter)')
    expect(platformLabel('prensa')).toBe('Prensa')
  })
})
