// app/utils/temuTax.ts
// "Impuesto Temu": el nombre popular del régimen de envíos postales internacionales que rige
// desde el 1/5/2026, y la página que lo usa (`/impuesto-temu-uruguay`).
//
// POR QUÉ EXISTE ESTE ARCHIVO, habiendo ya `/franquicia-aduana-uruguay`: la gente no busca
// "franquicia aduanera", busca "impuesto Temu". El barrido de Google Trends del 15/9/2026
// (`docs/seo/2026-09-15-google-trends-oportunidades.md`) midió "impuesto temu" +450 % a 12 meses
// y "temu" en 35 % del ancla "dólar", y la frase estaba en CERO archivos del repo. La página de
// franquicia explica el régimen; ésta contesta la pregunta con el nombre con el que se pregunta.
//
// NINGUNA CIFRA SE ESCRIBE A MANO. Los importes de los ejemplos salen de `courierImport()`, que
// resuelve el régimen con las constantes fechadas y citadas de `./importRules` (Ley 20.446,
// Decreto 50/026, RG DNA 09/2026 y 11/2026, TIFA Ley 18.761). Si una norma cambia, se cambia
// ahí y esta página se mueve sola; `temuTax.test.ts` verifica justamente que sigan derivados.

import { courierImport } from './importTax'
import {
  FRANCHISE_ANNUAL_USD,
  FRANCHISE_MAX_SHIPMENTS,
  LAST_RESEARCHED,
  POSTAL_IVA_MIN_USD,
  SIMPLIFIED_MIN_USD,
  SIMPLIFIED_RATE_PCT,
  USA_IVA_EXEMPTION_USD,
} from './importRules'
import type { FaqItem } from './faqAnswers'

/** Fecha en que las normas de abajo se verificaron contra fuente primaria (ver `importRules`). */
export const TEMU_VERIFIED_AT = LAST_RESEARCHED

/** El IVA básico que aplica el régimen postal a la mercadería corriente de estas plataformas. */
const IVA_PCT = 22

export interface TemuSource {
  label: string
  url: string
}

/**
 * Sólo fuentes primarias uruguayas. La prensa que bautizó "impuesto Temu" sirve para saber CÓMO
 * se llama, no para sostener un importe: cada número de esta página se apoya en una de éstas.
 */
export const TEMU_SOURCES: readonly TemuSource[] = Object.freeze([
  {
    label: 'Ley 20.446, art. 627 — prestación única del 60 % con mínimo de US$ 20',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
  },
  {
    label: 'Ley 20.446, art. 660 — mínimo de IVA por envío postal',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/660',
  },
  {
    label: 'Decreto 50/026 — franquicia anual de US$ 800 en 3 envíos',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026',
  },
  {
    label: 'RG DNA 09/2026 — reglamentación del régimen de envíos postales',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28428/1/resolucion-9_2026.pdf',
  },
  {
    label: 'RG DNA 11/2026 — Anexo I, mínimo de IVA y envíos consolidados',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
  },
  {
    label: 'Ley 18.761 (TIFA), art. 7 lit. g — exoneración de IVA para facturas de EE.UU.',
    url: 'https://www.impo.com.uy/bases/leyes-internacional/18761-2011',
  },
  {
    label: 'MEF — preguntas frecuentes sobre el régimen de envíos postales y franquicias',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias',
  },
  {
    label: 'DNA — franquicia de envíos postales internacionales',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28221/1/innova.front/',
  },
])

export interface TemuExample {
  id: string
  /** Qué compra representa, en la lengua del lector. */
  label: string
  valueUsd: number
  /** Si el comprador todavía tiene cupo de franquicia y lo usa en este envío. */
  useFranchise: boolean
  /** Envíos con franquicia ya usados este año civil. */
  shipmentsUsed: number
  /** Régimen que resolvió el motor: `franquicia` o `simplificado`. */
  regime: string
  /** Impuesto total del envío, en dólares. */
  taxUsd: number
  /** Impuesto como % del valor de la factura. */
  effectiveRatePct: number | null
  /** Qué pagó, desglosado. */
  breakdown: { label: string; amount: number }[]
}

