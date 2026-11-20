// app/utils/loanNoPayslip.ts
// Data + helpers for /prestamo-sin-recibo-de-sueldo-uruguay.
//
// Why the page exists: "préstamo sin recibo de sueldo" grew +300 % in Google Trends in the 90 days
// to 2026-09-15 (docs/seo/2026-09-15-google-trends-oportunidades.md, "segundo escalón") and the
// site had nothing for it. The Uruguayan SERP (gl=uy, 2026-09-16) is nine lenders' own landing
// pages plus one affiliate blog that lists six options without a single rate, Clearing policy or
// BCU status. Those three things are exactly what /mejores-prestamos-uruguay already measures, so
// this page is a FILTER over that catalogue, not a second catalogue: when the weekly refresh
// re-prices a lender, both pages move together.
//
// The one editorial layer on top is the three ways in ("puertas"), and every claim in them is a
// dated quote from the lender's own page. A quote is never "updated" to a newer number: it is
// re-read and re-dated, or removed (see memory `un-solo-tope-de-usura`).
//
// PURE module (no Vue/Nuxt) so the page and the unit tests share it.

import type { BcuCapRow } from './cashAdvance'
import {
  BCU_LABELS,
  CLEARING_LABELS,
  SEGMENT_LABELS,
  representativeTea,
  type ClearingStance,
  type LenderEntity,
  type LenderSegment,
} from './loanTierlist'
import { usuryGridKey, type UsuryGridKey } from './usuryCaps'

/** Last time the quotes below were read against their sources (all four re-read 2026-11-20). */
export const NOPAYSLIP_LOANS_REVIEWED = '2026-11-20'

/**
 * Last time the "sólo con cédula" table was read against each lender's own page. Separate from
 * `NOPAYSLIP_LOANS_REVIEWED` on purpose: the BROU quote in the first door was not re-read that
 * day, and a review date only covers what was re-read. The usury grid has its own date
 * (`BCU_CAPS_READ_ON`) since it was re-read on its own.
 */
export const SOLO_CEDULA_REVIEWED = '2026-09-22'

export type NoPayslipDoorId = 'certificado' | 'solo-cedula' | 'garantia'

export interface NoPayslipQuote {
  /** Lender id in `LENDER_TIERLIST`. */
  lenderId: string
  lenderName: string
  /** What the lender says, verbatim where quoted. */
  text: string
  sourceLabel: string
  sourceUrl: string
}

export interface NoPayslipDoor {
  id: NoPayslipDoorId
  title: string
  who: string
  body: string
  quotes: readonly NoPayslipQuote[]
}

/**
 * The three ways a person without a payslip actually gets a loan in Uruguay.
 *
 * Ordered by cost, not by ease: the certificate route is the cheap one and the one most people
 * don't know they qualify for; "solo con la cédula" is the one the ads sell.
 */
export const NOPAYSLIP_DOORS: readonly NoPayslipDoor[] = Object.freeze([
  {
    id: 'certificado',
    title: 'Con certificado de ingresos de un contador',
    who: 'Independientes formales: unipersonal, monotributo, SRL, profesionales.',
    body: 'Es la vía que abre las tasas bajas. El recibo de sueldo se reemplaza por un certificado firmado por un contador público que declara tus ingresos formales. Sin inscripción en BPS y DGI no hay nada que certificar, así que este camino empieza por formalizarse.',
    quotes: [
      {
        lenderId: 'brou',
        lenderName: 'BROU',
        text: 'Pide un "Certificado de ingresos realizado por Contador Público" con menos de 30 días, el certificado de la Caja de Profesionales del contador y "al menos dos años de antigüedad de aportes en forma continua". La cuota no puede superar el 30 % del ingreso en pesos (25 % en UI, 15 % en dólares), y exige no figurar con información negativa.',
        sourceLabel: 'BROU — préstamos sin retención en pesos, UI y dólares',
        sourceUrl:
          'https://www.brou.com.uy/personas/prestamos/prestamo-consumo/prestamos-sin-retencion-en-pesos-ui-y-dolares',
      },
    ],
  },
  {
    id: 'solo-cedula',
    title: 'Sólo con la cédula',
    who: 'Quien no puede certificar ingresos, o necesita la plata rápido.',
    body: 'Algunas financieras no piden comprobante: evalúan con sus propios registros y con el historial crediticio. "Sin comprobante" no quiere decir "sin requisitos": puede haber ingreso mínimo y control del clearing, y es la puerta más cara.',
    quotes: [
      {
        lenderId: 'oca',
        lenderName: 'OCA',
        text: '"Solo con tu cédula. Sin ningún comprobante." Pide un ingreso mensual mínimo de $ 10.000 (soltero) o $ 15.000 (casado), tener entre 18 y 72 años y "no figurar actualmente en el clearing".',
        sourceLabel: 'OCA — préstamos para nuevos clientes',
        sourceUrl: 'https://oca.uy/prestamos/nuevo-cliente.html',
      },
      {
        lenderId: 'pronto',
        lenderName: 'Pronto!',
        text: '"Podrás solicitarlos solo con la cédula", aunque recomienda presentar el recibo de sueldo o de jubilación "para poder acceder a mejores ofertas". Montos de $ 5.000 a $ 600.000 en hasta 48 cuotas.',
        sourceLabel: 'Pronto! — préstamos en efectivo',
        sourceUrl: 'https://pronto.com.uy/dinero/',
      },
      {
        lenderId: 'creditel',
        lenderName: 'Creditel',
        text: 'Pide cédula vigente y tener entre 18 y 84 años. "En caso de no tener el comprobante de ingresos, podés presentar tres facturas a tu nombre de UTE, OSE, Antel, otras compañías telefónicas o de cable." Montos de $ 3.000 a $ 240.000 y la primera cuota a los 60 días; no publica la TEA (leído el 20 de noviembre de 2026).',
        sourceLabel: 'Creditel — preguntas frecuentes',
        sourceUrl: 'https://www.creditel.com.uy/centro-ayuda/preguntas-frecuentes',
      },
    ],
  },
  {
    id: 'garantia',
    title: 'Con una garantía',
    who: 'Quien no tiene ingresos que mostrar pero sí un bien.',
    body: 'En el empeño lo que respalda el préstamo es el objeto que dejás, y si no pagás lo perdés. El crédito prendario sobre un auto también se apoya en el vehículo, aunque la institución puede pedirte igual que compruebes ingresos. Ojo: el préstamo pignoraticio del BROU (empeño de oro) exige no tener información negativa.',
    quotes: [],
  },
])

