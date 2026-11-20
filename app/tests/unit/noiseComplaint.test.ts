import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  NOISE_CASES,
  NOISE_CHANNELS,
  NOISE_DEPARTMENTS,
  NOISE_FAQS,
  NOISE_FINES,
  NOISE_HOUR_RULES,
  NOISE_HOURS_ANSWER,
  NOISE_LIMITS,
  NOISE_NIGHT_LINE,
  NOISE_SOURCES,
  NOISE_STEPS,
  NOISE_TIPS,
  NOISE_VERIFIED_AT,
  buildNoiseComplaintText,
  emptyNoiseComplaint,
  missingRequiredFields,
  noiseChannelCost,
  noiseDepartmentCost,
  noiseDepartmentIdentity,
  type NoiseComplaintInput,
} from '../../utils/noiseComplaint'

const PAGE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'denunciar-ruidos-molestos-uruguay.vue'),
  'utf8'
)

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

  // The first version told a neighbour there was no channel at all and listed one
  // weekday office phone, while the searches that reach the page ask for a number
  // to call now. Both channels that answer at night are sourced, and neither may
  // drift away from the source that states it.
  it('leads with the two channels that answer while the noise is happening', () => {
    const [first, second] = NOISE_CHANNELS
    expect(first?.contact).toContain(NOISE_NIGHT_LINE)
    expect(first?.how).toMatch(/24 horas/)
    expect(NOISE_SOURCES[first!.sourceIndex]?.url).toMatch(/montevideo\.gub\.uy/)
    expect(second?.contact).toBe('911')
    expect(NOISE_SOURCES[second!.sourceIndex]?.url).toMatch(/17852-2004\/13$/)
  })

  it('answers the number and the 911 questions in the FAQ', () => {
    const text = NOISE_FAQS.map(faq => `${faq.q} ${faq.a}`).join(' ')
    expect(text).toContain(NOISE_NIGHT_LINE)
    expect(text).toMatch(/911/)
    expect(text).toMatch(/artículo 13/)
  })

  // A channel whose cost no source states must not be printed as free.
  it('words the cost column from what the source says, and only that', () => {
    const unstated = NOISE_CHANNELS.filter(channel => channel.free === null)
    expect(unstated.length).toBeGreaterThan(0)
    for (const channel of unstated) expect(noiseChannelCost(channel)).not.toMatch(/sin costo/i)
    for (const channel of NOISE_CHANNELS.filter(c => c.free === true)) {
      expect(noiseChannelCost(channel)).toBe('Sin costo')
    }
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

  // `sourceIndex` is positional: a source inserted in the middle would silently
  // re-point every claim below it at the wrong document.
  it('keeps the first ten sources in their original positions', () => {
    expect(NOISE_SOURCES.slice(0, 10).map(source => source.url)).toEqual([
      'https://www.impo.com.uy/bases/leyes/17852-2004',
      'https://tramites.montevideo.gub.uy/tramites-y-tributos/denuncia/molestias-ruidos-molestos-humo-y-olores',
      'https://montevideo.gub.uy/areas-tematicas/convivencia/ruidos-molestos',
      'https://normativa.montevideo.gub.uy/articulos/69048',
      'https://www.gub.uy/tramites/denuncias-ambiente',
      'https://montevideo.gub.uy/institucional/dependencias/servicio-de-convivencia-departamental',
      'https://montevideo.gub.uy/noticias/noche-de-la-nostalgia-2546-vehiculos-fiscalizados-y-129-inspecciones',
      'https://www.impo.com.uy/bases/leyes/17852-2004/13',
      'https://www.impo.com.uy/bases/leyes/17852-2004/10',
      'https://www.gub.uy/ministerio-interior/sites/ministerio-interior/files/documentos/publicaciones/GuiaDeRecursos2025finalizado.pdf',
    ])
  })

  it('points the Buzón Ciudadano at its own page, with its WhatsApp line', () => {
    const buzon = NOISE_CHANNELS.find(channel => channel.id === 'buzon')
    expect(buzon?.url).toBe('https://montevideo.gub.uy/buzon-ciudadano')
    expect(buzon?.contact).toContain('099 019500')
    expect(buzon?.how).toMatch(/8\.00 a 19\.00/)
  })

  it('offers the free neighbour mediation of the Defensoría', () => {
    const defensoria = NOISE_CHANNELS.find(channel => channel.id === 'defensoria')
    expect(defensoria?.free).toBe(true)
    expect(defensoria?.scope).toMatch(/mediación/)
    expect(defensoria?.contact).toContain('098 187 301')
    expect(NOISE_SOURCES[defensoria!.sourceIndex]?.url).toMatch(/gub\.uy/)
  })
})

