// app/utils/rentTaxCredit.ts
// El crédito fiscal de IRPF por arrendamiento de vivienda permanente: el 8 % del alquiler que el
// inquilino puede imputar al pago de su impuesto.
//
// POR QUÉ EXISTE. El sitio tiene la familia del alquiler entera —el directorio de
// `/alquileres-uruguay`, el alquiler ideal, las garantías, el depósito, la rescisión, el desalojo,
// por qué no baja— y la familia del impuesto entera —`/declaracion-de-irpf-uruguay`, la calculadora
// de IRPF, la de sueldo líquido, la devolución de FONASA—. El crédito por alquiler es el único dato
// que vive en las DOS y no tenía página en ninguna: aparecía como UNA respuesta de FAQ en
// `utils/rentFaq.ts` y como una palabra en la lista de `keywords` de la página de la declaración.
// El propio plan de crecimiento del sitio lo pidió como URL aparte y marcó la ventana como «todo el
// año» (`docs/seo/2026-09-15-google-trends-oportunidades.md`, 3.6 c): «irpf alquiler» +120 %.
//
// LAS TRES COSAS QUE ESTA PÁGINA CONTESTA Y QUE SE DAN POR SENTADAS AL REVÉS:
//
//  1. NO te devuelven el 8 % del alquiler. El 8 % es el TECHO de un crédito que se imputa «hasta la
//     concurrencia con el impuesto del ejercicio» (Decreto 148/007, art. 77 bis, en la redacción del
//     Decreto 118/023, art. 4). El mismo inciso cierra la puerta: «En caso de surgir un excedente, el
//     mismo no podrá ser imputado a impuestos de futuros ejercicios ni dará derecho a devolución».
//     O sea que quien no generó IRPF por rentas de trabajo no se lleva nada, y el crédito no se
//     guarda para el año que viene. Lo que sí vuelve, cuando vuelve, son las RETENCIONES de más que
//     te hicieron durante el año: eso es otra cosa y por eso los ejemplos de la DGI muestran un
//     «crédito a devolver» sin contradecir la norma.
//  2. La condición que más gente deja afuera NO está en la ley ni en el decreto. El art. 51 del
//     Título 7 pide una sola cosa —identificar al arrendador— y el decreto agrega el contrato
//     escrito; el plazo de un año es de una RESOLUCIÓN de la DGI: «Lo dispuesto en el inciso
//     anterior no será aplicable cuando el plazo concertado para el arrendamiento sea inferior a un
//     año» (Res. DGI 702/012, art. 3). Saberlo cambia qué discutís y con qué norma en la mano.
//  3. Y las dos que la gente cree que lo bloquean y no lo bloquean: el contrato NO tiene que estar
//     inscripto, y puede estar VENCIDO. Las dos las dice la DGI en su propia ficha del 26/01/2026.
//
// EL 6 % SIGUE CIRCULANDO Y YA NO RIGE. La Res. DGI 702/012 lo fijó en 6 %; la Ley 20.124 lo subió
// a 8 % y la Res. DGI 1132/024 lo escribió en la resolución vieja: «Para hechos generadores
// acaecidos a partir del año 2023, el mencionado crédito ascenderá al 8 %». Se conserva acá, igual
// que `utils/soa.ts` conserva los tramos viejos del tope, porque se cita como si fuera el de hoy.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA:
//   - Ninguna fecha ni monto de la campaña de un ejercicio que la DGI todavía no publicó. La ficha
//     oficial vigente al cotejo es la del ejercicio 2025 (publicada el 26/01/2026); el calendario de
//     la siguiente lo pone la DGI el día que lo pone, y adivinarlo es inventar un dato.
//   - Cuánto le vuelve a una persona. Depende del IRPF que generó, que depende de su sueldo, su
//     núcleo y sus otras deducciones. La página calcula el TECHO del crédito con el alquiler que el
//     lector escribe —aritmética sobre su propio dato— y dice que es un techo, no una devolución.
//   - El régimen del alquiler temporario con fines turísticos. Se lo nombra en prensa con otro
//     porcentaje y no se encontró norma vigente que lo sostenga, así que no va.
//
// FUENTES PRIMARIAS, cotejadas el 2026-10-10 contra impo.com.uy y las fichas de la DGI en gub.uy
// (lista completa en RENT_CREDIT_SOURCES).
//
// MÓDULO PURO (sin Vue/Nuxt) para que vitest-node lo cargue con imports relativos.

