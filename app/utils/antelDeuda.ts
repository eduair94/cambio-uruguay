// Qué pasa si no pagás la factura de Antel: bloqueo, supresión, reconexión y el contrato.
//
// POR QUÉ ESTA PÁGINA. La eligió el job `currency-search-demand` el 2026-09-03: tres consultas del
// autocompletado uruguayo del mismo tema, las tres con el máximo puntaje porque el SERP son foros.
// Verificado consulta por consulta contra el SERP uruguayo (gl=uy) ese mismo día:
//
//   "que pasa si no pago antel"        → 1.º un hilo de Reddit, 4.º un posteo de Facebook
//   "cuando antel te corta el servicio" → 2.º Reddit, 4.º Facebook; el 1.º de Antel es la página
//                                          de "Estado del Servicio", que es sobre cortes técnicos
//   "antel cuanto demora en reconectar" → 1.º Reddit, 6.º el foro GameOver
//
// SEGUNDA LECTURA, 2026-09-22. La primera versión (2026-09-03) decía que Antel "no publica" cuántos
// días pasan hasta el bloqueo. Era cierto para DÍAS y falso para FACTURAS: Antel lo cuenta en
// facturas vencidas y lo dice en tres documentos distintos, uno por servicio, con tres escaleras
// que no coinciden entre sí. Y hay un único plazo en días, que la primera lectura no vio porque
// buscó "reconexión" y no "mora": el Boletín de Tarifas de telefonía fija (vigencia enero 2026)
// bloquea todos los servicios "a los 30 días del bloqueo saliente". Esta versión publica las tres
// escaleras con su fecha, dice cuál está retirada del sitio, y separa las sanciones por documento
// porque cada uno trae una fórmula propia. Sumó además el eje del contrato ("antel cuando vence mi
// contrato"): plazos publicados, cómo saber la fecha, qué pasa al vencer, cuánto cuesta irse antes
// y el camino URSEC.
//
// TODO SALE DE DOCUMENTOS PUBLICADOS, leídos el 2026-09-22 y listados con su URL y fecha en
// `ANTEL_DEUDA_SOURCES`. Cada hecho apunta por `fuenteIds` a esos documentos. Ni una cifra
// estimada; lo que no está publicado se dice que no está publicado (`sinPublicar`).
//
// LO QUE NO SE PUBLICA A PROPÓSITO, porque no está en ningún documento de Antel: que corte "a los
// X días" del vencimiento; que "tres facturas vencidas" sea la regla (es la cifra de un sitio de
// terceros sin fuente); que avise por SMS o correo antes de bloquear; que exista un cargo de
// reconexión; que el móvil vuelva "en pocas horas"; que la deuda vaya al Clearing; que bloquee el
// equipo por IMEI por cuotas impagas; que MiAntel muestre el fin del contrato; que haya baja sin
// cargo con seis meses de aviso por viaje.

export interface HechoAntel {
  /** La pregunta, tal como la hace la gente. */
  pregunta: string
  /** La respuesta, o la constancia de que no hay respuesta publicada. */
  respuesta: string
  /** El documento y el artículo exactos, para leer al lado de la respuesta. */
  fuente: string
  /** Ids de `ANTEL_DEUDA_SOURCES` que respaldan la respuesta. El primero es el principal. */
  fuenteIds: readonly string[]
  /** True cuando Antel NO publica el dato. Es la mitad honesta de la página. */
  sinPublicar?: boolean
}

export interface FuenteAntel {
  id: string
  label: string
  publisher: string
  url: string
  /** Fecha en que se leyó el documento (ISO). Una cifra vale con su fecha, no sola. */
  seenOn: string
}

export const ANTEL_DEUDA_VERIFIED_AT = '2026-09-22'

const SEEN = ANTEL_DEUDA_VERIFIED_AT

