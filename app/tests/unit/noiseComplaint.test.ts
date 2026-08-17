import { describe, expect, it } from 'vitest'
import {
  NOISE_CHANNELS,
  NOISE_FAQS,
  NOISE_LIMITS,
  NOISE_SOURCES,
  NOISE_STEPS,
  NOISE_TIPS,
  NOISE_VERIFIED_AT,
  buildNoiseComplaintText,
  emptyNoiseComplaint,
  missingRequiredFields,
  type NoiseComplaintInput,
} from '../../utils/noiseComplaint'

function input(overrides: Partial<NoiseComplaintInput> = {}): NoiseComplaintInput {
  return {
    ...emptyNoiseComplaint(),
    sourceAddress: 'Canelones 1234',
    noiseKind: 'música amplificada',
    schedule: 'de jueves a domingo, entre las 23.00 y las 5.00',
    name: 'Ana Pérez',
    address: 'Canelones 1240, apto. 3',
    phone: '099 123 456',
    ...overrides,
  }
}

describe('the sourced content', () => {
  // Every figure on this page is a legal or procedural claim. A source list that
  // drifts out of the content is how a page starts asserting things nobody can
  // check — the failure mode this project cares most about.
  it('backs every limit with a source that exists', () => {
    expect(NOISE_LIMITS.length).toBeGreaterThanOrEqual(4)
    for (const limit of NOISE_LIMITS) {
      expect(NOISE_SOURCES[limit.sourceIndex]).toBeDefined()
      expect(limit.subject.trim()).not.toBe('')
      expect(limit.value.trim()).not.toBe('')
      expect(limit.when.trim()).not.toBe('')
    }
  })

  it('backs every channel with a source and a public URL', () => {
    for (const channel of NOISE_CHANNELS) {
      expect(NOISE_SOURCES[channel.sourceIndex]).toBeDefined()
      expect(channel.url).toMatch(/^https:\/\//)
      expect(channel.authority.trim()).not.toBe('')
      expect(channel.scope.trim()).not.toBe('')
    }
  })

  it('points every source at an official publisher', () => {
    expect(NOISE_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const source of NOISE_SOURCES) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.url).toMatch(/impo\.com\.uy|montevideo\.gub\.uy|gub\.uy/)
      expect(source.publisher.trim()).not.toBe('')
    }
  })

  it('carries the two Montevideo dwelling limits, with their time bands', () => {
    const day = NOISE_LIMITS.find(limit => limit.value.includes('45'))
    const night = NOISE_LIMITS.find(limit => limit.value.includes('39'))
    expect(day?.when).toContain('7.00')
    expect(day?.when).toContain('22.00')
    expect(night?.when).toContain('22.00')
    expect(night?.when).toContain('7.00')
  })

  it('has a verified-at date in ISO form', () => {
    expect(NOISE_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(NOISE_VERIFIED_AT))).toBe(false)
  })

  it('names at least one free channel, so the reader is never pushed to pay', () => {
    expect(NOISE_CHANNELS.some(channel => channel.free)).toBe(true)
  })

  // The Intendencia procedure is written for commercial and industrial premises.
  // A reader whose problem is the neighbour upstairs must be told that, not
  // silently handed a form that does not fit.
  it('states the gap for a private neighbour', () => {
    const text = [...NOISE_TIPS.map(t => `${t.title} ${t.body}`), ...NOISE_FAQS.map(f => f.a)].join(
      ' '
    )
    expect(text).toMatch(/vecino particular/i)
    expect(text).toMatch(/comercial/i)
  })

  it('warns that a phone app is not a measurement', () => {
    const text = NOISE_TIPS.map(tip => tip.body).join(' ')
    expect(text).toMatch(/sonómetro|no es una medición|no la presentes/i)
  })

  it('gives every step and tip real prose', () => {
    expect(NOISE_STEPS.length).toBeGreaterThanOrEqual(6)
    for (const step of NOISE_STEPS) {
      expect(step.name.trim().length).toBeGreaterThan(5)
      expect(step.text.trim().length).toBeGreaterThan(40)
    }
    expect(NOISE_TIPS.length).toBeGreaterThanOrEqual(5)
    for (const tip of NOISE_TIPS) {
      expect(tip.title.trim().length).toBeGreaterThan(5)
      expect(tip.body.trim().length).toBeGreaterThan(80)
    }
  })

  it('answers every FAQ substantively', () => {
    expect(NOISE_FAQS.length).toBeGreaterThanOrEqual(6)
    for (const faq of NOISE_FAQS) {
      expect(faq.q.trim().endsWith('?')).toBe(true)
      expect(faq.a.trim().length).toBeGreaterThan(80)
    }
  })
})

