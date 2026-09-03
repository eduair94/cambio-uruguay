import { describe, expect, it } from 'vitest'
import { buildFaqItems, currencyFaqIds, HOME_FAQ_IDS } from '../../utils/faqAnswers'
import type { ExchangeRate } from '../../types/api'

const today = new Date('2026-06-16T12:00:00Z')

// Plain (type='') USD quotes from 3 houses + one bcu/interbank row that must be ignored.
//
// Los `name` son basura A PROPÓSITO, y son valores REALES de la API (2026-09-03): ese campo no es
// el nombre de la casa sino la etiqueta de la moneda raspada de cada pizarra. En producción llegó a
// publicarse en datos estructurados que una casa se llama "images/bg_euros.gif". El nombre visible
// se resuelve por `origin`, así que el fixture usa slugs con guión bajo para probar justamente eso.
const rates: ExchangeRate[] = [
  {
    origin: 'house_a',
    date: '2026-06-16',
    type: '',
    code: 'USD',
    name: 'images/bg_dolares.gif',
    buy: 40,
    sell: 42,
  },
  {
    origin: 'house_b',
    date: '2026-06-16',
    type: '',
    code: 'USD',
    name: 'US.D',
    buy: 41,
    sell: 43,
  },
  {
    origin: 'house_c',
    date: '2026-06-16',
    type: '',
    code: 'USD',
    name: '1',
    buy: 39,
    sell: 41,
  },
  {
    origin: 'bcu',
    date: '2026-06-16',
    type: 'INTERBANCARIO',
    code: 'USD',
    name: 'BCU',
    buy: 41,
    sell: 41.2,
  },
  {
    origin: 'house_a',
    date: '2026-06-16',
    type: '',
    code: 'EUR',
    name: 'images/bg_dolares.gif',
    buy: 44,
    sell: 46,
  },
]

// El defecto que estas dos pruebas fijan: durante meses el FAQPage servido decía "te pagan más en
// images/bg_euros.gif". El campo `name` de la API es la etiqueta de la moneda de cada pizarra, no
// el nombre de la casa — barrido del 2026-09-03: de 157 URLs con FAQPage, 156 nombraban una casa
// inexistente ("REAL" 76 veces, "images/bg_euros.gif" 37).
describe('el nombre de la casa nunca sale de la etiqueta de la pizarra', () => {
  it('ignora el `name` de la API aunque sea una ruta de imagen', () => {
    const items = buildFaqItems(rates, 'es', { today })
    const todo = items.map(i => i.answer).join(' | ')
    expect(todo).not.toContain('images/')
    expect(todo).not.toContain('US.D')
    expect(todo).not.toContain(' en 1,')
  })

  it('nombra la casa por su origin, en formato legible', () => {
    const items = buildFaqItems(rates, 'es', { today })
    const buy = items.find(i => i.id === 'buy-USD')!
    expect(buy.answer).toContain('House C')
  })
})

