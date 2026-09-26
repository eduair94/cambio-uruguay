// Las cifras del asesor de vivienda (/donde-vivir-uruguay) que no salen de los avisos: cuánto
// alquiler acepta cada garantía, qué crédito da cada prestamista, cuánto cuesta entrar a una
// vivienda comprada o alquilada, y cómo se calcula la cuota.
//
// Todas vienen de guías del sitio que ya las verificaron contra la fuente, con su fecha:
//  * garantías: /guias/garantias-de-alquiler-uruguay (2026-09-15);
//  * crédito: /guias/credito-hipotecario-uruguay, "condiciones publicadas al 16 de setiembre de 2026";
//  * comisión inmobiliaria: /guias/comision-inmobiliaria-uruguay (arancel de la Cámara, 2007);
//  * ITP: DGI, 2 % a cada parte sobre el valor real de Catastro.
// Dos perfiles de crédito REALES y no un promedio de bancos: un promedio sería una tasa que nadie
// ofrece. Lo que no tiene fuente publicable (contribución inmobiliaria por barrio, precio de los
// seguros de alquiler) no se estima: la página lo dice y manda a la consulta oficial.
import type { FaqItem } from './faqAnswers'
import type { TransportFigure } from './transportModel'

export const HOUSING_ADVISOR_PATH = '/donde-vivir-uruguay'
export const HOUSING_ADVISOR_VERIFIED_AT = '2026-09-25'

const GUARANTEES_GUIDE = 'https://cambio-uruguay.com/guias/garantias-de-alquiler-uruguay'
const MORTGAGE_GUIDE = 'https://cambio-uruguay.com/guias/credito-hipotecario-uruguay'

export const HOUSING_GUARANTEE_CAPS = {
  /** Contaduría General de la Nación: hasta el 40 % del sueldo, jubilación o pensión nominal. */
  contaduria: 0.4,
  /** ANDA: hasta el 40 % del ingreso nominal. */
  anda: 0.4,
  /** Mapfre: el alquiler no puede pasar del 30 % de los ingresos declarados (suma hasta 5 personas). */
  mapfre: 0.3,
  figure: {
    value: 0.4,
    asOf: '2026-09-15',
    source: 'Contaduría General de la Nación, ANDA y Mapfre, según la guía de garantías del sitio',
    sourceUrl: GUARANTEES_GUIDE,
    note: 'Contaduría y ANDA aceptan un alquiler de hasta el 40 % del ingreso nominal; Mapfre, hasta el 30 % de los ingresos declarados, y deja sumar los de hasta cinco personas.',
  } satisfies TransportFigure,
} as const

export type HousingCreditId = 'bhu' | 'banco'

export interface HousingCreditProfile {
  id: HousingCreditId
  label: string
  lender: string
  currency: 'UI'
  /** Tasa efectiva anual publicada. */
  tea: number
  /** Una tasa menor para plazos cortos, si el prestamista la publica. */
  shortTerm?: { maxYears: number; tea: number }
  maxYears: number
  /** Qué parte del valor financia. */
  financing: number
  /** Cuota máxima sobre el ingreso. */
  installmentCap: number
  figure: TransportFigure
}

export const HOUSING_CREDIT_PROFILES: Record<HousingCreditId, HousingCreditProfile> = {
  bhu: {
    id: 'bhu',
    label: 'BHU',
    lender: 'Banco Hipotecario del Uruguay, "Préstamo Soñado"',
    currency: 'UI',
    tea: 0.045,
    maxYears: 25,
    financing: 0.9,
    installmentCap: 0.25,
    figure: {
      value: 0.045,
      asOf: '2026-09-16',
      source: 'BHU, Préstamo Soñado y preguntas frecuentes de préstamos',
      sourceUrl: 'https://www.bhu.com.uy/credito/prestamo-sonado',
      note: 'En UI, desde 4,50 % de tasa efectiva anual, hasta 25 años, financia el 90 % y la cuota puede llegar al 25 % del ingreso disponible (30 % con débito de haberes).',
    },
  },
  banco: {
    id: 'banco',
    label: 'Banco privado',
    lender: 'Santander, público general',
    currency: 'UI',
    tea: 0.0475,
    shortTerm: { maxYears: 10, tea: 0.04 },
    maxYears: 20,
    financing: 0.8,
    installmentCap: 0.35,
    figure: {
      value: 0.0475,
      asOf: '2026-09-16',
      source: 'Santander, cartilla del crédito hipotecario',
      sourceUrl: 'https://www.creditohipotecariosantander.com.uy/simular',
      note: 'En UI, 4,00 % hasta 10 años y 4,75 % de 11 a 30; al público general le publica hasta 20 años, financia el 80 % y la cuota puede llegar al 35 % del ingreso.',
    },
  },
}

