import { describe, expect, it } from 'vitest'
import {
  MONOPATIN_MODEL_SLUG_RE,
  monopatinCompareRows,
  monopatinModelDescription,
  monopatinModelFreshFloor,
  monopatinModelShortName,
  monopatinModelSiblings,
  monopatinModelSummary,
  monopatinModelTitle,
  monopatinRealRangeKm,
  monopatinSpecAgreement,
  type MonopatinModelDoc,
  type MonopatinModelSummary,
} from '../../utils/monopatinModelos'
import { titleFits } from '../../utils/liveRateSeo'

const values = (over: Record<string, unknown> = {}) => ({
  rangeKm: null,
  maxSpeedKmh: null,
  motorW: null,
  motorPeakW: null,
  batteryV: null,
  batteryAh: null,
  batteryWh: null,
  chargeHours: null,
  maxLoadKg: null,
  weightKg: null,
  wheelInches: null,
  minAge: null,
  foldable: null,
  suspension: null,
  discBrake: null,
  bluetooth: null,
  brakes: null,
  ipRating: null,
  ...over,
})

const doc = (over: Partial<MonopatinModelDoc> = {}): MonopatinModelDoc => ({
  slug: 'xiaomi-6-pro',
  name: 'Xiaomi Electric Scooter 6 Pro',
  brandKey: 'xiaomi',
  brandLabel: 'Xiaomi',
  modelLabel: 'Electric Scooter 6 Pro',
  variant: 'urbano',
  image: 'https://http2.mlstatic.com/a.webp',
  offers: [],
  newBand: { min: 31461, median: 41040, max: 53553, n: 20, sellers: 8 },
  usedBand: { min: 32500, median: 32500, max: 32500, n: 1, sellers: 1 },
  specs: {
    values: values({ rangeKm: 70, maxSpeedKmh: 25, motorW: 1000, weightKg: 27.3, batteryWh: 468 }),
    agree: { rangeKm: { n: 12, of: 20 } },
    spread: { rangeKm: { min: 45, max: 70 } },
  },
  fichas: 22,
  listings: 27,
  sellers: 9,
  indexable: true,
  firstSeen: '2026-09-22',
  lastSeen: '2026-11-04',
  generatedAt: '2026-11-04T06:01:00Z',
  history: [],
  ...over,
})

const summary = (slug: string, newMin: number | null, over: Partial<MonopatinModelSummary> = {}) => ({
  ...monopatinModelSummary(doc({ slug, newBand: newMin ? { min: newMin, median: newMin, max: newMin, n: 1, sellers: 1 } : null })),
  ...over,
})

describe('slug y frescura', () => {
  it('acepta slugs de marca-modelo y nada más', () => {
    expect(MONOPATIN_MODEL_SLUG_RE.test('xiaomi-6-pro')).toBe(true)
    expect(MONOPATIN_MODEL_SLUG_RE.test('s-pro-move-2')).toBe(true)
    expect(MONOPATIN_MODEL_SLUG_RE.test('comparar')).toBe(false)
    expect(MONOPATIN_MODEL_SLUG_RE.test('xiaomi--6')).toBe(false)
    expect(MONOPATIN_MODEL_SLUG_RE.test('Xiaomi-6')).toBe(false)
  })
  it('un modelo no visto en 7 días deja de servirse', () => {
    expect(monopatinModelFreshFloor('2026-11-04')).toBe('2026-10-28')
  })
})

describe('monopatinModelSummary', () => {
  it('resume lo que necesitan la tabla del hub, el selector del comparador y los hermanos', () => {
    const s = monopatinModelSummary(doc())
    expect(s).toMatchObject({
      slug: 'xiaomi-6-pro',
      name: 'Xiaomi Electric Scooter 6 Pro',
      newMin: 31461,
      usedMin: 32500,
      sellers: 9,
      listings: 27,
      indexable: true,
    })
    expect(s.specs?.rangeKm).toBe(70)
    expect(s).not.toHaveProperty('offers')
  })
})