/** Fecha en la que se cotejó todo este archivo contra las fuentes oficiales. */
export const RENT_CREDIT_VERIFIED_AT = '2026-10-10'

/**
 * El porcentaje vigente del precio del arrendamiento que se puede imputar al impuesto.
 *
 * Ley 20.124, art. 2 (T.O. 2023, Título 7, art. 51) y Res. DGI 1132/024.
 */
export const RENT_CREDIT_PERCENT = 8

/** El porcentaje anterior, que todavía se cita como si rigiera (Res. DGI 702/012 original). */
export const RENT_CREDIT_PREVIOUS_PERCENT = 6

/** El ejercicio de la última ficha oficial publicada por la DGI al momento del cotejo. */
export const RENT_CREDIT_PUBLISHED_EXERCISE = 2025

/** La fecha de esa ficha, tal como la muestra gub.uy. */
export const RENT_CREDIT_DGI_SHEET_DATE = '2026-01-26'

export interface RentCreditSource {
  readonly label: string
  readonly url: string
}

/**
 * De dónde sale cada afirmación de la página.
 *
 * `ley` y `decreto` son norma; `resolucion` es la DGI reglamentando; `dgi` es el criterio que la
 * DGI publica en su ficha y que NO está escrito en ninguna de las tres anteriores. La distinción
 * es el ángulo de la página, así que viaja en el dato y no en el texto del template.
 */
export type RentCreditBasis = 'ley' | 'decreto' | 'resolucion' | 'dgi'

/** Cómo se llama cada base en la pantalla. */
export const RENT_CREDIT_BASIS_LABEL: Readonly<Record<RentCreditBasis, string>> = Object.freeze({
  ley: 'Ley',
  decreto: 'Decreto',
  resolucion: 'Resolución DGI',
  dgi: 'Criterio publicado por la DGI',
})

export interface RentCreditItem {
  readonly id: string
  /** Qué pide o qué dice, en la lengua del lector. */
  readonly label: string
  /** El detalle que cambia la respuesta, no un resumen del label. */
  readonly detail: string
  /** Qué tipo de norma lo dice. */
  readonly basis: RentCreditBasis
  /** La cita exacta y corta. */
  readonly cite: string
  readonly url: string
}

const TO_T7_ART_51 = 'https://www.impo.com.uy/bases/todgi2023/101-2024/51_T7'
const DECRETO_77_BIS = 'https://www.impo.com.uy/bases/decretos/148-2007/77_BIS'
const DECRETO_118_023 = 'https://www.impo.com.uy/bases/decretos-originales/118-2023?tipoServicio=11'
const RES_702_012 = 'https://www.impo.com.uy/bases/resoluciones-dgi-originales/702-2012'
const RES_1132_024 = 'https://www.impo.com.uy/bases/resoluciones-dgi-originales/1132-2024'
const DGI_IRPF =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/credito-fiscal-arrendamiento-inmuebles-irpf'
const DGI_IASS =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/credito-fiscal-arrendamiento-inmuebles-iass'

/**
 * Los requisitos, cada uno con la norma que lo pide.
 *
 * El orden es el de lo que más gente deja afuera, no el de la jerarquía normativa: el plazo de un
 * año es el primero porque es el que descarta, y es justamente el que no está en la ley.
 */
