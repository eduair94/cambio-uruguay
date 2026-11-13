import { describe, expect, it } from 'vitest'

import type { UsdSnapshot } from '../../utils/linkedinPosts'
import {
  X_GUIDES,
  currentXSlot,
  dollarTweet,
  nextXSlotAt,
  renderXFeed,
  tweetLength,
  xFeedCacheControl,
  xGuideFor,
  xMessage,
  xSlotsOn,
} from '../../utils/xPosts'
import { aiTellsIn, routeExists } from './helpers/socialCopy'

const SNAP: UsdSnapshot = {
  cheapestSell: 40.93,
  cheapestNames: ['Prex'],
  bestBuy: 40.4,
  bestBuyNames: ['Cambio Fenix'],
  brouSell: 41.7,
  sampleSize: 30,
}

// El peor caso de largo: tres casas empatadas con nombres largos, en un miércoles.
const LONG: UsdSnapshot = {
  cheapestSell: 1040.93,
  cheapestNames: ['Cambio Aguerrebere', 'Cambio La Favorita', 'Cambio Misiones'],
  bestBuy: 1039.4,
  bestBuyNames: ['Cambio Principal', 'Cambio Maiorano', 'Cambio Aguerrebere'],
  brouSell: 1049.7,
  sampleSize: 30,
}