describe('monopatinModelSiblings', () => {
  it('los del mismo tipo con el precio más parecido, sin el propio', () => {
    const self = summary('xiaomi-6-pro', 31000)
    const all = [
      self,
      summary('a', 30000),
      summary('b', 60000),
      summary('c', 33000),
      summary('d', 20000),
      summary('e', 31500, { variant: 'infantil' }),
    ]
    expect(monopatinModelSiblings(self, all, 3).map(s => s.slug)).toEqual(['a', 'c', 'd'])
  })
})

describe('títulos y descripción', () => {
  it('el precio va en el título, y un nombre largo cae a la forma corta', () => {
    const title = monopatinModelTitle(doc())
    expect(titleFits(title)).toBe(true)
    expect(title).toContain('31.461')
    expect(title).toContain('6 Pro')
  })
  it('sin precio nuevo, el título sin cifra', () => {
    const title = monopatinModelTitle(doc({ newBand: null }))
    expect(title).toBe('Monopatín Xiaomi 6 Pro: precio en Uruguay')
    expect(titleFits(title)).toBe(true)
  })
  it('la forma corta saca la línea de la marca', () => {
    expect(monopatinModelShortName(doc())).toBe('Xiaomi 6 Pro')
    expect(monopatinModelShortName(doc({ name: 'Atom Kaizen Pro', brandLabel: 'Atom', modelLabel: 'Kaizen Pro' }))).toBe(
      'Atom Kaizen Pro'
    )
  })
  it('la descripción dice el precio, los vendedores y la ficha, y entra en 155', () => {
    const description = monopatinModelDescription(doc())
    expect(description.length).toBeLessThanOrEqual(155)
    expect(description).toContain('9 vendedores')
    expect(description).toMatch(/70\skm/)
  })
})

describe('monopatinSpecAgreement', () => {
  it('con fichas que no coinciden muestra el rango, con fichas que coinciden el valor', () => {
    const specs = doc().specs!
    expect(monopatinSpecAgreement(specs, 'rangeKm')).toEqual({ value: 70, min: 45, max: 70, n: 12, of: 20, agrees: true })
    const split = { ...specs, agree: { rangeKm: { n: 1, of: 4 } } }
    expect(monopatinSpecAgreement(split, 'rangeKm')!.agrees).toBe(false)
    expect(monopatinSpecAgreement(specs, 'motorPeakW')).toBeNull()
  })
})

describe('monopatinCompareRows', () => {
  const a = summary('a', 30000, { specs: values({ rangeKm: 45, weightKg: 18, maxLoadKg: 100 }) as never })
  const b = summary('b', 40000, { specs: values({ rangeKm: 70, weightKg: 27, maxLoadKg: 120 }) as never })
  const c = summary('c', 35000, { specs: values({ rangeKm: null, weightKg: 18, maxLoadKg: 120 }) as never })

  it('marca el mejor de cada fila según lo que conviene (más autonomía, menos peso, menor precio)', () => {
    const rows = monopatinCompareRows([a, b, c])
    const byKey = Object.fromEntries(rows.map(row => [row.key, row]))
    expect(byKey.price!.best).toEqual([0])
    expect(byKey.rangeKm!.best).toEqual([1])
    expect(byKey.weightKg!.best).toEqual([0, 2])
    expect(byKey.maxLoadKg!.best).toEqual([1, 2])
  })
  it('una fila sin dato en ningún modelo no se muestra, y con un solo dato no marca mejor', () => {
    const rows = monopatinCompareRows([a, c])
    expect(rows.find(row => row.key === 'motorW')).toBeUndefined()
    expect(rows.find(row => row.key === 'rangeKm')!.best).toEqual([])
  })
})

describe('monopatinRealRangeKm', () => {
  it('la misma regla del asesor: 65 % de lo declarado', () => {
    expect(monopatinRealRangeKm(70)).toBe(46)
    expect(monopatinRealRangeKm(null)).toBeNull()
  })
})
