import { describe, expect, it } from 'vitest'
import {
  addressForSlug,
  branchDescription,
  branchSlug,
  branchTitle,
  buildBranchPages,
  canonicalCasaName,
  departmentCentres,
  deptKey,
  deptLabel,
  displayableHours,
  distanceKm,
  groupByDepartment,
  hasTrustedCoordinate,
  humaniseOrigin,
  insideUruguay,
  nearbyCompetitors,
  openingHoursSpecification,
  parseOpeningHours,
  siblingBranches,
  telHref,
  weeklyHoursTable,
  type Branch,
} from '../../utils/branches'

/** A branch fixture with feed-realistic defaults. */
function branch(overrides: Partial<Branch> = {}): Branch {
  return {
    origin: 'gales',
    id: '2001-1',
    name: 'Casa Central',
    dept: 'MONTEVIDEO',
    locality: 'Montevideo',
    address: '21 de Setiembre 2748',
    phone: '2712 3456',
    hours: 'Lunes a Viernes de 9 a 18 hs.',
    lat: -34.91,
    lng: -56.15,
    mapUrl: 'https://maps.example/gales',
    ...overrides,
  }
}

describe('department labels', () => {
  it('normalises the feed’s inconsistent spelling to one key', () => {
    expect(deptKey('PAYSANDÚ')).toBe(deptKey('PAYSANDU'))
    expect(deptKey('RÍO NEGRO')).toBe(deptKey('RIO NEGRO'))
    expect(deptKey('San José')).toBe('san jose')
  })

  it('restores the canonical accent for display', () => {
    expect(deptLabel('PAYSANDU')).toBe('Paysandú')
    expect(deptLabel('RIO NEGRO')).toBe('Río Negro')
    expect(deptLabel('TREINTA Y TRES')).toBe('Treinta y Tres')
    expect(deptLabel('MONTEVIDEO')).toBe('Montevideo')
  })

  it('falls back to the raw name for a department it does not know', () => {
    expect(deptLabel('OTRO LUGAR')).toBe('OTRO LUGAR')
  })
})

describe('slugs', () => {
  it('builds a keyword-shaped slug from casa plus street', () => {
    expect(branchSlug('Cambio Gales', '21 de Setiembre 2748', 'MONTEVIDEO')).toBe(
      'cambio-gales-21-de-setiembre-2748'
    )
  })

  it('caps the slug length so an address paragraph cannot become the URL', () => {
    const slug = branchSlug(
      'Cambio Aeromar',
      'Calle Cecilia Burgueño entre Sarandí y 18 de Julio, LOCAL 006 planta baja',
      'MALDONADO'
    )
    expect(slug.split('-').length).toBeLessThanOrEqual(12)
  })

  it('falls back to the department when the address is empty', () => {
    expect(branchSlug('Cambio X', '   ', 'ROCHA')).toBe('cambio-x-rocha')
  })

  it('drops a trailing town suffix but keeps a trailing number', () => {
    expect(addressForSlug('Treinta Y Tres Orientales 1146 - Rivera ')).toBe(
      'Treinta Y Tres Orientales 1146'
    )
    expect(addressForSlug('Ruta 39 y Luis Alberto de Herrera - Outlet 2')).toContain('Outlet 2')
  })

  it('gives colliding addresses distinct, deterministic slugs', () => {
    const pages = buildBranchPages([
      branch({ id: '1', address: 'Sarandí 100' }),
      branch({ id: '2', address: 'Sarandí 100' }),
      branch({ id: '3', address: 'Sarandí 100' }),
    ])
    expect(pages.map(p => p.slug)).toEqual([
      'gales-sarandi-100',
      'gales-sarandi-100-2',
      'gales-sarandi-100-3',
    ])
  })

  it('is stable across feed reorderings', () => {
    const rows = [
      branch({ id: '2', address: 'Sarandí 100' }),
      branch({ id: '1', address: 'Sarandí 100' }),
    ]
    const forward = buildBranchPages(rows).map(p => `${p.id}:${p.slug}`)
    const reversed = buildBranchPages([...rows].reverse()).map(p => `${p.id}:${p.slug}`)
    expect(forward).toEqual(reversed)
  })

  it('humanises an origin when localData has no display name', () => {
    expect(humaniseOrigin('cambio_la_favorita')).toBe('Cambio La Favorita')
  })

  // The feed returns "Itau" and "Cambio Fenix"; the brands carry accents, and
  // this name becomes the H1 and the <title> of three page families.
  it('restores the accent on the brands the feed misspells', () => {
    expect(canonicalCasaName('itau', 'Itau')).toBe('Itaú')
    expect(canonicalCasaName('cambio_fenix', 'Cambio Fenix')).toBe('Cambio Fénix')
  })

  it('trusts the feed for every other casa', () => {
    expect(canonicalCasaName('gales', 'Cambio Gales')).toBe('Cambio Gales')
    expect(canonicalCasaName('brou', '  BROU  ')).toBe('BROU')
  })

  it('falls back to the humanised origin when the feed has no name', () => {
    expect(canonicalCasaName('cambio_pando', '')).toBe('Cambio Pando')
    expect(canonicalCasaName('cambio_pando', null)).toBe('Cambio Pando')
  })

  it('prefers the localData name over the humanised origin', () => {
    const [page] = buildBranchPages([branch()], { gales: 'Cambio Gales' })
    expect(page?.casaName).toBe('Cambio Gales')
    expect(page?.slug.startsWith('cambio-gales-')).toBe(true)
  })
})

