/**
 * La guía de la línea de pobreza y la de indigencia del INE.
 *
 * POR QUÉ FALTABA. El sitio ya contestaba «¿se puede vivir con X?» desde el lado del GASTO
 * —`/vivir-con-25000-pesos-uruguay`, `/vivir-con-el-salario-minimo-uruguay`, los precios del SIPC
 * en `/precios-de-supermercado-uruguay`, el costo de vida de `/herramientas/costo-de-vida`— y esas
 * páginas comparan contra la línea del INE, pero ninguna explica cómo se arma. Ésta es la que lo
 * hace, con el último informe.
 *
 * LO QUE CONTESTA. La línea de pobreza NO es un número. Depende del tamaño del hogar, de la región
 * y —la dimensión que casi nunca se nombra— de si el hogar ALQUILA. Para una persona sola en
 * Montevideo, en junio de 2026, son $ 25.195 si alquila y $ 15.572 si no. Y no es un recargo
 * arbitrario sino la metodología: la canasta básica no alimentaria «no incluye el valor locativo en
 * ningún caso, pero sí incluye el alquiler para los hogares inquilinos». Ese alquiler es un rubro
 * FIJO de la canasta —el mismo para todos los inquilinos de su tamaño y región—, no lo que paga
 * cada hogar: por eso la brecha de una persona sola es exactamente la diferencia entre las dos
 * canastas no alimentarias del cuadro 3.
 *
 * LOS HOGARES DE CUATRO O MÁS. El cuadro 2 llega hasta tres integrantes, pero la nota metodológica
 * del INE publica la fórmula con sus exponentes fijos, y el cuadro 3 da los componentes del mes.
 * La guía calcula las filas de cuatro y cinco con esa fórmula (`estimatePovertyLine`), las rotula
 * como cálculo propio y dice cuánto se aparta la fórmula de las doce celdas que el INE sí publica.
 *
 * POR QUÉ ES UNA GUÍA Y NO UNA PÁGINA PROPIA. Mismo motivo, textual, que
 * `guidesPoliticaMonetaria.ts`: una página raíz nueva tiene que estar valuada en
 * `classes/revenueplan/value.ts` (`tests/unit/contenidoTramoParity.test.ts`), que vive en la raíz y
 * se despliega por separado, y su lista de deuda está en su tope. `/guias/*` ya está en el tramo
 * `contenido` y la ficha de guía trae tablas, FAQ con `FAQPage` y bloque de fuentes.
 *
 * REGLA DE LAS CIFRAS. Ninguna está escrita a mano acá: todas salen de `utils/povertyLine.ts`, que
 * las transcribe de los informes del INE con su URL, y el cuerpo se arma con plantillas sobre esas
 * constantes. Es la lección que dejó escrita la guía de la TPM: tres páginas publicaron un número
 * viejo durante casi un mes porque cada una lo llevaba a mano.
 *
 * LO QUE LA GUÍA DICE QUE NO ES. No es el salario mínimo. Sobre beneficios dice sólo lo que las
 * leyes dicen: el Monotributo Social Mides la usa como requisito (Ley 18.874, art. 1) y la
 * asignación familiar del Plan de Equidad no la nombra (Ley 18.227, art. 2). Un borrador decía
 * «no es requisito de ningún beneficio», y era falso: el propio `monotributoInvoicing.ts` cita la
 * ley que la exige.
 */
import type { Guide } from './guides'
import {
  BASKET_COMPONENTS,
  ESTIMATED_SIZES,
  INDIGENCE_BASKET_2026,
  INDIGENCE_INCIDENCE,
  POVERTY_INCIDENCE,
  POVERTY_LINES,
  POVERTY_LINE_LEGAL,
  POVERTY_LINE_MONTH,
  POVERTY_LINE_SOURCES,
  RENT_QUOTE,
  SCALE_EXPONENTS,
  estimatedRow,
  formatPesos,
  incidenceChange,
  latestIndigenceBasket,
  maxFormulaDeviation,
  povertyLineFor,
  regionGap,
  rentItem,
  tenureGap,
  type PovertyLineRow,
} from './povertyLine'

/**
 * `14.8` → «14,8 %», `1` → «1,0 %». Coma decimal, y SIEMPRE un decimal: el informe publica la
 * indigencia de hogares como «1,0 %» y sin el mínimo saldría «1 %», que es una cifra con menos
 * precisión que la que el INE publicó.
 */
