import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM module of the translation scripts
import {
  FAILURE_LIMIT,
  embargoRoutes,
  familyOf,
  giveUp,
  translationGroups,
  translationOrder,
} from '../../scripts/i18n/lib/autotranslate-plan.mjs'
// @ts-expect-error plain ESM module of the translation scripts
import {
  asciiDigits,
  cleanPlainText,
  numbersIn,
  templatize,
} from '../../scripts/i18n/lib/machine-translate.mjs'

describe('auto-translate job: what it translates', () => {
  it('starts with the editorial core and leaves the data catalogues for last', () => {
    expect(familyOf('/vivir-con-25000-pesos-uruguay')).toBe(0)
    expect(familyOf('/guias/abogado-gratis-uruguay')).toBe(1)
    expect(familyOf('/herramientas/calculadora-irpf')).toBe(2)
    expect(familyOf('/sucursal/brou-centro')).toBe(4)
    expect(familyOf('/blog/un-post')).toBe(5)
    expect(familyOf('/newsletter/2026-11-01')).toBe(5)
    expect(familyOf('/precio/arroz')).toBe(6)
    expect(familyOf('/descuentos-con-tarjeta-uruguay/tienda-inglesa')).toBe(6)
    expect(familyOf('/autos-usados-uruguay/toyota-hilux')).toBe(7)
    expect(familyOf('/sillas-escritorio-uruguay/una')).toBe(7)
    expect(familyOf('/alquileres/abc')).toBeNull()
  })

  it('fills every locale with a family before any locale gets the next one', () => {
    const pages = [
      {
        _id: '/a',
        tier: 0,
        segs: [
          ['h1', 10],
          ['h2', 5],
        ],
      },
      {
        _id: '/guias/b',
        tier: 1,
        segs: [
          ['h2', 5],
          ['h3', 7],
        ],
      },
      { _id: '/reservada', tier: 0, segs: [['h4', 3]] },
      { _id: '/blog/c', tier: 5, segs: [['h5', 4]] },
    ]
    const groups = translationGroups(pages, (path: string) => path === '/reservada')
    expect(groups).toEqual([
      { key: '0:0', hashes: ['h1', 'h2'] },
      { key: '0:1', hashes: ['h3'] },
      { key: '0:5', hashes: ['h5'] },
      { key: '1:0', hashes: ['h4'] },
    ])
  })

  it('takes English and Portuguese through every family before the other locales', () => {
    const groups = [
      { key: '0:0', hashes: ['a'] },
      { key: '0:5', hashes: ['b'] },
    ]
    const order = translationOrder(groups, ['en', 'pt', 'fr', 'de']).map(
      ({ group, locale }: { group: { key: string }; locale: string }) => `${locale}@${group.key}`
    )
    expect(order).toEqual([
      'en@0:0',
      'en@0:5',
      'pt@0:0',
      'pt@0:5',
      'fr@0:0',
      'de@0:0',
      'fr@0:5',
      'de@0:5',
    ])
  })

  it('stops paying for a segment that keeps failing, and retries it a month later', () => {
    const now = Date.parse('2026-11-06T00:00:00Z')
    const retryAfter = now - 30 * 86_400_000
    const recent = new Date(now - 86_400_000)
    expect(giveUp({ n: FAILURE_LIMIT - 1, at: recent }, retryAfter)).toBe(false)
    expect(giveUp({ n: FAILURE_LIMIT, at: recent }, retryAfter)).toBe(true)
    expect(giveUp({ n: FAILURE_LIMIT, at: new Date(now - 31 * 86_400_000) }, retryAfter)).toBe(
      false
    )
    expect(giveUp(null, retryAfter)).toBe(false)
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

describe('auto-translate job: right-to-left scripts', () => {
  it('reads Arabic-Indic and Persian figures as the ASCII digits the page prints', () => {
    expect(asciiDigits('٢٥٬٠٠٠ و ۴۰٫۶۳')).toBe('25,000 و 40.63')
    expect(templatize(cleanPlainText('بـ ٢٥٬٠٠٠ بيزو', 'x'), numbersIn('con 25.000 pesos'))).toBe(
      'بـ {0} بيزو'
    )
  })
})
