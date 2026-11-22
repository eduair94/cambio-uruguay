// El Usuario personal BPS: qué es, dónde se saca, cómo se activa y qué hacer cuando no entra.
//
// Catálogo puro (sin imports de Vue/Nuxt) que compone la guía `/guias/usuario-personal-bps-uruguay`,
// igual que `historiaLaboral.ts` compone la de la historia laboral: los requisitos, los plazos y
// los nombres de los servicios viven acá y la guía los redacta, así que no hay un segundo literal
// que pueda separarse del primero.
//
// POR QUÉ ESTA GUÍA. Media docena de páginas del sitio mandan al lector a hacer algo «con tu
// Usuario personal BPS» —bajar la historia laboral, ver los recibos de cobro, la devolución de
// FONASA, los certificados— y ninguna explicaba cómo se saca. El autocompletado uruguayo lo pide
// con esas palabras («cómo realizar usuario bps», «servicios en línea bps», «servicios en línea
// dgi») y el sitio no aparecía.
//
// LO QUE CAMBIA LA RESPUESTA, y que no dice ninguna de las páginas que lo mencionan: el Usuario
// personal BPS NO se saca por internet (la ficha del BPS dice «Modalidad: Presencial»), pero el
// portal web del BPS ofrece hoy, en su propia pantalla de ingreso, una segunda puerta: «Ingresar
// con Cédula Electrónica o Usuario gub.uy», que lleva a ID Uruguay. Y el Usuario gub.uy se puede
// llevar a nivel intermedio —el que AGESIC dice que piden los trámites del BPS y de la DGI— por
// videollamada, sin moverte de tu casa. La app BPS Personas, en cambio, pide en su ficha de la
// tienda «usuario y contraseña de los servicios en línea».
//
// REGLA DE ESTE ARCHIVO, la misma que `historiaLaboral.ts`: cada requisito, plazo y nombre de
// servicio sale de una fuente oficial leída el día de `UBPS_VERIFIED_AT`, y va con su cita. Lo
// que el BPS no publica no se publica acá: la ficha del trámite no dice cuánto cuesta ni cuánto
// tarda en llegar el correo de activación, y ninguna página del BPS dice cuántos intentos
// fallidos bloquean el usuario. Esos tres huecos se declaran en `UBPS_GAPS`.

/** Día en que se leyeron todas las fuentes de este archivo. */
export const UBPS_VERIFIED_AT = '2026-11-22'

// ---------------------------------------------------------------------------
// Activación (BPS 18292, «Luego de solicitar el Usuario personal BPS, ¿qué pasos debo seguir?»,
// última actualización 17/03/2026, leída el 2026-11-22)
// ---------------------------------------------------------------------------

/**
 * Días de validez del enlace de activación que llega al correo declarado.
 *
 * Textual: «Este enlace tiene una validez de 30 días, pasado ese plazo deberá iniciar la
 * solicitud nuevamente».
 */
export const UBPS_ACTIVATION_LINK_DAYS = 30

/** Días de validez del código que llega por SMS. Textual: «Este código tiene una validez de 10 días». */
export const UBPS_SMS_CODE_DAYS = 10

/** Cuántas veces se puede pedir ese código. Textual: «podrá solicitarlo hasta 3 veces». */
export const UBPS_SMS_CODE_MAX_REQUESTS = 3

export interface UbpsActivationStep {
  readonly name: string
  readonly text: string
  /** El paso sólo existe si el celular declarado es uruguayo (pasos 2 y 3 de la ficha). */
  readonly onlyUruguayanPhone: boolean
}

/**
 * Los cinco pasos de la ficha 18292, en su orden.
 *
 * «A tener en cuenta: Los pasos 2 y 3 solo aplican cuando el celular declarado es uruguayo. En el
 * caso de los celulares extranjeros, va directo del paso 1 al 4.»
 */