const pct = (value: number) =>
  `${value.toLocaleString('es-UY', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`

/** Los puntos porcentuales de un margen o de una variación, con el mismo decimal y sin el `%`. */
const pp = (value: number) =>
  value.toLocaleString('es-UY', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Un exponente de la nota metodológica con coma decimal: `0.9` → «0,9». */
const exp = (value: number) => value.toLocaleString('es-UY', { maximumFractionDigits: 1 })

/** Una estimación con su margen: «14,8 % (±1,0)». */
const withMargin = (value: number, margin: number) => `${pct(value)} (±${pp(margin)})`

const NUMBERS = ['', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis']

/** `1` → «una persona», `3` → «tres personas». */
const hogar = (size: number) => (size === 1 ? 'una persona' : `${NUMBERS[size]} personas`)

const one = povertyLineFor(1)!
const two = povertyLineFor(2)!
const three = povertyLineFor(3)!
const four = estimatedRow(4)
const basket = latestIndigenceBasket()
const mesIndigencia = basket.month.toLowerCase()
const mvd = BASKET_COMPONENTS.montevideo
const deviation = maxFormulaDeviation()

const tableRow = (row: PovertyLineRow, label: string) => [
  label,
  formatPesos(row.montevideoTenant),
  formatPesos(row.montevideoOwner),
  formatPesos(row.interiorTenant),
  formatPesos(row.interiorOwner),
]

/** La fórmula de la nota metodológica, en palabras, con los exponentes del catálogo. */
const FORMULA = `la canasta alimentaria por persona multiplicada por la cantidad de integrantes, más la canasta no alimentaria sin alquiler multiplicada por n elevado a ${exp(SCALE_EXPONENTS.montevideo.nonFood)} y, si el hogar alquila, el rubro de alquiler multiplicado por n elevado a ${exp(SCALE_EXPONENTS.montevideo.rent)}, en Montevideo; en el interior los exponentes son ${exp(SCALE_EXPONENTS.interior.nonFood)} y ${exp(SCALE_EXPONENTS.interior.rent)}`

export const POBREZA_GUIDE_SLUG = 'linea-de-pobreza-uruguay'

/** El título y la descripción de la guía, armados desde el cuadro y no escritos a mano. */
export const POBREZA_GUIDE_TITLE = `Línea de pobreza: ${formatPesos(one.montevideoTenant)} si alquilás solo`
export const POBREZA_GUIDE_DESCRIPTION = `Junio 2026 (INE): para una persona sola en Montevideo, la línea de pobreza es ${formatPesos(one.montevideoTenant)} si alquila y ${formatPesos(one.montevideoOwner)} si no. Tres personas que alquilan: ${formatPesos(three.montevideoTenant)}.`

export const pobrezaGuides: readonly Guide[] = [
  {
    slug: POBREZA_GUIDE_SLUG,
    title: POBREZA_GUIDE_TITLE,
    description: POBREZA_GUIDE_DESCRIPTION,
    tag: 'POBREZA',
    updatedAt: '2026-11-20',
    sections: [
      {
        heading: 'La respuesta corta',
        body: `En ${POVERTY_LINE_MONTH}, una persona que vive sola en Montevideo está bajo la línea de pobreza si los ingresos líquidos de su hogar no llegan a ${formatPesos(one.montevideoTenant)} cuando alquila, o a ${formatPesos(one.montevideoOwner)} cuando no alquila. En el interior esas dos cifras son ${formatPesos(one.interiorTenant)} y ${formatPesos(one.interiorOwner)}. Un hogar de tres personas que alquila en Montevideo queda debajo con menos de ${formatPesos(three.montevideoTenant)}. Esa última es la que suele circular sola, y es la que hace que el tema se entienda mal: ${formatPesos(three.montevideoTenant)} no es «la» línea de pobreza, es la de un hogar de tres personas, en Montevideo, que paga alquiler. Para el mismo hogar sin alquiler la línea es ${formatPesos(three.montevideoOwner)}, y para una persona sola en el interior que no alquila, ${formatPesos(one.interiorOwner)}.`,
      },
      {
        heading: `El cuadro completo (${POVERTY_LINE_MONTH})`,
        body: `Ingresos líquidos del hogar por mes, en pesos, según la región y según si el hogar paga alquiler. Las filas de una, dos y tres personas son el cuadro 2 del informe del INE, transcripto sin redondear: el informe lo publica hasta tres integrantes. Para un hogar más grande, la nota metodológica del INE da la fórmula: ${FORMULA}. Las filas de ${ESTIMATED_SIZES.map(hogar).join(' y ')} son una cuenta nuestra con esa fórmula y los componentes de ${BASKET_COMPONENTS.month} del cuadro 3, no cifras publicadas por el INE. Aplicada a una, dos y tres personas, la misma cuenta se aparta del cuadro 2 en ${deviation === 1 ? '1 peso' : `${deviation} pesos`} como máximo, porque los componentes del cuadro 3 vienen redondeados.`,
        table: {
          headers: [
            'Hogar',
            'Montevideo, alquila',
            'Montevideo, no alquila',
            'Interior, alquila',
            'Interior, no alquila',
          ],
          rows: [
            ...POVERTY_LINES.map(row => tableRow(row, hogar(row.size))),
            ...ESTIMATED_SIZES.map(size =>
              tableRow(estimatedRow(size), `${hogar(size)} (cálculo propio)`)
            ),
          ],
        },
      },
      {
        heading: 'Por qué alquilar mueve la línea',
        body: `La diferencia entre las dos columnas de Montevideo es de ${formatPesos(tenureGap(one, 'montevideo'))} para una persona sola, ${formatPesos(tenureGap(two, 'montevideo'))} para dos y ${formatPesos(tenureGap(three, 'montevideo'))} para tres; en el interior, de ${formatPesos(tenureGap(one, 'interior'))}, ${formatPesos(tenureGap(two, 'interior'))} y ${formatPesos(tenureGap(three, 'interior'))}. No es un recargo arbitrario: está en la metodología. La línea de pobreza es la suma de la canasta básica alimentaria y la no alimentaria, y sobre la segunda el informe dice que «${RENT_QUOTE}». Ese alquiler es un rubro fijo de la canasta, el mismo monto para todos los inquilinos del mismo tamaño y región, y no el alquiler que paga cada hogar: en ${BASKET_COMPONENTS.month}, para una persona sola en Montevideo, la canasta no alimentaria es de ${formatPesos(mvd.nonFoodTenant)} para el inquilino y ${formatPesos(mvd.nonFoodOwner)} para el que no alquila (cuadro 3), y esos ${formatPesos(rentItem('montevideo'))} de diferencia son exactamente la distancia entre las dos líneas. Del otro lado de la comparación, el ingreso del hogar tampoco suma el valor locativo: a quien no alquila no se le cuenta como ingreso lo que pagaría si tuviera que alquilar la vivienda que ocupa. Según la nota metodológica, cada componente se actualiza mes a mes con su índice del IPC, y el del alquiler con el de alquileres.`,
        links: [
          { label: 'Alquileres: lo que piden los avisos de hoy', to: '/alquileres-uruguay' },
          {
            label: 'Evolución del precio de los alquileres',
            to: '/evolucion-precio-alquileres-uruguay',
          },
        ],
      },
      {
        heading: 'La línea de indigencia, mes por mes',
        body: `La indigencia usa otra vara: compara el ingreso del hogar con lo que cuesta sólo la comida, la canasta básica alimentaria. En ${mesIndigencia} de 2026 esa canasta fue de ${formatPesos(basket.montevideo)} por persona en Montevideo y ${formatPesos(basket.interior)} en el interior, y para un hogar de más integrantes la nota metodológica la multiplica por la cantidad de personas. La tabla es la serie del cuadro 3, que el informe publica mes por mes para el hogar de una persona. Siempre queda bastante por debajo de la línea de pobreza del mismo hogar, porque la de pobreza suma a esa canasta la no alimentaria, que incluye vivienda, transporte, salud y educación, entre otros rubros.`,
        table: {
          headers: ['Mes de 2026', 'Montevideo', 'Interior'],
          rows: INDIGENCE_BASKET_2026.map(month => [
            month.month,
            formatPesos(month.montevideo),
            formatPesos(month.interior),
          ]),
        },
      },
      {
        heading: 'Cuánta gente está debajo',
        body: `En el ${POVERTY_INCIDENCE.period}, el ${pct(POVERTY_INCIDENCE.current.people)} de las personas y el ${pct(POVERTY_INCIDENCE.current.households)} de los hogares estaban bajo la línea de pobreza, contra ${pct(POVERTY_INCIDENCE.previous.people)} y ${pct(POVERTY_INCIDENCE.previous.households)} un año antes: una baja de ${pp(incidenceChange(POVERTY_INCIDENCE, 'people'))} y ${pp(incidenceChange(POVERTY_INCIDENCE, 'households'))} puntos porcentuales. Cada estimación viene con su margen de error al 95 %, que el INE publica en el cuadro 1 de cada informe: ±${pp(POVERTY_INCIDENCE.current.peopleMargin)} y ±${pp(POVERTY_INCIDENCE.previous.peopleMargin)} puntos para las personas y ±${pp(POVERTY_INCIDENCE.current.householdsMargin)} y ±${pp(POVERTY_INCIDENCE.previous.householdsMargin)} para los hogares, en ese orden (2026 y 2025). La indigencia pasó de ${pct(INDIGENCE_INCIDENCE.previous.people)} a ${pct(INDIGENCE_INCIDENCE.current.people)} de las personas.`,
        table: {
          headers: [
            'Medida (margen al 95 %)',
            POVERTY_INCIDENCE.period,
            POVERTY_INCIDENCE.previousPeriod,
          ],
          rows: [
            [
              'Personas bajo la línea de pobreza',
              withMargin(POVERTY_INCIDENCE.current.people, POVERTY_INCIDENCE.current.peopleMargin),
              withMargin(
                POVERTY_INCIDENCE.previous.people,
                POVERTY_INCIDENCE.previous.peopleMargin
              ),
            ],
            [
              'Hogares bajo la línea de pobreza',
              withMargin(
                POVERTY_INCIDENCE.current.households,
                POVERTY_INCIDENCE.current.householdsMargin
              ),
              withMargin(
                POVERTY_INCIDENCE.previous.households,
                POVERTY_INCIDENCE.previous.householdsMargin
              ),
            ],
            [
              'Personas bajo la línea de indigencia',
              withMargin(
                INDIGENCE_INCIDENCE.current.people,
                INDIGENCE_INCIDENCE.current.peopleMargin
              ),
              withMargin(
                INDIGENCE_INCIDENCE.previous.people,
                INDIGENCE_INCIDENCE.previous.peopleMargin
              ),
            ],
            [
              'Hogares bajo la línea de indigencia',
              withMargin(
                INDIGENCE_INCIDENCE.current.households,
                INDIGENCE_INCIDENCE.current.householdsMargin
              ),
              withMargin(
                INDIGENCE_INCIDENCE.previous.households,
                INDIGENCE_INCIDENCE.previous.householdsMargin
              ),
            ],
          ],
        },
      },
      {
        heading: 'Lo que esta línea es y lo que no',
        body: `Es la vara con la que el INE mide la pobreza del país. No es el salario mínimo ni dice cuánto te tienen que pagar. Y hay una norma que sí la usa como requisito: para el Monotributo Social Mides, la ${POVERTY_LINE_LEGAL.monotributoSocial.law} pone como condición que todos los integrantes del emprendimiento «${POVERTY_LINE_LEGAL.monotributoSocial.quote}». La asignación familiar del Plan de Equidad, en cambio, no la nombra: la ${POVERTY_LINE_LEGAL.asignacionFamiliar.law} manda determinar qué hogares están en situación de vulnerabilidad «${POVERTY_LINE_LEGAL.asignacionFamiliar.quote}».`,
        links: [
          {
            label: 'Facturar en monotributo, también el Monotributo Social Mides',
            to: '/facturar-en-monotributo-uruguay',
          },
          { label: 'Asignación familiar: quién la cobra', to: '/asignacion-familiar-uruguay' },
          {
            label: 'Vivir con el salario mínimo en Uruguay',
            to: '/vivir-con-el-salario-minimo-uruguay',
          },
        ],
      },
      {
        heading: 'Cada cuánto se actualiza',
        body: `El INE publica la incidencia de la pobreza en informes por semestre, con la Encuesta Continua de Hogares, y en cada informe trae el valor de las canastas mes por mes (cuadro 3). El del ${POVERTY_INCIDENCE.period} lo difundió Presidencia el 07/10/2026. Esta guía lleva ese último informe, con su mes a la vista. Las cuentas propias están escritas al lado del número: restas entre celdas del mismo cuadro —la brecha por tenencia y la baja entre semestres— y las filas de ${ESTIMATED_SIZES.map(hogar).join(' y ')}, armadas con la fórmula del INE.`,
      },
    ],
    faqs: [
      {
        q: '¿Cuál es la línea de pobreza en Uruguay hoy?',
        a: `Depende del hogar. En ${POVERTY_LINE_MONTH}, una persona sola en Montevideo tiene una línea de ${formatPesos(one.montevideoTenant)} si alquila y ${formatPesos(one.montevideoOwner)} si no; un hogar de tres personas que alquila en Montevideo, ${formatPesos(three.montevideoTenant)}. En el interior todas las cifras son más bajas: ${formatPesos(regionGap(one, 'tenant'))} menos para una persona sola que alquila.`,
      },
      {
        q: '¿Por qué la línea es más alta si alquilo?',
        a: `Porque la canasta básica no alimentaria con la que se arma la línea ${RENT_QUOTE}. Ese alquiler es un monto fijo de la canasta, igual para todos los inquilinos del mismo tamaño y región, y no lo que paga cada uno: para una persona sola en Montevideo, en ${BASKET_COMPONENTS.month}, fueron ${formatPesos(rentItem('montevideo'))}.`,
      },
      {
        q: '¿La línea de pobreza y la de indigencia son lo mismo?',
        a: `No. La de indigencia es la canasta básica alimentaria: compara el ingreso con lo que cuesta comer, y en ${mesIndigencia} de 2026 fue de ${formatPesos(basket.montevideo)} por persona en Montevideo. La de pobreza suma a esa canasta la no alimentaria, que incluye vivienda, transporte, salud y educación, así que siempre es bastante más alta.`,
      },
      {
        q: '¿La línea de pobreza es requisito para algún beneficio?',
        a: `Para el Monotributo Social Mides, sí: la ${POVERTY_LINE_LEGAL.monotributoSocial.law} exige que los integrantes del emprendimiento vivan en hogares por debajo de la línea de pobreza del INE o en situación de vulnerabilidad socioeconómica. La asignación familiar del Plan de Equidad no la nombra: la ${POVERTY_LINE_LEGAL.asignacionFamiliar.law} manda medir la vulnerabilidad con criterios estadísticos que tienen en cuenta, entre otros factores, los ingresos del hogar, sus condiciones habitacionales, su composición, las características de sus integrantes y su situación sanitaria.`,
      },
      {
        q: '¿Cuánta gente está bajo la línea de pobreza?',
        a: `En el ${POVERTY_INCIDENCE.period}, el ${pct(POVERTY_INCIDENCE.current.people)} de las personas y el ${pct(POVERTY_INCIDENCE.current.households)} de los hogares, contra ${pct(POVERTY_INCIDENCE.previous.people)} y ${pct(POVERTY_INCIDENCE.previous.households)} un año antes. La indigencia pasó de ${pct(INDIGENCE_INCIDENCE.previous.people)} a ${pct(INDIGENCE_INCIDENCE.current.people)} de las personas.`,
      },
      {
        q: '¿Cuál es la línea para un hogar de cuatro personas o más?',
        a: `El cuadro del INE llega hasta tres integrantes, pero su nota metodológica publica la fórmula: ${FORMULA}. Con los componentes de ${BASKET_COMPONENTS.month}, un hogar de cuatro personas que alquila en Montevideo da unos ${formatPesos(four.montevideoTenant)}, y ${formatPesos(four.montevideoOwner)} si no alquila; en el interior, ${formatPesos(four.interiorTenant)} y ${formatPesos(four.interiorOwner)}. Son cálculos nuestros con el método del INE, no cifras que el INE haya publicado.`,
      },
    ],
    sources: POVERTY_LINE_SOURCES.map(source => ({ label: source.label, url: source.url })),
    related: [
      { label: '¿Se puede vivir con 25.000 pesos?', to: '/vivir-con-25000-pesos-uruguay' },
      { label: 'Precios de supermercado, local por local', to: '/precios-de-supermercado-uruguay' },
      { label: 'Costo de vida en Uruguay', to: '/herramientas/costo-de-vida' },
    ],
  },
]
