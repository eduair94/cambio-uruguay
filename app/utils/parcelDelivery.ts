// app/utils/parcelDelivery.ts
// Dónde te entregan un envío del exterior: qué opciones tenés según por dónde llega y en qué
// momento estás, qué te hace perder la franquicia si tocás el nombre o la dirección, y cuánto
// tiempo tenés antes de que el envío se vuelva un problema.
//
// POR QUÉ EXISTE: es la pregunta más vieja sin responder de r/uruguay sobre compras del exterior
// ("¿me lo pueden entregar en una agencia y no en mi casa?" — 2019, 2022, junio 2026, agosto 2026)
// y ninguna página del sitio la tocaba. Cuando se investiga en serio aparece el dato que nadie
// publica: la DIRECCIÓN no es un requisito de la franquicia, el NOMBRE sí. Cambiar dónde te lo
// dejan no rompe nada; cambiar a nombre de quién viene te cuesta el beneficio entero.
//
// PURO: sin Vue, sin fetch. La página sólo renderiza y `parcelDeliveryAnswer` decide.
//
// REGLA DE LA CASA: cada afirmación declara su origen — `norma` (ley/decreto/RG), `operador` (lo
// que publica el Correo o el courier de su propio servicio, que puede cambiarlo mañana) o
// `practica` (lo que cuenta la gente, que no es un derecho). Nunca se mezclan. Si algo no está
// publicado, el veredicto es `sin-fuente` y se dice, en vez de suponerlo.
//
// FUENTES PRIMARIAS verificadas el 2026-08-15:
//   - Decreto 50/026 arts. 4, 7, 8, 9, 14 y 15   https://www.impo.com.uy/bases/decretos/50-2026
//   - Ley 20.446 arts. 627 y 631                 https://www.impo.com.uy/bases/leyes/20446-2025/627
//   - RG DNA 11/2026 (Anexo I nums. 25, 28, 32, 35, 36 y sección IX)
//     https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf
//   - RG DNA 14/2026 (envíos retenidos: Anexo I nums. 1, 10, 11, 15 y 17; Anexo II num. 2)
//     https://www.aduanas.gub.uy/innovaportal/file/28482/1/rg-14-2026.pdf
//   - RG DNA 10/2026 + Comunicado COMEX 11/2026 (registro de identidad y direcciones)
//     https://impo.com.uy/bases/resoluciones-generales-aduanas-nd/10-2026
//   - Ley 19.009 art. 5 lit. F (la casilla es lugar válido de entrega)
//     https://www.impo.com.uy/bases/leyes/19009-2012
//   - Decreto 459/007 art. 4 (Servicio Postal Universal: entrega en oficina donde no hay reparto)
//     https://www.impo.com.uy/bases/decretos/459-2007/4
//
// TRAMPAS (páginas oficiales vivas pero desactualizadas, no citarlas como vigentes):
//   - aduanas.gub.uy/innovaportal/file/13876/1/procedimiento_correo.pdf — es del Decreto 356/014,
//     derogado: habla de 5 envíos al año, topes de USD 50/200 y del depósito de Bulevar Artigas.
//   - aduanas.gub.uy/innovaportal/v/25087 y v/25088, fechadas 26/04/2023. La primera promete "toda
//     la documentación que se detalla más abajo" y esa lista NO existe en la página.

/** Por dónde entra el envío. Determina qué opciones de entrega existen. */
export type DeliveryChannel = 'correo-simple' | 'correo-ems' | 'courier'

/** En qué momento está el lector cuando llega a la página. */
export type DeliveryStage = 'antes-de-comprar' | 'en-camino' | 'aviso' | 'retenido'

/** De dónde sale lo que afirmamos. */
export type SourceKind = 'norma' | 'operador' | 'practica'

/** Qué tan posible es lo que el lector quiere hacer. */
export type Verdict = 'si' | 'depende' | 'no' | 'sin-fuente'

export interface DeliverySource {
  label: string
  url: string
  kind: SourceKind
}

/** Una vía concreta para recibir el envío en otro lado que no sea tu casa. */
export interface DeliveryOption {
  id: string
  title: string
  /** Qué es, en una línea. */
  what: string
  verdict: Verdict
  /** El detalle, con la condición que lo hace posible o imposible. */
  detail: string
  /** Canales en los que esta opción existe. */
  channels: DeliveryChannel[]
  sources: DeliverySource[]
}

/** Algo que hacés con el nombre o la dirección y que te sale caro. */
export interface AddressRisk {
  id: string
  action: string
  consequence: string
  cost?: string
  sources: DeliverySource[]
}

/** Un plazo que corre sin que el lector se entere. */
export interface DeliveryDeadline {
  id: string
  label: string
  from: string
  expires: string
  /** Momentos en los que este reloj ya está corriendo. */
  stages: DeliveryStage[]
  /** Canales a los que aplica; vacío = todos. */
  channels?: DeliveryChannel[]
  sources: DeliverySource[]
}

