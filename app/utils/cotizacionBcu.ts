// app/utils/cotizacionBcu.ts
// Datos y aritmética de /cotizacion-del-bcu: qué publica realmente el Banco Central, por qué ese
// número no es el que te cobran en el mostrador, y cuál es la cotización que manda usar la DGI.
//
// POR QUÉ EXISTE: "cotizacion bcu" y "bcu cotizaciones" son de las consultas con más impresiones
// del sitio y no tenían página propia — el glosario define «dólar interbancario» en un párrafo y
// nada más. Quien busca eso llega con una de dos preguntas concretas: «¿por qué el BCU dice un
// número y el cambio me cobra otro?» o «¿qué cotización pongo en la factura / en la declaración?».
// Las dos se contestan con normas y con documentos oficiales, no con opinión.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA:
//
//   1. Ninguna cotización del BCU. Este sitio no consume la serie del BCU: publica el mostrador de
//      las casas de cambio. Poner acá un número "del BCU" que en realidad salió de otro lado sería
//      exactamente el error que la página denuncia. Para el número, el enlace va al BCU.
//
//   2. Si la cotización interbancaria que pide la DGI es la compradora o la vendedora. El texto de
//      la DGI dice «el tipo de cambio interbancario del día anterior a la operación» y no aclara
//      cuál de las dos puntas; el dato que la propia DGI publica como serie es «compra billete».
//      Afirmar cuál corresponde a tu caso es asesoramiento contable y no lo damos.
//
//   3. La fecha exacta que aplica cuando el día anterior fue feriado. `diaDeCotizacionDgi()` retrocede
//      sobre sábados y domingos —que son fijos y verificables— y sobre los días que el llamador le
//      pase explícitamente. El calendario completo de feriados uruguayos no está publicado en este
//      sitio (ver `utils/feriados.ts`, que explica por qué), así que la página avisa del caso en
//      vez de calcularlo mal.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-27 (ver BCU_COTIZACION_SOURCES):
//   - BCU, «Cotizaciones» (Estadísticas e Indicadores) — la consulta de la serie diaria.
//   - BCU, Sala de Prensa 03/01/2017 — el sistema de consulta permite filtrar «por tipo de moneda,
//     cotizaciones interbancarias o arbitrajes internacionales» y descargar en varios formatos.
//   - BCU, «Promedio Mensual de Arbitrajes de las Principales Monedas» — la nota al pie que cita la
//     Comunicación 2008/001: el dólar fondo de cierre es el promedio ponderado de las operaciones
//     efectivamente realizadas en el mercado que opera BEVSA, y para dólar billete, peso argentino
//     billete y real billete se informa «una cotización única».
//   - DGI, «Operaciones en moneda extranjera» — la regla de conversión a pesos.
//   - DGI, «Cotizaciones interbancarias» — la serie que la propia DGI publica (compra billete).

