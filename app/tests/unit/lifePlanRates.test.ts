import { describe, expect, it } from 'vitest'
import { projectLifePlanRates } from '../../server/utils/lifePlanRates'

// Respuestas reales, medidas en produccion el 2026-09-08.
const FINANCING = {
  figures: { tpm: 5.75, inflacion: 4.27, plazoFijoBrou: 5.5, fondoPesos: 7.37, topeUsura: 133.49 },
  asOf: '2026-08-31T10:20:02.979Z',
  updated: ['tpm', 'inflacion', 'plazoFijoBrou', 'fondoPesos', 'topeUsura'],
}

const DEBT = {
  usuryCaps: [
    {
      segmento: 'Consumo con autorización de descuento, < 10.000 UI',
      tasaMedia: 21.16,
      topeTasa: 32.798,
    },
    {
      segmento: 'Consumo sin autorización de descuento, < 10.000 UI',
      tasaMedia: 80.72,
      topeTasa: 122.23,
    },
  ],
  asOf: '2026-09-01T10:13:02.894Z',
}

describe('projectLifePlanRates', () => {
  it('saca las tasas de referencia y las dos medias de deuda', () => {
    const out = projectLifePlanRates(FINANCING, DEBT)
    expect(out.plazoFijoBrou).toBe(5.5)
    expect(out.fondoPesos).toBe(7.37)
    expect(out.inflacion).toBe(4.27)
    expect(out.deudaSinDescuento).toBe(80.72)
    expect(out.deudaConDescuento).toBe(21.16)
    expect(out.asOfRates).toBe('2026-08-31T10:20:02.979Z')
    expect(out.asOfDebt).toBe('2026-09-01T10:13:02.894Z')
  })

  it('distingue CON de SIN autorizacion de descuento, que es la diferencia que ordena', () => {
    // Confundirlas invertiria el orden de la cascada: 21,16 % contra 80,72 %.
    const out = projectLifePlanRates(FINANCING, DEBT)
    expect(out.deudaSinDescuento).toBeGreaterThan(out.deudaConDescuento as number)
  })

  it('toma la MEDIA y no el tope', () => {
    const out = projectLifePlanRates(FINANCING, DEBT)
    expect(out.deudaSinDescuento).not.toBe(122.23)
    expect(out.deudaConDescuento).not.toBe(32.798)
  })

  it('un endpoint caido deja sus campos en null, no en cero', () => {
    const out = projectLifePlanRates(null, null)
    expect(out.plazoFijoBrou).toBeNull()
    expect(out.fondoPesos).toBeNull()
    expect(out.inflacion).toBeNull()
    expect(out.deudaSinDescuento).toBeNull()
    expect(out.asOfRates).toBeNull()
    expect(out.asOfDebt).toBeNull()
  })

  it('cada endpoint falla por su cuenta', () => {
    const soloTasas = projectLifePlanRates(FINANCING, null)
    expect(soloTasas.plazoFijoBrou).toBe(5.5)
    expect(soloTasas.deudaSinDescuento).toBeNull()

    const soloDeuda = projectLifePlanRates(null, DEBT)
    expect(soloDeuda.deudaSinDescuento).toBe(80.72)
    expect(soloDeuda.plazoFijoBrou).toBeNull()
  })

  it('un segmento que no reconoce no contamina las otras tasas', () => {
    const out = projectLifePlanRates(FINANCING, {
      usuryCaps: [{ segmento: 'Otra cosa', tasaMedia: 9 }],
    })
    expect(out.deudaSinDescuento).toBeNull()
    expect(out.deudaConDescuento).toBeNull()
    expect(out.plazoFijoBrou).toBe(5.5)
  })

  it('una tasa que no es numero o es cero no pasa como tasa', () => {
    const out = projectLifePlanRates(
      { figures: { plazoFijoBrou: 0, fondoPesos: 'siete', inflacion: null }, asOf: 'x' },
      null
    )
    expect(out.plazoFijoBrou).toBeNull()
    expect(out.fondoPesos).toBeNull()
    expect(out.inflacion).toBeNull()
  })
})