/**
 * Los cuatro casos que contestan la pregunta entera, calculados por el mismo motor que la
 * calculadora del sitio. Origen `other`: Temu, Shein y AliExpress facturan fuera de EE.UU., así
 * que la exoneración del TIFA no les alcanza nunca — ése es el contraste del quinto caso.
 *
 * `today` va fijo para que los ejemplos publicados no cambien solos el día que entre en vigor el
 * registro de vendedores: esa condición sólo afecta a las facturas de EE.UU., que acá son el
 * contraejemplo, y una página que se mueve sin que nadie la edite no se puede revisar.
 */
const EXAMPLE_DATE = new Date(`${LAST_RESEARCHED}T00:00:00Z`)

function buildExample(
  spec: Pick<TemuExample, 'id' | 'label' | 'valueUsd' | 'useFranchise' | 'shipmentsUsed'>
): TemuExample {
  const result = courierImport({
    value: spec.valueUsd,
    origin: 'other',
    useFranchise: spec.useFranchise,
    franchiseAvailable: FRANCHISE_ANNUAL_USD,
    shipmentsUsed: spec.shipmentsUsed,
    ivaPct: IVA_PCT,
    today: EXAMPLE_DATE,
  })
  return {
    ...spec,
    regime: result.regime ?? 'simplificado',
    taxUsd: result.totalTax,
    effectiveRatePct: result.effectiveRatePct,
    breakdown: result.breakdown.map(line => ({ label: line.label, amount: line.amount })),
  }
}

export const TEMU_EXAMPLES: readonly TemuExample[] = Object.freeze([
  buildExample({
    id: 'chico-con-cupo',
    label: 'Compra chica de US$ 19, con cupo de franquicia disponible',
    valueUsd: 19,
    useFranchise: true,
    shipmentsUsed: 0,
  }),
  buildExample({
    id: 'medio-con-cupo',
    label: 'Compra de US$ 150, con cupo de franquicia disponible',
    valueUsd: 150,
    useFranchise: true,
    shipmentsUsed: 0,
  }),
  buildExample({
    id: 'medio-sin-cupo',
    label: 'La misma compra de US$ 150, pero es tu cuarto envío del año',
    valueUsd: 150,
    useFranchise: true,
    shipmentsUsed: FRANCHISE_MAX_SHIPMENTS,
  }),
  buildExample({
    id: 'grande-sin-cupo',
    label: 'Compra de US$ 250 sin cupo de franquicia',
    valueUsd: 250,
    useFranchise: true,
    shipmentsUsed: FRANCHISE_MAX_SHIPMENTS,
  }),
])

/** El contraejemplo: la MISMA plata, facturada en EE.UU., no paga nada. */
export const TEMU_USA_CONTRAST = (() => {
  const result = courierImport({
    value: 150,
    origin: 'usa',
    useFranchise: true,
    franchiseAvailable: FRANCHISE_ANNUAL_USD,
    shipmentsUsed: 0,
    sellerRegistered: true,
    ivaPct: IVA_PCT,
    today: EXAMPLE_DATE,
  })
  return { valueUsd: 150, taxUsd: result.totalTax, ivaExempt: result.ivaExempt === true }
})()

/** El ejemplo que da el titular: el paquete chico paga más de lo que sale. */
export const TEMU_SMALL_PARCEL = TEMU_EXAMPLES[0]!

export interface TemuPlatform {
  id: string
  name: string
  /** Desde dónde factura, que es lo único que decide si alcanza la exoneración del TIFA. */
  invoicedFrom: string
  /** Qué le pasa a un envío suyo, en una línea. */
  note: string
}

/**
 * Las tres plataformas por las que se pregunta. El dato que importa de cada una NO es su nombre
 * comercial sino desde dónde emite la factura: la exoneración del art. 7 lit. g del TIFA es para
 * las facturas de EE.UU. y ninguna de las tres la emite ahí.
 */