export const RENT_CREDIT_REQUIREMENTS: readonly RentCreditItem[] = Object.freeze([
  {
    id: 'plazo-un-ano',
    label: 'Plazo del contrato de un año o más',
    detail:
      'Es la condición que más gente deja afuera y no está en la ley ni en el decreto: la pone una resolución de la DGI, que excluye el arrendamiento pactado por menos de un año. El contrato no tiene que cubrir todo el ejercicio.',
    basis: 'resolucion',
    cite: 'Res. DGI 702/012, art. 3: «no será aplicable cuando el plazo concertado para el arrendamiento sea inferior a un año»',
    url: RES_702_012,
  },
  {
    id: 'identificar-arrendador',
    label: 'Identificar al arrendador',
    detail:
      'Es el único requisito que pide la ley, y es el que vuelve imposible el arreglo de palabra: hay que dar nombre o razón social, el número de cédula, N.I.E. o RUC y el domicilio del propietario.',
    basis: 'ley',
    cite: 'T.O. 2023, Título 7, art. 51: «siempre que se identifique el arrendador»; los datos exactos, en la Res. DGI 702/012, art. 1',
    url: TO_T7_ART_51,
  },
  {
    id: 'contrato-escrito',
    label: 'Contrato celebrado por escrito',
    detail:
      'Lo agrega el decreto, que aplica el porcentaje a los arrendamientos efectivamente pagados, devengados en el ejercicio «y cuyo contrato haya sido celebrado por escrito».',
    basis: 'decreto',
    cite: 'Decreto 148/007, art. 77 bis, en la redacción del Decreto 118/023, art. 4',
    url: DECRETO_77_BIS,
  },
  {
    id: 'vivienda-permanente',
    label: 'El inmueble tiene que ser tu vivienda permanente',
    detail:
      'La ley habla de arrendatarios «de inmuebles con destino a vivienda permanente». Una casa de temporada o un local no entran.',
    basis: 'ley',
    cite: 'T.O. 2023, Título 7, art. 51',
    url: TO_T7_ART_51,
  },
  {
    id: 'titular',
    label: 'Ser titular del contrato',
    detail:
      'Quien paga pero no figura en el contrato no computa el crédito. La ley reserva la imputación «por parte del titular o titulares del contrato de arrendamiento».',
    basis: 'ley',
    cite: 'T.O. 2023, Título 7, art. 51; la DGI lo repite: «solamente podrán acceder a este crédito quienes sean titulares del contrato»',
    url: TO_T7_ART_51,
  },
  {
    id: 'haber-generado-impuesto',
    label: 'Haber generado el impuesto en el año',
    detail:
      'El crédito se descuenta de un impuesto: si no generaste IRPF por rentas de trabajo (o IASS), no hay de dónde descontarlo y el crédito no se convierte en plata.',
    basis: 'dgi',
    cite: 'DGI, ficha del crédito en IRPF: «es necesario haber generado IRPF por rentas de trabajo durante el ejercicio»',
    url: DGI_IRPF,
  },
  {
    id: 'identificar-inmueble',
    label: 'Identificar el inmueble sin ambigüedad',
    detail:
      'Departamento, localidad, número de padrón y unidad. Es el dato que conviene buscar antes de sentarse a declarar, porque no está en el recibo.',
    basis: 'resolucion',
    cite: 'Res. DGI 702/012, art. 1',
    url: RES_702_012,
  },
])

/**
 * Lo que la gente cree que lo bloquea y no lo bloquea.
 *
 * Tiene su propia lista porque una ausencia no se lee en la de requisitos: nadie encuentra «no hace
 * falta inscribir el contrato» buscando entre las siete cosas que sí hacen falta.
 */
export const RENT_CREDIT_NOT_REQUIRED: readonly RentCreditItem[] = Object.freeze([
  {
    id: 'inscripcion',
    label: 'No hace falta que el contrato esté inscripto',
    detail:
      'La inscripción sirve para otras cosas, pero no para este crédito. La DGI lo dice con esas palabras en su propia ficha.',
    basis: 'dgi',
    cite: 'DGI: «no es condición necesaria que el contrato se encuentre inscripto para poder computar el crédito»',
    url: DGI_IRPF,
  },
  {
    id: 'vencido',
    label: 'El contrato puede estar vencido',
    detail:
      'Seguir en la vivienda con el contrato vencido es lo más común del mercado uruguayo y no saca del crédito: la DGI admite los contratos «aunque se encuentren vencidos».',
    basis: 'dgi',
    cite: 'DGI, requisitos del crédito en IRPF y en IASS',
    url: DGI_IRPF,
  },
  {
    id: 'ano-completo',
    label: 'El contrato no tiene que cubrir todo el año',
    detail:
      'Si te mudaste en junio, computás el 8 % de lo que pagaste desde junio. La resolución lo aclara: el crédito corre «sin perjuicio que el contrato correspondiente no abarque la totalidad» del ejercicio.',
    basis: 'resolucion',
    cite: 'Res. DGI 702/012, art. 3',
    url: RES_702_012,
  },
])

