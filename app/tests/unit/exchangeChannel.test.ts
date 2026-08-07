import { describe, expect, it } from 'vitest'
import { CASAS_REPUTATION } from '../../utils/casasDirectory'
import {
  ACCOUNT_ONLY_TYPES,
  ONLINE_CAPABLE_CASAS,
  ORIGIN_CATEGORY,
  categoryForOrigin,
  channelForRate,
  isOnlineCapableCasa,
  matchesChannel,
  normalizeChannelFilter,
  operationForRate,
  originHasChannel,
  requiresAccount,
  servesDepartment,
} from '../../utils/exchangeChannel'

describe('categoryForOrigin', () => {
  it('knows the five banks and two fintechs', () => {
    for (const origin of ['brou', 'itau', 'bbva', 'santander', 'scotiabank']) {
      expect(categoryForOrigin(origin)).toBe('banco')
    }
    expect(categoryForOrigin('oca')).toBe('fintech')
    expect(categoryForOrigin('prex')).toBe('fintech')
  })

  it('defaults every other origin to a walk-in casa', () => {
    for (const origin of ['cambio_minas', 'aeromar', 'gales', 'cambio_sir', 'brand_new_casa']) {
      expect(categoryForOrigin(origin)).toBe('casa')
    }
  })

  // Drift guard: ORIGIN_CATEGORY is a small literal so the home page does not
  // pull in the 2 800-line reputation dataset. This test is what keeps the two
  // in sync — adding a bank to casasDirectory without updating the map fails here.
  it('agrees with CASAS_REPUTATION for every documented house', () => {
    for (const casa of CASAS_REPUTATION) {
      expect(
        categoryForOrigin(casa.code),
        `${casa.code} is "${casa.category}" in casasDirectory but "${categoryForOrigin(casa.code)}" in exchangeChannel`
      ).toBe(casa.category)
    }
  })

  it('does not classify an origin the directory has never heard of', () => {
    const known = new Set(CASAS_REPUTATION.map(c => c.code))
    for (const origin of Object.keys(ORIGIN_CATEGORY)) {
      expect(known.has(origin), `${origin} is classified but absent from casasDirectory`).toBe(true)
    }
  })
})

describe('channelForRate', () => {
  // The bug this whole module was reshaped around: a bank publishes BOTH a
  // walk-in board price and an account-only one under the same origin.
  it('puts a bank branch board (type "") in presencial', () => {
    expect(channelForRate('brou', '')).toBe('presencial')
    expect(channelForRate('itau', '')).toBe('presencial')
    expect(channelForRate('santander', '')).toBe('presencial')
    expect(channelForRate('brou', null)).toBe('presencial')
    expect(channelForRate('brou', undefined)).toBe('presencial')
  })

  it('puts account-only rate types in online', () => {
    expect(channelForRate('brou', 'EBROU')).toBe('online')
    expect(channelForRate('itau', 'TRANSFERENCIA')).toBe('online')
    expect(channelForRate('santander', 'TRANSFERENCIA')).toBe('online')
    expect(channelForRate('bbva', 'TRANSFERENCIA')).toBe('online')
    expect(channelForRate('scotiabank', 'TRANSFERENCIA')).toBe('online')
    for (const type of ACCOUNT_ONLY_TYPES) {
      expect(channelForRate('any_origin', type)).toBe('online')
    }
  })

  it('puts every fintech quote in online whatever the type', () => {
    expect(channelForRate('prex', '')).toBe('online')
    expect(channelForRate('oca', '')).toBe('online')
    expect(channelForRate('prex', 'BILLETE')).toBe('online')
  })

  it('keeps casa quotes presencial, including their BILLETE rows', () => {
    expect(channelForRate('cambio_minas', '')).toBe('presencial')
    expect(channelForRate('gales', 'BILLETE')).toBe('presencial')
    expect(channelForRate('unknown_casa', '')).toBe('presencial')
  })
})

describe('matchesChannel', () => {
  it('lets every quote through when the filter is all', () => {
    expect(matchesChannel('brou', 'EBROU', 'all')).toBe(true)
    expect(matchesChannel('cambio_minas', '', 'all')).toBe(true)
  })

  it('splits a single bank origin across both channels by rate type', () => {
    expect(matchesChannel('brou', '', 'presencial')).toBe(true)
    expect(matchesChannel('brou', '', 'online')).toBe(false)
    expect(matchesChannel('brou', 'EBROU', 'online')).toBe(true)
    expect(matchesChannel('brou', 'EBROU', 'presencial')).toBe(false)
  })

  it('keeps fintechs out of the presencial view', () => {
    expect(matchesChannel('prex', '', 'online')).toBe(true)
    expect(matchesChannel('prex', '', 'presencial')).toBe(false)
  })
})

