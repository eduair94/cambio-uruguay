import { describe, expect, it } from 'vitest'
import {
  REDDIT_BANK_IDS,
  REDDIT_CARD_IDS,
  REDDIT_ENTITIES,
  extractMentions,
  normalize,
} from '../../utils/redditSentiment'
import { DEBIT_CARDS, DEBIT_REDDIT_ENTITY, DEBIT_REDDIT_IDS } from '../../utils/debitCards'
import { CARD_PROGRAMS, PROGRAM_REDDIT_ENTITY, PROGRAM_REDDIT_IDS } from '../../utils/cardRewards'
import { BRAND_COLORS, brandColor, monogram, readableOn } from '../../utils/brandColors'

const ENTITY_IDS = new Set(REDDIT_ENTITIES.map(e => e.id))

/** Does any pattern of `id` recognise this text? */
function matches(id: string, text: string): boolean {
  const entity = REDDIT_ENTITIES.find(e => e.id === id)
  if (!entity) throw new Error(`no entity ${id}`)
  const t = normalize(text)
  return entity.patterns.some(p => p.test(t))
}

describe('reddit entities - card issuers exist', () => {
  it('tracks the card issuers the ranking pages need', () => {
    for (const id of ['oca', 'midinero', 'creditel', 'passcard', 'cabal', 'tiendainglesa']) {
      expect(ENTITY_IDS.has(id)).toBe(true)
    }
  })

  it('has unique ids and at least one query + pattern each', () => {
    const ids = REDDIT_ENTITIES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const e of REDDIT_ENTITIES) {
      expect(e.name.trim().length).toBeGreaterThan(1)
      expect(e.queries.length).toBeGreaterThan(0)
      expect(e.patterns.length).toBeGreaterThan(0)
    }
  })
})

describe('reddit entities - no false positives on ordinary Spanish', () => {
  // `oca` is a substring of very common words; the word-boundary guard must hold.
  it('oca does not match boca/poca/loca/toca/Boca', () => {
    for (const word of [
      'la boca del lobo',
      'tengo poca plata',
      'esa idea es loca',
      'me toca pagar',
      'hincha de Boca',
      'una bocanada',
    ]) {
      expect(matches('oca', word)).toBe(false)
    }
  })

  it('oca still matches the brand', () => {
    for (const word of ['tengo la tarjeta OCA', 'OCA Blue anda bien', 'pagué con oca']) {
      expect(matches('oca', word)).toBe(true)
    }
  })

  // The whole reason midinero is one word: "mi dinero" is ordinary Spanish.
  it('midinero does not match the phrase "mi dinero"', () => {
    for (const phrase of [
      'saqué mi dinero del banco',
      'perdí mi dinero',
      'quiero mi dinero de vuelta',
      'donde pongo mi dinero',
    ]) {
      expect(matches('midinero', phrase)).toBe(false)
    }
  })

  it('midinero matches the brand written as one word', () => {
    expect(matches('midinero', 'la tarjeta MiDinero')).toBe(true)
    expect(matches('midinero', 'midinero no me anda')).toBe(true)
  })

  it('cabal does not match "cabalgata"; passcard does not match "pass"', () => {
    expect(matches('cabal', 'fuimos a la cabalgata')).toBe(false)
    expect(matches('cabal', 'pagué con Cabal')).toBe(true)
    expect(matches('passcard', 'me dieron un pass')).toBe(false)
    expect(matches('passcard', 'tengo PassCard')).toBe(true)
  })

  it('tienda inglesa matches with and without the space', () => {
    expect(matches('tiendainglesa', 'compré en Tienda Inglesa')).toBe(true)
    expect(matches('tiendainglesa', 'el super de siempre')).toBe(false)
  })

  it('the ordinary-word brands stay untracked on purpose', () => {
    // ANDA / Pronto! / Líder would poison the corpus — see the comment in the catalogue.
    for (const id of ['anda', 'pronto', 'lider']) expect(ENTITY_IDS.has(id)).toBe(false)
  })

  it('a complaint about an app not working is not attributed to a card', () => {
    const text = normalize('la app no anda nunca y encima pronto me cobran de más')
    const hits = extractMentions(text).map(m => m.entityId)
    expect(hits).not.toContain('midinero')
    expect(hits).not.toContain('oca')
  })
})

describe('reddit groupings', () => {
  it('bank and card id lists only reference real entities', () => {
    for (const id of [...REDDIT_BANK_IDS, ...REDDIT_CARD_IDS]) {
      expect(ENTITY_IDS.has(id)).toBe(true)
    }
  })

  it('the groupings have no duplicates', () => {
    expect(new Set(REDDIT_BANK_IDS).size).toBe(REDDIT_BANK_IDS.length)
    expect(new Set(REDDIT_CARD_IDS).size).toBe(REDDIT_CARD_IDS.length)
  })
})

describe('card → reddit entity maps', () => {
  it('every debit card key is a real card and every value a real entity', () => {
    const cardIds = new Set(DEBIT_CARDS.map(c => c.id))
    for (const [cardId, entityId] of Object.entries(DEBIT_REDDIT_ENTITY)) {
      expect(cardIds.has(cardId)).toBe(true)
      expect(ENTITY_IDS.has(entityId)).toBe(true)
    }
  })

  it('every debit card maps to an issuer', () => {
    for (const c of DEBIT_CARDS) expect(DEBIT_REDDIT_ENTITY[c.id]).toBeTruthy()
  })

  it('every credit programme key is a real programme and every value a real entity', () => {
    const programIds = new Set(CARD_PROGRAMS.map(p => p.id))
    for (const [programId, entityId] of Object.entries(PROGRAM_REDDIT_ENTITY)) {
      expect(programIds.has(programId)).toBe(true)
      expect(ENTITY_IDS.has(entityId)).toBe(true)
    }
  })

  it('the untracked-issuer programmes are left unmapped rather than mis-attributed', () => {
    for (const id of ['pronto-visa', 'tarjeta-anda', 'tarjeta-lider']) {
      expect(PROGRAM_REDDIT_ENTITY[id]).toBeUndefined()
    }
  })

  it('derived id lists are de-duplicated (four Itaú cards → one entity)', () => {
    expect(new Set(DEBIT_REDDIT_IDS).size).toBe(DEBIT_REDDIT_IDS.length)
    expect(new Set(PROGRAM_REDDIT_IDS).size).toBe(PROGRAM_REDDIT_IDS.length)
    expect(PROGRAM_REDDIT_IDS.filter(id => id === 'itau').length).toBe(1)
  })
})

describe('brandColors', () => {
  it('gives every tracked entity a colour', () => {
    for (const e of REDDIT_ENTITIES) {
      expect(BRAND_COLORS[e.id]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('falls back to a neutral for unknown ids', () => {
    expect(brandColor('__nope__')).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('picks a readable text colour on light and dark backgrounds', () => {
    expect(readableOn('#ffffff')).toBe('#0b1220')
    expect(readableOn('#00274d')).toBe('#ffffff')
  })

  it('makes short, stable monograms', () => {
    expect(monogram('Mercado Pago')).toBe('MP')
    expect(monogram('MiDinero')).toBe('MD')
    expect(monogram('Tienda Inglesa')).toBe('TI')
    expect(monogram('OCA')).toBe('OC')
    expect(monogram('Prex').length).toBeLessThanOrEqual(4)
  })
})
