// Curated, reputation-reviewed directory of communities/sites where someone
// LOOKING FOR a rental in Uruguay can publish a "busco alquiler" and reach more
// people. Rendered as a section on /alquilar-en-uruguay.
//
// Every channel here was discovered and then ADVERSARIALLY VERIFIED (existence,
// correct URL, honest reputation). We deliberately do NOT publish volatile
// member counts: reputation is expressed as a qualitative risk level plus an
// honest note, stamped with the last verification date. Open Facebook/WhatsApp
// rental groups are scam-prone by nature; we say so instead of hiding it.
//
// Honest omission: there is NO reputable public Telegram or WhatsApp rental
// channel for Uruguay — the "directorios" that surface are scam-template spam
// (verified: zero real UY rental groups behind them). The safe way to use
// WhatsApp is joining a group through a verified inmobiliaria or admin, never a
// public directory link. See RENT_COMMUNITIES_MESSAGING_NOTE below.
//
// PURE module (no Vue/Nuxt runtime) so it can be unit-tested in plain Node.
// Re-check the links each review. Last reviewed: RENT_COMMUNITIES_LAST_REVIEWED.

export const RENT_COMMUNITIES_LAST_REVIEWED = '2026-07-19'

export type ChannelRisk = 'bajo' | 'medio' | 'alto'
export type ChannelGroupId = 'seguras' | 'roomies' | 'facebook' | 'busqueda-vivo'
export type ChannelAudience = 'buscar' | 'publicar' | 'ambos' | 'roommates' | 'estudiantes'
export type ChannelKind =
  | 'reddit'
  | 'facebook-group'
  | 'facebook-page'
  | 'facebook-search'
  | 'plataforma'
  | 'institucional'

export interface RentChannel {
  name: string
  url: string
  /** Display block this channel renders in. */
  group: ChannelGroupId
  /** Human-readable region/reach label. */
  region: string
  /** For `group: 'facebook'` only — the department bucket for the accordion. */
  department?: RegionId
  audience: ChannelAudience
  kind: ChannelKind
  /** Honest one-liner: what it is good for, plus its main catch. */
  note: string
  risk: ChannelRisk
}

export type RegionId =
  | 'montevideo'
  | 'metropolitana'
  | 'maldonado'
  | 'colonia'
  | 'litoral'
  | 'norte'
  | 'centro'
  | 'pais'

export interface RegionMeta {
  id: RegionId
  title: string
  icon: string
}

/** Display order of the Facebook-groups accordion. */
export const RENT_REGIONS: readonly RegionMeta[] = Object.freeze([
  { id: 'montevideo', title: 'Montevideo', icon: 'mdi-city-variant-outline' },
  { id: 'metropolitana', title: 'Área metropolitana (Canelones y Costa)', icon: 'mdi-beach' },
  { id: 'maldonado', title: 'Maldonado y Punta del Este', icon: 'mdi-umbrella-beach-outline' },
  { id: 'colonia', title: 'Colonia', icon: 'mdi-lighthouse-on' },
  { id: 'litoral', title: 'Litoral (Salto y Paysandú)', icon: 'mdi-waves' },
  { id: 'norte', title: 'Norte (Rivera y Tacuarembó)', icon: 'mdi-pine-tree' },
  { id: 'centro', title: 'Centro (Florida)', icon: 'mdi-barn' },
  { id: 'pais', title: 'Todo el país (grupos nacionales)', icon: 'mdi-map-marker-radius-outline' },
])

export interface RiskMeta {
  label: string
  short: string
  color: string
  icon: string
  legend: string
}

export const RISK_META: Record<ChannelRisk, RiskMeta> = Object.freeze({
  bajo: {
    label: 'Riesgo bajo',
    short: 'Bajo',
    color: 'success',
    icon: 'mdi-shield-check-outline',
    legend: 'Moderado, verificado o con historial público. Igual verificá antes de pagar.',
  },
  medio: {
    label: 'Riesgo medio',
    short: 'Medio',
    color: 'warning',
    icon: 'mdi-shield-alert-outline',
    legend: 'Grupo abierto pero acotado o con menos ruido. Aplicá el checklist antes de señar.',
  },
  alto: {
    label: 'Riesgo alto',
    short: 'Alto',
    color: 'error',
    icon: 'mdi-alert-outline',
    legend: 'Grupo abierto sin verificación: escenario clásico de estafa. Nunca pagues sin ver.',
  },
})