describe('originHasChannel', () => {
  const rows = [
    { origin: 'brou', type: '' },
    { origin: 'brou', type: 'EBROU' },
    { origin: 'prex', type: '' },
    { origin: 'cambio_minas', type: '' },
  ]

  it('is always true for the all filter', () => {
    expect(originHasChannel('prex', rows, 'all')).toBe(true)
    expect(originHasChannel('nobody', rows, 'all')).toBe(true)
  })

  it('keeps a bank selectable in both channels when it quotes both ways', () => {
    expect(originHasChannel('brou', rows, 'online')).toBe(true)
    expect(originHasChannel('brou', rows, 'presencial')).toBe(true)
  })

  it('drops an origin with no quote in the active channel', () => {
    expect(originHasChannel('prex', rows, 'presencial')).toBe(false)
    expect(originHasChannel('cambio_minas', rows, 'online')).toBe(false)
    expect(originHasChannel('absent', rows, 'online')).toBe(false)
  })
})

describe('operationForRate', () => {
  it('labels the operation behind each quote', () => {
    expect(operationForRate('cambio_minas', '')).toBe('cash')
    expect(operationForRate('brou', '')).toBe('cash')
    expect(operationForRate('brou', 'EBROU')).toBe('app')
    expect(operationForRate('itau', 'TRANSFERENCIA')).toBe('transfer')
    expect(operationForRate('prex', '')).toBe('app')
    expect(operationForRate('oca', '')).toBe('app')
  })
})

describe('requiresAccount', () => {
  it('is true exactly for the online channel', () => {
    expect(requiresAccount('brou', 'EBROU')).toBe(true)
    expect(requiresAccount('prex', '')).toBe(true)
    expect(requiresAccount('brou', '')).toBe(false)
    expect(requiresAccount('cambio_minas', '')).toBe(false)
  })
})

describe('isOnlineCapableCasa', () => {
  it('flags only casas with documented online transacting', () => {
    expect(isOnlineCapableCasa('cambio18')).toBe(true)
    expect(isOnlineCapableCasa('cambio_minas')).toBe(true)
    expect(isOnlineCapableCasa('fortex')).toBe(true)
    // Quoting over WhatsApp is not transacting.
    expect(isOnlineCapableCasa('cambio_fenix')).toBe(false)
    expect(isOnlineCapableCasa('suizo')).toBe(false)
  })

  it('only ever flags real casas, never banks or fintechs', () => {
    for (const code of ONLINE_CAPABLE_CASAS) {
      expect(categoryForOrigin(code)).toBe('casa')
      expect(CASAS_REPUTATION.some(c => c.code === code)).toBe(true)
    }
  })
})

describe('servesDepartment', () => {
  it('keeps a counter quote only where the house has a branch', () => {
    expect(servesDepartment('cambio_minas', '', ['LAVALLEJA'], 'LAVALLEJA')).toBe(true)
    expect(servesDepartment('cambio_minas', '', ['LAVALLEJA'], 'RIVERA')).toBe(false)
  })

  it('matches the branch whichever spelling the house published', () => {
    expect(servesDepartment('gales', '', ['PAYSANDU'], 'PAYSANDÚ')).toBe(true)
    expect(servesDepartment('gales', '', ['SAN JOSÉ'], 'san jose')).toBe(true)
  })

  it('treats an online quote as national', () => {
    // Prex publishes no branches at all; its app still works from Artigas.
    expect(servesDepartment('prex', '', [], 'ARTIGAS')).toBe(true)
    expect(servesDepartment('oca', '', ['MONTEVIDEO'], 'RÍO NEGRO')).toBe(true)
    expect(servesDepartment('brou', 'EBROU', undefined, 'ROCHA')).toBe(true)
    expect(servesDepartment('itau', 'TRANSFERENCIA', [], 'FLORES')).toBe(true)
  })

  it('still pins a bank BRANCH quote to its departments', () => {
    // The counter price is not national just because the bank also has an app.
    expect(servesDepartment('brou', '', ['MONTEVIDEO'], 'ARTIGAS')).toBe(false)
    expect(servesDepartment('brou', '', ['ARTIGAS'], 'ARTIGAS')).toBe(true)
  })

  it('drops a counter quote from a house with no branch data', () => {
    expect(servesDepartment('cambio_minas', '', [], 'LAVALLEJA')).toBe(false)
    expect(servesDepartment('cambio_minas', '', undefined, 'LAVALLEJA')).toBe(false)
  })
})

describe('normalizeChannelFilter', () => {
  it('accepts the two channel values', () => {
    expect(normalizeChannelFilter('online')).toBe('online')
    expect(normalizeChannelFilter('presencial')).toBe('presencial')
  })

  it('falls back to all for anything else', () => {
    expect(normalizeChannelFilter('all')).toBe('all')
    expect(normalizeChannelFilter('')).toBe('all')
    expect(normalizeChannelFilter(undefined)).toBe('all')
    expect(normalizeChannelFilter('ONLINE')).toBe('all')
  })
})