/** Lo que la página responde para una combinación canal + momento. */
export interface DeliveryAnswer {
  headline: string
  verdict: Verdict
  steps: string[]
  options: DeliveryOption[]
  deadlines: DeliveryDeadline[]
}

export const DELIVERY_CHANNEL_LABEL: Record<DeliveryChannel, string> = {
  'correo-simple': 'Correo Uruguayo, envío no exprés',
  'correo-ems': 'Correo Uruguayo, EMS (exprés)',
  courier: 'Courier privado',
}

export const DELIVERY_STAGE_LABEL: Record<DeliveryStage, string> = {
  'antes-de-comprar': 'Todavía no compré',
  'en-camino': 'Ya está en camino',
  aviso: 'Pasaron y no estaba',
  retenido: 'Está retenido en la aduana',
}

/** Fecha en que las opciones y los plazos se contrastaron con las fuentes. */
export const PARCEL_DELIVERY_VERIFIED_AT = '2026-08-15'

// --- Fuentes reutilizadas -----------------------------------------------------------------------

const S = {
  decreto4: {
    label: 'Decreto 50/026 art. 4',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026/4',
    kind: 'norma',
  },
  decreto9: {
    label: 'Decreto 50/026 art. 9 lit. f',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026/9',
    kind: 'norma',
  },
  decreto14: {
    label: 'Decreto 50/026 art. 14',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026',
    kind: 'norma',
  },
  decreto15: {
    label: 'Decreto 50/026 art. 15',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026/15',
    kind: 'norma',
  },
  ley627: {
    label: 'Ley 20.446 art. 627',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
    kind: 'norma',
  },
  ley631: {
    label: 'Ley 20.446 art. 631',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/631',
    kind: 'norma',
  },
  rg11: {
    label: 'RG DNA 11/2026',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf',
    kind: 'norma',
  },
  rg14: {
    label: 'RG DNA 14/2026',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28482/1/rg-14-2026.pdf',
    kind: 'norma',
  },
  rg10: {
    label: 'RG DNA 10/2026',
    url: 'https://impo.com.uy/bases/resoluciones-generales-aduanas-nd/10-2026',
    kind: 'norma',
  },
  leyPostal: {
    label: 'Ley 19.009 art. 5 lit. F',
    url: 'https://www.impo.com.uy/bases/leyes/19009-2012',
    kind: 'norma',
  },
  spu: {
    label: 'Decreto 459/007 art. 4',
    url: 'https://www.impo.com.uy/bases/decretos/459-2007/4',
    kind: 'norma',
  },
  correoDeclarar: {
    label: 'Correo — declarar la compra',
    url: 'https://www.correo.com.uy/compras-exterior',
    kind: 'operador',
  },
  correoCasilla: {
    label: 'Correo — casilla de correo',
    url: 'https://www.correo.com.uy/casilla-correo',
    kind: 'operador',
  },
  correoTarifas: {
    label: 'Correo — tarifario 2025',
    url: 'https://www.correo.com.uy/documents/20182/1974816/tarifario+2025+F-1-15.pdf',
    kind: 'operador',
  },
  correoNacional: {
    label: 'Correo — paquetes nacionales',
    url: 'https://www.correo.com.uy/paquetes-nacionales',
    kind: 'operador',
  },
  correoCartas: {
    label: 'Correo — cartas y documentos',
    url: 'https://www.correo.com.uy/cartas-y-documentos',
    kind: 'operador',
  },
  dnaRetenido: {
    label: 'DNA — encomienda retenida',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/25087/15/innova.front/como-procedo-si-la-encomienda-fue-retenida.html',
    kind: 'operador',
  },
  puntomio: {
    label: 'PuntoMio — Pick Up UES',
    url: 'https://puntomio.uy/pick-up-ues',
    kind: 'operador',
  },
  ues: {
    label: 'UES — preguntas frecuentes',
    url: 'https://www.ues.com.uy/faq.html',
    kind: 'operador',
  },
  gripperModalidad: {
    label: 'Gripper — modificar dirección o modalidad',
    url: 'https://soporte.gripper.com.uy/articulos/sobre-un-envio-en-uruguay/57/modificar-direccion-o-modalidad-de-entrega',
    kind: 'operador',
  },
  gripperGuarda: {
    label: 'Gripper — plazo de almacenamiento',
    url: 'https://soporte.gripper.com.uy/articulos/sobre-un-envio-en-uruguay/109/plazo-de-almacenamiento-de-envios-en-uruguay',
    kind: 'operador',
  },
  gripperAutorizar: {
    label: 'Gripper — autorizar a otro a retirar',
    url: 'https://soporte.gripper.com.uy/articulos/sobre-un-envio-en-uruguay/96/autorizar-a-otro-a-retirar-mi-envio',
    kind: 'operador',
  },
  aerobox: { label: 'Aerobox — sitio oficial', url: 'https://aerobox.com.uy/', kind: 'operador' },
  enviamicompra: {
    label: 'Envía Mi Compra — entregas en Uruguay',
    url: 'https://ayuda.enviamicompra.com.uy/support/solutions/articles/12000059216--c%C3%B3mo-se-realizan-las-entregas-de-los-paquetes-en-uruguay-',
    kind: 'operador',
  },
  tiendamia: {
    label: 'Tiendamia — términos y condiciones',
    url: 'https://tiendamia.com.uy/terminos-y-condiciones',
    kind: 'operador',
  },
  redditAviso: {
    label: 'r/uruguay — el aviso decía 10 días',
    url: 'https://reddit.com/r/uruguay/comments/sllyfg/ayuda_por_un_paquete_que_me_quisieron_entregar/',
    kind: 'practica',
  },
  redditDireccion: {
    label: 'r/uruguay — le cambió la dirección a un envío',
    url: 'https://reddit.com/r/uruguay/comments/1uhgktv/compras_al_exterior_me_joderan_por_cambiarle_la/',
    kind: 'practica',
  },
  redditSucursal: {
    label: 'r/uruguay — preguntó por envío a sucursal, sin respuesta',
    url: 'https://reddit.com/r/uruguay/comments/1ucvsnh/envio_internacional_a_una_sucursal_del_correo/',
    kind: 'practica',
  },
  redditSinCedula: {
    label: 'r/uruguay — sin cédula uruguaya, pagó el 60%',
    url: 'https://reddit.com/r/uruguay/comments/1n9kz6b/ayuda_con_un_paquete_retenido_en_la_aduana/',
    kind: 'practica',
  },
  redditInterior: {
    label: 'r/uruguay — autorizó a un tercero desde el interior',
    url: 'https://reddit.com/r/uruguay/comments/ordod7/soy_del_interior_y_la_dirección_nacional_de/',
    kind: 'practica',
  },
} as const satisfies Record<string, DeliverySource>

