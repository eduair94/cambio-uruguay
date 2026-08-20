// app/utils/rentNoPayslip.ts
// Datos de /alquilar-sin-recibo-de-sueldo — cómo consigue garantía quien no tiene recibo de sueldo.
//
// EL HILO QUE LA ORIGINA (r/uruguay, 18/8/2026, "Alquilar en Mdeo sin sueldo"): alguien que vive de
// las ventas por su cuenta, gana entre US$ 1.000 y US$ 2.000 según el mes, y se muda a Montevideo.
// Diecisiete comentarios, y la mitad contestando cosas distintas: "metete en una pensión", "pedile
// un certificado a tu contador", "los empresarios viven todos en pensiones entonces?".
//
// LA TESIS, que es lo que ninguna de las respuestas dice completo: **el problema no es que tu
// ingreso sea variable, es que tenga que ser FORMAL.** Todas las garantías del mercado aceptan a un
// trabajador independiente; ninguna acepta un ingreso que no se pueda certificar. Un vendedor con
// empresa abierta, aportes al BPS y facturación en DGI entra en casi todas. El mismo vendedor sin
// nada de eso no entra en ninguna, y ahí sí quedan la pensión, el depósito o pagar meses por
// adelantado. La variabilidad se resuelve con un promedio; la informalidad no se resuelve con nada.
//
// Módulo PURO (sin Vue, sin Nuxt) para que la página y su test compartan una sola verdad. Cada cifra
// trae la fuente de donde salió y la fecha en que se leyó.
//
// Informativo, no es asesoramiento legal.

/** Fecha (YYYY-MM-DD) en que se verificó cada dato contra su fuente. */
export const RENT_NOPAYSLIP_REVIEWED = '2026-08-20'

export interface SourceLink {
  label: string
  url: string
  publisher: string
}

/**
 * Las unidades en que están escritos los topes.
 *
 * En UR y no en pesos a propósito: así están en la norma y en las fichas de los organismos, y así se
 * reajustan solos. Poner el peso equivalente acá lo dejaría viejo el mes que viene sin que nadie se
 * entere — el sitio ya publica el valor del día en /indicadores/unidad-reajustable.
 */
export const UR_INDICATOR_PATH = '/indicadores/unidad-reajustable'

export type Verdict = 'si' | 'no' | 'depende'

export interface GuaranteeOption {
  id: string
  name: string
  provider: string
  /** ¿Sirve para alguien SIN recibo de sueldo? */
  worksWithoutPayslip: Verdict
  /** La frase que resume por qué. Es lo que la persona necesita leer primero. */
  verdictWhy: string
  /** Qué te piden concretamente. */
  requirements: readonly string[]
  /** Qué te cuesta. */
  cost: string
  /** El techo: cuánto alquiler te cubren, y contra qué ingreso se mide. */
  ceiling: string
  sources: readonly SourceLink[]
}

