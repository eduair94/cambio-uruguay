import { describe, expect, it } from 'vitest'

import {
  MP_FEES,
  MP_FEES_VERIFIED_AT,
  MP_FAQ,
  MP_INSTALLMENT_SURCHARGE,
  MP_POINT_DEVICES,
  MP_SOURCES,
  feeForSale,
} from '../../utils/mercadoPagoFees'

describe('comisiones de Mercado Pago', () => {
  it('tabla oficial: extremos y forma', () => {
    const pcts = MP_FEES.map(r => r.pct)
    expect(Math.min(...pcts)).toBe(1.15)
    expect(Math.max(...pcts)).toBe(11.99)
    for (const r of MP_FEES) {
      expect(['qr', 'link', 'checkout', 'suscripcion', 'point']).toContain(r.method)
      expect(['instante', '21 días']).toContain(r.release)
      expect(r.pct).toBeGreaterThan(0)
      expect(r.pct).toBeLessThan(15)
    }
    expect(MP_FEES.find(r => r.method === 'qr' && r.release === '21 días')?.pct).toBe(2.99)
    expect(MP_FEES.find(r => r.method === 'link' && r.release === 'instante')?.pct).toBe(5.99)
    expect(MP_FEES.filter(r => r.method === 'point').length).toBeGreaterThanOrEqual(9)
    expect(MP_INSTALLMENT_SURCHARGE.qr).toBe(2.99)
    expect(MP_INSTALLMENT_SURCHARGE.link).toBe(2.49)
    expect(MP_FEES_VERIFIED_AT).toBe('2026-09-15')
  })
  it('feeForSale reparte comisión, IVA y neto', () => {
    expect(feeForSale(1000, 5.99)).toEqual({ fee: 59.9, iva: 13.18, net: 926.92 })
    expect(feeForSale(1000, 1.15)).toEqual({ fee: 11.5, iva: 2.53, net: 985.97 })
    expect(feeForSale(0, 5.99)).toEqual({ fee: 0, iva: 0, net: 0 })
  })
  it('feeForSale con basura → null', () => {
    expect(feeForSale(Number.NaN, 5.99)).toBeNull()
    expect(feeForSale(-1, 5.99)).toBeNull()
    expect(feeForSale(1000, Number.NaN)).toBeNull()
  })
  it('catálogo', () => {
    expect(MP_POINT_DEVICES.length).toBeGreaterThanOrEqual(1)
    expect(MP_FAQ.length).toBeGreaterThanOrEqual(6)
    expect(MP_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of MP_SOURCES)
      expect(s.url).toMatch(
        /^https:\/\/(www\.)?(mercadopago\.com\.uy|vendedores\.mercadolibre\.com\.uy)\//
      )
  })
})