// ── "Sólo con cédula": quién presta de verdad sin comprobante, y a qué precio ──────────────────
//
// La confusión central de la demanda (SERP gl=uy, 2026-09-22): "sólo con cédula" quiere decir SIN
// COMPROBANTE DE INGRESOS, no "sin mirar el clearing". De las financieras que lo anuncian, OCA
// exige "no figurar actualmente en el clearing", Crédito de la Casa pide "sin incumplimientos en
// Infocred o Clearing" hasta para Compra Ágil, y República Microfinanzas "sin morosidad vigente en
// Clearing de informes y/o sistema financiero". De las que anuncian la cédula sola, la que dice
// prestar estando en el clearing es Pronto!; las que lo dicen pidiendo recibo (ANDA, Cash) están en
// `CLEARING_LENDERS`, más abajo. Cada fila es una lectura fechada (`SOLO_CEDULA_REVIEWED`, o su
// `readOn` si se releyó sola) de la página del propio prestamista.

/** `si` = anuncia que basta la cédula; `parcial` = cédula más otro papel; `no` = pide comprobante. */
export type SoloCedulaStance = 'si' | 'parcial' | 'no'

export const SOLO_CEDULA_LABELS: Record<SoloCedulaStance, string> = Object.freeze({
  si: 'Sí, lo anuncia',
  parcial: 'Cédula y otro papel',
  no: 'No: pide comprobante',
})

export interface SoloCedulaLender {
  /** Lender id in `LENDER_TIERLIST`; absent when the ranking does not list the institution. */
  lenderId?: string
  name: string
  soloCedula: SoloCedulaStance
  /** Qué pide en lugar del recibo (o además de la cédula). */
  pide: string
  /** Qué dice de los antecedentes, con las palabras de su página. */
  clearing: string
  /**
   * ISO de la relectura de ESA página, cuando es más nueva que `SOLO_CEDULA_REVIEWED`. Existe por
   * el mismo motivo que `BCU_CAPS_READ_ON` está aparte: una fila se vuelve a leer sola —porque su
   * ejemplo venció y la página cambió— y declarar esa lectura con la fecha global diría que las
   * nueve se releyeron. Ausente = la fila es de `SOLO_CEDULA_REVIEWED`.
   */
  readOn?: string
  /** TEA publicada, con los gastos que la acompañan. */
  tasa: string
  /** Montos y plazos publicados. */
  montos: string
  sourceLabel: string
  sourceUrl: string
}

export const SOLO_CEDULA_LENDERS: readonly SoloCedulaLender[] = Object.freeze([
  {
    lenderId: 'oca',
    name: 'OCA',
    soloCedula: 'si',
    pide: 'Tener entre 18 y 72 años y un ingreso mensual mínimo de $ 10.000 (soltero) o $ 15.000 (casado), sin comprobante.',
    clearing: 'Exige "no figurar actualmente en el clearing".',
    // Relectura del 2026-11-20: la web pasó de 29–87 % a 32–78 % y el ejemplo de TEA 39 % a 42 %.
    // La cartilla (TasasVigentes.pdf) es "Vigente desde: 01/11/2026" con techo de 78 %; su capa de
    // texto sale revuelta, así que de ella sólo se repite la frase de las 120 UI, leída a ojo.
    readOn: '2026-11-20',
    tasa: 'TEA entre 32 % y 78 % + IVA según su web. Comisiones de 40 UI (concesión) + 80 UI (administración y cobranza) + IVA y seguro de vida de 0,25 % mensual sobre saldo; según su cartilla, las 120 UI "se cobran al inicio y se suman al capital solicitado". Ejemplo publicado: $ 200.000 a 24 meses con TEA 42 %, cuota $ 12.936, total $ 310.464.',
    montos: '$ 5.000 a $ 600.000 en 7 a 36 meses (la FAQ online dice $ 6.000 a $ 150.000).',
    sourceLabel: 'OCA — préstamos para nuevos clientes y cartilla de tasas vigentes',
    sourceUrl: 'https://oca.uy/prestamos/nuevo-cliente.html',
  },
  {
    lenderId: 'pronto',
    name: 'Pronto!',
    soloCedula: 'si',
    pide: '"Podrás solicitarlos solo con la cédula"; recomienda el recibo de sueldo o de jubilación "para poder acceder a mejores ofertas".',
    clearing:
      'La titula "Préstamos estando en el clearing y sin recibo de sueldo", sujeto a evaluación.',
    readOn: '2026-11-20',
    tasa: 'Publica como máximos los topes del BCU de noviembre de 2026 (142,7395 % hasta 366 días bajo 10.000 UI; 55,1335 % desde 10.000 UI) y anuncia "desde 29 % + IVA". Ejemplo con recibo: $ 500.000 en 42 cuotas de $ 28.526, TEA 49 % + IVA, precio total financiado $ 1.198.092.',
    montos:
      '$ 5.000 a $ 600.000 en 3 a 48 cuotas, primera cuota hasta 60 días (en /credito/ dice hasta $ 1.000.000).',
    sourceLabel: 'Pronto! — préstamos estando en el clearing y sin recibo de sueldo',
    sourceUrl: 'https://www.pronto.com.uy/dinero/',
  },
  {
    lenderId: 'creditel',
    name: 'Creditel',
    soloCedula: 'parcial',
    pide: 'Cédula vigente y 18 a 84 años. Sin comprobante de ingresos acepta "tres facturas a tu nombre de UTE, OSE, Antel, otras compañías telefónicas o de cable"; el monto mayor exige comprobante en sucursal.',
    clearing: 'No lo publica.',
    tasa: 'No publica la TEA en la FAQ, la home ni /efectivo. En /efectivo ofrece adelanto de sueldo o de jubilación hasta $ 40.000 a devolver a los 30 días.',
    montos:
      '$ 3.000 a $ 240.000 (hasta 4 sueldos líquidos), primera cuota a los 60 días; /efectivo también dice "hasta $ 600.000".',
    sourceLabel: 'Creditel — preguntas frecuentes',
    sourceUrl: 'https://www.creditel.com.uy/centro-ayuda/preguntas-frecuentes',
  },
  {
    lenderId: 'credito-de-la-casa',
    name: 'Crédito de la Casa',
    soloCedula: 'no',
    pide: 'Lo único "sólo con cédula" es Compra Ágil: 23 a 84 años, cédula vigente, celular propio y firma del contrato por única vez, con tope inicial de $ 5.000 y cuota máxima de $ 600. El efectivo agrega comprobante de ingresos (recibo con al menos 6 meses), constancia de domicilio y firma del vale en sucursal.',
    clearing:
      'Hasta Compra Ágil exige "no deberá tener incumplimientos en Infocred o Clearing" y "no figurar en MOCASIST".',
    tasa: 'No la publica en la FAQ. "No operamos" con retención de sueldo.',
    montos: 'Compra Ágil: tope inicial $ 5.000. Efectivo: sin monto publicado en la FAQ.',
    sourceLabel: 'Crédito de la Casa — preguntas frecuentes',
    sourceUrl: 'https://www.creditodelacasa.com.uy/faq',
  },
  {
    lenderId: 'verde-fucac',
    name: 'Verde (ex FUCAC)',
    soloCedula: 'no',
    pide: 'Último recibo de sueldo, jubilación o pensión, cédula y constancia de domicilio; mayor de 18 años.',
    clearing:
      'Si te atrasás, avisa que registra en Clearing de Informes y retiene el 20 % de sueldo, jubilación o pensión.',
    // Relectura del 2026-11-03: el ejemplo "Limpiadeudas" que esta fila publicaba vencía el
    // 31/10/2026 y ya no está en la página, y la TEA mínima subió de 25 % a 27 %. El ejemplo nuevo
    // va con la validez tal como la imprime el origen: dice "30/11/20026", con un dígito de más en
    // el año, así que acá no se corrige a 2026 ni se da por vigente una fecha que nadie escribió.
    readOn: '2026-11-03',
    tasa: 'TEA compensatoria 27 % a 32 % (mora 37,5 % a 43,5 %) más cuota social de $ 330 por mes IVA incluido. Ejemplo "Desinteresado" de octubre de 2026: $ 80.000 en 18 cuotas de $ 6.150, TEA 27 %, costo total $ 110.707; su validez la publican como "30/11/20026", con el año mal tipeado en el origen.',
    montos: '$ 2.000 a $ 600.000 en 6 a 48 cuotas.',
    sourceLabel: 'Verde — términos y condiciones',
    sourceUrl: 'https://verde.com.uy/conocenos_mas_transparentes.php',
  },
  {
    lenderId: 'anda',
    name: 'ANDA',
    soloCedula: 'no',
    pide: 'Último recibo de sueldo y 6 meses de antigüedad (los pasivos no requieren antigüedad), más cédula. Lo que se firma "sólo con tu cédula" en Abitab es el contrato web, no el préstamo sin recibo.',
    // Sin "exige" ni "no figurar": ANDA presta con antecedentes (postura 'si' en el ranking).
    clearing:
      'En sus preguntas frecuentes dice que podés afiliarte y pedir el préstamo "estando en el Clearing de Informes" y que, según el antecedente, puede pedir una garantía. La línea de nómina para pasivos pide "buenos antecedentes crediticios".',
    readOn: '2026-11-20',
    tasa: 'Noviembre de 2026: bajo 10.000 UI, 26,30 % (1 a 10 cuotas) o 31,50 % (12 o más) + IVA; desde 10.000 UI, 27,20 % o 30,60 % + IVA.',
    montos: '1 a 48 cuotas; 10.000 UI eran $ 66.838 con la UI del 31 de octubre de 2026.',
    sourceLabel: 'ANDA — préstamos',
    sourceUrl: 'https://anda.com.uy/prestamos/',
  },
  {
    name: 'República Microfinanzas (grupo BROU)',
    soloCedula: 'no',
    pide: 'Actividad independiente como fuente principal de ingresos con 6 meses (asalariados, 1 año), dos firmas, 18 a 75 años. Los comparadores que la listan como "sólo con cédula" no citan su cartilla.',
    clearing:
      '"Sin morosidad vigente en Clearing de informes y/o sistema financiero"; tampoco deudor alimentario.',
    readOn: '2026-11-20',
    tasa: 'TEA 44 % + IVA hasta 366 días y 46 % + IVA desde 367 días, mora 49 %; cartilla vigente del 1 al 30 de noviembre de 2026.',
    montos: '3.000 a 12.500 UI (30.000 UI con 2 años de cliente) en 3 a 18 meses.',
    sourceLabel: 'República Microfinanzas — cartilla Préstamo Efectivo (PDF)',
    sourceUrl:
      'https://www.republicamicrofinanzas.com.uy/wp-content/uploads/2025/04/cartilla-prestamo-efectivo.pdf',
  },
])