export const GUARANTEE_OPTIONS: readonly GuaranteeOption[] = Object.freeze([
  {
    id: 'fga',
    name: 'Fondo de Garantía de Alquileres (FGA)',
    provider: 'ANV / Ministerio de Vivienda',
    worksWithoutPayslip: 'si',
    verdictWhy:
      'Es la vía pensada para esto: acepta expresamente un certificado de contador público en lugar del recibo de sueldo.',
    requirements: [
      'Certificado de contador público con los ingresos líquidos formales.',
      'Ingresos laborales sostenidos, con un mínimo de 3 meses de continuidad.',
      'Ingreso líquido formal del núcleo de convivencia entre 15 UR y 100 UR.',
      'No ser propietario de un inmueble en el mismo departamento donde pedís la garantía.',
      'Ser mayor de 18 años.',
    ],
    cost: 'Comisión mensual del 3 % del alquiler, que pagan tanto el inquilino como el propietario.',
    ceiling: 'El alquiler no puede superar 18 UR, o 21 UR si es una vivienda promovida.',
    sources: [
      {
        label: 'ANV — Fondo de Garantía de Alquiler: requisitos e ingresos',
        url: 'https://www.anv.gub.uy/fondo-de-garantia-de-alquiler',
        publisher: 'Agencia Nacional de Vivienda',
      },
      {
        label: 'MVOT — Garantía de alquiler',
        url: 'https://www.gub.uy/ministerio-vivienda-ordenamiento-territorial/politicas-y-gestion/garantia-alquiler',
        publisher: 'Ministerio de Vivienda y Ordenamiento Territorial',
      },
    ],
  },
  {
    id: 'cgn',
    name: 'Garantía de la Contaduría General de la Nación',
    provider: 'CGN',
    worksWithoutPayslip: 'no',
    verdictWhy:
      'Descuenta el alquiler directamente del recibo de sueldo o de la pasividad. Sin recibo del que descontar, el mecanismo no existe — y la lista de quiénes pueden pedirla no incluye a los independientes.',
    requirements: [
      'Funcionario público con 6 meses de antigüedad, o',
      'empleado de una empresa privada inscripta en el registro del SGA con 6 meses de antigüedad, o',
      'jubilado o pensionista.',
      'Informe de Líquido Disponible (ILD) y cédula.',
    ],
    cost: 'El trámite no tiene costo; una vez que arranca el descuento se cobra 3 % del alquiler a cada parte.',
    ceiling: 'Se mide contra el líquido disponible del recibo.',
    sources: [
      {
        label: 'gub.uy — Alquiler por Contaduría General de la Nación (quiénes pueden)',
        url: 'https://www.gub.uy/tramites/alquiler-contaduria-general-nacion',
        publisher: 'gub.uy',
      },
    ],
  },
  {
    id: 'anda',
    name: 'Garantía de alquiler de ANDA',
    provider: 'ANDA',
    worksWithoutPayslip: 'si',
    verdictWhy:
      'Tiene una categoría propia para unipersonales, independientes y monotributistas. Lo que cambia respecto de un empleado no es si te aceptan: es que te piden probar la formalidad.',
    requirements: [
      'Certificado de ingresos emitido por escribano o contador público.',
      'Inscripción y los últimos tres recibos pagos de BPS y de DGI.',
      'Garante o depósito.',
    ],
    cost: 'Consultar con ANDA: la ficha pública no publica el costo para esta categoría.',
    ceiling: 'El alquiler no puede superar el 40 % de tu ingreso nominal.',
    sources: [
      {
        label: 'ANDA — Garantía de alquiler, requisitos del inquilino',
        url: 'https://anda.com.uy/garantia-de-alquiler/inquilino/',
        publisher: 'ANDA',
      },
    ],
  },
  {
    id: 'seguro',
    name: 'Seguro de alquiler (Porto y otros)',
    provider: 'Aseguradoras privadas',
    worksWithoutPayslip: 'depende',
    verdictWhy:
      'Aceptan certificado de ingresos, pero son las que más miran el historial crediticio: acá el clearing sí pesa.',
    requirements: [
      'Certificado de ingresos de contador público cuando no hay recibo de sueldo.',
      'Podés componer ingresos con otras personas: Porto admite hasta cinco solicitantes.',
    ],
    cost: 'Prima anual, que se paga aunque nunca la uses.',
    ceiling: 'Porto asegura hasta el 30 % del ingreso líquido.',
    sources: [
      {
        label: 'Comparativa de aseguradoras de alquiler en Uruguay',
        url: 'https://www.montevideo.com.uy/Especiales/-Que-ofrecen-las-principales-aseguradoras-del-mercado--Cual-elegir--uc860937',
        publisher: 'Montevideo Portal',
      },
    ],
  },
  {
    id: 'sin-garantia',
    name: 'Contrato sin garantía (Ley 19.889)',
    provider: 'Acuerdo con el propietario',
    worksWithoutPayslip: 'si',
    verdictWhy:
      'No mira tus ingresos en absoluto. Pero no lo elegís vos: el propietario tiene que ofrecerlo, y el contrato escrito debe acogerse expresamente a la ley.',
    requirements: [
      'Contrato escrito que se acoja expresamente a la Ley 19.889.',
      'Que el propietario acepte: la oferta bajo este régimen es bastante más escasa.',
    ],
    cost: 'Sin costo de garantía.',
    ceiling: 'Sin tope: lo fija el acuerdo.',
    sources: [
      {
        label: 'Ley 19.889 (LUC) — proceso de desalojo del contrato sin garantía',
        url: 'https://www.impo.com.uy/bases/leyes/19889-2020',
        publisher: 'IMPO',
      },
    ],
  },
  {
    id: 'deposito',
    name: 'Depósito en el BHU o meses adelantados',
    provider: 'BHU / acuerdo directo',
    worksWithoutPayslip: 'si',
    verdictWhy:
      'Reemplaza la evaluación de ingresos por capital inmovilizado. Es la salida cuando no hay forma de certificar nada.',
    requirements: [
      'Tener el dinero disponible y aceptar tenerlo quieto mientras dure el contrato.',
    ],
    cost: 'El costo de oportunidad de ese capital.',
    ceiling: 'Lo que se acuerde; algunos propietarios piden varios meses.',
    sources: [
      {
        label: 'BHU — depósitos en garantía de alquiler',
        url: 'https://www.bhu.gub.uy/',
        publisher: 'Banco Hipotecario del Uruguay',
      },
    ],
  },
])

/**
 * Lo que hay que hacer para pasar de "no puedo probar nada" a "puedo".
 *
 * Ordenado por lo que destraba antes. No es una lista de consejos: es la secuencia que convierte a
 * un independiente en alguien a quien una garantía puede evaluar.
 */
export interface FormalStep {
  step: string
  detail: string
  /** Página del sitio que explica ese paso, cuando existe. */
  link?: string
}

