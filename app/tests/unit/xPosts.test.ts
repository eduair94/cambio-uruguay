import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { LinkedinRateRow, UsdSnapshot } from '../../utils/linkedinPosts'
import { videoXItem } from '../../utils/videoPosts'
import {
  X_GUIDES,
  closeTweet,
  currentXSlot,
  dollarTweet,
  moveLabel,
  nextXSlotAt,
  renderXFeed,
  slotItem,
  summarizeBrouWeek,
  summarizeCurrency,
  travelTweet,
  tweetLength,
  weekTweet,
  xFeedCacheControl,
  xGuideFor,
  xMessage,
  xSlotsOn,
  type CloseSnapshot,
  type CurrencySnapshot,
  type WeekSnapshot,
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
  it('días hábiles el dólar a las 10 y el cierre a las 17; lunes, miércoles y viernes una guía a las 15', () => {
    expect(xSlotsOn('2026-11-16').map(s => [s.kind, s.at.toISOString()])).toEqual([
      ['dolar', '2026-11-16T13:00:00.000Z'],
      ['guia', '2026-11-16T18:00:00.000Z'],
      ['cierre', '2026-11-16T20:00:00.000Z'],
    ])
    expect(xSlotsOn('2026-11-17').map(s => s.kind)).toEqual(['dolar', 'cierre'])
  })

  it('el sábado el real a las 10 y el domingo la semana a las 11', () => {
    expect(xSlotsOn('2026-11-21').map(s => [s.kind, s.at.toISOString()])).toEqual([
      ['viaje', '2026-11-21T13:00:00.000Z'],
    ])
    expect(xSlotsOn('2026-11-22').map(s => [s.kind, s.at.toISOString()])).toEqual([
      ['semana', '2026-11-22T14:00:00.000Z'],
    ])
  })

  it('los feriados pagos no tienen dólar ni cierre (las casas no abren)', () => {
    expect(xSlotsOn('2026-12-25').map(s => s.kind)).toEqual(['guia']) // viernes
  })

  it('el turno vigente es el último que ya empezó', () => {
    expect(currentXSlot(new Date('2026-11-16T12:59:00Z'))).toMatchObject({
      kind: 'semana',
      date: '2026-11-15',
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
      kind: 'cierre',
      date: '2026-11-17',
    })
  })

  it('después del cierre del viernes viene el real del sábado', () => {
    expect(nextXSlotAt(new Date('2026-11-20T21:00:00Z')).toISOString()).toBe(
      '2026-11-21T13:00:00.000Z'
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

describe('closeTweet', () => {
  const UP: CloseSnapshot = {
    brouOpen: 41.6,
    brouLast: 41.9,
    cheapestSell: 41.2,
    cheapestNames: ['Prex'],
  }
  const DAYS = ['2026-11-16', '2026-11-17', '2026-11-18']

  it('un día quieto no se tuitea', () => {
    expect(closeTweet({ ...UP, brouLast: 41.6 }, '2026-11-16')).toBeNull()
    expect(closeTweet({ ...UP, brouLast: 41.65 }, '2026-11-16')).toBeNull()
    expect(closeTweet({ ...UP, brouLast: 41.5 }, '2026-11-16')).not.toBeNull()
  })

  it('dice cuánto, para dónde y lo más barato, sin sonar a IA', () => {
    const texts = DAYS.map(d => closeTweet(UP, d)!.text)
    for (const t of texts) {
      expect(t).toContain('30 centésimos')
      expect(t).toMatch(/subió|sube/)
      expect(t).toContain('$ 41,60')
      expect(t).toContain('$ 41,90')
      expect(t).toContain('$ 41,20')
      expect(t).toContain('Prex')
      expect(aiTellsIn(t)).toEqual([])
    }
    expect(new Set(texts).size).toBe(3)
    const down = closeTweet({ ...UP, brouLast: 41.1 }, '2026-11-16')!.text
    expect(down).toMatch(/bajó|baja/)
    expect(down).toContain('50 centésimos')
  })

  it('el peor caso de largo entra en 280', () => {
    for (const d of DAYS) {
      const post = closeTweet(
        {
          brouOpen: 1040.6,
          brouLast: 1042.95,
          cheapestSell: 1040.93,
          cheapestNames: LONG.cheapestNames,
        },
        d
      )!
      expect(tweetLength(xMessage(post))).toBeLessThanOrEqual(280)
    }
  })
})

describe('moveLabel', () => {
  it('centésimos debajo de un peso, pesos arriba', () => {
    expect(moveLabel(0.3)).toBe('30 centésimos')
    expect(moveLabel(-0.15)).toBe('15 centésimos')
    expect(moveLabel(0.01)).toBe('1 centésimo')
    expect(moveLabel(1.05)).toBe('$ 1,05')
  })
})

describe('la semana del dólar', () => {
  /** Puntos diarios del BROU como los da `/evolution` (medianoche de Montevideo en UTC). */
  const point = (day: string, sell: number, type = '') => ({
    date: `${day}T03:00:00.000Z`,
    sell,
    type,
  })
  const days = (from: string, n: number) =>
    Array.from({ length: n }, (_, i) =>
      new Date(Date.parse(`${from}T12:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10)
    )
  // 140 días de historia entre 40,50 y 41,50, y después dos semanas.
  const history = days('2026-06-20', 140).map((d, i) => point(d, 40.5 + (i % 11) / 10))

  it('el último día hábil de la semana contra el de la anterior, sin eBROU ni fin de semana', () => {
    const w = summarizeBrouWeek(
      [
        ...history,
        point('2026-11-13', 41.55),
        point('2026-11-14', 41.5), // sábado: la serie trae fines de semana
        point('2026-11-20', 41.9),
        point('2026-11-20', 41.4, 'EBROU'),
        point('2026-11-21', 41.95), // sábado
      ],
      '2026-11-22'
    )!
    expect(w).toMatchObject({ close: 41.9, closeDay: '2026-11-20', prevClose: 41.55 })
    expect(w.high).toBe(true)
    expect(w.low).toBe(false)
  })

  it('sin una de las dos puntas, o con un salto imposible, no hay tuit', () => {
    expect(summarizeBrouWeek([point('2026-11-20', 41.9)], '2026-11-22')).toBeNull()
    expect(
      summarizeBrouWeek([point('2026-11-13', 41.5), point('2026-11-20', 48)], '2026-11-22')
    ).toBeNull()
  })

  it('sin historia suficiente no dice "el más alto en seis meses"', () => {
    const w = summarizeBrouWeek(
      [point('2026-11-13', 41.5), point('2026-11-20', 41.9)],
      '2026-11-22'
    )!
    expect(w.high).toBe(false)
    expect(weekTweet(w, '2026-11-22').text).not.toContain('seis meses')
  })

  it('el tuit nombra el día, la diferencia y el récord, entra en 280 y no suena a IA', () => {
    const up: WeekSnapshot = {
      close: 41.9,
      closeDay: '2026-11-20',
      prevClose: 41.55,
      high: true,
      low: false,
    }
    for (const d of ['2026-11-22', '2026-11-29']) {
      const post = weekTweet(up, d)
      expect(post.text).toContain('viernes')
      expect(post.text).toContain('35 centésimos más')
      expect(post.text).toContain('No estaba tan caro')
      expect(aiTellsIn(post.text)).toEqual([])
      expect(tweetLength(xMessage(post))).toBeLessThanOrEqual(280)
    }
    expect(weekTweet({ ...up, close: 41.55, high: false }, '2026-11-22').text).toContain(
      'igual que una semana antes'
    )
    expect(weekTweet({ ...up, close: 41.2, high: false, low: true }, '2026-11-22').text).toContain(
      '35 centésimos menos'
    )
  })

  it('lleva al histórico del BROU, que es una página del sitio', () => {
    expect(
      weekTweet(
        { close: 41, closeDay: '2026-11-20', prevClose: 41, high: false, low: false },
        '2026-11-22'
      ).path
    ).toBe('/historico/brou/usd')
    expect(
      existsSync(join(__dirname, '..', '..', 'pages', 'historico', '[origin]', '[currency]'))
    ).toBe(true)
  })
})

describe('el real para viajar', () => {
  const NOW = new Date('2026-11-21T13:00:00Z')
  const row = (origin: string, sell: number, over: Partial<LinkedinRateRow> = {}) =>
    ({
      origin,
      code: 'BRL',
      type: '',
      buy: sell - 0.6,
      sell,
      date: '2026-11-21T03:00:00.000Z',
      ...over,
    }) as LinkedinRateRow
  const rows = [
    row('cambio_fenix', 7.6),
    row('fortex', 7.65),
    row('cambial', 7.65),
    row('cambio_principal', 7.7),
    row('suizo', 8),
    row('gales', 7.8),
    row('varlix', 7.75),
    row('brou', 8.1),
    row('bcu', 7.0),
  ]
  const names = { cambio_fenix: { name: 'Cambio Fenix' } }

  it('la más barata con nombre, sin el BCU ni las pizarras quietas', () => {
    expect(summarizeCurrency('BRL', rows, names, new Set(), NOW)).toMatchObject({
      cheapestSell: 7.6,
      cheapestNames: ['Cambio Fenix'],
      brouSell: 8.1,
      sampleSize: 8,
    })
    const quieta = summarizeCurrency('BRL', rows, names, new Set(['cambio_fenix|BRL|']), NOW)
    expect(quieta).toBeNull() // quedan 7: menos que el mínimo
  })

  it('sin el reporte de pizarras quietas, con pocas casas o con una pizarra rota, no hay tuit', () => {
    expect(summarizeCurrency('BRL', rows, names, null, NOW)).toBeNull()
    expect(summarizeCurrency('BRL', rows.slice(0, 5), names, new Set(), NOW)).toBeNull()
    expect(summarizeCurrency('BRL', [...rows, row('rota', 0.76)], names, new Set(), NOW)).toBeNull()
    expect(
      summarizeCurrency(
        'BRL',
        rows.map(r => ({ ...r, date: '2026-11-01T03:00:00.000Z' })),
        names,
        new Set(),
        NOW
      )
    ).toBeNull()
  })

  it('el tuit lleva el precio, la casa y el BROU, entra en 280 y no suena a IA', () => {
    const snap: CurrencySnapshot = {
      cheapestSell: 7.6,
      cheapestNames: ['Cambio Fenix'],
      brouSell: 8.1,
      sampleSize: 30,
    }
    const texts = ['2026-11-21', '2026-11-28'].map(d => travelTweet(snap, d))
    for (const post of texts) {
      expect(post.text).toContain('$ 7,60')
      expect(post.text).toContain('Cambio Fenix')
      expect(post.text).toContain('$ 8,10')
      expect(aiTellsIn(post.text)).toEqual([])
      expect(routeExists(post.path)).toBe(true)
      expect(
        tweetLength(
          xMessage(travelTweet({ ...snap, cheapestNames: LONG.cheapestNames }, '2026-11-21'))
        )
      ).toBeLessThanOrEqual(280)
    }
    expect(new Set(texts.map(p => p.text)).size).toBe(2)
  })
})

describe('xFeedCacheControl', () => {
  const sMaxage = (cc: string) => Number(cc.match(/\bs-maxage=(\d+)/)![1])

  it('hasta el próximo turno o video, con techo de quince minutos', () => {
    expect(sMaxage(xFeedCacheControl(new Date('2026-11-16T14:00:00Z'), true))).toBe(900)
    expect(sMaxage(xFeedCacheControl(new Date('2026-11-16T12:55:00Z'), true))).toBe(300)
    expect(
      sMaxage(
        xFeedCacheControl(new Date('2026-11-16T14:00:00Z'), true, new Date('2026-11-16T14:02:00Z'))
      )
    ).toBe(120)
    // nunca menos de un minuto
    expect(sMaxage(xFeedCacheControl(new Date('2026-11-16T12:59:50Z'), true))).toBe(60)
  })

  it('sin datos para el turno, reintenta a los cinco minutos', () => {
    expect(sMaxage(xFeedCacheControl(new Date('2026-11-16T14:00:00Z'), false))).toBe(300)
  })

  it('no prohíbe servir una copia vieja', () => {
    expect(xFeedCacheControl(new Date(), true)).not.toMatch(
      /must-revalidate|no-cache|no-store|private/
    )
  })
})

describe('renderXFeed', () => {
  const now = new Date('2026-11-16T13:30:00Z')
  const slot = currentXSlot(now)

  it('un ítem con guid por turno y el texto con la URL al pie (el guid de siempre)', () => {
    const xml = renderXFeed([slotItem(slot, dollarTweet(SNAP, slot.date))], now)
    expect(xml.match(/<item>/g)).toHaveLength(1)
    expect(xml).toContain('<guid isPermaLink="false">cambio-uruguay-x-2026-11-16-dolar</guid>')
    expect(xml).toContain('<pubDate>Mon, 16 Nov 2026 13:00:00 GMT</pubDate>')
    expect(xml).toContain('\nhttps://cambio-uruguay.com/]]></description>')
  })

  it('el turno y los videos juntos, lo más nuevo primero', () => {
    const video = videoXItem({
      video: {
        videoId: 'abc123',
        title: 'Qué pasa con el dólar',
        publishedAt: '2026-11-16T12:00:00Z',
        channelKey: 'canal',
        channelName: 'Canal',
        channelCountry: 'UY',
        topics: ['dolar-y-cotizaciones'],
        money: 'money',
      },
      at: new Date('2026-11-16T13:20:00Z'),
    })
    const xml = renderXFeed([slotItem(slot, dollarTweet(SNAP, slot.date)), video], now)
    expect(xml.match(/<item>/g)).toHaveLength(2)
    expect(xml.indexOf('cambio-uruguay-video-abc123')).toBeLessThan(
      xml.indexOf('cambio-uruguay-x-2026-11-16-dolar')
    )
  })

  it('sin nada que publicar, un feed válido sin ítems (IFTTT no publica nada)', () => {
    const xml = renderXFeed([], now)
    expect(xml).not.toContain('<item>')
    expect(xml).toContain('</channel>')
  })
})
