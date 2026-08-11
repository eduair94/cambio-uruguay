import { describe, expect, it } from 'vitest'

import {
  MEANS_OF_LIVING_RULE,
  MERCOSUR_COUNTRIES,
  RESIDENCY_FAQ,
  RESIDENCY_FEE_EXEMPT,
  RESIDENCY_FEE_UI,
  RESIDENCY_KINDS,
  RESIDENCY_NOT_THE_SAME,
  RESIDENCY_PATHS,
  RESIDENCY_SOURCES,
  RESIDENCY_WHERE,
} from '../../utils/residency'

const path = (id: string) => RESIDENCY_PATHS.find(p => p.id === id)!

describe('las dos residencias que no son la misma', () => {
  it('separa la legal de la fiscal, con su organismo', () => {
    expect(RESIDENCY_KINDS).toHaveLength(2)
    const legal = RESIDENCY_KINDS.find(k => k.id === 'legal')!
    const fiscal = RESIDENCY_KINDS.find(k => k.id === 'fiscal')!
    expect(legal.organism).toMatch(/Migraci[oó]n/i)
    expect(fiscal.organism).toMatch(/DGI/)
  })

  it('manda la parte fiscal a la página que ya la desarrolla', () => {
    const fiscal = RESIDENCY_KINDS.find(k => k.id === 'fiscal')!
    expect(fiscal.to).toBe('/impuestos-inversiones-uruguay')
  })

  it('lo dice explícito y citable', () => {
    expect(RESIDENCY_NOT_THE_SAME).toMatch(/dos cosas distintas/i)
    expect(RESIDENCY_NOT_THE_SAME).toMatch(/sin tener residencia legal/i)
  })
})

describe('el dato que corrige la creencia más extendida', () => {
  // Publicar un umbral inventado sería exactamente lo que la gente ya hace en los hilos.
  it('dice que NO hay monto mínimo publicado', () => {
    expect(MEANS_OF_LIVING_RULE).toMatch(/no hay un monto m[ií]nimo/i)
    expect(MEANS_OF_LIVING_RULE).toMatch(/medios de vida/i)
  })

  it('no publica ninguna cifra de ingreso exigido', () => {
    const faq = RESIDENCY_FAQ.find(f => /ingreso tengo que demostrar/i.test(f.question))!
    expect(faq.answer).toMatch(/no publica un umbral|no hay un monto/i)
    // Ni un importe en dólares o pesos disfrazado de requisito.
    expect(faq.answer).not.toMatch(/US\$\s?\d|\$\s?\d{3,}/)
  })
})

describe('vías de residencia', () => {
  it('cubre las tres vías', () => {
    expect(RESIDENCY_PATHS).toHaveLength(3)
    expect(RESIDENCY_PATHS.map(p => p.id)).toContain('mercosur-temporaria')
    expect(RESIDENCY_PATHS.map(p => p.id)).toContain('no-mercosur-permanente')
  })

  it('la temporaria MERCOSUR declara su duración y la permanente no', () => {
    expect(path('mercosur-temporaria').duration).toMatch(/2 años/)
    expect(path('mercosur-permanente').duration).toBeNull()
  })

  // La diferencia práctica entre las vías: medios de vida y carné de salud sólo en no-MERCOSUR.
  it('sólo la vía no MERCOSUR exige medios de vida y carné de salud', () => {
    const noMerco = path('no-mercosur-permanente').requirements.join(' ')
    const merco = path('mercosur-temporaria').requirements.join(' ')
    expect(noMerco).toMatch(/medios de vida/i)
    expect(noMerco).toMatch(/carn[eé] de salud/i)
    expect(merco).not.toMatch(/medios de vida/i)
  })

  it('todas piden antecedentes penales apostillados', () => {
    for (const p of RESIDENCY_PATHS) {
      const all = p.requirements.join(' ')
      if (p.id === 'mercosur-permanente') continue // se apoya en la base de la temporaria
      expect(all).toMatch(/antecedentes penales/i)
      expect(all).toMatch(/apostillad/i)
    }
  })

  it('los once países MERCOSUR y asociados están listados', () => {
    expect(MERCOSUR_COUNTRIES).toHaveLength(11)
    for (const c of ['Argentina', 'Brasil', 'Venezuela', 'Guyana']) {
      expect(MERCOSUR_COUNTRIES).toContain(c)
    }
  })
})

describe('costo y lugar', () => {
  it('el costo está en UI, no en pesos', () => {
    expect(RESIDENCY_FEE_UI).toBeCloseTo(557.3, 1)
    const faq = RESIDENCY_FAQ.find(f => /cu[aá]nto sale/i.test(f.question))!
    expect(faq.answer).toMatch(/Unidades Indexadas/i)
    expect(faq.answer).toMatch(/cambia con el valor/i)
  })

  it('declara las exenciones', () => {
    expect(RESIDENCY_FEE_EXEMPT).toContain('Brasil')
    expect(RESIDENCY_FEE_EXEMPT).toContain('Paraguay')
  })

  // Mucha gente lo intenta desde afuera y pierde el viaje.
  it('aclara que el trámite se completa en Uruguay', () => {
    expect(RESIDENCY_WHERE).toMatch(/se hace en Uruguay/i)
    expect(RESIDENCY_WHERE).toMatch(/presencial/i)
  })
})

