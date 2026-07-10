import { describe, expect, it } from 'vitest'
import type { LocalDataMap } from '../../utils/departments'
import {
  departmentFromSlug,
  housesInDepartment,
  listDepartments,
  slugifyDepartment,
} from '../../utils/departments'

// Minimal localData fixture mirroring the GET /localData shape: a map of
// `origin` -> { name, website, maps, bcu, departments[] }. Department names are
// UPPERCASE as the live API returns them.
const localData: LocalDataMap = {
  itau: {
    name: 'Itaú',
    website: 'https://itau.com.uy',
    maps: 'https://maps.example/itau',
    bcu: '',
    departments: ['MONTEVIDEO', 'MALDONADO', 'CERRO LARGO'],
  },
  brou: {
    name: 'BROU',
    website: 'https://brou.com.uy',
    maps: 'https://maps.example/brou',
    bcu: '',
    departments: ['MONTEVIDEO', 'SALTO', 'PAYSANDÚ'],
  },
  // No display name -> falls back to a humanised origin id.
  'cambio-minas': {
    name: '',
    website: '',
    maps: '',
    bcu: '',
    departments: ['LAVALLEJA'],
  },
}

describe('slugifyDepartment', () => {
  it('lowercases a single-word name', () => {
    expect(slugifyDepartment('MONTEVIDEO')).toBe('montevideo')
  })

  it('replaces spaces with hyphens', () => {
    expect(slugifyDepartment('CERRO LARGO')).toBe('cerro-largo')
  })

  it('strips accents', () => {
    expect(slugifyDepartment('PAYSANDÚ')).toBe('paysandu')
    expect(slugifyDepartment('Río Negro')).toBe('rio-negro')
    expect(slugifyDepartment('TACUAREMBÓ')).toBe('tacuarembo')
  })

  it('collapses repeated/edge separators', () => {
    expect(slugifyDepartment('  Cerro   Largo  ')).toBe('cerro-largo')
  })

  it('returns an empty string for blank input', () => {
    expect(slugifyDepartment('   ')).toBe('')
  })
})

describe('departmentFromSlug', () => {
  const names = ['MONTEVIDEO', 'MALDONADO', 'CERRO LARGO', 'PAYSANDÚ']

  it('round-trips a slug back to its canonical name', () => {
    for (const name of names) {
      expect(departmentFromSlug(slugifyDepartment(name), names)).toBe(name)
    }
  })

  it('resolves multi-word and accented slugs', () => {
    expect(departmentFromSlug('cerro-largo', names)).toBe('CERRO LARGO')
    expect(departmentFromSlug('paysandu', names)).toBe('PAYSANDÚ')
  })

  it('returns null for an unknown slug', () => {
    expect(departmentFromSlug('zzz-invalid', names)).toBeNull()
  })

  it('returns null for an empty slug or empty name list', () => {
    expect(departmentFromSlug('', names)).toBeNull()
    expect(departmentFromSlug('montevideo', [])).toBeNull()
  })
})

describe('listDepartments', () => {
  it('returns the de-duplicated union of all departments, sorted, with slugs', () => {
    const result = listDepartments(localData)
    expect(result.map(d => d.name)).toEqual([
      'CERRO LARGO',
      'LAVALLEJA',
      'MALDONADO',
      'MONTEVIDEO',
      'PAYSANDÚ',
      'SALTO',
    ])
    expect(result.find(d => d.name === 'CERRO LARGO')?.slug).toBe('cerro-largo')
    expect(result.find(d => d.name === 'PAYSANDÚ')?.slug).toBe('paysandu')
  })

  it('returns an empty list for an empty map', () => {
    expect(listDepartments({})).toEqual([])
  })
})

describe('housesInDepartment', () => {
  it('lists houses with a branch in the department, sorted by name', () => {
    const houses = housesInDepartment(localData, 'MONTEVIDEO')
    expect(houses.map(h => h.origin)).toEqual(['brou', 'itau'])
  })

  it('matches department names case-insensitively', () => {
    expect(housesInDepartment(localData, 'montevideo').map(h => h.origin)).toEqual(['brou', 'itau'])
  })

  it('filters to a single house when only one operates there', () => {
    const houses = housesInDepartment(localData, 'SALTO')
    expect(houses).toHaveLength(1)
    expect(houses[0]?.origin).toBe('brou')
  })

  it('falls back to a humanised origin when the house has no name', () => {
    const houses = housesInDepartment(localData, 'LAVALLEJA')
    expect(houses).toHaveLength(1)
    expect(houses[0]?.name).toBe('Cambio Minas')
  })

  it('returns an empty list for an unknown department', () => {
    expect(housesInDepartment(localData, 'NONEXISTENT')).toEqual([])
  })

  it('returns an empty list for a blank department name', () => {
    expect(housesInDepartment(localData, '   ')).toEqual([])
  })
})

// The live /localData does not agree with itself: as of 2026-07-10 four
// departments are spelled BOTH ways across houses — PAYSANDU/PAYSANDÚ,
// RIO NEGRO/RÍO NEGRO, SAN JOSE/SAN JOSÉ, TACUAREMBO/TACUAREMBÓ. Matching on
// the raw uppercase string therefore silently dropped every house that used the
// other spelling (San José showed 1 of its 2 casas), and `listDepartments`
// emitted two entries that slugify to the same URL.
const splitSpelling: LocalDataMap = {
  brou: {
    name: 'BROU',
    website: '',
    maps: '',
    bcu: '',
    departments: ['PAYSANDÚ', 'RÍO NEGRO', 'SAN JOSÉ'],
  },
  gales: {
    name: 'Gales',
    website: '',
    maps: '',
    bcu: '',
    departments: ['PAYSANDU', 'RIO NEGRO', 'SAN JOSE'],
  },
  itau: { name: 'Itaú', website: '', maps: '', bcu: '', departments: ['MONTEVIDEO'] },
}

describe('departments spelled inconsistently across houses', () => {
  it.each([
    ['PAYSANDÚ', 'PAYSANDU'],
    ['RÍO NEGRO', 'RIO NEGRO'],
    ['SAN JOSÉ', 'SAN JOSE'],
  ])('finds houses under both %s and %s', (accented, plain) => {
    for (const spelling of [accented, plain]) {
      const houses = housesInDepartment(splitSpelling, spelling)
      expect(houses.map(h => h.origin).sort()).toEqual(['brou', 'gales'])
    }
  })

  it('resolves either spelling from the shared slug', () => {
    const names = ['PAYSANDU', 'PAYSANDÚ']
    const resolved = departmentFromSlug('paysandu', names)
    expect(resolved).not.toBeNull()
    expect(
      housesInDepartment(splitSpelling, resolved!)
        .map(h => h.origin)
        .sort()
    ).toEqual(['brou', 'gales'])
  })

  it('lists each department once, so one slug maps to one URL', () => {
    const entries = listDepartments(splitSpelling)
    const slugs = entries.map(e => e.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs.sort()).toEqual(['montevideo', 'paysandu', 'rio-negro', 'san-jose'])
  })

  it('prefers the accented spelling as the display name', () => {
    const entries = listDepartments(splitSpelling)
    const names = entries.map(e => e.name)
    expect(names).toContain('PAYSANDÚ')
    expect(names).toContain('RÍO NEGRO')
    expect(names).not.toContain('PAYSANDU')
  })
})