export const AUDIENCE_LABEL: Record<ChannelAudience, string> = Object.freeze({
  buscar: 'Ver ofertas',
  publicar: 'Publicar tu búsqueda',
  ambos: 'Buscar y publicar',
  roommates: 'Compartir / roomie',
  estudiantes: 'Estudiantes',
})

export const KIND_LABEL: Record<ChannelKind, string> = Object.freeze({
  reddit: 'Reddit',
  'facebook-group': 'Grupo de Facebook',
  'facebook-page': 'Página de Facebook',
  'facebook-search': 'Búsqueda en Facebook',
  plataforma: 'Plataforma',
  institucional: 'Institucional',
})

// The honest reason Telegram/WhatsApp are not listed as channels.
export const RENT_COMMUNITIES_MESSAGING_NOTE = Object.freeze({
  title: 'Telegram y WhatsApp: por qué no los listamos',
  body: 'Buscamos canales públicos de alquiler en Telegram y WhatsApp para Uruguay y no encontramos ninguno confiable: los "directorios de grupos" que aparecen en Google son plantillas de spam sin grupos reales, y varios que dicen ser uruguayos son de España. La forma segura de usar WhatsApp es que una inmobiliaria o un administrador verificado te sume a su grupo, nunca entrar por un link de directorio público. Si alguien en Reddit o Facebook te pasa un link de WhatsApp, tratalo como no verificado hasta confirmar quién lo maneja.',
})

