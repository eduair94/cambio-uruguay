import { describe, expect, it } from 'vitest'

import { getGuide } from '../../utils/guides'
import {
  POBREZA_GUIDE_DESCRIPTION,
  POBREZA_GUIDE_SLUG,
  POBREZA_GUIDE_TITLE,
} from '../../utils/guidesPobreza'
import {
  INDIGENCE_BASKET_2026,
  INDIGENCE_INCIDENCE,
  POVERTY_INCIDENCE,
  POVERTY_LINES,
  POVERTY_LINE_PATH,
  POVERTY_LINE_SOURCES,
  formatPesos,
  incidenceChange,
  latestIndigenceBasket,
  povertyLineFor,
  regionGap,
  tenureGap,
} from '../../utils/povertyLine'

/** Igual que en `seoTitleBudget.test.ts`: la marca se agrega sólo si no está ya. */
const withBrand = (title: string) =>
  /cambio uruguay/i.test(title) ? title : `${title} | Cambio Uruguay`

const guide = getGuide(POBREZA_GUIDE_SLUG)!
/** Todo el texto visible de la guía: headings, prosa, tablas, FAQ y fuentes. */
const guideText = [
  guide.title,
  guide.description,
  ...guide.sections.flatMap(section => [
    section.heading,
    section.body,
    ...(section.table?.headers ?? []),
    ...(section.table?.rows.flat() ?? []),
  ]),
  ...(guide.faqs ?? []).flatMap(faq => [faq.q, faq.a]),
].join('\n')

describe('el cuadro de la línea de pobreza', () => {
  // Las doce celdas del cuadro 2 del informe del INE, transcriptas una por una. Es la única parte
  // del archivo que no se puede derivar de nada: si alguien la toca para "redondear", esto se cae.
  it('transcribe las doce celdas del cuadro 2 del INE (junio de 2026)', () => {
    expect(
      POVERTY_LINES.map(row => [
        row.size,
        row.montevideoTenant,
        row.montevideoOwner,
        row.interiorTenant,
        row.interiorOwner,
      ])
    ).toEqual([
      [1, 25195, 15572, 20257, 13540],
      [2, 42659, 29961, 33339, 25070],
      [3, 58893, 43959, 45364, 36026],
    ])
  })

  it('va de un integrante a tres, sin huecos ni repetidos', () => {
    expect(POVERTY_LINES.map(row => row.size)).toEqual([1, 2, 3])
  })

  it('crece con el tamaño del hogar en las cuatro columnas', () => {
    const columns = [
      'montevideoTenant',
      'montevideoOwner',
      'interiorTenant',
      'interiorOwner',
    ] as const
    for (const column of columns) {
      const values = POVERTY_LINES.map(row => row[column])
      expect(values, column).toEqual([...values].sort((a, b) => a - b))
    }
  })

  it('devuelve la fila pedida y nada para un tamaño que el informe no publica', () => {
    expect(povertyLineFor(1)?.montevideoTenant).toBe(25195)
    expect(povertyLineFor(4)).toBeUndefined()
  })
})

describe('la brecha por tenencia, que es el ángulo propio de la página', () => {
  // La razón por la que esta página existe: la línea del hogar inquilino es más alta que la del
  // propietario del mismo tamaño y región, porque la canasta no alimentaria computa el alquiler
  // del inquilino y no computa el valor locativo del propietario. Si alguna vez el INE cambia eso,
  // la afirmación central de la página deja de ser cierta y este test es el que avisa.
  it('la línea del inquilino es más alta que la del propietario en los seis casos', () => {
    for (const row of POVERTY_LINES) {
      expect(tenureGap(row, 'montevideo'), `MVD ${row.size}`).toBeGreaterThan(0)
      expect(tenureGap(row, 'interior'), `interior ${row.size}`).toBeGreaterThan(0)
    }
  })

  it('la brecha de una persona sola en Montevideo es de $ 9.623', () => {
    expect(tenureGap(povertyLineFor(1)!, 'montevideo')).toBe(9623)
    expect(tenureGap(povertyLineFor(1)!, 'interior')).toBe(6717)
  })

  it('la brecha por tenencia crece con el hogar y es mayor en Montevideo que en el interior', () => {
    const mvd = POVERTY_LINES.map(row => tenureGap(row, 'montevideo'))
    const interior = POVERTY_LINES.map(row => tenureGap(row, 'interior'))
    expect(mvd).toEqual([...mvd].sort((a, b) => a - b))
    expect(interior).toEqual([...interior].sort((a, b) => a - b))
    POVERTY_LINES.forEach((row, index) => {
      expect(mvd[index], `tamaño ${row.size}`).toBeGreaterThan(interior[index]!)
    })
  })

  it('Montevideo está por encima del interior con la misma tenencia', () => {
    for (const row of POVERTY_LINES) {
      expect(regionGap(row, 'tenant'), `inquilino ${row.size}`).toBeGreaterThan(0)
      expect(regionGap(row, 'owner'), `propietario ${row.size}`).toBeGreaterThan(0)
    }
    expect(regionGap(povertyLineFor(1)!, 'tenant')).toBe(4938)
  })
})