export const UBPS_ACTIVATION_STEPS: readonly UbpsActivationStep[] = Object.freeze([
  {
    name: 'Abrí el enlace del correo',
    text: `Te llega al correo que declaraste un enlace a la web del BPS para activar el usuario. Vale ${UBPS_ACTIVATION_LINK_DAYS} días; si no lo ves, buscalo en correo no deseado o spam.`,
    onlyUruguayanPhone: false,
  },
  {
    name: 'Pedí el código por SMS',
    text: `Con el botón «Solicitar» te llega un código al celular que declaraste. Vale ${UBPS_SMS_CODE_DAYS} días y lo podés pedir hasta ${UBPS_SMS_CODE_MAX_REQUESTS} veces.`,
    onlyUruguayanPhone: true,
  },
  {
    name: 'Ingresá el código y validalo',
    text: 'Escribí el código en el campo que aparece y tocá «Validar».',
    onlyUruguayanPhone: true,
  },
  {
    name: 'Aceptá los términos y condiciones',
    text: 'Marcá el cuadro de los términos y condiciones y tocá «Aceptar».',
    onlyUruguayanPhone: false,
  },
  {
    name: 'Creá la contraseña',
    text: 'Te llega un segundo correo con un enlace nuevo para generar tu contraseña. Con eso el usuario queda pronto.',
    onlyUruguayanPhone: false,
  },
])

// ---------------------------------------------------------------------------
// Dónde se saca (BPS 11444, «Solicitar Usuario personal BPS», última actualización 17/03/2026,
// leída el 2026-11-22). Modalidad: «Presencial».
// ---------------------------------------------------------------------------

/**
 * Los agentes externos donde puede ir un mayor de edad, tal como los nombra la ficha vigente:
 * «Podrán presentarse en Abitab, Red pagos, Anda o sucursales de BPS».
 *
 * Una nota del BPS del 9/1/2024 («Gestioná el Usuario Personal BPS», 21342) nombraba además
 * locales del Correo Uruguayo y de Polakof (El Dorado), «más de 500 locales disponibles en todo el
 * país». La ficha del trámite, que es posterior (17/03/2026), ya no los nombra, así que la lista
 * publicada es la de la ficha y la diferencia se dice en la guía.
 */
export const UBPS_EXTERNAL_AGENTS: readonly string[] = Object.freeze([
  'Abitab',
  'Red Pagos',
  'ANDA',
])

/** Los dos que la nota de 2024 agregaba y la ficha vigente no nombra. */
export const UBPS_AGENTS_ONLY_IN_2024_NOTE: readonly string[] = Object.freeze([
  'los locales del Correo Uruguayo',
  'Polakof (El Dorado)',
])

/** Lo que piden a un mayor de edad, textual de la ficha 11444. */
export const UBPS_ADULT_REQUIREMENTS: readonly string[] = Object.freeze([
  'Cédula de identidad vigente y en buen estado',
  'Un correo electrónico en uso que no esté asociado a otro usuario',
  'Un número de celular',
])

/**
 * La edad que la ficha nombra para que un menor vaya solo. Textual: «salvo mayores de 15 años
 * quienes podrán concurrir solos». Se publica con las mismas palabras («mayores de 15 años») y no
 * como «desde los 15», porque la ficha no aclara si los 15 cuentan.
 */
export const UBPS_MINOR_ALONE_OVER_AGE = 15

export type UbpsCondicion = 'mayor' | 'extranjero' | 'menor' | 'apoderado' | 'tercero' | 'exterior'

export interface UbpsRoute {
  readonly condicion: UbpsCondicion
  /** Quién sos, en palabras del lector. */
  readonly quien: string
  /** Dónde se hace. */
  readonly donde: string
  /** Qué llevás. */
  readonly que: string
}

/**
 * Las vías de la ficha 11444, una por condición, en el orden en que la ficha las despliega.
 *
 * El extranjero no es una vía aparte en la ficha —está dentro de «Personas mayores de edad»—, pero
 * va en su propia fila porque cambia el documento y, si no tiene ninguno registrado, el lugar.
 */