describe('coordinate trust', () => {
  it('rejects coordinates outside Uruguay', () => {
    expect(insideUruguay(-34.9, -56.16)).toBe(true)
    expect(insideUruguay(0, 0)).toBe(false)
    expect(insideUruguay(40.7, -74)).toBe(false)
    expect(insideUruguay(Number.NaN, -56)).toBe(false)
  })

  it('measures distance in kilometres', () => {
    // Montevideo -> Rivera is roughly 500 km.
    const km = distanceKm(-34.9, -56.16, -30.9, -55.55)
    expect(km).toBeGreaterThan(400)
    expect(km).toBeLessThan(520)
  })

  // The real failure this guards: a handful of Rocha/Río Negro rows carry a
  // Rivera lat/lng. The median of the department is unmoved by a few outliers,
  // so the outlier is the row that ends up flagged — not the majority.
  it('distrusts a branch stamped with another department’s coordinate', () => {
    const rocha = [
      branch({ origin: 'a', id: '1', dept: 'ROCHA', lat: -34.48, lng: -54.33 }),
      branch({ origin: 'b', id: '2', dept: 'ROCHA', lat: -34.47, lng: -54.34 }),
      branch({ origin: 'c', id: '3', dept: 'ROCHA', lat: -34.49, lng: -54.31 }),
      branch({ origin: 'd', id: '4', dept: 'ROCHA', lat: -30.89, lng: -55.55 }),
    ]
    const centres = departmentCentres(rocha)
    expect(hasTrustedCoordinate(rocha[0] as Branch, centres)).toBe(true)
    expect(hasTrustedCoordinate(rocha[3] as Branch, centres)).toBe(false)
  })

  it('trusts a lone branch in a department it cannot triangulate', () => {
    const solo = [branch({ dept: 'FLORES', lat: -33.54, lng: -56.89 })]
    expect(hasTrustedCoordinate(solo[0] as Branch, departmentCentres(solo))).toBe(true)
  })
})