describe('la línea de indigencia', () => {
  it('transcribe los seis meses del cuadro 3', () => {
    expect(INDIGENCE_BASKET_2026.map(m => [m.month, m.montevideo, m.interior])).toEqual([
      ['Enero', 6605, 5677],
      ['Febrero', 6666, 5735],
      ['Marzo', 6675, 5732],
      ['Abril', 6678, 5740],
      ['Mayo', 6699, 5736],
      ['Junio', 6736, 5775],
    ])
  })

  it('el último mes de la serie es junio y es el que destaca la página', () => {
    expect(latestIndigenceBasket().month).toBe('Junio')
    expect(latestIndigenceBasket().montevideo).toBe(6736)
  })

  it('Montevideo siempre está por encima del interior', () => {
    for (const month of INDIGENCE_BASKET_2026)
      expect(month.montevideo, month.month).toBeGreaterThan(month.interior)
  })

  // La indigencia mide el hambre y la pobreza el ingreso total: la canasta alimentaria tiene que
  // ser una fracción de la línea, no un número suelto. Si se invirtieran, una de las dos está mal
  // transcripta.
  it('la canasta alimentaria es una fracción de la línea de pobreza del mismo hogar', () => {
    const una = povertyLineFor(1)!
    expect(latestIndigenceBasket().montevideo).toBeLessThan(una.montevideoOwner)
    expect(latestIndigenceBasket().interior).toBeLessThan(una.interiorOwner)
  })
})

describe('la incidencia publicada', () => {
  it('trae el semestre medido, el anterior y los márgenes de error', () => {
    expect(POVERTY_INCIDENCE.current).toEqual({
      people: 14.8,
      peopleMargin: 1.0,
      households: 11.6,
      householdsMargin: 0.7,
    })
    expect(POVERTY_INCIDENCE.previous).toEqual({ people: 17.7, households: 13.9 })
    expect(INDIGENCE_INCIDENCE.current).toEqual({ people: 1.2, households: 1.0 })
    expect(INDIGENCE_INCIDENCE.previous).toEqual({ people: 1.8, households: 1.4 })
  })

  // 2,9 puntos es la cifra que tituló el comunicado de Presidencia: se calcula, no se escribe.
  it('la baja de la pobreza en personas es de 2,9 puntos', () => {
    expect(incidenceChange(POVERTY_INCIDENCE, 'people')).toBe(2.9)
    expect(incidenceChange(POVERTY_INCIDENCE, 'households')).toBe(2.3)
    expect(incidenceChange(INDIGENCE_INCIDENCE, 'people')).toBe(0.6)
  })

  it('los hogares bajo la línea son menos que las personas en los dos semestres', () => {
    expect(POVERTY_INCIDENCE.current.households).toBeLessThan(POVERTY_INCIDENCE.current.people)
    expect(POVERTY_INCIDENCE.previous.households).toBeLessThan(POVERTY_INCIDENCE.previous.people)
  })
})

