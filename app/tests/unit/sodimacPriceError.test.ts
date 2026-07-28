import { describe, expect, it } from 'vitest'
import {
  buildSodimacComplaint,
  SODIMAC_ACTIONS,
  SODIMAC_EVIDENCE,
  SODIMAC_FAQS,
  SODIMAC_SOURCES,
  type SodimacComplaintInput,
} from '../../utils/sodimacPriceError'

const baseInput: SodimacComplaintInput = {
  action: 'cumplimiento',
  orderNumber: 'UY-123',
  invoiceNumber: 'A-456',
  purchaseDate: '25/07/2026',
  cancellationDate: '27/07/2026',
  product: 'Heladera modelo X',
  quantity: '1',
  advertisedPrice: '$ 20.000',
  amountPaid: '$ 20.000',
  usualPrice: '$ 27.000 en comercios comparables',
  paymentMethod: 'Tarjeta de crédito',
  confirmationStatus: 'confirmado',
  priceAssessment: 'plausible',
  cancellationReason: '“inconsistencia técnica e involuntaria”',
  extraFacts: 'La web informó stock y fecha de entrega.',
}

describe('Sodimac price-error complaint builder', () => {
  it('uses the buyer facts and asks for performance without guaranteeing it', () => {
    const text = buildSodimacComplaint(baseInput)

    expect(text).toContain('UY-123')
    expect(text).toContain('A-456')
    expect(text).toContain('Heladera modelo X')
    expect(text).toContain('cumplimiento de la compra')
    expect(text).toContain('siempre que ello sea posible')
    expect(text).toContain('error era fácilmente advertible')
  })

  it('distinguishes a reclamo from a sanction-oriented denuncia', () => {
    const text = buildSodimacComplaint({ ...baseInput, action: 'denuncia' })

    expect(text).toContain('Unidad Defensa del Consumidor')
    expect(text).toContain('eventual sanción')
    expect(text).toContain('no una compensación individual')
    expect(text).not.toContain('Solicito el cumplimiento de la compra')
  })

  it('keeps the denuncia subject neutral when there was only an automatic order', () => {
    const text = buildSodimacComplaint({
      ...baseInput,
      action: 'denuncia',
      confirmationStatus: 'solo-orden',
    })

    expect(text).toContain('cancelación de compra online atribuida a un error de precio')
    expect(text).not.toContain('luego de su confirmación')
  })

  it('does not hide a price assessment that weakens the claim', () => {
    const text = buildSodimacComplaint({
      ...baseInput,
      priceAssessment: 'evidente',
      confirmationStatus: 'solo-orden',
    })

    expect(text).toContain('diferencia de precio era muy significativa')
    expect(text).toContain('no puedo afirmar')
    expect(text).toContain('principio de buena fe')
  })

  it('uses explicit placeholders instead of inventing an unselected objective or confirmation', () => {
    const text = buildSodimacComplaint({
      ...baseInput,
      action: '',
      confirmationStatus: '',
      priceAssessment: '',
      cancellationReason: '',
    })

    expect(text).toContain('[Elegí si querés pedir cumplimiento')
    expect(text).toContain('[Indicá si recibiste una confirmación')
    expect(text).toContain('[Indicá si el precio parecía plausible')
    expect(text).toContain('[texto exacto o resumen del correo]')
  })

  it('does not claim a fixed attachment list that the buyer may not have', () => {
    const text = buildSodimacComplaint(baseInput)

    expect(text).toContain('documentación que tengo disponible')
    expect(text).not.toContain('Adjunto publicación, orden, confirmación')
  })

  it('keeps a complete evidence checklist and action set', () => {
    expect(SODIMAC_ACTIONS).toHaveLength(3)
    expect(SODIMAC_EVIDENCE.length).toBeGreaterThanOrEqual(6)
    expect(SODIMAC_FAQS.length).toBeGreaterThanOrEqual(5)
  })

  it('labels official, company and community sources instead of mixing their authority', () => {
    expect(SODIMAC_SOURCES.some(source => source.kind === 'oficial')).toBe(true)
    expect(SODIMAC_SOURCES.some(source => source.kind === 'sodimac')).toBe(true)
    expect(SODIMAC_SOURCES.some(source => source.kind === 'comunidad')).toBe(true)

    for (const source of SODIMAC_SOURCES.filter(item => item.kind === 'oficial')) {
      expect(source.url).toMatch(/^https:\/\/(www\.)?(gub\.uy|impo\.com\.uy)/)
    }
  })
})
