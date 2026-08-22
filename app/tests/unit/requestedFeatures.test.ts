// El catálogo de lo que se hizo a pedido.
//
// Los tests cuidan las dos reglas que hacen publicable a la página: cada entrada
// tiene que poder comprobarse (un enlace a la cosa terminada) y ninguna puede
// filtrar quién pidió qué.
import { describe, expect, it } from 'vitest'

import {
  REQUESTED_FEATURES,
  REQUEST_CHANNELS,
  featuresByChannel,
  shippedLabel,
  turnaroundDays,
  turnaroundLabel,
} from '../../utils/requestedFeatures'

describe('catálogo', () => {
  it('tiene entradas, todas con id único', () => {
    expect(REQUESTED_FEATURES.length).toBeGreaterThan(2)
    const ids = REQUESTED_FEATURES.map(feature => feature.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('siempre enlaza a algo que se puede abrir y mirar', () => {
    for (const feature of REQUESTED_FEATURES) {
      expect(feature.links.length, feature.id).toBeGreaterThan(0)
      for (const link of feature.links) {
        expect(Boolean(link.to || link.href), `${feature.id}: enlace sin destino`).toBe(true)
        expect(link.label.length).toBeGreaterThan(2)
        if (link.to) expect(link.to.startsWith('/')).toBe(true)
        if (link.href) expect(link.href.startsWith('https://')).toBe(true)
      }
    }
  })

  it('cuenta qué se pidió y qué se hizo, con lo no obvio de cada uno', () => {
    for (const feature of REQUESTED_FEATURES) {
      expect(feature.asked.length, feature.id).toBeGreaterThan(40)
      expect(feature.built.length, feature.id).toBeGreaterThan(40)
      expect(feature.insight.length, feature.id).toBeGreaterThan(60)
    }
  })

  it('no publica un dato que identifique a quien pidió', () => {
    // La regla es de la Ley 18.331: se publica el pedido, no la persona. Un
    // correo o un @usuario acá serían una comunicación de datos sin
    // consentimiento; el test es barato y el descuido es fácil.
    const text = REQUESTED_FEATURES.map(
      feature => `${feature.title} ${feature.asked} ${feature.built} ${feature.insight}`
    ).join(' ')
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
    expect(text).not.toMatch(/(^|\s)@\w{3,}/)
  })

  it('está ordenado del más nuevo al más viejo', () => {
    const dates = REQUESTED_FEATURES.map(feature => feature.shippedOn)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it('usa canales declarados y todos tienen etiqueta', () => {
    for (const feature of REQUESTED_FEATURES) {
      expect(REQUEST_CHANNELS[feature.channel], feature.id).toBeTruthy()
    }
    for (const channel of Object.values(REQUEST_CHANNELS)) {
      expect(channel.label.length).toBeGreaterThan(3)
      expect(channel.note.length).toBeGreaterThan(20)
    }
  })

  it('agrupa por canal sin perder ni duplicar entradas', () => {
    const grouped = (['correo', 'issue', 'publico'] as const).flatMap(channel =>
      featuresByChannel(channel)
    )
    expect(grouped).toHaveLength(REQUESTED_FEATURES.length)
  })
})

describe('tiempos', () => {
  const base = REQUESTED_FEATURES[0]

  it('cuenta los días entre el pedido y la publicación', () => {
    expect(turnaroundDays({ ...base, askedOn: '2026-08-20', shippedOn: '2026-08-20' })).toBe(0)
    expect(turnaroundDays({ ...base, askedOn: '2026-08-21', shippedOn: '2026-08-22' })).toBe(1)
    expect(turnaroundDays({ ...base, askedOn: '2024-03-28', shippedOn: '2025-06-15' })).toBe(444)
  })

  it('no inventa un plazo cuando no se sabe cuándo llegó el pedido', () => {
    expect(turnaroundDays({ ...base, askedOn: undefined })).toBeNull()
    expect(turnaroundLabel({ ...base, askedOn: undefined })).toBeNull()
  })

  it('no acepta una publicación anterior al pedido', () => {
    expect(turnaroundDays({ ...base, askedOn: '2026-08-22', shippedOn: '2026-08-20' })).toBeNull()
  })

  it('dice el plazo en la unidad que un lector entiende', () => {
    expect(turnaroundLabel({ ...base, askedOn: '2026-08-20', shippedOn: '2026-08-20' })).toBe(
      'el mismo día'
    )
    expect(turnaroundLabel({ ...base, askedOn: '2026-08-21', shippedOn: '2026-08-22' })).toBe(
      'al día siguiente'
    )
    expect(turnaroundLabel({ ...base, askedOn: '2026-08-01', shippedOn: '2026-08-04' })).toBe(
      'en 3 días'
    )
    expect(turnaroundLabel({ ...base, askedOn: '2026-01-01', shippedOn: '2026-04-01' })).toBe(
      'en 3 meses'
    )
    expect(turnaroundLabel({ ...base, askedOn: '2026-01-01', shippedOn: '2026-02-01' })).toBe(
      'en 1 mes'
    )
    expect(turnaroundLabel({ ...base, askedOn: '2024-03-28', shippedOn: '2025-06-15' })).toBe(
      'en 1 año'
    )
  })

  it('escribe la fecha en español, sin ceros a la izquierda', () => {
    expect(shippedLabel({ ...base, shippedOn: '2026-08-22' })).toBe('22 de agosto de 2026')
    expect(shippedLabel({ ...base, shippedOn: '2026-09-01' })).toBe('1 de setiembre de 2026')
  })
})
