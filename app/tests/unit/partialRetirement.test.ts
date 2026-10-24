// `/guias/jubilacion-parcial-uruguay`: jubilarse sin dejar el trabajo.
//
// Lo que esta guía tiene de particular, y lo que estos guards cuidan, es que el régimen que casi
// todo el mundo publica está DEROGADO: la jubilación parcial de la Ley 19.160 (1/11/2013) la derogó
// el artículo 208 de la Ley 20.130, dejando a salvo sólo «las situaciones jurídicas constituidas a
// su amparo». Lo vigente es la jubilación parcial flexible del artículo 203 de la 20.130 con el
// Decreto 231/023. Una guía que mezcle los dos no es imprecisa: le hace planificar mal a alguien
// que está decidiendo cuándo jubilarse.
//
// El otro riesgo es el que el repo ya conoce como cifra vieja que pasa la banda de plausibilidad:
// el monto de la jubilación parcial es proporcional al recorte y NO lleva partida para alcanzar el
// mínimo, y el incremento del 30 % del artículo 13 se mide contra el valor base del suplemento
// solidario, que se actualiza. Por eso la guía no publica ningún importe en pesos, y acá se exige
// que siga sin publicarlo.
import { describe, expect, it } from 'vitest'
import { getGuide } from '../../utils/guides'
import { guideHubs } from '../../utils/guideHubs'

const SLUG = 'jubilacion-parcial-uruguay'
const guide = getGuide(SLUG)

/** Todo el texto visible de la guía: secciones, tablas, pasos, FAQ y el snippet. */
function texto(): string {
  const g = guide!
  return [
    g.title,
    g.description,
    ...g.sections.flatMap(s => [
      s.heading,
      s.body,
      ...(s.table ? [...s.table.headers, ...s.table.rows.flat()] : []),
    ]),
    ...(g.steps ?? []).flatMap(s => [s.name, s.text]),
    ...(g.faqs ?? []).flatMap(f => [f.q, f.a]),
  ].join('\n')
}

describe('la guía de jubilación parcial existe y está en su tema', () => {
  it('está en el catálogo', () => {
    expect(guide).toBeDefined()
    expect(guide!.sections.length).toBeGreaterThanOrEqual(6)
  })

  it('pertenece a finanzas personales y jubilación', () => {
    // Sin esto la guía nace huérfana: el bloque «Más sobre este tema» es recíproco por
    // construcción, así que una guía fuera de todo `guideSlugs` no se enlaza desde ninguna parte.
    const hub = guideHubs.find(h => h.guideSlugs.includes(SLUG))
    expect(hub?.slug).toBe('finanzas-personales-y-jubilacion-uruguay')
  })
})

describe('no confunde el régimen vigente con el derogado', () => {
  it('nombra la jubilación parcial flexible, el art. 203 y el Decreto 231/023', () => {
    const t = texto()
    expect(t).toMatch(/jubilación parcial flexible/i)
    expect(t).toMatch(/20\.130/)
    expect(t).toMatch(/\b203\b/)
    expect(t).toMatch(/231\/023/)
  })

  it('cada vez que nombra la Ley 19.160 dice que está derogada', () => {
    const bloques = [
      guide!.description,
      ...guide!.sections.flatMap(s => [s.body, ...(s.table?.rows.flat() ?? [])]),
      ...(guide!.faqs ?? []).map(f => f.a),
    ]
    const offenders = bloques
      .filter(b => /19\.160/.test(b))
      .filter(b => !/derog/i.test(b))
      .map(b => b.slice(0, 90))
    expect(offenders).toEqual([])
  })

  it('cita el artículo 208, que es el que la derogó', () => {
    expect(texto()).toMatch(/\b208\b/)
  })

  it('dice que las situaciones ya constituidas siguen rigiéndose por la ley vieja', () => {
    expect(texto()).toMatch(/situaciones jurídicas constituidas/i)
  })
})

describe('la aritmética que publica es la de la norma, y nada más', () => {
  it('publica el rango de un tercio a la mitad, en el horario y en el sueldo', () => {
    const t = texto()
    expect(t).toMatch(/una tercera parte y la mitad/i)
    expect(t).toMatch(/carga horaria/i)
    expect(t).toMatch(/remuneración/i)
  })

  it('dice que la jubilación se paga en el mismo porcentaje en que se recorta el sueldo', () => {
    const t = texto()
    expect(t).toMatch(/porcentaje en que se reduce la remuneración|mismo porcentaje/i)
    expect(t).toMatch(/40 %/)
  })

  it('no publica ningún importe en pesos ni en dólares', () => {
    // El valor base del suplemento solidario se actualiza y la jubilación es de cada uno: un
    // importe acá envejece sin que nada avise, y es el error recurrente del repo.
    const offenders = texto()
      .split('\n')
      .filter(linea => /(?:\$|US\$|UYU)\s*\d|\d+(?:\.\d{3})+\s*pesos/i.test(linea))
    expect(offenders).toEqual([])
  })

  it('no dice que el porcentaje se aplique sobre el sueldo', () => {
    // El porcentaje es de la jubilación entera que te correspondería, no del salario.
    const offenders = texto()
      .split(/(?<=[.?!])\s+/)
      .filter(o => /porcentaje/i.test(o) && /de tu sueldo|del sueldo que/i.test(o))
    expect(offenders).toEqual([])
  })
})

describe('publica las condiciones que deciden si conviene', () => {
  it('avisa que no se paga el suplemento solidario mientras durás en actividad', () => {
    const t = texto()
    expect(t).toMatch(/suplemento solidario/i)
    expect(t).toMatch(/ajuste al valor mínimo|montos mínimos/i)
  })

  it('enlaza la página del suplemento solidario donde lo explica', () => {
    const destinos = [
      ...guide!.sections.flatMap(s => (s.links ?? []).map(l => l.to)),
      ...(guide!.related ?? []).map(l => l.to),
    ]
    expect(destinos).toContain('/suplemento-solidario-bps')
  })

  it('dice que el acuerdo es escrito, con el empleador, y que no se toca por seis meses', () => {
    const t = texto()
    expect(t).toMatch(/acuerdo escrito/i)
    expect(t).toMatch(/seis meses/i)
  })

  it('publica las cuatro incompatibilidades, con la excepción de los docentes', () => {
    const tabla = guide!.sections.find(s => /incompatibilidad/i.test(s.heading))?.table
    expect(tabla?.rows).toHaveLength(4)
    expect(tabla!.rows.flat().join(' ')).toMatch(/salvo docentes/i)
  })

  it('publica el VF 163 y que la reducción arranca el primer día hábil del mes', () => {
    const t = texto()
    expect(t).toMatch(/163/)
    expect(t).toMatch(/primer día hábil del mes/i)
  })

  it('avisa que al cesar hay que PEDIR el 100 %', () => {
    const t = texto()
    expect(t).toMatch(/100 %/)
    expect(t).toMatch(/cese de la actividad/i)
  })
})

describe('cada afirmación legal tiene su fuente', () => {
  const urls = (guide!.sources ?? []).map(s => s.url)

  it('cita la ficha del BPS, los dos textos de IMPO y la ley derogada', () => {
    expect(urls).toContain('https://www.bps.gub.uy/9776/jubilacion-parcial.html')
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/20130-2023/203')
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos/231-2023')
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/19160-2013')
  })

  it('todas las fuentes son oficiales y absolutas', () => {
    expect(urls.length).toBeGreaterThanOrEqual(4)
    for (const url of urls)
      expect(url).toMatch(/^https:\/\/(?:www\.)?(?:bps\.gub\.uy|impo\.com\.uy)\//)
  })
})