export const UBPS_ROUTES: readonly UbpsRoute[] = Object.freeze([
  {
    condicion: 'mayor',
    quien: 'Mayor de edad con cédula uruguaya',
    donde: `${UBPS_EXTERNAL_AGENTS.join(', ')} o una sucursal del BPS`,
    que: 'Cédula vigente y en buen estado, un correo en uso que no esté asociado a otro usuario y un número de celular',
  },
  {
    condicion: 'extranjero',
    quien: 'Extranjero sin cédula uruguaya',
    donde: 'Los mismos lugares; si no tenés ningún documento registrado en el BPS, sólo en el BPS',
    que: 'El documento o pasaporte con el que estás registrado en el BPS, más el correo y el celular',
  },
  {
    condicion: 'menor',
    quien: `Menor de edad (los mayores de ${UBPS_MINOR_ALONE_OVER_AGE} años pueden ir solos)`,
    donde: 'Sólo en sucursales del BPS',
    que: 'La cédula del menor y la del padre o madre que lo acompañe (con patria potestad registrada), más el correo y el celular',
  },
  {
    condicion: 'apoderado',
    quien: 'Apoderado con facultad general registrado en el BPS, o tutor o curador definitivo',
    donde: 'Sucursales del BPS',
    que: 'Cédula vigente, correo y celular; firma el contrato en nombre del titular',
  },
  {
    condicion: 'tercero',
    quien: 'Otra persona que no es apoderada',
    donde: 'Sucursales del BPS',
    que: 'El formulario de solicitud firmado por el titular con certificación notarial de la firma, copia del documento del titular y su propio documento, original y copia',
  },
  {
    condicion: 'exterior',
    quien: 'Vivís fuera de Uruguay',
    donde:
      'Un consulado uruguayo habilitado; si no hay uno en tu región, un tercero lo presenta en el BPS',
    que: 'El documento con el que estás registrado en el BPS (si venció, además uno vigente); sin consulado, el formulario con firma certificada y apostillada o legalizada, en original impreso',
  },
])

/**
 * El horario de las oficinas del BPS, del pie de la misma ficha: «Atención presencial · Lunes a
 * viernes de 09:15 a 16:00 h».
 */
export const UBPS_OFFICE_HOURS = 'de lunes a viernes, de 9:15 a 16:00'

/**
 * Sin cita en Montevideo. El buscador «Horarios y lugares disponibles» que la ficha 11444 trae
 * embebido (app2.bps.gub.uy/vintra-frontend, idTramite=11444) marca cada oficina de Montevideo
 * para este trámite con «Este lugar no requiere reservar cita» —el Edificio Sede (Colonia 1851,
 * Informes, planta baja), el Edificio Nuevo, ATYR Sarandí 570 y las sucursales Belvedere, Unión,
 * Aparicio Saravia, Cerro, Sayago y Colón—. Se leyó Montevideo y no las 120 oficinas del
 * interior, así que la guía lo afirma sólo para Montevideo.
 */
export const UBPS_MONTEVIDEO_NO_APPOINTMENT = true

/** Teléfonos del BPS, del pie de la ficha: lunes a viernes de 8 a 18 h. */
export const UBPS_PHONES = Object.freeze({
  celular: '*1997',
  fijo: '0800 1997',
  exterior: '+598 1997 0000',
  horario: 'de lunes a viernes, de 8 a 18',
})

/**
 * La casilla de soporte de los servicios en línea, del pie del portal y de la página «Asistencia
 * a los usuarios» (BPS 12138): «podrán solicitar asistencia por los canales habituales o por
 * email a la casilla csei_csu@bps.gub.uy».
 */
export const UBPS_SUPPORT_EMAIL = 'csei_csu@bps.gub.uy'

// ---------------------------------------------------------------------------
// Para qué sirve
// ---------------------------------------------------------------------------

/**
 * Lo que habilita, según el BPS. Cada ítem dice de qué página sale:
 * - 11444: «Es un usuario único e intransferible para cada persona física que permite acceder a
 *   los servicios en línea que requieren registro».
 * - 9170: «Los servicios destinados a los trabajadores, jubilados y pensionistas quedan
 *   habilitados automáticamente en el momento que se registran».
 * - 21342 (nota del 9/1/2024): información personal, iniciar el trámite jubilatorio, subsidio de
 *   paternidad y medio horario, vínculos familiares, trámites a distancia, consultas; para
 *   jubilados y pensionistas, turismo social, simulador de préstamos y recibos de pasividad.
 * - 11438: la constancia de historia laboral se baja de «Consultar mis aportes» con el usuario.
 * - 12728: los recibos de cobro se ven en la web y en la app con el usuario, y además «se envían
 *   automáticamente al correo asociado a su Usuario personal».
 */
export const UBPS_SERVICES: readonly string[] = Object.freeze([
  'Bajar la constancia de tu historia laboral, en «Consultar mis aportes»',
  'Ver y descargar tus recibos de cobro, que además te llegan al correo asociado al usuario',
  'Iniciar el trámite jubilatorio',
  'Pedir el subsidio por paternidad y el medio horario',
  'Consultar tus vínculos familiares y tu información personal registrada',
  'Ingresar trámites a distancia y hacer consultas',
  'Reservar turismo social y usar el simulador de préstamos, si sos jubilado o pensionista',
])