export const ANTEL_DEUDA_SOURCES: readonly FuenteAntel[] = Object.freeze([
  {
    id: 'reglamento',
    label: 'Reglamento General de Servicios (PDF)',
    publisher: 'Antel',
    url: 'https://www.antel.com.uy/documents/37544/0/reglamento-general-de-servicios.pdf/1aeaae96-4e8c-1caa-34ff-f5d9a9ce4446?t=1712329440836',
    seenOn: SEEN,
  },
  {
    id: 'cond-internet',
    label: 'Condiciones de Contratación del Servicio de Acceso a Internet (PDF)',
    publisher: 'Antel',
    url: 'https://www.antel.com.uy/documents/37544/0/condiciones-de-contratacion-servicios-de-acceso-a-internet.pdf/ba4e2f67-5a77-5073-14f5-e4f9e7496a61?t=1712329485173',
    seenOn: SEEN,
  },
  {
    id: 'cond-movil',
    label: 'Condiciones de Contratación de Servicio de Telefonía Móvil, edición abril 2023 (PDF)',
    publisher: 'Antel',
    url: 'https://www.antel.com.uy/documents/37544/0/condiciones-contratacion-movil-nueva-abril-2023.pdf/1d9e6ff5-17c7-e3a3-a3ac-511375ed757e?t=1712329469244',
    seenOn: SEEN,
  },
  {
    id: 'boletin-fija',
    label:
      'Boletín de Tarifas de Servicios Telefónico y Telegráfico, vigencia enero 2026, §3.7.2 "Pagos fuera de fecha" (PDF)',
    publisher: 'Antel',
    url: 'https://www.antel.com.uy/documents/37544/9975947/boletin-tarifas-tel-fija-2026.pdf',
    seenOn: SEEN,
  },
  {
    id: 'tarifario-datos',
    label: 'Precios generales Datos 2026 (PDF)',
    publisher: 'Antel',
    url: 'https://www.antel.com.uy/documents/37544/9751391/precios-generales-datos-2026.pdf/e41d9c47-d941-ba37-1290-89c1cbe67e18?t=1767014072010',
    seenOn: SEEN,
  },
  {
    id: 'tarifarios-2026',
    label:
      'Antel actualiza sus tarifas a partir del 1.º de enero de 2026 (comunicado con los tres tarifarios)',
    publisher: 'Antel',
    url: 'https://www.antel.com.uy/institucional/sala-de-prensa/comunicados/antel-actualiza-sus-tarifas-a-partir-del-1-de-enero-del-2026',
    seenOn: SEEN,
  },
  {
    id: 'regimen-2023',
    label:
      'Nuevo régimen de bloqueos y cancelaciones (1.º de junio de 2023): página retirada de antel.com.uy, copia de Wayback Machine del 11/12/2025',
    publisher: 'Antel (archivo)',
    url: 'https://web.archive.org/web/20251211025628/https://antel.com.uy/personas/novedades/nuevo-regimen-de-bloqueos-y-cancelaciones',
    seenOn: SEEN,
  },
  {
    id: 'faq-facturacion',
    label: 'Preguntas frecuentes de facturación',
    publisher: 'Antel',
    url: 'https://www.antel.com.uy/personas/preguntas-frecuentes/facturacion',
    seenOn: SEEN,
  },
  {
    id: 'faq-fija',
    label: 'Preguntas frecuentes de telefonía fija',
    publisher: 'Antel',
    url: 'https://www.antel.com.uy/personas/preguntas-frecuentes/fija',
    seenOn: SEEN,
  },
  {
    id: 'bloqueo-mora',
    label: 'Pantalla "Bloqueo por mora" de los accesos a internet',
    publisher: 'Antel',
    url: 'https://mensajes-servicios.antel.com.uy/mensajes-servicios-accesos-internet/bloqueo-por-mora.html',
    seenOn: SEEN,
  },
  {
    id: 'rae',
    label: 'Régimen Activo Especial para servicios de telefonía móvil (setiembre 2020 – mayo 2023)',
    publisher: 'Antel',
    url: 'https://antel.com.uy/personas/novedades/regimen-activo-especial-para-servicios-de-telefonia-movil',
    seenOn: SEEN,
  },
  {
    id: 'tienda-fibra-basico',
    label: 'Tienda en línea: Fibra Básico, condiciones comerciales y beneficios',
    publisher: 'Antel',
    url: 'https://tienda.antel.com.uy/plan/38/fibra-basico',
    seenOn: SEEN,
  },
  {
    id: 'tienda-fibra-temporada',
    label: 'Tienda en línea: Fibra Temporada, condiciones comerciales',
    publisher: 'Antel',
    url: 'https://tienda.antel.com.uy/plan/7405/fibra_temporada',
    seenOn: SEEN,
  },
  {
    id: 'tienda-fibra-limite',
    label: 'Tienda en línea: Fibra en tu hogar con límite 1, condiciones comerciales',
    publisher: 'Antel',
    url: 'https://tienda.antel.com.uy/plan/7404/fibra-con-limite-1',
    seenOn: SEEN,
  },
  {
    id: 'tienda-40-gigas',
    label: 'Tienda en línea: 40 Gigas con límite, condiciones comerciales',
    publisher: 'Antel',
    url: 'https://tienda.antel.com.uy/plan/8589/40-gigas-con-limite',
    seenOn: SEEN,
  },
  {
    id: 'tienda-viabilidad',
    label: 'Tienda en línea: controles de viabilidad para contratar un nuevo servicio móvil (PDF)',
    publisher: 'Antel',
    url: 'https://tienda.antel.com.uy/razuna/assets/1/F07D5B66BE0741CD9B532E934877256A/doc/73381BF97D264608B2AEE24C6AAEDC2C/requisitos-16.pdf',
    seenOn: SEEN,
  },
  {
    id: 'miantel',
    label: 'MiAntel, ficha oficial de la app',
    publisher: 'Antel',
    url: 'https://antel.com.uy/web/apps/w/miantel',
    seenOn: SEEN,
  },
  {
    id: 'ct-art-94',
    label: 'Código Tributario (Decreto-Ley 14.306), art. 94: mora',
    publisher: 'IMPO',
    url: 'https://www.impo.com.uy/bases/codigo-tributario/14306-1974/94',
    seenOn: SEEN,
  },
  {
    id: 'decreto-274',
    label: 'Decreto 274/008, art. 1: tasa de recargo por mora',
    publisher: 'IMPO',
    url: 'https://www.impo.com.uy/bases/decretos/274-2008',
    seenOn: SEEN,
  },
  {
    id: 'ley-17250-31',
    label: 'Ley 17.250, art. 31 literal I (redacción Ley 20.212): renovación automática',
    publisher: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/31',
    seenOn: SEEN,
  },
  {
    id: 'ursec-baja',
    label:
      'URSEC: ¿Qué hago si el operador de telefonía móvil o la empresa que me brinda internet no me permite dar de baja mi contrato? (30/01/2023)',
    publisher: 'URSEC',
    url: 'https://www.gub.uy/unidad-reguladora-servicios-comunicaciones/institucional/preguntas-frecuentes/hago-operador-telefonia-movil-empresa-me-brinda-internet-me-permite-dar-baja-mi-contrato',
    seenOn: SEEN,
  },
  {
    id: 'ursec-deuda',
    label: 'URSEC: ¿Qué pasa si no puedo pagar una deuda adquirida con una empresa? (30/01/2023)',
    publisher: 'URSEC',
    url: 'https://www.gub.uy/unidad-reguladora-servicios-comunicaciones/institucional/preguntas-frecuentes/pasa-puedo-pagar-deuda-adquirida-empresa',
    seenOn: SEEN,
  },
  {
    id: 'ursec-cambio-plan',
    label:
      'URSEC: ¿Qué pasa si tengo un plan contratado y quiero cambiarlo por otro más beneficioso? (30/01/2023)',
    publisher: 'URSEC',
    url: 'https://www.gub.uy/unidad-reguladora-servicios-comunicaciones/institucional/preguntas-frecuentes/pasa-tengo-plan-contratado-servicio-quiero-cambiarlo-otro-nuevo-me-resulta-beneficioso',
    seenOn: SEEN,
  },
  {
    id: 'ursec-celular',
    label: 'URSEC: ¿Qué hago si tengo inconvenientes con mi celular? (30/01/2023)',
    publisher: 'URSEC',
    url: 'https://www.gub.uy/unidad-reguladora-servicios-comunicaciones/institucional/preguntas-frecuentes/hago-tengo-inconvenientes-mi-celular',
    seenOn: SEEN,
  },
  {
    id: 'ursec-tramite',
    label:
      'Reclamo de los consumidores de servicios de telecomunicaciones y postales (trámite, última actualización 27/07/2026)',
    publisher: 'gub.uy (URSEC)',
    url: 'https://www.gub.uy/tramites/reclamo-consumidores-servicios-telecomunicaciones-postales',
    seenOn: SEEN,
  },
])

