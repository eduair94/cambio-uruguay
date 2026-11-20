// /mejor-casa-de-cambio no corona una pizarra que el resto del sitio no corona.
//
// POR QUÉ ESTE TEST. La regla de "fuera de mercado" (utils/marketOutlier.ts) la aplican la portada,
// /pizarra, /casas-de-cambio, /cotizacion y las preguntas frecuentes, pero esta página rankeaba la
// lista cruda. Medido el 2026-11-09: su descripción, el ganador y el #1 del ItemList eran Baluma
// Cambio a $39,55, una pizarra quieta desde julio que el chequeo de frescura del backend marca
// `extreme: "min-sell"`, mientras el FAQPage de la misma página decía que la más barata era Prex a
// $40,68. Desde el 2026-11-11 la regla vive en `rankExchanges`, que también alimenta el "¿Dónde
// cambiar?" de la portada y su recomendación con IA.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { rankExchanges } from '../../utils/recommendation'

const market = Array.from({ length: 12 }, (_, i) => ({
  origin: `casa${i}`,
  code: 'USD',
  name: '',
  buy: 40 + i * 0.05,
  sell: 41.4 + i * 0.05,
}))
const frozen = { origin: 'baluma_cambio', code: 'USD', name: '', buy: 37.15, sell: 39.55 }

describe('/mejor-casa-de-cambio', () => {
  it('rankea el mercado entero a través de rankExchanges, sin filtrar antes por su cuenta', () => {
    const page = readFileSync(join(__dirname, '../../pages/mejor-casa-de-cambio.vue'), 'utf8')
    // Un filtro propio antes de rankear juzgaría la segunda vez contra una mediana ya recortada.
    expect(page).toMatch(/rankExchanges\(rankableRows\.value, 'USD', 'buy'/)
    expect(page).not.toMatch(/offMarket(?:Detector|Side)\(/)
  })

  it('la pizarra congelada del 2026-11-09 no gana ni aparece en la lista', () => {
    const ranking = rankExchanges([...market, frozen], 'USD', 'buy', 1000)
    expect(ranking.ranked[0]!.origin).toBe('casa0')
    expect(ranking.ranked.some(house => house.origin === 'baluma_cambio')).toBe(false)
  })

  it('una compra rara no saca a una casa del ranking de la venta', () => {
    // El caso de Prex: su compra lejos de la mediana, su venta la más barata del día.
    const oddBuy = { origin: 'prex', code: 'USD', name: '', buy: 37.5, sell: 41.3 }
    const ranking = rankExchanges([...market, frozen, oddBuy], 'USD', 'buy', 1000)
    expect(ranking.ranked[0]!.origin).toBe('prex')
  })
})
