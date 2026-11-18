import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  BCU_CANNOT,
  BCU_CANNOT_WHERE,
  FIRST_STEP_RULE,
  ROUTING_BODIES,
  ROUTING_FAQ,
} from '../../utils/complaintRouting'

const body = (id: string) => ROUTING_BODIES.find(b => b.id === id)!

describe('el ruteo, que es lo que la página aporta', () => {
  it('cubre los cinco organismos', () => {
    expect(ROUTING_BODIES.map(b => b.id).sort()).toEqual(
      ['bcu', 'dnc', 'mtss', 'ursea', 'ursec'].sort()
    )
  })

  it('Defensa del Consumidor va primero: es el default', () => {
    expect(ROUTING_BODIES[0].id).toBe('dnc')
  })

  it('cada organismo dice qué cubre y adónde ir', () => {
    for (const b of ROUTING_BODIES) {
      expect(b.covers.length).toBeGreaterThanOrEqual(3)
      expect(b.url).toMatch(/^https:\/\//)
      expect(b.fullName.length).toBeGreaterThan(b.name.length)
    }
  })

  // El ruteo sólo sirve si los sectores no se pisan.
  it('los servicios regulados van a su regulador, no a Defensa del Consumidor', () => {
    expect(body('ursea').covers.join(' ')).toMatch(/UTE|OSE/)
    expect(body('ursec').covers.join(' ')).toMatch(/Antel|internet/i)
    expect(body('bcu').covers.join(' ')).toMatch(/banco|aseguradora/i)
    expect(body('mtss').covers.join(' ')).toMatch(/sueldo|despido/i)
    expect(body('dnc').covers.join(' ')).not.toMatch(/UTE|Antel|aseguradora/i)
  })
})

describe('plazos', () => {
  // No son el mismo plazo y confundirlos hace perder la instancia.
  it('URSEA son días hábiles y el BCU días corridos', () => {
    expect(body('ursea').waitAfterProvider).toBe('15 días hábiles')
    expect(body('bcu').waitAfterProvider).toBe('15 días corridos')
    expect(body('ursea').waitAfterProvider).not.toBe(body('bcu').waitAfterProvider)
  })

  // URSEC no se verificó en fuente uruguaya: se publica el organismo, no un plazo inventado.
  it('no inventa el plazo de URSEC', () => {
    expect(body('ursec').waitAfterProvider).toBeNull()
  })

  it('el FAQ distingue los dos plazos sin mezclarlos', () => {
    const f = ROUTING_FAQ.find(x => /esperar antes de escalar/i.test(x.question))!
    expect(f.answer).toMatch(/15 días hábiles/)
    expect(f.answer).toMatch(/15 días corridos/)
  })
})

describe('el paso que cierra la puerta si se saltea', () => {
  it('exige reclamar primero a la empresa y guardar el número', () => {
    expect(FIRST_STEP_RULE).toMatch(/n[uú]mero de reclamo/i)
    expect(FIRST_STEP_RULE).toMatch(/constancia/i)
  })
})

describe('lo que el BCU NO puede hacer', () => {
  // Es la expectativa mal puesta que hace perder meses.
  it('lista las cuatro cosas que el BCU no puede ordenar', () => {
    expect(BCU_CANNOT.length).toBeGreaterThanOrEqual(4)
    const all = BCU_CANNOT.join(' ')
    expect(all).toMatch(/consumo desconocido|cajero/i)
    expect(all).toMatch(/Central de Riesgos/i)
    expect(all).toMatch(/da[ñn]os y perjuicios/i)
  })

  it('dice dónde sí se resuelve, en vez de dejar al lector sin salida', () => {
    expect(BCU_CANNOT_WHERE).toMatch(/Justicia|jurisdiccional/i)
    expect(BCU_CANNOT_WHERE).toMatch(/no significa que no tengas derecho/i)
  })
})

describe('integridad', () => {
  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(ROUTING_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const f of ROUTING_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })

  it('todos los enlaces son oficiales', () => {
    for (const b of ROUTING_BODIES) {
      expect(b.url).toMatch(/^https:\/\/([\w.]+\.)?(gub\.uy|bcu\.gub\.uy)/)
    }
  })
})

// El título de la página, atado al conteo del que salió. Mismo patrón y misma razón que
// `snippetConLaRespuesta.test.ts`: el título es un literal del `.vue` y un literal no se
// entera cuando cambia la lista que lo respalda. El día que entre o salga un organismo,
// esto se pone en rojo en vez de dejar en el SERP un número que la propia página ya
// desmiente.
describe('/a-quien-le-reclamo-uruguay: el título contesta', () => {
  const source = readFileSync(
    join(__dirname, '..', '..', 'pages', 'a-quien-le-reclamo-uruguay.vue'),
    'utf8'
  )
  const title = source.match(/\nconst title = '((?:[^'\\]|\\.)*)'/)?.[1]

  it('contesta con el conteo en vez de devolver la pregunta', () => {
    expect(title).toBe('¿A quién le reclamo? Son cinco organismos')
    // «cinco» es `ROUTING_BODIES`, no un número escrito a mano.
    expect(ROUTING_BODIES).toHaveLength(5)
    // Y no vuelve a ser la consulta con «en Uruguay» pegado atrás.
    expect(title).not.toMatch(/reclamo en Uruguay\?$/)
  })

  it('entra en los 60 caracteres que publica el SERP, con la marca puesta', () => {
    expect(`${title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
  })
})