const SOURCE_BY_ID: ReadonlyMap<string, FuenteAntel> = new Map(
  ANTEL_DEUDA_SOURCES.map(s => [s.id, s])
)

/** La fuente principal de un hecho, para enlazarla al lado de la respuesta. */
export function fuentePrincipal(hecho: { fuenteIds: readonly string[] }): FuenteAntel | undefined {
  return SOURCE_BY_ID.get(hecho.fuenteIds[0] ?? '')
}

/**
 * Lo que pasa, en el orden en que pasa.
 *
 * El segundo y el tercer renglón son los que la primera versión de la página tenía mal: Antel sí
 * publica cuántas facturas hacen falta (tres escaleras, una por servicio) y publica UN plazo en
 * días, en el tarifario de telefonía fija. Lo que sigue sin publicar es el plazo del móvil para
 * volver después de pagar.
 */
export const SECUENCIA: readonly HechoAntel[] = Object.freeze([
  {
    pregunta: 'Cuando vence la factura y no la pagás',
    respuesta:
      'Caés en mora automáticamente, el mismo día del vencimiento. El reglamento dice "sin necesidad de interpelación judicial o extrajudicial alguna": no hay aviso previo, ni carta, ni llamada que tenga que llegarte antes. Ningún documento de Antel promete un SMS o un correo antes del bloqueo.',
    fuente: 'Reglamento General de Servicios, art. 4.3',
    fuenteIds: ['reglamento'],
  },
  {
    pregunta: 'Cuántas facturas pasan hasta que te bloquean',
    respuesta:
      'Antel lo cuenta en facturas vencidas, no en días, y lo dice en tres documentos distintos según el servicio. Telefonía fija (tarifario vigente desde enero de 2026): la primera factura adeudada sólo genera la multa del 5 % y la segunda impaga bloquea las llamadas salientes de todos tus servicios. Móvil contractual (condiciones de abril de 2023): una factura impaga ya bloquea salientes y dos consecutivas bloquean todo. La tabla general de junio de 2023, hoy retirada del sitio, recién bloqueaba con la segunda vencida. La escalera completa de cada una va en la tabla de abajo.',
    fuente:
      'Boletín de tarifas de telefonía fija, §3.7.2; Condiciones de contratación móvil, apartado VII',
    fuenteIds: ['boletin-fija', 'cond-movil', 'regimen-2023'],
  },
  {
    pregunta: 'El único plazo en días que Antel publica',
    respuesta:
      'Está en el tarifario de telefonía fija: a los 30 días del bloqueo saliente, si no cancelaste toda la deuda vencida, se bloquean todos tus servicios. Para móvil e internet no hay ningún plazo en días publicado, sólo facturas. Cualquier "a los X días del vencimiento" que leas por ahí no sale de un documento de Antel.',
    fuente: 'Boletín de tarifas de telefonía fija, vigencia enero 2026, §3.7.2 literal C',
    fuenteIds: ['boletin-fija'],
  },
  {
    pregunta: 'Qué te bloquean',
    respuesta:
      'El bloqueo puede ser parcial o total de tus servicios, y el reglamento no distingue por producto: alcanza a todos los servicios del cliente, no sólo al que quedó impago. El tarifario de fija lo dice con todas las letras: el bloqueo saliente es "de todos los servicios del cliente". En móvil, bloqueado o cancelado por mora el servicio se comporta como prepago: podés recargar, pero la recarga no se carga en factura.',
    fuente:
      'Reglamento General de Servicios, art. 4.3 inciso b; Boletín de fija §3.7.2 B; tabla de junio 2023, notas (*) y (**)',
    fuenteIds: ['reglamento', 'boletin-fija', 'regimen-2023'],
  },
  {
    pregunta: 'Cuánto se recarga la deuda',
    respuesta:
      'Depende del documento, y son tres fórmulas distintas: el reglamento remite al Código Tributario sin fijar un porcentaje propio; el tarifario de telefonía fija fija una multa del 5 % que sube hasta el 10 % con la segunda factura impaga, más un recargo mensual; y el contrato móvil trae una tasa propia atada a la tasa media del BCU. La tabla de sanciones de abajo las pone una al lado de la otra. En internet, además, el cargo fijo mensual se sigue generando mientras el servicio está suspendido por mora, hasta la supresión definitiva.',
    fuente: 'Reglamento art. 4.3 inciso a; Condiciones de internet, cláusula 6.2',
    fuenteIds: ['reglamento', 'cond-internet', 'boletin-fija', 'cond-movil'],
  },
  {
    pregunta: 'Qué pasa si la deuda sigue',
    respuesta:
      'Se procede a la supresión definitiva de todos los servicios del cliente, sin perjuicio de las acciones legales para cobrar lo adeudado. "Supresión" no es lo mismo que "bloqueo": el servicio se da de baja, no queda esperando. En fija, el tarifario la pone "pasado el 6.º vencimiento" de las facturas impagas; en móvil, la tabla de junio de 2023 la llamaba "cancelación por mora" y conservaba el número como prepago.',
    fuente: 'Reglamento art. 4.3 inciso c; Boletín de fija §3.7.2 D; tabla de junio 2023',
    fuenteIds: ['reglamento', 'boletin-fija', 'regimen-2023'],
  },
  {
    pregunta: 'Cuánto tarda en volver el servicio cuando pagás',
    respuesta:
      'No hay desbloqueo manual: hay que esperar 48 horas hábiles para el servicio fijo y 72 horas para el de internet. Antel lo dice para el caso de quien pagó el mismo día del vencimiento y quedó bloqueado igual, así que el plazo corre aunque el bloqueo haya sido un desencuentro de fechas. No hay cargo de reconexión: ninguno de los tres tarifarios 2026 lista un concepto de rehabilitación, reconexión ni desbloqueo.',
    fuente:
      'Preguntas frecuentes de facturación, "Deudas y bloqueos"; tarifarios 2026 de fija, móvil y datos',
    fuenteIds: ['faq-facturacion', 'tarifarios-2026'],
  },
  {
    pregunta: 'Cuánto tarda en volver el móvil',
    respuesta:
      'Antel no lo publica. Las preguntas frecuentes de facturación dan plazo para el fijo y para internet, y las de telefonía móvil sólo hablan del bloqueo por PIN y PUK o por hurto del equipo, nunca del bloqueo por mora. Lo que un tercero publica como "pocas horas" no sale de un documento de Antel.',
    fuente: 'Preguntas frecuentes de facturación (ausencia verificada el 22/09/2026)',
    fuenteIds: ['faq-facturacion'],
    sinPublicar: true,
  },
])

