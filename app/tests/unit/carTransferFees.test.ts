// El catálogo de aranceles de transferencia vehicular, y sobre todo la aritmética que la página
// IMPRIME.
//
// La página no escribe ninguna cifra a mano: todas salen de contar `CAR_TRANSFER_DEPARTMENTS`
// («5 intendencias publican $1.780», «6 de 9 piden la patente al día»). Eso evita que el texto
// contradiga a la tabla de al lado, pero abre el otro agujero: una ficha que alguien actualice mal
// mueve en silencio el título, la descripción y las respuestas del FAQ, que son el renglón sobre el
// que se hace clic. Por eso acá los números están ANCLADOS con el valor medido (fichas leídas el
// 2026-11-16 y releídas el 2026-11-20 junto con el Texto Ordenado del SUCIVE 2026): si una lectura
// nueva los mueve, esto se pone en rojo y hay que mirar el snippet, no sólo la tabla.
//
// La corrección del 2026-11-20: la primera versión escribió que «cada intendencia fija su arancel»
// porque tres fichas decían tres números. El importe lo fija el SUCIVE para todas ($1.779,52 en
// 2026) y los números distintos eran fichas viejas. Los tests de abajo atan esa tesis al dato.
//
// Es el mismo patrón de `snippetConLaRespuesta.test.ts`, un nivel más abajo: ahí se vigila que el
// literal del título siga al dato; acá, que el dato no se mueva sin que nadie se entere.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  CAR_TRANSFER_CATALOGUE,
  CAR_TRANSFER_DEPARTMENTS,
  CAR_TRANSFER_DIV_2022,
  CAR_TRANSFER_DIV_2022_SOURCE,
  CAR_TRANSFER_DIV_2026,
  CAR_TRANSFER_DIV_2026_SOURCE,
  CAR_TRANSFER_DIV_FACTOR_2026,
  CAR_TRANSFER_DIV_UNITS,
  CAR_TRANSFER_DIV_YEAR,
  CAR_TRANSFER_FAQ,
  CAR_TRANSFER_FEE_SPREAD_NOTE,
  CAR_TRANSFER_MODAL_FEE,
  CAR_TRANSFER_MONTEVIDEO,
  CAR_TRANSFER_NO_FICHA,
  CAR_TRANSFER_OWN_PORTALS,
  CAR_TRANSFER_PATH,
  CAR_TRANSFER_REQUISITO_LABELS,
  CAR_TRANSFER_SOURCES,
  CAR_TRANSFER_TOS_ART45_QUOTE,
  CAR_TRANSFER_TOS_ART9_EXCEPTION_QUOTE,
  CAR_TRANSFER_UNPUBLISHED,
  CAR_TRANSFER_VERIFIED_AT,
  CAR_TRANSFER_WITH_FEE,
  URUGUAY_DEPARTMENTS,
  carTransferByTurno,
  carTransferCoveredCount,
  carTransferCurrentFichas,
  carTransferModalCount,
  carTransferOffModal,
  carTransferRequisitoCount,
  carTransferRequisitoCountWithConditional,
  carTransferUniversalRequisitos,
} from '../../utils/carTransferFees'
import { redditGuides } from '../../utils/guidesReddit'

