import { describe, expect, it } from 'vitest'
import { parseCourierRate, stripHtml, RATE_PARSERS } from '../../server/utils/courierScraper'
import { COURIERS } from '../../utils/courierShipping'

// Fixtures are the tag-stripped rate text captured from each courier's live tariff page
// (2026-06-18). Parsers must pull the representative small-parcel per-kg out of the surrounding
// noise. Expected values are externally known from the published tariffs.

describe('parseCourierRate', () => {
  it('gripper: takes the 0,9–5 kg tier, not the <900 g flat fee', () => {
    const text =
      'Régimen USD 800 NUEVO USD 19,80 USD 21,90 USD 16,50 USD 13,20 cargo USD 5 por manejo'
    expect(parseCourierRate('gripper', text)).toEqual({ id: 'gripper', perKgUsd: 21.9, ok: true })
  })

  it('enviamicompra: skips the per-letter charge and takes the 0,5–5 kg tier', () => {
    const text =
      'Cartas, Revistas y Documentos: u$s 9.04 por unidad u$s 21.90 u$s 20.90 u$s 16.50 u$s 11.90'
    expect(parseCourierRate('enviamicompra', text)).toEqual({
      id: 'enviamicompra',
      perKgUsd: 21.9,
      ok: true,
    })
  })

  it('uruguaycargo: anchors on the "5 Kg U$S … por Kg" tier line', () => {
    const text = '100 gr 500 gr U$S 14,99 501 gr 5 Kg U$S 19,50 por Kg 5 Kg 10 Kg U$S 18,99 por Kg'
    expect(parseCourierRate('uruguaycargo', text).perKgUsd).toBe(19.5)
  })

  it('casillamia: doubles the per-500 g charge into a per-kg rate', () => {
    const text = 'USD 10 USD 10 adicionales, cada 500 grs USD 4 adicionales, cada 500 grs'
    expect(parseCourierRate('casillamia', text).perKgUsd).toBe(20)
  })

  it('usxcargo: takes the first "USD … kg" (the USA-origin rate)', () => {
    const text = 'DESDE USA USD 17.50 kg DESDE EUROPA USD 10.50 kg USD 21.50 kg'
    expect(parseCourierRate('usxcargo', text).perKgUsd).toBe(17.5)
  })

  it('urubox: takes the 1–4,99 kg tier (first u$s value in the 18–22 band)', () => {
    const text =
      'En KG Costo por Kg 1 a 4.99 u$s 19,90 5 a 9.99 u$s 17,90 10 a 19.99 u$s 16,50 20 a 40 u$s 15,90'
    expect(parseCourierRate('urubox', text).perKgUsd).toBe(19.9)
  })

  it('starbox: takes the 1–4,99 kg tier ($21 / por cada kg)', () => {
    const text = '0-500g U$S17 501-999g $21 1-4.99 kg $21 / por cada kg 5-10 kg $20 / por cada kg'
    expect(parseCourierRate('starbox', text).perKgUsd).toBe(21)
  })

  it('buybox: takes the 1,01–3 kg tier (U$D 18.90 x kilo)', () => {
    const text =
      '0-500 grs U$D 5.9 501 grs - 1 kg U$D 21 x kilo 1,01 - 3 kg U$D 18.90 x kilo 3,1- 5 kg U$D16.90 x kilo'
    expect(parseCourierRate('buybox', text).perKgUsd).toBe(18.9)
  })

  it('glic: takes the single per-kg rate (22.99 USD el Kg)', () => {
    const text = 'Calculá el precio 22.99 USD el Kg. consolidación gratis 60 días depósito gratis'
    expect(parseCourierRate('glic', text).perKgUsd).toBe(22.99)
  })

  it('strips HTML tags before matching', () => {
    const html = '<div><span>DESDE USA</span> <b>USD 17.50</b> kg</div>'
    expect(parseCourierRate('usxcargo', html).perKgUsd).toBe(17.5)
  })

  it('rejects an implausible value (out of the 5–60 band) and keeps ok=false', () => {
    // casillamia "USD 40 … cada 500 grs" would imply 80/kg → implausible.
    const text = 'USD 40 adicionales, cada 500 grs'
    expect(parseCourierRate('casillamia', text)).toEqual({
      id: 'casillamia',
      perKgUsd: null,
      ok: false,
    })
  })

  it('returns ok=false when the anchor is missing', () => {
    expect(parseCourierRate('uruguaycargo', 'sin tarifas hoy').ok).toBe(false)
  })

  it('returns ok=false for an unknown courier id', () => {
    expect(parseCourierRate('nope', 'USD 20,00').ok).toBe(false)
  })
})

describe('stripHtml', () => {
  it('removes tags, scripts and entities', () => {
    expect(stripHtml('<script>x</script><p>USD&nbsp;17.50</p>')).toContain('USD 17.50')
    expect(stripHtml('<p>USD&nbsp;17.50</p>')).not.toContain('<p>')
  })
})

describe('RATE_PARSERS catalogue', () => {
  it('only lists couriers whose rates are in raw HTML (HTTP-scrapeable)', () => {
    expect(Object.keys(RATE_PARSERS).sort()).toEqual(
      [
        'buybox',
        'casillamia',
        'enviamicompra',
        'glic',
        'gripper',
        'starbox',
        'uruguaycargo',
        'urubox',
        'usxcargo',
      ].sort()
    )
  })
})

describe('courier catalog reputation', () => {
  it('rated couriers cite at least one review source and rating is 0..5', () => {
    for (const c of COURIERS) {
      if (c.rating != null) {
        expect(c.rating).toBeGreaterThanOrEqual(0)
        expect(c.rating).toBeLessThanOrEqual(5)
        expect((c.reviewSources ?? []).length).toBeGreaterThan(0)
      }
    }
  })
  it('every courier has a source URL', () => {
    for (const c of COURIERS) expect(c.source).toMatch(/^https?:\/\//)
  })
})
