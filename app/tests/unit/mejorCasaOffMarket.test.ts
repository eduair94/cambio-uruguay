// /mejor-casa-de-cambio no corona una pizarra que el resto del sitio no corona.
//
// POR QUÉ ESTE TEST. La regla de "fuera de mercado" (utils/marketOutlier.ts: más de 3 % de la
// mediana, con 10 casas o más) la aplican la portada, /pizarra, /casas-de-cambio, /cotizacion y
// las preguntas frecuentes, pero esta página rankeaba la lista cruda. Medido el 2026-11-09: su
// descripción, el ganador y el #1 del ItemList eran Baluma Cambio a $39,55, una pizarra quieta
// desde julio que el chequeo de frescura del backend marca `extreme: "min-sell"`, mientras el
// FAQPage de la misma página decía que la más barata era Prex a $40,68.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { offMarketDetector } from '../../utils/marketOutlier'
import { rankExchanges } from '../../utils/recommendation'

describe('/mejor-casa-de-cambio', () => {
  it('rankea sólo las pizarras que el resto del sitio coronaría', () => {
    const page = readFileSync(join(__dirname, '../../pages/mejor-casa-de-cambio.vue'), 'utf8')
    expect(page).toContain('const isOffMarket = offMarketDetector(rankableRows.value)')
    expect(page).toMatch(/rankExchanges\(usableRows\.value, 'USD', 'buy'/)
  })

  it('la pizarra congelada del 2026-11-09 no gana ni aparece en la lista', () => {
    const market = Array.from({ length: 12 }, (_, i) => ({
      origin: `casa${i}`,
      code: 'USD',
      name: '',
      buy: 40 + i * 0.05,
      sell: 41.4 + i * 0.05,
    }))
    const rows = [
      ...market,
      { origin: 'baluma_cambio', code: 'USD', name: '', buy: 37.15, sell: 39.55 },
    ]
    const isOffMarket = offMarketDetector(rows)
    const ranking = rankExchanges(
      rows.filter(row => !isOffMarket(row)),
      'USD',
      'buy',
      1000
    )
    expect(ranking.ranked[0]!.origin).toBe('casa0')
    expect(ranking.ranked.some(house => house.origin === 'baluma_cambio')).toBe(false)
  })
})
