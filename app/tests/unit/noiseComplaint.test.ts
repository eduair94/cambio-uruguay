import { describe, expect, it } from 'vitest'
import {
  buildNoiseComplaint,
  NOISE_DOORS,
  NOISE_FAQ,
  NOISE_SOURCES,
  NOISE_THRESHOLDS,
  noiseMissingFields,
  type NoiseComplaintInput,
} from '../../utils/noiseComplaint'

const baseInput: NoiseComplaintInput = {
  department: 'montevideo',
  sourceAddress: 'Av. Siempreviva 742',
  ownAddress: 'Av. Siempreviva 740',
  sourceType: 'musica',
  sourceTypeOther: '',
  frequency: 'diaria',
  atNight: true,
  episodes: '10/08 23:30 a 02:00 música\n11/08 22:00 a 01:00 música',
  talkedToNeighbor: true,
  fullName: 'Juana Pérez',
  phone: '099 123 456',
}

describe('noise complaint builder', () => {
  it('uses the reporter facts and asks for an official measurement', () => {
    const text = buildNoiseComplaint(baseInput)

    expect(text).toContain('Juana Pérez')
    expect(text).toContain('Av. Siempreviva 742')
    expect(text).toContain('Música o parlantes a alto volumen')
    expect(text).toContain('Todos los días')
    // The load-bearing ask: an official inspection + decibel measurement.
    expect(text).toContain('medición de los niveles sonoros')
    // Cites the law without promising an outcome.
    expect(text).toContain('Ley 17.852')
    expect(text).toContain('artículo 7')
  })

  it('adds the montevideo office and the night-band clause when relevant', () => {
    const text = buildNoiseComplaint(baseInput)
    expect(text).toContain('Servicio de Instalaciones Mecánicas y Eléctricas')
    expect(text).toContain('franja nocturna')
  })

  it('drops the night clause when the noise is not at night', () => {
    const text = buildNoiseComplaint({ ...baseInput, atNight: false })
    expect(text).not.toContain('franja nocturna')
  })

  it('uses the custom type when "otro" is chosen', () => {
    const text = buildNoiseComplaint({
      ...baseInput,
      sourceType: 'otro',
      sourceTypeOther: 'sirena de alarma',
    })
    expect(text).toContain('sirena de alarma')
  })

  it('marks empty required fields with a visible placeholder instead of leaving blanks', () => {
    const text = buildNoiseComplaint({
      ...baseInput,
      sourceAddress: '',
      episodes: '',
    })
    expect(text).toContain('«completar:')
  })

  it('reports every missing required field', () => {
    const missing = noiseMissingFields({
      department: 'montevideo',
      sourceAddress: '',
      ownAddress: '',
      sourceType: '',
      sourceTypeOther: '',
      frequency: '',
      atNight: false,
      episodes: '',
      talkedToNeighbor: false,
      fullName: '',
      phone: '',
    })
    expect(missing).toContain('dirección de la fuente del ruido')
    expect(missing).toContain('tu dirección')
    expect(missing).toContain('tipo de ruido')
    expect(missing).toContain('frecuencia')
    expect(missing).toContain('registro de episodios')
    expect(missing).toContain('tu nombre')
    expect(missing).toContain('tu teléfono')
  })

  it('reports no missing fields when the base input is complete', () => {
    expect(noiseMissingFields(baseInput)).toHaveLength(0)
  })
})

describe('noise complaint catalog integrity', () => {
  it('exposes the three routing doors in order', () => {
    expect(NOISE_DOORS.map(d => d.id)).toEqual(['policia', 'intendencia', 'civil'])
    expect(NOISE_DOORS.map(d => d.n)).toEqual([1, 2, 3])
  })

  it('every source has a real url and a kind', () => {
    for (const s of NOISE_SOURCES) {
      expect(s.url).toMatch(/^https?:\/\//)
      expect(['ley', 'intendencia', 'nacional']).toContain(s.kind)
    }
  })

  it('every FAQ entry is complete', () => {
    for (const f of NOISE_FAQ) {
      expect(f.question.length).toBeGreaterThan(0)
      expect(f.short.length).toBeGreaterThan(0)
      expect(f.answer.length).toBeGreaterThan(0)
    }
  })

  it('publishes the Montevideo day/night thresholds', () => {
    const limits = NOISE_THRESHOLDS.map(t => t.limit)
    expect(limits).toContain('45 dB')
    expect(limits).toContain('39 dB')
  })
})
