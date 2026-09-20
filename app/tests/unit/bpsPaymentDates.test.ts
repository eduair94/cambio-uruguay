import { describe, expect, it } from 'vitest'

import {
  BPS_COBRO_FAQ,
  BPS_COBRO_SOURCES,
  BPS_COBRO_VERIFIED_AT,
  BPS_CONSULT_CHANNELS,
  BPS_ELECTRONIC_INSTRUMENTS,
  BPS_NETWORKS_INTERIOR,
  BPS_NETWORKS_MONTEVIDEO,
  BPS_REQUIRED_DOCUMENTS,
  cobroSmsText,
} from '../../utils/bpsPaymentDates'

describe('cobroSmsText arma el mensaje que espera el 1997', () => {
  it('acepta la cédula puntuada, como está impresa', () => {
    expect(cobroSmsText('1.234.567-8')).toBe('COBRO 12345678')
    expect(cobroSmsText('1 234 567 8')).toBe('COBRO 12345678')
    expect(cobroSmsText('12345678')).toBe('COBRO 12345678')
  })

  // El dígito verificador VA. El BPS pide el número de cédula y recortarlo en silencio devolvería
  // un mensaje que el 1997 no reconoce, con el agravante de que la página lo mostraría como bueno.
  it('conserva el dígito verificador', () => {
    expect(cobroSmsText('4.567.890-1')).toBe('COBRO 45678901')
  })

  it('acepta las cédulas viejas, de menos dígitos', () => {
    expect(cobroSmsText('123456')).toBe('COBRO 123456')
    expect(cobroSmsText('1234567')).toBe('COBRO 1234567')
  })

  it('rechaza lo que no puede ser una cédula', () => {
    expect(cobroSmsText('')).toBeNull()
    expect(cobroSmsText('12345')).toBeNull()
    expect(cobroSmsText('123456789')).toBeNull()
    expect(cobroSmsText('sin números')).toBeNull()
    expect(cobroSmsText(undefined as unknown as string)).toBeNull()
  })
})

describe('el catálogo de cobro del BPS', () => {
  it('publica las cuatro vías que lista el BPS, cada una con su horario', () => {
    expect(BPS_CONSULT_CHANNELS.map(c => c.id)).toEqual(['sms', 'web', 'telefono', 'presencial'])
    for (const channel of BPS_CONSULT_CHANNELS) {
      expect(channel.name.length).toBeGreaterThan(3)
      expect(channel.how.length).toBeGreaterThan(20)
      expect(channel.availability.length).toBeGreaterThan(10)
    }
  })

  it('nombra los cuatro instrumentos de dinero electrónico y las redes de cobro', () => {
    expect(BPS_ELECTRONIC_INSTRUMENTS).toEqual(['Midinero', 'DeAnda', 'Prex', 'OCA Blue'])
    expect(BPS_NETWORKS_MONTEVIDEO).toEqual(['Abitab', 'Anda', 'Redpagos'])
    // El interior suma El Dorado: es la única diferencia entre las dos redes y la página la dice.
    expect(BPS_NETWORKS_INTERIOR.slice(0, 3)).toEqual([...BPS_NETWORKS_MONTEVIDEO])
    expect(BPS_NETWORKS_INTERIOR).toContain('supermercados El Dorado')
  })

  it('cada fuente es una URL del BPS y la verificación tiene fecha', () => {
    expect(BPS_COBRO_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const source of BPS_COBRO_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/www\.bps\.gub\.uy\//)
      expect(source.label.length).toBeGreaterThan(5)
    }
    expect(BPS_COBRO_VERIFIED_AT).toBe('2026-09-20')
  })

  it('el FAQ contesta con texto propio y sin ids repetidos', () => {
    expect(BPS_COBRO_FAQ.length).toBeGreaterThanOrEqual(6)
    expect(new Set(BPS_COBRO_FAQ.map(f => f.id)).size).toBe(BPS_COBRO_FAQ.length)
    for (const item of BPS_COBRO_FAQ) {
      expect(item.question.endsWith('?')).toBe(true)
      expect(item.answer.length).toBeGreaterThan(60)
    }
    expect(BPS_REQUIRED_DOCUMENTS.length).toBeGreaterThanOrEqual(2)
  })

  // La razón por la que esta página existe en vez de copiar el PDF del mes: una fecha copiada
  // envejece el 1.º del mes siguiente. Si algún día alguien pega un día concreto en el catálogo,
  // esto lo frena.
  it('no publica ninguna fecha de cobro concreta', () => {
    const texto = [
      ...BPS_CONSULT_CHANNELS.flatMap(c => [c.how, c.availability]),
      ...BPS_COBRO_FAQ.map(f => f.answer),
      ...BPS_REQUIRED_DOCUMENTS,
    ].join(' ')
    expect(texto).not.toMatch(
      /\b\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\b/i
    )
  })
})