// --- Las vías -----------------------------------------------------------------------------------

export const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'sucursal-correo',
    title: 'Que te lo dejen en una sucursal del Correo',
    what: 'Elegir una oficina del Correo como punto de entrega, en vez de tu casa.',
    verdict: 'no',
    detail:
      'El Correo publica el retiro en sucursal —"el destinatario podrá recibir el envío en su domicilio o empresa, o retirarlo en la sucursal de Correo Uruguayo que elija"— pero eso es paquetería NACIONAL despachada por su plataforma, y ahí lo habilita el remitente al despachar, no vos. Para un envío internacional entrante no publica el equivalente: su formulario de declaración pide una dirección postal —departamento, localidad, calle, número de puerta, apartamento, manzana, solar y código postal— y no admite una oficina. Ninguna de sus 46 preguntas frecuentes toca la entrega, y su glosario no define ni "aviso de visita" ni "lista de correos".',
    channels: ['correo-simple', 'correo-ems'],
    sources: [S.correoNacional, S.correoDeclarar, S.redditSucursal],
  },
  {
    id: 'casilla-correo',
    title: 'Alquilar una casilla de correo',
    what: 'Una casilla con número propio en el local que elijas, que funciona como dirección postal.',
    verdict: 'depende',
    detail:
      'Es lo único parecido que existe publicado, y la ley postal la reconoce expresamente: la entrega incluye "la actividad de distribución o entrega en apartados o casillas postales". El Correo la alquila a uruguayos, extranjeros y empresas en cualquier local habilitado, en planes de 6, 12 o 24 meses, y lista entre sus beneficios "recibir compras realizadas por Internet" y "asegurar la privacidad de su domicilio habitual". Su tarifario incluso contempla que lleguen paquetes: cobra almacenaje de $50 por kilo cuando se superan el plazo o las dimensiones contratadas. Tamaños y precios vigentes desde el 01/11/2025: chica 13 × 14 × 36 cm desde $1.558 por 6 meses, y grande 27 × 30 × 36 cm hasta $6.157 por 24 meses. Los dos peros son de tamaño y de silencio: no entra cualquier paquete, ninguna fuente oficial dice qué pasa con un envío internacional que pasó por Aduana, y no encontramos una sola experiencia contada de alguien que lo haya hecho.',
    channels: ['correo-simple', 'correo-ems'],
    sources: [S.leyPostal, S.correoCasilla, S.correoTarifas],
  },
  {
    id: 'pickup-courier',
    title: 'Retirar en un pick up del courier',
    what: 'Puntos de retiro en comercios, estaciones de servicio y locales de logística.',
    verdict: 'si',
    detail:
      'Es la vía que realmente existe. PuntoMio publica 20 puntos de retiro tercerizados en la red de UES —11 en Montevideo y 9 en el interior— con tres reglas concretas: el paquete recién queda disponible 24 horas después de llegar, tenés 7 días corridos desde el mail de aviso, y lo puede retirar cualquiera presentando el número de rastreo y su propia cédula. Si el paquete es voluminoso conviene mandarlo a un local de UES y no a una estación de servicio, porque si no entra lo reasignan.',
    channels: ['courier'],
    sources: [S.puntomio, S.ues],
  },
  {
    id: 'oficina-courier',
    title: 'Retirar en la oficina del courier',
    what: 'Ir vos hasta el local del courier en vez de esperar el reparto.',
    verdict: 'si',
    detail:
      'Varios lo tienen como modalidad configurable. En Gripper la modalidad es una preferencia de tu cuenta —"entrega a domicilio" o "retirar en oficina"— y hasta el mail automático cambia según cuál tengas puesta. Aerobox lo ofrece en su propio local de Montevideo. Envía Mi Compra deja pasar de domicilio a retiro en oficina con un mail, después del aviso de que el paquete está listo. Para retirarlo en oficina, Gripper pide autorización por mail (nombre y cédula, desde el correo registrado) si va otra persona.',
    channels: ['courier'],
    sources: [S.gripperModalidad, S.aerobox, S.enviamicompra, S.gripperAutorizar],
  },
  {
    id: 'otra-direccion',
    title: 'Poner otra dirección que no sea tu casa',
    what: 'El trabajo, la casa de un familiar, la portería de un edificio.',
    verdict: 'si',
    detail:
      'Acá está el dato que casi nadie publica: la dirección NO es un requisito de la franquicia. Los requisitos están en el art. 4 del decreto y ninguno menciona el domicilio; la dirección aparece en el art. 9, que es información de control, y la Aduana la define por su función — pide el domicilio "permitiendo la correcta localización para la entrega". Su propio registro de usuarios va más lejos: separa el "domicilio de residencia" de las "direcciones adicionales donde solicite la entrega de los envíos", te deja cargar varias y cambiarlas cuando quieras. O sea que el lugar es tuyo para elegir. Lo que no podés tocar es el nombre.',
    channels: ['correo-simple', 'correo-ems', 'courier'],
    sources: [S.decreto4, S.decreto9, S.rg11, S.rg10],
  },
  {
    id: 'a-nombre-de-otro',
    title: 'Que venga a nombre de otra persona',
    what: 'Comprarlo vos y ponerlo a nombre de quien lo va a recibir.',
    verdict: 'no',
    detail:
      'Esto sí rompe la franquicia. El decreto exige una cadena de tres: el titular de la tarjeta, el titular de la compra y el destinatario del envío tienen que ser la misma persona. Si no coinciden, ese envío pierde la franquicia y se liquida la prestación única del 60%, con un mínimo de US$ 20. El consuelo es que no te frena el paquete y —esto casi nadie lo sabe— esa operación tampoco te consume uno de los 3 envíos anuales ni cupo de los US$ 800. En junio de 2026 alguien contó el caso exacto: puso su casilla en una compra que iba a nombre de su pareja y quedó con la factura a un nombre y el envío a otro.',
    channels: ['correo-simple', 'correo-ems', 'courier'],
    sources: [S.decreto4, S.decreto15, S.redditDireccion],
  },
  {
    id: 'que-lo-reciba-otro',
    title: 'Que lo reciba otra persona en la puerta',
    what: 'Vos seguís siendo el destinatario; sólo cambia quién firma.',
    verdict: 'si',
    detail:
      'Recibirlo no es lo mismo que ser el destinatario. El único estándar de entrega que el Correo publica pieza por pieza —el de la carta certificada— habla de entrega en mano contra firma y cédula de "la persona responsable" mayor de edad, no del destinatario, y su glosario confirma que se registra el documento de quien recibe. UES dice directamente que cualquier persona mayor de 18 años puede recibir o retirar. Ojo con la excepción de Gripper: en el domicilio no hace falta autorización, pero para retirar en oficina o para dejarlo en portería sí.',
    channels: ['correo-simple', 'correo-ems', 'courier'],
    sources: [S.correoCartas, S.ues, S.gripperAutorizar],
  },
  {
    id: 'cambiar-en-camino',
    title: 'Cambiar la dirección con el envío ya en viaje',
    what: 'Corregir la dirección después de haber comprado.',
    verdict: 'depende',
    detail:
      'Depende enteramente del operador, porque la norma no lo regula: los términos "reexpedición", "redirección" y "cambio de domicilio" no existen en el Decreto 50/026 ni en las resoluciones del régimen. Lo único que la norma prevé para un paquete que no se va a entregar es devolverlo a origen, a tu costo y dentro de los 30 días. Del lado de los operadores: Gripper deja cambiar dirección o modalidad desde el panel, salvo dentro de las 24 horas previas a una entrega ya coordinada; UES dice sin vueltas que una vez confirmada la compra no se cambia la dirección, ni tampoco el pick up donde cayó el paquete si te queda lejos. El Correo no publica ningún procedimiento.',
    channels: ['correo-simple', 'correo-ems', 'courier'],
    sources: [S.rg11, S.gripperModalidad, S.ues],
  },
  {
    id: 'zona-sin-reparto',
    title: 'Tu zona no tiene reparto a domicilio',
    what: 'Población dispersa, chacra, balneario fuera de temporada.',
    verdict: 'si',
    detail:
      'Es el único caso donde el retiro en oficina está garantizado por norma, y no como favor: el Servicio Postal Universal se cumple entregando en oficina, tres veces por semana, donde la población es dispersa. La misma norma te garantiza que haya un punto de acceso cerca: una oficina cada cinco mil habitantes en promedio, y al menos un punto de acceso en toda población de más de 500 habitantes.',
    channels: ['correo-simple', 'correo-ems'],
    sources: [S.spu],
  },
]

