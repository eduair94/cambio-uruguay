import { describe, expect, it } from 'vitest'

import { getGuide } from '../../utils/guides'
import {
  POBREZA_GUIDE_DESCRIPTION,
  POBREZA_GUIDE_SLUG,
  POBREZA_GUIDE_TITLE,
} from '../../utils/guidesPobreza'
import {
  BASKET_COMPONENTS,
  ESTIMATED_SIZES,
  INDIGENCE_BASKET_2026,
  INDIGENCE_INCIDENCE,
  POVERTY_INCIDENCE,
  POVERTY_LINES,
  POVERTY_LINE_LEGAL,
  POVERTY_LINE_SOURCES,
  SCALE_EXPONENTS,
  estimatePovertyLine,
  estimatedRow,
  formatPesos,
  incidenceChange,
  latestIndigenceBasket,
  maxFormulaDeviation,
  povertyLineFor,
  regionGap,
  rentItem,
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
    expect(POVERTY_INCIDENCE.previous).toEqual({
      people: 17.7,
      peopleMargin: 1.0,
      households: 13.9,
      householdsMargin: 0.8,
    })
    expect(INDIGENCE_INCIDENCE.current).toEqual({
      people: 1.2,
      peopleMargin: 0.3,
      households: 1.0,
      householdsMargin: 0.2,
    })
    expect(INDIGENCE_INCIDENCE.previous).toEqual({
      people: 1.8,
      peopleMargin: 0.4,
      households: 1.4,
      householdsMargin: 0.2,
    })
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
      expect(source.url, source.label).toMatch(
        /^https:\/\/(?:[\w.-]*\.gub\.uy|www\.impo\.com\.uy)\//
      )
      expect(source.label.length, source.url).toBeGreaterThan(10)
    }
  })

  // https://www.ine.gub.uy/linea-de-pobreza redirige a la portada del INE: una fuente que no se
  // puede revisar no es una fuente. La metodología se cita por su nota en PDF.
  it('no cita la URL que redirige a la portada y sí la nota metodológica', () => {
    const urls = POVERTY_LINE_SOURCES.map(source => source.url)
    expect(urls).not.toContain('https://www.ine.gub.uy/linea-de-pobreza')
    expect(urls.some(url => url.includes('Nota%20conceptual%20Pobreza%20Met%202017.pdf'))).toBe(
      true
    )
    expect(urls.some(url => url.includes('primer%20semestre%202025'))).toBe(true)
  })

  it('el rótulo de Presidencia trae el titular completo', () => {
    expect(POVERTY_LINE_SOURCES.map(s => s.label)).toContain(
      'Presidencia — «La pobreza bajó 2,9 puntos porcentuales en un año y la indigencia se redujo 33%» (07/10/2026)'
    )
  })

  // La guía no las escribe a mano: proyecta el catálogo, así que una fuente agregada acá aparece
  // sola y no puede quedar una cifra sin su URL al lado.
  it('la guía publica todas, proyectadas del catálogo', () => {
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

  it('la guía vive bajo /guias y no reserva una ruta raíz', () => {
    expect(POBREZA_GUIDE_SLUG).toBe('linea-de-pobreza-uruguay')
    expect(guide.slug).toBe(POBREZA_GUIDE_SLUG)
  })

  it('la descripción dice que la línea destacada es la de Montevideo', () => {
    expect(POBREZA_GUIDE_DESCRIPTION).toContain('Montevideo')
    expect(POBREZA_GUIDE_TITLE).toContain('solo')
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

  // Un borrador decía «no es requisito de ningún beneficio», y la Ley 18.874 (art. 1) la exige
  // para el Monotributo Social Mides: el propio sitio lo cita en `monotributoInvoicing.ts`.
  it('nombra el Monotributo Social y no afirma que no sea requisito de ningún beneficio', () => {
    expect(guideText).not.toMatch(/ningún beneficio/)
    expect(guideText).toContain('Monotributo Social Mides')
    expect(guideText).toContain('Ley 18.874, art. 1')
    expect(guideText).toContain(POVERTY_LINE_LEGAL.monotributoSocial.quote)
    expect(guideText).toContain(POVERTY_LINE_LEGAL.asignacionFamiliar.quote)
    expect(guideText).toMatch(/hasta tres integrantes/)
  })

  // El rubro de alquiler es un monto fijo de la canasta, no lo que paga cada inquilino; y la
  // frase «el alquiler y la pobreza medida se mueven juntos» no tenía fuente.
  it('no dice que el inquilino computa lo que paga ni afirma correlaciones sin fuente', () => {
    expect(guideText).not.toMatch(/computa lo que paga/)
    expect(guideText).not.toMatch(/se mueven juntos/)
    expect(guideText).toContain('no el alquiler que paga cada hogar')
    expect(guideText).toContain(formatPesos(rentItem('montevideo')))
  })

  // El margen de ±1,0 es de cada estimación, no una regla para la diferencia entre dos.
  it('no convierte el margen de error en una regla de significancia', () => {
    expect(guideText).not.toMatch(/distinguible de cero/)
    expect(guideText).toContain('margen de error al 95 %')
  })

  it('publica las filas de cuatro y cinco personas rotuladas como cálculo propio', () => {
    const table = guide.sections.find(s => s.heading.startsWith('El cuadro completo'))!.table!
    expect(table.rows).toHaveLength(POVERTY_LINES.length + ESTIMATED_SIZES.length)
    for (const size of ESTIMATED_SIZES) {
      const row = estimatedRow(size)
      const cells = table.rows.find(
        r => r[0]!.includes('cálculo propio') && r[1] === formatPesos(row.montevideoTenant)
      )
      expect(cells, `tamaño ${size}`).toBeDefined()
    }
    expect(guideText).toContain(formatPesos(estimatedRow(4).montevideoTenant))
    expect(guideText).toContain('n elevado a 0,9')
    expect(guideText).toContain('n elevado a 0,4')
  })
})

describe('la fórmula de la nota metodológica del INE', () => {
  it('trae los exponentes publicados', () => {
    expect(SCALE_EXPONENTS).toEqual({
      montevideo: { nonFood: 0.9, rent: 0.4 },
      interior: { nonFood: 0.8, rent: 0.3 },
    })
  })

  it('transcribe los componentes de junio del cuadro 3', () => {
    expect(BASKET_COMPONENTS.montevideo).toEqual({
      food: 6736,
      nonFoodTenant: 18459,
      nonFoodOwner: 8836,
    })
    expect(BASKET_COMPONENTS.interior).toEqual({
      food: 5775,
      nonFoodTenant: 14482,
      nonFoodOwner: 7765,
    })
    // La canasta alimentaria del componente es la del último mes de la serie de indigencia.
    expect(BASKET_COMPONENTS.montevideo.food).toBe(latestIndigenceBasket().montevideo)
    expect(BASKET_COMPONENTS.interior.food).toBe(latestIndigenceBasket().interior)
  })

  // Cuadro 3: LP = CBA + CBNA para el hogar unipersonal, y el rubro de alquiler es exactamente la
  // brecha por tenencia de una persona sola del cuadro 2.
  it('los componentes suman la línea de una persona y el rubro de alquiler es la brecha', () => {
    const una = povertyLineFor(1)!
    const m = BASKET_COMPONENTS.montevideo
    const i = BASKET_COMPONENTS.interior
    expect(m.food + m.nonFoodTenant).toBe(una.montevideoTenant)
    expect(m.food + m.nonFoodOwner).toBe(una.montevideoOwner)
    expect(i.food + i.nonFoodTenant).toBe(una.interiorTenant)
    expect(i.food + i.nonFoodOwner).toBe(una.interiorOwner)
    expect(rentItem('montevideo')).toBe(tenureGap(una, 'montevideo'))
    expect(rentItem('interior')).toBe(tenureGap(una, 'interior'))
  })

  // La prueba de que la fórmula es la del INE: reproduce sus doce celdas a pocos pesos.
  it('reproduce las doce celdas del cuadro 2 con a lo sumo 3 pesos de diferencia', () => {
    expect(maxFormulaDeviation()).toBeLessThanOrEqual(3)
    expect(maxFormulaDeviation()).toBe(2)
  })

  it('da las cifras de cuatro personas que citó la verificación', () => {
    expect(estimatePovertyLine(4, 'montevideo', 'tenant')).toBe(74467)
    expect(estimatePovertyLine(4, 'montevideo', 'owner')).toBe(57713)
    expect(estimatePovertyLine(4, 'interior', 'tenant')).toBe(56820)
    expect(estimatePovertyLine(4, 'interior', 'owner')).toBe(46639)
  })
})

describe('el formato de pesos', () => {
  it('usa el punto como separador de miles y no imprime decimales', () => {
    expect(formatPesos(25195)).toBe('$ 25.195')
    expect(formatPesos(6736)).toBe('$ 6.736')
  })
})
