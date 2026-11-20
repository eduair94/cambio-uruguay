import { describe, expect, it } from 'vitest'
import {
  amountLabel,
  convertAmount,
  convertEntries,
  convertSeoDescription,
  convertSeoTitle,
  convertSnippetAmount,
  getConvertEntry,
  type ConvertCode,
} from '../../utils/convert'

// Cotizaciones verosímiles (pesos uruguayos por unidad), un poco por encima de las de octubre de
// 2026 para que el test aguante la cifra más larga que razonablemente puede tocar.
const RATE: Record<Exclude<ConvertCode, 'UYU'>, number> = {
  USD: 45,
  EUR: 52,
  BRL: 9,
  ARS: 0.05,
}

const valueOf = (slug: string) => {
  const entry = getConvertEntry(slug)!
  const foreign = (entry.from === 'UYU' ? entry.to : entry.from) as Exclude<ConvertCode, 'UYU'>
  return { entry, value: convertAmount(entry, RATE[foreign])! }
}

describe('el título de /convertir: la consulta y la cifra antes del corte', () => {
  it('entra en 60 caracteres en todas las conversiones (la marca va después y se puede cortar)', () => {
    const long: string[] = []
    for (const { slug } of convertEntries) {
      const { entry, value } = valueOf(slug)
      const title = convertSeoTitle(entry, value)
      if (title.length > 60) long.push(`${title.length} ${title}`)
    }
    expect(long).toEqual([])
  })

  it('arranca por el monto y el par, como se escribe la consulta', () => {
    const { entry, value } = valueOf('50000-pesos-argentinos-a-pesos-uruguayos')
    const title = convertSeoTitle(entry, value)
    expect(title.startsWith(`${amountLabel(50000, 'ARS')} a pesos uruguayos: `)).toBe(true)
    expect(title).toContain(convertSnippetAmount(entry, value))
    expect(title.endsWith(' hoy')).toBe(true)
  })

  it('sin centavos desde 100, con centavos debajo', () => {
    const big = getConvertEntry('100-dolares-a-pesos-uruguayos')!
    expect(convertSnippetAmount(big, 4012.5)).not.toMatch(/,\d\d$/)
    const small = getConvertEntry('500-pesos-uruguayos-a-dolares')!
    expect(convertSnippetAmount(small, 12.47)).toMatch(/,47$/)
  })

  it('sin cotización no inventa una cifra', () => {
    const entry = getConvertEntry('100-dolares-a-pesos-uruguayos')!
    expect(convertSeoTitle(entry, null)).toBe('100 dólares a pesos uruguayos hoy')
    expect(convertSeoDescription(entry, null)).not.toMatch(/\$/)
  })
})

describe('la descripción de /convertir: lo que paga la casa, no la referencia', () => {
  it('entra en 155 caracteres en todas las conversiones', () => {
    const long: string[] = []
    for (const { slug } of convertEntries) {
      const { entry, value } = valueOf(slug)
      const desc = convertSeoDescription(entry, value)
      if (desc.length > 155) long.push(`${desc.length} ${desc}`)
    }
    expect(long).toEqual([])
  })

  it('a pesos uruguayos habla del precio de compra; desde pesos uruguayos, del de venta', () => {
    const toUyu = valueOf('100-dolares-a-pesos-uruguayos')
    expect(convertSeoDescription(toUyu.entry, toUyu.value)).toMatch(/te dan .* precio de compra/)
    const fromUyu = valueOf('10000-pesos-uruguayos-a-dolares')
    expect(convertSeoDescription(fromUyu.entry, fromUyu.value)).toMatch(
      /comprás .* precio de venta/
    )
  })
})
