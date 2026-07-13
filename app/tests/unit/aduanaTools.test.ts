import { describe, expect, it } from 'vitest'
import { buildClaim, franchiseStatus, verifyCharges } from '../../utils/aduanaTools'

const facts = [
  { id: 'franquicia.tope_anual_usd', label: 'Tope anual', value: 800, unit: 'USD', sourceId: 'decreto-50-026', verifiedAt: '2026-07-11', origin: 'baseline' },
  { id: 'franquicia.max_envios', label: 'Envíos', value: 3, sourceId: 'decreto-50-026', verifiedAt: '2026-07-11', origin: 'baseline' },
  { id: 'prestacion_unica.minimo_usd', label: 'Mínimo', value: 20, unit: 'USD', sourceId: 'decreto-50-026', verifiedAt: '2026-07-11', origin: 'baseline' },
] as const

describe('verifyCharges', () => {
  it('separates what the norm backs from what the courier invented', () => {
    const out = verifyCharges({
      charges: [
        { id: 'iva', amountUsd: 44 },
        { id: 'gestion_courier', amountUsd: 25 },
        { id: 'deposito', amountUsd: 15 },
      ],
      facts: [...facts],
    })

    expect(out.find(c => c.id === 'iva')!.backing).toBe('norma')
    // The courier may charge a fee — but it is a price in a contract, not a tax. The page must
    // not let people believe "la aduana me cobró 25 dólares" when the courier did.
    expect(out.find(c => c.id === 'gestion_courier')!.backing).toBe('contrato')
    expect(out.find(c => c.id === 'deposito')!.backing).toBe('contrato')
  })

  it('flags a charge with no basis at all', () => {
    const out = verifyCharges({ charges: [{ id: 'otro', amountUsd: 30 }], facts: [...facts] })
    expect(out[0].backing).toBe('sin-respaldo')
    expect(out[0].explain).toBeTruthy()
  })
})

describe('franchiseStatus', () => {
  it('counts the year against the tope and the shipment limit', () => {
    const out = franchiseStatus({ purchases: [{ valueUsd: 300 }, { valueUsd: 250 }], facts: [...facts] })
    expect(out.usedUsd).toBe(550)
    expect(out.remainingUsd).toBe(250)
    expect(out.shipmentsUsed).toBe(2)
    expect(out.shipmentsLeft).toBe(1)
    expect(out.exhausted).toBe(false)
  })

  it('is exhausted after three shipments even with money left', () => {
    const out = franchiseStatus({
      purchases: [{ valueUsd: 10 }, { valueUsd: 10 }, { valueUsd: 10 }],
      facts: [...facts],
    })
    expect(out.remainingUsd).toBe(770)
    expect(out.shipmentsLeft).toBe(0)
    expect(out.exhausted).toBe(true) // three shipments is three shipments, cheap or not
    expect(out.nextPurchaseWarning).toBeTruthy()
  })

  it('warns that the two regimes do not mix', () => {
    // 700 used, 100 left, buying 500: it is NOT "IVA on 100 + 60% on 400" — the whole 500 goes to
    // the prestación única. The costliest misunderstanding of the regime.
    // NOTE: do NOT cite "Decreto 50/026 art. 15" for this — art. 15 is the *incumplimiento* rule
    // (art. 632). No article states the no-split rule; it follows from the regime's design
    // (art. 3: a franchise "de hasta USD 800", no partial-application mechanism anywhere; art. 2:
    // the 60% applies to the whole invoice value). Research doc §7.8. The warning copy must not
    // attribute it to an article.
    const out = franchiseStatus({ purchases: [{ valueUsd: 700 }], facts: [...facts] })
    expect(out.remainingUsd).toBe(100)
    expect(out.nextPurchaseWarning).toMatch(/entero|no se parte|prestación única/i)
  })
})

describe('buildClaim', () => {
  it('fills the template and leaves no placeholder behind', () => {
    const text = buildClaim({
      problem: { id: 'retenido', title: 'Paquete retenido', claimTemplate: 'Guía {{tracking}}, fecha {{fecha}}. {{descripcion}}' },
      tracking: 'ABC123',
      date: '2026-07-01',
      description: 'Sigue retenido.',
    })
    expect(text).toContain('ABC123')
    expect(text).not.toMatch(/\{\{/)
  })
})