describe('las fuentes', () => {
  it('son todas oficiales uruguayas y por HTTPS', () => {
    expect(POVERTY_LINE_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const source of POVERTY_LINE_SOURCES) {
      expect(source.url, source.label).toMatch(/^https:\/\/[\w.-]*(?:ine|gub)\.(?:gub\.)?uy\//)
      expect(source.label.length, source.url).toBeGreaterThan(10)
    }
  })

  // La guía no las escribe a mano: proyecta el catálogo, así que una fuente agregada acá aparece
  // sola y no puede quedar una cifra sin su URL al lado.
  it('la guía publica las tres, proyectadas del catálogo', () => {
    expect(guide.sources?.map(source => source.url)).toEqual(
      POVERTY_LINE_SOURCES.map(source => source.url)
    )
  })
})

describe('el snippet no se despega del cuadro', () => {
  // Misma regla que la guía de la TPM: el título y la descripción se ARMAN desde el catálogo, no se
  // escriben a mano, porque un número a mano ya envejeció una vez en este repo. Esto fija además
  // que entren en el SERP con la marca puesta, que es lo que mide `guideSnippetBudget.test.ts`.
  const una = povertyLineFor(1)!
  const tres = povertyLineFor(3)!

  it('el título trae la línea de una persona sola que alquila en Montevideo', () => {
    expect(POBREZA_GUIDE_TITLE).toContain(formatPesos(una.montevideoTenant))
    expect(guide.title).toBe(POBREZA_GUIDE_TITLE)
  })

  it('el título entra en el SERP con la marca puesta', () => {
    expect(withBrand(POBREZA_GUIDE_TITLE).length).toBeLessThanOrEqual(60)
  })

  it('la descripción trae las tres cifras que la guía destaca y entra en el SERP', () => {
    expect(POBREZA_GUIDE_DESCRIPTION).toContain(formatPesos(una.montevideoTenant))
    expect(POBREZA_GUIDE_DESCRIPTION).toContain(formatPesos(una.montevideoOwner))
    expect(POBREZA_GUIDE_DESCRIPTION).toContain(formatPesos(tres.montevideoTenant))
    expect(POBREZA_GUIDE_DESCRIPTION.length).toBeLessThanOrEqual(155)
    expect(guide.description).toBe(POBREZA_GUIDE_DESCRIPTION)
  })

  it('la ruta de la guía es la que declara el catálogo', () => {
    expect(POVERTY_LINE_PATH).toBe('/linea-de-pobreza-uruguay')
    expect(`/guias/${POBREZA_GUIDE_SLUG}`).toBe(`/guias${POVERTY_LINE_PATH}`)
  })
})

describe('el cuerpo de la guía dice lo que la página tiene que decir', () => {
  it('publica las doce celdas del cuadro', () => {
    for (const row of POVERTY_LINES)
      for (const value of [
        row.montevideoTenant,
        row.montevideoOwner,
        row.interiorTenant,
        row.interiorOwner,
      ])
        expect(guideText, formatPesos(value)).toContain(formatPesos(value))
  })

  it('publica los seis meses de la canasta alimentaria', () => {
    for (const month of INDIGENCE_BASKET_2026)
      expect(guideText, month.month).toContain(formatPesos(month.montevideo))
  })

  // El ángulo propio de la página: si esta frase se cae, la guía quedó diciendo lo mismo que
  // cualquier nota que publica una cifra sola.
  it('explica por qué la línea del inquilino es más alta, citando la metodología', () => {
    expect(guideText).toContain('no incluye el valor locativo en ningún caso')
    expect(guideText).toContain(formatPesos(tenureGap(povertyLineFor(1)!, 'montevideo')))
  })

  // El INE publica la indigencia de hogares como «1,0 %» y el margen como «±1,0». Sin el decimal
  // mínimo, `toLocaleString` las imprime como «1 %» y «±1», que es menos precision que la
  // publicada: una cifra oficial no se redondea de vuelta al copiarla.
  it('imprime siempre un decimal, como el informe', () => {
    expect(guideText).toContain('1,0 %')
    expect(guideText).toContain('±1,0 puntos')
    expect(guideText).not.toMatch(/(?<![,\d])1 %/)
  })

  // Lo que la página se niega a afirmar, y por qué. Sin esto, la guía se lee como un trámite.
  it('dice que no es requisito de ningún beneficio y que el cuadro llega hasta tres personas', () => {
    expect(guideText).toContain('requisito de ningún beneficio')
    expect(guideText).toMatch(/hasta tres integrantes/)
  })
})

describe('el formato de pesos', () => {
  it('usa el punto como separador de miles y no imprime decimales', () => {
    expect(formatPesos(25195)).toBe('$ 25.195')
    expect(formatPesos(6736)).toBe('$ 6.736')
  })
})
