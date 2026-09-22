// Garantías de alquiler en Uruguay: qué opciones existen, qué pide cada una y cuánto cuestan.
//
// PURE module (sin Vue/Nuxt, imports relativos) para que vitest-node lo cargue y lo compartan la
// página y el sitemap, igual que `indicators.ts` y `bpsElections.ts`.
//
// Por qué esta página existe: las tres garantías del Estado publican sus topes y sus mínimos de
// ingreso en UNIDADES REAJUSTABLES, y ninguna fuente oficial los muestra en pesos. Este sitio tiene
// el valor de la UR del día, así que puede responder la pregunta que la gente realmente hace
// ("¿hasta cuánto de alquiler me cubre?") con un número, que es exactamente lo que el organismo no
// contesta. La conversión se hace SIEMPRE contra la UR viva; si no vino, se muestra sólo el tope en
// UR y se dice que falta el dato — nunca un peso inventado ni un valor de UR congelado en el código.
//
// Todas las cifras de acá salen de la fuente oficial de cada programa, leídas el
// {@link RENTAL_GUARANTEE_VERIFIED_AT}. Las garantías privadas NO publican precio (se cotiza caso a
// caso), así que esta página tampoco lo publica: se listan los requisitos que sí están publicados y
// se enlaza al simulador del emisor.

import type { FaqItem } from './faqAnswers'

export const RENTAL_GUARANTEE_VERIFIED_AT = '2026-09-22'

/** Una fuente citada al pie, y en el `citation` del JSON-LD. */
export interface GuaranteeSource {
  label: string
  url: string
}

/** Quién emite la garantía: el Estado o un privado. Cambia qué se puede publicar de su precio. */
export type GuaranteeIssuer = 'estado' | 'privado' | 'regimen'

export interface GuaranteeOption {
  id: string
  name: string
  issuer: GuaranteeIssuer
  /** Una línea: para quién es. */
  who: string
  /**
   * Tope de alquiler que la garantía cubre, en UR. `null` cuando el organismo NO publica un tope
   * (la CGN no lo hace) — y eso se imprime como "no publica un tope", nunca como "sin tope".
   */
  maxRentUr: number | null
  /** Aclaración del tope cuando hay un segundo valor (vivienda promovida) o depende del ingreso. */
  maxRentNote?: string
  /** Comisión mensual sobre el alquiler, en %, que paga CADA parte. `null` = no publicada. */
  monthlyFeePct: number | null
  /** Depósito único, en % del monto de la garantía. `null` = no corresponde o no publicado. */
  depositPct: number | null
  /** Qué hay que cumplir, tal como lo publica la fuente. */
  requirements: readonly string[]
  /** La fuente de ESTA fila. */
  source: GuaranteeSource
}

/**
 * Las opciones, en el orden en que conviene mirarlas: primero las del Estado (son las más baratas y
 * las únicas con precio publicado), después la privada y al final el régimen sin garantía, que no
 * es una garantía sino la alternativa a no tener ninguna.
 */
