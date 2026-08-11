// app/utils/trafficFines.ts
// Datos de /multas-de-transito-y-patente-uruguay: qué hacer con una multa, en qué plazos, y qué
// pasa con la deuda de patente que se arrastra.
//
// POR QUÉ EXISTE: el cluster «auto: patente, multas, SUCIVE» junta 155 preguntas en el corpus
// («¿Algún pique para pagar multas SUCIVE?» 74 comentarios, «¿Afano con la patente?» 59). El
// sitio tiene cuatro guías de auto, pero grep de «multa de tránsito» sobre todo `app/` daba CERO,
// y SUCIVE aparecía sólo como una frase suelta: «la deuda sigue al vehículo».
//
// CÓMO SE ENGANCHA CON LO QUE YA HAY: en /prescripcion-de-deudas-con-el-estado-uruguay quedó
// dicho que la patente NO se rige por el artículo 38 del Código Tributario, porque los tributos
// departamentales están excluidos. Esta página trae la regla departamental que sí la rige.
//
// DOS TRAMPAS DE PLAZO QUE ESTA PÁGINA EXISTE PARA EVITAR:
//   1. El descargo son 10 días HÁBILES; el recurso posterior, 10 días CORRIDOS. No es el mismo
//      plazo y se pierden por confundirlos.
//   2. La prescripción de la multa NO opera sola: requiere acto administrativo. Y cualquier
//      reconocimiento, expreso o tácito, interrumpe el plazo — pagar una cuota la resucita.
//
// ALCANCE: el tributo de patente está unificado por el SUCIVE, pero el PROCEDIMIENTO de la
// infracción es departamental. Los pasos y las oficinas de acá son los de Montevideo; en otro
// departamento hay que confirmarlos en su intendencia. La página lo dice.
//
// LA MITAD QUE FALTABA: la URL dice «y-patente» y durante un tiempo no hubo una sola línea de
// patente. En los volcados de auto y moto hay ~25 formulaciones de tres preguntas: cuánto se
// paga y cómo se calcula, qué pasa si no pagás, y si conviene reempadronar en otro departamento.
// Grep de «cilindrada» sobre todo `app/` daba CERO: las motos directamente no existían en el
// sitio. El bloque PATENTE de abajo es eso.
//
// DOS CONFUSIONES QUE EL BLOQUE DE PATENTE EXISTE PARA CORTAR:
//   1. Patente y multa NO prescriben igual. La multa: 5 años desde la infracción, y el trámite
//      departamental enumera qué interrumpe (convenio, notificación, reconocimiento). La patente:
//      10 años desde la terminación del año civil del hecho gravado (art. 18 del TOS 2026), y el
//      texto vigente NO dice qué interrumpe ese plazo. La advertencia de FINE_RECOGNITION_WARNING
//      es sobre MULTAS; no la extiendas a la patente, pero tampoco publiques lo contrario.
//   2. La patente no es un porcentaje de lo que pagaste por el auto: es una alícuota sobre un
//      AFORO central. Ojo con dos errores que ya estuvieron publicados en esta misma línea: la
//      Comisión del art. 4 de la ley 18.860 PROPONE (no fija: resuelve el Congreso de
//      Intendentes) y su plazo es el 31 de octubre, no el 30. El 30 sale del art. 6 del Texto
//      Ordenado del SUCIVE, que es otra cosa y que este párrafo no invoca. Por eso el importe se
//      consulta, no se estima.
//
// POR QUÉ TODO EL BLOQUE DE PATENTE CITA EL TEXTO ORDENADO **2026** Y NO EL 2022: el SUCIVE
// reordena y renumera su texto todos los años, y en 2026 se movieron siete de los artículos que
// esta página citaba (convenios 23→25, validación al pago 27→29, mora 28→30, bonificaciones
// 30→31, transferencias 41→45, reempadronamiento 42→46, repetidos 43→47). Peor: en el TOS 2026
// esos números viejos existen y son de OTRO tema (23 «Multas de tránsito», 41 «Permisos de
// Circulación fronterizos», 42 «Empadronamiento provisorio», 43 «Permisos de circulación para
// empadronar»), así que una cita vieja no falla ruidosamente: manda al lector a otro artículo.
// Y hay contenido que directamente desapareció: la cláusula de interrupción de la prescripción
// del art. 18 y la habilitación de «persecución judicial de los adeudos» del viejo art. 23 no
// están en el texto vigente. Cuando eso pasa se publica la AUSENCIA, no la versión derogada.
//
// POR QUÉ CASI NO HAY IMPORTES EN PESOS ACÁ: las alícuotas y el mecanismo son estructurales, pero
// los montos se revotan todos los años. Se publica el mecanismo + el link a la consulta oficial
// por matrícula, y sólo los pocos importes que pudieron fecharse contra fuente (mismo criterio
// que householdBills.ts con UTE).
//
// FUENTES, verificadas el 2026-08-10:
//   - Intendencia de Montevideo, «¿Cómo apelar una multa?»
//     https://montevideo.gub.uy/areas-tematicas/movilidad/fiscalizacion-de-infracciones/como-apelar-una-multa
//   - Intendencia de Montevideo, consulta de infracciones
//     https://tramites.montevideo.gub.uy/consultainfracciones
//   - Texto Ordenado del SUCIVE 2026, aprobado en la 6ª Sesión Plenaria del Congreso de
//     Intendentes del 14/11/2025 (arts. 2, 6, 7, 10, 11, 14, 18, 25, 27, 29, 30, 31, 45, 46, 47)
//     https://www.gub.uy/congreso-intendentes/comunicacion/publicaciones/texto-ordenado-del-sucive-2026
//     PDF que la Intendencia de Montevideo sirve en el trámite de prescripción:
//     https://tramites.montevideo.gub.uy/sites/tramites.montevideo.gub.uy/files/tramites/documentos/TOS%202026_0.pdf
//   - IMPO, decreto 303/023 art. 6 (qué multas de tránsito NO se pueden financiar)
//     https://www.impo.com.uy/bases/decretos/303-2023/6
//   - gub.uy, «Multa de tránsito - Prescripción» (trámite departamental)
//     https://www.gub.uy/tramites/multa-transito-prescripcion-maldonado
//   - Congreso de Intendentes, valores de patente 2026 (6ª Sesión Plenaria Extraordinaria, 14/11/2025)
//     https://www.gub.uy/congreso-intendentes/comunicacion/noticias/congreso-intendentes-aprueba-unanimidad-valor-patente-rodados-para-ano-2026
//   - SUCIVE, consulta de valor de patente por matrícula y padrón
//     https://www.sucive.gub.uy/consulta_patente
//   - Intendencia de Montevideo, patente de rodados (bandas fijas y vencimientos 2026)
//     https://montevideo.gub.uy/areas-tematicas/movilidad/patente-de-rodados
//   - Intendencia de Montevideo, patente de rodados en el portal de trámites (bonificaciones)
//     https://tramites.montevideo.gub.uy/tramites-y-tributos/patente-de-rodados
//   - IMPO, ley 18.456 (dónde se empadrona: domicilio permanente del titular)
//     https://www.impo.com.uy/bases/leyes/18456-2008
//   - IMPO, ley 18.860 (crea el SUCIVE; Comisión de Aforos)
//     https://www.impo.com.uy/bases/leyes/18860-2011
//   - IMPO, ley 19.824 art. 40 (retiro de placas por 5 o más ejercicios de deuda)
//     https://www.impo.com.uy/bases/leyes/19824-2019/40