// --- Lo que te cuesta plata ---------------------------------------------------------------------

export const ADDRESS_RISKS: AddressRisk[] = [
  {
    id: 'otro-nombre',
    action: 'Lo ponés a nombre de otra persona',
    consequence:
      'Se rompe la cadena titular de la tarjeta = titular de la compra = destinatario, y ese envío pierde la franquicia.',
    cost: 'Prestación única: 60% del valor, mínimo US$ 20. No consume cupo ni envíos del año.',
    sources: [S.decreto4, S.decreto15],
  },
  {
    id: 'paga-otro',
    action: 'Lo pagás con la tarjeta de otro',
    consequence:
      'Mismo problema, por el otro extremo de la cadena: el titular del medio de pago tiene que ser el mismo que compra y recibe.',
    cost: 'Prestación única: 60%, mínimo US$ 20.',
    sources: [S.decreto4],
  },
  {
    id: 'otra-direccion-ok',
    action: 'Lo mandás a otra dirección, a tu nombre',
    consequence:
      'No rompe nada. La dirección no está entre los requisitos del art. 4; es dato de control del art. 9 y la Aduana la quiere sólo para poder entregarte.',
    cost: 'Sin costo fiscal.',
    sources: [S.decreto4, S.decreto9, S.rg11],
  },
  {
    id: 'sin-cedula',
    action: 'No tenés cédula uruguaya',
    consequence:
      'La franquicia exige persona física mayor de edad con documento nacional uruguayo, así que no accedés. Pero podés recibir igual: la prestación única la paga "el titular de la operación", sin exigir documento uruguayo ni residencia.',
    cost: 'Prestación única: 60%, mínimo US$ 20.',
    sources: [S.decreto4, S.ley627, S.redditSinCedula],
  },
  {
    id: 'empresa',
    action: 'Lo recibe una empresa',
    consequence:
      'Una persona jurídica no puede usar la franquicia nunca. Sí puede importar por el régimen del 60%, que admite expresamente personas jurídicas.',
    cost: 'Prestación única: 60%, mínimo US$ 20.',
    sources: [S.decreto4, S.rg11],
  },
]