describe('opening hours', () => {
  it('parses the common Monday-to-Friday shape', () => {
    expect(parseOpeningHours('Lunes a Viernes de 13 a 18 hs.')).toEqual([
      { days: [0, 1, 2, 3, 4], opens: '13:00', closes: '18:00' },
    ])
  })

  it('parses the abbreviated form with a Saturday tail', () => {
    expect(parseOpeningHours('L a V 9 a 19:30. Sáb 9 a 13')).toEqual([
      { days: [0, 1, 2, 3, 4], opens: '09:00', closes: '19:30' },
      { days: [5], opens: '09:00', closes: '13:00' },
    ])
  })

  it('parses a dotted time and a second window for the same day', () => {
    expect(
      parseOpeningHours('Lunes a Viernes de 8 a 19 hs. Sábados 8 a 12.30 hs y 15 a 19 hs')
    ).toEqual([
      { days: [0, 1, 2, 3, 4], opens: '08:00', closes: '19:00' },
      { days: [5], opens: '08:00', closes: '12:30' },
      { days: [5], opens: '15:00', closes: '19:00' },
    ])
  })

  it('parses a hyphenated range (no "a" between the times)', () => {
    expect(parseOpeningHours('Lunes a Viernes de 09:00-19:00')).toEqual([
      { days: [0, 1, 2, 3, 4], opens: '09:00', closes: '19:00' },
    ])
  })

  it('parses the non-contiguous "lunes, miércoles y viernes" shape', () => {
    expect(parseOpeningHours('Lunes, Miércoles y Viernes de 13 a 18 hs.')).toEqual([
      { days: [0, 2, 4], opens: '13:00', closes: '18:00' },
    ])
  })

  it('parses "todos los días" and a midnight close', () => {
    expect(parseOpeningHours('Todos los días de 10 a 24 h')).toEqual([
      { days: [0, 1, 2, 3, 4, 5, 6], opens: '10:00', closes: '23:59' },
    ])
  })

  it('parses a week that wraps through Sunday', () => {
    expect(parseOpeningHours('Domingo a Jueves de 10 a 21 hs')).toEqual([
      { days: [6, 0, 1, 2, 3], opens: '10:00', closes: '21:00' },
    ])
  })

  it('emits a duplicated clause only once', () => {
    expect(
      parseOpeningHours('Lunes a Viernes de 13 a 18 hs./ Lunes a Viernes de 13 a 18 hs.')
    ).toHaveLength(1)
  })

  // Refusing to guess is the point: a wrong openingHoursSpecification is worse
  // than none, so anything that is not clearly a schedule parses to nothing.
  it('refuses to parse junk the feed stores in the hours field', () => {
    for (const junk of [
      'Sin informar',
      '-',
      'ABITAB SA',
      'Marcelo Hermida',
      'De acuerdo a frecuencias de Buque Colonia Express',
      'apertura desde el 17 de octubre de 2022',
    ]) {
      expect(parseOpeningHours(junk)).toEqual([])
    }
  })

  it('hides junk from the hours field but keeps a real schedule', () => {
    expect(displayableHours('ABITAB SA')).toBe('')
    expect(displayableHours('  -  ')).toBe('')
    expect(displayableHours('Sin informar')).toBe('')
    expect(displayableHours('Lunes a Viernes de 9 a 18')).toBe('Lunes a Viernes de 9 a 18')
  })

  it('builds a schema.org specification only from parsed windows', () => {
    const spec = openingHoursSpecification('L a V 9 a 19. Sáb 9 a 13')
    expect(spec).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '19:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '09:00',
        closes: '13:00',
      },
    ])
    expect(openingHoursSpecification('ABITAB SA')).toEqual([])
  })

  it('renders a weekly table with explicit closed days', () => {
    const table = weeklyHoursTable('L a V 9 a 19. Sáb 9 a 13')
    expect(table).toHaveLength(7)
    expect(table[0]).toEqual({ day: 'Lunes', hours: '09:00 a 19:00' })
    expect(table[6]).toEqual({ day: 'Domingo', hours: 'Cerrado' })
  })

  it('renders no table when the schedule could not be parsed', () => {
    expect(weeklyHoursTable('De acuerdo a frecuencias del buque')).toEqual([])
  })
})