/** Fecha en que plazos y procedimiento se contrastaron con las fuentes. */
export const FINES_VERIFIED_AT = '2026-08-10'

export interface FinesSource {
  label: string
  url: string
}

export const FINES_SOURCES: readonly FinesSource[] = Object.freeze([
  {
    label: 'Intendencia de Montevideo — Cómo apelar una multa',
    url: 'https://montevideo.gub.uy/areas-tematicas/movilidad/fiscalizacion-de-infracciones/como-apelar-una-multa',
  },
  {
    label: 'Intendencia de Montevideo — Consulta de infracciones',
    url: 'https://tramites.montevideo.gub.uy/consultainfracciones',
  },
  {
    label: 'Congreso de Intendentes — Texto Ordenado del SUCIVE 2026',
    url: 'https://www.gub.uy/congreso-intendentes/comunicacion/publicaciones/texto-ordenado-del-sucive-2026',
  },
  {
    label: 'Intendencia de Montevideo — Texto Ordenado del SUCIVE 2026 (PDF)',
    url: 'https://tramites.montevideo.gub.uy/sites/tramites.montevideo.gub.uy/files/tramites/documentos/TOS%202026_0.pdf',
  },
  {
    label: 'gub.uy — Multa de tránsito, prescripción (trámite departamental)',
    url: 'https://www.gub.uy/tramites/multa-transito-prescripcion-maldonado',
  },
  {
    label: 'SUCIVE — Consulta de valor de patente por matrícula y padrón',
    url: 'https://www.sucive.gub.uy/consulta_patente',
  },
  {
    label: 'Congreso de Intendentes — Valores de patente de rodados 2026',
    url: 'https://www.gub.uy/congreso-intendentes/comunicacion/noticias/congreso-intendentes-aprueba-unanimidad-valor-patente-rodados-para-ano-2026',
  },
  {
    label: 'Intendencia de Montevideo — Patente de rodados (bandas fijas y vencimientos 2026)',
    url: 'https://montevideo.gub.uy/areas-tematicas/movilidad/patente-de-rodados',
  },
  {
    label: 'Intendencia de Montevideo — Patente de rodados, bonificaciones (portal de trámites)',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/patente-de-rodados',
  },
  {
    label: 'Intendencia de Montevideo — Prescripción de deuda de patente de rodados',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/prescripcion-de-deuda-de-patente-de-rodados',
  },
  {
    label: 'IMPO — Ley 18.456 (dónde se empadrona el vehículo)',
    url: 'https://www.impo.com.uy/bases/leyes/18456-2008',
  },
  {
    label: 'IMPO — Ley 18.860 (crea el SUCIVE y la Comisión de Aforos)',
    url: 'https://www.impo.com.uy/bases/leyes/18860-2011',
  },
  {
    label: 'IMPO — Ley 19.824, artículo 40 (retiro de placas por deuda acumulada)',
    url: 'https://www.impo.com.uy/bases/leyes/19824-2019/40',
  },
  {
    label: 'IMPO — Decreto 303/023, artículo 6 (qué multas de tránsito no se pueden financiar)',
    url: 'https://www.impo.com.uy/bases/decretos/303-2023/6',
  },
])

/** Que el procedimiento sea departamental es lo primero que hay que aclarar. */
export const FINES_SCOPE_NOTE =
  'El tributo de patente está unificado en el SUCIVE, pero el procedimiento de la infracción lo lleva cada intendencia. Los plazos y las oficinas de esta página son los de Montevideo: si tu vehículo está empadronado en otro departamento, confirmá el procedimiento en esa intendencia antes de contar los días.'

// ---------------------------------------------------------------------------
// Plazos: la parte que se pierde por confundir hábiles con corridos
// ---------------------------------------------------------------------------

/** Días HÁBILES para presentar descargos desde la notificación. */
export const DESCARGO_DIAS_HABILES = 10

/** Días CORRIDOS para recurrir si la multa se mantiene. */
export const RECURSO_DIAS_CORRIDOS = 10

/** Años de prescripción de la multa, contados desde que se cometió la infracción. */
export const FINE_PRESCRIPTION_YEARS = 5

export interface FineStep {
  n: number
  title: string
  deadline: string | null
  /** `true` cuando el plazo se cuenta en días hábiles. */
  businessDays: boolean
  detail: string
}

export const FINE_STEPS: readonly FineStep[] = Object.freeze([
  {
    n: 1,
    title: 'Te notifican la infracción',
    deadline: null,
    businessDays: false,
    detail:
      'Desde la notificación empieza a correr el plazo. Si no presentás descargos, la multa se aplica sin más.',
  },
  {
    n: 2,
    title: 'Presentás descargos',
    deadline: `${DESCARGO_DIAS_HABILES} días hábiles`,
    businessDays: true,
    detail:
      'Se hacen en línea con el formulario de descargos de contravenciones de tránsito, o presencialmente en Atención a la Ciudadanía. Es el momento de aportar la prueba.',
  },
  {
    n: 3,
    title: 'Informa la Comisión Asesora de Infracciones',
    deadline: null,
    businessDays: false,
    detail:
      'Tus descargos pasan a una comisión que elabora un informe con una recomendación para la dependencia que corresponda.',
  },
  {
    n: 4,
    title: 'Si la multa se mantiene, recurrís',
    deadline: `${RECURSO_DIAS_CORRIDOS} días corridos`,
    businessDays: false,
    detail:
      'El recurso tiene dos partes que van juntas: reposición ante el funcionario que aplicó la multa, y apelación ante el Intendente. Ojo con el cambio de unidad: acá los días son corridos, no hábiles.',
  },
])

/** La trampa, escrita para poder citarla. */
export const DEADLINE_TRAP =
  'El descargo se cuenta en días hábiles y el recurso posterior en días corridos. No es el mismo plazo y es la forma más común de quedarse sin instancia: alguien cuenta diez días corridos para el descargo y llega tarde, o cuenta diez hábiles para el recurso y también.'

// ---------------------------------------------------------------------------
// Prescripción de la multa
// ---------------------------------------------------------------------------

/** Qué interrumpe el plazo. Es lo que hace que una deuda vieja se reinicie sola. */
export const FINE_PRESCRIPTION_INTERRUPTS: readonly string[] = Object.freeze([
  'Haber firmado un convenio de pago.',
  'La notificación.',
  'Cualquier reconocimiento de la deuda, expreso o tácito.',
])