export const TEMU_PLATFORMS: readonly TemuPlatform[] = Object.freeze([
  {
    id: 'temu',
    name: 'Temu',
    invoicedFrom: 'Fuera de EE.UU.',
    note: `Sin exoneración del TIFA: la franquicia le saca los aranceles, pero el IVA del ${IVA_PCT} % se paga igual, con el mínimo de US$ ${POSTAL_IVA_MIN_USD} por envío.`,
  },
  {
    id: 'shein',
    name: 'Shein',
    invoicedFrom: 'Fuera de EE.UU.',
    note: `Mismo tratamiento que Temu. Varias prendas en un solo envío se cuentan como UN envío del cupo de ${FRANCHISE_MAX_SHIPMENTS}.`,
  },
  {
    id: 'aliexpress',
    name: 'AliExpress',
    invoicedFrom: 'Fuera de EE.UU.',
    note: 'Mismo tratamiento. El "envío gratis" suele llegar por correo no exprés, que desde el 1/5/2026 paga igual que un courier privado.',
  },
])

export const TEMU_FAQ: readonly FaqItem[] = Object.freeze([
  {
    id: 'que-es',
    question: '¿Qué es el "impuesto Temu"?',
    answer:
      'No es un impuesto con ese nombre ni uno que grave a Temu en particular. Es como se le terminó diciendo al régimen de envíos postales internacionales que rige desde el 1.º de mayo de 2026: las compras al exterior que entran por franquicia pagan IVA, y la franquicia pasó a ser un cupo anual de US$ ' +
      `${FRANCHISE_ANNUAL_USD} repartido en hasta ${FRANCHISE_MAX_SHIPMENTS} envíos por año civil. Se aplica a cualquier plataforma, no sólo a Temu.`,
  },
  {
    id: 'paquete-chico',
    question: '¿Cuánto paga un paquete chico de Temu?',
    answer: `Un envío de US$ ${TEMU_SMALL_PARCEL.valueUsd} paga US$ ${TEMU_SMALL_PARCEL.taxUsd} de impuesto, más que la propia compra. El IVA del ${IVA_PCT} % sobre ese valor daría menos, pero la ley fija un mínimo de US$ ${POSTAL_IVA_MIN_USD} de IVA por envío postal (Ley 20.446 art. 660). Por eso conviene juntar la compra en un envío en vez de partirla en varios chicos.`,
  },
  {
    id: 'cuantos-envios',
    question: '¿Cuántas compras puedo hacer por año sin pagar aranceles?',
    answer: `Hasta ${FRANCHISE_MAX_SHIPMENTS} envíos por año civil, y entre todos no pueden superar los US$ ${FRANCHISE_ANNUAL_USD}. No es un tope por compra: es un saldo acumulado que se gasta. Los libros y los medicamentos de uso personal autorizados por el MSP están exceptuados de ese tope.`,
  },
  {
    id: 'sin-cupo',
    question: '¿Qué pasa cuando se me acaba el cupo?',
    answer: `El envío pasa a la prestación única: ${SIMPLIFIED_RATE_PCT} % del valor de la factura, con un mínimo de US$ ${SIMPLIFIED_MIN_USD} por envío. No se combina con la franquicia: o una o la otra.`,
  },
  {
    id: 'estados-unidos',
    question: '¿Por qué una compra en EE.UU. no paga y una de Temu sí?',
    answer: `Por el acuerdo TIFA (Ley 18.761 art. 7 lit. g), que exonera de IVA a los envíos con factura de EE.UU. de hasta US$ ${USA_IVA_EXEMPTION_USD}. Temu, Shein y AliExpress no facturan en EE.UU., así que nunca entran en esa exoneración. La exoneración además es todo o nada: un dólar por encima de US$ ${USA_IVA_EXEMPTION_USD} y el envío paga IVA sobre el total.`,
  },
  {
    id: 'quien-cobra',
    question: '¿Dónde y cuándo se paga?',
    answer:
      'En el despacho, antes de la entrega: lo cobra el courier o el Correo Uruguayo al momento de liberar el paquete, junto con su propio cargo por gestionar la declaración, que es una tarifa del operador y no un impuesto.',
  },
  {
    id: 'valor',
    question: '¿Sobre qué valor se calcula?',
    answer:
      'Sobre el total de la factura original de compra, con todos los conceptos que figuren sumados en ella —incluido el envío que te cobre el propio vendedor— según el art. 5 del Decreto 50/026. El flete que te factura aparte el courier no forma parte de ese total.',
  },
])
