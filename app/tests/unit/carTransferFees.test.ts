// El catálogo de aranceles de transferencia vehicular, y sobre todo la aritmética que la página
// IMPRIME.
//
// La página no escribe ninguna cifra a mano: todas salen de contar `CAR_TRANSFER_DEPARTMENTS`
// («5 intendencias publican $1.780», «6 de 9 piden la patente al día»). Eso evita que el texto
// contradiga a la tabla de al lado, pero abre el otro agujero: una ficha que alguien actualice mal
// mueve en silencio el título, la descripción y las respuestas del FAQ, que son el renglón sobre el
// que se hace clic. Por eso acá los números están ANCLADOS con el valor medido el 2026-11-16: si una
// lectura nueva los mueve, esto se pone en rojo y hay que mirar el snippet, no sólo la tabla.
//
// Es el mismo patrón de `snippetConLaRespuesta.test.ts`, un nivel más abajo: ahí se vigila que el
// literal del título siga al dato; acá, que el dato no se mueva sin que nadie se entere.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  CAR_TRANSFER_CATALOGUE,
  CAR_TRANSFER_DEPARTMENTS,
  CAR_TRANSFER_FAQ,
  CAR_TRANSFER_MODAL_FEE,
  CAR_TRANSFER_MONTEVIDEO,
  CAR_TRANSFER_NO_FICHA,
  CAR_TRANSFER_PATH,
  CAR_TRANSFER_REQUISITO_LABELS,
  CAR_TRANSFER_SOURCES,
  CAR_TRANSFER_UNPUBLISHED,
  CAR_TRANSFER_VERIFIED_AT,
  CAR_TRANSFER_WITH_FEE,
  URUGUAY_DEPARTMENTS,
  carTransferCoveredCount,
  carTransferMaxFee,
  carTransferMinFee,
  carTransferModalCount,
  carTransferOffModal,
  carTransferRequisitoCount,
  carTransferRequisitoCountWithConditional,
  carTransferUniversalRequisitos,
} from '../../utils/carTransferFees'

