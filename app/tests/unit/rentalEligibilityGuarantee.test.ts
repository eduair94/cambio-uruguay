import { describe, expect, it } from 'vitest'
import { rentalEligibility } from '../../utils/rentalEligibility'

const home = (extra: Record<string, unknown> = {}) => ({
  title: 'Apartamento',
  description: '',
  currency: 'UYU' as const,
  price: 10500,
  propertyType: 'apartamento',
  ...extra,
})

describe('explicit tenancy guarantee as own peso-rental evidence', () => {
  it.each([
    [
      '194101267',
      'Apto 1 dormitorio en calle Colmenar',
      'Apto 3 al fondo. 1 dormitorio, cocina y baño. Garantías Anda, Contaduría o Porto.',
      10500,
    ],
    [
      '194088470',
      'Apto 1 dormitorio en calle Colmenar',
      'Apto interior con patio. Garantías Anda, Contaduria o Porto.',
      10500,
    ],
    [
      '193965172',
      'APARTAMENTO EN EL PRADO',
      'Apartamento con cocina, baño y patio. GARANTIAS DE PORTO SEGUROS, FIDECIU, SURA.',
      10000,
    ],
    [
      '193023269',
      'Apto 1 o 2 dormitorios, calle Alsacia',
      'Apto interior. Patio al fondo independiente. Garantías Anda, Contaduría o Porto.',
      12500,
    ],
  ])('admits documented own guarantees: IC%s', (_id, title, description, price) => {
    expect(rentalEligibility(home({ title, description, price }))).toEqual({
      eligible: true,
      reasons: [],
    })
  })
  it.each([
    'Garantía de construcción por 10 años.',
    'Garantía de construcción. Oficina próxima a Porto Seguros.',
    'Cerca de oficina ANDA. Aseguradora Sura próxima.',
    'Calle Contaduría esquina Porto.',
    'Garantía de sus padres o de una propiedad.',
    'Garantía de cualquier aseguradora.',
    'No se acepta garantía Anda.',
    'Sin garantía Sura.',
    'Sólo CGN/Anda.',
    'Garantías disponibles: consulte condiciones.',
    'Somos corredores Porto y ofrecemos garantías Anda; gestionamos tu garantía Porto.',
    'Garantía Porto: somos corredores de seguros y gestionamos tu garantía.',
    'Tramitá con nosotros tu garantía Anda.',
  ])('does not infer tenancy from unrelated or generic guarantees: %s', description => {
    expect(rentalEligibility(home({ description })).reasons).toContain('no_rental_evidence')
  })
  it('does not establish a monthly USD price', () => {
    expect(
      rentalEligibility(
        home({ currency: 'USD', price: 250, description: 'Garantías Anda, Porto o Sura.' })
      ).reasons
    ).toContain('no_rental_evidence')
  })
  it.each([
    ['Alquiler temporario', 'Garantías Anda.', 'short_term'],
    ['Casa en venta', 'Garantías Anda.', 'no_rental_evidence'],
    ['Apartamento', 'Garantías Anda. El publicado ya fue arrendado.', 'unavailable'],
    ['Apartamento', 'Garantías Anda. Único destino permitido DEPÓSITO.', 'non_residential_use'],
    ['Apartamento', 'Garantías Anda. Precio de alquiler $12000.', 'price_conflict'],
  ])('preserves independent vetoes: %s / %s', (title, description, reason) => {
    expect(rentalEligibility(home({ title, description })).reasons).toContain(reason)
  })
})

describe('structured own guarantees and transfer prices', () => {
  it('uses the same advert guarantee field when its description is empty', () => {
    expect(
      rentalEligibility(home({ description: '', guaranteeText: 'Anda, Porto Seguros o Sura.' }))
        .eligible
    ).toBe(true)
    expect(
      rentalEligibility(home({ description: '', guaranteeText: 'No acepta Anda' })).reasons
    ).toContain('no_rental_evidence')
    expect(
      rentalEligibility(home({ currency: 'USD', price: 250, guaranteeText: 'Anda, Porto o Sura' }))
        .reasons
    ).toContain('no_rental_evidence')
  })
  it('retains an independent own guarantee clause after broker advertising', () => {
    expect(
      rentalEligibility(
        home({ description: 'Somos corredores de Porto. Garantías Anda, Contaduría o Sura.' })
      ).eligible
    ).toBe(true)
  })
  it.each([
    'Traspaso. Garantías Porto Seguro, ANDA o Contaduría.',
    'Derecho de cesión $10500. Garantías Anda.',
    'Derecho de llave. Alquiler anual $10500.',
  ])('does not treat an ambiguous transfer amount as monthly rent: %s', description => {
    expect(rentalEligibility(home({ description })).reasons).toContain('ambiguous_transfer')
  })
  it.each([
    'Traspaso. Alquiler mensual $10500. Garantías Anda.',
    'Traspaso. Alquiler $10500 por mes.',
    'No es traspaso. Garantías Anda.',
  ])('accepts explicit monthly rent or a negated transfer: %s', description => {
    expect(rentalEligibility(home({ description })).eligible).toBe(true)
  })
  it.each(['USD', 'U$S', 'US$'])(
    'preserves explicitly priced monthly USD rent in a transfer: %s',
    currency => {
      expect(
        rentalEligibility(
          home({
            currency: 'USD',
            price: 300,
            description: 'Traspaso. Alquiler mensual ' + currency + '300.',
          })
        ).eligible
      ).toBe(true)
    }
  )
  it('still rejects USD guarantees without a period and conflicting monthly amounts', () => {
    expect(
      rentalEligibility(
        home({ currency: 'USD', price: 300, description: 'Traspaso. Garantías Anda.' })
      ).reasons
    ).toContain('no_rental_evidence')
    expect(
      rentalEligibility(home({ description: 'Traspaso. Alquiler mensual $12000.' })).reasons
    ).toContain('price_conflict')
  })
})