describe('phone links', () => {
  it('builds a +598 tel: href from a formatted number', () => {
    expect(telHref('2712 3456')).toBe('tel:+59827123456')
    expect(telHref('0474 2707')).toBe('tel:+5984742707')
  })

  it('returns null for a number too short to dial', () => {
    expect(telHref('123')).toBeNull()
    expect(telHref('')).toBeNull()
  })
})

describe('page copy', () => {
  it('gives every branch of a chain a different title', () => {
    const pages = buildBranchPages(
      [
        branch({ origin: 'brou', id: '1', address: 'Av. Italia 4200', dept: 'MONTEVIDEO' }),
        branch({ origin: 'brou', id: '2', address: 'Sarandí 500', dept: 'COLONIA' }),
      ],
      { brou: 'BROU' }
    )
    const titles = pages.map(branchTitle)
    expect(new Set(titles).size).toBe(2)
    expect(titles[0]).toContain('Av. Italia 4200')
  })

  it('builds a description from the row’s own address, hours and phone', () => {
    const [page] = buildBranchPages([branch()], { gales: 'Cambio Gales' })
    const description = branchDescription(page!)
    expect(description).toContain('21 de Setiembre 2748')
    expect(description).toContain('Montevideo')
    expect(description).toContain('2712 3456')
    expect(description.length).toBeLessThanOrEqual(300)
  })
})

describe('relationships', () => {
  const feed = [
    branch({ origin: 'gales', id: '1', address: 'Sarandí 100', dept: 'MONTEVIDEO' }),
    branch({ origin: 'gales', id: '2', address: 'Rivera 2000', dept: 'MONTEVIDEO' }),
    branch({ origin: 'brou', id: '3', address: 'Av. Italia 4200', dept: 'MONTEVIDEO' }),
    branch({ origin: 'brou', id: '4', address: 'Colonia 900', dept: 'MONTEVIDEO' }),
    branch({ origin: 'itau', id: '5', address: '18 de Julio 1234', dept: 'MONTEVIDEO' }),
    branch({ origin: 'gales', id: '6', address: 'Gorlero 800', dept: 'MALDONADO' }),
  ]
  const pages = buildBranchPages(feed)

  it('lists only other branches of the same casa as siblings', () => {
    const target = pages.find(p => p.id === '1')!
    const found = siblingBranches(target, pages)
    expect(found.every(p => p.origin === 'gales')).toBe(true)
    expect(found.map(p => p.id)).not.toContain('1')
    expect(found.map(p => p.id).sort()).toEqual(['2', '6'])
  })

  it('shows one branch per competing casa in the same department', () => {
    const target = pages.find(p => p.id === '1')!
    const found = nearbyCompetitors(target, pages)
    expect(found.map(p => p.origin).sort()).toEqual(['brou', 'itau'])
  })

  it('groups by department, biggest first', () => {
    const groups = groupByDepartment(pages)
    expect(groups[0]?.label).toBe('Montevideo')
    expect(groups[0]?.branches).toHaveLength(5)
    expect(groups[1]?.label).toBe('Maldonado')
    expect(groups.map(g => g.slug)).toEqual(['montevideo', 'maldonado'])
  })
})

describe('the directory as a whole', () => {
  it('assigns every branch a unique slug', () => {
    const feed = Array.from({ length: 40 }, (_, i) =>
      branch({ id: String(i), address: `Calle ${i % 7} 100`, origin: i % 2 ? 'brou' : 'gales' })
    )
    const pages = buildBranchPages(feed)
    expect(new Set(pages.map(p => p.slug)).size).toBe(pages.length)
  })

  it('never emits an empty slug', () => {
    const pages = buildBranchPages([branch({ address: '', dept: 'SALTO', origin: 'x' })])
    expect(pages[0]?.slug).toBeTruthy()
  })
})
