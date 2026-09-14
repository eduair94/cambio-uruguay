import { describe, expect, it } from 'vitest'
import { applyBranchCorrections } from '../../utils/branchCorrections'
import { projectBackendBranch } from '../../server/utils/locations'
import {
  buildBranchPages,
  telHref,
  weeklyHoursTable,
  openingHoursSpecification,
} from '../../utils/branches'

const principal = {
  origin: 'cambio_principal',
  id: '2456-1',
  name: 'Casa Central',
  address: 'Treinta Y Tres Orientales 1146 - Rivera ',
  dept: 'RIVERA',
  locality: 'Montevideo',
  phone: '2622 4521',
  hours: 'Lunes a Viernes 8:30 a 17:30 y Sábado de 08:00 a 12:00',
  lat: -30.91,
  lng: -55.54,
  mapUrl: '',
}

describe('dated branch corrections', () => {
  it('corrects the observed conflict without changing the source object', () => {
    const input = Object.freeze({ ...principal })
    const result = applyBranchCorrections(input)
    expect(result.phone).toBe('4622 4521')
    expect(result.hours).toBe('Lunes a Viernes 8:00 a 18:00')
    expect(input.phone).toBe('2622 4521')
    expect(input.hours).toBe(principal.hours)
    expect(result.fieldSources?.phone).toMatchObject({
      url: 'https://cambioprincipal.com.uy/contacto/',
      verifiedAt: '2026-09-14',
      note: 'phone-conflict',
    })
    expect(result.fieldSources?.hours?.note).toBe('hours-refresh')
  })

  it.each([
    { id: '2456-2' },
    { origin: 'otra_casa' },
    { address: 'Treinta Y Tres Orientales 1148 - Rivera' },
    { dept: 'MONTEVIDEO' },
  ])('requires the complete observed identity: %j', mismatch => {
    const input = { ...principal, ...mismatch }
    expect(applyBranchCorrections(input)).toBe(input)
  })

  it('does not mask future upstream changes or assign them an old verification date', () => {
    const result = applyBranchCorrections({
      ...principal,
      phone: '4622 1234',
      hours: 'Lunes a Viernes 9:00 a 19:00',
    })
    expect(result.phone).toBe('4622 1234')
    expect(result.hours).toBe('Lunes a Viernes 9:00 a 19:00')
    expect(result.fieldSources?.phone).toBeUndefined()
    expect(result.fieldSources?.hours).toBeUndefined()
  })

  it('handles each field independently when BCU has already refreshed the other', () => {
    const result = applyBranchCorrections({ ...principal, hours: 'Lunes a Viernes 8:00 a 18:00' })
    expect(result.phone).toBe('4622 4521')
    expect(result.hours).toBe('Lunes a Viernes 8:00 a 18:00')
    expect(result.fieldSources?.hours).toBeUndefined()
  })

  it('keeps the corrected values and their provenance through API and page projection', () => {
    const map = projectBackendBranch(principal)!
    const [page] = buildBranchPages([map])
    expect(page.phoneLabel).toBe('4622 4521')
    expect(telHref(page.phoneLabel)).toBe('tel:+59846224521')
    expect(page.fieldSources).toEqual(map.fieldSources)
    expect(weeklyHoursTable(page.hoursLabel).slice(5)).toEqual([
      { day: 'Sábado', hours: 'Sin informar' },
      { day: 'Domingo', hours: 'Sin informar' },
    ])
    expect(openingHoursSpecification(page.hoursLabel)).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
      },
    ])
  })
})