export const HOUSING_BUY_ENTRY = {
  /** ITP del comprador, sobre el valor real de Catastro (acá se estima sobre el precio). */
  itp: 0.02,
  /** Escrituración completa: escribano, Caja Notarial, certificados y timbres. Referencia de mercado. */
  deedLow: 0.03,
  deedHigh: 0.05,
  /** Comisión inmobiliaria del comprador: 3 % + IVA. */
  commission: 0.0366,
  figure: {
    value: 0.1066,
    asOf: '2026-09-16',
    source:
      'DGI (ITP), arancel de la Cámara Inmobiliaria Uruguaya (comisión) y guía de crédito hipotecario (escrituración)',
    sourceUrl: MORTGAGE_GUIDE,
    note: 'ITP 2 % del comprador sobre el valor real de Catastro, escrituración 3 % a 5 % del precio (referencia de mercado, no arancel) y comisión 3 % + IVA si hay inmobiliaria. Para saber hasta dónde alcanza el ahorro se usa el extremo alto.',
  } satisfies TransportFigure,
} as const

export const HOUSING_RENT_ENTRY = {
  /** Comisión de la inmobiliaria al alquilar: un mes + IVA. */
  commissionMonths: 1.22,
  figure: {
    value: 1.22,
    asOf: '2026-09-15',
    source: 'Arancel Oficial de la Cámara Inmobiliaria Uruguaya (2007)',
    sourceUrl: 'https://ciu.org.uy/wp-content/uploads/2024/05/7_Arancel-Oficial_180907.pdf',
    note: 'Un mes de alquiler más IVA si alquilás por inmobiliaria. No es una ley: es el arancel de la Cámara, y se paga sólo si lo firmaste.',
  } satisfies TransportFigure,
} as const

/** Tasa mensual equivalente a una tasa efectiva anual: dividirla por 12 sobrestima la cuota. */
export function housingMonthlyRate(tea: number): number {
  return (1 + tea) ** (1 / 12) - 1
}

/** Cuota del sistema francés, en la misma unidad que el capital. */
export function housingInstallment(principal: number, tea: number, years: number): number {
  const months = Math.round(years * 12)
  if (months <= 0) return principal
  const rate = housingMonthlyRate(tea)
  if (rate === 0) return principal / months
  return (principal * rate) / (1 - (1 + rate) ** -months)
}

export interface HousingAdvisorCheck {
  title: string
  detail: string
  url?: string
  label?: string
}

export const HOUSING_ADVISOR_CHECKLIST: readonly HousingAdvisorCheck[] = Object.freeze([
  {
    title: 'Si alquilás: primero la garantía, después el apartamento',
    detail:
      'Contaduría y ANDA aceptan un alquiler de hasta el 40 % de tu ingreso nominal y Mapfre hasta el 30 %. Sabiendo cuál te aceptan sabés hasta cuánto buscar, y algunas aprobaciones duran semanas.',
    url: '/garantia-de-alquiler-uruguay',
    label: 'Comparar garantías',
  },
  {
    title: 'Contrato e inventario por escrito',
    detail:
      'Pedí el contrato antes de pagar la reserva, sacá fotos del estado de la vivienda el día que entrás y dejá constancia de lo que ya estaba roto. Lo que no está escrito no se puede reclamar después.',
    url: '/primer-alquiler-uruguay',
    label: 'Guía del primer alquiler',
  },
  {
    title: 'La comisión no es obligatoria',
    detail:
      'Un mes más IVA es el arancel de la Cámara Inmobiliaria, no una ley. Se paga si lo firmaste; los avisos de dueño directo no la cobran.',
    url: '/guias/comision-inmobiliaria-uruguay',
    label: 'Comisión inmobiliaria',
  },
  {
    title: 'Si comprás: la cartilla del crédito con fecha',
    detail:
      'Pedí la tasa efectiva con todos los cargos, la tabla de amortización y cuánto cuesta cancelar antes. Dos créditos con la misma tasa terminan costando distinto por los seguros y las comisiones.',
    url: '/guias/credito-hipotecario-uruguay',
    label: 'Crédito hipotecario',
  },
  {
    title: 'Certificados y deudas antes de la promesa',
    detail:
      'El escribano pide los certificados del Registro y la deuda de contribución inmobiliaria y tributos domiciliarios, que en Montevideo sigue al inmueble. Nada de seña sin eso.',
    url: 'https://normativa.montevideo.gub.uy/content/a441',
    label: 'Contribución inmobiliaria (IM)',
  },
  {
    title: 'El ITP se calcula sobre el valor de Catastro',
    detail:
      'El Impuesto a las Transmisiones Patrimoniales es del 2 % para cada parte sobre el valor real que fija Catastro, no sobre el precio pactado. Pedí la liquidación por escrito.',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/impuesto-transmisiones-patrimoniales-0',
    label: 'ITP en la DGI',
  },
])