// ── Estando en el clearing: con recibo y sin recibo de sueldo ─────────────────────────────────
//
// La mitad de los clics atribuibles de la página (GSC 2026-10-21..11-17) venía de consultas que
// cruzan "estando en el clearing" con "con/sin recibo de sueldo", y la página no tenía la respuesta:
// decía que la única que presta estando en el clearing es Pronto!. Releídas en la página de cada
// prestamista, cinco lo dicen, y la línea que importa es si piden recibo. Cada fila cita lo que la
// institución dice del clearing; las tasas llevan su mes porque ANDA, Cash y Pronto! las republican
// todos los meses.

/** Cuándo se leyó la tabla del clearing contra la página de cada institución. */
export const CLEARING_REVIEWED = '2026-11-20'

/** `pide` = exige recibo o comprobante de ingresos; `no-pide` = no lo exige; `no-publica` = no lo dice. */
export type PayslipStance = 'pide' | 'no-pide' | 'no-publica'

export const PAYSLIP_LABELS: Record<PayslipStance, string> = Object.freeze({
  pide: 'Sí, pide recibo',
  'no-pide': 'No pide recibo',
  'no-publica': 'No lo publica',
})

export interface ClearingLender {
  /** Lender id in `LENDER_TIERLIST`. */
  lenderId?: string
  name: string
  recibo: PayslipStance
  /** Qué dice del clearing, con sus palabras. */
  dice: string
  /** Qué pide para prestar. */
  pide: string
  /** Tasa publicada, con los gastos y el mes al que corresponde. */
  tasa: string
  /**
   * La TEA más baja y la más alta que `tasa` publica, sin IVA, como números: de acá salen la frase
   * de tasas del cierre de la sección y del FAQ, y la tasa de la tabla principal cuando el catálogo
   * no la trae (Volvé). Ausente = la página no publica un rango propio.
   */
  teaRange?: readonly [number, number]
  /** La página imprime como tasa máxima el tope del BCU y no una tasa propia (Pronto!). */
  capOnly?: true
  montos: string
  sourceLabel: string
  sourceUrl: string
}