export interface BcuSource {
  readonly label: string
  readonly publisher: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const BCU_COTIZACION_VERIFIED_AT = '2026-08-27'

export const BCU_COTIZACION_SOURCES: readonly BcuSource[] = [
  {
    label: 'Cotizaciones (Estadísticas e Indicadores)',
    publisher: 'Banco Central del Uruguay',
    url: 'https://www.bcu.gub.uy/Estadisticas-e-Indicadores/Paginas/Cotizaciones.aspx',
  },
  {
    label: 'El BCU pone a disposición un nuevo sistema de consulta de las cotizaciones diarias',
    publisher: 'Banco Central del Uruguay — Sala de Prensa, 03/01/2017',
    url: 'https://www.bcu.gub.uy/Comunicaciones/Paginas/El%20BCU%20pone%20a%20disposici%C3%B3n%20un%20nuevo%20sistema%20de%20consulta%20de%20las%20cotizaciones%20diarias.aspx',
  },
  {
    label:
      'Promedio Mensual de Arbitrajes de las Principales Monedas (nota: Comunicación 2008/001)',
    publisher: 'Banco Central del Uruguay — Área de Estadísticas Económicas',
    url: 'https://www.bcu.gub.uy/Estadisticas-e-Indicadores/Promedio%20Mensual%20de%20Arbitrajes/Promedio%20Mensual%20de%20Arbitrajes%20de%20las%20Principales%20Monedas%20-%20Enero%202023.pdf',
  },
  {
    label: 'Operaciones en moneda extranjera',
    publisher: 'Dirección General Impositiva',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/operaciones-moneda-extranjera',
  },
  {
    label: 'Cotizaciones interbancarias (serie publicada por la DGI)',
    publisher: 'Dirección General Impositiva',
    url: 'https://www.gub.uy/direccion-general-impositiva/datos-y-estadisticas/datos/cotizaciones-interbancarias',
  },
] as const

// ---------------------------------------------------------------------------
// Qué publica el BCU
// ---------------------------------------------------------------------------

export interface SerieBcu {
  readonly key: string
  readonly nombre: string
  /** Qué es, en una línea. */
  readonly que: string
  /**
   * Si el BCU informa un solo número o dos puntas. Es el dato que explica el malentendido entero:
   * una serie con una sola cotización no puede ser un precio de mostrador, porque un mostrador
   * necesariamente compra más barato de lo que vende.
   */
  readonly puntas: 'una' | 'dos'
  readonly detalle: string
}

/**
 * Las familias que el BCU publica en su consulta diaria.
 *
 * El agrupamiento —interbancarias por un lado, arbitrajes internacionales por otro— es el del
 * propio BCU: son los dos filtros que ofrece su sistema de consulta desde enero de 2017.
 */
export const SERIES_BCU: readonly SerieBcu[] = [
  {
    key: 'dolar-fondo',
    nombre: 'Dólar fondo',
    que: 'El cierre del día del mercado mayorista.',
    puntas: 'una',
    detalle:
      'Desde el 2 de enero de 2008, y de acuerdo a la Comunicación 2008/001, se calcula como el promedio ponderado de las operaciones efectivamente realizadas en el mercado que opera BEVSA. Es un promedio de operaciones ya cerradas entre instituciones: nadie lo puede pedir en una ventanilla.',
  },
  {
    key: 'dolar-billete',
    nombre: 'Dólar billete',
    que: 'La referencia interbancaria del billete físico.',
    puntas: 'una',
    detalle:
      'El BCU sigue «un criterio consistente con el anterior, informando una cotización única». Una sola cotización, no una compradora y una vendedora.',
  },
  {
    key: 'peso-argentino-billete',
    nombre: 'Peso argentino billete',
    que: 'Misma familia que el dólar billete.',
    puntas: 'una',
    detalle: 'También se informa con una cotización única, por el mismo criterio.',
  },
  {
    key: 'real-billete',
    nombre: 'Real billete',
    que: 'Misma familia que el dólar billete.',
    puntas: 'una',
    detalle: 'También se informa con una cotización única, por el mismo criterio.',
  },
  {
    key: 'arbitrajes',
    nombre: 'Arbitrajes internacionales',
    que: 'Cuántas unidades de cada moneda entran en un dólar.',
    puntas: 'una',
    detalle:
      'La mesa de cambios del BCU publica el arbitraje de las principales monedas expresado en unidades monetarias por dólar (con la excepción del dólar australiano y la libra, que van al revés). Es el puente que se usa cuando una moneda no tiene cotización propia contra el peso.',
  },
] as const

/**
 * Las tres diferencias que explican por qué el número del BCU y el del mostrador nunca coinciden.
 * Ninguna es un defecto de ninguno de los dos: son precios de mercados distintos.
 */
export interface Diferencia {
  readonly key: string
  readonly eje: string
  readonly bcu: string
  readonly mostrador: string
}

export const BCU_VS_MOSTRADOR: readonly Diferencia[] = [
  {
    key: 'quien',
    eje: '¿Entre quiénes?',
    bcu: 'Entre instituciones financieras, en el mercado mayorista.',
    mostrador: 'Entre una casa de cambio o un banco y vos.',
  },
  {
    key: 'puntas',
    eje: '¿Cuántos precios?',
    bcu: 'Uno solo. El BCU informa «una cotización única» para dólar billete, peso argentino billete y real billete.',
    mostrador:
      'Dos: una compradora y una vendedora. La diferencia entre ambas es el margen de la casa.',
  },
  {
    key: 'cuando',
    eje: '¿Cuándo se fija?',
    bcu: 'El dólar fondo es el promedio ponderado del día ya terminado: mira para atrás.',
    mostrador: 'Se mueve durante el día y cada casa lo cambia cuando quiere.',
  },
] as const

// ---------------------------------------------------------------------------
// La regla de la DGI
// ---------------------------------------------------------------------------

/**
 * El texto de la DGI, tal cual, porque es el que la página cita y el que este módulo implementa.
 * Fuente: DGI, «Operaciones en moneda extranjera».
 */
export const DGI_REGLA = {
  pesos: 'Los impuestos recaudados por la DGI deberán abonarse siempre en moneda nacional.',
  conversion:
    'Los ingresos y las compras realizadas en moneda extranjera, deberán convertirse a pesos uruguayos considerando el tipo de cambio interbancario del día anterior a la operación.',
  sinCotizacion:
    'Si el día anterior no hubiese cotización, se deberá ir a la del último día hábil anterior.',
  arbitraje:
    'De no existir cotización interbancaria para la moneda en la que se encuentre la documentación, deberá utilizarse el arbitraje correspondiente a dólares americanos, para convertirla luego a moneda nacional.',
} as const

const SUNDAY = 0
const SATURDAY = 6

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function parseIso(iso: string): Date {
  if (!ISO_DATE.test(iso)) throw new RangeError(`fecha no es YYYY-MM-DD: ${iso}`)
  const date = new Date(`${iso}T00:00:00Z`)
  // El round-trip es lo que atrapa un día que no existe: Node parsea `2026-02-31` sin quejarse y lo
  // desborda al 3 de marzo, así que un `Number.isNaN` solo no alcanza.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) {
    throw new RangeError(`fecha inválida: ${iso}`)
  }
  return date
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Sábado o domingo: el mercado de cambios no opera y por lo tanto no hay cotización. */
export function esFinDeSemana(iso: string): boolean {
  const day = parseIso(iso).getUTCDay()
  return day === SATURDAY || day === SUNDAY
}

export interface DiaDeCotizacion {
  /** La fecha cuya cotización interbancaria corresponde aplicar (YYYY-MM-DD). */
  readonly iso: string
  /** Cuántos días se retrocedió más allá del «día anterior» por no haber cotización. */
  readonly retrocesos: number
  /** Por qué se retrocedió, o `null` si el día anterior ya servía. */
  readonly motivo: 'fin-de-semana' | 'sin-cotizacion' | null
}

/**
 * La regla de la DGI, en código: «el tipo de cambio interbancario del día anterior a la operación.
 * Si el día anterior no hubiese cotización, se deberá ir a la del último día hábil anterior».
 *
 * Se arranca SIEMPRE en el día anterior —nunca en el de la operación— y se retrocede mientras ese
 * día no tenga cotización. Un día no tiene cotización si cae sábado o domingo, o si el llamador lo
 * declara sin cotización en `sinCotizacion` (feriados: este módulo no los conoce, ver la cabecera).
 *
 * El caso que más se equivoca a mano es el lunes: la operación del lunes NO usa la del viernes por
 * ser «el día hábil anterior», usa la del viernes porque el domingo —su día anterior— no cotiza y
 * hay que seguir retrocediendo hasta el viernes.
 */
export function diaDeCotizacionDgi(
  isoOperacion: string,
  sinCotizacion: readonly string[] = []
): DiaDeCotizacion {
  const cerrados = new Set(sinCotizacion)
  const cursor = parseIso(isoOperacion)
  cursor.setUTCDate(cursor.getUTCDate() - 1)

  let retrocesos = 0
  let motivo: DiaDeCotizacion['motivo'] = null

  // 400 días es un tope de seguridad: con un `sinCotizacion` mal armado el bucle sería infinito, y
  // un error ruidoso es preferible a una página colgada.
  while (retrocesos <= 400) {
    const iso = toIso(cursor)
    const finDeSemana = esFinDeSemana(iso)
    if (!finDeSemana && !cerrados.has(iso)) return { iso, retrocesos, motivo }
    if (motivo === null) motivo = finDeSemana ? 'fin-de-semana' : 'sin-cotizacion'
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    retrocesos += 1
  }

  throw new RangeError(`no se encontró un día con cotización antes de ${isoOperacion}`)
}

// ---------------------------------------------------------------------------
// Preguntas frecuentes (alimentan el FAQPage de la página)
// ---------------------------------------------------------------------------

export interface BcuFaq {
  readonly question: string
  readonly answer: string
}

export const BCU_COTIZACION_FAQ: readonly BcuFaq[] = [
  {
    question: '¿Por qué la cotización del BCU no coincide con la de la casa de cambio?',
    answer:
      'Porque son precios de mercados distintos. La cotización del BCU es la del mercado mayorista entre instituciones financieras: el dólar fondo de cierre es el promedio ponderado de las operaciones efectivamente realizadas en el mercado que opera BEVSA (Comunicación 2008/001). La casa de cambio te vende a vos, cobra un margen y publica dos precios —uno de compra y uno de venta— donde el BCU informa una cotización única.',
  },
  {
    question: '¿Puedo comprar dólares a la cotización del BCU?',
    answer:
      'No. El Banco Central no vende dólares al público: publica una referencia estadística del mercado entre instituciones. El precio al que podés operar es el del mostrador de un banco o de una casa de cambio, y ese es el que compara este sitio.',
  },
  {
    question:
      '¿Qué cotización hay que usar para convertir una operación en moneda extranjera a pesos?',
    answer:
      'La DGI establece que los ingresos y las compras realizadas en moneda extranjera deben convertirse a pesos uruguayos considerando el tipo de cambio interbancario del día anterior a la operación, y que si el día anterior no hubiese cotización se va a la del último día hábil anterior. Si la moneda no tiene cotización interbancaria, se usa el arbitraje correspondiente a dólares americanos y recién después se convierte a pesos.',
  },
  {
    question: '¿Qué cotización aplica a una operación hecha un lunes?',
    answer:
      'La del viernes anterior. La regla arranca en el día anterior a la operación —el domingo—, que no tiene cotización porque el mercado no opera, y por eso hay que seguir retrocediendo hasta el último día hábil anterior. Lo mismo pasa cuando el día anterior fue feriado.',
  },
  {
    question: '¿Dónde se consultan las cotizaciones históricas del BCU?',
    answer:
      'En el sitio del propio BCU. Desde enero de 2017 tiene un sistema de consulta que permite pedir las cotizaciones del período que uno quiera, filtrar por moneda y elegir entre cotizaciones interbancarias o arbitrajes internacionales, y descargar el resultado en varios formatos.',
  },
] as const
