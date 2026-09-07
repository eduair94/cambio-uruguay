import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  advertiserMatches,
  agencyKey,
  publicAdvertiserMetadata,
  publicAdvertiserProjection,
  publicBusinessUrl,
  safeAgency,
} from '../../utils/propertyAdvertiser'
import {
  normalizeRentalQuery,
  rentalMatchingOffer,
  rentalQueryToParams,
  type RentalOffer,
} from '../../utils/rentals'
import { normalizePropertySalesQuery, propertySalesQueryToParams } from '../../utils/propertySales'
import { normalizeRentalBudgetQuery, rentalBudgetQueryToParams } from '../../utils/rentalBudget'
import { normalizeRentalAlertFilters } from '../../utils/rentalAlerts'

const now = Date.parse('2026-09-07T10:00:00Z')
const agency = {
  version: 1,
  key: 'infocasas:123',
  name: 'Empresa',
  profileUrl: 'https://www.infocasas.com.uy/inmobiliarias/perfil/123-empresa',
  observedAt: new Date(now).toISOString(),
}
const owner = {
  declared: true,
  evidence: 'advert_text',
  sourceUrl: 'https://www.infocasas.com.uy/propiedad/123',
  observedAt: new Date(now).toISOString(),
}
afterEach(() => vi.useRealTimers())
describe('source advertiser evidence', () => {
  it.each(['apartamento', 'casa', 'terreno'])(
    'keeps own-advert owner evidence from the native Mercado Libre %s host',
    subdomain => {
      const url = `https://${subdomain}.mercadolibre.com.uy/MLU-123456-alquiler-_JM`
      const row = {
        source: 'mercadolibre',
        url,
        sellerType: 'particular',
        ownerDirect: { ...owner, sourceUrl: url },
      }
      expect(publicBusinessUrl(url, row.source)).toBe(url)
      expect(publicAdvertiserMetadata(row, now).ownerDirect?.declared).toBe(true)
      expect(advertiserMatches(row, { owner: true }, now)).toBe(true)
    }
  )
  it.each([
    'https://casa.mercadolibre.com.uy.ejemplo.com/MLU-123',
    'https://desconocido.mercadolibre.com.uy/MLU-123',
    'https://casa.mercadolibre.com.uy@ejemplo.com/MLU-123',
    'https://casa.mercadolibre.com.uy/MLU-123?token=private',
  ])('rejects impostor, unverified or credential-bearing source URLs: %s', url => {
    expect(publicBusinessUrl(url, 'mercadolibre')).toBeNull()
  })
  it('does not publish a contact from another advert or a profile link for another company', () => {
    const contact = {
      version: 1,
      name: 'Office',
      channels: [
        {
          kind: 'email',
          value: 'public@example.org',
          sourceUrl: 'https://www.infocasas.com.uy/another-home/999',
          observedAt: agency.observedAt,
        },
      ],
    }
    expect(
      publicAdvertiserMetadata({ source: 'infocasas', agency, publicContact: contact }, now)
        .publicContact
    ).toBeNull()
    expect(
      safeAgency(
        {
          ...agency,
          listingsUrl: 'https://www.infocasas.com.uy/inmobiliarias/999-other/propiedades',
        },
        'infocasas',
        now
      )
    ).toBeNull()
  })
  it('rebuilds nested metadata and never exposes raw identities or future private fields', () => {
    expect(
      publicAdvertiserMetadata(
        {
          source: 'infocasas',
          agency: { ...agency, private: 'SECRET' },
          identity: 'SECRET',
          publicContact: {
            version: 1,
            name: 'Oficina',
            private: 'SECRET',
            channels: [
              {
                kind: 'email',
                value: 'public@example.org',
                sourceUrl: agency.profileUrl,
                observedAt: agency.observedAt,
                private: 'SECRET',
              },
            ],
          },
        },
        now
      )
    ).toEqual({
      agency,
      publicContact: {
        version: 1,
        name: 'Oficina',
        channels: [
          {
            kind: 'email',
            value: 'public@example.org',
            sourceUrl: agency.profileUrl,
            observedAt: agency.observedAt,
          },
        ],
      },
    })
    expect(Object.keys(publicAdvertiserProjection('offers', true))).not.toContain(
      'offers.publicContact'
    )
  })
  it('preserves absence and explicitly removes expired metadata without refreshing from the advert date', () => {
    expect(publicAdvertiserMetadata({ source: 'infocasas' }, now)).toEqual({})
    expect(
      publicAdvertiserMetadata(
        {
          source: 'infocasas',
          lastSeen: agency.observedAt,
          agency: { ...agency, observedAt: '2026-07-01T00:00:00Z' },
          ownerDirect: { ...owner, observedAt: '2026-07-01T00:00:00Z' },
        },
        now
      )
    ).toEqual({ agency: null, ownerDirect: null })
    expect(
      safeAgency({ ...agency, observedAt: new Date(now + 301000).toISOString() }, 'infocasas', now)
    ).toBeNull()
  })
  it('requires the native agency identity and same source, never a matching name', () => {
    expect(safeAgency({ ...agency, key: 'infocasas:124' }, 'infocasas', now)).toBeNull()
    expect(safeAgency(agency, 'casasweb', now)).toBeNull()
    expect(agencyKey('Empresa')).toBe('')
    expect(agencyKey('infocasas:123?query=1')).toBe('')
  })
  it.each([
    'javascript:alert(1)',
    'https://evil.invalid/a',
    'http://127.0.0.1/a',
    'https://localhost/a',
    'https://user:pass@example.org/a',
    'https://example.org:8443/a',
  ])('rejects unsafe business URL %s', url => expect(publicBusinessUrl(url)).toBeNull())
  it.each([
    'person?subject=bad@example.org',
    'person%0D%0ABcc@example.org',
    'person&bcc@example.org',
    'person\r\n@example.org',
  ])('rejects mail URI injection %s', value => {
    expect(
      publicAdvertiserMetadata(
        {
          source: 'infocasas',
          publicContact: {
            version: 1,
            name: 'Oficina',
            channels: [
              { kind: 'email', value, sourceUrl: agency.profileUrl, observedAt: agency.observedAt },
            ],
          },
        },
        now
      ).publicContact
    ).toBeNull()
  })
  it('does not interpret private seller status as an explicit owner, and vetoes agency contradictions', () => {
    expect(
      advertiserMatches({ source: 'infocasas', sellerType: 'particular' }, { owner: true }, now)
    ).toBe(false)
    expect(
      advertiserMatches(
        { source: 'infocasas', url: owner.sourceUrl, ownerDirect: owner },
        { owner: true },
        now
      )
    ).toBe(true)
    expect(
      advertiserMatches(
        { source: 'infocasas', url: owner.sourceUrl, ownerDirect: owner, agency },
        { owner: true },
        now
      )
    ).toBe(false)
    expect(
      advertiserMatches(
        {
          source: 'infocasas',
          url: owner.sourceUrl,
          ownerDirect: owner,
          sellerType: 'inmobiliaria',
        },
        { owner: true },
        now
      )
    ).toBe(false)
  })
  it('selects the filtered own offer and its price, not a cheaper publication by another agency', () => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    const row = (id: string, price: number, ownAgency: unknown) =>
      ({
        source: 'infocasas',
        listingId: id,
        title: 'Alquiler',
        price,
        priceUyu: price,
        currency: 'UYU',
        agency: ownAgency,
        commonExpenses: null,
      }) as RentalOffer
    const chosen = rentalMatchingOffer(
      [
        row('1', 20000, {
          ...agency,
          key: 'infocasas:999',
          profileUrl: agency.profileUrl.replace('123-', '999-'),
        }),
        row('2', 30000, agency),
      ],
      normalizeRentalQuery({ agency: agency.key }),
      40
    )
    expect(chosen?.listingId).toBe('2')
    expect(chosen?.priceUyu).toBe(30000)
  })
  it('round-trips source identity and explicit owner across rent, sale, budget and saved searches', () => {
    for (const input of [{ agency: agency.key }, { dueno: '1' }]) {
      expect(normalizeRentalQuery(rentalQueryToParams(normalizeRentalQuery(input)))).toMatchObject(
        normalizeRentalQuery(input)
      )
      expect(
        normalizePropertySalesQuery(propertySalesQueryToParams(normalizePropertySalesQuery(input)))
      ).toEqual(normalizePropertySalesQuery(input))
      expect(
        normalizeRentalBudgetQuery(rentalBudgetQueryToParams(normalizeRentalBudgetQuery(input)))
      ).toEqual(normalizeRentalBudgetQuery(input))
    }
    expect(normalizeRentalAlertFilters('rental-search', { agency: agency.key })).toMatchObject({
      agency: agency.key,
    })
    expect(() =>
      normalizeRentalAlertFilters('rental-search', { agency: 'same company name' })
    ).toThrow()
  })
})