describe('the case table', () => {
  it('backs every case with at least one existing source', () => {
    expect(NOISE_CASES.length).toBeGreaterThanOrEqual(5)
    for (const row of NOISE_CASES) {
      expect(row.sourceIndexes.length).toBeGreaterThan(0)
      for (const index of row.sourceIndexes) expect(NOISE_SOURCES[index]).toBeDefined()
      for (const cell of [row.who, row.now, row.repeated, row.norm]) {
        expect(cell.trim()).not.toBe('')
      }
    }
  })

  it('sends a neighbour to the night line and to 911', () => {
    const vecino = NOISE_CASES.find(row => row.id === 'vecino')
    expect(vecino?.now).toContain(NOISE_NIGHT_LINE)
    expect(vecino?.now).toContain('911')
  })

  it('answers the building case from the horizontal-property law', () => {
    const edificio = NOISE_CASES.find(row => row.id === 'edificio')
    expect(edificio?.norm).toContain('Ley 10.751')
    expect(edificio?.sourceIndexes.map(i => NOISE_SOURCES[i]?.url)).toContain(
      'https://www.impo.com.uy/bases/leyes/10751-1946/9'
    )
  })
})

describe('the hours and the fines', () => {
  it('answers "hasta qué hora" before any table', () => {
    expect(NOISE_HOURS_ANSWER).toMatch(/^No hay una hora/)
    expect(NOISE_HOURS_ANSWER).toMatch(/sábados, domingos o feriados/)
  })

  it('backs every hour rule with a source', () => {
    expect(NOISE_HOUR_RULES.some(rule => rule.place === 'Montevideo')).toBe(true)
    expect(NOISE_HOUR_RULES.some(rule => rule.place === 'Maldonado')).toBe(true)
    for (const rule of NOISE_HOUR_RULES) {
      expect(NOISE_SOURCES[rule.sourceIndex]).toBeDefined()
      expect(rule.rule.trim()).not.toBe('')
      expect(rule.when.trim()).not.toBe('')
    }
  })

  // The fines are published in UR, never multiplied into pesos here: the UR moves
  // every month and a converted figure would age the day it is written.
  it('states every fine in UR, with its jurisdiction and source', () => {
    expect(NOISE_FINES.length).toBeGreaterThanOrEqual(8)
    for (const fine of NOISE_FINES) {
      expect(['Montevideo', 'Maldonado']).toContain(fine.jurisdiction)
      expect(fine.amount).toMatch(/UR|duplica/i)
      expect(fine.amount).not.toMatch(/\$/)
      expect(NOISE_SOURCES[fine.sourceIndex]).toBeDefined()
    }
    const excessive = NOISE_FINES.find(fine => fine.offence.startsWith('Ruidos excesivos'))
    expect(excessive?.amount).toMatch(/2 UR.*7 UR.*15 UR/)
  })
})