/**
 * El paralelo con la prescripción tributaria nacional: tampoco opera sola. Acá además hace falta
 * una resolución del intendente.
 */
export const FINE_PRESCRIPTION_RULE =
  'Las multas de tránsito prescriben a los cinco años contados desde que se cometió la infracción, siempre que no haya habido convenio, notificación ni reconocimiento —expreso o tácito— que interrumpa el plazo. Y no opera sola: la prescripción tiene que ser autorizada por acto administrativo, es decir, por resolución del intendente o de quien haga sus veces.'

/** La advertencia práctica, igual que con la deuda privada. */
export const FINE_RECOGNITION_WARNING =
  'Pagar una cuota, firmar un convenio o incluso reconocer la deuda de palabra puede interrumpir el plazo y reiniciarlo. Si estás mirando una multa vieja pensando en la prescripción, no reconozcas nada antes de asesorarte: el gesto que parece de buena fe es el que reinicia el reloj.'

// ---------------------------------------------------------------------------
// Si ya pagaste una multa que no correspondía
// ---------------------------------------------------------------------------

export interface RefundRoute {
  label: string
  detail: string
}

export const FINE_REFUND_ROUTES: readonly RefundRoute[] = Object.freeze([
  {
    label: 'Crédito en la cuenta del vehículo',
    detail:
      'Se deja sin efecto la infracción y queda un crédito en la cuenta corriente del vehículo. Sólo para vehículos empadronados en Montevideo.',
  },
  {
    label: 'Devolución en dinero por el SUCIVE',
    detail:
      'El dinero vuelve a través del SUCIVE, en tres momentos del año: abril, agosto y diciembre.',
  },
])

// ---------------------------------------------------------------------------
// PATENTE: cuánto se paga y cómo se calcula
// ---------------------------------------------------------------------------

/**
 * Fecha en que las alícuotas, bandas fijas, vencimientos y bonificaciones se contrastaron con el
 * Congreso de Intendentes y la Intendencia de Montevideo. Separada de FINES_VERIFIED_AT porque
 * caduca a otro ritmo: los valores de patente se revotan todos los años en noviembre.
 */
export const PATENTE_VERIFIED_AT = '2026-08-10'

/** Ejercicio al que corresponden las alícuotas y los importes de abajo. */
export const PATENTE_YEAR = 2026

/** La consulta oficial por matrícula. Es el único lugar donde sale TU importe. */
export const PATENTE_CONSULTA_URL = 'https://www.sucive.gub.uy/consulta_patente'

/** Consulta de deuda (patente, convenios, peajes e infracciones) por matrícula y padrón. */
export const PATENTE_DEUDA_URL = 'https://www.sucive.gub.uy/consulta_deuda'

/** Solicitud de reempadronamiento en línea, previa al trámite en la intendencia de destino. */
export const REEMPADRONAMIENTO_URL = 'https://www.sucive.gub.uy/solicitud_reempadronamiento'

/**
 * La corrección central: nadie calcula su patente multiplicando lo que pagó por el auto. El
 * tributo es una alícuota sobre un valor imponible (aforo) que se fija centralmente y por año.
 */
export const PATENTE_AFORO_RULE =
  'La patente no se calcula sobre lo que pagaste por el vehículo: se calcula sobre un valor de aforo. La Comisión del artículo 4 de la ley 18.860 eleva una propuesta de valores imponibles antes del 31 de octubre de cada año, y quien resuelve es el Congreso de Intendentes, antes del 15 de noviembre. Ese valor de mercado es el promedio de los valores de comercialización que surgen de estudios públicos y privados para cada año, modelo y marca. Por eso el importe se consulta por matrícula y no se estima.'

export interface PatenteRate {
  /** Categoría fiscal del texto ordenado: A autos, B camiones, C motos. */
  category: 'A' | 'B' | 'C'
  vehicle: string
  rate: string
  /** Sobre qué se aplica la alícuota, porque «sin IVA» cambia el resultado. */
  base: string
}

/**
 * Alícuotas del ejercicio 2026, aprobadas por unanimidad por el Congreso de Intendentes en su
 * 6ª Sesión Plenaria Extraordinaria del 14/11/2025. Se revotan todos los años: si estás leyendo
 * esto en otro ejercicio, el mecanismo sigue, los números hay que volver a mirarlos.
 *
 * DISCREPANCIA ENTRE LAS DOS FUENTES OFICIALES, y por qué la tabla dice lo que dice: la noticia
 * del Congreso de Intendentes escribe «Vehículos eléctricos usados (hasta 31/12/25): 2,25% sobre
 * Valor de Mercado», mientras que el art. 2.1 del Texto Ordenado del SUCIVE 2026 escribe «de los
 * usados empadronados al 31/12/2025, es 2,25% del valor de mercado SIN IVA». La columna `base`
 * existe justamente porque «sin IVA» cambia el resultado, así que acá se sigue al texto ordenado,
 * que es la norma, y no a la nota de prensa. La caption de la tabla lo dice en la página.
 */
export const PATENTE_RATES: readonly PatenteRate[] = Object.freeze([
  {
    category: 'A',
    vehicle: 'Autos y camionetas 0 km',
    rate: '5%',
    base: 'valor de mercado sin IVA',
  },
  {
    category: 'A',
    vehicle: 'Autos y camionetas usados',
    rate: '4,5%',
    base: 'valor de mercado',
  },
  {
    category: 'A',
    vehicle: 'Eléctricos 0 km',
    rate: '3%',
    base: 'valor de mercado sin IVA',
  },
  {
    category: 'A',
    vehicle: 'Eléctricos usados (empadronados al 31/12/2025)',
    rate: '2,25%',
    base: 'valor de mercado sin IVA',
  },
  {
    category: 'B',
    vehicle: 'Camiones 0 km y usados',
    rate: '1,3%',
    base: 'valor de mercado (sin IVA en el 0 km)',
  },
  {
    category: 'C',
    vehicle: 'Motos 0 km desde 500 cc',
    rate: '5%',
    base: 'valor de mercado menos IVA',
  },
  {
    category: 'C',
    vehicle: 'Motos usadas desde 500 cc empadronadas en 2024 y 2025',
    rate: '4,5%',
    base: 'valor de mercado',
  },
  {
    category: 'C',
    vehicle: 'Motos 0 km hasta 499 cc',
    rate: 'Lo fija la intendencia',
    base: 'la del primer empadronamiento',
  },
  {
    category: 'C',
    vehicle: 'Motos USADAS hasta 499 cc, y usadas desde 500 cc empadronadas hasta 2023',
    rate: 'Patente 2025 ajustada por IPC',
    base: 'arrastre del importe anterior',
  },
])

/**
 * El dato que no existe y que la gente busca igual: NO hay una escala nacional de patente de moto
 * por centímetros cúbicos. La única línea de corte por cilindrada es 500 cc, y sólo separa a las
 * que tributan por alícuota de las que arrastran su importe histórico.
 */