/**
 * Lo que hace la app BPS Personas, textual de «Aplicaciones móviles» (BPS 10004, última
 * actualización 10/09/2025).
 */
export const UBPS_APP_FEATURES: readonly string[] = Object.freeze([
  'Acceder a tu Identidad de Seguridad Social',
  'Ver tu información personal registrada en el BPS',
  'Consultar y descargar recibos de cobro',
  'Consultar tu vida laboral y el detalle de tus actividades',
  'Emitir y descargar constancias',
  'Recibir notificaciones de vencimientos y de gestiones de prestaciones',
  'Simular un cálculo jubilatorio estimado',
  'Reservar derecho para el reconocimiento de años trabajados',
  'Rehabilitar cobros caducados',
  'Gestionar préstamos sociales',
])

/**
 * Lo que pide la app para entrar, de su ficha en Google Play (desarrollador: Banco de Previsión
 * Social), leída el 2026-11-22: «Para acceder a este servicio es requisito contar con usuario y
 * contraseña de los servicios en línea». La guía no dice que la app acepte ID Uruguay porque su
 * ficha no lo dice.
 */
export const UBPS_APP_LOGIN = 'usuario y contraseña de los servicios en línea'

// ---------------------------------------------------------------------------
// Contraseña, correo y baja
// ---------------------------------------------------------------------------

/**
 * Horas de vigencia del enlace para restablecer la contraseña.
 *
 * Sale del propio formulario del BPS: «Olvidé mi contraseña» en el portal abre el servicio
 * «Restablecer mi contraseña» (serviciosenlinea.bps.gub.uy, id 8792), cuya pantalla de
 * confirmación dice «Recuerde que el enlace tiene una vigencia de 24hs, vencido el plazo deberá
 * realizar una nueva solicitud». Leído el 2026-11-22 en el texto que el formulario publica.
 */
export const UBPS_RESET_LINK_HOURS = 24

/** Largo mínimo de la contraseña, del mismo formulario: «La contraseña debe tener 10 caracteres como mínimo». */
export const UBPS_PASSWORD_MIN_CHARS = 10

/**
 * Lo que pide el formulario para restablecer: «Origen» (el país donde se expidió el documento),
 * «Tipo» (documento, pasaporte o fronterizo) y «Nro. Documento» («Ingrese su cédula de identidad
 * sin puntos ni guiones»).
 */
export const UBPS_RESET_FIELDS: readonly string[] = Object.freeze([
  'el país donde se expidió tu documento',
  'el tipo de documento',
  'el número sin puntos ni guiones',
])

/**
 * La advertencia que la pantalla de ingreso del portal (scp.bps.gub.uy) muestra arriba del
 * formulario, textual: «Proteja sus datos. BPS no lo contactará para solicitarle su contraseña».
 */
export const UBPS_PASSWORD_WARNING = 'BPS no lo contactará para solicitarle su contraseña'

// ---------------------------------------------------------------------------
// La otra puerta: ID Uruguay
// ---------------------------------------------------------------------------

export interface IdUruguayMethod {
  /** Cómo lo llama ID Uruguay. */
  readonly metodo: string
  /** El nivel de seguridad que le asigna. */
  readonly nivel: 'Básico' | 'Intermedio' | 'Avanzado'
  /** Qué necesitás, en la columna «Qué necesito». */
  readonly necesitas: string
  /** La columna «Vigencia». */
  readonly vigencia: string
  /**
   * Si alcanza para los trámites del BPS. AGESIC, «Elevá la seguridad de tu Usuario gub.uy
   * mediante videollamada» (12/01/2026): «Para realizar la mayoría de los trámites y servicios en
   * línea que ofrece el Estado, como por ejemplo los de BPS y DGI, es necesario que tu Usuario
   * gub.uy tenga un nivel de seguridad intermedio». O sea: el básico no alcanza.
   */
  readonly alcanzaParaBps: boolean
}

/**
 * La tabla «Métodos disponibles para identificarse digitalmente» de mi.iduruguay.gub.uy
 * (/metodos-disponibles-diferencias), leída el 2026-11-22, que es también la lista que aparece
 * cuando en el portal del BPS se elige «Ingresar con Cédula Electrónica o Usuario gub.uy».
 *
 * ID Uruguay y AGESIC llaman hoy a la cédula «documento nacional de identidad, también conocido
 * como cédula de identidad»; la guía usa la palabra del lector y aclara el nombre nuevo.
 */
