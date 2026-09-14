// The catalogue behind `/grabacion-sin-consentimiento-uruguay`.
//
// Two things are worth a test here and they are not the obvious ones. The first
// is that the generated text CHANGES with the case: the whole point of asking
// which of the four situations applies is that an intimate-content letter has to
// name the article that puts the platform itself on the hook, and a page that
// asked the question and then emitted the same paragraph would be theatre.
//
// The second is the sourcing discipline. Every claim on this page is a legal one,
// so the catalogue is only as good as its links to the official text — a table
// row that loses its source is a legal claim with nothing behind it, and it looks
// exactly like the rows that still have one.
import { describe, expect, it } from 'vitest'

import {
  RECORDING_CASES,
  RECORDING_CHANNELS,
  RECORDING_DEADLINES,
  RECORDING_FAQS,
  RECORDING_PLATFORMS,
  RECORDING_SOURCES,
  RECORDING_STEPS,
  RECORDING_VERIFIED_AT,
  buildRemovalRequest,
  emptyRecordingRequest,
  missingRecordingFields,
  recordingCase,
  type RecordingRequestInput,
} from '../../utils/recordingConsent'

const complete = (over: Partial<RecordingRequestInput> = {}): RecordingRequestInput => ({
  ...emptyRecordingRequest(),
  videoUrl: 'https://www.tiktok.com/@cuenta/video/123',
  account: '@cuenta',
  platform: 'TikTok',
  name: 'Ana Pérez',
  idNumber: '1.234.567-8',
  timestamp: 'del segundo 12 al 20',
  context: 'en la peatonal Sarandí, el 3 de setiembre',
  ...over,
})