describe('la cédula, que era el agujero', () => {
  const cedulaFaqs = RESIDENCY_FAQ.filter(f => /c[eé]dula/i.test(f.question))

  it('el FAQ ahora habla de la cédula (antes aparecía una sola vez, de pasada)', () => {
    expect(cedulaFaqs.length).toBeGreaterThanOrEqual(2)
  })

  // El dato que desarma la secuencia mental de los hilos: no hay que esperar a la residencia.
  it('dice que el certificado de residencia EN TRÁMITE alcanza', () => {
    const f = RESIDENCY_FAQ.find(f => /esperar a que salga la residencia/i.test(f.question))!
    expect(f.short).toMatch(/tr[aá]mite/i)
    expect(f.answer).toMatch(/Certificado de Residencia en trámite/i)
    expect(f.answer).toMatch(/Dirección Nacional de Migración/i)
    // No se puede leer como «necesitás la definitiva».
    expect(f.answer).toMatch(/no necesit[aá]s tener resuelta/i)
  })

  it('la vía legal deja claro que la cédula no espera al final del trámite', () => {
    const legal = RESIDENCY_KINDS.find(k => k.id === 'legal')!
    expect(legal.effect).toMatch(/c[eé]dula no espera/i)
  })

  // ACÁ ESTÁ LA CORRECCIÓN, Y ES UNA AUSENCIA FALSA QUE ESTUVO PUBLICADA: el plazo SÍ existe y SÍ
  // rige. gub.uy no lo pone en la ficha del trámite, pero la cadena normativa sí: el Decreto-Ley
  // 14.193 fue derogado por el DL 14.762 (art. 48), y su reglamento 583/975 quedó sustituido por
  // el Decreto 501/978, reglamentario del 14.762 y vigente en IMPO («Documento Actualizado», sin
  // nota de derogación). Su art. 15 crea la cédula provisoria, y el Decreto 208/013 art. 1 elevó
  // la vigencia inicial a DOS años, «pudiendo renovarse hasta en dos oportunidades, por el plazo
  // de un año cada una». La versión anterior de esta página se quedó en el eslabón derogado y
  // publicó «no está publicado»: quedarse en la norma derogada de una cadena no es una ausencia,
  // es un error de lectura. Este test la fija.
  it('publica el plazo vigente de la cédula provisoria, no la ausencia falsa', () => {
    const f = RESIDENCY_FAQ.find(f => /cu[aá]nto dura la c[eé]dula/i.test(f.question))!
    expect(f.short).toMatch(/dos años/i)
    expect(f.answer).toMatch(/501\/978/)
    expect(f.answer).toMatch(/208\/013/)
    expect(f.answer).toMatch(/dos años/i)
    expect(f.answer).toMatch(/hasta en dos oportunidades/i)
    // Y no vuelve a decir que el plazo no está publicado, ni cuelga la respuesta del eslabón muerto.
    expect(f.short).not.toMatch(/no publica un plazo/i)
    expect(f.answer).not.toMatch(/no est[aá] publicado/i)
    expect(f.answer).not.toMatch(/583\/975|14\.193/)
  })

  // La regla práctica que la página inventaba: «la cédula sigue a tu expediente». La fuente sólo
  // dice qué papel hay que presentar AL renovar; el plazo del 208/013 es fijo y corre solo.
  it('no ata la vigencia de la cédula al expediente de Migración', () => {
    const f = RESIDENCY_FAQ.find(f => /cu[aá]nto dura la c[eé]dula/i.test(f.question))!
    expect(f.short).not.toMatch(/sigue a tu expediente/i)
    expect(f.answer).not.toMatch(/sigue a(l| tu) expediente/i)
    expect(f.answer).toMatch(/no depende de cu[aá]ndo|con independencia/i)
  })

  // Ninguna de las dos fichas de gub.uy dice qué paso demora más. Lo que SÍ publican son los
  // plazos de retiro, así que la respuesta se apoya en eso y no en una impresión de foro.
  it('no publica una impresión sobre qué paso del trámite demora más', () => {
    const f = RESIDENCY_FAQ.find(f => /esperar a que salga la residencia/i.test(f.question))!
    expect(f.answer).not.toMatch(/suele ser el paso que demora/i)
    expect(f.answer).toMatch(/5 d[ií]as h[aá]biles/)
    expect(f.answer).toMatch(/90 d[ií]as/)
  })

  // La parte bancaria es política comercial de cada banco, no norma: no la contestamos.
  it('no promete qué banco abre cuenta con qué papel', () => {
    for (const f of RESIDENCY_FAQ) {
      expect(f.answer).not.toMatch(
        /con la c[eé]dula (ya )?(pod[eé]s|vas a poder) abrir (una )?cuenta/i
      )
    }
  })

  it('la fuente del trámite de cédula está citada', () => {
    const urls = RESIDENCY_SOURCES.map(s => s.url).join(' ')
    expect(urls).toMatch(/documento-nacional-identidad-primera-vez/)
    expect(urls).toMatch(/documento-nacional-identidad-renovacion/)
  })

  // Y las dos normas del plazo, por su texto VIGENTE. La trampa de IMPO: `/bases/decretos/` es el
  // actualizado y `/bases/…-originales/` es el original, que puede decir lo contrario.
  it('cita las dos normas del plazo, por el texto vigente de IMPO', () => {
    const urls = RESIDENCY_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('impo.com.uy/bases/decretos/501-1978/15')
    expect(urls).toContain('impo.com.uy/bases/decretos/208-2013')
    expect(urls).not.toMatch(/-originales\//)
  })
})

describe('integridad', () => {
  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(RESIDENCY_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of RESIDENCY_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })

  it('toda fuente es oficial', () => {
    expect(RESIDENCY_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of RESIDENCY_SOURCES) {
      // gub.uy para los trámites, impo.com.uy (IMPO, el diario oficial) para las normas.
      expect(s.url).toMatch(/^https:\/\/([\w.]+\.)?(gub\.uy|minterior\.gub\.uy|impo\.com\.uy)/)
    }
  })
})