export const IDUY_METHODS: readonly IdUruguayMethod[] = Object.freeze([
  {
    metodo: 'Usuario gub.uy (recién creado)',
    nivel: 'Básico',
    necesitas: 'Número de documento y contraseña, en línea',
    vigencia: 'Sin vencimiento',
    alcanzaParaBps: false,
  },
  {
    metodo: 'Usuario gub.uy elevado',
    nivel: 'Intermedio',
    necesitas: 'El nivel básico más una videollamada, la firma digital o una validación presencial',
    vigencia: 'Sin vencimiento',
    alcanzaParaBps: true,
  },
  {
    metodo: 'Cédula por proximidad',
    nivel: 'Avanzado',
    necesitas: 'Cédula emitida después de octubre de 2022, celular con NFC y la aplicación',
    vigencia: '5 años',
    alcanzaParaBps: true,
  },
  {
    metodo: 'Cédula con lector',
    nivel: 'Avanzado',
    necesitas: 'Cédula, lector de cédula y el complemento del navegador',
    vigencia: '5 años',
    alcanzaParaBps: true,
  },
  {
    metodo: 'ID Digital Abitab',
    nivel: 'Avanzado',
    necesitas: 'La identidad de Abitab, su aplicación y verificación presencial',
    vigencia: '2 años',
    alcanzaParaBps: true,
  },
  {
    metodo: 'TuID Antel',
    nivel: 'Avanzado',
    necesitas: 'La identidad de Antel, su aplicación y verificación presencial',
    vigencia: '2 años',
    alcanzaParaBps: true,
  },
])

/**
 * Las tres formas de pasar el Usuario gub.uy de básico a intermedio, de AGESIC («Cómo elevar el
 * nivel de seguridad de básica a intermedio en Usuario gub.uy», 11/08/2026, y «¿Cómo crear un
 * Usuario gub.uy?», 23/04/2026).
 *
 * Los lugares de la vía presencial son los que las DOS páginas nombran: Puntos de Atención a la
 * Ciudadanía, la DGI y el Centro de Vistas y Notificaciones de la Intendencia de Montevideo. La de
 * abril agregaba el MIDES y la de agosto, que es la más nueva, ya no; por eso el MIDES no se
 * publica.
 */
export const IDUY_RAISE_LEVEL: readonly string[] = Object.freeze([
  'Por videollamada: agendás desde ID Uruguay, un agente valida tu identidad y el sistema compara una foto con la de tu cédula. Hace falta ser mayor de edad, tener la cédula y un dispositivo con cámara, micrófono e internet.',
  'Con firma digital: firmás el contrato de habilitación con la cédula con chip y un lector de tarjetas.',
  'En persona: vas con tu Usuario gub.uy básico y la cédula vigente a un Punto de Atención a la Ciudadanía, a la DGI o al Centro de Vistas y Notificaciones de la Intendencia de Montevideo.',
])

/** El horario para agendar la videollamada, de la página de AGESIC del 12/01/2026. */
export const IDUY_VIDEOCALL_HOURS = 'de 10:00 a 16:00'

// ---------------------------------------------------------------------------
// La DGI es otra cosa
// ---------------------------------------------------------------------------

/**
 * Las cuatro identidades digitales con las que las personas entran a los servicios en línea de la
 * DGI, de «Obtención de una identidad digital para acceder a servicios en línea de DGI» (DGI en
 * gub.uy, publicada el 09/10/2023 y leída el 2026-11-22). La misma página dice que «Estas
 * identidades van a sustituir progresivamente a la clave de DGI» y que los Usuarios gub.uy
 * «obtenidos a través del auto-registro web no están habilitados para acceder a los servicios en
 * línea de DGI». El Usuario personal BPS no figura en la lista.
 */
export const DGI_IDENTITIES: readonly string[] = Object.freeze([
  'el Usuario gub.uy con el nivel elevado',
  'la Identidad Digital de Abitab',
  'TuID de Antel',
  'la cédula electrónica con lector y PIN',
])

/**
 * Quién sigue con «Usuario DGI», de «Acceso a servicios en línea de DGI» (DGI en gub.uy,
 * 14/09/2023): «El acceso con Usuario DGI se realiza con el número de RUC o el número de
 * Identificación Extranjera (NIE) y con una clave que se obtiene en DGI, en redes de cobranza o
 * firmando un contrato de adhesión», para las empresas que no son unipersonales y los
 * contribuyentes con NIE; los de IASS pueden entrar de las dos maneras.
 */