export const MOTO_CILINDRADA_RULE =
  'No existe una escala nacional que diga cuánto paga una moto según sus centímetros cúbicos. La cilindrada aparece una sola vez, como línea de corte en 500 cc: desde 500 cc la moto tributa por alícuota sobre el valor de mercado (5% si es 0 km, 4,5% si es usada empadronada en 2024 o 2025), y hasta 499 cc el monto de la 0 km lo determina la intendencia del primer empadronamiento y después arrastra, ajustándose por IPC. O sea: para las motos de hasta 499 cc el importe no sale de ninguna fórmula publicada, sale de la consulta por matrícula. No publicamos qué proporción del parque son porque no encontramos esa estadística en fuente oficial.'

export interface PatenteBand {
  years: string
  amount: string
}

/**
 * Bandas de valor fijo por antigüedad, ejercicio 2026. Son las que contestan «tengo un auto viejo,
 * ¿cuánto pago?». El principio general del texto ordenado agrega que ningún vehículo modelo 1992 o
 * posterior tributa menos que la banda 1986-1991, así que la última fila también es el piso.
 */
export const PATENTE_FIXED_BANDS: readonly PatenteBand[] = Object.freeze([
  { years: 'Hasta 1975', amount: '$ 0,00' },
  { years: '1976 - 1980', amount: '$ 2.923,37' },
  { years: '1981 - 1985', amount: '$ 4.385,05' },
  { years: '1986 - 1991', amount: '$ 8.770,10' },
])

export const PATENTE_FLOOR_RULE =
  'Ningún vehículo modelo 1992 o posterior tributa menos que el valor vigente para la banda 1986-1991. Es el piso del sistema: por más viejo que sea un modelo del 92 para arriba, no baja de ahí.'

/** Vencimientos del ejercicio 2026: seis cuotas bimestrales, todas el día 20. */
export const PATENTE_DUE_DATES: readonly string[] = Object.freeze([
  '20 de enero',
  '20 de marzo',
  '20 de mayo',
  '20 de julio',
  '21 de setiembre',
  '20 de noviembre',
])

export const PATENTE_DUE_DATE_RULE =
  'El vencimiento es todos los días 20 de los meses de pago. Cuando la fecha cae sábado, domingo o feriado no se aplican multas ni recargos hasta pasado el primer día hábil.'

export interface PatenteBonificacion {
  pct: string
  label: string
  detail: string
}

/**
 * Los dos descuentos, y la letra chica que los vuelve excluyentes. Que no sean acumulables es lo
 * que hace que «pago contado y además en fecha» no exista como combinación.
 */
export const PATENTE_BONIFICACIONES: readonly PatenteBonificacion[] = Object.freeze([
  {
    pct: '20%',
    label: 'Pago contado',
    detail:
      'Pagás toda la patente del año en la primera cuota que te vence. Si estás empadronando, pagás en la próxima cuota lo que resta del año.',
  },
  {
    pct: '10%',
    label: 'Pago en fecha',
    detail:
      'Si optaste por las seis cuotas bimestrales y pagás cada una dentro de su plazo, sobre lo pagado en fecha.',
  },
])

/**
 * La excepción del art. 11 va SIEMPRE con sus dos condiciones operativas, porque sin ellas ofrece
 * una salvación del 20% más ancha que la norma. El artículo dice, textual: «En los casos en los
 * que, por causa ajena a su voluntad, el contribuyente se ve impedido de abonar en fecha la
 * obligación que le corresponde, una vez que queda habilitado el pago, el sistema lo comunicará a
 * la Intendencia respectiva, la que a su vez se lo comunicará al contribuyente. Si la comunicación
 * a la Intendencia se realiza dentro de los 15 primeros días del mes el pago podrá realizarse sin
 * las sanciones por mora y con las bonificaciones correspondientes, hasta el fin del mes siguiente
 * y si se realiza después del día 15 del mes el pago con iguales condiciones podrá realizarse hasta
 * el día 15 del mes subsiguiente.» O sea: (a) lo dispara el SISTEMA cuando el pago no estaba
 * habilitado, no el contribuyente que tuvo un contratiempo, y (b) la ventana se cierra. Publicar
 * sólo la primera frase deja leer que un imprevisto personal conserva el 20% por tiempo indefinido.
 */
export const PATENTE_BONIFICACION_TRAP =
  'Las dos bonificaciones son únicas y no se acumulan: o el 20% de contado o el 10% por pagar cada cuota en fecha (art. 31 del texto ordenado). El 20% se aplica sobre el pago del monto anualizado hecho dentro del plazo de la primera cuota que te vence, así que dejar pasar esa primera cuota normalmente lo hace perder. Y el mismo artículo agrega una condición que sorprende: el pago tiene que hacerse en un solo acto, y son inválidos a estos efectos los depósitos que se hagan en más de una vez, aunque sumados den el total. Hay dos excepciones escritas, pero ninguna es una prórroga que se pida por haber tenido un imprevisto propio. El artículo 11 habla de quien «por causa ajena a su voluntad» no pudo pagar en fecha, y lo que describe después es un mecanismo del sistema: aplica cuando el pago no estaba habilitado y, «una vez que queda habilitado el pago», el sistema se lo comunica a la intendencia y la intendencia al contribuyente. Recién ahí se abre una ventana, y es cerrada: se puede pagar «sin las sanciones por mora y con las bonificaciones correspondientes» hasta el fin del mes siguiente si esa comunicación cae dentro de los 15 primeros días del mes, y hasta el 15 del mes subsiguiente si cae después del 15. La otra excepción: el SUCIVE extiende los beneficios por circular cuando el vehículo todavía no tiene valor de patente asignado. Si es tu caso, preguntá antes de darlo por perdido.'

// ---------------------------------------------------------------------------
// PATENTE: qué pasa si no pagás
// ---------------------------------------------------------------------------

export interface MoraTier {
  when: string
  multa: string
}

/**
 * La multa por mora del artículo 30 del TOS 2026 (era el 28 en el texto ordenado 2022). Los
 * porcentajes están escritos ahí como 5/10/20, pero el mismo artículo los reduce a la mitad para
 * toda extinción de deuda hecha desde el 1/1/2019: por eso abajo va el efectivo entre paréntesis,
 * que es el que vas a ver en la boleta.
 */
export const PATENTE_MORA_TIERS: readonly MoraTier[] = Object.freeze([
  { when: 'Dentro de los 5 días hábiles del vencimiento', multa: '5% (2,5% efectivo)' },
  { when: 'Pasados los 5 días hábiles y hasta los 90 días corridos', multa: '10% (5% efectivo)' },
  { when: 'Pasados los 90 días corridos', multa: '20% (10% efectivo)' },
])