// --- Los relojes ---------------------------------------------------------------------------------

export const DELIVERY_DEADLINES: DeliveryDeadline[] = [
  {
    id: 'art14-30',
    label: '30 días para pagar los tributos',
    from: 'que la mercadería entra al país — no desde que te avisan',
    expires:
      'la mercadería queda en condiciones de abandono no infraccional. No se declara sola: alguien tiene que pedirlo y primero te tienen que intimar a retirar, por medio fehaciente o por el Diario Oficial.',
    stages: ['en-camino', 'aviso', 'retenido'],
    sources: [S.decreto14, S.ley631],
  },
  {
    id: 'art14-90',
    label: '90 días para retirarla del depósito',
    from: 'que la mercadería entra al país',
    expires:
      'también se configura el abandono. Si se declara, perdés la mercadería —la Aduana la remata sin base y al mejor postor— pero no quedás debiendo los tributos: la ley te exime.',
    stages: ['en-camino', 'aviso', 'retenido'],
    sources: [S.decreto14, S.ley631],
  },
  {
    id: 'talon-30',
    label: '30 días para pagar el talón',
    from: 'que presentás la declaración del envío retenido',
    expires: 'se anulan el talón y la declaración entera, y se sigue con el abandono.',
    stages: ['retenido'],
    sources: [S.rg14],
  },
  {
    id: 'pickup-7',
    label: '7 días corridos en el pick up',
    from: 'el mail de aviso de PuntoMio (el paquete queda disponible 24 h después de llegar)',
    expires:
      'el paquete vuelve a las oficinas del courier. No se pierde, pero hay que ir a buscarlo ahí.',
    stages: ['aviso'],
    channels: ['courier'],
    sources: [S.puntomio],
  },
  {
    id: 'ues-7',
    label: '7 días hábiles en el pickup de UES',
    from: 'que el paquete cae en un pickup o en la red Xpres, tras dos visitas fallidas',
    expires: 'UES no publica qué hace después.',
    stages: ['aviso'],
    channels: ['courier'],
    sources: [S.ues],
  },
  {
    id: 'gripper-30',
    label: '30 días de guarda en Gripper (60 si lo pedís)',
    from: 'que el envío llega a Uruguay',
    expires:
      'a los 60 días lo consideran abandonado y lo descartan, sin reclamo posible. La extensión hay que pedirla por escrito ANTES de que venzan los primeros 30.',
    stages: ['en-camino', 'aviso'],
    channels: ['courier'],
    sources: [S.gripperGuarda],
  },
  {
    id: 'tiendamia-90',
    label: '90 días de guarda en Tiendamia',
    from: 'que la mercadería queda lista para retirar',
    expires: 'la consideran abandonada y quedan autorizados a donarla o destruirla.',
    stages: ['en-camino', 'aviso'],
    channels: ['courier'],
    sources: [S.tiendamia],
  },
  {
    id: 'correo-aviso',
    label: 'El papelito del Correo decía 10 días corridos',
    from: 'el intento de entrega, según el aviso físico',
    expires: 'el envío vuelve al remitente.',
    stages: ['aviso'],
    channels: ['correo-simple', 'correo-ems'],
    sources: [S.redditAviso, S.correoDeclarar],
  },
]