export const CLEARING_LENDERS: readonly ClearingLender[] = Object.freeze([
  {
    lenderId: 'anda',
    name: 'ANDA',
    recibo: 'pide',
    dice: 'En sus preguntas frecuentes: "Sí, podés afiliarte a ANDA y solicitar tu préstamo estando en el Clearing de Informes. Dependiendo del tipo de antecedente, se puede solicitar una garantía."',
    pide: 'Ser socio, último recibo de sueldo, 6 meses de antigüedad laboral (los pasivos no requieren antigüedad) y cédula vigente. El monto depende de tu "disponible", que se calcula con el recibo.',
    tasa: 'Noviembre de 2026: bajo 10.000 UI, 26,30 % (1 a 10 cuotas) o 31,50 % (12 o más) + IVA; desde 10.000 UI, 27,20 % o 30,60 % + IVA.',
    teaRange: [26.3, 31.5],
    montos: '1 a 48 cuotas; 10.000 UI eran $ 66.838 con la UI del 31 de octubre de 2026.',
    sourceLabel: 'ANDA — preguntas frecuentes de préstamos',
    sourceUrl: 'https://anda.com.uy/prestamos/preguntas-frecuentes/',
  },
  {
    lenderId: 'cash',
    name: 'Cash',
    recibo: 'pide',
    dice: 'En sus requisitos: "Estar en el clearing con antecedentes de incumplimiento no es excluyente para solicitar un crédito", sujeto a aprobación crediticia.',
    pide: 'Último recibo de ingresos, comprobante de domicilio y cédula vigente. Empleados en relación de dependencia y jubilados mayores de 21 años, con 4 meses de antigüedad laboral e ingreso líquido mayor a $ 10.000.',
    // Sólo el rango: la tabla por celda de su página parece cruzada (134,7 % cae en una celda cuyo
    // tope legal es 55,13 %), y una fuente no se "corrige" acá.
    tasa: 'TEA de 54,1 % a 141,7 % + IVA según monto y plazo (noviembre de 2026), más gastos de concesión de hasta 40 UI, administrativos de hasta 80 UI y un seguro de 6 por mil mensual sobre saldo. Su ejemplo: $ 10.000 en 10 cuotas fijas de $ 1.661, total $ 16.610.',
    teaRange: [54.1, 141.7],
    montos:
      '$ 5.000 a $ 500.000 en hasta 48 cuotas (sus preguntas frecuentes dicen "hasta $ 250.000").',
    sourceLabel: 'Cash — requisitos y documentación',
    sourceUrl: 'https://prestamocash.com.uy/pagina/requisitos-y-documentacion',
  },
  {
    lenderId: 'pronto',
    name: 'Pronto!',
    recibo: 'no-pide',
    dice: 'Titula su página "Préstamos estando en el clearing y sin recibo de sueldo" y dice que evalúa tu perfil crediticio antes de ofertar.',
    pide: '"Podrás solicitarlos solo con la cédula"; aconseja presentar el recibo de sueldo o de jubilación "para poder acceder a mejores ofertas".',
    tasa: 'No publica su tasa para este caso: sus términos imprimen como máximos los topes del BCU (la tabla de más abajo). Su ejemplo es con recibo: $ 500.000 en 42 cuotas de $ 28.526, TEA 49 % + IVA, precio total financiado $ 1.198.092.',
    capOnly: true,
    montos: '$ 5.000 a $ 600.000 en hasta 48 cuotas; se retira en una sucursal.',
    sourceLabel: 'Pronto! — préstamos estando en el clearing y sin recibo de sueldo',
    sourceUrl: 'https://www.pronto.com.uy/dinero/',
  },
  {
    lenderId: 'volve',
    name: 'Volvé',
    recibo: 'no-pide',
    dice: '"Te damos la oportunidad de volver al mundo crediticio sin importar si estás en el Clearing." Se dirige a quien tiene "malos antecedentes crediticios".',
    pide: '"Simplemente tener entre 35 y 75 años y una cuenta bancaria a tu nombre." Da hasta 100 préstamos por día.',
    tasa: 'TEA entre 112 % y 141,74 % + IVA, más gastos de hasta 120 UI (40 UI por la concesión y 8 UI por cuota).',
    // El catálogo (`LENDER_TIERLIST` y el snapshot del 2026-11-08) la tiene sin tasa: este rango,
    // leído en el pie de https://www.volve.com.uy/ el 2026-11-20, es el que va a la tabla principal.
    teaRange: [112, 141.74],
    montos:
      'El primero es de $ 1.000 en 3 cuotas; pagándolo en fecha, de $ 1.000 a $ 60.000 en 3 a 24 cuotas.',
    sourceLabel: 'Volvé — página principal',
    sourceUrl: 'https://www.volve.com.uy/',
  },
  {
    lenderId: 'pago-despues',
    name: 'Pago Después',
    recibo: 'no-publica',
    dice: '"Accedé a préstamos en efectivo sin vueltas. Incluso estando en el Clearing", sujeto a aprobación crediticia.',
    pide: 'Ser cliente de su app: pedís si tenés monto disponible; si no, se habilita "realizando compras con Pago Después y siendo buen cliente". credisol.com.uy redirige a este mismo sitio.',
    // El snapshot del 2026-11-08 le puso teaMaxPct 126 y en su propia nota dice que ese rango
    // "replica el tope legal del BCU por tramo de monto en UI, no es una tasa promocional propia".
    // Por eso la tabla principal tampoco lo imprime como su tasa (`READ_AS_BCU_CAP`).
    tasa: 'No publica una tasa propia: como tasa, su página legal imprime el tope de tasas del BCU.',
    montos: 'Se acredita en tu cuenta bancaria "en menos de 24hs hábiles".',
    sourceLabel: 'Pago Después — página principal',
    sourceUrl: 'https://www.pagodespues.com.uy/',
  },
])

/** Las que atienden a quien no tiene recibo pero exigen no tener antecedentes, con sus palabras. */
export const CLEARING_CLOSED: readonly { name: string; quote: string; sourceUrl: string }[] =
  Object.freeze([
    {
      name: 'OCA',
      quote: '"no figurar actualmente en el clearing"',
      sourceUrl: 'https://oca.uy/prestamos/nuevo-cliente.html',
    },
    {
      name: 'BROU',
      quote:
        '"No figurar con información negativa en el BROU o en el resto del sistema financiero"',
      sourceUrl:
        'https://www.brou.com.uy/personas/prestamos/prestamo-consumo/prestamos-sin-retencion-en-pesos-ui-y-dolares',
    },
    {
      name: 'República Microfinanzas',
      quote: '"Sin morosidad vigente en Clearing de informes y/o sistema financiero"',
      sourceUrl:
        'https://www.republicamicrofinanzas.com.uy/wp-content/uploads/2025/04/cartilla-prestamo-efectivo.pdf',
    },
  ])