export const PATENTE_MORA_RECARGO_RULE =
  'Además de la multa corre un recargo mensual capitalizable diariamente, que se calcula día por día. La tasa no es un número fijo del sistema: sale de incrementar en un 30% el promedio de las tasas medias para empresas del Banco Central, para préstamos en moneda nacional no reajustables de hasta 366 días, de la última publicación al 30 de setiembre del año anterior, y también se reduce a la mitad. Se actualiza todos los años, así que el porcentaje concreto se mira en la liquidación, no acá.'

export interface PatenteConsequence {
  label: string
  detail: string
  /** La norma exacta, para que se pueda chequear sin buscarla. */
  norm: string
}

/**
 * Qué hace efectivamente el sistema cuando no pagás. Va ordenado de lo más frecuente a lo más
 * grave, y a propósito NO incluye el clearing: ver PATENTE_CLEARING_ABSENCE.
 *
 * TAMPOCO INCLUYE «persecución judicial de los adeudos», que es lo que decía el art. 23 del texto
 * ordenado 2022 y era la cuarta palanca con la que se contrapesaba la ausencia del clearing: esa
 * habilitación NO figura en el Texto Ordenado del SUCIVE 2026 (grep de «persecuci» sobre el
 * documento completo: cero coincidencias) ni en la ley 18.860, así que se cae. Antes de
 * reponerla hace falta una norma vigente que la diga, no la versión anterior del texto ordenado.
 *
 * Los números de artículo son los del TOS 2026 y no los del 2022: ver la nota de cabecera.
 */
export const PATENTE_CONSEQUENCES: readonly PatenteConsequence[] = Object.freeze([
  {
    label: 'No podés pagar la patente corriente',
    detail:
      'Las deudas por patente sólo se pueden pagar si no hay deuda heredada, ni convenio con más de una cuota de atraso o con la última cuota vencida, ni multa con más de 30 días de atraso. Y los conceptos vencidos más antiguos se pagan primero. O sea: la deuda vieja te bloquea el pago de la cuota nueva, y esa cuota nueva también se atrasa. Las multas y las cuotas de convenio son la excepción, siempre se pueden pagar.',
    norm: 'Texto Ordenado del SUCIVE 2026, art. 29',
  },
  {
    label: 'No podés transferir el vehículo',
    detail:
      'No puede transferirse un vehículo que deba patente, multas, cuotas de convenios interdepartamentales o montos por chapas matrículas o DIV, aunque todavía no haya vencido el plazo para pagarlos. Para vender, entonces, alcanza con que la deuda exista: no hace falta que esté vencida. Es el bloqueo que aparece recién cuando querés vender.',
    norm: 'Texto Ordenado del SUCIVE 2026, art. 45',
  },
  {
    label: 'Para reempadronar no podés tener deuda VENCIDA',
    detail:
      'El reempadronamiento se rige por otro artículo y con otra vara que la transferencia: el sistema controla automáticamente que no exista deuda vencida, y si hay deuda a vencer no se bloquea, se requiere su reconocimiento por quien quede como titular del vehículo en la intendencia de destino. Con cuotas de convenio a vencer también se puede, estando al día en la intendencia de origen y si el nuevo propietario las reconoce, pero ese convenio ya no se puede modificar.',
    norm: 'Texto Ordenado del SUCIVE 2026, arts. 46 y 27',
  },
  {
    label: 'Multa por circular con la patente vencida',
    detail:
      'Circular con la patente vencida en dos o más cuotas se sanciona con una multa equivalente al 25% del valor de la patente anual del vehículo. Aplicada una, no puede volver a aplicarse por el mismo concepto durante un mes, y puede aplicarse hasta cuatro veces al año. La cobra el departamento donde te paran, aunque el vehículo esté empadronado en otro. Y si no la pagás, el mismo artículo manda retirar las matrículas.',
    norm: 'Texto Ordenado del SUCIVE 2026, art. 10',
  },
  {
    label: 'Retiro de placas y depósito del vehículo',
    detail:
      'Cuando se detecta circulando un vehículo con deudas tributarias vencidas de cinco o más ejercicios fiscales acumulados, los servicios inspectivos del gobierno departamental donde se constate la infracción están facultados para retirar las placas de matrícula. El vehículo queda inhabilitado para circular, se retira de la vía pública y se deposita, y sólo lo puede sacar quien esté inscripto en el registro vehicular departamental, con la situación tributaria regularizada y previo pago de la multa y los gastos.',
    norm: 'Ley 19.824, art. 40',
  },
])

/**
 * La respuesta a las 13 formulaciones de «¿entro en clearing?». Se publica la ausencia, no una
 * negativa inventada: buscamos la norma y el organismo, y no hay fuente que lo diga.
 */
export const PATENTE_CLEARING_ABSENCE =
  'No consta que la intendencia informe la deuda de patente al Clearing de Informes. El Texto Ordenado del SUCIVE 2026 no menciona el clearing ni ninguna central de riesgo crediticio en ninguna de sus disposiciones, y no encontramos norma ni comunicación oficial que establezca ese reporte. Las palancas que las normas sí prevén son otras: no poder pagar la cuota corriente mientras arrastres deuda vieja, el bloqueo de la transferencia, el bloqueo del reempadronamiento cuando hay deuda vencida, la multa por circular con la patente vencida y el retiro de placas por cinco o más ejercicios de deuda. Si alguien te dice que la patente impaga «te manda al clearing», pedile la fuente.'

/** Prescripción del tributo de patente. NO es la de las multas y por eso está separada. */
export const PATENTE_PRESCRIPTION_YEARS = 10

export const PATENTE_PRESCRIPTION_RULE =
  'El derecho al cobro del tributo de patente de rodados y sus conexos prescribe, para todas las intendencias, a los diez años contados a partir de la terminación del año civil en que se produjo el hecho gravado (artículo 18 del Texto Ordenado del SUCIVE 2026). Lo que ese artículo sí agrega es que la prescripción, tanto la de las multas de tránsito como la de las deudas tributarias, requiere sin excepciones haber sido autorizada por acto administrativo: resolución del intendente o de quien haga sus veces. Lo que NO dice es qué interrumpe el plazo de la patente: el texto vigente no regula la interrupción de esta prescripción, así que no vas a encontrar ahí ni que reconocer la deuda la interrumpe ni que no la interrumpe. Como la multa de tránsito prescribe a los cinco años y sí tiene causales de interrupción escritas, son dos relojes distintos sobre el mismo vehículo: no mezcles uno con el otro.'

export const PATENTE_PRESCRIPTION_TRAMITE =
  'Tampoco opera sola: hay que pedirla. En Montevideo es un trámite sin costo, con formulario firmado, cédula del titular y documentación que acredite la propiedad, y termina en una resolución de cancelación de deuda que se notifica por correo electrónico. La deuda a prescribir tiene que tener una antigüedad mayor a diez años contados desde la terminación del año civil del hecho gravado: en 2026 se pueden prescribir deudas de 2015 y anteriores.'

// ---------------------------------------------------------------------------
// PATENTE: convenio de pago
// ---------------------------------------------------------------------------

export interface ConvenioFact {
  label: string
  detail: string
}