// La home publicaba DOS precios distintos del mismo dólar en su propio HTML: $40,40 en la meta
// description y en el ExchangeRateSpecification —que ya pasaban por `rankUsableQuotes`— y $39,55 en
// el FAQPage, que salía de este módulo sin la guarda. El propio repo describe ese $39,55 como "una
// pizarra 4,6 % bajo la mediana" (currencyPages.ts:262), o sea un precio inalcanzable, y Google
// leía las dos afirmaciones en el mismo documento.
describe('el FAQPage descarta las pizarras fuera de mercado, como el resto del sitio', () => {
  // `offMarketDetector` se calla con menos de MIN_SAMPLE (10) cotizaciones: en un mercado fino
  // —ARS, o una moneda que cotizan dos casas— descartar una de dos precios sería peor que el
  // problema. Así que el fixture necesita mercado de verdad, como el real de 41 casas.
  const sanas: ExchangeRate[] = Array.from({ length: 12 }, (_, i) => ({
    origin: `casa_${i}`,
    date: '2026-06-16',
    type: '',
    code: 'USD',
    name: 'USD',
    buy: 40 + i * 0.05,
    sell: 41 + i * 0.05,
  }))
  const rota: ExchangeRate = {
    origin: 'pizarra_rota',
    date: '2026-06-16',
    type: '',
    code: 'USD',
    name: 'USD',
    buy: 34,
    sell: 35,
  }

  it('no anuncia el precio de la pizarra descartada', () => {
    const rate = buildFaqItems([...sanas, rota], 'es', { today }).find(i => i.id === 'rate-USD')!
    expect(rate.answer).not.toContain('$35')
    expect(rate.answer).not.toContain('Pizarra Rota')
  })

  it('agregar una pizarra imposible no cambia lo que el sitio afirma', () => {
    const con = buildFaqItems([...sanas, rota], 'es', { today }).find(i => i.id === 'rate-USD')!
    const sin = buildFaqItems(sanas, 'es', { today }).find(i => i.id === 'rate-USD')!
    expect(con.answer).toBe(sin.answer)
  })

  it('con mercado fino no descarta nada, que es la otra mitad de la regla', () => {
    // Tres casas: por debajo de MIN_SAMPLE el detector se calla y el mínimo real se publica.
    const finas = sanas.slice(0, 3)
    const rate = buildFaqItems([...finas, rota], 'es', { today }).find(i => i.id === 'rate-USD')!
    expect(rate.answer).toContain('$35')
  })
})

describe('buildFaqItems', () => {
  it('builds a USD "today" answer from min sell / max buy of plain quotes only', () => {
    const items = buildFaqItems(rates, 'es', { today })
    const rate = items.find(i => i.id === 'rate-USD')!
    expect(rate).toBeTruthy()
    // min sell 41 (houseC), max buy 41 (houseB); bcu/interbank excluded
    expect(rate.answer).toContain('41.00')
    expect(rate.answer).not.toContain('41.20') // interbank sell must not leak
    expect(rate.question.toLowerCase()).toContain('dólar')
  })

  it('recommends the cheapest house to BUY USD (lowest sell)', () => {
    const items = buildFaqItems(rates, 'es', { today })
    const buy = items.find(i => i.id === 'buy-USD')!
    expect(buy.answer).toContain('House C') // lowest sell 41, nombrada por su origin
    expect(buy.answer).toContain('41.00')
  })

  it('uses the plural noun in buy/sell copy ("comprar dólares", not "dólar")', () => {
    const items = buildFaqItems(rates, 'es', { today })
    expect(items.find(i => i.id === 'buy-USD')!.question).toContain('comprar dólares')
    expect(items.find(i => i.id === 'sell-USD')!.question).toContain('vender dólares')
    // The rate question keeps the singular with its article.
    expect(items.find(i => i.id === 'rate-USD')!.question).toContain('el dólar')
  })

  it('recommends the house that pays most to SELL USD (highest buy)', () => {
    const items = buildFaqItems(rates, 'es', { today })
    const sell = items.find(i => i.id === 'sell-USD')!
    expect(sell.answer).toContain('House B') // highest buy 41, nombrada por su origin
  })

  it('always includes evergreen items even with empty rates', () => {
    const items = buildFaqItems([], 'es', { today })
    const ids = items.map(i => i.id)
    expect(ids).toContain('types')
    expect(ids).toContain('update-freq')
    expect(ids).toContain('data-source')
    expect(ids).toContain('how-choose')
    // No live items when there is no data (fail-graceful)
    expect(ids).not.toContain('rate-USD')
  })

  it('emits one item per locale with non-empty question and answer', () => {
    for (const lang of ['es', 'en', 'pt'] as const) {
      const items = buildFaqItems(rates, lang, { today })
      expect(items.length).toBeGreaterThan(0)
      for (const it of items) {
        expect(it.question.length).toBeGreaterThan(3)
        expect(it.answer.length).toBeGreaterThan(3)
      }
    }
  })

  it('exposes stable id helpers', () => {
    expect(HOME_FAQ_IDS).toEqual([
      'rate-USD',
      'buy-USD',
      'sell-USD',
      'spread-USD',
      'types',
      'update-freq',
      'data-source',
      'how-choose',
    ])
    expect(currencyFaqIds('EUR')).toEqual(['rate-EUR', 'buy-EUR', 'sell-EUR'])
  })
})