/** Los límites del crédito: hasta dónde llega y qué pasa con lo que sobra. */
export const RENT_CREDIT_LIMITS: readonly RentCreditItem[] = Object.freeze([
  {
    id: 'concurrencia',
    label: 'Llega hasta el impuesto del año y no más',
    detail:
      'La imputación se hace «hasta la concurrencia con el impuesto del ejercicio» correspondiente a las rentas de trabajo. El 8 % es un techo, no un monto a cobrar.',
    basis: 'decreto',
    cite: 'Decreto 148/007, art. 77 bis',
    url: DECRETO_77_BIS,
  },
  {
    id: 'excedente',
    label: 'Lo que sobra se pierde',
    detail:
      'No se guarda para el año siguiente ni se cobra: «en caso de surgir un excedente, el mismo no podrá ser imputado a impuestos de futuros ejercicios ni dará derecho a devolución».',
    basis: 'decreto',
    cite: 'Decreto 148/007, art. 77 bis',
    url: DECRETO_77_BIS,
  },
  {
    id: 'orden-irpf-iass',
    label: 'Primero al IRPF, el resto al IASS',
    detail:
      'Quien cobra jubilación o pensión gravada además de trabajar imputa el crédito primero al IRPF y recién el excedente al IASS.',
    basis: 'dgi',
    cite: 'DGI: «el crédito fiscal por arrendamientos debe imputarse en primer término al IRPF y el excedente podrá imputarse al IASS»',
    url: DGI_IASS,
  },
  {
    id: 'coarrendatarios',
    label: 'Entre varios titulares se reparte',
    detail:
      'Los coarrendatarios lo reparten de común acuerdo y, si no hay acuerdo, en partes iguales. No lo computa entero cada uno.',
    basis: 'decreto',
    cite: 'Decreto 148/007, art. 77 bis',
    url: DECRETO_77_BIS,
  },
  {
    id: 'pagado-y-devengado',
    label: 'Cuenta lo pagado y devengado en el año',
    detail:
      'Si adelantaste meses del año que viene, esos meses no entran en este ejercicio: el porcentaje se aplica sobre lo efectivamente pagado y devengado en el ejercicio.',
    basis: 'decreto',
    cite: 'Decreto 148/007, art. 77 bis; la DGI lo repite para los pagos anticipados',
    url: DECRETO_77_BIS,
  },
])

export interface RentCreditRateStep {
  readonly id: string
  readonly percent: number
  /** Desde cuándo rige, tal como lo dice la norma. */
  readonly since: string
  readonly cite: string
  readonly url: string
  /** `true` sólo en el porcentaje que rige hoy. */
  readonly current: boolean
}

/** El 6 % y el 8 %, porque el primero se sigue citando como si fuera el de hoy. */
export const RENT_CREDIT_RATE_HISTORY: readonly RentCreditRateStep[] = Object.freeze([
  {
    id: 'seis-por-ciento',
    percent: RENT_CREDIT_PREVIOUS_PERCENT,
    since: 'Hechos generadores anteriores a 2023',
    cite: 'Res. DGI 702/012, texto original',
    url: RES_702_012,
    current: false,
  },
  {
    id: 'ocho-por-ciento',
    percent: RENT_CREDIT_PERCENT,
    since: 'Hechos generadores a partir del año 2023',
    cite: 'Ley 20.124, art. 2; Res. DGI 1132/024: «ascenderá al 8 %»',
    url: RES_1132_024,
    current: true,
  },
])

export interface RentCreditFaq {
  readonly question: string
  readonly answer: string
}