/** Una escalera de bloqueo por facturas vencidas, tal como la publica un documento de Antel. */
export interface EscaleraAntel {
  id: string
  servicio: string
  documento: string
  /** Si el documento rige hoy o fue retirado del sitio, con la fecha que lo prueba. */
  vigencia: string
  bloqueoSaliente: string
  bloqueoTotal: string
  supresion: string
  fuenteIds: readonly string[]
}

/**
 * Las tres escaleras, una al lado de la otra.
 *
 * No coinciden y las tres son de Antel: la del contrato móvil es la más dura, la del tarifario de
 * fija es la única con un plazo en días y la que más tarda en suprimir (6.º vencimiento), y la
 * tabla general de junio de 2023 ya no está en el sitio (404 el 22/09/2026; Google todavía la
 * indexa). Para internet no hay una
 * escalera propia vigente: el reglamento y las condiciones de internet no cuentan facturas, así que
 * lo único que lo desglosa es la tabla retirada.
 */
export const ESCALERAS: readonly EscaleraAntel[] = Object.freeze([
  {
    id: 'fija',
    servicio: 'Telefonía fija',
    documento: 'Boletín de Tarifas de Servicios Telefónico y Telegráfico, §3.7.2',
    vigencia: 'Vigente: edición enero 2026, enlazada desde el comunicado de tarifas del 23/12/2025',
    bloqueoSaliente:
      '2.ª factura impaga en fecha: bloqueo de llamadas salientes de todos los servicios del cliente. La 1.ª sólo genera la multa del 5 %, "como única sanción", hasta el vencimiento de la siguiente.',
    bloqueoTotal:
      'A los 30 días del bloqueo saliente, si el cliente no canceló toda su deuda vencida. Es el único plazo en días que publica Antel.',
    supresion:
      'Pasado el 6.º vencimiento de las facturas impagas: supresión definitiva de todos los servicios.',
    fuenteIds: ['boletin-fija'],
  },
  {
    id: 'movil',
    servicio: 'Móvil contractual',
    documento: 'Condiciones de Contratación de Servicio de Telefonía Móvil, apartado VII',
    vigencia:
      'Vigente: edición abril 2023, enlazada hoy desde la página de condiciones de antel.com.uy',
    bloqueoSaliente: '1 factura impaga.',
    bloqueoTotal: '2 facturas consecutivas impagas.',
    supresion:
      'O, "en su caso", la rescisión del contrato (apartado XV): suprimido un servicio por mora se suprimen todos los del cliente y los del fiador solidario.',
    fuenteIds: ['cond-movil'],
  },
  {
    id: 'tabla-2023',
    servicio: 'Móvil, fija e internet (tabla general)',
    documento: '"Nuevo régimen de bloqueos y cancelaciones", 1.º de junio de 2023',
    vigencia:
      'Retirada: la página da 404 desde antes del 22/09/2026; última copia viva en Wayback del 11/12/2025, idéntica a la primera del 19/09/2024',
    bloqueoSaliente:
      '2.ª factura vencida. Con la 1.ª no se toman acciones (en fija e internet, salvo la clase de crédito 13).',
    bloqueoTotal: '3.ª factura vencida.',
    supresion:
      '4.ª: cancelación por mora en móvil, conservando el número como prepago; supresión definitiva en fija e internet. 5.ª: cuenta final ("gestión de cobro").',
    fuenteIds: ['regimen-2023'],
  },
])

/** Las sanciones por mora, documento por documento: cada uno trae una fórmula distinta. */
export interface SancionAntel {
  id: string
  documento: string
  multa: string
  recargo: string
  fuenteIds: readonly string[]
}

export const SANCIONES: readonly SancionAntel[] = Object.freeze([
  {
    id: 'fija',
    documento: 'Telefonía fija: Boletín de tarifas, vigencia enero 2026, §3.7.2',
    multa:
      '5 % sobre la primera factura adeudada, "como única sanción", hasta el vencimiento de la siguiente. Si la segunda tampoco se paga en fecha: 5 % sobre el primer importe hasta completar el 10 %, más 5 % sobre lo facturado en esa segunda factura.',
    recargo:
      'Mensual, capitalizable mensualmente, fijado como establece el art. 33 del Código Tributario y calculado sobre el total de la deuda.',
    fuenteIds: ['boletin-fija'],
  },
  {
    id: 'movil',
    documento: 'Móvil contractual: Condiciones de contratación, apartado XV',
    multa:
      'Remite al art. 94 del Código Tributario y al Decreto 274/008: la mora es automática y el pago fuera de fecha "generará multas y recargos" según esas normas.',
    recargo:
      'Fórmula propia: tasa efectiva anual igual a la tasa media trimestral que publica el BCU para grandes y medianas empresas (crédito bancario en pesos, sin reajuste, plazo de un año), incrementada en un 10 %.',
    fuenteIds: ['cond-movil'],
  },
  {
    id: 'reglamento',
    documento: 'Todos los servicios: Reglamento General de Servicios, art. 4.3 inciso a',
    multa: 'Multas y recargos según el Código Tributario, sin porcentaje propio.',
    recargo: 'Idem: remite a la norma, no fija tasa.',
    fuenteIds: ['reglamento'],
  },
  {
    id: 'norma',
    documento: 'La norma a la que remiten: Código Tributario art. 94 y Decreto 274/008',
    multa:
      '5 % si se paga dentro de los 5 días hábiles siguientes al vencimiento; 10 % desde ahí hasta los 90 días corridos; 20 % después. Es la referencia legal, no una fórmula de Antel: el tarifario de fija no llega al 20 %.',
    recargo:
      'Decreto 274/008: tasa mensual, capitalizable cuatrimestralmente, igual a 1,10 × (70 % de la tasa media trimestral del BCU para grandes empresas + 30 % para medianas), redondeada al décimo inferior.',
    fuenteIds: ['ct-art-94', 'decreto-274'],
  },
])