describe('guías para X', () => {
  it('cada id es único y cada ruta existe', () => {
    const ids = X_GUIDES.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(X_GUIDES.filter(p => !routeExists(p.path)).map(p => p.path)).toEqual([])
  })

  it('alcanzan para más de dos meses sin repetir (tres por semana)', () => {
    expect(X_GUIDES.length).toBeGreaterThanOrEqual(30)
  })

  it.each(X_GUIDES.map(p => [p.id, p] as const))(
    '%s entra en un tuit y no suena a IA',
    (_id, p) => {
      expect(tweetLength(xMessage(p))).toBeLessThanOrEqual(280)
      expect(p.text.length).toBeGreaterThanOrEqual(80)
      expect(aiTellsIn(p.text)).toEqual([])
      expect(p.text).not.toMatch(/https?:\/\//)
      expect(p.text).not.toMatch(/\$|%/) // sin montos que envejecen
    }
  )
})

describe('tweetLength', () => {
  it('cuenta cada URL como 23 caracteres, como X', () => {
    expect(tweetLength('hola https://cambio-uruguay.com/una-ruta-muy-larga-de-verdad')).toBe(5 + 23)
  })
})

describe('turnos', () => {
  it('días hábiles a las 10 de Montevideo el dólar; lunes, miércoles y viernes a las 15 una guía', () => {
    expect(xSlotsOn('2026-11-16').map(s => [s.kind, s.at.toISOString()])).toEqual([
      ['dolar', '2026-11-16T13:00:00.000Z'],
      ['guia', '2026-11-16T18:00:00.000Z'],
    ])
    expect(xSlotsOn('2026-11-17').map(s => s.kind)).toEqual(['dolar'])
    expect(xSlotsOn('2026-11-21')).toEqual([]) // sábado
  })

  it('los feriados pagos no tienen dólar (las casas no abren)', () => {
    expect(xSlotsOn('2026-12-25').map(s => s.kind)).toEqual(['guia']) // viernes
  })

  it('el turno vigente es el último que ya empezó', () => {
    expect(currentXSlot(new Date('2026-11-16T12:59:00Z'))).toMatchObject({
      kind: 'guia',
      date: '2026-11-13',
    })
    expect(currentXSlot(new Date('2026-11-16T13:00:00Z'))).toMatchObject({
      kind: 'dolar',
      date: '2026-11-16',
    })
    expect(currentXSlot(new Date('2026-11-16T18:30:00Z'))).toMatchObject({
      kind: 'guia',
      date: '2026-11-16',
    })
    expect(currentXSlot(new Date('2026-11-17T20:00:00Z'))).toMatchObject({
      kind: 'dolar',
      date: '2026-11-17',
    })
  })

  it('el próximo turno salta el fin de semana', () => {
    expect(nextXSlotAt(new Date('2026-11-20T19:00:00Z')).toISOString()).toBe(
      '2026-11-23T13:00:00.000Z'
    )
  })
})

describe('xGuideFor', () => {
  it('tres guías distintas por semana y la rotación da la vuelta', () => {
    const week = ['2026-11-16', '2026-11-18', '2026-11-20'].map(d => xGuideFor(d).id)
    expect(new Set(week).size).toBe(3)
    expect(xGuideFor('2026-11-16').id).toBe(X_GUIDES[0]!.id)
    expect(xGuideFor('2026-11-18').id).toBe(X_GUIDES[1]!.id)
    expect(xGuideFor('2026-11-23').id).toBe(X_GUIDES[3]!.id)
  })
})

describe('dollarTweet', () => {
  it('lleva el día, los números a la uruguaya y la diferencia contra el BROU', () => {
    const texts = ['2026-11-16', '2026-11-17', '2026-11-18'].map(d => dollarTweet(SNAP, d).text)
    for (const t of texts) {
      expect(t).toContain('$ 40,93')
      expect(t).toContain('Prex')
      expect(t).toContain('$ 41,70')
      expect(aiTellsIn(t)).toEqual([])
    }
    expect(texts[0]).toContain('16/11')
    expect(texts.some(t => t.includes('$ 770'))).toBe(true)
    expect(new Set(texts).size).toBe(3)
  })

  it('sin diferencia que valga contra el BROU, no lo compara', () => {
    expect(dollarTweet({ ...SNAP, brouSell: 40.95 }, '2026-11-16').text).not.toContain('BROU')
    expect(dollarTweet({ ...SNAP, brouSell: null }, '2026-11-17').text).not.toContain('BROU')
  })

  it('el peor caso de largo entra en 280', () => {
    for (const d of ['2026-11-16', '2026-11-17', '2026-11-18']) {
      expect(tweetLength(xMessage(dollarTweet(LONG, d)))).toBeLessThanOrEqual(280)
      expect(
        tweetLength(xMessage(dollarTweet({ ...LONG, brouSell: null }, d)))
      ).toBeLessThanOrEqual(280)
    }
  })
})

describe('xFeedCacheControl', () => {
  const sMaxage = (cc: string) => Number(cc.match(/\bs-maxage=(\d+)/)![1])

  it('con ítem, el borde lo guarda hasta el próximo turno', () => {
    expect(sMaxage(xFeedCacheControl(new Date('2026-11-16T14:00:00Z'), true))).toBe(4 * 3600)
    expect(sMaxage(xFeedCacheControl(new Date('2026-11-20T19:00:00Z'), true))).toBe(86400)
  })

  it('sin datos del dólar, reintenta a los cinco minutos', () => {
    expect(sMaxage(xFeedCacheControl(new Date('2026-11-16T14:00:00Z'), false))).toBe(300)
  })

  it('no prohíbe servir una copia vieja', () => {
    expect(xFeedCacheControl(new Date(), true)).not.toMatch(
      /must-revalidate|no-cache|no-store|private/
    )
  })
})

describe('renderXFeed', () => {
  const slot = currentXSlot(new Date('2026-11-16T13:30:00Z'))

  it('un ítem con guid por turno y el texto con la URL al pie', () => {
    const xml = renderXFeed(slot, dollarTweet(SNAP, slot.date), new Date('2026-11-16T13:30:00Z'))
    expect(xml.match(/<item>/g)).toHaveLength(1)
    expect(xml).toContain('<guid isPermaLink="false">cambio-uruguay-x-2026-11-16-dolar</guid>')
    expect(xml).toContain('<pubDate>Mon, 16 Nov 2026 13:00:00 GMT</pubDate>')
    expect(xml).toContain('\nhttps://cambio-uruguay.com/]]></description>')
  })

  it('sin post, un feed válido sin ítems (IFTTT no publica nada)', () => {
    const xml = renderXFeed(slot, null, new Date('2026-11-16T13:30:00Z'))
    expect(xml).not.toContain('<item>')
    expect(xml).toContain('</channel>')
  })
})
