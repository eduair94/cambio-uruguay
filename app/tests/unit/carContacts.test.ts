import { describe, expect, it } from 'vitest'
import { carContactHash as backendHash } from '../../../classes/autos/contacts/optout'
import { displayCarPhone as backendDisplay } from '../../../classes/autos/contacts/phones'
import {
  carContactHash,
  carContactRateOk,
  displayCarPhone,
  publicCarContact,
} from '../../server/utils/carContacts'

const NOW = new Date('2026-09-21T12:00:00.000Z')
const row = {
  key: 'ml-MLU1',
  source: 'mercadolibre',
  permalink: 'https://auto.mercadolibre.com.uy/MLU-1-peugeot-_JM',
}
const doc = {
  key: 'ml-MLU1',
  origin: 'advert_text',
  phones: [
    { value: '+59899123456', mobile: true },
    { value: '+59829012345', mobile: false },
  ],
  sourceUrl: row.permalink,
  observedAt: '2026-09-20T12:00:00.000Z',
}
const options = { now: NOW, optedOut: new Set<string>() }

describe('publicCarContact', () => {
  it('rebuilds the answer field by field', () => {
    expect(publicCarContact({ ...doc, private: 'x', sellerId: 'S' }, row, options)).toEqual({
      key: 'ml-MLU1',
      origin: 'advert_text',
      phones: [
        { value: '+59899123456', display: '099 123 456', mobile: true },
        { value: '+59829012345', display: '2901 2345', mobile: false },
      ],
      sourceUrl: row.permalink,
      observedAt: doc.observedAt,
    })
  })

  it('refuses facebook, foreign urls, stale reads, mismatched keys and junk numbers', () => {
    const facebookRow = {
      ...row,
      source: 'facebook',
      permalink: 'https://www.facebook.com/marketplace/item/1234567890/',
    }
    expect(
      publicCarContact({ ...doc, sourceUrl: facebookRow.permalink }, facebookRow, options)
    ).toBeNull()
    expect(
      publicCarContact({ ...doc, sourceUrl: 'https://evil.example/' }, row, options)
    ).toBeNull()
    expect(
      publicCarContact({ ...doc, observedAt: '2026-08-20T12:00:00.000Z' }, row, options)
    ).toBeNull()
    expect(publicCarContact({ ...doc, key: 'ml-MLU2' }, row, options)).toBeNull()
    expect(
      publicCarContact(
        { ...doc, phones: [{ value: 'javascript:alert(1)', mobile: true }] },
        row,
        options
      )
    ).toBeNull()
    expect(publicCarContact({ ...doc, origin: 'guess' }, row, options)).toBeNull()
    expect(publicCarContact(null, row, options)).toBeNull()
    expect(publicCarContact(doc, null, options)).toBeNull()
  })

  it("accepts a dealer's number only from that source's contact page", () => {
    const dealerRow = {
      key: 'julio-1',
      source: 'julio',
      permalink: 'https://julioautomoviles.com.uy/vehiculo/fiat-uno/',
    }
    const dealerDoc = {
      ...doc,
      key: 'julio-1',
      origin: 'dealer_site',
      sourceUrl: 'https://julioautomoviles.com.uy/contacto/',
    }
    expect(publicCarContact(dealerDoc, dealerRow, options)?.sourceUrl).toBe(
      'https://julioautomoviles.com.uy/contacto/'
    )
    expect(
      publicCarContact({ ...dealerDoc, sourceUrl: dealerRow.permalink }, dealerRow, options)
    ).toBeNull()
    expect(publicCarContact({ ...dealerDoc, key: 'ml-MLU1' }, row, options)).toBeNull()
  })

  it('never offers WhatsApp for a landline or a toll-free number', () => {
    const contact = publicCarContact(
      {
        ...doc,
        phones: [
          { value: '+59829012345', mobile: true },
          { value: '08002525', mobile: true },
        ],
      },
      row,
      options
    )
    expect(contact?.phones.map(phone => phone.mobile)).toEqual([false, false])
  })

  it('drops opted-out numbers, and the whole answer when none is left', () => {
    const optedOut = new Set([carContactHash('+59899123456')])
    expect(
      publicCarContact(doc, row, { now: NOW, optedOut })?.phones.map(phone => phone.value)
    ).toEqual(['+59829012345'])
    optedOut.add(carContactHash('+59829012345'))
    expect(publicCarContact(doc, row, { now: NOW, optedOut })).toBeNull()
  })

  it('hashes and formats exactly like the backend', () => {
    for (const value of ['+59899123456', '+59829012345', '08002525']) {
      expect(carContactHash(value)).toBe(backendHash(value))
      expect(displayCarPhone(value)).toBe(backendDisplay(value))
    }
  })
})

describe('carContactRateOk', () => {
  it('limits per ip and window', () => {
    const bucket = new Map()
    for (let i = 0; i < 3; i++) expect(carContactRateOk(bucket, 'ip', 3, 1000, 0)).toBe(true)
    expect(carContactRateOk(bucket, 'ip', 3, 1000, 10)).toBe(false)
    expect(carContactRateOk(bucket, 'other', 3, 1000, 10)).toBe(true)
    expect(carContactRateOk(bucket, 'ip', 3, 1000, 2000)).toBe(true)
  })
})