export const HOUSING_ADVISOR_FAQ: readonly FaqItem[] = Object.freeze([
  {
    id: 'mejor-barrio',
    question: '¿Cuál es el mejor barrio para vivir en Montevideo?',
    answer:
      'No hay uno solo: depende de cuánto podés gastar, cuántos dormitorios necesitás y qué te importa más. El asesor ordena los barrios donde lo que buscás entra en tu plata según lo que marcás —precio, metros, menos denuncias, servicios cerca, menos cortes de luz y agua, menos reclamos o rentabilidad— con los avisos vigentes de hoy.',
  },
  {
    id: 'cuanto-ganar-alquilar',
    question: '¿Cuánto tengo que ganar para alquilar?',
    answer:
      'Lo decide la garantía. La Contaduría General de la Nación y ANDA aceptan un alquiler de hasta el 40 % del ingreso nominal; Mapfre, hasta el 30 % de los ingresos declarados, y deja sumar los de hasta cinco personas. Con $ 80.000 de ingreso eso es un alquiler de hasta $ 32.000 con Contaduría o ANDA y de $ 24.000 con Mapfre.',
  },
  {
    id: 'cuanto-necesito-comprar',
    question: '¿Cuánto necesito para comprar una vivienda?',
    answer:
      'Dos cosas: el ahorro para la parte que el banco no financia más los gastos de compra, y un ingreso que banque la cuota. El BHU financia el 90 % con una cuota de hasta el 25 % del ingreso disponible; un banco privado como Santander, el 80 % con una cuota de hasta el 35 %. Los gastos de compra suman hasta cerca del 10,7 % del precio: 2 % de ITP, 3 % a 5 % de escrituración y 3,66 % de comisión si hay inmobiliaria.',
  },
  {
    id: 'alquilar-o-comprar',
    question: '¿Conviene alquilar o comprar?',
    answer:
      'Depende del barrio y de cuánto tiempo te vas a quedar. En cada barrio mostramos cuántos años de alquiler vale la vivienda, la cuota más gastos comunes contra el alquiler más gastos comunes, y cuánto tenés que poner de entrada en cada caso. Para la cuenta completa, con el costo de oportunidad del anticipo, está la calculadora de comprar o alquilar.',
    link: { to: '/comprar-o-alquilar-uruguay', label: 'Calculadora de comprar o alquilar' },
  },
  {
    id: 'de-donde-salen',
    question: '¿De dónde salen los precios y los datos de cada barrio?',
    answer:
      'Los alquileres salen de los avisos vigentes de los últimos diez días y las ventas de los avisos de InfoCasas y Casasweb, siempre con al menos 8 avisos para dar una mediana. Las denuncias son del Ministerio del Interior, los cortes de luz de UTE, los de agua de OSE, los reclamos del Sistema Único de Reclamos de la Intendencia y los servicios de OpenStreetMap. Lo que un barrio no tiene medido no suma ni resta.',
  },
  {
    id: 'no-incluye',
    question: '¿Qué no está incluido en el costo mensual?',
    answer:
      'La contribución inmobiliaria y el impuesto de Primaria, que dependen del valor catastral de cada padrón; los seguros obligatorios del crédito; el mantenimiento, y el precio de las garantías de las aseguradoras, que no lo publican. Tampoco el precio de cierre: medimos lo que se pide.',
  },
])