export const GUARANTEE_OPTIONS: readonly GuaranteeOption[] = [
  {
    id: 'cgn',
    name: 'Garantía de la Contaduría General de la Nación (CGN)',
    issuer: 'estado',
    who: 'Funcionarios públicos, empleados de empresas privadas inscriptas en el registro del SGA, jubilados y pensionistas.',
    maxRentUr: null,
    maxRentNote: 'La CGN no publica un tope de alquiler en su trámite.',
    monthlyFeePct: 3,
    depositPct: null,
    requirements: [
      'Funcionarios públicos con 6 meses de antigüedad.',
      'Empleados de empresas privadas inscriptas en el registro del SGA, con 6 meses de antigüedad.',
      'Jubilados y pensionistas (la fuente no les pide antigüedad).',
      'También acceden beneficiarios del convenio con el MVOT y del subsidio del BPS.',
      'El trámite no tiene costo: no hay cuota de afiliación ni cobro por la firma del contrato.',
      'El pago al arrendador se hace exclusivamente por transferencia bancaria.',
    ],
    source: {
      label: 'Alquiler por Contaduría General de la Nación — trámite en gub.uy',
      url: 'https://www.gub.uy/tramites/alquiler-contaduria-general-nacion',
    },
  },
  {
    id: 'fga',
    name: 'Fondo de Garantía de Alquiler (FGA)',
    issuer: 'estado',
    who: 'Quien no entra por la CGN: el certificado de garantía con respaldo del Estado que emiten la ANV, el MVOT y la CGN.',
    maxRentUr: 18,
    maxRentNote: 'Sube a 21 UR si se trata de una vivienda promovida.',
    monthlyFeePct: 3,
    depositPct: 24,
    requirements: [
      'Ser mayor de 18 años con ingresos laborales sostenidos, con un mínimo de 3 meses de continuidad.',
      'El núcleo de convivencia debe tener un ingreso líquido formal de entre 15 y 100 UR.',
      'No ser propietario de bienes inmuebles en el mismo departamento en que se pide la garantía.',
      'No ser adjudicatario de ninguna otra garantía del Estado ni de empresas con convenio.',
      'Para renovarla hay que estar libre de deuda de alquiler y gastos complementarios.',
    ],
    source: {
      label: 'Fondo de Garantía de Alquiler — Agencia Nacional de Vivienda',
      url: 'https://www.anv.gub.uy/fondo-de-garantia-de-alquiler',
    },
  },
  {
    id: 'fga-jovenes',
    name: 'Fondo de Garantía de Alquiler para Jóvenes',
    issuer: 'estado',
    who: 'Entre 18 y 29 años, estudiando o trabajando. Es el mismo certificado del Estado con un tope más alto y la mitad del depósito.',
    maxRentUr: 22.5,
    monthlyFeePct: 3,
    depositPct: 12,
    requirements: [
      'Tener entre 18 y 29 años, y estudiar o trabajar.',
      'Contar con un ingreso líquido, individual o colectivo, de hasta 100 UR.',
      'El depósito es del 12 % del monto de la garantía, por única vez.',
    ],
    source: {
      label: 'Fondo de Garantía de Alquiler para Jóvenes — Agencia Nacional de Vivienda',
      url: 'https://www.anv.gub.uy/fondo-de-garantia-de-alquiler-para-jovenes',
    },
  },
  {
    id: 'anda',
    name: 'Garantía de alquiler de ANDA',
    issuer: 'privado',
    // Ojo con lo que se afirma acá: ANDA no publica un tope en UR, y "no hay tope" sería una
    // afirmación nuestra, no de la fuente. Lo que ANDA sí publica es el límite contra el ingreso.
    who: 'Socios de ANDA. Es la opción privada cuyos requisitos están publicados enteros, con la antigüedad laboral más corta de las que aparecen acá.',
    maxRentUr: null,
    maxRentNote:
      'ANDA no publica un tope en UR: el alquiler garantizado puede ser de hasta el 40 % del ingreso nominal.',
    monthlyFeePct: null,
    depositPct: null,
    requirements: [
      'Ser socio de ANDA (la afiliación se hace por web, WhatsApp, teléfono o sucursal).',
      'Actividad privada: 4 meses de antigüedad.',
      'Pasivos: sin antigüedad. Funcionarios públicos: presupuestados con al menos un mes trabajando, o evaluación del tipo de contrato.',
      'El alquiler garantizado puede ser de hasta el 40 % del ingreso nominal; se pueden sumar ingresos de otras personas.',
      'Independientes, unipersonales y monotributistas: certificado de ingresos de escribano o contador y los últimos tres recibos pagos de BPS y DGI.',
    ],
    source: {
      label: 'Garantía de alquiler, requisitos del inquilino — ANDA',
      url: 'https://anda.com.uy/garantia-de-alquiler/inquilino/',
    },
  },
  {
    id: 'sin-garantia',
    name: 'Contrato sin garantía (Ley 19.889)',
    issuer: 'regimen',
    who: 'No es una garantía: es un régimen de contrato para alquilar sin presentar ninguna. Lo eligen las dos partes por escrito.',
    maxRentUr: null,
    monthlyFeePct: null,
    depositPct: null,
    requirements: [
      'El inmueble se destina a casa habitación.',
      'No se constituye garantía de ninguna clase a favor del arrendador.',
      'El contrato es escrito y consigna expresamente el plazo y el precio del arriendo.',
      'Las partes acuerdan expresamente y por escrito someterse a esta ley; si falta alguno de estos requisitos, el alquiler se rige por el decreto ley 14.219 o el Código Civil.',
      'El arrendador no puede exigir el pago adelantado de más de un mes de alquiler.',
      'Si el precio es en pesos y no se pactó otra cosa, el ajuste anual es por la variación del IPC.',
      'Es nula la renuncia anticipada a los plazos de desalojo y lanzamiento que fija la propia ley.',
    ],
    source: {
      label: 'Ley N.º 19.889, artículo 421 — régimen de arrendamiento sin garantía (IMPO)',
      url: 'https://www.impo.com.uy/bases/leyes/19889-2020/421',
    },
  },
]