// --- La respuesta ---------------------------------------------------------------------------------

/** Las opciones que existen para un canal. */
export function optionsForChannel(channel: DeliveryChannel): DeliveryOption[] {
  return DELIVERY_OPTIONS.filter(option => option.channels.includes(channel))
}

/** Los relojes que ya están corriendo en ese momento y ese canal. */
export function deadlinesFor(channel: DeliveryChannel, stage: DeliveryStage): DeliveryDeadline[] {
  return DELIVERY_DEADLINES.filter(
    deadline =>
      deadline.stages.includes(stage) && (!deadline.channels || deadline.channels.includes(channel))
  )
}

const IS_CORREO = (channel: DeliveryChannel) => channel !== 'courier'

/**
 * Qué contestarle al lector para su combinación de canal y momento.
 *
 * El veredicto no es el mismo para los dos canales y esa es la respuesta útil: por courier el
 * retiro en un punto existe y está publicado; por el Correo, no. La página no lo suaviza.
 */
export function parcelDeliveryAnswer(
  channel: DeliveryChannel,
  stage: DeliveryStage
): DeliveryAnswer {
  const options = optionsForChannel(channel)
  const deadlines = deadlinesFor(channel, stage)
  const correo = IS_CORREO(channel)

  if (stage === 'antes-de-comprar') {
    return correo
      ? {
          verdict: 'no',
          headline:
            'Por el Correo no podés elegir que te lo dejen en una sucursal: no existe esa opción publicada para envíos internacionales.',
          steps: [
            'Poné una dirección donde haya alguien de día: puede ser tu trabajo o la casa de un familiar. La dirección no es requisito de la franquicia, así que elegirla no te cuesta nada.',
            'Lo que sí tiene que quedar a tu nombre es todo lo demás: la tarjeta con la que pagás, el titular de la compra y el destinatario tienen que ser la misma persona.',
            'Si lo que buscás es no dar tu domicilio, la única figura publicada es la casilla de correo — con el límite de que la más grande mide 27 × 30 × 36 cm y que nadie publica si sirve para un envío que pasó por Aduana.',
            'Si podés elegir el transporte, fijate que por courier privado el retiro en un punto sí existe.',
          ],
          options,
          deadlines,
        }
      : {
          verdict: 'si',
          headline:
            'Por courier privado sí: varios publican retiro en oficina o en puntos de retiro.',
          steps: [
            'Antes de comprar, mirá qué modalidad ofrece tu courier: PuntoMio tiene 20 puntos vía UES, Gripper deja configurar "retirar en oficina" como preferencia de la cuenta, Aerobox tiene local propio.',
            'Cargá la dirección o el punto ANTES de confirmar: UES avisa que una vez confirmada la compra no se cambia la dirección, ni el pick up donde cayó el paquete.',
            'La compra tiene que ir a tu nombre y con tu tarjeta aunque la retire otro: lo que rompe la franquicia es el nombre, no el lugar.',
            'Fijate el plazo de guarda de tu operador antes de elegir: van de 7 días corridos a 90 según quién sea.',
          ],
          options,
          deadlines,
        }
  }

  if (stage === 'en-camino') {
    return {
      verdict: 'depende',
      headline: correo
        ? 'Con el envío en viaje, el Correo no publica ningún procedimiento para cambiar la dirección.'
        : 'Con el envío en viaje depende del courier: algunos dejan cambiar, otros no.',
      steps: correo
        ? [
            'La norma no ayuda: "reexpedición", "redirección" y "cambio de domicilio" no existen en el Decreto 50/026 ni en las resoluciones del régimen.',
            'Lo único previsto para un paquete que no se va a entregar es devolverlo a origen, a tu costo y dentro de los 30 días.',
            'Si el envío todavía no llegó al país, revisá tus datos en la declaración del Correo antes de que arribe.',
            'Y acordate de que el reloj de los 30 y los 90 días empieza a correr cuando la mercadería entra al país, no cuando te enterás.',
          ]
        : [
            'Gripper deja cambiar dirección o modalidad desde el panel, pero no dentro de las 24 horas previas a una entrega ya coordinada.',
            'UES no permite cambiar la dirección una vez confirmada la compra, ni mover el paquete a otro pick up.',
            'Envía Mi Compra deja pasar de domicilio a retiro en oficina con un mail, después del aviso de que está listo.',
            'Mirá el plazo de guarda de tu operador: Gripper descarta a los 60 días, Tiendamia dona o destruye a los 90.',
          ],
      options,
      deadlines,
    }
  }

  if (stage === 'aviso') {
    return {
      verdict: correo ? 'sin-fuente' : 'si',
      headline: correo
        ? 'Pasaron y no estabas: el Correo no publica cuántos días te guarda el envío.'
        : 'Pasaron y no estabas: el paquete queda en un punto de retiro y tenés unos días para buscarlo.',
      steps: correo
        ? [
            'Buscá el aviso: es el único documento que trae el plazo. Quien lo recibió en 2022 contó que decía 10 días corridos antes de volver al remitente, y que recién se podía retirar 48 horas después del intento. Ese plazo no está publicado en ningún lado de correo.com.uy, así que tratalo como lo que es: lo que dice el papelito, no una regla que puedas invocar.',
            'Andá temprano y con la cédula. El Correo registra el documento de quien recibe, y su estándar publicado para carta certificada habla de "la persona responsable" mayor de edad, no del destinatario: no hace falta que vayas vos.',
            'Si el envío quedó retenido por Aduana, no lo vas a retirar en tu sucursal de barrio — eso es otro camino, con agenda previa.',
            'Mientras tanto siguen corriendo los plazos del art. 14, que se cuentan desde que la mercadería entró al país.',
          ]
        : [
            'UES hace dos visitas, la segunda entre 24 y 48 horas después de la primera; si no hay nadie, el paquete pasa a un pickup o a la red Xpres y queda 7 días hábiles.',
            'En los pick ups de PuntoMio son 7 días corridos desde el mail de aviso, y lo retira cualquiera con el número de rastreo y su propia cédula.',
            'Si se vence, el paquete no se pierde: vuelve a las oficinas del courier y hay que ir a buscarlo ahí.',
            'Para retirar en la oficina de Gripper yendo otra persona, hay que autorizarla por mail desde tu correo registrado.',
          ],
      options,
      deadlines,
    }
  }

  return {
    verdict: 'depende',
    headline:
      'Si está retenido, la entrega dejó de ser el problema: es un trámite presencial y con agenda.',
    steps: [
      correo
        ? 'Si vino por el Correo, la agenda se pide por los canales del Correo y el trámite es en el Centro Operativo de Misiones 1310, en Ciudad Vieja.'
        : 'Si vino por un courier privado, el trámite es en la Terminal de Cargas de Carrasco, con agenda previa.',
      'No tenés que ir vos: la norma habilita expresamente que se agende "el destinatario o apoderado", y para la declaración previa lista cinco sujetos que pueden hacerla por vos, incluido un despachante o el propio operador postal que lo trajo.',
      'Para que vaya un tercero alcanza con una carta de autorización y fotocopia de tu cédula. Desde el interior es lo que hace la gente: no necesita escribano.',
      'Llevá impreso más de lo que creés: la Aduana pide, entre otras cosas, el plástico de la tarjeta con la que pagaste y un estado de cuenta con movimientos anteriores y posteriores a la compra, porque verifica que el medio de pago sea tuyo.',
      'Ojo con el tercer reloj: una vez presentada la declaración, el talón de pago vence a los 30 días y se anula todo.',
    ],
    options,
    deadlines,
  }
}