describe('buildNoiseComplaintText', () => {
  it('leads with the three fields the Intendencia demands', () => {
    const text = buildNoiseComplaintText(input())
    const source = text.indexOf('Local o vivienda denunciada')
    const address = text.indexOf('Dirección del denunciante')
    const phone = text.indexOf('Teléfono del denunciante')
    const motive = text.indexOf('MOTIVO')
    expect(source).toBeGreaterThanOrEqual(0)
    expect(address).toBeGreaterThan(source)
    expect(phone).toBeGreaterThan(address)
    expect(motive).toBeGreaterThan(phone)
  })

  it('puts the reader’s own answers in the text', () => {
    const text = buildNoiseComplaintText(input())
    expect(text).toContain('Canelones 1234')
    expect(text).toContain('música amplificada')
    expect(text).toContain('099 123 456')
    expect(text).toContain('de jueves a domingo')
  })

  it('states the limit it is invoking', () => {
    const text = buildNoiseComplaintText(input())
    expect(text).toContain('45 dB(A)')
    expect(text).toContain('39 dB(A)')
    expect(text).toContain('dentro de la vivienda')
  })

  it('always asks for the measurement', () => {
    expect(buildNoiseComplaintText(input())).toMatch(/medición del nivel de ruido/i)
  })

  // A half-filled template must be obviously half-filled. Silence would let
  // somebody send a denuncia with a blank address and lose the trámite.
  it('marks what the reader left empty instead of hiding it', () => {
    const text = buildNoiseComplaintText(emptyNoiseComplaint())
    expect(text).toContain('[completar]')
    expect(text.match(/\[completar\]/g)?.length).toBeGreaterThanOrEqual(5)
  })

  it('adds the prior-request sentence only when the reader made one', () => {
    expect(buildNoiseComplaintText(input({ askedFirst: false }))).not.toMatch(/bajaran el volumen/)
    expect(buildNoiseComplaintText(input({ askedFirst: true }))).toMatch(/bajaran el volumen/)
  })

  it('renders the episode log one bullet per line, dropping blanks', () => {
    const text = buildNoiseComplaintText(
      input({ log: '12/08, 23.30 a 4.00\n\n  13/08, 00.10 a 3.40  \n' })
    )
    expect(text).toContain('REGISTRO DE EPISODIOS')
    expect(text).toContain('- 12/08, 23.30 a 4.00')
    expect(text).toContain('- 13/08, 00.10 a 3.40')
    expect(text).not.toMatch(/- *\n/)
  })

  it('omits the log section when there is no log', () => {
    expect(buildNoiseComplaintText(input({ log: '   ' }))).not.toContain('REGISTRO DE EPISODIOS')
  })

  it('collapses stray whitespace in a field', () => {
    const text = buildNoiseComplaintText(input({ sourceAddress: '  Canelones   1234  ' }))
    expect(text).toContain('Canelones 1234')
  })

  it('stays plain text, so it survives a paste into any form', () => {
    const text = buildNoiseComplaintText(input())
    expect(text).not.toMatch(/[<>]/)
    expect(text.split('\n').length).toBeGreaterThan(8)
  })
})

describe('missingRequiredFields', () => {
  it('lists every required field on an empty form', () => {
    expect(missingRequiredFields(emptyNoiseComplaint())).toHaveLength(4)
  })

  it('is empty once the required fields are filled', () => {
    expect(missingRequiredFields(input())).toEqual([])
  })

  it('does not require the optional fields', () => {
    expect(missingRequiredFields(input({ name: '', log: '', askedFirst: false }))).toEqual([])
  })

  it('treats whitespace as empty', () => {
    expect(missingRequiredFields(input({ phone: '   ' }))).toContain('Tu teléfono')
  })
})
