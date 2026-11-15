/**
 * La guía de la línea de pobreza y la de indigencia del INE.
 *
 * POR QUÉ FALTABA. El sitio ya contestaba «¿se puede vivir con X?» desde el lado del GASTO
 * —`/vivir-con-25000-pesos-uruguay`, `/vivir-con-el-salario-minimo-uruguay`, los precios del SIPC
 * en `/precios-de-supermercado-uruguay`, el costo de vida de `/herramientas/costo-de-vida`— y no
 * tenía nada con la vara oficial del INGRESO, que es con la que esa misma pregunta se contesta del
 * otro lado. La cifra circulaba por el sitio sólo como palabra en otras páginas.
 *
 * LO QUE CONTESTA Y NADIE MÁS. La línea de pobreza NO es un número: son doce. Depende del tamaño
 * del hogar, de la región y —la dimensión que casi nunca se nombra— de si el hogar ALQUILA. Para
 * una persona sola en Montevideo, en junio de 2026, son $ 25.195 si alquila y $ 15.572 si no: la
 * misma persona, la misma ciudad, $ 9.623 de diferencia. Y no es un recargo arbitrario sino la
 * metodología: la canasta básica no alimentaria «no incluye el valor locativo en ningún caso, pero
 * sí incluye el alquiler para los hogares inquilinos», o sea que el propietario no computa lo que
 * valdría su vivienda y el inquilino sí computa lo que paga. Por eso el «$ 58.893» que se publica
 * suelto —la fila de tres personas, Montevideo, alquilando— se lee como un umbral de sueldo y no
 * alcanza para que nadie sepa si le toca.
 *
 * POR QUÉ ES UNA GUÍA Y NO UNA PÁGINA PROPIA. Mismo motivo, textual, que
 * `guidesPoliticaMonetaria.ts`: una página raíz nueva tiene que estar valuada en
 * `classes/revenueplan/value.ts` (`tests/unit/contenidoTramoParity.test.ts`), que vive en la raíz y
 * se despliega por separado, y su lista de deuda está en su tope, así que publicarla como
 * `pages/*.vue` obligaba a tocar la raíz o a subir un trinquete que sólo puede bajar. `/guias/*` ya
 * está en el tramo `contenido` —el que más rinde del sitio— y la ficha de guía trae tablas, FAQ con
 * `FAQPage` y bloque de fuentes, así que no se pierde nada del contenido: el cuadro entero entra.
 *
 * REGLA DE LAS CIFRAS. Ninguna está escrita a mano acá: todas salen de `utils/povertyLine.ts`, que
 * las transcribe de los cuadros 2 y 3 del informe del INE con su URL, y el cuerpo se arma con
 * plantillas sobre esas constantes. Es la lección que dejó escrita la guía de la TPM: tres páginas
 * publicaron un número viejo durante casi un mes porque cada una lo llevaba a mano. Acá, cuando
 * entre el semestre siguiente, se edita el catálogo y la guía se mueve sola —y
 * `tests/unit/povertyLine.test.ts` exige que el título y la descripción sigan diciendo las cifras
 * del cuadro—.
 *
 * LO QUE LA GUÍA DICE QUE NO ES. No es requisito de ningún beneficio: el BPS y el Mides resuelven
 * la pensión a la vejez, la asignación familiar o la Tarjeta Uruguay Social con sus propios
 * criterios de carencia de recursos. Está escrito en su propia sección para que la guía no se lea
 * como un trámite.
 */