export const RENT_CHANNELS: readonly RentChannel[] = Object.freeze([
  // ── Empezá seguro: bajo/medio riesgo, moderados o verificados ────────────
  {
    name: 'r/uruguay',
    url: 'https://www.reddit.com/r/uruguay/',
    group: 'seguras',
    region: 'Todo el país',
    audience: 'ambos',
    kind: 'reddit',
    note: 'El canal más seguro para publicar tu "busco alquiler": todo perfil tiene historial público, lo que ahuyenta al estafador anónimo. Poca oferta para navegar; sirve para contactos y recomendaciones.',
    risk: 'bajo',
  },
  {
    name: 'r/monte_video',
    url: 'https://www.reddit.com/r/monte_video/',
    group: 'seguras',
    region: 'Montevideo',
    audience: 'ambos',
    kind: 'reddit',
    note: 'Comunidad local activa para publicar tu búsqueda o pedir recomendaciones de zona/edificio. Es un foro general (no un tablón de alquileres), así que casi no hay ofertas para navegar.',
    risk: 'bajo',
  },
  {
    name: 'Buscar "busco alquiler" en r/uruguay',
    url: 'https://www.reddit.com/r/uruguay/search/?q=busco+alquiler&restrict_sr=1&sort=new',
    group: 'seguras',
    region: 'Todo el país',
    audience: 'buscar',
    kind: 'reddit',
    note: 'Vista de búsqueda para ver cómo redactan otros su aviso y detectar hilos recientes de alquiler y de estafas antes de publicar el tuyo.',
    risk: 'bajo',
  },
  {
    name: 'Bedi',
    url: 'https://www.bedi.uy/',
    group: 'seguras',
    region: 'Montevideo y Rocha',
    audience: 'ambos',
    kind: 'plataforma',
    note: 'Plataforma uruguaya de habitaciones, monoambientes y amoblados con listados verificados y pago retenido (escrow) hasta que confirmás la mudanza: más segura que un grupo abierto. Catálogo chico, enfocado en cuartos.',
    risk: 'bajo',
  },
  {
    name: 'Erasmus Play — Montevideo',
    url: 'https://erasmusplay.com/en/montevideo.html',
    group: 'seguras',
    region: 'Montevideo (zonas universitarias)',
    audience: 'estudiantes',
    kind: 'plataforma',
    note: 'Metabuscador de alojamiento estudiantil con listados verificados por partners (Trustpilot ~4★). Verificá al propietario antes de pagar cualquier reserva.',
    risk: 'bajo',
  },
  {
    name: 'UdelaR — Bienestar Universitario',
    url: 'https://bienestar.udelar.edu.uy/programa-alojamientos/',
    group: 'seguras',
    region: 'Montevideo y Canelones',
    audience: 'estudiantes',
    kind: 'institucional',
    note: 'Canal oficial y gratuito para estudiantes de la UdelaR: listado de alojamientos con convenio y asesoría, sin dinámica de seña por transferencia. Se consulta, no se publica; pedí la lista vigente al SCBU.',
    risk: 'bajo',
  },
  {
    name: 'ORT — Alojamiento (Área Internacional)',
    url: 'https://www.ort.edu.uy/area-internacional/estudiar-en-uruguay/alojamiento',
    group: 'seguras',
    region: 'Montevideo',
    audience: 'estudiantes',
    kind: 'institucional',
    note: 'Lista de residencias que la Universidad ORT entrega por mail a sus estudiantes de intercambio (intercambio@ort.edu.uy). La ORT no verifica ni media, así que igual hacé tu propia due diligence.',
    risk: 'bajo',
  },
  {
    name: 'FING (UdelaR) — Casas compartidas',
    url: 'https://www.fing.edu.uy/es/paginas/casas-compartidas-en-montevideo',
    group: 'seguras',
    region: 'Montevideo',
    audience: 'estudiantes',
    kind: 'institucional',
    note: 'Página oficial de la Facultad de Ingeniería que reúne el listado de Bienestar, filtros de Mercado Libre por barrio y contactos para pieza compartida. Es un punto de partida seguro, no una comunidad activa.',
    risk: 'bajo',
  },

  // ── Roomies y compartir ──────────────────────────────────────────────────
  {
    name: 'Roomies.UY',
    url: 'https://www.facebook.com/groups/roomiesuy/',
    group: 'roomies',
    region: 'Montevideo',
    audience: 'roommates',
    kind: 'facebook-group',
    note: 'El grupo de referencia para buscar u ofrecer compañero de apartamento en Montevideo. Suele ser menos estafa-intensivo que los de alquiler con dinero por adelantado, pero igual verificá identidad y visitá antes de comprometerte.',
    risk: 'medio',
  },
  {
    name: 'Alquiler de habitaciones en Montevideo',
    url: 'https://www.facebook.com/groups/533084406827862/',
    group: 'roomies',
    region: 'Montevideo',
    audience: 'roommates',
    kind: 'facebook-group',
    note: 'Habitaciones sueltas en Montevideo, útil para estudiantes y para compartir. Grupo abierto y poco moderado: nunca reserves ni transfieras sin ver el cuarto y conocer a los convivientes.',
    risk: 'alto',
  },
  {
    name: 'Habitaciones en Montevideo',
    url: 'https://www.facebook.com/groups/habitacionesenmontevideo/',
    group: 'roomies',
    region: 'Montevideo',
    audience: 'roommates',
    kind: 'facebook-group',
    note: 'Grupo establecido de cuartos en apartamentos compartidos y pensiones. Abundan fotos robadas y pedidos de seña por transferencia: visita presencial sí o sí antes de pagar.',
    risk: 'alto',
  },
  {
    name: 'Pensiones, Residencias, habitaciones — Montevideo',
    url: 'https://www.facebook.com/groups/1265003667509616/',
    group: 'roomies',
    region: 'Montevideo',
    audience: 'estudiantes',
    kind: 'facebook-group',
    note: 'Ideal para estudiantes del interior que llegan a Montevideo. Las residencias con nombre y dirección física dan algo más de trazabilidad, pero confirmá que existan y visitá antes de señar.',
    risk: 'medio',
  },

  // ── Grupos de Facebook por zona ──────────────────────────────────────────
  // Montevideo
  {
    name: 'ALQUILERES MONTEVIDEO URUGUAY',
    url: 'https://www.facebook.com/groups/768967867363000/',
    group: 'facebook',
    department: 'montevideo',
    region: 'Montevideo',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Grupo abierto de alto volumen para publicar tu búsqueda y ver avisos. Terreno clásico de la estafa "estoy en el exterior, te mando la llave": no transfieras nada antes de ver la propiedad.',
    risk: 'alto',
  },
  {
    name: 'Alquileres en Montevideo',
    url: 'https://www.facebook.com/groups/242775299249363/',
    group: 'facebook',
    department: 'montevideo',
    region: 'Montevideo',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Otro grupo genérico de alto volumen en Montevideo. Circulan fotos reutilizadas y precios gancho: verificá la titularidad del propietario o la inmobiliaria antes de señar.',
    risk: 'alto',
  },
  {
    name: 'Alquiler de apartamentos en Montevideo',
    url: 'https://www.facebook.com/groups/Alquilerdeapartamentosenmontevideo/',
    group: 'facebook',
    department: 'montevideo',
    region: 'Montevideo',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Enfocado en apartamentos (no habitaciones). Grupo abierto con avisos clonados frecuentes: no transfieras antes de visitar en persona y firmar contrato.',
    risk: 'alto',
  },
  // Área metropolitana (Canelones y Costa)
  {
    name: 'Alquileres en Ciudad de la Costa Canelones Uruguay',
    url: 'https://www.facebook.com/groups/245009653761844/',
    group: 'facebook',
    department: 'metropolitana',
    region: 'Ciudad de la Costa / Costa de Oro',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Casas y apartamentos en Ciudad de la Costa y balnearios de Canelones, con mucho trato dueño-directo. Zona poco cubierta por portales; verificá al propietario antes de cualquier reserva.',
    risk: 'alto',
  },
  {
    name: 'Alquileres en Ciudad de la Costa Uruguay',
    url: 'https://www.facebook.com/groups/2182522435095549/',
    group: 'facebook',
    department: 'metropolitana',
    region: 'Ciudad de la Costa',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Grupo activo con posts reales de gente buscando (Lagomar, Solymar). Conviven avisos reales y anzuelos: nunca transfieras sin ver la propiedad en persona.',
    risk: 'alto',
  },
  {
    name: 'ALQUILERES - VENTAS Ciudad de la Costa y Costa de Oro',
    url: 'https://www.facebook.com/groups/908384463888459/',
    group: 'facebook',
    department: 'metropolitana',
    region: 'Ciudad de la Costa / Costa de Oro',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Buen alcance regional para postear un "busco". Mezcla alquiler y venta, lo que suma ruido y oportunistas: firmá y visitá antes de pagar por adelantado.',
    risk: 'alto',
  },
  {
    name: 'ALQUILERES COSTA DE ORO SALINAS',
    url: 'https://www.facebook.com/groups/1626601790713313/',
    group: 'facebook',
    department: 'metropolitana',
    region: 'Costa de Oro / Salinas',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Nicho de Salinas y balnearios de Costa de Oro. Útil si buscás en ese tramo específico; grupo abierto, verificá siempre la propiedad en persona antes de pagar.',
    risk: 'alto',
  },
  {
    name: 'Alquileres en La Paz Canelones Uruguay',
    url: 'https://www.facebook.com/groups/139362244703653/',
    group: 'facebook',
    department: 'metropolitana',
    region: 'La Paz / Las Piedras (sur de Canelones)',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Corredor Ruta 5, zona que los portales cubren poco. Desconfiá de precios muy bajos y de quien pide adelantos por transferencia; no señes antes de ver y firmar.',
    risk: 'alto',
  },
  {
    name: 'Alquileres en Pando',
    url: 'https://www.facebook.com/groups/189924091652750/',
    group: 'facebook',
    department: 'metropolitana',
    region: 'Pando (Canelones)',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Nicho local de Pando y cercanías con poca competencia de portales. Publicaciones duplicadas y perfiles falsos son comunes: nunca pagues sin ver el inmueble y contrato.',
    risk: 'alto',
  },
  // Maldonado y Punta del Este
  {
    name: 'Alquileres Anuales Maldonado y Punta del Este',
    url: 'https://www.facebook.com/groups/342712721039831/',
    group: 'facebook',
    department: 'maldonado',
    region: 'Maldonado / Punta del Este',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'El mejor filtrado para VIVIENDA PERMANENTE: solo alquiler anual, sin el ruido de temporada. Igual es grupo abierto: no transfieras sin ver la propiedad y firmar.',
    risk: 'medio',
  },
  {
    name: 'Alquileres y Ventas en Punta del Este y Maldonado',
    url: 'https://www.facebook.com/groups/1707255432915728/',
    group: 'facebook',
    department: 'maldonado',
    region: 'Maldonado / Punta del Este',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Buen alcance regional, pero mezcla venta, temporada y anual. Maldonado/PDE es zona caliente de estafas de temporada: verificá SIEMPRE en persona antes de pagar.',
    risk: 'alto',
  },
  {
    name: 'Alquileres Maldonado',
    url: 'https://www.facebook.com/groups/321472601612190/',
    group: 'facebook',
    department: 'maldonado',
    region: 'Maldonado / Punta del Este',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Grupo general del departamento. Mezcla anual con temporada y concentra pedidos de "reserva sin ver": nunca transfieras antes de visitar y firmar contrato.',
    risk: 'alto',
  },
  {
    name: 'ALQUILERES TRATO DIRECTO DUEÑO Maldonado',
    url: 'https://www.facebook.com/groups/2086637501568140/',
    group: 'facebook',
    department: 'maldonado',
    region: 'Maldonado / Punta del Este',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Dueño directo, sin comisión de inmobiliaria. Justamente por eso es la categoría más expuesta a falsos dueños: pedí título/padrón y no pagues nada antes de la visita.',
    risk: 'alto',
  },
  // Colonia
  {
    name: 'Alquileres en Colonia',
    url: 'https://www.facebook.com/groups/alquileresencolonia/',
    group: 'facebook',
    department: 'colonia',
    region: 'Colonia',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Grupo de referencia para Colonia del Sacramento y el departamento. Mezcla mucho alquiler turístico: filtrá y nunca pagues antes de verificar en persona.',
    risk: 'alto',
  },
  // Litoral (Salto y Paysandú)
  {
    name: 'Alquileres Salto (solo alquilamos)',
    url: 'https://www.facebook.com/groups/266183703576566/',
    group: 'facebook',
    department: 'litoral',
    region: 'Salto',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'La regla anti-venta reduce el ruido para quien busca en Salto (útil para estudiantes del CENUR Litoral Norte). Grupo abierto: no pagues seña antes de ver en persona.',
    risk: 'medio',
  },
  {
    name: 'ALQUILERES Y VENTAS DE INMUEBLES SALTO',
    url: 'https://www.facebook.com/groups/150214722375855/',
    group: 'facebook',
    department: 'litoral',
    region: 'Salto',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Grupo grande de Salto que mezcla alquiler y venta. Sin curaduría: verificá la identidad del anunciante y no transfieras sin ver el inmueble.',
    risk: 'alto',
  },
  {
    name: 'Alquileres en Salto',
    url: 'https://www.facebook.com/alquileresensalto2018/',
    group: 'facebook',
    department: 'litoral',
    region: 'Salto',
    audience: 'buscar',
    kind: 'facebook-page',
    note: 'Página con una de las mayores audiencias de alquiler de Salto. Al ser página, solo mirás y comentás avisos (no publicás tu búsqueda). Igual hay estafas de seña: nunca pagues sin ver.',
    risk: 'medio',
  },
  {
    name: 'Alquileres de casas o apartamentos en Paysandú',
    url: 'https://www.facebook.com/groups/1904246636558388/',
    group: 'facebook',
    department: 'litoral',
    region: 'Paysandú',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Grupo dedicado a casas y apartamentos en Paysandú, buena cobertura del interior. Abierto y sin verificación: nunca pagues seña ni depósito antes de ver y confirmar al dueño.',
    risk: 'alto',
  },
  {
    name: 'Alquileres y ventas de propiedades en Paysandú',
    url: 'https://www.facebook.com/groups/307145537592054/',
    group: 'facebook',
    department: 'litoral',
    region: 'Paysandú',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Segundo grupo de Paysandú, mezcla venta y alquiler. Sirve para difundir tu "busco"; verificá antes de enviar datos o dinero.',
    risk: 'medio',
  },
  // Norte (Rivera y Tacuarembó)
  {
    name: 'Alquileres de casas en Rivera Livramento',
    url: 'https://www.facebook.com/groups/401457713333279/',
    group: 'facebook',
    department: 'norte',
    region: 'Rivera / Sant’Ana do Livramento',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Nicho de frontera con pocas alternativas. Ojo: se mezclan avisos en portugués y precios en reales; confirmá de qué lado de la frontera está y no transfieras sin ver.',
    risk: 'alto',
  },
  {
    name: 'ALQUILERES Y VENTAS TACUAREMBÓ',
    url: 'https://www.facebook.com/groups/829609510462701/',
    group: 'facebook',
    department: 'norte',
    region: 'Tacuarembó',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'El canal departamental más efectivo en Tacuarembó, donde los portales cubren poco. Mezcla venta y alquiler: verificá al anunciante en persona antes de pagar.',
    risk: 'alto',
  },
  {
    name: 'Propiedades en Tacuarembó',
    url: 'https://www.facebook.com/propiedadesentacuarembo/',
    group: 'facebook',
    department: 'norte',
    region: 'Tacuarembó',
    audience: 'buscar',
    kind: 'facebook-page',
    note: 'Página del portal propiedadesentacuarembo.com que agrega inmobiliarias reales de la zona. Riesgo más bajo que un grupo abierto porque los avisos pasan por inmobiliarias; sirve para navegar, no para publicar.',
    risk: 'bajo',
  },
  // Centro (Florida)
  {
    name: 'ALQUILERES FLORIDA URUGUAY',
    url: 'https://www.facebook.com/groups/389403164551831/',
    group: 'facebook',
    department: 'centro',
    region: 'Florida',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Grupo de referencia para el departamento de Florida. Abierto y sin verificación de miembros: difundí tu "busco", pero nunca pagues sin visita presencial ni contrato.',
    risk: 'alto',
  },
  // Todo el país (grupos nacionales)
  {
    name: 'ALQUILERES DUEÑOS DIRECTOS URUGUAY',
    url: 'https://www.facebook.com/groups/2212495082337087/',
    group: 'facebook',
    department: 'pais',
    region: 'Todo el país',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Alcance nacional, dueño directo sin inmobiliaria ni comisión. El gancho "dueño directo / sin garantía" es el más usado por perfiles falsos: pedí cédula y título antes de nada.',
    risk: 'alto',
  },
  {
    name: 'ALQUILERES PARTICULARES URUGUAY',
    url: 'https://www.facebook.com/groups/736040520129387/',
    group: 'facebook',
    department: 'pais',
    region: 'Todo el país',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Grupo nacional entre particulares, gran alcance para difundir un "busco" a todo el país. Sin moderación ni verificación: sirve para difundir, no para confiar a ciegas.',
    risk: 'alto',
  },
  {
    name: 'Alquileres por LUC — Uruguay',
    url: 'https://www.facebook.com/groups/1170170597055576/',
    group: 'facebook',
    department: 'pais',
    region: 'Todo el país',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Grupo nacional orientado a la modalidad LUC (garantía simplificada). Ojo: la LUC no reduce el riesgo de estafa; siempre verificá titularidad del inmueble y firmá contrato.',
    risk: 'alto',
  },
  {
    name: 'Alquileres económicos en Uruguay',
    url: 'https://www.facebook.com/groups/1809615962650038/',
    group: 'facebook',
    department: 'pais',
    region: 'Todo el país',
    audience: 'ambos',
    kind: 'facebook-group',
    note: 'Alcance nacional orientado a bajo costo. El gancho "económico" lo vuelve imán de estafas (aviso baratísimo + urgencia + seña por adelantado): nunca transfieras sin ver el inmueble.',
    risk: 'alto',
  },

  // ── Búsqueda en vivo (descubrir grupos activos ahora) ────────────────────
  {
    name: 'Grupos de alquiler en Montevideo',
    url: 'https://www.facebook.com/search/groups/?q=alquileres%20montevideo',
    group: 'busqueda-vivo',
    region: 'Montevideo',
    audience: 'buscar',
    kind: 'facebook-search',
    note: 'Búsqueda nativa de Facebook: encontrá y unite a los grupos de alquiler de Montevideo más activos del momento. Requiere iniciar sesión; elegí grupos con muchos miembros y posteos recientes.',
    risk: 'medio',
  },
  {
    name: 'Grupos de roomies / compartir en Montevideo',
    url: 'https://www.facebook.com/search/groups/?q=roomies%20montevideo',
    group: 'busqueda-vivo',
    region: 'Montevideo',
    audience: 'roommates',
    kind: 'facebook-search',
    note: 'Descubrí comunidades activas de roomies y compartir apartamento. Como todo grupo abierto, aplicá el checklist anti-estafa antes de pagar.',
    risk: 'medio',
  },
  {
    name: 'Grupos de alquiler por localidad',
    url: 'https://www.facebook.com/search/groups/?q=alquileres%20uruguay',
    group: 'busqueda-vivo',
    region: 'Todo el país',
    audience: 'buscar',
    kind: 'facebook-search',
    note: 'En el interior los grupos nacen y cambian de ID: buscá "alquileres + tu localidad" para hallar el grupo local vigente. Los que aparecen son abiertos: verificá siempre antes de contactar o pagar.',
    risk: 'medio',
  },
])