/**
 * Reglas estructurales del convenio, del artículo 25 del TOS 2026 (era el 23 en el texto ordenado
 * 2022). Deliberadamente sin importes: los planes de regularización de adeudos (PRA) abren y
 * cierran por ventanas con condiciones propias, y publicar las de una ventana vencida como si
 * fueran permanentes es exactamente el error que evitamos.
 */
export const CONVENIO_FACTS: readonly ConvenioFact[] = Object.freeze([
  {
    label: 'Son dos convenios distintos',
    detail:
      'Uno por las deudas de multas por infracciones de tránsito y otro por patente y demás conceptos conexos, en ambos casos incluidas las sanciones por mora. El de patente se suscribe uno por cada departamento donde tengas deuda. El de multas cambió de unidad y conviene mirarlo dos veces: se otorga un convenio POR CADA MULTA incluida en la boleta, no uno por boleta. Si la boleta trae tres multas, son tres convenios, y por lo tanto tres entregas iniciales a pagar dentro de los tres días hábiles.',
  },
  {
    label: 'Hasta 36 cuotas mensuales',
    detail:
      'El saldo, una vez descontada la entrega inicial, se paga en hasta 36 cuotas mensuales y consecutivas. La primera vence el último día hábil del mes siguiente al de la suscripción. La cantidad de cuotas la elegís vos.',
  },
  {
    label: 'La entrega inicial tiene 3 días hábiles',
    detail:
      'Se exige una entrega inicial pagadera dentro de los tres días hábiles de firmar, y no puede ser menor al total de la deuda dividido la cantidad de cuotas más una. Mientras no la pagues el convenio queda bloqueado, y si no la pagás en plazo caduca.',
  },
  {
    label: 'Caduca con tres cuotas de atraso',
    detail:
      'Los convenios caducan por el atraso de tres de sus cuotas, y ahí revive la deuda original en los padrones del vehículo: lo que pagaste queda acreditado, pero el beneficio se pierde.',
  },
  {
    label: 'Se firma en cualquier departamento',
    detail:
      'Los convenios pueden suscribirse en cualquier departamento, independientemente de dónde esté el vehículo o la deuda. Si debés patente en varios departamentos tenés que firmarlos todos en una única operación y simultáneamente.',
  },
  {
    label: 'Hay portazo por reincidencia',
    detail:
      'No podés firmar uno nuevo de patente si ya tenés otro vigente en el mismo departamento, ni si en los últimos 360 días caducaron tres convenios del mismo tipo en ese departamento. Lo mismo por multas respecto de la misma boleta.',
  },
  {
    label: 'Qué multas no se pueden financiar',
    detail:
      'La exclusión que sí está escrita en norma vigente es una sola: las intendencias pueden financiar las multas de tránsito salvo cuando provengan de sanciones y multas derivadas de siniestros de tránsito con lesiones graves o fallecidos (decreto 303/023, artículo 6). El texto ordenado 2026 ya no dice, como decía el de 2022, que las multas por espirometría no sean convenibles: sólo remite al decreto 303/023 en su cita de fuente, y ese decreto no las excluye. Si tu multa es por espirometría, confirmalo en la intendencia antes de darla por no convenible.',
  },
])

/**
 * El puente con la advertencia de multas de más arriba. Existe porque la advertencia sobre firmar
 * convenios está escrita para MULTAS (el trámite departamental enumera convenio, notificación y
 * reconocimiento como causales de interrupción) y no hay nada equivalente escrito para la patente:
 * el artículo 18 del TOS 2026 fija los diez años y no regula la interrupción.
 *
 * OJO CON LA VERSIÓN ANTERIOR DE ESTA NOTA: hasta la auditoría del 2026-08-10 acá se afirmaba que
 * en la patente la interrupción sólo la dispone el Gobierno Departamental «por acto administrativo
 * firme (art. 18)». Esa oración existe en el texto ordenado 2022, NO en el 2026, y sobre ella se
 * construía el consejo de que reconocer la deuda de patente no mueve el reloj. Era derecho
 * derogado usado para tranquilizar a alguien con deuda de más de diez años. La regla de la casa
 * es publicar la ausencia: no sabemos qué interrumpe, y eso es exactamente lo que se dice.
 */
export const CONVENIO_VS_PRESCRIPCION_NOTE =
  'Ojo con trasladar mecánicamente la advertencia de las multas, pero ojo también con darla vuelta. En las multas está escrito qué interrumpe la prescripción: convenio, notificación y cualquier reconocimiento expreso o tácito. En la patente no está escrito: el artículo 18 del Texto Ordenado del SUCIVE 2026 fija los diez años y no regula la interrupción, así que no hay norma que te diga que reconocer la deuda no mueve el reloj. Y firmar un plan de regularización nunca es neutro: se adhiere suscribiendo un documento donde reconocés los adeudos. Si tenés deuda de patente de más de diez años y estás mirando la prescripción, ese es el orden: primero pedís la prescripción, después firmás algo.'

// ---------------------------------------------------------------------------
// PATENTE: reempadronar en otro departamento
// ---------------------------------------------------------------------------

/**
 * La creencia a desarmar: que el departamento del empadronamiento se elige buscando la patente más
 * barata. No se elige: lo determina el domicilio permanente del titular, y hay declaración jurada.
 */
export const REEMPADRONAR_RULE =
  'El departamento donde empadronás no se elige por conveniencia. Los tributos a los vehículos configuran el hecho generador en el domicilio permanente del titular del vehículo, que para las personas físicas es aquel donde tiene la residencia con ánimo de permanecer en ella. La única alternativa que la ley prevé es optar por radicarlo en otra jurisdicción cuando tenés ahí actividades laborales o intereses económicos que se relacionen con la circulación habitual del vehículo.'

export interface ReempadronarStep {
  label: string
  detail: string
}

export const REEMPADRONAR_FACTS: readonly ReempadronarStep[] = Object.freeze([
  {
    label: 'Se acredita con declaración jurada',
    detail:
      'Los sujetos pasivos presentan en la intendencia declaración jurada y certificado notarial acreditando el domicilio que configura el hecho generador. El certificado puede sustituirse o ampliarse con constancias de domicilio controladas, facturas de servicios públicos u otros documentos de actividad o intereses económicos.',
  },
  {
    label: 'Declarar un domicilio falso tiene consecuencia',
    detail:
      'Cualquier intendencia puede denunciar o impugnar ante la Justicia competente las declaraciones, certificaciones y documentos presentados, en caso de falsedad ideológica o material, o cuando sea notorio un cambio del domicilio declarado.',
  },
  {
    label: 'Si te mudás de departamento, son 30 días hábiles',
    detail:
      'Cuando el domicilio que configura el hecho generador cambia de jurisdicción departamental, el contribuyente debe reempadronar el vehículo en la intendencia correspondiente dentro del término de treinta días hábiles de producido el cambio. No es opcional ni queda a criterio.',
  },
  {
    label: 'Con deuda VENCIDA no se reempadrona; la que está por vencer se reconoce',
    detail:
      'No rige el mismo bloqueo que para la transferencia, y la diferencia importa. Para transferir alcanza con que exista deuda aunque no haya vencido el plazo de pago (art. 45). Para reempadronar, el sistema controla automáticamente que no exista deuda VENCIDA, y la deuda a vencer no bloquea: se requiere su reconocimiento por quien quede como titular del vehículo en la intendencia de destino (art. 46). Con cuotas de convenio a vencer pasa lo mismo, estando al día en la intendencia de origen y si el nuevo propietario las reconoce (art. 27).',
  },
  {
    label: 'La patente no siempre te sigue',
    detail:
      'Los vehículos cuya patente no está unificada mantienen, al reempadronar, el monto determinado para la intendencia que los tenía. Y si el vehículo aparece con deuda solapada en más de un departamento, queda en el último donde reempadronó, pero mientras arrastre deuda de los anteriores no queda habilitado para transferir ni reempadronar.',
  },
])

