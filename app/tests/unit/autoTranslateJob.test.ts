import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM module of the translation scripts
import { embargoRoutes, familyOf } from '../../scripts/i18n/lib/autotranslate-plan.mjs'
// @ts-expect-error plain ESM module of the translation scripts
import { numbersIn, templatize } from '../../scripts/i18n/lib/machine-translate.mjs'

describe('auto-translate job: what it translates', () => {
  it('starts with the editorial core and leaves the data catalogues for later', () => {
    expect(familyOf('/vivir-con-25000-pesos-uruguay')).toBe(0)
    expect(familyOf('/guias/abogado-gratis-uruguay')).toBe(1)
    expect(familyOf('/herramientas/calculadora-irpf')).toBe(2)
    expect(familyOf('/sucursal/brou-centro')).toBe(4)
    expect(familyOf('/alquileres/abc')).toBeNull()
    expect(familyOf('/precio/arroz')).toBeNull()
    expect(familyOf('/blog/un-post')).toBeNull()
  })

  it('reserves the routes of recent change-log rows, but not the rollout itself', () => {
    const rows = [
      { id: 'titulos', shippedOn: '2026-11-01', routes: ['/retirar-efectivo-uruguay', '/en/x'] },
      { id: 'viejo', shippedOn: '2026-09-01', routes: ['/viejo'] },
      { id: 'idiomas-traducidos-por-maquina', shippedOn: '2026-11-02', routes: ['/fr/*'] },
      { id: 'traduccion-por-maquina-del-cuerpo', shippedOn: '2026-11-04', routes: ['/en/*'] },
      { id: 'otro', shippedOn: '2026-11-03', routes: ['/de/*', '/historico/*'] },
    ]
    expect(embargoRoutes(rows, new Date('2026-11-04T12:00:00Z'))).toEqual([
      '/retirar-efectivo-uruguay',
      '/en/x',
      '/historico/*',
    ])
  })
})

describe('auto-translate job: figures', () => {
  it('turns a translation with real figures back into the stored template', () => {
    expect(
      templatize(
        'Is it possible to live on 25,000 or 30,000 pesos for 9 hours?',
        numbersIn('con 25.000 o 30.000 pesos por 9 horas')
      )
    ).toBe('Is it possible to live on {0} or {1} pesos for {2} hours?')
    expect(templatize('avec 25 000 pesos', ['25.000'])).toBe('avec {0} pesos')
    expect(templatize('Today 40.63, yesterday 40,10', ['40,63', '40,10'])).toBe(
      'Today {0}, yesterday {1}'
    )
  })

  it('refuses a translation that lost a figure or invented one', () => {
    expect(templatize('Some pesos', ['25.000'])).toBeNull()
    expect(templatize('Pay 45 now', [])).toBeNull()
    expect(templatize('Only 1 gram', [])).toBe('Only 1 gram')
  })
})