import type { Guide } from './guides'
import {
  INDIGENCE_BASKET_2026,
  INDIGENCE_INCIDENCE,
  POVERTY_INCIDENCE,
  POVERTY_LINES,
  POVERTY_LINE_MONTH,
  POVERTY_LINE_SOURCES,
  formatPesos,
  incidenceChange,
  latestIndigenceBasket,
  povertyLineFor,
  regionGap,
  tenureGap,
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

/** `1` → «una persona», `3` → «tres personas». El cuadro del INE llega hasta tres. */
const hogar = (size: number) =>
  size === 1 ? 'una persona' : `${['', 'una', 'dos', 'tres'][size]} personas`

const one = povertyLineFor(1)!
const two = povertyLineFor(2)!
const three = povertyLineFor(3)!
const basket = latestIndigenceBasket()
const mesIndigencia = basket.month.toLowerCase()

export const POBREZA_GUIDE_SLUG = 'linea-de-pobreza-uruguay'

/** El título y la descripción de la guía, armados desde el cuadro y no escritos a mano. */
export const POBREZA_GUIDE_TITLE = `Línea de pobreza: ${formatPesos(one.montevideoTenant)} si alquilás`
export const POBREZA_GUIDE_DESCRIPTION = `Junio 2026 (INE): una persona sola está bajo la línea de pobreza con menos de ${formatPesos(one.montevideoTenant)} si alquila en Montevideo, ${formatPesos(one.montevideoOwner)} si no. Tres personas, ${formatPesos(three.montevideoTenant)}.`

export const pobrezaGuides: readonly Guide[] = [
  {
    slug: POBREZA_GUIDE_SLUG,
    title: POBREZA_GUIDE_TITLE,
    description: POBREZA_GUIDE_DESCRIPTION,
    tag: 'POBREZA',
    updatedAt: '2026-11-15',
    sections: [
      {
        heading: 'La respuesta corta',
        body: `En ${POVERTY_LINE_MONTH}, una persona que vive sola en Montevideo está bajo la línea de pobreza si sus ingresos líquidos mensuales no llegan a ${formatPesos(one.montevideoTenant)} cuando alquila, o a ${formatPesos(one.montevideoOwner)} cuando no alquila. En el interior esas dos cifras son ${formatPesos(one.interiorTenant)} y ${formatPesos(one.interiorOwner)}. Un hogar de tres personas que alquila en Montevideo queda debajo con menos de ${formatPesos(three.montevideoTenant)}. Esa última es la que suele circular sola, y es la que hace que el tema se entienda mal: ${formatPesos(three.montevideoTenant)} no es «la» línea de pobreza, es la de un hogar de tres personas, en Montevideo, que paga alquiler. Para el mismo hogar sin alquiler la línea es ${formatPesos(three.montevideoOwner)}, y para una persona sola en el interior con vivienda propia, ${formatPesos(one.interiorOwner)}.`,
      },
      {
        heading: `El cuadro completo (${POVERTY_LINE_MONTH})`,
        body: `Ingresos líquidos mensuales del hogar, en pesos, según la región y según si el hogar paga alquiler. Es el cuadro 2 del informe del INE, transcripto sin redondear. El informe lo publica hasta tres integrantes: para un hogar más grande la línea se arma con la metodología de adulto equivalente del propio informe, cuyos coeficientes no se publican mes a mes, así que esta guía no estima esa fila en lugar de inventarla.`,
        table: {
          headers: [
            'Hogar',
            'Montevideo, alquila',
            'Montevideo, no alquila',
            'Interior, alquila',
            'Interior, no alquila',
          ],
          rows: POVERTY_LINES.map(row => [
            hogar(row.size),
            formatPesos(row.montevideoTenant),
            formatPesos(row.montevideoOwner),
            formatPesos(row.interiorTenant),
            formatPesos(row.interiorOwner),
          ]),
        },
      },
      {
        heading: 'Por qué alquilar mueve la línea',
        body: `La diferencia entre las dos columnas de Montevideo es de ${formatPesos(tenureGap(one, 'montevideo'))} para una persona sola, ${formatPesos(tenureGap(two, 'montevideo'))} para dos y ${formatPesos(tenureGap(three, 'montevideo'))} para tres; en el interior, de ${formatPesos(tenureGap(one, 'interior'))}, ${formatPesos(tenureGap(two, 'interior'))} y ${formatPesos(tenureGap(three, 'interior'))}. No es un recargo arbitrario: está en la metodología. La línea de pobreza es la suma de la canasta básica alimentaria y la no alimentaria, y sobre la segunda el informe dice que «no incluye el valor locativo en ningún caso, pero sí incluye el alquiler para los hogares inquilinos». O sea que el hogar propietario no computa lo que valdría su vivienda y el inquilino sí computa lo que paga: dos hogares idénticos tienen líneas distintas porque uno de los dos tiene que pagar el techo todos los meses. Es también la razón por la que el precio del alquiler y la pobreza medida se mueven juntos.`,
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
        body: `La indigencia mide otra cosa: no el ingreso total, sino si alcanza para comer. Su vara es la canasta básica alimentaria, que en ${mesIndigencia} de 2026 fue de ${formatPesos(basket.montevideo)} por persona en Montevideo y ${formatPesos(basket.interior)} en el interior. Es la serie de un hogar unipersonal, que es la que el informe publica todos los meses, y siempre queda bastante por debajo de la línea de pobreza del mismo hogar: la de pobreza suma a esa canasta la no alimentaria —vivienda, transporte, salud, educación—.`,
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
        body: `En el ${POVERTY_INCIDENCE.period}, el ${pct(POVERTY_INCIDENCE.current.people)} de las personas y el ${pct(POVERTY_INCIDENCE.current.households)} de los hogares estaban bajo la línea de pobreza, contra ${pct(POVERTY_INCIDENCE.previous.people)} y ${pct(POVERTY_INCIDENCE.previous.households)} un año antes: una baja de ${pp(incidenceChange(POVERTY_INCIDENCE, 'people'))} y ${pp(incidenceChange(POVERTY_INCIDENCE, 'households'))} puntos porcentuales. El informe publica la medida de personas con un margen de error de ±${pp(POVERTY_INCIDENCE.current.peopleMargin)} puntos, así que una diferencia más chica que eso no sería distinguible de cero; esta no lo es. La indigencia pasó de ${pct(INDIGENCE_INCIDENCE.previous.people)} a ${pct(INDIGENCE_INCIDENCE.current.people)} de las personas.`,
        table: {
          headers: ['Medida', POVERTY_INCIDENCE.period, POVERTY_INCIDENCE.previousPeriod],
          rows: [
            [
              'Personas bajo la línea de pobreza',
              pct(POVERTY_INCIDENCE.current.people),
              pct(POVERTY_INCIDENCE.previous.people),
            ],
            [
              'Hogares bajo la línea de pobreza',
              pct(POVERTY_INCIDENCE.current.households),
              pct(POVERTY_INCIDENCE.previous.households),
            ],
            [
              'Personas bajo la línea de indigencia',
              pct(INDIGENCE_INCIDENCE.current.people),
              pct(INDIGENCE_INCIDENCE.previous.people),
            ],
            [
              'Hogares bajo la línea de indigencia',
              pct(INDIGENCE_INCIDENCE.current.households),
              pct(INDIGENCE_INCIDENCE.previous.households),
            ],
          ],
        },
      },
      {
        heading: 'Lo que esta línea NO es',
        body: `No es el requisito de ningún beneficio. El BPS y el Mides resuelven la pensión a la vejez, la asignación familiar o la Tarjeta Uruguay Social con sus propios criterios de carencia de recursos, que no son esta línea y se piden en sus propios trámites. Tampoco es un sueldo mínimo ni el umbral de un impuesto: no determina cuánto te tienen que pagar ni cuánto aportás. Acá está sólo la vara con la que el INE mide la pobreza del país.`,
        links: [
          {
            label: 'Pensión a la vejez y por invalidez del BPS',
            to: '/pension-a-la-vejez-uruguay',
          },
          {
            label: 'Vivir con el salario mínimo en Uruguay',
            to: '/vivir-con-el-salario-minimo-uruguay',
          },
        ],
      },
      {
        heading: 'Cada cuánto se actualiza',
        body: `El INE publica el valor de las canastas todos los meses y la incidencia de la pobreza por semestre y por año, con la Encuesta Continua de Hogares. Esta guía lleva el último cuadro publicado, con su mes a la vista, y todas sus cifras salen de ese informe: las únicas cuentas propias son restas entre celdas del mismo cuadro —la brecha por tenencia y la baja entre semestres— y están escritas al lado del número.`,
      },
    ],
    faqs: [
      {
        q: '¿Cuál es la línea de pobreza en Uruguay hoy?',
        a: `Depende del hogar. En ${POVERTY_LINE_MONTH}, una persona sola en Montevideo tiene una línea de ${formatPesos(one.montevideoTenant)} si alquila y ${formatPesos(one.montevideoOwner)} si no; un hogar de tres personas que alquila en Montevideo, ${formatPesos(three.montevideoTenant)}. En el interior todas las cifras son más bajas: ${formatPesos(regionGap(one, 'tenant'))} menos para una persona sola que alquila.`,
      },
      {
        q: '¿Por qué la línea es más alta si alquilo?',
        a: 'Porque la canasta básica no alimentaria con la que se arma la línea no incluye el valor locativo en ningún caso, pero sí incluye el alquiler para los hogares inquilinos. El hogar propietario no computa lo que valdría su vivienda y el inquilino sí computa lo que paga, así que dos hogares del mismo tamaño en la misma región tienen líneas distintas.',
      },
      {
        q: '¿La línea de pobreza y la de indigencia son lo mismo?',
        a: `No. La de indigencia es la canasta básica alimentaria: mide si el ingreso alcanza para comer, y en ${mesIndigencia} de 2026 fue de ${formatPesos(basket.montevideo)} por persona en Montevideo. La de pobreza suma a esa canasta la no alimentaria —vivienda, transporte, salud, educación—, así que siempre es bastante más alta.`,
      },
      {
        q: '¿Sirve para pedir una pensión o la Tarjeta Uruguay Social?',
        a: 'No. Es una medida estadística con la que el INE mide la pobreza del país, no un requisito de ningún beneficio. El BPS y el Mides evalúan la carencia de recursos con sus propios criterios y en sus propios trámites.',
      },
      {
        q: '¿Cuánta gente está bajo la línea de pobreza?',
        a: `En el ${POVERTY_INCIDENCE.period}, el ${pct(POVERTY_INCIDENCE.current.people)} de las personas y el ${pct(POVERTY_INCIDENCE.current.households)} de los hogares, contra ${pct(POVERTY_INCIDENCE.previous.people)} y ${pct(POVERTY_INCIDENCE.previous.households)} un año antes. La indigencia pasó de ${pct(INDIGENCE_INCIDENCE.previous.people)} a ${pct(INDIGENCE_INCIDENCE.current.people)} de las personas.`,
      },
      {
        q: '¿El cuadro sirve para un hogar de cuatro personas o más?',
        a: 'El informe publica la línea hasta tres integrantes. Para un hogar más grande se arma con la metodología de adulto equivalente del propio informe, cuyos coeficientes no se publican mes a mes, así que esta guía no la estima: la cifra de cuatro personas que puedas ver por ahí no sale del cuadro.',
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