/** Los topes y mínimos que se publican en UR y que la página convierte a pesos. */
export interface UrBenchmark {
  id: string
  label: string
  ur: number
  note: string
}

export const UR_BENCHMARKS: readonly UrBenchmark[] = [
  {
    id: 'fga-tope',
    label: 'Tope de alquiler del FGA',
    ur: 18,
    note: 'Lo máximo que cubre la garantía del Estado en una vivienda común.',
  },
  {
    id: 'fga-tope-promovida',
    label: 'Tope del FGA en vivienda promovida',
    ur: 21,
    note: 'El mismo fondo, si la vivienda entra en el régimen de vivienda promovida.',
  },
  {
    id: 'fga-jovenes-tope',
    label: 'Tope del FGA para jóvenes',
    ur: 22.5,
    note: 'De 18 a 29 años, estudiando o trabajando.',
  },
  {
    id: 'fga-ingreso-minimo',
    label: 'Ingreso mínimo del núcleo para el FGA',
    ur: 15,
    note: 'Ingreso líquido formal sumando a todos los que van a vivir en la casa.',
  },
  {
    id: 'fga-ingreso-maximo',
    label: 'Ingreso máximo del núcleo para el FGA',
    ur: 100,
    note: 'Por encima de este ingreso el fondo no corresponde.',
  },
]

/**
 * Convierte un valor en UR a pesos con la UR viva. Devuelve `null` —y no un número— cuando no hay
 * UR: el objetivo de esta página es publicar la cifra del día, así que una cifra sin respaldo es
 * peor que ninguna. Misma regla que `fineInPesos` en `bpsElections.ts`.
 */
export function urToPesos(ur: number, urValue: number | null | undefined): number | null {
  if (!Number.isFinite(ur) || ur <= 0) return null
  if (urValue == null || !Number.isFinite(urValue) || urValue <= 0) return null
  return Math.round(ur * urValue)
}

/**
 * Comisión mensual en pesos sobre un alquiler dado. Es la cuenta que nadie publica hecha: el 3 % se
 * cobra a CADA parte, así que sobre el alquiler total el servicio se lleva el doble.
 */
export function monthlyFeeInPesos(rent: number, pct: number | null): number | null {
  if (!Number.isFinite(rent) || rent <= 0) return null
  if (pct == null || !Number.isFinite(pct) || pct <= 0) return null
  return Math.round((rent * pct) / 100)
}