// La guía `/guias/transferir-un-auto-uruguay` repite en prosa los conteos y el importe de esta
// página, escritos a mano. Sin esto, una ficha releída movería la tabla y dejaría a la guía diciendo
// otra cosa (la primera versión decía «va de $1.419 a $1.780 según el departamento»).
describe('carTransferFees — la guía de transferencia dice lo mismo que el catálogo', () => {
  const guide = redditGuides.find(g => g.slug === 'transferir-un-auto-uruguay')
  const body = guide?.sections.find(s => s.heading === 'Los certificados que necesitás')?.body ?? ''

  it('la sección de certificados existe y enlaza la página de costos', () => {
    expect(body.length).toBeGreaterThan(200)
    expect(guide?.related?.some(r => r.to === CAR_TRANSFER_PATH)).toBe(true)
  })

  it('el importe es el nacional y no un rango por departamento', () => {
    expect(body).toContain('$1.779,52 en 2026 en cualquier departamento')
    expect(body).toContain('Texto Ordenado del SUCIVE')
    for (const dept of carTransferOffModal()) {
      const viejo = `$${new Intl.NumberFormat('es-UY').format(dept.arancel)}`
      expect(body, dept.departamento).not.toContain(viejo)
    }
  })

  it('los conteos de la prosa son los del catálogo', () => {
    expect(carTransferCoveredCount()).toBe(9)
    expect(body).toContain('lo único que piden las nueve es documento de identidad')
    expect(carTransferRequisitoCount('div')).toBe(6)
    expect(carTransferRequisitoCount('alDia')).toBe(6)
    expect(body).toContain('La libreta de propiedad y la patente al día figuran en seis')
    expect(carTransferRequisitoCount('inspeccion')).toBe(4)
    expect(body).toContain(
      'la inspección del vehículo en cuatro (más dos que la piden en algún caso)'
    )
    expect(carTransferRequisitoCount('libreDePrenda')).toBe(3)
    expect(body).toContain('libre de prenda y embargo en tres')
    expect(carTransferRequisitoCount('domicilio')).toBe(2)
    expect(body).toContain('la constancia de domicilio en dos')
  })

  // «en Paysandú y Treinta y Tres con vigencia de 24 horas»: las dos lo dicen en su ficha, y el
  // módulo lo registra en las dos particularidades.
  it('el libre de prenda de 24 horas está registrado en los dos departamentos que nombra', () => {
    for (const slug of ['paysandu', 'treinta-y-tres']) {
      const dept = CAR_TRANSFER_DEPARTMENTS.find(d => d.slug === slug)
      expect(dept?.particularidad, slug).toContain('24 horas')
      expect(dept?.requisitos.libreDePrenda, slug).toBe('si')
    }
    expect(body).toContain('en Paysandú y Treinta y Tres con vigencia de 24 horas')
  })

  // No todas las intendencias publican una lista: diez no tienen ficha en el catálogo nacional y
  // de esas sólo tres publican algo en su portal. «Cada una publica su propia lista» era falso.
  it('no dice que cada intendencia publique su lista', () => {
    expect(body).toContain('las listas de requisitos que publican las intendencias no coinciden')
    expect(body).not.toMatch(/cada una publica/i)
  })

  // «La deuda sigue al auto» (título de #123) no lo dice ninguna fuente primaria; el Texto
  // Ordenado del SUCIVE dice que con deuda el auto no se transfiere (art. 45).
  it('el título y la prosa sobre la deuda salen del artículo 45, citado en sus fuentes', () => {
    expect(guide?.title).toBe('Transferir un auto: con deuda no se puede')
    const texto = [
      guide?.title,
      ...(guide?.sections ?? []).map(s => s.body),
      ...(guide?.steps ?? []).map(s => s.text),
    ].join('\n')
    expect(texto).not.toMatch(/sigue al (auto|vehículo)/i)
    expect(texto).toContain('artículo 45 del Texto Ordenado del SUCIVE')
    expect(texto).toContain('(Texto Ordenado del SUCIVE, art. 45)')
    const fuente = guide?.sources?.find(s => s.url === CAR_TRANSFER_DIV_2026_SOURCE.url)
    expect(fuente?.label).toContain(CAR_TRANSFER_TOS_ART45_QUOTE)
    expect(fuente?.label).toContain(CAR_TRANSFER_DIV_2026_SOURCE.quote)
  })
})

