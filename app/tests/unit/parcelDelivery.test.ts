// Guardarraíl de /donde-te-entregan-el-paquete-uruguay.
//
// La página contesta una pregunta que en r/uruguay se hace desde 2019 y nunca tuvo respuesta. El
// riesgo no es que se rompa el render: es que se publique como derecho algo que sólo dice un
// courier en su centro de ayuda, o que se afirme un plazo que el Correo no publica.
import { describe, expect, it } from 'vitest'

import {
  ADDRESS_RISKS,
  DELIVERY_DEADLINES,
  DELIVERY_OPTIONS,
  PARCEL_DELIVERY_FAQS,
  PARCEL_DELIVERY_SOURCES,
  PARCEL_DELIVERY_VERIFIED_AT,
  deadlinesFor,
  optionsForChannel,
  parcelDeliveryAnswer,
  type DeliveryChannel,
  type DeliveryStage,
} from '../../utils/parcelDelivery'

const CHANNELS: DeliveryChannel[] = ['correo-simple', 'correo-ems', 'courier']
const STAGES: DeliveryStage[] = ['antes-de-comprar', 'en-camino', 'aviso', 'retenido']

const OFFICIAL_HOSTS = ['impo.com.uy', 'aduanas.gub.uy', 'gub.uy', 'correo.com.uy', 'casillamia.uy']