export interface ChannelGroupMeta {
  id: ChannelGroupId
  title: string
  intro: string
  icon: string
}

export const CHANNEL_GROUPS: readonly ChannelGroupMeta[] = Object.freeze([
  {
    id: 'seguras',
    title: 'Empezá seguro',
    intro:
      'Los canales de menor riesgo: comunidades moderadas, plataformas con verificación y recursos institucionales. Ideales para publicar tu búsqueda sin exponerte.',
    icon: 'mdi-shield-check-outline',
  },
  {
    id: 'roomies',
    title: 'Compartir y habitaciones',
    intro:
      'Para buscar compañero de apartamento, una habitación o una pensión. Suele haber menos dinero por adelantado, pero igual verificá identidad y visitá antes.',
    icon: 'mdi-account-multiple-outline',
  },
  {
    id: 'facebook',
    title: 'Grupos de Facebook por zona',
    intro:
      'El canal con más volumen y la mejor cobertura del interior, pero también el de más estafas. Son grupos abiertos: difundí tu "busco alquiler", pero nunca pagues una seña sin ver el lugar y verificar a quien alquila.',
    icon: 'mdi-facebook',
  },
  {
    id: 'busqueda-vivo',
    title: 'Buscá grupos activos ahora',
    intro:
      'Los grupos cambian y nacen otros nuevos. Estas búsquedas nativas de Facebook te muestran los vigentes de tu zona en el momento.',
    icon: 'mdi-magnify',
  },
])

/** Channels of a display group, in declared order. */
export function channelsByGroup(id: ChannelGroupId): RentChannel[] {
  return RENT_CHANNELS.filter(c => c.group === id)
}

export interface RegionGroup {
  region: RegionMeta
  channels: RentChannel[]
}

/** Facebook channels bucketed by department, dropping empty regions, in RENT_REGIONS order. */
export function facebookGroupsByRegion(): RegionGroup[] {
  return RENT_REGIONS.map(region => ({
    region,
    channels: RENT_CHANNELS.filter(c => c.group === 'facebook' && c.department === region.id),
  })).filter(g => g.channels.length > 0)
}