export const RENT_CREDIT_FAQ: readonly RentCreditFaq[] = Object.freeze([
  {
    question: '¿Me devuelven el 8 % de lo que pago de alquiler?',
    answer:
      'No. El 8 % es el techo de un crédito que se descuenta del impuesto del año, no un reintegro del alquiler. Se imputa hasta la concurrencia con el IRPF del ejercicio por rentas de trabajo y, si sobra, ese excedente no se traslada al año siguiente ni da derecho a devolución (Decreto 148/007, art. 77 bis). Lo que sí puede volverte es la retención de más que te hicieron durante el año, que es otra cosa.',
  },
  {
    question: '¿Puedo computarlo si no genero IRPF?',
    answer:
      'No sirve de nada: el crédito se descuenta de un impuesto, así que sin IRPF por rentas de trabajo (o sin IASS) no hay de dónde descontarlo. La DGI lo pone como requisito: hay que haber generado el impuesto en el ejercicio.',
  },
  {
    question: '¿Sirve un contrato por menos de un año?',
    answer:
      'No. Una resolución de la DGI excluye el arrendamiento cuyo plazo pactado sea inferior a un año (Res. 702/012, art. 3). Conviene saber que esa condición no está en la ley ni en el decreto, que piden identificar al arrendador y tener contrato escrito.',
  },
  {
    question: '¿Y si el contrato está vencido o no está inscripto?',
    answer:
      'Las dos situaciones admiten el crédito. La DGI acepta los contratos celebrados por escrito «aunque se encuentren vencidos» y dice expresamente que no es condición necesaria que el contrato esté inscripto.',
  },
  {
    question: '¿Qué datos del propietario necesito?',
    answer:
      'Nombre o razón social, número de cédula, N.I.E. o RUC, y domicilio; además hay que identificar el inmueble por departamento, localidad, padrón y unidad (Res. DGI 702/012, art. 1). Sin esos datos no se puede computar, y es el motivo por el que un alquiler de palabra queda afuera.',
  },
  {
    question: '¿Cómo se reclama?',
    answer:
      'Presentando la declaración jurada de IRPF —formulario 1102 o 1103—, donde se declaran el alquiler pagado y los datos del arrendador y del inmueble. Si además cobrás jubilación o pensión gravada, el excedente se imputa al IASS.',
  },
  {
    question: '¿Alquilamos entre varios: lo computa cada uno?',
    answer:
      'No entero. Los coarrendatarios reparten el crédito de común acuerdo y, en defecto de acuerdo, en partes iguales (Decreto 148/007, art. 77 bis).',
  },
])

/** Las fuentes, en el orden en que la página las usa. */
export const RENT_CREDIT_SOURCES: readonly RentCreditSource[] = Object.freeze([
  {
    label:
      'T.O. 2023, Título 7 (IRPF), art. 51 — «Crédito fiscal por arrendamiento de inmuebles»: hasta el 8 % del precio del arrendamiento, siempre que se identifique el arrendador',
    url: TO_T7_ART_51,
  },
  {
    label:
      'Decreto 148/007, art. 77 bis (texto vigente) — contrato por escrito, pagado y devengado en el ejercicio, coarrendatarios, concurrencia con el impuesto del año y excedente sin arrastre ni devolución',
    url: DECRETO_77_BIS,
  },
  {
    label:
      'Decreto 118/023, art. 4 (13/04/2023) — sustituye el art. 77 bis del Decreto 148/007 y escribe el 8 %; reglamenta la Ley 20.124',
    url: DECRETO_118_023,
  },
  {
    label:
      'Resolución DGI 702/012, arts. 1 a 3 (19/04/2012) — datos del arrendador y del inmueble, imputación al IRPF o al IASS y exclusión del plazo menor a un año',
    url: RES_702_012,
  },
  {
    label:
      'Resolución DGI 1132/024 (27/05/2024) — «Para hechos generadores acaecidos a partir del año 2023, el mencionado crédito ascenderá al 8 %»',
    url: RES_1132_024,
  },
  {
    label:
      'DGI — Crédito fiscal por arrendamiento de inmuebles en IRPF (ficha del 26/01/2026): requisitos, contrato vencido, inscripción no necesaria, reparto entre titulares y formularios 1102/1103',
    url: DGI_IRPF,
  },
  {
    label:
      'DGI — Crédito fiscal por arrendamiento de inmuebles en el IASS (ficha del 26/01/2026): imputación en primer término al IRPF y el excedente al IASS',
    url: DGI_IASS,
  },
])

/**
 * El TECHO del crédito de un año: el 8 % de lo que se pagó de alquiler.
 *
 * Es aritmética sobre el dato que escribe el lector, no una estimación de lo que va a cobrar: lo
 * que realmente se descuenta depende del IRPF que esa persona generó, y eso esta función no lo
 * sabe ni lo adivina. Devuelve `null` ante un monto que no sirve para una cuenta —negativo, cero,
 * `NaN`, infinito— en vez de publicar un cero que se leería como «no te corresponde».
 */
export function rentCreditCeiling(annualRentPaid: number): number | null {
  if (!Number.isFinite(annualRentPaid) || annualRentPaid <= 0) return null
  return (annualRentPaid * RENT_CREDIT_PERCENT) / 100
}

/** Lo mismo a partir del alquiler mensual, que es como el lector lo tiene en la cabeza. */
export function rentCreditCeilingFromMonthly(monthlyRent: number, months = 12): number | null {
  if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) return null
  if (!Number.isInteger(months) || months <= 0 || months > 12) return null
  return rentCreditCeiling(monthlyRent * months)
}