describe('carTransferFees — la forma del catálogo', () => {
  it('cubre nueve departamentos, sin repetir ninguno', () => {
    expect(carTransferCoveredCount()).toBe(9)
    const nombres = CAR_TRANSFER_DEPARTMENTS.map(d => d.departamento)
    expect(new Set(nombres).size).toBe(nombres.length)
    const slugs = CAR_TRANSFER_DEPARTMENTS.map(d => d.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  // El reparto tiene que cerrar contra el país: si alguien agrega un departamento al catálogo y se
  // olvida de sacarlo de la lista de los que no tienen ficha, la página diría «10 sin ficha»
  // nombrando uno que sí la tiene.
  it('los cubiertos y los que no tienen ficha suman los 19 departamentos', () => {
    expect(carTransferCoveredCount() + CAR_TRANSFER_NO_FICHA.length).toBe(URUGUAY_DEPARTMENTS)
    const cubiertos = new Set(CAR_TRANSFER_DEPARTMENTS.map(d => d.departamento))
    for (const sinFicha of CAR_TRANSFER_NO_FICHA) expect(cubiertos.has(sinFicha)).toBe(false)
  })

  it('cada departamento trae su ficha oficial y la fecha que la ficha muestra', () => {
    for (const dept of CAR_TRANSFER_DEPARTMENTS) {
      expect(dept.fichaUrl, dept.departamento).toMatch(
        /^https:\/\/(www\.gub\.uy|montevideo\.gub\.uy|tramites\.montevideo\.gub\.uy)\//
      )
      expect(dept.fichaUpdatedAt, dept.departamento).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(dept.arancelTextual.length, dept.departamento).toBeGreaterThan(0)
      expect(dept.particularidad.length, dept.departamento).toBeGreaterThan(20)
    }
  })

  // Montevideo es el único que no sale del catálogo nacional, y el único sin arancel legible. La
  // página lo dice; esto impide que una lectura futura le invente un número sin cambiar el texto.
  it('Montevideo viene de su portal propio y no publica arancel', () => {
    expect(CAR_TRANSFER_MONTEVIDEO.fuente).toBe('portal-propio')
    expect(CAR_TRANSFER_MONTEVIDEO.arancel).toBeNull()
    expect(CAR_TRANSFER_CATALOGUE.every(d => d.fuente === 'catalogo')).toBe(true)
    expect(CAR_TRANSFER_CATALOGUE).toHaveLength(8)
  })

  it('la ruta y la fecha de verificación están en el formato que usa la página', () => {
    expect(CAR_TRANSFER_PATH).toBe('/cuanto-sale-transferir-un-auto-uruguay')
    expect(CAR_TRANSFER_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('carTransferFees — los aranceles que imprime el snippet', () => {
  it('sólo entran en la estadística los que publican un importe', () => {
    expect(CAR_TRANSFER_WITH_FEE).toHaveLength(7)
    expect(CAR_TRANSFER_WITH_FEE.every(d => typeof d.arancel === 'number')).toBe(true)
  })

  // Las tres cifras del título y de la descripción.
  it('va de $1.419 a $1.780, y $1.780 lo publican cinco', () => {
    expect(carTransferMinFee()).toBe(1419)
    expect(carTransferMaxFee()).toBe(1780)
    expect(CAR_TRANSFER_MODAL_FEE).toBe(1780)
    expect(carTransferModalCount()).toBe(5)
  })

  it('las dos excepciones son Canelones y San José, de mayor a menor', () => {
    expect(carTransferOffModal().map(d => [d.departamento, d.arancel])).toEqual([
      ['Canelones', 1620],
      ['San José', 1419],
    ])
  })

  // El argumento de la página: los dos importes más bajos son las dos fichas más viejas. Si una
  // actualización rompe esa coincidencia, la nota que la explica deja de ser cierta.
  it('los dos aranceles fuera de la moda son las dos fichas más viejas del lote', () => {
    const porFecha = [...CAR_TRANSFER_WITH_FEE].sort((a, b) =>
      a.fichaUpdatedAt.localeCompare(b.fichaUpdatedAt)
    )
    expect(
      porFecha
        .slice(0, 2)
        .map(d => d.departamento)
        .sort()
    ).toEqual(['Canelones', 'San José'])
  })
})

describe('carTransferFees — los requisitos comparados', () => {
  it('cada ficha declara los ocho ejes con un estado conocido', () => {
    for (const dept of CAR_TRANSFER_DEPARTMENTS) {
      for (const { field } of CAR_TRANSFER_REQUISITO_LABELS) {
        expect(['si', 'condicional', 'no-figura'], `${dept.departamento}.${field}`).toContain(
          dept.requisitos[field]
        )
      }
    }
  })

  // Los números que la página escribe en prosa y en el FAQ, anclados de uno en uno.
  it('cuenta lo que cada eje pide, con el valor medido', () => {
    expect(carTransferRequisitoCount('identidad')).toBe(9)
    expect(carTransferRequisitoCount('soa')).toBe(9)
    expect(carTransferRequisitoCount('titulo')).toBe(8)
    expect(carTransferRequisitoCount('div')).toBe(6)
    expect(carTransferRequisitoCount('alDia')).toBe(6)
    expect(carTransferRequisitoCount('inspeccion')).toBe(4)
    expect(carTransferRequisitoCount('libreDePrenda')).toBe(3)
    expect(carTransferRequisitoCount('domicilio')).toBe(2)
  })

  it('las dos inspecciones condicionales son Maldonado y Montevideo', () => {
    expect(carTransferRequisitoCountWithConditional('inspeccion')).toBe(6)
    const condicionales = CAR_TRANSFER_DEPARTMENTS.filter(
      d => d.requisitos.inspeccion === 'condicional'
    ).map(d => d.departamento)
    expect(condicionales.sort()).toEqual(['Maldonado', 'Montevideo'])
  })

  // Lo único que la página puede ofrecer como lista nacional de preparación. Si crece, el texto de
  // «La respuesta corta» tiene que crecer con ella; si se achica, está prometiendo de más.
  it('sólo dos requisitos están en las nueve fichas', () => {
    expect(carTransferUniversalRequisitos().map(r => r.field)).toEqual(['identidad', 'soa'])
  })
})

describe('carTransferFees — lo que se dice y lo que no', () => {
  it('el FAQ nombra el arancel más repetido y el rango', () => {
    const texto = CAR_TRANSFER_FAQ.map(f => `${f.question} ${f.answer}`).join(' ')
    expect(texto).toContain('1.780')
    expect(texto).toContain('1.419')
    expect(texto).toContain('1.620')
    expect(CAR_TRANSFER_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const faq of CAR_TRANSFER_FAQ) {
      expect(faq.question.endsWith('?'), faq.question).toBe(true)
      expect(faq.answer.length, faq.question).toBeGreaterThan(80)
    }
  })

  // La disciplina de este repo: lo que la fuente no trae se declara, no se completa de memoria. El
  // escribano es el caso que más tienta, porque es el gasto más grande de la operación.
  it('declara el escribano entre lo que no publica', () => {
    const temas = CAR_TRANSFER_UNPUBLISHED.map(u => u.topic.toLowerCase()).join(' | ')
    expect(temas).toContain('escribano')
    expect(CAR_TRANSFER_UNPUBLISHED.length).toBeGreaterThanOrEqual(3)
    for (const item of CAR_TRANSFER_UNPUBLISHED) {
      expect(item.why.length, item.topic).toBeGreaterThan(40)
    }
  })

  it('hay una fuente por departamento más las dos generales, todas https y sin repetir', () => {
    expect(CAR_TRANSFER_SOURCES).toHaveLength(CAR_TRANSFER_DEPARTMENTS.length + 2)
    const urls = CAR_TRANSFER_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
    for (const source of CAR_TRANSFER_SOURCES) {
      expect(source.url, source.label).toMatch(/^https:\/\//)
      expect(source.label.length, source.url).toBeGreaterThan(10)
    }
  })

  it('cita la ley del SOA, que es el único requisito que piden las nueve', () => {
    expect(CAR_TRANSFER_SOURCES.some(s => s.url.includes('impo.com.uy/bases/leyes/18412'))).toBe(
      true
    )
  })
})

// ---------------------------------------------------------------------------
// El snippet de la página, RESUELTO
// ---------------------------------------------------------------------------
//
// POR QUÉ ESTO EXISTE. `seoDescriptionBudget.test.ts` mide dos cosas: las descripciones que son un
// literal, y el PISO de las que se arman con plantilla. El piso sustituye cada interpolación por
// vacío, así que a una descripción hecha de cifras le mide de MENOS — y una descripción hecha de
// cifras es justo la que este repo quiere. Pasó mientras se escribía esta página: la primera
// versión resolvía a 172 caracteres, diecisiete por encima del tope de 155, y los dos lectores la
// dejaban pasar.
//
// Es el mismo agujero que el del lado del TÍTULO que `seoTitleBudget.test.ts` documenta desde el
// 2026-11-03 («el punto ciego estaba correlacionado con el defecto»), aplicado al otro renglón del
// snippet: el piso condena y no absuelve.
//
// Lo que hace esto es cerrarlo para ESTA página: lee la plantilla del `.vue`, le pone los valores
// que salen del catálogo y mide lo que Google va a recibir. Si mañana una ficha nueva alarga la
// lista de excepciones, la descripción se pasa de 155 y esto se pone en rojo en vez de publicar un
// snippet cortado.
describe('carTransferFees — el snippet que Google va a recibir', () => {
  /** Los ~60 y los 155 que publica Google, los mismos topes que los dos presupuestos del repo. */
  const MAX_TITLE = 60
  const MAX_DESCRIPTION = 155
  /** Lo que agrega `titleTemplate` detrás de todo título. */
  const BRAND_SUFFIX = ' | Cambio Uruguay'

  const page = readFileSync(
    join(__dirname, '..', '..', 'pages', 'cuanto-sale-transferir-un-auto-uruguay.vue'),
    'utf8'
  )

  const PESOS = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 0 })
  const pesos = (amount: number) => `$${PESOS.format(amount)}`

  /** Las mismas sustituciones que hace el `<script setup>`, escritas una sola vez. */
  const sustituciones: ReadonlyArray<readonly [string, string]> = [
    ['modalCount', String(carTransferModalCount())],
    ['cubiertos', String(carTransferCoveredCount())],
    ['pesos(CAR_TRANSFER_MODAL_FEE)', pesos(CAR_TRANSFER_MODAL_FEE)],
    [
      'fueraDeModa',
      carTransferOffModal()
        .map(dept => `${dept.departamento} ${pesos(dept.arancel)}`)
        .join(' y '),
    ],
    [
      'universales',
      carTransferUniversalRequisitos()
        .map(req => req.prose)
        .join(' y '),
    ],
  ]

  const plantilla = (name: 'title' | 'description') => {
    const match = page.match(new RegExp('const ' + name + ' = `([^`]*)`'))
    if (!match) throw new Error(`la página no declara const ${name} con plantilla`)
    return match[1] as string
  }

  const resolver = (template: string) =>
    sustituciones.reduce(
      (text, [expr, value]) => text.split('${' + expr + '}').join(value),
      template
    )

  it('el título entra en los 60 caracteres con la marca puesta', () => {
    const resolved = resolver(plantilla('title'))
    expect(resolved.includes('${'), 'quedó una interpolación sin resolver').toBe(false)
    expect(`${resolved}${BRAND_SUFFIX}`.length, resolved).toBeLessThanOrEqual(MAX_TITLE)
  })

  it('la descripción entra en los 155 caracteres YA RESUELTA', () => {
    const resolved = resolver(plantilla('description'))
    expect(resolved.includes('${'), 'quedó una interpolación sin resolver').toBe(false)
    expect(resolved.length, resolved).toBeLessThanOrEqual(MAX_DESCRIPTION)
  })

  // Las cifras son la razón por la que la descripción existe: en este sitio una descripción con el
  // número corre a ~1,4 % de CTR y una genérica a 0,03–0,2 %.
  it('la descripción publica el arancel más repetido y los dos que se salen', () => {
    const resolved = resolver(plantilla('description'))
    expect(resolved).toContain(pesos(CAR_TRANSFER_MODAL_FEE))
    for (const dept of carTransferOffModal()) {
      expect(resolved, dept.departamento).toContain(pesos(dept.arancel))
    }
  })
})