/** Reconexión: lo que pasa entre que pagás y que vuelve el servicio. */
export const RECONEXION: readonly HechoAntel[] = Object.freeze([
  {
    pregunta: 'Fijo: 48 horas hábiles. Internet: 72 horas',
    respuesta:
      '"No se realizan desbloqueos en forma manual": el plazo corre igual aunque hayas pagado el mismo día del vencimiento. Son 48 horas hábiles para el fijo y 72 horas (sin "hábiles") para internet; no se mezclan.',
    fuente: 'Preguntas frecuentes de facturación, "Deudas y bloqueos"',
    fuenteIds: ['faq-facturacion'],
  },
  {
    pregunta: 'Móvil: sin plazo publicado',
    respuesta:
      'Las preguntas frecuentes de móvil no mencionan el bloqueo por mora ni su rehabilitación. Es una ausencia verificada, no un dato.',
    fuente: 'Preguntas frecuentes de facturación y de móvil (leídas el 22/09/2026)',
    fuenteIds: ['faq-facturacion'],
    sinPublicar: true,
  },
  {
    pregunta: 'No hay cargo de reconexión',
    respuesta:
      'Los tres tarifarios 2026 (fija, móvil y datos) no listan ningún concepto de rehabilitación, reconexión ni desbloqueo. Lo que sí listan, para que se vea que se leyeron: chip $65, envío de factura en papel $80, reubicación de la ONT $900 o $3.464. Lo único que paga la mora es la multa y el recargo.',
    fuente: 'Tarifarios 2026 de fija, móvil y datos, enlazados desde el comunicado del 23/12/2025',
    fuenteIds: ['tarifarios-2026', 'tarifario-datos', 'boletin-fija'],
  },
  {
    pregunta: 'La pantalla que ves bloqueado',
    respuesta:
      '"Tu servicio ha sido bloqueado por existir deuda pendiente con Antel. Te solicitamos concurrir al Centro Comercial más próximo a regularizar dicha situación." No dice plazo ni cargo. El plazo está en las preguntas frecuentes de facturación: 48 horas hábiles el fijo y 72 horas internet, sin desbloqueo manual.',
    fuente: 'Pantalla "Bloqueo por mora" de los accesos a internet',
    fuenteIds: ['bloqueo-mora', 'faq-facturacion'],
  },
  {
    pregunta: 'Convenio de pago',
    respuesta:
      'Se hacen en los locales habilitados para esa gestión o en MiAntel; no todos los locales atienden facturación, así que conviene verificarlo en el detalle del local. URSEC aclara que, si la deuda es reconocida, la empresa no tiene obligación legal de perdonarla ni de ofrecer facilidades: el convenio es un acuerdo, no un derecho.',
    fuente: 'Preguntas frecuentes de facturación; URSEC, "¿Qué pasa si no puedo pagar una deuda…?"',
    fuenteIds: ['faq-facturacion', 'ursec-deuda'],
  },
  {
    pregunta: 'El cargo fijo sigue corriendo mientras estás bloqueado',
    respuesta:
      'En internet, el cargo fijo mensual "se generará hasta la supresión definitiva del servicio", también en los períodos suspendidos por mora. Cada mes bloqueado sin pagar es un mes más de deuda.',
    fuente: 'Condiciones de Contratación de Internet, cláusula 6.2',
    fuenteIds: ['cond-internet'],
  },
])

/** Los plazos de permanencia que Antel imprime en la tienda y en el tarifario. */
export interface PlazoContratoAntel {
  id: string
  plan: string
  plazo: string
  /** Mensualidad publicada en el tarifario Datos 2026, si figura. */
  precio: string
  fuenteIds: readonly string[]
}

export const PLAZOS_CONTRATO: readonly PlazoContratoAntel[] = Object.freeze([
  {
    id: 'fibra-basico',
    plan: 'Fibra Básico (400/30 Mbps, 500 GB)',
    plazo: '2 años',
    precio: '$1.650 por mes',
    fuenteIds: ['tienda-fibra-basico', 'tarifario-datos'],
  },
  {
    id: 'fibra-plus',
    plan: 'Fibra Plus (550/40 Mbps, 650 GB)',
    plazo: '2 años',
    precio: '$2.138 por mes',
    fuenteIds: ['tarifario-datos'],
  },
  {
    id: 'fibra-temporada',
    plan: 'Fibra Temporada',
    plazo: '12 meses',
    precio: 'según la tienda',
    fuenteIds: ['tienda-fibra-temporada'],
  },
  {
    id: 'fibra-limite',
    plan: 'Fibra en tu hogar con límite 1',
    plazo: '24 meses',
    precio: 'según la tienda',
    fuenteIds: ['tienda-fibra-limite'],
  },
  {
    id: 'movil-40-gigas',
    plan: '40 Gigas con límite (móvil)',
    plazo: '2 años',
    precio: 'según la tienda',
    fuenteIds: ['tienda-40-gigas'],
  },
])

