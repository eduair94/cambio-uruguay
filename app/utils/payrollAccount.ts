// La cuenta donde se cobra el sueldo: quién elige la institución y qué tiene que ser gratis.
//
// POR QUÉ EXISTE ESTE CATÁLOGO. El sitio ya compara bancos (`/mejores-bancos-uruguay`), ya explica
// el recibo (`/guias/entender-tu-recibo-de-sueldo-uruguay`) y ya tiene una guía para abrir una
// cuenta (`/guias/abrir-una-cuenta-bancaria-uruguay`), pero la pregunta que llega escrita —«¿me
// pueden obligar a cobrar el sueldo en el banco que eligió la empresa?»— vivía en UNA tarjeta de
// `/preguntas-economia-personal` (`sueldo-banco-que-elige-la-empresa`, marcada `muy_comun`) y en
// ninguna página propia. Medido el 2026-11-13 con grep sobre `pages/` y `utils/`: el Decreto
// 263/015 sólo se nombraba en ese archivo de preguntas, así que ni los dos plazos de diez días
// hábiles, ni la excepción del cambio de trabajo, ni la lista de servicios que la cuenta tiene que
// dar sin cobrar estaban publicados en ningún lado.
//
// LAS CIFRAS SON DE LA NORMA, NO DE UNA TARIFA. Todo lo que este archivo publica es un plazo o un
// mínimo escrito en la Ley 19.210 o en el Decreto 263/015, leído el 2026-11-13 en el texto
// ACTUALIZADO de IMPO —que es lo que importa acá, porque los dos fueron modificados varias veces y
// una lectura del texto original diría otra cosa:
//
//  - Ley 19.210, arts. 10 y 11: redacción vigente dada por la Ley 19.889 (arts. 215 y 216).
//  - Ley 19.210, art. 15 (jubilaciones y pensiones): redacción dada por la Ley 19.732 art. 4.
//  - Decreto 263/015, art. 1: redacción dada por el Decreto 133/018 art. 1.
//  - Decreto 263/015, art. 9: redacción dada por el Decreto 63/019 art. 5.
//  - Decreto 263/015, art. 11: su inciso 2.º —el que prohibía al empleador dar curso a una
//    solicitud de cambio antes del año— fue DEROGADO por el Decreto 106/017 art. 4. La excepción
//    por inicio de una nueva relación laboral NO fue derogada: estaba en el inciso 1.º del texto
//    original y sigue en el vigente. Se verificó leyendo el texto original del artículo, porque la
//    nota de IMPO dice «inciso 2.º derogado» sin transcribir cuál era.
//  - Decreto 263/015, art. 15 inc. 1.º: redacción dada por el Decreto 133/018 art. 2.
//  - Decreto 263/015, art. 16: literal B) por el Decreto 63/019 art. 7, literales C) y D) por el
//    Decreto 106/017 art. 6 y literal G) agregado por el Decreto 413/023 art. 89.
//
// LO QUE NO SE PUBLICA, a propósito. Ni una tarifa de banco: lo que la norma fija es un MÍNIMO
// gratuito, y lo que cada institución cobra por encima de ese mínimo es su tarifario y cambia sin
// aviso. Ni el tope de la transferencia gratuita en pesos: el decreto lo escribe en unidades
// indexadas y la UI se ajusta todos los días, así que el lector lo convierte con
// `/indicadores/unidad-indexada`. Ni el nombre del producto en cada banco («cuenta sueldo» es como
// le dice la gente, no como la nombra la norma). Y ningún plazo medido en días corridos donde la
// norma escribió hábiles.

/** El día en que se leyeron todas las fuentes de este archivo. */
export const PAYROLL_ACCOUNT_REVIEWED = '2026-11-13'

/** Días hábiles de antelación con que el empleador debe avisar antes de abrir una cuenta por vos. */
export const PAYROLL_ACCOUNT_NOTICE_DAYS = 10

