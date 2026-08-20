// El puente entre las páginas de tarjetas y el mapa de descuentos es una tabla de ids escritos a
// mano (`BANKOS_BANK_BY_CREDIT_PROGRAM`, `BANKOS_BANK_BY_DEBIT_CARD`, `BANKOS_CARD_PAGE_ANCHORS`),
// porque los tres catálogos usan ids propios que no se parecen entre sí. Una tabla a mano se
// pudre en silencio: si alguien renombra un programa en `cardRewards.ts`, el link deja de anclar y
// nadie se entera hasta que un usuario cae al medio de la página. Estos casos son ese aviso.
import { describe, expect, it } from 'vitest'
import {
  BANKOS_BANKS,
  BANKOS_BANK_BY_CREDIT_PROGRAM,
  BANKOS_BANK_BY_DEBIT_CARD,
  BANKOS_CARDS,
  BANKOS_CARD_PAGE_ANCHORS,
  bankosBankName,
  bankosMapPath,
  bankosTypeFromQuery,
} from '../../utils/bankos'
import { CARD_PROGRAMS } from '../../utils/cardRewards'
import { DEBIT_CARDS } from '../../utils/debitCards'

const bankIds = new Set(BANKOS_BANKS.map(b => b.id))
const programIds = new Set(CARD_PROGRAMS.map(p => p.id))
const debitIds = new Set(DEBIT_CARDS.map(c => c.id))

describe('cross-links entre las páginas de tarjetas y el mapa de descuentos', () => {
  it('mapea programas de crédito que existen, a bancos que Bankos cubre', () => {
    for (const [programId, bankId] of Object.entries(BANKOS_BANK_BY_CREDIT_PROGRAM)) {
      expect(programIds, `programa desconocido: ${programId}`).toContain(programId)
      expect(bankIds, `banco desconocido: ${bankId}`).toContain(bankId)
    }
  })

  it('mapea tarjetas de débito que existen, a bancos que Bankos cubre', () => {
    for (const [cardId, bankId] of Object.entries(BANKOS_BANK_BY_DEBIT_CARD)) {
      expect(debitIds, `tarjeta desconocida: ${cardId}`).toContain(cardId)
      expect(bankIds, `banco desconocido: ${bankId}`).toContain(bankId)
    }
  })

  it('las anclas de vuelta apuntan a fichas que existen', () => {
    for (const [bankId, anchors] of Object.entries(BANKOS_CARD_PAGE_ANCHORS)) {
      expect(bankIds, `banco desconocido: ${bankId}`).toContain(bankId)
      if (anchors.credit)
        expect(programIds, `#programa-${anchors.credit}`).toContain(anchors.credit)
      if (anchors.debit) expect(debitIds, `#tarjeta-${anchors.debit}`).toContain(anchors.debit)
    }
  })

  it('cada banco mapeado tiene el tipo de tarjeta que el link preselecciona', () => {
    for (const bankId of new Set(Object.values(BANKOS_BANK_BY_CREDIT_PROGRAM))) {
      expect(
        BANKOS_CARDS.some(c => c.bankId === bankId && c.type === 'credit'),
        `${bankId} no tiene crédito en Bankos`
      ).toBe(true)
    }
    for (const bankId of new Set(Object.values(BANKOS_BANK_BY_DEBIT_CARD))) {
      expect(
        BANKOS_CARDS.some(c => c.bankId === bankId && c.type === 'debit'),
        `${bankId} no tiene débito en Bankos`
      ).toBe(true)
    }
  })

  it('arma el deep link con banco y tipo', () => {
    expect(bankosMapPath('itau', 'credit')).toBe(
      '/descuentos-con-tarjeta-uruguay?banco=itau&tipo=credito'
    )
    expect(bankosMapPath('prex', 'debit')).toBe(
      '/descuentos-con-tarjeta-uruguay?banco=prex&tipo=debito'
    )
    expect(bankosMapPath('itau')).toBe('/descuentos-con-tarjeta-uruguay?banco=itau')
  })

  it('cae al banco entero cuando ese banco no tiene ese tipo (mapa vacío evitado)', () => {
    // Prex sólo tiene tarjeta prepaga en el catálogo: pedirle crédito no debe apagar el mapa.
    expect(bankosMapPath('prex', 'credit')).toBe('/descuentos-con-tarjeta-uruguay?banco=prex')
    // ANDA es al revés: sólo crédito.
    expect(bankosMapPath('anda', 'debit')).toBe('/descuentos-con-tarjeta-uruguay?banco=anda')
  })

  it('lee ?tipo= en español, con o sin tilde, e ignora basura', () => {
    expect(bankosTypeFromQuery('credito')).toBe('credit')
    expect(bankosTypeFromQuery('Crédito')).toBe('credit')
    expect(bankosTypeFromQuery('debito')).toBe('debit')
    expect(bankosTypeFromQuery('DÉBITO')).toBe('debit')
    expect(bankosTypeFromQuery('ambas')).toBeUndefined()
    expect(bankosTypeFromQuery(undefined)).toBeUndefined()
    // vue-router entrega un array cuando el parámetro viene repetido.
    expect(bankosTypeFromQuery(['credito', 'debito'])).toBe('credit')
  })

  it('nombra al banco y aguanta un id que Bankos ya no cubra', () => {
    expect(bankosBankName('brou')).toBe('BROU')
    expect(bankosBankName('inexistente')).toBe('inexistente')
  })
})