/**
 * Lo que NO podemos poner: el costo. Las chapas y la libreta se pagan al reempadronar y cada
 * intendencia publica lo suyo; poner un número de un departamento invita a presupuestar mal.
 */
export const REEMPADRONAR_COST_NOTE =
  'El trámite no es gratis: al reempadronar se pagan chapas nuevas y libreta. No publicamos el importe porque varía según la intendencia y el tipo de vehículo, y un número de un departamento usado en otro te hace presupuestar mal. Consultalo en la intendencia donde vas a reempadronar. La solicitud se inicia en línea en el SUCIVE y recién cuando figura como aceptada se gestiona en el gobierno departamental de destino.'

export interface FinesFaq {
  question: string
  short: string
  answer: string
}

export const FINES_FAQ: readonly FinesFaq[] = Object.freeze([
  {
    question: 'Me llegó una multa que no me corresponde. ¿Qué hago?',
    short: 'Presentá descargos dentro de los 10 días hábiles de notificado.',
    answer:
      'Desde la notificación tenés diez días hábiles para presentar descargos, en línea con el formulario de contravenciones de tránsito o presencialmente en Atención a la Ciudadanía. Es el momento de aportar la prueba. Si no presentás nada, la multa se aplica. Después los descargos pasan a una Comisión Asesora de Infracciones que informa con una recomendación.',
  },
  {
    question: 'Rechazaron mi descargo. ¿Puedo insistir?',
    short: 'Sí, con el recurso, pero ahí son 10 días CORRIDOS.',
    answer:
      'Si la multa se mantiene, tenés diez días corridos para recurrir. El recurso tiene dos partes que se presentan juntas: reposición ante el funcionario que aplicó la multa y apelación ante el Intendente. Prestá atención al cambio de unidad, porque el descargo se contaba en días hábiles y este plazo en corridos.',
  },
  {
    question: '¿Prescriben las multas de tránsito?',
    short: 'A los cinco años, pero hay que pedirlo y cualquier reconocimiento reinicia el plazo.',
    answer:
      'Prescriben a los cinco años desde que se cometió la infracción, siempre que no haya habido convenio, notificación ni reconocimiento expreso o tácito que interrumpa el plazo. Y no opera sola: requiere un acto administrativo, una resolución del intendente. Es el mismo patrón que en materia tributaria nacional, donde la prescripción también opera a petición de parte.',
  },
  {
    question: 'Tengo una multa vieja. ¿Me conviene pagar una cuota mientras averiguo?',
    short: 'No: pagar o reconocer la deuda puede reiniciar el plazo de prescripción.',
    answer:
      'Cualquier reconocimiento, expreso o tácito, interrumpe el plazo. Pagar una cuota o firmar un convenio sobre una deuda que podría estar prescrita la revive y hace empezar a contar de nuevo. Si estás mirando una deuda vieja con la prescripción en mente, asesorate antes de hacer cualquier gesto que implique reconocerla.',
  },
  {
    question: 'Pagué una multa que no correspondía. ¿Me la devuelven?',
    short: 'Sí: como crédito en la cuenta del vehículo o en dinero por el SUCIVE.',
    answer:
      'Hay dos caminos. Uno es dejar sin efecto la infracción y que quede un crédito en la cuenta corriente del vehículo, disponible sólo para vehículos empadronados en Montevideo. El otro es la devolución del dinero a través del SUCIVE, que se hace en tres momentos del año: abril, agosto y diciembre.',
  },
  {
    question: '¿Esto aplica en todo el país?',
    short: 'El tributo está unificado en el SUCIVE; el procedimiento de la multa es departamental.',
    answer:
      'La patente está unificada a nivel nacional por el SUCIVE, pero el procedimiento de la infracción lo lleva cada intendencia. Los plazos y las oficinas de esta página son los de Montevideo. Si tu vehículo está empadronado en otro departamento, confirmá el procedimiento en esa intendencia antes de contar los días: perder el plazo por aplicar el de otro departamento es un error caro y evitable.',
  },
  {
    question: '¿Cuánto pago de patente y cómo se calcula?',
    short: 'Es una alícuota sobre un aforo oficial, no sobre lo que pagaste el auto. Se consulta.',
    answer:
      'La patente es una alícuota sobre un valor de aforo que se fija centralmente por la Comisión del artículo 4 de la ley 18.860. Las dos normas escriben ese hito con verbos y fechas distintos, así que van los dos: la ley 18.860 dice que la Comisión eleva al Congreso de Intendentes una propuesta de valores de aforo y alícuotas antes del 31 de octubre, y el artículo 6 del texto ordenado del SUCIVE dice que la Comisión fija esos valores antes del 30 de octubre y el Congreso los ratifica. Lo que coincide es el cierre: el Congreso de Intendentes decide antes del 15 de noviembre. Para 2026 las alícuotas son 5% del valor de mercado sin IVA para autos y camionetas 0 km y 4,5% para usados; 3% y 2,25% sin IVA para eléctricos 0 km y usados; 1,3% para camiones. Los modelos viejos pagan bandas de valor fijo, desde $ 0 hasta 1975 hasta $ 8.770,10 en la banda 1986-1991. Como el valor de mercado depende de marca, modelo y año, el importe exacto sale de la consulta oficial del SUCIVE por matrícula y padrón, no de una cuenta que puedas hacer vos.',
  },
  {
    question: '¿Cuánto paga de patente una moto según la cilindrada?',
    short: 'No hay escala nacional por cc: la única línea de corte es 500 cc.',
    answer:
      'No existe una escala nacional que asigne un importe por centímetros cúbicos. La cilindrada aparece una sola vez, como línea de corte en 500 cc. Desde 500 cc la moto tributa por alícuota sobre el valor de mercado: 5% menos IVA si es 0 km y 4,5% si es usada empadronada en 2024 o 2025. Hasta 499 cc, el monto de la 0 km lo determina la intendencia del primer empadronamiento, y de ahí en más arrastra su importe ajustado por IPC, igual que las usadas de 500 cc o más empadronadas hasta 2023. O sea: si tu moto es de hasta 499 cc, el número no sale de ninguna fórmula publicada, sale de consultar la matrícula. No decimos qué proporción del parque son las de menos de 500 cc porque no encontramos esa estadística en fuente oficial.',
  },
  {
    question: '¿Conviene pagar la patente de una o en cuotas?',
    short: 'De contado son 20% de descuento; en cuotas, 10%. No se acumulan.',
    answer:
      'Pagar toda la patente del año dentro del plazo de la primera cuota tiene una bonificación del 20%, y el pago tiene que hacerse en un solo acto: los depósitos hechos en más de una vez no valen para ese beneficio aunque sumados den el total. Pagar en las seis cuotas bimestrales, cada una en fecha, tiene una del 10% sobre lo pagado en fecha. Las dos bonificaciones son únicas y no son acumulables, así que la comparación real es 20% contra 10%: la diferencia son diez puntos del tributo por adelantar el dinero entre dos y diez meses según la cuota, porque la última cuota vence recién el 20 de noviembre. El vencimiento es todos los días 20 de los meses de pago, y si cae sábado, domingo o feriado no corren multas ni recargos hasta pasado el primer día hábil.',
  },
  {
    question: 'No pagué la patente. ¿Qué me pasa?',
    short: 'Multa por mora escalonada, recargo diario y bloqueo para transferir o reempadronar.',
    answer:
      'Primero la mora: multa del 5% si pagás dentro de los cinco días hábiles del vencimiento, 10% pasados esos cinco días y hasta los noventa días corridos, y 20% después de los noventa días corridos, porcentajes que el propio artículo reduce a la mitad para toda deuda que se extinga desde 2019. Encima corre un recargo mensual capitalizable diariamente. Después vienen los bloqueos, que no son el mismo: para transferir alcanza con que exista deuda aunque no haya vencido el plazo de pago, mientras que para reempadronar lo que bloquea es la deuda vencida y la que está a vencer se reconoce. Y ni siquiera podés pagar la cuota corriente mientras arrastres deuda vieja, porque los conceptos vencidos más antiguos se pagan primero. Circular con la patente vencida en dos o más cuotas se sanciona con una multa del 25% de la patente anual, hasta cuatro veces al año. Y con cinco o más ejercicios de deuda acumulados te pueden retirar las placas y llevar el vehículo al depósito.',
  },
  {
    question: 'Si no pago la patente, ¿entro en el clearing?',
    short: 'No consta que la intendencia informe la deuda de patente al Clearing.',
    answer:
      'No consta. El Texto Ordenado del SUCIVE 2026 no menciona el clearing ni ninguna central de riesgo crediticio, y no encontramos norma ni comunicación oficial que establezca que las intendencias reporten la deuda de patente al Clearing de Informes. Lo que las normas sí prevén es otra cosa: no poder pagar la cuota corriente mientras arrastres deuda vieja, el bloqueo de la transferencia, el bloqueo del reempadronamiento cuando hay deuda vencida, la multa por circular con la patente vencida y el retiro de placas con cinco o más ejercicios de deuda. Si alguien te asegura que la patente impaga te manda al clearing, pedile la fuente antes de tomar una decisión con eso.',
  },
  {
    question: '¿Puedo hacer un convenio por la deuda de patente?',
    short: 'Sí: hasta 36 cuotas, con entrega inicial a 3 días hábiles y caducidad a las 3 cuotas.',
    answer:
      'Sí. Hay dos convenios distintos, uno por multas de tránsito y otro por patente y conceptos conexos. El de patente se firma uno por cada departamento donde tengas deuda; el de multas se otorga uno por cada multa incluida en la boleta, no uno por boleta, así que si la boleta trae varias multas vas a tener varios convenios y varias entregas iniciales. El saldo se paga en hasta 36 cuotas mensuales consecutivas, con una entrega inicial que hay que pagar dentro de los tres días hábiles de firmar y que no puede ser menor al total dividido la cantidad de cuotas más una. Se puede firmar en cualquier departamento. Cuidado con la caducidad: con tres cuotas de atraso el convenio se cae y revive la deuda original, y no podés firmar uno nuevo si en los últimos 360 días caducaron tres del mismo tipo en ese departamento.',
  },
  {
    question: '¿La deuda de patente prescribe?',
    short: 'A los diez años, no a los cinco. Y hay que pedirla.',
    answer:
      'A los diez años contados desde la terminación del año civil en que se produjo el hecho gravado, para todas las intendencias. No lo confundas con las multas de tránsito, que prescriben a los cinco: son dos relojes distintos sobre el mismo vehículo. La diferencia sigue en la interrupción, pero al revés de lo que se suele contar: en las multas está escrito qué la interrumpe, y en la patente el artículo 18 no regula la interrupción, así que no hay norma que diga que reconocer la deuda de patente no mueve el reloj. Lo que ese artículo sí exige, sin excepciones, es un acto administrativo que la autorice: no opera sola. En Montevideo es un trámite sin costo, con formulario, cédula y documentación que acredite la propiedad, que termina en una resolución de cancelación notificada por correo electrónico. En 2026 se pueden prescribir deudas de 2015 y anteriores.',
  },
  {
    question: '¿Me conviene reempadronar el auto en otro departamento para pagar menos?',
    short: 'No se elige: el empadronamiento sigue al domicilio permanente del titular.',
    answer:
      'El departamento no se elige por conveniencia. El hecho generador del tributo se configura en el domicilio permanente del titular del vehículo, y la única alternativa que la ley 18.456 prevé es optar por radicarlo donde tengas actividades laborales o intereses económicos relacionados con la circulación habitual del vehículo. Se acredita con declaración jurada y certificado notarial, y cualquier intendencia puede denunciar o impugnar esa declaración ante la Justicia por falsedad ideológica o material, o cuando sea notorio un cambio del domicilio declarado. Si de verdad te mudaste de departamento, el reempadronamiento no es opcional: tenés treinta días hábiles desde el cambio. Y no vas a poder hacerlo si el vehículo tiene deuda vencida, aunque la deuda que todavía no venció no lo bloquea: esa se reconoce ante la intendencia de destino.',
  },
  {
    question: '¿Cuánto cuesta reempadronar?',
    short: 'Chapas y libreta, con importe que fija cada intendencia. Consultá la tuya.',
    answer:
      'Al reempadronar se pagan chapas nuevas y libreta. No publicamos el importe porque varía según la intendencia y el tipo de vehículo, y usar el número de un departamento en otro te hace presupuestar mal: consultalo en la intendencia donde vas a reempadronar. El trámite arranca con una solicitud en línea en el SUCIVE y recién cuando figura como aceptada se gestiona en el gobierno departamental de destino. Tené presente que el sistema controla automáticamente que no haya deuda vencida, así que la deuda hay que resolverla antes.',
  },
])