export const DGI_USER_DGI =
  'el número de RUC o de Identificación Extranjera (NIE) y una clave que se obtiene en la DGI, en las redes de cobranza o firmando un contrato de adhesión'

// ---------------------------------------------------------------------------
// Lo que no se publica
// ---------------------------------------------------------------------------

/** Los huecos, dichos como huecos. La guía los publica tal cual en su última sección. */
export const UBPS_GAPS: readonly string[] = Object.freeze([
  'Cuánto cuesta: la ficha del trámite en el BPS no publica un costo, y la página de Red Pagos sobre el usuario tampoco. El único «no tiene costo» escrito que encontramos es el de la vía consular, en la ficha del Consulado General en Asunción.',
  'Cuánto tarda en llegar el correo de activación: el BPS publica cuánto vale el enlace, no cuánto demora en llegar.',
  'Cuántos intentos fallidos bloquean el usuario y cómo se desbloquea: ninguna página del BPS lo dice.',
  'Qué servicios en línea aceptan entrar con ID Uruguay y cuáles exigen el Usuario personal: el BPS no publica esa lista.',
])

// ---------------------------------------------------------------------------
// Preguntas y fuentes
// ---------------------------------------------------------------------------

export interface UbpsFaq {
  readonly question: string
  readonly answer: string
}