/** Cuándo vence el contrato, cómo saberlo y qué pasa al vencer. */
export const CONTRATO: readonly HechoAntel[] = Object.freeze([
  {
    pregunta: 'Dónde está la fecha exacta',
    respuesta:
      'En tu copia del contrato: fecha de firma más el plazo. URSEC dice que tenés derecho a exigir tu ejemplar y, si lo perdiste, a pedir copia en una sucursal del operador o a que te exhiban el del proveedor. Mirá la fecha de contratación, el plazo, la cláusula de preaviso y la forma exigida para pedir la baja.',
    fuente: 'URSEC, preguntas frecuentes sobre baja de contrato (30/01/2023)',
    fuenteIds: ['ursec-baja'],
  },
  {
    pregunta: 'MiAntel no lo muestra',
    respuesta:
      'La ficha oficial de la app enumera lo que hace: consultar saldo, ver el consumo, ver cuándo vence una FACTURA y el monto a pagar, canjear beneficios y entrar a la tienda. No menciona el plazo contractual ni la permanencia. Por teléfono, la única vía publicada es para la factura: 123 opción 1 "Facturación" para importe, mes y día de vencimiento en fija y datos; *611 o 0800 6611 en móvil. Para la fecha del contrato no hay un canal publicado: es la copia del contrato o un Centro Comercial.',
    fuente: 'MiAntel, ficha oficial de la app; Preguntas frecuentes de facturación',
    fuenteIds: ['miantel', 'faq-facturacion'],
  },
  {
    pregunta: 'Qué pasa cuando vence y no renovás',
    respuesta:
      'Nada se corta. En internet, "vencido el mismo, se seguirá brindando el servicio en las mismas condiciones ya establecidas", salvo comunicación por escrito de cualquiera de las partes (los servicios provisorios son la excepción). En móvil, Antel "podrá proponer" una renovación por igual plazo antes del vencimiento, y vencido el plazo podés seguir o rescindir en cualquier momento pagando sólo los cargos generados, sin indemnización.',
    fuente: 'Condiciones de internet, cláusula 10; Condiciones móvil, apartado IX',
    fuenteIds: ['cond-internet', 'cond-movil'],
  },
  {
    pregunta: 'Por qué Antel llama cuando vence',
    respuesta:
      'Porque las promociones de renovación exigen estar "fuera del plazo contractual" y "sólo se pueden renovar planes comercializables": la bonificación no se renueva sola, hay que firmar de nuevo. En móvil, el 20 % de descuento por 12 meses al renovar aplica sólo si pasás a un plan de mayor valor. Y con contrato vigente, URSEC recuerda que la empresa no está obligada a cambiarte a un plan más beneficioso.',
    fuente:
      'Tienda en línea, Fibra Básico y 40 Gigas con límite; URSEC, cambio de plan (30/01/2023)',
    fuenteIds: ['tienda-fibra-basico', 'tienda-40-gigas', 'ursec-cambio-plan'],
  },
  {
    pregunta: 'Los dos cargos por cambiar de plan que sí están publicados',
    respuesta:
      'El tarifario Datos 2026 lista "Cambio de producto" a $778, que aplica "para cambios hacia planes de menor valor desde contratos vigentes habiendo sido alcanzados por las promociones de renovación", y "Cambio de producto Renovación" a $5.500. La regla exacta de ese segundo cargo no se puede leer: remite a una nota (***) que el PDF no imprime. El monto está publicado; la condición, no.',
    fuente: 'Precios generales Datos 2026, "Otras tarifas"',
    fuenteIds: ['tarifario-datos'],
  },
  {
    pregunta: 'Si el contrato se renovó solo',
    respuesta:
      'La Ley 17.250 (art. 31 literal I, redacción de 2023) te da 60 días corridos desde la renovación automática para rescindir, y el proveedor tiene como máximo 15 días corridos para procesar la baja. Ojo con la vía: las condiciones de Antel no hablan de renovación automática sino de continuidad "en las mismas condiciones" (internet) o de una renovación que Antel "podrá proponer" (móvil). Si no hubo renovación por un nuevo plazo, no hacen falta los 60 días: en móvil se rescinde en cualquier momento sin indemnización y en internet basta comunicarlo por escrito.',
    fuente:
      'Ley 17.250, art. 31 lit. I; URSEC, baja de contrato (30/01/2023); Condiciones de internet cl. 10 y móvil ap. IX',
    fuenteIds: ['ley-17250-31', 'ursec-baja', 'cond-internet', 'cond-movil'],
  },
])

/** Lo que hay que saber antes de dar de baja antes de tiempo, con o sin deuda encima. */
export const RESCISION: readonly HechoAntel[] = Object.freeze([
  {
    pregunta: 'Internet: todas las mensualidades que falten',
    respuesta:
      'Si rescindís antes de cumplido el plazo original, "deberá abonar la totalidad de las mensualidades que resten hasta la fecha de finalización de dicho plazo". No es un porcentaje ni una parte proporcional: es el saldo entero del contrato.',
    fuente: 'Condiciones de Contratación de Internet, cláusula 11.1',
    fuenteIds: ['cond-internet'],
  },
  {
    pregunta: 'Internet: más la conexión que no pagaste al contratar',
    respuesta:
      'Si elegiste no abonar los gastos de conexión al contratar, se pagan en la rescisión, sin importar cuánto tiempo pasó. El tarifario Datos 2026 los pone en $1.556 (conexión de servicio de datos), $0 si contrataste por canales digitales y $778 si ya tenías teléfono fijo y pediste datos en la misma tecnología.',
    fuente: 'Condiciones de internet, cláusula 11.2; Precios generales Datos 2026',
    fuenteIds: ['cond-internet', 'tarifario-datos'],
  },
  {
    pregunta: 'Internet: la baja es presencial y con el equipo',
    respuesta:
      'Se rescinde en un Centro Comercial de Antel devolviendo el equipamiento entregado al conectar. Para el equipo en comodato (la ONT o el módem) hay 30 días corridos desde el día siguiente a la supresión; si no lo devolvés a tiempo o está dañado, se factura el 100 % del precio de reposición con impuestos.',
    fuente: 'Condiciones de internet, cláusulas 11.3 y 2.7',
    fuenteIds: ['cond-internet'],
  },
  {
    pregunta: 'Móvil: meses restantes por la tarifa mensual',
    respuesta:
      'La indemnización es "el número de meses y/o fracción que resten para el vencimiento" multiplicado por la tarifa mensual contratada, con todos los conceptos fijos, vigente al momento de rescindir. Si el equipo fue gratis o bonificado, además se reintegra la cuota parte del beneficio pendiente de amortizar, también si cambiás a un plan sin ese beneficio.',
    fuente: 'Condiciones móvil, apartados X y XI',
    fuenteIds: ['cond-movil'],
  },
  {
    pregunta: 'Portar el número a otra compañía no esquiva la permanencia',
    respuesta:
      'Antes de portar hay que cumplir "todas las obligaciones contractuales", incluidas las que nacen de incumplir la permanencia mínima y las de pago; lo no vencido se vuelve exigible con la baja. Portar además hace perder la antigüedad en Antel.',
    fuente: 'Condiciones móvil, apartado XIX',
    fuenteIds: ['cond-movil'],
  },
  {
    pregunta: 'Si Antel deja de vender tu plan',
    respuesta:
      'Cuando el servicio contratado "no se comercializa más" y no optás por otro, Antel puede rescindir con un aviso previo de al menos 30 días, exigiendo los gastos de conexión de la cláusula 11.2 si no se pagaron.',
    fuente: 'Condiciones de internet, cláusula 11.5',
    fuenteIds: ['cond-internet'],
  },
])