/**
 * La campaña "Préstamos a Pasivos 2026" del BROU: eBROU desde el 9/11; WhatsApp (2 1996 000) del
 * 16/11 al 22/12 para quien cobra menos de $ 30.000 nominales; en sucursales, dos dígitos
 * verificadores por día en DOS rondas (quien cobra en el BROU, 16–20/11 y 9–15/12; quien no,
 * 24–30/11 y 16–22/12), y desde el 23/12 todos. La ronda de noviembre dura una semana: la página
 * imprime las rondas enteras, nunca "desde el 16", que al día siguiente de cerrar ya engaña.
 */
export const BROU_PASIVOS_CAMPAIGN = Object.freeze({
  readOn: '2026-11-20',
  sourceUrl: 'https://www.brou.com.uy/personas/prestamos/campania-prestamos-a-pasivos-2026',
})

/** `['A']` → `'A'`; `['A', 'B']` → `'A y B'`; `['A', 'B', 'C']` → `'A, B y C'`. */
export function joinEs(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

/** Las de la tabla del clearing con esa postura sobre el recibo: `'pide'` → "ANDA y Cash". */
export const clearingNames = (recibo: PayslipStance): string =>
  joinEs(CLEARING_LENDERS.filter(l => l.recibo === recibo).map(l => l.name))

/** `[112, 141.74]` → `'de 112 % a 141,74 % + IVA'`. */
const rangeEs = ([lo, hi]: readonly [number, number]): string =>
  lo === hi ? `${pctEs(lo)} + IVA` : `de ${pctEs(lo)} a ${pctEs(hi)} + IVA`

/**
 * Lo que publica cada una de la tabla del clearing como tasa, armado con los números de sus filas:
 * "sin recibo, Volvé publica de 112 % a 141,74 % + IVA y Pronto! imprime como máximo el tope del
 * BCU (…); con recibo, ANDA publica de 26,3 % a 31,5 % + IVA y Cash, de 54,1 % a 141,7 % + IVA."
 * Las que no publican tasa (Pago Después) no entran: no hay qué comparar.
 */
export function clearingRatesSentence(capLabel: string): string {
  const part = (recibo: PayslipStance): string =>
    joinEs(
      CLEARING_LENDERS.filter(l => l.recibo === recibo).flatMap(l => {
        if (l.teaRange) return [`${l.name} publica ${rangeEs(l.teaRange)}`]
        if (l.capOnly) {
          return [
            `${l.name} imprime como máximo el tope del BCU (${capLabel} en pesos, menos de 10.000 UI y hasta un año)`,
          ]
        }
        return []
      })
    )
  const sin = part('no-pide')
  const con = part('pide')
  return [sin && `sin recibo, ${sin}`, con && `con recibo, ${con}`].filter(Boolean).join('; ') + '.'
}

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

/** `'2026-11-20'` → `'20 de noviembre de 2026'`, sin `Intl` ni zona horaria. */
export function isoDateEs(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  const month = m ? MONTHS_ES[Number(m[2]) - 1] : undefined
  return m && month ? `${Number(m[3])} de ${month} de ${m[1]}` : iso
}

/**
 * Ids que la propia página leyó como "presta sin comprobante de ingresos": las de la cédula sola (o
 * cédula y otro papel) y las del clearing que no piden recibo. Existe porque el refresco semanal del
 * catálogo reetiqueta audiencias (el 2026-11-08 les sacó 'independiente' a Pronto! y a Creditel) y
 * la tabla principal no puede contradecir una lectura fechada de la página del prestamista.
 */
const READ_WITHOUT_PAYSLIP: ReadonlySet<string> = new Set(
  [
    ...SOLO_CEDULA_LENDERS.filter(l => l.soloCedula !== 'no').map(l => l.lenderId),
    ...CLEARING_LENDERS.filter(l => l.recibo === 'no-pide').map(l => l.lenderId),
  ].filter((id): id is string => !!id)
)

/**
 * La TEA de la tabla del clearing para las que el catálogo trae sin tasa. Sólo rellena un hueco:
 * si el catálogo (o el snapshot semanal) publica una tasa, gana esa. Existe porque la tabla
 * principal decía "No la publica" para Volvé dos secciones arriba de la fila que cita su rango.
 */
const READ_TEA: ReadonlyMap<string, readonly [number, number]> = new Map(
  CLEARING_LENDERS.filter(l => l.lenderId && l.teaRange).map(
    l => [l.lenderId!, l.teaRange!] as const
  )
)

/**
 * Las que imprimen como tasa el tope del BCU y no una propia (Pago Después: el snapshot del
 * 2026-11-08 le puso "hasta 126 %" y su propia nota dice que replica el tope legal). Una cifra del
 * tope no es la tasa de esa institución, así que no se rotula como tal ni entra al rango de tasas.
 */
const READ_AS_BCU_CAP: ReadonlySet<string> = new Set(['pago-despues'])
export const BCU_CAP_ONLY_LABEL = 'Imprime el tope del BCU'

/** The rate this page prints for a lender: the catalogue's, or the page's own dated reading. */
function pageTea(l: LenderEntity): { teaPct: number | null; teaMaxPct: number | null } {
  if (READ_AS_BCU_CAP.has(l.id)) return { teaPct: null, teaMaxPct: null }
  const read = READ_TEA.get(l.id)
  if (read && !(l.teaPct != null && l.teaPct > 0) && !(l.teaMaxPct != null && l.teaMaxPct > 0)) {
    return { teaPct: read[0], teaMaxPct: read[1] }
  }
  return { teaPct: l.teaPct, teaMaxPct: l.teaMaxPct }
}

// ── Topes de usura vigentes (BCU, Ley 18.212) ─────────────────────────────────────────────────
//
// El BCU republica la tabla TODOS LOS MESES sobre una ventana trimestral móvil (memoria
// `un-solo-tope-de-usura`), así que las CUATRO filas de consumo en pesos (por tramo y por plazo)
// se reemplazan por las que trae hoy la grilla viva (`/api/bcu-rates`). Las de dólares NO: la
// grilla seguía sirviendo 8,26 % / 12,26 % cuando la Comunicación 2026/212 ya decía 11,2685 % /
// 17,7785 %, así que quedan como lectura fechada de esa comunicación hasta que `/api/bcu-rates`
// las lea bien. Las que la grilla no trae (autorización de descuento, retención de haberes,
// crédito de nómina) también son lectura fechada, y todas las fechadas se marcan así. Regla legal (art. 11, redacción Ley 19.732): tope =
// media + 55 %; crédito de nómina + 20 %; retención de haberes + 30 %; mora + 80 %.
//
// La lectura fechada sale de la COMUNICACIÓN que publica cada tabla y no del PDF de la URL fija:
// ese archivo se pisa todos los meses (el 31/10/2026 ya traía la tabla de julio–setiembre que
// rige desde el 1/11, y el 1/11/2026 seguía trayéndola). La comunicación queda en su dirección y
// sigue diciendo lo mismo, así que es la única fuente que respalda una cifra fechada. Las doce
// filas cierran con la regla de arriba.

/** Período de la tabla leída a mano y su vigencia, tal como los imprime la comunicación. */
export const BCU_CAPS_PERIOD = 'julio–setiembre de 2026'
export const BCU_CAPS_IN_FORCE_SINCE = '2026-11-01'
/** Comunicación BCU 2026/212 (22/10/2026, RR-SSF-2026-682): tasas medias julio–setiembre de 2026. */
export const BCU_CAPS_SOURCE_URL = 'https://www.bcu.gub.uy/Comunicados/seggco26212.pdf'
/** Número de la comunicación, para el pie de la tabla: que no quede escrito a mano en la página. */
export const BCU_CAPS_COMUNICACION = '2026/212'
/** Fecha de la comunicación ("Montevideo, 22 de octubre de 2026"): no es la de su lectura. */
export const BCU_CAPS_COMUNICACION_DATE = '2026-10-22'
/**
 * Cuándo se leyó esa comunicación. Aparte de `SOLO_CEDULA_REVIEWED` a propósito: la tabla del BCU
 * se volvió a leer ese día y las páginas de los prestamistas no.
 */
export const BCU_CAPS_READ_ON = '2026-11-01'

export interface NoPayslipCapRow {
  id: string
  segment: string
  plazo: 'hasta 366 días' | '367 días o más'
  currency: 'UYU' | 'USD'
  meanPct: number
  capPct: number
  /** Tope de mora; ausente cuando el PDF no lo imprime para esa fila. */
  moraPct?: number
  /** Fila de la grilla viva que la refresca; ausente = lectura fechada del PDF. */
  grid?: UsuryGridKey
  /** `true` cuando el número mostrado salió de la grilla viva de hoy. */
  live?: boolean
}

export const NOPAYSLIP_CAPS: readonly NoPayslipCapRow[] = Object.freeze([
  {
    id: 'sin-descuento-chico-corto',
    segment: 'Consumo sin autorización de descuento, menos de 10.000 UI',
    plazo: 'hasta 366 días',
    currency: 'UYU',
    meanPct: 92.09,
    capPct: 142.7395,
    moraPct: 165.762,
    grid: 'menor10kUI|corto|UYU',
  },
  {
    id: 'sin-descuento-chico-largo',
    segment: 'Consumo sin autorización de descuento, menos de 10.000 UI',
    plazo: '367 días o más',
    currency: 'UYU',
    meanPct: 87.4,
    capPct: 135.47,
    moraPct: 157.32,
    grid: 'menor10kUI|largo|UYU',
  },
  {
    id: 'sin-descuento-grande-corto',
    segment: 'Consumo sin autorización de descuento, 10.000 UI o más',
    plazo: 'hasta 366 días',
    currency: 'UYU',
    meanPct: 35.57,
    capPct: 55.1335,
    moraPct: 64.026,
    grid: 'mayor10kUI|corto|UYU',
  },
  {
    id: 'sin-descuento-grande-largo',
    segment: 'Consumo sin autorización de descuento, 10.000 UI o más',
    plazo: '367 días o más',
    currency: 'UYU',
    meanPct: 51.74,
    capPct: 80.197,
    moraPct: 93.132,
    grid: 'mayor10kUI|largo|UYU',
  },
  {
    id: 'con-descuento-chico-corto',
    segment: 'Consumo con autorización de descuento, menos de 10.000 UI',
    plazo: 'hasta 366 días',
    currency: 'UYU',
    meanPct: 20.3,
    capPct: 31.465,
    moraPct: 36.54,
  },
  {
    id: 'con-descuento-chico-largo',
    segment: 'Consumo con autorización de descuento, menos de 10.000 UI',
    plazo: '367 días o más',
    currency: 'UYU',
    meanPct: 24.27,
    capPct: 37.6185,
    moraPct: 43.686,
  },
  {
    id: 'retencion-chico-corto',
    segment: 'Crédito con retención de haberes (tope 30 %), menos de 10.000 UI',
    plazo: 'hasta 366 días',
    currency: 'UYU',
    meanPct: 20.3,
    capPct: 26.39,
  },
  {
    id: 'retencion-chico-largo',
    segment: 'Crédito con retención de haberes (tope 30 %), menos de 10.000 UI',
    plazo: '367 días o más',
    currency: 'UYU',
    meanPct: 24.27,
    capPct: 31.55,
  },
  {
    id: 'nomina-chico-corto',
    segment: 'Crédito de nómina (tope 20 %), menos de 10.000 UI',
    plazo: 'hasta 366 días',
    currency: 'UYU',
    meanPct: 20.3,
    capPct: 24.36,
  },
  {
    id: 'nomina-chico-largo',
    segment: 'Crédito de nómina (tope 20 %), menos de 10.000 UI',
    plazo: '367 días o más',
    currency: 'UYU',
    meanPct: 24.27,
    capPct: 29.12,
  },
  // En dólares el PDF publica UNA sola celda de consumo, sin partir por autorización de descuento ni
  // por tramo de UI: no existe un tope en dólares "sin descuento bajo 10.000 UI".
  // Sin `grid` a propósito: /api/bcu-rates trae las filas en dólares sin parsearlas, y el 2026-11-19
  // servía 8,26 % / 12,26 % contra 7,27 % / 11,47 % de la Comunicación 2026/212. La grilla viva
  // pisaba esta lectura buena con una vieja; hasta que la grilla las lea, rige la comunicación.
  {
    id: 'usd-consumo-corto',
    segment: 'Consumo en dólares (única categoría)',
    plazo: 'hasta 366 días',
    currency: 'USD',
    meanPct: 7.27,
    capPct: 11.2685,
    moraPct: 13.086,
  },
  {
    id: 'usd-consumo-largo',
    segment: 'Consumo en dólares (única categoría)',
    plazo: '367 días o más',
    currency: 'USD',
    meanPct: 11.47,
    capPct: 17.7785,
    moraPct: 20.646,
  },
])

/** Misma banda de magnitud que `usuryCaps.ts`: un error de unidad pasa la prueba aritmética entera. */
const CAP_PERCENT_BAND: readonly [number, number] = [2, 500]

function liveRowUsable(row: BcuCapRow): boolean {
  const mean = row.media * 100
  const cap = row.tope * 100
  return (
    Number.isFinite(mean) &&
    Number.isFinite(cap) &&
    mean >= CAP_PERCENT_BAND[0] &&
    mean <= CAP_PERCENT_BAND[1] &&
    cap >= CAP_PERCENT_BAND[0] &&
    cap <= CAP_PERCENT_BAND[1]
  )
}

/**
 * La tabla de topes con las filas que la grilla viva trae reemplazadas por las de hoy. Una fila
 * sin `grid`, o cuya fila viva no cierra, queda como la lectura fechada del PDF y sale `live: false`.
 */
export function mergeNoPayslipCaps(
  baseline: readonly NoPayslipCapRow[],
  live: readonly BcuCapRow[] | null | undefined
): NoPayslipCapRow[] {
  const byKey = new Map<UsuryGridKey, BcuCapRow>()
  for (const row of live || []) {
    if (liveRowUsable(row)) byKey.set(usuryGridKey(row), row)
  }
  return baseline.map(row => {
    const fresh = row.grid ? byKey.get(row.grid) : undefined
    if (!fresh) return { ...row, live: false }
    const mora = fresh.topeMora * 100
    return {
      ...row,
      meanPct: fresh.media * 100,
      capPct: fresh.tope * 100,
      moraPct: Number.isFinite(mora) && mora > 0 ? mora : row.moraPct,
      live: true,
    }
  })
}

/**
 * Gastos que la Ley 18.212 (art. 14) deja FUERA del cálculo de usura, en UI, por literal. El
 * préstamo típico "sólo con cédula" no tiene retención ni débito automático, así que cae en el
 * literal D (120 UI), que es exactamente el que OCA invoca con sus 40 UI + 80 UI.
 */
export const USURY_EXCLUDED_COSTS: readonly { id: string; text: string }[] = Object.freeze([
  { id: 'a', text: 'A) El IVA sobre los intereses y los impuestos a cargo del cliente.' },
  {
    id: 'b',
    text: 'B) Hasta 30 UI por cliente de gastos fijos (10 UI por la concesión y 2 UI por cuota), sólo si el crédito se cobra con retención de sueldo o débito automático.',
  },
  { id: 'c', text: 'C) Hasta 10 UI por utilización en créditos revolving y sobregiros.' },
  {
    id: 'd',
    text: 'D) Hasta 120 UI por cliente (40 UI por la concesión y 8 UI por cuota) en las demás modalidades de pago, que es el caso del préstamo de financiera sin retención. En B y D no se pueden volver a excluir gastos por un crédito nuevo hasta 60 días después del anterior.',
  },
  {
    id: 'art16',
    text: 'Art. 16: las cooperativas y asociaciones civiles pueden dejar fuera la cuota social, hasta 50 UI por mes.',
  },
])

export interface NoPayslipRow {
  id: string
  name: string
  segment: LenderSegment
  segmentLabel: string
  /** "26–31 %", "hasta 129,92 %", "36,8 %" or "No la publica". */
  teaLabel: string
  /** Representative TEA used for ordering; `null` sorts last. */
  teaSort: number | null
  clearing: ClearingStance
  clearingLabel: string
  bcuLabel: string
  sourceUrl: string
}

/** Uruguayan percentage: `123.43` → `'123,43 %'`. */
export function pctEs(value: number): string {
  return `${value.toLocaleString('es-UY', { maximumFractionDigits: 2 })} %`
}

/** The published TEA of a lender as a short label. */
export function teaLabelOf(teaPct: number | null, teaMaxPct: number | null): string {
  const lo = teaPct != null && Number.isFinite(teaPct) && teaPct > 0 ? teaPct : null
  const hi = teaMaxPct != null && Number.isFinite(teaMaxPct) && teaMaxPct > 0 ? teaMaxPct : null
  if (lo != null && hi != null && hi > lo) {
    return `${lo.toLocaleString('es-UY', { maximumFractionDigits: 2 })}–${pctEs(hi)}`
  }
  if (lo != null) return pctEs(lo)
  if (hi != null) return `hasta ${pctEs(hi)}`
  return 'No la publica'
}

/**
 * Lenders that will consider somebody without a payslip: those whose published audience includes
 * independent workers, pawn/secured lenders, which assess the collateral instead of income, and
 * the ones this page read lending without proof of income (`READ_WITHOUT_PAYSLIP`).
 * Cheapest representative TEA first; lenders that publish no rate go last.
 */
export function noPayslipLenders(lenders: readonly LenderEntity[]): NoPayslipRow[] {
  return lenders
    .filter(
      l =>
        l.audiences.includes('independiente') ||
        l.segment === 'prendario' ||
        READ_WITHOUT_PAYSLIP.has(l.id)
    )
    .map(l => {
      const { teaPct, teaMaxPct } = pageTea(l)
      const tea = representativeTea(teaPct, teaMaxPct)
      return {
        id: l.id,
        name: l.name,
        segment: l.segment,
        segmentLabel: SEGMENT_LABELS[l.segment],
        teaLabel: READ_AS_BCU_CAP.has(l.id) ? BCU_CAP_ONLY_LABEL : teaLabelOf(teaPct, teaMaxPct),
        // A 0 % "rate" is a promotion or a fee-based product, not a comparable TEA.
        teaSort: tea != null && tea > 0 ? tea : null,
        clearing: l.clearing,
        clearingLabel: CLEARING_LABELS[l.clearing],
        bcuLabel: BCU_LABELS[l.bcu],
        sourceUrl: l.sourceUrl || l.website,
      }
    })
    .sort((a, b) => {
      if (a.teaSort == null && b.teaSort == null) return a.name.localeCompare(b.name, 'es')
      if (a.teaSort == null) return 1
      if (b.teaSort == null) return -1
      return a.teaSort - b.teaSort
    })
}

export interface TeaSpread {
  /** Lowest published "desde" (or ceiling when that is all a lender publishes). */
  min: number | null
  /** Highest published ceiling (or single rate). */
  max: number | null
  /** How many rows publish any rate at all. */
  withRate: number
}

/** The range of published rates across the rows, from the underlying lender facts. */
export function teaSpread(
  lenders: readonly LenderEntity[],
  rows: readonly NoPayslipRow[]
): TeaSpread {
  const ids = new Set(rows.map(r => r.id))
  let min: number | null = null
  let max: number | null = null
  let withRate = 0
  for (const l of lenders) {
    if (!ids.has(l.id)) continue
    const { teaPct, teaMaxPct } = pageTea(l)
    const lo = teaPct != null && teaPct > 0 ? teaPct : null
    const hi = teaMaxPct != null && teaMaxPct > 0 ? teaMaxPct : null
    const low = lo ?? hi
    const high = hi ?? lo
    if (low == null || high == null) continue
    withRate++
    min = min == null ? low : Math.min(min, low)
    max = max == null ? high : Math.max(max, high)
  }
  return { min, max, withRate }
}

export interface NoPayslipFaqInput {
  rows: readonly NoPayslipRow[]
  spread: TeaSpread
  /** Live usury cap for consumer loans in pesos under 10.000 UI, short term, e.g. "133,49 %". */
  capLabel: string
  /** When that cap took effect, e.g. "1 de setiembre de 2026". */
  capSince: string
  /** `CLEARING_REVIEWED` formatted by the page, e.g. "20 de noviembre de 2026". */
  clearingReviewedLabel: string
}

export interface NoPayslipFaq {
  id: string
  question: string
  answer: string
  link?: { label: string; to: string }
}

/**
 * The FAQ is a FUNCTION of the data, never hand-typed numbers: the count of lenders, the rate
 * range and the usury cap all change without anybody editing this file.
 */
export function buildNoPayslipFaq({
  rows,
  spread,
  capLabel,
  capSince,
  clearingReviewedLabel,
}: NoPayslipFaqInput): NoPayslipFaq[] {
  const withClearing = rows.filter(r => r.clearing === 'si').length
  const soloCedulaRows = SOLO_CEDULA_LENDERS.filter(l => l.soloCedula === 'si')
  const soloCedula = soloCedulaRows.map(l => l.name)
  // Las páginas que la respuesta cita se releyeron en días distintos: la fecha es la de la lectura
  // más vieja y la más nueva de esas filas, no la global de la tabla.
  const soloReads = [...new Set(soloCedulaRows.map(l => l.readOn ?? SOLO_CEDULA_REVIEWED))].sort()
  const soloReadLabel =
    soloReads.length > 1
      ? `leídas entre el ${isoDateEs(soloReads[0]!)} y el ${isoDateEs(soloReads[soloReads.length - 1]!)}`
      : `leídas el ${isoDateEs(soloReads[0] ?? SOLO_CEDULA_REVIEWED)}`
  const conRecibo = clearingNames('pide')
  const sinRecibo = clearingNames('no-pide')
  const conReciboRows = CLEARING_LENDERS.filter(l => l.recibo === 'pide')
  const sinReciboRows = CLEARING_LENDERS.filter(l => l.recibo === 'no-pide')
  const each = (list: readonly ClearingLender[]) => list.map(l => `${l.name}: ${l.pide}`).join(' ')
  const all = (n: number) => (n === 2 ? 'Las dos' : 'Todas')
  const range =
    spread.min != null && spread.max != null
      ? `Entre las ${rows.length} instituciones que atienden a quien no tiene recibo, las tasas efectivas anuales publicadas van de ${pctEs(spread.min)} a ${pctEs(spread.max)}.`
      : `No todas las ${rows.length} instituciones publican su tasa.`
  return [
    {
      id: 'se-puede',
      question: '¿Puedo pedir un préstamo sin recibo de sueldo en Uruguay?',
      answer:
        'Sí. Hay tres caminos: presentar un certificado de ingresos firmado por un contador público si trabajás por tu cuenta y estás inscripto (el BROU lo acepta con dos años de aportes continuos), pedirlo en una financiera que evalúa sólo con la cédula (OCA y Pronto! lo publican, a tasas más altas), o dejar una garantía, como en un empeño o un crédito prendario.',
    },
    {
      id: 'solo-cedula',
      question: 'Préstamos solo con cédula: ¿quién los da de verdad?',
      answer: `${soloCedula.join(' y ')} lo anuncian en sus propias páginas (${soloReadLabel}). Creditel pide además tres facturas de UTE, OSE o Antel a tu nombre si no tenés comprobante. Crédito de la Casa, Verde, ANDA y República Microfinanzas piden recibo o actividad documentada, aunque algún comparador las liste como "sólo con cédula". "Sólo con cédula" quiere decir sin comprobante de ingresos, no sin mirar el clearing: OCA exige no figurar en él. De las que anuncian la cédula sola, Pronto! es la que dice prestar estando en el clearing; con recibo también lo dicen ${conRecibo}.`,
    },
    {
      id: 'certificado',
      question: '¿Qué es el certificado de ingresos que piden en lugar del recibo?',
      answer:
        'Es un documento firmado por un contador público que declara tus ingresos formales. El BROU pide que tenga menos de 30 días desde su emisión y que el contador adjunte el certificado de la Caja de Profesionales. Para que el contador pueda firmarlo, tus ingresos tienen que estar registrados: facturas, aportes a BPS y declaraciones ante DGI.',
    },
    {
      id: 'cuanto-cuesta',
      question: '¿Cuánto cuesta un préstamo sin recibo de sueldo?',
      answer: `${range} Las que piden sólo la cédula están en la parte alta. Por encima del tope legal hay usura: para préstamos en pesos de menos de 10.000 UI a menos de un año, el tope es ${capLabel}, vigente desde el ${capSince}. Compará siempre el costo total, no la cuota.`,
    },
    {
      id: 'clearing',
      question: '¿Y si además estoy en el clearing?',
      answer: `${withClearing} de las ${rows.length} instituciones de esta lista publican que prestan con antecedentes negativos; las que además lo dicen sin pedir recibo son ${sinRecibo}. Fuera de esta lista, porque piden recibo de sueldo, también lo dicen ${conRecibo}. OCA y el BROU exigen no figurar en el clearing, así que ahí la puerta de la cédula se cierra. Antes de endeudarte más, mirá cómo regularizar y salir del clearing.`,
      link: { label: 'Cómo salir del clearing', to: '/salir-del-clearing' },
    },
    {
      id: 'clearing-con-recibo',
      question: '¿Quién presta estando en el clearing y con recibo de sueldo?',
      answer: `${conRecibo}, según su propia página (leída el ${clearingReviewedLabel}). ${each(conReciboRows)} ${all(conReciboRows.length)} resuelven caso a caso, sujeto a aprobación crediticia.`,
    },
    {
      id: 'clearing-sin-recibo',
      question: '¿Y estando en el clearing y sin recibo de sueldo?',
      answer: `${sinRecibo}, según su propia página (leída el ${clearingReviewedLabel}). ${each(sinReciboRows)} En tasas: ${clearingRatesSentence(capLabel)} La otra salida es una garantía, como el empeño, donde lo que respalda el préstamo es el objeto que dejás; el empeño del BROU igual exige no tener información negativa.`,
    },
    {
      id: 'estafa',
      question: '¿Cómo reconozco un préstamo trucho?',
      answer:
        'Si antes de darte la plata te piden un pago por gastos, seguro o gestión, es estafa: ningún prestador serio cobra por adelantado para otorgar un préstamo. Verificá también que la institución figure en los registros del Banco Central del Uruguay.',
    },
  ]
}
