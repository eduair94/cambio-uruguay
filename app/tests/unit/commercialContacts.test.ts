import { describe, expect, it } from 'vitest'
import { safeCommercialContacts } from '../../utils/commercialContacts'

const NOW = Date.parse('2026-09-21T15:00:00Z')
const observedAt = '2026-09-21T12:00:00Z'
const fixture = {
  id: 'empresa-ejemplo',
  name: 'Empresa de prueba',
  sector: 'autos',
  phone: '2400 0000',
  phoneScope: 'business',
  sourceUrl: 'https://empresa.com.uy/contacto',
  observedAt,
  platforms: [
    {
      kind: 'mercadolibre',
      url: 'https://perfil.mercadolibre.com.uy/EMPRESA',
      evidenceUrl: 'https://empresa.com.uy/vehiculos',
      evidenceKind: 'official_link',
      observedAt,
    },
  ],
}

describe('curated business contact boundary', () => {
  it('normalizes the general business phone and emits only documented fields', () => {
    const [contact] = safeCommercialContacts(
      [
        {
          ...fixture,
          privateNote: 'private',
          platforms: [{ ...fixture.platforms[0], token: 'secret' }],
        },
      ],
      NOW
    )
    expect(contact).toEqual({
      ...fixture,
      phone: '+59824000000',
      observedAt: '2026-09-21T12:00:00.000Z',
      platforms: [{ ...fixture.platforms[0], observedAt: '2026-09-21T12:00:00.000Z' }],
    })
    expect(JSON.stringify(contact)).not.toMatch(/private|secret|token/)
  })

  it.each(['+598 2400 0000', '00598 2400 0000', '59824000000', '(2400) 0000'])(
    'normalizes Uruguay business phone %s',
    phone =>
      expect(safeCommercialContacts([{ ...fixture, phone }], NOW)[0]?.phone).toBe('+59824000000')
  )

  it.each(['099***000', '+1 212 555 0000', '240000', '24000000 ext 7', '24000000/25000000'])(
    'rejects masked, foreign, partial or ambiguous phones: %s',
    phone => expect(safeCommercialContacts([{ ...fixture, phone }], NOW)).toEqual([])
  )

  it.each([undefined, 'personal', 'private', true])(
    'requires manual business attestation: %s',
    phoneScope => {
      expect(safeCommercialContacts([{ ...fixture, phoneScope }], NOW)).toEqual([])
    }
  )

  it.each([
    'http://empresa.com.uy/contacto',
    'javascript:alert(1)',
    'https://127.0.0.1/contacto',
    'https://2130706433/contacto',
    'https://[::1]/contacto',
    'https://office.internal/contacto',
    'https://empresa.com.uy:8443/contacto',
    'https://user:password@empresa.com.uy/contacto',
    'https://empresa.com.uy/login',
    'https://empresa.com.uy/contacto?session=private',
  ])('rejects unsafe or authenticated source URLs: %s', sourceUrl => {
    expect(safeCommercialContacts([{ ...fixture, sourceUrl }], NOW)).toEqual([])
  })

  it('expires each phone and platform on its own evidence date without renewing it', () => {
    const stale = new Date(NOW - 30 * 86400000 - 1).toISOString()
    const future = new Date(NOW + 1).toISOString()
    for (const at of [stale, future, 'invalid']) {
      expect(safeCommercialContacts([{ ...fixture, observedAt: at }], NOW)).toEqual([])
      expect(
        safeCommercialContacts(
          [{ ...fixture, platforms: [{ ...fixture.platforms[0], observedAt: at }] }],
          NOW
        )[0]?.platforms
      ).toEqual([])
    }
    expect(
      safeCommercialContacts(
        [{ ...fixture, observedAt: new Date(NOW - 30 * 86400000).toISOString() }],
        NOW
      )
    ).toHaveLength(1)
  })

  it('requires corroboration and the actual platform host for platform links', () => {
    for (const platform of [
      { ...fixture.platforms[0], evidenceUrl: undefined },
      { ...fixture.platforms[0], evidenceKind: undefined },
      { ...fixture.platforms[0], evidenceUrl: 'https://localhost/evidence' },
      { ...fixture.platforms[0], url: 'https://mercadolibre.com.uy.other.com/EMPRESA' },
      { ...fixture.platforms[0], kind: 'facebook' },
    ]) {
      expect(
        safeCommercialContacts([{ ...fixture, platforms: [platform] }], NOW)[0]?.platforms
      ).toEqual([])
    }
    expect(
      safeCommercialContacts(
        [
          {
            ...fixture,
            platforms: [
              {
                ...fixture.platforms[0],
                kind: 'facebook',
                url: 'https://www.facebook.com/marketplace/item/1234567890',
              },
            ],
          },
        ],
        NOW
      )[0]?.platforms[0]?.kind
    ).toBe('facebook')
  })

  it('does not interpret a Facebook business page as Marketplace evidence', () => {
    for (const path of ['/empresa', '/marketplace', '/marketplace/profile/empresa']) {
      const platform = {
        ...fixture.platforms[0],
        kind: 'facebook',
        url: `https://www.facebook.com${path}`,
      }
      expect(
        safeCommercialContacts([{ ...fixture, platforms: [platform] }], NOW)[0]?.platforms
      ).toEqual([])
    }
    const profile = {
      ...fixture.platforms[0],
      kind: 'facebook',
      url: 'https://www.facebook.com/marketplace/profile/1234567890/',
    }
    expect(
      safeCommercialContacts([{ ...fixture, platforms: [profile] }], NOW)[0]?.platforms[0]?.url
    ).toBe(profile.url)
  })

  it('rejects malformed rows and deduplicates identifiers without matching businesses by name', () => {
    expect(safeCommercialContacts(null, NOW)).toEqual([])
    expect(safeCommercialContacts([fixture], NaN)).toEqual([])
    expect(safeCommercialContacts([null, [], {}, { ...fixture, sector: 'personal' }], NOW)).toEqual(
      []
    )
    expect(
      safeCommercialContacts([fixture, fixture, { ...fixture, id: 'otra-empresa' }], NOW)
    ).toHaveLength(2)
  })
})