/** Días hábiles que tenés, desde ese aviso, para elegir vos la institución. */
export const PAYROLL_ACCOUNT_CHOICE_DAYS = 10

/** Extracciones gratuitas por mes en la red, como mínimo (art. 16 lit. D). */
export const PAYROLL_FREE_WITHDRAWALS = 5

/** Transferencias domésticas gratuitas por mes, como mínimo (art. 16 lit. D). */
export const PAYROLL_FREE_TRANSFERS = 8

/** Tope de cada transferencia gratuita, en unidades indexadas (art. 16 lit. D). */
export const PAYROLL_FREE_TRANSFER_UI = 2000

/** Reposiciones de la tarjeta de débito sin costo, como mínimo (art. 16 lit. F). */
export const PAYROLL_FREE_CARD_REPLACEMENTS = 2

/**
 * Un entero con el punto de miles uruguayo.
 *
 * Se agrupa a mano y no con `toLocaleString`: este módulo es puro y corre en vitest-node, donde el
 * ICU del runtime puede imprimir «2,000» o «2000» y dejar publicada una cifra con el separador al
 * revés — que en una guía que habla de dinero se lee como otro número.
 */
export function payrollMiles(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** El tope de cada transferencia gratuita, escrito como lo escribe el decreto. */
export function payrollFreeTransferCap(): string {
  return `UI ${payrollMiles(PAYROLL_FREE_TRANSFER_UI)}`
}

/** Una obligación de la cuenta, con el literal del art. 16 del Decreto 263/015 que la escribe. */
export interface PayrollAccountFreeService {
  /** Identificador estable, en minúsculas. */
  key:
    'apertura' | 'retiro-total' | 'tarjeta' | 'extracciones' | 'transferencias' | 'saldo' | 'ahorro'
  /** Qué tiene que dar la cuenta, en una línea. */
  label: string
  /** El mínimo que la norma fija, o «sin costo» cuando lo que fija es que no se cobre. */
  value: string
  /** El literal del artículo 16, para que el lector lo busque en la norma y no en nosotros. */
  article: string
}

/**
 * Los servicios que la cuenta de nómina tiene que dar sin cobrar.
 *
 * El orden es el del propio artículo 16, que es además el orden en que se usan: primero existir,
 * después sacar la plata, después mover la plata.
 */
export const PAYROLL_ACCOUNT_FREE_SERVICES: readonly PayrollAccountFreeService[] = [
  {
    key: 'apertura',
    label: 'Apertura, mantenimiento, cierre y saldo mínimo',
    value: 'Sin costo y sin saldo mínimo exigible',
    article: 'Art. 16 lit. A)',
  },
  {
    key: 'retiro-total',
    label: 'Retirar todo lo acreditado en un solo movimiento mensual',
    value: 'Sin costo, sin preaviso ni permanencia mínima',
    article: 'Art. 16 lit. B)',
  },
  {
    key: 'tarjeta',
    label: 'Tarjeta de débito y sus reposiciones',
    value: `La tarjeta y un mínimo de ${PAYROLL_FREE_CARD_REPLACEMENTS} reposiciones, sin costo`,
    article: 'Art. 16 lits. C) y F)',
  },
  {
    key: 'extracciones',
    label: 'Extracciones en la red de puntos de extracción',
    value: `${PAYROLL_FREE_WITHDRAWALS} por mes, como mínimo`,
    article: 'Art. 16 lit. D)',
  },
  {
    key: 'transferencias',
    label: 'Transferencias domésticas a cualquier institución',
    value: `${PAYROLL_FREE_TRANSFERS} por mes, de hasta ${payrollFreeTransferCap()} cada una`,
    article: 'Art. 16 lit. D)',
  },
  {
    key: 'saldo',
    label: 'Consultas de saldo',
    value: 'Ilimitadas y gratuitas',
    article: 'Art. 16 lit. D)',
  },
  {
    key: 'ahorro',
    label: 'Transferencia mensual recurrente de ahorro voluntario',
    value: 'Una por mes, sin costo',
    article: 'Art. 16 lit. G)',
  },
] as const

/** Un plazo del régimen, con la norma que lo fija. */
export interface PayrollAccountDeadline {
  /** Identificador estable, en minúsculas. */
  key: 'aviso' | 'eleccion' | 'permanencia' | 'nuevo-trabajo' | 'vigencia' | 'copias'
  /** Qué se cuenta. */
  label: string
  /** Cuánto dura, tal como lo escribe la norma. */
  value: string
  /** Artículo exacto. */
  article: string
}

/**
 * Los plazos, que son lo único que decide si el derecho se puede ejercer HOY o dentro de un año.
 *
 * Los dos de diez días hábiles son los que no estaban publicados en ninguna página del sitio, y son
 * los que importan en el caso que la gente escribe: entré a trabajar, me dijeron que cobro en tal
 * banco, ¿puedo cambiarlo?
 */
export const PAYROLL_ACCOUNT_DEADLINES: readonly PayrollAccountDeadline[] = [
  {
    key: 'aviso',
    label: 'Aviso del empleador antes de abrirte una cuenta él',
    value: `${PAYROLL_ACCOUNT_NOTICE_DAYS} días hábiles de antelación, como mínimo`,
    article: 'Decreto 263/015, art. 9',
  },
  {
    key: 'eleccion',
    label: 'Plazo para elegir vos, desde ese aviso',
    value: `${PAYROLL_ACCOUNT_CHOICE_DAYS} días hábiles`,
    article: 'Decreto 263/015, art. 9 lit. a)',
  },
  {
    key: 'permanencia',
    label: 'Si no elegiste y te la abrió el empleador',
    value: 'Recién podés cambiar al año de concretada la apertura',
    article: 'Decreto 263/015, arts. 9 lit. b) y 11',
  },
  {
    key: 'nuevo-trabajo',
    label: 'Cambio asociado al inicio de una nueva relación laboral',
    value: 'El año de permanencia no es exigible',
    article: 'Decreto 263/015, art. 11',
  },
  {
    key: 'vigencia',
    label: 'Vigencia de la institución que elegiste vos',
    value: 'Un año',
    article: 'Ley 19.210, art. 11',
  },
  {
    key: 'copias',
    label: 'Copia de los avisos que el empleador debe conservar',
    value: 'Un año, como mínimo',
    article: 'Decreto 263/015, art. 9',
  },
] as const

/** Localidades en las que la red de extracción debe tener un punto (art. 23). */
export const PAYROLL_NETWORK_MIN_POPULATION = 2000

/** Distancia por debajo de la cual una localidad vecina con punto exime de poner otro (art. 23). */
export const PAYROLL_NETWORK_NEARBY_KM = 3

/** Busca un servicio gratuito por su clave. Devuelve `null` si la clave no existe. */
export function payrollFreeService(key: string): PayrollAccountFreeService | null {
  return PAYROLL_ACCOUNT_FREE_SERVICES.find(service => service.key === key) ?? null
}

/** Busca un plazo por su clave. Devuelve `null` si la clave no existe. */
export function payrollDeadline(key: string): PayrollAccountDeadline | null {
  return PAYROLL_ACCOUNT_DEADLINES.find(deadline => deadline.key === key) ?? null
}

/** Las fuentes, todas normativa en IMPO más las dos vías del MTSS para reclamar. */
export const PAYROLL_ACCOUNT_SOURCES = [
  {
    label:
      'Ley 19.210, art. 11 (redacción de la Ley 19.889 art. 216): «el trabajador tendrá derecho a elegir libremente la institución (…) en la cual cobrar su remuneración y toda otra partida en dinero que tenga derecho a percibir», la elección del empleador vale «hasta tanto el trabajador haga uso de su facultad de elegir» y la del trabajador tiene vigencia por un año',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014/11',
    publisher: 'IMPO',
  },
  {
    label:
      'Ley 19.210, art. 10 (redacción de la Ley 19.889 art. 215): «Sin perjuicio de la modalidad de pago en efectivo», el sueldo podrá pagarse por acreditación en cuenta o en dinero electrónico',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014/10',
    publisher: 'IMPO',
  },
  {
    label:
      'Ley 19.210, art. 15 (redacción de la Ley 19.732 art. 4): quienes cobran jubilación, pensión o retiro pueden cobrar en efectivo u optar en cualquier momento por acreditación, eligen libremente la institución y pueden cambiar al año; el plazo rige para quienes eligieron después del 1.º de enero de 2019',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014/15',
    publisher: 'IMPO',
  },
  {
    label:
      'Decreto 263/015, art. 9 (redacción del Decreto 63/019 art. 5): el aviso va con 10 días hábiles de antelación, el trabajador tiene los 10 días hábiles siguientes para elegir, sin elección recién cambia al año de la apertura, el empleador conserva copia un año y la Inspección General del Trabajo y la Seguridad Social actúa ante las denuncias por incumplir ese artículo',
    url: 'https://www.impo.com.uy/bases/decretos/263-2015/9',
    publisher: 'IMPO',
  },
  {
    label:
      'Decreto 263/015, art. 11: el cambio de institución se puede «una vez transcurrido un año de concretada la apertura», y ese plazo «no será exigible (…) cuando el cambio de institución esté asociado al inicio de una nueva relación laboral». Su inciso 2.º, que prohibía al empleador dar curso a la solicitud antes del año, fue derogado por el Decreto 106/017 art. 4',
    url: 'https://www.impo.com.uy/bases/decretos/263-2015/11',
    publisher: 'IMPO',
  },
  {
    label:
      'Decreto 263/015, art. 14: la elección se notifica al empleador presentando la documentación que entregó la institución, y «el empleador deberá entregar al trabajador una copia firmada (…) como constancia de recepción, indicando la fecha»',
    url: 'https://www.impo.com.uy/bases/decretos/263-2015/14',
    publisher: 'IMPO',
  },
  {
    label:
      'Decreto 263/015, art. 15 (inciso 1.º, redacción del Decreto 133/018 art. 2): la institución elegida «no podrá cobrar cargo alguno a ninguna de las partes» por estos servicios, y ninguna puede condicionarlos a contratar servicios adicionales',
    url: 'https://www.impo.com.uy/bases/decretos/263-2015/15',
    publisher: 'IMPO',
  },
  {
    label:
      'Decreto 263/015, art. 16: las características básicas mínimas de la cuenta — sin costo de apertura, mantenimiento ni cierre y sin saldo mínimo, tarjeta de débito con dos reposiciones sin costo, 5 extracciones gratis por mes, 8 transferencias domésticas gratis de hasta UI 2.000 cada una, consultas de saldo ilimitadas y una transferencia mensual de ahorro voluntario',
    url: 'https://www.impo.com.uy/bases/decretos/263-2015/16',
    publisher: 'IMPO',
  },
  {
    label:
      'Decreto 263/015, art. 23: la red de extracción debe incluir puntos en todas las localidades de más de 2.000 habitantes, salvo las que disten menos de 3 km de otra que ya tenga uno, y las instituciones deben informar el costo de las extracciones que superen el mínimo gratuito',
    url: 'https://www.impo.com.uy/bases/decretos/263-2015/23',
    publisher: 'IMPO',
  },
  {
    label: 'MTSS: consulta laboral y salarial gratuita',
    url: 'https://www.gub.uy/tramites/consulta-laboral-salarial?min=true',
    publisher: 'MTSS',
  },
  {
    label: 'MTSS: denuncias y asesoramiento ante la Inspección General del Trabajo',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/denuncias-laborales',
    publisher: 'MTSS',
  },
] as const