describe('el catálogo declara sus fuentes', () => {
  it('apunta cada caso, plazo y canal a una fuente que existe', () => {
    const indexed = [...RECORDING_CASES, ...RECORDING_DEADLINES, ...RECORDING_CHANNELS]
    for (const row of indexed) {
      expect(RECORDING_SOURCES[row.sourceIndex]).toBeDefined()
    }
  })

  it('publica fuentes con enlace y publicador, sin repetir el enlace', () => {
    for (const source of RECORDING_SOURCES) {
      expect(source.label.trim()).not.toBe('')
      expect(source.publisher.trim()).not.toBe('')
      expect(source.url.startsWith('https://')).toBe(true)
    }
    const urls = RECORDING_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('fecha la verificación', () => {
    expect(RECORDING_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(RECORDING_VERIFIED_AT))).toBe(false)
  })
})

describe('las plataformas mandan al formulario de privacidad, no al botón de la app', () => {
  it('da una URL de reclamo para cada una', () => {
    expect(RECORDING_PLATFORMS.length).toBeGreaterThanOrEqual(4)
    for (const platform of RECORDING_PLATFORMS) {
      expect(platform.formUrl.startsWith('https://')).toBe(true)
      expect(platform.inApp.trim()).not.toBe('')
      expect(platform.asks.trim()).not.toBe('')
    }
  })

  it('no repite una plataforma ni un id', () => {
    const ids = RECORDING_PLATFORMS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('los cuatro casos son distintos entre sí', () => {
  it('tiene ids únicos y se resuelven por id', () => {
    const ids = RECORDING_CASES.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(recordingCase(id)?.id).toBe(id)
    expect(recordingCase('no-existe')).toBeNull()
  })

  it('marca como urgentes el contenido íntimo y el menor de edad, y sólo esos', () => {
    const urgent = RECORDING_CASES.filter(c => c.urgent).map(c => c.id)
    expect(urgent.sort()).toEqual(['intimo', 'menor'])
  })

  it('no le atribuye delito a la broma con un adulto en la vía pública', () => {
    // La honestidad del caso más común: grabar en la calle no está castigado por
    // sí solo, y prometer un delito manda al lector a una seccional a denunciar
    // algo que no está.
    expect(recordingCase('broma')?.crime).toBe('')
    expect(recordingCase('intimo')?.crime).toContain('19.580')
  })
})

describe('el texto del reclamo cambia con el caso elegido', () => {
  it('cita el artículo 92 y notifica a la plataforma cuando el contenido es íntimo', () => {
    const text = buildRemovalRequest(complete({ caseId: 'intimo', target: 'plataforma' }))
    expect(text).toContain('artículo 92 de la Ley 19.580')
    expect(text).toContain('quedan notificados')
  })

  it('cita el Código de la Niñez cuando la persona grabada es menor', () => {
    const text = buildRemovalRequest(complete({ caseId: 'menor', target: 'plataforma' }))
    expect(text).toContain('Código de la Niñez y la Adolescencia')
  })

  it('cita el artículo 21 de la Ley 9.739 cuando el uso es comercial', () => {
    const text = buildRemovalRequest(complete({ caseId: 'comercial', target: 'autor' }))
    expect(text).toContain('artículo 21 de la Ley 9.739')
    expect(text).toContain('puesto en el comercio')
  })

  it('no emite el mismo fundamento para dos casos distintos', () => {
    const texts = RECORDING_CASES.map(c =>
      buildRemovalRequest(complete({ caseId: c.id, target: 'plataforma' }))
    )
    expect(new Set(texts).size).toBe(texts.length)
  })
})

describe('el texto cambia con el destinatario', () => {
  it('le pone plazo al autor y le explica de dónde sale', () => {
    const text = buildRemovalRequest(complete({ target: 'autor' }))
    expect(text).toContain('RECLAMO POR PUBLICACIÓN DE MI IMAGEN SIN CONSENTIMIENTO')
    expect(text).toContain('cinco días hábiles')
    expect(text).toContain('artículo 15 de la Ley 18.331')
  })

  it('arma la denuncia de la URCDP con la cédula que exige su formulario', () => {
    const text = buildRemovalRequest(complete({ target: 'urcdp' }))
    expect(text).toContain('DENUNCIA ANTE LA UNIDAD REGULADORA')
    expect(text).toContain('Cédula de identidad: 1.234.567-8')
    expect(text).toContain('artículo 35 de la Ley 18.331')
  })

  it('le pide el retiro a la plataforma sin amenazarla con un plazo que no le corre', () => {
    const text = buildRemovalRequest(complete({ target: 'plataforma' }))
    expect(text).toContain('SOLICITUD DE RETIRO DE CONTENIDO')
    expect(text).not.toContain('cinco días hábiles')
  })

  it('habla en nombre del menor a cargo cuando se marca la casilla', () => {
    expect(buildRemovalRequest(complete({ onBehalfOfMinor: true }))).toContain(
      'la persona menor de edad a mi cargo'
    )
    expect(buildRemovalRequest(complete())).toContain('mi propia persona')
  })
})

describe('los huecos se ven antes de mandar', () => {
  it('marca lo que falta con [completar] y no inventa datos', () => {
    const text = buildRemovalRequest(emptyRecordingRequest())
    expect(text).toContain('[completar]')
    expect(text).not.toContain('undefined')
    expect(text).not.toContain('null')
  })

  it('exige la cédula sólo para la URCDP', () => {
    const sinCedula = complete({ idNumber: '' })
    expect(missingRecordingFields({ ...sinCedula, target: 'urcdp' })).toContain(
      'Tu cédula de identidad (la exige el formulario de la URCDP)'
    )
    expect(missingRecordingFields({ ...sinCedula, target: 'autor' })).toEqual([])
  })

  it('no le pide la plataforma al mensaje dirigido a la cuenta', () => {
    const sinPlataforma = complete({ platform: '' })
    expect(missingRecordingFields({ ...sinPlataforma, target: 'autor' })).toEqual([])
    expect(missingRecordingFields({ ...sinPlataforma, target: 'plataforma' })).toContain(
      'Plataforma'
    )
  })

  it('no declara nada pendiente cuando el formulario está completo', () => {
    expect(missingRecordingFields(complete({ target: 'urcdp' }))).toEqual([])
  })

  it('ignora el relleno de espacios', () => {
    expect(missingRecordingFields(complete({ videoUrl: '   ', target: 'autor' }))).toEqual([
      'Enlace del video',
    ])
  })
})

describe('los plazos y los pasos se pueden publicar', () => {
  it('pone el plazo más corto arriba de todo', () => {
    // Tres meses es el que se deja vencer discutiendo con un buzón de soporte.
    expect(RECORDING_DEADLINES[0]?.term).toBe('3 meses')
    expect(RECORDING_DEADLINES[0]?.what).toContain('334')
  })

  it('emite pasos y preguntas con contenido en las dos mitades', () => {
    expect(RECORDING_STEPS.length).toBeGreaterThanOrEqual(5)
    for (const step of RECORDING_STEPS) {
      expect(step.name.trim()).not.toBe('')
      expect(step.text.trim()).not.toBe('')
    }
    for (const faq of RECORDING_FAQS) {
      expect(faq.q.trim().endsWith('?')).toBe(true)
      expect(faq.a.trim().length).toBeGreaterThan(40)
    }
  })

  it('ofrece al menos una vía gratuita y sin abogado', () => {
    expect(RECORDING_CHANNELS.some(c => c.free && !c.needsLawyer)).toBe(true)
  })
})