describe('el catálogo de vías', () => {
  it('tiene ids únicos y todos declaran al menos un canal', () => {
    const ids = DELIVERY_OPTIONS.map(o => o.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const option of DELIVERY_OPTIONS) {
      expect(option.channels.length).toBeGreaterThan(0)
      expect(option.detail.length).toBeGreaterThan(80)
      expect(option.sources.length).toBeGreaterThan(0)
    }
  })

  it('cada fuente declara su origen y apunta a algún lado', () => {
    const all = [
      ...DELIVERY_OPTIONS.flatMap(o => o.sources),
      ...ADDRESS_RISKS.flatMap(r => r.sources),
      ...DELIVERY_DEADLINES.flatMap(d => d.sources),
      ...PARCEL_DELIVERY_SOURCES,
    ]
    for (const source of all) {
      expect(['norma', 'operador', 'practica']).toContain(source.kind)
      expect(source.url).toMatch(/^https?:\/\//)
    }
  })

  // La distinción es el punto entero de la página: lo que publica un courier lo puede cambiar
  // mañana, y lo que cuenta alguien en Reddit no es un derecho. Si una fuente de práctica se
  // colara como norma, la página estaría prometiendo algo que nadie tiene que cumplir.
  it('sólo etiqueta como norma lo que sale de una fuente normativa', () => {
    const normas = [
      ...DELIVERY_OPTIONS.flatMap(o => o.sources),
      ...ADDRESS_RISKS.flatMap(r => r.sources),
      ...DELIVERY_DEADLINES.flatMap(d => d.sources),
    ].filter(s => s.kind === 'norma')
    for (const source of normas) {
      const host = new URL(source.url).hostname.replace(/^www\./, '')
      expect(
        OFFICIAL_HOSTS.some(o => host === o || host.endsWith(`.${o}`)),
        `${source.url} está etiquetada como norma pero no es fuente normativa`
      ).toBe(true)
    }
  })

  it('marca como práctica todo lo que sale de Reddit', () => {
    const reddit = [
      ...DELIVERY_OPTIONS.flatMap(o => o.sources),
      ...ADDRESS_RISKS.flatMap(r => r.sources),
      ...DELIVERY_DEADLINES.flatMap(d => d.sources),
    ].filter(s => s.url.includes('reddit.com'))
    expect(reddit.length).toBeGreaterThan(0)
    for (const source of reddit) expect(source.kind).toBe('practica')
  })
})

describe('la respuesta por canal y momento', () => {
  it('responde algo accionable para las doce combinaciones', () => {
    for (const channel of CHANNELS) {
      for (const stage of STAGES) {
        const answer = parcelDeliveryAnswer(channel, stage)
        expect(answer.headline.length).toBeGreaterThan(30)
        expect(answer.steps.length).toBeGreaterThanOrEqual(3)
        expect(['si', 'depende', 'no', 'sin-fuente']).toContain(answer.verdict)
      }
    }
  })

  // El hallazgo central: por courier el retiro en un punto existe y está publicado; por el Correo,
  // no. Si algún día alguien "suaviza" el no del Correo, esto se cae.
  it('dice que NO por el Correo y que SÍ por courier antes de comprar', () => {
    expect(parcelDeliveryAnswer('correo-simple', 'antes-de-comprar').verdict).toBe('no')
    expect(parcelDeliveryAnswer('correo-ems', 'antes-de-comprar').verdict).toBe('no')
    expect(parcelDeliveryAnswer('courier', 'antes-de-comprar').verdict).toBe('si')
  })

  // El Correo no publica el plazo de guarda: el único dato que existe es el papelito. Decir un
  // número como si fuera regla sería inventar.
  it('admite que no hay fuente para el plazo del Correo cuando te dejaron el aviso', () => {
    expect(parcelDeliveryAnswer('correo-simple', 'aviso').verdict).toBe('sin-fuente')
    expect(parcelDeliveryAnswer('courier', 'aviso').verdict).toBe('si')
  })

  it('ofrece el retiro en punto sólo en el canal donde existe', () => {
    const courier = optionsForChannel('courier').map(o => o.id)
    const correo = optionsForChannel('correo-simple').map(o => o.id)
    expect(courier).toContain('pickup-courier')
    expect(correo).not.toContain('pickup-courier')
    expect(correo).toContain('casilla-correo')
  })

  it('hace correr los plazos de la norma en todo momento posterior a la compra', () => {
    for (const channel of CHANNELS) {
      const ids = deadlinesFor(channel, 'retenido').map(d => d.id)
      expect(ids).toContain('art14-30')
      expect(ids).toContain('art14-90')
      expect(ids).toContain('talon-30')
    }
    expect(deadlinesFor('correo-simple', 'antes-de-comprar')).toEqual([])
  })
})

describe('la distinción que sostiene la página', () => {
  // Cambiar el LUGAR no rompe la franquicia; cambiar el NOMBRE sí. Es lo que nadie publica y lo
  // único que puede hacerle perder plata al lector.
  it('separa cambiar la dirección de cambiar el destinatario', () => {
    const direccion = DELIVERY_OPTIONS.find(o => o.id === 'otra-direccion')!
    const nombre = DELIVERY_OPTIONS.find(o => o.id === 'a-nombre-de-otro')!
    expect(direccion.verdict).toBe('si')
    expect(nombre.verdict).toBe('no')

    const riesgoDireccion = ADDRESS_RISKS.find(r => r.id === 'otra-direccion-ok')!
    expect(riesgoDireccion.cost).toMatch(/sin costo/i)
    const riesgoNombre = ADDRESS_RISKS.find(r => r.id === 'otro-nombre')!
    expect(riesgoNombre.cost).toMatch(/60%/)
  })

  it('no promete franquicia a quien no tiene cédula uruguaya, pero tampoco le cierra la puerta', () => {
    const sinCedula = ADDRESS_RISKS.find(r => r.id === 'sin-cedula')!
    expect(sinCedula.consequence).toMatch(/60%|prestación única/i)
  })
})

describe('las preguntas', () => {
  it('responde en serio, no con una línea', () => {
    expect(PARCEL_DELIVERY_FAQS.length).toBeGreaterThanOrEqual(6)
    for (const faq of PARCEL_DELIVERY_FAQS) {
      expect(faq.q.endsWith('?')).toBe(true)
      expect(faq.a.length).toBeGreaterThan(150)
    }
  })

  it('declara cuándo se verificó', () => {
    expect(PARCEL_DELIVERY_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