export const FORMALITY_STEPS: readonly FormalStep[] = Object.freeze([
  {
    step: 'Tener la actividad registrada',
    detail:
      'Monotributo o empresa unipersonal. Es el paso que hace que exista algo para certificar: sin inscripción no hay recibos de BPS ni de DGI, y sin ellos ANDA no te evalúa y el contador no tiene qué firmar.',
    link: '/que-empresa-abrir-uruguay',
  },
  {
    step: 'Facturar y que quede registro',
    detail:
      'El certificado de ingresos se arma con lo facturado y con los movimientos bancarios. Cobrar todo en mano y sin factura es exactamente lo que deja el ingreso fuera del alcance de cualquier garantía.',
    link: '/facturar-en-monotributo-uruguay',
  },
  {
    step: 'Acumular al menos tres meses seguidos',
    detail:
      'El FGA pide ingresos laborales sostenidos con un mínimo de 3 meses de continuidad, y ANDA pide los últimos tres recibos pagos de BPS y DGI. Tres meses es, en la práctica, la antigüedad mínima del sistema.',
  },
  {
    step: 'Pedirle el certificado a un contador público',
    detail:
      'Es el documento que reemplaza al recibo de sueldo. Lo firma un contador (ANDA también acepta escribano) y declara tus ingresos líquidos formales.',
  },
])

/** Las preguntas que el hilo dejó sin contestar, contestadas. */
export interface NoPayslipFaq {
  q: string
  a: string
  source?: SourceLink
}

export const NOPAYSLIP_FAQ: readonly NoPayslipFaq[] = Object.freeze([
  {
    q: '¿Me rechazan por tener ingresos que varían mucho mes a mes?',
    a: 'No es la variación lo que te frena. El certificado de contador declara tus ingresos líquidos formales y las garantías miran un promedio contra un porcentaje del alquiler — ANDA pide que el alquiler no pase el 40 % de tu ingreso nominal, Porto asegura hasta el 30 % del líquido. Un mes flojo dentro de un promedio que da no rompe nada. Lo que sí te deja afuera es que no haya nada formal para promediar.',
  },
  {
    q: 'Trabajo por mi cuenta pero sin factura. ¿Qué me queda?',
    a: 'Ninguna garantía que evalúe ingresos, porque no hay ingreso que certificar. Quedan las tres que no los miran: contrato sin garantía bajo la Ley 19.889 si el propietario lo ofrece, depósito en el BHU o meses adelantados, y la pensión o el alquiler de una habitación, que están fuera del régimen de garantías. La otra salida es registrarte, y esa toma tres meses.',
  },
  {
    q: '¿Sirve la garantía de la Contaduría General de la Nación?',
    a: 'No para un independiente. Funciona reteniendo el alquiler del recibo de sueldo o de la pasividad, y la lista de quiénes pueden pedirla son funcionarios públicos, empleados de empresas privadas inscriptas en el registro del SGA —los dos con 6 meses de antigüedad— y jubilados o pensionistas. Si no hay recibo, no hay de dónde descontar.',
    source: {
      label: 'gub.uy — Alquiler por Contaduría General de la Nación',
      url: 'https://www.gub.uy/tramites/alquiler-contaduria-general-nacion',
      publisher: 'gub.uy',
    },
  },
  {
    q: '¿Puedo sumar los ingresos de otra persona?',
    a: 'En varias, sí. Porto permite componer ingresos de hasta cinco solicitantes, y ANDA evalúa un garante cuando el ingreso o la antigüedad no alcanzan. Ojo con lo que eso significa para el otro: quien firma asume una obligación real sobre el contrato, no un favor simbólico.',
  },
  {
    q: 'Cobro en dólares desde el exterior. ¿Cuenta?',
    a: 'Cuenta si entra formalmente. Lo que el certificado declara son ingresos líquidos formales, así que lo que llega a una cuenta y está facturado se puede certificar, y lo que llega por fuera no. El tipo de cambio no es el problema; el registro sí.',
  },
  {
    q: '¿Cuánto alquiler me cubre el FGA?',
    a: 'Hasta 18 UR, o 21 UR si es una vivienda promovida, y pide que el ingreso líquido formal del núcleo esté entre 15 UR y 100 UR. Los topes están en UR porque se reajustan solos; el valor del día está en la página de la Unidad Reajustable.',
    source: {
      label: 'ANV — Fondo de Garantía de Alquiler',
      url: 'https://www.anv.gub.uy/fondo-de-garantia-de-alquiler',
      publisher: 'Agencia Nacional de Vivienda',
    },
  },
])

/** Cuántas opciones sirven sin recibo de sueldo. Para el titular de la página. */
export function optionsThatWork(): GuaranteeOption[] {
  return GUARANTEE_OPTIONS.filter(o => o.worksWithoutPayslip === 'si')
}