/**
 * El registro de morosos de Antel, que no es el Clearing.
 *
 * Se separa porque es la confusión más común y la más cara: alguien supone que una deuda con Antel
 * le arruina el crédito en todos lados, o al revés, que estar limpio en el Clearing le alcanza para
 * contratar. El reglamento describe un registro PROPIO de la empresa y no menciona en ningún lado
 * al Clearing de Informes ni a ningún buró externo.
 */
export const REGISTRO_MOROSOS: readonly HechoAntel[] = Object.freeze([
  {
    pregunta: '¿Antel te manda al Clearing?',
    respuesta:
      'El reglamento describe un registro propio: "la Empresa llevará un registro de quienes mantengan deuda con plazo vencido". No menciona al Clearing de Informes ni a ningún buró externo. Lo que sí dice es qué hace con ese registro propio.',
    fuente: 'Reglamento General de Servicios, art. 4.4',
    fuenteIds: ['reglamento'],
  },
  {
    pregunta: '¿Podés contratar otro servicio con deuda?',
    respuesta:
      'No, mientras la deuda no esté cancelada con sus intereses moratorios, y es requisito para tramitar cualquier solicitud. La tienda en línea lo afina: para un móvil nuevo no puede haber facturas impagas a la fecha de vencimiento en ninguna línea de negocio, y un cliente con 12 meses o más de antigüedad y una sola factura vencida sólo accede a prepago y a un servicio con límite sin ayuda económica.',
    fuente: 'Reglamento, arts. 4.4 y 5.5; Tienda en línea, controles de viabilidad',
    fuenteIds: ['reglamento', 'tienda-viabilidad'],
  },
  {
    pregunta: 'La deuda queda pegada a la dirección, no sólo a la persona',
    respuesta:
      'Antel puede tomar medidas preventivas para adjudicar servicios en direcciones donde existen antecedentes de morosidad. O sea que la deuda del inquilino anterior puede complicarle la contratación al que llega después.',
    fuente: 'Reglamento General de Servicios, art. 4.4',
    fuenteIds: ['reglamento'],
  },
  {
    pregunta: 'La deuda del móvil se puede facturar en tu fijo',
    respuesta:
      'Si sos titular de un servicio fijo de Antel, el contrato móvil te hace autorizar que, ante falta de pago, los cargos se facturen en cualquiera de tus otros servicios, o en los del fiador solidario. El depósito en efectivo, si lo hubo, se devuelve al suprimir el servicio sin deuda.',
    fuente: 'Condiciones móvil, apartado XIII',
    fuenteIds: ['cond-movil'],
  },
])

/**
 * Lo que se puede reclamar, que casi nadie reclama.
 *
 * Va en la página porque quien la busca ya tiene un problema con Antel, y esto es lo único que
 * juega para su lado. El reintegro por interrupción NO es automático: sale a solicitud.
 */
export const A_FAVOR_DEL_CLIENTE: readonly HechoAntel[] = Object.freeze([
  {
    pregunta: 'Si internet se cortó 12 horas o más por causa de Antel',
    respuesta:
      'Corresponde el reintegro proporcional del cargo fijo mensual por el período que el servicio estuvo interrumpido. Es a solicitud del cliente y previa verificación: si no lo pedís, no llega solo.',
    fuente: 'Condiciones de Contratación de Internet, cláusula 2.6',
    fuenteIds: ['cond-internet'],
  },
  {
    pregunta: 'Si el móvil falló más de 6 horas',
    respuesta:
      'Con fallas superiores a seis horas sin culpa del cliente ni de terceros, Antel concede un crédito proporcional sobre todos los cargos fijos del servicio, "a solicitud expresa del Cliente ratificado por las oficinas de ANTEL". Tampoco llega solo.',
    fuente: 'Condiciones móvil, apartado III',
    fuenteIds: ['cond-movil'],
  },
  {
    pregunta: 'Reclamar por un corte, a cualquier hora',
    respuesta:
      'Al 121 desde un fijo o desde un móvil de otra compañía, o al *121 desde un móvil Antel. Las condiciones de internet obligan a Antel a tener ese servicio de recepción de reclamos por interrupciones "los 365 días del año, las 24 horas del día".',
    fuente: 'Preguntas frecuentes de telefonía fija; Condiciones de internet, cláusula 7.1',
    fuenteIds: ['faq-fija', 'cond-internet'],
  },
  {
    pregunta: 'Si Antel cambia el reglamento',
    respuesta:
      'Tenés 30 días corridos desde su publicación en el Diario Oficial para optar por la supresión del servicio. El reglamento no dice qué pasa con la permanencia en ese caso.',
    fuente: 'Reglamento General de Servicios, art. 1.2',
    fuenteIds: ['reglamento'],
  },
])

/** Un paso del reclamo, de Antel a URSEC. */
export interface PasoReclamoAntel {
  id: string
  titulo: string
  detalle: string
  fuente: string
  fuenteIds: readonly string[]
}

