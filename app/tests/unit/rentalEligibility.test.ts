import { describe, expect, it } from 'vitest'
import { rentalEligibility, rentalPeriodEvidence } from '../../utils/rentalEligibility'

const home = {
  title: 'Casa en alquiler',
  description: 'SE ALQUILA! Monoambiente para vivienda permanente.',
  currency: 'UYU' as const,
  price: 6800,
  propertyType: 'casa',
}

describe('economical rental own-advert shortlist policy', () => {
  it('admits the measured Carmelo low rent without borrowing another advert description', () => {
    expect(rentalEligibility(home)).toEqual({ eligible: true, reasons: [] })
    expect(rentalEligibility({ ...home, title: 'Casa', description: '' }).eligible).toBe(false)
  })
  it.each([
    ['Valor por fin de semana U$S280', 'short_term'],
    ['Precio diario USD320. ALQUILER MÍNIMO 10 DÍAS.', 'short_term'],
    ['El publicado ya fue arrendado.', 'unavailable'],
    ['Único destino permitido DEPÓSITO.', 'non_residential_use'],
    ['Precio alquiler $9500.', 'price_conflict'],
    ['Apartamento en remate.', 'auction'],
  ])('withholds own conflicting evidence: %s', (description, reason) => {
    expect(rentalEligibility({ ...home, description }).reasons).toContain(reason)
  })
  it.each([
    'Transporte diario. Jardín de invierno.',
    'Alquiler anual. No se alquila por día.',
    'Sin remate. Alquiler mensual.',
    'No está alquilado. Precio de alquiler $6800.',
  ])('preserves unrelated words and explicit negatives: %s', description => {
    expect(rentalEligibility({ ...home, description }).eligible).toBe(true)
  })
  it('never assumes the period of a USD amount', () => {
    expect(
      rentalEligibility({
        ...home,
        currency: 'USD',
        price: 90,
        description: 'Apartamento en alquiler',
      }).eligible
    ).toBe(false)
    expect(rentalPeriodEvidence('Apartamento', 'Precio diario USD320').shortTerm).toBe(true)
  })
})