export const RENTAL_GUARANTEE_FAQ: readonly FaqItem[] = [
  {
    id: 'que-es',
    question: '¿Qué es una garantía de alquiler?',
    answer:
      'Es el respaldo que le pide el propietario al inquilino para cubrir el alquiler si deja de pagarlo. En Uruguay la puede emitir el Estado (la Contaduría General de la Nación y el Fondo de Garantía de Alquiler), una asociación o aseguradora privada, o puede no haber ninguna: la Ley 19.889 creó un régimen de contrato escrito sin garantía.',
  },
  {
    id: 'cuanto-cuesta',
    question: '¿Cuánto cuesta la garantía del Estado?',
    answer:
      'Una comisión mensual del 3 % del valor del alquiler, que paga cada parte: el inquilino y el propietario. El trámite de la CGN no tiene costo de afiliación ni cobro por la firma del contrato. El Fondo de Garantía de Alquiler pide además un depósito por única vez del 24 % del monto de la garantía, que baja al 12 % en el fondo para jóvenes.',
  },
  {
    id: 'hasta-cuanto',
    question: '¿Hasta qué alquiler me cubre la garantía del Estado?',
    answer:
      'El Fondo de Garantía de Alquiler cubre hasta 18 UR de alquiler, o 21 UR si la vivienda es promovida; el fondo para jóvenes de 18 a 29 años llega a 22,5 UR. El trámite de la CGN no publica un tope. Como los topes se fijan en unidades reajustables, el monto en pesos cambia cada vez que se actualiza la UR.',
  },
  {
    id: 'requisitos-ingreso',
    question: '¿Cuánto tengo que ganar para que me den el Fondo de Garantía de Alquiler?',
    answer:
      'El núcleo de convivencia tiene que tener un ingreso líquido formal de entre 15 y 100 UR, con al menos 3 meses de continuidad, y ninguno de sus integrantes puede ser propietario de un inmueble en el mismo departamento donde se pide la garantía. En el fondo para jóvenes el tope de ingreso es de 100 UR y no se exige mínimo publicado.',
  },
  {
    id: 'sin-garantia',
    question: '¿Puedo alquilar sin garantía?',
    answer:
      'Sí, con el régimen de la Ley 19.889: la vivienda tiene que ser casa habitación, no puede haber garantía de ninguna clase, el contrato tiene que ser escrito con el plazo y el precio expresos, y las dos partes tienen que acordar por escrito someterse a esa ley. Si falta cualquiera de esos requisitos, el alquiler se rige por el decreto ley 14.219 o el Código Civil.',
  },
  {
    id: 'adelanto',
    question: '¿Me pueden pedir varios meses por adelantado si alquilo sin garantía?',
    answer:
      'No. En el régimen sin garantía el arrendador no puede exigir el pago adelantado de más de un mes de alquiler. Y es nula de pleno derecho la cláusula que le haga renunciar al inquilino, por anticipado, a los plazos de desalojo y lanzamiento que fija la propia ley.',
  },
  {
    id: 'privadas',
    question: '¿Cuánto cuesta una garantía privada?',
    answer:
      'No lo publican: las garantías privadas se cotizan caso a caso según el alquiler, el plazo y el perfil del inquilino, así que acá no vas a encontrar un precio. Lo que sí está publicado son los requisitos. En ANDA, por ejemplo, hay que ser socio, se piden 4 meses de antigüedad en la actividad privada, los pasivos no necesitan antigüedad, y el alquiler garantizado puede llegar al 40 % del ingreso nominal.',
  },
  {
    id: 'dos-garantias',
    question: '¿Puedo tener dos garantías del Estado a la vez?',
    answer:
      'No. Uno de los requisitos del Fondo de Garantía de Alquiler es no ser adjudicatario de ninguna otra garantía proporcionada por el Estado ni de empresas con convenio. Para renovarla, además, hay que estar libre de deuda de alquiler y de gastos complementarios.',
  },
]

export const RENTAL_GUARANTEE_SOURCES: readonly GuaranteeSource[] = [
  {
    label: 'Alquiler por Contaduría General de la Nación — trámite en gub.uy',
    url: 'https://www.gub.uy/tramites/alquiler-contaduria-general-nacion',
  },
  {
    label: 'Quiénes pueden acceder a la garantía de CGN — Ministerio de Economía y Finanzas',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/garantia-de-alquileres/quienes-pueden-acceder-garantia-cgn',
  },
  {
    label: 'Fondo de Garantía de Alquiler — Agencia Nacional de Vivienda',
    url: 'https://www.anv.gub.uy/fondo-de-garantia-de-alquiler',
  },
  {
    label: 'Fondo de Garantía de Alquiler para Jóvenes — Agencia Nacional de Vivienda',
    url: 'https://www.anv.gub.uy/fondo-de-garantia-de-alquiler-para-jovenes',
  },
  {
    label: 'Garantía de alquiler — Ministerio de Vivienda y Ordenamiento Territorial',
    url: 'https://www.gub.uy/ministerio-vivienda-ordenamiento-territorial/politicas-y-gestion/garantia-alquiler',
  },
  {
    label: 'Garantía de alquiler, requisitos del inquilino — ANDA',
    url: 'https://anda.com.uy/garantia-de-alquiler/inquilino/',
  },
  {
    label: 'Ley N.º 19.889, artículo 421 — régimen de arrendamiento sin garantía (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/19889-2020/421',
  },
  {
    label: 'Ley N.º 19.889, artículo 422 — plazo, precio y ajuste del contrato sin garantía (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/19889-2020/422',
  },
  {
    label: 'Ley N.º 19.889, artículo 428 — nulidad de la renuncia a los plazos de desalojo (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/19889-2020/428',
  },
]