describe('the departments outside Montevideo', () => {
  it('lists exactly the five departments with a verified channel', () => {
    expect(NOISE_DEPARTMENTS.map(d => d.id)).toEqual([
      'canelones',
      'maldonado',
      'salto',
      'rivera',
      'lavalleja',
    ])
  })

  it('links every department to an official page, with channel and hours', () => {
    for (const department of NOISE_DEPARTMENTS) {
      expect(department.url).toMatch(/^https:\/\/([a-z.]+\.)?gub\.uy\//)
      expect(NOISE_SOURCES[department.sourceIndex]?.url).toBe(department.url)
      expect(department.where.trim()).not.toBe('')
      expect(department.when.trim()).not.toBe('')
      expect(department.asks.trim()).not.toBe('')
    }
  })

  it('carries the numbers each Intendencia publishes', () => {
    const byId = Object.fromEntries(NOISE_DEPARTMENTS.map(d => [d.id, d]))
    expect(byId.canelones?.where).toContain('1828')
    expect(byId.canelones?.when).toContain('24 horas')
    expect(byId.maldonado?.where).toContain('4222 3333')
    expect(byId.salto?.where).toContain('092 343 985')
    expect(byId.rivera?.where).toMatch(/no toma denuncias por teléfono/i)
    expect(byId.lavalleja?.fee).toBe('$ 150')
  })

  // The "no phone complaints" claim is only on the Intendencia's own site, so the
  // row must point there too, not only at its gub.uy procedure page.
  it('ties Rivera’s phone claim to the page that states it', () => {
    const rivera = NOISE_DEPARTMENTS.find(d => d.id === 'rivera')
    const urls = (rivera?.extraSourceIndexes ?? []).map(i => NOISE_SOURCES[i]?.url)
    expect(urls).toContain('https://www.rivera.gub.uy/medioambiente/informacion/contaminacion/')
    for (const department of NOISE_DEPARTMENTS) {
      for (const index of department.extraSourceIndexes ?? [])
        expect(NOISE_SOURCES[index]).toBeDefined()
    }
  })

  // The Ministerio form does not list noise among its subjects (gap 2 in the
  // header); every place that offers it as a route must say so.
  it('never offers the Ministerio form as a noise channel without the gap', () => {
    const online = NOISE_FAQS.find(f => /por internet/.test(f.q))
    expect(online?.a).toMatch(/no nombra el ruido/)
  })

  // D.2014.1 punishes only arts. D.2011.1-3; licensed venues of categories A, B
  // and C are sanctioned under D.3146.54, which the page does not publish.
  it('scopes the 10 UR fine to the articles it punishes', () => {
    const baile = NOISE_FINES.find(f => /10 UR/.test(f.amount))
    expect(baile?.offence).toContain('D.2011.1 a D.2011.3')
    const fineFaq = NOISE_FAQS.find(f => /multa/.test(f.q))
    expect(fineFaq?.a).toContain('D.3146.54')
  })

  it('words the cost from what the source says, and only that', () => {
    const byId = Object.fromEntries(NOISE_DEPARTMENTS.map(d => [d.id, d]))
    expect(noiseDepartmentCost(byId.canelones!)).toBe('Sin costo')
    expect(noiseDepartmentCost(byId.salto!)).toBe('No lo publica')
    expect(noiseDepartmentCost(byId.lavalleja!)).toBe('Con costo: $ 150')
  })

  it('says which departments ask for your identity and which do not publish it', () => {
    const byId = Object.fromEntries(NOISE_DEPARTMENTS.map(d => [d.id, d]))
    for (const id of ['canelones', 'rivera', 'lavalleja']) {
      expect(noiseDepartmentIdentity(byId[id]!)).toMatch(/^Pide/)
    }
    for (const id of ['maldonado', 'salto']) {
      expect(noiseDepartmentIdentity(byId[id]!)).toMatch(/^No publica/)
    }
  })

  it('answers the new questions in the FAQ', () => {
    const text = NOISE_FAQS.map(faq => `${faq.q} ${faq.a}`).join(' ')
    for (const needle of ['099 019500', '1828', '4222 3333', 'Ley 10.751', 'UR', 'mediación']) {
      expect(text).toContain(needle)
    }
  })
})

describe('the page', () => {
  it('renders the four new sections', () => {
    for (const id of ['segun-el-caso', 'horarios', 'multas', 'otros-departamentos']) {
      expect(PAGE).toContain(`id="${id}"`)
    }
  })

  // A VExpansionPanelText without `eager` ships an empty body in the server HTML:
  // the answers then exist only inside the JSON-LD, for crawlers and readers alike.
  it('server-renders every FAQ answer', () => {
    const panels = PAGE.match(/<VExpansionPanelText[^>]*>/g) ?? []
    expect(panels.length).toBeGreaterThan(0)
    for (const tag of panels) expect(tag).toMatch(/\beager\b/)
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

  // The 45/39 dB(A) figures are the Montevideo limit. A denuncia filed in another
  // department must not invoke a norm that does not rule there.
  it('drops the Montevideo limit when the reader files outside Montevideo', () => {
    const outside = buildNoiseComplaintText(input({ outsideMontevideo: true }))
    expect(outside).not.toContain('Intendencia de Montevideo')
    expect(outside).not.toContain('45 dB(A)')
    expect(outside).toMatch(/medición del nivel de ruido/i)
    const inside = buildNoiseComplaintText(input())
    expect(inside).toContain('45 dB(A)')
    expect(inside).toContain('Intendencia de Montevideo')
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