// --- Preguntas ------------------------------------------------------------------------------------

export const PARCEL_DELIVERY_FAQS: { q: string; a: string }[] = [
  {
    q: '¿Puedo pedirle a AliExpress que lo entregue en una agencia y no en mi casa?',
    a: 'No con AliExpress. Su servicio de puntos de recogida no está disponible en Uruguay: la página oficial del pick-up devuelve un error y el centro de ayuda no lista al país. Lo que sí podés elegir es la dirección que declarás, que no tiene por qué ser tu casa. Y si el envío entra por un courier privado en vez del Correo, ahí sí hay puntos de retiro reales.',
  },
  {
    q: '¿Cambiar la dirección me hace perder la franquicia?',
    a: 'No. Los requisitos de la franquicia están en el art. 4 del Decreto 50/026 y ninguno menciona el domicilio. La dirección aparece en el art. 9, que es información que el operador le pasa a la Aduana, y la propia Aduana la define por su función: pide el domicilio del consignatario "permitiendo la correcta localización para la entrega". Su registro de usuarios incluso separa el domicilio de residencia de las direcciones adicionales de entrega, y te deja tener varias. Lo que sí te hace perder la franquicia es cambiar el NOMBRE: el titular de la tarjeta, el de la compra y el destinatario tienen que ser la misma persona.',
  },
  {
    q: 'No tengo domicilio fijo en Uruguay. ¿Puedo recibir algo igual?',
    a: 'Sí, pero no con franquicia. La franquicia exige ser persona física mayor de edad con documento nacional de identidad uruguayo. Sin eso, podés recibir el envío igual por la prestación única del 60%, que la paga "el titular de la operación de importación" sin exigir documento uruguayo ni residencia. Alguien lo contó en 2025 tal cual: sin cédula uruguaya, le tocó el 60%. Y ojo con una cosa: la norma nunca contempla un envío sin domicilio — el operador está obligado a informar uno por cada envío, y la Aduana pide calle, número, apartamento y departamento.',
  },
  {
    q: '¿Sirve la casilla de correo para recibir compras del exterior?',
    a: 'La ley postal reconoce la casilla como lugar de entrega válido, y el Correo la vende a uruguayos, extranjeros y empresas listando entre sus beneficios "recibir compras realizadas por Internet". Hasta su tarifario contempla que lleguen paquetes, con una tasa de almacenaje cuando se superan el plazo o las dimensiones. Pero hay dos cosas que no podemos afirmar: ninguna fuente oficial dice qué pasa con un envío internacional que pasó por Aduana, y no encontramos una sola experiencia contada de alguien que lo haya hecho. Sumale el límite físico: la casilla más grande mide 27 × 30 × 36 cm.',
  },
  {
    q: '¿Puede retirarlo otra persona por mí?',
    a: 'Para la entrega común, sí. El Correo registra el documento de quien recibe y su estándar publicado habla de "la persona responsable" mayor de edad, no del destinatario; UES dice que puede recibir o retirar cualquier persona mayor de 18 años; y en los pick ups de PuntoMio alcanza con el número de rastreo y la cédula de quien va. Gripper es el más estricto: en la puerta no pide autorización, pero para retirar en su oficina o dejarlo en portería sí. Para un envío retenido en la Aduana la norma lo habilita expresamente —se agenda "el destinatario o apoderado"— y en la práctica alcanza una carta simple con copia de las dos cédulas.',
  },
  {
    q: '¿Cuántos días me guardan el paquete?',
    a: 'Depende de quién lo tenga, y el Correo es justamente el que no lo publica. Del lado de los couriers: PuntoMio da 7 días corridos en el pick up desde el mail de aviso, UES 7 días hábiles cuando el paquete cae en un pickup, Gripper guarda 30 días y los extiende a 60 si lo pedís por escrito antes de que venzan, y Tiendamia se da 90 días antes de considerarlo abandonado. Por encima de todos corren los plazos de la norma: 30 días desde que la mercadería entró al país para pagar los tributos y 90 para retirarla del depósito.',
  },
  {
    q: 'Si dejo pasar el plazo, ¿quedo debiendo los impuestos?',
    a: 'No. Si se declara el abandono perdés la mercadería —la Aduana la remata sin base y al mejor postor, y hasta un 30% de lo que se saque va a gastos y honorarios del depositario— pero la ley te exime de los tributos. Y el abandono no ocurre solo: alguien tiene que pedirlo y primero tienen que intimarte a retirar, por medio fehaciente o por el Diario Oficial. Esa intimación deja de ser exigible recién a los dos años del ingreso.',
  },
  {
    q: 'Vivo en una zona sin reparto. ¿Estoy obligado a que me lo lleven a domicilio?',
    a: 'Al revés: es el único caso donde el retiro en oficina está garantizado por norma. Donde la población es dispersa, el Servicio Postal Universal se cumple entregando en oficina tres veces por semana. La misma norma te garantiza que haya un punto de acceso cerca: una oficina cada cinco mil habitantes en promedio, y al menos un punto de acceso en toda población de más de 500 habitantes.',
  },
]

/** Las fuentes que sostienen la página, para el bloque del pie. */
export const PARCEL_DELIVERY_SOURCES: DeliverySource[] = [
  S.decreto4,
  S.decreto9,
  S.decreto14,
  S.decreto15,
  S.ley627,
  S.ley631,
  S.rg11,
  S.rg14,
  S.rg10,
  S.leyPostal,
  S.spu,
  S.correoDeclarar,
  S.correoCasilla,
  S.correoTarifas,
  S.correoNacional,
  S.correoCartas,
  S.dnaRetenido,
  S.puntomio,
  S.ues,
  S.gripperModalidad,
  S.gripperGuarda,
  S.gripperAutorizar,
  S.aerobox,
  S.enviamicompra,
  S.tiendamia,
]