describe('carTransferFees — el párrafo de entrada de la página', () => {
  const page = readFileSync(
    join(__dirname, '..', '..', 'pages', 'cuanto-sale-transferir-un-auto-uruguay.vue'),
    'utf8'
  )
  const lead = (page.match(/<p class="lead[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? '').replace(/\s+/g, ' ')

  it('no dice que cada intendencia publique su lista: diez no tienen ficha en el catálogo', () => {
    expect(CAR_TRANSFER_NO_FICHA).toHaveLength(URUGUAY_DEPARTMENTS - carTransferCoveredCount())
    expect(lead).toContain('las listas de requisitos que publican las intendencias no coinciden')
    expect(lead).not.toMatch(/cada una (publica|fija)/i)
  })
})

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

  // El importe de la página no es una estadística de las fichas: es el del Texto Ordenado del
  // SUCIVE. Se ancla a su propia aritmética y a la cita textual, para que una relectura que cambie
  // el número tenga que cambiar también la cita.
  it('el importe nacional de 2026 es 700 unidades por el factor del SUCIVE, $1.779,52', () => {
    expect(CAR_TRANSFER_DIV_YEAR).toBe(2026)
    expect(CAR_TRANSFER_DIV_2026).toBe(1779.52)
    expect(Math.round(CAR_TRANSFER_DIV_UNITS * CAR_TRANSFER_DIV_FACTOR_2026 * 100) / 100).toBe(
      CAR_TRANSFER_DIV_2026
    )
    expect(CAR_TRANSFER_DIV_2026_SOURCE.quote).toContain('700 x 2,542173922= 1.779,52')
    expect(CAR_TRANSFER_DIV_2026_SOURCE.url).toMatch(
      /^https:\/\/www\.gub\.uy\/congreso-intendentes\//
    )
  })

  // El número del título es el importe nacional redondeado al peso, que es como lo escriben las
  // fichas al día. Si el SUCIVE se reajusta y nadie toca el título, esto se pone en rojo.
  it('el $1.780 del título es el importe nacional redondeado, y lo publican cinco fichas', () => {
    expect(CAR_TRANSFER_MODAL_FEE).toBe(Math.round(CAR_TRANSFER_DIV_2026))
    expect(CAR_TRANSFER_MODAL_FEE).toBe(1780)
    expect(carTransferModalCount()).toBe(5)
    expect(carTransferCurrentFichas().map(d => d.departamento)).toEqual([
      'Lavalleja',
      'Paysandú',
      'Maldonado',
      'Cerro Largo',
      'Rivera',
    ])
  })

  // La tesis de la página: las fichas al día dicen el importe vigente y las que dicen otro número
  // son viejas. Si una ficha de este año publicara otra cifra, la nota sería falsa.
  it('una ficha publica el importe vigente si y sólo si se actualizó en 2026', () => {
    for (const dept of CAR_TRANSFER_WITH_FEE) {
      const alDia = dept.fichaUpdatedAt.startsWith(String(CAR_TRANSFER_DIV_YEAR))
      expect(dept.arancel === CAR_TRANSFER_MODAL_FEE, dept.departamento).toBe(alDia)
    }
  })

  it('San José publica exactamente el importe del Texto Ordenado de 2022', () => {
    const sanJose = CAR_TRANSFER_DEPARTMENTS.find(d => d.slug === 'san-jose')
    expect(sanJose?.arancel).toBe(Math.floor(CAR_TRANSFER_DIV_2022))
    expect(sanJose?.fichaUpdatedAt.startsWith('2022')).toBe(true)
    expect(CAR_TRANSFER_DIV_2022_SOURCE.quote).toContain('700x2,027491826= 1.419,24')
    expect(CAR_TRANSFER_FEE_SPREAD_NOTE).toContain('$1.419,24')
    expect(CAR_TRANSFER_FEE_SPREAD_NOTE).toContain('$1.779,52')
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

  // El FAQ de turnos está escrito a mano: se ata a los datos para que una ficha releída no lo deje
  // nombrando un departamento con otro turno (pasó: decía Treinta y Tres, cuya ficha no dice nada
  // de turnos, y omitía Cerro Largo, que «Retira un número»).
  it('el FAQ de turnos nombra exactamente los departamentos de cada turno', () => {
    expect(carTransferByTurno('en-linea')).toEqual(['Canelones'])
    expect(carTransferByTurno('agenda-previa')).toEqual([
      'Lavalleja',
      'Paysandú',
      'Maldonado',
      'Montevideo',
    ])
    expect(carTransferByTurno('orden-de-llegada')).toEqual(['Cerro Largo', 'San José'])
    const faq = CAR_TRANSFER_FAQ.find(f => f.question === '¿Se puede hacer en línea?')
    expect(faq?.answer).toContain('sólo Canelones')
    expect(faq?.answer).toContain('Lavalleja, Paysandú, Maldonado y Montevideo piden agenda previa')
    expect(faq?.answer).toContain('Cerro Largo y San José atienden por número')
    expect(faq?.answer).not.toContain('Treinta y Tres')
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
  it('el FAQ da el importe nacional y explica los números viejos sin presentarlos como precios', () => {
    const texto = CAR_TRANSFER_FAQ.map(f => `${f.question} ${f.answer}`).join(' ')
    expect(texto).toContain('$1.779,52')
    expect(texto).toContain('$1.780')
    expect(texto).toContain('SUCIVE')
    // La frase que la verificación encontró falsa no puede volver.
    expect(texto).not.toMatch(/cada una fija su arancel/i)
    const precio = CAR_TRANSFER_FAQ.find(
      f => f.question === '¿El precio cambia según el departamento?'
    )
    // «No» vale para un auto particular: el mismo artículo 9 deja a cada intendencia cobrar sus
    // tasas por el servicio al que está afectado el vehículo, y la respuesta lo dice.
    expect(precio?.answer.startsWith('No, para un auto particular.')).toBe(true)
    expect(precio?.answer).toContain('«el servicio a que está afectado el vehículo»')
    expect(CAR_TRANSFER_TOS_ART9_EXCEPTION_QUOTE).toContain(
      'el servicio a que está afectado el vehículo'
    )
    expect(CAR_TRANSFER_TOS_ART9_EXCEPTION_QUOTE.startsWith('Sin perjuicio de lo anterior')).toBe(
      true
    )
    expect(CAR_TRANSFER_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const faq of CAR_TRANSFER_FAQ) {
      expect(faq.question.endsWith('?'), faq.question).toBe(true)
      expect(faq.answer.length, faq.question).toBeGreaterThan(80)
    }
  })

  // La deuda bloquea la transferencia por regla nacional (TOS art. 45), no por la ficha de cada uno.
  it('la respuesta sobre la deuda cita el artículo 45 del Texto Ordenado, textual', () => {
    const deuda = CAR_TRANSFER_FAQ.find(f => f.question.includes('deuda de patente'))
    expect(deuda?.answer).toContain(CAR_TRANSFER_TOS_ART45_QUOTE.replace(/\.$/, ''))
    expect(deuda?.answer).toContain('artículo 45')
    expect(deuda?.answer).not.toContain('se convenga')
    expect(deuda?.answer).not.toContain('sigue al vehículo')
  })

  // La disciplina de este repo: lo que la fuente no trae se declara, no se completa de memoria. El
  // escribano es el caso que más tienta, porque es el gasto más grande de la operación.
  it('declara el escribano entre lo que no publica', () => {
    const temas = CAR_TRANSFER_UNPUBLISHED.map(u => u.topic.toLowerCase()).join(' | ')
    expect(temas).toContain('escribano')
    // El importe de Montevideo sí está publicado: es el nacional. No puede volver a esta lista.
    expect(temas).not.toContain('arancel de montevideo')
    expect(CAR_TRANSFER_UNPUBLISHED.length).toBeGreaterThanOrEqual(3)
    for (const item of CAR_TRANSFER_UNPUBLISHED) {
      expect(item.why.length, item.topic).toBeGreaterThan(40)
    }
  })

  // La prosa de la tarjeta repite conteos de la tabla de requisitos: decía «tres fichas» para la
  // inspección, que figura en cuatro (más dos condicionales).
  it('la tarjeta del libre de prenda y la inspección dice los mismos conteos que la tabla', () => {
    const item = CAR_TRANSFER_UNPUBLISHED.find(u => u.topic.includes('inspección'))
    expect(carTransferRequisitoCount('libreDePrenda')).toBe(3)
    expect(carTransferRequisitoCount('inspeccion')).toBe(4)
    expect(
      carTransferRequisitoCountWithConditional('inspeccion') -
        carTransferRequisitoCount('inspeccion')
    ).toBe(2)
    expect(item?.why).toContain(
      'El libre de prenda figura en tres fichas y la inspección en cuatro (más dos'
    )
  })

  // «Sin ficha» quiere decir sin ficha en el catálogo nacional: tres de esos diez publican el
  // trámite en el portal de su intendencia, y la página los nombra.
  it('los portales propios son de departamentos sin ficha en el catálogo, con URL .gub.uy', () => {
    expect(CAR_TRANSFER_OWN_PORTALS.map(p => p.departamento)).toEqual([
      'Salto',
      'Tacuarembó',
      'Río Negro',
    ])
    for (const portal of CAR_TRANSFER_OWN_PORTALS) {
      expect(CAR_TRANSFER_NO_FICHA, portal.departamento).toContain(portal.departamento)
      expect(portal.url, portal.departamento).toMatch(/^https:\/\/(www\.)?[a-z]+\.gub\.uy\//)
    }
  })

  it('hay una fuente por departamento y por portal, más las generales, todas https y sin repetir', () => {
    expect(CAR_TRANSFER_SOURCES).toHaveLength(
      CAR_TRANSFER_DEPARTMENTS.length + CAR_TRANSFER_OWN_PORTALS.length + 4
    )
    expect(CAR_TRANSFER_SOURCES.map(s => s.url)).toContain(CAR_TRANSFER_DIV_2026_SOURCE.url)
    expect(CAR_TRANSFER_SOURCES.map(s => s.url)).toContain(CAR_TRANSFER_DIV_2022_SOURCE.url)
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
    ['pesos(CAR_TRANSFER_DIV_2026)', pesos(CAR_TRANSFER_DIV_2026)],
    ['CAR_TRANSFER_DIV_YEAR', String(CAR_TRANSFER_DIV_YEAR)],
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
  // Y la cifra tiene que ser la vigente: la primera versión listaba $1.620 y $1.419, que son
  // números de fichas viejas, como si fueran precios de hoy.
  it('la descripción publica el importe vigente y ninguno de los números viejos', () => {
    const resolved = resolver(plantilla('description'))
    expect(resolved).toBe(
      'La libreta nueva sale $1.779,52 en 2026 en todo el país: la fija el SUCIVE. Qué pide cada intendencia y qué va aparte, como el escribano.'
    )
    for (const dept of carTransferOffModal()) {
      expect(resolved, dept.departamento).not.toContain(pesos(dept.arancel))
    }
  })

  it('el título resuelto es el que se midió', () => {
    expect(resolver(plantilla('title'))).toBe('Transferencia de auto: $1.780 la libreta')
  })
})