export const UBPS_FAQ: readonly UbpsFaq[] = Object.freeze([
  {
    question: '¿Puedo sacar el Usuario personal BPS por internet?',
    answer:
      'Según el BPS, no: la ficha del trámite dice que la modalidad es presencial, y el botón «Registrarme» del portal lleva a esa misma ficha. Lo que sí podés hacer sin moverte es entrar al portal web del BPS por la otra puerta que ofrece su pantalla de ingreso, «Ingresar con Cédula Electrónica o Usuario gub.uy», con un Usuario gub.uy en nivel intermedio, que se puede conseguir por videollamada. La app BPS Personas, en cambio, pide usuario y contraseña de los servicios en línea.',
  },
  {
    question: '¿Dónde se saca el Usuario personal BPS?',
    answer: `Si sos mayor de edad, en ${UBPS_EXTERNAL_AGENTS.join(', ')} o en una sucursal del BPS, con la cédula vigente y en buen estado, un correo en uso que no esté asociado a otro usuario y un número de celular. Los menores, los apoderados y quien lo tramita por otra persona tienen que ir a una sucursal del BPS.`,
  },
  {
    question: '¿Cuánto cuesta?',
    answer:
      'La ficha del BPS no publica un costo, así que acá no se publica ninguno. El Consulado General de Uruguay en Asunción sí escribe «No tiene costo» para el trámite que se hace en el consulado. Si vas a un local de cobranza, preguntá antes.',
  },
  {
    question: 'Ya fui al local. ¿Cuánto tarda en estar habilitado?',
    answer: `El BPS no publica cuánto demora en llegar el correo. Lo que sí publica es lo que vale cada paso: el enlace de activación, ${UBPS_ACTIVATION_LINK_DAYS} días; el código por SMS, ${UBPS_SMS_CODE_DAYS} días, y se puede pedir hasta ${UBPS_SMS_CODE_MAX_REQUESTS} veces. Una vez que lo activás, los servicios para trabajadores, jubilados y pensionistas quedan habilitados automáticamente.`,
  },
  {
    question: 'No me llegó el correo de activación. ¿Qué hago?',
    answer: `Buscalo en correo no deseado o spam, que es lo primero que indica el BPS. Si pasaron los ${UBPS_ACTIVATION_LINK_DAYS} días de validez del enlace, la solicitud se inicia de nuevo.`,
  },
  {
    question: 'Me olvidé la contraseña. ¿Cómo la recupero?',
    answer: `Con «Olvidé mi contraseña», en la pantalla de ingreso de los servicios en línea. Te pide ${UBPS_RESET_FIELDS.slice(0, -1).join(', ')} y ${UBPS_RESET_FIELDS.at(-1)}, y te manda un enlace al correo asociado al usuario que vale ${UBPS_RESET_LINK_HOURS} horas. La contraseña nueva tiene que tener al menos ${UBPS_PASSWORD_MIN_CHARS} caracteres y no puede ser una que ya usaste.`,
  },
  {
    question: 'Cambié de correo. ¿Cómo actualizo el del usuario?',
    answer:
      'Si te acordás de la contraseña, cambiás el correo vos desde el portal, en el campo «Correo electrónico Contrato». Si no podés entrar, tenés que ir a una oficina del BPS con la cédula vigente y en buen estado; desde el exterior, al consulado habilitado más cercano con el documento con el que estás registrado.',
  },
  {
    question: 'Mi usuario quedó bloqueado. ¿Cómo lo desbloqueo?',
    answer: `El BPS no publica cuántos intentos fallidos bloquean el usuario ni un trámite propio para desbloquearlo. Lo que publica es el restablecimiento de la contraseña, la casilla de soporte ${UBPS_SUPPORT_EMAIL} y los teléfonos ${UBPS_PHONES.celular} desde celular y ${UBPS_PHONES.fijo} desde fijo, ${UBPS_PHONES.horario} h.`,
  },
  {
    question: 'Creo que otra persona usa mi usuario. ¿Lo puedo dar de baja?',
    answer:
      'Sí, con el trámite «Bajar Usuario personal», que es presencial: va el titular o un apoderado general con la cédula vigente y una nota que diga que querés darlo de baja y por qué (por ejemplo, uso indebido o gestiones que no autorizaste). Si hay una denuncia penal o judicial, se agrega una copia.',
  },
  {
    question: '¿Mi hijo menor puede tener Usuario personal BPS?',
    answer: `Sí. La solicitud la hacen los padres con patria potestad registrada, salvo los mayores de ${UBPS_MINOR_ALONE_OVER_AGE} años, que pueden ir solos. En los dos casos se tramita sólo en sucursales del BPS.`,
  },
  {
    question: 'Vivo en el exterior. ¿Cómo lo saco?',
    answer:
      'En un consulado uruguayo habilitado, con el documento con el que estás registrado en el BPS; si venció, llevá además uno vigente. Si no hay un consulado habilitado en tu región, le mandás a alguien de confianza el formulario de solicitud firmado, con la firma certificada por escribano y apostillada (o legalizada, si el país no integra el convenio de la Apostilla), todo en original impreso, para que lo presente en el BPS.',
  },
  {
    question: '¿El Usuario personal BPS me sirve para la DGI?',
    answer:
      'No figura entre las identidades que acepta la DGI. Las personas entran a los servicios en línea de la DGI con Usuario gub.uy elevado, Identidad Digital de Abitab, TuID de Antel o la cédula electrónica. Un Usuario gub.uy creado sólo por autorregistro web no alcanza para la DGI.',
  },
  {
    question: '¿El BPS me puede llamar para pedirme la contraseña?',
    answer: `No. La pantalla de ingreso del portal lo dice arriba del formulario: «${UBPS_PASSWORD_WARNING}». Si alguien te la pide en nombre del BPS, no se la des.`,
  },
])

export interface UbpsSource {
  readonly label: string
  readonly url: string
  readonly publisher: string
}