export const RECLAMO: readonly PasoReclamoAntel[] = Object.freeze([
  {
    id: 'antel',
    titulo: 'Primero Antel, por el canal que corresponde',
    detalle:
      'Corte o avería: 121 desde un fijo o un móvil de otra compañía, *121 desde un móvil Antel, las 24 horas. Comercial y facturación: 123 o *123, de lunes a viernes de 9 a 21 y sábados de 9 a 15; el 123 opción 1 "Facturación" informa importe y vencimiento de la factura fija o de datos. Móvil: *611 o 0800 6611. WhatsApp de Antel: 092 611 611. Guardá el número de reclamo.',
    fuente:
      'Preguntas frecuentes de telefonía fija y de facturación; Condiciones de internet, cláusula 7.1',
    fuenteIds: ['faq-fija', 'faq-facturacion', 'cond-internet'],
  },
  {
    id: 'ursec',
    titulo: 'Después URSEC: el trámite es gratis y se hace en línea',
    detalle:
      '"Reclamo de los consumidores de servicios de telecomunicaciones y postales", sin costo. En línea desde el botón "Iniciar trámite en línea" de gub.uy o presencial con agenda en Av. Uruguay 988, Montevideo, de lunes a viernes de 9:15 a 15:15. Requisitos: presentar el contrato y tener un correo electrónico, que es el medio de comunicación del expediente. Consultas: 2902 8082, 0800 1872 o WhatsApp 091 671 177. Marco: Ley 17.250 y Decreto 244/000. Última actualización del trámite: 27/07/2026.',
    fuente: 'gub.uy, trámite de reclamo ante URSEC (actualizado 27/07/2026)',
    fuenteIds: ['ursec-tramite'],
  },
  {
    id: 'servicio-o-equipo',
    titulo: 'URSEC es por el servicio; por el equipo va Defensa del Consumidor',
    detalle:
      'Facturación distinta de lo contratado, baja que no procesan, portación, roaming o publicidad engañosa: URSEC. Si el problema es el equipo (rotura sin garantía, demoras en la reparación), va a la Unidad de Defensa del Consumidor del Ministerio de Economía y Finanzas.',
    fuente: 'URSEC, "¿Qué hago si tengo inconvenientes con mi celular?" (30/01/2023)',
    fuenteIds: ['ursec-celular'],
  },
  {
    id: 'limites',
    titulo: 'Lo que URSEC no puede hacer por vos',
    detalle:
      'Si la deuda es reconocida, no existe obligación legal de que la empresa la perdone en todo o en parte ni de que ofrezca un régimen de facilidades: URSEC aconseja acordar directamente. Y con contrato vigente, la empresa tampoco está obligada a pasarte a un plan más beneficioso, aunque siempre podés pedirlo.',
    fuente: 'URSEC, preguntas frecuentes sobre deuda y sobre cambio de plan (30/01/2023)',
    fuenteIds: ['ursec-deuda', 'ursec-cambio-plan'],
  },
])

/** Contexto que explica los hilos de Reddit donde "a nadie le cortan": ya no rige. */
export const ANTECEDENTE_COVID: HechoAntel = Object.freeze({
  pregunta: 'Entre setiembre de 2020 y mayo de 2023 no hubo cortes',
  respuesta:
    'Por la pandemia, Antel habilitó el uso de los servicios con deuda en un Régimen Activo Especial. Terminó en mayo de 2023: desde el 1.º de junio de 2023 la deuda de ese período se financió sola en 24 cuotas sin multas ni recargos, con el servicio rehabilitado al pagar la primera. Un testimonio de esos años que cuente que "no cortan" describe ese régimen, no el actual.',
  fuente: 'Antel, Régimen Activo Especial para servicios de telefonía móvil',
  fuenteIds: ['rae'],
})

export interface FaqEntryAntel {
  id: string
  question: string
  answer: string
}

/** Las preguntas son las que sugiere el autocompletado uruguayo, no las que se nos ocurrieron. */
export const ANTEL_DEUDA_FAQ: readonly FaqEntryAntel[] = Object.freeze([
  {
    id: 'no-pago',
    question: '¿Qué pasa si no pago la factura de Antel?',
    answer:
      'Caés en mora automáticamente el día del vencimiento, sin aviso previo: el Reglamento General de Servicios (art. 4.3) dice que no hace falta ninguna interpelación. A partir de ahí corren multas y recargos, Antel bloquea parcial o totalmente tus servicios y, si la deuda sigue, procede a la supresión definitiva de todos ellos. En internet el cargo fijo se sigue facturando mientras estás bloqueado (cláusula 6.2), y con deuda vencida Antel no te adjudica otros servicios (art. 4.4).',
  },
  {
    id: 'cuando-corta',
    question: '¿Cuándo te corta Antel el servicio por falta de pago?',
    answer:
      'Antel lo cuenta en facturas vencidas, no en días. Telefonía fija (tarifario vigente desde enero de 2026): la primera factura adeudada sólo genera la multa del 5 %, la segunda impaga bloquea las llamadas salientes de todos tus servicios, a los 30 días de ese bloqueo se bloquea todo y pasado el sexto vencimiento se suprime. Móvil contractual (condiciones de abril de 2023): una factura impaga bloquea salientes y dos consecutivas bloquean todo. La tabla general que Antel publicó el 1.º de junio de 2023, hoy retirada de su sitio, recién bloqueaba con la segunda vencida, bloqueaba todo con la tercera y cancelaba con la cuarta. Ningún documento de Antel promete un aviso por SMS o correo antes.',
  },
  {
    id: 'reconectar',
    question: '¿Cuánto demora Antel en reconectar el internet después de pagar?',
    answer:
      'Setenta y dos horas para internet y 48 horas hábiles para el servicio fijo. Antel aclara en sus preguntas frecuentes de facturación que no se hacen desbloqueos manuales, así que el plazo corre igual aunque hayas pagado el mismo día del vencimiento. Para el móvil no publica plazo. No hay cargo de reconexión: ninguno de los tres tarifarios 2026 (fija, móvil, datos) lista un concepto de rehabilitación o desbloqueo.',
  },
  {
    id: 'vence-contrato',
    question: '¿Cómo sé cuándo vence mi contrato con Antel?',
    answer:
      'En tu copia del contrato: fecha de firma más el plazo. Fibra Básico, Fibra Plus y el plan móvil 40 Gigas con límite se venden "a 2 años" (tienda y tarifario Datos 2026); Fibra Temporada a 12 meses y Fibra con límite 1 a 24 meses. URSEC dice que tenés derecho a exigir tu ejemplar y, si lo perdiste, a que te lo exhiban en un local. La app MiAntel muestra saldo, consumo y vencimiento de la factura, no la fecha de fin del contrato. Vencido el plazo nada se corta: internet sigue en las mismas condiciones y en móvil podés seguir o irte sin indemnización.',
  },
  {
    id: 'baja-anticipada',
    question: '¿Cuánto cuesta dar de baja Antel antes de que termine el plazo?',
    answer:
      'En internet, la totalidad de las mensualidades que resten hasta el fin del plazo (cláusula 11.1), más los gastos de conexión si no los pagaste al contratar ($1.556 en el tarifario Datos 2026, $0 si contrataste en línea). En móvil, los meses restantes multiplicados por la tarifa mensual con todos los conceptos fijos (apartado X), más la parte no amortizada del descuento del equipo si fue bonificado (apartado XI). La baja de internet es presencial en un Centro Comercial devolviendo el módem, con 30 días corridos para entregarlo o se cobra el 100 % del precio de reposición.',
  },
])