export const UBPS_SOURCES: readonly UbpsSource[] = Object.freeze([
  {
    label:
      'Solicitar Usuario personal BPS (requisitos y lugares por condición; modalidad presencial)',
    url: 'https://www.bps.gub.uy/11444/solicitar-usuario-personal-bps.html',
    publisher: 'BPS',
  },
  {
    label:
      'Luego de solicitar el Usuario personal BPS, ¿qué pasos debo seguir? (activación por correo y SMS)',
    url: 'https://www.bps.gub.uy/18292/luego-de-solicitar-el-usuario-personal-bps-que-pasos-debo-seguir.html',
    publisher: 'BPS',
  },
  {
    label: 'Acceso a los servicios en línea (servicios con registro y habilitación automática)',
    url: 'https://www.bps.gub.uy/9170/acceso-a-los-servicios-en-linea.html',
    publisher: 'BPS',
  },
  {
    label: 'Gestioná el Usuario Personal BPS (nota del 9/1/2024: qué permite y dónde se pedía)',
    url: 'https://www.bps.gub.uy/21342/gestiona-el-usuario-personal-bps.html',
    publisher: 'BPS',
  },
  {
    label: 'Portal de servicios en línea: «Olvidé mi contraseña» y «Restablecer mi contraseña»',
    url: 'https://serviciosenlinea.bps.gub.uy/ServiciosEnLineaWeb/contenidosEmbebido?id=8792',
    publisher: 'BPS',
  },
  {
    label: 'Pantalla de ingreso: usuario personal, o cédula electrónica o Usuario gub.uy',
    url: 'https://scp.bps.gub.uy/PortalServLinea/',
    publisher: 'BPS',
  },
  {
    label: 'Actualizar correo electrónico asociado al Usuario personal BPS',
    url: 'https://www.bps.gub.uy/20814/actualizar-correo-electronico-asociado-al-usuario-personal-bps.html',
    publisher: 'BPS',
  },
  {
    label: 'Bajar Usuario personal (requisitos)',
    url: 'https://www.bps.gub.uy/23496/bajar-usuario-personal.html',
    publisher: 'BPS',
  },
  {
    label: 'Asistencia a los usuarios de los servicios en línea',
    url: 'https://www.bps.gub.uy/12138/asistencia-a-los-usuarios.html',
    publisher: 'BPS',
  },
  {
    label: 'Aplicaciones móviles: qué hace BPS Personas',
    url: 'https://www.bps.gub.uy/10004/aplicaciones-moviles.html',
    publisher: 'BPS',
  },
  {
    label:
      'BPS Personas en Google Play («es requisito contar con usuario y contraseña de los servicios en línea»)',
    url: 'https://play.google.com/store/apps/details?id=uy.gub.bps.movil.persona',
    publisher: 'BPS',
  },
  {
    label:
      'Constancia de historia laboral nominada (se baja con el usuario en «Consultar mis aportes»)',
    url: 'https://www.bps.gub.uy/11438/constancia-de-historia-laboral-nominada.html',
    publisher: 'BPS',
  },
  {
    label: '¿Cómo puedo obtener mi recibo de cobro? (web, app y envío al correo del usuario)',
    url: 'https://www.bps.gub.uy/12728/como-puedo-obtener-mi-recibo-de-cobro.html',
    publisher: 'BPS',
  },
  {
    label:
      'Acceso a servicios en línea del BPS a través del sistema Usuario gub.uy (nota del 14/9/2020)',
    url: 'https://www.bps.gub.uy/17564/acceso-a-servicios-en-linea-del-bps-a-traves-del-sistema-usuario-gubuy.html',
    publisher: 'BPS',
  },
  {
    label: 'Métodos disponibles para identificarse digitalmente (niveles, requisitos y vigencia)',
    url: 'https://mi.iduruguay.gub.uy/metodos-disponibles-diferencias',
    publisher: 'ID Uruguay',
  },
  {
    label:
      'Elevá la seguridad de tu Usuario gub.uy mediante videollamada (BPS y DGI piden nivel intermedio)',
    url: 'https://www.gub.uy/agencia-gobierno-electronico-sociedad-informacion-conocimiento/politicas-y-gestion/eleva-seguridad-usuario-gubuy-mediante-videollamada',
    publisher: 'AGESIC',
  },
  {
    label: 'Cómo elevar el nivel de seguridad de básica a intermedio en Usuario gub.uy',
    url: 'https://www.gub.uy/agencia-gobierno-electronico-sociedad-informacion-conocimiento/politicas-y-gestion/elevar-nivel-seguridad-basica-intermedio-usuario-gubuy',
    publisher: 'AGESIC',
  },
  {
    label: '¿Cómo crear un Usuario gub.uy?',
    url: 'https://www.gub.uy/agencia-gobierno-electronico-sociedad-informacion-conocimiento/politicas-y-gestion/crear-usuario-gubuy',
    publisher: 'AGESIC',
  },
  {
    label: 'Obtención de una identidad digital para acceder a servicios en línea de DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/obtencion-identidad-digital-para-acceder-servicios-linea-dgi',
    publisher: 'DGI',
  },
  {
    label: 'Acceso a servicios en línea de DGI (identidad digital y Usuario DGI)',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/acceso-servicios-linea-dgi',
    publisher: 'DGI',
  },
  {
    label: 'Usuario persona BPS en el Consulado General en Asunción («No tiene costo»)',
    url: 'https://www.gub.uy/ministerio-relaciones-exteriores/consulado-general-asuncion/tramites-servicios/usuario-persona-banco-prevision-social-bps',
    publisher: 'Ministerio de Relaciones Exteriores',
  },
])
